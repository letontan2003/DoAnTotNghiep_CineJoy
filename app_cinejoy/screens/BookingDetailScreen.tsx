import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Image,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { RouteProp, useNavigation, useRoute } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import dayjs from "dayjs";
import { getUserOrderDetailsApi } from "@/services/api";

type RootStackParamList = {
  BookingDetailScreen: { orderId: string };
  BookingHistoryScreen: undefined;
};

type BookingDetailRouteProp = RouteProp<
  RootStackParamList,
  "BookingDetailScreen"
>;

type BookingDetailNavProp = StackNavigationProp<
  RootStackParamList,
  "BookingDetailScreen"
>;

const statusMap: Record<
  string,
  { label: string; color: string; background: string }
> = {
  CONFIRMED: {
    label: "Hoàn tất",
    color: "#15803d",
    background: "#dcfce7",
  },
  COMPLETED: {
    label: "Hoàn tất",
    color: "#15803d",
    background: "#dcfce7",
  },
  RETURNED: {
    label: "Trả vé",
    color: "#b91c1c",
    background: "#fee2e2",
  },
  PENDING: {
    label: "Đang xử lý",
    color: "#b45309",
    background: "#fef3c7",
  },
  CANCELLED: {
    label: "Đã hủy",
    color: "#b91c1c",
    background: "#fee2e2",
  },
};

const formatCurrency = (amount?: number) => {
  const value = Number(amount || 0);
  return value.toLocaleString("vi-VN", {
    style: "currency",
    currency: "VND",
  });
};

const formatDate = (date?: string) => {
  if (!date) return "Đang cập nhật";
  return dayjs(date).format("DD/MM/YYYY");
};

const calculateEndTime = (startTime?: string, duration: number = 120) => {
  if (!startTime) return "Đang cập nhật";
  try {
    const normalized = startTime.trim();
    let hours = 0;
    let minutes = 0;

    if (/am|pm/i.test(normalized)) {
      const timePart = normalized.replace(/\s*(AM|PM)/i, "");
      const [h, m] = timePart.split(":").map(Number);
      const isPM = /PM/i.test(normalized);
      if (isPM && h !== 12) {
        hours = h + 12;
      } else if (!isPM && h === 12) {
        hours = 0;
      } else {
        hours = h;
      }
      minutes = m;
    } else {
      const [h, m] = normalized.split(":").map(Number);
      hours = h;
      minutes = m;
    }

    const startDate = new Date();
    startDate.setHours(hours, minutes, 0, 0);
    const endDate = new Date(startDate.getTime() + duration * 60000);
    return endDate
      .toLocaleTimeString("vi-VN", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      })
      .replace(".", ":");
  } catch (error) {
    console.error("calculateEndTime error:", error);
    return "Đang cập nhật";
  }
};

const BookingDetailScreen = () => {
  const navigation = useNavigation<BookingDetailNavProp>();
  const route = useRoute<BookingDetailRouteProp>();
  const { orderId } = route.params;

  const [order, setOrder] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchOrderDetails = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await getUserOrderDetailsApi(orderId);
      if (response?.status && response.data) {
        setOrder(response.data);
      } else {
        setError(response?.message || "Không thể tải chi tiết vé");
      }
    } catch (err) {
      console.error("fetchOrderDetails error:", err);
      setError("Không thể tải chi tiết vé");
    } finally {
      setLoading(false);
    }
  }, [orderId]);

  useEffect(() => {
    fetchOrderDetails();
  }, [fetchOrderDetails]);

  const movie = order?.movieId || {};
  const theater = order?.theaterId || {};
  const seats =
    order?.seats?.map((seat: { seatId: string }) => seat.seatId).join(", ") ||
    "Đang cập nhật";
  const totalAmount = Number(order?.totalAmount || 0);
  const finalAmount = Number(order?.finalAmount || 0);
  const discountAmount = Math.max(totalAmount - finalAmount, 0);

  const statusDisplay = useMemo(() => {
    if (!order?.orderStatus) {
      return {
        label: "Không xác định",
        color: "#374151",
        background: "#e5e7eb",
      };
    }
    return (
      statusMap[order.orderStatus] || {
        label: order.orderStatus,
        color: "#374151",
        background: "#e5e7eb",
      }
    );
  }, [order?.orderStatus]);

  const renderState = () => {
    if (loading) {
      return (
        <View style={styles.stateContainer}>
          <ActivityIndicator size="large" color="#E50914" />
          <Text style={styles.stateText}>Đang tải chi tiết vé...</Text>
        </View>
      );
    }

    if (error || !order) {
      return (
        <View style={styles.stateContainer}>
          <Text style={styles.errorText}>
            {error || "Không tìm thấy thông tin vé"}
          </Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={fetchOrderDetails}
          >
            <Text style={styles.retryText}>Thử lại</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.retryButton,
              { borderColor: "#2563eb", marginTop: 12 },
            ]}
            onPress={() => navigation.goBack()}
          >
            <Text style={[styles.retryText, { color: "#2563eb" }]}>
              Quay lại
            </Text>
          </TouchableOpacity>
        </View>
      );
    }

    return null;
  };

  const renderFoodCombos = () => {
    if (!order?.foodCombos || order.foodCombos.length === 0) {
      return <Text style={styles.mutedText}>Không có combo</Text>;
    }

    return order.foodCombos.map(
      (
        combo: {
          comboId?: { name: string };
          quantity?: number;
          price?: number;
        },
        index: number
      ) => (
        <View
          key={`${combo.comboId?.name || index}-${index}`}
          style={styles.comboLine}
        >
          <Text style={styles.comboName}>
            {combo?.comboId?.name || "Combo"}
          </Text>
          <Text style={styles.comboMeta}>
            {combo?.quantity || 0} x {formatCurrency(combo?.price || 0)}
          </Text>
        </View>
      )
    );
  };

  if (loading || error || !order) {
    return (
      <View style={[styles.wrapper, { justifyContent: "center" }]}>
        <StatusBar barStyle="light-content" />
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.backIcon}>←</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Chi tiết vé</Text>
          <View style={{ width: 24 }} />
        </View>
        {renderState()}
      </View>
    );
  }

  return (
    <View style={styles.wrapper}>
      <StatusBar barStyle="light-content" />
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Chi tiết vé</Text>
        <View style={{ width: 24 }} />
      </View>
      <ScrollView
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View>
              <Text style={styles.orderCode}>MÃ ĐẶT VÉ #{order._id}</Text>
              <Text style={styles.purchaseDate}>
                Ngày mua: {formatDate(order.createdAt)}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Thông tin thanh toán</Text>
          <View style={styles.divider} />
          <View style={styles.infoGrid}>
            <View style={styles.infoBox}>
              <Text style={styles.infoLabel}>Thông tin khách hàng</Text>
              <View style={styles.infoLine}>
                <Text style={styles.infoKey}>Họ tên</Text>
                <Text style={styles.infoValue}>
                  {order?.customerInfo?.fullName || "Đang cập nhật"}
                </Text>
              </View>
              <View style={styles.infoLine}>
                <Text style={styles.infoKey}>Email</Text>
                <Text style={styles.infoValue}>
                  {order?.customerInfo?.email || "Đang cập nhật"}
                </Text>
              </View>
              <View style={styles.infoLine}>
                <Text style={styles.infoKey}>SĐT</Text>
                <Text style={styles.infoValue}>
                  {order?.customerInfo?.phoneNumber || "Đang cập nhật"}
                </Text>
              </View>
            </View>
            <View style={styles.infoBox}>
              <Text style={styles.infoLabel}>Chi tiết thanh toán</Text>
              <View style={styles.infoLine}>
                <Text style={styles.infoKey}>Phương thức</Text>
                <Text style={[styles.infoValue, styles.boldText]}>
                  {order?.paymentMethod || "Đang cập nhật"}
                </Text>
              </View>
              <View style={styles.infoLine}>
                <Text style={styles.infoKey}>Thời gian</Text>
                <Text style={styles.infoValue}>
                  {dayjs(order?.createdAt).format("HH:mm DD/MM/YYYY")}
                </Text>
              </View>
              <View style={styles.infoLine}>
                <Text style={styles.infoKey}>Tổng thanh toán</Text>
                <Text style={[styles.infoValue, styles.highlightText]}>
                  {formatCurrency(finalAmount)}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {order.orderStatus === "RETURNED" && order.returnInfo && (
          <View style={[styles.card, styles.returnCard]}>
            <Text style={[styles.sectionTitle, { color: "#b91c1c" }]}>
              Thông tin trả vé
            </Text>
            <View style={styles.divider} />
            <Text style={styles.infoText}>
              Lý do:{" "}
              <Text style={styles.boldText}>
                {order.returnInfo.reason || "Không có thông tin"}
              </Text>
            </Text>
            <Text style={styles.infoText}>
              Thời gian:{" "}
              <Text style={styles.boldText}>
                {order.returnInfo.returnDate
                  ? `${formatDate(order.returnInfo.returnDate)} ${dayjs(
                      order.returnInfo.returnDate
                    ).format("HH:mm")}`
                  : "Không có thông tin"}
              </Text>
            </Text>
          </View>
        )}

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Thông tin giao dịch</Text>
          <View style={styles.divider} />

          <View style={styles.transactionRow}>
            <Image
              source={
                movie?.posterImage
                  ? { uri: movie.posterImage }
                  : require("assets/Combo.png")
              }
              style={styles.poster}
            />
            <View style={styles.transactionInfo}>
              <Text style={styles.movieTitle}>
                {movie?.title || "Đang cập nhật"}
              </Text>
              <Text style={styles.infoText}>
                Ngày: {formatDate(order.showDate)}
              </Text>
              <Text style={styles.infoText}>
                Giờ: Từ {order.showTime} ~ Đến{" "}
                {calculateEndTime(order.showTime, movie?.duration || 120)}
              </Text>
              <Text style={styles.infoText}>
                Rạp: {theater?.name || "Đang cập nhật"}
              </Text>
              <Text style={styles.infoText}>
                Phòng: {order?.room || order?.roomId || "Đang cập nhật"}
              </Text>
              <Text style={styles.infoText}>Ghế: {seats}</Text>
              <Text style={[styles.amount, { marginTop: 8 }]}>
                {formatCurrency(finalAmount)}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Combo & bắp nước</Text>
          <View style={styles.divider} />
          {renderFoodCombos()}
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Tổng kết</Text>
          <View style={styles.divider} />
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Tổng tiền:</Text>
            <Text style={styles.summaryValue}>
              {formatCurrency(totalAmount)}
            </Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Giảm giá/Voucher:</Text>
            <Text style={styles.summaryValue}>
              -{formatCurrency(discountAmount)}
            </Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={[styles.summaryLabel, styles.boldText]}>
              Thành tiền:
            </Text>
            <Text
              style={[
                styles.summaryValue,
                styles.boldText,
                { color: "#e11d48" },
              ]}
            >
              {formatCurrency(finalAmount)}
            </Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: { flex: 1, backgroundColor: "#f4f4f5" },
  header: {
    backgroundColor: "#111827",
    paddingTop: 28,
    paddingBottom: 16,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  backButton: {
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  backIcon: {
    color: "#fff",
    fontSize: 28,
    fontWeight: "600",
  },
  headerTitle: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "700",
    textAlign: "center",
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 32,
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
    flexWrap: "wrap",
  },
  orderCode: { fontSize: 14, fontWeight: "700", color: "#111827" },
  purchaseDate: { marginTop: 6, color: "#4b5563", fontSize: 13 },
  statusChip: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
    alignSelf: "flex-start",
  },
  statusText: { fontSize: 12, fontWeight: "600" },
  sectionTitle: { fontSize: 16, fontWeight: "700", color: "#111827" },
  divider: {
    height: 1,
    backgroundColor: "#e5e7eb",
    marginVertical: 12,
  },
  infoGrid: {
    flexDirection: "row",
    gap: 12,
    flexWrap: "wrap",
  },
  infoBox: {
    flex: 1,
    minWidth: "48%",
  },
  infoLabel: {
    fontSize: 14,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 8,
  },
  infoLine: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  infoKey: { fontSize: 13, color: "#6b7280" },
  infoValue: {
    fontSize: 13,
    color: "#111827",
    flexShrink: 1,
    textAlign: "right",
  },
  highlightText: { fontWeight: "700", color: "#0f172a" },
  boldText: { fontWeight: "700", color: "#111827" },
  infoText: { fontSize: 13, color: "#4b5563" },
  returnCard: {
    borderWidth: 1,
    borderColor: "#fee2e2",
    backgroundColor: "#fff1f2",
  },
  transactionRow: { flexDirection: "row", gap: 12 },
  poster: {
    width: 110,
    height: 150,
    borderRadius: 12,
    backgroundColor: "#e5e7eb",
  },
  transactionInfo: { flex: 1, gap: 4 },
  movieTitle: { fontSize: 17, fontWeight: "700", color: "#111" },
  amount: { fontSize: 16, fontWeight: "700", color: "#e11d48" },
  comboLine: { marginBottom: 8 },
  comboName: { fontSize: 14, fontWeight: "600", color: "#111827" },
  comboMeta: { fontSize: 13, color: "#4b5563" },
  mutedText: { fontSize: 13, color: "#9ca3af" },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  summaryLabel: { fontSize: 14, color: "#4b5563" },
  summaryValue: { fontSize: 15, color: "#111827" },
  stateContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  stateText: {
    marginTop: 12,
    fontSize: 14,
    color: "#4b5563",
  },
  errorText: {
    fontSize: 14,
    color: "#b91c1c",
    textAlign: "center",
    marginBottom: 16,
  },
  retryButton: {
    borderRadius: 999,
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: "#b91c1c",
  },
  retryText: {
    fontWeight: "600",
    color: "#b91c1c",
    textAlign: "center",
  },
});

export default BookingDetailScreen;
