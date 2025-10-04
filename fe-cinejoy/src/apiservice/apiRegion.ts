import axiosClient from "./axiosClient";


export const getRegions = async (): Promise<IRegion[]> => {
    const res = await axiosClient.get<IRegion[]>("/regions");
    return res.data;
};

export const getRegionById = async (id: string): Promise<IRegion> => {
    const res = await axiosClient.get<IRegion>(`/regions/${id}`);
    return res.data;
};

export const addRegion = async (region: { name: string }): Promise<IRegion> => {
    const res = await axiosClient.post<IRegion>("/regions/add", region);
    return res.data;
};

export const updateRegion = async (id: string, region: IRegion): Promise<IRegion> => {
    const res = await axiosClient.put<IRegion>(`/regions/update/${id}`, region);
    return res.data;
};

export const deleteRegion = async (id: string): Promise<{ message: string }> => {
    const res = await axiosClient.delete<{ message: string }>(`/regions/delete/${id}`);
    return res.data;
};