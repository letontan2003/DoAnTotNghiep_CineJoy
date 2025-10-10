import { Router } from "express";
import BlogController from "../controllers/BlogController";

const router = Router();
const blogController = new BlogController();

router.get("/", blogController.getBlogs.bind(blogController));
router.get("/visible", blogController.getVisibleBlogs.bind(blogController));
router.get("/status/:status", blogController.getBlogsByStatus.bind(blogController));
router.get("/code/:blogCode", blogController.getBlogByCode.bind(blogController));
router.get("/:id", blogController.getBlogById.bind(blogController));
router.post("/add", blogController.addBlog.bind(blogController));
router.put("/update/:id", blogController.updateBlog.bind(blogController));
router.put("/status/:id", blogController.updateBlogStatus.bind(blogController));
router.delete("/delete/:id", blogController.deleteBlog.bind(blogController));

export default router;