import { Router } from "express";
import PointsController from "../controllers/PointsController";
import { verifyToken } from "../middlewares/AuthMiddleware";

const router = Router();

// Lấy điểm hiện tại của user
router.get("/", verifyToken, PointsController.getUserPoints);

// Cập nhật điểm manual (chỉ admin)
router.post("/update-manual", verifyToken, PointsController.updatePointsManual);

export default router;
