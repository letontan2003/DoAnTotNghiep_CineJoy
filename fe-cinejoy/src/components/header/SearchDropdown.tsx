import { FaSearch } from 'react-icons/fa';
import { IoMdClose } from 'react-icons/io';
import { AiFillStar } from 'react-icons/ai';

interface SearchDropdownProps {
  showSearch: boolean;
  searchValue: string;
  searchResults: IMovie[];
  loadingSearch: boolean;
  showDropdown: boolean;
  searchInputRef: React.RefObject<HTMLInputElement | null>;
  handleChangeSearch: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleSelectMovie: (id: string) => void;
  closeSearch: () => void;
  setShowDropdown: (v: boolean) => void;
  setShowSearch: (v: boolean) => void;
}

const SearchDropdown: React.FC<SearchDropdownProps> = ({
  showSearch,
  searchValue,
  searchResults,
  loadingSearch,
  showDropdown,
  searchInputRef,
  handleChangeSearch,
  handleSelectMovie,
  closeSearch,
  setShowDropdown,
  setShowSearch,
}) => (
  <div className="relative">
    {/* Overlay */}
    {showSearch && (
      <div className="fixed inset-0 z-[3000] bg-black/50 backdrop-blur-sm transition-all" onClick={closeSearch} />
    )}
    <button
      className={`text-gray-700 hover:text-gray-900 bg-white rounded-full border border-gray-200 cursor-pointer hover:scale-110 transition-all duration-250 ${showSearch ? 'z-[4001] p-2' : 'p-2'}`}
      style={{ position: 'relative', zIndex: showSearch ? 4001 : 'auto' }}
      tabIndex={showSearch ? -1 : 0}
      onClick={() => {
        setShowSearch(true);
        setShowDropdown(true);
        setTimeout(() => {
          if (searchInputRef.current) searchInputRef.current.focus();
        }, 200);
      }}
    >
      <FaSearch size={14} />
    </button>
    {/* Input search expand */}
    <div
      className={`absolute top-1/2 right-0 z-[4002] flex items-center bg-white rounded-full shadow-lg transition-all duration-300 overflow-hidden ${showSearch ? 'w-[360px] opacity-100 translate-y-[-50%] px-2 py-1.5' : 'w-0 opacity-0 translate-y-[-50%]'} border border-gray-200`}
      style={{ boxShadow: '0 4px 32px 0 rgba(0,0,0,0.10)' }}
    >
      <div className="text-gray-700 mx-1">
        <FaSearch size={14} />
      </div>
      <input
        ref={searchInputRef}
        type="text"
        placeholder="Tìm kiếm phim, thể loại, diễn viên..."
        className="flex-1 outline-none bg-transparent text-sm text-gray-800 px-2"
        style={{ minWidth: showSearch ? 180 : 0, transition: 'min-width 0.3s' }}
        tabIndex={showSearch ? 0 : -1}
        name="search"
        value={searchValue}
        onChange={handleChangeSearch}
        onFocus={() => searchResults.length > 0 && setShowDropdown(true)}
      />
      <button onClick={closeSearch} className="ml-1 text-gray-500 hover:text-red-500 cursor-pointer" tabIndex={showSearch ? 0 : -1}>
        <IoMdClose size={22} />
      </button>
    </div>
    {/* Dropdown search results */}
    {showDropdown && (loadingSearch || searchValue.trim() !== '') && (
      <div className="absolute top-[110%] right-0 w-[360px] max-h-[420px] bg-white rounded-xl shadow-2xl border border-gray-200 z-[5000] overflow-y-auto animate-fade-in mt-2">
        {loadingSearch ? (
          Array.from({ length: 5 }).map((_, idx) => (
            <div key={idx} className="flex items-center gap-3 px-4 py-3 border-b border-[#eeeeee] last:border-b-0 animate-pulse">
              <div className="w-14 h-20 bg-gray-200 rounded-lg" />
              <div className="flex-1 min-w-0">
                <div className="h-4 w-2/3 bg-gray-200 rounded mb-2" />
                <div className="h-3 w-1/2 bg-gray-100 rounded mb-2" />
                <div className="flex gap-1 mt-1">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="w-4 h-4 bg-gray-100 rounded" />
                  ))}
                </div>
              </div>
            </div>
          ))
        ) : (searchValue.trim() !== '' && searchResults.length === 0) ? (
          <div className="py-8 text-center text-gray-500 text-base">Không tìm thấy kết quả</div>
        ) : (
          searchResults.map(movie => (
            <div
              key={movie._id}
              className="flex items-center gap-3 px-4 py-3 border-b border-[#eeeeee] last:border-b-0 hover:bg-gray-100 cursor-pointer transition"
              onClick={() => handleSelectMovie(movie._id)}
            >
              <img src={movie.image} alt={movie.title} className="w-14 h-20 object-cover rounded-lg border" />
              <div className="flex-1 justify-between min-w-0">
                <div className="font-semibold text-base truncate mb-2">{movie.title}</div>
                <div className="text-xs text-gray-500 truncate mb-2">Diễn viên: {movie.actors?.join(', ')}</div>
                <div className="flex items-center gap-1 mt-2">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <AiFillStar key={i} size={16} className={i < (movie.averageRating || 0) ? 'text-[#ffb400]' : 'text-gray-300'} />
                  ))}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    )}
  </div>
);

export default SearchDropdown; 