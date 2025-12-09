import { useEffect, useState } from "react";
import { getMovieById, getMovies } from "@/apiservice/apiMovies";
import { getShowTimesByFilter } from "@/apiservice/apiShowTime";
import { getTheaters } from "@/apiservice/apiTheater";
import { getRegions } from "@/apiservice/apiRegion";
import { useNavigate, useParams } from "react-router-dom";
import useAppStore from "@/store/app.store";
import { useReleaseReservedSeats } from "@/hooks/useReleaseReservedSeats";

import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
import isSameOrBefore from "dayjs/plugin/isSameOrBefore";
import isSameOrAfter from "dayjs/plugin/isSameOrAfter";

dayjs.extend(isSameOrBefore);
dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.extend(isSameOrAfter);

const getVNDayLabel = (date: Date, idx: number) => {
  const days = [
    "Chủ nhật",
    "Thứ 2",
    "Thứ 3",
    "Thứ 4",
    "Thứ 5",
    "Thứ 6",
    "Thứ 7",
  ];
  if (idx === 0) return `Hôm nay\n${date.getDate()}`;
  if (idx === 1) return `Ngày mai\n${date.getDate()}`;
  return `${days[date.getDay()]}\n${date.getDate()}`;
};

const get7DaysFromToday = () => {
  const today = dayjs();
  return Array.from({ length: 7 }, (_, idx) => {
    const date = today.add(idx, "day");
    return {
      label: getVNDayLabel(date.toDate(), idx),
      value: date.format("YYYY-MM-DD"),
    };
  });
};

const getYoutubeEmbedUrl = (url?: string) => {
  if (!url) return "";
  if (url.includes("embed")) return url;
  const match = url.match(/(?:\?v=|\/embed\/|\.be\/)([a-zA-Z0-9_-]{11})/);
  if (match && match[1]) {
    return `https://www.youtube.com/embed/${match[1]}`;
  }
  return url;
};

const formatVNTime = (iso: string) => {
  return dayjs(iso).tz("Asia/Ho_Chi_Minh").format("HH:mm");
};

const CardInfMovie = () => {
  const [showMoreDes, setShowMoreDes] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<
    "Phim đang chiếu" | "Phim sắp chiếu" | "Suất chiếu đặc biệt" | "Đã kết thúc"
  >("Phim đang chiếu");
  const [openModal, setOpenModal] = useState<boolean>(false);
  const [selectedCity, setSelectedCity] = useState<string>("");
  const [selectedCinemaId, setSelectedCinemaId] = useState<string>("");
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [dates] = useState<{ label: string; value: string }[]>(
    get7DaysFromToday()
  );
  const [showtimes, setShowtimes] = useState<IShowtime[]>([]);
  const [loadingMovie, setLoadingMovie] = useState<boolean>(true);
  const [movieError, setMovieError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState<number>(0);
  const { isDarkMode, user, setIsModalOpen } = useAppStore();

  // Flatten showtimes and normalize room to string (same approach as ScheduleList)
  const allShowTimes = showtimes.flatMap((st) =>
    (st.showTimes || []).map((showTime) => ({
      ...showTime,
      parentId: st._id,
      room:
        typeof showTime.room === "string"
          ? (showTime.room as string)
          : (showTime.room as { name?: string; _id?: string })?.name ||
            (showTime.room as { name?: string; _id?: string })?._id ||
            "Unknown Room",
    }))
  );

  // Lọc theo ngày, và nếu là hôm nay thì ẩn suất đã quá giờ bắt đầu 5 phút
  let showTimesOfSelectedDate = allShowTimes.filter(
    (st) => dayjs(st.date).format("YYYY-MM-DD") === selectedDate
  );
  if (selectedDate === dayjs().format("YYYY-MM-DD")) {
    const now = dayjs();
    showTimesOfSelectedDate = showTimesOfSelectedDate.filter((st) => {
      const start = dayjs(st.start);
      const end = dayjs(st.end);
      // Xử lý trường hợp ca đêm qua ngày hôm sau
      if (start.hour() >= 22 && end.hour() < 6) {
        // Ca đêm: kiểm tra xem đã qua end time chưa
        const endTimeToday = end.format("YYYY-MM-DD HH:mm");
        return dayjs(endTimeToday).add(5, "minute").isAfter(now);
      } else {
        // Ca bình thường: kiểm tra start time
        return start.add(5, "minute").isAfter(now);
      }
    });
  }

  const navigate = useNavigate();
  const { releaseUserReservedSeats } = useReleaseReservedSeats();

  const { id } = useParams<{ id: string }>();
  const [movie, setMovie] = useState<IMovie | null>(null);
  const [movies, setMovies] = useState<IMovie[]>([]);
  const [theater, setTheater] = useState<ITheater[]>([]);
  const [regions, setRegions] = useState<IRegion[]>([]);

  useEffect(() => {
    const fetchRegions = async () => {
      const res = await getRegions();
      setRegions(res);

      const hoChiMinh = res.find((r) => r.name.trim() === "Hồ Chí Minh");
      if (hoChiMinh) {
        setSelectedCity(hoChiMinh.name.trim());
      } else if (res.length > 0) {
        setSelectedCity(res[0].name.trim());
      }
    };

    fetchRegions();
  }, []);

  useEffect(() => {
    const fetchMovie = async () => {
      try {
        setLoadingMovie(true);
        setMovieError(null);

        if (!id || id.trim() === "") {
          setMovieError("ID phim không hợp lệ");
          return;
        }

        console.log("Fetching movie with ID:", id);
        const response = await getMovieById(id);
        if (!response) {
          setMovieError("Không tìm thấy thông tin phim");
          return;
        }
        setMovie(response);
        console.log("Movie loaded successfully:", response.title);
        console.log("Movie image URLs:", {
          image: response.image,
          posterImage: response.posterImage,
          allKeys: Object.keys(response),
        });
      } catch (error: unknown) {
        console.error("Lỗi khi lấy thông tin phim:", error);

        // Xử lý các loại lỗi khác nhau
        if (error && typeof error === "object" && "response" in error) {
          const axiosError = error as {
            response?: { status?: number };
            code?: string;
          };
          if (axiosError.response?.status === 404) {
            setMovieError("Không tìm thấy phim với ID này");
          } else if (axiosError.response?.status === 500) {
            setMovieError("Lỗi server, vui lòng thử lại sau");
          } else if (axiosError.code === "NETWORK_ERROR") {
            setMovieError("Lỗi kết nối, vui lòng kiểm tra mạng");
          } else {
            setMovieError("Có lỗi xảy ra khi tải thông tin phim");
          }
        } else {
          setMovieError("Có lỗi xảy ra khi tải thông tin phim");
        }
      } finally {
        setLoadingMovie(false);
      }
    };

    const fetchMovies = async () => {
      try {
        const responses = await getMovies();
        setMovies(Array.isArray(responses) ? responses : []);
      } catch (error) {
        console.error("Lỗi khi lấy thông tin phim:", error);
      }
    };

    const fetchTheater = async () => {
      try {
        const response = await getTheaters();
        setTheater(Array.isArray(response) ? response : []);
      } catch (error) {
        console.error("Lỗi khi lấy thông tin rạp:", error);
      }
    };

    fetchMovie();
    fetchMovies();
    fetchTheater();
  }, [id]);

  const filteredMovies = (() => {
    let filtered = [];

    // Lọc bỏ phim đã ẩn (isHidden = true)
    const visibleMovies = movies.filter((movie) => !movie.isHidden);

    switch (activeTab) {
      case "Phim đang chiếu":
        // Chỉ hiển thị phim đang chiếu, không bao gồm suất chiếu đặc biệt
        filtered = visibleMovies.filter(
          (movie) => movie.status === "Phim đang chiếu"
        );
        break;
      case "Phim sắp chiếu":
        // Chỉ hiển thị phim sắp chiếu
        filtered = visibleMovies.filter(
          (movie) => movie.status === "Phim sắp chiếu"
        );
        break;
      case "Suất chiếu đặc biệt":
        // Chỉ hiển thị suất chiếu đặc biệt
        filtered = visibleMovies.filter(
          (movie) => movie.status === "Suất chiếu đặc biệt"
        );
        break;
      case "Đã kết thúc":
        // Chỉ hiển thị phim đã kết thúc
        filtered = visibleMovies.filter(
          (movie) => movie.status === "Đã kết thúc"
        );
        break;
      default:
        filtered = visibleMovies;
    }

    return filtered;
  })();

  // Lọc rạp theo thành phố
  const filteredCinemas = theater.filter(
    (c) => c.location.city === selectedCity
  );

  // Khi đổi rạp, không thay đổi dải ngày, chỉ filter showtimes
  useEffect(() => {
    if (movie?._id && selectedCinemaId) {
      getShowTimesByFilter(movie._id, selectedCinemaId).then((data) =>
        setShowtimes(data || [])
      );
    } else {
      setShowtimes([]);
    }
  }, [movie?._id, selectedCinemaId]);

  // Khi dữ liệu rạp thay đổi, nếu selectedCity không còn rạp nào, tự động chọn thành phố đầu tiên có rạp
  useEffect(() => {
    if (theater.length > 0) {
      const citiesWithCinemas = [
        ...new Set(theater.map((c) => c.location.city)),
      ];
      if (!citiesWithCinemas.includes(selectedCity)) {
        setSelectedCity(citiesWithCinemas[0]);
      }
    }
  }, [theater, selectedCity]);

  // Khi đổi thành phố, chọn lại rạp đầu tiên hoặc reset nếu không có rạp
  useEffect(() => {
    const filtered = theater.filter((c) => c.location.city === selectedCity);
    if (filtered.length > 0) {
      setSelectedCinemaId(filtered[0]._id);
    } else {
      setSelectedCinemaId("");
    }
  }, [selectedCity, theater]);

  // Set selectedDate mặc định là ngày hôm nay khi khởi tạo
  useEffect(() => {
    if (!selectedDate && dates.length > 0) {
      setSelectedDate(dates[0].value);
    }
  }, [dates, selectedDate]);

  // Khi đổi rạp, luôn set lại selectedDate về ngày hôm nay
  useEffect(() => {
    if (dates.length > 0) {
      setSelectedDate(dates[0].value);
    }
  }, [selectedCinemaId, dates]);

  // Hiển thị loading state
  if (loadingMovie) {
    return (
      <div
        className={`${
          isDarkMode ? "bg-[#191b21]" : "bg-white"
        } pt-5 min-h-screen flex items-center justify-center`}
      >
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p
            className={`${isDarkMode ? "text-white" : "text-gray-700"} text-lg`}
          >
            Đang tải thông tin phim...
          </p>
        </div>
      </div>
    );
  }

  // Hiển thị error state
  if (movieError) {
    return (
      <div
        className={`${
          isDarkMode ? "bg-[#191b21]" : "bg-white"
        } pt-5 min-h-screen flex items-center justify-center`}
      >
        <div className="text-center max-w-md mx-auto p-6">
          <div className="text-red-500 text-6xl mb-4">⚠️</div>
          <h2
            className={`${
              isDarkMode ? "text-white" : "text-gray-800"
            } text-2xl font-bold mb-4`}
          >
            Không thể tải phim
          </h2>
          <p
            className={`${isDarkMode ? "text-gray-300" : "text-gray-600"} mb-6`}
          >
            {movieError}
          </p>
          <div className="flex gap-3 justify-center">
            <button
              onClick={() => window.history.back()}
              className={`${
                isDarkMode
                  ? "bg-gray-600 hover:bg-gray-700 text-white"
                  : "bg-gray-500 hover:bg-gray-600 text-white"
              } px-6 py-2 rounded-lg font-medium transition-colors`}
            >
              Quay lại
            </button>
            {retryCount < 3 && (
              <button
                onClick={() => {
                  setMovieError(null);
                  setRetryCount((prev) => prev + 1);
                  // Trigger re-fetch by updating a dependency
                  window.location.reload();
                }}
                className={`${
                  isDarkMode
                    ? "bg-blue-600 hover:bg-blue-700 text-white"
                    : "bg-blue-500 hover:bg-blue-600 text-white"
                } px-6 py-2 rounded-lg font-medium transition-colors`}
              >
                Thử lại
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Hiển thị error nếu không có movie data
  if (!movie) {
    return (
      <div
        className={`${
          isDarkMode ? "bg-[#191b21]" : "bg-white"
        } pt-5 min-h-screen flex items-center justify-center`}
      >
        <div className="text-center">
          <div className="text-gray-500 text-6xl mb-4">🎬</div>
          <h2
            className={`${
              isDarkMode ? "text-white" : "text-gray-800"
            } text-2xl font-bold mb-4`}
          >
            Không tìm thấy phim
          </h2>
          <p
            className={`${isDarkMode ? "text-gray-300" : "text-gray-600"} mb-6`}
          >
            Phim này có thể đã bị xóa hoặc không tồn tại
          </p>
          <button
            onClick={() => window.history.back()}
            className={`${
              isDarkMode
                ? "bg-blue-600 hover:bg-blue-700 text-white"
                : "bg-blue-500 hover:bg-blue-600 text-white"
            } px-6 py-2 rounded-lg font-medium transition-colors`}
          >
            Quay lại
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Phần thông tin chi tiết về phim */}
      <div
        className="bg-cover bg-center min-h-[100px] py-2 relative"
        style={{
          backgroundImage:
            movie?.image && movie.image.trim() !== ""
              ? `url(${movie.image})`
              : movie?.posterImage && movie.posterImage.trim() !== ""
              ? `url(${movie.posterImage})`
              : "none",
          backgroundColor: "#1a1a1a", // Fallback background color
        }}
      >
        {/* Thông tin phim */}
        <div className="flex flex-col md:flex-row items-start max-w-5xl mx-auto bg-black/40 rounded-xl p-8 gap-10">
          {/* Poster */}
          <div className="min-w-[280px] text-center">
            <img
              src={
                movie?.posterImage ||
                movie?.image ||
                "https://via.placeholder.com/260x370/1a1a1a/ffffff?text=No+Image"
              }
              alt={movie?.title || "Movie Poster"}
              className="w-[260px] h-[370px] object-cover rounded-xl border-4 border-white shadow-lg mx-auto"
              onError={(e) => {
                console.error("Error loading poster image:", e);
                const target = e.target as HTMLImageElement;
                if (movie?.image && target.src !== movie.image) {
                  target.src = movie.image;
                } else {
                  target.src =
                    "https://via.placeholder.com/260x370/1a1a1a/ffffff?text=No+Image";
                }
              }}
            />
            <button
              className={`mt-6 w-full py-3 rounded-md text-white font-semibold text-xl transition
                            ${
                              movie?.status === "Phim đang chiếu" ||
                              movie?.status === "Suất chiếu đặc biệt"
                                ? "bg-[#162d5a] hover:bg-[#1a376e] cursor-pointer"
                                : "bg-[#ff642e] opacity-80 cursor-not-allowed"
                            }
                        `}
              disabled={
                movie?.status !== "Phim đang chiếu" &&
                movie?.status !== "Suất chiếu đặc biệt"
              }
              onClick={() => setOpenModal(true)}
            >
              {movie?.status === "Phim đang chiếu" ||
              movie?.status === "Suất chiếu đặc biệt"
                ? "Đặt vé ngay"
                : movie?.status === "Đã kết thúc"
                ? "Đã kết thúc"
                : movie?.status === "Phim sắp chiếu"
                ? "Sắp chiếu"
                : "Đặt vé ngay"}
            </button>
          </div>
          {/* Info */}
          <div className="flex-1 text-white">
            <h2 className="text-4xl font-bold text-lime-300 mb-2">
              {movie?.title}
            </h2>
            <div className="text-lg mb-1">
              <span className="text-yellow-300">Ngày phát hành :</span>{" "}
              {movie?.releaseDate
                ? new Date(movie.releaseDate).toLocaleDateString("vi-VN")
                : ""}
            </div>
            <div className="text-lg mb-1">
              <span className="text-yellow-300">Thời lượng :</span>{" "}
              {movie?.duration} phút
            </div>
            <div className="text-lg mb-1">
              <span className="text-yellow-300">Đạo diễn :</span>{" "}
              {movie?.director}
            </div>
            <div className="text-lg mb-1">
              <span className="text-yellow-300">Diễn viên :</span>{" "}
              {movie?.actors.join(", ")}
            </div>

            <div className="text-lg mb-1">
              <span className="text-yellow-300">Thể loại :</span>{" "}
              {movie?.genre.join(", ")}
            </div>
            <div className="text-lg mb-1">
              <span className="text-yellow-300">Ngôn ngữ :</span>{" "}
              {movie?.language}
            </div>
            <div className="mt-6">
              <span className="text-yellow-200 font-bold text-xl">
                Nội dung
              </span>
              <div className="text-white text-base mt-2">
                {showMoreDes
                  ? movie?.description
                  : `${movie?.description.substring(0, 120)}...`}
                <button
                  className="bg-transparent border-none text-yellow-400 font-semibold ml-2 cursor-pointer"
                  onClick={() => setShowMoreDes((v) => !v)}
                >
                  {showMoreDes ? "Ẩn bớt" : "Xem thêm"}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Phần trailer và danh sách phim */}
      <div className="bg-cover  min-h-[50px]  py-2 relative">
        <div className=" mx-auto   rounded-xl p-8 flex flex-col md:flex-row gap-8">
          {/* Trailer bên trái */}
          <div className="flex-1 flex flex-col items-center  ">
            <iframe
              width="100%"
              height="320"
              src={getYoutubeEmbedUrl(movie?.trailer)}
              title={movie?.title}
              className="rounded-xl border-none w-full max-w-[700px] h-[360px]"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              referrerPolicy="strict-origin-when-cross-origin"
              allowFullScreen
            ></iframe>
          </div>
          {/* Danh sách phim bên phải */}
          <div
            className={`w-full md:w-[400px] flex flex-col rounded-2xl ${
              isDarkMode ? "bg-gray-800 text-white" : "bg-[#F6F6F6]"
            }`}
          >
            <div className="flex justify-center gap-2 mb-4 p-4 flex-wrap">
              <button
                className={`px-3 py-1 border rounded font-semibold transition cursor-pointer text-sm ${
                  activeTab === "Phim đang chiếu"
                    ? "bg-[#b55210] text-white"
                    : isDarkMode
                    ? "bg-gray-700 text-white hover:bg-[#dd6c0f]"
                    : "bg-white text-[#2d3a5a] hover:bg-[#dd6c0f] hover:text-white"
                }`}
                onClick={() => setActiveTab("Phim đang chiếu")}
              >
                Đang chiếu
              </button>

              <button
                className={`px-3 py-1 border rounded font-semibold transition cursor-pointer text-sm ${
                  activeTab === "Phim sắp chiếu"
                    ? "bg-[#dd6c0f] text-white"
                    : isDarkMode
                    ? "bg-gray-700 text-white hover:bg-[#dd6c0f]"
                    : "bg-white text-[#2d3a5a] hover:bg-[#dd6c0f] hover:text-white"
                }`}
                onClick={() => setActiveTab("Phim sắp chiếu")}
              >
                Sắp chiếu
              </button>

              <button
                className={`px-3 py-1 border rounded font-semibold transition cursor-pointer text-sm ${
                  activeTab === "Suất chiếu đặc biệt"
                    ? "bg-[#8B5CF6] text-white"
                    : isDarkMode
                    ? "bg-gray-700 text-white hover:bg-[#8B5CF6]"
                    : "bg-white text-[#2d3a5a] hover:bg-[#8B5CF6] hover:text-white"
                }`}
                onClick={() => setActiveTab("Suất chiếu đặc biệt")}
              >
                Đặc biệt
              </button>
            </div>
            <ul className="space-y-4 pb-4">
              {filteredMovies
                .filter((item) => item._id !== movie?._id)
                .map((item) => (
                  <li
                    key={item._id}
                    className={`flex items-center gap-3 rounded-lg p-2 border-b mx-2 cursor-pointer transition-colors ${
                      isDarkMode
                        ? "border-gray-700 hover:bg-gray-700"
                        : "border-gray-300 hover:bg-gray-100"
                    }`}
                    onClick={() => navigate(`/movies/${item._id}`)}
                  >
                    <img
                      src={item.image}
                      alt={item.title}
                      className="w-12 h-16 object-cover rounded"
                    />
                    <div>
                      <div
                        className={`font-semibold ${
                          isDarkMode ? "text-white" : "text-black"
                        }`}
                      >
                        {item.title}
                      </div>
                      <div className="text-gray-600 text-sm">
                        {item.genre.join(", ")}
                      </div>
                      <div className="text-yellow-400 text-sm">
                        {"★".repeat(
                          item.reviews.reduce(
                            (acc, review) => acc + (review.rating || 0),
                            0
                          ) / item.reviews.length || 0
                        )}
                      </div>
                    </div>
                  </li>
                ))}
            </ul>
          </div>
        </div>
      </div>

      {/* Modal đặt vé */}
      {openModal && (
        <div className="fixed inset-0 z-9999 flex items-center justify-center bg-black/40">
          <div
            className={`rounded-2xl shadow-lg max-w-5xl w-full p-8 relative ${
              isDarkMode ? "bg-gray-900" : "bg-white"
            }`}
          >
            {/* Thông tin phim trên modal */}
            <div className="flex items-start gap-6 mb-6">
              <img
                src={movie?.posterImage}
                alt={movie?.title}
                className="w-36 h-52 object-cover rounded-lg shadow"
              />
              <div>
                <div
                  className={`text-3xl font-semibold mb-2 ${
                    isDarkMode ? "text-white" : "text-[#162d5a]"
                  }`}
                >
                  {movie?.title}
                </div>
                <div className="mb-2">
                  <span className="inline-block bg-green-600 text-white text-sm font-bold px-2 py-0.5 rounded mr-2 align-middle">
                    {movie?.ageRating}
                  </span>
                  <span
                    className={`font-medium ${
                      isDarkMode ? "text-gray-300" : "text-gray-700"
                    }`}
                  >
                    Thời lượng:
                  </span>{" "}
                  <span
                    className={`${
                      isDarkMode ? "text-gray-100" : "text-gray-800"
                    }`}
                  >
                    {movie?.duration} phút
                  </span>
                </div>
                <div className="mb-2">
                  <span
                    className={`font-medium ${
                      isDarkMode ? "text-gray-300" : "text-gray-700"
                    }`}
                  >
                    Thể loại:
                  </span>{" "}
                  <span
                    className={`${
                      isDarkMode ? "text-gray-100" : "text-gray-800"
                    }`}
                  >
                    {movie?.genre.join(", ")}
                  </span>
                </div>
                <div>
                  <span
                    className={`font-medium ${
                      isDarkMode ? "text-gray-300" : "text-gray-700"
                    }`}
                  >
                    Diễn viên:
                  </span>{" "}
                  <span
                    className={`${
                      isDarkMode ? "text-gray-100" : "text-gray-800"
                    }`}
                  >
                    {movie?.actors.join(", ")}
                  </span>
                </div>
              </div>
            </div>
            <div className="flex gap-4">
              {/* Left: Cinema List */}
              <div
                className={`w-1/3 pr-4 ${
                  isDarkMode ? "border-gray-700" : "border-r"
                }`}
              >
                <select
                  className={`w-full border rounded px-3 py-2 mb-3 ${
                    isDarkMode
                      ? "bg-gray-800 text-white border-gray-600"
                      : "bg-white border"
                  }`}
                  value={selectedCity}
                  onChange={(e) => setSelectedCity(e.target.value)}
                >
                  {regions.map((region) => (
                    <option key={region._id} value={region.name.trim()}>
                      {region.name}
                    </option>
                  ))}
                </select>

                <div className="overflow-y-auto max-h-[350px] flex flex-col gap-2">
                  {filteredCinemas.length === 0 ? (
                    <div className="text-center text-gray-400 py-4">
                      Không có rạp nào ở khu vực này
                    </div>
                  ) : (
                    filteredCinemas.map((cinema) => (
                      <button
                        key={cinema._id}
                        className={`flex items-center gap-2 px-3 py-2 rounded border w-full text-left cursor-pointer ${
                          selectedCinemaId === cinema._id
                            ? isDarkMode
                              ? "bg-blue-800 border-blue-600 text-white"
                              : "bg-blue-50 border-blue-700"
                            : isDarkMode
                            ? "bg-gray-700 border-gray-600 text-white"
                            : "bg-white border-gray-200"
                        }`}
                        onClick={() => setSelectedCinemaId(cinema._id)}
                      >
                        <img
                          src="data:image/png;base64,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"
                          alt="CNJ"
                          className="w-7 h-7"
                        />
                        <div>
                          <div className="font-semibold">{cinema.name}</div>
                          <div
                            className={`text-xs ${
                              isDarkMode ? "text-gray-400" : "text-gray-500"
                            }`}
                          >
                            {cinema.location.address}
                          </div>
                        </div>
                      </button>
                    ))
                  )}
                </div>
              </div>

              {/* Right: Date & Showtimes */}
              <div className="flex-1 pl-4">
                <div className="flex gap-2 mb-4">
                  {dates.map((date) => (
                    <button
                      key={date.value}
                      className={`w-[80px] px-4 py-2 rounded font-medium cursor-pointer ${
                        selectedDate === date.value
                          ? "bg-blue-900 text-white"
                          : isDarkMode
                          ? "bg-gray-700 text-blue-200"
                          : "bg-gray-100 text-blue-900"
                      }`}
                      onClick={() => setSelectedDate(date.value)}
                    >
                      {date.label.split("\n").map((line, idx) => (
                        <span
                          key={idx}
                          className={
                            idx === 0 ? "block" : "block text-lg font-bold"
                          }
                        >
                          {line}
                        </span>
                      ))}
                    </button>
                  ))}
                </div>

                <div className="mt-2">
                  {showtimes.length > 0 ? (
                    <>
                      <div className="flex items-center gap-2 mb-3">
                        <span
                          className={`text-lg ${
                            isDarkMode ? "text-gray-400" : "text-gray-700"
                          }`}
                        >
                          •
                        </span>
                        <span
                          className={`font-medium ${
                            isDarkMode ? "text-gray-300" : "text-gray-700"
                          }`}
                        >
                          Suất chiếu ngày{" "}
                          {selectedDate.split("-").reverse().join("/")}
                        </span>
                      </div>
                      <div className="flex gap-3 flex-wrap">
                        {showTimesOfSelectedDate.map((showtime, idx) => (
                          <button
                            key={idx}
                            className={`border px-4 py-2 rounded cursor-pointer ${
                              isDarkMode
                                ? "text-gray-100 bg-gray-700 hover:bg-blue-800 border-gray-600"
                                : "text-gray-800 bg-white hover:bg-blue-50"
                            }`}
                            onClick={async () => {
                              // Kiểm tra user đã đăng nhập chưa
                              if (!user || !user._id) {
                                setIsModalOpen(true);
                                return;
                              }

                              // Giải phóng ghế tạm giữ trước khi chọn suất chiếu mới
                              await releaseUserReservedSeats();

                              navigate(`/selectSeat`, {
                                state: {
                                  movie: {
                                    ...movie,
                                    title: movie?.title,
                                    poster: movie?.posterImage,
                                    format: "2D, Phụ đề Tiếng Việt", // hoặc lấy từ movie nếu có
                                    genre: movie?.genre?.join(", "),
                                    duration: movie?.duration,
                                    minAge:
                                      movie?.ageRating === "T18+"
                                        ? 18
                                        : movie?.ageRating === "T16+"
                                        ? 16
                                        : movie?.ageRating === "T15+"
                                        ? 15
                                        : movie?.ageRating === "T12+"
                                        ? 12
                                        : 13,
                                    theaterId: selectedCinemaId, // Thêm theaterId
                                  },
                                  showtimeId: showtime.parentId,
                                  theaterId: selectedCinemaId, // Thêm theaterId ở level state, // Use parent document ID
                                  cinema: filteredCinemas.find(
                                    (c) => c._id === selectedCinemaId
                                  )?.name,
                                  date: selectedDate,
                                  time: formatVNTime(showtime.start),
                                  room: showtime.room,
                                  seats: [], // sẽ cập nhật khi chọn ghế
                                },
                              });
                            }}
                          >
                            {formatVNTime(showtime.start)} -{" "}
                            {formatVNTime(showtime.end)}
                          </button>
                        ))}
                      </div>
                    </>
                  ) : (
                    <div
                      className={`mt-6 ${
                        isDarkMode ? "text-gray-400" : "text-gray-500"
                      }`}
                    >
                      Không có suất chiếu
                    </div>
                  )}
                </div>
                <div className="flex justify-end mt-10">
                  <button
                    className={`px-8 py-2 rounded font-semibold cursor-pointer ${
                      isDarkMode
                        ? "bg-gray-700 text-gray-300"
                        : "bg-gray-300 text-gray-500"
                    }`}
                    onClick={() => setOpenModal(false)}
                  >
                    Hủy
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default CardInfMovie;
