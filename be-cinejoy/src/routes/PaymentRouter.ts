import { Router } from "express";
import PaymentController from "../controllers/PaymentController";
// import AuthMiddleware from '../middlewares/AuthMiddleware'; // Uncomment khi cần

const router = Router();

// Routes cho Payment
router.get("/stats", PaymentController.getPaymentStats); // Thống kê payments (Admin)
router.get("/order/:orderId", PaymentController.getPaymentByOrderId); // Lấy payment theo orderId

// MoMo Integration Routes
router.post("/momo/callback", PaymentController.handleMoMoCallback); // MoMo IPN callback
router.get("/momo/return", PaymentController.handleMoMoReturn); // MoMo return URL
router.post("/momo/test", PaymentController.testMoMoConnection); // Test MoMo connection
router.get("/momo/config", PaymentController.getMoMoConfigStatus); // Get MoMo config status

// VNPay Integration Routes
router.post("/vnpay/callback", PaymentController.handleVNPayCallback); // VNPay callback
router.get("/vnpay/return", PaymentController.handleVNPayReturn); // VNPay return URL
router.post("/vnpay/test", PaymentController.testVNPayConnection); // Test VNPay connection
router.get("/vnpay/config", PaymentController.getVNPayConfigStatus); // Get VNPay config status

// Mock Payment Routes for Testing
router.get("/mock", PaymentController.mockPayment); // Mock payment page

router.get("/:id", PaymentController.getPaymentById); // Lấy payment theo ID
router.put("/:id/status", PaymentController.updatePaymentStatus); // Cập nhật trạng thái payment
router.post("/:id/refund", PaymentController.refundPayment); // Hoàn tiền

export default router;
