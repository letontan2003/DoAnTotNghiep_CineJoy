import { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  StatusBar,
  ScrollView,
  Platform,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import Fontisto from "@expo/vector-icons/Fontisto";
import { useAppSelector } from "@/store/hooks";
import SideMenu from "@/components/SideMenu";

type RootStackParamList = {
  HomeScreen: undefined;
  LoginScreen: undefined;
  MemberScreen: undefined;
  BookingHistoryScreen: undefined;
  AccountInfoScreen: undefined;
  ChangePasswordScreen: undefined;
  MemberCardScreen: undefined;
};

type MemberScreenNavigationProp = StackNavigationProp<
  RootStackParamList,
  "MemberScreen"
>;

interface MenuItem {
  id: number;
  title: string;
  icon: string;
}

const MemberScreen = () => {
  const navigation = useNavigation<MemberScreenNavigationProp>();
  const isAuthenticated = useAppSelector((state) => state.app.isAuthenticated);
  const user = useAppSelector((state) => state.app.user);
  const [showSideMenu, setShowSideMenu] = useState(false);

  // Hàm mở/đóng side menu
  const toggleSideMenu = () => {
    setShowSideMenu(!showSideMenu);
  };

  const closeSideMenu = () => {
    setShowSideMenu(false);
  };

  const handleNavigateToBookingHistory = () => {
    navigation.navigate("BookingHistoryScreen");
  };

  const handleMenuItemPress = (itemId: number) => {
    if (itemId === 1) {
      navigation.navigate("AccountInfoScreen");
      return;
    }
    if (itemId === 2) {
      navigation.navigate("ChangePasswordScreen");
      return;
    }
    if (itemId === 3) {
      navigation.navigate("MemberCardScreen");
      return;
    }
    if (itemId === 5) {
      navigation.navigate("BookingHistoryScreen");
      return;
    }
  };

  // Menu Items
  const menuItems: MenuItem[] = [
    { id: 1, title: "Thông tin Tài khoản", icon: "person" },
    { id: 2, title: "Đổi mật khẩu", icon: "locked" },
    { id: 3, title: "Thẻ thành viên", icon: "star" },
    { id: 4, title: "Điểm", icon: "wallet" },
    { id: 5, title: "Lịch sử giao dịch", icon: "history" },
  ];

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      {/* Sticky Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Fontisto name="arrow-left" size={24} color="#E50914" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Thành viên CNJ</Text>
        <View style={styles.headerRight}>
          <TouchableOpacity
            style={styles.headerIcon}
            onPress={handleNavigateToBookingHistory}
          >
            <Fontisto name="ticket-alt" size={23} color="#E50914" />
          </TouchableOpacity>
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
        {/* Profile Section */}
        <View style={styles.profileSection}>
          <View style={styles.avatarWrapper}>
            <View style={styles.avatarContainer}>
              {isAuthenticated && user?.avatar ? (
                <Image source={{ uri: user.avatar }} style={styles.avatar} />
              ) : (
                <View style={styles.avatarPlaceholder}>
                  <Fontisto name="person" size={60} color="#fff" />
                </View>
              )}
            </View>
            <TouchableOpacity style={styles.cameraIcon}>
              <Fontisto name="camera" size={16} color="#666" />
            </TouchableOpacity>
          </View>

          {isAuthenticated ? (
            <View style={styles.nameRow}>
              <Text style={styles.userName}>
                {user?.fullName || "Người dùng"}
              </Text>
            </View>
          ) : (
            <TouchableOpacity
              style={styles.loginButton}
              onPress={() => navigation.navigate("LoginScreen")}
            >
              <Text style={styles.loginButtonText}>Đăng Nhập/Đăng Ký</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Menu Items List */}
        <View style={styles.menuList}>
          {menuItems.map((item, index) => (
            <View key={item.id}>
              <TouchableOpacity
                style={styles.menuItem}
                onPress={() => handleMenuItemPress(item.id)}
              >
                <View style={styles.menuItemLeft}>
                  <View style={styles.menuIconContainer}>
                    <Fontisto
                      name={item.icon as any}
                      size={24}
                      color="#E50914"
                    />
                  </View>
                  <Text style={styles.menuItemText}>{item.title}</Text>
                </View>
                <Fontisto name="angle-right" size={20} color="#999" />
              </TouchableOpacity>
              {index < menuItems.length - 1 && (
                <View style={styles.menuSeparator} />
              )}
            </View>
          ))}
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
    marginLeft: 40,
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
  profileSection: {
    alignItems: "center",
    paddingTop: 35,
    paddingBottom: 20,
    backgroundColor: "#fff",
  },
  avatarWrapper: {
    position: "relative",
    marginBottom: 16,
  },
  avatarContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "#8B0000",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
    resizeMode: "cover",
  },
  avatarPlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 60,
    alignItems: "center",
    justifyContent: "center",
  },
  cameraIcon: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#f0f0f0",
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  userName: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#333",
  },
  memberBadge: {
    width: 70,
    height: 30,
    borderWidth: 1,
    borderColor: "#000",
    alignItems: "center",
    justifyContent: "center",
    transform: [{ rotate: "0deg" }],
    backgroundColor: "#fff",
  },
  memberBadgeText: {
    color: "#000",
    fontSize: 11,
    fontWeight: "bold",
    letterSpacing: 0.5,
  },
  loginButton: {
    marginTop: 10,
    paddingVertical: 8,
  },
  loginButtonText: {
    color: "#E50914",
    fontSize: 16,
    fontWeight: "500",
  },
  menuList: {
    backgroundColor: "#fff",
    marginTop: 10,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: "#fff",
  },
  menuItemLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  menuIconContainer: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 16,
  },
  menuItemText: {
    fontSize: 16,
    color: "#333",
    flex: 1,
  },
  menuSeparator: {
    height: 1,
    backgroundColor: "#f0f0f0",
    marginLeft: 72,
  },
});

export default MemberScreen;
