import { Request, Response } from "express";
import FoodComboService from "../services/FoodComboService";
const foodComboService = new FoodComboService();

export default class FoodComboController {
  // Lấy tất cả sản phẩm và combo
  async getFoodCombos(req: Request, res: Response): Promise<void> {
    try {
      const combos = await foodComboService.getFoodCombos();
      res.status(200).json(combos);
    } catch (error) {
      res.status(500).json({ message: "Error fetching food combos", error });
    }
  }

  // Lấy sản phẩm đơn lẻ
  async getSingleProducts(req: Request, res: Response): Promise<void> {
    try {
      const products = await foodComboService.getSingleProducts();
      res.status(200).json(products);
    } catch (error) {
      res.status(500).json({ message: "Error fetching single products", error });
    }
  }

  // Lấy combo
  async getCombos(req: Request, res: Response): Promise<void> {
    try {
      const combos = await foodComboService.getCombos();
      res.status(200).json(combos);
    } catch (error) {
      res.status(500).json({ message: "Error fetching combos", error });
    }
  }


  async getFoodComboById(req: Request, res: Response): Promise<void> {
    const { id } = req.params;
    try {
      const combo = await foodComboService.getFoodComboById(id);
      if (!combo) {
        res.status(404).json({ message: "Food combo not found" });
        return;
      }
      res.status(200).json(combo);
    } catch (error) {
      res.status(500).json({ message: "Error fetching food combo", error });
    }
  }

  // Thêm sản phẩm đơn lẻ
  async addSingleProduct(req: Request, res: Response): Promise<void> {
    try {
      const { code, name, description } = req.body;
      
      // Validation
      if (!code || !name || !description) {
        res.status(400).json({ message: "Missing required fields for single product" });
        return;
      }

      const newProduct = await foodComboService.addSingleProduct({
        code,
        name,
        description
      });
      
      res.status(201).json(newProduct);
    } catch (error) {
      res.status(500).json({ message: "Error adding single product", error });
    }
  }

  // Thêm combo
  async addCombo(req: Request, res: Response): Promise<void> {
    try {
      const { code, name, description, items } = req.body;
      
      // Validation
      if (!code || !name || !description || !items) {
        res.status(400).json({ message: "Missing required fields for combo" });
        return;
      }

      if (!Array.isArray(items) || items.length === 0) {
        res.status(400).json({ message: "Combo must have at least one item" });
        return;
      }

      const newCombo = await foodComboService.addCombo({
        code,
        name,
        description,
        items
      });
      
      res.status(201).json(newCombo);
    } catch (error) {
      res.status(500).json({ message: "Error adding combo", error });
    }
  }


  async updateFoodCombo(req: Request, res: Response): Promise<void> {
    const { id } = req.params;
    try {
      const updatedCombo = await foodComboService.updateFoodCombo(id, req.body);
      if (!updatedCombo) {
        res.status(404).json({ message: "Food combo not found" });
        return;
      }
      res.status(200).json(updatedCombo);
    } catch (error) {
      res.status(500).json({ message: "Error updating food combo", error });
    }
  }

  async deleteFoodCombo(req: Request, res: Response): Promise<void> {
    const { id } = req.params;
    try {
      const deletedCombo = await foodComboService.deleteFoodCombo(id);
      if (!deletedCombo) {
        res.status(404).json({ message: "Food combo not found" });
        return;
      }
      res.status(200).json({ message: "Food combo deleted successfully" });
    } catch (error) {
      res.status(500).json({ message: "Error deleting food combo", error });
    }
  }
}
