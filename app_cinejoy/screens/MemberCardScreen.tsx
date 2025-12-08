import {
  View,
  Text,
  StyleSheet,
  Image,
  ScrollView,
  StatusBar,
  Platform,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import Fontisto from "@expo/vector-icons/Fontisto";
import { TouchableOpacity } from "react-native";
import { useAppSelector } from "@/store/hooks";
import dayjs from "dayjs";
import { LinearGradient } from "expo-linear-gradient";
import { useState } from "react";
import SideMenu from "@/components/SideMenu";

type RootStackParamList = {
  MemberCardScreen: undefined;
  MemberScreen: undefined;
};

type MemberCardScreenNavigationProp = StackNavigationProp<
  RootStackParamList,
  "MemberCardScreen"
>;

const MemberCardScreen = () => {
  const navigation = useNavigation<MemberCardScreenNavigationProp>();
  const user = useAppSelector((state) => state.app.user);
  const isAuthenticated = useAppSelector((state) => state.app.isAuthenticated);
  const [showSideMenu, setShowSideMenu] = useState(false);

  const toggleSideMenu = () => {
    setShowSideMenu(!showSideMenu);
  };

  const closeSideMenu = () => {
    setShowSideMenu(false);
  };

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
          <Text style={styles.headerTitle}>Thẻ thành viên</Text>
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
            Vui lòng đăng nhập để xem thẻ thành viên.
          </Text>
        </View>
      </View>
    );
  }

  const expirationDate = dayjs(user.createdAt)
    .add(1, "year")
    .format("DD/MM/YYYY");

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
        <Text style={styles.headerTitle}>Thẻ thành viên</Text>
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
        <View style={styles.cardContainer}>
          {/* Card Wrapper */}
          <View style={styles.cardWrapper}>
            {/* Card Image Container */}
            <View style={styles.cardImageContainer}>
              <Image
                source={require("@/assets/member.card.png")}
                style={styles.cardImage}
                resizeMode="cover"
              />

              {/* VIP Badge */}
              <LinearGradient
                colors={["#FFD700", "#FFB300"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.vipBadge}
              >
                <Text style={styles.vipBadgeText}>THẺ VIP</Text>
              </LinearGradient>
            </View>

            {/* Card Content Section */}
            <View style={styles.cardContentSection}>
              <Text style={styles.cardTitle}>
                {user.fullName || "Thành viên CineJoy"}
              </Text>

              <View style={styles.cardInfoContainer}>
                <View style={styles.cardInfoRow}>
                  <Text style={styles.cardInfoLabel}>Email:</Text>
                  <Text style={styles.cardInfoValue}>{user.email}</Text>
                </View>

                <View style={styles.cardInfoRow}>
                  <Text style={styles.cardInfoLabel}>Điểm tích lũy:</Text>
                  <Text style={styles.cardInfoValuePoint}>
                    {user.point || 0}
                  </Text>
                </View>

                <View style={styles.cardInfoRow}>
                  <Text style={styles.cardInfoLabel}>Ngày hết hạn:</Text>
                  <Text style={styles.cardInfoValue}>{expirationDate}</Text>
                </View>
              </View>

              {/* QR Code */}
              <View style={styles.qrCodeContainer}>
                <Image
                  source={require("@/assets/QRCodepng.png")}
                  style={styles.qrCode}
                  resizeMode="contain"
                />
              </View>
            </View>
          </View>

          {/* Footer Note */}
          <Text style={styles.footerNote}>
            * Thẻ thành viên CineJoy mang lại nhiều ưu đãi hấp dẫn cho bạn!
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
    alignItems: "center",
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
  cardContainer: {
    width: "100%",
    maxWidth: 400,
    paddingHorizontal: 16,
    marginTop: 40,
    alignItems: "center",
  },
  cardWrapper: {
    width: "100%",
    borderRadius: 12,
    overflow: "hidden",
    backgroundColor: "#fff",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  cardImageContainer: {
    width: "100%",
    position: "relative",
    height: 155,
  },
  cardImage: {
    width: "100%",
    height: "100%",
  },
  vipBadge: {
    position: "absolute",
    top: 17,
    right: 16,
    zIndex: 2,
    paddingHorizontal: 16,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: "#fff",
    shadowColor: "#FFD700",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.33,
    shadowRadius: 4,
    elevation: 5,
  },
  vipBadgeText: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "bold",
    letterSpacing: 1,
    textShadowColor: "rgba(191, 161, 0, 0.6)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  qrCodeContainer: {
    alignSelf: "flex-end",
    marginTop: -55,
    width: 56,
    height: 56,
    borderRadius: 8,
    backgroundColor: "#fff",
    padding: 4,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  qrCode: {
    width: "100%",
    height: "100%",
  },
  cardContentSection: {
    padding: 16,
    paddingBottom: 22,
    backgroundColor: "#fff",
    borderTopWidth: 0,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 3,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1f2937",
    marginBottom: 12,
  },
  cardInfoContainer: {
    gap: 8,
  },
  cardInfoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  cardInfoLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#374151",
  },
  cardInfoValue: {
    fontSize: 14,
    color: "#6b7280",
    flex: 1,
  },
  cardInfoValuePoint: {
    fontSize: 14,
    color: "#f97316",
    fontWeight: "bold",
  },
  footerNote: {
    marginTop: 24,
    fontSize: 12,
    color: "#9ca3af",
    fontStyle: "italic",
    textAlign: "center",
  },
});

export default MemberCardScreen;
