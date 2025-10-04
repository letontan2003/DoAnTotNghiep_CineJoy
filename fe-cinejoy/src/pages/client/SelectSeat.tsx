import { useState, useCallback, useEffect } from "react";
import { useLocation, useNavigate, useNavigationType } from "react-router-dom";
import { message } from "antd";
import useAppStore from "@/store/app.store";
import MovieInfo from "@/components/movies/booking_seats/MovieInfo";
import SeatLayout from "@/components/movies/booking_seats/SeatLayout";
import { getCurrentPriceList } from "@/apiservice/apiPriceList";
import type { IPriceList } from "@/apiservice/apiPriceList";

export const SelectSeat = () => {
  const [selectedSeats, setSelectedSeats] = useState<string[]>([]);
  const [soldSeats, setSoldSeats] = useState<string[]>([]);
  const [selectedSeatType, setSelectedSeatType] = useState<string | null>(null);
  const [seatTypeMap, setSeatTypeMap] = useState<Record<string, string>>({});
  const [layoutCols, setLayoutCols] = useState<number>(10);
  const [has4dx, setHas4dx] = useState<boolean>(false);
  const [ticketPrices, setTicketPrices] = useState<Record<string, number>>({});
  const [totalTicketPrice, setTotalTicketPrice] = useState<number>(0);
  const [hasTicketPriceGap, setHasTicketPriceGap] = useState<boolean>(false);

  const navigate = useNavigate();
  const navigationType = useNavigationType(); // 'POP' khi back/forward
  const location = useLocation();
  
  const { isDarkMode } = useAppStore();
  const { movie, cinema, date, time, room, showtimeId, theaterId } = location.state || {};
  
  // Debug log để kiểm tra dữ liệu nhận được
  

  const displayTime = time;
  const apiTime = time;

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

  // Khôi phục ghế đã chọn nếu quay lại từ trang thanh toán
  useEffect(() => {
    const storageKey = `booking:selected:${showtimeId || 'unknown'}`;
    const cameFromBack = navigationType === 'POP';
    if (!cameFromBack) return; // chỉ khôi phục khi quay lại

    try {
      const raw = sessionStorage.getItem(storageKey);
      if (raw) {
        const restored: string[] = JSON.parse(raw);
        if (Array.isArray(restored)) {
          setSelectedSeats(restored);
        }
      }
    } catch (error) {
      console.error("Error restoring selected seats:", error);
    }
  }, [navigationType, showtimeId]);

  // Khi đã có seatTypeMap, nếu có ghế đã khôi phục mà chưa có loại, set selectedSeatType
  useEffect(() => {
    if (selectedSeats.length > 0 && !selectedSeatType) {
      const t = seatTypeMap[selectedSeats[0]];
      if (t) setSelectedSeatType(t);
    }
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

  const handleSelectSeat = useCallback((seat: string) => {
    const seatType = seatTypeMap[seat];
    if (!seatType) {
      message.error("Không thể xác định loại ghế! Vui lòng tải lại trang.");
      return;
    }

    const isCurrentlySelected = selectedSeats.includes(seat);

    if (isCurrentlySelected) {
      const newSeats = selectedSeats.filter((s) => s !== seat);
      setSelectedSeats(newSeats);
      if (newSeats.length === 0) {
        setSelectedSeatType(null);
      }
      return;
    }

    // Selecting a new seat
    if (!validateSeatTypeSelection(seatType)) {
      return;
    }

    if (selectedSeatType === null) {
      setSelectedSeatType(seatType);
    }
    setSelectedSeats([...selectedSeats, seat]);
  }, [seatTypeMap, selectedSeats, selectedSeatType, validateSeatTypeSelection]);

  const handleSelectMultipleSeats = useCallback((seats: string[]) => {
    if (seats.length === 0) return;

    const seatType = seatTypeMap[seats[0]]; // Type of the first seat in the couple
    if (!seatType) {
      message.error("Không thể xác định loại ghế!");
      return;
    }

    const isCurrentlySelected = selectedSeats.includes(seats[0]);

    if (isCurrentlySelected) {
      const newSeats = selectedSeats.filter((s) => !seats.includes(s));
      setSelectedSeats(newSeats);
      if (newSeats.length === 0) {
        setSelectedSeatType(null);
      }
      return;
    }

    // Selecting new couple seats
    if (!validateSeatTypeSelection(seatType)) {
      return;
    }

    if (selectedSeatType === null) {
      setSelectedSeatType(seatType);
    }
    setSelectedSeats([...selectedSeats, ...seats]);
  }, [seatTypeMap, selectedSeats, selectedSeatType, validateSeatTypeSelection]);

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

  // Callback to update sold seats from API data
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleSeatsLoaded = (seatData: any) => {
    if (seatData?.seats && seatData?.seatLayout) {
      const apiSeatLayout = seatData.seatLayout;
      const seatsData = seatData.seats || [];
      setLayoutCols(apiSeatLayout.cols || 10);
      
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
        }

        // New statuses: selected | available | maintenance
        if (seatItem.status === "selected") {
          occupiedSeats.push(seatId);
        }
      });
      
      setHas4dx(Object.values(typeMap).some((t) => t === '4dx'));
      setSoldSeats(occupiedSeats);
      setSeatTypeMap(typeMap);
    }
  };

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
            format: has4dx ? '4DX' : movie?.format,
          }}
          totalPrice={totalTicketPrice}
          priceError={hasTicketPriceGap}
          onContinue={() => {
            
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
