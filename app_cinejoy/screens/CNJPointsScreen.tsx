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
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import Fontisto from "@expo/vector-icons/Fontisto";
import { useState, useEffect } from "react";
import { useAppSelector, useAppDispatch } from "@/store/hooks";
import dayjs from "dayjs";
import { LinearGradient } from "expo-linear-gradient";
import SideMenu from "@/components/SideMenu";
import { setUser } from "@/store/appSlice";
import AsyncStorage from "@react-native-async-storage/async-storage";

type RootStackParamList = {
  CNJPointsScreen: undefined;
  MemberScreen: undefined;
};

type CNJPointsScreenNavigationProp = StackNavigationProp<
  RootStackParamList,
  "CNJPointsScreen"
>;

interface BirthdayInfo {
  birthdayDate: string;
  nextBirthday: string;
  daysUntilBirthday: number;
  isToday: boolean;
}

const CNJPointsScreen = () => {
  const navigation = useNavigation<CNJPointsScreenNavigationProp>();
  const dispatch = useAppDispatch();
  const user = useAppSelector((state) => state.app.user);
  const isAuthenticated = useAppSelector((state) => state.app.isAuthenticated);
  const [showSideMenu, setShowSideMenu] = useState(false);
  const [birthdayInfo, setBirthdayInfo] = useState<BirthdayInfo | null>(null);
  const [isCheckingBirthday, setIsCheckingBirthday] = useState(false);
  const [hasReceivedBirthdayPoints, setHasReceivedBirthdayPoints] =
    useState(false);

  const toggleSideMenu = () => {
    setShowSideMenu(!showSideMenu);
  };

  const closeSideMenu = () => {
    setShowSideMenu(false);
  };

  // Hàm lấy thông tin sinh nhật
  const getBirthdayInfo = (dateOfBirth: string): BirthdayInfo => {
    const today = dayjs();
    const birthDate = dayjs(dateOfBirth);
    const thisYearBirthday = birthDate.year(today.year());
    const nextBirthday =
      thisYearBirthday.isBefore(today) || thisYearBirthday.isSame(today, "day")
        ? thisYearBirthday.add(1, "year")
        : thisYearBirthday;

    const isToday = thisYearBirthday.isSame(today, "day");
    const daysUntil = nextBirthday.diff(today, "day");

    return {
      birthdayDate: birthDate.format("DD/MM/YYYY"),
      nextBirthday: nextBirthday.format("DD/MM/YYYY"),
      daysUntilBirthday: daysUntil,
      isToday,
    };
  };

  // Kiểm tra sinh nhật khi component mount
  useEffect(() => {
    if (user?.dateOfBirth) {
      const info = getBirthdayInfo(user.dateOfBirth);
      setBirthdayInfo(info);

      // Kiểm tra xem đã nhận điểm sinh nhật hôm nay chưa
      const today = new Date().toISOString().split("T")[0];
      AsyncStorage.getItem(`birthday_points_${user._id}_${today}`).then(
        (value) => {
          setHasReceivedBirthdayPoints(!!value);
        }
      );
    }
  }, [user?.dateOfBirth, user?._id]);

  // Hàm xử lý cộng điểm sinh nhật
  const handleBirthdayPointsClick = async () => {
    if (!user?._id || !user?.dateOfBirth) {
      Alert.alert("Lỗi", "Không thể xác định thông tin user!");
      return;
    }

    setIsCheckingBirthday(true);
    try {
      // Kiểm tra xem đã nhận điểm hôm nay chưa
      const today = new Date().toISOString().split("T")[0];
      const hasReceivedToday = await AsyncStorage.getItem(
        `birthday_points_${user._id}_${today}`
      );

      if (hasReceivedToday) {
        Alert.alert("Thông báo", "Bạn đã nhận điểm sinh nhật hôm nay rồi!");
        setIsCheckingBirthday(false);
        return;
      }

      // Cộng điểm
      const pointsAdded = 100;
      const newPoints = (user.point || 0) + pointsAdded;

      // Lưu vào AsyncStorage
      await AsyncStorage.setItem(
        `birthday_points_${user._id}_${today}`,
        "true"
      );

      // Cập nhật user trong store
      dispatch(
        setUser({
          ...user,
          point: newPoints,
        })
      );

      setHasReceivedBirthdayPoints(true);
      Alert.alert(
        "Thành công",
        `Bạn đã nhận ${pointsAdded} điểm CNJ sinh nhật!`
      );
    } catch (error) {
      console.error("Error handling birthday points:", error);
      Alert.alert("Lỗi", "Có lỗi xảy ra khi xử lý điểm sinh nhật!");
    } finally {
      setIsCheckingBirthday(false);
    }
  };

  // Các cách thức nhận điểm
  const earningMethods = [
    {
      icon: "person",
      title: "Tạo tài khoản / Xác thực",
      points: "+50 điểm",
      description:
        "Nhận ngay 50 điểm khi tạo tài khoản mới hoặc xác thực tài khoản",
      color: "#1890ff",
    },
    {
      icon: "shopping-bag",
      title: "Mua vé hoặc combo",
      points: "+5 điểm/sản phẩm",
      description: "Tích lũy 5 điểm cho mỗi vé xem phim hoặc combo thức ăn",
      color: "#52c41a",
    },
    {
      icon: "calendar",
      title: "Sự kiện sinh nhật",
      points: "+100 điểm",
      description: "Nhận 100 điểm đặc biệt trong ngày sinh nhật của bạn",
      color: "#fa8c16",
    },
  ];

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
          <Text style={styles.headerTitle}>Điểm CNJ</Text>
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
        <Text style={styles.headerTitle}>Điểm CNJ</Text>
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
        {/* Header với điểm hiện có */}
        <View style={styles.headerSection}>
          <Text style={styles.mainTitle}>Điểm CNJ của tôi</Text>
          <LinearGradient
            colors={["#3b82f6", "#8b5cf6"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.pointsBadge}
          >
            <Fontisto name="star" size={20} color="#fff" />
            <Text style={styles.pointsBadgeText}>
              Điểm hiện có:{" "}
              <Text style={styles.pointsValue}>
                {(user?.point ?? 0).toLocaleString("vi-VN")} điểm
              </Text>
            </Text>
          </LinearGradient>
        </View>

        {/* Thông tin sinh nhật */}
        {birthdayInfo && (
          <View style={styles.birthdayCard}>
            <View style={styles.birthdayHeader}>
              <Fontisto name="calendar" size={24} color="#ec4899" />
              <Text style={styles.birthdayTitle}>
                {birthdayInfo.isToday
                  ? "🎉 Hôm nay là sinh nhật của bạn!"
                  : birthdayInfo.daysUntilBirthday === 1
                  ? "🎂 Ngày mai là sinh nhật!"
                  : "Thông tin sinh nhật"}
              </Text>
            </View>

            <Text style={styles.birthdayText}>
              {birthdayInfo.isToday
                ? hasReceivedBirthdayPoints
                  ? "🎉 Bạn đã nhận thành công 100 điểm CNJ sinh nhật!"
                  : "Chúc mừng sinh nhật! Bạn có thể nhận 100 điểm CNJ đặc biệt!"
                : birthdayInfo.daysUntilBirthday === 1
                ? "🎂 Ngày mai là sinh nhật của bạn! Chuẩn bị nhận 100 điểm CNJ đặc biệt nhé!"
                : `Sinh nhật của bạn: ${birthdayInfo.birthdayDate} (còn ${birthdayInfo.daysUntilBirthday} ngày)`}
            </Text>

            {birthdayInfo.isToday && (
              <TouchableOpacity
                style={[
                  styles.birthdayButton,
                  hasReceivedBirthdayPoints && styles.birthdayButtonDisabled,
                ]}
                onPress={handleBirthdayPointsClick}
                disabled={hasReceivedBirthdayPoints || isCheckingBirthday}
              >
                {isCheckingBirthday ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.birthdayButtonText}>
                    {hasReceivedBirthdayPoints
                      ? "✓ Đã nhận thành công!"
                      : "Nhận 100 điểm sinh nhật! 🎂"}
                  </Text>
                )}
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Danh sách cách thức nhận điểm */}
        <View style={styles.methodsContainer}>
          {earningMethods.map((method, index) => (
            <View key={index} style={styles.methodCard}>
              <View
                style={[
                  styles.methodIconContainer,
                  { backgroundColor: `${method.color}20` },
                ]}
              >
                <Fontisto
                  name={method.icon as any}
                  size={32}
                  color={method.color}
                />
              </View>
              <Text style={styles.methodTitle}>{method.title}</Text>
              <Text style={[styles.methodPoints, { color: method.color }]}>
                {method.points}
              </Text>
              <Text style={styles.methodDescription}>{method.description}</Text>
            </View>
          ))}
        </View>

        {/* Thông tin đổi điểm lấy voucher */}
        <View style={styles.voucherCard}>
          <View style={styles.voucherHeader}>
            <Text style={styles.voucherIcon}>🎁</Text>
            <Text style={styles.voucherTitle}>Đổi điểm lấy voucher</Text>
          </View>
          <Text style={styles.voucherText}>
            Sử dụng điểm CNJ để đổi lấy các voucher giảm giá hấp dẫn tại trang
            Voucher
          </Text>
          <Text style={styles.voucherTip}>
            💡 Mẹo: Tích lũy điểm thường xuyên để không bỏ lỡ các ưu đãi đặc
            biệt!
          </Text>
        </View>
      </ScrollView>

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
  headerSection: {
    alignItems: "center",
    marginTop: 40,
    marginBottom: 24,
  },
  mainTitle: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#a05a1c",
    marginBottom: 16,
  },
  pointsBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 25,
    borderWidth: 1,
    borderColor: "#60a5fa",
    gap: 12,
  },
  pointsBadgeText: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#fff",
  },
  pointsValue: {
    fontSize: 20,
  },
  birthdayCard: {
    padding: 20,
    borderRadius: 12,
    backgroundColor: "#fdf2f8",
    borderWidth: 1,
    borderColor: "#f9a8d4",
    marginBottom: 24,
    alignItems: "center",
  },
  birthdayHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 12,
  },
  birthdayTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#be185d",
  },
  birthdayText: {
    fontSize: 16,
    color: "#9d174d",
    textAlign: "center",
    marginBottom: 16,
  },
  birthdayButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: "#ff6b6b",
    minWidth: 200,
    alignItems: "center",
    justifyContent: "center",
  },
  birthdayButtonDisabled: {
    backgroundColor: "#10b981",
    opacity: 0.8,
  },
  birthdayButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  methodsContainer: {
    gap: 16,
    marginBottom: 24,
  },
  methodCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  methodIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  methodTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1f2937",
    marginBottom: 8,
    textAlign: "center",
  },
  methodPoints: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 12,
  },
  methodDescription: {
    fontSize: 14,
    color: "#6b7280",
    textAlign: "center",
    lineHeight: 20,
  },
  voucherCard: {
    padding: 20,
    borderRadius: 12,
    backgroundColor: "#fef3c7",
    borderWidth: 1,
    borderColor: "#fbbf24",
    alignItems: "center",
  },
  voucherHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 12,
  },
  voucherIcon: {
    fontSize: 24,
  },
  voucherTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#92400e",
  },
  voucherText: {
    fontSize: 16,
    color: "#78350f",
    textAlign: "center",
    marginBottom: 12,
  },
  voucherTip: {
    fontSize: 14,
    color: "#a16207",
    textAlign: "center",
  },
});

export default CNJPointsScreen;
