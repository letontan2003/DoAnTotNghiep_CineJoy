import axiosClient from "./axiosClient";


export const getVouchers = async (): Promise<IVoucher[]> => {
    const res = await axiosClient.get<IVoucher[]>("/v1/api/vouchers");
    return res.data;
};

export const getVoucherById = async (id: string): Promise<IVoucher> => {
    const res = await axiosClient.get<IVoucher>(`/v1/api/vouchers/${id}`);
    return res.data;
};

export const addVoucher = async (voucher: IVoucher): Promise<IVoucher> => {
    const res = await axiosClient.post<IVoucher>("/v1/api/vouchers/add", voucher);
    return res.data;
};

export const updateVoucher = async (id: string, voucher: IVoucher): Promise<IVoucher> => {
    const res = await axiosClient.put<IVoucher>(`/v1/api/vouchers/update/${id}`, voucher);
    return res.data;
};

export const deleteVoucher = async (id: string): Promise<{ message: string }> => {
    const res = await axiosClient.delete<{ message: string }>(`/v1/api/vouchers/delete/${id}`);
    return res.data;
};

export const addPromotionLine = async (voucherId: string, lineData: any): Promise<IVoucher> => {
    const res = await axiosClient.post<IVoucher>(`/v1/api/vouchers/${voucherId}/add-line`, lineData);
    return res.data;
};

export const updatePromotionLine = async (voucherId: string, lineIndex: number, lineData: any): Promise<IVoucher> => {
    const res = await axiosClient.put<IVoucher>(`/v1/api/vouchers/${voucherId}/update-line/${lineIndex}`, lineData);
    return res.data;
};

export const deletePromotionLine = async (voucherId: string, lineIndex: number): Promise<IVoucher> => {
    const res = await axiosClient.delete<IVoucher>(`/v1/api/vouchers/${voucherId}/delete-line/${lineIndex}`);
    return res.data;
};

export const getAmountBudgetUsedApi = async (voucherId: string, lineIndex: number): Promise<number> => {
    const res = await axiosClient.get<{ status: boolean; data?: { usedBudget: number } }>(`/v1/api/vouchers/${voucherId}/amount-budget-used`, {
        params: { lineIndex }
    });
    return res.data?.data?.usedBudget ?? 0;
};

export const getItemBudgetUsedApi = async (voucherId: string, lineIndex: number): Promise<number> => {
    const res = await axiosClient.get<{ status: boolean; data?: { usedBudget: number } }>(`/v1/api/vouchers/${voucherId}/item-budget-used`, {
        params: { lineIndex }
    });
    return res.data?.data?.usedBudget ?? 0;
};

export const getPercentBudgetUsedApi = async (voucherId: string, lineIndex: number): Promise<number> => {
    const res = await axiosClient.get<{ status: boolean; data?: { usedBudget: number } }>(`/v1/api/vouchers/${voucherId}/percent-budget-used`, {
        params: { lineIndex }
    });
    return res.data?.data?.usedBudget ?? 0;
};