import { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import {
  useNavigation,
  useRoute,
  RouteProp,
  CommonActions,
} from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import { getOrderByIdApi } from "@/services/api";

type RootStackParamList = {
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
  HomeScreen: undefined;
  BookTicketScreen: any;
  BookingHistoryScreen: undefined;
};

type PaymentResultRouteProp = RouteProp<
  RootStackParamList,
  "PaymentResultScreen"
>;

type PaymentResultNavProp = StackNavigationProp<
  RootStackParamList,
  "PaymentResultScreen"
>;

const PaymentResultScreen = () => {
  const route = useRoute<PaymentResultRouteProp>();
  const navigation = useNavigation<PaymentResultNavProp>();
  const params = route.params;
  const [orderDetail, setOrderDetail] = useState<any>(
    params?.orderData || null
  );
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    navigation.setOptions({ gestureEnabled: false });
    return () => {
      navigation.setOptions({ gestureEnabled: true });
    };
  }, [navigation]);

  useEffect(() => {
    const fetchOrderDetails = async () => {
      if (!params?.orderId || orderDetail) return;
      try {
        setLoading(true);
        const response = await getOrderByIdApi(params.orderId);
        if (response?.status && response.data) {
          setOrderDetail(response.data);
        }
      } catch (error) {
        console.error("Failed to load order detail:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchOrderDetails();
  }, [params?.orderId, orderDetail]);

  const resolvedDetail = orderDetail || params?.orderData || {};
  const displayAmount = resolvedDetail?.finalAmount ?? params?.amount ?? 0;
  const displaySeats =
    resolvedDetail?.seats?.map((seat: any) => seat.seatId) ||
    params?.seats ||
    [];
  const displayTheater =
    (resolvedDetail?.theaterId as any)?.name || params?.theaterName || "";
  const displayMovie =
    (resolvedDetail?.movieId as any)?.title || params?.movieTitle || "";

  const navigateHome = () => {
    navigation.dispatch(
      CommonActions.reset({
        index: 0,
        routes: [{ name: "HomeScreen" as never }],
      })
    );
  };

  const handleViewTickets = () => {
    navigation.navigate("BookingHistoryScreen");
  };

  const handleRetry = () => {
    navigation.goBack();
  };

  const isSuccess = params?.status === "success";
  const statusColor = isSuccess ? "#16a34a" : "#dc2626";
  const statusBackground = isSuccess ? "#ecfdf5" : "#fef2f2";

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      <ScrollView contentContainerStyle={styles.content}>
        <View
          style={[styles.statusBadge, { backgroundColor: statusBackground }]}
        >
          <Text style={[styles.statusIcon, { color: statusColor }]}>
            {isSuccess ? "✅" : "⚠️"}
          </Text>
          <Text style={[styles.statusTitle, { color: statusColor }]}>
            {isSuccess ? "Thanh toán thành công" : "Thanh toán thất bại"}
          </Text>
          <Text style={styles.statusMessage}>
            {isSuccess
              ? "Cảm ơn bạn! Vé xem phim đã được gửi vào email."
              : params?.message ||
                "Giao dịch chưa hoàn tất. Bạn có thể thử lại thanh toán."}
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Thông tin đơn vé</Text>
          {loading ? (
            <ActivityIndicator color="#E50914" />
          ) : (
            <>
              {params?.orderId && <Row label="Mã vé" value={params.orderId} />}
              {displayMovie ? <Row label="Phim" value={displayMovie} /> : null}
              {displayTheater ? (
                <Row label="Rạp" value={displayTheater} />
              ) : null}
              {displaySeats.length > 0 && (
                <Row label="Ghế" value={displaySeats.join(", ")} />
              )}
              {params?.transId && (
                <Row label="Mã giao dịch" value={params.transId} />
              )}
              <Row
                label="Tổng thanh toán"
                value={`${displayAmount.toLocaleString("vi-VN")} ₫`}
                valueStyle={styles.amountValue}
              />
            </>
          )}
        </View>

        {isSuccess ? (
          <View style={styles.buttonGroup}>
            <TouchableOpacity
              style={[styles.primaryButton, styles.successButton]}
              onPress={handleViewTickets}
            >
              <Text style={styles.primaryButtonText}>Vé của tôi</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={navigateHome}
            >
              <Text style={styles.secondaryButtonText}>Về trang chủ</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.buttonGroup}>
            <TouchableOpacity
              style={[styles.primaryButton, styles.errorButton]}
              onPress={handleRetry}
            >
              <Text style={styles.primaryButtonText}>Thử lại thanh toán</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={navigateHome}
            >
              <Text style={styles.secondaryButtonText}>Về trang chủ</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </View>
  );
};

const Row = ({
  label,
  value,
  valueStyle,
}: {
  label: string;
  value: string;
  valueStyle?: any;
}) => (
  <View style={styles.row}>
    <Text style={styles.rowLabel}>{label}</Text>
    <Text style={[styles.rowValue, valueStyle]} numberOfLines={2}>
      {value}
    </Text>
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  content: {
    padding: 20,
    paddingTop: 40,
  },
  statusBadge: {
    borderRadius: 16,
    padding: 20,
    alignItems: "center",
    marginBottom: 20,
  },
  statusIcon: {
    fontSize: 36,
  },
  statusTitle: {
    fontSize: 20,
    fontWeight: "700",
    marginTop: 8,
  },
  statusMessage: {
    marginTop: 6,
    fontSize: 14,
    color: "#4b5563",
    textAlign: "center",
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 20,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 20,
    color: "#111",
    textAlign: "center",
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  rowLabel: {
    fontSize: 14,
    color: "#6b7280",
  },
  rowValue: {
    fontSize: 14,
    color: "#111",
    fontWeight: "600",
    textAlign: "right",
    flex: 1,
    marginLeft: 12,
  },
  amountValue: {
    color: "#dc2626",
    fontSize: 16,
  },
  buttonGroup: {
    gap: 12,
  },
  primaryButton: {
    paddingVertical: 14,
    borderRadius: 999,
    alignItems: "center",
  },
  successButton: {
    backgroundColor: "#16a34a",
  },
  errorButton: {
    backgroundColor: "#dc2626",
  },
  primaryButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
  secondaryButton: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#d1d5db",
    paddingVertical: 14,
    alignItems: "center",
  },
  secondaryButtonText: {
    color: "#111",
    fontSize: 16,
    fontWeight: "600",
  },
});

export default PaymentResultScreen;
