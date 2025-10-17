import axiosClient from "./axiosClient";

// Lấy tất cả sản phẩm và combo
export const getFoodCombos = async (): Promise<IFoodCombo[]> => {
    const res = await axiosClient.get<IFoodCombo[]>("/foodcombos");
    return res.data;
};

// Lấy sản phẩm đơn lẻ
export const getSingleProducts = async (): Promise<IFoodCombo[]> => {
    const res = await axiosClient.get<IFoodCombo[]>("/foodcombos/single-products");
    return res.data;
};

// Lấy combo
export const getCombos = async (): Promise<IFoodCombo[]> => {
    const res = await axiosClient.get<IFoodCombo[]>("/foodcombos/combos");
    return res.data;
};

// Lấy combo có sẵn
export const getAvailableCombos = async (): Promise<IFoodCombo[]> => {
    const res = await axiosClient.get<IFoodCombo[]>("/foodcombos/available/combos");
    return res.data;
};

// Lấy sản phẩm đơn lẻ có sẵn
export const getAvailableSingleProducts = async (): Promise<IFoodCombo[]> => {
    const res = await axiosClient.get<IFoodCombo[]>("/foodcombos/available/single-products");
    return res.data;
};

// Lấy theo category
export const getProductsByCategory = async (category: string): Promise<IFoodCombo[]> => {
    const res = await axiosClient.get<IFoodCombo[]>(`/foodcombos/category/${category}`);
    return res.data;
};

export const getFoodComboById = async (id: string): Promise<IFoodCombo> => {
    const res = await axiosClient.get<IFoodCombo>(`/foodcombos/${id}`);
    return res.data;
};

// Thêm sản phẩm đơn lẻ
export const addSingleProduct = async (data: {
    code: string;
    name: string;
    description: string;
}): Promise<IFoodCombo> => {
    const res = await axiosClient.post<IFoodCombo>("/foodcombos/single-product", data);
    return res.data;
};

// Thêm combo
export const addCombo = async (data: {
    code: string;
    name: string;
    description: string;
    items: IComboItem[];
}): Promise<IFoodCombo> => {
    const res = await axiosClient.post<IFoodCombo>("/foodcombos/combo", data);
    return res.data;
};


export const updateFoodCombo = async (id: string, combo: Partial<IFoodCombo>): Promise<IFoodCombo> => {
    const res = await axiosClient.put<IFoodCombo>(`/foodcombos/update/${id}`, combo);
    return res.data;
};

export const deleteFoodCombo = async (id: string): Promise<{ message: string }> => {
    const res = await axiosClient.delete<{ message: string }>(`/foodcombos/delete/${id}`);
    return res.data;
};