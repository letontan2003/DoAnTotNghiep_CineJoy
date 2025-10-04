import axiosClient from "./axiosClient";

export interface IPriceListLine {
  type: 'ticket' | 'combo' | 'single';
  seatType?: 'normal' | 'vip' | 'couple' | '4dx';
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
  status: 'active' | 'scheduled' | 'expired';
  lines: IPriceListLine[];
  createdAt: string;
  updatedAt: string;
}

export interface ICreatePriceListData {
  code: string;
  name: string;
  description?: string;
  startDate: string;
  endDate: string;
  // lines có thể bỏ trống khi tạo mới header, sẽ thêm sau trong chi tiết
  lines?: IPriceListLine[];
}

export interface IUpdatePriceListData {
  code?: string;
  name?: string;
  description?: string;
  startDate?: string;
  endDate?: string;
  lines?: IPriceListLine[];
}

export interface IProductsForPriceList {
  combos: Array<{ _id: string; name: string; price: number }>;
  singleProducts: Array<{ _id: string; name: string; price: number }>;
}

// Lấy tất cả bảng giá
export const getAllPriceLists = async (): Promise<IPriceList[]> => {
  const response = await axiosClient.get("/price-lists");
  return response.data as IPriceList[];
};

// Lấy bảng giá theo ID
export const getPriceListById = async (id: string): Promise<IPriceList> => {
  const response = await axiosClient.get(`/price-lists/${id}`);
  return response.data as IPriceList;
};

// Lấy bảng giá hiện tại
export const getCurrentPriceList = async (): Promise<IPriceList | null> => {
  const response = await axiosClient.get("/price-lists/current");
  return response.data as IPriceList | null;
};

// Tạo bảng giá mới
export const createPriceList = async (data: ICreatePriceListData): Promise<IPriceList> => {
  const response = await axiosClient.post("/price-lists", data);
  return response.data as IPriceList;
};

// Cập nhật bảng giá
export const updatePriceList = async (id: string, data: IUpdatePriceListData): Promise<IPriceList> => {
  const response = await axiosClient.put(`/price-lists/${id}`, data);
  return response.data as IPriceList;
};

// Xóa bảng giá
export const deletePriceList = async (id: string): Promise<{ message: string }> => {
  const response = await axiosClient.delete(`/price-lists/${id}`);
  return response.data as { message: string };
};

// Lấy danh sách sản phẩm/combo để tạo bảng giá
export const getProductsForPriceList = async (): Promise<IProductsForPriceList> => {
  const response = await axiosClient.get("/price-lists/products");
  return response.data as IProductsForPriceList;
};

// Kiểm tra khoảng trống thời gian
export const checkTimeGaps = async (): Promise<{ hasGap: boolean; message?: string; gaps?: string[] }> => {
  const response = await axiosClient.get("/price-lists/check-gaps");
  return response.data as { hasGap: boolean; message?: string; gaps?: string[] };
};

// Sao chép bảng giá
export const duplicatePriceList = async (
  id: string,
  data: { newName: string; startDate: string; endDate: string }
): Promise<IPriceList> => {
  const response = await axiosClient.post(`/price-lists/${id}/duplicate`, data);
  return response.data as IPriceList;
};

// Split version bảng giá (endpoint hiện có trên backend)
export const splitPriceListVersion = async (id: string, splitData: {
  newName: string;
  oldEndDate: string;
  newStartDate: string;
}): Promise<IPriceList> => {
  const response = await axiosClient.post(`/price-lists/${id}/split-version`, splitData);
  return response.data as IPriceList;
};
