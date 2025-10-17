import { addBirthdayPointsApi } from './api';
import dayjs from 'dayjs';

interface BirthdayPointsResult {
  isBirthday: boolean;
  pointsAdded: number;
  message: string;
}

/**
 * Kiểm tra xem hôm nay có phải là ngày sinh nhật của user không
 */
export const checkBirthday = (userDateOfBirth: string): boolean => {
  if (!userDateOfBirth) return false;
  
  const today = dayjs();
  const birthday = dayjs(userDateOfBirth);
  
  // So sánh ngày và tháng (không quan tâm năm)
  return today.format('MM-DD') === birthday.format('MM-DD');
};

/**
 * Kiểm tra và cộng điểm sinh nhật cho user
 */
export const handleBirthdayPoints = async (userId: string, userDateOfBirth: string): Promise<BirthdayPointsResult> => {
  try {
    // Kiểm tra xem hôm nay có phải sinh nhật không
    if (!checkBirthday(userDateOfBirth)) {
      return {
        isBirthday: false,
        pointsAdded: 0,
        message: 'Hôm nay không phải là ngày sinh nhật của bạn'
      };
    }

    // Kiểm tra xem đã cộng điểm sinh nhật hôm nay chưa
    const lastBirthdayCheck = localStorage.getItem(`birthday_points_${userId}_${dayjs().format('YYYY-MM-DD')}`);
    if (lastBirthdayCheck) {
      return {
        isBirthday: true,
        pointsAdded: 0,
        message: 'Bạn đã nhận điểm sinh nhật hôm nay rồi! 🎉'
      };
    }

    // Cộng 100 điểm sinh nhật thông qua API backend
    const updateResult = await addBirthdayPointsApi(userId, 100);

    if (updateResult?.status && updateResult?.data) {
      // Lưu vào localStorage để tránh cộng điểm nhiều lần trong ngày
      localStorage.setItem(`birthday_points_${userId}_${dayjs().format('YYYY-MM-DD')}`, 'true');
      
      return {
        isBirthday: true,
        pointsAdded: updateResult.data.pointsAdded,
        message: `🎉 Chúc mừng sinh nhật! Bạn đã nhận được ${updateResult.data.pointsAdded} điểm CNJ!`
      };
    } else {
      return {
        isBirthday: true,
        pointsAdded: 0,
        message: 'Có lỗi xảy ra khi cộng điểm sinh nhật. Vui lòng thử lại!'
      };
    }
  } catch (error) {
    console.error('Error handling birthday points:', error);
    return {
      isBirthday: false,
      pointsAdded: 0,
      message: 'Có lỗi xảy ra khi xử lý điểm sinh nhật!'
    };
  }
};

/**
 * Lấy thông tin sinh nhật của user
 */
export const getBirthdayInfo = (userDateOfBirth: string) => {
  if (!userDateOfBirth) return null;
  
  const birthday = dayjs(userDateOfBirth);
  const today = dayjs().startOf('day'); // Đảm bảo so sánh từ đầu ngày
  let nextBirthday = birthday.year(today.year()).startOf('day');
  
  // Nếu sinh nhật đã qua trong năm nay, tính cho năm sau
  if (nextBirthday.isBefore(today, 'day')) {
    nextBirthday = nextBirthday.add(1, 'year');
  }
  
  const daysUntilBirthday = nextBirthday.diff(today, 'day');
  const isToday = daysUntilBirthday === 0;
  
  return {
    birthdayDate: birthday.format('DD/MM'),
    nextBirthday: nextBirthday.format('DD/MM/YYYY'),
    daysUntilBirthday: isToday ? 0 : daysUntilBirthday,
    isToday
  };
};
