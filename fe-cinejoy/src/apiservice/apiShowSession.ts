/* eslint-disable @typescript-eslint/no-explicit-any */
import axiosClient from './axiosClient';

export interface IShowSession {
    _id: string;
    shiftCode: string; // Mã ca chiếu
    name: string;
    startTime: string;
    endTime: string;
    createdAt: string;
    updatedAt: string;
}

export interface ICreateShowSessionData {
    shiftCode: string; // Mã ca chiếu
    name: string;
    startTime: string;
    endTime: string;
}

// Get all show sessions
export const getAllShowSessionsApi = async (): Promise<IShowSession[]> => {
    const response = await axiosClient.get('/show-sessions');
    return (response.data as any).data;
};

// Get show session by ID
export const getShowSessionByIdApi = async (sessionId: string): Promise<IShowSession> => {
    const response = await axiosClient.get(`/show-sessions/${sessionId}`);
    return (response.data as any).data;
};

// Get current active session
export const getCurrentActiveSessionApi = async (): Promise<IShowSession | null> => {
    const response = await axiosClient.get('/show-sessions/current-active');
    return (response.data as any).data;
};

// Create show session
export const createShowSessionApi = async (sessionData: ICreateShowSessionData): Promise<IShowSession> => {
    const response = await axiosClient.post('/show-sessions', sessionData);
    return (response.data as any).data;
};

// Update show session
export const updateShowSessionApi = async (sessionId: string, sessionData: Partial<ICreateShowSessionData>): Promise<IShowSession> => {
    const response = await axiosClient.put(`/show-sessions/${sessionId}`, sessionData);
    return (response.data as any).data;
};

// Delete show session
export const deleteShowSessionApi = async (sessionId: string): Promise<void> => {
    await axiosClient.delete(`/show-sessions/${sessionId}`);
};

