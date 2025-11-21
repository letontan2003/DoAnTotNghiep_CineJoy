import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  StatusBar,
  Platform,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Modal,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import Fontisto from "@expo/vector-icons/Fontisto";
import { useState, useEffect } from "react";
import { useAppSelector, useAppDispatch } from "@/store/hooks";
import dayjs from "dayjs";
import SideMenu from "@/components/SideMenu";
import {
  getVouchersApi,
  getMyVouchersApi,
  redeemVoucherApi,
  fetchAccountApi,
} from "@/services/api";
import { IVoucher, IUserVoucher, IPromotionLine } from "@/types/api";
import { setUser } from "@/store/appSlice";
import VoucherSkeleton from "@/components/Skeleton/VoucherSkeleton";

type RootStackParamList = {
  VoucherScreen: undefined;
  LoginScreen: undefined;
};

type VoucherScreenNavigationProp = StackNavigationProp<
  RootStackParamList,
  "VoucherScreen"
>;

const VoucherScreen = () => {
  const navigation = useNavigation<VoucherScreenNavigationProp>();
  const dispatch = useAppDispatch();
  const user = useAppSelector((state) => state.app.user);
  const isAuthenticated = useAppSelector((state) => state.app.isAuthenticated);
  const [showSideMenu, setShowSideMenu] = useState(false);
  const [vouchers, setVouchers] = useState<IVoucher[]>([]);
  const [myVouchers, setMyVouchers] = useState<IUserVoucher[]>([]);
  const [loadingVoucher, setLoadingVoucher] = useState(false);
  const [loadingMyVouchers, setLoadingMyVouchers] = useState(false);
  const [loadingRedeem, setLoadingRedeem] = useState(false);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [selectedVoucher, setSelectedVoucher] = useState<{
    voucherId: string;
    detailId?: string;
    title: string;
  } | null>(null);
  const [modalType, setModalType] = useState<"redeem" | "showCode" | null>(
    null
  );
  const [voucherCode, setVoucherCode] = useState<string | null>(null);

  const toggleSideMenu = () => {
    setShowSideMenu(!showSideMenu);
  };

  const closeSideMenu = () => {
    setShowSideMenu(false);
  };

  const fetchVouchers = async () => {
    setLoadingVoucher(true);
    try {
      const data = await getVouchersApi();
      setVouchers(data);
    } catch (error) {
      console.error("Error fetching vouchers:", error);
      setVouchers([]);
    } finally {
      setLoadingVoucher(false);
    }
  };

  const fetchMyVouchers = async () => {
    if (!isAuthenticated) {
      setMyVouchers([]);
      return;
    }
    setLoadingMyVouchers(true);
    try {
      const res = await getMyVouchersApi();
      if (res.status && res.data) {
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

  useEffect(() => {
    fetchVouchers();
    fetchMyVouchers();
  }, [isAuthenticated]);

  const handleRedeemVoucher = (
    voucher: IVoucher,
    line: IPromotionLine,
    detailId?: string
  ) => {
    const title =
      (line.detail as any)?.description || voucher.name || "Voucher";
    setSelectedVoucher({ voucherId: voucher._id, detailId, title });
    setModalType("redeem");
    setIsModalVisible(true);
  };

  const handleShowCode = (voucher: IUserVoucher) => {
    setSelectedVoucher(null);
    setVoucherCode(voucher.code || "");
    setModalType("showCode");
    setIsModalVisible(true);
  };

  const handleConfirmRedeem = async () => {
    if (!selectedVoucher) return;
    try {
      setLoadingRedeem(true);
      const res = await redeemVoucherApi(
        selectedVoucher.voucherId,
        selectedVoucher.detailId
      );
      if (res.status) {
        setIsModalVisible(false);
        setSelectedVoucher(null);
        setModalType(null);
        Alert.alert(
          "Thành công!",
          `Bạn đã đổi thành công voucher "${
            selectedVoucher.title
          }"\nMã sử dụng: ${res.data?.code || ""}`,
          [{ text: "Đóng" }]
        );
        await fetchMyVouchers();
        await fetchVouchers();
        const accountRes = await fetchAccountApi();
        if (accountRes.status && accountRes.data?.user) {
          dispatch(setUser(accountRes.data.user));
        }
      } else {
        setIsModalVisible(false);
        setSelectedVoucher(null);
        setModalType(null);
        Alert.alert(
          "Lỗi!",
          res.message || "Có lỗi xảy ra khi đổi voucher. Vui lòng thử lại."
        );
      }
    } catch (error) {
      Alert.alert("Lỗi!", "Có lỗi xảy ra khi đổi voucher. Vui lòng thử lại.");
    } finally {
      setLoadingRedeem(false);
    }
  };

  const handleCancelModal = () => {
    setIsModalVisible(false);
    setSelectedVoucher(null);
    setModalType(null);
    setVoucherCode(null);
  };

  // Lọc các voucher hợp lệ của tôi
  const validMyVouchers = myVouchers.filter((voucher) => {
    const statusOk = voucher.status === "unused";
    const voucherIdObj =
      typeof voucher.voucherId === "object" ? voucher.voucherId : null;
    const end = voucherIdObj?.validityPeriod?.endDate;
    const dateOk = !end || dayjs(end).isAfter(dayjs());
    return statusOk && dateOk;
  });

  // Tạo danh sách entries từ vouchers
  const availableEntries = vouchers
    .flatMap((voucher: IVoucher) => {
      const lines = Array.isArray(voucher.lines) ? voucher.lines : [];
      return lines
        .filter((line) => (line as IPromotionLine)?.promotionType === "voucher")
        .map((line, index) => {
          const validity = (line as IPromotionLine)?.validityPeriod || {
            startDate: (voucher as any)?.startDate,
            endDate: (voucher as any)?.endDate,
          };
          const quantity = ((line as any)?.detail?.quantity ??
            voucher.quantity ??
            0) as number;
          const pointToRedeem = ((line as any)?.detail?.pointToRedeem ??
            voucher.pointToRedeem ??
            0) as number;
          const maxDiscountValue = (line as any)?.detail?.maxDiscountValue as
            | number
            | undefined;
          const title = (line as any)?.detail?.description || voucher.name;
          const detailId = (line as any)?.detail?._id;
          return {
            key: `${voucher._id}-${index}`,
            voucher,
            line,
            index,
            validity,
            quantity: Number(quantity) || 0,
            pointToRedeem: Number(pointToRedeem) || 0,
            maxDiscountValue,
            title,
            detailId,
          };
        });
    })
    .filter((entry) => {
      const withinDate =
        dayjs(entry.validity?.startDate).isBefore(dayjs()) &&
        dayjs(entry.validity?.endDate).isAfter(dayjs());
      const active =
        entry.voucher.status === "hoạt động" &&
        entry.line.status === "hoạt động";
      return entry.quantity > 0 && active && withinDate;
    });

  if (!isAuthenticated || !user) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor="#fff" />
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Fontisto name="arrow-left" size={24} color="#E50914" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Đổi ưu đãi</Text>
          <View style={styles.headerRight}>
            <TouchableOpacity
              style={styles.headerIcon}
              onPress={toggleSideMenu}
            >
              <Text style={styles.menuIconText}>☰</Text>
            </TouchableOpacity>
          </View>
        </View>
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>Bạn chưa đăng nhập!</Text>
          <Text style={styles.emptySubText}>
            Vui lòng đăng nhập để xem thông tin này.
          </Text>
        </View>
        <SideMenu visible={showSideMenu} onClose={closeSideMenu} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Fontisto name="arrow-left" size={24} color="#E50914" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Đổi ưu đãi</Text>
        <View style={styles.headerRight}>
          <TouchableOpacity style={styles.headerIcon} onPress={toggleSideMenu}>
            <Text style={styles.menuIconText}>☰</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Voucher của tôi */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Voucher của tôi</Text>
          {loadingMyVouchers ? (
            <VoucherSkeleton count={2} />
          ) : validMyVouchers.length === 0 ? (
            <View style={styles.emptyStateContainer}>
              <Text style={styles.emptyStateText}>
                Bạn chưa có voucher nào.
              </Text>
            </View>
          ) : (
            <View style={styles.voucherGrid}>
              {validMyVouchers.map((voucher) => {
                const voucherIdObj =
                  typeof voucher.voucherId === "object"
                    ? voucher.voucherId
                    : null;
                const isExpired: boolean =
                  voucher.status === "expired" ||
                  (voucherIdObj?.validityPeriod?.endDate
                    ? dayjs().isAfter(
                        dayjs(voucherIdObj.validityPeriod.endDate)
                      )
                    : false);
                let title =
                  voucherIdObj?.description || voucherIdObj?.name || "Voucher";
                let endDate: string | Date | undefined =
                  voucherIdObj?.validityPeriod?.endDate;

                // Nếu voucherId là string, tìm trong vouchers
                if (typeof voucher.voucherId === "string") {
                  const detailId = voucher.voucherId;
                  const owner = vouchers.find(
                    (v) =>
                      Array.isArray(v.lines) &&
                      v.lines.some(
                        (l) =>
                          (l as any)?.detail?._id?.toString?.() === detailId
                      )
                  );
                  const line = owner?.lines?.find(
                    (l) => (l as any)?.detail?._id?.toString?.() === detailId
                  ) as any;
                  if (line?.detail?.description)
                    title = line.detail.description;
                  endDate = line?.validityPeriod?.endDate || owner?.endDate;
                }

                return (
                  <View
                    key={voucher._id}
                    style={[
                      styles.voucherCard,
                      isExpired && styles.voucherCardExpired,
                    ]}
                  >
                    <View style={styles.voucherCardHeader}>
                      <Text
                        style={[
                          styles.voucherCardTitle,
                          isExpired && styles.voucherCardTitleExpired,
                        ]}
                      >
                        🎟️ {title}
                      </Text>
                      <View
                        style={[
                          styles.voucherBadge,
                          isExpired
                            ? styles.voucherBadgeExpired
                            : styles.voucherBadgeActive,
                        ]}
                      >
                        <Text style={styles.voucherBadgeText}>
                          {isExpired ? "Hết hạn" : "Còn hạn"}
                        </Text>
                      </View>
                    </View>
                    <View style={styles.voucherCardInfo}>
                      <Text style={styles.voucherCardLabel}>Hạn dùng:</Text>
                      <Text style={styles.voucherCardValue}>
                        {endDate ? dayjs(endDate).format("DD/MM/YYYY") : ""}
                      </Text>
                    </View>
                    <TouchableOpacity
                      style={[
                        styles.voucherButton,
                        isExpired && styles.voucherButtonDisabled,
                      ]}
                      disabled={isExpired}
                      onPress={() => handleShowCode(voucher)}
                    >
                      <Text style={styles.voucherButtonText}>
                        {isExpired ? "Đã hết hạn" : "Sử dụng"}
                      </Text>
                    </TouchableOpacity>
                  </View>
                );
              })}
            </View>
          )}
        </View>

        {/* Danh sách Voucher */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Danh sách Voucher</Text>
          {loadingVoucher ? (
            <VoucherSkeleton count={3} />
          ) : availableEntries.length === 0 ? (
            <View style={styles.emptyStateContainer}>
              <Text style={styles.emptyStateText}>
                Hiện chưa có voucher nào khả dụng.
              </Text>
            </View>
          ) : (
            <View style={styles.voucherGrid}>
              {availableEntries.map((entry) => {
                const {
                  voucher,
                  quantity,
                  validity,
                  pointToRedeem,
                  maxDiscountValue,
                  title,
                  detailId,
                } = entry;
                const enoughPoint = (user?.point ?? 0) >= pointToRedeem;

                return (
                  <View key={entry.key} style={styles.voucherCard}>
                    <View style={styles.voucherCardHeader}>
                      <Text style={styles.voucherCardTitle}>🎟️ {title}</Text>
                      <View style={styles.quantityBadge}>
                        <Text style={styles.quantityBadgeText}>
                          Còn lại: {quantity}
                        </Text>
                      </View>
                    </View>
                    <View style={styles.voucherCardInfo}>
                      <Text style={styles.voucherCardLabel}>Thời hạn:</Text>
                      <Text style={styles.voucherCardValue}>
                        {dayjs(validity?.startDate).format("DD/MM/YYYY")} -{" "}
                        {dayjs(validity?.endDate).format("DD/MM/YYYY")}
                      </Text>
                    </View>
                    <View style={styles.voucherCardInfo}>
                      <Text style={styles.voucherCardLabel}>Điểm cần:</Text>
                      <Text
                        style={[styles.voucherCardValue, styles.pointsValue]}
                      >
                        {pointToRedeem} điểm
                      </Text>
                    </View>
                    {typeof maxDiscountValue === "number" && (
                      <View style={styles.voucherCardInfo}>
                        <Text style={styles.voucherCardLabel}>
                          Giảm tối đa:
                        </Text>
                        <Text
                          style={[
                            styles.voucherCardValue,
                            styles.discountValue,
                          ]}
                        >
                          {maxDiscountValue.toLocaleString("vi-VN")} VNĐ
                        </Text>
                      </View>
                    )}
                    <TouchableOpacity
                      style={[
                        styles.redeemButton,
                        (!enoughPoint || quantity <= 0) &&
                          styles.redeemButtonDisabled,
                      ]}
                      disabled={!enoughPoint || quantity <= 0}
                      onPress={() =>
                        handleRedeemVoucher(voucher, entry.line, detailId)
                      }
                    >
                      <Text style={styles.redeemButtonText}>
                        {enoughPoint ? "Đổi ngay" : "Không đủ điểm"}
                      </Text>
                    </TouchableOpacity>
                  </View>
                );
              })}
            </View>
          )}
        </View>
      </ScrollView>

      {/* Modal */}
      <Modal
        visible={isModalVisible}
        transparent
        animationType="slide"
        onRequestClose={handleCancelModal}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              {modalType === "redeem"
                ? "Xác nhận đổi voucher"
                : "Mã voucher của bạn"}
            </Text>
            {modalType === "redeem" && (
              <View style={styles.modalBody}>
                <Text style={styles.modalText}>
                  Bạn có chắc chắn muốn đổi voucher này không?
                </Text>
                <View style={styles.modalButtons}>
                  <TouchableOpacity
                    style={[styles.modalButton, styles.modalButtonCancel]}
                    onPress={handleCancelModal}
                  >
                    <Text style={styles.modalButtonCancelText}>Hủy</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.modalButton, styles.modalButtonConfirm]}
                    onPress={handleConfirmRedeem}
                    disabled={loadingRedeem}
                  >
                    {loadingRedeem ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <Text style={styles.modalButtonConfirmText}>
                        Xác nhận
                      </Text>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            )}
            {modalType === "showCode" && (
              <View style={styles.modalBody}>
                <View style={styles.voucherCodeContainer}>
                  <Text style={styles.voucherCodeText} selectable>
                    {voucherCode}
                  </Text>
                </View>
                <TouchableOpacity
                  style={[styles.modalButtonSingle, styles.modalButtonConfirm]}
                  onPress={handleCancelModal}
                  activeOpacity={0.8}
                >
                  <Text style={styles.modalButtonConfirmText}>Đóng</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </Modal>

      {/* Side Menu */}
      <SideMenu visible={showSideMenu} onClose={closeSideMenu} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingTop:
      Platform.OS === "android" ? (StatusBar.currentHeight || 0) + 64 : 64,
    marginTop: 40,
    paddingBottom: 20,
    paddingHorizontal: 16,
  },
  header: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingTop:
      Platform.OS === "android" ? (StatusBar.currentHeight || 0) + 12 : 30,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
    zIndex: 1000,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
    flex: 1,
    textAlign: "center",
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
  },
  headerIcon: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  menuIconText: {
    fontSize: 30,
    color: "#E50914",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingTop: 100,
  },
  emptyText: {
    fontSize: 20,
    fontWeight: "600",
    color: "#333",
    marginBottom: 8,
  },
  emptySubText: {
    fontSize: 16,
    color: "#666",
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#a05a1c",
    marginBottom: 16,
    textAlign: "center",
  },
  loadingContainer: {
    paddingVertical: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyStateContainer: {
    paddingVertical: 24,
    alignItems: "center",
  },
  emptyStateText: {
    fontSize: 16,
    color: "#999",
    textAlign: "center",
  },
  voucherGrid: {
    gap: 16,
  },
  voucherCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: "#fbbf24",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  voucherCardExpired: {
    backgroundColor: "#e9ecef",
    borderColor: "#ccc",
  },
  voucherCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  voucherCardTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
    flex: 1,
    marginRight: 8,
  },
  voucherCardTitleExpired: {
    color: "#999",
  },
  voucherBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  voucherBadgeActive: {
    backgroundColor: "#d1fae5",
  },
  voucherBadgeExpired: {
    backgroundColor: "#e5e7eb",
  },
  voucherBadgeText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#065f46",
  },
  quantityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    backgroundColor: "#fef3c7",
  },
  quantityBadgeText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#92400e",
  },
  voucherCardInfo: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
    gap: 8,
  },
  voucherCardLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#666",
  },
  voucherCardValue: {
    fontSize: 14,
    color: "#333",
  },
  pointsValue: {
    color: "#f97316",
    fontWeight: "bold",
  },
  discountValue: {
    color: "#16a34a",
    fontWeight: "600",
  },
  voucherButton: {
    marginTop: 12,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: "#10b981",
    alignItems: "center",
    justifyContent: "center",
  },
  voucherButtonDisabled: {
    backgroundColor: "#e5e7eb",
  },
  voucherButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  redeemButton: {
    marginTop: 12,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: "#f97316",
    alignItems: "center",
    justifyContent: "center",
  },
  redeemButtonDisabled: {
    backgroundColor: "#e5e7eb",
  },
  redeemButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 24,
    width: "85%",
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#333",
    textAlign: "center",
    marginBottom: 20,
  },
  modalBody: {
    gap: 16,
    width: "100%",
  },
  modalText: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
  },
  voucherCodeContainer: {
    backgroundColor: "#f3f4f6",
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#fbbf24",
    borderStyle: "dashed",
    alignItems: "center",
  },
  voucherCodeText: {
    fontSize: 24,
    fontFamily: "monospace",
    color: "#f97316",
    fontWeight: "600",
  },
  modalButtons: {
    flexDirection: "row",
    gap: 12,
    marginTop: 8,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 44,
  },
  modalButtonSingle: {
    width: "100%",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 44,
  },
  modalButtonCancel: {
    backgroundColor: "#e5e7eb",
  },
  modalButtonCancelText: {
    color: "#666",
    fontSize: 16,
    fontWeight: "600",
  },
  modalButtonConfirm: {
    backgroundColor: "#f97316",
  },
  modalButtonConfirmText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "600",
    textAlign: "center",
  },
});

export default VoucherScreen;
