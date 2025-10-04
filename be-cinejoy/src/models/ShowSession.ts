import mongoose, { Document, Schema } from 'mongoose';

export interface IShowSession extends Document {
    _id: string;
    shiftCode: string; // Mã ca chiếu
    name: string;
    startTime: string; // Format: "08:00"
    endTime: string;   // Format: "11:59"
    createdAt: Date;
    updatedAt: Date;
}

const ShowSessionSchema = new Schema<IShowSession>(
    {
        shiftCode: {
            type: String,
            required: [true, 'Mã ca chiếu là bắt buộc'],
            unique: true,
            trim: true,
            maxlength: [10, 'Mã ca chiếu không được quá 10 ký tự']
        },
        name: {
            type: String,
            required: [true, 'Tên ca chiếu là bắt buộc'],
            trim: true,
            unique: true,
            maxlength: [50, 'Tên ca chiếu không được quá 50 ký tự']
        },
        startTime: {
            type: String,
            required: [true, 'Thời gian bắt đầu ca chiếu là bắt buộc'],
            validate: {
                validator: function(v: string) {
                    // Validate format HH:mm
                    return /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(v);
                },
                message: 'Thời gian bắt đầu phải có định dạng HH:mm'
            }
        },
        endTime: {
            type: String,
            required: [true, 'Thời gian kết thúc ca chiếu là bắt buộc'],
            validate: {
                validator: function(v: string) {
                    // Validate format HH:mm
                    return /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(v);
                },
                message: 'Thời gian kết thúc phải có định dạng HH:mm'
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
ShowSessionSchema.index({ name: 1 });
ShowSessionSchema.index({ startTime: 1 });

// Virtual to check if current time is within session
ShowSessionSchema.virtual('isActive').get(function() {
    const now = new Date();
    const currentTime = now.getHours().toString().padStart(2, '0') + ':' + now.getMinutes().toString().padStart(2, '0');
    return currentTime >= this.startTime && currentTime <= this.endTime;
});

export default mongoose.model<IShowSession>('ShowSession', ShowSessionSchema);
