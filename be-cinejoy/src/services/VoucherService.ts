import { Voucher, IVoucher } from "../models/Voucher";
import Order from "../models/Order";
import { UserVoucher } from "../models/UserVoucher";
import { Types } from "mongoose";
import mongoose from "mongoose";
import { User } from "../models/User";
import SeatService from "./SeatService";

export default class VoucherService {
  // Validate seat type against database
  private async validateSeatType(seatType: string): Promise<boolean> {
    try {
      const validSeatTypes = await SeatService.getUniqueSeatTypes();
      return validSeatTypes.includes(seatType);
    } catch (error) {
      console.error("Error validating seat type:", error);
      return false;
    }
  }

  // Tạo mã code 10 số ngẫu nhiên
  private generatePromotionLineCode(): string {
    return Math.floor(1000000000 + Math.random() * 9000000000).toString();
  }

  // Kiểm tra mã code có bị trùng không
  private async isCodeUnique(code: string): Promise<boolean> {
    try {
      const existingVoucher = await Voucher.findOne({ "lines.code": code });
      return !existingVoucher;
    } catch (error) {
      console.error("Error checking code uniqueness:", error);
      return false;
    }
  }

  // Lấy ngân sách đã dùng cho promotion line
  private async getUsedBudget(
    voucherId: string,
    lineIndex: number,
    promotionType: string
  ): Promise<number> {
    try {
      if (promotionType === "amount") {
        const result = await this.getAmountBudgetUsed(voucherId, lineIndex);
        return typeof result === "number"
          ? result
          : (result as any)?.usedBudget || 0;
      } else if (promotionType === "item") {
        const result = await this.getItemBudgetUsed(voucherId, lineIndex);
        return typeof result === "number"
          ? result
          : (result as any)?.usedBudget || 0;
      } else if (promotionType === "percent") {
        const result = await this.getPercentBudgetUsed(voucherId, lineIndex);
        return typeof result === "number"
          ? result
          : (result as any)?.usedBudget || 0;
      }
      return 0;
    } catch (error) {
      console.error("Error getting used budget:", error);
      return 0;
    }
  }

  // Kiểm tra xem promotion line có đủ ngân sách không
  private async checkBudgetAvailability(
    voucherId: string,
    lineIndex: number,
    promotionType: string,
    detail: any
  ): Promise<{ isAvailable: boolean; message: string }> {
    try {
      if (promotionType === "voucher") {
        const quantity = detail?.quantity || 0;
        if (quantity <= 0) {
          return {
            isAvailable: false,
            message:
              "Voucher đã hết số lượng. Vui lòng tăng số lượng voucher để kích hoạt lại.",
          };
        }
        return { isAvailable: true, message: "" };
      }

      // Với item, percent, amount: kiểm tra ngân sách
      const usedBudget = await this.getUsedBudget(
        voucherId,
        lineIndex,
        promotionType
      );
      const totalBudget = detail?.totalBudget || 0;

      if (usedBudget >= totalBudget) {
        return {
          isAvailable: false,
          message: `Ngân sách đã hết (Đã dùng: ${usedBudget.toLocaleString(
            "vi-VN"
          )} / Tổng: ${totalBudget.toLocaleString(
            "vi-VN"
          )}). Vui lòng tăng ngân sách tổng để kích hoạt lại.`,
        };
      }

      // Kiểm tra xem còn đủ ngân sách cho ít nhất 1 lần khuyến mãi không
      if (promotionType === "amount") {
        const discountValue = detail?.discountValue || 0;
        const remaining = totalBudget - usedBudget;
        if (remaining < discountValue) {
          return {
            isAvailable: false,
            message: `Ngân sách còn lại ${remaining.toLocaleString(
              "vi-VN"
            )}₫ không đủ cho khuyến mãi ${discountValue.toLocaleString(
              "vi-VN"
            )}₫. Vui lòng tăng ngân sách tổng.`,
          };
        }
      } else if (promotionType === "percent") {
        const minOrderValue = detail?.minOrderValue || 0;
        const discountPercent =
          detail?.comboDiscountPercent || detail?.ticketDiscountPercent || 0;
        const minDiscountValue = (minOrderValue * discountPercent) / 100;
        const remaining = totalBudget - usedBudget;
        if (remaining < minDiscountValue) {
          return {
            isAvailable: false,
            message: `Ngân sách còn lại ${remaining.toLocaleString(
              "vi-VN"
            )}₫ không đủ để tiếp tục khuyến mãi (tối thiểu ${minDiscountValue.toLocaleString(
              "vi-VN"
            )}₫). Vui lòng tăng ngân sách tổng.`,
          };
        }
      }

      return { isAvailable: true, message: "" };
    } catch (error) {
      console.error("Error checking budget availability:", error);
      return { isAvailable: true, message: "" }; // Mặc định cho phép nếu có lỗi
    }
  }

  // Tự động cập nhật status dựa trên ngân sách/số lượng
  private async autoUpdateStatus(
    voucherId: string,
    lineIndex: number,
    promotionType: string,
    detail: any,
    currentStatus: string
  ): Promise<string> {
    // Chỉ auto-update nếu status hiện tại là 'hoạt động'
    if (currentStatus !== "hoạt động") {
      return currentStatus;
    }

    const budgetCheck = await this.checkBudgetAvailability(
      voucherId,
      lineIndex,
      promotionType,
      detail
    );

    if (!budgetCheck.isAvailable) {
      console.log(
        `🔴 Auto-deactivating promotion line ${lineIndex} for voucher ${voucherId}: ${budgetCheck.message}`
      );
      return "không hoạt động";
    }

    return currentStatus; // Giữ nguyên 'hoạt động'
  }

  async getVouchers(): Promise<IVoucher[]> {
    const vouchers = await Voucher.find();

    // Tự động cập nhật status cho tất cả promotion lines
    for (const voucher of vouchers) {
      let hasChanges = false;

      if (voucher.lines && Array.isArray(voucher.lines)) {
        for (let i = 0; i < voucher.lines.length; i++) {
          const line = voucher.lines[i];
          const newStatus = await this.autoUpdateStatus(
            String(voucher._id),
            i,
            line.promotionType,
            line.detail,
            line.status
          );

          if (newStatus !== line.status) {
            voucher.lines[i].status = newStatus as
              | "hoạt động"
              | "không hoạt động";
            hasChanges = true;
          }
        }
      }

      if (hasChanges) {
        await voucher.save();
      }
    }

    return vouchers;
  }

  async getVoucherById(id: string): Promise<IVoucher | null> {
    const voucher = await Voucher.findById(id);

    if (!voucher) return null;

    // Tự động cập nhật status cho tất cả promotion lines
    let hasChanges = false;

    if (voucher.lines && Array.isArray(voucher.lines)) {
      for (let i = 0; i < voucher.lines.length; i++) {
        const line = voucher.lines[i];
        const newStatus = await this.autoUpdateStatus(
          String(voucher._id),
          i,
          line.promotionType,
          line.detail,
          line.status
        );

        if (newStatus !== line.status) {
          voucher.lines[i].status = newStatus as
            | "hoạt động"
            | "không hoạt động";
          hasChanges = true;
        }
      }
    }

    if (hasChanges) {
      await voucher.save();
    }

    return voucher;
  }

  addVoucher(data: IVoucher): Promise<IVoucher> {
    const voucher = new Voucher(data);
    return voucher.save();
  }

  async getAmountDiscount(orderTotal: number): Promise<{
    discountAmount: number;
    description: string;
    minOrderValue: number;
    discountValue: number;
  } | null> {
    try {
      // Tìm các voucher có promotionType = "amount" và status = "hoạt động"
      const activeAmountVouchers = await Voucher.find({
        "lines.promotionType": "amount",
        "lines.status": "hoạt động",
        status: "hoạt động",
      });

      let bestDiscount = 0;
      let bestDiscountInfo = null;

      // Tìm amount discount phù hợp nhất (cao nhất nhưng không vượt quá orderTotal)
      for (const voucher of activeAmountVouchers) {
        for (const line of voucher.lines || []) {
          if (
            line.promotionType === "amount" &&
            line.status === "hoạt động" &&
            line.detail
          ) {
            const detail = line.detail as any; // Type assertion để access amount fields
            const minOrderValue = detail.minOrderValue || 0;
            const discountValue = detail.discountValue || 0;
            const now = new Date();

            // Kiểm tra điều kiện thời gian và giá trị đơn hàng
            if (
              orderTotal >= minOrderValue &&
              discountValue > bestDiscount &&
              line.validityPeriod &&
              now >= new Date(line.validityPeriod.startDate) &&
              now <= new Date(line.validityPeriod.endDate)
            ) {
              bestDiscount = discountValue;
              bestDiscountInfo = {
                discountAmount: discountValue,
                description:
                  detail.description ||
                  `Giảm ${discountValue.toLocaleString(
                    "vi-VN"
                  )}₫ cho hóa đơn từ ${minOrderValue.toLocaleString("vi-VN")}₫`,
                minOrderValue,
                discountValue,
              };
            }
          }
        }
      }

      return bestDiscountInfo;
    } catch (error) {
      console.error("Error getting amount discount:", error);
      return null;
    }
  }

  async updateVoucher(
    id: string,
    data: Partial<IVoucher>
  ): Promise<IVoucher | null> {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      // Lấy voucher hiện tại để kiểm tra trạng thái cũ và lấy lines
      const currentVoucher = await Voucher.findById(id).session(session);
      if (!currentVoucher) {
        throw new Error("Voucher not found");
      }

      // Lưu trạng thái cũ để so sánh
      const oldStatus = currentVoucher.status;

      // Nếu trạng thái header thay đổi thành "không hoạt động", cập nhật tất cả các line
      if (
        data.status === "không hoạt động" &&
        oldStatus !== "không hoạt động" &&
        currentVoucher.lines &&
        currentVoucher.lines.length > 0
      ) {
        // Lưu trạng thái ban đầu và cập nhật tất cả các line thành "không hoạt động"
        const updatedLines = currentVoucher.lines.map((line: any) => ({
          ...line.toObject(),
          originalStatus: line.status, // Lưu trạng thái ban đầu
          status: "không hoạt động",
        }));

        // Thêm lines đã cập nhật vào data
        data.lines = updatedLines;

        console.log(
          `✅ Updating voucher ${id} header and all ${updatedLines.length} lines to 'không hoạt động' (saved original status)`
        );
      }

      // Nếu trạng thái header thay đổi từ "không hoạt động" về "hoạt động", khôi phục trạng thái ban đầu của các line
      if (
        data.status === "hoạt động" &&
        oldStatus === "không hoạt động" &&
        currentVoucher.lines &&
        currentVoucher.lines.length > 0
      ) {
        // Khôi phục trạng thái ban đầu của các line
        const restoredLines = currentVoucher.lines.map((line: any) => ({
          ...line.toObject(),
          status: line.originalStatus || "hoạt động", // Khôi phục trạng thái ban đầu, mặc định là "hoạt động"
          originalStatus: undefined, // Xóa trạng thái ban đầu đã lưu
        }));

        // Thêm lines đã khôi phục vào data
        data.lines = restoredLines;

        console.log(
          `✅ Restoring voucher ${id} header to 'hoạt động' and all ${restoredLines.length} lines to their original status`
        );
      }

      // Cập nhật voucher header với lines đã được cập nhật (nếu có)
      const updatedVoucher = await Voucher.findByIdAndUpdate(id, data, {
        new: true,
        session,
      });

      await session.commitTransaction();
      return updatedVoucher;
    } catch (error) {
      await session.abortTransaction();
      console.error("Error updating voucher:", error);
      throw error;
    } finally {
      session.endSession();
    }
  }

  async deleteVoucher(id: string): Promise<IVoucher | null> {
    const voucher = await Voucher.findById(id);
    if (!voucher) {
      throw new Error("Voucher not found");
    }

    // Kiểm tra nếu voucher đang hoạt động thì không cho phép xóa
    if (voucher.status === "hoạt động") {
      throw new Error(
        'Không thể xóa voucher đang hoạt động. Vui lòng thay đổi trạng thái thành "không hoạt động" trước khi xóa.'
      );
    }

    return Voucher.findByIdAndDelete(id);
  }

  getUserVouchers = async (userId: Types.ObjectId | string) => {
    // Không populate để tránh Mongoose thay giá trị ObjectId bằng null khi không khớp ref
    const list: any[] = await UserVoucher.find({ userId })
      .sort({ redeemedAt: -1 })
      .lean();

    for (const uv of list) {
      const voucherIdAny = uv.voucherId; // có thể là ObjectId header, ObjectId detail, hoặc null

      if (voucherIdAny) {
        // Thử coi như header id trước
        const headerDoc: any = await Voucher.findById(voucherIdAny).lean();
        if (headerDoc) {
          const first = Array.isArray(headerDoc?.lines)
            ? headerDoc.lines[0]
            : undefined;
          uv.voucherId = {
            _id: headerDoc._id,
            name: headerDoc.name,
            description: first?.detail?.description,
            validityPeriod: {
              startDate:
                first?.validityPeriod?.startDate || headerDoc.startDate,
              endDate: first?.validityPeriod?.endDate || headerDoc.endDate,
            },
            quantity: headerDoc.quantity ?? first?.detail?.quantity,
            discountPercent:
              headerDoc.discountPercent ?? first?.detail?.discountPercent,
            pointToRedeem:
              headerDoc.pointToRedeem ?? first?.detail?.pointToRedeem,
          };
          continue;
        }

        // Nếu không phải header id, coi như detail sub-id
        const detailId = voucherIdAny.toString();
        const voucherDoc: any = await Voucher.findOne({
          "lines.detail._id": new Types.ObjectId(detailId),
        }).lean();
        if (voucherDoc) {
          const line = (voucherDoc.lines || []).find(
            (l: any) => l?.detail?._id?.toString() === detailId
          );
          const validity = line?.validityPeriod || {
            startDate: voucherDoc.startDate,
            endDate: voucherDoc.endDate,
          };
          const detail = line?.detail || {};
          uv.voucherId = {
            _id: detailId,
            name: detail.description || voucherDoc.name,
            description: detail.description,
            validityPeriod: {
              startDate: validity?.startDate,
              endDate: validity?.endDate,
            },
            quantity: detail.quantity,
            discountPercent: detail.discountPercent,
            pointToRedeem: detail.pointToRedeem,
          };
        }
      }
    }

    return list;
  };

  async addPromotionLine(
    voucherId: string,
    lineData: any
  ): Promise<IVoucher | null> {
    const voucher = await Voucher.findById(voucherId);
    if (!voucher) throw new Error("Voucher không tồn tại");

    // Validate seat types if applicable
    if (
      lineData.promotionType === "percent" &&
      lineData.discountDetail?.seatType
    ) {
      const isValidSeatType = await this.validateSeatType(
        lineData.discountDetail.seatType
      );
      if (!isValidSeatType) {
        throw new Error(
          `Loại ghế '${lineData.discountDetail.seatType}' không hợp lệ`
        );
      }
    }

    if (
      lineData.promotionType === "item" &&
      lineData.itemDetail?.buyItem &&
      lineData.itemDetail?.applyType === "ticket"
    ) {
      const isValidSeatType = await this.validateSeatType(
        lineData.itemDetail.buyItem
      );
      if (!isValidSeatType) {
        throw new Error(
          `Loại ghế '${lineData.itemDetail.buyItem}' không hợp lệ`
        );
      }
    }

    // Xử lý detail theo promotionType
    let detail: any = {};
    if (lineData.promotionType === "voucher" && lineData.voucherDetail) {
      // Đảm bảo VoucherDetail có _id riêng để dùng làm voucherId cho UserVoucher
      const ensuredId = lineData.voucherDetail._id ?? new Types.ObjectId();
      detail = { _id: ensuredId, ...lineData.voucherDetail };

      // Tự động set totalQuantity nếu chưa có
      if (typeof detail.quantity === "number" && !detail.totalQuantity) {
        detail.totalQuantity = detail.quantity;
      }
      // Đồng bộ legacy fields ở cấp header để FE cũ đọc được
      try {
        if (typeof lineData.voucherDetail.quantity === "number") {
          // @ts-ignore backward compat field
          (voucher as any).quantity = lineData.voucherDetail.quantity;
        }
        if (typeof lineData.voucherDetail.pointToRedeem === "number") {
          // @ts-ignore backward compat field
          (voucher as any).pointToRedeem = lineData.voucherDetail.pointToRedeem;
        }
        if (typeof lineData.voucherDetail.discountPercent === "number") {
          // @ts-ignore backward compat field
          (voucher as any).discountPercent =
            lineData.voucherDetail.discountPercent;
        }
      } catch {}
    } else if (
      lineData.promotionType === "percent" &&
      lineData.discountDetail
    ) {
      detail = lineData.discountDetail;
    } else if (lineData.promotionType === "amount" && lineData.amountDetail) {
      detail = lineData.amountDetail;
    } else if (lineData.promotionType === "item" && lineData.itemDetail) {
      detail = lineData.itemDetail;
    }

    // Tạo mã code duy nhất cho promotion line
    let promotionLineCode: string;
    let attempts = 0;
    do {
      promotionLineCode = this.generatePromotionLineCode();
      attempts++;
      if (attempts > 10) {
        throw new Error("Không thể tạo mã code duy nhất sau 10 lần thử");
      }
    } while (!(await this.isCodeUnique(promotionLineCode)));

    // Tạo line mới
    const newLine = {
      promotionType: lineData.promotionType,
      validityPeriod: {
        startDate: lineData.startDate,
        endDate: lineData.endDate,
      },
      status: lineData.status,
      originalStatus: lineData.status, // Lưu trạng thái ban đầu khi tạo mới
      detail: detail,
      rule: lineData.rule,
      code: promotionLineCode, // Tự động tạo mã code 10 số
    };

    // Thêm line vào voucher
    voucher.lines.push(newLine);
    await voucher.save();

    return voucher;
  }

  async updatePromotionLine(
    voucherId: string,
    lineIndex: number,
    lineData: any
  ): Promise<IVoucher | null> {
    const voucher = await Voucher.findById(voucherId);
    if (!voucher) throw new Error("Voucher không tồn tại");

    if (
      !Array.isArray(voucher.lines) ||
      lineIndex < 0 ||
      lineIndex >= voucher.lines.length
    ) {
      throw new Error("Line không tồn tại");
    }

    // Kiểm tra nếu voucher header là "không hoạt động" thì không cho phép line thành "hoạt động"
    if (
      voucher.status === "không hoạt động" &&
      lineData.status === "hoạt động"
    ) {
      throw new Error(
        'Không thể đặt trạng thái "hoạt động" cho line khi voucher header đang "không hoạt động"'
      );
    }

    // Validate seat types if applicable
    if (
      lineData.promotionType === "percent" &&
      lineData.discountDetail?.seatType
    ) {
      const isValidSeatType = await this.validateSeatType(
        lineData.discountDetail.seatType
      );
      if (!isValidSeatType) {
        throw new Error(
          `Loại ghế '${lineData.discountDetail.seatType}' không hợp lệ`
        );
      }
    }

    if (
      lineData.promotionType === "item" &&
      lineData.itemDetail?.buyItem &&
      lineData.itemDetail?.applyType === "ticket"
    ) {
      const isValidSeatType = await this.validateSeatType(
        lineData.itemDetail.buyItem
      );
      if (!isValidSeatType) {
        throw new Error(
          `Loại ghế '${lineData.itemDetail.buyItem}' không hợp lệ`
        );
      }
    }

    // Xử lý detail theo promotionType
    let detail: any = {};
    if (lineData.promotionType === "voucher" && lineData.voucherDetail) {
      // Giữ nguyên _id nếu có
      const existingDetail = voucher.lines[lineIndex].detail as any;
      const ensuredId =
        lineData.voucherDetail._id ??
        existingDetail?._id ??
        new Types.ObjectId();
      detail = { _id: ensuredId, ...lineData.voucherDetail };

      // Xử lý totalQuantity: 
      // 1. Nếu được cung cấp trong request thì dùng giá trị đó
      // 2. Nếu không, giữ nguyên giá trị từ database (existingDetail.totalQuantity)
      // 3. Chỉ set totalQuantity = quantity khi thực sự chưa có trong database (trường hợp migrate dữ liệu cũ)
      if (typeof lineData.voucherDetail.totalQuantity === 'number') {
        detail.totalQuantity = lineData.voucherDetail.totalQuantity;
      } else if (typeof existingDetail?.totalQuantity === 'number') {
        // Giữ nguyên totalQuantity từ database
        detail.totalQuantity = existingDetail.totalQuantity;
      } else if (typeof detail.quantity === 'number') {
        // Chỉ set totalQuantity = quantity khi thực sự chưa có trong database
        detail.totalQuantity = detail.quantity;
      }

      // Đồng bộ legacy fields ở cấp header
      try {
        if (typeof lineData.voucherDetail.quantity === "number") {
          (voucher as any).quantity = lineData.voucherDetail.quantity;
        }
        if (typeof lineData.voucherDetail.pointToRedeem === "number") {
          (voucher as any).pointToRedeem = lineData.voucherDetail.pointToRedeem;
        }
        if (typeof lineData.voucherDetail.discountPercent === "number") {
          (voucher as any).discountPercent =
            lineData.voucherDetail.discountPercent;
        }
      } catch {}
    } else if (
      lineData.promotionType === "percent" &&
      lineData.discountDetail
    ) {
      detail = lineData.discountDetail;
    } else if (lineData.promotionType === "amount" && lineData.amountDetail) {
      detail = lineData.amountDetail;
    } else if (lineData.promotionType === "item" && lineData.itemDetail) {
      detail = lineData.itemDetail;
    }

    // Kiểm tra nếu admin đang cố gắng set status = 'hoạt động'
    if (lineData.status === "hoạt động") {
      const budgetCheck = await this.checkBudgetAvailability(
        voucherId,
        lineIndex,
        lineData.promotionType,
        detail
      );

      if (!budgetCheck.isAvailable) {
        throw new Error(budgetCheck.message);
      }
    }

    // Tự động cập nhật status dựa trên ngân sách mới (sau khi admin sửa)
    // Điều này đảm bảo nếu admin giảm ngân sách tổng, status sẽ tự động chuyển thành inactive
    const finalStatus = await this.autoUpdateStatus(
      voucherId,
      lineIndex,
      lineData.promotionType,
      detail,
      lineData.status
    );

    // Cập nhật line
    voucher.lines[lineIndex] = {
      promotionType: lineData.promotionType,
      validityPeriod: {
        startDate: lineData.startDate,
        endDate: lineData.endDate,
      },
      status: finalStatus as "hoạt động" | "không hoạt động",
      originalStatus: lineData.status, // Cập nhật originalStatus khi admin thay đổi
      detail: detail,
      rule: lineData.rule,
      code: lineData.code || voucher.lines[lineIndex].code, // Giữ lại code cũ hoặc lấy code mới
    };

    await voucher.save();

    return voucher;
  }

  async deletePromotionLine(
    voucherId: string,
    lineIndex: number
  ): Promise<IVoucher | null> {
    const voucher = await Voucher.findById(voucherId);
    if (!voucher) throw new Error("Voucher không tồn tại");

    if (
      !Array.isArray(voucher.lines) ||
      lineIndex < 0 ||
      lineIndex >= voucher.lines.length
    ) {
      throw new Error("Line không tồn tại");
    }

    // Kiểm tra nếu line đang hoạt động thì không cho phép xóa
    const lineToDelete = voucher.lines[lineIndex];
    if (lineToDelete.status === "hoạt động") {
      throw new Error(
        'Không thể xóa line đang hoạt động. Vui lòng thay đổi trạng thái thành "không hoạt động" trước khi xóa.'
      );
    }

    // Xóa line tại index
    voucher.lines.splice(lineIndex, 1);

    await voucher.save();

    return voucher;
  }

  async redeemVoucher(
    userId: string,
    payload: { voucherId: string; detailId?: string }
  ) {
    const { voucherId, detailId } = payload;
    const voucher: any = await Voucher.findById(voucherId);
    if (!voucher) throw new Error("Voucher không tồn tại");

    // Nếu có detailId thì chọn đúng line chứa detail._id; nếu không, fallback line đầu
    let targetLine: any = undefined;
    if (detailId) {
      targetLine = (voucher.lines || []).find(
        (l: any) => l?.detail?._id?.toString?.() === detailId
      );
    }
    const firstLine: any =
      targetLine ??
      (Array.isArray(voucher.lines) ? voucher.lines[0] : undefined);
    if (!firstLine) throw new Error("Voucher không có line hợp lệ");

    // Kiểm tra trạng thái và thời hạn của voucher/line
    if (voucher.status !== "hoạt động") {
      throw new Error("Voucher đang không hoạt động");
    }
    if (firstLine.status !== "hoạt động") {
      throw new Error("Chi tiết voucher (line) không hoạt động");
    }
    const start: Date | undefined =
      firstLine?.validityPeriod?.startDate ?? voucher.startDate;
    const end: Date | undefined =
      firstLine?.validityPeriod?.endDate ?? voucher.endDate;
    const now = new Date();
    if (start && new Date(start) > now) {
      throw new Error("Voucher chưa đến thời gian áp dụng");
    }
    if (end && new Date(end) < now) {
      throw new Error("Voucher đã hết hạn");
    }

    // Lấy số lượng hiện hành theo đúng line được chọn
    const detailQuantity: number = Number(firstLine?.detail?.quantity ?? 0);
    const availableQuantity = detailQuantity;
    if (availableQuantity <= 0) throw new Error("Voucher đã hết số lượng");

    const user = await User.findById(userId);
    if (!user) throw new Error("User không tồn tại");

    const newPoints: number | undefined = firstLine?.detail?.pointToRedeem;
    const legacyPoints: number | undefined = (voucher as any).pointToRedeem;
    const neededPoints = (newPoints ?? legacyPoints ?? 0) as number;
    if ((user.point ?? 0) < neededPoints)
      throw new Error("Bạn không đủ điểm để đổi voucher này");

    user.point = (user.point ?? 0) - neededPoints;
    await user.save();

    const nextQuantity = Math.max(0, availableQuantity - 1);
    // Chỉ cập nhật số lượng của line tương ứng. Không đụng tới header.quantity khi đổi theo detailId
    try {
      if (firstLine?.detail) {
        firstLine.detail.quantity = nextQuantity;
      }
      // Vì detail là Mixed nên cần markModified để Mongoose lưu thay đổi
      try {
        (voucher as any).markModified && (voucher as any).markModified("lines");
      } catch {}
      await voucher.save();
    } catch {}

    // Tạo code dạng 8 ký tự in hoa, đảm bảo unique theo cách thử lặp nhỏ
    let code = "";
    let attempts = 0;
    while (attempts < 5) {
      code = Math.random().toString(36).substring(2, 10).toUpperCase();
      const exist = await UserVoucher.findOne({ code });
      if (!exist) break;
      attempts++;
    }
    if (!code) {
      throw new Error("Không thể tạo mã voucher. Vui lòng thử lại.");
    }

    // Nếu line là voucher, dùng id riêng của detail làm voucherId cho UserVoucher; ngược lại dùng header id
    const voucherLineId: any =
      firstLine?.promotionType === "voucher" && firstLine?.detail?._id
        ? firstLine.detail._id
        : voucherId;
    const userVoucher = new UserVoucher({
      userId,
      voucherId: voucherLineId,
      code,
      status: "unused",
      redeemedAt: new Date(),
    });
    await userVoucher.save();
    const populatedUserVoucher = await UserVoucher.findById(
      userVoucher._id
    ).populate("voucherId");
    return populatedUserVoucher;
  }

  // Lấy danh sách khuyến mãi hàng đang hoạt động
  async getActiveItemPromotions(): Promise<{
    status: boolean;
    error: number;
    message: string;
    data: any;
  }> {
    try {
      const now = new Date();

      // Tìm tất cả voucher có status = 'hoạt động' và có ít nhất 1 line với promotionType = 'item'
      // Không filter theo ngày tháng, chỉ dựa vào trạng thái
      const vouchers = await Voucher.find({
        status: "hoạt động",
        "lines.promotionType": "item",
      });

      console.log(`🔍 Found ${vouchers.length} vouchers with item promotions`);

      const itemPromotions: any[] = [];

      vouchers.forEach((voucher) => {
        console.log(
          `  Voucher: ${voucher.name} (${voucher.promotionalCode}) - ${voucher.lines.length} lines`
        );
        voucher.lines.forEach((line) => {
          if (line.promotionType === "item" && line.status === "hoạt động") {
            // Chỉ kiểm tra trạng thái, không kiểm tra ngày tháng
            const itemDetail = line.detail as any;
            console.log(
              `    ✅ Active line: ${itemDetail?.description} (comboId: ${itemDetail?.comboId})`
            );
            itemPromotions.push({
              voucherId: voucher._id,
              voucherName: voucher.name,
              promotionalCode: voucher.promotionalCode,
              lineIndex: voucher.lines.indexOf(line),
              promotionType: line.promotionType,
              validityPeriod: line.validityPeriod,
              status: line.status,
              detail: line.detail,
              rule: line.rule,
            });
          } else {
            const itemDetail = line.detail as any;
            console.log(
              `    ❌ Inactive line: ${itemDetail?.description} (status: ${line.status})`
            );
          }
        });
      });

      return {
        status: true,
        error: 0,
        message: "Lấy danh sách khuyến mãi hàng thành công",
        data: itemPromotions,
      };
    } catch (error) {
      console.error("Error getting active item promotions:", error);
      return {
        status: false,
        error: 1,
        message: "Có lỗi xảy ra khi lấy danh sách khuyến mãi hàng",
        data: null,
      };
    }
  }

  // Áp dụng khuyến mãi chiết khấu (percent) dựa trên combo và vé được chọn
  async applyPercentPromotions(
    selectedCombos: Array<{
      comboId: string;
      quantity: number;
      name: string;
      price: number;
    }>,
    appliedPromotions: any[] = [],
    selectedSeats?: Array<{ seatId: string; type: string; price: number }>
  ): Promise<{
    status: boolean;
    error: number;
    message: string;
    data: any;
  }> {
    try {
      // Tìm tất cả voucher có lines với promotionType = 'percent' và status = 'hoạt động'
      const now = new Date();
      const vouchers = await Voucher.find({
        status: "hoạt động",
        "lines.promotionType": "percent",
      });

      console.log(
        `🔍 Found ${vouchers.length} vouchers with percent promotions`
      );

      const percentPromotions: any[] = [];

      vouchers.forEach((voucher) => {
        voucher.lines.forEach((line) => {
          if (line.promotionType === "percent" && line.status === "hoạt động") {
            const percentDetail = line.detail as any;
            console.log(
              `    ✅ Active percent line: ${percentDetail?.description} (applyType: ${percentDetail?.applyType})`
            );
            percentPromotions.push({
              voucherId: voucher._id,
              voucherName: voucher.name,
              promotionalCode: voucher.promotionalCode,
              lineIndex: voucher.lines.indexOf(line),
              promotionType: line.promotionType,
              validityPeriod: line.validityPeriod,
              status: line.status,
              detail: line.detail,
              rule: line.rule,
            });
          } else {
            const percentDetail = line.detail as any;
            console.log(
              `    ❌ Inactive percent line: ${percentDetail?.description} (status: ${line.status})`
            );
          }
        });
      });

      const applicablePromotions: any[] = [];
      const exclusionGroups = new Map<string, any[]>();

      console.log(
        `🔍 Processing ${percentPromotions.length} active percent promotions`
      );
      console.log(`🔍 Selected combos:`, selectedCombos);
      console.log(`🔍 Selected seats:`, selectedSeats);

      // Tính tổng giá vé theo loại ghế (normalize to lowercase)
      const seatTypeTotals: Record<string, number> = {};
      if (selectedSeats && Array.isArray(selectedSeats)) {
        selectedSeats.forEach((seat) => {
          const seatType = (seat.type || "normal").toLowerCase(); // Normalize to lowercase
          seatTypeTotals[seatType] =
            (seatTypeTotals[seatType] || 0) + seat.price;
        });
      }
      console.log(`🔍 Seat type totals:`, seatTypeTotals);

      // Duyệt qua từng khuyến mãi chiết khấu
      for (const promotion of percentPromotions) {
        const detail = promotion.detail;

        console.log(
          `🔍 Checking percent promotion: ${detail?.description} (applyType: ${detail?.applyType})`
        );

        // Kiểm tra điều kiện áp dụng cho COMBO
        if (detail.applyType === "combo") {
          const selectedCombo = selectedCombos.find(
            (combo) => combo.comboId === detail.comboId
          );
          console.log(`🔍 Found selected combo:`, selectedCombo);

          if (selectedCombo && selectedCombo.quantity > 0) {
            // Tính số tiền giảm
            const totalComboPrice =
              selectedCombo.price * selectedCombo.quantity;
            const discountAmount = Math.round(
              (totalComboPrice * detail.comboDiscountPercent) / 100
            );

            if (discountAmount > 0) {
              const promotionResult = {
                ...promotion,
                comboName: detail.comboName,
                comboId: detail.comboId,
                discountPercent: detail.comboDiscountPercent,
                discountAmount: discountAmount,
                totalComboPrice: totalComboPrice,
              };

              // Xử lý quy tắc loại trừ theo nhóm
              if (promotion.rule?.stackingPolicy === "EXCLUSIVE_WITH_GROUP") {
                const exclusionGroup = promotion.rule.exclusionGroup;

                console.log(
                  `🎯 Adding to exclusion group "${exclusionGroup}": ${promotionResult.detail?.description}`
                );

                if (!exclusionGroups.has(exclusionGroup)) {
                  exclusionGroups.set(exclusionGroup, []);
                }
                exclusionGroups.get(exclusionGroup)!.push(promotionResult);
              } else {
                // Có thể cộng dồn
                console.log(
                  `➕ Adding standalone percent promotion: ${promotionResult.detail?.description}`
                );
                applicablePromotions.push(promotionResult);
              }
            }
          }
        }
        // Kiểm tra điều kiện áp dụng cho VÉ (TICKET)
        else if (detail.applyType === "ticket") {
          const seatType = (detail.seatType || "").toLowerCase(); // Normalize to lowercase để match với database
          const ticketDiscountPercent = detail.ticketDiscountPercent || 0;

          console.log(
            `🔍 Checking ticket percent promotion: seatType=${seatType}, discountPercent=${ticketDiscountPercent}%`
          );
          console.log(
            `🔍 Total price for seats of type "${seatType}": ${
              seatTypeTotals[seatType] || 0
            }₫`
          );
          console.log(`🔍 Available seat types:`, Object.keys(seatTypeTotals));

          // Kiểm tra xem có vé loại này không
          if (seatTypeTotals[seatType] > 0 && ticketDiscountPercent > 0) {
            // Tính số tiền giảm
            const discountAmount = Math.round(
              (seatTypeTotals[seatType] * ticketDiscountPercent) / 100
            );

            if (discountAmount > 0) {
              // Tạo description cho ticket promotion
              const description =
                promotion.detail?.description ||
                `Giảm ${ticketDiscountPercent}% vé ${seatType}`;

              // Tạo promotionResult cho ticket promotion - chỉ lấy các field cần thiết
              const promotionResult = {
                voucherId: promotion.voucherId,
                voucherName: promotion.voucherName,
                promotionalCode: promotion.promotionalCode,
                lineIndex: promotion.lineIndex,
                promotionType: promotion.promotionType,
                validityPeriod: promotion.validityPeriod,
                status: promotion.status,
                detail: promotion.detail,
                rule: promotion.rule,
                seatType: seatType, // Chỉ có với ticket promotion
                discountPercent: ticketDiscountPercent,
                discountAmount: discountAmount,
                totalTicketPrice: seatTypeTotals[seatType],
                description: description, // Thêm description để frontend hiển thị
                // KHÔNG thêm comboName/comboId vì đây là promotion cho vé, không phải combo
              };

              // Xử lý quy tắc loại trừ theo nhóm
              if (promotion.rule?.stackingPolicy === "EXCLUSIVE_WITH_GROUP") {
                const exclusionGroup = promotion.rule.exclusionGroup;

                console.log(
                  `🎯 Adding ticket percent promotion to exclusion group "${exclusionGroup}": ${promotionResult.detail?.description}`
                );

                if (!exclusionGroups.has(exclusionGroup)) {
                  exclusionGroups.set(exclusionGroup, []);
                }
                exclusionGroups.get(exclusionGroup)!.push(promotionResult);
              } else {
                // Có thể cộng dồn
                console.log(
                  `➕ Adding standalone ticket percent promotion: ${promotionResult.detail?.description}`
                );
                applicablePromotions.push(promotionResult);
              }
            }
          } else {
            console.log(
              `❌ No tickets or invalid discount: seatType=${seatType}, total=${
                seatTypeTotals[seatType] || 0
              }, percent=${ticketDiscountPercent}`
            );
          }
        }
      }

      // Xử lý các nhóm loại trừ - chỉ lấy khuyến mãi tốt nhất trong mỗi nhóm
      for (const [groupName, groupPromotions] of exclusionGroups) {
        if (groupPromotions.length > 0) {
          console.log(
            `🔍 Debug exclusion group "${groupName}":`,
            groupPromotions.length,
            "promotions"
          );
          groupPromotions.forEach((promo, index) => {
            console.log(
              `  ${index + 1}. ${promo.detail?.description} (discountPercent: ${
                promo.discountPercent
              }%)`
            );
          });

          // Sắp xếp theo discountPercent giảm dần để lấy khuyến mãi có % giảm cao nhất
          groupPromotions.sort(
            (a: any, b: any) => b.discountPercent - a.discountPercent
          );
          const bestPromotion = groupPromotions[0];

          console.log(
            `✅ Selected best percent promotion: ${bestPromotion.detail?.description}`
          );
          applicablePromotions.push(bestPromotion);
        }
      }

      console.log(
        `🔍 Before filtering: ${applicablePromotions.length} percent promotions`
      );
      console.log(
        `🔍 Applied promotions to filter: ${appliedPromotions.length} items`
      );

      // Loại bỏ các khuyến mãi đã được áp dụng
      const newPromotions = applicablePromotions.filter(
        (promo: any) =>
          !appliedPromotions.some(
            (applied: any) =>
              applied.voucherId === promo.voucherId &&
              applied.lineIndex === promo.lineIndex
          )
      );

      console.log(
        `🔍 After filtering: ${newPromotions.length} percent promotions`
      );

      console.log(
        `✅ Final percent result: ${newPromotions.length} promotions applied`
      );
      newPromotions.forEach((promo) => {
        console.log(`   - ${promo.detail?.description}`);
      });

      return {
        status: true,
        error: 0,
        message: "Áp dụng khuyến mãi chiết khấu thành công",
        data: {
          applicablePromotions: newPromotions,
          totalDiscountAmount: newPromotions.reduce(
            (sum: number, promo: any) => sum + promo.discountAmount,
            0
          ),
        },
      };
    } catch (error: any) {
      console.error("Error applying percent promotions:", error);
      return {
        status: false,
        error: 1,
        message: "Có lỗi xảy ra khi áp dụng khuyến mãi chiết khấu",
        data: null,
      };
    }
  }

  // Áp dụng khuyến mãi hàng dựa trên combo và vé được chọn
  async applyItemPromotions(
    selectedCombos: Array<{ comboId: string; quantity: number; name: string }>,
    appliedPromotions: any[] = [],
    selectedSeats?: Array<{ seatId: string; type: string; price: number }>
  ): Promise<{
    status: boolean;
    error: number;
    message: string;
    data: any;
  }> {
    try {
      const activePromotions = await this.getActiveItemPromotions();

      if (!activePromotions.status || !activePromotions.data) {
        return {
          status: false,
          error: 1,
          message: "Không thể lấy danh sách khuyến mãi",
          data: null,
        };
      }

      const applicablePromotions: any[] = [];
      const exclusionGroups = new Map<string, any[]>(); // Nhóm loại trừ

      console.log(
        `🔍 Processing ${activePromotions.data.length} active promotions`
      );
      console.log(`🔍 Selected combos:`, selectedCombos);
      console.log(`🔍 Selected seats:`, selectedSeats);

      // Tính số lượng vé theo loại ghế (normalize to lowercase)
      const seatTypeCounts: Record<string, number> = {};
      if (selectedSeats && Array.isArray(selectedSeats)) {
        selectedSeats.forEach((seat) => {
          const seatType = (seat.type || "normal").toLowerCase(); // Normalize to lowercase
          seatTypeCounts[seatType] = (seatTypeCounts[seatType] || 0) + 1;
        });
      }
      console.log(`🔍 Seat type counts:`, seatTypeCounts);

      // Duyệt qua từng khuyến mãi hàng
      for (const promotion of activePromotions.data) {
        const detail = promotion.detail;
        console.log(
          `🔍 Checking promotion: ${detail?.description} (applyType: ${detail?.applyType})`
        );

        // Kiểm tra điều kiện áp dụng cho COMBO
        if (detail.applyType === "combo") {
          const selectedCombo = selectedCombos.find(
            (combo) => combo.comboId === detail.comboId
          );
          console.log(`🔍 Found selected combo:`, selectedCombo);

          if (selectedCombo && selectedCombo.quantity >= detail.buyQuantity) {
            // Khuyến mãi hàng: chỉ tặng 1 lần khi đạt đủ điều kiện, không cộng dồn
            // VD: mua 2 combo family tặng 1 snack poca
            // Nếu mua 4 combo family vẫn chỉ tặng 1 snack poca
            const rewardQuantity = detail.rewardQuantity;

            const promotionResult = {
              ...promotion,
              applicableQuantity: rewardQuantity,
              triggerQuantity: detail.buyQuantity,
              rewardItem: detail.rewardItem,
              rewardQuantity: rewardQuantity,
              rewardType: detail.rewardType,
              rewardDiscountPercent: detail.rewardDiscountPercent || 0,
            };

            // Xử lý quy tắc loại trừ theo nhóm
            if (promotion.rule?.stackingPolicy === "EXCLUSIVE_WITH_GROUP") {
              const exclusionGroup = promotion.rule.exclusionGroup;

              console.log(
                `🎯 Adding to exclusion group "${exclusionGroup}": ${promotionResult.detail?.description}`
              );

              if (!exclusionGroups.has(exclusionGroup)) {
                exclusionGroups.set(exclusionGroup, []);
              }
              exclusionGroups.get(exclusionGroup)!.push(promotionResult);
            } else {
              // Có thể cộng dồn
              console.log(
                `➕ Adding standalone promotion: ${promotionResult.detail?.description}`
              );
              applicablePromotions.push(promotionResult);
            }
          }
        }
        // Kiểm tra điều kiện áp dụng cho VÉ (TICKET)
        else if (detail.applyType === "ticket") {
          const buyItem = (detail.buyItem || "").toLowerCase(); // Normalize to lowercase để match với database
          const buyQuantity = detail.buyQuantity; // Số lượng vé cần mua

          console.log(
            `🔍 Checking ticket promotion: buyItem=${buyItem}, buyQuantity=${buyQuantity}`
          );
          console.log(
            `🔍 Available seats of type "${buyItem}": ${
              seatTypeCounts[buyItem] || 0
            }`
          );
          console.log(`🔍 Available seat types:`, Object.keys(seatTypeCounts));

          // Kiểm tra xem có đủ số lượng vé loại này không
          if (seatTypeCounts[buyItem] >= buyQuantity) {
            const rewardQuantity = detail.rewardQuantity;

            const promotionResult = {
              ...promotion,
              applicableQuantity: rewardQuantity,
              triggerQuantity: buyQuantity,
              rewardItem: detail.rewardItem,
              rewardQuantity: rewardQuantity,
              rewardType: detail.rewardType,
              rewardDiscountPercent: detail.rewardDiscountPercent || 0,
            };

            // Xử lý quy tắc loại trừ theo nhóm
            if (promotion.rule?.stackingPolicy === "EXCLUSIVE_WITH_GROUP") {
              const exclusionGroup = promotion.rule.exclusionGroup;

              console.log(
                `🎯 Adding ticket promotion to exclusion group "${exclusionGroup}": ${promotionResult.detail?.description}`
              );

              if (!exclusionGroups.has(exclusionGroup)) {
                exclusionGroups.set(exclusionGroup, []);
              }
              exclusionGroups.get(exclusionGroup)!.push(promotionResult);
            } else {
              // Có thể cộng dồn
              console.log(
                `➕ Adding standalone ticket promotion: ${promotionResult.detail?.description}`
              );
              applicablePromotions.push(promotionResult);
            }
          } else {
            console.log(
              `❌ Not enough tickets: need ${buyQuantity} ${buyItem}, got ${
                seatTypeCounts[buyItem] || 0
              }`
            );
          }
        }
      }

      // Xử lý các nhóm loại trừ - chỉ lấy khuyến mãi tốt nhất trong mỗi nhóm
      for (const [groupName, groupPromotions] of exclusionGroups) {
        if (groupPromotions.length > 0) {
          console.log(
            `🔍 Debug exclusion group "${groupName}":`,
            groupPromotions.length,
            "promotions"
          );
          groupPromotions.forEach((promo, index) => {
            console.log(
              `  ${index + 1}. ${promo.detail?.description} (buyQuantity: ${
                promo.detail?.buyQuantity
              })`
            );
          });

          // Sắp xếp theo buyQuantity giảm dần để lấy khuyến mãi yêu cầu mua nhiều nhất (tốt nhất)
          // VD: mua 5 combo tặng bắp phô mai tốt hơn mua 2 combo tặng snack poca
          groupPromotions.sort(
            (a: any, b: any) => b.detail.buyQuantity - a.detail.buyQuantity
          );
          const bestPromotion = groupPromotions[0];

          console.log(
            `✅ Selected best promotion: ${bestPromotion.detail?.description}`
          );
          applicablePromotions.push(bestPromotion);
        }
      }

      console.log(
        `🔍 Before filtering: ${applicablePromotions.length} promotions`
      );
      console.log(
        `🔍 Applied promotions to filter: ${appliedPromotions.length} items`
      );

      // Loại bỏ các khuyến mãi đã được áp dụng
      const newPromotions = applicablePromotions.filter(
        (promo: any) =>
          !appliedPromotions.some(
            (applied: any) =>
              applied.voucherId === promo.voucherId &&
              applied.lineIndex === promo.lineIndex
          )
      );

      console.log(`🔍 After filtering: ${newPromotions.length} promotions`);

      return {
        status: true,
        error: 0,
        message: "Áp dụng khuyến mãi hàng thành công",
        data: {
          applicablePromotions: newPromotions,
          totalRewardItems: newPromotions.reduce(
            (sum: number, promo: any) => sum + promo.rewardQuantity,
            0
          ),
        },
      };
    } catch (error: any) {
      console.error("Error applying item promotions:", error);
      return {
        status: false,
        error: 1,
        message: "Có lỗi xảy ra khi áp dụng khuyến mãi hàng",
        data: null,
      };
    }
  }

  // Tính tổng ngân sách đã dùng cho khuyến mãi tiền (amount) theo voucher line
  async getAmountBudgetUsed(
    voucherId: string,
    lineIndex: number
  ): Promise<{ usedBudget: number }> {
    const voucher = await Voucher.findById(voucherId).lean();
    if (!voucher) throw new Error("Voucher không tồn tại");
    if (
      !Array.isArray(voucher.lines) ||
      lineIndex < 0 ||
      lineIndex >= voucher.lines.length
    ) {
      throw new Error("Line không tồn tại");
    }
    const line: any = (voucher.lines as any)[lineIndex];
    if (line?.promotionType !== "amount") {
      return { usedBudget: 0 };
    }
    const detail: any = line.detail || {};
    const minOrderValue = detail.minOrderValue;
    const discountValue = detail.discountValue;
    const exclusionGroup = line?.rule?.exclusionGroup || undefined;
    const startDate = line?.validityPeriod?.startDate
      ? new Date(line.validityPeriod.startDate)
      : undefined;
    const endDate = line?.validityPeriod?.endDate
      ? new Date(line.validityPeriod.endDate)
      : undefined;

    // Xây dựng điều kiện tìm kiếm orders CONFIRMED áp dụng đúng amount discount tương ứng
    const match: any = {
      orderStatus: "CONFIRMED",
      amountDiscount: { $gt: 0 },
      "amountDiscountInfo.minOrderValue": minOrderValue,
      "amountDiscountInfo.discountValue": discountValue,
    };
    if (exclusionGroup)
      match["amountDiscountInfo.exclusionGroup"] = exclusionGroup;
    if (startDate || endDate) {
      match.createdAt = {} as any;
      if (startDate) (match.createdAt as any).$gte = startDate;
      if (endDate) (match.createdAt as any).$lte = endDate;
    }

    const agg = await Order.aggregate([
      { $match: match },
      { $group: { _id: null, total: { $sum: "$amountDiscount" } } },
    ]);
    const usedBudget =
      Array.isArray(agg) && agg.length > 0 ? agg[0].total || 0 : 0;
    return { usedBudget };
  }

  // Tính tổng ngân sách đã dùng cho khuyến mãi hàng (item): tổng rewardQuantity của các order CONFIRMED áp dụng promo này
  async getItemBudgetUsed(
    voucherId: string,
    lineIndex: number
  ): Promise<{ usedBudget: number }> {
    const voucher = await Voucher.findById(voucherId).lean();
    if (!voucher) throw new Error("Voucher không tồn tại");
    if (
      !Array.isArray(voucher.lines) ||
      lineIndex < 0 ||
      lineIndex >= voucher.lines.length
    ) {
      throw new Error("Line không tồn tại");
    }
    const line: any = (voucher.lines as any)[lineIndex];
    if (line?.promotionType !== "item") {
      return { usedBudget: 0 };
    }
    const detail: any = line.detail || {};
    const description = detail?.description;
    const rewardItem = detail?.rewardItem;
    const startDate = line?.validityPeriod?.startDate
      ? new Date(line.validityPeriod.startDate)
      : undefined;
    const endDate = line?.validityPeriod?.endDate
      ? new Date(line.validityPeriod.endDate)
      : undefined;

    const match: any = {
      orderStatus: "CONFIRMED",
      itemPromotions: { $elemMatch: {} },
    };
    if (description) match.itemPromotions.$elemMatch.description = description;
    if (rewardItem) match.itemPromotions.$elemMatch.rewardItem = rewardItem;
    if (startDate || endDate) {
      match.createdAt = {} as any;
      if (startDate) (match.createdAt as any).$gte = startDate;
      if (endDate) (match.createdAt as any).$lte = endDate;
    }

    const agg = await Order.aggregate([
      { $match: match },
      { $unwind: "$itemPromotions" },
      {
        $match: {
          ...(description ? { "itemPromotions.description": description } : {}),
          ...(rewardItem ? { "itemPromotions.rewardItem": rewardItem } : {}),
        },
      },
      {
        $group: {
          _id: null,
          total: { $sum: "$itemPromotions.rewardQuantity" },
        },
      },
    ]);
    const usedBudget =
      Array.isArray(agg) && agg.length > 0 ? agg[0].total || 0 : 0;
    return { usedBudget };
  }

  // Tính tổng ngân sách đã dùng cho khuyến mãi chiết khấu (percent): tổng discountAmount của orders CONFIRMED khớp line
  async getPercentBudgetUsed(
    voucherId: string,
    lineIndex: number
  ): Promise<{ usedBudget: number }> {
    const voucher = await Voucher.findById(voucherId).lean();
    if (!voucher) throw new Error("Voucher không tồn tại");
    if (
      !Array.isArray(voucher.lines) ||
      lineIndex < 0 ||
      lineIndex >= voucher.lines.length
    ) {
      throw new Error("Line không tồn tại");
    }
    const line: any = (voucher.lines as any)[lineIndex];
    if (line?.promotionType !== "percent") {
      return { usedBudget: 0 };
    }
    const detail: any = line.detail || {};
    const applyType = detail?.applyType;
    const comboId = detail?.comboId;
    const comboDiscountPercent = detail?.comboDiscountPercent;
    const ticketDiscountPercent = detail?.ticketDiscountPercent;
    const seatType = detail?.seatType; // Lấy seatType từ voucher detail
    const description = detail?.description;
    const startDate = line?.validityPeriod?.startDate
      ? new Date(line.validityPeriod.startDate)
      : undefined;
    const endDate = line?.validityPeriod?.endDate
      ? new Date(line.validityPeriod.endDate)
      : undefined;

    const match: any = { orderStatus: "CONFIRMED" };
    if (startDate || endDate) {
      match.createdAt = {} as any;
      if (startDate) (match.createdAt as any).$gte = startDate;
      if (endDate) (match.createdAt as any).$lte = endDate;
    }

    const pipeline: any[] = [
      { $match: match },
      { $unwind: "$percentPromotions" },
    ];
    const innerMatch: any = {};
    if (applyType === "combo") {
      if (comboId) innerMatch["percentPromotions.comboId"] = comboId;
      if (typeof comboDiscountPercent === "number")
        innerMatch["percentPromotions.discountPercent"] = comboDiscountPercent;
    } else if (applyType === "ticket") {
      // Match theo description (giống item promotion) vì đây là cách đáng tin cậy nhất
      // Description được lưu trong order từ promotion.detail?.description hoặc được tạo từ voucher
      if (description) {
        innerMatch["percentPromotions.description"] = description;
      } else {
        // Fallback: nếu không có description, match theo discountPercent và seatType
        if (typeof ticketDiscountPercent === "number") {
          innerMatch["percentPromotions.discountPercent"] =
            ticketDiscountPercent;
        }
        if (seatType) {
          // Match theo seatType - dùng regex không phân biệt hoa thường để tránh case-sensitive issues
          const escapedSeatType = seatType.replace(
            /[.*+?^${}()|[\]\\]/g,
            "\\$&"
          );
          innerMatch["percentPromotions.seatType"] = {
            $regex: new RegExp(`^${escapedSeatType}$`, "i"),
          };
        }
      }
    }
    if (Object.keys(innerMatch).length > 0)
      pipeline.push({ $match: innerMatch });
    pipeline.push({
      $group: {
        _id: null,
        total: { $sum: "$percentPromotions.discountAmount" },
      },
    });

    // Debug log để kiểm tra
    console.log(
      `🔍 getPercentBudgetUsed Debug - voucherId: ${voucherId}, lineIndex: ${lineIndex}`
    );
    console.log(`  applyType: ${applyType}`);
    console.log(`  ticketDiscountPercent: ${ticketDiscountPercent}`);
    console.log(`  seatType: ${seatType}`);
    console.log(`  innerMatch:`, JSON.stringify(innerMatch, null, 2));
    console.log(`  match:`, JSON.stringify(match, null, 2));

    const agg = await Order.aggregate(pipeline);
    const usedBudget =
      Array.isArray(agg) && agg.length > 0 ? agg[0].total || 0 : 0;

    console.log(`  Result: usedBudget = ${usedBudget}`);

    return { usedBudget };
  }
}
