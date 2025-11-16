import React, { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Spin, Empty, Button } from "antd";
import { DesktopOutlined, EyeOutlined } from "@ant-design/icons";
import useAppStore from "@/store/app.store";
import { getUserBookingHistory } from "@/apiservice/apiOrder";
// IOrder is defined in global namespace

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
interface BookingHistoryProps {
  // No props needed
}

const BookingHistory: React.FC<BookingHistoryProps> = () => {
  const navigate = useNavigate();
  const { isDarkMode } = useAppStore();
  const [orders, setOrders] = useState<IOrder[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [displayCount, setDisplayCount] = useState<number | string>(5);
  const hasFetched = useRef<boolean>(false);

  const fetchBookingHistory = useCallback(async () => {
    if (hasFetched.current) return;

    try {
      setLoading(true);
      hasFetched.current = true;
      const response = await getUserBookingHistory();
      setOrders(response);
    } catch (error) {
      console.error("Error fetching booking history:", error);
      hasFetched.current = false; // Reset on error to allow retry
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!hasFetched.current) {
      fetchBookingHistory();
    }
  }, [fetchBookingHistory]);

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
    }).format(amount);
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString("vi-VN");
  };

  const getStatusDisplay = (status: string) => {
    switch (status) {
      case "CONFIRMED":
        return {
          text: "Hoàn Tất",
          color: "text-green-600",
          bgColor: "bg-green-100",
        };
      case "RETURNED":
        return { text: "Trả Vé", color: "text-red-600", bgColor: "bg-red-100" };
      case "PENDING":
        return {
          text: "Đang xử lý",
          color: "text-yellow-600",
          bgColor: "bg-yellow-100",
        };
      case "CANCELLED":
        return { text: "Đã hủy", color: "text-red-600", bgColor: "bg-red-100" };
      default:
        return { text: status, color: "text-gray-600", bgColor: "bg-gray-100" };
    }
  };

  const getAgeRating = (ageRating?: string): string => {
    if (!ageRating) return "P";
    return ageRating;
  };

  const calculateEndTime = (startTime: string, duration: number): string => {
    try {
      // Xử lý định dạng thời gian 12 giờ (VD: "10:34 PM") hoặc 24 giờ (VD: "22:34")
      let hours: number, minutes: number;

      if (startTime.includes("AM") || startTime.includes("PM")) {
        // Định dạng 12 giờ
        const timePart = startTime.replace(/\s*(AM|PM)/i, "");
        const [h, m] = timePart.split(":").map(Number);
        const isPM = /PM/i.test(startTime);

        if (isPM && h !== 12) {
          hours = h + 12;
        } else if (!isPM && h === 12) {
          hours = 0;
        } else {
          hours = h;
        }
        minutes = m;
      } else {
        // Định dạng 24 giờ
        const [h, m] = startTime.split(":").map(Number);
        hours = h;
        minutes = m;
      }

      const startDate = new Date();
      startDate.setHours(hours, minutes, 0, 0);
      const endDate = new Date(startDate.getTime() + duration * 60000);

      return endDate.toLocaleTimeString("vi-VN", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      });
    } catch (error) {
      console.error("Error calculating end time:", error);
      return "Invalid Time";
    }
  };

  if (loading) {
    return (
      <div
        className={`min-h-screen flex items-center justify-center ${
          isDarkMode ? "bg-gray-900" : "bg-gray-50"
        }`}
      >
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div
      className={`min-h-screen ${isDarkMode ? "bg-gray-900" : "bg-gray-50"}`}
    >
      {/* Header */}
      <div className="bg-gray-800 text-white py-6">
        <div className="max-w-6xl mx-auto px-4">
          <h1 className="text-3xl font-bold text-center">LỊCH SỬ GIAO DỊCH</h1>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-6xl mx-auto px-4 py-6">
        {(orders || []).length === 0 ? (
          <div className="text-center py-12">
            <Empty
              description="Chưa có lịch sử đặt vé nào"
              image={Empty.PRESENTED_IMAGE_SIMPLE}
            />
          </div>
        ) : (
          <>
            {/* Display Controls */}
            <div className="flex justify-between items-center mb-6">
              <span
                className={`text-sm ${
                  isDarkMode ? "text-gray-300" : "text-gray-700"
                }`}
              >
                {(orders || []).length} Sản phẩm
              </span>
              <div className="flex items-center space-x-2">
                <span
                  className={`text-sm ${
                    isDarkMode ? "text-gray-300" : "text-gray-700"
                  }`}
                >
                  HIỂN THỊ:
                </span>
                <select
                  value={displayCount}
                  onChange={(e) =>
                    setDisplayCount(
                      e.target.value === "ALL" ? "ALL" : Number(e.target.value)
                    )
                  }
                  className={`px-3 py-1 border rounded text-sm ${
                    isDarkMode
                      ? "bg-gray-800 border-gray-600 text-white"
                      : "bg-white border-gray-300 text-gray-900"
                  }`}
                >
                  <option
                    value={5}
                    className={
                      isDarkMode
                        ? "bg-gray-800 text-white"
                        : "bg-white text-gray-900"
                    }
                  >
                    5
                  </option>
                  <option
                    value={10}
                    className={
                      isDarkMode
                        ? "bg-gray-800 text-white"
                        : "bg-white text-gray-900"
                    }
                  >
                    10
                  </option>
                  <option
                    value={20}
                    className={
                      isDarkMode
                        ? "bg-gray-800 text-white"
                        : "bg-white text-gray-900"
                    }
                  >
                    20
                  </option>
                  <option
                    value="ALL"
                    className={
                      isDarkMode
                        ? "bg-gray-800 text-white"
                        : "bg-white text-gray-900"
                    }
                  >
                    ALL
                  </option>
                </select>
              </div>
            </div>

            {/* Order List */}
            <div className="space-y-6">
              {(orders || [])
                .slice(
                  0,
                  displayCount === "ALL"
                    ? (orders || []).length
                    : Number(displayCount)
                )
                .map((order) => {
                  const statusInfo = getStatusDisplay(order.orderStatus);
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  const movie = order.movieId as any;
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  const theater = order.theaterId as any;

                  return (
                    <div
                      key={order._id}
                      className={`${
                        isDarkMode
                          ? "bg-gray-800 border-gray-700"
                          : "bg-white border"
                      } rounded-lg shadow-md p-6`}
                    >
                      {/* Order Header */}
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <p
                            className={`text-sm ${
                              isDarkMode ? "text-gray-400" : "text-gray-600"
                            }`}
                          >
                            Mã Đặt Vé : {order._id}
                            <span className="ml-2">
                              (Trạng thái:{" "}
                              <span
                                className={`font-bold ${
                                  order.orderStatus === "RETURNED"
                                    ? "text-red-600"
                                    : ""
                                }`}
                              >
                                {statusInfo.text}
                              </span>
                              )
                            </span>
                          </p>
                        </div>
                        <div className="flex items-center">
                          <DesktopOutlined className="text-red-500 mr-1" />
                        </div>
                      </div>

                      <div className="flex items-stretch space-x-6">
                        {/* Movie Poster */}
                        <div className="flex-shrink-0">
                          <img
                            src={
                              movie?.posterImage || "/placeholder-poster.jpg"
                            }
                            alt={movie?.title}
                            className="w-35 h-full object-cover rounded"
                            onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              target.src = "/placeholder-poster.jpg";
                            }}
                          />
                        </div>

                        {/* Movie Details */}
                        <div className="flex-1 flex flex-col">
                          <div>
                            <div className="flex items-center justify-between mb-2">
                              <h3
                                className={`text-lg font-semibold ${
                                  isDarkMode ? "text-white" : "text-gray-900"
                                }`}
                              >
                                {movie?.title}
                              </h3>

                              {/* Age Rating */}
                              <div className="flex items-center">
                                <div
                                  className={`w-12 h-8 rounded border-2 flex items-center justify-center ${
                                    getAgeRating(movie?.ageRating) === "P"
                                      ? "bg-green-500 border-green-600"
                                      : getAgeRating(movie?.ageRating) ===
                                        "T13+"
                                      ? "bg-yellow-500 border-yellow-600"
                                      : getAgeRating(movie?.ageRating) ===
                                        "T16+"
                                      ? "bg-orange-500 border-orange-600"
                                      : "bg-red-500 border-red-600"
                                  }`}
                                >
                                  <span className="text-white font-bold text-sm">
                                    {getAgeRating(movie?.ageRating)}
                                  </span>
                                </div>
                              </div>
                            </div>

                            <div
                              className={`space-y-1 text-sm ${
                                isDarkMode ? "text-gray-300" : "text-gray-700"
                              }`}
                            >
                              <p>
                                <span className="font-medium">Ngày:</span>{" "}
                                {formatDate(order.showDate)}
                              </p>
                              <p>
                                <span className="font-medium">Giờ: </span>
                                Từ {order.showTime} ~ Đến{" "}
                                {calculateEndTime(
                                  order.showTime,
                                  movie?.duration || 120
                                )}
                              </p>
                              <p>
                                <span className="font-medium">Rạp:</span>{" "}
                                {theater?.name}
                              </p>
                              <p>
                                <span className="font-medium">
                                  Phòng và Ghế:{" "}
                                </span>
                                {order.room} (
                                {order.seats
                                  .map(
                                    (seat: { seatId: string }) => seat.seatId
                                  )
                                  .join(", ")}
                                )
                              </p>
                              <p className="font-bold text-lg text-green-600">
                                {formatCurrency(order.finalAmount)}
                              </p>
                            </div>
                          </div>

                          {/* View Button - positioned at bottom */}
                          <div className="mt-auto pt-4">
                            <Button
                              type="primary"
                              icon={<EyeOutlined />}
                              className={`${
                                isDarkMode
                                  ? "bg-blue-600 hover:bg-blue-700 border-blue-600"
                                  : "bg-blue-500 hover:bg-blue-600"
                              }`}
                              onClick={() =>
                                navigate(`/transaction-details/${order._id}`)
                              }
                            >
                              Xem
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default BookingHistory;
