import { Link } from 'react-router-dom';
import { FaStar } from 'react-icons/fa';
import Carousel from 'react-multi-carousel';
import 'react-multi-carousel/lib/styles.css';
import { useEffect, useState } from 'react';
import { getMovies } from '@/apiservice/apiMovies';
import { Modal } from 'antd';
import useAppStore from '@/store/app.store';

interface Size {
    max: number;
    min: number;
}

interface ResponsiveItem {
    breakpoint: Size;
    items: number;
}

interface Responsive {
    [key: string]: ResponsiveItem;
    superLargeDesktop: ResponsiveItem;
    desktop: ResponsiveItem;
    tablet: ResponsiveItem;
    mobile: ResponsiveItem;
}

interface IProps {
  title: string;
  titleColor?: string;
  bg?: boolean;
  starRating?: boolean;
  status: string;
}

const responsive: Responsive = {
  superLargeDesktop: {
    breakpoint: { max: 4000, min: 3000 },
    items: 6,
  },
  desktop: {
    breakpoint: { max: 3000, min: 1200 },
    items: 6,
  },
  tablet: {
    breakpoint: { max: 1200, min: 600 },
    items: 3,
  },
  mobile: {
    breakpoint: { max: 600, min: 0 },
    items: 2,
  },
};

const getRatingBadgeColor = (rating: string): string => {
  if (rating === 'P+') return 'bg-green-600';
  if (rating.includes('18')) return 'bg-red-600';
  if (rating.includes('16')) return 'bg-red-500';
  if (rating.includes('13')) return 'bg-yellow-500';
  return 'bg-yellow-500';
};

const getYoutubeEmbedUrl = (url?: string) => {
  if (!url) return "";
  // Nếu đã là link embed thì trả về luôn
  if (url.includes("embed")) return url;
  // Lấy id từ link watch hoặc share
  const match = url.match(/(?:\?v=|\/embed\/|\.be\/)([a-zA-Z0-9_-]{11})/);
  if (match && match[1]) {
      return `https://www.youtube.com/embed/${match[1]}`;
  }
  return url;
}

const MoviesListCarousel = (props: IProps) => {
  const [movies, setMovies] = useState<IMovie[]>([]);
  const [isTrailerModalOpen, setIsTrailerModalOpen] = useState<boolean>(false);
  const [currentMovieForModal, setCurrentMovieForModal] = useState<IMovie | null>(null);
  const { setIsModalOpen, isDarkMode } = useAppStore();

  useEffect(() => {
    const fetchMovies = async () => {
      const res = await getMovies();

      if (res) {
        setMovies(Array.isArray(res) ? res : []);
      }
    };

    fetchMovies();
  }, []);


  const renderStars = (rating: number) => {
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      stars.push(
        <FaStar 
          key={i} 
          className={i <= rating ? "text-yellow-500" : "text-gray-600"} 
          size={16}
        />
      );
    }
    return stars;
  };
  
  return (
    <div className={`${props.bg ? isDarkMode ? "bg-[#23272f]" : "bg-[#b3c3a726]" : "bg-[url('https://vticinema.web.app/assets/notification_bg-B6yeZWl8.jpg')]"} py-16 px-8`}>
      <div className="container mx-auto px-4 md:px-8">
        <h2 className={`${props.titleColor ? isDarkMode ? "text-white"  : `text-[${props.titleColor}]` : "text-white"} text-3xl font-medium mb-10 text-center`}>{props.title}</h2>
        
        <Carousel 
          responsive={responsive}
          infinite={true}
          centerMode={false}
          removeArrowOnDeviceType={["tablet", "mobile"]}
          itemClass="px-2"
          containerClass="pb-12"
        >
          {movies
            .filter((movie) => {
              // Lọc bỏ phim đã ẩn (isHidden = true)
              if (movie.isHidden) return false;
              // Chỉ hiển thị phim có status chính xác, không gộp chung
              return movie.status === props.status;
            })
            .map((movie, index) => {
              return (
                <Link to={`/movies/${movie._id}`} key={movie._id}>
                  <div
                    className="relative group cursor-pointer overflow-hidden rounded-md transition-all duration-300 hover:scale-110 hover:z-999"
                  >
                    {/* Number Badge */}
                    <div className="absolute top-4 left-4 w-10 h-10 rounded-full bg-black/80 border-2 border-red-600 text-white flex items-center justify-center font-bold z-10">
                      {index + 1}
                    </div>
                    
                    {/* Age Rating Badge */}
                    <div className={`absolute top-4 right-4 ${getRatingBadgeColor(movie.ageRating)} text-white px-2 py-1 rounded font-bold z-1`}>
                      {movie.ageRating}
                    </div>
                    
                    {/* Movie Poster */}
                    <div className="relative aspect-[2/3]">
                        <img
                            className="w-full h-full object-cover border border-white rounded-xl"
                            src={movie.posterImage}
                            alt={movie.title}
                        />
                        
                        {/* Play button overlay for video trailer movies - shown on hover */}
                        <div 
                          className={`absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 flex items-center justify-center group-hover:opacity-100 transition-opacity duration-300 ${movie.trailer ? 'opacity-0' : 'opacity-0'}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            e.preventDefault();
                            if (movie.trailer) {
                              setCurrentMovieForModal(movie);
                              setIsTrailerModalOpen(true);
                            }
                          }}
                          style={{ zIndex: 10 }} // Đảm bảo nút play nằm trên Link
                        >
                            <div className="w-12 h-12 rounded-full bg-white/30 flex items-center justify-center">
                                <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center">
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
                                    <path fillRule="evenodd" d="M4.5 5.653c0-1.426 1.529-2.33 2.779-1.643l11.54 6.348c1.295.712 1.295 2.573 0 3.285L7.28 19.991c-1.25.687-2.779-.217-2.779-1.643V5.653z" clipRule="evenodd" />
                                </svg>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    {/* Movie Info */}
                    <div className="mt-3">
                        <h3 className={`${props.titleColor ? isDarkMode ? "text-white" : "text-[#0f1b4c]"  : "text-yellow-500"} font-semibold text-lg truncate`}>{movie.title}</h3>
                        <p className="text-gray-400 text-sm truncate">{movie.genre.join(', ')}</p>
                        {props.starRating && (
                          <div className="flex items-center mt-1">
                            {renderStars(movie.averageRating)}
                          </div>
                        )}
                    </div>
                  </div>
                </Link>
              );
            })}
        </Carousel>
      </div>

      <Modal
        title={null}
        open={isTrailerModalOpen}
        onCancel={() => setIsTrailerModalOpen(false)}
        footer={null}
        centered
        width={800}
        bodyStyle={{ padding: 0 }}
        destroyOnClose
        getContainer={false}
      >
        {currentMovieForModal && (
          <div className="p-4">
            <iframe
              width="100%"
              height="450"
              src={getYoutubeEmbedUrl(currentMovieForModal.trailer)}
              frameBorder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              title="Movie Trailer"
              className='mt-3'
            ></iframe>
            <div className="mt-4 flex items-start">
              <img
                src={currentMovieForModal.posterImage}
                alt={currentMovieForModal.title}
                className="w-35 h-auto rounded-md mr-4"
              />
              <div>
                <div className='flex items-center gap-2'>
                  <h3 className="text-xl font-bold text-[#0f1b4c] mb-1">{currentMovieForModal.title}</h3>
                  <p className="text-gray-600 text-lg mb-1">
                    - {currentMovieForModal.genre.join(', ')}
                  </p>
                </div>
                <p className="text-gray-700 text-sm line-clamp-3">{currentMovieForModal.description}</p>
              </div>
            </div>
            <div className="text-center mt-4">
              <button
                className="bg-gray-200 text-gray-800 px-6 py-2 rounded-full hover:bg-gray-300 transition cursor-pointer"
                onClick={() => setIsTrailerModalOpen(false)}
              >
                Đóng
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default MoviesListCarousel;