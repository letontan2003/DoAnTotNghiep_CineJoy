import { Router } from "express";
import FoodComboController from "../controllers/FoodComboController";

const router = Router();
const foodComboController = new FoodComboController();

// Lấy tất cả sản phẩm và combo
router.get("/", foodComboController.getFoodCombos.bind(foodComboController));

// Lấy sản phẩm đơn lẻ
router.get("/single-products", foodComboController.getSingleProducts.bind(foodComboController));

// Lấy combo
router.get("/combos", foodComboController.getCombos.bind(foodComboController));


// Lấy chi tiết sản phẩm/combo
router.get("/:id", foodComboController.getFoodComboById.bind(foodComboController));

// Thêm sản phẩm đơn lẻ
router.post("/single-product", foodComboController.addSingleProduct.bind(foodComboController));

// Thêm combo
router.post("/combo", foodComboController.addCombo.bind(foodComboController));


// Cập nhật sản phẩm/combo
router.put("/update/:id", foodComboController.updateFoodCombo.bind(foodComboController));

// Xóa sản phẩm/combo
router.delete("/delete/:id", foodComboController.deleteFoodCombo.bind(foodComboController));

export default router;