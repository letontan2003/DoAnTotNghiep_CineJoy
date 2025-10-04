/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState, useEffect, useRef } from "react";
import useAppStore from "@/store/app.store";
import { getSeatsForShowtimeApi } from "@/apiservice/apiShowTime";
interface SeatProps {
  selectedSeats: string[]; // UI checked
  soldSeats: string[]; // already selected (reserved/sold)
  onSelect: (seat: string) => void;
  onSelectMultiple?: (seats: string[]) => void; // For couple seats
  showtimeId?: string;
  date?: string;
  startTime?: string;
  room?: string;
  onSeatsLoaded?: (seatData: any) => void;
}

interface SeatLayout {
  rows: number;
  cols: number;
}

// Danh sách hàng và số ghế mỗi hàng (fallback values)
// const rows = ["A", "B", "C", "D", "E", "F", "G", "H"];
// const seatsPerRow = 10;

// // Ghế đã chọn (ví dụ)
// const selectedSeats = ["C3", "D4", "E3", "G4"];

type SeatType = 'normal' | 'vip' | 'couple' | '4dx';
type SeatStatus = 'available' | 'maintenance';

const Seat: React.FC<SeatProps> = ({
  selectedSeats,
  soldSeats,
  onSelect,
  onSelectMultiple,
  showtimeId,
  date,
  startTime,
  room,
  onSeatsLoaded,
}) => {
  const { isDarkMode } = useAppStore();
  const [seatLayout, setSeatLayout] = useState<SeatLayout | null>(null);
  const [seatMap, setSeatMap] = useState<Record<string, { type: SeatType; status: SeatStatus }>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Use ref to store the callback to avoid re-renders
  const onSeatsLoadedRef = useRef(onSeatsLoaded);
  onSeatsLoadedRef.current = onSeatsLoaded;

  // Helper function to handle seat selection (including couple seats)
  const handleSeatSelection = (seatName: string) => {
    console.log("handleSeatSelection called with seatName:", seatName);
    const seatType = seatMap[seatName]?.type;
    
    if (seatType === 'couple') {
      // For couple seats, find the pair and select both
      const row = seatName.charAt(0);
      const col = parseInt(seatName.substring(1));
      
      // Find the pair seat (next seat in the same row)
      const pairCol = col % 2 === 1 ? col + 1 : col - 1;
      const pairSeatName = `${row}${pairCol}`;
      
      // Check if both seats are available
      const isMaintenance = seatMap[seatName]?.status === 'maintenance';
      const isPairMaintenance = seatMap[pairSeatName]?.status === 'maintenance';
      const isSelectedFromServer = soldSeats.includes(seatName) || soldSeats.includes(pairSeatName);
      
      if (!isSelectedFromServer && !isMaintenance && !isPairMaintenance) {
        // Check if either seat is already selected
        const isSeatSelected = selectedSeats.includes(seatName);
        const isPairSelected = selectedSeats.includes(pairSeatName);
        
        if (isSeatSelected || isPairSelected) {
          // If either is selected, deselect both
          if (onSelectMultiple) {
            console.log("Calling onSelectMultiple for deselection:", [seatName, pairSeatName]);
            onSelectMultiple([seatName, pairSeatName]);
          } else {
            // Fallback to individual selection if onSelectMultiple is not provided
            // Only call onSelect once to avoid duplicate validation
            console.log("Calling onSelect for deselection:", seatName);
            onSelect(seatName);
          }
        } else {
          // If neither is selected, select both
          if (onSelectMultiple) {
            console.log("Calling onSelectMultiple for selection:", [seatName, pairSeatName]);
            onSelectMultiple([seatName, pairSeatName]);
          } else {
            // Fallback to individual selection if onSelectMultiple is not provided
            // Only call onSelect once to avoid duplicate validation
            console.log("Calling onSelect for selection:", seatName);
            onSelect(seatName);
          }
        }
      }
    } else {
      // For non-couple seats, use normal selection
      console.log("Calling onSelect for non-couple seat:", seatName);
      onSelect(seatName);
    }
  };

  // Load seats from API
  useEffect(() => {
    const loadSeats = async () => {
      // Debug: log the props to see what's missing
      console.log("Seat component props:", {
        showtimeId,
        date,
        startTime,
        room,
      });

      if (!showtimeId || !date || !startTime) {
        console.log("Missing required props for API call, using static data");
        // Fallback to static data if no API params provided
        return;
      }

      try {
        setLoading(true);
        setError(null);
        // Call the API to get seats
        console.log("Calling API with params:", {
          showtimeId,
          date,
          startTime,
          room,
        });

        const response = await getSeatsForShowtimeApi(
          showtimeId,
          date,
          startTime,
          room
        );

        if (response.status && response.data) {
          // Cast the API response to match our SeatLayout interface
          const apiSeatLayout = response.data.seatLayout;
          const typedSeatLayout: SeatLayout = {
            rows: apiSeatLayout.rows,
            cols: apiSeatLayout.cols,
          };
          setSeatLayout(typedSeatLayout);
          
          // Build seat map from API seats data
          const map: Record<string, { type: SeatType; status: SeatStatus }> = {};
          const seatsData = response.data.seats || [];
          
          // Create a mapping from seatId to seat info (status and type). Prefer API seatId if provided
          const seatInfoMap: Record<string, { status: string; type: string }> = {};
          seatsData.forEach((seatItem: any, index: number) => {
            let seatId: string | undefined = seatItem.seatId;
            if (!seatId) {
              // Fallback: Calculate seatId based on index if API doesn't provide seatId
              const row = Math.floor(index / apiSeatLayout.cols);
              const col = index % apiSeatLayout.cols;
              seatId = `${String.fromCharCode(65 + row)}${col + 1}`;
            }
            seatInfoMap[seatId] = {
              status: seatItem.status,
              type: seatItem.type || 'normal'
            };
          });
          
          // Generate seat layout with proper types and statuses
          for (let row = 0; row < apiSeatLayout.rows; row++) {
            for (let col = 0; col < apiSeatLayout.cols; col++) {
              const seatId = `${String.fromCharCode(65 + row)}${col + 1}`;
              const seatInfo = seatInfoMap[seatId];
              const status = seatInfo?.status || 'available';
              const seatType = (seatInfo?.type as SeatType) || 'normal';
              map[seatId] = { type: seatType, status: status as SeatStatus };
            }
          }
          
          setSeatMap(map);
          if (onSeatsLoadedRef.current) {
            onSeatsLoadedRef.current(response.data);
          }
        } else {
          setError(response.message || "Không thể tải dữ liệu ghế");
        }
      } catch (err) {
        console.error("Error loading seats:", err);
        setError("Lỗi kết nối khi tải dữ liệu ghế");
      } finally {
        setLoading(false);
      }
    };

    loadSeats();
  }, [showtimeId, date, startTime, room]); // Removed onSeatsLoaded from dependencies




  // Determine which rows and seats to render based on backend data
  const renderRows = seatLayout
    ? Array.from({ length: seatLayout.rows }, (_, i) => String.fromCharCode(65 + i)) // A, B, C, D, E, F, G, H, I, J, K, L...
    : ["A", "B", "C", "D", "E", "F", "G", "H"];
  
  const renderSeatsForRow = (row: string) => {
    const cols = seatLayout?.cols || 10;
    return Array.from({ length: cols }, (_, i) => {
      const seatId = `${row}${i + 1}`;
      // Nếu có dữ liệu từ API, dùng dữ liệu đó
      if (seatMap[seatId]) {
        return {
          seatId,
          number: i + 1,
          status: seatMap[seatId].status,
          type: seatMap[seatId].type,
          price: 90000,
        };
      }
      // Fallback: tạo template theo pattern như ảnh
      const rowIndex = row.charCodeAt(0) - 65; // A=0, B=1, etc.
      let seatType: SeatType = 'normal';
      
      // Pattern theo ảnh: A-C (0-2) = normal, D-I (3-8) = vip/couple, J-L (9-11) = 4dx
      if (rowIndex < 3) {
        seatType = 'normal';
      } else if (rowIndex < 9) {
        // D-I: VIP ở giữa (cột 4-7), normal ở ngoài
        if (i >= 3 && i <= 6) {
          seatType = 'vip';
        } else {
          seatType = 'normal';
        }
      } else {
        // J-L: 4DX ở giữa (cột 4-7), normal ở ngoài
        if (i >= 3 && i <= 6) {
          seatType = '4dx';
        } else {
          seatType = 'normal';
        }
      }
      
      return {
        seatId,
      number: i + 1,
      status: "available" as const,
        type: seatType,
      price: 90000,
      };
    });
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        <p
          className={`mt-2 text-sm ${
            isDarkMode ? "text-gray-300" : "text-gray-600"
          }`}
        >
          Đang tải sơ đồ ghế...
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-8">
        <p
          className={`mt-2 text-sm ${
            isDarkMode ? "text-gray-300" : "text-gray-600"
          }`}
        >
          {error}
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-3">
      {renderRows.map((row) => {
        const rowSeats = renderSeatsForRow(row);
        const isCoupleRow = rowSeats.some((s) => s.type === 'couple');

        if (isCoupleRow) {
          // Nếu số cột là số lẻ, bỏ ghế cuối để đảm bảo số ghế chẵn cho cặp đôi
          const totalCols = seatLayout?.cols || rowSeats.length;
          const displayCols = totalCols % 2 === 0 ? totalCols : totalCols - 1;
          const numPairs = Math.floor(displayCols / 2);

          // Render hàng ghế cặp đôi: chia từng cặp, giữa hai ghế trong cặp gap-1.5, giữa các cặp gap-4
        return (
            <div key={row} className="w-full flex justify-center gap-1.5">
              {Array.from({ length: numPairs }, (_, pairIndex) => (
                <div key={`pair-${pairIndex}`} className="flex gap-1">
                  {[0, 1].map((seatInPair) => {
                    const idx = pairIndex * 2 + seatInPair;
                    const seat = rowSeats[idx];
                    if (!seat) return null;

                    const seatName = seat.seatId;
                    const isMaintenance = seat.status === 'maintenance';
                    const isSelectedFromServer = soldSeats.includes(seatName);
                    const isChecked = selectedSeats.includes(seatName);

                    let baseColor = '';
                    switch (seat.type) {
                      case 'vip':
                        baseColor = 'bg-yellow-400 border-yellow-600';
                        break;
                      case 'couple':
                        baseColor = 'bg-pink-400 border-pink-600';
                        break;
                      case '4dx':
                        baseColor = 'bg-purple-400 border-purple-600';
                        break;
                      default:
                        baseColor = 'bg-gray-300 border-gray-500';
                    }

                    const colorClass = isMaintenance
                      ? 'bg-gray-600 border-gray-800'
                      : isSelectedFromServer
                        ? 'bg-[#b3210e] border-[#b3210e] text-white'  // Ghế đã chọn (từ server) = đỏ
                        : isChecked
                          ? 'bg-blue-600 border-blue-600 text-white'   // Ghế đang chọn (UI) = xanh
                          : baseColor;

              return (
                <button
                  key={seatName}
                        className="relative flex flex-col items-center bg-transparent border-none p-0 rounded transition-all duration-200 cursor-pointer"
                        onClick={() => {
                          if (!isSelectedFromServer && !isMaintenance) {
                            handleSeatSelection(seatName);
                          }
                        }}
                        disabled={isSelectedFromServer || isMaintenance}
                        type="button"
                        title={seatName}
                      >
                        <div
                          className={`w-6.5 h-6.5 ${colorClass} border-2 rounded flex items-center justify-center text-[10px] font-bold relative ${isSelectedFromServer ? 'cursor-not-allowed' : ''}`}
                        >
                          {seatName}
                          {isMaintenance && (
                            <div className="absolute inset-0 flex items-center justify-center text-red-600 text-lg font-bold pointer-events-none">✕</div>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>
          );
        }

        // Các hàng còn lại: tăng gap giữa các ghế
        return (
          <div key={row} className="flex flex-row items-center gap-1.5">
            {rowSeats.map((seat, i) => {
              // Nếu là hàng cặp đôi nhưng vì lý do nào đó lọt qua đây và tổng cột lẻ, ẩn ghế cuối
              const totalCols = seatLayout?.cols || rowSeats.length;
              if (isCoupleRow && totalCols % 2 !== 0 && i === totalCols - 1) {
                return null;
              }

              const seatName = seat.seatId;
              const isMaintenance = seat.status === 'maintenance';
              const isSelectedFromServer = soldSeats.includes(seatName);
              const isChecked = selectedSeats.includes(seatName);

              let baseColor = '';
              switch (seat.type) {
                case 'vip':
                  baseColor = 'bg-yellow-400 border-yellow-600';
                  break;
                case 'couple':
                  baseColor = 'bg-pink-400 border-pink-600';
                  break;
                case '4dx':
                  baseColor = 'bg-purple-400 border-purple-600';
                  break;
                default:
                  baseColor = 'bg-gray-300 border-gray-500';
              }

              const colorClass = isMaintenance
                ? 'bg-gray-600 border-gray-800'
                : isSelectedFromServer
                  ? 'bg-[#b3210e] border-[#b3210e] text-white'
                  : isChecked
                    ? 'bg-blue-600 border-blue-600 text-white'
                    : baseColor;

              return (
                <button
                  key={seatName}
                  className="relative flex flex-col items-center border-none p-0 rounded transition-all duration-200 cursor-pointer"
                  onClick={() => {
                    if (!isSelectedFromServer && !isMaintenance) {
                      handleSeatSelection(seatName);
                    }
                  }}
                  disabled={isSelectedFromServer || isMaintenance}
                  type="button"
                  title={seatName}
                >
                <div
                  className={`w-6.5 h-6.5 ${colorClass} border-2 rounded flex items-center justify-center text-[10px] font-bold relative ${isSelectedFromServer ? 'cursor-not-allowed' : ''}`}
                >
                    {seatName}
                    {isMaintenance && (
                      <div className="absolute inset-0 flex items-center justify-center text-red-600 text-lg font-bold pointer-events-none">✕</div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        );
      })}
    </div>
  );
};

export default Seat;
