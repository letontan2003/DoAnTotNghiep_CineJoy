import React, { useState } from "react";
import useAppStore from "@/store/app.store";
import { Modal, Button, message } from "antd";
import { bookSeatsApi } from "@/services/api";

interface MovieInfoProps {
  movie: {
    title: string;
    poster: string;
    format: string;
    genre: string;
    duration: number;
    cinema: string;
    date: string;
    time: string;
    room: string;
    seats: string[];
    minAge?: number;
    ageRating?: string; // Thêm trường ageRating
    seatCols?: number;
    soldSeats?: string[];
    reservedSeats?: string[]; // Thêm ghế đã reserved
    totalSeats?: number; // Tổng số ghế trong phòng
  };
  onContinue: () => void;
  totalPrice: number;
  priceError?: boolean; // true nếu thiếu giá vé đang hoạt động cho loại ghế đã chọn
  showtimeId?: string; // ID của suất chiếu để đặt ghế
}

const MovieInfo: React.FC<MovieInfoProps> = ({ movie, onContinue, totalPrice, priceError = false, showtimeId }) => {
  const { isDarkMode } = useAppStore();
  const hasSelectedSeats = movie.seats.length > 0;
  const [confirmOpen, setConfirmOpen] = useState(false);

  // Format ngày chiếu theo chuẩn Việt Nam DD/MM/YYYY
  const displayDate = movie.date
    ? new Date(movie.date).toLocaleDateString("vi-VN")
    : movie.date;

  const seatCols = movie.seatCols || 10;
  const soldSet = new Set(movie.soldSeats || []);
  const reservedSet = new Set(movie.reservedSeats || []);
  const selectedSet = new Set(movie.seats);

  const toCoord = (sid: string) => {
    const rowChar = sid[0];
    const colNum = parseInt(sid.slice(1), 10);
    return { row: rowChar.charCodeAt(0) - 65, col: colNum - 1 };
  };
  const toSeatId = (row: number, col: number) => `${String.fromCharCode(65 + row)}${col + 1}`;

  const violatesSingleGapRule = (): boolean => {
    if (movie.seats.length === 0) return false;

    const isOccupied = (sid: string | null): boolean => {
      if (!sid) return true; // ngoài biên coi như chiếm chỗ (tường)
      return selectedSet.has(sid) || soldSet.has(sid) || reservedSet.has(sid);
    };

    for (const sid of movie.seats) {
      const { row, col } = toCoord(sid);

      // Kiểm tra bên trái
      const left = col - 1 >= 0 ? toSeatId(row, col - 1) : null; // ghế kề trái
      const leftFar = col - 2 >= 0 ? toSeatId(row, col - 2) : null; // ghế cách 2 bên trái hoặc null nếu tường
      const leftEmpty = left && !selectedSet.has(left) && !soldSet.has(left) && !reservedSet.has(left);
      if (leftEmpty && isOccupied(leftFar)) return true;

      // Kiểm tra bên phải
      const right = col + 1 < seatCols ? toSeatId(row, col + 1) : null; // ghế kề phải
      const rightFar = col + 2 < seatCols ? toSeatId(row, col + 2) : null; // ghế cách 2 bên phải hoặc null nếu tường
      const rightEmpty = right && !selectedSet.has(right) && !soldSet.has(right) && !reservedSet.has(right);
      if (rightEmpty && isOccupied(rightFar)) return true;
    }
    return false;
  };

  const handleClickContinue = () => {
    if (!hasSelectedSeats || priceError) return;

    if (violatesSingleGapRule()) {
      message.warning("Vui lòng không chừa 1 ghế trống bên trái hoặc bên phải của các ghế bạn đã chọn.");
      return;
    }

    setConfirmOpen(true);
  };

  const handleConfirm = async () => {
    if (!showtimeId) {
      message.error("Không tìm thấy thông tin suất chiếu");
      return;
    }

    try {
      // Gọi API đặt ghế với trạng thái selected (giữ ghế 5 phút)
      // Lấy userId từ store hoặc sessionStorage
      const userId = sessionStorage.getItem('current_user_id') || localStorage.getItem('current_user_id') || '';
      
      const result = await bookSeatsApi({
        showtimeId,
        date: movie.date,
        startTime: movie.time,  
        room: movie.room,
        seatIds: movie.seats,
        userId: userId || undefined
      });

      // Kiểm tra null safety
      if (!result) {
        message.error("Ghế đã bị đặt bởi người khác. Vui lòng chọn ghế khác.");
        return;
      }

      if (result.status) {
        // message.success("Đã đặt ghế thành công! Bạn có 5 phút để hoàn tất thanh toán.");
        // Lưu info để còn release khi rời trang payment
        const info = { showtimeId, date: movie.date, startTime: movie.time, room: movie.room, seatIds: movie.seats, userId };
        sessionStorage.setItem('booking_reserved_info', JSON.stringify(info));
        
        // Lưu ghế đã chọn để khôi phục khi quay lại SelectSeat
        const storageKey = `booking:selected:${showtimeId}`;
        sessionStorage.setItem(storageKey, JSON.stringify(movie.seats));
        
        setConfirmOpen(false);
        onContinue();
      } else {
        message.error(result.message || "Ghế đã bị đặt bởi người khác. Vui lòng chọn ghế khác.");
      }
       // eslint-disable-next-line @typescript-eslint/no-unused-vars
       } catch (error: unknown) {
         message.error("Ghế đã bị đặt bởi người khác. Vui lòng chọn ghế khác.");
       }
  };

  const minAge = movie.minAge ?? 13;

  return (
    <div
      className={`w-full md:w-[340px] rounded-2xl shadow-lg p-6 flex flex-col items-center ${
        isDarkMode ? "bg-[#f5f6fa0d] text-white" : "bg-white/80 text-[#162d5a]"
      }`}
    >
      <img
        src={movie.poster}
        alt={movie.title}
        className="w-32 h-44 object-cover rounded mb-3"
      />
      <div
        className={`text-lg font-semibold text-center mb-4 ${
          isDarkMode ? "text-yellow-300" : "text-[#162d5a]"
        }`}
      >
        {movie.title}
      </div>
      <div className="w-full space-y-2 mb-4">
        <div
          className={`flex justify-between text-sm ${
            isDarkMode ? "text-gray-300" : "text-gray-700"
          }`}
        >
          <span className="font-bold">Hình thức:</span>
          <span>{movie.format}</span>
        </div>
        <div
          className={`flex justify-between text-sm ${
            isDarkMode ? "text-gray-300" : "text-gray-700"
          }`}
        >
          <span className="font-bold">Thể loại:</span>
          <span>{movie.genre}</span>
        </div>
        <div
          className={`flex justify-between text-sm ${
            isDarkMode ? "text-gray-300" : "text-gray-700"
          }`}
        >
          <span className="font-bold">Độ Tuổi:</span>
          <span>{movie.ageRating || 'N/A'}</span>
        </div>
        <div
          className={`flex justify-between text-sm ${
            isDarkMode ? "text-gray-300" : "text-gray-700"
          }`}
        >
          <span className="font-bold">Thời lượng:</span>
          <span>{movie.duration} phút</span>
        </div>
        <div
          className={`flex justify-between text-sm ${
            isDarkMode ? "text-gray-300" : "text-gray-700"
          }`}
        >
          <span className="font-bold">Rạp chiếu:</span>
          <span>{movie.cinema}</span>
        </div>
        <div
          className={`flex justify-between text-sm ${
            isDarkMode ? "text-gray-300" : "text-gray-700"
          }`}
        >
          <span className="font-bold">Suất chiếu:</span>
          <span>{displayDate} {movie.time}</span>
        </div>
        <div
          className={`flex justify-between text-sm ${
            isDarkMode ? "text-gray-300" : "text-gray-700"
          }`}
        >
          <span className="font-bold">Phòng chiếu:</span>
          <span>{movie.room}</span>
        </div>
        <div
          className={`flex justify-between text-sm ${
            isDarkMode ? "text-gray-300" : "text-gray-700"
          }`}
        >
          <span className="font-bold">Số Ghế:</span>
          <span>{(() => {
            const totalSeats = movie.totalSeats || 0;
            const soldSeats = movie.soldSeats?.length || 0;
            const reservedSeats = movie.reservedSeats?.length || 0;
            const occupiedSeats = soldSeats + reservedSeats;
            const availableSeats = totalSeats - occupiedSeats;
            return `${availableSeats}/${totalSeats}`;
          })()}</span>
        </div>
        <div
          className={`flex justify-between text-sm ${
            isDarkMode ? "text-gray-300" : "text-gray-700"
          }`}
        >
          <span className="font-bold">Ghế ngồi:</span>
          <span>{hasSelectedSeats ? movie.seats.join(", ") : "Chưa chọn"}</span>
        </div>
      </div>

      {/* Hiển thị giá vé */}
      <div className="w-full mb-4 rounded-lg">
        <div className="flex justify-between items-center">
          <span className={`text-sm font-medium ${isDarkMode ? "text-gray-300" : "text-gray-700"}`}>
            Giá vé:
          </span>
          <div className="text-right">
            <div className={`text-lg font-bold ${isDarkMode ? "text-green-400" : "text-green-600"}`}>
              {totalPrice.toLocaleString()} VNĐ
            </div>
          </div>
        </div>
      </div>

      {/* Thông báo khi chưa chọn ghế */}
      {!hasSelectedSeats && (
        <div
          className={`text-xs mb-2 text-center ${
            isDarkMode ? "text-red-400" : "text-red-500"
          }`}
        >
          Vui lòng chọn ghế ngồi để tiếp tục
        </div>
      )}


      <button
        className={`mt-2 px-6 py-2 w-full rounded font-semibold transition-all duration-200 ${
          hasSelectedSeats && !priceError
            ? `cursor-pointer ${
                isDarkMode
                  ? "bg-cyan-400 hover:bg-cyan-300 text-[#23272f]"
                  : "bg-blue-500 text-white hover:bg-blue-600"
              }`
            : `cursor-not-allowed ${
                isDarkMode
                  ? "bg-gray-600 text-gray-400"
                  : "bg-gray-300 text-gray-500"
              }`
        }`}
        onClick={handleClickContinue}
        disabled={!hasSelectedSeats || priceError}
      >
        Tiếp tục
      </button>

      <Modal centered open={confirmOpen} width={360} onCancel={() => setConfirmOpen(false)} footer={null} getContainer={false} closeIcon={null}>
        <div className="text-center mb-2 text-xl font-semibold">Thông tin vé</div>
        <div className="text-sm leading-6 mb-2 text-justify">
          Tôi xác nhận mua vé cho người xem từ đủ {minAge} tuổi trở lên và đồng ý cung cấp giấy tờ tùy thân để xác thực độ tuổi người xem, tham khảo <span className="font-bold text-red-500 cursor-pointer">quy định</span> của Bộ Văn Hóa, Thể Thao và Du Lịch,{" "}
          {minAge < 16 && (
            <>
              CNJ không được phép phục vụ khách hàng dưới 16 tuổi cho các suất chiếu kết thúc sau 23:00. {""}
            </>
          )}
          CNJ sẽ không hoàn tiền nếu người xem không đáp ứng đủ điều kiện.
        </div>
        <div className="flex justify-center gap-3">
          <Button onClick={() => setConfirmOpen(false)}>Hủy</Button>
          <Button type="primary" danger onClick={handleConfirm}>Đồng ý</Button>
        </div>
      </Modal>
    </div>
  );
};

export default MovieInfo;
