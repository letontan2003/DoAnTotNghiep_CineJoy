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
  PaymentPolicyScreen: undefined;
};

type PaymentPolicyScreenNavigationProp = StackNavigationProp<
  RootStackParamList,
  "PaymentPolicyScreen"
>;

const PaymentPolicyScreen = () => {
  const navigation = useNavigation<PaymentPolicyScreenNavigationProp>();
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
        <Text style={styles.headerTitle}>Chính Sách Thanh Toán</Text>
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
        <Text style={styles.sectionTitle}>1. Quy định về thanh toán</Text>

        <Text style={styles.paragraph}>
          Khi đặt vé trên ứng dụng CineJoy, Quý Khách Hàng có thể lựa chọn các
          hình thức thanh toán sau:
        </Text>

        <View style={styles.bulletList}>
          <Text style={styles.bulletItem}>
            • Điểm thưởng thành viên (CNJ Points)
          </Text>
          <Text style={styles.bulletItem}>
            • Thẻ quà tặng CineJoy (CineJoy Gift card)
          </Text>
          <Text style={styles.bulletItem}>• Ticket Voucher</Text>
          <Text style={styles.bulletItem}>
            • Thẻ ATM (Thẻ ghi nợ / thanh toán / trả trước nội địa)
          </Text>
          <Text style={styles.bulletItem}>
            • Thẻ tín dụng, thẻ ghi nợ, thẻ trả trước quốc tế
          </Text>
        </View>

        <Text style={styles.sectionTitle}>
          2. Chi tiết các hình thức thanh toán
        </Text>

        <Text style={styles.subSectionTitle}>
          Điểm Thưởng Thành Viên (CNJ Points):
        </Text>

        <Text style={styles.paragraph}>
          • 1 điểm thưởng tương đương với 1,000 VND.
        </Text>

        <Text style={styles.paragraph}>
          • Điểm thưởng có thể được sử dụng để thanh toán vé xem phim và các sản
          phẩm đồ ăn, thức uống tại các rạp CineJoy trên toàn quốc.
        </Text>

        <Text style={styles.paragraph}>
          • Khi sử dụng điểm thưởng, Quý Khách Hàng cần xuất trình thẻ thành
          viên để nhân viên hỗ trợ.
        </Text>

        <Text style={styles.paragraph}>
          • Số điểm sử dụng phải từ 20 điểm trở lên.
        </Text>

        <Text style={styles.paragraph}>
          • Để kiểm tra điểm thưởng, bạn vui lòng truy cập mục lục bên phải,
          đăng nhập vào tài khoản của mình, chọn Thành Viên CineJoy và chọn Điểm
          thưởng.
        </Text>

        <Text style={styles.subSectionTitle}>
          Thẻ quà tặng CineJoy (CineJoy Gift Card):
        </Text>

        <Text style={styles.paragraph}>
          • Thẻ quà tặng có thể được sử dụng để mua vé xem phim, bắp rang, nước
          uống tại các rạp CineJoy trên toàn quốc.
        </Text>

        <Text style={styles.paragraph}>
          • Thẻ quà tặng có thể được sử dụng để thanh toán vé trực tuyến.
        </Text>

        <Text style={styles.paragraph}>
          • Quý Khách Hàng có thể mua thẻ quà tặng tại tất cả các cụm rạp.
        </Text>

        <Text style={styles.subSectionTitle}>Ticket Voucher:</Text>

        <Text style={styles.paragraph}>
          • Voucher có thể được sử dụng để đổi lấy vé xem phim tại các rạp
          CineJoy trên toàn quốc.
        </Text>

        <Text style={styles.paragraph}>
          • Mỗi voucher có giá trị và thời hạn sử dụng riêng, vui lòng kiểm tra
          thông tin trên voucher.
        </Text>

        <Text style={styles.subSectionTitle}>Thẻ ATM / Thẻ Tín Dụng:</Text>

        <Text style={styles.paragraph}>
          • Chấp nhận thanh toán bằng thẻ ATM nội địa, thẻ tín dụng và thẻ ghi
          nợ quốc tế.
        </Text>

        <Text style={styles.paragraph}>
          • Giao dịch được xử lý an toàn thông qua cổng thanh toán được mã hóa.
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
  mainTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 20,
    textAlign: "center",
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111827",
    marginTop: 8,
    marginBottom: 12,
  },
  subSectionTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: "#111827",
    marginTop: 12,
    marginBottom: 8,
  },
  paragraph: {
    fontSize: 14,
    color: "#374151",
    lineHeight: 22,
    marginBottom: 12,
    textAlign: "justify",
  },
  bulletList: {
    marginLeft: 8,
    marginBottom: 16,
  },
  bulletItem: {
    fontSize: 14,
    color: "#374151",
    lineHeight: 22,
    marginBottom: 8,
  },
});

export default PaymentPolicyScreen;
