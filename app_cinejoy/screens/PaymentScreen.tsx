import { useEffect, useMemo, useState, useCallback, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  TextInput,
  Alert,
  Image,
  Linking,
  BackHandler,
  Modal,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  AppState,
} from "react-native";
import WebView from "react-native-webview";
import { WebViewNavigation } from "react-native-webview/lib/WebViewTypes";
import {
  useNavigation,
  useRoute,
  RouteProp,
  useFocusEffect,
  CommonActions,
} from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import { IMovie } from "@/types/api";
import {
  getCurrentPriceListApi,
  validateVoucherApi,
  applyVoucherApi,
  createOrderApi,
  processPaymentApi,
  getActiveItemPromotionsApi,
  applyItemPromotionsApi,
  applyPercentPromotionsApi,
  getAmountDiscountApi,
  getFoodCombosApi,
  getOrderByIdApi,
  getMyVouchersApi,
} from "@/services/api";
import { useAppSelector } from "@/store/hooks";
import comboPlaceholder from "assets/Combo.png";
import config from "@/config/env";
import dayjs from "dayjs";

const parseMinAgeFromRating = (rating?: string): number | null => {
  if (!rating) return null;
  if (rating.toUpperCase().startsWith("P")) return 0;
  const digits = rating.match(/\d+/);
  if (digits && digits[0]) {
    const age = parseInt(digits[0], 10);
    if (!Number.isNaN(age)) return age;
  }
  return null;
};

const formatDateWithWeekday = (dateStr: string) => {
  if (!dateStr) return "";
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) {
    return dateStr;
  }
  const weekdays = [
    "Chủ nhật",
    "Thứ 2",
    "Thứ 3",
    "Thứ 4",
    "Thứ 5",
    "Thứ 6",
    "Thứ 7",
  ];
  const weekday = weekdays[date.getDay()];
  const day = date.getDate().toString().padStart(2, "0");
  const monthNames = [
    "Thg 01",
    "Thg 02",
    "Thg 03",
    "Thg 04",
    "Thg 05",
    "Thg 06",
    "Thg 07",
    "Thg 08",
    "Thg 09",
    "Thg 10",
    "Thg 11",
    "Thg 12",
  ];
  const month = monthNames[date.getMonth()];
  const year = date.getFullYear();
  return `${weekday}, ${day} ${month}, ${year}`;
};

type RoomParam = string | { _id: string; name: string; roomType?: string };

type SelectedComboSummary = {
  comboId: string;
  name: string;
  price: number;
  quantity: number;
};

type PaymentScreenParams = {
  movie: IMovie;
  showtimeId: string;
  theaterId: string;
  date: string;
  startTime: string;
  endTime?: string;
  room: RoomParam;
  roomName: string;
  theaterName: string;
  selectedSeats: string[];
  totalTicketPrice: number;
  seatTypeCounts: Record<string, number>;
  seatTypeMap: Record<string, string>;
  selectedCombos: SelectedComboSummary[];
  comboTotal?: number;
};

type RootStackParamList = {
  PaymentScreen: PaymentScreenParams;
  BookTicketScreen: { movie: IMovie };
  PaymentResultScreen: {
    status: "success" | "failed";
    orderId?: string;
    orderCode?: string;
    amount?: number;
    message?: string;
    transId?: string;
    theaterName?: string;
    movieTitle?: string;
    seats?: string[];
    orderData?: any;
  };
};

type PaymentNavigationProp = StackNavigationProp<
  RootStackParamList,
  "PaymentScreen"
>;

type PaymentRouteProp = RouteProp<RootStackParamList, "PaymentScreen">;

const PaymentScreen = () => {
  const navigation = useNavigation<PaymentNavigationProp>();
  const route = useRoute<PaymentRouteProp>();
  const {
    movie,
    showtimeId,
    theaterId,
    date,
    startTime,
    endTime,
    room,
    roomName,
    theaterName,
    selectedSeats,
    totalTicketPrice,
    seatTypeCounts,
    seatTypeMap,
    selectedCombos: initialSelectedCombos = [],
  } = route.params;

  const user = useAppSelector((state) => state.app.user);
  const isAuthenticated = useAppSelector((state) => state.app.isAuthenticated);
  const normalizedApiBase = (config.API_URL || "https://cinejoy.vn").replace(
    /\/$/,
    ""
  );
  const webPaymentSuccessUrl =
    config.WEB_PAYMENT_SUCCESS_URL || `${normalizedApiBase}/payment/success`;
  const webPaymentCancelUrl =
    config.WEB_PAYMENT_CANCEL_URL || `${normalizedApiBase}/payment/cancel`;
  const appPaymentSuccessUrl =
    config.APP_PAYMENT_SUCCESS_URL || "cinejoy://payment/success";
  const appPaymentCancelUrl =
    config.APP_PAYMENT_CANCEL_URL || "cinejoy://payment/cancel";
  const webSuccessUrlBase = webPaymentSuccessUrl.split("?")[0];
  const webCancelUrlBase = webPaymentCancelUrl.split("?")[0];
  const appSuccessUrlBase = appPaymentSuccessUrl.split("?")[0];
  const appCancelUrlBase = appPaymentCancelUrl.split("?")[0];

  const [ticketPriceMap, setTicketPriceMap] = useState<Record<string, number>>(
    {}
  );
  const [ticketTotal, setTicketTotal] = useState<number>(totalTicketPrice);
  const [voucherCode, setVoucherCode] = useState("");
  const [voucherLoading, setVoucherLoading] = useState(false);
  const [voucherError, setVoucherError] = useState<string>("");
  const [appliedVoucher, setAppliedVoucher] = useState<{
    code: string;
    discountAmount: number;
    userVoucherId?: string;
  } | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<"MOMO" | "VNPAY">("MOMO");
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [paying, setPaying] = useState(false);
  const [appliedItemPromotions, setAppliedItemPromotions] = useState<any[]>([]);
  const [appliedPercentPromotions, setAppliedPercentPromotions] = useState<
    any[]
  >([]);
  const [amountDiscount, setAmountDiscount] = useState<{
    description: string;
    discountAmount: number;
  } | null>(null);
  const [selectedCombos, setSelectedCombos] = useState<SelectedComboSummary[]>(
    initialSelectedCombos || []
  );
  const comboTotal = useMemo(
    () =>
      selectedCombos.reduce(
        (sum, combo) => sum + (combo.price || 0) * (combo.quantity || 0),
        0
      ),
    [selectedCombos]
  );
  const [comboItems, setComboItems] = useState<any[]>([]);
  const [comboLoading, setComboLoading] = useState(false);
  const [comboModalVisible, setComboModalVisible] = useState(false);
  const [comboModalMode, setComboModalMode] = useState<"edit" | "add">("edit");
  const [comboModalData, setComboModalData] = useState<{
    _id: string;
    name: string;
    price: number;
    description?: string;
    image?: string;
  } | null>(null);
  const [comboModalQuantity, setComboModalQuantity] = useState(1);
  const [pendingOrderId, setPendingOrderId] = useState<string | null>(null);
  const [checkingOrderStatus, setCheckingOrderStatus] = useState(false);
  const handledOrderIdRef = useRef<string | null>(null);
  const appStateRef = useRef(AppState.currentState);
  const [paymentWebViewVisible, setPaymentWebViewVisible] = useState(false);
  const [paymentWebViewUrl, setPaymentWebViewUrl] = useState<string | null>(
    null
  );
  const [myVouchers, setMyVouchers] = useState<any[]>([]);
  const [loadingMyVouchers, setLoadingMyVouchers] = useState(false);
  const [voucherModalVisible, setVoucherModalVisible] = useState(false);

  const loadCombos = useCallback(async () => {
    try {
      setComboLoading(true);
      const [priceList, foodCombos] = await Promise.all([
        getCurrentPriceListApi(),
        getFoodCombosApi(),
      ]);

      if (!priceList?.lines || priceList.lines.length === 0) {
        setComboItems([]);
        return;
      }

      const productMap = new Map(
        (foodCombos || []).map((item) => [item._id, item])
      );

      const merged = priceList.lines
        .filter(
          (line): line is typeof line & { productId: string } =>
            !!line &&
            !!line.productId &&
            (line.type === "combo" || line.type === "single")
        )
        .map((line) => {
          const product = productMap.get(line.productId);
          return {
            _id: line.productId,
            name: line.productName || product?.name || "Sản phẩm",
            description: product?.description || "",
            price: line.price || (product as any)?.price || 0,
            image: (product as any)?.image,
          };
        });

      setComboItems(merged);
    } catch (error) {
      console.error("Error loading combos:", error);
      setComboItems([]);
    } finally {
      setComboLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCombos();
  }, [loadCombos]);

  useEffect(() => {
    const fetchMyVouchers = async () => {
      if (!isAuthenticated || !user?._id) {
        setMyVouchers([]);
        return;
      }
      setLoadingMyVouchers(true);
      try {
        const res = await getMyVouchersApi();
        if (res?.status && res.data) {
          setMyVouchers(res.data || []);
        } else {
          setMyVouchers([]);
        }
      } catch (error) {
        console.error("Error fetching my vouchers:", error);
        setMyVouchers([]);
      } finally {
        setLoadingMyVouchers(false);
      }
    };
    fetchMyVouchers();
  }, [isAuthenticated, user?._id]);

  const amountDiscountValue = amountDiscount?.discountAmount || 0;
  const percentDiscountTotal = appliedPercentPromotions.reduce(
    (sum, promo) => sum + (promo.discountAmount || 0),
    0
  );
  const promotionDiscountTotal = percentDiscountTotal + amountDiscountValue;
  const voucherDiscount = appliedVoucher?.discountAmount || 0;
  const grandTotal = Math.max(
    ticketTotal + comboTotal - voucherDiscount - promotionDiscountTotal,
    0
  );

  const navigateBackToBooking = useCallback(() => {
    setPendingOrderId(null);
    handledOrderIdRef.current = null;
    navigation.dispatch((state) => {
      const targetIndex = state.routes.findIndex(
        (route) => route.name === "BookTicketScreen"
      );
      if (targetIndex >= 0) {
        const routes = state.routes.slice(0, targetIndex + 1);
        return CommonActions.reset({
          ...state,
          routes,
          index: routes.length - 1,
        });
      }
      return CommonActions.navigate({
        name: "BookTicketScreen",
        params: { movie },
      });
    });
  }, [navigation, movie]);

  useEffect(() => {
    navigation.setOptions({ gestureEnabled: false });
    return () => {
      navigation.setOptions({ gestureEnabled: true });
    };
  }, [navigation]);

  const handleOrderPaid = useCallback(
    (orderData?: any) => {
      if (!pendingOrderId) return;
      const resolvedOrderId = orderData?._id || pendingOrderId;
      handledOrderIdRef.current = pendingOrderId;
      setPendingOrderId(null);
      navigation.navigate("PaymentResultScreen", {
        status: "success",
        orderId: resolvedOrderId,
        orderCode: orderData?.orderCode,
        amount: orderData?.finalAmount ?? grandTotal,
        movieTitle:
          (orderData?.movieId as any)?.title || movie.title || undefined,
        theaterName:
          (orderData?.theaterId as any)?.name || theaterName || undefined,
        seats:
          orderData?.seats?.map((seat: any) => seat.seatId) || selectedSeats,
        transId: orderData?.paymentInfo?.transactionId,
        orderData,
      });
    },
    [
      pendingOrderId,
      navigation,
      grandTotal,
      movie.title,
      theaterName,
      selectedSeats,
    ]
  );

  const handleOrderFailed = useCallback(
    (message?: string, orderData?: any) => {
      if (!pendingOrderId) return;
      const resolvedOrderId = orderData?._id || pendingOrderId;
      handledOrderIdRef.current = pendingOrderId;
      setPendingOrderId(null);
      navigation.navigate("PaymentResultScreen", {
        status: "failed",
        orderId: resolvedOrderId,
        amount: orderData?.finalAmount ?? grandTotal,
        movieTitle:
          (orderData?.movieId as any)?.title || movie.title || undefined,
        theaterName:
          (orderData?.theaterId as any)?.name || theaterName || undefined,
        seats:
          orderData?.seats?.map((seat: any) => seat.seatId) || selectedSeats,
        message:
          message ||
          "Giao dịch chưa được ghi nhận. Vui lòng thử lại trong giây lát.",
        orderData,
      });
    },
    [
      pendingOrderId,
      navigation,
      grandTotal,
      movie.title,
      theaterName,
      selectedSeats,
    ]
  );

  const showExitConfirmation = useCallback(() => {
    Alert.alert("Thông báo", "Bạn có muốn thoát khỏi?", [
      {
        text: "Hủy",
        style: "cancel",
      },
      {
        text: "Đồng ý",
        onPress: navigateBackToBooking,
      },
    ]);
  }, [navigateBackToBooking]);

  useFocusEffect(
    useCallback(() => {
      const onBackPress = () => {
        showExitConfirmation();
        return true;
      };
      const subscription = BackHandler.addEventListener(
        "hardwareBackPress",
        onBackPress
      );
      return () => subscription.remove();
    }, [showExitConfirmation])
  );

  const checkPendingOrderStatus = useCallback(async () => {
    if (
      !pendingOrderId ||
      handledOrderIdRef.current === pendingOrderId ||
      checkingOrderStatus
    ) {
      return;
    }
    try {
      setCheckingOrderStatus(true);
      const response = await getOrderByIdApi(pendingOrderId);
      if (response?.status && response.data) {
        const { paymentStatus, orderStatus } = response.data;
        if (
          paymentStatus === "PAID" ||
          orderStatus === "CONFIRMED" ||
          orderStatus === "COMPLETED"
        ) {
          handleOrderPaid(response.data);
          return;
        }
        if (
          paymentStatus === "FAILED" ||
          orderStatus === "CANCELLED" ||
          orderStatus === "EXPIRED"
        ) {
          handleOrderFailed(
            "Đơn hàng đã bị hủy hoặc chưa thanh toán thành công.",
            response.data
          );
        }
      }
    } catch (error) {
      console.error("Error checking order status:", error);
    } finally {
      setCheckingOrderStatus(false);
    }
  }, [pendingOrderId, checkingOrderStatus, handleOrderFailed, handleOrderPaid]);

  useFocusEffect(
    useCallback(() => {
      checkPendingOrderStatus();
    }, [checkPendingOrderStatus])
  );

  const closePaymentWebView = useCallback(() => {
    setPaymentWebViewVisible(false);
    setPaymentWebViewUrl(null);
  }, []);

  const handlePaymentNavigationChange = useCallback(
    (navState: WebViewNavigation) => {
      const url = navState.url || "";
      if (!url) return;
      const normalizedUrl = url.split("#")[0];
      if (webSuccessUrlBase && normalizedUrl.startsWith(webSuccessUrlBase)) {
        closePaymentWebView();
        checkPendingOrderStatus();
        return;
      }
      if (webCancelUrlBase && normalizedUrl.startsWith(webCancelUrlBase)) {
        closePaymentWebView();
        handleOrderFailed(
          "Thanh toán chưa hoàn tất. Bạn có thể thử lại ngay bây giờ."
        );
      }
    },
    [
      webSuccessUrlBase,
      webCancelUrlBase,
      closePaymentWebView,
      checkPendingOrderStatus,
      handleOrderFailed,
    ]
  );

  const handleClosePaymentWebView = useCallback(() => {
    closePaymentWebView();
    handleOrderFailed("Bạn đã đóng cửa sổ thanh toán.");
  }, [closePaymentWebView, handleOrderFailed]);

  const handleIncomingDeepLink = useCallback(
    (incomingUrl?: string | null) => {
      if (!incomingUrl) return;
      const normalizedUrl = incomingUrl.split("#")[0];
      if (appSuccessUrlBase && normalizedUrl.startsWith(appSuccessUrlBase)) {
        closePaymentWebView();
        checkPendingOrderStatus();
        return;
      }
      if (appCancelUrlBase && normalizedUrl.startsWith(appCancelUrlBase)) {
        closePaymentWebView();
        handleOrderFailed("Thanh toán chưa hoàn tất hoặc đã bị hủy.");
      }
    },
    [
      appSuccessUrlBase,
      appCancelUrlBase,
      closePaymentWebView,
      checkPendingOrderStatus,
      handleOrderFailed,
    ]
  );

  const openPaymentGateway = useCallback((url: string) => {
    if (!url) return;
    if (/^https?:\/\//i.test(url)) {
      setPaymentWebViewUrl(url);
      setPaymentWebViewVisible(true);
      return;
    }
    Linking.openURL(url).catch(() => {
      Alert.alert(
        "Thông báo",
        "Không thể mở cổng thanh toán bên ngoài. Vui lòng thử lại."
      );
    });
  }, []);

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (nextState) => {
      if (appStateRef.current !== "active" && nextState === "active") {
        checkPendingOrderStatus();
      }
      appStateRef.current = nextState;
    });
    return () => subscription.remove();
  }, [checkPendingOrderStatus]);

  useEffect(() => {
    const linkingSubscription = Linking.addEventListener("url", ({ url }) => {
      handleIncomingDeepLink(url);
    });
    Linking.getInitialURL().then((initialUrl) => {
      if (initialUrl) {
        handleIncomingDeepLink(initialUrl);
      }
    });
    return () => linkingSubscription.remove();
  }, [handleIncomingDeepLink]);

  const openComboModal = useCallback(
    (
      combo: {
        _id: string;
        name: string;
        price: number;
        description?: string;
        image?: string;
      },
      mode: "edit" | "add",
      quantity: number
    ) => {
      setComboModalData(combo);
      setComboModalMode(mode);
      setComboModalQuantity(quantity > 0 ? quantity : 1);
      setComboModalVisible(true);
    },
    []
  );

  const handleEditCombo = useCallback(
    (combo: SelectedComboSummary) => {
      const meta =
        comboItems.find((item) => item._id === combo.comboId) || null;
      openComboModal(
        {
          _id: combo.comboId,
          name: meta?.name || combo.name,
          price:
            typeof meta?.price === "number" && meta.price > 0
              ? meta.price
              : combo.price,
          description: meta?.description,
          image: meta?.image,
        },
        "edit",
        combo.quantity
      );
    },
    [comboItems, openComboModal]
  );

  const handleAddComboPress = useCallback(
    (comboItem: any) => {
      if (!comboItem?._id) return;
      openComboModal(
        {
          _id: comboItem._id,
          name: comboItem.name,
          price: comboItem.price || 0,
          description: comboItem.description,
          image: comboItem.image,
        },
        "add",
        1
      );
    },
    [openComboModal]
  );

  const handleConfirmComboModal = useCallback(() => {
    if (!comboModalData) return;
    setSelectedCombos((prev) => {
      const existingIndex = prev.findIndex(
        (item) => item.comboId === comboModalData._id
      );
      const next = [...prev];
      if (existingIndex >= 0) {
        if (comboModalMode === "add") {
          // Thêm mới từ section "Thêm combo": cộng dồn số lượng
          if (comboModalQuantity > 0) {
            const current = next[existingIndex];
            next[existingIndex] = {
              ...current,
              comboId: comboModalData._id,
              name: comboModalData.name,
              price: comboModalData.price,
              quantity: (current.quantity || 0) + comboModalQuantity,
            };
          }
        } else {
          // Chỉnh sửa từ section "Bắp nước (Tùy chọn)"
          if (comboModalQuantity <= 0) {
            next.splice(existingIndex, 1);
          } else {
            next[existingIndex] = {
              ...next[existingIndex],
              comboId: comboModalData._id,
              name: comboModalData.name,
              price: comboModalData.price,
              quantity: comboModalQuantity,
            };
          }
        }
      } else if (comboModalQuantity > 0) {
        next.push({
          comboId: comboModalData._id,
          name: comboModalData.name,
          price: comboModalData.price,
          quantity: comboModalQuantity,
        });
      }
      return next;
    });
    setComboModalVisible(false);
  }, [comboModalData, comboModalQuantity, comboModalMode]);

  const handleCloseComboModal = () => {
    setComboModalVisible(false);
  };

  const decreaseComboQuantity = () => {
    setComboModalQuantity((prev) => Math.max(0, prev - 1));
  };

  const increaseComboQuantity = () => {
    setComboModalQuantity((prev) => prev + 1);
  };

  const formatCurrency = (value: number) =>
    `${value.toLocaleString("vi-VN")} ₫`;
  const applyItemPromotionsAuto = useCallback(async () => {
    if (
      selectedCombos.length === 0 &&
      (!selectedSeats || selectedSeats.length === 0)
    ) {
      setAppliedItemPromotions([]);
      return;
    }
    try {
      const seatPayload = selectedSeats.map((seatId) => {
        const seatType = (seatTypeMap[seatId] || "normal").toLowerCase();
        return {
          seatId,
          type: seatType,
          price: 0,
        };
      });
      const comboPayload = selectedCombos.map((combo) => ({
        comboId: combo.comboId,
        quantity: combo.quantity,
        name: combo.name,
      }));
      const response = await applyItemPromotionsApi(
        comboPayload,
        [],
        seatPayload
      );
      if (response.status && response.data) {
        setAppliedItemPromotions(response.data.applicablePromotions || []);
      } else {
        setAppliedItemPromotions([]);
      }
    } catch (error) {
      console.error("Error applying item promotions:", error);
      setAppliedItemPromotions([]);
    }
  }, [selectedCombos, selectedSeats, seatTypeMap]);

  const applyPercentPromotionsAuto = useCallback(async () => {
    if (
      selectedCombos.length === 0 &&
      (!selectedSeats || selectedSeats.length === 0)
    ) {
      setAppliedPercentPromotions([]);
      return;
    }
    try {
      const seatPayload = selectedSeats.map((seatId) => {
        const seatType = (seatTypeMap[seatId] || "normal").toLowerCase();
        const price = ticketPriceMap[seatType] || 0;
        return {
          seatId,
          type: seatType,
          price,
        };
      });
      const comboPayload = selectedCombos.map((combo) => ({
        comboId: combo.comboId,
        quantity: combo.quantity,
        name: combo.name,
        price: combo.price,
      }));
      const response = await applyPercentPromotionsApi(
        comboPayload,
        [],
        seatPayload
      );
      if (response.status && response.data) {
        setAppliedPercentPromotions(response.data.applicablePromotions || []);
      } else {
        setAppliedPercentPromotions([]);
      }
    } catch (error) {
      console.error("Error applying percent promotions:", error);
      setAppliedPercentPromotions([]);
    }
  }, [selectedCombos, selectedSeats, seatTypeMap, ticketPriceMap]);

  useEffect(() => {
    const loadActive = async () => {
      try {
        await getActiveItemPromotionsApi();
      } catch (error) {
        console.error("Error loading active promotions:", error);
      }
    };
    loadActive();
  }, []);

  useEffect(() => {
    applyItemPromotionsAuto();
    applyPercentPromotionsAuto();
  }, [applyItemPromotionsAuto, applyPercentPromotionsAuto]);

  useEffect(() => {
    const fetchTicketPrices = async () => {
      try {
        const priceList = await getCurrentPriceListApi();
        if (!priceList?.lines) {
          setTicketPriceMap({});
          setTicketTotal(totalTicketPrice);
          return;
        }
        const map: Record<string, number> = {};
        priceList.lines.forEach((line) => {
          if (line.type === "ticket" && line.seatType) {
            map[(line.seatType || "").toLowerCase()] = line.price || 0;
          }
        });
        setTicketPriceMap(map);
        const computed = Object.entries(seatTypeCounts).reduce(
          (sum, [type, count]) => {
            const normalized = (type || "").toLowerCase();
            return sum + (map[normalized] || 0) * (count || 0);
          },
          0
        );
        setTicketTotal(computed || totalTicketPrice);
      } catch (error) {
        setTicketPriceMap({});
        setTicketTotal(totalTicketPrice);
      }
    };
    fetchTicketPrices();
  }, [seatTypeCounts, totalTicketPrice]);

  useEffect(() => {
    const fetchAmountDiscount = async () => {
      const subTotal = ticketTotal + comboTotal;
      if (subTotal <= 0) {
        setAmountDiscount(null);
        return;
      }
      try {
        const response = await getAmountDiscountApi(subTotal);
        if (response?.status && response.data) {
          setAmountDiscount({
            description: response.data.description,
            discountAmount: response.data.discountAmount,
          });
        } else {
          setAmountDiscount(null);
        }
      } catch (error) {
        console.error("Error fetching amount discount:", error);
        setAmountDiscount(null);
      }
    };
    fetchAmountDiscount();
  }, [ticketTotal, comboTotal]);

  const applyVoucherByCode = async (rawCode: string) => {
    const code = rawCode.trim();
    if (!code) {
      setVoucherError("Vui lòng chọn voucher");
      return;
    }
    setVoucherCode(code.toUpperCase());
    setVoucherLoading(true);
    setVoucherError("");
    try {
      const validation = await validateVoucherApi(code, user?._id);
      if (!validation?.status) {
        setVoucherError(validation?.message || "Mã voucher không hợp lệ");
        setAppliedVoucher(null);
        return;
      }
      const applyResult = await applyVoucherApi(
        code,
        ticketTotal + comboTotal,
        user?._id
      );
      if (!applyResult?.status || !applyResult.data) {
        setVoucherError(applyResult?.message || "Không áp dụng được voucher");
        setAppliedVoucher(null);
        return;
      }
      setAppliedVoucher({
        code: code.toUpperCase(),
        discountAmount: applyResult.data.discountAmount || 0,
        userVoucherId: applyResult.data.userVoucherId,
      });
      setVoucherError("");
    } catch {
      setVoucherError("Có lỗi xảy ra khi áp dụng voucher");
      setAppliedVoucher(null);
    } finally {
      setVoucherLoading(false);
    }
  };

  const handleApplyVoucher = async () => {
    await applyVoucherByCode(voucherCode);
  };

  const handleRemoveVoucher = () => {
    setAppliedVoucher(null);
    setVoucherCode("");
    setVoucherError("");
  };

  const handlePay = async () => {
    if (!isAuthenticated || !user?._id) {
      Alert.alert("Thông báo", "Vui lòng đăng nhập để thanh toán.");
      return;
    }
    if (!agreeTerms) {
      Alert.alert(
        "Thông báo",
        "Vui lòng đồng ý với điều khoản trước khi tiếp tục."
      );
      return;
    }
    if (selectedSeats.length === 0) {
      Alert.alert("Thông báo", "Không có ghế nào để thanh toán.");
      return;
    }
    setPaying(true);
    try {
      const seatsPayload = selectedSeats.map((seatId) => {
        const seatType = seatTypeMap[seatId] || "normal";
        const price =
          ticketPriceMap[(seatType || "").toLowerCase()] ||
          ticketPriceMap["normal"] ||
          0;
        return {
          seatId,
          type: seatType,
          price,
        };
      });

      const orderResult = await createOrderApi({
        userId: user._id,
        movieId: movie._id,
        theaterId,
        showtimeId,
        showDate: date,
        showTime: startTime,
        room: typeof room === "string" ? room : room?.name || "",
        seats: seatsPayload,
        foodCombos: selectedCombos.map((combo) => ({
          comboId: combo.comboId,
          quantity: combo.quantity,
          price: combo.price,
        })),
        voucherId: appliedVoucher?.userVoucherId || null,
        paymentMethod,
        customerInfo: {
          fullName: user.fullName || "",
          phoneNumber: user.phoneNumber || "",
          email: user.email || "",
        },
      });

      if (!orderResult || orderResult.status === false || !orderResult.data) {
        Alert.alert(
          "Thông báo",
          orderResult?.message || "Không thể tạo đơn hàng. Vui lòng thử lại."
        );
        setPaying(false);
        return;
      }

      const orderId =
        (orderResult.data as { orderId?: string; _id?: string }).orderId ||
        (orderResult.data as { orderId?: string; _id?: string })._id;

      if (!orderId) {
        Alert.alert("Thông báo", "Không xác định được mã đơn hàng.");
        setPaying(false);
        return;
      }

      setPendingOrderId(orderId);

      const successRedirectUrl =
        paymentMethod === "MOMO" ? appPaymentSuccessUrl : webPaymentSuccessUrl;
      const cancelRedirectUrl =
        paymentMethod === "MOMO" ? appPaymentCancelUrl : webPaymentCancelUrl;

      const paymentResult = await processPaymentApi(orderId, {
        paymentMethod,
        returnUrl: successRedirectUrl,
        cancelUrl: cancelRedirectUrl,
      });

      const paymentUrl =
        (paymentResult as any)?.data?.paymentUrl ||
        (paymentResult as any)?.paymentUrl;

      if (paymentUrl) {
        openPaymentGateway(paymentUrl);
      } else {
        Alert.alert(
          "Thông báo",
          paymentResult?.message || "Không thể tạo đường dẫn thanh toán."
        );
        setPendingOrderId(null);
      }
    } catch (error: any) {
      setPendingOrderId(null);
      Alert.alert(
        "Thông báo",
        error?.message || "Có lỗi xảy ra trong quá trình thanh toán."
      );
    } finally {
      setPaying(false);
    }
  };

  const roomTypeLabel =
    typeof room === "object"
      ? room?.roomType || room?.name || ""
      : room?.toString() || "";

  const ageNotice = (() => {
    const minAge = parseMinAgeFromRating(movie.ageRating);
    if (minAge === null)
      return "Phim được phổ biến đến người xem ở độ tuổi phù hợp.";
    if (minAge === 0) return "Phim được phổ biến đến mọi lứa tuổi (P).";
    return `Phim được phổ biến đến người xem từ đủ ${minAge} tuổi trở lên (${movie.ageRating}).`;
  })();

  const validMyVouchers = useMemo(
    () =>
      myVouchers.filter((voucher: any) => {
        const statusOk = voucher.status === "unused";
        const voucherIdObj =
          typeof voucher.voucherId === "object" ? voucher.voucherId : null;
        const end = voucherIdObj?.validityPeriod?.endDate;
        const dateOk = !end || dayjs(end).isAfter(dayjs());
        return statusOk && dateOk;
      }),
    [myVouchers]
  );

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 140}
    >
      <View style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor="#fff" />
        <View style={styles.header}>
          <TouchableOpacity onPress={showExitConfirmation}>
            <Text style={styles.backIcon}>←</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Thanh toán</Text>
          <View style={{ width: 24 }} />
        </View>
        <ScrollView
          contentContainerStyle={styles.content}
          stickyHeaderIndices={[0]}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.summarySticky}>
            <View style={styles.summaryCard}>
              <View style={styles.summaryHeader}>
                {movie.posterImage || (movie as any)?.poster || movie.image ? (
                  <Image
                    source={{
                      uri:
                        movie.posterImage ||
                        (movie as any)?.poster ||
                        movie.image,
                    }}
                    style={styles.poster}
                  />
                ) : (
                  <View style={[styles.poster, styles.posterPlaceholder]} />
                )}
                <View style={styles.summaryHeaderInfo}>
                  <View style={styles.titleRow}>
                    <Text style={styles.movieTitle}>{movie.title}</Text>
                    {movie.ageRating && (
                      <View style={styles.ageBadge}>
                        <Text style={styles.ageBadgeText}>
                          {movie.ageRating}
                        </Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.ageNotice}>{ageNotice}</Text>
                  <Text style={styles.summaryLabel}>
                    {formatDateWithWeekday(date)} | {startTime}
                    {endTime ? ` ~ ${endTime}` : ""}
                  </Text>
                  <Text style={styles.summaryLabel}>{theaterName}</Text>
                  <Text style={styles.summaryLabel}>
                    Phòng: {roomName} | Ghế: {selectedSeats.join(", ")}
                  </Text>
                  {selectedCombos.length > 0 && (
                    <Text style={styles.summaryLabel}>
                      Combo:{" "}
                      {selectedCombos
                        .map((combo) => `${combo.name} x${combo.quantity}`)
                        .join(", ")}
                    </Text>
                  )}
                </View>
              </View>
              <Text style={styles.totalAmountLabel}>
                Tổng Thanh Toán:{" "}
                <Text style={styles.totalAmount}>
                  {formatCurrency(grandTotal)}
                </Text>
              </Text>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Thông tin vé</Text>
            <View style={styles.row}>
              <Text style={styles.rowLabel}>Số lượng</Text>
              <Text style={styles.rowValue}>{selectedSeats.length}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.rowLabel}>Tổng</Text>
              <Text style={styles.rowValue}>{formatCurrency(ticketTotal)}</Text>
            </View>
          </View>

          {selectedCombos.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Bắp nước (Tùy chọn)</Text>
              {selectedCombos.map((combo) => {
                const comboMeta = comboItems.find(
                  (item) => item._id === combo.comboId
                );
                return (
                  <TouchableOpacity
                    key={combo.comboId}
                    style={styles.comboRow}
                    onPress={() => handleEditCombo(combo)}
                    activeOpacity={0.8}
                  >
                    <Image
                      source={
                        comboMeta?.image
                          ? { uri: comboMeta.image }
                          : comboPlaceholder
                      }
                      style={styles.comboIcon}
                    />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.comboName}>{combo.name}</Text>
                      <Text style={styles.comboDesc}>
                        Số lượng: {combo.quantity}
                      </Text>
                    </View>
                    <Text style={styles.rowValue}>
                      {formatCurrency((combo.price || 0) * combo.quantity)}
                    </Text>
                  </TouchableOpacity>
                );
              })}
              <View style={[styles.row, styles.rowDivider]}>
                <Text style={[styles.rowLabel, styles.boldText]}>Tổng</Text>
                <Text style={[styles.rowValue, styles.boldText]}>
                  {formatCurrency(comboTotal)}
                </Text>
              </View>
            </View>
          )}

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Thêm combo/ bắp nước</Text>
            {comboLoading ? (
              <ActivityIndicator
                color="#E50914"
                style={{ marginVertical: 16 }}
              />
            ) : comboItems.length === 0 ? (
              <Text style={styles.emptyText}>Chưa có combo khả dụng.</Text>
            ) : (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.extraComboScroll}
              >
                {comboItems.map((combo) => (
                  <View key={combo._id} style={styles.extraComboCard}>
                    <Image
                      source={
                        combo.image ? { uri: combo.image } : comboPlaceholder
                      }
                      style={styles.extraComboImage}
                    />
                    <Text style={styles.extraComboName} numberOfLines={2}>
                      {combo.name}
                    </Text>
                    <Text style={styles.extraComboPrice}>
                      {formatCurrency(combo.price || 0)}
                    </Text>
                    <TouchableOpacity
                      style={styles.extraAddButton}
                      onPress={() => handleAddComboPress(combo)}
                    >
                      <Text style={styles.extraAddButtonText}>+</Text>
                    </TouchableOpacity>
                  </View>
                ))}
              </ScrollView>
            )}
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Giảm giá</Text>
            <View style={styles.voucherRow}>
              <TouchableOpacity
                style={styles.voucherSelectField}
                onPress={() => {
                  if (!isAuthenticated || !user?._id) {
                    Alert.alert(
                      "Thông báo",
                      "Vui lòng đăng nhập để chọn voucher."
                    );
                    return;
                  }
                  setVoucherModalVisible(true);
                }}
                activeOpacity={0.8}
              >
                <Text style={styles.voucherSelectText}>
                  {appliedVoucher?.code || voucherCode || "Chọn CNJ Voucher"}
                </Text>
              </TouchableOpacity>
              {appliedVoucher ? (
                <TouchableOpacity
                  style={styles.voucherRemoveButton}
                  onPress={handleRemoveVoucher}
                >
                  <Text style={styles.voucherRemoveText}>Hủy</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={styles.voucherButton}
                  onPress={() => {
                    if (!isAuthenticated || !user?._id) {
                      Alert.alert(
                        "Thông báo",
                        "Vui lòng đăng nhập để chọn voucher."
                      );
                      return;
                    }
                    setVoucherModalVisible(true);
                  }}
                >
                  <Text style={styles.voucherButtonText}>Chọn</Text>
                </TouchableOpacity>
              )}
            </View>
            {voucherError ? (
              <Text style={styles.voucherError}>{voucherError}</Text>
            ) : null}
            {appliedVoucher && (
              <Text style={styles.appliedVoucherText}>
                Đã áp dụng - Giảm{" "}
                {formatCurrency(appliedVoucher.discountAmount)}
              </Text>
            )}
          </View>

          {(amountDiscount ||
            appliedPercentPromotions.length > 0 ||
            appliedItemPromotions.length > 0) && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Khuyến mãi</Text>
              {amountDiscount && (
                <View style={styles.promotionBlock}>
                  <Text style={styles.promoText}>
                    {amountDiscount.description} (-
                    {formatCurrency(amountDiscount.discountAmount)})
                  </Text>
                </View>
              )}
              {appliedPercentPromotions.length > 0 && (
                <View style={styles.promotionBlock}>
                  {appliedPercentPromotions.map((promo, index) => (
                    <Text key={`percent-${index}`} style={styles.promoText}>
                      {promo.description ||
                        (promo.seatType
                          ? `Giảm ${promo.discountPercent}% vé ${promo.seatType}`
                          : `Giảm ${promo.discountPercent}% ${
                              promo.comboName || ""
                            }`)}{" "}
                      (-{formatCurrency(promo.discountAmount || 0)})
                    </Text>
                  ))}
                </View>
              )}
              {appliedItemPromotions.length > 0 && (
                <View style={styles.promotionBlock}>
                  {appliedItemPromotions.map((promo, index) => (
                    <Text key={`item-${index}`} style={styles.freebieText}>
                      {promo.detail?.description ||
                        `Mua ${promo.detail?.buyQuantity} ${promo.detail?.buyItem} tặng ${promo.rewardQuantity} ${promo.rewardItem}`}{" "}
                      (miễn phí)
                    </Text>
                  ))}
                </View>
              )}
            </View>
          )}

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Tổng kết</Text>
            <View style={styles.row}>
              <Text style={styles.rowLabel}>Tổng cộng</Text>
              <Text style={styles.rowValue}>
                {formatCurrency(ticketTotal + comboTotal)}
              </Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.rowLabel}>Voucher</Text>
              <Text style={styles.rowValue}>
                -{formatCurrency(voucherDiscount)}
              </Text>
            </View>
            {promotionDiscountTotal > 0 && (
              <View style={styles.row}>
                <Text style={styles.rowLabel}>Khuyến mãi</Text>
                <Text style={styles.rowValue}>
                  -{formatCurrency(promotionDiscountTotal)}
                </Text>
              </View>
            )}
            {appliedItemPromotions.length > 0 && (
              <View style={styles.row}>
                <Text style={styles.rowLabel}>Ưu đãi kèm</Text>
                <Text style={styles.rowValue}>Miễn phí</Text>
              </View>
            )}
            <View style={[styles.row, styles.rowDivider]}>
              <Text style={[styles.rowLabel, styles.boldText]}>Còn lại</Text>
              <Text style={[styles.rowValue, styles.boldText]}>
                {formatCurrency(grandTotal)}
              </Text>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Thanh toán</Text>
            <PaymentOption
              label="MOMO"
              description="Thanh toán ví MOMO"
              selected={paymentMethod === "MOMO"}
              onPress={() => setPaymentMethod("MOMO")}
            />
            <PaymentOption
              label="VNPAY"
              description="Thanh toán qua VNPAY"
              selected={paymentMethod === "VNPAY"}
              onPress={() => setPaymentMethod("VNPAY")}
            />
          </View>

          <TouchableOpacity
            style={styles.termsRow}
            onPress={() => setAgreeTerms((prev) => !prev)}
          >
            <View
              style={[styles.checkbox, agreeTerms && styles.checkboxChecked]}
            >
              {agreeTerms && <Text style={styles.checkboxMark}>✓</Text>}
            </View>
            <Text style={styles.termsText}>
              Tôi đồng ý với điều khoản sử dụng và đang mua vé cho người có độ
              tuổi phù hợp với loại vé.
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.payButton,
              (!agreeTerms || paying) && styles.payButtonDisabled,
            ]}
            disabled={!agreeTerms || paying}
            onPress={handlePay}
          >
            <Text style={styles.payButtonText}>
              {paying ? "Đang xử lý..." : "Tôi đồng ý và Tiếp tục"}
            </Text>
          </TouchableOpacity>
        </ScrollView>
        <Modal
          visible={paymentWebViewVisible}
          animationType="slide"
          transparent={false}
          onRequestClose={handleClosePaymentWebView}
        >
          <View style={styles.paymentWebContainer}>
            <View style={styles.paymentWebHeader}>
              <TouchableOpacity
                style={styles.paymentWebClose}
                onPress={handleClosePaymentWebView}
              >
                <Text style={styles.paymentWebCloseText}>×</Text>
              </TouchableOpacity>
              <Text style={styles.paymentWebTitle}>Thanh toán</Text>
              <View style={{ width: 40 }} />
            </View>
            <View style={styles.paymentWebBody}>
              {paymentWebViewUrl ? (
                <WebView
                  style={styles.paymentWebView}
                  source={{ uri: paymentWebViewUrl }}
                  onNavigationStateChange={handlePaymentNavigationChange}
                  startInLoadingState
                  renderLoading={() => (
                    <View style={styles.paymentWebLoadingOverlay}>
                      <ActivityIndicator color="#E50914" size="large" />
                      <Text style={styles.paymentWebLoadingText}>
                        Đang tải cổng thanh toán...
                      </Text>
                    </View>
                  )}
                />
              ) : (
                <View style={styles.paymentWebPlaceholder}>
                  <ActivityIndicator color="#E50914" size="large" />
                  <Text style={styles.paymentWebLoadingText}>
                    Đang chuẩn bị liên kết thanh toán...
                  </Text>
                </View>
              )}
            </View>
          </View>
        </Modal>
        <Modal
          visible={comboModalVisible}
          transparent
          animationType="fade"
          onRequestClose={handleCloseComboModal}
        >
          <View style={styles.comboModalOverlay}>
            <View style={styles.comboModalCard}>
              <View style={styles.comboModalHeader}>
                <Text style={styles.comboModalTitle}>
                  {comboModalMode === "edit" ? "Chỉnh sửa món" : "Thêm món"}
                </Text>
                <TouchableOpacity onPress={handleCloseComboModal}>
                  <Text style={styles.comboModalClose}>×</Text>
                </TouchableOpacity>
              </View>
              {comboModalData && (
                <>
                  <View style={styles.comboModalBody}>
                    <Image
                      source={
                        comboModalData.image
                          ? { uri: comboModalData.image }
                          : comboPlaceholder
                      }
                      style={styles.comboModalImage}
                    />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.comboModalName}>
                        {comboModalData.name}
                      </Text>
                      <Text style={styles.comboModalPrice}>
                        {formatCurrency(comboModalData.price || 0)}
                      </Text>
                      {comboModalData.description ? (
                        <Text style={styles.comboModalDesc}>
                          {comboModalData.description}
                        </Text>
                      ) : null}
                    </View>
                  </View>
                  <View style={styles.modalQuantityRow}>
                    <TouchableOpacity
                      style={[
                        styles.modalQuantityButton,
                        comboModalQuantity === 0 &&
                          styles.modalQuantityButtonDisabled,
                      ]}
                      onPress={decreaseComboQuantity}
                      disabled={comboModalQuantity === 0}
                    >
                      <Text style={styles.modalQuantityButtonText}>-</Text>
                    </TouchableOpacity>
                    <Text style={styles.modalQuantityValue}>
                      {comboModalQuantity}
                    </Text>
                    <TouchableOpacity
                      style={styles.modalQuantityButton}
                      onPress={increaseComboQuantity}
                    >
                      <Text style={styles.modalQuantityButtonText}>+</Text>
                    </TouchableOpacity>
                  </View>
                  <View style={styles.comboModalFooter}>
                    <Text style={styles.comboModalTotalLabel}>Tổng cộng:</Text>
                    <Text style={styles.comboModalTotal}>
                      {formatCurrency(
                        (comboModalData.price || 0) * comboModalQuantity
                      )}
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={styles.modalConfirmButton}
                    onPress={handleConfirmComboModal}
                  >
                    <Text style={styles.modalConfirmText}>OK</Text>
                  </TouchableOpacity>
                </>
              )}
            </View>
          </View>
        </Modal>
        <Modal
          visible={voucherModalVisible}
          transparent
          animationType="fade"
          onRequestClose={() => setVoucherModalVisible(false)}
        >
          <View style={styles.comboModalOverlay}>
            <View style={styles.voucherModalCard}>
              <View style={styles.voucherModalHeader}>
                <Text style={styles.voucherModalTitle}>Chọn voucher</Text>
                <TouchableOpacity onPress={() => setVoucherModalVisible(false)}>
                  <Text style={styles.voucherModalClose}>×</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.voucherModalBody}>
                {loadingMyVouchers ? (
                  <View style={styles.voucherModalLoading}>
                    <ActivityIndicator color="#E50914" />
                    <Text style={styles.voucherModalLoadingText}>
                      Đang tải voucher...
                    </Text>
                  </View>
                ) : validMyVouchers.length === 0 ? (
                  <Text style={styles.voucherModalEmpty}>
                    Hiện chưa có voucher khả dụng.
                  </Text>
                ) : (
                  <ScrollView style={styles.voucherModalList}>
                    {validMyVouchers.map((voucher: any) => (
                      <TouchableOpacity
                        key={voucher._id}
                        style={styles.voucherModalItem}
                        onPress={() => {
                          const code = voucher.code || "";
                          applyVoucherByCode(code);
                          setVoucherModalVisible(false);
                        }}
                      >
                        <Text style={styles.voucherModalCode}>
                          {voucher.code}
                        </Text>
                        <Text style={styles.voucherModalDesc} numberOfLines={2}>
                          {typeof voucher.voucherId === "object"
                            ? voucher.voucherId?.description ||
                              voucher.voucherId?.name ||
                              "Voucher"
                            : "Voucher"}
                        </Text>
                        {voucher.voucherId?.validityPeriod?.endDate && (
                          <Text style={styles.voucherModalExpiry}>
                            Hạn dùng:{" "}
                            {dayjs(
                              voucher.voucherId.validityPeriod.endDate
                            ).format("DD/MM/YYYY")}
                          </Text>
                        )}
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                )}
              </View>
            </View>
          </View>
        </Modal>
      </View>
    </KeyboardAvoidingView>
  );
};

const PaymentOption = ({
  label,
  description,
  selected,
  onPress,
}: {
  label: string;
  description: string;
  selected: boolean;
  onPress: () => void;
}) => (
  <TouchableOpacity
    style={[styles.paymentOption, selected && styles.paymentOptionSelected]}
    onPress={onPress}
  >
    <View>
      <Text style={styles.paymentOptionLabel}>{label}</Text>
      <Text style={styles.paymentOptionDesc}>{description}</Text>
    </View>
    <View style={[styles.radioOuter, selected && styles.radioOuterSelected]}>
      {selected && <View style={styles.radioInner} />}
    </View>
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: StatusBar.currentHeight ? StatusBar.currentHeight + 4 : 30,
    paddingBottom: 12,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  backIcon: {
    fontSize: 24,
    color: "#E50914",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#111",
  },
  summarySticky: {
    paddingBottom: 8,
    backgroundColor: "#f5f5f5",
    zIndex: 10,
  },
  content: {
    // paddingHorizontal: 16,
    paddingBottom: 40,
    gap: 16,
  },
  summaryCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  summaryHeader: {
    flexDirection: "row",
    gap: 12,
  },
  poster: {
    width: 90,
    height: 130,
    borderRadius: 8,
    backgroundColor: "#ddd",
  },
  posterPlaceholder: {
    alignItems: "center",
    justifyContent: "center",
  },
  summaryHeaderInfo: {
    flex: 1,
    gap: 4,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexWrap: "wrap",
  },
  movieTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#111",
  },
  ageBadge: {
    backgroundColor: "#E50914",
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  ageBadgeText: {
    color: "#fff",
    fontSize: 8,
    fontWeight: "bold",
  },
  ageNotice: {
    marginVertical: 1,
    fontSize: 11,
    color: "#9a3412",
  },
  summaryLabel: {
    fontSize: 12,
    color: "#5a5a5a",
  },
  totalAmountLabel: {
    marginTop: 12,
    fontSize: 14,
    color: "#c53030",
    fontWeight: "600",
    textAlign: "center",
  },
  totalAmount: {
    fontSize: 16,
    fontWeight: "bold",
  },
  section: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "bold",
    marginBottom: 12,
    color: "#111",
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  rowLabel: {
    fontSize: 13,
    color: "#444",
  },
  rowValue: {
    fontSize: 13,
    color: "#111",
  },
  rowDivider: {
    borderTopWidth: 1,
    borderTopColor: "#eee",
    paddingTop: 10,
    marginTop: 6,
  },
  boldText: {
    fontWeight: "700",
  },
  emptyText: {
    fontSize: 13,
    color: "#777",
  },
  comboRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  comboIcon: {
    width: 32,
    height: 32,
    marginRight: 12,
    resizeMode: "contain",
  },
  comboName: {
    fontSize: 13,
    fontWeight: "600",
    color: "#111",
  },
  comboDesc: {
    fontSize: 12,
    color: "#777",
  },
  extraComboScroll: {
    paddingVertical: 4,
    paddingRight: 16,
  },
  extraComboCard: {
    width: 150,
    backgroundColor: "#fafafa",
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: "#f0f0f0",
    alignItems: "center",
    gap: 8,
    marginRight: 12,
  },
  extraComboImage: {
    width: 80,
    height: 80,
    resizeMode: "contain",
  },
  extraComboName: {
    fontSize: 12,
    fontWeight: "600",
    color: "#111",
    textAlign: "center",
  },
  extraComboPrice: {
    fontSize: 13,
    color: "#c53030",
    fontWeight: "600",
  },
  extraAddButton: {
    marginTop: 4,
    width: "100%",
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#E50914",
    alignItems: "center",
  },
  extraAddButtonText: {
    color: "#E50914",
    fontSize: 16,
    fontWeight: "bold",
  },
  voucherRow: {
    flexDirection: "row",
    gap: 12,
    alignItems: "center",
  },
  voucherButton: {
    backgroundColor: "#E50914",
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  voucherButtonDisabled: {
    backgroundColor: "#999",
  },
  voucherButtonText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 12,
  },
  voucherRemoveButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E50914",
  },
  voucherRemoveText: {
    color: "#E50914",
    fontWeight: "600",
  },
  voucherError: {
    color: "#dc2626",
    fontSize: 12,
    marginTop: 8,
  },
  appliedVoucherText: {
    color: "#16a34a",
    fontSize: 12,
    marginTop: 8,
  },
  promotionBlock: {
    marginTop: 8,
    backgroundColor: "#fefce8",
    borderRadius: 8,
    padding: 10,
  },
  promoText: {
    fontSize: 12,
    color: "#ca8a04",
    marginBottom: 4,
  },
  freebieText: {
    fontSize: 12,
    color: "#16a34a",
    marginBottom: 4,
  },
  paymentOption: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 8,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  paymentOptionSelected: {
    backgroundColor: "rgba(229,9,20,0.08)",
    borderRadius: 8,
  },
  paymentOptionLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#111",
  },
  paymentOptionDesc: {
    fontSize: 12,
    color: "#666",
  },
  radioOuter: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: "#bbb",
    alignItems: "center",
    justifyContent: "center",
  },
  radioOuterSelected: {
    borderColor: "#E50914",
  },
  radioInner: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#E50914",
  },
  termsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: "#bbb",
    alignItems: "center",
    justifyContent: "center",
  },
  checkboxChecked: {
    borderColor: "#E50914",
    backgroundColor: "#E50914",
  },
  checkboxMark: {
    color: "#fff",
    fontWeight: "bold",
  },
  termsText: {
    flex: 1,
    fontSize: 12,
    color: "#444",
  },
  payButton: {
    marginTop: 12,
    backgroundColor: "#E50914",
    paddingVertical: 14,
    marginHorizontal: 16,
    borderRadius: 10,
    alignItems: "center",
  },
  payButtonDisabled: {
    backgroundColor: "#999",
  },
  payButtonText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 15,
  },
  comboModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
  },
  paymentWebContainer: {
    flex: 1,
    backgroundColor: "#fff",
  },
  paymentWebHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: StatusBar.currentHeight ? StatusBar.currentHeight - 40 : 25,
    paddingBottom: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  paymentWebTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111",
  },
  paymentWebClose: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  paymentWebCloseText: {
    fontSize: 28,
    color: "#111",
    fontWeight: "600",
  },
  paymentWebBody: {
    flex: 1,
    backgroundColor: "#fff",
  },
  paymentWebView: {
    flex: 1,
  },
  paymentWebLoadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
    backgroundColor: "#fff",
  },
  paymentWebPlaceholder: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
  },
  paymentWebLoadingText: {
    marginTop: 12,
    fontSize: 14,
    color: "#555",
    textAlign: "center",
  },
  comboModalCard: {
    width: "100%",
    backgroundColor: "#fff",
    borderRadius: 16,
    overflow: "hidden",
  },
  comboModalHeader: {
    backgroundColor: "#c53030",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  comboModalTitle: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 15,
  },
  comboModalClose: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "bold",
  },
  comboModalBody: {
    flexDirection: "row",
    padding: 16,
    gap: 12,
  },
  comboModalImage: {
    width: 90,
    height: 90,
    resizeMode: "contain",
  },
  comboModalName: {
    fontSize: 15,
    fontWeight: "700",
    color: "#111",
  },
  comboModalPrice: {
    marginTop: 4,
    fontSize: 14,
    color: "#c53030",
    fontWeight: "600",
  },
  comboModalDesc: {
    marginTop: 6,
    fontSize: 12,
    color: "#555",
  },
  modalQuantityRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 20,
    paddingVertical: 12,
  },
  modalQuantityButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#c53030",
    alignItems: "center",
    justifyContent: "center",
  },
  modalQuantityButtonDisabled: {
    opacity: 0.4,
  },
  modalQuantityButtonText: {
    fontSize: 24,
    color: "#c53030",
    fontWeight: "600",
  },
  modalQuantityValue: {
    fontSize: 20,
    fontWeight: "700",
    color: "#111",
    minWidth: 30,
    textAlign: "center",
  },
  comboModalFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 24,
    paddingBottom: 8,
  },
  comboModalTotalLabel: {
    fontSize: 13,
    color: "#555",
  },
  comboModalTotal: {
    fontSize: 15,
    fontWeight: "700",
    color: "#111",
  },
  modalConfirmButton: {
    margin: 16,
    backgroundColor: "#c53030",
    borderRadius: 999,
    paddingVertical: 12,
    alignItems: "center",
  },
  modalConfirmText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 14,
  },
  voucherSelectField: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    justifyContent: "center",
  },
  voucherSelectText: {
    fontSize: 13,
    color: "#111",
  },
  voucherModalCard: {
    width: "100%",
    maxHeight: "70%",
    backgroundColor: "#fff",
    borderRadius: 16,
    overflow: "hidden",
  },
  voucherModalHeader: {
    backgroundColor: "#c53030",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  voucherModalTitle: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 15,
  },
  voucherModalClose: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "bold",
  },
  voucherModalBody: {
    padding: 16,
  },
  voucherModalLoading: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 24,
  },
  voucherModalLoadingText: {
    marginTop: 8,
    fontSize: 13,
    color: "#555",
  },
  voucherModalEmpty: {
    fontSize: 13,
    color: "#777",
    textAlign: "center",
  },
  voucherModalList: {
    maxHeight: 300,
  },
  voucherModalItem: {
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  voucherModalCode: {
    fontSize: 14,
    fontWeight: "700",
    color: "#E50914",
  },
  voucherModalDesc: {
    marginTop: 2,
    fontSize: 12,
    color: "#444",
  },
  voucherModalExpiry: {
    marginTop: 2,
    fontSize: 11,
    color: "#666",
  },
});

export default PaymentScreen;
