import { Request, Response } from "express";
import MoviesService from "../services/MoviesService";
const moviesService = new MoviesService();
import upload from "../configs/cloudconfig";

// Thêm interface cho Request với file
interface MulterRequest extends Request {
    file?: Express.Multer.File;
}

export default class MoviesController {
    // Lấy danh sách phim
    async getMovies(req: Request, res: Response): Promise<void> {
        try {
            const movies = await moviesService.getMoviesWithUpdatedStatus();
            res.status(200).json(movies);
        } catch (error) {
            res.status(500).json({ message: "Error fetching movies", error });
        }
    }

    // Lấy thông tin chi tiết của một phim
    async getMovieById(req: Request, res: Response): Promise<void> {
        const { id } = req.params;
        try {
            const movie = await moviesService.getMovieById(id);
            if (!movie) {
                res.status(404).json({ message: "Movie not found" });
                return;
            }
            res.status(200).json(movie);
        } catch (error) {
            res.status(500).json({ message: "Error fetching movie", error });
        }
    }

    async addMovie(req: MulterRequest, res: Response): Promise<void> {
        try {

            // Sử dụng middleware upload.fields để xử lý nhiều file upload
            upload.fields([
                { name: 'image', maxCount: 1 },
                { name: 'posterImage', maxCount: 1 }
            ])(req, res, async (err) => {
                if (err) {
                    console.error('Upload error:', err);
                    return res.status(400).json({
                        message: "Error uploading images",
                        error: err.message,
                        details: err
                    });
                }

                try {
                    const movieData = { ...req.body };

                    // Xử lý các trường array từ JSON string
                    ['genre', 'actors', 'language', 'reviews'].forEach(field => {
                        if (movieData[field]) {
                            try {
                                movieData[field] = JSON.parse(movieData[field]);
                                console.log(`Parsed ${field}:`, movieData[field]);
                            } catch (e) {
                                console.error(`Error parsing ${field}:`, e);
                                movieData[field] = [];
                            }
                        }
                    });

                    // Lấy URLs từ Cloudinary
                    if (req.files) {
                        const files = req.files as { [fieldname: string]: Express.Multer.File[] };
                        console.log('Uploaded files:', files);

                        if (files.image) {
                            movieData.image = files.image[0].path;
                            console.log('Image URL:', movieData.image);
                        }
                        if (files.posterImage) {
                            movieData.posterImage = files.posterImage[0].path;
                            console.log('Poster URL:', movieData.posterImage);
                        }
                    }



                    // Kiểm tra mã phim trùng
                    const existingMovie = await moviesService.getMovieByCode(movieData.movieCode);
                    if (existingMovie) {
                        return res.status(400).json({
                            message: "Mã phim đã tồn tại",
                            error: "Movie code already exists"
                        });
                    }

                    const newMovie = await moviesService.addMovie(movieData);
                    res.status(201).json(newMovie);
                } catch (error: any) {
                    console.error('Error processing movie data:', error);
                    res.status(500).json({
                        message: "Error adding movie",
                        error: error.message,
                        details: error
                    });
                }
            });
        } catch (error: any) {
            console.error('Error in addMovie:', error);
            res.status(500).json({
                message: "Error processing request",
                error: error.message,
                details: error
            });
        }
    }
    // Cập nhật thông tin của một phim
    async updateMovie(req: Request, res: Response): Promise<void> {
        const { id } = req.params;
        try {
            // Sử dụng middleware upload.fields để xử lý nhiều file upload
            upload.fields([
                { name: 'image', maxCount: 1 },
                { name: 'posterImage', maxCount: 1 }
            ])(req, res, async (err) => {
                if (err) {
                    console.error('Upload error:', err);
                    return res.status(400).json({
                        message: "Error uploading images",
                        error: err.message,
                        details: err
                    });
                }

                try {
                    const movieData = { ...req.body };
                    console.log('Initial movie data:', movieData);

                    // Xử lý các trường array từ JSON string
                    ['genre', 'actors', 'language', 'reviews'].forEach(field => {
                        if (movieData[field] && typeof movieData[field] === 'string') {
                            try {
                                movieData[field] = JSON.parse(movieData[field]);
                                console.log(`Parsed ${field}:`, movieData[field]);
                            } catch (e) {
                                console.error(`Error parsing ${field}:`, e);
                                movieData[field] = [];
                            }
                        }
                    });

                    // Lấy URLs từ Cloudinary (chỉ khi có file mới)
                    if (req.files && Object.keys(req.files).length > 0) {
                        const files = req.files as { [fieldname: string]: Express.Multer.File[] };
                        console.log('Uploaded files:', files);

                        if (files.image && files.image.length > 0) {
                            movieData.image = files.image[0].path;
                            console.log('Image URL:', movieData.image);
                        }
                        if (files.posterImage && files.posterImage.length > 0) {
                            movieData.posterImage = files.posterImage[0].path;
                            console.log('Poster URL:', movieData.posterImage);
                        }
                    }

                    console.log('Final movie data:', movieData);

                    // Kiểm tra mã phim trùng (chỉ khi mã phim thay đổi)
                    if (movieData.movieCode) {
                        // Lấy phim hiện tại để so sánh
                        const currentMovie = await moviesService.getMovieById(id);
                        if (currentMovie && currentMovie.movieCode !== movieData.movieCode) {
                            // Mã phim đã thay đổi, kiểm tra trùng lặp
                            const existingMovie = await moviesService.getMovieByCode(movieData.movieCode);
                            if (existingMovie) {
                                return res.status(400).json({
                                    message: "Mã phim đã tồn tại",
                                    error: "Movie code already exists"
                                });
                            }
                        }
                    }

                    const updatedMovie = await moviesService.updateMovie(id, movieData);
                    if (!updatedMovie) {
                        res.status(404).json({ message: "Movie not found" });
                        return;
                    }
                    res.status(200).json(updatedMovie);
                } catch (error: any) {
                    console.error('Error processing movie data:', error);
                    console.error('Error stack:', error.stack);
                    res.status(500).json({
                        message: "Error updating movie",
                        error: error.message,
                        details: error
                    });
                }
            });
        } catch (error: any) {
            console.error('Error in updateMovie:', error);
            res.status(500).json({
                message: "Error processing request",
                error: error.message,
                details: error
            });
        }
    }
    // Xóa một phim
    async deleteMovie(req: Request, res: Response): Promise<void> {
        const { id } = req.params;
        try {
            const deletedMovie = await moviesService.deleteMovie(id);
            if (!deletedMovie) {
                res.status(404).json({ message: "Movie not found" });
                return;
            }
            res.status(200).json({ message: "Movie deleted successfully" });
        } catch (error) {
            res.status(500).json({ message: "Error deleting movie", error });
        }
    }

    // Tìm kiếm phim
    async searchMovies(req: Request, res: Response): Promise<void> {
        const keyword = req.query.q as string;
        if (!keyword || keyword.trim() === "") {
            res.status(400).json({ status: false, error: 1, message: "Missing search keyword", data: [] });
            return;
        }
        try {
            const movies = await moviesService.searchMovies(keyword);
            res.status(200).json({ status: true, error: 0, message: "Get search movie success", data: movies });
        } catch (error) {
            res.status(500).json({ status: false, error: 2, message: "Error searching movies", data: [], details: error });
        }
    }

    // Cập nhật trạng thái phim thủ công (cho testing)
    async updateMovieStatuses(req: Request, res: Response): Promise<void> {
        try {
            const result = await moviesService.updateMovieStatuses();
            res.status(200).json({
                success: true,
                message: result.message,
                updated: result.updated
            });
        } catch (error) {
            res.status(500).json({ 
                success: false,
                message: "Error updating movie statuses", 
                error 
            });
        }
    }
}