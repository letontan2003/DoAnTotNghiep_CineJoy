import { Movie, IMovie } from "../models/Movies";
import { removeAccents } from '../utils/removeAccents';

export default class MoviesService {
    // Lấy danh sách phim
    getMovies(): Promise<IMovie[]> {
        return Movie.find();
    }

    // Lấy thông tin chi tiết của một phim
    getMovieById(id: string): Promise<IMovie | null> {
        return Movie.findById(id);
    }

    // Lấy phim theo mã phim
    getMovieByCode(movieCode: string): Promise<IMovie | null> {
        return Movie.findOne({ movieCode });
    }

    // Thêm một phim mới
    addMovie(movieData: IMovie): Promise<IMovie> {
        movieData.titleNoAccent = removeAccents(movieData.title);
        const movie = new Movie(movieData);
        return movie.save();
    }

    // Cập nhật thông tin của một phim
    updateMovie(id: string, movieData: Partial<IMovie>): Promise<IMovie | null> {
        return Movie.findByIdAndUpdate(id, movieData, { new: true });
    }

    // Xóa một phim
    deleteMovie(id: string): Promise<IMovie | null> {
        return Movie.findByIdAndDelete(id);
    }

    // Tìm kiếm phim theo từ khóa
    async searchMovies(keyword: string): Promise<IMovie[]> {
        const regex = new RegExp(removeAccents(keyword), 'i');
        return Movie.find({
            $or: [
                { titleNoAccent: regex },
                { genre: regex },
                { actors: regex },
                { director: regex },
                { language: regex },
            ]
        });
    }

    // Tự động cập nhật trạng thái phim dựa trên ngày hiện tại
    async updateMovieStatuses(): Promise<{ updated: number; message: string }> {
        try {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            
            // Lấy tất cả phim
            const movies = await Movie.find();
            let updatedCount = 0;

            for (const movie of movies) {
                const startDate = new Date(movie.startDate);
                const endDate = new Date(movie.endDate);
                
                startDate.setHours(0, 0, 0, 0);
                endDate.setHours(23, 59, 59, 999);

                let newStatus: 'Phim đang chiếu' | 'Phim sắp chiếu' | 'Suất chiếu đặc biệt' | 'Đã kết thúc';

                // Nếu ngày hiện tại quá khoảng thời gian chiếu (đã kết thúc)
                if (today > endDate) {
                    newStatus = 'Đã kết thúc';
                }
                // Nếu ngày hiện tại nằm trong khoảng thời gian chiếu (đang chiếu)
                else if (today >= startDate && today <= endDate) {
                    // Giữ nguyên trạng thái nếu là "Suất chiếu đặc biệt", ngược lại chuyển thành "Phim đang chiếu"
                    if (movie.status === 'Suất chiếu đặc biệt') {
                        newStatus = 'Suất chiếu đặc biệt';
                    } else {
                        newStatus = 'Phim đang chiếu';
                    }
                }
                // Nếu ngày hiện tại chưa đến khoảng thời gian chiếu (sắp chiếu)
                else if (today < startDate) {
                    newStatus = 'Phim sắp chiếu';
                }
                else {
                    continue; // Không cần cập nhật
                }

                // Chỉ cập nhật nếu trạng thái thay đổi
                if (movie.status !== newStatus) {
                    await Movie.findByIdAndUpdate(movie._id, { status: newStatus });
                    updatedCount++;
                    console.log(`Updated movie ${movie.movieCode} (${movie.title}) status from "${movie.status}" to "${newStatus}"`);
                }
            }

            return {
                updated: updatedCount,
                message: `Đã cập nhật trạng thái cho ${updatedCount} phim`
            };
        } catch (error) {
            console.error('Error updating movie statuses:', error);
            throw new Error('Có lỗi xảy ra khi cập nhật trạng thái phim');
        }
    }

    // Lấy danh sách phim với trạng thái đã được cập nhật
    async getMoviesWithUpdatedStatus(): Promise<IMovie[]> {
        // Tự động cập nhật trạng thái trước khi trả về danh sách
        await this.updateMovieStatuses();
        return this.getMovies();
    }
}