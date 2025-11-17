/* eslint-disable @typescript-eslint/no-explicit-any */
import createInstanceAxios from "services/axios.customize";
import config from "../config/env";
import {
  IBackendResponse,
  IRegister,
  ILogin,
  IMovie,
  IFetchAccount,
  IRegion,
  ITheater,
  IShowtime,
} from "types/api";

const axios = createInstanceAxios(config.API_URL);

// Auth APIs
export const registerApi = async (data: {
  email: string;
  password: string;
  fullName: string;
  dateOfBirth: string;
  avatar?: string;
  gender: string;
  role?: string;
  phoneNumber: string;
}) => {
  const response = await axios.post<IBackendResponse<ILogin>>(
    "/v1/api/auth/register",
    data
  );
  return response.data;
};

export const loginApi = async (data: { email: string; password: string }) => {
  const response = await axios.post<IBackendResponse<ILogin>>(
    "/v1/api/auth/login",
    data,
    {
      headers: {
        delay: 2000,
      },
    }
  );
  return response.data;
};

export const logoutApi = async () => {
  const response = await axios.post<IBackendResponse<null>>(
    "/v1/api/auth/logout"
  );
  return response.data;
};

export const forgotPasswordApi = async (data: { email: string }) => {
  const response = await axios.post<IBackendResponse<null>>(
    "/v1/api/auth/forgotPassword",
    data
  );
  return response.data;
};

export const verifyOtpApi = async (data: { email: string; otp: string }) => {
  const response = await axios.post<IBackendResponse<null>>(
    "/v1/api/auth/verifyOtp",
    data
  );
  return response.data;
};

export const resetPasswordApi = async (data: {
  email: string;
  newPassword: string;
}) => {
  const response = await axios.post<IBackendResponse<null>>(
    "/v1/api/auth/resetPassword",
    data
  );
  return response.data;
};

export const fetchAccountApi = async () => {
  const response = await axios.get<IBackendResponse<IFetchAccount>>(
    "/v1/api/auth/account",
    {
      headers: {
        delay: 1000,
      },
    }
  );
  return response.data;
};

// Movie APIs
export const getAllMoviesApi = async () => {
  const response = await axios.get<IMovie[]>("/movies");
  return response.data;
};

export const getMovieByIdApi = async (id: string) => {
  const response = await axios.get<IMovie>(`/movies/${id}`);
  return response.data;
};

// Lọc movies theo status từ danh sách tất cả movies
export const getMoviesByStatusApi = async (status: string) => {
  const allMovies = await getAllMoviesApi();
  return allMovies.filter((movie) => movie.status === status);
};

// Hàm helper để lấy movies theo nhiều status
export const getMoviesByMultipleStatusApi = async (statuses: string[]) => {
  const allMovies = await getAllMoviesApi();
  return allMovies.filter((movie) => statuses.includes(movie.status));
};

// Region APIs
export const getRegionsApi = async () => {
  const response = await axios.get<IRegion[]>("/regions");
  return response.data;
};

// Theater APIs
export const getTheatersApi = async () => {
  const response = await axios.get<ITheater[]>("/theaters");
  return response.data;
};

export const getTheaterByIdApi = async (id: string) => {
  const response = await axios.get<ITheater>(`/theaters/${id}`);
  return response.data;
};

// Showtime APIs
export const getShowtimesApi = async () => {
  const response = await axios.get<IShowtime[]>("/showtimes");
  return response.data;
};

export const getShowtimesByTheaterMovieApi = async (
  theaterId: string,
  movieId: string
) => {
  const response = await axios.get<IShowtime[]>(`/showtimes/filter`, {
    params: { theaterId, movieId },
  });
  return response.data;
};

// Seat APIs
export const getSeatsForShowtimeApi = async (
  showtimeId: string,
  date: string,
  startTime: string,
  room?: string
) => {
  const params: any = {
    date,
    startTime,
    _t: Date.now().toString(),
  };
  if (room) {
    params.room = room;
  }
  const response = await axios.get<
    IBackendResponse<{
      showtimeInfo: any;
      seats: Array<{
        seatId: string;
        status:
          | "available"
          | "occupied"
          | "reserved"
          | "selected"
          | "maintenance";
        type: "normal" | "vip" | "couple" | "4dx";
        price?: number;
      }>;
      seatLayout: {
        rows: number;
        cols: number;
      };
    }>
  >(`/showtimes/${showtimeId}/seats`, { params });
  return response.data;
};

export const getSeatsWithReservationStatusApi = async (
  showtimeId: string,
  date: string,
  startTime: string,
  room: string,
  isFromPaymentReturn: boolean = false
) => {
  const params: any = {
    showtimeId,
    date,
    startTime,
    room,
    fromPaymentReturn: isFromPaymentReturn.toString(),
  };
  if (isFromPaymentReturn) {
    params._t = Date.now().toString();
  }
  const response = await axios.get<
    IBackendResponse<
      Array<{
        seatId: string;
        status: string;
        reservedBy?: string;
        reservedUntil?: string;
        isReservedByMe: boolean;
      }>
    >
  >(`/v1/api/showtimes/seats-with-reservation`, { params });
  return response.data;
};

export const reserveSeatsApi = async (
  showtimeId: string,
  date: string,
  startTime: string,
  room: string,
  seatIds: string[]
) => {
  const response = await axios.post<
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
};

// Price List APIs
export interface IPriceListLine {
  type: "ticket" | "combo" | "single";
  seatType?: "normal" | "vip" | "couple" | "4dx";
  productId?: string;
  productName?: string;
  price: number;
}

export interface IPriceList {
  _id: string;
  code: string;
  name: string;
  description?: string;
  startDate: string;
  endDate: string;
  status: "active" | "scheduled" | "expired";
  lines: IPriceListLine[];
  createdAt: string;
  updatedAt: string;
}

export const getCurrentPriceListApi = async (): Promise<IPriceList | null> => {
  try {
    const response = await axios.get<IPriceList>("/price-lists/current");
    if (response.data && response.data.lines) {
      return response.data;
    }
    return null;
  } catch (error: any) {
    console.error("Error fetching current price list:", error);
    return null;
  }
};

export default axios;
