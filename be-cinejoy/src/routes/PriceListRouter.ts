import { Router } from "express";
import PriceListController from "../controllers/PriceListController";

const router = Router();

// Lấy tất cả bảng giá
router.get("/", (req, res) => PriceListController.getAllPriceLists(req, res));

// Lấy bảng giá hiện tại
router.get("/current", (req, res) => PriceListController.getCurrentPriceList(req, res));

// Lấy danh sách sản phẩm/combo để tạo bảng giá
router.get("/products", (req, res) => PriceListController.getProductsForPriceList(req, res));

// Kiểm tra khoảng trống thời gian
router.get("/check-gaps", (req, res) => PriceListController.checkTimeGaps(req, res));

// Tạo bảng giá mới
router.post("/", (req, res) => PriceListController.createPriceList(req, res));

// Lấy bảng giá theo ID
router.get("/:id", (req, res) => PriceListController.getPriceListById(req, res));

// Cập nhật bảng giá
router.put("/:id", (req, res) => PriceListController.updatePriceList(req, res));

// Xóa bảng giá
router.delete("/:id", (req, res) => PriceListController.deletePriceList(req, res));

// Split version bảng giá
router.post("/:id/split-version", (req, res) => PriceListController.splitPriceListVersion(req, res));

export default router;
