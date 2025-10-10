import { Blog, IBlog } from "../models/Blog";

export default class BlogService {
    getBlogs(): Promise<IBlog[]> {
        return Blog.find();
    }

    getBlogById(id: string): Promise<IBlog | null> {
        return Blog.findById(id);
    }

    getBlogByCode(blogCode: string): Promise<IBlog | null> {
        return Blog.findOne({ blogCode });
    }

    addBlog(blogData: IBlog): Promise<IBlog> {
        const blog = new Blog(blogData);
        return blog.save();
    }

    updateBlog(id: string, blogData: Partial<IBlog>): Promise<IBlog | null> {
        return Blog.findByIdAndUpdate(id, blogData, { new: true });
    }

    deleteBlog(id: string): Promise<IBlog | null> {
        return Blog.findByIdAndDelete(id);
    }

    // Lấy blog theo trạng thái
    getBlogsByStatus(status: 'Hiển thị' | 'Ẩn'): Promise<IBlog[]> {
        return Blog.find({ status });
    }

    // Lấy tất cả blog hiển thị (cho client)
    getVisibleBlogs(): Promise<IBlog[]> {
        return Blog.find({ status: 'Hiển thị' }).sort({ postedDate: -1 });
    }

    // Cập nhật trạng thái blog
    updateBlogStatus(id: string, status: 'Hiển thị' | 'Ẩn'): Promise<IBlog | null> {
        return Blog.findByIdAndUpdate(id, { status }, { new: true });
    }
}