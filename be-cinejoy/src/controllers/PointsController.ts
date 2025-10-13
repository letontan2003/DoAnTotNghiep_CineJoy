import { Response } from "express";
import PointsService from "../services/PointsService";
import { AuthenticatedRequest } from "../middlewares/AuthMiddleware";

class PointsController {
  // Lấy điểm hiện tại của user
  async getUserPoints(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?._id;
      if (!userId) {
        res.status(401).json({ 
          status: false, 
          error: 401, 
          message: "Không có quyền truy cập", 
          data: null 
        });
        return;
      }

      const points = await PointsService.getUserPoints(userId.toString());
      
      res.status(200).json({
        status: true,
        error: 0,
        message: "Lấy điểm thành công",
        data: { points }
      });
    } catch (error) {
      console.error("Error getting user points:", error);
      res.status(500).json({ 
        status: false, 
        error: 500, 
        message: "Lỗi server khi lấy điểm", 
        data: null 
      });
    }
  }

  // Chạy cập nhật điểm manual (cho admin)
  async updatePointsManual(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      // Kiểm tra quyền admin
      if (req.user?.role !== 'ADMIN') {
        res.status(403).json({ 
          status: false, 
          error: 403, 
          message: "Không có quyền truy cập", 
          data: null 
        });
        return;
      }

      const result = await PointsService.runManualPointsUpdate();
      
      res.status(200).json({
        status: true,
        error: 0,
        message: "Cập nhật điểm thành công",
        data: result
      });
    } catch (error) {
      console.error("Error updating points manually:", error);
      res.status(500).json({ 
        status: false, 
        error: 500, 
        message: "Lỗi server khi cập nhật điểm", 
        data: null 
      });
    }
  }
}

export default new PointsController();
