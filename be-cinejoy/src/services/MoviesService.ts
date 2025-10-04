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
}