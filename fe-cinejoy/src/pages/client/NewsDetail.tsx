import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import clsx from 'clsx';
import { getBlogByCode, getBlogs } from '@/apiservice/apiBlog';
import { getMovies } from '@/apiservice/apiMovies';
import useAppStore from '@/store/app.store';
import '@/styles/blog-content.css';

// Offset điều chỉnh vị trí nút quay lại (qua trái/phải)
const BACK_BUTTON_OFFSET_PX = -20;
// Offset điều chỉnh vị trí khối chi tiết tin tức (qua trái/phải)
const NEWS_DETAIL_OFFSET_PX = -20;

const NewsDetailPage: React.FC = () => {
  const { blogCode } = useParams<{ blogCode: string }>();
  const navigate = useNavigate();
  const { isDarkMode } = useAppStore();
  const [blog, setBlog] = useState<IBlog | null>(null);
  const [loading, setLoading] = useState(true);
  const [moviesNow, setMoviesNow] = useState<IMovie[]>([]);
  const [moviesSoon, setMoviesSoon] = useState<IMovie[]>([]);
  const [showAllNow, setShowAllNow] = useState(false);
  const [showAllSoon, setShowAllSoon] = useState(false);
  const [activeTab, setActiveTab] = useState<'now' | 'soon'>('now');
  const [relatedBlogs, setRelatedBlogs] = useState<IBlog[]>([]);
  const [currentSlide, setCurrentSlide] = useState(0);

  useEffect(() => {
    const loadBlog = async () => {
      if (!blogCode) {
        navigate('/news');
        return;
      }

      try {
        setLoading(true);
        const data = await getBlogByCode(blogCode);
        if (data) {
          setBlog(data);
          // Load related blogs (exclude current blog)
          const allBlogs = await getBlogs();
          const related = allBlogs.filter(b => b._id !== data._id).slice(0, 8);
          setRelatedBlogs(related);
        } else {
          // Nếu không tìm thấy blog, chuyển về trang news
          navigate('/news');
        }
      } catch (error) {
        console.error('Error loading blog:', error);
        navigate('/news');
      } finally {
        setLoading(false);
      }
    };

    loadBlog();
  }, [blogCode, navigate]);

  useEffect(() => {
    const loadMovies = async () => {
      try {
        const res: any = await getMovies();
        const arr: IMovie[] = Array.isArray(res)
          ? res
          : (res?.data?.data ?? res?.data ?? []);
        const normalize = (s: string | undefined) => (s || '')
          .toString()
          .toLowerCase()
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '');
        let now = arr.filter(m => {
          const st = normalize(m.status as any);
          return st.includes('dang chieu') || st.includes('phim dang chieu');
        });
        let soon = arr.filter(m => {
          const st = normalize(m.status as any);
          return st.includes('sap chieu') || st.includes('phim sap chieu');
        });
        // Fallback: nếu không phân loại được theo status, lấy mặc định 7 phim đầu làm đang chiếu
        if (now.length === 0 && arr.length > 0) {
          now = arr.slice(0, Math.min(12, arr.length));
        }
        setMoviesNow(now);
        setMoviesSoon(soon);
      } catch {}
    };
    loadMovies();
  }, []);

  const nextSlide = () => {
    const maxSlide = Math.max(0, relatedBlogs.length - 4);
    setCurrentSlide(prev => Math.min(prev + 1, maxSlide));
  };

  const prevSlide = () => {
    setCurrentSlide(prev => Math.max(prev - 1, 0));
  };

  // Function để format nội dung blog với checkmark cho các dòng "Vị"
  const formatBlogContent = (content: string) => {
    const lines = content.split('\n');
    return lines.map((line, index) => {
      const trimmedLine = line.trim();

      // Kiểm tra nếu dòng bắt đầu bằng "Vị" và kết thúc bằng ":"
      if (trimmedLine.match(/^Vị\s+.+:$/)) {
        const parts = trimmedLine.split(':');
        const flavorName = parts[0].trim();
        const description = parts[1] ? ':' + parts.slice(1).join(':') : '';
        
        return (
          <div key={index} className="flavor-item">
            <span className="flavor-checkmark">✓</span>
            <span>
              <span className="flavor-name">{flavorName}</span>
              {description}
            </span>
          </div>
        );
      }

      // Kiểm tra nếu là thông tin quan trọng (thời gian, giá, địa điểm)
      if (trimmedLine.match(/^(Thời gian|Giá bán|Địa điểm|Hotline|Liên hệ).*:/)) {
        return (
          <div key={index} className="info-highlight">
            <strong>{trimmedLine}</strong>
          </div>
        );
      }

      // Kiểm tra nếu là dòng trống
      if (trimmedLine === '') {
        return <div key={index} className="empty-line">&nbsp;</div>;
      }

      // Các đoạn văn bình thường
      return (
        <p key={index} className="blog-paragraph">
          {trimmedLine}
        </p>
      );
    });
  };

  if (loading) {
    return (
      <div className={clsx("w-full min-h-screen flex items-center justify-center", isDarkMode ? "bg-[#181c24]" : "bg-white")}>
        <div className={clsx("text-center", isDarkMode ? "text-white" : "text-black")}>
          <div className="text-xl mb-4">Đang tải...</div>
        </div>
      </div>
    );
  }

  if (!blog) {
    return (
      <div className={clsx("w-full min-h-screen flex items-center justify-center", isDarkMode ? "bg-[#181c24]" : "bg-white")}>
        <div className={clsx("text-center", isDarkMode ? "text-white" : "text-black")}>
          <div className="text-xl mb-4">Không tìm thấy tin tức</div>
          <button 
            onClick={() => navigate('/news')}
            className="px-4 py-2 bg-[#ff6b6b] text-white rounded hover:opacity-90 cursor-pointer"
          >
            Quay lại trang tin tức
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={clsx("w-full min-h-screen", isDarkMode ? "bg-[#181c24]" : "bg-white")}>
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex gap-6">
        <div className="flex-[6]">
          {/* Nút quay lại */}
          <div style={{ transform: `translateX(${BACK_BUTTON_OFFSET_PX}px)` }}>
            <button 
              onClick={() => navigate('/news')}
              className={clsx("flex items-center gap-2 mb-6 px-4 py-2 rounded-lg hover:opacity-90 transition-all duration-200 cursor-pointer", 
                isDarkMode ? "bg-[#374151] text-white hover:bg-[#4b5563]" : "bg-[#f3f4f6] text-black hover:bg-[#e5e7eb]"
              )}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Quay lại
            </button>
          </div>

          {/* Nội dung chính */}
          <div className={clsx("rounded-2xl shadow-lg overflow-hidden", isDarkMode ? "bg-[#23272f]" : "bg-white")} style={{ transform: `translateX(${NEWS_DETAIL_OFFSET_PX}px)` }}>

          {/* Nội dung bài viết */}
          <div className="p-6 md:p-8">
            {/* Tiêu đề */}
            <h1 className={clsx("text-2xl md:text-3xl font-bold mb-4 leading-tight", isDarkMode ? "text-white" : "text-black")}>
              {blog.title}
            </h1>

            {/* Ngày đăng */}
            <div className={clsx("text-sm mb-6 pb-4 border-b", isDarkMode ? "text-gray-400 border-[#374151]" : "text-gray-600 border-gray-200")}>
              Ngày đăng: {new Date(blog.postedDate).toLocaleDateString('vi-VN', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}
            </div>

            {/* Nội dung */}
            <div className={clsx("prose prose-lg max-w-none leading-relaxed blog-content-custom", isDarkMode ? "text-white" : "text-gray-700")}>
              <div className="text-base md:text-lg leading-7">
                {formatBlogContent(blog.content)}
              </div>
            </div>

            {/* Ảnh background nếu có */}
            {blog.backgroundImage && (
              <div className="mt-8">
                <img 
                  src={blog.backgroundImage} 
                  alt="Background" 
                  className="w-full rounded-lg shadow-md"
                />
              </div>
            )}
          </div>
        </div>
        </div>

        {/* Sidebar phim */}
        <div className="hidden lg:block w-[340px]">
          <div className={clsx("rounded-xl shadow p-3", isDarkMode ? "bg-[#23272f]" : "bg-white")}>
            <div className="flex justify-center gap-2 mb-3 items-center">
              <button className={`px-5 py-2 rounded cursor-pointer ${activeTab==='now'?'bg-[#ff6b6b] text-white':isDarkMode?'bg-[#374151] text-white':'bg-gray-100'}`} onClick={()=>setActiveTab('now')}>Phim đang chiếu</button>
              <button className={`px-5 py-2 rounded cursor-pointer ${activeTab==='soon'?'bg-[#ff6b6b] text-white':isDarkMode?'bg-[#374151] text-white':'bg-gray-100'}`} onClick={()=>setActiveTab('soon')}>Phim sắp chiếu</button>
            </div>
            <div className="space-y-3">
              {(activeTab==='now' ? (showAllNow ? moviesNow : moviesNow.slice(0,7)) : (showAllSoon ? moviesSoon : moviesSoon.slice(0,7))).map((m)=> (
                <div 
                  key={m._id} 
                  className={clsx("flex gap-3 items-center pb-3 last:border-b-0 cursor-pointer hover:scale-[1.02] transition-all duration-200 rounded p-2", isDarkMode ? "border-b border-[#374151] hover:bg-[#2a2f38]" : "border-b hover:bg-gray-100")}
                  onClick={() => navigate(`/movies/${m._id}`)}
                >
                  <img src={(m.image || m.posterImage) as any} alt={m.title} className="w-14 h-20 object-cover rounded" />
                  <div className="min-w-0">
                    <div className={clsx("font-semibold text-sm truncate", isDarkMode ? "text-white" : "text-black")} title={m.title}>{m.title}</div>
                    <div className={clsx("text-xs truncate", isDarkMode ? "text-gray-400" : "text-gray-600")}>{(m.genre||[]).join(', ')}</div>
                    <div className="mt-1 text-xs text-yellow-500">★★★★★</div>
                  </div>
                </div>
              ))}
              <div className="flex justify-center pt-2">
                {activeTab==='now' ? (
                  moviesNow.length > 7 && (
                    <button onClick={()=>setShowAllNow(v=>!v)} className="px-4 py-1.5 rounded bg-[#ff6b6b] text-white cursor-pointer hover:bg-[#e05a5a] transition-colors">
                      {showAllNow? 'Ẩn bớt' : 'Xem thêm'}
                    </button>
                  )
                ) : (
                  moviesSoon.length > 7 && (
                    <button onClick={()=>setShowAllSoon(v=>!v)} className="px-4 py-1.5 rounded bg-[#ff6b6b] text-white cursor-pointer hover:bg-[#e05a5a] transition-colors">
                      {showAllSoon? 'Ẩn bớt' : 'Xem thêm'}
                    </button>
                  )
                )}
              </div>
            </div>
          </div>
        </div>
        </div>

        {/* Tin liên quan */}
        {relatedBlogs.length > 0 && (
          <div className="mt-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-1 h-6 bg-[#1e62d0]"></div>
              <h2 className={clsx("text-xl font-bold uppercase", isDarkMode ? "text-[#60a5fa]" : "text-[#1e62d0]")}>
                TIN LIÊN QUAN
              </h2>
            </div>
            
            <div className="relative">
              {/* Navigation arrows */}
              <button
                onClick={prevSlide}
                disabled={currentSlide === 0}
                className={clsx("absolute left-0 top-1/2 -translate-y-1/2 z-10 w-8 h-8 rounded-full flex items-center justify-center transition-all duration-200", 
                  currentSlide === 0 
                    ? "bg-gray-300 text-gray-500 cursor-not-allowed" 
                    : "bg-white shadow-lg text-gray-700 hover:bg-gray-50 cursor-pointer"
                )}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              
              <button
                onClick={nextSlide}
                disabled={currentSlide >= Math.max(0, relatedBlogs.length - 4)}
                className={clsx("absolute right-0 top-1/2 -translate-y-1/2 z-10 w-8 h-8 rounded-full flex items-center justify-center transition-all duration-200",
                  currentSlide >= Math.max(0, relatedBlogs.length - 4)
                    ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                    : "bg-white shadow-lg text-gray-700 hover:bg-gray-50 cursor-pointer"
                )}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>

              {/* Carousel container */}
              <div className="overflow-hidden">
                <div 
                  className="flex transition-transform duration-300 ease-in-out"
                  style={{ transform: `translateX(-${currentSlide * 25}%)` }}
                >
                  {relatedBlogs.map((relatedBlog) => (
                    <div key={relatedBlog._id} className="w-1/4 flex-shrink-0 px-2">
                      <div 
                        className={clsx("rounded-xl shadow-md overflow-hidden cursor-pointer hover:scale-[1.02] transition-all duration-200", isDarkMode ? "bg-[#1f2937]" : "bg-white")}
                        onClick={() => navigate(`/news/${relatedBlog.blogCode}`)}
                      >
                        <div className="aspect-[3/4] overflow-hidden">
                          <img 
                            src={relatedBlog.posterImage} 
                            alt={relatedBlog.title} 
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div className="p-3">
                          <h3 className={clsx("font-semibold text-sm line-clamp-2 leading-tight", isDarkMode ? "text-white" : "text-black")} title={relatedBlog.title}>
                            {relatedBlog.title}
                          </h3>
                          <div className={clsx("text-xs mt-1", isDarkMode ? "text-gray-400" : "text-gray-600")}>
                            {new Date(relatedBlog.postedDate).toLocaleDateString('vi-VN')}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Pagination dots */}
              <div className="flex justify-center mt-4 gap-2">
                {Array.from({ length: Math.max(1, relatedBlogs.length - 3) }).map((_, index) => (
                  <button
                    key={index}
                    onClick={() => setCurrentSlide(index)}
                    className={clsx("w-2 h-2 rounded-full transition-all duration-200", 
                      currentSlide === index 
                        ? "bg-[#1e62d0] w-6" 
                        : "bg-gray-300"
                    )}
                  />
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default NewsDetailPage;
