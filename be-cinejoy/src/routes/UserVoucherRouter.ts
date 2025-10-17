import { Router } from "express";
import UserVoucherController from "../controllers/UserVoucherController";
import { verifyToken } from "../middlewares/AuthMiddleware";

const router = Router();
const userVoucherController = new UserVoucherController();

// Lấy tất cả voucher của user
router.get(
  "/:userId",
  verifyToken,
  userVoucherController.getUserVouchers.bind(userVoucherController)
);

// Lấy voucher chưa sử dụng của user
router.get(
  "/:userId/unused",
  verifyToken,
  userVoucherController.getUnusedUserVouchers.bind(userVoucherController)
);

// Validate voucher code
router.post(
  "/validate",
  verifyToken,
  userVoucherController.validateVoucherCode.bind(userVoucherController)
);

// Áp dụng voucher cho đơn hàng
router.post(
  "/apply",
  verifyToken,
  userVoucherController.applyVoucher.bind(userVoucherController)
);

// Đánh dấu voucher đã sử dụng
router.put(
  "/mark-used",
  verifyToken,
  userVoucherController.markVoucherAsUsed.bind(userVoucherController)
);

// Cập nhật voucher hết hạn (admin only)
router.put(
  "/update-expired",
  verifyToken,
  userVoucherController.updateExpiredVouchers.bind(userVoucherController)
);

export default router;
