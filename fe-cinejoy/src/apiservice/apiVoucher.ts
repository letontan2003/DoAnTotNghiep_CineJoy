import axiosClient from "./axiosClient";


export const getVouchers = async (): Promise<IVoucher[]> => {
    const res = await axiosClient.get<IVoucher[]>("/vouchers");
    return res.data;
};

export const getVoucherById = async (id: string): Promise<IVoucher> => {
    const res = await axiosClient.get<IVoucher>(`/vouchers/${id}`);
    return res.data;
};

export const addVoucher = async (voucher: IVoucher): Promise<IVoucher> => {
    const res = await axiosClient.post<IVoucher>("/vouchers/add", voucher);
    return res.data;
};

export const updateVoucher = async (id: string, voucher: IVoucher): Promise<IVoucher> => {
    const res = await axiosClient.put<IVoucher>(`/vouchers/update/${id}`, voucher);
    return res.data;
};

export const deleteVoucher = async (id: string): Promise<{ message: string }> => {
    const res = await axiosClient.delete<{ message: string }>(`/vouchers/delete/${id}`);
    return res.data;
};

export const addPromotionLine = async (voucherId: string, lineData: any): Promise<IVoucher> => {
    const res = await axiosClient.post<IVoucher>(`/vouchers/${voucherId}/add-line`, lineData);
    return res.data;
};

export const updatePromotionLine = async (voucherId: string, lineIndex: number, lineData: any): Promise<IVoucher> => {
    const res = await axiosClient.put<IVoucher>(`/vouchers/${voucherId}/update-line/${lineIndex}`, lineData);
    return res.data;
};

export const deletePromotionLine = async (voucherId: string, lineIndex: number): Promise<IVoucher> => {
    const res = await axiosClient.delete<IVoucher>(`/vouchers/${voucherId}/delete-line/${lineIndex}`);
    return res.data;
};