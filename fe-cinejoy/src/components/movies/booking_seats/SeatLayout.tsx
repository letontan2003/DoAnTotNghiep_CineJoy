import React from "react";
import { useNavigate, useNavigationType } from "react-router-dom";
import Seat from "components/movies/booking_seats/Seat";
import useAppStore from "@/store/app.store";
import screenImage from "@/assets/screen.png";

interface SeatLayoutProps {
  selectedSeats: string[];
  soldSeats: string[];
  onSelect: (seat: string) => void;
  onSelectMultiple?: (seats: string[]) => void;
  showtimeId?: string;
  date?: string;
  startTime?: string;
  room?: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onSeatsLoaded?: (seatData: any) => void;
  is4dxRoom?: boolean;
}

const SeatLayout: React.FC<SeatLayoutProps> = ({
  selectedSeats,
  soldSeats,
  onSelect,
  onSelectMultiple,
  showtimeId,
  date,
  startTime,
  room,
  onSeatsLoaded,
  is4dxRoom,
}) => {
  const { isDarkMode } = useAppStore();
  const navigate = useNavigate();
  const navigationType = useNavigationType(); // 'POP' khi back/forward

  // Handle seat data loading
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleSeatsLoaded = (seatData: any) => {
    // Forward to parent component
    if (onSeatsLoaded) {
      onSeatsLoaded(seatData);
    }
  };

  // Persist selected seats per showtime in sessionStorage
  const storageKey = React.useMemo(() => `booking:selected:${showtimeId || 'unknown'}`, [showtimeId]);

  // Save when selectedSeats changes
  React.useEffect(() => {
    try {
      if (selectedSeats && selectedSeats.length >= 0) {
        sessionStorage.setItem(storageKey, JSON.stringify(selectedSeats));
      }
    } catch (error) {
      console.error("Error saving selected seats:", error);
    }
  }, [selectedSeats, storageKey]);

  // On mount: attempt to restore and notify parent for bulk select
  React.useEffect(() => {
    try {
      const perf = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined;
      const isBackForward = navigationType === 'POP' || (!!perf && perf.type === 'back_forward');
      
      // Kiểm tra thêm từ referrer để đảm bảo chỉ restore khi quay lại từ trang thanh toán
      const referrerIsPayment = document.referrer.includes('/payment');
      const hasPaymentFlag = sessionStorage.getItem('from_payment_page') === 'true';
      
      // Chỉ restore khi:
      // 1. Navigation type là POP (back button) 
      // 2. VÀ (có flag from_payment_page HOẶC referrer là payment page)
      // Ưu tiên flag hơn referrer vì flag đáng tin cậy hơn
      const shouldRestore = isBackForward && (hasPaymentFlag || referrerIsPayment);

      console.log('🔍 Navigation detection:', {
        navigationType,
        isBackForward,
        referrerIsPayment,
        hasPaymentFlag,
        shouldRestore,
        referrer: document.referrer,
        perfType: perf?.type
      });

      if (!shouldRestore) {
        // Không phải quay lại từ trang thanh toán → xóa cache để tránh lưu khi reload/đi thẳng
        console.log('🧹 Clearing sessionStorage - not a valid payment return');
        sessionStorage.removeItem(storageKey);
        // Không xóa flag from_payment_page ở đây để tránh xóa quá sớm
        return;
      }

      const raw = sessionStorage.getItem(storageKey);
      if (raw) {
        const restored: string[] = JSON.parse(raw);
        if (Array.isArray(restored) && restored.length > 0) {
          console.log('🔄 Restoring selected seats from payment return:', restored);
          if (onSelectMultiple) {
            onSelectMultiple(restored);
          } else if (onSelect) {
            // Fallback: chọn từng ghế nếu component cha không hỗ trợ select nhiều
            restored.forEach((s) => onSelect(s));
          }
          
          // Xóa flag sau khi restore thành công
          sessionStorage.removeItem('from_payment_page');
          console.log('🧹 SeatLayout - Removed from_payment_page flag after successful restore');
        }
      }
    } catch (error) {
      console.error("Error restoring selected seats:", error);
      // Xóa sessionStorage nếu có lỗi
      sessionStorage.removeItem(storageKey);
      sessionStorage.removeItem('from_payment_page');
    }
  // only run once for current showtime
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storageKey, navigationType]);

  return (
    <div
      className={`flex-1 rounded-2xl shadow-lg p-4 md:p-8 ${
        isDarkMode ? "bg-[#f5f6fa0d] text-white" : "bg-white/80 text-[#162d5a]"
      }`}
    >
      {/* Header với Back button và Màn hình chiếu */}
      <div className="flex items-center justify-between mb-4">
        {/* Back Button */}
        <button
          onClick={() => navigate(-1)}
          className={`flex items-center -mt-10 -ml-4 mr-10 gap-1 px-2 py-1 rounded-lg font-medium cursor-pointer transition-all duration-200 ${
            isDarkMode
              ? "text-white hover:underline"
              : "text-gray-700 hover:underline"
          }`}
        >
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 19l-7-7 7-7"
            />
          </svg>
          Quay lại
        </button>

        {/* Màn hình chiếu - căn giữa */}
        <div className="flex-1 flex flex-col items-center">
          <img
            src={screenImage}
            alt="Màn hình chiếu"
            className="w-[60%] max-w-lg mb-2"
          />
          <span
            className={`text-sm -mt-5 mb-3 ${
              isDarkMode ? "text-gray-300" : "text-gray-500"
            }`}
          >
            MÀN HÌNH CHIẾU
          </span>
        </div>

        {/* Spacer để cân bằng layout */}
        <div className="w-[120px]"></div>
      </div>
      {/* Sơ đồ ghế (render ghế ở đây) */}
      <div className="flex flex-col items-center">
        <Seat
          selectedSeats={selectedSeats}
          soldSeats={soldSeats}
          onSelect={onSelect}
          onSelectMultiple={onSelectMultiple}
          showtimeId={showtimeId}
          date={date}
          startTime={startTime}
          room={room}
          onSeatsLoaded={handleSeatsLoaded}
        />
      </div>
      {/* Legend - Loại ghế */}
      <div className="mt-6 mb-3">
        <h4 className={`text-sm font-semibold mb-2 text-left md:text-center ${isDarkMode ? "text-white" : "text-[#2d3748]"}`}>Loại ghế:</h4>
        <div className="flex flex-row flex-wrap gap-6 md:justify-center">
          {!is4dxRoom && (
            <>
              <div className="flex items-center gap-2 text-sm">
                <div className="w-6 h-6 rounded-md bg-gray-300 border border-gray-400 shadow-inner" />
                <span className={isDarkMode ? "text-white" : "text-gray-700"}>Ghế thường</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <div className="w-6 h-6 rounded-md bg-yellow-400 border border-yellow-600 shadow-inner" />
                <span className={isDarkMode ? "text-white" : "text-gray-700"}>Ghế VIP</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <div className="w-6 h-6 rounded-md bg-pink-400 border border-pink-600 shadow-inner" />
                <span className={isDarkMode ? "text-white" : "text-gray-700"}>Ghế đôi</span>
              </div>
            </>
          )}
          {is4dxRoom && (
            <div className="flex items-center gap-2 text-sm">
              <div className="w-6 h-6 rounded-md bg-purple-400 border border-purple-600 shadow-inner" />
              <span className={isDarkMode ? "text-white" : "text-gray-700"}>Ghế 4DX</span>
            </div>
          )}
        </div>
      </div>

      {/* Legend - Trạng thái ghế */}
      <div className="mb-2">
        <h4 className={`text-sm font-semibold mb-2 text-left md:text-center ${isDarkMode ? "text-white" : "text-[#2d3748]"}`}>Trạng thái ghế:</h4>
        <div className="flex flex-row flex-wrap gap-6 md:justify-center">
          <div className="flex items-center gap-2 text-sm">
            <div className="w-6 h-6 rounded-md bg-blue-600 border border-blue-600 shadow-inner" />
            <span className={isDarkMode ? "text-white" : "text-gray-700"}>Ghế đang chọn</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <div className="w-6 h-6 rounded-md bg-[#b3210e] border border-[#b3210e] shadow-inner" />
            <span className={isDarkMode ? "text-white" : "text-gray-700"}>Ghế đã chọn</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <div className="w-6 h-6 rounded-md bg-gray-600 border border-gray-800 relative shadow-inner">
              <div className="absolute inset-0 flex items-center justify-center text-red-600 text-base font-bold pointer-events-none">✕</div>
            </div>
            <span className={isDarkMode ? "text-white" : "text-gray-700"}>Bảo trì</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SeatLayout;
