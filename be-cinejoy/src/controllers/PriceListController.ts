import { Request, Response } from "express";
import priceListService from "../services/PriceListService";

export class PriceListController {
  // Lấy tất cả bảng giá
  async getAllPriceLists(req: Request, res: Response): Promise<void> {
    try {
      const priceLists = await priceListService.getAllPriceLists();
      res.json(priceLists);
    } catch (error) {
      res.status(500).json({ message: "Lỗi khi lấy danh sách bảng giá", error });
    }
  }

  // Lấy bảng giá theo ID
  async getPriceListById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const priceList = await priceListService.getPriceListById(id);
      
      if (!priceList) {
        res.status(404).json({ message: "Bảng giá không tồn tại" });
        return;
      }
      
      res.json(priceList);
    } catch (error) {
      res.status(500).json({ message: "Lỗi khi lấy bảng giá", error });
    }
  }

  // Lấy bảng giá hiện tại
  async getCurrentPriceList(req: Request, res: Response): Promise<void> {
    try {
      const priceList = await priceListService.getCurrentPriceList();
      res.json(priceList);
    } catch (error) {
      res.status(500).json({ message: "Lỗi khi lấy bảng giá hiện tại", error });
    }
  }

  // Tạo bảng giá mới
  async createPriceList(req: Request, res: Response): Promise<void> {
    try {
      const { code, name, description, startDate, endDate, lines } = req.body;
      
      // Validation cơ bản
      if (!code || !name || !startDate || !endDate || !lines || !Array.isArray(lines)) {
        res.status(400).json({ message: "Thiếu thông tin bắt buộc" });
        return;
      }

      const priceListData = {
        code,
        name,
        description,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        lines
      };

      const newPriceList = await priceListService.createPriceList(priceListData);
      
      // Kiểm tra khoảng trống sau khi tạo
      const gapCheck = await priceListService.checkTimeGaps();
      
      // Chuẩn bị response với thông tin về các item đã bỏ qua
      const response: any = {
        priceList: newPriceList,
        message: "Tạo bảng giá thành công"
      };
      
      // Thêm thông tin về các item đã bỏ qua (nếu có)
      if ((newPriceList as any).skippedInfo) {
        const { skippedCount, skippedItems } = (newPriceList as any).skippedInfo;
        if (skippedCount > 0) {
          response.warning = `Đã bỏ qua ${skippedCount} sản phẩm/combo không tồn tại trong database`;
          response.skippedItems = skippedItems;
        }
        // Xóa thông tin tạm thời khỏi priceList
        delete (newPriceList as any).skippedInfo;
      }
      
      // Thêm warning về khoảng trống nếu có
      if (gapCheck.hasGap) {
        response.gapWarning = gapCheck.message;
      }
      
      res.status(201).json(response);
    } catch (error: any) {
      if (error.message.includes('xung đột') || error.message.includes('trùng')) {
        res.status(400).json({ message: error.message });
        return;
      }
      res.status(500).json({ message: "Lỗi khi tạo bảng giá", error: error.message });
    }
  }

  // Cập nhật bảng giá
  async updatePriceList(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const updateData = req.body;
      
      // Chuyển đổi ngày nếu có
      if (updateData.startDate) {
        updateData.startDate = new Date(updateData.startDate);
      }
      if (updateData.endDate) {
        updateData.endDate = new Date(updateData.endDate);
      }

      const updatedPriceList = await priceListService.updatePriceList(id, updateData);
      
      if (!updatedPriceList) {
        res.status(404).json({ message: "Bảng giá không tồn tại" });
        return;
      }

      // Kiểm tra khoảng trống sau khi cập nhật
      const gapCheck = await priceListService.checkTimeGaps();
      if (gapCheck.hasGap) {
        res.json({
          priceList: updatedPriceList,
          warning: gapCheck.message
        });
        return;
      }
      
      res.json(updatedPriceList);
    } catch (error: any) {
      if (error.message.includes('Không thể') || error.message.includes('xung đột')) {
        res.status(400).json({ message: error.message });
        return;
      }
      res.status(500).json({ message: "Lỗi khi cập nhật bảng giá", error: error.message });
    }
  }

  // Xóa bảng giá
  async deletePriceList(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const deleted = await priceListService.deletePriceList(id);
      
      if (!deleted) {
        res.status(404).json({ message: "Bảng giá không tồn tại" });
        return;
      }

      // Kiểm tra khoảng trống sau khi xóa
      const gapCheck = await priceListService.checkTimeGaps();
      if (gapCheck.hasGap) {
        res.json({
          message: "Xóa bảng giá thành công",
          warning: gapCheck.message
        });
        return;
      }
      
      res.json({ message: "Xóa bảng giá thành công" });
    } catch (error: any) {
      if (error.message.includes('Không thể')) {
        res.status(400).json({ message: error.message });
        return;
      }
      res.status(500).json({ message: "Lỗi khi xóa bảng giá", error: error.message });
    }
  }

  // Lấy danh sách sản phẩm/combo để tạo bảng giá
  async getProductsForPriceList(req: Request, res: Response): Promise<void> {
    try {
      const products = await priceListService.getProductsForPriceList();
      res.json(products);
    } catch (error) {
      res.status(500).json({ message: "Lỗi khi lấy danh sách sản phẩm", error });
    }
  }

  // Kiểm tra khoảng trống thời gian
  async checkTimeGaps(req: Request, res: Response): Promise<void> {
    try {
      const gapCheck = await priceListService.checkTimeGaps();
      res.json(gapCheck);
    } catch (error) {
      res.status(500).json({ message: "Lỗi khi kiểm tra khoảng trống", error });
    }
  }

  // Split version bảng giá
  async splitPriceListVersion(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { newName, oldEndDate, newStartDate } = req.body;
      
      const newPriceList = await priceListService.splitPriceListVersion(id, {
        newName,
        oldEndDate: new Date(oldEndDate),
        newStartDate: new Date(newStartDate)
      });
      
      res.status(200).json(newPriceList);
    } catch (error: any) {
      console.error("Error splitting price list version:", error);
      res.status(500).json({ message: error.message || "Lỗi khi tạo split version" });
    }
  }
}

export default new PriceListController();
