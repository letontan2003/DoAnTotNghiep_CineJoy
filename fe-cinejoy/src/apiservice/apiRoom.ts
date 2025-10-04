/* eslint-disable @typescript-eslint/no-explicit-any */
import axiosClient from './axiosClient';

export interface IRoom {
    _id: string;
    roomCode: string;
    name: string;
    theater: {
        _id: string;
        name: string;
        address: string;
    };
    capacity: number;
    roomType: '2D' | '4DX';
    status: 'active' | 'maintenance' | 'inactive';
    description?: string;
    seats?: Array<{
        _id: string;
        seatId: string;
        type: string;
        status: string;
        price: number;
    }>;
    createdAt: string;
    updatedAt: string;
}

export interface ICreateRoomData {
    roomCode: string;
    name: string;
    theater: string;
    capacity: number;
    roomType: '2D' | '4DX';
    status: 'active' | 'maintenance' | 'inactive';
    description?: string;
    seatLayout?: {
        rows: number;
        cols: number;
        seats: { [key: string]: { type: 'normal' | 'vip' | 'couple' | '4dx'; status: 'available' | 'maintenance' } };
    };
}

// Get all rooms
export const getAllRoomsApi = async (): Promise<IRoom[]> => {
    const response = await axiosClient.get('/rooms');
    return (response.data as any).data;
};

// Get rooms by theater
export const getRoomsByTheaterApi = async (theaterId: string): Promise<IRoom[]> => {
    const response = await axiosClient.get(`/rooms/theater/${theaterId}`);
    return (response.data as any).data;
};

// Get active rooms by theater
export const getActiveRoomsByTheaterApi = async (theaterId: string): Promise<IRoom[]> => {
    const response = await axiosClient.get(`/rooms/theater/${theaterId}/active`);
    return (response.data as any).data;
};

// Get room by ID
export const getRoomByIdApi = async (roomId: string): Promise<IRoom> => {
    const response = await axiosClient.get(`/rooms/${roomId}`);
    return (response.data as any).data;
};

// Create room
export const createRoomApi = async (roomData: ICreateRoomData): Promise<IRoom> => {
    console.log('🚀 createRoomApi called with:', roomData);
    const response = await axiosClient.post('/rooms', roomData);
    return (response.data as any).data;
};

// Update room
export const updateRoomApi = async (roomId: string, roomData: Partial<ICreateRoomData>): Promise<IRoom> => {
    const response = await axiosClient.put(`/rooms/${roomId}`, roomData);
    return (response.data as any).data;
};

// Delete room
export const deleteRoomApi = async (roomId: string): Promise<void> => {
    await axiosClient.delete(`/rooms/${roomId}`);
};
