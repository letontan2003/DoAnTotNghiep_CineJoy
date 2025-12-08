import axiosClient from "./axiosClient";

export const getShowTimes = async () => {
  try {
    const response = await axiosClient.get<IBackendResponse<IShowtime[]>>(
      `/showtimes`
    );
    return response.data;
  } catch (error) {
    console.error("Error fetching showtimes:", error);
    throw error;
  }
};

// API lấy tất cả showtime cho admin (bao gồm cả active và inactive)
export const getAllShowtimesForAdmin = async () => {
  try {
    const response = await axiosClient.get<IBackendResponse<IShowtime[]>>(
      `/showtimes/admin/all`
    );
    return response.data;
  } catch (error) {
    console.error("Error fetching all showtimes for admin:", error);
    throw error;
  }
};

export const createShowtime = async (showtimeData: Partial<IShowtime>) => {
  try {
    const response = await axiosClient.post<IBackendResponse<IShowtime>>(
      "/showtimes/add",
      showtimeData
    );
    return response.data;
  } catch (error) {
    console.error("Error creating showtime:", error);
    throw error;
  }
};

export const updateShowtime = async (
  id: string,
  showtimeData: Partial<IShowtime>
) => {
  try {
    const response = await axiosClient.put<IBackendResponse<IShowtime>>(
      `/showtimes/update/${id}`,
      showtimeData
    );
    return response.data;
  } catch (error) {
    console.error("Error updating showtime:", error);
    throw error;
  }
};

export const deleteShowtime = async (id: string) => {
  try {
    const response = await axiosClient.delete<IBackendResponse<IShowtime>>(
      `/showtimes/delete/${id}`
    );
    return response.data;
  } catch (error) {
    console.error("Error deleting showtime:", error);
    throw error;
  }
};

export const checkShowtimeOccupiedSeats = async (
  id: string
): Promise<{
  hasOccupiedSeats: boolean;
  occupiedCount: number;
  totalSeats: number;
}> => {
  try {
    const response = await axiosClient.get<
      IBackendResponse<{
        hasOccupiedSeats: boolean;
        occupiedCount: number;
        totalSeats: number;
      }>
    >(`/showtimes/check-occupied/${id}`);
    // Response format: { status: true, error: 0, message: '...', data: { hasOccupiedSeats, occupiedCount, totalSeats } }
    const responseData = response as unknown as {
      data: {
        data: {
          hasOccupiedSeats: boolean;
          occupiedCount: number;
          totalSeats: number;
        };
      };
    };
    return responseData.data?.data || response.data;
  } catch (error) {
    console.error("Error checking occupied seats:", error);
    throw error;
  }
};

export const getShowTimesByFilter = async (
  movieId: string,
  theaterId: string
) => {
  try {
    const response = await axiosClient.get<IShowtime[]>(
      `/showtimes/filter?movieId=${movieId}&theaterId=${theaterId}`
    );
    return response.data;
  } catch (error) {
    console.error("Error fetching showtimes by filter:", error);
    throw error;
  }
};

export const getShowTimesByTheater = async (theaterId: string) => {
  try {
    const response = await axiosClient.get<IShowtime[]>(
      `/showtimes/theater/${theaterId}`
    );
    return response.data;
  } catch (error) {
    console.error("Error fetching showtimes by theater:", error);
    throw error;
  }
};

// New: get flat showtimes list for a room and date
export const getShowtimesByRoomAndDateApi = async (
  roomId: string,
  date: string
) => {
  const response = await axiosClient.get(`/showtimes/by-room-date`, {
    params: { roomId, date },
  });
  return response.data as Array<{
    showtimeId: string;
    room: string;
    date: string;
    startTime: string;
    endTime: string;
    movieId: string;
  }>;
};

// Seat management APIs
export const getSeatsForShowtimeApi = async (
  showtimeId: string,
  date: string,
  startTime: string,
  room?: string
) => {
  // Debug: log all parameters
  console.log("getSeatsForShowtimeApi called with:", {
    showtimeId,
    date,
    startTime,
    room,
  });

  if (!showtimeId || showtimeId.trim() === "") {
    throw new Error("showtimeId is required and cannot be empty");
  }

  const params = new URLSearchParams({
    date,
    startTime,
    ...(room && { room }),
    _t: Date.now().toString(), // Cache busting
  });

  const url = `/showtimes/${showtimeId}/seats?${params.toString()}`;
  console.log("API URL:", url);

  const response = await axiosClient.get<
    IBackendResponse<{
      showtimeInfo: {
        _id: string;
        movie: IMovie;
        theater: ITheater;
        date: string;
        startTime: string;
        endTime: string;
        room: string;
      };
      seats: Array<{
        seatId: string;
        status: "available" | "occupied" | "reserved";
        type: "standard" | "vip" | "couple";
        price: number;
      }>;
      seatLayout: {
        rows: number;
        cols: number;
      };
    }>
  >(`/showtimes/${showtimeId}/seats?${params.toString()}`);

  console.log("getSeatsForShowtimeApi response:", response.data);
  console.log("getSeatsForShowtimeApi timestamp:", new Date().toISOString());
  return response.data;
};

export const bookSeatsApi = async (
  showtimeId: string,
  date: string,
  startTime: string,
  room: string,
  seatIds: string[]
) => {
  const response = await axiosClient.post<
    IBackendResponse<{
      message: string;
      reservedSeats: string[];
      showtimeId: string;
      reservationTime: string;
      reservationExpires: string;
    }>
  >(`/showtimes/${showtimeId}/book-seats`, {
    date,
    startTime,
    room,
    seatIds,
  });
  return response.data;
};

// Khởi tạo ghế cho showtime
export const initializeSeatsForShowtime = async (
  showtimeId: string,
  date: string,
  startTime: string,
  room?: string
) => {
  try {
    const response = await axiosClient.post<
      IBackendResponse<{ initialized: boolean }>
    >(`/showtimes/${showtimeId}/initialize-seats`, {
      date,
      startTime,
      room,
    });
    return response.data;
  } catch (error) {
    console.error("Error initializing seats:", error);
    throw error;
  }
};

// API mới cho seat reservation
export const getSeatsWithReservationStatusApi = async (
  showtimeId: string,
  date: string,
  startTime: string,
  room: string,
  isFromPaymentReturn: boolean = false
) => {
  try {
    const response = await axiosClient.get<
      IBackendResponse<
        Array<{
          seatId: string;
          status: string;
          reservedBy?: string;
          reservedUntil?: string;
          isReservedByMe: boolean;
        }>
      >
    >(`/v1/api/showtimes/seats-with-reservation`, {
      params: {
        showtimeId,
        date,
        startTime,
        room,
        fromPaymentReturn: isFromPaymentReturn.toString(),
        // Chỉ cache busting khi từ payment return để đảm bảo data mới
        ...(isFromPaymentReturn && { _t: Date.now().toString() }),
      },
    });

    console.log("getSeatsWithReservationStatusApi response:", response.data);
    console.log(
      "getSeatsWithReservationStatusApi timestamp:",
      new Date().toISOString()
    );
    console.log(
      "getSeatsWithReservationStatusApi isFromPaymentReturn:",
      isFromPaymentReturn
    );
    return response.data;
  } catch (error) {
    console.error("Error fetching seats with reservation status:", error);
    throw error;
  }
};

export const reserveSeatsApi = async (
  showtimeId: string,
  date: string,
  startTime: string,
  room: string,
  seatIds: string[]
) => {
  try {
    const response = await axiosClient.post<
      IBackendResponse<{
        seatIds: string[];
        reservedUntil: string;
      }>
    >(`/v1/api/showtimes/reserve-seats`, {
      showtimeId,
      date,
      startTime,
      room,
      seatIds,
    });
    return response.data;
  } catch (error) {
    console.error("Error reserving seats:", error);
    throw error;
  }
};

export const releaseSeatsApi = async (
  showtimeId: string,
  date: string,
  startTime: string,
  room: string,
  seatIds: string[]
) => {
  try {
    const response = await axiosClient.post<
      IBackendResponse<{ released: boolean }>
    >(`/v1/api/showtimes/release-by-user`, {
      showtimeId,
      date,
      startTime,
      room,
      seatIds,
      // Không cần gửi userId vì backend sẽ lấy từ auth middleware
    });
    return response.data;
  } catch (error) {
    console.error("Error releasing seats:", error);
    throw error;
  }
};

// API giải phóng tất cả ghế tạm giữ của user khi chọn suất chiếu mới
export const releaseUserReservedSeatsApi = async () => {
  try {
    const response = await axiosClient.post<
      IBackendResponse<{ released: number; releasedSeats: string[] }>
    >(`/v1/api/showtimes/release-user-seats`);
    return response.data;
  } catch (error) {
    console.error("Error releasing user reserved seats:", error);
    throw error;
  }
};

// API kiểm tra xem showtime có ghế đã đặt không
export const checkOccupiedSeatsApi = async (
  showtimeId: string
): Promise<{
  hasOccupiedSeats: boolean;
  occupiedCount: number;
  totalSeats: number;
}> => {
  try {
    const response = await axiosClient.get(
      `/showtimes/check-occupied/${showtimeId}`
    );
    return response.data.data;
  } catch (error) {
    console.error("Error checking occupied seats:", error);
    throw error;
  }
};

// API kiểm tra từng suất chiếu có ghế đã đặt không
export const checkEachShowtimeOccupiedSeatsApi = async (
  showtimeId: string
): Promise<{
  showtimes: Array<{
    index: number;
    hasOccupiedSeats: boolean;
    occupiedCount: number;
    totalSeats: number;
  }>;
}> => {
  try {
    const response = await axiosClient.get(
      `/showtimes/check-each-occupied/${showtimeId}`
    );
    return response.data.data;
  } catch (error) {
    console.error("Error checking each showtime occupied seats:", error);
    throw error;
  }
};
