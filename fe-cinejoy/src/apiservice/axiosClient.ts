import axios from "axios";

const axiosClient = axios.create({
    baseURL: "http://localhost:5000",
    headers: {
        "Content-Type": "application/json",
    },
});

// Add response interceptor for error handling
axiosClient.interceptors.response.use(
  function (response) {
    return response;
  },
  function (error) {
    // Với các lỗi (400, 500, etc.), throw error với message từ backend
    if (error && error.response && error.response.data) {
      const backendError = new Error(error.response.data.message || "Có lỗi xảy ra!");
      (backendError as Error & { response?: unknown }).response = error.response;
      return Promise.reject(backendError);
    }
    return Promise.reject(error);
  }
);

export default axiosClient;