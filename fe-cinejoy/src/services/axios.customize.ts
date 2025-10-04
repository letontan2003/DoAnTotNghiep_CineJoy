import axios from "axios";
import { Mutex } from "async-mutex";

const mutex = new Mutex();

const createInstanceAxios = (baseURL: string) => {
  const instance = axios.create({
    baseURL: baseURL,
    withCredentials: true,
  });

  const handleRefreshToken = async () => {
    return await mutex.runExclusive(async () => {
      const res = await instance.post<IBackendResponse<IRefreshToken>>(
        "/v1/api/auth/refreshToken"
      );
      if (res && res.data) return res.data.data?.accessToken;
      else return null;
    });
  };

  // Add a request interceptor
  instance.interceptors.request.use(
    function (config) {
      const token = localStorage.getItem("accessToken");
      const auth = token ? `Bearer ${token}` : "";
      config.headers!["Authorization"] = auth;

      return config;
    },
    function (error) {
      return Promise.reject(error);
    }
  );

  // Add a response interceptor
  instance.interceptors.response.use(
    function (response) {
      return response;
    },
    async function (error) {
      if (error.config && error.response && +error.response.status === 401) {
        const access_token = await handleRefreshToken();
        if (access_token) {
          error.config.headers["Authorization"] = `Bearer ${access_token}`;
          localStorage.setItem("accessToken", access_token);
          return instance.request(error.config);
        }
      }

      if (error && error.response && error.response.data) {
        return error.response.data;
      }
      return Promise.reject(error);
    }
  );

  return instance;
};

export default createInstanceAxios;
