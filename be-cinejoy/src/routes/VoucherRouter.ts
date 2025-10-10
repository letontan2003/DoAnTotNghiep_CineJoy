import { Router } from "express";
import VoucherController from "../controllers/VoucherController";
import { verifyToken } from "../middlewares/AuthMiddleware";

const router = Router();
const voucherController = new VoucherController();

router.get("/", voucherController.getVouchers.bind(voucherController));
router.get("/my-vouchers", verifyToken, voucherController.getMyVouchers.bind(voucherController));
router.post("/redeem", verifyToken, voucherController.redeemVoucher.bind(voucherController));
router.post("/amount-discount", voucherController.getAmountDiscount.bind(voucherController));

// API cho khuyến mãi hàng
router.get("/item-promotions", voucherController.getActiveItemPromotions.bind(voucherController));
router.post("/apply-item-promotions", voucherController.applyItemPromotions.bind(voucherController));
router.get("/percent-promotions", voucherController.getActivePercentPromotions.bind(voucherController));
router.post("/apply-percent-promotions", voucherController.applyPercentPromotions.bind(voucherController));
router.post("/add", voucherController.addVoucher.bind(voucherController));
router.post("/:id/add-line", voucherController.addPromotionLine.bind(voucherController));
router.put("/:id/update-line/:lineIndex", voucherController.updatePromotionLine.bind(voucherController));
router.delete("/:id/delete-line/:lineIndex", voucherController.deletePromotionLine.bind(voucherController));
router.get("/:id", voucherController.getVoucherById.bind(voucherController));
router.put("/update/:id", voucherController.updateVoucher.bind(voucherController));
router.delete("/delete/:id", voucherController.deleteVoucher.bind(voucherController));

export default router;