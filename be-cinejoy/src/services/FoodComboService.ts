import { FoodCombo, IFoodCombo, IComboItem } from "../models/FoodCombo";
import mongoose from "mongoose";

export default class FoodComboService {
    // Lấy tất cả sản phẩm và combo
    getFoodCombos(): Promise<IFoodCombo[]> {
        return FoodCombo.find().populate('items.productId').sort({ _id: -1 });
    }

    // Lấy sản phẩm đơn lẻ
    getSingleProducts(): Promise<IFoodCombo[]> {
        return FoodCombo.find({ type: "single" }).sort({ _id: -1 });
    }

    // Lấy combo
    getCombos(): Promise<IFoodCombo[]> {
        return FoodCombo.find({ type: "combo" }).populate('items.productId').sort({ _id: -1 });
    }

    // Lấy theo category
    getProductsByCategory(category: string): Promise<IFoodCombo[]> {
        return FoodCombo.find({ type: "single", category }).sort({ _id: -1 });
    }

    getFoodComboById(id: string): Promise<IFoodCombo | null> {
        return FoodCombo.findById(id).populate('items.productId');
    }

    // Thêm sản phẩm đơn lẻ
    async addSingleProduct(data: {
        code: string;
        name: string;
        description: string;
    }): Promise<IFoodCombo> {
        const product = new FoodCombo({
            ...data,
            type: "single"
        });
        const savedProduct = await product.save();
        
        
        return savedProduct;
    }

    // Thêm combo
    async addCombo(data: {
        code: string;
        name: string;
        description: string;
        items: IComboItem[];
    }): Promise<IFoodCombo> {
        const combo = new FoodCombo({
            ...data,
            type: "combo"
        });
        const savedCombo = await combo.save();
        
        
        return savedCombo;
    }

    async updateFoodCombo(id: string, data: Partial<IFoodCombo>): Promise<IFoodCombo | null> {
        const updatedCombo = await FoodCombo.findByIdAndUpdate(id, data, { new: true }).populate('items.productId');
        
        
        return updatedCombo;
    }

    async deleteFoodCombo(id: string): Promise<IFoodCombo | null> {
        const deletedCombo = await FoodCombo.findByIdAndDelete(id);
        
        
        return deletedCombo;
    }

}