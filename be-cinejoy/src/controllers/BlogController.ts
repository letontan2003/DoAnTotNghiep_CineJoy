import { Request, Response } from "express";
import BlogService from "../services/BlogService";
const blogService = new BlogService();

export default class BlogController {
    async getBlogs(req: Request, res: Response): Promise<void> {
        try {
            const blogs = await blogService.getBlogs();
            res.status(200).json(blogs);
        } catch (error) {
            res.status(500).json({ message: "Error fetching blogs", error });
        }
    }

    async getBlogById(req: Request, res: Response): Promise<void> {
        const { id } = req.params;
        try {
            const blog = await blogService.getBlogById(id);
            if (!blog) {
                res.status(404).json({ message: "Blog not found" });
                return;
            }
            res.status(200).json(blog);
        } catch (error) {
            res.status(500).json({ message: "Error fetching blog", error });
        }
    }

    async getBlogByCode(req: Request, res: Response): Promise<void> {
        const { blogCode } = req.params;
        try {
            const blog = await blogService.getBlogByCode(blogCode);
            if (!blog) {
                res.status(404).json({ message: "Blog not found" });
                return;
            }
            res.status(200).json(blog);
        } catch (error) {
            res.status(500).json({ message: "Error fetching blog", error });
        }
    }

    async addBlog(req: Request, res: Response): Promise<void> {
        try {
            const body = req.body as any;
            const newBlog = await blogService.addBlog(body);
            res.status(201).json(newBlog);
        } catch (error: any) {
            if (error.name === 'ValidationError') {
                res.status(400).json({ message: "Validation error", errors: error.errors });
                return;
            }
            res.status(500).json({ message: "Error adding blog", error });
        }
    }

    async updateBlog(req: Request, res: Response): Promise<void> {
        const { id } = req.params;
        try {
            const body = req.body as any;
            const updatedBlog = await blogService.updateBlog(id, body);
            if (!updatedBlog) {
                res.status(404).json({ message: "Blog not found" });
                return;
            }
            res.status(200).json(updatedBlog);
        } catch (error: any) {
            if (error.name === 'ValidationError') {
                res.status(400).json({ message: "Validation error", errors: error.errors });
                return;
            }
            res.status(500).json({ message: "Error updating blog", error });
        }
    }

    async deleteBlog(req: Request, res: Response): Promise<void> {
        const { id } = req.params;
        try {
            const deletedBlog = await blogService.deleteBlog(id);
            if (!deletedBlog) {
                res.status(404).json({ message: "Blog not found" });
                return;
            }
            res.status(200).json({ message: "Blog deleted successfully" });
        } catch (error) {
            res.status(500).json({ message: "Error deleting blog", error });
        }
    }
}