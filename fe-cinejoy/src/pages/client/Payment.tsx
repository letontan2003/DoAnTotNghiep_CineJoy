/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Modal, Button, Typography, Row, Col, message } from "antd";
import { validateVoucherApi, applyVoucherApi, createOrderApi, processPaymentApi } from "@/services/api";
import { getFoodCombos } from "@/apiservice/apiFoodCombo";
import { getCurrentPriceList } from "@/apiservice/apiPriceList";
import type { IPriceList, IPriceListLine } from "@/apiservice/apiPriceList";
import useAppStore from "@/store/app.store";
import momoLogo from "@/assets/momo.png";
import vnpayLogo from "@/assets/vnpay.png";

const { Title, Text } = Typography;

// Interface tạm thời cho voucher response
interface VoucherResponse {
  status: boolean;
  error: number;
  message: string;
  data?: {
    voucher: unknown;
    userVoucher: unknown;
    discount: number;
  };
}

const PaymentPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { isDarkMode, user, setIsModalOpen } = useAppStore();
  const {
    movie = {},
    seats = [],
    seatTypeCounts = {},
    seatTypeMap = {},
    cinema = "",
    date = "",
    time = "",
    room = "",
    theaterId = "",
    showtimeId = "",
  } = location.state || {};
  
  // Kiểu dữ liệu hiển thị cho Dịch vụ kèm (tên/mô tả từ FoodCombo, giá từ bảng giá)
  interface UIComboItem {
    _id: string;
    name: string;
    description?: string;
    type: "single" | "combo";
    price: number;
    quantity: number; // số lượng tối đa có thể chọn (không quản lý tồn kho → đặt mặc định 99)
  }

  const [combos, setCombos] = useState<UIComboItem[]>([]);
  const [combosLoading, setCombosLoading] = useState<boolean>(true);
  const [comboCounts, setComboCounts] = useState<Record<string, number>>({});
  const [editableUserInfo] = useState({
    fullName: user?.fullName || "",
    phoneNumber: user?.phoneNumber || "",
    email: user?.email || "",
  });
  const [timeLeft, setTimeLeft] = useState<number>(300);
  const [voucherCode, setVoucherCode] = useState<string>("");
  const [appliedVoucher, setAppliedVoucher] = useState<{
    code: string;
    discountPercent: number;
    discountAmount: number;
    maxCap?: number;
  } | null>(null);
  const [voucherLoading, setVoucherLoading] = useState<boolean>(false);
  const [voucherError, setVoucherError] = useState<string>("");
  const [isModalPaymentOpen, setIsModalPaymentOpen] = useState<boolean>(false);
  const [isPaymentLoading, setIsPaymentLoading] = useState<boolean>(false);
  const [paymentMethod, setPaymentMethod] = useState<'MOMO' | 'VNPAY'>('MOMO');

  useEffect(() => {
    const loadServicesFromPriceList = async () => {
      try {
        setCombosLoading(true);

        // 1) Lấy bảng giá hiện tại (trạng thái hoạt động)
        const priceList: IPriceList | null = await getCurrentPriceList();
        if (!priceList) {
          setCombos([]);
          setComboCounts({});
          return;
        }

        // 2) Lọc các dòng áp dụng cho sản phẩm/combos
        const relevantLines: IPriceListLine[] = (priceList.lines || []).filter(
          (l) => l && (l.type === "combo" || l.type === "single")
        );

        if (relevantLines.length === 0) {
          setCombos([]);
          setComboCounts({});
          return;
        }

        // 3) Lấy toàn bộ sản phẩm/combos để lấy mô tả
        const products = await getFoodCombos();
        const idToProduct = new Map<string, IFoodCombo>(
          products.map((p) => [p._id, p])
        );

        // 4) Ghép dữ liệu: tên/mô tả từ FoodCombo, giá từ bảng giá
        const merged: UIComboItem[] = relevantLines
          .filter((line) => !!line.productId)
          .map((line) => {
            const prod = idToProduct.get(line.productId as string);
            return {
              _id: line.productId as string,
              name: line.productName || prod?.name || "Sản phẩm",
              type: line.type === "combo" ? "combo" : "single",
              description: prod?.description || "",
              price: line.price || 0,
              quantity: 99,
            } as UIComboItem;
          });

        setCombos(merged);

        // 5) Khởi tạo combo counts
        const initialCounts: Record<string, number> = {};
        merged.forEach((item) => {
          initialCounts[item._id] = 0;
        });
        setComboCounts(initialCounts);
      } catch (error) {
        console.error("Lỗi khi tải dịch vụ từ bảng giá:", error);
        setCombos([]);
        setComboCounts({});
      } finally {
        setCombosLoading(false);
      }
    };

    loadServicesFromPriceList();
  }, []);

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return dateString;

    // Nếu dateString đã ở format DD/MM/YYYY thì return luôn
    if (dateString.includes("/")) return dateString;

    try {
      // Xử lý format YYYY-MM-DD
      if (dateString.includes("-")) {
        const [year, month, day] = dateString.split("-");
        if (year && month && day) {
          return `${day.padStart(2, "0")}/${month.padStart(2, "0")}/${year}`;
        }
      }

      // Xử lý các format khác bằng Date object
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return dateString;

      const day = date.getDate().toString().padStart(2, "0");
      const month = (date.getMonth() + 1).toString().padStart(2, "0");
      const year = date.getFullYear();

      return `${day}/${month}/${year}`;
    } catch (error) {
      console.error("Error formatting date:", error);
      return dateString;
    }
  };

  const handleApplyVoucher = async () => {
    if (!voucherCode.trim()) {
      setVoucherError("Vui lòng nhập mã voucher");
      return;
    }

    setVoucherLoading(true);
    setVoucherError("");

    try {
      // B1: kiểm tra hợp lệ cơ bản
    const response = await validateVoucherApi(voucherCode, user?._id);
      if (!response || !(response as VoucherResponse).status) {
        setVoucherError((response as VoucherResponse)?.message || "Mã voucher không hợp lệ");
        setAppliedVoucher(null);
        return;
      }

      // B2: áp dụng theo tổng hiện tại để tính đúng phần trăm và trần tối đa
      const applyRes = await applyVoucherApi(voucherCode, currentSubTotal, user?._id);
      if (!applyRes || !applyRes.status || !applyRes.data) {
        setVoucherError(applyRes?.message || "Không áp dụng được voucher");
      setAppliedVoucher(null);
      return;
    }

      const percent = (response as VoucherResponse)?.data?.discount || 0;
      const cap = Number(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ((response as any)?.data?.voucher?.maxDiscountValue) ?? undefined
      ) || undefined;
      setAppliedVoucher({
        code: voucherCode,
        discountPercent: percent,
        discountAmount: applyRes.data.discountAmount || 0,
        maxCap: cap,
      });
      setVoucherError("");
    } catch {
      setVoucherError("Có lỗi xảy ra khi kiểm tra voucher");
      setAppliedVoucher(null);
    } finally {
    setVoucherLoading(false);
    }
  };

  const handleRemoveVoucher = () => {
    setAppliedVoucher(null);
    setVoucherCode("");
    setVoucherError("");
  };

  const handleOpenModal = () => {
    if (!editableUserInfo.fullName.trim()) {
      message.warning("Vui lòng nhập họ tên");
      return;
    }
    if (!editableUserInfo.phoneNumber.trim()) {
      message.warning("Vui lòng nhập số điện thoại");
      return;
    }
    if (!editableUserInfo.email.trim()) {
      message.warning("Vui lòng nhập email");
      return;
    }
    setIsModalOpen(true);
    setIsModalPaymentOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalPaymentOpen(false);
  };

  const handlePayment = async () => {
    setIsPaymentLoading(true);

    try {
      // Chuẩn bị dữ liệu cho API tạo order
      const orderData = {
        userId: user?._id || "",
        movieId: movie._id,
        theaterId: theaterId || movie.theaterId,
        showtimeId: showtimeId || movie.showtimeId,
        showDate: date,
        showTime: time,
        room: room,
          seats: seats.map((seatId: string) => ({
            seatId,
            type: (seatTypeMap as Record<string, string>)[seatId] || "normal",
            // Giá lấy từ bảng giá đang hoạt động theo loại ghế; fallback 0
            price: (() => {
              const type = (seatTypeMap as Record<string, string>)[seatId];
              // Map giá theo loại ghế đã được tính ở dưới: ticketPriceMap
              return ticketPriceMap[type || ""] || 0;
            })()
          })),
        foodCombos: Object.entries(comboCounts)
          .filter(([, count]) => count > 0)
          .map(([comboId, count]) => {
            const combo = combos.find(c => c._id === comboId);
            return {
              comboId,
              quantity: count,
              price: combo?.price || 0
            };
          }),
        voucherId: appliedVoucher?.code || null,
        paymentMethod: paymentMethod,
        customerInfo: {
          fullName: editableUserInfo.fullName,
          phoneNumber: editableUserInfo.phoneNumber,
          email: editableUserInfo.email
        }
      };


      // Gọi API tạo order
      try {
        const orderResult = await createOrderApi(orderData);
        // orderResult theo chuẩn IBackendResponse
        // Nếu backend trả status=false hoặc không có data → hiển thị message cụ thể và dừng
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const orderOk = !!orderResult && (orderResult as any)?.status !== false && (orderResult as any)?.data;
        if (!orderOk) {
          const backendMsg = (orderResult as any)?.message || 'Không thể tạo đơn hàng. Vui lòng thử lại.';
          message.error(backendMsg);
          setIsPaymentLoading(false);
          return;
        }
        
        // Gọi API thanh toán
        const paymentData = {
          paymentMethod: paymentMethod,
          returnUrl: "http://localhost:3000/payment/success",
          cancelUrl: "http://localhost:3000/payment/cancel"
        };

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const orderId = (orderResult.data as any)?.orderId || (orderResult.data as any)?._id || (orderResult as any)?.orderId || (orderResult as any)?._id;
        
        // Persist orderId for cancellation if user aborts payment
        try {
          if (orderId) {
            sessionStorage.setItem('last_order_id', String(orderId));
          }
        } catch (e: unknown) {
          console.error('Error setting last_order_id:', e);
        }

        const paymentResult = await processPaymentApi(orderId, paymentData);
        // Redirect đến URL thanh toán
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const paymentUrl = (paymentResult as any)?.data?.paymentUrl || (paymentResult as any)?.paymentUrl;
        if (paymentUrl) {
          window.location.href = paymentUrl;
        } else {
          const payMsg = (paymentResult as any)?.message || 'Không tạo được đường dẫn thanh toán.';
          message.error(payMsg);
          setIsPaymentLoading(false);
          return;
        }
        
      } catch (apiError) {
        // Hiển thị thông điệp chi tiết từ backend nếu có (ví dụ ghế không khả dụng)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const backendMsg = (apiError as any)?.response?.data?.message || (apiError as any)?.message || 'Có lỗi xảy ra khi tạo đơn hàng/thanh toán.';
        message.error(backendMsg);
        setIsPaymentLoading(false);
        return;
      }

    } catch (error) {
      console.error("Payment error:", error);
      message.error(error instanceof Error ? error.message : "Có lỗi xảy ra trong quá trình thanh toán!");
    } finally {
      setIsPaymentLoading(false);
    }
  };

  // Tính tổng tiền combo
  const comboTotal = combos.reduce(
    (sum, c) => sum + (comboCounts[c._id] || 0) * (c.price || 0),
    0
  );

  // Tính tiền vé từ seatTypeCounts và bảng giá hiện tại (đã load ở SelectSeat và truyền tổng)
  // Fallback: nếu không có seatTypeCounts, tạm tính 0 để tránh sai số
  const [ticketTotal, setTicketTotal] = useState<number>(0);
  const [ticketPriceMap, setTicketPriceMap] = useState<Record<string, number>>({});
  useEffect(() => {
    const calc = async () => {
      try {
        // Lấy bảng giá hiện tại để dự phòng khi vào trực tiếp Payment
        const priceList: IPriceList | null = await getCurrentPriceList();
        const map: Record<string, number> = {};
        (priceList?.lines || []).forEach((l) => {
          if (l.type === 'ticket' && l.seatType) map[l.seatType] = l.price || 0;
        });
        setTicketPriceMap(map);
        const total = Object.entries(seatTypeCounts || {}).reduce((sum, [type, count]) => sum + (map[type] || 0) * (count as number), 0);
        setTicketTotal(total);
      } catch {
        setTicketTotal(0);
      }
    };
    calc();
  }, [seatTypeCounts]);

  // Tính lại discount khi combo total thay đổi
  const currentSubTotal = ticketTotal + comboTotal;
  const voucherDiscount = appliedVoucher?.discountAmount || 0;

  const total = Math.max(0, currentSubTotal - voucherDiscount);

  // Khi tổng thay đổi mà đã có voucher, gọi lại API apply để cập nhật số tiền giảm cho đúng trần
  useEffect(() => {
    const reapply = async () => {
      if (!appliedVoucher?.code) return;
      try {
        const applyRes = await applyVoucherApi(appliedVoucher.code, currentSubTotal, user?._id);
        if (applyRes?.status && applyRes.data) {
          setAppliedVoucher((prev) => prev ? {
            ...prev,
            discountAmount: (applyRes.data?.discountAmount as number) || 0,
          } : prev);
        }
      } catch {
        // ignore
      }
    };
    reapply();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentSubTotal]);

  // Modal hết thời gian đã chuyển sang global ở Layout; không dùng modal cục bộ nữa

  useEffect(() => {
    if (timeLeft <= 0) return;

    const timer = setInterval(() => {
      setTimeLeft((prevTime) => {
        if (prevTime <= 1) {
          // Hết thời gian: đặt cờ để Layout hiển thị modal sau khi redirect
          try { setIsModalOpen(false); } catch (error) {
            console.error("Error setting isModalOpen to false:", error);
          }
          try { sessionStorage.setItem('show_timeout_modal', '1'); } catch (error) {
            console.error("Error setting show_timeout_modal:", error);
          }
          navigate("/");
          return 0;
        }
        return prevTime - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLeft, navigate]);

  return (
    <>
      <div
        className={`${
          isDarkMode
            ? "bg-[#181A20] text-[#f1f1f1]"
            : "bg-[#e7ede7] text-[#162d5a]"
        } min-h-screen py-8`}
      >
        
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row gap-8">
          {/* Thông tin thanh toán */}
          <div
            className={`${
              isDarkMode
                ? "bg-[#23272f] border border-[#3a3d46] text-[#f1f1f1]"
                : "bg-[#e7ede7] text-[#162d5a]"
            } flex-1 rounded-2xl p-6 mb-6 md:mb-0 shadow-lg transition-colors duration-200`}
          >
            <div className="flex items-center justify-between -mt-2">
              <button
                onClick={() => navigate(-1)}
                className={`flex items-center gap-1 px-2 py-1 rounded-lg font-medium select-none cursor-pointer transition-all duration-200 ${
                    isDarkMode
                    ? "text-white hover:underline"
                    : "text-gray-700 hover:underline"
                }`}
                aria-label="Quay lại"
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
              </div>
            {/* Phần nhập thông tin thanh toán đã được chuyển sang panel bên phải */}

            {/* Dịch vụ kèm */}
            <h3
              className={`text-lg font-bold text-center mb-2 ${
                isDarkMode ? "text-cyan-400" : "text-blue-700"
              }`}
            >
              Dịch vụ kèm
            </h3>
            {combosLoading ? (
              <div className="text-center py-4">
                <span
                  className={isDarkMode ? "text-gray-300" : "text-gray-600"}
                >
                  Đang tải combo...
                </span>
              </div>
            ) : combos.length > 0 ? (
              <div
                className={`rounded-lg overflow-hidden mb-4 ${
                  isDarkMode ? "bg-[#23272f]" : "bg-white"
                } shadow-sm border ${
                  isDarkMode ? "border-gray-700" : "border-gray-200"
                }`}
                style={{ 
                  maxHeight: '400px', 
                  overflowY: 'auto'
                }}
              >
                <table className={`w-full ${isDarkMode ? "" : "bg-[#e7ede7]"}`}>
                  <thead className="sticky top-0 z-10">
                    <tr
                      className={`text-left select-none border-b ${
                        isDarkMode ? "border-gray-600 bg-[#1a1f2e]" : "border-gray-300 bg-gray-50"
                      }`}
                    >
                      <th
                        className={`py-2 text-center font-bold ${
                          isDarkMode ? "text-white" : ""
                        }`}
                      >
                        Sản phẩm/Combo
                      </th>
                      <th
                        className={`py-2 text-center font-bold ${
                          isDarkMode ? "text-white" : ""
                        }`}
                      >
                        Mô tả
                      </th>
                      <th
                        className={`py-2 text-center font-bold ${
                          isDarkMode ? "text-white" : ""
                        }`}
                      >
                        Giá
                      </th>
                      <th
                        className={`py-2 text-center font-bold ${
                          isDarkMode ? "text-white" : ""
                        }`}
                      >
                        Chọn số lượng
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {combos.map((c) => (
                      <tr
                        key={c._id}
                        className={`select-none transition-colors duration-200 ${
                          c.quantity === 0 ? "opacity-60" : ""
                        }`}
                      >
                        <td className="py-3 font-semibold text-center">
                          <div
                            className={`text-base ${
                              c.quantity === 0 ? "text-gray-500" : ""
                            }`}
                          >
                            {c.name}
                          </div>
                        </td>
                        <td className="py-3 text-sm text-center">
                            <span
                              className={
                                c.quantity === 0 ? "text-gray-500" : ""
                              }
                            >
                              {c.description}
                            </span>
                        </td>
                        <td className="py-3 text-center">
                            <span
                              className={`font-bold text-base ${
                                c.quantity === 0
                                  ? "text-gray-500"
                                  : isDarkMode
                                  ? "text-green-400"
                                  : "text-green-600"
                              }`}
                            >
                            {c.price ? c.price.toLocaleString() : '0'} VNĐ
                            </span>
                        </td>
                        <td className="py-1 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={() =>
                                setComboCounts((prev) => ({
                                  ...prev,
                                  [c._id]: Math.max(0, (prev[c._id] || 0) - 1),
                                }))
                              }
                              disabled={(comboCounts[c._id] || 0) <= 0}
                              className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-lg transition-all duration-200 ${
                                (comboCounts[c._id] || 0) <= 0
                                  ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                                  : isDarkMode
                                  ? "bg-red-600 hover:bg-red-500 text-white shadow-lg hover:shadow-xl cursor-pointer"
                                  : "bg-red-500 hover:bg-red-600 text-white shadow-lg hover:shadow-xl cursor-pointer"
                              }`}
                            >
                              −
                            </button>

                            <div className="flex flex-col items-center min-w-[40px]">
                              <span
                                className={`text-lg font-bold ${
                                  isDarkMode ? "text-white" : "text-gray-800"
                                }`}
                              >
                                {comboCounts[c._id] || 0}
                              </span>
                            </div>

                            <button
                              onClick={() =>
                                setComboCounts((prev) => ({
                                  ...prev,
                                  [c._id]: Math.min(
                                    c.quantity,
                                    (prev[c._id] || 0) + 1
                                  ),
                                }))
                              }
                              disabled={(comboCounts[c._id] || 0) >= c.quantity}
                              className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-lg transition-all duration-200 ${
                                (comboCounts[c._id] || 0) >= c.quantity
                                  ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                                  : isDarkMode
                                  ? "bg-green-600 hover:bg-green-500 text-white shadow-lg hover:shadow-xl cursor-pointer"
                                  : "bg-green-500 hover:bg-green-600 text-white shadow-lg hover:shadow-xl cursor-pointer"
                              }`}
                            >
                              +
                            </button>
                          </div>

                          {(comboCounts[c._id] || 0) >= c.quantity &&
                            c.quantity > 0 && (
                              <div className="text-xs text-orange-500 mt-1 font-medium">
                                Đã đạt giới hạn
                              </div>
                            )}

                          {c.quantity === 0 && (
                            <div className="text-xs text-red-500 mt-1 font-medium">
                              Hết hàng
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-4">
                <span
                  className={isDarkMode ? "text-gray-300" : "text-gray-600"}
                >
                  Không có sản phẩm/combo nào
                </span>
              </div>
            )}

            {/* Voucher đã được chuyển sang panel bên phải, ngay dưới 'Thông tin thanh toán' */}

            {/* Phương thức thanh toán */}
            <h3
              className={`text-lg font-bold text-center mt-8 mb-3 ${
                isDarkMode ? "text-cyan-400" : "text-blue-700"
              }`}
            >
              Phương thức thanh toán
            </h3>

            <div className="mb-4">
              <div className="space-y-3">
                {/* MOMO */}
                <label className={`flex items-center p-3 rounded-lg border cursor-pointer transition-all duration-200 ${
                  paymentMethod === 'MOMO' 
                    ? isDarkMode 
                      ? 'bg-blue-900/30 border-blue-500' 
                      : 'bg-[#f5f3ff] border-blue-400' // light mode selected: subtle lavender
                    : isDarkMode 
                      ? 'bg-[#232c3b] border-[#3a3d46] hover:bg-[#2a2f3a]' 
                      : 'bg-[#f7f7f9] border-gray-300 hover:bg-[#f0f0f3]' // light mode idle: soft gray
                }`}>
                  <input
                    type="radio"
                    name="paymentMethod"
                    value="MOMO"
                    checked={paymentMethod === 'MOMO'}
                    onChange={(e) => setPaymentMethod(e.target.value as 'MOMO' | 'VNPAY')}
                    className="mr-3 w-4 h-4 text-blue-600"
                  />
                  <div className="flex items-center">
                    <img
                      src={momoLogo}
                      alt="MOMO"
                      className="w-8 h-8 object-contain mr-3 rounded"
                      width={32}
                      height={32}
                      loading="lazy"
                    />
                    <span className="text-sm font-medium">MOMO</span>
                  </div>
                </label>

                {/* VNPAY */}
                <label className={`flex items-center p-3 rounded-lg border cursor-pointer transition-all duration-200 ${
                  paymentMethod === 'VNPAY' 
                    ? isDarkMode 
                      ? 'bg-blue-900/30 border-blue-500' 
                      : 'bg-[#eef5ff] border-blue-400' // light mode selected: pale blue
                    : isDarkMode 
                      ? 'bg-[#232c3b] border-[#3a3d46] hover:bg-[#2a2f3a]' 
                      : 'bg-[#f7f7f9] border-gray-300 hover:bg-[#f0f0f3]'
                }`}>
                  <input
                    type="radio"
                    name="paymentMethod"
                    value="VNPAY"
                    checked={paymentMethod === 'VNPAY'}
                    onChange={(e) => setPaymentMethod(e.target.value as 'MOMO' | 'VNPAY')}
                    className="mr-3 w-4 h-4 text-blue-600"
                  />
                  <div className="flex items-center">
                    <img
                      src={vnpayLogo}
                      alt="VNPAY logo"
                      className="w-8 h-8 object-contain mr-3 rounded"
                      width={32}
                      height={32}
                      loading="lazy"
                    />
                    <span className="text-sm font-medium">VNPAY</span>
                  </div>
                </label>
              </div>
            </div>

            {/* Đã chuyển phần hiển thị tiền giảm và tiền thanh toán sang panel bên phải */}
            <div className="flex justify-between items-center mb-4 mt-6 px-20">
              <div className="text-center">
                <div className="text-red-500 text-[14px] mb-2">
                  Vui lòng kiểm tra lại thông tin
                </div>
                <div className="text-[14px] text-red-500">
                  * Vé mua rồi không hoàn trả lại dưới mọi hình thức
                </div>
              </div>
              <div className="flex flex-col items-center">
                <div className="text-md font-bold text-orange-400 mb-1">
                  Thời gian đặt vé còn lại:
                </div>
                <span
                  className={`px-4 py-1 mt-1 rounded font-bold ${
                    timeLeft <= 60
                      ? "bg-red-600 text-white animate-pulse"
                      : isDarkMode
                      ? "bg-gradient-to-r from-orange-500 to-red-500 text-white shadow-lg"
                      : "bg-[#fff] text-red-600"
                  }`}
                >
                  {formatTime(timeLeft)}
                </span>
              </div>
            </div>
          </div>

          {/* Thông tin phim */}
          <div
            className={`${
              isDarkMode
                ? "bg-[#23272f] border border-[#3a3d46] text-[#f1f1f1]"
                : "bg-[#e7ede7] text-[#162d5a]"
            } w-full md:w-[340px] rounded-2xl shadow-lg p-6 transition-colors duration-200`}
          >
            <div className="detail_movie_container">
              <img
                src={movie.poster || movie.image}
                alt={movie.title || movie.movie_name}
                className="detail_movie_img w-32 h-44 object-cover rounded mb-3 border border-[#3a3d46] mx-auto block"
              />
              <p
                className={`detail_movie_title text-lg font-semibold text-center mb-4 ${
                  isDarkMode ? "text-cyan-400" : "text-blue-700"
                }`}
              >
                {movie.title || movie.movie_name}
              </p>
              <div className="detail_movie_info space-y-2">
                <div className="row flex justify-between text-sm">
                  <p className="label font-bold">Hình thức:</p>
                  <p className={`value ${isDarkMode ? "text-gray-200" : ""}`}>
                    2D, Phụ đề Tiếng Việt
                  </p>
                </div>
                <div className="row flex justify-between text-sm">
                  <p className="label font-bold">Thể loại:</p>
                  <p className={`value ${isDarkMode ? "text-gray-200" : ""}`}>
                    {movie.genre}
                  </p>
                </div>
                <div className="row flex justify-between text-sm">
                  <p className="label font-bold">Thời lượng:</p>
                  <p className={`value ${isDarkMode ? "text-gray-200" : ""}`}>
                    {movie.duration} phút
                  </p>
                </div>
                <div className="row flex justify-between text-sm">
                  <p className="label font-bold">Rạp chiếu:</p>
                  <p className={`value ${isDarkMode ? "text-gray-200" : ""}`}>
                    {cinema}
                  </p>
                </div>
                <div className="row flex justify-between text-sm">
                  <p className="label font-bold">Ngày chiếu:</p>
                  <p className={`value ${isDarkMode ? "text-gray-200" : ""}`}>
                    {formatDate(date)}
                  </p>
                </div>
                <div className="row flex justify-between text-sm">
                  <p className="label font-bold">Giờ chiếu:</p>
                  <p className={`value ${isDarkMode ? "text-gray-200" : ""}`}>
                    {time}
                  </p>
                </div>
                <div className="row flex justify-between text-sm">
                  <p className="label font-bold">Phòng chiếu:</p>
                  <p className={`value ${isDarkMode ? "text-gray-200" : ""}`}>
                    {room || "P1"}
                  </p>
                </div>
                <div className="row flex justify-between text-sm">
                  <p className="label font-bold">Ghế ngồi:</p>
                  <p className={`value ${isDarkMode ? "text-gray-200" : ""}`}>
                    {seats && seats.length > 0 ? seats.join(", ") : ""}
                  </p>
                </div>

                {/* Voucher (moved here) */}
                <div className="mt-4">
                      <h4 className={`mt-4 text-lg text-center font-bold mb-2 ${isDarkMode ? 'text-cyan-300' : 'text-blue-600'}`}>Giảm giá</h4>
                      {!appliedVoucher ? (
                        <div className="mb-3">
                          <div className="flex items-center gap-2">
                            <input
                              type="text"
                              value={voucherCode}
                              onChange={(e) => {
                                setVoucherCode(e.target.value.toUpperCase());
                                if (e.target.value.trim() === "") {
                                  setVoucherError("");
                                }
                              }}
                              placeholder="Nhập mã voucher"
                              className={`flex-1 border rounded-md px-2.5 py-1.5 ${
                                isDarkMode
                                  ? "bg-[#232c3b] text-white border-[#3a3d46] placeholder-gray-400"
                                  : "border-gray-300"
                              }`}
                            />
                            <button
                              onClick={handleApplyVoucher}
                              disabled={voucherLoading || !voucherCode.trim()}
                              className={`px-2 py-1.5 rounded font-semibold transition-all duration-200 ${
                                voucherLoading || !voucherCode.trim()
                                  ? "bg-gray-400 text-gray-600 cursor-not-allowed"
                                  : isDarkMode
                                  ? "bg-cyan-600 hover:bg-cyan-500 text-white cursor-pointer"
                                  : "bg-blue-600 hover:bg-blue-500 text-white cursor-pointer"
                              }`}
                            >
                              {voucherLoading ? "Đang kiểm tra..." : "Áp dụng"}
                            </button>
                          </div>
                          {voucherError && (
                            <div className="text-red-500 text-xs mt-2 select-none">{voucherError}</div>
                          )}
                        </div>
                      ) : (
                        <div className={`border rounded p-3 mb-2 ${
                          isDarkMode ? 'bg-[#232c3b] border-[#3a3d46]' : 'bg-green-50 border-green-300'
                        }`}>
                          <div className="flex justify-between items-center">
                            <div>
                              <div className="font-semibold text-green-600">✓ Mã voucher: {appliedVoucher.code}</div>
                              <div className="text-sm">
                                Bạn được giảm {appliedVoucher.discountPercent}%
                                {typeof appliedVoucher.maxCap === 'number' && (
                                  <> (tối đa {appliedVoucher.maxCap.toLocaleString()} VNĐ)</>
                                )}
                              </div>
                            </div>
                            <button
                              onClick={handleRemoveVoucher}
                              className="text-red-500 hover:text-red-700 font-semibold text-sm cursor-pointer"
                            >
                              Hủy
                            </button>
                          </div>
                        </div>
                      )}
                    </div>

                {/* Thông tin thanh toán (đã chuyển sang bên phải) */}
                <div className="mt-6">
                  <p className={`text-lg font-bold text-center mb-4 ${isDarkMode ? "text-cyan-400" : "text-blue-700"}`}>
                    Thông tin thanh toán
                  </p>
                  <div className="detail_movie_info space-y-2">
                    <div className="row flex justify-between text-sm">
                      <p className="label font-bold">Họ tên:</p>
                      <p className={`value ${isDarkMode ? "text-gray-200" : ""}`}>
                        {editableUserInfo.fullName}
                      </p>
                    </div>
                    <div className="row flex justify-between text-sm">
                      <p className="label font-bold">Điện thoại:</p>
                      <p className={`value ${isDarkMode ? "text-gray-200" : ""}`}>
                        {editableUserInfo.phoneNumber}
                      </p>
                    </div>
                    <div className="row flex justify-between text-sm">
                      <p className="label font-bold">Email:</p>
                      <p className={`value ${isDarkMode ? "text-gray-200" : ""}`}>
                        {editableUserInfo.email}
                      </p>
                    </div>
                    <div className="row flex justify-between text-sm">
                      <p className="label font-bold">Số tiền được giảm:</p>
                      <div className="value text-right">
                        <div className={`font-semibold ${isDarkMode ? "text-green-400" : "text-green-600"}`}>
                         {voucherDiscount.toLocaleString() === "0" ? "0" : `- ${voucherDiscount.toLocaleString()}`} VNĐ 
                        </div>
                        {typeof appliedVoucher?.maxCap === 'number' && voucherDiscount >= (appliedVoucher?.maxCap || 0) && (
                          <div className="text-xs italic" style={{ color: isDarkMode ? '#9ae6b4' : '#16a34a' }}>
                            Đã đạt mức giảm tối đa
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="row flex items-center justify-between text-sm">
                      <p className="label font-bold">Số tiền thanh toán:</p>
                      <p className={`value text-lg font-bold ${isDarkMode ? "text-red-400" : "text-red-600"}`}>
                        {total.toLocaleString()} VNĐ
                      </p>
                    </div>
                  </div>
                </div>

              </div>
              <button
                className={`mt-6 w-full px-6 py-2 rounded font-semibold transition-all duration-200 cursor-pointer ${
                  isDarkMode
                    ? "bg-cyan-400 hover:bg-cyan-300 text-[#23272f]"
                    : "bg-blue-500 text-white hover:bg-blue-600"
                }`}
                onClick={handleOpenModal}
              >
                Thanh toán
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Modal xác nhận thanh toán */}
      <Modal
        title={
          <Title
            level={4}
            style={{
              color: "#e74c3c",
              margin: 0,
              textAlign: "center",
              marginBottom: "20px",
            }}
          >
            Xác nhận thông tin
          </Title>
        }
        open={isModalPaymentOpen}
        onCancel={handleCloseModal}
        footer={[
          <Button key="cancel" onClick={handleCloseModal}>
            Hủy
          </Button>,
          <Button
            key="confirm"
            type="primary"
            loading={isPaymentLoading}
            onClick={handlePayment}
          >
            Xác nhận
          </Button>,
        ]}
        width={500}
        centered
        getContainer={false}
      >
        <div className="text-[14px] leading-[1.6]">
          {/* Thông tin phim */}
          <div className="mb-[20px]">
            <Row gutter={16}>
              <Col span={8}>
                <Text strong>Phim:</Text>
              </Col>
              <Col span={16}>
                <Text>{movie.title}</Text>
              </Col>
            </Row>
            <Row gutter={16}>
              <Col span={8}>
                <Text strong>Rạp chiếu:</Text>
              </Col>
              <Col span={16}>
                <Text>{cinema}</Text>
              </Col>
            </Row>
            <Row gutter={16}>
              <Col span={8}>
                <Text strong>Ngày chiếu:</Text>
              </Col>
              <Col span={16}>
                <Text>{formatDate(date)}</Text>
              </Col>
            </Row>
            <Row gutter={16}>
              <Col span={8}>
                <Text strong>Giờ chiếu:</Text>
              </Col>
              <Col span={16}>
                <Text>{time}</Text>
              </Col>
            </Row>
            <Row gutter={16}>
              <Col span={8}>
                <Text strong>Phòng chiếu:</Text>
              </Col>
              <Col span={16}>
                <Text>{room}</Text>
              </Col>
            </Row>
            <Row gutter={16}>
              <Col span={8}>
                <Text strong>Ghế ngồi:</Text>
              </Col>
              <Col span={16}>
                <Text>
                  {seats && seats.length > 0
                    ? seats.join(", ")
                    : "Chưa chọn ghế"}
                </Text>
              </Col>
            </Row>
          </div>

          {/* Thông tin khách hàng */}
          <div className="mb-[20px]">
              <Title level={5} style={{ textAlign: "left", margin: 0, marginBottom: 8 }}>
              Thông tin khách hàng
            </Title>
            <Row gutter={16}>
              <Col span={8}>
                <Text strong>Họ tên:</Text>
              </Col>
              <Col span={16}>
                <Text>{editableUserInfo.fullName}</Text>
              </Col>
            </Row>
            <Row gutter={16}>
              <Col span={8}>
                <Text strong>Điện thoại:</Text>
              </Col>
              <Col span={16}>
                <Text>{editableUserInfo.phoneNumber}</Text>
              </Col>
            </Row>
            <Row gutter={16}>
              <Col span={8}>
                <Text strong>Email:</Text>
              </Col>
              <Col span={16}>
                <Text>{editableUserInfo.email}</Text>
              </Col>
            </Row>
          </div>

          {/* Dịch vụ kèm */}
          <div className="mb-[20px]">
            <Row gutter={16}>
              <Col span={6}>
                <Text strong style={{ textAlign: "left" }}>
                  Dịch vụ kèm:
                </Text>
              </Col>
              <Col span={18}>
                <div className="text-right mr-[10px]">
                  {Object.values(comboCounts).some((count) => count > 0) ? (
                    combos.map((combo) => {
                      if (comboCounts[combo._id] > 0) {
                        return (
                          <Text
                            key={combo._id}
                            style={{
                              display: "block",
                              fontSize: "14px",
                              marginBottom: "4px",
                            }}
                          >
                            {combo.name} - {comboCounts[combo._id]} x{" "}
                            {new Intl.NumberFormat("vi-VN").format(combo.price || 0)}{" "}
                            VNĐ
                          </Text>
                        );
                      }
                      return null;
                    })
                  ) : (
                    <Text
                      style={{
                        fontSize: "14px",
                        color: "#999",
                        fontStyle: "italic",
                      }}
                    >
                      Không có dịch vụ nào
                    </Text>
                  )}
                </div>
              </Col>
            </Row>
          </div>

          {/* Voucher */}
          {appliedVoucher && (
            <div style={{ marginBottom: "20px" }}>
              <Title level={5} style={{ textAlign: "left", margin: 0, marginBottom: 8 }}>
                Mã giảm giá
              </Title>
              <Row gutter={16}>
                <Col span={8}>
                  <Text strong>Mã voucher:</Text>
                </Col>
                <Col span={16} style={{ textAlign: "right" }}>
                  <Text>{appliedVoucher.code}</Text>
                </Col>
              </Row>
              <Row gutter={16}>
                <Col span={8}>
                  <Text strong>Số tiền được giảm:</Text>
                </Col>
                <Col span={16} style={{ textAlign: "right" }}>
                  <Text style={{ color: "#52c41a" }}>
                    -{voucherDiscount.toLocaleString()} VNĐ
                  </Text>
                </Col>
              </Row>
            </div>
          )}


          {/* Tổng thanh toán */}
          <div className="border-t border-gray-200 pt-[15px] mt-[20px] text-right">
            <Title level={4} style={{ margin: 0, color: "#e74c3c" }}>
              Tổng thanh toán: {total.toLocaleString()} VNĐ
            </Title>
          </div>

          <div className="mt-[10px] text-[13px] text-center text-red-600 select-none">
            (Khi bấm xác nhận sẽ chuyển đến trang thanh toán {paymentMethod})
          </div>
        </div>
      </Modal>
    </>
  );
};

export default PaymentPage;
