import axiosClient from "./axiosClient";

// Order APIs
export const createOrder = async (
  orderData: CreateOrderRequest
): Promise<IOrder> => {
  const res = await axiosClient.post<IOrder>("/v1/api/orders", orderData);
  return res.data;
};

export const getOrderById = async (orderId: string): Promise<IOrder> => {
  const res = await axiosClient.get<IOrder>(`/v1/api/orders/${orderId}`);
  return res.data;
};

export const getOrderByCode = async (orderCode: string): Promise<IOrder> => {
  const res = await axiosClient.get<IOrder>(`/v1/api/orders/code/${orderCode}`);
  return res.data;
};

export const getUserBookingHistory = async (): Promise<IOrder[]> => {
  const res = await axiosClient.get<IBackendResponse<IOrder[]>>("/v1/api/orders/history");
  return res.data.data || [];
};

export const getUserOrderDetails = async (orderId: string): Promise<IOrder> => {
  const res = await axiosClient.get<IBackendResponse<IOrder>>(`/v1/api/orders/details/${orderId}`);
  return res.data.data!;
};

export const getOrdersByUserId = async (
  userId: string,
  page: number = 1,
  limit: number = 10
): Promise<{
  orders: IOrder[];
  totalPages: number;
  currentPage: number;
  totalOrders: number;
}> => {
  const res = await axiosClient.get(
    `/v1/api/orders/user/${userId}?page=${page}&limit=${limit}`
  );
  return res.data as {
    orders: IOrder[];
    totalPages: number;
    currentPage: number;
    totalOrders: number;
  };
};

export const cancelOrder = async (
  orderId: string,
  reason?: string
): Promise<IOrder> => {
  const res = await axiosClient.post<IOrder>(
    `/v1/api/orders/${orderId}/cancel`,
    {
      reason,
    }
  );
  return res.data;
};

// Payment APIs
export const createPayment = async (
  orderId: string,
  paymentData: CreatePaymentRequest
): Promise<{
  paymentId: string;
  paymentUrl: string;
  orderId: string;
  orderCode: string;
  amount: number;
}> => {
  const res = await axiosClient.post(
    `/v1/api/orders/${orderId}/payment`,
    paymentData
  );
  return res.data as {
    paymentId: string;
    paymentUrl: string;
    orderId: string;
    orderCode: string;
    amount: number;
  };
};

export const getPaymentById = async (paymentId: string): Promise<IPayment> => {
  const res = await axiosClient.get<IPayment>(`/v1/api/payments/${paymentId}`);
  return res.data;
};

export const getPaymentByOrderId = async (
  orderId: string
): Promise<IPayment> => {
  const res = await axiosClient.get<IPayment>(
    `/v1/api/payments/order/${orderId}`
  );
  return res.data;
};

// Admin APIs
export const getAllOrders = async (
  page: number = 1,
  limit: number = 10
): Promise<{
  orders: IOrder[];
  totalPages: number;
  currentPage: number;
  totalOrders: number;
}> => {
  const res = await axiosClient.get(
    `/v1/api/orders?page=${page}&limit=${limit}`
  );
  // Backend returns {status, error, message, data: result}
  return res.data.data as {
    orders: IOrder[];
    totalPages: number;
    currentPage: number;
    totalOrders: number;
  };
};

export const getOrderStats = async (): Promise<{
  totalOrders: number;
  totalRevenue: number;
  pendingOrders: number;
  completedOrders: number;
  cancelledOrders: number;
  todayOrders: number;
  todayRevenue: number;
}> => {
  const res = await axiosClient.get("/v1/api/orders/stats");
  return res.data as {
    totalOrders: number;
    totalRevenue: number;
    pendingOrders: number;
    completedOrders: number;
    cancelledOrders: number;
    todayOrders: number;
    todayRevenue: number;
  };
};

export const getPaymentStats = async (): Promise<{
  totalPayments: number;
  successfulPayments: number;
  failedPayments: number;
  totalAmount: number;
  todayPayments: number;
  todayAmount: number;
}> => {
  const res = await axiosClient.get("/v1/api/payments/stats");
  return res.data as {
    totalPayments: number;
    successfulPayments: number;
    failedPayments: number;
    totalAmount: number;
    todayPayments: number;
    todayAmount: number;
  };
};
