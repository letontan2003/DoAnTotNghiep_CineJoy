import mongoose, { Document, Schema } from 'mongoose';

export interface IRoom extends Document {
    _id: string;
    roomCode: string;
    name: string;
    theater: mongoose.Types.ObjectId;
    capacity: number;
    roomType: '2D' | '4DX';
    status: 'active' | 'maintenance' | 'inactive';
    description?: string;
    seatLayout: {
        rows: number;
        cols: number;
    };
    createdAt: Date;
    updatedAt: Date;
}

const RoomSchema = new Schema<IRoom>(
    {
        roomCode: {
            type: String,
            required: [true, 'Mã phòng chiếu là bắt buộc'],
            unique: true,
            trim: true,
            maxlength: [10, 'Mã phòng chiếu không được quá 10 ký tự']
        },
        name: {
            type: String,
            required: [true, 'Tên phòng chiếu là bắt buộc'],
            trim: true,
            maxlength: [50, 'Tên phòng chiếu không được quá 50 ký tự']
        },
        theater: {
            type: Schema.Types.ObjectId,
            ref: 'Theater',
            required: [true, 'Rạp chiếu là bắt buộc']
        },
        capacity: {
            type: Number,
            required: [true, 'Sức chứa là bắt buộc'],
            min: [20, 'Sức chứa tối thiểu là 20 ghế'],
            max: [500, 'Sức chứa tối đa là 500 ghế']
        },
        roomType: {
            type: String,
            enum: ['2D', '4DX'],
            default: '2D',
            required: [true, 'Loại phòng chiếu là bắt buộc']
        },
        status: {
            type: String,
            enum: ['active', 'maintenance', 'inactive'],
            default: 'active',
            required: [true, 'Trạng thái phòng chiếu là bắt buộc']
        },
        description: {
            type: String,
            maxlength: [500, 'Mô tả không được quá 500 ký tự'],
            trim: true
        },
        seatLayout: {
            rows: {
                type: Number,
                required: [true, 'Số dòng ghế là bắt buộc'],
                min: [4, 'Số dòng tối thiểu là 4'],
                max: [20, 'Số dòng tối đa là 20']
            },
            cols: {
                type: Number,
                required: [true, 'Số ghế mỗi dòng là bắt buộc'],
                min: [5, 'Số ghế mỗi dòng tối thiểu là 5'],
                max: [25, 'Số ghế mỗi dòng tối đa là 25']
            }
        }
    },
    {
        timestamps: true,
        toJSON: { virtuals: true },
        toObject: { virtuals: true }
    }
);

// Index for efficient queries
RoomSchema.index({ theater: 1, name: 1 }, { unique: true });
RoomSchema.index({ theater: 1, status: 1 });

// Virtual populate seats
RoomSchema.virtual('seats', {
    ref: 'Seat',
    localField: '_id',
    foreignField: 'room'
});

export default mongoose.model<IRoom>('Room', RoomSchema);
