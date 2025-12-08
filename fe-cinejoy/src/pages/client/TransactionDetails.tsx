import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Spin, Result } from "antd";
import { getUserOrderDetails } from "@/apiservice/apiOrder";
import useAppStore from "@/store/app.store";

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
interface TransactionDetailsProps {}

const TransactionDetails: React.FC<TransactionDetailsProps> = () => {
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();
  const { isDarkMode, user } = useAppStore();
  const [order, setOrder] = useState<IOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchOrderDetails = async () => {
      if (!orderId) {
        setError("Không tìm thấy mã đơn hàng");
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const orderData = await getUserOrderDetails(orderId);
        setOrder(orderData);
      } catch (err) {
        console.error("Error fetching order details:", err);
        setError("Không thể tải thông tin đơn hàng");
      } finally {
        setLoading(false);
      }
    };

    fetchOrderDetails();
  }, [orderId]);

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
    }).format(amount);
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
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

  const handlePrint = () => {
    // Lấy thông tin user từ store
    const { user } = useAppStore.getState();

    // Tạo nội dung HTML cho bảng cần in
    const printContent = `
      <html>
        <head>
          <title>Mã Đặt Vé - ${order?._id}</title>
          <style>
            body { 
              font-family: Arial, sans-serif; 
              margin: 20px;
              background: white;
              color: black;
            }
            .print-header {
              text-align: center;
              font-weight: bold;
              font-size: 18px;
              margin-bottom: 20px;
              border-bottom: 2px solid #333;
              padding-bottom: 10px;
            }
            table { 
              width: 100%; 
              border-collapse: collapse; 
              margin: 20px 0;
            }
            th, td { 
              border: 1px solid #333; 
              padding: 8px; 
              text-align: left;
              vertical-align: top;
            }
            th { 
              background-color: #f5f5f5; 
              font-weight: bold;
            }
            .total-row {
              font-weight: bold;
              background-color: #f9f9f9;
            }
            @media print {
              body { margin: 0; }
              .no-print { display: none; }
            }
          </style>
        </head>
        <body>
          <div class="print-header">CHI TIẾT GIAO DỊCH</div>
          
          <!-- Purchase Date -->
          <div style="text-align: center; margin: 20px 0; font-size: 16px; font-weight: bold;">
            NGÀY MUA HÀNG: NGÀY ${new Date(
              order?.createdAt || ""
            ).getDate()} THÁNG ${
      new Date(order?.createdAt || "").getMonth() + 1
    } NĂM ${new Date(order?.createdAt || "").getFullYear()}
          </div>
          
          <!-- Payment Information -->
          <div style="margin: 20px 0; padding: 15px; border: 1px solid #333;">
            <div style="display: flex; justify-content: space-between;">
              <div style="flex: 1; margin-right: 20px;">
                <h3 style="color: #e67e22; font-weight: bold; margin-bottom: 10px;">Địa chỉ thanh toán</h3>
                <p><strong>Họ tên:</strong> ${
                  user?.fullName || order?.customerInfo?.fullName || "N/A"
                }</p>
                <p><strong>Email:</strong> ${
                  user?.email || order?.customerInfo?.email || "N/A"
                }</p>
                <p><strong>SDT:</strong> ${
                  user?.phoneNumber || order?.customerInfo?.phoneNumber || "N/A"
                }</p>
              </div>
              <div style="flex: 1;">
                <h3 style="color: #e67e22; font-weight: bold; margin-bottom: 10px;">Phương thức thanh toán</h3>
                <p><strong>${order?.paymentMethod || "N/A"}</strong></p>
              </div>
            </div>
          </div>
          
          <table>
            <thead>
              <tr>
                <th>Sản phẩm</th>
                <th>Suất chiếu</th>
                <th>Vé</th>
                <th>Concession(s)</th>
                <th>Thành tiền</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><strong>${movie?.title || "N/A"}</strong></td>
                <td>
                  <div>${theater?.name || "N/A"}</div>
                  <div>Room ${order?.room || "N/A"}</div>
                  <div>${formatDate(order?.showDate || "")}</div>
                  <div>Từ ${order?.showTime || "N/A"} - Đến ${calculateEndTime(
      order?.showTime || "",
      movie?.duration || 120
    )}</div>
                </td>
                <td>
                  <div><strong>${order?.seats[0]?.type || "VIP"}</strong></div>
                  <div>${order?.seats
                    .map((seat: any) => seat.seatId)
                    .join(", ")}</div>
                  <div><strong>${formatCurrency(
                    order?.seats[0]?.price || 0
                  )}</strong></div>
                </td>
                <td>
                  ${
                    order?.foodCombos && order.foodCombos.length > 0
                      ? order.foodCombos
                          .map(
                            (combo: any) =>
                              `<div><strong>${
                                combo.comboId?.name || "Food Combo"
                              }</strong></div>
                         <div>${combo.quantity} x ${formatCurrency(
                                combo.price
                              )}</div>`
                          )
                          .join("")
                      : "-"
                  }
                </td>
                <td><strong>${formatCurrency(
                  order?.totalAmount || 0
                )}</strong></td>
              </tr>
              
            </tbody>
          </table>
          <div style="text-align: right; margin-top: 20px; font-size: 16px; font-weight: bold;">
            Tổng Cộng: ${formatCurrency(order?.finalAmount || 0)}
          </div>
        </body>
      </html>
    `;

    // Mở cửa sổ in mới
    const printWindow = window.open("", "_blank");
    if (printWindow) {
      printWindow.document.write(printContent);
      printWindow.document.close();
      printWindow.focus();

      // Đợi một chút để nội dung load xong rồi in
      setTimeout(() => {
        printWindow.print();
        printWindow.close();
      }, 250);
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

  if (error || !order) {
    return (
      <div
        className={`min-h-screen flex items-center justify-center ${
          isDarkMode ? "bg-gray-900" : "bg-gray-50"
        }`}
      >
        <Result
          status="error"
          title="Lỗi"
          subTitle={error || "Không tìm thấy thông tin đơn hàng"}
          extra={
            <button
              onClick={() => navigate("/booking-history")}
              className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
            >
              Quay lại lịch sử
            </button>
          }
        />
      </div>
    );
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const movie = order.movieId as any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const theater = order.theaterId as any;

  return (
    <div
      className={`min-h-screen ${
        isDarkMode ? "bg-gray-900" : "bg-gray-50"
      } py-8`}
    >
      <div className="max-w-4xl mx-auto px-4">
        {/* Main Card */}
        <div
          className={`${
            isDarkMode ? "bg-gray-800" : "bg-white"
          } rounded-lg shadow-lg overflow-hidden`}
        >
          {/* Top Header - Booking Code */}
          <div
            className={`${
              isDarkMode ? "bg-gray-700" : "bg-gray-800"
            } text-white py-4 px-6`}
          >
            <h1 className="text-xl font-bold uppercase text-center">
              MÃ ĐẶT VÉ #{order._id} -{" "}
              {order.orderStatus === "CONFIRMED"
                ? "HOÀN TẤT"
                : order.orderStatus === "RETURNED"
                ? "TRẢ VÉ"
                : order.orderStatus}
            </h1>
          </div>

          {/* Purchase Date */}
          <div
            className={`py-4 px-6 border-b ${
              isDarkMode ? "border-gray-600" : "border-gray-200"
            }`}
          >
            <p className={`${isDarkMode ? "text-gray-300" : "text-gray-700"}`}>
              <span className="font-semibold">NGÀY MUA HÀNG:</span> NGÀY{" "}
              {new Date(order.createdAt).getDate()} THÁNG{" "}
              {new Date(order.createdAt).getMonth() + 1} NĂM{" "}
              {new Date(order.createdAt).getFullYear()}
            </p>
          </div>

          {/* Payment Information */}
          <div
            className={`grid grid-cols-1 md:grid-cols-2 gap-6 py-6 px-6 border-b ${
              isDarkMode ? "border-gray-600" : "border-gray-200"
            }`}
          >
            {/* Payment Address */}
            <div>
              <h3
                className={`font-bold text-lg mb-3 ${
                  isDarkMode ? "text-white" : "text-gray-900"
                }`}
              >
                Địa chỉ thanh toán
              </h3>
              <div
                className={`space-y-1 ${
                  isDarkMode ? "text-gray-300" : "text-gray-700"
                }`}
              >
                <p>Họ tên: {user?.fullName || order.customerInfo.fullName}</p>
                <p>Email: {user?.email || order.customerInfo.email}</p>
                <p>
                  SDT: {user?.phoneNumber || order.customerInfo.phoneNumber}
                </p>
              </div>
            </div>

            {/* Payment Method */}
            <div>
              <h3
                className={`font-bold text-lg mb-3 ${
                  isDarkMode ? "text-white" : "text-gray-900"
                }`}
              >
                Phương thức thanh toán
              </h3>
              <div
                className={`${isDarkMode ? "text-gray-300" : "text-gray-700"}`}
              >
                <p className="uppercase font-semibold">{order.paymentMethod}</p>
              </div>
            </div>
          </div>
          {/* Return Information - Chỉ hiển thị khi order là RETURNED */}
          {order.orderStatus === "RETURNED" && (order as any).returnInfo && (
            <div
              className={`py-6 px-6 border-b ${
                isDarkMode
                  ? "border-gray-600 bg-red-900/20"
                  : "border-gray-200 bg-red-50"
              }`}
            >
              <h3 className={`font-bold text-lg mb-3 text-red-600`}>
                Thông Tin Trả Vé
              </h3>
              <div
                className={`space-y-2 ${
                  isDarkMode ? "text-gray-300" : "text-gray-700"
                }`}
              >
                <p>
                  <span className="font-semibold">Lý do trả vé:</span>{" "}
                  <span className="text-red-600 font-medium">
                    {(order as any).returnInfo.reason || "Không có thông tin"}
                  </span>
                </p>
                <p>
                  <span className="font-semibold">Thời gian trả vé:</span>{" "}
                  <span className="text-red-600 font-medium">
                    {(order as any).returnInfo.returnDate
                      ? formatDate((order as any).returnInfo.returnDate) +
                        " " +
                        new Date(
                          (order as any).returnInfo.returnDate
                        ).toLocaleTimeString("vi-VN", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })
                      : "Không có thông tin"}
                  </span>
                </p>
              </div>
            </div>
          )}

          {/* Transaction Details Header */}
          <div
            className={`flex justify-between items-center py-4 px-6 border-b ${
              isDarkMode ? "border-gray-600" : "border-gray-200"
            }`}
          >
            <h2 className="text-red-600 font-bold text-lg">
              Thông Tin Giao Dịch
            </h2>
            <button
              onClick={handlePrint}
              className="bg-red-600 text-white px-4 py-2 rounded font-bold hover:bg-red-700"
            >
              In đơn hàng
            </button>
          </div>

          {/* Transaction Details Header Bar */}
          <div
            className={`${
              isDarkMode ? "bg-gray-700" : "bg-gray-800"
            } text-white py-3 px-6`}
          >
            <h2 className="font-bold uppercase text-center">
              CHI TIẾT GIAO DỊCH
            </h2>
          </div>

          {/* Transaction Details Table */}
          <div className="overflow-x-auto">
            <table className="w-full">
              {/* Table Header */}
              <thead
                className={`${
                  isDarkMode ? "bg-gray-700" : "bg-gray-800"
                } text-white`}
              >
                <tr>
                  <th className="py-3 px-4 text-left font-bold">Sản phẩm</th>
                  <th className="py-3 px-4 text-left font-bold">Suất chiếu</th>
                  <th className="py-3 px-4 text-left font-bold">Vé</th>
                  <th className="py-3 px-4 text-left font-bold">
                    Concession(s)
                  </th>
                  <th className="py-3 px-4 text-left font-bold">Thành tiền</th>
                </tr>
              </thead>
              {/* Table Body */}
              <tbody>
                <tr
                  className={`${
                    isDarkMode ? "bg-gray-800" : "bg-white"
                  } border-b ${
                    isDarkMode ? "border-gray-600" : "border-gray-200"
                  }`}
                >
                  {/* Product */}
                  <td className="py-4 px-4">
                    <div
                      className={`font-semibold ${
                        isDarkMode ? "text-white" : "text-gray-900"
                      }`}
                    >
                      {movie?.title}
                    </div>
                  </td>

                  {/* Showtime */}
                  <td className="py-4 px-4">
                    <div
                      className={`space-y-1 ${
                        isDarkMode ? "text-gray-300" : "text-gray-700"
                      }`}
                    >
                      <div className="font-medium">{theater?.name}</div>
                      <div>{order.room}</div>
                      <div>{formatDate(order.showDate)}</div>
                      <div>
                        From {order.showTime} ~ To{" "}
                        {calculateEndTime(
                          order.showTime,
                          movie?.duration || 120
                        )}
                      </div>
                    </div>
                  </td>

                  {/* Tickets */}
                  <td className="py-4 px-4">
                    <div
                      className={`space-y-1 ${
                        isDarkMode ? "text-gray-300" : "text-gray-700"
                      }`}
                    >
                      <div>{order.seats[0]?.type || "VIP"}</div>
                      <div>
                        {order.seats
                          .map((seat: { seatId: string }) => seat.seatId)
                          .join(",")}
                      </div>
                      <div className="font-semibold">
                        {formatCurrency(order.seats[0]?.price || 0)}
                      </div>
                    </div>
                  </td>

                  {/* Concessions */}
                  <td className="py-4 px-4">
                    {order.foodCombos && order.foodCombos.length > 0 ? (
                      <div
                        className={`space-y-2 ${
                          isDarkMode ? "text-gray-300" : "text-gray-700"
                        }`}
                      >
                        {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                        {order.foodCombos.map((combo: any, index: number) => (
                          <div key={index}>
                            <div className="font-medium">
                              {combo.comboId?.name || "Food Combo"}
                            </div>
                            <div>
                              {combo.quantity} x {formatCurrency(combo.price)}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <span className="text-gray-500">-</span>
                    )}
                  </td>

                  {/* Amount */}
                  <td className="py-4 px-4">
                    <div
                      className={`font-bold ${
                        isDarkMode ? "text-white" : "text-gray-900"
                      }`}
                    >
                      {formatCurrency(order.totalAmount)}
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Total Amount */}
          <div
            className={`flex justify-end py-4 px-6 ${
              isDarkMode ? "bg-gray-700" : "bg-gray-50"
            }`}
          >
            <div className="text-right">
              <div
                className={`text-lg font-bold ${
                  isDarkMode ? "text-white" : "text-gray-900"
                }`}
              >
                Tổng Cộng {formatCurrency(order.finalAmount)}
              </div>
            </div>
          </div>

          {/* Back Button */}
          <div
            className={`py-6 px-6 border-t ${
              isDarkMode ? "border-gray-600" : "border-gray-200"
            }`}
          >
            <button
              onClick={() => navigate("/booking-history")}
              className="bg-blue-500 text-white px-6 py-2 rounded hover:bg-blue-600"
            >
              Quay lại lịch sử
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TransactionDetails;
