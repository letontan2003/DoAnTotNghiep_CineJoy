import { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  TextInput,
  ScrollView,
  Alert,
  ActivityIndicator,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import Fontisto from "@expo/vector-icons/Fontisto";
import Feather from "@expo/vector-icons/Feather";

import SideMenu from "@/components/SideMenu";
import { changePasswordApi } from "@/services/api";
import { useAppSelector } from "@/store/hooks";

type RootStackParamList = {
  MemberScreen: undefined;
  ChangePasswordScreen: undefined;
};

type ChangePasswordNavProp = StackNavigationProp<
  RootStackParamList,
  "ChangePasswordScreen"
>;

const passwordRegex =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;

const ChangePasswordScreen = () => {
  const navigation = useNavigation<ChangePasswordNavProp>();
  const isAuthenticated = useAppSelector((state) => state.app.isAuthenticated);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showSideMenu, setShowSideMenu] = useState(false);

  const handleChangePassword = async () => {
    if (!isAuthenticated) {
      Alert.alert("Thông báo", "Vui lòng đăng nhập để đổi mật khẩu.");
      return;
    }
    if (!currentPassword.trim()) {
      Alert.alert("Lỗi", "Vui lòng nhập mật khẩu hiện tại");
      return;
    }
    if (!newPassword.trim()) {
      Alert.alert("Lỗi", "Vui lòng nhập mật khẩu mới");
      return;
    }
    if (currentPassword.trim() === newPassword.trim()) {
      Alert.alert("Lỗi", "Mật khẩu mới không được trùng với mật khẩu hiện tại");
      return;
    }
    if (!passwordRegex.test(newPassword)) {
      Alert.alert(
        "Lỗi",
        "Mật khẩu mới phải chứa ít nhất 8 ký tự, bao gồm chữ hoa, chữ thường, số và ký tự đặc biệt"
      );
      return;
    }
    if (!confirmPassword.trim()) {
      Alert.alert("Lỗi", "Vui lòng nhập lại mật khẩu mới");
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert("Lỗi", "Mật khẩu xác nhận không khớp");
      return;
    }

    try {
      setLoading(true);
      const response = await changePasswordApi({
        currentPassword: currentPassword.trim(),
        newPassword: newPassword.trim(),
      });

      if (response.status) {
        Alert.alert(
          "Thành công",
          response.message || "Đổi mật khẩu thành công",
          [
            {
              text: "OK",
              onPress: () => navigation.goBack(),
            },
          ]
        );
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
      } else {
        Alert.alert("Lỗi", response.message || "Đổi mật khẩu thất bại");
      }
    } catch (error) {
      console.error("change password error:", error);
      Alert.alert("Lỗi", "Có lỗi xảy ra. Vui lòng thử lại.");
    } finally {
      setLoading(false);
    }
  };

  const renderPasswordField = (
    label: string,
    value: string,
    onChange: (text: string) => void,
    isVisible: boolean,
    onToggle: () => void,
    placeholder: string
  ) => (
    <View style={styles.inputWrapper}>
      <Text style={styles.inputLabel}>{label}</Text>
      <View style={styles.inputFieldContainer}>
        <TextInput
          style={styles.input}
          placeholder={placeholder}
          placeholderTextColor="#9ca3af"
          secureTextEntry={!isVisible}
          value={value}
          onChangeText={onChange}
        />
        <TouchableOpacity onPress={onToggle} style={styles.eyeIcon}>
          <Feather
            name={isVisible ? "eye" : "eye-off"}
            size={18}
            color="#6b7280"
          />
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.headerButton}
          onPress={() => navigation.goBack()}
        >
          <Fontisto name="arrow-left" size={22} color="#B1060F" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Đổi mật khẩu</Text>
        <TouchableOpacity
          style={styles.headerButton}
          onPress={() => setShowSideMenu(true)}
        >
          <Text style={styles.menuIcon}>☰</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.sectionTitle}>MẬT KHẨU ĐĂNG NHẬP</Text>

        <View style={styles.card}>
          {renderPasswordField(
            "Mật khẩu hiện tại",
            currentPassword,
            setCurrentPassword,
            showCurrent,
            () => setShowCurrent((prev) => !prev),
            "Nhập mật khẩu hiện tại"
          )}
          <View style={styles.divider} />
          {renderPasswordField(
            "Mật khẩu mới",
            newPassword,
            setNewPassword,
            showNew,
            () => setShowNew((prev) => !prev),
            "Nhập mật khẩu mới"
          )}
          <View style={styles.divider} />
          {renderPasswordField(
            "Nhập lại mật khẩu mới",
            confirmPassword,
            setConfirmPassword,
            showConfirm,
            () => setShowConfirm((prev) => !prev),
            "Nhập lại mật khẩu mới"
          )}
        </View>

        <Text style={styles.helperText}>
          • Mật khẩu phải có tối thiểu 8 ký tự{"\n"}• Gồm chữ hoa, chữ thường,
          số và ký tự đặc biệt{"\n"}• Không trùng với mật khẩu hiện tại
        </Text>

        <TouchableOpacity
          style={[styles.submitButton, loading && { opacity: 0.7 }]}
          onPress={handleChangePassword}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.submitButtonText}>Đổi mật khẩu</Text>
          )}
        </TouchableOpacity>
      </ScrollView>

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
    paddingTop: 32,
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
    fontSize: 26,
    color: "#B1060F",
  },
  content: {
    padding: 16,
    flexGrow: 1,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#9a7b4f",
    marginBottom: 10,
    letterSpacing: 0.5,
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  inputWrapper: {
    paddingVertical: 8,
  },
  inputFieldContainer: {
    position: "relative",
    justifyContent: "center",
  },
  inputRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  inputLabel: {
    fontSize: 14,
    color: "#6b7280",
    fontWeight: "600",
    marginBottom: 6,
  },
  eyeIcon: {
    position: "absolute",
    right: 0,
    padding: 4,
  },
  input: {
    fontSize: 15,
    color: "#111827",
    paddingVertical: 8,
    paddingRight: 30,
  },
  divider: {
    height: 1,
    backgroundColor: "#f3f4f6",
  },
  helperText: {
    fontSize: 13,
    color: "#6b7280",
    marginTop: 16,
    lineHeight: 20,
  },
  submitButton: {
    marginTop: 28,
    backgroundColor: "#b91c1c",
    borderRadius: 999,
    paddingVertical: 14,
    alignItems: "center",
  },
  submitButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: 0.6,
    textTransform: "uppercase",
  },
});

export default ChangePasswordScreen;
