import mongoose, { Document, Schema } from "mongoose";

export interface IPayment extends Document {
  _id: string;
  orderId: string;
  paymentMethod: "MOMO" | "VNPAY";
  amount: number;
  status: "PENDING" | "SUCCESS" | "FAILED" | "CANCELLED" | "REFUNDED";
  transactionId?: string;
  gatewayTransactionId?: string;
  gatewayResponse?: any;
  refundInfo?: {
    refundAmount: number;
    refundDate: Date;
    refundTransactionId: string;
    reason: string;
  };
  metadata?: {
    returnUrl?: string;
    cancelUrl?: string;
    ipAddress?: string;
    userAgent?: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

const PaymentSchema: Schema = new Schema(
  {
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
      required: true,
      index: true,
    },
    paymentMethod: {
      type: String,
      enum: ["MOMO", "VNPAY"],
      required: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    status: {
      type: String,
      enum: ["PENDING", "SUCCESS", "FAILED", "CANCELLED", "REFUNDED"],
      default: "PENDING",
      index: true,
    },
    transactionId: {
      type: String,
      unique: true,
      sparse: true,
    },
    gatewayTransactionId: {
      type: String,
      sparse: true,
    },
    gatewayResponse: {
      type: mongoose.Schema.Types.Mixed,
    },
    refundInfo: {
      refundAmount: {
        type: Number,
        min: 0,
      },
      refundDate: {
        type: Date,
      },
      refundTransactionId: {
        type: String,
      },
      reason: {
        type: String,
      },
    },
    metadata: {
      returnUrl: String,
      cancelUrl: String,
      ipAddress: String,
      userAgent: String,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

PaymentSchema.index({ orderId: 1, status: 1 });
PaymentSchema.index({ transactionId: 1 });
PaymentSchema.index({ createdAt: -1 });

PaymentSchema.pre("save", async function (next) {
  if (this.isNew && !this.transactionId) {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 8);
    this.transactionId = `TXN${timestamp}${random}`.toUpperCase();
  }
  next();
});

export default mongoose.model<IPayment>("Payment", PaymentSchema);
