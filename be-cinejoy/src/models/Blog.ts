import { Schema, model, Document } from "mongoose";

export interface IBlog extends Document {
    blogCode?: string; // Mã tin tức (cho phép trùng)
    title: string;
    description: string; // Mô tả ngắn
    postedDate: Date;
    content: string;
    posterImage: string; // Ảnh poster
    backgroundImage: string; // Ảnh background
    status: 'Hiển thị' | 'Ẩn'; // Trạng thái hiển thị
}

const BlogSchema = new Schema<IBlog>({
    blogCode: { type: String, required: false },
    title: { type: String, required: true },
    description: { type: String, required: true }, // Mô tả ngắn
    postedDate: { type: Date, required: true },
    content: { type: String, required: true },
    posterImage: { type: String, required: true }, // URL for poster image
    backgroundImage: { type: String, required: true }, // URL for background image
    status: { 
        type: String, 
        required: true,
        enum: ['Hiển thị', 'Ẩn'],
        default: 'Hiển thị'
    }, // Trạng thái hiển thị
});

// Tạo index không unique để tối ưu truy vấn theo mã (cho phép trùng)
BlogSchema.index({ blogCode: 1 });

export const Blog = model<IBlog>("Blog", BlogSchema);