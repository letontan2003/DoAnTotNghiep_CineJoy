import React, { useEffect, useMemo, useRef, useState } from 'react';
import clsx from 'clsx';
import { useNavigate } from 'react-router-dom';
import { getVisibleBlogs } from '@/apiservice/apiBlog';
import { getMovies } from '@/apiservice/apiMovies';
import useAppStore from '@/store/app.store';

const PAGE_SIZE = 6;
// Offset điều chỉnh toàn bộ khối bao bọc (bao gồm tiêu đề + lưới tin tức)
const WRAPPER_BLOCK_OFFSET_PX = 0;
// Offset điều chỉnh vị trí lưới tin tức (qua trái/phải)
const NEWS_GRID_OFFSET_PX = -10;

const NewsPage: React.FC = () => {
  const { isDarkMode } = useAppStore();
  const navigate = useNavigate();
  const [blogs, setBlogs] = useState<IBlog[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [moviesNow, setMoviesNow] = useState<IMovie[]>([]);
  const [moviesSoon, setMoviesSoon] = useState<IMovie[]>([]);
  const [showAllNow, setShowAllNow] = useState(false);
  const [showAllSoon, setShowAllSoon] = useState(false);
  const dealsRef = useRef<HTMLDivElement | null>(null);
  const [activeTab, setActiveTab] = useState<'now' | 'soon'>('now');

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const data = await getVisibleBlogs();
        // API đã sắp xếp theo ngày đăng mới nhất
        setBlogs(data);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

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

  const paginated = useMemo(() => blogs.slice(0, page * PAGE_SIZE), [blogs, page]);
  const canMore = paginated.length < blogs.length;

  return (
    <div className={clsx("w-full min-h-screen overflow-x-hidden", isDarkMode ? "bg-[#181c24]" : "bg-white")}>
      <div className="max-w-6xl mx-auto px-4 py-8 overflow-x-hidden">
        <div className="flex gap-6 items-start overflow-x-hidden">
        <div className={clsx("rounded-2xl p-4 md:p-6 max-w-[820px] mx-auto flex flex-col min-h-[1000px]", isDarkMode ? "bg-[#23272f]" : "bg-[#f8f9fa]")} style={{ marginLeft: WRAPPER_BLOCK_OFFSET_PX }}>
        <h1 className={clsx("text-lg md:text-xl font-bold mt-1 mb-2", isDarkMode ? "text-[#60a5fa]" : "text-[#1e62d0]")}>ƯU ĐÃI</h1>

        {loading ? (
          <div className={clsx("text-center py-20", isDarkMode ? "text-white" : "text-black")}>Đang tải...</div>
        ) : (
          <>
            <div ref={dealsRef} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-7 gap-y-6 justify-items-start max-w-[776px] mx-auto" style={{transform: `translateX(${NEWS_GRID_OFFSET_PX}px)`}}>
              {paginated.map((b) => (
                 <div key={b._id} className={clsx("rounded-xl shadow-md p-3 w-[240px] cursor-pointer hover:scale-[1.02] transition-all duration-200", isDarkMode ? "bg-[#1f2937]" : "bg-white")} onClick={() => navigate(`/news/${b.blogCode}`)}>
                   <div className="aspect-[3/4] overflow-hidden rounded-lg">
                     <img src={b.posterImage} alt={b.title} className="w-full h-full object-cover" />
                   </div>
                   <div className="mt-3 h-[40px] flex items-center justify-center text-center">
                     <div className={clsx("font-semibold text-[15px] leading-5 hover:opacity-90 line-clamp-2 block w-full cursor-pointer", isDarkMode ? "text-[#60a5fa]" : "text-[#1e62d0]")} title={b.title} style={{textDecoration:'none'}}>
                       {b.title}
                     </div>
                   </div>
                   <div className="mt-2 text-center h-5 flex items-center justify-center">
                     <div className="text-[#ff4d4f] text-sm hover:opacity-80 leading-none cursor-pointer" style={{textDecoration:'none'}}>Xem chi tiết</div>
                   </div>
                 </div>
              ))}
            </div>

            {blogs.length > PAGE_SIZE && (
              <div className="flex justify-center mt-6">
                <button
                  onClick={() => {
                    const showingAll = paginated.length >= blogs.length;
                    if (showingAll) {
                      setPage(1);
                      // scroll về đầu khối ưu đãi
                      setTimeout(() => dealsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 0);
                    } else {
                      setPage((p) => p + 1);
                    }
                  }}
                  className="px-5 py-2 rounded bg-[#ff6b6b] text-white hover:opacity-90 cursor-pointer"
                >
                  {paginated.length >= blogs.length ? 'Ẩn bớt' : 'Xem thêm'}
                </button>
              </div>
            )}
          </>
        )}
        </div>

        <div className="hidden lg:flex w-[340px] flex-col">
            <div className={clsx("rounded-xl shadow p-3 flex flex-col min-h-[1000px]", isDarkMode ? "bg-[#23272f]" : "bg-white")}>
                <div className="flex justify-center gap-2 mb-3 items-center">
                  <button className={`px-5 py-2 w-[160px] whitespace-nowrap text-center rounded cursor-pointer ${activeTab==='now'?'bg-[#ff6b6b] text-white':isDarkMode?'bg-[#374151] text-white':'bg-gray-100'}`} onClick={()=>setActiveTab('now')}>Phim đang chiếu</button>
                  <button className={`px-5 py-2 w-[160px] whitespace-nowrap text-center rounded cursor-pointer ${activeTab==='soon'?'bg-[#ff6b6b] text-white':isDarkMode?'bg-[#374151] text-white':'bg-gray-100'}`} onClick={()=>setActiveTab('soon')}>Phim sắp chiếu</button>
                </div>
              <div className="space-y-3 overflow-x-hidden">
                {(activeTab==='now' ? (showAllNow ? moviesNow : moviesNow.slice(0,7)) : (showAllSoon ? moviesSoon : moviesSoon.slice(0,7))).map((m)=> (
                  <div 
                    key={m._id} 
                    className={clsx("flex gap-3 items-center pb-3 last:border-b-0 cursor-pointer hover:brightness-110 transition-all duration-200 rounded p-2", isDarkMode ? "border-b border-[#374151] hover:bg-[#2a2f38]" : "border-b hover:bg-gray-100")}
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
                <div className="flex justify-center pt-2 mt-12  ">
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

      </div>
    </div>
  );
};

export default NewsPage;


