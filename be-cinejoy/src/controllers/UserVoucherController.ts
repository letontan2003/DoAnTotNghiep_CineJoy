import e, { Request, Response } from "express";
import UserVoucherService from "../services/UserVoucherService";

const userVoucherService = new UserVoucherService();

export default class UserVoucherController {
  // GET /api/user-vouchers/:userId - Lấy tất cả voucher của user
  async getUserVouchers(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = req.params;
      const result = await userVoucherService.getUserVouchers(userId);

      res.status(result.status ? 200 : 500).json(result);
    } catch (error) {
      console.error("Error getting user vouchers:", error);
      res.status(500).json({
        status: false,
        error: 1,
        message: "Có lỗi xảy ra khi lấy danh sách voucher",
        data: null,
      });
    }
  }

  // GET /api/user-vouchers/:userId/unused - Lấy voucher chưa sử dụng của user
  async getUnusedUserVouchers(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = req.params;
      const result = await userVoucherService.getUnusedUserVouchers(userId);

      res.status(result.status ? 200 : 500).json(result);
    } catch (error) {
      console.error("Error getting unused user vouchers:", error);
      res.status(500).json({
        status: false,
        error: 1,
        message: "Có lỗi xảy ra khi lấy danh sách voucher chưa sử dụng",
        data: null,
      });
    }
  }

  // POST /api/user-vouchers/validate - Validate voucher code
  async validateVoucherCode(req: Request, res: Response): Promise<void> {
    try {
      const { code, userId } = req.body;

      if (!code) {
        res.status(400).json({
          status: false,
          error: 1,
          message: "Vui lòng nhập mã voucher",
          data: null,
        });
        return;
      }

      const result = await userVoucherService.validateVoucherCode(code, userId);

      res.status(result.status ? 200 : 400).json(result);
    } catch (error) {
      console.error("Error validating voucher code:", error);
      res.status(500).json({
        status: false,
        error: 1,
        message: "Có lỗi xảy ra khi kiểm tra voucher",
        data: null,
      });
    }
  }

  // POST /api/user-vouchers/apply - Áp dụng voucher cho đơn hàng
  async applyVoucher(req: Request, res: Response): Promise<void> {
    try {
      const { code, orderTotal, userId } = req.body;

      if (!code || !orderTotal) {
        res.status(400).json({
          status: false,
          error: 1,
          message: "Thiếu thông tin mã voucher hoặc tổng tiền đơn hàng",
          data: null,
        });
        return;
      }

      const result = await userVoucherService.applyVoucher(
        code,
        orderTotal,
        userId
      );

      res.status(result.status ? 200 : 400).json(result);
    } catch (error) {
      console.error("Error applying voucher:", error);
      res.status(500).json({
        status: false,
        error: 1,
        message: "Có lỗi xảy ra khi áp dụng voucher",
        data: null,
      });
    }
  }

  // PUT /api/user-vouchers/mark-used - Đánh dấu voucher đã sử dụng
  async markVoucherAsUsed(req: Request, res: Response): Promise<void> {
    try {
      const { code, userVoucherId } = req.body;

      let result;

      if (userVoucherId) {
        result = await userVoucherService.markVoucherAsUsedById(userVoucherId);
      } else if (code) {
        result = await userVoucherService.markVoucherAsUsed(code);
      } else {
        res.status(400).json({
          status: false,
          error: 1,
          message: "Thiếu thông tin mã voucher hoặc ID voucher",
          data: null,
        });
        return;
      }

      res.status(result.status ? 200 : 400).json(result);
    } catch (error) {
      console.error("Error marking voucher as used:", error);
      res.status(500).json({
        status: false,
        error: 1,
        message: "Có lỗi xảy ra khi đánh dấu voucher đã sử dụng",
        data: null,
      });
    }
  }

  // PUT /api/user-vouchers/update-expired - Cập nhật voucher hết hạn (admin only)
  async updateExpiredVouchers(req: Request, res: Response): Promise<void> {
    try {
      const result = await userVoucherService.updateExpiredVouchers();

      res.status(result.status ? 200 : 500).json(result);
    } catch (error) {
      console.error("Error updating expired vouchers:", error);
      res.status(500).json({
        status: false,
        error: 1,
        message: "Có lỗi xảy ra khi cập nhật voucher hết hạn",
        data: null,
      });
    }
  }
}
