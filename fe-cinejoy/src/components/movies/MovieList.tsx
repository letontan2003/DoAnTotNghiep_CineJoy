import { getMovies } from "@/apiservice/apiMovies";
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import useAppStore from "@/store/app.store";

const MovieList: React.FC = () => {
    const [activeTab, setActiveTab] = useState<"Phim đang chiếu" | "Phim sắp chiếu" | "Suất chiếu đặc biệt" | "Đã kết thúc" | "all">("Phim đang chiếu");
    const [showMore, setShowMore] = useState(false);
    const [movies, setMovies] = useState<IMovie[]>([]);
    const { isDarkMode } = useAppStore();

    const navigate = useNavigate();

    useEffect(() => {
        const fetchMovies = async () => {
            try {
                const response = await getMovies();
                setMovies(Array.isArray(response) ? response : []);
            } catch (error) {
                console.error("Lỗi khi lấy danh sách phim:", error);
            }
        };
        fetchMovies();
    }, []);

    const filteredMovies = (() => {
        let filtered = [];
        
        switch (activeTab) {
            case "all":
                filtered = movies;
                break;
            case "Phim đang chiếu":
                // Chỉ hiển thị phim đang chiếu, không bao gồm suất chiếu đặc biệt
                filtered = movies.filter((movie) => movie.status === "Phim đang chiếu");
                break;
            case "Phim sắp chiếu":
                // Chỉ hiển thị phim sắp chiếu
                filtered = movies.filter((movie) => movie.status === "Phim sắp chiếu");
                break;
            case "Suất chiếu đặc biệt":
                // Chỉ hiển thị suất chiếu đặc biệt
                filtered = movies.filter((movie) => movie.status === "Suất chiếu đặc biệt");
                break;
            case "Đã kết thúc":
                // Chỉ hiển thị phim đã kết thúc
                filtered = movies.filter((movie) => movie.status === "Đã kết thúc");
                break;
            default:
                filtered = movies;
        }
        
        // Sắp xếp phim đang chiếu theo ngày khởi chiếu (gần ngày hiện tại nhất trước)
        if (activeTab === "Phim đang chiếu") {
            const today = new Date();
            filtered.sort((a, b) => {
                const dateA = new Date(a.startDate);
                const dateB = new Date(b.startDate);
                
                // Tính khoảng cách từ ngày khởi chiếu đến ngày hiện tại
                const diffA = Math.abs(dateA.getTime() - today.getTime());
                const diffB = Math.abs(dateB.getTime() - today.getTime());
                
                // Sắp xếp theo khoảng cách gần nhất (diff nhỏ nhất trước)
                return diffA - diffB;
            });
        }
        
        return filtered;
    })();

    const handleView = (_id: string) => {
        navigate(`/movies/${_id}`);
    };

    return (
        <div className="w-full">
            <div className="flex justify-center gap-4 mb-8 pt-3 pb-3">
                <button
                    className={`px-6 h-10 border rounded font-semibold transition cursor-pointer ${activeTab === "Phim sắp chiếu"
                        ? `${isDarkMode ? "bg-blue-700 text-white border-blue-700" : "bg-[#2d3a5a] text-white"}`
                        : `${isDarkMode ? "bg-[#3a3c4a] text-gray-200 border-gray-600 hover:bg-blue-700 hover:border-blue-700 hover:text-white" : "bg-white text-[#2d3a5a] hover:bg-[#2d3a5a] hover:text-white"}`
                    }`}
                    onClick={() => setActiveTab("Phim sắp chiếu")}
                >
                    Phim sắp chiếu
                </button>
                <button
                    className={`px-6 h-10 border rounded font-semibold transition cursor-pointer ${activeTab === "Phim đang chiếu"
                        ? `${isDarkMode ? "bg-blue-700 text-white border-blue-700" : "bg-[#2d3a5a] text-white"}`
                        : `${isDarkMode ? "bg-[#3a3c4a] text-gray-200 border-gray-600 hover:bg-blue-700 hover:border-blue-700 hover:text-white" : "bg-white text-[#2d3a5a] hover:bg-[#2d3a5a] hover:text-white"}`
                    }`}
                    onClick={() => setActiveTab("Phim đang chiếu")}
                >
                    Phim đang chiếu
                </button>
                <button
                    className={`px-6 h-10 border rounded font-semibold transition cursor-pointer ${activeTab === "Suất chiếu đặc biệt"
                        ? `${isDarkMode ? "bg-blue-700 text-white border-blue-700" : "bg-[#2d3a5a] text-white"}`
                        : `${isDarkMode ? "bg-[#3a3c4a] text-gray-200 border-gray-600 hover:bg-blue-700 hover:border-blue-700 hover:text-white" : "bg-white text-[#2d3a5a] hover:bg-[#2d3a5a] hover:text-white"}`
                    }`}
                    onClick={() => setActiveTab("Suất chiếu đặc biệt")}
                >
                    Suất chiếu đặc biệt
                </button>
                <button
                    className={`px-6 h-10 border rounded font-semibold transition cursor-pointer ${activeTab === "all"
                        ? `${isDarkMode ? "bg-blue-700 text-white border-blue-700" : "bg-[#2d3a5a] text-white"}`
                        : `${isDarkMode ? "bg-[#3a3c4a] text-gray-200 border-gray-600 hover:bg-blue-700 hover:border-blue-700 hover:text-white" : "bg-white text-[#2d3a5a] hover:bg-[#2d3a5a] hover:text-white"}`
                    }`}
                    onClick={() => setActiveTab("all")}
                >
                    Tất cả các phim
                </button>
            </div>
            <div className=" grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-y-6 px-4">
                {(showMore ? filteredMovies : filteredMovies.slice(0, 7)).map((movie) => (
                    <div
                        key={movie._id}
                        className={`${isDarkMode ? "bg-[#282a36] text-gray-200 border-gray-700 shadow-lg" : "bg-white text-[#2d3a5a] border shadow-md"} rounded-xl overflow-hidden w-[270px] mx-auto flex flex-col items-center`}
                    >
                        <div className="rounded-xl pt-3">
                            <img
                                src={movie.posterImage || movie.image}
                                alt={movie.title}
                                className="w-[245px] h-[320px] object-cover rounded-lg"
                            />
                        </div>
                        <div className="p-4 w-full flex flex-col items-center flex-1">
                            <h3 className={`${isDarkMode ? "text-white" : "text-[#2d3a5a]"} text-base font-semibold text-center leading-tight mb-1`}>
                                {movie.title}
                            </h3>
                            {movie.actors && (
                                <p className={`${isDarkMode ? "text-gray-400" : "text-gray-600"} text-center text-sm mb-1 line-clamp-2 h-10`}>
                                    Diễn viên: {Array.isArray(movie.actors) ? movie.actors.join(", ") : movie.actors}
                                </p>
                            )}
                            {movie.duration && (
                                <p className={`${isDarkMode ? "text-gray-400" : "text-gray-600"} text-center text-sm mb-1`}>
                                    Thời lượng: {movie.duration} phút
                                </p>
                            )}
                            <div className="flex justify-center mb-2">
                                <span className="text-[#ff4d4f] text-base">
                                    {movie.reviews && movie.reviews.length > 0
                                        ? "★".repeat(Math.round(
                                            movie.reviews.reduce((sum, r) => sum + r.rating, 0) / movie.reviews.length
                                        ))
                                        : "★★★★★"}
                                </span>
                            </div>
                            <div className="flex-1" />
                            <button
                                className={`${isDarkMode ? "bg-blue-700 hover:bg-blue-800 text-white" : "bg-[#162d5a] hover:bg-[#1a376e] text-white"} w-full mt-2 py-2 rounded font-semibold transition cursor-pointer`}
                                onClick={() => handleView(movie._id)}
                            >
                                Xem chi tiết
                            </button>
                        </div>
                    </div>
                ))}
            </div>
            {filteredMovies.length > 7 && (
                <div className="flex justify-center mt-4">
                    <button
                        className={`${isDarkMode ? "px-6 h-8 border rounded text-gray-200 border-gray-600 bg-[#3a3c4a] hover:bg-blue-700 hover:border-blue-700 hover:text-white" : "px-6 h-8 border rounded bg-white text-[#2d3a5a] hover:bg-[#2d3a5a] hover:text-white"} transition cursor-pointer`}
                        onClick={() => setShowMore(!showMore)}
                    >
                        {showMore ? "Ẩn bớt" : "Xem thêm"}
                    </button>
                </div>
            )}
        </div>
    );
};

export default MovieList;