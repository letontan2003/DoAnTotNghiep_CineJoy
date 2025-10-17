import { useEffect, useState, useRef } from "react";
import { getTheaters } from "@/apiservice/apiTheater";
import useAppStore from "@/store/app.store";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
import isSameOrBefore from "dayjs/plugin/isSameOrBefore";
import isSameOrAfter from "dayjs/plugin/isSameOrAfter";
import { getMovieById } from "@/apiservice/apiMovies";
import { getShowTimesByTheater } from "@/apiservice/apiShowTime";
import { getRegions } from "@/apiservice/apiRegion";
import { useNavigate } from "react-router-dom";
import { useReleaseReservedSeats } from "@/hooks/useReleaseReservedSeats";

dayjs.extend(isSameOrBefore);
dayjs.extend(isSameOrAfter);
dayjs.extend(utc);
dayjs.extend(timezone);

interface IFlattenedShowtime {
  _id: string;
  parentId: string; // Add parent document ID
  date: string;
  start: string;
  end: string;
  room: string;
  seats: Array<{
    seatId: string;
    status: string;
    type: string;
    price: number;
  }>;
  movieId: string;
  movieTitle: string;
  ageRating: string;
  genre: string[];
  theaterId: string;
  theaterName: string;
}

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
  const dayOfWeek = date.getDay(); // 0 for Sunday, 1 for Monday, etc.

  if (idx === 0) return `Hôm nay\n${date.getDate()}`;
  if (idx === 1) return `Ngày mai\n${date.getDate()}`;

  // For other days (not today/tomorrow)
  if (dayOfWeek === 0) {
    // Nếu là Chủ nhật
    return `Chủ nhật\n${date.getDate()}`;
  } else {
    // Thứ 2 đến Thứ 7
    return `${days[dayOfWeek]}\n${date.getDate()}`;
  }
};

const getDateRange = (start: string, end: string) => {
  const result = [];
  let current = dayjs(start);
  const last = dayjs(end);
  let idx = 0;
  while (current.isSameOrBefore(last, "day")) {
    result.push({
      label: getVNDayLabel(current.toDate(), idx),
      value: current.format("YYYY-MM-DD"),
    });
    current = current.add(1, "day");
    idx++;
  }
  return result;
};

const formatVNTime = (iso: string) => {
  return dayjs(iso).tz("Asia/Ho_Chi_Minh").format("HH:mm");
};

const ScheduleList: React.FC = () => {
  const today = dayjs().format("YYYY-MM-DD");
  const sevenDaysLater = dayjs().add(6, "day").format("YYYY-MM-DD");

  const navigate = useNavigate();
  const { releaseUserReservedSeats } = useReleaseReservedSeats();
  const [selectedCinemaId, setSelectedCinemaId] = useState<string>("");
  const [selectedDate, setSelectedDate] = useState<string>(today);
  const [selectedCity, setSelectedCity] = useState<string>("");
  const previousCityRef = useRef<string>("");
  const [theater, setTheater] = useState<ITheater[]>([]);
  const [regions, setRegions] = useState<IRegion[]>();
  const [dates, setDates] = useState<{ label: string; value: string }[]>(
    getDateRange(today, sevenDaysLater)
  );
  const [showtimes, setShowtimes] = useState<IShowtime[]>([]);
  const [movieDetails, setMovieDetails] = useState<{ [key: string]: IMovie }>(
    {}
  );
  const [groupedShowtimes, setGroupedShowtimes] = useState<{
    [key: string]: { movie: IMovie; showtimes: IFlattenedShowtime[] };
  }>({});
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    if (showtimes.length > 0 && selectedDate) {
      const allShowTimes: IFlattenedShowtime[] = showtimes
        .map((st: IShowtime) => {
          const movie = st.movieId as IMovie;
          const theaterData = st.theaterId as ITheater;


          return st.showTimes.map((innerSt) => ({
            ...innerSt,
            parentId: st._id, // Add parent document ID
            movieId: movie._id,
            movieTitle: movie.title,
            ageRating: movie.ageRating,
            genre: movie.genre,
            theaterId: theaterData._id,
            theaterName: theaterData.name,
            room: typeof innerSt.room === 'string' ? innerSt.room : (innerSt.room as { name?: string; _id?: string })?.name || (innerSt.room as { name?: string; _id?: string })?._id || 'Unknown Room',
          }));
        })
        .flat();

      // Lọc theo ngày chọn
      let showTimesOfSelectedDate = allShowTimes.filter(
        (st) => dayjs(st.date).format("YYYY-MM-DD") === selectedDate
      );

      // Nếu là hôm nay: ẩn các suất bắt đầu trước thời điểm hiện tại 5 phút
      const isToday = selectedDate === dayjs().format("YYYY-MM-DD");
      if (isToday) {
        const now = dayjs();
        showTimesOfSelectedDate = showTimesOfSelectedDate.filter((st) => {
          const start = dayjs(st.start);
          const end = dayjs(st.end);
          
          // Xử lý trường hợp ca đêm qua ngày hôm sau
          if (start.hour() >= 22 && end.hour() < 6) {
            // Ca đêm: kiểm tra xem đã qua end time chưa
            const endTimeToday = end.format("YYYY-MM-DD HH:mm");
            const nowFormatted = now.format("YYYY-MM-DD HH:mm");
            return dayjs(endTimeToday).add(5, "minute").isAfter(now);
          } else {
            // Ca bình thường: kiểm tra start time
            return start.add(5, "minute").isAfter(now);
          }
        });
      }

      const newGroupedShowtimes = showTimesOfSelectedDate.reduce(
        (acc, showtime) => {
          const movieId = showtime.movieId;
          if (movieDetails[movieId]) {
            if (!acc[movieId]) {
              acc[movieId] = { movie: movieDetails[movieId], showtimes: [] };
            }
            acc[movieId].showtimes.push(showtime);
          }
          return acc;
        },
        {} as {
          [key: string]: { movie: IMovie; showtimes: IFlattenedShowtime[] };
        }
      );

      setGroupedShowtimes(newGroupedShowtimes);
    } else {
      // Nếu không có suất chiếu thì clear luôn groupedShowtimes
      setGroupedShowtimes({});
    }
  }, [showtimes, selectedDate, movieDetails]);

  const { isDarkMode, user, setIsModalOpen } = useAppStore();

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
    const fetchTheater = async () => {
      try {
        const response = await getTheaters();
        setTheater(Array.isArray(response) ? response : []);
      } catch (error) {
        console.error("Lỗi khi lấy thông tin rạp:", error);
      }
    };

    fetchTheater();
  }, []);

  useEffect(() => {
    if (selectedCinemaId) {
      setLoading(true);
      getShowTimesByTheater(selectedCinemaId)
        .then((data) => setShowtimes(data || []))
        .catch((error) => {
          console.error("Error fetching showtimes:", error);
          setShowtimes([]);
        })
        .finally(() => setLoading(false));
    } else {
      setShowtimes([]);
    }
  }, [selectedCinemaId]);

  useEffect(() => {
    const fetchMovieDetails = async () => {
      const uniqueMovieIds = [
        ...new Set(
          showtimes.map((st) => st.movieId && st.movieId._id).filter((id) => id)
        ),
      ];
      const details: { [key: string]: IMovie } = {};
      for (const movieId of uniqueMovieIds) {
        try {
          const movie = await getMovieById(movieId);
          if (movie) {
            details[movieId] = movie;
          }
        } catch (error) {
          console.error(`Lỗi khi lấy thông tin phim ${movieId}:`, error);
        }
      }
      setMovieDetails(details);
    };
    if (showtimes.length > 0) {
      fetchMovieDetails();
    } else {
      setMovieDetails({});
    }
  }, [showtimes]);

  // Khi đổi rạp, nếu rạp không có ngày đang chọn thì chọn ngày đầu tiên có suất chiếu
  useEffect(() => {
    // Luôn chỉ lấy 7 ngày từ hôm nay
    const todayConst = dayjs().format("YYYY-MM-DD");
    const sevenDaysLaterConst = dayjs().add(6, "day").format("YYYY-MM-DD");
    setDates(getDateRange(todayConst, sevenDaysLaterConst));

    // Nếu ngày đang chọn không nằm trong 7 ngày này thì đặt lại về hôm nay
    if (
      !getDateRange(todayConst, sevenDaysLaterConst).some(
        (d) => d.value === selectedDate
      )
    ) {
      setSelectedDate(todayConst);
    }
  }, [showtimes]);

  // Khi dữ liệu rạp thay đổi, nếu selectedCity không còn rạp nào, tự động chọn thành phố đầu tiên có rạp
  useEffect(() => {
    if (theater.length > 0) {
      const citiesWithCinemas = [
        ...new Set(theater.map((c) => (c.location?.city || "").trim())),
      ];
      if (!citiesWithCinemas.map((n)=>n.toLowerCase()).includes(selectedCity.trim().toLowerCase())) {
        setSelectedCity(citiesWithCinemas[0] || "");
      }
    }
  }, [theater]);

  const filteredCinemas = theater.filter(
    (c) => (c.location?.city || "").trim().toLowerCase() === selectedCity.trim().toLowerCase()
  );

  // Khi đổi thành phố, chọn lại rạp đầu tiên hoặc reset nếu không có rạp
  useEffect(() => {
    // Chỉ auto-select khi thành phố thực sự thay đổi (không phải lần render đầu tiên hoặc re-render)
    const cityChanged = previousCityRef.current !== "" && previousCityRef.current !== selectedCity;
    
    if (cityChanged) {
      const filtered = theater.filter(
        (c) => (c.location?.city || "").trim().toLowerCase() === selectedCity.trim().toLowerCase()
      );
      if (filtered.length > 0) {
        setSelectedCinemaId(filtered[0]._id);
      } else {
        setSelectedCinemaId("");
      }
    }
    
    // Cập nhật ref cho lần kiểm tra tiếp theo
    previousCityRef.current = selectedCity;
  }, [selectedCity, theater]);

  return (
    <div className={`${isDarkMode ? "bg-[#181a1f]" : "bg-white"} py-8`}>
      <div
        className={`${
          isDarkMode ? "bg-[#282a36] text-white" : "bg-white text-[#0f1b4c]"
        } flex flex-col rounded-2xl shadow p-6 gap-6 mx-30`}
      >
        <h2
          className={`${
            isDarkMode ? "text-white" : "text-[#0f1b4c]"
          } text-3xl font-bold text-center mb-4`}
        >
          LỊCH CHIẾU PHIM
        </h2>
        <div className="flex items-center gap-5">
          <label
            className={`${
              isDarkMode ? "text-gray-300" : "text-gray-700"
            } block font-medium mb-2`}
          >
            Vị trí
          </label>
          <select
            className={`${
              isDarkMode
                ? "bg-[#3a3c4a] text-white border-gray-600"
                : "bg-white text-gray-800 border-gray-200"
            } w-[250px] text-sm border rounded p-2 cursor-pointer`}
            value={selectedCity}
            onChange={(e) => setSelectedCity(e.target.value.trim())}
          >
            {regions?.map((region) => (
              <option key={region._id} value={region.name.trim()}>
                {region.name}
              </option>
            ))}
          </select>
        </div>
        <div className="flex">
          {/* Left: Cinema List */}
          <div className="w-2/6 mr-10">
            <div className="flex flex-col gap-2">
              {filteredCinemas.length === 0 ? (
                <div className="text-center text-gray-400 py-4">
                  Không có rạp nào ở khu vực này
                </div>
              ) : (
                filteredCinemas.map((cinema) => {
                  const isSelected = selectedCinemaId === cinema._id;
                  return (
                  <button
                    key={cinema._id}
                    className={`flex items-center gap-2 px-3 py-2 rounded border w-full text-left cursor-pointer transition-all duration-200 ${
                      isSelected
                        ? isDarkMode
                          ? "bg-blue-600 border-blue-500 text-white shadow-lg"
                          : "bg-blue-600 border-blue-700 text-white shadow-lg"
                        : isDarkMode
                        ? "bg-[#3a3c4a] border-gray-600 text-gray-200 hover:bg-gray-700 hover:border-blue-400"
                        : "bg-white border-gray-200 hover:bg-[#f5f5f5] hover:border-[#0f1b4c]"
                    }`}
                    onClick={() => {
                      console.log('Clicked cinema:', cinema._id, cinema.name);
                      setSelectedCinemaId(cinema._id);
                    }}
                  >
                    <img
                      src="https://res.cloudinary.com/dd1vwmybp/image/upload/v1757904774/cinejoy/bynlzrloegzerc5ucbxw.png"
                      alt="CNJ"
                      className="w-9 h-9"
                    />
                    <span
                      className={`${
                        isSelected
                          ? "text-white font-semibold"
                          : isDarkMode
                          ? "text-gray-200"
                          : "text-gray-800"
                      }`}
                    >
                      {cinema.name}
                    </span>
                  </button>
                  );
                })
              )}
            </div>
          </div>

          {/* Right: Schedule */}
          <div className="flex-1">
            <div
              className={`${
                isDarkMode ? "border-gray-600" : "border-[#ddd]"
              } flex items-center gap-3 border rounded px-4 py-2 mb-4`}
            >
              <img
                className="w-10 h-10"
                src="https://res.cloudinary.com/dd1vwmybp/image/upload/v1757904774/cinejoy/bynlzrloegzerc5ucbxw.png"
                alt="logo"
              />
              <div className="select-none">
                <span
                  className={`${
                    isDarkMode ? "text-gray-100" : "text-[#333]"
                  } font-semibold`}
                >
                  Lịch chiếu{" "}
                  {
                    filteredCinemas.find((c) => c._id === selectedCinemaId)
                      ?.name
                  }
                </span>
                <div
                  className={`${
                    isDarkMode ? "text-gray-400" : "text-gray-600"
                  } text-sm`}
                >
                  {
                    filteredCinemas.find((c) => c._id === selectedCinemaId)
                      ?.location.address
                  }{" "}
                </div>
              </div>
            </div>
            {/* Date Tabs */}
            <div className="flex gap-2 mb-4">
              {dates.map((date) => (
                <button
                  key={date.value}
                  className={`w-[100px] p-2 rounded font-medium cursor-pointer text-center ${
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
            {/* Movie List */}
            <div className="flex flex-col gap-4 max-h-[500px] overflow-y-auto pr-2 pb-2">
              {loading ? (
                // Skeleton loading UI
                Array.from({ length: 2 }).map((_, idx) => (
                  <div
                    key={idx}
                    className={`flex gap-4 rounded-lg p-3 animate-pulse ${
                      isDarkMode ? "bg-[#23242a]" : "bg-gray-100"
                    }`}
                  >
                    <div
                      className="w-20 h-28 bg-gray-300 rounded"
                      style={{
                        backgroundColor: isDarkMode ? "#444" : "#e5e7eb",
                      }}
                    ></div>
                    <div className="flex-1 space-y-3 py-2">
                      <div
                        className="h-5 w-1/3 rounded bg-gray-300"
                        style={{
                          backgroundColor: isDarkMode ? "#444" : "#e5e7eb",
                        }}
                      ></div>
                      <div
                        className="h-4 w-1/2 rounded bg-gray-200"
                        style={{
                          backgroundColor: isDarkMode ? "#333" : "#f3f4f6",
                        }}
                      ></div>
                      <div className="flex gap-2 mt-2">
                        <div
                          className="h-7 w-16 rounded bg-gray-200"
                          style={{
                            backgroundColor: isDarkMode ? "#333" : "#f3f4f6",
                          }}
                        ></div>
                        <div
                          className="h-7 w-16 rounded bg-gray-200"
                          style={{
                            backgroundColor: isDarkMode ? "#333" : "#f3f4f6",
                          }}
                        ></div>
                        <div
                          className="h-7 w-16 rounded bg-gray-200"
                          style={{
                            backgroundColor: isDarkMode ? "#333" : "#f3f4f6",
                          }}
                        ></div>
                      </div>
                    </div>
                  </div>
                ))
              ) : Object.values(groupedShowtimes).length === 0 ? (
                <div
                  className={`flex flex-col items-center justify-center h-[320px] w-full ${
                    isDarkMode ? "bg-[#23242a]" : "bg-white"
                  } rounded-lg shadow border border-dashed ${
                    isDarkMode ? "border-gray-600" : "border-gray-200"
                  }`}
                  style={{ minHeight: 280 }}
                >
                  <img
                    src="https://cdn-icons-png.flaticon.com/512/2748/2748558.png"
                    alt="not found"
                    className="w-24 h-24 mb-4"
                    style={{
                      filter: isDarkMode
                        ? "grayscale(1) brightness(0.7)"
                        : "none",
                      opacity: 0.5,
                    }}
                  />
                  <div
                    className={`text-lg font-semibold text-center ${
                      isDarkMode ? "text-gray-300" : "text-gray-500"
                    }`}
                  >
                    Úi, Không tìm thấy suất chiếu.
                    <br />
                    <span className="font-normal text-base">
                      Bạn hãy thử tìm ngày khác nhé
                    </span>
                  </div>
                </div>
              ) : (
                Object.values(groupedShowtimes).map(
                  ({ movie, showtimes: movieShowtimes }) => (
                    <div
                      key={movie._id}
                      className={`${
                        isDarkMode
                          ? "bg-[#282a36] shadow-md"
                          : "bg-white shadow-sm"
                      } flex gap-4 rounded-lg p-3`}
                    >
                      <img
                        src={movie.image}
                        alt={movie.title}
                        className="w-20 h-28 object-cover rounded"
                      />
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span
                            className={`text-xs font-bold px-2 py-0.5 rounded text-white ${
                              movie.ageRating === "T18+"
                                ? "bg-red-500"
                                : movie.ageRating === "T15+"
                                ? "bg-yellow-500"
                                : movie.ageRating === "T12+"
                                ? "bg-yellow-400"
                                : "bg-green-500"
                            }`}
                          >
                            {movie.ageRating}
                          </span>
                          <span
                            className={`${
                              isDarkMode ? "text-blue-400" : "text-blue-900"
                            } font-bold`}
                          >
                            {movie.title}
                          </span>
                        </div>
                        <div
                          className={`${
                            isDarkMode ? "text-gray-400" : "text-gray-500"
                          } text-sm mb-2`}
                        >
                          {movie.genre.join(", ")}
                        </div>
                        <div className="flex gap-2 flex-wrap">
                          {movieShowtimes.map((showtime, idx) => (
                            <span
                              key={idx}
                              className={`${
                                isDarkMode
                                  ? "bg-[#3a3c4a] border-gray-600 text-gray-200 hover:bg-blue-700"
                                  : "bg-gray-50 border border-gray-300 text-gray-800 hover:bg-[#0f1b4c]"
                              } rounded px-2 py-0.5 text-sm cursor-pointer hover:text-white transition-all duration-250 ease-in-out`}
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
                                      poster: movie?.image,
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
                                    theaterId: selectedCinemaId, // Thêm theaterId ở level state
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
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  )
                )
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ScheduleList;
