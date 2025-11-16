import { Schema, model, Document } from "mongoose";

// =====================
// Voucher header
// =====================
export interface IVoucher extends Document {
  name: string;
  promotionalCode: string;
  description?: string;
  startDate: Date;
  endDate: Date;
  status: "hoạt động" | "không hoạt động";
  lines: IPromotionLine[];
  // Legacy fields for backward compatibility (UI cũ)
  quantity?: number;
  discountPercent?: number;
  pointToRedeem?: number;
}

// =====================
// Lines
// =====================
export type PromotionType = "item" | "amount" | "percent" | "voucher";

export interface VoucherDetail {
  _id?: any;
  description?: string;
  pointToRedeem?: number;
  quantity?: number;
  totalQuantity?: number; // Tổng số lượng voucher ban đầu
  discountPercent?: number;
  maxDiscountValue?: number;
}

export interface DiscountDetail {
  applyType?: "combo" | "ticket";
  // Combo
  comboName?: string;
  comboId?: string; // ID của combo được chọn
  comboDiscountPercent?: number;
  // Ticket
  seatType?: "normal" | "vip" | "couple" | "4dx";
  ticketDiscountPercent?: number;
  // Ngân sách tổng cho khuyến mãi chiết khấu (VNĐ)
  totalBudget?: number;
  description?: string; // Mô tả cho khuyến mãi chiết khấu
}

export interface AmountDetail {
  minOrderValue: number;
  discountValue: number;
  // Ngân sách tổng cho khuyến mãi tiền (VNĐ)
  totalBudget?: number;
  description?: string; // Mô tả cho khuyến mãi tiền
}

export interface ItemDetail {
  applyType?: "combo" | "ticket";
  // Cho combo: buyItem lấy từ combo, có comboId
  buyItem: string;
  comboId?: string; // ID của combo được chọn khi applyType = 'combo'
  buyQuantity: number;
  // Cho ticket: buyItem là loại vé
  // rewardItem lấy từ cả sản phẩm và combo
  rewardItem: string;
  rewardItemId?: string; // ID của sản phẩm/combo được chọn làm phần thưởng
  rewardQuantity: number;
  rewardType: "free" | "discount";
  rewardDiscountPercent?: number;
  // Ngân sách tổng cho sản phẩm tặng (ví dụ: tối đa 1000 sản phẩm tặng)
  totalBudget?: number;
  description?: string; // Mô tả cho khuyến mãi hàng
}

export type PromotionDetail =
  | VoucherDetail
  | DiscountDetail
  | AmountDetail
  | ItemDetail;

export interface IPromotionLine {
  promotionType: PromotionType;
  validityPeriod: {
    startDate: Date;
    endDate: Date;
  };
  status: "hoạt động" | "không hoạt động";
  originalStatus?: "hoạt động" | "không hoạt động"; // Lưu trạng thái ban đầu để khôi phục
  detail: PromotionDetail;
  rule?: {
    stackingPolicy: "STACKABLE" | "EXCLUSIVE" | "EXCLUSIVE_WITH_GROUP";
    exclusionGroup?: string; // chỉ dùng khi stackingPolicy = EXCLUSIVE_WITH_GROUP
  };
  code?: string; // Mã 10 số ngẫu nhiên tự động tạo
}

const VoucherDetailSchema = new Schema<VoucherDetail>({
  description: { type: String },
  pointToRedeem: { type: Number },
  quantity: { type: Number },
  totalQuantity: { type: Number }, // Tổng số lượng voucher ban đầu
  discountPercent: { type: Number },
  maxDiscountValue: { type: Number },
});

const DiscountDetailSchema = new Schema<DiscountDetail>(
  {
    applyType: { type: String, enum: ["combo", "ticket"] },
    comboName: { type: String },
    comboId: { type: String }, // ID của combo được chọn
    comboDiscountPercent: { type: Number },
    seatType: { type: String }, // Dynamic validation sẽ được xử lý trong service
    ticketDiscountPercent: { type: Number },
    totalBudget: { type: Number },
    description: { type: String }, // Mô tả cho khuyến mãi chiết khấu
  },
  { _id: false }
);

const AmountDetailSchema = new Schema<AmountDetail>(
  {
    minOrderValue: { type: Number, required: true },
    discountValue: { type: Number, required: true },
    totalBudget: { type: Number },
    description: { type: String }, // Mô tả cho khuyến mãi tiền
  },
  { _id: false }
);

const ItemDetailSchema = new Schema<ItemDetail>(
  {
    applyType: { type: String, enum: ["combo", "ticket"] },
    buyItem: { type: String, required: true }, // Dynamic validation sẽ được xử lý trong service
    comboId: { type: String }, // ID của combo được chọn khi applyType = 'combo'
    buyQuantity: { type: Number, required: true },
    rewardItem: { type: String, required: true },
    rewardItemId: { type: String }, // ID của sản phẩm/combo được chọn làm phần thưởng
    rewardQuantity: { type: Number, required: true },
    rewardType: { type: String, enum: ["free", "discount"], required: true },
    rewardDiscountPercent: { type: Number },
    totalBudget: { type: Number },
    description: { type: String }, // Mô tả cho khuyến mãi hàng
  },
  { _id: false }
);

const PromotionLineSchema = new Schema<IPromotionLine>(
  {
    promotionType: {
      type: String,
      enum: ["item", "amount", "percent", "voucher"],
      required: true,
    },
    validityPeriod: {
      startDate: { type: Date, required: true },
      endDate: { type: Date, required: true },
    },
    status: {
      type: String,
      enum: ["hoạt động", "không hoạt động"],
      default: "hoạt động",
    },
    originalStatus: { type: String, enum: ["hoạt động", "không hoạt động"] }, // Lưu trạng thái ban đầu
    // detail là union, dùng oneOf theo promotionType
    detail: { type: Schema.Types.Mixed, required: true },
    rule: {
      stackingPolicy: {
        type: String,
        enum: ["STACKABLE", "EXCLUSIVE", "EXCLUSIVE_WITH_GROUP"],
      },
      exclusionGroup: { type: String },
    },
    code: { type: String, unique: true, immutable: true }, // Mã 10 số ngẫu nhiên, không thể thay đổi
  },
  { _id: false }
);

// Validator mềm cho detail theo promotionType
PromotionLineSchema.path("detail").validate(function (this: any, v: any) {
  const t = this.promotionType as PromotionType;
  if (t === "voucher")
    return (
      v &&
      (typeof v.description === "string" || v.description === undefined) &&
      (typeof v.pointToRedeem === "number" || v.pointToRedeem === undefined) &&
      (typeof v.quantity === "number" || v.quantity === undefined) &&
      (typeof v.discountPercent === "number" ||
        v.discountPercent === undefined) &&
      (typeof v.maxDiscountValue === "number" ||
        v.maxDiscountValue === undefined)
    );
  if (t === "percent")
    return (
      v &&
      (v.applyType === "combo" || v.applyType === "ticket") &&
      (typeof v.comboName === "string" || v.comboName === undefined) &&
      (typeof v.comboDiscountPercent === "number" ||
        v.comboDiscountPercent === undefined) &&
      (typeof v.seatType === "string" || v.seatType === undefined) &&
      (typeof v.ticketDiscountPercent === "number" ||
        v.ticketDiscountPercent === undefined)
    );
  if (t === "amount")
    return (
      v &&
      typeof v.minOrderValue === "number" &&
      typeof v.discountValue === "number"
    );
  if (t === "item")
    return (
      v &&
      typeof v.buyItem === "string" &&
      typeof v.buyQuantity === "number" &&
      typeof v.rewardItem === "string" &&
      typeof v.rewardQuantity === "number" &&
      ["free", "discount"].includes(v.rewardType)
    );
  return false;
}, "Chi tiết khuyến mãi không hợp lệ theo loại promotion");

const VoucherSchema = new Schema<IVoucher>(
  {
    name: { type: String, required: true },
    promotionalCode: {
      type: String,
      required: true,
      unique: true,
      validate: {
        validator: function (v: string) {
          return /^KM\d{3}$/.test(v);
        },
        message: "Mã khuyến mãi phải có định dạng KM001, KM002, ...",
      },
    },
    description: { type: String },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    status: {
      type: String,
      enum: ["hoạt động", "không hoạt động"],
      default: "hoạt động",
    },
    lines: { type: [PromotionLineSchema], default: [] },
    // Legacy fields to support old flows
    quantity: { type: Number },
    discountPercent: { type: Number },
    pointToRedeem: { type: Number },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// ========= Virtuals tương thích UI cũ =========
// validityPeriod ở cấp voucher: lấy theo line đầu tiên để khớp với yêu cầu validity theo line
VoucherSchema.virtual("validityPeriod").get(function (this: any) {
  const first = Array.isArray(this.lines) ? this.lines[0] : undefined;
  if (first) {
    // Sau khi chuyển sang cấu trúc mới, ngày hiệu lực nằm trong lines[i].validityPeriod
    const start = first?.validityPeriod?.startDate ?? first?.startDate;
    const end = first?.validityPeriod?.endDate ?? first?.endDate;
    return { startDate: start, endDate: end };
  }
  // fallback nếu không có line
  return { startDate: this.startDate, endDate: this.endDate };
});

VoucherSchema.virtual("applyType").get(function (this: any) {
  const first = Array.isArray(this.lines) ? this.lines[0] : undefined;
  return first?.detail?.applyType;
});

export const Voucher = model<IVoucher>("Voucher", VoucherSchema);
