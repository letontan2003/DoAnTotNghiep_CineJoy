import { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  ScrollView,
  Platform,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import Fontisto from "@expo/vector-icons/Fontisto";
import { useAppSelector, useAppDispatch } from "@/store/hooks";
import { setChatbotEnabled } from "@/store/appSlice";
import SideMenu from "@/components/SideMenu";
import { Switch } from "react-native";

type RootStackParamList = {
  SettingsScreen: undefined;
  MemberScreen: undefined;
  AccountInfoScreen: undefined;
  VersionInfoScreen: undefined;
  TermsOfUseScreen: undefined;
  PaymentPolicyScreen: undefined;
  CompanyInfoScreen: undefined;
  LoginScreen: undefined;
};

type SettingsScreenNavigationProp = StackNavigationProp<
  RootStackParamList,
  "SettingsScreen"
>;

const SettingsScreen = () => {
  const navigation = useNavigation<SettingsScreenNavigationProp>();
  const dispatch = useAppDispatch();
  const user = useAppSelector((state) => state.app.user);
  const isAuthenticated = useAppSelector((state) => state.app.isAuthenticated);
  const chatbotEnabled = useAppSelector((state) => state.app.chatbotEnabled);
  const [showSideMenu, setShowSideMenu] = useState(false);

  const APP_VERSION = "2.9.12";

  const handleAccountPress = () => {
    if (isAuthenticated) {
      navigation.navigate("AccountInfoScreen");
    } else {
      navigation.navigate("LoginScreen");
    }
  };

  const handleVersionPress = () => {
    navigation.navigate("VersionInfoScreen");
  };

  const handleTermsOfUsePress = () => {
    navigation.navigate("TermsOfUseScreen");
  };

  const handlePaymentPolicyPress = () => {
    navigation.navigate("PaymentPolicyScreen");
  };

  const handleCompanyInfoPress = () => {
    navigation.navigate("CompanyInfoScreen");
  };

  const handleChatbotToggle = (value: boolean) => {
    dispatch(setChatbotEnabled(value));
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.headerButton}
          onPress={() => navigation.goBack()}
        >
          <Fontisto name="arrow-left" size={22} color="#B1060F" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Cài đặt</Text>
        <TouchableOpacity
          style={styles.headerButton}
          onPress={() => setShowSideMenu(true)}
        >
          <Text style={styles.menuIcon}>☰</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Tài khoản Section */}
        <View style={styles.section}>
          <TouchableOpacity
            style={styles.accountItem}
            onPress={handleAccountPress}
          >
            <Text style={styles.accountLabel}>Tài khoản</Text>
            <View style={styles.accountRight}>
              <Text style={styles.accountName}>
                {isAuthenticated && user?.fullName
                  ? user.fullName
                  : "Chưa đăng nhập"}
              </Text>
              <Fontisto name="angle-right" size={18} color="#999" />
            </View>
          </TouchableOpacity>
        </View>

        {/* CNJ Hỗ trợ Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>CNJ HỖ TRỢ</Text>
          <View style={styles.menuItem}>
            <Text style={styles.menuItemText}>CNJ hỗ trợ</Text>
            <Switch
              value={chatbotEnabled}
              onValueChange={handleChatbotToggle}
              trackColor={{ false: "#d1d5db", true: "#f97316" }}
              thumbColor={chatbotEnabled ? "#fff" : "#f3f4f6"}
            />
          </View>
        </View>

        {/* KHÁC... Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>KHÁC...</Text>

          {/* Phiên bản */}
          <TouchableOpacity
            style={styles.menuItem}
            onPress={handleVersionPress}
          >
            <Text style={styles.menuItemText}>Phiên bản</Text>
            <View style={styles.menuItemRight}>
              <Text style={styles.versionText}>{APP_VERSION}</Text>
              <Fontisto name="angle-right" size={18} color="#999" />
            </View>
          </TouchableOpacity>

          {/* Điều Khoản Sử Dụng */}
          <TouchableOpacity
            style={styles.menuItem}
            onPress={handleTermsOfUsePress}
          >
            <Text style={styles.menuItemText}>Điều Khoản Sử Dụng</Text>
            <Fontisto name="angle-right" size={18} color="#999" />
          </TouchableOpacity>

          {/* Chính Sách Thanh Toán */}
          <TouchableOpacity
            style={styles.menuItem}
            onPress={handlePaymentPolicyPress}
          >
            <Text style={styles.menuItemText}>Chính Sách Thanh Toán</Text>
            <Fontisto name="angle-right" size={18} color="#999" />
          </TouchableOpacity>

          {/* Thông tin Công Ty */}
          <TouchableOpacity
            style={styles.menuItem}
            onPress={handleCompanyInfoPress}
          >
            <Text style={styles.menuItemText}>Thông tin Công Ty</Text>
            <Fontisto name="angle-right" size={18} color="#999" />
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Side Menu */}
      <SideMenu visible={showSideMenu} onClose={() => setShowSideMenu(false)} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#faf3e0",
  },
  header: {
    paddingTop:
      Platform.OS === "android" ? (StatusBar.currentHeight || 0) + 12 : 30,
    paddingBottom: 12,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  headerButton: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
  },
  menuIcon: {
    fontSize: 28,
    color: "#B1060F",
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: 20,
    paddingBottom: 20,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#9a7b4f",
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: "#f5f5f5",
    letterSpacing: 0.5,
  },
  accountItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
  },
  accountLabel: {
    fontSize: 15,
    color: "#111827",
    fontWeight: "500",
  },
  accountRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  accountName: {
    fontSize: 15,
    color: "#6b7280",
    fontWeight: "400",
  },
  menuItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
  },
  menuItemText: {
    fontSize: 15,
    color: "#111827",
    fontWeight: "400",
  },
  menuItemRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  versionText: {
    fontSize: 15,
    color: "#6b7280",
    fontWeight: "400",
  },
});

export default SettingsScreen;
