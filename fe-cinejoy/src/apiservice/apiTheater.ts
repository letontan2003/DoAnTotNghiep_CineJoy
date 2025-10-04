import axiosClient from "./axiosClient";


// Lấy tất cả rạp
export const getTheaters = async () => {
    const response = await axiosClient.get<ITheater[]>("/theaters");
    return response.data;
};

// Lấy rạp theo id
export const getTheaterById = async (id: string) => {
    const response = await axiosClient.get<ITheater>(`/theaters/${id}`);
    return response.data;
};

// Thêm rạp mới
export const addTheater = async (theater: ITheater) => {
    const response = await axiosClient.post<ITheater>("/theaters/add", theater);
    return response.data;
};

// Cập nhật rạp
export const updateTheater = async (id: string, theater: ITheater) => {
    const response = await axiosClient.put<ITheater>(`/theaters/update/${id}`, theater);
    return response.data;
};

// Xóa rạp
export const deleteTheater = async (id: string) => {
    const response = await axiosClient.delete<{ message: string }>(`/theaters/delete/${id}`);
    return response.data;
};

export const getRegions = async () => {
    const response = await axiosClient.get<IRegion[]>("/regions");
    return response.data;
}