import { UserVoucher } from "../models/UserVoucher";
import { IVoucher, Voucher } from "../models/Voucher";
import { Types } from "mongoose";

type VoucherWithLegacy = IVoucher & {
  discountPercent?: number;
  validityPeriod?: { startDate?: Date; endDate?: Date };
  maxDiscountValue?: number;
};

export default class UserVoucherService {
  // Lấy tất cả voucher của user
  async getUserVouchers(userId: Types.ObjectId | string): Promise<{
    status: boolean;
    error: number;
    message: string;
    data: any;
  }> {
    try {
      const vouchers = await UserVoucher.find({ userId })
        .populate("voucherId")
        .sort({ redeemedAt: -1 });

      return {
        status: true,
        error: 0,
        message: "Lấy danh sách voucher thành công",
        data: vouchers,
      };
    } catch (error) {
      console.error("Error getting user vouchers:", error);
      return {
        status: false,
        error: 1,
        message: "Có lỗi xảy ra khi lấy danh sách voucher",
        data: null,
      };
    }
  }

  // Validate voucher code từ frontend
  async validateVoucherCode(
    code: string,
    userId?: string
  ): Promise<{
    status: boolean;
    error: number;
    message: string;
    data: any;
  }> {
    try {
      const existingVoucher = await UserVoucher.findOne({
        code: code,
        ...(userId && { userId }),
      });

      if (!existingVoucher) {
        return {
          status: false,
          error: 1,
          message: "Mã voucher không tồn tại hoặc không thuộc về bạn",
          data: {
            message: "Mã voucher không tồn tại hoặc không thuộc về bạn",
          },
        };
      }

      // Kiểm tra trạng thái voucher
      if (existingVoucher.status === "used") {
        return {
          status: false,
          error: 1,
          message: "Mã voucher đã được sử dụng",
          data: null,
        };
      }

      if (existingVoucher.status === "expired") {
        return {
          status: false,
          error: 1,
          message: "Mã voucher đã hết hạn",
          data: null,
        };
      }

      // Tìm voucher chưa sử dụng
      let userVoucher = await UserVoucher.findOne({
        code: code,
        status: "unused",
        ...(userId && { userId }), // Nếu có userId thì check luôn
      }).populate("voucherId");

      let voucher = userVoucher?.voucherId as unknown as VoucherWithLegacy | null;

      // Nếu populate thất bại (trường hợp voucherId lưu là detail._id), tra ngược theo detailId
      if (!userVoucher || !voucher) {
        const rawUv = await UserVoucher.findOne({
          code: code,
          status: "unused",
          ...(userId && { userId }),
        }).lean();

        const detailId = (rawUv as any)?.voucherId;
        if (!rawUv || !detailId) {
          return {
            status: false,
            error: 1,
            message: "Mã voucher không hợp lệ hoặc đã được sử dụng",
            data: null,
          };
        }

        const voucherDoc: any = await Voucher.findOne({
          "lines.detail._id": detailId,
        }).lean();

        if (!voucherDoc) {
          return {
            status: false,
            error: 1,
            message: "Mã voucher không hợp lệ hoặc đã được sử dụng",
            data: null,
          };
        }

        const line = (voucherDoc.lines || []).find(
          (l: any) => l?.detail?._id?.toString?.() === detailId.toString()
        );

        voucher = {
          ...(voucherDoc as VoucherWithLegacy),
          discountPercent:
            (line?.detail?.discountPercent as number | undefined) ??
            (voucherDoc.discountPercent as number | undefined),
          validityPeriod: {
            startDate: line?.validityPeriod?.startDate || voucherDoc.startDate,
            endDate: line?.validityPeriod?.endDate || voucherDoc.endDate,
          },
          maxDiscountValue: line?.detail?.maxDiscountValue,
        } as VoucherWithLegacy;

        // Chuẩn hóa userVoucher cho phần trả về (dùng rawUv)
        userVoucher = (rawUv as any) as any;
      }

      // Kiểm tra ngày hết hạn
      if (
        voucher.validityPeriod?.endDate &&
        new Date() > voucher.validityPeriod.endDate
      ) {
        // Đánh dấu voucher expired
        await UserVoucher.findByIdAndUpdate((userVoucher as any)._id, {
          status: "expired",
        });
        return {
          status: false,
          error: 1,
          message: "Mã voucher đã hết hạn",
          data: null,
        };
      }

      // Kiểm tra ngày bắt đầu
      if (
        voucher.validityPeriod?.startDate &&
        new Date() < voucher.validityPeriod.startDate
      ) {
        return {
          status: false,
          error: 1,
          message: "Mã voucher chưa có hiệu lực",
          data: null,
        };
      }

      // Voucher hợp lệ
      // Đảm bảo userVoucher không null bằng cách fallback rawUv (đã có ở trên)
      const ensuredUserVoucher: any = userVoucher ?? (await UserVoucher.findOne({ code, ...(userId && { userId }) }).lean());

      return {
        status: true,
        error: 0,
        message: "Mã voucher hợp lệ",
        data: {
          voucher: voucher,
          userVoucher: ensuredUserVoucher,
          discount: voucher.discountPercent,
        },
      };
    } catch (error) {
      console.error("Error validating voucher:", error);
      return {
        status: false,
        error: 1,
        message: "Có lỗi xảy ra khi kiểm tra voucher",
        data: null,
      };
    }
  }

  // Áp dụng voucher khi thanh toán
  async applyVoucher(
    code: string,
    orderTotal: number,
    userId?: string
  ): Promise<{
    status: boolean;
    error: number;
    message: string;
    data: any;
  }> {
    try {
      const validation = await this.validateVoucherCode(code, userId);

      if (!validation.status || !validation.data) {
        return {
          status: false,
          error: validation.error,
          message: validation.message,
          data: null,
        };
      }

      // Tính số tiền giảm giá (áp dụng trần nếu có)
      const percent = validation.data.discount!;
      let discountAmount = Math.round((orderTotal * percent) / 100);
      const cap = (validation.data.voucher as VoucherWithLegacy)
        ?.maxDiscountValue;
      if (typeof cap === "number") {
        discountAmount = Math.min(discountAmount, cap);
      }
      const finalTotal = Math.max(0, orderTotal - discountAmount);

      return {
        status: true,
        error: 0,
        message: "Áp dụng voucher thành công",
        data: {
          discountAmount,
          finalTotal,
          userVoucherId: (
            validation.data.userVoucher._id as Types.ObjectId
          ).toString(),
        },
      };
    } catch (error) {
      console.error("Error applying voucher:", error);
      return {
        status: false,
        error: 1,
        message: "Có lỗi xảy ra khi áp dụng voucher",
        data: null,
      };
    }
  }

  // Đánh dấu voucher đã sử dụng sau khi thanh toán thành công
  async markVoucherAsUsed(code: string): Promise<{
    status: boolean;
    error: number;
    message: string;
    data: any;
  }> {
    try {
      const result = await UserVoucher.findOneAndUpdate(
        { code: code, status: "unused" },
        {
          status: "used",
          usedAt: new Date(),
        }
      );

      if (result) {
        return {
          status: true,
          error: 0,
          message: "Đánh dấu voucher đã sử dụng thành công",
          data: result,
        };
      } else {
        return {
          status: false,
          error: 1,
          message: "Không tìm thấy voucher hoặc voucher đã được sử dụng",
          data: null,
        };
      }
    } catch (error) {
      console.error("Error marking voucher as used:", error);
      return {
        status: false,
        error: 1,
        message: "Có lỗi xảy ra khi đánh dấu voucher đã sử dụng",
        data: null,
      };
    }
  }

  // Đánh dấu voucher đã sử dụng bằng ID
  async markVoucherAsUsedById(userVoucherId: string): Promise<{
    status: boolean;
    error: number;
    message: string;
    data: any;
  }> {
    try {
      const result = await UserVoucher.findByIdAndUpdate(userVoucherId, {
        status: "used",
        usedAt: new Date(),
      });

      if (result) {
        return {
          status: true,
          error: 0,
          message: "Đánh dấu voucher đã sử dụng thành công",
          data: result,
        };
      } else {
        return {
          status: false,
          error: 1,
          message: "Không tìm thấy voucher",
          data: null,
        };
      }
    } catch (error) {
      console.error("Error marking voucher as used by ID:", error);
      return {
        status: false,
        error: 1,
        message: "Có lỗi xảy ra khi đánh dấu voucher đã sử dụng",
        data: null,
      };
    }
  }

  // Lấy voucher chưa sử dụng của user
  async getUnusedUserVouchers(userId: Types.ObjectId | string): Promise<{
    status: boolean;
    error: number;
    message: string;
    data: any;
  }> {
    try {
      const vouchers = await UserVoucher.find({
        userId,
        status: "unused",
      })
        .populate("voucherId")
        .sort({ redeemedAt: -1 });

      return {
        status: true,
        error: 0,
        message: "Lấy danh sách voucher chưa sử dụng thành công",
        data: vouchers,
      };
    } catch (error) {
      console.error("Error getting unused user vouchers:", error);
      return {
        status: false,
        error: 1,
        message: "Có lỗi xảy ra khi lấy danh sách voucher chưa sử dụng",
        data: null,
      };
    }
  }

  // Kiểm tra và cập nhật voucher hết hạn
  async updateExpiredVouchers(): Promise<{
    status: boolean;
    error: number;
    message: string;
    data: any;
  }> {
    try {
      const expiredVouchers = await UserVoucher.find({
        status: "unused",
      }).populate("voucherId");

      let updatedCount = 0;
      const now = new Date();

      for (const userVoucher of expiredVouchers) {
        const voucher = userVoucher.voucherId as unknown as VoucherWithLegacy;
        if (
          voucher.validityPeriod?.endDate &&
          now > voucher.validityPeriod.endDate
        ) {
          await UserVoucher.findByIdAndUpdate(userVoucher._id, {
            status: "expired",
          });
          updatedCount++;
        }
      }

      return {
        status: true,
        error: 0,
        message: `Đã cập nhật ${updatedCount} voucher hết hạn`,
        data: { updatedCount },
      };
    } catch (error) {
      console.error("Error updating expired vouchers:", error);
      return {
        status: false,
        error: 1,
        message: "Có lỗi xảy ra khi cập nhật voucher hết hạn",
        data: null,
      };
    }
  }
}
