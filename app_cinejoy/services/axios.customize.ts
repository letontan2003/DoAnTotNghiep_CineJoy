import axios from "axios";
import { Mutex } from "async-mutex";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { IBackendResponse, IRefreshToken } from "types/api";

const mutex = new Mutex();

const createInstanceAxios = (baseURL: string) => {
  const instance = axios.create({
    baseURL: baseURL,
    timeout: 10000,
    headers: {
      'Content-Type': 'application/json',
    },
  });

  const handleRefreshToken = async () => {
    return await mutex.runExclusive(async () => {
      try {
        const res = await instance.post<IBackendResponse<IRefreshToken>>(
          "/v1/api/auth/refreshToken"
        );
        if (res && res.data) return res.data.data?.accessToken;
        else return null;
      } catch (error) {
        console.error('Refresh token failed:', error);
        return null;
      }
    });
  };

  // Add a request interceptor
  instance.interceptors.request.use(
    async function (config) {
      try {
        const token = await AsyncStorage.getItem("accessToken");
        const auth = token ? `Bearer ${token}` : "";
        config.headers!["Authorization"] = auth;
      } catch (error) {
        console.error('Error getting token from AsyncStorage:', error);
      }

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
      const originalRequest = error.config;

      if (originalRequest && error.response && +error.response.status === 401 && !originalRequest._retry) {
        originalRequest._retry = true;
        
        const access_token = await handleRefreshToken();
        if (access_token) {
          originalRequest.headers["Authorization"] = `Bearer ${access_token}`;
          try {
            await AsyncStorage.setItem("accessToken", access_token);
          } catch (storageError) {
            console.error('Error saving token to AsyncStorage:', storageError);
          }
          return instance.request(originalRequest);
        } else {
          // Refresh token failed, redirect to login or clear storage
          try {
            await AsyncStorage.removeItem("accessToken");
            await AsyncStorage.removeItem("refreshToken");
          } catch (storageError) {
            console.error('Error clearing tokens:', storageError);
          }
          // You can add navigation logic here if needed
          // NavigationService.navigate('Login');
        }
      }

      if (error && error.response && error.response.data) {
        return error.response.data;
      }
      
      // Nếu không có response.data, trả về structured error
      return {
        status: false,
        error: error?.response?.status || 500,
        message: error?.message || 'Network request failed',
        data: null
      };
    }
  );

  return instance;
};

export default createInstanceAxios;
