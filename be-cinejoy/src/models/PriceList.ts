import mongoose, { Document, Schema } from "mongoose";

export interface IPriceListLine {
  type: 'ticket' | 'combo' | 'single';
  seatType?: 'normal' | 'vip' | 'couple' | '4dx'; // Chỉ có khi type = 'ticket'
  productId?: string; // Chỉ có khi type = 'combo' hoặc 'single'
  productName?: string; // Chỉ có khi type = 'combo' hoặc 'single'
  price: number;
}

export interface IPriceList extends Document {
  _id: string;
  code: string;
  name: string;
  description?: string;
  startDate: Date;
  endDate: Date;
  status: 'active' | 'scheduled' | 'expired';
  lines: IPriceListLine[];
  createdAt: Date;
  updatedAt: Date;
}

const PriceListLineSchema = new Schema<IPriceListLine>({
  type: {
    type: String,
    enum: ['ticket', 'combo', 'single'],
    required: true
  },
  seatType: {
    type: String,
    enum: ['normal', 'vip', 'couple', '4dx'],
    required: function() {
      return this.type === 'ticket';
    }
  },
  productId: {
    type: String,
    required: function() {
      return this.type === 'combo' || this.type === 'single';
    }
  },
  productName: {
    type: String,
    required: function() {
      return this.type === 'combo' || this.type === 'single';
    }
  },
  price: {
    type: Number,
    required: true,
    min: 0
  }
}, { _id: false });

const PriceListSchema = new Schema<IPriceList>({
  code: {
    type: String,
    required: [true, 'Mã bảng giá là bắt buộc'],
    trim: true,
    unique: true,
    uppercase: true
  },
  name: {
    type: String,
    required: [true, 'Tên bảng giá là bắt buộc'],
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  startDate: {
    type: Date,
    required: [true, 'Ngày bắt đầu là bắt buộc']
  },
  endDate: {
    type: Date,
    required: [true, 'Ngày kết thúc là bắt buộc'],
    validate: {
      validator: function(this: IPriceList, endDate: Date) {
        return endDate >= this.startDate;
      },
      message: 'Ngày kết thúc phải sau hoặc bằng ngày bắt đầu'
    }
  },
  status: {
    type: String,
    enum: ['active', 'scheduled', 'expired'],
    default: 'scheduled'
  },
  lines: {
    type: [PriceListLineSchema],
    default: [],
    validate: {
      validator: function(lines: IPriceListLine[]) {
        // Nếu không có lines hoặc lines rỗng thì cho phép (để tạo bảng giá rỗng)
        if (!lines || lines.length === 0) {
          return true;
        }
        
        // Nếu có lines thì kiểm tra phải có đầy đủ 4 loại ghế
        const seatTypes = lines.filter(line => line.type === 'ticket').map(line => line.seatType);
        const requiredSeatTypes = ['normal', 'vip', 'couple', '4dx'];
        const hasAllSeatTypes = requiredSeatTypes.every(seatType => seatTypes.includes(seatType as any));
        
        if (!hasAllSeatTypes) {
          return false;
        }
        
        return true;
      },
      message: 'Bảng giá phải có đầy đủ 4 loại ghế (normal, vip, couple, 4dx) khi có danh sách giá'
    }
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Index để tối ưu hóa truy vấn theo ngày
PriceListSchema.index({ startDate: 1, endDate: 1 });
PriceListSchema.index({ status: 1 });
PriceListSchema.index({ code: 1 });

// Middleware để tự động cập nhật status dựa trên ngày
PriceListSchema.pre('save', function(next) {
  const now = new Date();
  
  if (this.startDate <= now && this.endDate >= now) {
    this.status = 'active';
  } else if (this.endDate < now) {
    this.status = 'expired';
  } else if (this.startDate > now) {
    this.status = 'scheduled';
  }
  
  next();
});

export default mongoose.model<IPriceList>('PriceList', PriceListSchema);
