import { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  Platform,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import Fontisto from "@expo/vector-icons/Fontisto";
import SideMenu from "@/components/SideMenu";

type RootStackParamList = {
  VersionInfoScreen: undefined;
};

type VersionInfoScreenNavigationProp = StackNavigationProp<
  RootStackParamList,
  "VersionInfoScreen"
>;

const VersionInfoScreen = () => {
  const navigation = useNavigation<VersionInfoScreenNavigationProp>();
  const [showSideMenu, setShowSideMenu] = useState(false);

  const APP_VERSION = "2.9.12";

  const getOSSupportText = () => {
    if (Platform.OS === "ios") {
      return "Hỗ trợ iOS 9.0 trở lên";
    } else {
      return "Hỗ trợ Android 5.0 trở lên";
    }
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
        <Text style={styles.headerTitle}>Thông tin Phiên bản</Text>
        <TouchableOpacity
          style={styles.headerButton}
          onPress={() => setShowSideMenu(true)}
        >
          <Text style={styles.menuIcon}>☰</Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      <View style={styles.content}>
        {/* Phiên bản hiện tại */}
        <View style={styles.versionRow}>
          <Text style={styles.versionLabel}>Phiên bản hiện tại</Text>
          <Text style={styles.versionValue}>{APP_VERSION}</Text>
        </View>

        {/* Đây là phiên bản mới nhất */}
        <Text style={styles.latestVersionText}>Đây là phiên bản mới nhất</Text>

        {/* Hỗ trợ hệ điều hành */}
        <Text style={styles.osSupportText}>{getOSSupportText()}</Text>
      </View>

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
  content: {
    flex: 1,
    paddingTop: 20,
  },
  versionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: "#fff",
    marginBottom: 20,
  },
  versionLabel: {
    fontSize: 15,
    color: "#374151",
    fontWeight: "400",
  },
  versionValue: {
    fontSize: 15,
    color: "#374151",
    fontWeight: "400",
  },
  latestVersionText: {
    marginTop: 10,
    fontSize: 15,
    backgroundColor: "#fff",
    padding: 16,
    borderRadius: 10,
    color: "#374151",
    fontWeight: "400",
    textAlign: "center",
    marginBottom: 20,
  },
  osSupportText: {
    marginTop: 10,
    fontSize: 15,
    color: "#374151",
    fontWeight: "400",
    textAlign: "center",
  },
});

export default VersionInfoScreen;
