/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect, useCallback, useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  Modal,
  Button,
  Typography,
  Row,
  Col,
  message,
  Spin,
  Empty,
} from "antd";
import {
  validateVoucherApi,
  applyVoucherApi,
  createOrderApi,
  processPaymentApi,
  getAmountDiscountApi,
  getActiveItemPromotionsApi,
  applyItemPromotionsApi,
  applyPercentPromotionsApi,
  getMyVouchersApi,
} from "@/services/api";
import { getFoodCombos } from "@/apiservice/apiFoodCombo";
import { getCurrentPriceList } from "@/apiservice/apiPriceList";
import type { IPriceList, IPriceListLine } from "@/apiservice/apiPriceList";
import useAppStore from "@/store/app.store";
import momoLogo from "@/assets/momo.png";
import vnpayLogo from "@/assets/vnpay.png";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import customParseFormat from "dayjs/plugin/customParseFormat";

dayjs.extend(utc);
dayjs.extend(customParseFormat);

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
    userVoucherId?: string;
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
  const userId = user?._id;

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
    userVoucherId?: string;
  } | null>(null);

  // State cho khuyến mãi hàng
  const [appliedItemPromotions, setAppliedItemPromotions] = useState<any[]>([]);

  // State cho khuyến mãi chiết khấu
  const [appliedPercentPromotions, setAppliedPercentPromotions] = useState<
    any[]
  >([]);

  // Tính tiền vé từ seatTypeCounts và bảng giá hiện tại
  const [ticketTotal, setTicketTotal] = useState<number>(0);
  const [ticketPriceMap, setTicketPriceMap] = useState<Record<string, number>>(
    {}
  );

  // Tính toán selectedCombos từ comboCounts - sử dụng useMemo để tránh tạo array mới mỗi lần render
  const selectedCombos = useMemo(
    () =>
      combos
        .filter((combo) => comboCounts[combo._id] > 0)
        .map((combo) => ({
          _id: combo._id,
          quantity: comboCounts[combo._id],
          name: combo.name,
        })),
    [combos, comboCounts]
  );
  const [amountDiscount, setAmountDiscount] = useState<{
    description: string;
    discountAmount: number;
  } | null>(null);
  const [voucherLoading, setVoucherLoading] = useState<boolean>(false);
  const [isVoucherModalOpen, setIsVoucherModalOpen] = useState(false);
  const [voucherListLoading, setVoucherListLoading] = useState(false);
  const [userVouchers, setUserVouchers] = useState<IUserVoucher[]>([]);
  const [voucherError, setVoucherError] = useState<string>("");
  const availableUserVouchers = useMemo(() => {
    const now = Date.now();
    return userVouchers
      .filter((voucher) => {
        if (!voucher || voucher.status !== "unused") return false;
        const endDate = (voucher as IUserVoucher)?.voucherId?.validityPeriod
          ?.endDate;
        if (!endDate) return true;
        return new Date(endDate).getTime() > now;
      })
      .sort((a, b) => {
        const endA =
          new Date(
            a?.voucherId?.validityPeriod?.endDate || "9999-12-31"
          ).getTime() || Number.MAX_SAFE_INTEGER;
        const endB =
          new Date(
            b?.voucherId?.validityPeriod?.endDate || "9999-12-31"
          ).getTime() || Number.MAX_SAFE_INTEGER;
        return endA - endB;
      });
  }, [userVouchers]);
  const [isModalPaymentOpen, setIsModalPaymentOpen] = useState<boolean>(false);
  const [isPaymentLoading, setIsPaymentLoading] = useState<boolean>(false);
  const [paymentMethod, setPaymentMethod] = useState<
    "MOMO" | "VNPAY" | "PAY_LATER"
  >("MOMO");
  const [isPayLaterDisabled, setIsPayLaterDisabled] = useState<boolean>(false);
  const [payLaterDisabledReason, setPayLaterDisabledReason] =
    useState<string>("");

  // Hàm tính toán thời gian còn lại từ giờ hiện tại đến giờ bắt đầu chiếu
  const calculateTimeUntilShowtime = useCallback((): {
    hoursRemaining: number;
    isDisabled: boolean;
  } => {
    if (!date || !time) {
      return { hoursRemaining: 0, isDisabled: false };
    }

    try {
      // Parse thời gian chiếu
      const parseTimeTo24Hour = (
        timeStr: string
      ): { hours: number; minutes: number } | null => {
        try {
          let hours: number;
          let minutes: number;

          if (timeStr.includes("AM") || timeStr.includes("PM")) {
            const timePart = timeStr.replace(/\s*(AM|PM)/i, "");
            const [h, m] = timePart.split(":").map(Number);
            const isPM = /PM/i.test(timeStr);

            if (isPM && h !== 12) {
              hours = h + 12;
            } else if (!isPM && h === 12) {
              hours = 0;
            } else {
              hours = h;
            }
            minutes = m;
          } else {
            const [h, m] = timeStr.split(":").map(Number);
            hours = h;
            minutes = m;
          }
          return { hours, minutes };
        } catch (error) {
          console.error("Error parsing time:", error);
          return null;
        }
      };

      const parsedTime = parseTimeTo24Hour(time);
      if (!parsedTime) {
        return { hoursRemaining: 0, isDisabled: false };
      }

      // Tạo Date object cho thời gian bắt đầu chiếu
      const showDate = new Date(date);
      if (isNaN(showDate.getTime())) {
        return { hoursRemaining: 0, isDisabled: false };
      }

      const showDateTime = new Date(showDate);
      showDateTime.setHours(parsedTime.hours, parsedTime.minutes, 0, 0);

      // Lấy thời gian hiện tại
      const now = new Date();

      // Tính số giờ còn lại (có thể âm nếu đã qua giờ chiếu)
      const hoursRemaining =
        (showDateTime.getTime() - now.getTime()) / (1000 * 60 * 60);

      // Nếu <= 5 tiếng thì disable
      const isDisabled = hoursRemaining <= 5;

      return { hoursRemaining, isDisabled };
    } catch (error) {
      console.error("Error calculating time until showtime:", error);
      return { hoursRemaining: 0, isDisabled: false };
    }
  }, [date, time]);

  // Kiểm tra và cập nhật trạng thái disable cho "Thanh toán sau"
  useEffect(() => {
    const updatePayLaterStatus = () => {
      const { hoursRemaining, isDisabled } = calculateTimeUntilShowtime();

      setIsPayLaterDisabled(isDisabled);

      if (isDisabled) {
        if (hoursRemaining <= 0) {
          setPayLaterDisabledReason(
            "Suất chiếu đã bắt đầu hoặc đã qua giờ chiếu"
          );
        } else {
          const hours = Math.floor(hoursRemaining);
          const minutes = Math.floor((hoursRemaining - hours) * 60);
          setPayLaterDisabledReason(
            `Còn ${hours} giờ ${minutes} phút đến giờ chiếu. Thanh toán sau chỉ áp dụng cho suất chiếu còn hơn 5 giờ.`
          );
        }
      } else {
        setPayLaterDisabledReason("");
      }

      // Nếu đang chọn "Thanh toán sau" nhưng bị disable, chuyển sang MOMO
      if (isDisabled && paymentMethod === "PAY_LATER") {
        setPaymentMethod("MOMO");
        message.warning(
          "Phương thức thanh toán sau không khả dụng cho suất chiếu này. Đã chuyển sang MOMO."
        );
      }
    };

    // Cập nhật ngay lập tức
    updatePayLaterStatus();

    // Cập nhật mỗi phút để đảm bảo trạng thái luôn chính xác
    const interval = setInterval(updatePayLaterStatus, 60000); // 1 phút

    return () => clearInterval(interval);
  }, [date, time, calculateTimeUntilShowtime, paymentMethod]);

  // releaseSeatsOnExit function removed - seats should stay reserved when navigating back

  // TEMPORARILY DISABLED - Setup event listeners (chỉ chạy 1 lần khi component mount)
  // useEffect(() => {
  //   const handleBeforeUnload = () => {
  //     // Release ghế khi đóng tab/refresh
  //     releaseSeatsOnExit();
  //   };

  //   const handleRouteChange = () => {
  //     // Release ghế khi navigate away
  //     releaseSeatsOnExit();
  //   };

  //   // Lắng nghe sự kiện beforeunload (đóng tab, refresh, navigate away)
  //   window.addEventListener('beforeunload', handleBeforeUnload);

  //   // Lắng nghe sự kiện popstate (back/forward button)
  //   window.addEventListener('popstate', handleRouteChange);

  //   // Cleanup function - chỉ remove event listeners
  //   return () => {
  //     window.removeEventListener('beforeunload', handleBeforeUnload);
  //     window.removeEventListener('popstate', handleRouteChange);
  //   };
  // }, []); // Không có dependency để tránh re-run

  // TEMPORARILY DISABLED - Cleanup logic riêng biệt (chỉ chạy khi component unmount thật sự)
  // useEffect(() => {
  //   return () => {
  //     // Kiểm tra xem có đang redirect đến payment gateway không
  //     const isRedirectingToPayment = sessionStorage.getItem('payment_redirecting');

  //     if (!isRedirectingToPayment) {
  //       // Chỉ release ghế khi KHÔNG đang redirect đến payment gateway
  //       releaseSeatsOnExit();
  //     }

  //     // Đảm bảo cờ redirecting được xóa khi component unmount
  //     try {
  //       sessionStorage.removeItem('payment_redirecting');
  //     } catch (e) {
  //       console.error('Error clearing payment_redirecting on unmount:', e);
  //     }
  //   };
  // }, []); // Không có dependency để tránh re-run

  // Set flag khi vào trang payment để đánh dấu có thể quay lại
  useEffect(() => {
    try {
      sessionStorage.setItem("from_payment_page", "true");
      console.log("🏷️ Set from_payment_page flag");
    } catch (error) {
      console.error("Error setting payment page flag:", error);
    }

    // Cleanup: xóa flag khi component unmount (user navigate đến trang khác)
    return () => {
      try {
        sessionStorage.removeItem("from_payment_page");
        console.log("🧹 Removed from_payment_page flag on unmount");
      } catch (error) {
        console.error("Error removing payment page flag:", error);
      }
    };
  }, []);

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

  const voucherDateFormats = [
    "DD/MM/YYYY",
    "D/M/YYYY",
    "YYYY-MM-DD",
    "YYYY/MM/DD",
  ];

  const normalizeVoucherDateString = (value: string) => {
    const weirdPattern = value.match(
      /^(\d{1,2})T([\d:.]+)(?:Z)?\/(\d{1,2})\/(\d{4})$/i
    );
    if (!weirdPattern) return value;
    const [, dayStr, timeStr, monthStr, yearStr] = weirdPattern;
    const isoCandidate = `${yearStr.padStart(4, "0")}-${monthStr.padStart(
      2,
      "0"
    )}-${dayStr.padStart(2, "0")}T${timeStr}${
      timeStr.endsWith("Z") ? "" : "Z"
    }`;
    return isoCandidate;
  };

  const parseVoucherDateString = (value: string) => {
    for (const format of voucherDateFormats) {
      const parsed = dayjs(value, format, true);
      if (parsed.isValid()) {
        return parsed;
      }
    }
    const normalized = normalizeVoucherDateString(value);
    const normalizedParsed = dayjs(normalized);
    if (normalizedParsed.isValid()) {
      return normalizedParsed;
    }
    const isoParsed = dayjs(value);
    return isoParsed.isValid() ? isoParsed : null;
  };

  const formatVoucherExpiry = (rawDate?: string | Date) => {
    if (!rawDate) return "";

    if (rawDate instanceof Date) {
      const parsed = dayjs(rawDate);
      return parsed.isValid() ? parsed.local().format("DD/MM/YYYY") : "";
    }

    const input = rawDate.trim();
    const parsed =
      parseVoucherDateString(input) ||
      parseVoucherDateString(input.replace(/\s+/g, " ")) ||
      dayjs(input);

    return parsed && parsed.isValid()
      ? parsed.local().format("DD/MM/YYYY")
      : input;
  };

  const handleApplyVoucher = async (codeOverride?: string) => {
    const normalizedCode = (codeOverride ?? voucherCode).trim().toUpperCase();
    if (!normalizedCode) {
      setVoucherError("Vui lòng chọn voucher để áp dụng");
      return;
    }

    setVoucherLoading(true);
    setVoucherError("");
    setVoucherCode(normalizedCode);

    try {
      // B1: kiểm tra hợp lệ cơ bản
      const response = await validateVoucherApi(normalizedCode, userId);
      if (!response || !(response as VoucherResponse).status) {
        setVoucherError(
          (response as VoucherResponse)?.message || "Mã voucher không hợp lệ"
        );
        setAppliedVoucher(null);
        return;
      }

      // B2: áp dụng theo tổng hiện tại để tính đúng phần trăm và trần tối đa
      const applyRes = await applyVoucherApi(
        normalizedCode,
        currentSubTotal,
        userId
      );
      if (!applyRes || !applyRes.status || !applyRes.data) {
        setVoucherError(applyRes?.message || "Không áp dụng được voucher");
        setAppliedVoucher(null);
        return;
      }

      const percent = (response as VoucherResponse)?.data?.discount || 0;
      const cap =
        Number(
          (response as any)?.data?.voucher?.maxDiscountValue ?? undefined
        ) || undefined;
      setAppliedVoucher({
        code: normalizedCode,
        discountPercent: percent,
        discountAmount: applyRes.data.discountAmount || 0,
        maxCap: cap,
        userVoucherId: applyRes.data.userVoucherId,
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

  const fetchUserVouchers = useCallback(async () => {
    if (!userId) return;
    setVoucherListLoading(true);
    try {
      const response = await getMyVouchersApi();
      if (response.status && Array.isArray(response.data)) {
        setUserVouchers(response.data || []);
      } else {
        setUserVouchers([]);
      }
    } catch (error) {
      console.error("Error loading user vouchers:", error);
      setUserVouchers([]);
      message.error("Không thể tải danh sách voucher, vui lòng thử lại.");
    } finally {
      setVoucherListLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    if (userId) {
      fetchUserVouchers();
    } else {
      setUserVouchers([]);
    }
  }, [userId, fetchUserVouchers]);

  const handleOpenVoucherModal = () => {
    if (!userId) {
      message.info("Vui lòng đăng nhập để xem voucher của bạn.");
      setIsModalOpen(true);
      return;
    }
    setIsVoucherModalOpen(true);
    fetchUserVouchers();
  };

  const handleSelectVoucher = async (voucher: IUserVoucher) => {
    if (!voucher?.code) {
      message.error("Voucher không hợp lệ, vui lòng chọn voucher khác.");
      return;
    }
    setIsVoucherModalOpen(false);
    await handleApplyVoucher(voucher.code);
  };

  // Load danh sách khuyến mãi hàng đang hoạt động
  const loadActiveItemPromotions = async () => {
    try {
      const response = await getActiveItemPromotionsApi();
      if (response.status && response.data) {
        console.log("Loaded active item promotions:", response.data);
      }
    } catch (error) {
      console.error("Error loading item promotions:", error);
    }
  };

  // Tự động áp dụng khuyến mãi hàng cho cả combo và vé (không hiển thị message)
  const applyItemPromotionsAuto = useCallback(async () => {
    // Chỉ áp dụng nếu có combo hoặc có vé
    if (selectedCombos.length === 0 && (!seats || seats.length === 0)) {
      setAppliedItemPromotions([]);
      return;
    }

    try {
      const comboData = selectedCombos.map((combo) => ({
        comboId: combo._id,
        quantity: combo.quantity,
        name: combo.name,
      }));

      // Chuẩn bị dữ liệu vé để gửi lên API
      const seatData = seats.map((seatId: string) => {
        const seatType = (seatTypeMap[seatId] || "normal").toLowerCase(); // Normalize to lowercase
        return {
          seatId: seatId,
          type: seatType,
          price: 0, // Price không cần thiết cho logic khuyến mãi hàng
        };
      });

      const response = await applyItemPromotionsApi(comboData, [], seatData);

      console.log("🎯 Frontend API Response:", response);
      console.log("🎯 Selected combos:", comboData);
      console.log("🎯 Selected seats:", seatData);

      if (response.status && response.data) {
        console.log(
          "🎯 Setting applied promotions:",
          response.data.applicablePromotions
        );
        setAppliedItemPromotions(response.data.applicablePromotions);
      } else {
        console.log("🎯 No promotions found");
        setAppliedItemPromotions([]);
      }
    } catch (error) {
      console.error("Error applying item promotions:", error);
      setAppliedItemPromotions([]);
    }
  }, [selectedCombos, seats, seatTypeMap]);

  // Tự động áp dụng khuyến mãi chiết khấu cho cả combo và vé (không hiển thị message)
  const applyPercentPromotionsAuto = useCallback(async () => {
    // Chỉ áp dụng nếu có combo hoặc có vé
    if (selectedCombos.length === 0 && (!seats || seats.length === 0)) {
      setAppliedPercentPromotions([]);
      return;
    }

    try {
      const comboData = selectedCombos.map((combo) => {
        const fullCombo = combos.find((c) => c._id === combo._id);
        return {
          comboId: combo._id,
          quantity: combo.quantity,
          name: combo.name,
          price: fullCombo?.price || 0,
        };
      });

      // Chuẩn bị dữ liệu vé với giá để tính phần trăm giảm
      // Lấy giá vé từ ticketPriceMap (đã được load từ price list)
      const seatDataWithPrice = seats.map((seatId: string) => {
        const seatType = (seatTypeMap[seatId] || "normal").toLowerCase(); // Normalize to lowercase
        // Lấy giá từ ticketPriceMap theo loại ghế (normalize seatType để match với price list)
        const seatPrice = ticketPriceMap[seatType] || 0;

        console.log(
          `🎯 Seat ${seatId}: type=${seatType}, price=${seatPrice} from ticketPriceMap[${seatType}]`
        );

        return {
          seatId: seatId,
          type: seatType,
          price: seatPrice, // Giá vé từ price list, để backend tính phần trăm giảm
        };
      });

      console.log(
        "🎯 Percent promotions - seatDataWithPrice:",
        seatDataWithPrice
      );
      console.log("🎯 Percent promotions - ticketPriceMap:", ticketPriceMap);
      console.log("🎯 Percent promotions - seatTypeMap:", seatTypeMap);

      const response = await applyPercentPromotionsApi(
        comboData,
        [],
        seatDataWithPrice
      );

      if (response.status && response.data) {
        setAppliedPercentPromotions(response.data.applicablePromotions);
      } else {
        setAppliedPercentPromotions([]);
      }
    } catch (error) {
      console.error("Error applying percent promotions:", error);
      setAppliedPercentPromotions([]);
    }
  }, [selectedCombos, seats, seatTypeMap, combos, ticketPriceMap]);

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
    setIsModalPaymentOpen(true);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalPaymentOpen(false);
    setIsModalOpen(false);
  };

  const handlePayment = async () => {
    setIsPaymentLoading(true);

    try {
      // Chuẩn bị dữ liệu cho API tạo order
      const orderData = {
        userId: userId || "",
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
          })(),
        })),
        foodCombos: Object.entries(comboCounts)
          .filter(([, count]) => count > 0)
          .map(([comboId, count]) => {
            const combo = combos.find((c) => c._id === comboId);
            return {
              comboId,
              quantity: count,
              price: combo?.price || 0,
            };
          }),
        voucherId: appliedVoucher?.userVoucherId || null,
        paymentMethod: paymentMethod,
        customerInfo: {
          fullName: editableUserInfo.fullName,
          phoneNumber: editableUserInfo.phoneNumber,
          email: editableUserInfo.email,
        },
      };

      // Gọi API tạo order
      try {
        const orderResult = await createOrderApi(orderData);
        // orderResult theo chuẩn IBackendResponse
        // Nếu backend trả status=false hoặc không có data → hiển thị message cụ thể và dừng
        const orderOk =
          !!orderResult &&
          (orderResult as any)?.status !== false &&
          (orderResult as any)?.data;
        if (!orderOk) {
          const backendMsg =
            (orderResult as any)?.message ||
            "Không thể tạo đơn hàng. Vui lòng thử lại.";
          message.error(backendMsg);
          setIsPaymentLoading(false);
          return;
        }

        // Nếu là thanh toán sau, chỉ tạo order và hiển thị thông báo
        if (paymentMethod === "PAY_LATER") {
          message.success(
            "Đã xác nhận phương thức thanh toán sau. Vui lòng thanh toán trong lịch sử giao dịch."
          );
          setIsModalPaymentOpen(false);
          setIsPaymentLoading(false);
          // Navigate to booking history after a short delay
          setTimeout(() => {
            navigate("/booking-history");
          }, 1500);
          return;
        }

        // Gọi API thanh toán cho MOMO và VNPAY
        const paymentData = {
          paymentMethod: paymentMethod,
          returnUrl: "https://cinejoy.vercel.app/payment/success",
          cancelUrl: "https://cinejoy.vercel.app/payment/cancel",
        };

        const orderId =
          (orderResult.data as any)?.orderId ||
          (orderResult.data as any)?._id ||
          (orderResult as any)?.orderId ||
          (orderResult as any)?._id;

        // Persist orderId for cancellation if user aborts payment
        try {
          if (orderId) {
            sessionStorage.setItem("last_order_id", String(orderId));
          }
        } catch (e: unknown) {
          console.error("Error setting last_order_id:", e);
        }

        const paymentResult = await processPaymentApi(orderId, paymentData);
        // Redirect đến URL thanh toán
        const paymentUrl =
          (paymentResult as any)?.data?.paymentUrl ||
          (paymentResult as any)?.paymentUrl;
        if (paymentUrl) {
          // Set flag để không release ghế khi redirect đến payment gateway
          try {
            sessionStorage.setItem("payment_redirecting", "1");
          } catch (e) {
            console.error("Error setting payment_redirecting flag:", e);
          }
          window.location.href = paymentUrl;
        } else {
          const payMsg =
            (paymentResult as any)?.message ||
            "Không tạo được đường dẫn thanh toán.";
          message.error(payMsg);
          setIsPaymentLoading(false);
          return;
        }
      } catch (apiError) {
        // Hiển thị thông điệp chi tiết từ backend nếu có (ví dụ ghế không khả dụng)
        const backendMsg =
          (apiError as any)?.response?.data?.message ||
          (apiError as any)?.message ||
          "Có lỗi xảy ra khi tạo đơn hàng/thanh toán.";
        message.error(backendMsg);
        setIsPaymentLoading(false);
        return;
      }
    } catch (error) {
      console.error("Payment error:", error);
      message.error(
        error instanceof Error
          ? error.message
          : "Có lỗi xảy ra trong quá trình thanh toán!"
      );
    } finally {
      setIsPaymentLoading(false);
    }
  };

  // Tính tổng tiền combo
  const comboTotal = combos.reduce(
    (sum, c) => sum + (comboCounts[c._id] || 0) * (c.price || 0),
    0
  );
  useEffect(() => {
    const calc = async () => {
      try {
        // Lấy bảng giá hiện tại để dự phòng khi vào trực tiếp Payment
        const priceList: IPriceList | null = await getCurrentPriceList();
        const map: Record<string, number> = {};
        (priceList?.lines || []).forEach((l) => {
          if (l.type === "ticket" && l.seatType) {
            // Normalize seatType to lowercase để match với database
            const normalizedSeatType = (l.seatType || "").toLowerCase();
            map[normalizedSeatType] = l.price || 0;
          }
        });
        console.log("🎯 Payment - ticketPriceMap from price list:", map);
        setTicketPriceMap(map);
        const total = Object.entries(seatTypeCounts || {}).reduce(
          (sum, [type, count]) => {
            const normalizedType = (type || "").toLowerCase();
            return sum + (map[normalizedType] || 0) * (count as number);
          },
          0
        );
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
  const amountDiscountValue = amountDiscount?.discountAmount || 0;

  // Tính tổng discount từ percent promotions
  const percentDiscountTotal = appliedPercentPromotions.reduce(
    (sum, promo) => sum + (promo.discountAmount || 0),
    0
  );

  const total = Math.max(
    0,
    currentSubTotal -
      voucherDiscount -
      amountDiscountValue -
      percentDiscountTotal
  );

  // Khi tổng thay đổi mà đã có voucher, gọi lại API apply để cập nhật số tiền giảm cho đúng trần
  useEffect(() => {
    const reapply = async () => {
      if (!appliedVoucher?.code) return;
      try {
        const applyRes = await applyVoucherApi(
          appliedVoucher.code,
          currentSubTotal,
          userId
        );
        if (applyRes?.status && applyRes.data) {
          setAppliedVoucher((prev) =>
            prev
              ? {
                  ...prev,
                  discountAmount:
                    (applyRes.data?.discountAmount as number) || 0,
                  userVoucherId:
                    applyRes.data?.userVoucherId || prev.userVoucherId,
                }
              : prev
          );
        }
      } catch {
        // ignore
      }
    };
    reapply();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentSubTotal]);

  // Tính amount discount khi currentSubTotal thay đổi
  useEffect(() => {
    const calculateAmountDiscount = async () => {
      if (currentSubTotal <= 0) {
        setAmountDiscount(null);
        return;
      }

      try {
        const response = await getAmountDiscountApi(currentSubTotal);
        if (response.status && response.data) {
          setAmountDiscount({
            description: response.data.description,
            discountAmount: response.data.discountAmount,
          });
        } else {
          setAmountDiscount(null);
        }
      } catch (error) {
        console.error("Error getting amount discount:", error);
        setAmountDiscount(null);
      }
    };

    calculateAmountDiscount();
  }, [currentSubTotal]);

  // Modal hết thời gian đã chuyển sang global ở Layout; không dùng modal cục bộ nữa

  useEffect(() => {
    if (timeLeft <= 0) return;

    const timer = setInterval(() => {
      setTimeLeft((prevTime) => {
        if (prevTime <= 1) {
          // Hết thời gian: đặt cờ để Layout hiển thị modal sau khi redirect
          try {
            setIsModalOpen(false);
          } catch (error) {
            console.error("Error setting isModalOpen to false:", error);
          }
          try {
            sessionStorage.setItem("show_timeout_modal", "1");
          } catch (error) {
            console.error("Error setting show_timeout_modal:", error);
          }
          navigate("/");
          return 0;
        }
        return prevTime - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLeft, navigate, setIsModalOpen]);

  // Load khuyến mãi hàng khi component mount
  useEffect(() => {
    loadActiveItemPromotions();
  }, []);

  // Tự động áp dụng khuyến mãi hàng và chiết khấu khi selectedCombos hoặc seats thay đổi
  useEffect(() => {
    // Áp dụng khuyến mãi hàng nếu có combo hoặc có vé
    if (selectedCombos.length > 0 || (seats && seats.length > 0)) {
      applyItemPromotionsAuto();
    } else {
      setAppliedItemPromotions([]);
    }

    // Áp dụng khuyến mãi chiết khấu nếu có combo hoặc có vé
    if (selectedCombos.length > 0 || (seats && seats.length > 0)) {
      applyPercentPromotionsAuto();
    } else {
      setAppliedPercentPromotions([]);
    }
  }, [
    selectedCombos,
    seats,
    applyItemPromotionsAuto,
    applyPercentPromotionsAuto,
  ]);

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
              <div className="flex gap-2">
                <button
                  onClick={async () => {
                    // Release ghế khi quay lại từ trang thanh toán
                    console.log(
                      "🔓 Releasing seats when navigating back from payment page"
                    );

                    try {
                      // Import API function
                      const { releaseSeatsApi } = await import(
                        "@/apiservice/apiShowTime"
                      );

                      // Release ghế đã chọn
                      if (
                        showtimeId &&
                        date &&
                        time &&
                        room &&
                        seats.length > 0
                      ) {
                        console.log("🔓 Releasing seats:", seats);
                        await releaseSeatsApi(
                          showtimeId,
                          date,
                          time,
                          room,
                          seats
                        );
                        console.log(
                          "✅ Successfully released seats when navigating back"
                        );
                      }

                      // Clear cache
                      sessionStorage.removeItem("booking_reserved_info");
                    } catch (error) {
                      console.error(
                        "❌ Error releasing seats when navigating back:",
                        error
                      );
                      // Vẫn navigate back dù có lỗi
                    }

                    navigate(-1);
                  }}
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
                  maxHeight: "400px",
                  overflowY: "auto",
                }}
              >
                <table className={`w-full ${isDarkMode ? "" : "bg-[#e7ede7]"}`}>
                  <thead className="sticky top-0 z-10">
                    <tr
                      className={`text-left select-none border-b ${
                        isDarkMode
                          ? "border-gray-600 bg-[#1a1f2e]"
                          : "border-gray-300 bg-gray-50"
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
                            className={c.quantity === 0 ? "text-gray-500" : ""}
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
                            {c.price ? c.price.toLocaleString() : "0"} VNĐ
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
                <label
                  className={`flex items-center p-3 rounded-lg border cursor-pointer transition-all duration-200 ${
                    paymentMethod === "MOMO"
                      ? isDarkMode
                        ? "bg-blue-900/30 border-blue-500"
                        : "bg-[#f5f3ff] border-blue-400" // light mode selected: subtle lavender
                      : isDarkMode
                      ? "bg-[#232c3b] border-[#3a3d46] hover:bg-[#2a2f3a]"
                      : "bg-[#f7f7f9] border-gray-300 hover:bg-[#f0f0f3]" // light mode idle: soft gray
                  }`}
                >
                  <input
                    type="radio"
                    name="paymentMethod"
                    value="MOMO"
                    checked={paymentMethod === "MOMO"}
                    onChange={(e) =>
                      setPaymentMethod(
                        e.target.value as "MOMO" | "VNPAY" | "PAY_LATER"
                      )
                    }
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
                <label
                  className={`flex items-center p-3 rounded-lg border cursor-pointer transition-all duration-200 ${
                    paymentMethod === "VNPAY"
                      ? isDarkMode
                        ? "bg-blue-900/30 border-blue-500"
                        : "bg-[#eef5ff] border-blue-400" // light mode selected: pale blue
                      : isDarkMode
                      ? "bg-[#232c3b] border-[#3a3d46] hover:bg-[#2a2f3a]"
                      : "bg-[#f7f7f9] border-gray-300 hover:bg-[#f0f0f3]"
                  }`}
                >
                  <input
                    type="radio"
                    name="paymentMethod"
                    value="VNPAY"
                    checked={paymentMethod === "VNPAY"}
                    onChange={(e) =>
                      setPaymentMethod(
                        e.target.value as "MOMO" | "VNPAY" | "PAY_LATER"
                      )
                    }
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

                {/* Thanh toán sau */}
                <label
                  className={`flex flex-col p-3 rounded-lg border transition-all duration-200 ${
                    isPayLaterDisabled
                      ? isDarkMode
                        ? "bg-gray-800/50 border-gray-600 cursor-not-allowed opacity-60"
                        : "bg-gray-100 border-gray-300 cursor-not-allowed opacity-60"
                      : paymentMethod === "PAY_LATER"
                      ? isDarkMode
                        ? "bg-blue-900/30 border-blue-500 cursor-pointer"
                        : "bg-[#f0f9ff] border-blue-400 cursor-pointer"
                      : isDarkMode
                      ? "bg-[#232c3b] border-[#3a3d46] hover:bg-[#2a2f3a] cursor-pointer"
                      : "bg-[#f7f7f9] border-gray-300 hover:bg-[#f0f0f3] cursor-pointer"
                  }`}
                >
                  <div className="flex items-center">
                    <input
                      type="radio"
                      name="paymentMethod"
                      value="PAY_LATER"
                      checked={paymentMethod === "PAY_LATER"}
                      disabled={isPayLaterDisabled}
                      onChange={(e) => {
                        if (!isPayLaterDisabled) {
                          setPaymentMethod(
                            e.target.value as "MOMO" | "VNPAY" | "PAY_LATER"
                          );
                        }
                      }}
                      className="mr-3 w-4 h-4 text-blue-600 disabled:cursor-not-allowed"
                    />
                    <div className="flex items-center flex-1">
                      <svg
                        className={`w-8 h-8 mr-3 ${
                          isPayLaterDisabled ? "text-gray-500" : "text-blue-500"
                        }`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                      <span
                        className={`text-sm font-medium ${
                          isPayLaterDisabled
                            ? isDarkMode
                              ? "text-gray-500"
                              : "text-gray-400"
                            : ""
                        }`}
                      >
                        Thanh toán sau
                      </span>
                    </div>
                  </div>
                  {isPayLaterDisabled && payLaterDisabledReason && (
                    <div
                      className={`mt-2 ml-7 text-xs font-bold ${
                        isDarkMode ? "text-orange-400" : "text-orange-600"
                      }`}
                    >
                      {payLaterDisabledReason}
                    </div>
                  )}
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
                  <h4
                    className={`mt-4 text-lg text-center font-bold mb-2 ${
                      isDarkMode ? "text-cyan-300" : "text-blue-600"
                    }`}
                  >
                    Giảm giá
                  </h4>
                  {!appliedVoucher ? (
                    <div className="mb-3 flex flex-col gap-2">
                      <button
                        onClick={handleOpenVoucherModal}
                        className={`w-full px-6 py-2 rounded-md font-semibold transition-all duration-200 cursor-pointer ${
                          isDarkMode
                            ? "bg-cyan-400 hover:bg-cyan-300 text-[#23272f]"
                            : "bg-blue-300 hover:bg-blue-200 text-black"
                        }`}
                      >
                        {voucherLoading ? "Đang áp dụng..." : "Chọn voucher"}
                      </button>
                      {voucherCode && !voucherLoading && (
                        <div
                          className={`text-sm text-center font-semibold ${
                            isDarkMode ? "text-cyan-200" : "text-blue-600"
                          }`}
                        >
                          Voucher đã chọn:{" "}
                          <span className="uppercase">{voucherCode}</span>
                        </div>
                      )}
                      <div className="text-xs text-center text-gray-400">
                        {userId
                          ? availableUserVouchers.length > 0
                            ? `Bạn có ${availableUserVouchers.length} voucher khả dụng`
                            : "Hiện chưa có voucher khả dụng"
                          : "Đăng nhập để xem voucher của bạn"}
                      </div>
                      {voucherError && (
                        <div className="text-red-500 text-xs mt-2 select-none">
                          {voucherError}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div
                      className={`border rounded p-3 mb-2 ${
                        isDarkMode
                          ? "bg-[#232c3b] border-[#3a3d46]"
                          : "bg-green-50 border-green-300"
                      }`}
                    >
                      <div className="flex justify-between items-center">
                        <div>
                          <div className="font-semibold text-green-600">
                            ✓ Mã voucher: {appliedVoucher.code}
                          </div>
                          <div className="text-sm">
                            Bạn được giảm {appliedVoucher.discountPercent}%
                            {typeof appliedVoucher.maxCap === "number" && (
                              <>
                                {" "}
                                (tối đa {appliedVoucher.maxCap.toLocaleString()}{" "}
                                VNĐ)
                              </>
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
                  <p
                    className={`text-lg font-bold text-center mb-4 ${
                      isDarkMode ? "text-cyan-400" : "text-blue-700"
                    }`}
                  >
                    Thông tin thanh toán
                  </p>
                  <div className="detail_movie_info space-y-2">
                    <div className="row flex justify-between text-sm">
                      <p className="label font-bold">Họ tên:</p>
                      <p
                        className={`value ${isDarkMode ? "text-gray-200" : ""}`}
                      >
                        {editableUserInfo.fullName}
                      </p>
                    </div>
                    <div className="row flex justify-between text-sm">
                      <p className="label font-bold">Điện thoại:</p>
                      <p
                        className={`value ${isDarkMode ? "text-gray-200" : ""}`}
                      >
                        {editableUserInfo.phoneNumber}
                      </p>
                    </div>
                    <div className="row flex justify-between text-sm">
                      <p className="label font-bold">Email:</p>
                      <p
                        className={`value ${isDarkMode ? "text-gray-200" : ""}`}
                      >
                        {editableUserInfo.email}
                      </p>
                    </div>
                    <div className="row flex justify-between text-sm">
                      <p className="label font-bold">Số tiền được giảm:</p>
                      <div className="value text-right">
                        <div
                          className={`font-semibold ${
                            isDarkMode ? "text-green-400" : "text-green-600"
                          }`}
                        >
                          {(
                            voucherDiscount + amountDiscountValue
                          ).toLocaleString() === "0"
                            ? "0"
                            : `- ${(
                                voucherDiscount + amountDiscountValue
                              ).toLocaleString()}`}{" "}
                          VNĐ
                        </div>
                        {typeof appliedVoucher?.maxCap === "number" &&
                          voucherDiscount >= (appliedVoucher?.maxCap || 0) && (
                            <div
                              className="text-xs italic"
                              style={{
                                color: isDarkMode ? "#9ae6b4" : "#16a34a",
                              }}
                            >
                              Đã đạt mức giảm tối đa
                            </div>
                          )}
                        {amountDiscount && (
                          <div
                            className="text-xs italic"
                            style={{
                              color: isDarkMode ? "#9ae6b4" : "#16a34a",
                            }}
                          >
                            {(() => {
                              const text = amountDiscount.description;
                              const parts = text.split(/(\d+[Kk]?|\d+%)/);
                              return parts.map((part: string, i: number) =>
                                /^\d+[Kk]?$|^\d+%$/.test(part) ? (
                                  <strong key={i}>{part}</strong>
                                ) : (
                                  part
                                )
                              );
                            })()}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Hiển thị khuyến mãi chiết khấu */}
                    {appliedPercentPromotions.length > 0 && (
                      <div className="row flex justify-between text-sm">
                        <p className="label font-bold">
                          Khuyến mãi chiết khấu:
                        </p>
                        <div className="value text-right">
                          {appliedPercentPromotions.map((promotion, index) => (
                            <div
                              key={index}
                              className="text-xs italic mb-1"
                              style={{
                                color: isDarkMode ? "#fbbf24" : "#ea580c",
                              }}
                            >
                              {promotion.description ||
                                (promotion.seatType
                                  ? `Giảm ${promotion.discountPercent}% vé ${promotion.seatType}`
                                  : `Giảm ${promotion.discountPercent}% ${
                                      promotion.comboName || ""
                                    }`)}
                              <div
                                className="font-semibold"
                                style={{
                                  color: isDarkMode ? "#dc2626" : "#dc2626",
                                }}
                              >
                                -{promotion.discountAmount.toLocaleString()}₫
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Hiển thị khuyến mãi hàng */}
                    {appliedItemPromotions.length > 0 && (
                      <div className="row flex justify-between text-sm items-center">
                        <p className="label font-bold">Khuyến mãi hàng:</p>
                        <div className="value text-right">
                          {appliedItemPromotions.map((promotion, index) => (
                            <div
                              key={index}
                              className="text-xs italic mb-1"
                              style={{
                                color: isDarkMode ? "#9ae6b4" : "#16a34a",
                                paddingTop: "4px",
                              }}
                            >
                              {promotion.detail?.description ||
                                `Mua ${promotion.detail?.buyQuantity} ${promotion.detail?.buyItem} tặng ${promotion.rewardQuantity} ${promotion.rewardItem}`}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="row flex items-center justify-between text-sm">
                      <p className="label font-bold">Số tiền thanh toán:</p>
                      <p
                        className={`value text-lg font-bold ${
                          isDarkMode ? "text-red-400" : "text-red-600"
                        }`}
                      >
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
            <Title
              level={5}
              style={{ textAlign: "left", margin: 0, marginBottom: 8 }}
            >
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
                            {new Intl.NumberFormat("vi-VN").format(
                              combo.price || 0
                            )}{" "}
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

                  {/* Hiển thị khuyến mãi chiết khấu */}
                  {appliedPercentPromotions.map((promotion, index) => (
                    <Text
                      key={`percent-promotion-${index}`}
                      style={{
                        display: "block",
                        fontSize: "14px",
                        marginTop: "4px",
                        color: "#16a34a",
                        fontWeight: "500",
                      }}
                    >
                      <span>
                        {promotion.description ? (
                          // Parse description để làm đậm số tiền và phần trăm
                          (() => {
                            const text = promotion.description;
                            const parts = text.split(/(\d+[Kk]?|\d+%)/);
                            return parts.map((part: string, i: number) =>
                              /^\d+[Kk]?$|^\d+%$/.test(part) ? (
                                <strong key={i}>{part}</strong>
                              ) : (
                                part
                              )
                            );
                          })()
                        ) : // Fallback nếu không có description
                        promotion.seatType ? (
                          <>
                            Giảm <strong>{promotion.discountPercent}%</strong>{" "}
                            vé {promotion.seatType}
                          </>
                        ) : (
                          <>
                            Giảm <strong>{promotion.discountPercent}%</strong>{" "}
                            {promotion.comboName || ""}
                          </>
                        )}
                      </span>
                      <span style={{ marginLeft: "8px", fontWeight: "bold" }}>
                        -{promotion.discountAmount.toLocaleString()}₫
                      </span>
                    </Text>
                  ))}

                  {/* Hiển thị sản phẩm tặng từ khuyến mãi hàng */}
                  {appliedItemPromotions.map((promotion, index) => (
                    <Text
                      key={`item-promotion-${index}`}
                      style={{
                        display: "block",
                        fontSize: "14px",
                        marginTop: "4px",
                        color: "#16a34a",
                        fontWeight: "500",
                      }}
                    >
                      + {promotion.rewardQuantity} {promotion.rewardItem}
                    </Text>
                  ))}

                  {amountDiscount && (
                    <Text
                      style={{
                        display: "block",
                        fontSize: "14px",
                        marginTop: "8px",
                        color: "#16a34a",
                        fontWeight: "500",
                      }}
                    >
                      {amountDiscount.description}
                    </Text>
                  )}
                </div>
              </Col>
            </Row>
          </div>

          {/* Voucher */}
          {appliedVoucher && (
            <div style={{ marginBottom: "20px" }}>
              <Title
                level={5}
                style={{ textAlign: "left", margin: 0, marginBottom: 8 }}
              >
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
            {paymentMethod === "PAY_LATER"
              ? "(Khi bấm xác nhận sẽ tạo đơn hàng với phương thức thanh toán sau)"
              : `(Khi bấm xác nhận sẽ chuyển đến trang thanh toán ${paymentMethod})`}
          </div>
        </div>
      </Modal>

      <Modal
        title={
          <div className="text-center font-semibold text-base">
            Chọn voucher
          </div>
        }
        open={isVoucherModalOpen}
        onCancel={() => setIsVoucherModalOpen(false)}
        footer={null}
        centered
        width={640}
        destroyOnClose
      >
        {voucherListLoading ? (
          <div className="flex items-center justify-center py-8">
            <Spin />
          </div>
        ) : availableUserVouchers.length > 0 ? (
          <div
            className="flex flex-col gap-3"
            style={{
              maxHeight: "55vh",
              overflowY: "auto",
              paddingRight: "4px",
            }}
          >
            {availableUserVouchers.map((voucher) => {
              const voucherDetail = (voucher?.voucherId ||
                {}) as IUserVoucher["voucherId"] & {
                description?: string;
              };
              const title =
                voucherDetail?.description ||
                voucherDetail?.name ||
                "Voucher ưu đãi";
              const discountPercent = voucherDetail?.discountPercent;
              const expiry = voucherDetail?.validityPeriod?.endDate;
              return (
                <div
                  key={voucher._id}
                  className={`flex flex-col gap-2 rounded-lg border p-4 ${
                    isDarkMode
                      ? "bg-[#1b2433] border-[#2d3748] text-white"
                      : "bg-[#f7f9fc] border-gray-200 text-gray-900"
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-base font-semibold">🎟️ {title}</p>
                      <p
                        className={`text-sm mt-1 ${
                          isDarkMode ? "text-gray-300" : "text-gray-500"
                        }`}
                      >
                        Hạn dùng:{" "}
                        {expiry
                          ? formatVoucherExpiry(expiry as string | Date)
                          : "—"}
                      </p>
                      <p
                        className={`text-xs ${
                          isDarkMode ? "text-gray-400" : "text-gray-500"
                        }`}
                      >
                        Mã: {voucher.code}
                      </p>
                    </div>
                    {typeof discountPercent === "number" && (
                      <span
                        className={`text-lg font-bold ${
                          isDarkMode ? "text-cyan-300" : "text-green-600"
                        }`}
                      >
                        -{discountPercent}%
                      </span>
                    )}
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <div />
                    <Button
                      type="primary"
                      className={`${
                        isDarkMode
                          ? "bg-cyan-600 hover:bg-cyan-500"
                          : "bg-blue-600 hover:bg-blue-500"
                      }`}
                      onClick={() => handleSelectVoucher(voucher)}
                      loading={voucherLoading}
                    >
                      Sử dụng
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <Empty
            description="Hiện chưa có voucher khả dụng!"
            image={Empty.PRESENTED_IMAGE_SIMPLE}
          />
        )}
      </Modal>
    </>
  );
};

export default PaymentPage;
