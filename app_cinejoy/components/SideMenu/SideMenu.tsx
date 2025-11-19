import { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  Dimensions,
  ScrollView,
  Animated,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import Fontisto from "@expo/vector-icons/Fontisto";
import { useAppSelector, useAppDispatch } from "@/store/hooks";
import { logout } from "@/store/appSlice";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { logoutApi } from "services/api";
import logo from "assets/logoCNJ.png";
import maVach from "assets/maVach.png";

const { width } = Dimensions.get("window");

type RootStackParamList = {
  HomeScreen: undefined;
  RegisterScreen: undefined;
  LoginScreen: undefined;
  MovieDetailScreen: undefined;
  MemberScreen: undefined;
  BookingHistoryScreen: undefined;
};

type SideMenuNavigationProp = StackNavigationProp<RootStackParamList>;

interface SideMenuProps {
  visible: boolean;
  onClose: () => void;
}

const SideMenu = ({ visible, onClose }: SideMenuProps) => {
  const navigation = useNavigation<SideMenuNavigationProp>();
  const dispatch = useAppDispatch();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const sideMenuTranslateX = useRef(new Animated.Value(width)).current;

  // Lấy thông tin authentication từ Redux store
  const isAuthenticated = useAppSelector((state) => state.app.isAuthenticated);
  const user = useAppSelector((state) => state.app.user);

  // Side menu items data - Grid menu với icons
  const menuGridItems = [
    { id: 1, title: "Trang chủ", icon: "🏠" },
    { id: 2, title: "Thành viên CNJ", icon: "👤" },
    { id: 3, title: "Rạp", icon: "ℹ️" },
    { id: 4, title: "Rạp đặc biệt", icon: "⭐" },
    { id: 5, title: "Tin mới & Ưu đãi", icon: "🎁" },
    { id: 6, title: "Vé của tôi", icon: "🎟️" },
    { id: 7, title: "CNJ Store", icon: "🍿" },
    { id: 8, title: "CNJ eGift", icon: "🎁" },
    { id: 9, title: "Đổi ưu đãi", icon: "🎗️" },
  ];

  useEffect(() => {
    sideMenuTranslateX.setValue(width);
  }, []);

  useEffect(() => {
    if (visible) {
      Animated.timing(sideMenuTranslateX, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(sideMenuTranslateX, {
        toValue: width,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
  }, [visible]);

  // Hàm xử lý click vào menu item
  const handleMenuItemPress = (item: { id: number; title: string }) => {
    if (item.id === 1) {
      // Trang chủ
      onClose();
      navigation.navigate("HomeScreen");
    } else if (item.id === 2) {
      // Thành viên CNJ
      onClose();
      if (isAuthenticated) {
        navigation.navigate("MemberScreen");
      } else {
        navigation.navigate("LoginScreen");
      }
    } else if (item.id === 6) {
      onClose();
      if (isAuthenticated) {
        navigation.navigate("BookingHistoryScreen");
      } else {
        Alert.alert("Thông báo", "Vui lòng đăng nhập để xem vé của tôi.", [
          {
            text: "Huỷ",
            style: "cancel",
          },
          {
            text: "Đăng nhập",
            onPress: () => navigation.navigate("LoginScreen"),
          },
        ]);
      }
    }
    // Có thể thêm logic cho các menu items khác ở đây
  };

  // Hàm xử lý đăng xuất
  const handleLogout = async () => {
    Alert.alert("Xác nhận đăng xuất", "Bạn có chắc chắn muốn đăng xuất?", [
      {
        text: "Hủy",
        style: "cancel",
      },
      {
        text: "Đăng xuất",
        style: "destructive",
        onPress: async () => {
          try {
            setIsLoggingOut(true);
            // Gọi API logout
            await logoutApi();

            // Xóa token khỏi AsyncStorage
            await AsyncStorage.removeItem("accessToken");
            await AsyncStorage.removeItem("current_user_id");

            // Cập nhật Redux store
            dispatch(logout());

            // Đóng side menu
            onClose();

            // Redirect về HomeScreen
            navigation.navigate("HomeScreen");

            // Hiển thị thông báo thành công
            Alert.alert("Thành công", "Đăng xuất thành công!");
          } catch (error: any) {
            console.error("Logout error:", error);
            // Vẫn xóa token và đăng xuất local nếu API fail
            await AsyncStorage.removeItem("accessToken");
            await AsyncStorage.removeItem("current_user_id");
            dispatch(logout());
            onClose();

            // Redirect về HomeScreen
            navigation.navigate("HomeScreen");

            Alert.alert("Thông báo", "Đã đăng xuất khỏi thiết bị này.");
          } finally {
            setIsLoggingOut(false);
          }
        },
      },
    ]);
  };

  if (!visible) return null;

  return (
    <View style={styles.sideMenuOverlay}>
      <TouchableOpacity
        style={styles.sideMenuOverlayTouchable}
        activeOpacity={1}
        onPress={onClose}
      />
      <Animated.View
        style={[
          styles.sideMenuContainer,
          {
            transform: [{ translateX: sideMenuTranslateX }],
          },
        ]}
      >
        <ScrollView
          style={styles.sideMenuContent}
          contentContainerStyle={styles.sideMenuContentContainer}
          showsVerticalScrollIndicator={true}
        >
          {/* User Profile Section */}
          <View style={styles.menuProfileSection}>
            <View style={styles.menuProfileHeader}>
              <TouchableOpacity style={styles.menuHeaderIcon}>
                <Fontisto name="bell" size={26} color="#fff" />
                {!isAuthenticated && <View style={styles.menuBellBadge} />}
              </TouchableOpacity>
              <View style={styles.menuAvatarContainer}>
                {isAuthenticated && user?.avatar ? (
                  <Image
                    source={{ uri: user.avatar }}
                    style={styles.menuProfileAvatar}
                  />
                ) : (
                  <View style={styles.menuProfileAvatarPlaceholder}>
                    <Fontisto name="person" size={50} color="#666" />
                  </View>
                )}
              </View>
              <TouchableOpacity style={styles.menuHeaderIcon}>
                <Fontisto name="player-settings" size={26} color="#fff" />
              </TouchableOpacity>
            </View>
            {isAuthenticated ? (
              <>
                <View style={styles.menuNameRow}>
                  <Text style={styles.menuProfileName}>
                    {user?.fullName || "Người dùng"}
                  </Text>
                  <View style={styles.menuMemberBadge}>
                    <Text style={styles.menuMemberBadgeText}>MEMBER</Text>
                  </View>
                </View>
                <Text style={styles.menuProfileMember}>Thẻ thành viên</Text>
              </>
            ) : (
              <TouchableOpacity
                style={styles.menuLoginButton}
                onPress={() => {
                  onClose();
                  navigation.navigate("LoginScreen");
                }}
              >
                <Text style={styles.menuLoginButtonText}>
                  Đăng Nhập/Đăng Ký
                </Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Member Card with Barcode - chỉ hiển thị khi đã login */}
          {isAuthenticated && (
            <>
              <View style={styles.menuMemberCard}>
                <View style={styles.menuCardHeader}>
                  <View style={styles.menuCardU22Badge}>
                    <Text style={styles.menuCardU22Text}>U22</Text>
                  </View>
                  <Text style={styles.menuCardTitle}>ĐẶC QUYỀN</Text>
                  <TouchableOpacity>
                    <Text style={styles.menuCardArrow}>→</Text>
                  </TouchableOpacity>
                </View>
                <View style={styles.menuBarcodeContainer}>
                  <Image source={maVach} style={styles.menuBarcode} />
                  <Text style={styles.menuBarcodeNumber}>9992123603894608</Text>
                </View>
              </View>

              {/* Points Section - chỉ hiển thị khi đã login */}
              <View style={styles.menuPointsSection}>
                <View style={styles.menuPointItem}>
                  <Text style={styles.menuPointLabel}>Tổng chi tiêu 2025</Text>
                  <Text style={styles.menuPointValue}>341.636 ₫</Text>
                </View>
                <View style={styles.menuPointItem}>
                  <Text style={styles.menuPointLabel}>Điểm thưởng</Text>
                  <Text style={styles.menuPointValue}>{user?.point || 0}</Text>
                </View>
              </View>
            </>
          )}

          {/* Booking Buttons */}
          <TouchableOpacity style={styles.menuBookingButton}>
            <Text style={styles.menuBookingButtonText}>Đặt vé theo Phim</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.menuBookingButton}>
            <Text style={styles.menuBookingButtonText}>Đặt vé theo Rạp</Text>
          </TouchableOpacity>

          {/* Menu Grid */}
          <View style={styles.menuGrid}>
            {menuGridItems.map((item) => (
              <TouchableOpacity
                key={item.id}
                style={styles.menuGridItem}
                onPress={() => handleMenuItemPress(item)}
              >
                <View style={styles.menuGridIconContainer}>
                  <Text style={styles.menuGridIcon}>{item.icon}</Text>
                  {item.id === 8 && <View style={styles.menuGridBadge} />}
                </View>
                <Text style={styles.menuGridItemText}>{item.title}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Logout Button - chỉ hiển thị khi đã login */}
          {isAuthenticated && (
            <TouchableOpacity
              style={[
                styles.menuLogoutButton,
                isLoggingOut && styles.menuLogoutButtonDisabled,
              ]}
              onPress={handleLogout}
              disabled={isLoggingOut}
            >
              {isLoggingOut ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.menuLogoutButtonText}>Đăng xuất</Text>
              )}
            </TouchableOpacity>
          )}

          <View style={styles.menuFooter}>
            <Image source={logo} style={styles.menuFooterLogo} />
            <Text style={styles.menuFooterText}>CULTUREPLEX</Text>
          </View>
        </ScrollView>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  sideMenuOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 2000,
    flexDirection: "row",
  },
  sideMenuOverlayTouchable: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  sideMenuContainer: {
    width: width * 0.85,
    height: "100%",
    backgroundColor: "#1a1a1a",
    shadowColor: "#000",
    shadowOffset: { width: -2, height: 0 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 10,
  },
  sideMenuContent: {
    flex: 1,
  },
  sideMenuContentContainer: {
    paddingTop: 50,
    paddingBottom: 40,
    paddingHorizontal: 0,
  },
  // Profile Section
  menuProfileSection: {
    alignItems: "center",
    paddingTop: 20,
    paddingBottom: 10,
  },
  menuProfileHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
    marginBottom: 10,
    paddingHorizontal: 40,
  },
  menuHeaderIcon: {
    padding: 10,
    position: "relative",
  },
  menuBellBadge: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#E50914",
  },
  menuHeaderIconText: {
    fontSize: 24,
  },
  menuAvatarContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginHorizontal: 20,
    padding: 0,
    alignItems: "center",
    justifyContent: "center",
  },
  menuProfileAvatar: {
    width: 74,
    height: 74,
    borderRadius: 37,
    backgroundColor: "#fff",
    resizeMode: "cover",
  },
  menuProfileAvatarPlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#2a2a2a",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 0,
  },
  menuLoginButton: {
    marginTop: 10,
    paddingVertical: 8,
  },
  menuLoginButtonText: {
    color: "#E50914",
    fontSize: 14,
    fontWeight: "500",
    textAlign: "center",
  },
  menuNameRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  menuProfileName: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#fff",
    marginRight: 8,
  },
  menuMemberBadge: {
    backgroundColor: "#fff",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 3,
  },
  menuMemberBadgeText: {
    fontSize: 9,
    fontWeight: "bold",
    color: "#000",
  },
  menuProfileMember: {
    fontSize: 13,
    color: "#E50914",
  },
  // Member Card
  menuMemberCard: {
    backgroundColor: "#fff",
    marginHorizontal: 16,
    marginVertical: 10,
    borderRadius: 4,
    padding: 2,
    paddingHorizontal: 8,
  },
  menuCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  menuCardU22Badge: {
    backgroundColor: "#9C27B0",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    marginRight: 8,
  },
  menuCardU22Text: {
    fontSize: 11,
    fontWeight: "bold",
    color: "#fff",
  },
  menuCardLogo: {
    width: 40,
    height: 20,
    resizeMode: "contain",
    marginRight: 8,
  },
  menuCardTitle: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#000",
    flex: 1,
  },
  menuCardArrow: {
    fontSize: 35,
    color: "#000",
  },
  menuBarcodeContainer: {
    borderTopWidth: 1,
    borderColor: "#000",
    borderStyle: "solid",
    paddingVertical: 6,
    alignItems: "center",
  },
  menuBarcode: {
    width: width * 0.75,
    height: 50,
    resizeMode: "cover",
    marginBottom: 8,
  },
  menuBarcodeNumber: {
    fontSize: 12,
    color: "#666",
  },
  // Points Section
  menuPointsSection: {
    display: "flex",
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  menuPointItem: {
    alignItems: "flex-start",
    marginRight: 15,
  },
  menuPointLabel: {
    fontSize: 11,
    color: "#999",
    marginBottom: 4,
  },
  menuPointValue: {
    fontSize: 16,
    fontWeight: "600",
    color: "#fff",
  },
  // Booking Buttons
  menuBookingButton: {
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: "#333",
    borderStyle: "solid",
    backgroundColor: "transparent",
    marginHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: "center",
  },
  menuBookingButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "500",
  },
  // Menu Grid
  menuGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: 8,
    paddingTop: 16,
    paddingBottom: 10,
  },
  menuGridItem: {
    width: "33.33%",
    alignItems: "center",
    paddingVertical: 16,
  },
  menuGridIconContainer: {
    width: 50,
    height: 50,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
    position: "relative",
  },
  menuGridIcon: {
    fontSize: 24,
  },
  menuGridBadge: {
    position: "absolute",
    top: 5,
    right: 5,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#E50914",
  },
  menuGridItemText: {
    fontSize: 11,
    color: "#fff",
    textAlign: "center",
    paddingHorizontal: 4,
  },
  // Logout Button
  menuLogoutButton: {
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: "#333",
    borderStyle: "solid",
    backgroundColor: "transparent",
    marginHorizontal: 16,
    marginTop: 10,
    paddingVertical: 14,
    alignItems: "center",
  },
  menuLogoutButtonDisabled: {
    opacity: 0.6,
  },
  menuLogoutButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "500",
  },
  menuFooter: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
  },
  menuFooterLogo: {
    width: 100,
    height: 100,
    resizeMode: "contain",
    marginBottom: -20,
    tintColor: "#444",
  },
  menuFooterText: {
    color: "#333",
    fontSize: 12,
    fontWeight: "500",
  },
});

export default SideMenu;
