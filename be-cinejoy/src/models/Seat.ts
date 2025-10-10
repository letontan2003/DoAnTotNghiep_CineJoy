import mongoose, { Document, Schema } from 'mongoose';

export interface ISeat extends Document {
    _id: string;
    seatId: string; // A1, A2, B1, B2, etc.
    room: mongoose.Types.ObjectId;
    row: string; // A, B, C, D, etc.
    number: number; // 1, 2, 3, 4, etc.
    type: 'normal' | 'vip' | 'couple' | '4dx';
    price: number;
    status: 'available' | 'maintenance' | 'selected' | 'occupied';
    position: {
        x: number;
        y: number;
    };
    createdAt: Date;
    updatedAt: Date;
}

const SeatSchema = new Schema<ISeat>(
    {
        seatId: {
            type: String,
            required: [true, 'Mã ghế là bắt buộc'],
            trim: true,
            maxlength: [10, 'Mã ghế không được quá 10 ký tự']
        },
        room: {
            type: Schema.Types.ObjectId,
            ref: 'Room',
            required: [true, 'Phòng chiếu là bắt buộc']
        },
        row: {
            type: String,
            required: [true, 'Hàng ghế là bắt buộc'],
            trim: true,
            maxlength: [5, 'Hàng ghế không được quá 5 ký tự']
        },
        number: {
            type: Number,
            required: [true, 'Số ghế là bắt buộc'],
            min: [1, 'Số ghế phải lớn hơn 0'],
            max: [50, 'Số ghế không được quá 50']
        },
        type: {
            type: String,
            enum: ['normal', 'vip', 'couple', '4dx'],
            default: 'normal',
            required: [true, 'Loại ghế là bắt buộc']
        },
        price: {
            type: Number,
            required: [true, 'Giá ghế là bắt buộc'],
            min: [0, 'Giá ghế không được âm']
        },
        status: {
            type: String,
            enum: ['available', 'maintenance', 'selected', 'occupied'],
            default: 'available',
            required: [true, 'Trạng thái ghế là bắt buộc']
        },
        position: {
            x: {
                type: Number,
                required: [true, 'Vị trí X là bắt buộc'],
                min: [0, 'Vị trí X không được âm']
            },
            y: {
                type: Number,
                required: [true, 'Vị trí Y là bắt buộc'],
                min: [0, 'Vị trí Y không được âm']
            }
        }
    },
    {
        timestamps: true,
        toJSON: { virtuals: true },
        toObject: { virtuals: true }
    }
);

// Compound indexes for efficient queries
SeatSchema.index({ room: 1, seatId: 1 }, { unique: true });
SeatSchema.index({ room: 1, row: 1, number: 1 }, { unique: true });
SeatSchema.index({ room: 1, status: 1 });
SeatSchema.index({ room: 1, type: 1 });

// Pre-save middleware to generate seatId
SeatSchema.pre('save', function(next) {
    if (!this.seatId) {
        this.seatId = `${this.row}${this.number}`;
    }
    next();
});

export default mongoose.model<ISeat>('Seat', SeatSchema);
