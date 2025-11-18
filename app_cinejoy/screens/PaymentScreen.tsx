import { useEffect, useMemo, useState } from "react";
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
} from "react-native";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import { IMovie } from "@/types/api";
import {
  getCurrentPriceListApi,
  validateVoucherApi,
  applyVoucherApi,
  createOrderApi,
  processPaymentApi,
} from "@/services/api";
import { useAppSelector } from "@/store/hooks";
import comboPlaceholder from "assets/Combo.png";
import config from "@/config/env";

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
  comboTotal: number;
};

type RootStackParamList = {
  PaymentScreen: PaymentScreenParams;
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
    selectedCombos,
    comboTotal,
  } = route.params;

  const user = useAppSelector((state) => state.app.user);
  const isAuthenticated = useAppSelector((state) => state.app.isAuthenticated);

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

  const formatCurrency = (value: number) =>
    `${value.toLocaleString("vi-VN")} ₫`;

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

  const voucherDiscount = appliedVoucher?.discountAmount || 0;
  const grandTotal = Math.max(ticketTotal + comboTotal - voucherDiscount, 0);

  const handleApplyVoucher = async () => {
    if (!voucherCode.trim()) {
      setVoucherError("Vui lòng nhập mã voucher");
      return;
    }
    setVoucherLoading(true);
    setVoucherError("");
    try {
      const validation = await validateVoucherApi(
        voucherCode.trim(),
        user?._id
      );
      if (!validation?.status) {
        setVoucherError(validation?.message || "Mã voucher không hợp lệ");
        setAppliedVoucher(null);
        return;
      }
      const applyResult = await applyVoucherApi(
        voucherCode.trim(),
        ticketTotal + comboTotal,
        user?._id
      );
      if (!applyResult?.status || !applyResult.data) {
        setVoucherError(applyResult?.message || "Không áp dụng được voucher");
        setAppliedVoucher(null);
        return;
      }
      setAppliedVoucher({
        code: voucherCode.trim(),
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

      const paymentResult = await processPaymentApi(orderId, {
        paymentMethod,
        returnUrl: config.API_URL || "https://cinejoy.vn/",
        cancelUrl: config.API_URL || "https://cinejoy.vn/",
      });

      const paymentUrl =
        (paymentResult as any)?.data?.paymentUrl ||
        (paymentResult as any)?.paymentUrl;

      if (paymentUrl) {
        Linking.openURL(paymentUrl);
      } else {
        Alert.alert(
          "Thông báo",
          paymentResult?.message || "Không thể tạo đường dẫn thanh toán."
        );
      }
    } catch (error: any) {
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

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Thanh toán</Text>
        <View style={{ width: 24 }} />
      </View>
      <ScrollView
        contentContainerStyle={styles.content}
        stickyHeaderIndices={[0]}
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
                      <Text style={styles.ageBadgeText}>{movie.ageRating}</Text>
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

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Bắp nước (Tùy chọn)</Text>
          {selectedCombos.length === 0 ? (
            <Text style={styles.emptyText}>Không chọn combo</Text>
          ) : (
            selectedCombos.map((combo) => (
              <View key={combo.comboId} style={styles.comboRow}>
                <Image source={comboPlaceholder} style={styles.comboIcon} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.comboName}>{combo.name}</Text>
                  <Text style={styles.comboDesc}>
                    Số lượng: {combo.quantity}
                  </Text>
                </View>
                <Text style={styles.rowValue}>
                  {formatCurrency(combo.price * combo.quantity)}
                </Text>
              </View>
            ))
          )}
          <View style={[styles.row, styles.rowDivider]}>
            <Text style={[styles.rowLabel, styles.boldText]}>Tổng</Text>
            <Text style={[styles.rowValue, styles.boldText]}>
              {formatCurrency(comboTotal)}
            </Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Giảm giá</Text>
          <View style={styles.voucherRow}>
            <TextInput
              style={styles.voucherInput}
              placeholder="Nhập mã CNJ Voucher"
              value={voucherCode}
              onChangeText={(text) => {
                setVoucherCode(text.toUpperCase());
                if (!text) setVoucherError("");
              }}
              placeholderTextColor="#aaa"
            />
            {appliedVoucher ? (
              <TouchableOpacity
                style={styles.voucherRemoveButton}
                onPress={handleRemoveVoucher}
              >
                <Text style={styles.voucherRemoveText}>Hủy</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={[
                  styles.voucherButton,
                  (!voucherCode.trim() || voucherLoading) &&
                    styles.voucherButtonDisabled,
                ]}
                disabled={!voucherCode.trim() || voucherLoading}
                onPress={handleApplyVoucher}
              >
                <Text style={styles.voucherButtonText}>
                  {voucherLoading ? "Đang kiểm tra..." : "Áp dụng"}
                </Text>
              </TouchableOpacity>
            )}
          </View>
          {voucherError ? (
            <Text style={styles.voucherError}>{voucherError}</Text>
          ) : null}
          {appliedVoucher && (
            <Text style={styles.appliedVoucherText}>
              Đã áp dụng - Giảm {formatCurrency(appliedVoucher.discountAmount)}
            </Text>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Tổng kết</Text>
          <View style={styles.row}>
            <Text style={styles.rowLabel}>Tổng cộng</Text>
            <Text style={styles.rowValue}>
              {formatCurrency(ticketTotal + comboTotal)}
            </Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.rowLabel}>Giảm giá</Text>
            <Text style={styles.rowValue}>
              -{formatCurrency(voucherDiscount)}
            </Text>
          </View>
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
          <View style={[styles.checkbox, agreeTerms && styles.checkboxChecked]}>
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
    </View>
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
  voucherRow: {
    flexDirection: "row",
    gap: 12,
    alignItems: "center",
  },
  voucherInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 13,
    color: "#111",
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
});

export default PaymentScreen;
