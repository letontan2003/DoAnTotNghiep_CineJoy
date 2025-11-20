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
  IFoodCombo,
  IBlog,
  IUser,
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

export const updateUserApi = async (
  userId: string,
  data: {
    fullName?: string;
    phoneNumber?: string;
    gender?: string;
    avatar?: string;
    dateOfBirth?: string;
  }
) => {
  const response = await axios.put<IBackendResponse<IUser>>(
    `/v1/api/user/${userId}`,
    data
  );
  return response.data;
};

export const verifyPasswordApi = async (data: { password: string }) => {
  const response = await axios.post<IBackendResponse<null>>(
    "/v1/api/auth/verify-password",
    data
  );
  return response.data;
};

export const changePasswordApi = async (data: {
  currentPassword: string;
  newPassword: string;
}) => {
  const response = await axios.post<IBackendResponse<null>>(
    "/v1/api/auth/change-password",
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

// Food combo APIs
export const getFoodCombosApi = async (): Promise<IFoodCombo[]> => {
  try {
    const response = await axios.get<IFoodCombo[]>("/foodcombos");
    return response.data || [];
  } catch (error) {
    console.error("Error fetching food combos:", error);
    return [];
  }
};

export const getActiveItemPromotionsApi = async () => {
  const response = await axios.get<IBackendResponse<any[]>>(
    "/v1/api/vouchers/item-promotions"
  );
  return response.data;
};

export const applyItemPromotionsApi = async (
  selectedCombos: Array<{ comboId: string; quantity: number; name: string }>,
  appliedPromotions: any[] = [],
  selectedSeats?: Array<{ seatId: string; type: string; price: number }>
) => {
  const response = await axios.post<
    IBackendResponse<{
      applicablePromotions: any[];
      totalRewardItems: number;
    }>
  >("/v1/api/vouchers/apply-item-promotions", {
    selectedCombos,
    appliedPromotions,
    selectedSeats,
  });
  return response.data;
};

export const applyPercentPromotionsApi = async (
  selectedCombos: Array<{
    comboId: string;
    quantity: number;
    name: string;
    price: number;
  }>,
  appliedPromotions: any[] = [],
  selectedSeats?: Array<{ seatId: string; type: string; price: number }>
) => {
  const response = await axios.post<
    IBackendResponse<{
      applicablePromotions: any[];
      totalDiscountAmount: number;
    }>
  >("/v1/api/vouchers/apply-percent-promotions", {
    selectedCombos,
    appliedPromotions,
    selectedSeats,
  });
  return response.data;
};

export const validateVoucherApi = async (code: string, userId?: string) => {
  const response = await axios.post<IBackendResponse<any>>(
    "/v1/user-vouchers/validate",
    { code, userId }
  );
  return response.data;
};

export const applyVoucherApi = async (
  code: string,
  orderTotal: number,
  userId?: string
) => {
  const response = await axios.post<
    IBackendResponse<{
      discountAmount: number;
      finalTotal: number;
      userVoucherId: string;
    }>
  >("/v1/user-vouchers/apply", { code, orderTotal, userId });
  return response.data;
};

export const getAmountDiscountApi = async (orderTotal: number) => {
  const response = await axios.post<
    IBackendResponse<{
      discountAmount: number;
      description: string;
      minOrderValue: number;
      discountValue: number;
    } | null>
  >("/v1/api/vouchers/amount-discount", {
    orderTotal,
  });
  return response.data;
};

export const createOrderApi = async (orderData: {
  userId: string;
  movieId: string;
  theaterId: string;
  showtimeId: string;
  showDate: string;
  showTime: string;
  room: string;
  seats: Array<{ seatId: string; type: string; price: number }>;
  foodCombos: Array<{ comboId: string; quantity: number; price: number }>;
  voucherId?: string | null;
  paymentMethod: "MOMO" | "VNPAY";
  customerInfo: { fullName: string; phoneNumber: string; email: string };
}) => {
  try {
    const response = await axios.post<IBackendResponse<any>>(
      "/v1/api/orders",
      orderData
    );
    return response.data;
  } catch (error: any) {
    const status = error?.response?.status ?? 500;
    const message =
      error?.response?.data?.message || error?.message || "Request failed";
    return {
      status: false,
      error: status,
      message,
      data: null,
    } as IBackendResponse<any>;
  }
};

export const processPaymentApi = async (
  orderId: string,
  paymentData: {
    paymentMethod: "MOMO" | "VNPAY";
    returnUrl: string;
    cancelUrl: string;
  }
) => {
  try {
    const response = await axios.post<IBackendResponse<any>>(
      `/v1/api/orders/${orderId}/payment`,
      paymentData
    );
    return response.data;
  } catch (error: any) {
    const status = error?.response?.status ?? 500;
    const message =
      error?.response?.data?.message || error?.message || "Request failed";
    return {
      status: false,
      error: status,
      message,
      data: null,
    } as IBackendResponse<any>;
  }
};

export const getOrderByIdApi = async (orderId: string) => {
  try {
    const response = await axios.get<IBackendResponse<any>>(
      `/v1/api/orders/${orderId}`
    );
    return response.data;
  } catch (error: any) {
    const status = error?.response?.status ?? 500;
    const message =
      error?.response?.data?.message || error?.message || "Request failed";
    return {
      status: false,
      error: status,
      message,
      data: null,
    } as IBackendResponse<any>;
  }
};

export const getUserOrderDetailsApi = async (orderId: string) => {
  try {
    const response = await axios.get<IBackendResponse<any>>(
      `/v1/api/orders/details/${orderId}`
    );
    return response.data;
  } catch (error: any) {
    const status = error?.response?.status ?? 500;
    const message =
      error?.response?.data?.message || error?.message || "Request failed";
    return {
      status: false,
      error: status,
      message,
      data: null,
    } as IBackendResponse<any>;
  }
};

export const getUserBookingHistoryApi = async () => {
  try {
    const response = await axios.get<IBackendResponse<any[]>>(
      "/v1/api/orders/history"
    );
    return response.data;
  } catch (error: any) {
    const status = error?.response?.status ?? 500;
    const message =
      error?.response?.data?.message || error?.message || "Request failed";
    return {
      status: false,
      error: status,
      message,
      data: null,
    } as IBackendResponse<any[]>;
  }
};

export const getVisibleBlogsApi = async () => {
  try {
    const response = await axios.get<IBlog[]>("/blogs/visible");
    return response.data;
  } catch (error: any) {
    console.error("getVisibleBlogsApi error:", error);
    return [];
  }
};

export const getBlogByIdApi = async (blogId: string) => {
  try {
    const response = await axios.get<IBlog>(`/blogs/${blogId}`);
    return response.data;
  } catch (error: any) {
    console.error("getBlogByIdApi error:", error);
    return null;
  }
};

export default axios;
