import axiosClient from './axiosClient';

/* eslint-disable @typescript-eslint/no-explicit-any */

export interface ISeat {
    _id: string;
    seatId: string;
    room: {
        _id: string;
        name: string;
        theater?: {
            _id: string;
            name: string;
            address: string;
        };
    };
    row: string;
    number: number;
    type: 'normal' | 'vip' | 'couple';
    price: number;
    status: 'available' | 'maintenance' | 'blocked' | 'occupied';
    position: {
        x: number;
        y: number;
    };
    createdAt: string;
    updatedAt: string;
}

export interface ICreateSeatData {
    seatId?: string;
    room: string;
    row: string;
    number: number;
    type: 'normal' | 'vip' | 'couple';
    price: number;
    status: 'available' | 'maintenance' | 'blocked' | 'occupied';
    position: {
        x: number;
        y: number;
    };
}

export interface ISeatStatistics {
    total: number;
    available: number;
    maintenance: number;
    blocked: number;
    normal: number;
    vip: number;
    couple: number;
}

export interface IGenerateSeatLayoutData {
    rows: string[];
    seatsPerRow: number[];
    seatTypes?: { [key: string]: string };
}

// Get all seats
export const getAllSeatsApi = async (): Promise<ISeat[]> => {
    const response = await axiosClient.get('/seats');
    return (response.data as any).data;
};

// Get seats by room
export const getSeatsByRoomApi = async (roomId: string): Promise<ISeat[]> => {
    const response = await axiosClient.get(`/seats/room/${roomId}`);
    return (response.data as any).data;
};

// Get unique seat types
export const getUniqueSeatTypesApi = async (): Promise<string[]> => {
    const response = await axiosClient.get('/seats/types');
    return (response.data as any).data;
};

// Get seat statistics for a room
export const getSeatStatisticsApi = async (roomId: string): Promise<ISeatStatistics> => {
    const response = await axiosClient.get(`/seats/room/${roomId}/statistics`);
    return (response.data as any).data;
};

// Get seat by ID
export const getSeatByIdApi = async (seatId: string): Promise<ISeat> => {
    const response = await axiosClient.get(`/seats/${seatId}`);
    return (response.data as any).data;
};

// Create seat
export const createSeatApi = async (seatData: ICreateSeatData): Promise<ISeat> => {
    const response = await axiosClient.post('/seats', seatData);
    return (response.data as any).data;
};

// Create multiple seats
export const createMultipleSeatsApi = async (seats: ICreateSeatData[]): Promise<ISeat[]> => {
    const response = await axiosClient.post('/seats/bulk', { seats });
    return (response.data as any).data;
};

// Generate seat layout
export const generateSeatLayoutApi = async (roomId: string, layoutData: IGenerateSeatLayoutData): Promise<ISeat[]> => {
    const response = await axiosClient.post(`/seats/room/${roomId}/generate-layout`, layoutData);
    return (response.data as any).data;
};

// Update seat
export const updateSeatApi = async (seatId: string, seatData: Partial<ICreateSeatData>): Promise<ISeat> => {
    const response = await axiosClient.put(`/seats/${seatId}`, seatData);
    return (response.data as any).data;
};

// Delete seat
export const deleteSeatApi = async (seatId: string): Promise<void> => {
    await axiosClient.delete(`/seats/${seatId}`);
};

// Delete all seats in room
export const deleteAllSeatsInRoomApi = async (roomId: string): Promise<void> => {
    await axiosClient.delete(`/seats/room/${roomId}/all`);
};
