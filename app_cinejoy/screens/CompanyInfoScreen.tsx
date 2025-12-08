import { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  ScrollView,
  Platform,
  Image,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import Fontisto from "@expo/vector-icons/Fontisto";
import SideMenu from "@/components/SideMenu";

type RootStackParamList = {
  CompanyInfoScreen: undefined;
};

type CompanyInfoScreenNavigationProp = StackNavigationProp<
  RootStackParamList,
  "CompanyInfoScreen"
>;

const CompanyInfoScreen = () => {
  const navigation = useNavigation<CompanyInfoScreenNavigationProp>();
  const [showSideMenu, setShowSideMenu] = useState(false);

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
        <Text style={styles.headerTitle}>Thông Tin Công Ty</Text>
        <TouchableOpacity
          style={styles.headerButton}
          onPress={() => setShowSideMenu(true)}
        >
          <Text style={styles.menuIcon}>☰</Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.companyName}>CÔNG TY TNHH CNJ CINEJOY VIETNAM</Text>

        <Text style={styles.paragraph}>
          Giấy CNĐKDN: 0303675393, đăng ký lần đầu ngày 31/7/2008, đăng ký thay
          đổi lần thứ 5 ngày 14/10/2015, cấp bởi Sở KHĐT thành phố Hồ Chí Minh.
        </Text>

        <Text style={styles.paragraph}>
          Địa Chỉ: Lầu 2, số 7/28, đường Thành Thái, phường Diên Hồng, Thành phố
          Hồ Chí Minh, Việt Nam.
        </Text>

        <Text style={styles.paragraph}>Hotline: 1900 6017</Text>

        {/* Logo BCT */}
        <View style={styles.logoContainer}>
          <Image
            source={require("@/assets/logo_bct.png")}
            style={styles.logo}
            resizeMode="contain"
          />
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
    backgroundColor: "#fff",
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
    padding: 16,
    paddingBottom: 40,
  },
  mainTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 16,
    textAlign: "center",
  },
  companyName: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 16,
    textAlign: "center",
  },
  paragraph: {
    fontSize: 14,
    color: "#374151",
    lineHeight: 22,
    marginBottom: 16,
    textAlign: "justify",
  },
  logoContainer: {
    alignItems: "flex-start",
    justifyContent: "center",
    marginBottom: 20,
  },
  logo: {
    width: 200,
    height: 100,
  },
});

export default CompanyInfoScreen;
