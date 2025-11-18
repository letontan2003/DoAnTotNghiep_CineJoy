import { useEffect, useState, useMemo, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  ActivityIndicator,
  Alert,
  Image,
} from "react-native";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import { IMovie } from "@/types/api";
import {
  getCurrentPriceListApi,
  getFoodCombosApi,
  IPriceListLine,
} from "@/services/api";
import SideMenu from "@/components/SideMenu";
import comboPlaceholder from "assets/Combo.png";

type RoomParam = string | { _id: string; name: string; roomType?: string };

type ComboSelectionParams = {
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
};

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
  ComboSelectionScreen: ComboSelectionParams;
  PaymentScreen: PaymentScreenParams;
};

type ComboSelectionNavigationProp = StackNavigationProp<
  RootStackParamList,
  "ComboSelectionScreen"
>;

type ComboSelectionRouteProp = RouteProp<
  RootStackParamList,
  "ComboSelectionScreen"
>;

type ComboType = "single" | "combo";

interface UIComboItem {
  _id: string;
  name: string;
  description?: string;
  price: number;
  type: ComboType;
  image?: string;
}

const resolveRoomTypeFromParam = (roomData: RoomParam): string => {
  if (typeof roomData === "object") {
    if (roomData?.roomType) return roomData.roomType;
    if (roomData?.name?.toLowerCase().includes("4dx")) return "4DX";
  } else if (typeof roomData === "string") {
    if (roomData.toLowerCase().includes("4dx")) return "4DX";
  }
  return "2D";
};

const ComboSelectionScreen = () => {
  const navigation = useNavigation<ComboSelectionNavigationProp>();
  const route = useRoute<ComboSelectionRouteProp>();
  const {
    movie,
    showtimeId,
    theaterId,
    theaterName,
    roomName,
    date,
    startTime,
    endTime,
    selectedSeats,
    totalTicketPrice,
    room,
    seatTypeCounts,
    seatTypeMap,
  } = route.params;

  const [comboItems, setComboItems] = useState<UIComboItem[]>([]);
  const [comboCounts, setComboCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [showSideMenu, setShowSideMenu] = useState(false);

  const formatCurrency = (amount: number) =>
    `${amount.toLocaleString("vi-VN")} ₫`;

  const formatDateVN = (dateStr: string): string => {
    if (!dateStr) return "";
    if (dateStr.includes("/")) return dateStr;
    const parts = dateStr.split("-");
    if (parts.length === 3) {
      return `${parts[2]}-${parts[1]}-${parts[0]}`;
    }
    return dateStr;
  };

  const loadCombos = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [priceList, foodCombos] = await Promise.all([
        getCurrentPriceListApi(),
        getFoodCombosApi(),
      ]);

      if (!priceList?.lines || priceList.lines.length === 0) {
        setComboItems([]);
        setComboCounts({});
        return;
      }

      const productMap = new Map(
        (foodCombos || []).map((item) => [item._id, item])
      );

      const merged: UIComboItem[] = priceList.lines
        .filter(
          (line): line is IPriceListLine & { productId: string } =>
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
            price: line.price || 0,
            type: line.type as ComboType,
            image: (product as any)?.image,
          };
        });

      setComboItems(merged);
      const initialCounts: Record<string, number> = {};
      merged.forEach((item) => {
        initialCounts[item._id] = 0;
      });
      setComboCounts(initialCounts);
    } catch (err) {
      console.error("Error loading combos:", err);
      setError("Không thể tải danh sách combo. Vui lòng thử lại.");
      setComboItems([]);
      setComboCounts({});
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCombos();
  }, [loadCombos]);

  const selectedComboSummaries = useMemo<SelectedComboSummary[]>(() => {
    return Object.entries(comboCounts)
      .filter(([, count]) => (count || 0) > 0)
      .map(([comboId, count]) => {
        const combo = comboItems.find((item) => item._id === comboId);
        if (!combo) return null;
        return {
          comboId,
          name: combo.name,
          price: combo.price || 0,
          quantity: count || 0,
        };
      })
      .filter(Boolean) as SelectedComboSummary[];
  }, [comboCounts, comboItems]);

  const comboTotal = useMemo(() => {
    return selectedComboSummaries.reduce(
      (sum, combo) => sum + combo.price * combo.quantity,
      0
    );
  }, [selectedComboSummaries]);

  const totalPayment = totalTicketPrice + comboTotal;

  const handleIncrease = (id: string) => {
    setComboCounts((prev) => ({
      ...prev,
      [id]: Math.min((prev[id] || 0) + 1, 20),
    }));
  };

  const handleDecrease = (id: string) => {
    setComboCounts((prev) => ({
      ...prev,
      [id]: Math.max((prev[id] || 0) - 1, 0),
    }));
  };

  const handleProceedPayment = () => {
    if (!selectedSeats.length) {
      Alert.alert("Thông báo", "Vui lòng chọn ghế trước khi thanh toán.");
      return;
    }

    navigation.navigate("PaymentScreen", {
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
      selectedCombos: selectedComboSummaries,
      comboTotal,
    });
  };

  const roomTypeLabel = resolveRoomTypeFromParam(room);
  const seatsLabel = `${selectedSeats.length} ghế`;
  const comboDetailParts = selectedComboSummaries.map(
    (combo) => `${combo.name} x${combo.quantity}`
  );
  const fullDetail = [seatsLabel, ...comboDetailParts].join(" + ");
  const detailText =
    fullDetail.length > 50 ? `${fullDetail.slice(0, 50)}...` : fullDetail;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#000" />
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.headerBackButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>{theaterName}</Text>
          <Text style={styles.headerSubtitle}>
            {roomName} | {formatDateVN(date)} |{" "}
            {endTime ? `${startTime} ~ ${endTime}` : startTime}
          </Text>
        </View>
        <TouchableOpacity
          style={styles.headerRight}
          onPress={() => setShowSideMenu(true)}
        >
          <Text style={styles.menuPlaceholder}>☰</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.banner}>
        <Image source={comboPlaceholder} style={styles.bannerImage} />
        <Text style={styles.bannerText}>
          Áp dụng giá Lễ, Tết cho các sản phẩm bắp nước đối với giao dịch có
          suất chiếu vào ngày Lễ, Tết.
        </Text>
      </View>

      <View style={styles.comboListContainer}>
        {loading ? (
          <View style={styles.loadingState}>
            <ActivityIndicator size="large" color="#E50914" />
            <Text style={styles.loadingText}>Đang tải combo...</Text>
          </View>
        ) : error ? (
          <View style={styles.errorState}>
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity style={styles.retryButton} onPress={loadCombos}>
              <Text style={styles.retryButtonText}>Thử lại</Text>
            </TouchableOpacity>
          </View>
        ) : comboItems.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>
              Hiện chưa có combo nào khả dụng.
            </Text>
          </View>
        ) : (
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.comboScrollContent}
          >
            {comboItems.map((combo) => {
              const quantity = comboCounts[combo._id] || 0;
              return (
                <View key={combo._id} style={styles.comboCard}>
                  <Image
                    source={
                      combo.image ? { uri: combo.image } : comboPlaceholder
                    }
                    style={styles.comboImage}
                  />
                  <View style={styles.comboContent}>
                    <View style={styles.comboInfo}>
                      <Text style={styles.comboName}>
                        {combo.name} - {formatCurrency(combo.price)}
                      </Text>
                      {combo.description ? (
                        <Text style={styles.comboDesc}>
                          {combo.description}
                        </Text>
                      ) : null}
                    </View>
                    <View style={styles.quantityControls}>
                      <TouchableOpacity
                        style={[
                          styles.quantityButton,
                          quantity === 0 && styles.quantityButtonDisabled,
                        ]}
                        onPress={() => handleDecrease(combo._id)}
                        disabled={quantity === 0}
                      >
                        <Text style={styles.quantityButtonText}>−</Text>
                      </TouchableOpacity>
                      <Text style={styles.quantityValue}>{quantity}</Text>
                      <TouchableOpacity
                        style={styles.quantityButton}
                        onPress={() => handleIncrease(combo._id)}
                      >
                        <Text style={styles.quantityButtonText}>+</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              );
            })}
          </ScrollView>
        )}
      </View>

      <View style={styles.summaryBar}>
        <View style={styles.summaryInfo}>
          <View style={styles.summaryTitleRow}>
            <Text style={styles.movieTitle}>{movie.title}</Text>
            {movie.ageRating && (
              <View style={styles.ageBadge}>
                <Text style={styles.ageBadgeText}>{movie.ageRating}</Text>
              </View>
            )}
          </View>
          <Text style={styles.summaryText}>{roomTypeLabel} Phụ Đề Anh</Text>
          <View style={styles.summaryBottomRow}>
            <Text style={styles.summaryTotal}>
              {formatCurrency(totalPayment)}
            </Text>
            <Text
              style={styles.summarySeatText}
              numberOfLines={1}
              ellipsizeMode="tail"
            >
              {detailText}
            </Text>
          </View>
        </View>
        <TouchableOpacity
          style={styles.checkoutButton}
          onPress={handleProceedPayment}
        >
          <Text style={styles.checkoutText}>Thanh toán</Text>
        </TouchableOpacity>
      </View>
      <SideMenu visible={showSideMenu} onClose={() => setShowSideMenu(false)} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#111",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: StatusBar.currentHeight ? StatusBar.currentHeight + 8 : 25,
    paddingBottom: 12,
    backgroundColor: "#000",
  },
  headerBackButton: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  backIcon: {
    fontSize: 28,
    color: "#fff",
  },
  headerCenter: {
    flex: 1,
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 16,
    color: "#fff",
    fontWeight: "bold",
  },
  headerSubtitle: {
    fontSize: 12,
    color: "#ccc",
    marginTop: 2,
  },
  headerRight: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  menuPlaceholder: {
    color: "#fff",
    fontSize: 30,
  },
  banner: {
    backgroundColor: "#e94e4c",
    paddingHorizontal: 16,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  bannerText: {
    color: "#fff",
    fontSize: 13,
    lineHeight: 18,
    textAlign: "left",
    flex: 1,
    marginLeft: 12,
  },
  bannerImage: {
    width: 48,
    height: 48,
    resizeMode: "contain",
  },
  comboListContainer: {
    flex: 1,
    padding: 16,
  },
  comboScrollContent: {
    paddingBottom: 24,
    gap: 12,
  },
  comboCard: {
    backgroundColor: "#1C1C1E",
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: "#2c2c2e",
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  comboImage: {
    width: 70,
    height: 70,
    borderRadius: 8,
    resizeMode: "cover",
  },
  comboContent: {
    flex: 1,
  },
  comboInfo: {
    marginBottom: 12,
  },
  comboName: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 15,
  },
  comboDesc: {
    color: "#bbb",
    fontSize: 13,
    marginTop: 6,
    lineHeight: 18,
  },
  quantityControls: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-start",
    gap: 12,
  },
  quantityButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#E50914",
    alignItems: "center",
    justifyContent: "center",
  },
  quantityButtonDisabled: {
    backgroundColor: "#4b5563",
  },
  quantityButtonText: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "bold",
  },
  quantityValue: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
    minWidth: 24,
    textAlign: "center",
  },
  summaryBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    backgroundColor: "#000",
    borderTopWidth: 1,
    borderTopColor: "#1f1f1f",
  },
  summaryInfo: {
    flex: 1,
    marginRight: 12,
  },
  summaryTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 4,
  },
  movieTitle: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "bold",
  },
  ageBadge: {
    backgroundColor: "#E50914",
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  ageBadgeText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "bold",
  },
  summaryText: {
    color: "#bbb",
    fontSize: 13,
    marginTop: 2,
  },
  summaryTotal: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
  summaryBottomRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 6,
  },
  summarySeatText: {
    color: "#bbb",
    fontSize: 13,
    marginLeft: 8,
    flex: 1,
    textAlign: "left",
  },
  summaryDetail: {
    color: "#bbb",
    fontSize: 12,
    marginTop: 4,
  },
  checkoutButton: {
    backgroundColor: "#E50914",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 10,
  },
  checkoutText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 15,
  },
  loadingState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 40,
  },
  loadingText: {
    color: "#fff",
    marginTop: 12,
  },
  errorState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 40,
  },
  errorText: {
    color: "#f87171",
    textAlign: "center",
    marginBottom: 12,
  },
  retryButton: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: "#E50914",
  },
  retryButtonText: {
    color: "#fff",
    fontWeight: "600",
  },
  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 40,
  },
  emptyText: {
    color: "#bbb",
    fontSize: 14,
  },
});

export default ComboSelectionScreen;
