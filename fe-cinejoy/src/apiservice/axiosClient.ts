import axios from "axios";

const API_BASE_URL =
  import.meta.env.VITE_BACKEND_URL || "http://localhost:5000";

const axiosClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// Add request interceptor to include auth token
axiosClient.interceptors.request.use(
  function (config) {
    const token = localStorage.getItem("accessToken");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  function (error) {
    return Promise.reject(error);
  }
);

// Add response interceptor for error handling
axiosClient.interceptors.response.use(
  function (response) {
    return response;
  },
  function (error) {
    // Với các lỗi (400, 500, etc.), throw error với message từ backend
    if (error && error.response && error.response.data) {
      const backendError = new Error(
        error.response.data.message || "Có lỗi xảy ra!"
      );
      (backendError as Error & { response?: unknown }).response =
        error.response;
      return Promise.reject(backendError);
    }
    return Promise.reject(error);
  }
);

export default axiosClient;
