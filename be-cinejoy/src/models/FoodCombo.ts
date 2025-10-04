import { Schema, model, Document, Types } from "mongoose";

export interface IComboItem {
  productId: Types.ObjectId;
  quantity: number;
}

export interface IFoodCombo extends Document {
  _id: string;
  code: string; // Mã SP/Combo, ví dụ: SP001, CB001
  name: string;
  type: "single" | "combo";
  description?: string; // Cho cả single products và combo
  items?: IComboItem[]; // Chỉ cho combo
  createdAt: Date;
  updatedAt: Date;
}

const ComboItemSchema = new Schema<IComboItem>({
  productId: { type: Schema.Types.ObjectId, ref: 'FoodCombo', required: true },
  quantity: { type: Number, required: true, min: 1 }
});

const FoodComboSchema = new Schema<IFoodCombo>({
  code: {
    type: String,
    required: true,
    unique: true,
    trim: true,
  },
  name: { type: String, required: true },
  type: { 
    type: String, 
    required: true, 
    enum: ["single", "combo"],
    default: "single"
  },
  description: { 
    type: String, 
    required: true // Bắt buộc cho cả single và combo
  },
  items: { 
    type: [ComboItemSchema], 
    required: function(this: IFoodCombo) { return this.type === "combo"; },
    validate: {
      validator: function(this: IFoodCombo, items: IComboItem[]) {
        return this.type !== "combo" || (items && items.length > 0);
      },
      message: 'Combo must have at least one item'
    }
  }
}, {
  timestamps: true // Tự động tạo createdAt và updatedAt
});

// Index để tối ưu hóa truy vấn
FoodComboSchema.index({ type: 1 });
FoodComboSchema.index({ code: 1 }, { unique: true });

export const FoodCombo = model<IFoodCombo>("FoodCombo", FoodComboSchema);
