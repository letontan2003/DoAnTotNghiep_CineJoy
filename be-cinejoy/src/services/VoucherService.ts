import { Voucher, IVoucher } from "../models/Voucher";
import { UserVoucher } from "../models/UserVoucher";
import { Types } from "mongoose";
import { User } from "../models/User";
import SeatService from "./SeatService";

export default class VoucherService {
  // Validate seat type against database
  private async validateSeatType(seatType: string): Promise<boolean> {
    try {
      const validSeatTypes = await SeatService.getUniqueSeatTypes();
      return validSeatTypes.includes(seatType);
    } catch (error) {
      console.error('Error validating seat type:', error);
      return false;
    }
  }

  getVouchers(): Promise<IVoucher[]> {
    return Voucher.find();
  }

  getVoucherById(id: string): Promise<IVoucher | null> {
    return Voucher.findById(id);
  }

  addVoucher(data: IVoucher): Promise<IVoucher> {
    const voucher = new Voucher(data);
    return voucher.save();
  }

  updateVoucher(id: string, data: Partial<IVoucher>): Promise<IVoucher | null> {
    return Voucher.findByIdAndUpdate(id, data, { new: true });
  }

  deleteVoucher(id: string): Promise<IVoucher | null> {
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
          const first = Array.isArray(headerDoc?.lines) ? headerDoc.lines[0] : undefined;
          uv.voucherId = {
            _id: headerDoc._id,
            name: headerDoc.name,
            description: first?.detail?.description,
            validityPeriod: {
              startDate: first?.validityPeriod?.startDate || headerDoc.startDate,
              endDate: first?.validityPeriod?.endDate || headerDoc.endDate,
            },
            quantity: headerDoc.quantity ?? first?.detail?.quantity,
            discountPercent: headerDoc.discountPercent ?? first?.detail?.discountPercent,
            pointToRedeem: headerDoc.pointToRedeem ?? first?.detail?.pointToRedeem,
          };
          continue;
        }

        // Nếu không phải header id, coi như detail sub-id
        const detailId = voucherIdAny.toString();
        const voucherDoc: any = await Voucher.findOne({ "lines.detail._id": new Types.ObjectId(detailId) }).lean();
        if (voucherDoc) {
          const line = (voucherDoc.lines || []).find((l: any) => l?.detail?._id?.toString() === detailId);
          const validity = line?.validityPeriod || { startDate: voucherDoc.startDate, endDate: voucherDoc.endDate };
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

  async addPromotionLine(voucherId: string, lineData: any): Promise<IVoucher | null> {
    const voucher = await Voucher.findById(voucherId);
    if (!voucher) throw new Error("Voucher không tồn tại");

    // Validate seat types if applicable
    if (lineData.promotionType === 'percent' && lineData.discountDetail?.seatType) {
      const isValidSeatType = await this.validateSeatType(lineData.discountDetail.seatType);
      if (!isValidSeatType) {
        throw new Error(`Loại ghế '${lineData.discountDetail.seatType}' không hợp lệ`);
      }
    }
    
    if (lineData.promotionType === 'item' && lineData.itemDetail?.buyItem && lineData.itemDetail?.applyType === 'ticket') {
      const isValidSeatType = await this.validateSeatType(lineData.itemDetail.buyItem);
      if (!isValidSeatType) {
        throw new Error(`Loại ghế '${lineData.itemDetail.buyItem}' không hợp lệ`);
      }
    }

    // Xử lý detail theo promotionType
    let detail: any = {};
    if (lineData.promotionType === 'voucher' && lineData.voucherDetail) {
      // Đảm bảo VoucherDetail có _id riêng để dùng làm voucherId cho UserVoucher
      const ensuredId = lineData.voucherDetail._id ?? new Types.ObjectId();
      detail = { _id: ensuredId, ...lineData.voucherDetail };
      // Đồng bộ legacy fields ở cấp header để FE cũ đọc được
      try {
        if (typeof lineData.voucherDetail.quantity === 'number') {
          // @ts-ignore backward compat field
          (voucher as any).quantity = lineData.voucherDetail.quantity;
        }
        if (typeof lineData.voucherDetail.pointToRedeem === 'number') {
          // @ts-ignore backward compat field
          (voucher as any).pointToRedeem = lineData.voucherDetail.pointToRedeem;
        }
        if (typeof lineData.voucherDetail.discountPercent === 'number') {
          // @ts-ignore backward compat field
          (voucher as any).discountPercent = lineData.voucherDetail.discountPercent;
        }
      } catch {}
    } else if (lineData.promotionType === 'percent' && lineData.discountDetail) {
      detail = lineData.discountDetail;
    } else if (lineData.promotionType === 'amount' && lineData.amountDetail) {
      detail = lineData.amountDetail;
    } else if (lineData.promotionType === 'item' && lineData.itemDetail) {
      detail = lineData.itemDetail;
    }

    // Tạo line mới
    const newLine = {
      promotionType: lineData.promotionType,
      validityPeriod: {
        startDate: lineData.startDate,
        endDate: lineData.endDate,
      },
      status: lineData.status,
      detail: detail,
      rule: lineData.rule
    };

    // Thêm line vào voucher
    voucher.lines.push(newLine);
    await voucher.save();

    return voucher;
  }

  async updatePromotionLine(voucherId: string, lineIndex: number, lineData: any): Promise<IVoucher | null> {
    const voucher = await Voucher.findById(voucherId);
    if (!voucher) throw new Error("Voucher không tồn tại");

    if (!Array.isArray(voucher.lines) || lineIndex < 0 || lineIndex >= voucher.lines.length) {
      throw new Error("Line không tồn tại");
    }

    // Validate seat types if applicable
    if (lineData.promotionType === 'percent' && lineData.discountDetail?.seatType) {
      const isValidSeatType = await this.validateSeatType(lineData.discountDetail.seatType);
      if (!isValidSeatType) {
        throw new Error(`Loại ghế '${lineData.discountDetail.seatType}' không hợp lệ`);
      }
    }
    
    if (lineData.promotionType === 'item' && lineData.itemDetail?.buyItem && lineData.itemDetail?.applyType === 'ticket') {
      const isValidSeatType = await this.validateSeatType(lineData.itemDetail.buyItem);
      if (!isValidSeatType) {
        throw new Error(`Loại ghế '${lineData.itemDetail.buyItem}' không hợp lệ`);
      }
    }

    // Xử lý detail theo promotionType
    let detail = {};
    if (lineData.promotionType === 'voucher' && lineData.voucherDetail) {
      // Giữ nguyên _id nếu có
      const existingDetail = voucher.lines[lineIndex].detail as any;
      const ensuredId = lineData.voucherDetail._id ?? existingDetail?._id ?? new Types.ObjectId();
      detail = { _id: ensuredId, ...lineData.voucherDetail };
      
      // Đồng bộ legacy fields ở cấp header
      try {
        if (typeof lineData.voucherDetail.quantity === 'number') {
          (voucher as any).quantity = lineData.voucherDetail.quantity;
        }
        if (typeof lineData.voucherDetail.pointToRedeem === 'number') {
          (voucher as any).pointToRedeem = lineData.voucherDetail.pointToRedeem;
        }
        if (typeof lineData.voucherDetail.discountPercent === 'number') {
          (voucher as any).discountPercent = lineData.voucherDetail.discountPercent;
        }
      } catch {}
    } else if (lineData.promotionType === 'percent' && lineData.discountDetail) {
      detail = lineData.discountDetail;
    } else if (lineData.promotionType === 'amount' && lineData.amountDetail) {
      detail = lineData.amountDetail;
    } else if (lineData.promotionType === 'item' && lineData.itemDetail) {
      detail = lineData.itemDetail;
    }

    // Cập nhật line
    voucher.lines[lineIndex] = {
      promotionType: lineData.promotionType,
      validityPeriod: {
        startDate: lineData.startDate,
        endDate: lineData.endDate,
      },
      status: lineData.status,
      detail: detail,
      rule: lineData.rule
    };

    await voucher.save();

    return voucher;
  }

  async deletePromotionLine(voucherId: string, lineIndex: number): Promise<IVoucher | null> {
    const voucher = await Voucher.findById(voucherId);
    if (!voucher) throw new Error("Voucher không tồn tại");

    if (!Array.isArray(voucher.lines) || lineIndex < 0 || lineIndex >= voucher.lines.length) {
      throw new Error("Line không tồn tại");
    }

    // Xóa line tại index
    voucher.lines.splice(lineIndex, 1);

    await voucher.save();

    return voucher;
  }

  async redeemVoucher(userId: string, payload: { voucherId: string; detailId?: string }) {
    const { voucherId, detailId } = payload;
    const voucher: any = await Voucher.findById(voucherId);
    if (!voucher) throw new Error("Voucher không tồn tại");

    // Nếu có detailId thì chọn đúng line chứa detail._id; nếu không, fallback line đầu
    let targetLine: any = undefined;
    if (detailId) {
      targetLine = (voucher.lines || []).find((l: any) => l?.detail?._id?.toString?.() === detailId);
    }
    const firstLine: any = targetLine ?? (Array.isArray(voucher.lines) ? voucher.lines[0] : undefined);
    if (!firstLine) throw new Error("Voucher không có line hợp lệ");

    // Kiểm tra trạng thái và thời hạn của voucher/line
    if (voucher.status !== 'hoạt động') {
      throw new Error('Voucher đang không hoạt động');
    }
    if (firstLine.status !== 'hoạt động') {
      throw new Error('Chi tiết voucher (line) không hoạt động');
    }
    const start: Date | undefined = firstLine?.validityPeriod?.startDate ?? voucher.startDate;
    const end: Date | undefined = firstLine?.validityPeriod?.endDate ?? voucher.endDate;
    const now = new Date();
    if (start && new Date(start) > now) {
      throw new Error('Voucher chưa đến thời gian áp dụng');
    }
    if (end && new Date(end) < now) {
      throw new Error('Voucher đã hết hạn');
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
    if ((user.point ?? 0) < neededPoints) throw new Error("Bạn không đủ điểm để đổi voucher này");

    user.point = (user.point ?? 0) - neededPoints;
    await user.save();

    const nextQuantity = Math.max(0, availableQuantity - 1);
    // Chỉ cập nhật số lượng của line tương ứng. Không đụng tới header.quantity khi đổi theo detailId
    try {
      if (firstLine?.detail) {
        firstLine.detail.quantity = nextQuantity;
      }
      // Vì detail là Mixed nên cần markModified để Mongoose lưu thay đổi
      try { (voucher as any).markModified && (voucher as any).markModified('lines'); } catch {}
      await voucher.save();
    } catch {}

    // Tạo code dạng 8 ký tự in hoa, đảm bảo unique theo cách thử lặp nhỏ
    let code = '';
    let attempts = 0;
    while (attempts < 5) {
      code = Math.random().toString(36).substring(2, 10).toUpperCase();
      const exist = await UserVoucher.findOne({ code });
      if (!exist) break;
      attempts++;
    }
    if (!code) {
      throw new Error('Không thể tạo mã voucher. Vui lòng thử lại.');
    }

    // Nếu line là voucher, dùng id riêng của detail làm voucherId cho UserVoucher; ngược lại dùng header id
    const voucherLineId: any = (firstLine?.promotionType === 'voucher' && firstLine?.detail?._id)
      ? firstLine.detail._id
      : voucherId;
    const userVoucher = new UserVoucher({
      userId,
      voucherId: voucherLineId,
      code,
      status: 'unused',
      redeemedAt: new Date(),
    });
    await userVoucher.save();
    const populatedUserVoucher = await UserVoucher.findById(userVoucher._id).populate('voucherId');
    return populatedUserVoucher;
  }
}
