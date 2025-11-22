/* eslint-disable @typescript-eslint/no-explicit-any */
import createInstanceAxios from "services/axios.customize";

const axios = createInstanceAxios(import.meta.env.VITE_BACKEND_URL);

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

export const verifyCurrentPasswordApi = async (data: {
  password: string;
}) => {
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

export const getAllUsersApi = async () => {
  const response = await axios.get<IBackendResponse<IUser[]>>(
    "/v1/api/user"
  );
  return response.data;
};

export const getUserByIdApi = async (id: string) => {
  const response = await axios.get<IBackendResponse<IUser>>(
    `/v1/api/user/${id}`
  );
  return response.data;
};

export const createUserApi = async (data: {
  fullName: string;
  email: string;
  password: string;
  phoneNumber: string;
  gender: string;
  avatar: string;
  dateOfBirth: string;
  role: string;
  isActive?: boolean;
}) => {
  const response = await axios.post<IBackendResponse<IUser>>(
    "/v1/api/user",
    data
  );
  return response.data;
};

export const updateUserApi = async (
  id: string,
  data: {
    fullName?: string;
    phoneNumber?: string;
    gender?: string;
    avatar?: string;
    dateOfBirth?: string;
    role?: string;
    isActive?: boolean;
    settings?: { darkMode: boolean };
  }
) => {
  const response = await axios.put<IBackendResponse<IUser>>(
    `/v1/api/user/${id}`,
    data
  );
  return response.data;
};

export const updateUserPointsApi = async (
  id: string,
  points: number
) => {
  const response = await axios.put<IBackendResponse<IUser>>(
    `/v1/api/user/${id}/points`,
    { point: points }
  );
  return response.data;
};

export const addBirthdayPointsApi = async (
  id: string,
  pointsToAdd: number = 100
) => {
  const response = await axios.post<IBackendResponse<{
    user: IUser;
    pointsAdded: number;
    newTotalPoints: number;
  }>>(
    `/v1/api/user/${id}/birthday-points`,
    { pointsToAdd }
  );
  return response.data;
};

export const deleteUserApi = async (id: string) => {
  const response = await axios.delete<IBackendResponse<null>>(
    `/v1/api/user/${id}`
  );
  return response.data;
};

export const uploadAvatarApi = async (file: File) => {
  const formData = new FormData();
  formData.append("image", file);
  const response = await axios.post<IBackendResponse<IUpload | null>>(
    "/v1/api/upload",
    formData,
    {
      headers: {
        "Content-Type": "multipart/form-data",
      },
      withCredentials: true,
    }
  );
  return response.data;
};

export const getMyVouchersApi = async () => {
  const response = await axios.get<IBackendResponse<IUserVoucher[]>>(
    "/v1/api/vouchers/my-vouchers"
  );
  return response.data;
};

export const redeemVoucherApi = async (voucherId: string, detailId?: string) => {
  const response = await axios.post<IBackendResponse<IUserVoucher>>(
    "/v1/api/vouchers/redeem",
    {
      voucherId,
      detailId,
    }
  );
  return response.data;
};

export const searchMoviesApi = async (keyword: string) => {
  const response = await axios.get<IBackendResponse<IMovie[]>>(
    `/movies/search?q=${keyword}`
  );
  return response.data;
};

export const validateVoucherApi = async (code: string, userId?: string) => {
  const response = await axios.post<IBackendResponse<any>>(
    "/v1/user-vouchers/validate",
    {
      code,
      userId,
    }
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

export const markVoucherAsUsedApi = async (
  code?: string,
  userVoucherId?: string
) => {
  const response = await axios.put<IBackendResponse<unknown>>(
    "/v1/user-vouchers/mark-used",
    {
      code,
      userVoucherId,
    }
  );
  return response.data;
};

// API cho khuyến mãi hàng
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
  const response = await axios.post<IBackendResponse<{
    applicablePromotions: any[];
    totalRewardItems: number;
  }>>("/v1/api/vouchers/apply-item-promotions", {
    selectedCombos,
    appliedPromotions,
    selectedSeats
  });
  return response.data;
};

export const getActivePercentPromotionsApi = async () => {
  const response = await axios.get<IBackendResponse<any[]>>(
    "/v1/api/vouchers/percent-promotions"
  );
  return response.data;
};

export const applyPercentPromotionsApi = async (
  selectedCombos: Array<{ comboId: string; quantity: number; name: string; price: number }>,
  appliedPromotions: any[] = [],
  selectedSeats?: Array<{ seatId: string; type: string; price: number }>
) => {
  const response = await axios.post<IBackendResponse<{
    applicablePromotions: any[];
    totalDiscountAmount: number;
  }>>("/v1/api/vouchers/apply-percent-promotions", {
    selectedCombos,
    appliedPromotions,
    selectedSeats
  });
  return response.data;
};

// Room APIs
export const getAllRoomsApi = async () => {
  const response = await axios.get('/rooms');
  return response.data;
};

export const getRoomsByTheaterApi = async (theaterId: string) => {
  const response = await axios.get(`/rooms/theater/${theaterId}`);
  return response.data;
};

export const getActiveRoomsByTheaterApi = async (theaterId: string) => {
  const response = await axios.get(`/rooms/theater/${theaterId}/active`);
  return response.data;
};

export const getRoomByIdApi = async (roomId: string) => {
  const response = await axios.get(`/rooms/${roomId}`);
  return response.data;
};

export const createRoomApi = async (roomData: any) => {
  const response = await axios.post('/rooms', roomData);
  return response.data;
};

export const updateRoomApi = async (roomId: string, roomData: any) => {
  const response = await axios.put(`/rooms/${roomId}`, roomData);
  return response.data;
};

export const deleteRoomApi = async (roomId: string) => {
  await axios.delete(`/rooms/${roomId}`);
};

// Seat APIs
export const getAllSeatsApi = async () => {
  const response = await axios.get('/seats');
  return response.data;
};

export const getSeatsByRoomApi = async (roomId: string) => {
  const response = await axios.get(`/seats/room/${roomId}`);
  return response.data;
};

export const getSeatStatisticsApi = async (roomId: string) => {
  const response = await axios.get(`/seats/room/${roomId}/statistics`);
  return response.data;
};

export const getSeatByIdApi = async (seatId: string) => {
  const response = await axios.get(`/seats/${seatId}`);
  return response.data;
};

export const createSeatApi = async (seatData: any) => {
  const response = await axios.post('/seats', seatData);
  return response.data;
};

export const createMultipleSeatsApi = async (seats: any[]) => {
  const response = await axios.post('/seats/bulk', { seats });
  return response.data;
};

export const generateSeatLayoutApi = async (roomId: string, layoutData: any) => {
  const response = await axios.post(`/seats/room/${roomId}/generate-layout`, layoutData);
  return response.data;
};

export const updateSeatApi = async (seatId: string, seatData: any) => {
  const response = await axios.put(`/seats/${seatId}`, seatData);
  return response.data;
};

export const deleteSeatApi = async (seatId: string) => {
  await axios.delete(`/seats/${seatId}`);
};

export const deleteAllSeatsInRoomApi = async (roomId: string) => {
  await axios.delete(`/seats/room/${roomId}/all`);
};

// Book seats API - đặt ghế với trạng thái selected
export const bookSeatsApi = async (data: {
  showtimeId: string;
  date: string;
  startTime: string;
  room: string;
  seatIds: string[];
  userId?: string;
}) => {
  try {
    const response = await axios.post<IBackendResponse<any>>(
      "/showtimes/book-seats",
      data
    );
    return response.data;
  } catch (error: any) {
    const status = error?.response?.status ?? 500;
    const message = error?.response?.data?.message || error?.message || 'Request failed';
    
    return {
      status: false,
      error: status,
      message,
      data: null,
    } as unknown as IBackendResponse<any>;
  }
};

// Release seats by user
export const releaseSeatsByUserApi = async (data: {
  showtimeId: string;
  date: string;
  startTime: string;
  room: string;
  seatIds: string[];
  userId: string;
}) => {
  try {
    const response = await axios.post<IBackendResponse<any>>(
      "/showtimes/release-by-user",
      data
    );
    return response.data;
  } catch (error: any) {
    const status = error?.response?.status ?? 500;
    const message = error?.response?.data?.message || error?.message || 'Request failed';
    return { status: false, error: status, message, data: null } as unknown as IBackendResponse<any>;
  }
};

// Order APIs
export const createOrderApi = async (orderData: {
  userId: string;
  movieId: string;
  theaterId: string;
  showtimeId: string;
  showDate: string;
  showTime: string;
  room: string;
  seats: Array<{
    seatId: string;
    type: string;
    price: number;
  }>;
  foodCombos: Array<{
    comboId: string;
    quantity: number;
    price: number;
  }>;
  voucherId?: string | null;
  paymentMethod: 'MOMO' | 'VNPAY';
  customerInfo: {
    fullName: string;
    phoneNumber: string;
    email: string;
  };
}) => {
  try {
    const response = await axios.post<IBackendResponse<any>>(
      "/v1/api/orders",
      orderData
    );
    return response.data;
  } catch (error: any) {
    // Trả object chuẩn để UI luôn có message
    const status = error?.response?.status ?? 500;
    const message = error?.response?.data?.message || error?.message || 'Request failed';
    return {
      status: false,
      error: status,
      message,
      data: null,
    } as unknown as IBackendResponse<any>;
  }
};

export const processPaymentApi = async (
  orderId: string,
  paymentData: {
    paymentMethod: 'MOMO' | 'VNPAY';
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
    const message = error?.response?.data?.message || error?.message || 'Request failed';
    return {
      status: false,
      error: status,
      message,
      data: null,
    } as unknown as IBackendResponse<any>;
  }
};