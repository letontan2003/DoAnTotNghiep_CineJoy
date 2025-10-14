import { Voucher, IVoucher } from "../models/Voucher";
import Order from "../models/Order";
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

  // Tạo mã code 10 số ngẫu nhiên
  private generatePromotionLineCode(): string {
    return Math.floor(1000000000 + Math.random() * 9000000000).toString();
  }

  // Kiểm tra mã code có bị trùng không
  private async isCodeUnique(code: string): Promise<boolean> {
    try {
      const existingVoucher = await Voucher.findOne({ 'lines.code': code });
      return !existingVoucher;
    } catch (error) {
      console.error('Error checking code uniqueness:', error);
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
        status: "hoạt động"
      });

      let bestDiscount = 0;
      let bestDiscountInfo = null;

      // Tìm amount discount phù hợp nhất (cao nhất nhưng không vượt quá orderTotal)
      for (const voucher of activeAmountVouchers) {
        for (const line of voucher.lines || []) {
          if (line.promotionType === "amount" && line.status === "hoạt động" && line.detail) {
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
                description: detail.description || `Giảm ${discountValue.toLocaleString('vi-VN')}₫ cho hóa đơn từ ${minOrderValue.toLocaleString('vi-VN')}₫`,
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
      
      // Tự động set totalQuantity nếu chưa có
      if (typeof detail.quantity === 'number' && !detail.totalQuantity) {
        detail.totalQuantity = detail.quantity;
      }
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

    // Tạo mã code duy nhất cho promotion line
    let promotionLineCode: string;
    let attempts = 0;
    do {
      promotionLineCode = this.generatePromotionLineCode();
      attempts++;
      if (attempts > 10) {
        throw new Error('Không thể tạo mã code duy nhất sau 10 lần thử');
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
      detail: detail,
      rule: lineData.rule,
      code: promotionLineCode // Tự động tạo mã code 10 số
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
    let detail: any = {};
    if (lineData.promotionType === 'voucher' && lineData.voucherDetail) {
      // Giữ nguyên _id nếu có
      const existingDetail = voucher.lines[lineIndex].detail as any;
      const ensuredId = lineData.voucherDetail._id ?? existingDetail?._id ?? new Types.ObjectId();
      detail = { _id: ensuredId, ...lineData.voucherDetail };
      
      // Xử lý totalQuantity: chỉ cập nhật nếu được cung cấp, nếu không thì giữ nguyên giá trị cũ
      if (typeof lineData.voucherDetail.totalQuantity === 'number') {
        detail.totalQuantity = lineData.voucherDetail.totalQuantity;
      } else if (!detail.totalQuantity && typeof detail.quantity === 'number') {
        // Nếu chưa có totalQuantity và có quantity, set totalQuantity = quantity
        detail.totalQuantity = detail.quantity;
      }
      
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
        "lines.promotionType": "item"
      });

      console.log(`🔍 Found ${vouchers.length} vouchers with item promotions`);
      
      const itemPromotions: any[] = [];

      vouchers.forEach(voucher => {
        console.log(`  Voucher: ${voucher.name} (${voucher.promotionalCode}) - ${voucher.lines.length} lines`);
        voucher.lines.forEach(line => {
          if (line.promotionType === "item" && line.status === "hoạt động") {
            // Chỉ kiểm tra trạng thái, không kiểm tra ngày tháng
            const itemDetail = line.detail as any;
            console.log(`    ✅ Active line: ${itemDetail?.description} (comboId: ${itemDetail?.comboId})`);
            itemPromotions.push({
              voucherId: voucher._id,
              voucherName: voucher.name,
              promotionalCode: voucher.promotionalCode,
              lineIndex: voucher.lines.indexOf(line),
              promotionType: line.promotionType,
              validityPeriod: line.validityPeriod,
              status: line.status,
              detail: line.detail,
              rule: line.rule
            });
          } else {
            const itemDetail = line.detail as any;
            console.log(`    ❌ Inactive line: ${itemDetail?.description} (status: ${line.status})`);
          }
        });
      });

      return {
        status: true,
        error: 0,
        message: "Lấy danh sách khuyến mãi hàng thành công",
        data: itemPromotions
      };
    } catch (error) {
      console.error("Error getting active item promotions:", error);
      return {
        status: false,
        error: 1,
        message: "Có lỗi xảy ra khi lấy danh sách khuyến mãi hàng",
        data: null
      };
    }
  }

  // Áp dụng khuyến mãi chiết khấu (percent) dựa trên combo được chọn
  async applyPercentPromotions(
    selectedCombos: Array<{ comboId: string; quantity: number; name: string; price: number }>,
    appliedPromotions: any[] = []
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
        "lines.promotionType": "percent"
      });

      console.log(`🔍 Found ${vouchers.length} vouchers with percent promotions`);
      
      const percentPromotions: any[] = [];

      vouchers.forEach(voucher => {
        voucher.lines.forEach(line => {
          if (line.promotionType === "percent" && line.status === "hoạt động") {
            const percentDetail = line.detail as any;
            console.log(`    ✅ Active percent line: ${percentDetail?.description} (comboId: ${percentDetail?.comboId})`);
            percentPromotions.push({
              voucherId: voucher._id,
              voucherName: voucher.name,
              promotionalCode: voucher.promotionalCode,
              lineIndex: voucher.lines.indexOf(line),
              promotionType: line.promotionType,
              validityPeriod: line.validityPeriod,
              status: line.status,
              detail: line.detail,
              rule: line.rule
            });
          } else {
            const percentDetail = line.detail as any;
            console.log(`    ❌ Inactive percent line: ${percentDetail?.description} (status: ${line.status})`);
          }
        });
      });

      const applicablePromotions: any[] = [];
      const exclusionGroups = new Map<string, any[]>();

      console.log(`🔍 Processing ${percentPromotions.length} active percent promotions`);
      console.log(`🔍 Selected combos:`, selectedCombos);

      // Duyệt qua từng khuyến mãi chiết khấu
      for (const promotion of percentPromotions) {
        const detail = promotion.detail;
        
        console.log(`🔍 Checking percent promotion: ${detail?.description} (comboId: ${detail?.comboId})`);
        
        // Kiểm tra điều kiện áp dụng
        if (detail.applyType === "combo") {
          const selectedCombo = selectedCombos.find(combo => combo.comboId === detail.comboId);
          console.log(`🔍 Found selected combo:`, selectedCombo);
          
          if (selectedCombo && selectedCombo.quantity > 0) {
            // Tính số tiền giảm
            const totalComboPrice = selectedCombo.price * selectedCombo.quantity;
            const discountAmount = Math.round((totalComboPrice * detail.comboDiscountPercent) / 100);
            
            if (discountAmount > 0) {
              const promotionResult = {
                ...promotion,
                comboName: detail.comboName,
                comboId: detail.comboId,
                discountPercent: detail.comboDiscountPercent,
                discountAmount: discountAmount,
                totalComboPrice: totalComboPrice
              };

              // Xử lý quy tắc loại trừ theo nhóm
              if (promotion.rule?.stackingPolicy === "EXCLUSIVE_WITH_GROUP") {
                const exclusionGroup = promotion.rule.exclusionGroup;
                
                console.log(`🎯 Adding to exclusion group "${exclusionGroup}": ${promotionResult.detail?.description}`);
                
                if (!exclusionGroups.has(exclusionGroup)) {
                  exclusionGroups.set(exclusionGroup, []);
                }
                exclusionGroups.get(exclusionGroup)!.push(promotionResult);
              } else {
                // Có thể cộng dồn
                console.log(`➕ Adding standalone percent promotion: ${promotionResult.detail?.description}`);
                applicablePromotions.push(promotionResult);
              }
            }
          }
        }
      }

      // Xử lý các nhóm loại trừ - chỉ lấy khuyến mãi tốt nhất trong mỗi nhóm
      for (const [groupName, groupPromotions] of exclusionGroups) {
        if (groupPromotions.length > 0) {
          console.log(`🔍 Debug exclusion group "${groupName}":`, groupPromotions.length, 'promotions');
          groupPromotions.forEach((promo, index) => {
            console.log(`  ${index + 1}. ${promo.detail?.description} (discountPercent: ${promo.discountPercent}%)`);
          });
          
          // Sắp xếp theo discountPercent giảm dần để lấy khuyến mãi có % giảm cao nhất
          groupPromotions.sort((a: any, b: any) => b.discountPercent - a.discountPercent);
          const bestPromotion = groupPromotions[0];
          
          console.log(`✅ Selected best percent promotion: ${bestPromotion.detail?.description}`);
          applicablePromotions.push(bestPromotion);
        }
      }

      console.log(`🔍 Before filtering: ${applicablePromotions.length} percent promotions`);
      console.log(`🔍 Applied promotions to filter: ${appliedPromotions.length} items`);
      
      // Loại bỏ các khuyến mãi đã được áp dụng
      const newPromotions = applicablePromotions.filter((promo: any) => 
        !appliedPromotions.some((applied: any) => 
          applied.voucherId === promo.voucherId && applied.lineIndex === promo.lineIndex
        )
      );
      
      console.log(`🔍 After filtering: ${newPromotions.length} percent promotions`);

      console.log(`✅ Final percent result: ${newPromotions.length} promotions applied`);
      newPromotions.forEach(promo => {
        console.log(`   - ${promo.detail?.description}`);
      });

      return {
        status: true,
        error: 0,
        message: "Áp dụng khuyến mãi chiết khấu thành công",
        data: {
          applicablePromotions: newPromotions,
          totalDiscountAmount: newPromotions.reduce((sum: number, promo: any) => sum + promo.discountAmount, 0)
        }
      };
    } catch (error: any) {
      console.error("Error applying percent promotions:", error);
      return {
        status: false,
        error: 1,
        message: "Có lỗi xảy ra khi áp dụng khuyến mãi chiết khấu",
        data: null
      };
    }
  }

  // Áp dụng khuyến mãi hàng dựa trên combo được chọn
  async applyItemPromotions(
    selectedCombos: Array<{ comboId: string; quantity: number; name: string }>,
    appliedPromotions: any[] = []
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
          data: null
        };
      }

      const applicablePromotions: any[] = [];
      const exclusionGroups = new Map<string, any[]>(); // Nhóm loại trừ

      console.log(`🔍 Processing ${activePromotions.data.length} active promotions`);
      console.log(`🔍 Selected combos:`, selectedCombos);
      
      // Duyệt qua từng khuyến mãi hàng
      for (const promotion of activePromotions.data) {
        const detail = promotion.detail;
        
        console.log(`🔍 Checking promotion: ${detail?.description} (comboId: ${detail?.comboId})`);
        
        // Kiểm tra điều kiện áp dụng
        if (detail.applyType === "combo") {
          const selectedCombo = selectedCombos.find(combo => combo.comboId === detail.comboId);
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
              rewardDiscountPercent: detail.rewardDiscountPercent || 0
            };

            // Xử lý quy tắc loại trừ theo nhóm
            if (promotion.rule?.stackingPolicy === "EXCLUSIVE_WITH_GROUP") {
              const exclusionGroup = promotion.rule.exclusionGroup;
              
              console.log(`🎯 Adding to exclusion group "${exclusionGroup}": ${promotionResult.detail?.description}`);
              
              if (!exclusionGroups.has(exclusionGroup)) {
                exclusionGroups.set(exclusionGroup, []);
              }
              exclusionGroups.get(exclusionGroup)!.push(promotionResult);
            } else {
              // Có thể cộng dồn
              console.log(`➕ Adding standalone promotion: ${promotionResult.detail?.description}`);
              applicablePromotions.push(promotionResult);
            }
          }
        }
      }

      // Xử lý các nhóm loại trừ - chỉ lấy khuyến mãi tốt nhất trong mỗi nhóm
      for (const [groupName, groupPromotions] of exclusionGroups) {
        if (groupPromotions.length > 0) {
          console.log(`🔍 Debug exclusion group "${groupName}":`, groupPromotions.length, 'promotions');
          groupPromotions.forEach((promo, index) => {
            console.log(`  ${index + 1}. ${promo.detail?.description} (buyQuantity: ${promo.detail?.buyQuantity})`);
          });
          
          // Sắp xếp theo buyQuantity giảm dần để lấy khuyến mãi yêu cầu mua nhiều nhất (tốt nhất)
          // VD: mua 5 combo tặng bắp phô mai tốt hơn mua 2 combo tặng snack poca
          groupPromotions.sort((a: any, b: any) => b.detail.buyQuantity - a.detail.buyQuantity);
          const bestPromotion = groupPromotions[0];
          
          console.log(`✅ Selected best promotion: ${bestPromotion.detail?.description}`);
          applicablePromotions.push(bestPromotion);
        }
      }

      console.log(`🔍 Before filtering: ${applicablePromotions.length} promotions`);
      console.log(`🔍 Applied promotions to filter: ${appliedPromotions.length} items`);
      
      // Loại bỏ các khuyến mãi đã được áp dụng
      const newPromotions = applicablePromotions.filter((promo: any) => 
        !appliedPromotions.some((applied: any) => 
          applied.voucherId === promo.voucherId && applied.lineIndex === promo.lineIndex
        )
      );
      
      console.log(`🔍 After filtering: ${newPromotions.length} promotions`);


      return {
        status: true,
        error: 0,
        message: "Áp dụng khuyến mãi hàng thành công",
        data: {
          applicablePromotions: newPromotions,
          totalRewardItems: newPromotions.reduce((sum: number, promo: any) => sum + promo.rewardQuantity, 0)
        }
      };
    } catch (error: any) {
      console.error("Error applying item promotions:", error);
      return {
        status: false,
        error: 1,
        message: "Có lỗi xảy ra khi áp dụng khuyến mãi hàng",
        data: null
      };
    }
  }

  // Tính tổng ngân sách đã dùng cho khuyến mãi tiền (amount) theo voucher line
  async getAmountBudgetUsed(voucherId: string, lineIndex: number): Promise<{ usedBudget: number }> {
    const voucher = await Voucher.findById(voucherId).lean();
    if (!voucher) throw new Error("Voucher không tồn tại");
    if (!Array.isArray(voucher.lines) || lineIndex < 0 || lineIndex >= voucher.lines.length) {
      throw new Error("Line không tồn tại");
    }
    const line: any = (voucher.lines as any)[lineIndex];
    if (line?.promotionType !== 'amount') {
      return { usedBudget: 0 };
    }
    const detail: any = line.detail || {};
    const minOrderValue = detail.minOrderValue;
    const discountValue = detail.discountValue;
    const exclusionGroup = line?.rule?.exclusionGroup || undefined;
    const startDate = line?.validityPeriod?.startDate ? new Date(line.validityPeriod.startDate) : undefined;
    const endDate = line?.validityPeriod?.endDate ? new Date(line.validityPeriod.endDate) : undefined;

    // Xây dựng điều kiện tìm kiếm orders CONFIRMED áp dụng đúng amount discount tương ứng
    const match: any = {
      orderStatus: 'CONFIRMED',
      amountDiscount: { $gt: 0 },
      'amountDiscountInfo.minOrderValue': minOrderValue,
      'amountDiscountInfo.discountValue': discountValue,
    };
    if (exclusionGroup) match['amountDiscountInfo.exclusionGroup'] = exclusionGroup;
    if (startDate || endDate) {
      match.createdAt = {} as any;
      if (startDate) (match.createdAt as any).$gte = startDate;
      if (endDate) (match.createdAt as any).$lte = endDate;
    }

    const agg = await Order.aggregate([
      { $match: match },
      { $group: { _id: null, total: { $sum: '$amountDiscount' } } }
    ]);
    const usedBudget = Array.isArray(agg) && agg.length > 0 ? (agg[0].total || 0) : 0;
    return { usedBudget };
  }

  // Tính tổng ngân sách đã dùng cho khuyến mãi hàng (item): tổng rewardQuantity của các order CONFIRMED áp dụng promo này
  async getItemBudgetUsed(voucherId: string, lineIndex: number): Promise<{ usedBudget: number }> {
    const voucher = await Voucher.findById(voucherId).lean();
    if (!voucher) throw new Error("Voucher không tồn tại");
    if (!Array.isArray(voucher.lines) || lineIndex < 0 || lineIndex >= voucher.lines.length) {
      throw new Error("Line không tồn tại");
    }
    const line: any = (voucher.lines as any)[lineIndex];
    if (line?.promotionType !== 'item') {
      return { usedBudget: 0 };
    }
    const detail: any = line.detail || {};
    const description = detail?.description;
    const rewardItem = detail?.rewardItem;
    const startDate = line?.validityPeriod?.startDate ? new Date(line.validityPeriod.startDate) : undefined;
    const endDate = line?.validityPeriod?.endDate ? new Date(line.validityPeriod.endDate) : undefined;

    const match: any = {
      orderStatus: 'CONFIRMED',
      itemPromotions: { $elemMatch: { } }
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
      { $unwind: '$itemPromotions' },
      { $match: {
          ...(description ? { 'itemPromotions.description': description } : {}),
          ...(rewardItem ? { 'itemPromotions.rewardItem': rewardItem } : {})
        }
      },
      { $group: { _id: null, total: { $sum: '$itemPromotions.rewardQuantity' } } }
    ]);
    const usedBudget = Array.isArray(agg) && agg.length > 0 ? (agg[0].total || 0) : 0;
    return { usedBudget };
  }

  // Tính tổng ngân sách đã dùng cho khuyến mãi chiết khấu (percent): tổng discountAmount của orders CONFIRMED khớp line
  async getPercentBudgetUsed(voucherId: string, lineIndex: number): Promise<{ usedBudget: number }> {
    const voucher = await Voucher.findById(voucherId).lean();
    if (!voucher) throw new Error("Voucher không tồn tại");
    if (!Array.isArray(voucher.lines) || lineIndex < 0 || lineIndex >= voucher.lines.length) {
      throw new Error("Line không tồn tại");
    }
    const line: any = (voucher.lines as any)[lineIndex];
    if (line?.promotionType !== 'percent') {
      return { usedBudget: 0 };
    }
    const detail: any = line.detail || {};
    const applyType = detail?.applyType;
    const comboId = detail?.comboId;
    const comboDiscountPercent = detail?.comboDiscountPercent;
    const ticketDiscountPercent = detail?.ticketDiscountPercent;
    const description = detail?.description;
    const startDate = line?.validityPeriod?.startDate ? new Date(line.validityPeriod.startDate) : undefined;
    const endDate = line?.validityPeriod?.endDate ? new Date(line.validityPeriod.endDate) : undefined;

    const match: any = { orderStatus: 'CONFIRMED' };
    if (startDate || endDate) {
      match.createdAt = {} as any;
      if (startDate) (match.createdAt as any).$gte = startDate;
      if (endDate) (match.createdAt as any).$lte = endDate;
    }

    const pipeline: any[] = [ { $match: match }, { $unwind: '$percentPromotions' } ];
    const innerMatch: any = {};
    if (applyType === 'combo') {
      if (comboId) innerMatch['percentPromotions.comboId'] = comboId;
      if (typeof comboDiscountPercent === 'number') innerMatch['percentPromotions.discountPercent'] = comboDiscountPercent;
    } else if (applyType === 'ticket') {
      if (typeof ticketDiscountPercent === 'number') innerMatch['percentPromotions.discountPercent'] = ticketDiscountPercent;
      if (description) innerMatch['percentPromotions.description'] = description;
    }
    if (Object.keys(innerMatch).length > 0) pipeline.push({ $match: innerMatch });
    pipeline.push({ $group: { _id: null, total: { $sum: '$percentPromotions.discountAmount' } } });

    const agg = await Order.aggregate(pipeline);
    const usedBudget = Array.isArray(agg) && agg.length > 0 ? (agg[0].total || 0) : 0;
    return { usedBudget };
  }
}
