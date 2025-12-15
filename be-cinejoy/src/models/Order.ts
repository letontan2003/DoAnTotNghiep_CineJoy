import mongoose, { Document, Schema } from "mongoose";

export interface IOrder extends Document {
  _id: string;
  orderCode: string;
  userId: string;
  movieId: string;
  theaterId: string;
  showtimeId: string;
  showDate: string; // Format: "2025-09-07"
  showTime: string; // Format: "08:00"
  room: string; // "Room 1"
  seats: Array<{
    seatId: string; // "A1", "B2", etc.
    type: string; // "standard", "vip", "couple"
    price: number;
  }>;
  foodCombos: Array<{
    comboId: string;
    quantity: number;
    price: number;
  }>;
  voucherId?: string;
  voucherDiscount: number;
  amountDiscount: number;
  amountDiscountInfo?: {
    description: string;
    minOrderValue: number;
    discountValue: number;
    exclusionGroup?: string;
  };
  itemPromotions?: Array<{
    description: string;
    rewardItem: string;
    rewardQuantity: number;
    rewardType: string;
  }>;
  percentPromotions?: Array<{
    description: string;
    comboName?: string;
    comboId?: string;
    seatType?: string;
    discountPercent: number;
    discountAmount: number;
  }>;
  ticketPrice: number;
  comboPrice: number;
  totalAmount: number;
  finalAmount: number;
  paymentMethod: "MOMO" | "VNPAY" | "PAY_LATER"; // Required
  paymentStatus: "PENDING" | "PAID" | "FAILED" | "CANCELLED" | "REFUNDED";
  orderStatus:
    | "PENDING"
    | "CONFIRMED"
    | "CANCELLED"
    | "COMPLETED"
    | "RETURNED"
    | "WAITING";
  pointsProcessed?: boolean;
  returnInfo?: {
    reason?: string;
    returnDate?: Date;
    refundAmount?: number;
    refundPercentage?: number;
    returnedBeforeHours?: number;
    isBefore2Hours?: boolean;
  };
  customerInfo: {
    fullName: string;
    phoneNumber: string;
    email: string;
  };
  paymentInfo?: {
    transactionId?: string;
    paymentDate?: Date;
    paymentGatewayResponse?: any;
  };
  createdAt: Date;
  updatedAt: Date;
  expiresAt?: Date;
}

const OrderSchema: Schema = new Schema(
  {
    orderCode: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    movieId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Movie",
      required: true,
    },
    theaterId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Theater",
      required: true,
    },
    showtimeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Showtime",
      required: true,
    },
    showDate: {
      type: String,
      required: true, // Format: "2025-09-07"
    },
    showTime: {
      type: String,
      required: true, // Format: "08:00"
    },
    room: {
      type: String,
      required: true, // "Room 1", "Room 2", etc.
    },
    seats: [
      {
        seatId: {
          type: String,
          required: true, // "A1", "B2", etc.
        },
        type: {
          type: String,
          required: true, // "standard", "vip", "couple"
        },
        price: {
          type: Number,
          required: true,
          min: 0,
        },
      },
    ],
    foodCombos: [
      {
        comboId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "FoodCombo",
          required: true,
        },
        quantity: {
          type: Number,
          required: true,
          min: 1,
        },
        price: {
          type: Number,
          required: true,
          min: 0,
        },
      },
    ],
    voucherId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "UserVoucher", // Thực chất lưu userVoucherId, không phải voucherId
      required: false,
    },
    voucherDiscount: {
      type: Number,
      default: 0,
      min: 0,
    },
    amountDiscount: {
      type: Number,
      default: 0,
      min: 0,
    },
    amountDiscountInfo: {
      description: {
        type: String,
        required: false,
      },
      minOrderValue: {
        type: Number,
        required: false,
      },
      discountValue: {
        type: Number,
        required: false,
      },
      exclusionGroup: {
        type: String,
        required: false,
      },
    },
    itemPromotions: [
      {
        description: {
          type: String,
          required: true,
        },
        rewardItem: {
          type: String,
          required: true,
        },
        rewardQuantity: {
          type: Number,
          required: true,
        },
        rewardType: {
          type: String,
          required: true,
        },
      },
    ],
    percentPromotions: [
      {
        description: {
          type: String,
          required: true,
        },
        comboName: {
          type: String,
          required: false,
        },
        comboId: {
          type: String,
          required: false,
        },
        seatType: {
          type: String,
          required: false,
        },
        discountPercent: {
          type: Number,
          required: true,
        },
        discountAmount: {
          type: Number,
          required: true,
        },
      },
    ],
    ticketPrice: {
      type: Number,
      required: true,
      min: 0,
    },
    comboPrice: {
      type: Number,
      default: 0,
      min: 0,
    },
    totalAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    finalAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    paymentMethod: {
      type: String,
      enum: ["MOMO", "VNPAY", "PAY_LATER"],
      required: true, // Required when creating order
    },
    paymentStatus: {
      type: String,
      enum: ["PENDING", "PAID", "FAILED", "CANCELLED", "REFUNDED"],
      default: "PENDING",
      index: true,
    },
    orderStatus: {
      type: String,
      enum: [
        "PENDING",
        "CONFIRMED",
        "CANCELLED",
        "COMPLETED",
        "RETURNED",
        "WAITING",
      ],
      default: "PENDING",
      index: true,
    },
    pointsProcessed: {
      type: Boolean,
      default: false,
      index: true,
    },
    returnInfo: {
      reason: {
        type: String,
        required: false,
      },
      returnDate: {
        type: Date,
        required: false,
      },
      refundAmount: {
        type: Number,
        required: false,
      },
      refundPercentage: {
        type: Number,
        required: false,
      },
      returnedBeforeHours: {
        type: Number,
        required: false,
      },
      isBefore2Hours: {
        type: Boolean,
        required: false,
      },
    },
    customerInfo: {
      fullName: {
        type: String,
        required: true,
        trim: true,
      },
      phoneNumber: {
        type: String,
        required: true,
        trim: true,
      },
      email: {
        type: String,
        required: true,
        trim: true,
        lowercase: true,
      },
    },
    paymentInfo: {
      transactionId: {
        type: String,
        sparse: true,
      },
      paymentDate: {
        type: Date,
      },
      paymentGatewayResponse: {
        type: mongoose.Schema.Types.Mixed,
      },
    },
    expiresAt: {
      type: Date,
      required: false,
      index: { expireAfterSeconds: 0 },
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

OrderSchema.index({ userId: 1, createdAt: -1 });
OrderSchema.index({ paymentStatus: 1, orderStatus: 1 });

OrderSchema.pre("save", async function (next) {
  if (this.isNew && !this.orderCode) {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 7);
    this.orderCode = `CJ${timestamp}${random}`.toUpperCase();
  }
  next();
});

OrderSchema.pre("save", async function (next) {
  if (this.orderStatus === "CONFIRMED" || this.orderStatus === "RETURNED") {
    if (this.expiresAt !== undefined && this.expiresAt !== null) {
      this.expiresAt = undefined;
    }
  }
  next();
});

export default mongoose.model<IOrder>("Order", OrderSchema);
