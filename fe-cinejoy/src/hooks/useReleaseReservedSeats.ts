import { useCallback } from 'react';
import { releaseUserReservedSeatsApi } from '@/apiservice/apiShowTime';

export const useReleaseReservedSeats = () => {
  const releaseUserReservedSeats = useCallback(async () => {
    try {
      // Kiểm tra xem user có đăng nhập không
      const token = localStorage.getItem('accessToken');
      if (!token) {
        console.log('🔍 User not authenticated, skipping seat release');
        return { success: true, released: 0 };
      }

      console.log('🔄 Releasing user reserved seats before selecting new showtime...');
      const response = await releaseUserReservedSeatsApi();
      
      if (response.status && response.data) {
        const { released, releasedSeats } = response.data;
        console.log(`✅ Released ${released} reserved seats:`, releasedSeats);
        return { success: true, released, releasedSeats };
      }
      
      return { success: true, released: 0 };
    } catch (error) {
      console.error('❌ Error releasing user reserved seats:', error);
      // Không throw error để không ảnh hưởng đến navigation
      return { success: false, released: 0, error };
    }
  }, []);

  return { releaseUserReservedSeats };
};
