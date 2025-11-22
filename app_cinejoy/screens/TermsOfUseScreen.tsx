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
import SideMenu from "@/components/SideMenu";

type RootStackParamList = {
  TermsOfUseScreen: undefined;
};

type TermsOfUseScreenNavigationProp = StackNavigationProp<
  RootStackParamList,
  "TermsOfUseScreen"
>;

const TermsOfUseScreen = () => {
  const navigation = useNavigation<TermsOfUseScreenNavigationProp>();
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
        <Text style={styles.headerTitle}>Điều Khoản Sử Dụng</Text>
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
        <Text style={styles.welcomeText}>
          Chào mừng Quý Khách Hàng đến với CÔNG TY TNHH CNJ CINEJOY VIỆT NAM
        </Text>

        <Text style={styles.paragraph}>
          Chúng tôi là CÔNG TY TNHH CNJ CINEJOY VIỆT NAM, địa chỉ trụ sở chính
          tại Lầu 2, số 7/28, đường Thành Thái, Phường 14, Quận 10, Thành phố Hồ
          Chí Minh, Việt Nam ("CNJ CineJoy Việt Nam"), đơn vị sở hữu và vận hành
          website cinejoy.vn và ứng dụng di động CineJoy Cinemas ("Ứng Dụng").
        </Text>

        <Text style={styles.paragraph}>
          Khi Quý Khách Hàng truy cập vào Ứng Dụng có nghĩa là Quý Khách Hàng
          đồng ý với các điều kiện và điều khoản này.
        </Text>

        <Text style={styles.paragraph}>
          CNJ CineJoy Việt Nam có quyền thay đổi, chỉnh sửa, thêm hoặc lược bỏ
          bất kỳ phần nào trong Điều Khoản Giao Dịch, vào bất cứ lúc nào. Các
          thay đổi có hiệu lực ngay khi được đăng trên Ứng Dụng mà không cần
          thông báo trước. Và khi Quý Khách Hàng tiếp tục sử dụng Ứng Dụng, sau
          khi các thay đổi về Điều Khoản Giao Dịch được đăng tải, có nghĩa là
          Quý Khách Hàng chấp nhận với những thay đổi đó. Quý khách Hàng vui
          lòng kiểm tra thường xuyên để cập nhật những thay đổi của CNJ CineJoy
          Việt Nam.
        </Text>

        <Text style={styles.importantText}>
          XIN VUI LÒNG ĐỌC KỸ TRƯỚC KHI QUYẾT ĐỊNH ĐẶT VÉ TRỰC TUYẾN.
        </Text>

        <Text style={styles.sectionTitle}>1. PHẠM VI ÁP DỤNG</Text>

        <Text style={styles.paragraph}>
          Điều kiện dưới đây áp dụng riêng cho chức năng giao dịch trực tuyến
          tại Ứng Dụng. Khi sử dụng chức năng giao dịch trực tuyến, Quý Khách
          Hàng phải tuân thủ các điều khoản và điều kiện được quy định tại đây.
        </Text>

        <Text style={styles.sectionTitle}>2. ĐĂNG KÝ TÀI KHOẢN</Text>

        <Text style={styles.paragraph}>
          Để sử dụng các dịch vụ đặt vé trực tuyến, Quý Khách Hàng cần đăng ký
          tài khoản trên Ứng Dụng. Quý Khách Hàng cam kết cung cấp thông tin
          chính xác, đầy đủ và cập nhật khi đăng ký tài khoản. CNJ CineJoy Việt
          Nam có quyền từ chối hoặc hủy bỏ tài khoản nếu phát hiện thông tin
          không chính xác hoặc vi phạm các quy định.
        </Text>

        <Text style={styles.sectionTitle}>3. ĐẶT VÉ VÀ THANH TOÁN</Text>

        <Text style={styles.paragraph}>
          Quý Khách Hàng có thể đặt vé trực tuyến thông qua Ứng Dụng. Việc đặt
          vé được xác nhận sau khi thanh toán thành công. CNJ CineJoy Việt Nam
          có quyền từ chối hoặc hủy đơn đặt vé nếu phát hiện có dấu hiệu gian
          lận hoặc vi phạm.
        </Text>

        <Text style={styles.sectionTitle}>4. QUYỀN VÀ TRÁCH NHIỆM</Text>

        <Text style={styles.paragraph}>
          Quý Khách Hàng có trách nhiệm bảo mật thông tin tài khoản và mật khẩu.
          Mọi hoạt động được thực hiện từ tài khoản của Quý Khách Hàng sẽ được
          coi là do Quý Khách Hàng thực hiện.
        </Text>

        <Text style={styles.sectionTitle}>5. BẢO MẬT THÔNG TIN</Text>

        <Text style={styles.paragraph}>
          CNJ CineJoy Việt Nam cam kết bảo mật thông tin cá nhân của Quý Khách
          Hàng theo quy định của pháp luật Việt Nam. Thông tin của Quý Khách
          Hàng sẽ được sử dụng để cung cấp dịch vụ và cải thiện trải nghiệm
          người dùng.
        </Text>
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
  },
  welcomeText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 12,
    lineHeight: 24,
  },
  paragraph: {
    fontSize: 14,
    color: "#374151",
    lineHeight: 22,
    marginBottom: 16,
    textAlign: "justify",
  },
  importantText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#B1060F",
    marginBottom: 20,
    marginTop: 8,
    lineHeight: 22,
    textAlign: "center",
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111827",
    marginTop: 8,
    marginBottom: 12,
  },
});

export default TermsOfUseScreen;
