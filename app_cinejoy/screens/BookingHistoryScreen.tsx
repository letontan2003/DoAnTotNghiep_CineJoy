import { useCallback, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Image,
  RefreshControl,
  TouchableOpacity,
  StatusBar,
  ActivityIndicator,
} from "react-native";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import dayjs from "dayjs";
import { getUserBookingHistoryApi } from "@/services/api";
import BookingHistorySkeleton from "@/components/Skeleton/BookingHistorySkeleton";

type RootStackParamList = {
  BookingHistoryScreen: undefined;
  HomeScreen: undefined;
  PaymentResultScreen: { status: "success" | "failed"; orderId?: string };
  BookingDetailScreen: { orderId: string };
};

type BookingHistoryNavProp = StackNavigationProp<
  RootStackParamList,
  "BookingHistoryScreen"
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

const PAGE_SIZE = 6;

const BookingHistoryScreen = () => {
  const navigation = useNavigation<BookingHistoryNavProp>();
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [isFetchingMore, setIsFetchingMore] = useState(false);

  const fetchHistory = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await getUserBookingHistoryApi();
      if (response?.status && Array.isArray(response.data)) {
        setOrders(response.data);
        setPage(1);
      } else {
        setError(response?.message || "Không tải được lịch sử giao dịch");
      }
    } catch (err) {
      console.error("History fetch error:", err);
      setError("Không tải được lịch sử giao dịch");
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchHistory();
    }, [fetchHistory])
  );

  const displayedOrders = useMemo(() => {
    return orders.slice(0, page * PAGE_SIZE);
  }, [orders, page]);

  const hasMore = displayedOrders.length < orders.length;

  const handleLoadMore = () => {
    if (!hasMore || loading || isFetchingMore) return;
    setIsFetchingMore(true);
    requestAnimationFrame(() => {
      setPage((prev) => prev + 1);
      setIsFetchingMore(false);
    });
  };

  const handleOrderPress = (orderId?: string) => {
    if (!orderId) return;
    navigation.navigate("BookingDetailScreen", { orderId });
  };

  const renderStatus = (status: string) => {
    const mapping = statusMap[status] || {
      label: status,
      color: "#374151",
      background: "#e5e7eb",
    };
    return (
      <View
        style={[
          styles.statusChip,
          { backgroundColor: mapping.background, borderColor: mapping.color },
        ]}
      >
        <Text style={[styles.statusText, { color: mapping.color }]}>
          {mapping.label}
        </Text>
      </View>
    );
  };

  const renderOrder = ({ item }: { item: any }) => {
    const movie = item?.movieId || {};
    const theater = item?.theaterId || {};
    const seats =
      item?.seats?.map((seat: { seatId: string }) => seat.seatId).join(", ") ||
      "N/A";
    const showDate = dayjs(item?.showDate).format("DD/MM/YYYY");
    const endTime = dayjs(`${item?.showDate} ${item?.showTime}`)
      .add(movie?.duration || 120, "minute")
      .format("HH:mm");

    return (
      <TouchableOpacity
        style={styles.card}
        activeOpacity={0.9}
        onPress={() => handleOrderPress(item?._id)}
      >
        <View style={styles.cardHeader}>
          <Text style={styles.orderCode}>Mã đặt vé: {item?._id}</Text>
          {renderStatus(item?.orderStatus)}
        </View>
        <View style={styles.cardBody}>
          <Image
            source={
              movie?.posterImage
                ? { uri: movie.posterImage }
                : require("assets/Combo.png")
            }
            style={styles.poster}
          />
          <View style={styles.cardInfo}>
            <Text style={styles.movieTitle}>
              {movie?.title || "Đang cập nhật"}
            </Text>
            <Text style={styles.labelValue}>
              <Text style={styles.label}>Ngày:</Text> {showDate}
            </Text>
            <Text style={styles.labelValue}>
              <Text style={styles.label}>Giờ:</Text> {item?.showTime} ~{" "}
              {endTime}
            </Text>
            <Text style={styles.labelValue}>
              <Text style={styles.label}>Rạp:</Text>{" "}
              {theater?.name || "Đang cập nhật"}
            </Text>
            <Text style={styles.labelValue}>
              <Text style={styles.label}>Ghế:</Text> {seats}
            </Text>
            <Text style={styles.amount}>
              {Number(item?.finalAmount || 0).toLocaleString("vi-VN")} ₫
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const listEmpty = useMemo(() => {
    if (loading) return null;
    if (error) {
      return (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={fetchHistory}>
            <Text style={styles.retryText}>Thử lại</Text>
          </TouchableOpacity>
        </View>
      );
    }
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyTitle}>Chưa có giao dịch</Text>
        <Text style={styles.emptySubtitle}>
          Hãy tiếp tục đặt vé để lịch sử hiển thị tại đây nhé!
        </Text>
        <TouchableOpacity
          style={styles.primaryButton}
          onPress={() => navigation.navigate("HomeScreen")}
        >
          <Text style={styles.primaryButtonText}>Khám phá phim</Text>
        </TouchableOpacity>
      </View>
    );
  }, [loading, error, fetchHistory, navigation]);

  const renderContent = () => {
    if (loading && orders.length === 0) {
      return <BookingHistorySkeleton />;
    }
    return (
      <FlatList
        data={displayedOrders}
        keyExtractor={(item) => item?._id}
        contentContainerStyle={styles.listContent}
        renderItem={renderOrder}
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.4}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={fetchHistory} />
        }
        ListEmptyComponent={listEmpty}
        ListFooterComponent={
          isFetchingMore ? (
            <View style={styles.listFooter}>
              <ActivityIndicator color="#E50914" />
            </View>
          ) : hasMore ? (
            <View style={styles.listFooter}>
              <Text style={styles.footerText}>Kéo nhẹ để tải thêm…</Text>
            </View>
          ) : null
        }
      />
    );
  };

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
        <Text style={styles.headerTitle}>Vé của tôi</Text>
        <View style={{ width: 24 }} />
      </View>
      {renderContent()}
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
  listContent: { padding: 16, paddingBottom: 40 },
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
    marginBottom: 12,
  },
  orderCode: { fontSize: 13, color: "#6b7280" },
  statusChip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
  },
  statusText: { fontSize: 12, fontWeight: "600" },
  cardBody: { flexDirection: "row", gap: 12 },
  poster: {
    width: 90,
    height: 120,
    borderRadius: 10,
    backgroundColor: "#e5e7eb",
  },
  cardInfo: { flex: 1, gap: 4 },
  movieTitle: { fontSize: 16, fontWeight: "700", color: "#111" },
  labelValue: { fontSize: 13, color: "#4b5563" },
  label: { fontWeight: "600", color: "#111" },
  amount: { marginTop: 6, fontSize: 16, fontWeight: "700", color: "#e11d48" },
  emptyContainer: {
    marginTop: 80,
    alignItems: "center",
    paddingHorizontal: 24,
  },
  emptyTitle: { fontSize: 18, fontWeight: "700", color: "#111" },
  emptySubtitle: {
    marginTop: 6,
    fontSize: 14,
    color: "#6b7280",
    textAlign: "center",
  },
  emptyText: {
    fontSize: 14,
    color: "#b91c1c",
    textAlign: "center",
    marginBottom: 16,
  },
  retryButton: {
    borderRadius: 999,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: "#b91c1c",
  },
  retryText: { color: "#b91c1c", fontWeight: "600" },
  primaryButton: {
    marginTop: 16,
    backgroundColor: "#2563eb",
    paddingHorizontal: 28,
    paddingVertical: 12,
    borderRadius: 999,
  },
  primaryButtonText: { color: "#fff", fontWeight: "700", fontSize: 15 },
  listFooter: {
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  footerText: { fontSize: 13, color: "#6b7280" },
});

export default BookingHistoryScreen;
