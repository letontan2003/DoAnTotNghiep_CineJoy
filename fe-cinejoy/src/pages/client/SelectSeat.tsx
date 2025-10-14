import { useState, useCallback, useEffect, useLayoutEffect } from "react";
import { useLocation, useNavigate, useNavigationType } from "react-router-dom";
import { message } from "antd";
import useAppStore from "@/store/app.store";
import MovieInfo from "@/components/movies/booking_seats/MovieInfo";
import SeatLayout from "@/components/movies/booking_seats/SeatLayout";
import { getCurrentPriceList } from "@/apiservice/apiPriceList";
import type { IPriceList } from "@/apiservice/apiPriceList";
import { reserveSeatsApi, getSeatsWithReservationStatusApi } from "@/apiservice/apiShowTime";

export const SelectSeat = () => {
  const [selectedSeats, setSelectedSeats] = useState<string[]>([]);
  const [soldSeats, setSoldSeats] = useState<string[]>([]);
  const [reservedSeats, setReservedSeats] = useState<string[]>([]); // Thêm state cho reserved seats
  const [selectedSeatType, setSelectedSeatType] = useState<string | null>(null);
  const [seatTypeMap, setSeatTypeMap] = useState<Record<string, string>>({});
  const [layoutCols, setLayoutCols] = useState<number>(10);
  const [has4dx, setHas4dx] = useState<boolean>(false);
  const [ticketPrices, setTicketPrices] = useState<Record<string, number>>({});
  const [totalTicketPrice, setTotalTicketPrice] = useState<number>(0);
  const [hasTicketPriceGap, setHasTicketPriceGap] = useState<boolean>(false);
  const [totalSeats, setTotalSeats] = useState<number>(0); // Tổng số ghế trong phòng

  const navigate = useNavigate();
  const location = useLocation();
  const navigationType = useNavigationType();
  
  const { isDarkMode, user } = useAppStore();
  const { movie, cinema, date, time, room, showtimeId, theaterId } = location.state || {};
  
  // Debug log để kiểm tra dữ liệu nhận được
  console.log('🔍 SelectSeat Debug - Location state:', {
    movie: movie?.title,
    cinema,
    date,
    time,
    room,
    showtimeId,
    theaterId
  });

  const displayTime = time;
  const apiTime = time;

  // Validation để đảm bảo có đủ thông tin cần thiết
  if (!showtimeId || !date || !apiTime || !room) {
    console.error('❌ Missing required data for seat selection:', {
      showtimeId,
      date,
      apiTime,
      room
    });
  }

  // Kiểm tra user đã đăng nhập chưa
  if (!user || !user._id) {
    console.error('❌ User not authenticated:', user);
  } else {
    console.log('✅ User authenticated:', user._id);
  }

  // Không release ghế khi mount lại SelectSeat - để ghế tạm giữ vẫn hiển thị
  useLayoutEffect(() => {
    // Chỉ clear sessionStorage mà KHÔNG gọi API release
    // Điều này cho phép ghế tạm giữ vẫn hiển thị trên UI
    try {
      const raw = sessionStorage.getItem('booking_reserved_info');
      if (raw) {
        console.log('🧹 Clearing sessionStorage but keeping seats reserved on server');
        sessionStorage.removeItem('booking_reserved_info');
      }
    } catch (error) {
      console.error('Error clearing sessionStorage:', error);
    }
  }, []);

  // Load giá vé từ bảng giá đang hoạt động
  useEffect(() => {
    const loadTicketPrices = async () => {
      try {
        const priceList: IPriceList | null = await getCurrentPriceList();
        if (!priceList) {
          setTicketPrices({});
          return;
        }
        const map: Record<string, number> = {};
        (priceList.lines || []).forEach((line) => {
          if (line.type === 'ticket' && line.seatType) {
            map[line.seatType] = line.price || 0;
          }
        });
        setTicketPrices(map);
      } catch (error) {
        console.error("Error loading ticket prices:", error);
        setTicketPrices({});
      }
    };
    loadTicketPrices();
  }, []);

  // Khôi phục ghế đã chọn từ sessionStorage (khi quay lại từ payment)
  useLayoutEffect(() => {
    const storageKey = `booking:selected:${showtimeId || 'unknown'}`;

    try {
      // Kiểm tra navigation type và referrer để đảm bảo chỉ restore khi quay lại từ payment
      const perf = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined;
      const isBackForward = navigationType === 'POP' || (!!perf && perf.type === 'back_forward');
      const referrerIsPayment = document.referrer.includes('/payment');
      const hasPaymentFlag = sessionStorage.getItem('from_payment_page') === 'true';
      
      // Chỉ restore khi:
      // 1. Navigation type là POP (back button) 
      // 2. VÀ (có flag from_payment_page HOẶC referrer là payment page)
      // Ưu tiên flag hơn referrer vì flag đáng tin cậy hơn
      const shouldRestore = isBackForward && (hasPaymentFlag || referrerIsPayment);
      
      console.log('🔍 useLayoutEffect - Navigation detection:', {
        storageKey,
        navigationType,
        isBackForward,
        referrerIsPayment,
        hasPaymentFlag,
        shouldRestore,
        referrer: document.referrer,
        perfType: perf?.type
      });
      
      if (!shouldRestore) {
        // Không phải quay lại từ payment → xóa cache
        console.log('🧹 useLayoutEffect - Clearing sessionStorage - not a valid payment return');
        sessionStorage.removeItem(storageKey);
        // Không xóa flag from_payment_page ở đây để tránh xóa quá sớm
        return;
      }
      
      const raw = sessionStorage.getItem(storageKey);
      if (raw) {
        const restored: string[] = JSON.parse(raw);
        if (Array.isArray(restored) && restored.length > 0) {
          console.log('🔄 useLayoutEffect - Restoring selected seats from sessionStorage:', restored);
          
          // Restore ghế khi quay lại từ payment
          setSelectedSeats(restored);
          console.log('✅ useLayoutEffect - Restored selectedSeats:', restored);
          
          // Xóa flag sau khi restore thành công
          sessionStorage.removeItem('from_payment_page');
          console.log('🧹 useLayoutEffect - Removed from_payment_page flag after successful restore');
        }
      }
    } catch (error) {
      console.error("Error restoring selected seats in useLayoutEffect:", error);
      // Xóa sessionStorage nếu có lỗi
      sessionStorage.removeItem(storageKey);
    }
  }, [showtimeId, navigationType]); // Depend on showtimeId và navigationType

  // Khi đã có seatTypeMap, nếu có ghế đã khôi phục mà chưa có loại, set selectedSeatType
  useEffect(() => {
    if (selectedSeats.length > 0 && !selectedSeatType) {
      const t = seatTypeMap[selectedSeats[0]];
      if (t) {
        console.log('🔍 Setting selectedSeatType from restored seats:', t);
        setSelectedSeatType(t);
      }
    }
  }, [selectedSeats, selectedSeatType, seatTypeMap]);

  // Removed duplicate restoration logic to avoid conflicts

  // Debug: Log khi selectedSeats thay đổi
  useEffect(() => {
    console.log('🔍 selectedSeats changed:', selectedSeats);
    console.log('🔍 selectedSeatType:', selectedSeatType);
    console.log('🔍 seatTypeMap keys:', Object.keys(seatTypeMap));
  }, [selectedSeats, selectedSeatType, seatTypeMap]);

  // Helper function to validate seat type selection
  const validateSeatTypeSelection = useCallback((newSeatType: string): boolean => {
    if (selectedSeatType === null) {
      return true; // Allow selection if no seats are selected
    }
    
    if (selectedSeatType === newSeatType) {
      return true; // Allow selection if same type
    }
    
    // Different type - show warning message (always show per click)
    const seatTypeNames: Record<string, string> = {
      'normal': 'Ghế thường',
      'vip': 'Ghế VIP', 
      'couple': 'Ghế cặp đôi',
      '4dx': 'Ghế 4DX'
    };
    const currentTypeName = seatTypeNames[selectedSeatType] || selectedSeatType;
    const newTypeName = seatTypeNames[newSeatType] || newSeatType;
    
    const messageText = `Bạn chỉ có thể chọn ${currentTypeName}. Vui lòng bỏ chọn ghế ${currentTypeName} trước khi chọn ${newTypeName}.`;
    message.warning(messageText);
    
    return false;
  }, [selectedSeatType]);

  const handleSelectSeat = useCallback(async (seat: string) => {
    // Validation để đảm bảo có đủ thông tin cần thiết
    if (!showtimeId || !date || !apiTime || !room) {
      console.error('❌ Cannot select seat - missing required data:', {
        showtimeId,
        date,
        apiTime,
        room
      });
      message.error('Thiếu thông tin suất chiếu. Vui lòng thử lại.');
      return;
    }

    // Kiểm tra user đã đăng nhập chưa
    if (!user || !user._id) {
      console.error('❌ Cannot select seat - user not authenticated:', user);
      message.error('Vui lòng đăng nhập để chọn ghế.');
      return;
    }

    const seatType = seatTypeMap[seat];
    if (!seatType) {
      message.error("Không thể xác định loại ghế! Vui lòng tải lại trang.");
      return;
    }

    const isCurrentlySelected = selectedSeats.includes(seat);

    if (isCurrentlySelected) {
      // Hủy chọn ghế - chỉ cập nhật UI, KHÔNG gọi API release
      // Ghế sẽ được giải phóng khi user nhấn "Quay về" từ trang Payment
      console.log(`🎯 Deselecting seat ${seat} (UI only - will be released when going back from payment)`);
      
      const newSeats = selectedSeats.filter((s) => s !== seat);
      setSelectedSeats(newSeats);
      if (newSeats.length === 0) {
        setSelectedSeatType(null);
      }
      return;
    }

    // Kiểm tra giới hạn tối đa 8 ghế
    if (selectedSeats.length >= 8) {
      message.warning('Bạn chỉ có thể chọn tối đa 8 ghế. Vui lòng bỏ chọn một số ghế trước khi chọn ghế mới.');
      return;
    }

    // Selecting a new seat
    if (!validateSeatTypeSelection(seatType)) {
      return;
    }

    // Just select seat locally (no API call yet)
    if (selectedSeatType === null) {
      setSelectedSeatType(seatType);
    }
    setSelectedSeats([...selectedSeats, seat]);
    console.log(`🎯 Selected seat ${seat} locally (will reserve on Continue)`);
  }, [seatTypeMap, selectedSeats, selectedSeatType, validateSeatTypeSelection, showtimeId, date, apiTime, room, user]);

  const handleSelectMultipleSeats = useCallback(async (seats: string[]) => {
    if (seats.length === 0) return;

    // Validation để đảm bảo có đủ thông tin cần thiết
    if (!showtimeId || !date || !apiTime || !room) {
      console.error('❌ Cannot select multiple seats - missing required data:', {
        showtimeId,
        date,
        apiTime,
        room
      });
      message.error('Thiếu thông tin suất chiếu. Vui lòng thử lại.');
      return;
    }

    const seatType = seatTypeMap[seats[0]]; // Type of the first seat in the couple
    if (!seatType) {
      message.error("Không thể xác định loại ghế!");
      return;
    }

    const isCurrentlySelected = selectedSeats.includes(seats[0]);

    if (isCurrentlySelected) {
      // Hủy chọn couple seats - chỉ cập nhật UI, KHÔNG gọi API release
      // Ghế sẽ được giải phóng khi user nhấn "Quay về" từ trang Payment
      console.log(`🎯 Deselecting couple seats ${seats.join(', ')} (UI only - will be released when going back from payment)`);
      
      const newSeats = selectedSeats.filter((s) => !seats.includes(s));
      setSelectedSeats(newSeats);
      if (newSeats.length === 0) {
        setSelectedSeatType(null);
      }
      return;
    }

    // Kiểm tra giới hạn tối đa 8 ghế (với ghế cặp đôi, cần kiểm tra cả 2 ghế)
    if (selectedSeats.length + seats.length > 8) {
      message.warning('Bạn chỉ có thể chọn tối đa 8 ghế. Vui lòng bỏ chọn một số ghế trước khi chọn ghế cặp đôi mới.');
      return;
    }

    // Selecting new couple seats
    if (!validateSeatTypeSelection(seatType)) {
      return;
    }

    // Just select couple seats locally (no API call yet)
    if (selectedSeatType === null) {
      setSelectedSeatType(seatType);
    }
    setSelectedSeats([...selectedSeats, ...seats]);
    console.log(`🎯 Selected couple seats ${seats.join(', ')} locally (will reserve on Continue)`);
  }, [seatTypeMap, selectedSeats, selectedSeatType, validateSeatTypeSelection, showtimeId, date, apiTime, room]);

  // Tính tổng tiền vé theo loại ghế và giá từ bảng giá
  useEffect(() => {
    if (!selectedSeats || selectedSeats.length === 0) {
      setTotalTicketPrice(0);
      setHasTicketPriceGap(false);
      return;
    }
    let missing = false;
    const total = selectedSeats.reduce((sum, seatId) => {
      const st = seatTypeMap[seatId];
      const price = ticketPrices[st];
      if (price === undefined) {
        missing = true;
        return sum;
      }
      return sum + price;
    }, 0);
    setTotalTicketPrice(total);
    setHasTicketPriceGap(missing);
  }, [selectedSeats, seatTypeMap, ticketPrices]);

  // No cleanup needed since we don't reserve seats immediately
  // Seats are only reserved when user clicks Continue

  // Load seats with reservation status if user is authenticated
  const loadSeatsWithReservation = useCallback(async () => {
    if (!user || !user._id || !showtimeId || !date || !apiTime || !room) {
      return;
    }

    try {
      console.log('🔄 Loading seats with reservation status...');
      const response = await getSeatsWithReservationStatusApi(
        showtimeId,
        date,
        apiTime,
        room
      );
      
      if (response.status && response.data) {
        console.log('✅ Seats with reservation loaded:', response.data);
        // Tách riêng reserved seats và sold seats
        const reservedSeatsData = response.data
          .filter((seat: { status: string; seatId: string }) => seat.status === 'reserved' || seat.status === 'selected')
          .map((seat: { status: string; seatId: string }) => seat.seatId);
        
        const soldSeatsData = response.data
          .filter((seat: { status: string; seatId: string }) => seat.status === 'sold' || seat.status === 'occupied')
          .map((seat: { status: string; seatId: string }) => seat.seatId);
        
        setReservedSeats(reservedSeatsData);
        setSoldSeats(prev => [...new Set([...prev, ...soldSeatsData])]);
      }
    } catch (error) {
      console.error('Error loading seats with reservation:', error);
    }
  }, [user, showtimeId, date, apiTime, room]);

  // Load reservation status when user is authenticated (chỉ gọi 1 lần khi mount)
  useEffect(() => {
    if (user && user._id) {
      loadSeatsWithReservation();
    }
  }, [user?._id, showtimeId, date, apiTime, room]); // Chỉ phụ thuộc vào data cần thiết

  // Reload reservation status 1 lần sau 2 giây rồi dừng
  useEffect(() => {
    if (!user || !user._id) return;

    const timeoutId = setTimeout(() => {
      console.log('🔄 Loading seat reservation status once after 2 seconds');
      loadSeatsWithReservation();
    }, 2000);

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [loadSeatsWithReservation, user]);

  // Callback to update sold seats from API data
  const handleSeatsLoaded = (seatData: {
    seats?: Array<{ seatId?: string; status: string; type?: string }>;
    seatLayout?: { rows: number; cols: number };
  }) => {
    if (seatData?.seats && seatData?.seatLayout) {
      const apiSeatLayout = seatData.seatLayout;
      const seatsData = seatData.seats || [];
      setLayoutCols(apiSeatLayout.cols || 10);
      
      // Tính tổng số ghế từ dữ liệu API
      const totalSeatsCount = seatsData.length;
      setTotalSeats(totalSeatsCount);
      
      // Tạo map loại ghế sử dụng cùng logic với Seat component
      const typeMap: Record<string, string> = {};
      const occupiedSeats: string[] = [];
      
         // Tạo mapping từ index đến seatId (giống như trong Seat component)
         // eslint-disable-next-line @typescript-eslint/no-explicit-any
         seatsData.forEach((seatItem: any, index: number) => {
           const fallbackRow = Math.floor(index / apiSeatLayout.cols);
           const fallbackCol = index % apiSeatLayout.cols;
           const seatId = seatItem.seatId || `${String.fromCharCode(65 + fallbackRow)}${fallbackCol + 1}`;
     
           if (seatItem.type) {
             typeMap[seatId] = seatItem.type;
           } else {
             // Fallback: xác định loại ghế dựa trên vị trí nếu API không trả về type
             let fallbackType = 'normal';
             if (fallbackRow >= 3 && fallbackRow <= 6 && fallbackCol >= 3 && fallbackCol <= 6) {
               fallbackType = 'vip';
             } else if (fallbackRow >= 8 && fallbackCol >= 0 && fallbackCol <= 9) {
               fallbackType = 'couple';
             }
             typeMap[seatId] = fallbackType;
           }
     
           // New statuses: selected | available | maintenance
           if (seatItem.status === "selected") {
             occupiedSeats.push(seatId);
           }
         });
      
      console.log('🔍 handleSeatsLoaded - Total seats:', totalSeatsCount);
      console.log('🔍 handleSeatsLoaded - Setting seatTypeMap:', typeMap);
      console.log('🔍 handleSeatsLoaded - Current selectedSeats:', selectedSeats);
      
      setHas4dx(Object.values(typeMap).some((t) => t === '4dx'));
      setSoldSeats(occupiedSeats);
      setSeatTypeMap(typeMap);
    }
  };

  // Removed loading state since we don't release seats on mount anymore

  return (
    <div
      className={`${
        isDarkMode ? "bg-[#23272f]" : "bg-[#e7ede7]"
      } min-h-screen py-6`}
    >
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row gap-20">
        <SeatLayout
          selectedSeats={selectedSeats}
          soldSeats={soldSeats}
          onSelect={handleSelectSeat}
          onSelectMultiple={handleSelectMultipleSeats}
          showtimeId={showtimeId}
          date={date}
          startTime={apiTime}
          room={room}
          onSeatsLoaded={handleSeatsLoaded}
          is4dxRoom={has4dx}
        />
        <MovieInfo
          movie={{
            ...movie,
            cinema,
            date: date,
            time: displayTime,
            room: room,
            seats: selectedSeats,
            minAge: movie?.minAge,
            seatCols: layoutCols,
            soldSeats: soldSeats,
            reservedSeats: reservedSeats,
            totalSeats: totalSeats,
            format: has4dx ? '4DX' : movie?.format,
          }}
          totalPrice={totalTicketPrice}
          priceError={hasTicketPriceGap}
          showtimeId={showtimeId}
          onContinue={async () => {
            // Reserve seats when user clicks Continue (this will reset reservation time to 8 minutes)
            if (selectedSeats.length > 0) {
              try {
                console.log('🔒 Reserving seats on Continue (resetting 8-minute timer):', selectedSeats);
                await reserveSeatsApi(showtimeId, date, apiTime, room, selectedSeats);
                console.log(`✅ Successfully reserved ${selectedSeats.length} seats (timer reset to 8 minutes)`);
                
                // Cập nhật reservedSeats state sau khi reserve thành công
                setReservedSeats(prev => [...new Set([...prev, ...selectedSeats])]);
              } catch (error) {
                console.error('❌ Error reserving seats:', error);
                message.error('Không thể tạm giữ ghế. Vui lòng thử lại.');
                return; // Don't navigate if reservation fails
              }
            }
            
            // Lưu selectedSeats vào sessionStorage để có thể khôi phục khi quay lại
            try {
              const storageKey = `booking:selected:${showtimeId}`;
              sessionStorage.setItem(storageKey, JSON.stringify(selectedSeats));
              console.log('💾 Saved selected seats to sessionStorage:', selectedSeats);
            } catch (error) {
              console.error('Error saving selected seats to sessionStorage:', error);
            }
            
            navigate("/payment", {
              state: {
                movie: {
                  ...movie,
                  theaterId: theaterId || movie?.theaterId,
                  showtimeId: showtimeId,
                },
                seats: selectedSeats,
                seatTypeCounts: selectedSeats.reduce((acc: Record<string, number>, s) => {
                  const t = seatTypeMap[s];
                  if (t) acc[t] = (acc[t] || 0) + 1;
                  return acc;
                }, {}),
                seatTypeMap,
                cinema,
                date: date,
                time: apiTime,
                room: room,
                theaterId: theaterId || movie?.theaterId,
                showtimeId: showtimeId,
              },
            });
          }}
        />
      </div>
    </div>
  );
};

export default SelectSeat;
