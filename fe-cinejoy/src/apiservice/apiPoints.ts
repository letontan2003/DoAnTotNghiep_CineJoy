import { axiosClient } from './axiosClient';

// IBackendResponse is defined in global namespace

export interface IPointsResponse {
  points: number;
}

export const getUserPoints = async (): Promise<IPointsResponse> => {
  const res = await axiosClient.get<IBackendResponse<IPointsResponse>>('/v1/api/points');
  return res.data.data!;
};

export const updatePointsManual = async (): Promise<any> => {
  const res = await axiosClient.post<IBackendResponse<any>>('/v1/api/points/update-manual');
  return res.data.data!;
};
