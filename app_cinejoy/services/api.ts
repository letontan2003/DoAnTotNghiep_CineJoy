/* eslint-disable @typescript-eslint/no-explicit-any */
import createInstanceAxios from "services/axios.customize";
import config from "../config/env";
import { IBackendResponse, IRegister, ILogin, IMovie } from "types/api";

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
  const response = await axios.post<IBackendResponse<IRegister>>(
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
  return allMovies.filter(movie => movie.status === status);
};

// Hàm helper để lấy movies theo nhiều status
export const getMoviesByMultipleStatusApi = async (statuses: string[]) => {
  const allMovies = await getAllMoviesApi();
  return allMovies.filter(movie => statuses.includes(movie.status));
};

export default axios;