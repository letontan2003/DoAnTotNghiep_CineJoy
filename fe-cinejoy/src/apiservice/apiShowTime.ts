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
