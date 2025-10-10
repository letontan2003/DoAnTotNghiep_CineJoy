import { Schema, model, Document } from "mongoose";

export interface IShowtimeSeat {
    seat: Schema.Types.ObjectId; // Reference to Seat model
    status: 'available' | 'selected' | 'maintenance' | 'reserved' | 'occupied';
    reservedUntil?: Date; // Temporary reservation
    reservedBy?: Schema.Types.ObjectId; // User who reserved temporarily
}

export interface IShowtime extends Document {
    movieId: Schema.Types.ObjectId;
    theaterId: Schema.Types.ObjectId;
    showTimes: Array<{
        date: Date; // ngày chiếu cụ thể (YYYY-MM-DD)
        start: Date; // giờ bắt đầu
        end: Date;   // giờ kết thúc
        room: Schema.Types.ObjectId; // Reference to Room model
        showSessionId?: Schema.Types.ObjectId; // Reference to ShowSession model
        seats: IShowtimeSeat[];
    }>;
}

const ShowtimeSchema = new Schema<IShowtime>({
    movieId: { type: Schema.Types.ObjectId, required: true, ref: "Movie" },
    theaterId: { type: Schema.Types.ObjectId, required: true, ref: "Theater" },
    showTimes: [
        {
            date: { type: Date, required: true },
            start: { type: Date, required: true },
            end: { type: Date, required: true },
            room: { type: Schema.Types.ObjectId, required: true, ref: "Room" },
            showSessionId: { type: Schema.Types.ObjectId, ref: "ShowSession" },
            seats: [
                {
                    seat: { type: Schema.Types.ObjectId, required: true, ref: "Seat" },
                    status: {
                        type: String,
                        enum: ['available', 'selected', 'maintenance', 'reserved', 'occupied'],
                        default: 'available',
                        required: true
                    },
                    reservedUntil: { type: Date },
                    reservedBy: { type: Schema.Types.ObjectId, ref: "User" }
                },
            ],
        },
    ],
});

// Ngăn tạo trùng bản ghi theo phim và rạp. Một document duy nhất cho mỗi cặp movieId + theaterId
ShowtimeSchema.index({ movieId: 1, theaterId: 1 }, { unique: true });

// Tối ưu tìm kiếm theo các trường trong mảng showTimes
ShowtimeSchema.index({ 'showTimes.date': 1, 'showTimes.room': 1, 'showTimes.start': 1 });

export const Showtime = model<IShowtime>("Showtime", ShowtimeSchema);
