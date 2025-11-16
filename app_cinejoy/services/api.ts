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

export default axios;
