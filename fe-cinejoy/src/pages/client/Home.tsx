import { useRef, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaCheckCircle } from 'react-icons/fa';
import MoviesListCarousel from '@/components/moviesListCarousel';
import ScheduleList from '@/components/scheduleList';
import CommentCard from '@/components/card/commentCard';
import NewsCard from '@/components/card/newCard';
import useAppStore from '@/store/app.store';
import { getBlogs } from '@/apiservice/apiBlog';

interface UserComment {
    name: string;
    avatar: string;
    date: string;
    comment: string;
    nameColor?: string;
}
interface CommentCardProps {
    image: string;
    title: string;
    rating: number;
    comments: number;
    users: UserComment[];
}

interface NewsCardProps {
    image: string;
    title: string;
    description: string;
}

const HomePage = () => {
    const { isDarkMode } = useAppStore();
    const navigate = useNavigate();
    const scheduleRef = useRef<HTMLDivElement>(null);
    const [blogs, setBlogs] = useState<IBlog[]>([]);
    const [loading, setLoading] = useState(false);
    const [showAllNews, setShowAllNews] = useState(false);
    
    const scrollToSchedule = () => {
        if (scheduleRef.current) {
            const element = scheduleRef.current;
            const elementTop = element.offsetTop;
            const offsetPosition = elementTop - 50;

            window.scrollTo({
                top: offsetPosition,
                behavior: 'smooth'
            });
        }
    };

    // Load blogs data
    useEffect(() => {
        const loadBlogs = async () => {
            setLoading(true);
            try {
                const data = await getBlogs();
                // Sắp xếp theo ngày đăng mới nhất
                const sorted = [...data].sort((a, b) => new Date(b.postedDate).getTime() - new Date(a.postedDate).getTime());
                setBlogs(sorted);
            } catch (error) {
                console.error('Error loading blogs:', error);
                setBlogs([]);
            } finally {
                setLoading(false);
            }
        };
        loadBlogs();
    }, []);
    
    const cards: CommentCardProps[] = [
        {
            image: "https://res.cloudinary.com/ddia5yfia/image/upload/v1741325255/52_Robot_Hoang_Da%CC%83_acqnjy.jpg",
            title: "Robot Hoang Dã",
            rating: 9,
            comments: 18,
            users: [
            {
                name: "Đức Bùi",
                avatar: "https://res.cloudinary.com/ddia5yfia/image/upload/v1744014469/VTI_Cinemas/Avatar/qijumserwhbmvm7ojfbe.jpg",
                date: "07/04/2025",
                comment: "ok",
            },
            {
                name: "Tuổi Học Trò",
                avatar: "https://lh3.googleusercontent.com/a/ACg8ocJUnv4Vz7Q_8KrSGZlQWwTqqhHwQAsMNLkox_6NpWoji-M84V6s=s96-c",
                date: "28/03/2025",
                comment: "Xem cũng tạm được. Phù hợp với thiếu nhi",
                nameColor: "text-red-500",
            },
            ],
        },
        {
            image: "https://res.cloudinary.com/ddia5yfia/image/upload/v1742694536/57_Nobita_va%CC%80_Cuo%CC%A3%CC%82c_Phie%CC%82u_Lu%CC%9Bu_Va%CC%80o_The%CC%82%CC%81_Gio%CC%9B%CC%81i_Trong_Tranh_hwnm6v.webp",
            title: "Nobita và Cuộc Phiêu Lưu Vào Thế Giới Trong Tranh",
            rating: 10,
            comments: 10,
            users: [
            {
                name: "Nguyen Duy Linh",
                avatar: "https://lh3.googleusercontent.com/a/ACg8ocKYHo7paZydUjli72srSil4sXtaHC_cTZd6DE72uMptT7vSOnxdPg=s96-c",
                date: "30/03/2025",
                comment: "Phim cũng vui. Dẫn con đi xem, thấy con vui nên mình cũng vui theo!",
            },
            ],
        },
        {
            image: "https://res.cloudinary.com/ddia5yfia/image/upload/v1741325254/50_Va%CC%82y_Ha%CC%83m_Ta%CC%A3i_%C4%90a%CC%80i_Ba%CC%86%CC%81c_tzflmw.jpg",
            title: "Vây Hãm Tại Đài Bắc",
            rating: 8,
            comments: 8,
            users: [
            {
                name: "Nguyen Duy Linh",
                avatar: "https://lh3.googleusercontent.com/a/ACg8ocKYHo7paZydUjli72srSil4sXtaHC_cTZd6DE72uMptT7vSOnxdPg=s96-c",
                date: "29/03/2025",
                comment: "Cũng tạm được mọi người ạ!",
            },
            ],
        },
        {
            image: "https://res.cloudinary.com/ddia5yfia/image/upload/v1741325255/52_Robot_Hoang_Da%CC%83_acqnjy.jpg",
            title: "Robot Hoang Dã",
            rating: 9,
            comments: 18,
            users: [
            {
                name: "Đức Bùi",
                avatar: "https://res.cloudinary.com/ddia5yfia/image/upload/v1744014469/VTI_Cinemas/Avatar/qijumserwhbmvm7ojfbe.jpg",
                date: "07/04/2025",
                comment: "ok",
            },
            {
                name: "Tuổi Học Trò",
                avatar: "https://lh3.googleusercontent.com/a/ACg8ocJUnv4Vz7Q_8KrSGZlQWwTqqhHwQAsMNLkox_6NpWoji-M84V6s=s96-c",
                date: "28/03/2025",
                comment: "Xem cũng tạm được. Phù hợp với thiếu nhi",
                nameColor: "text-red-500",
            },
            ],
        },
        {
            image: "https://res.cloudinary.com/ddia5yfia/image/upload/v1742694536/57_Nobita_va%CC%80_Cuo%CC%A3%CC%82c_Phie%CC%82u_Lu%CC%9Bu_Va%CC%80o_The%CC%82%CC%81_Gio%CC%9B%CC%81i_Trong_Tranh_hwnm6v.webp",
            title: "Nobita và Cuộc Phiêu Lưu Vào Thế Giới Trong Tranh",
            rating: 10,
            comments: 10,
            users: [
            {
                name: "Nguyen Duy Linh",
                avatar: "https://lh3.googleusercontent.com/a/ACg8ocKYHo7paZydUjli72srSil4sXtaHC_cTZd6DE72uMptT7vSOnxdPg=s96-c",
                date: "30/03/2025",
                comment: "Phim cũng vui. Dẫn con đi xem, thấy con vui nên mình cũng vui theo!",
            },
            ],
        },
        {
            image: "https://res.cloudinary.com/ddia5yfia/image/upload/v1741325254/50_Va%CC%82y_Ha%CC%83m_Ta%CC%A3i_%C4%90a%CC%80i_Ba%CC%86%CC%81c_tzflmw.jpg",
            title: "Vây Hãm Tại Đài Bắc",
            rating: 8,
            comments: 8,
            users: [
            {
                name: "Nguyen Duy Linh",
                avatar: "https://lh3.googleusercontent.com/a/ACg8ocKYHo7paZydUjli72srSil4sXtaHC_cTZd6DE72uMptT7vSOnxdPg=s96-c",
                date: "29/03/2025",
                comment: "Cũng tạm được mọi người ạ!",
            },
            ],
        },
    ];

    // Handle news card click
    const handleNewsClick = (blogCode: string) => {
        navigate(`/news/${blogCode}`);
    };

    // Handle "Xem thêm" / "Ẩn bớt" button click
    const handleToggleNews = () => {
        setShowAllNews(!showAllNews);
    };

    // Get displayed blogs based on showAllNews state
    const displayedBlogs = showAllNews ? blogs : blogs.slice(0, 6);

    return (
        <>
            {/* Hero Section */}
            <div className={`${isDarkMode ? "bg-[#23272f]" : "bg-[#134c0f1a]"} py-16`}>
                <div className="container mx-auto px-40">
                    <div className="flex flex-col md:flex-row items-center">
                        {/* Left Content */}
                        <div className="w-full md:w-1/2 md:pr-8">
                            <h1 className={`text-3xl md:text-4xl font-medium mb-4 ${isDarkMode ? "text-white" : "text-gray-800"}`}>
                                Mua vé xem phim <span className="text-[#ff6347]">Online</span> trên <span className="text-[#0095da]">CINEJOY</span>
                            </h1>
                            
                            <p className={`${isDarkMode ? "text-white" : "text-gray-600"} mb-8 text-lg`}>
                                Với nhiều ưu đãi hấp dẫn và kết nối với tất cả các rạp lớn phổ biến khắp Việt Nam.
                                Đặt vé ngay tại CINEJOY!
                            </p>
                            
                            <div className="space-y-4 mb-8">
                                <div className="flex items-center">
                                    <FaCheckCircle className="text-[#8b5cf6] mr-3" size={22} />
                                    <span className={`${isDarkMode ? "text-white" : "text-gray-700"}`}>Mua vé Online, trải nghiệm phim hay</span>
                                </div>
                                <div className="flex items-center">
                                    <FaCheckCircle className="text-[#8b5cf6] mr-3" size={22} />
                                    <span className={`${isDarkMode ? "text-white" : "text-gray-700"}`}>Đặt vé an toàn trên CINEJOY</span>
                                </div>
                                <div className="flex items-center">
                                    <FaCheckCircle className="text-[#8b5cf6] mr-3" size={22} />
                                    <span className={`${isDarkMode ? "text-white" : "text-gray-700"}`}>Thỏa sức chọn chỗ ngồi, mua bắp nước tiện lợi</span>
                                </div>
                                <div className="flex items-center">
                                    <FaCheckCircle className="text-[#8b5cf6] mr-3" size={22} />
                                    <span className={`${isDarkMode ? "text-white" : "text-gray-700"}`}>Lịch sử đặt vé được lưu lại ngay</span>
                                </div>
                            </div>
                            
                            <button 
                                onClick={scrollToSchedule} 
                                className="bg-[#ff6347] hover:bg-[#ff5337] text-white font-medium py-3 px-8 rounded-full transition-all inline-block mr-4 cursor-pointer"
                            >
                                Đặt vé ngay
                            </button>
                        </div>
                        
                        {/* Right Content with Image */}
                        <div className="w-full md:w-1/2 mt-10 md:mt-0">
                            <div className="text-center md:text-right mb-4">
                                <h2 className={`text-xl md:text-2xl font-medium ${isDarkMode ? "text-white" : "text-gray-800"}`}>
                                    Đặt vé xem phim trên <span className={`${isDarkMode ? "text-[#0095da]" : ""}`}>CINEJOY</span>
                                </h2>
                                <p className={`text-lg ${isDarkMode ? "text-white" : "text-gray-700"}`}>
                                    Ghế đẹp, giờ hot, vào rạp không chờ đợi!
                                </p>
                            </div>
                            
                            <div className="flex justify-center md:justify-end">
                                <img 
                                    src="https://res.cloudinary.com/ddia5yfia/image/upload/v1733633928/contact_5_otvgni.png" 
                                    alt="Cinema illustration" 
                                    className="w-full max-w-md"
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <MoviesListCarousel title='PHIM ĐANG CHIẾU' starRating status="Phim đang chiếu" />
            <MoviesListCarousel title='PHIM SẮP CHIẾU' bg titleColor="#0f1b4c" status="Phim sắp chiếu" />
            <div ref={scheduleRef}>
                <ScheduleList />
            </div>

            <div className={`${isDarkMode ? "bg-[#1e2229]" : "bg-[#cccccc2b]"} min-h-screen py-10 px-4`}>
                <h1 className={`text-3xl font-bold text-center ${isDarkMode ? "text-white" : "text-[#0f1b4c]"} mb-10`}>
                    Bình luận nổi bật
                </h1>
                <div className="grid md:grid-cols-3 gap-6 max-w-7xl mx-auto">
                    {cards.map((card, index) => (
                        <CommentCard key={index} {...card} />
                    ))}
                </div>
                <div className="text-center mt-10">
                    <button className={`${isDarkMode ? "bg-blue-700 hover:bg-blue-800 text-white" : "bg-[#0f1b4c] hover:bg-blue-700 text-white"} px-6 py-2 rounded-full transition cursor-pointer`}>
                        Xem tiếp nhé! ↓
                    </button>
                </div>
            </div>

            <div className={`${isDarkMode ? "bg-[#191b21]" : "bg-[#134c0f1a]"} min-h-screen py-10 px-4`}>
                <h1 className={`text-2xl font-bold text-center ${isDarkMode ? "text-white" : "text-blue-900"} mb-10`}>
                    TIN TỨC - KHUYẾN MÃI
                </h1>

                {loading ? (
                    <div className="text-center py-20">
                        <div className={`${isDarkMode ? "text-white" : "text-black"}`}>Đang tải tin tức...</div>
                    </div>
                ) : (
                    <div className="grid md:grid-cols-3 gap-6 max-w-7xl mx-auto">
                        {displayedBlogs.map((blog) => (
                            <div 
                                key={blog._id} 
                                className="cursor-pointer hover:scale-[1.02] transition-all duration-200"
                                onClick={() => handleNewsClick(blog.blogCode)}
                            >
                                <NewsCard 
                                    image={blog.posterImage}
                                    title={blog.title}
                                    description={blog.description}
                                />
                            </div>
                        ))}
                    </div>
                )}

                {blogs.length > 6 && (
                    <div className="text-center mt-10">
                        <button 
                            onClick={handleToggleNews}
                            className={`${isDarkMode ? "bg-blue-700 hover:bg-blue-800 text-white" : "bg-[#0f1b4c] hover:bg-blue-700 text-white"} px-6 py-2 rounded-full transition cursor-pointer`}
                        >
                            {showAllNews ? 'Ẩn bớt ↑' : 'Xem thêm ↓'}
                        </button>
                    </div>
                )}
            </div>
        </>
    );
};

export default HomePage;