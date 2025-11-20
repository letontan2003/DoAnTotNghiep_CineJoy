import { useCallback, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  TextInput,
  ScrollView,
} from "react-native";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import dayjs from "dayjs";
import Feather from "@expo/vector-icons/Feather";

import { useAppSelector } from "@/store/hooks";
import SideMenu from "@/components/SideMenu";
import { fetchAccountApi, verifyPasswordApi } from "@/services/api";
import { IUser } from "@/types/api";

type RootStackParamList = {
  AccountInfoScreen: undefined;
  MemberScreen: undefined;
};

type AccountInfoNavProp = StackNavigationProp<
  RootStackParamList,
  "AccountInfoScreen"
>;

const AccountInfoScreen = () => {
  const navigation = useNavigation<AccountInfoNavProp>();
  const storedUser = useAppSelector((state) => state.app.user);

  const [account, setAccount] = useState<IUser | null>(storedUser || null);
  const [password, setPassword] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<"verify" | "detail">("verify");
  const [showSideMenu, setShowSideMenu] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  useFocusEffect(
    useCallback(() => {
      setStep("verify");
      setPassword("");
      setError(null);
      setShowSideMenu(false);
      setShowPassword(false);
    }, [])
  );

  const handleVerifyPassword = async () => {
    if (!password.trim()) {
      setError("Vui lòng nhập mật khẩu");
      return;
    }

    setVerifying(true);
    setError(null);
    try {
      const response = await verifyPasswordApi({ password });
      if (response?.status) {
        const accountRes = await fetchAccountApi();
        if (accountRes?.status && accountRes.data?.user) {
          setAccount(accountRes.data.user);
        }
        setStep("detail");
        setPassword("");
      } else {
        setError(response?.message || "Mật khẩu không chính xác");
      }
    } catch (err) {
      console.error("verify password error:", err);
      setError("Có lỗi xảy ra. Vui lòng thử lại.");
    } finally {
      setVerifying(false);
    }
  };

  const userDetails = useMemo(() => {
    const emailMask = (() => {
      if (!account?.email) return "Đang cập nhật";
      if (account.email.length <= 6) {
        return `${account.email[0]}${"*".repeat(
          Math.max(1, account.email.length - 2)
        )}${account.email.slice(-1)}`;
      }
      const visibleSuffix = account.email.slice(-3);
      const prefix = account.email.slice(0, 3);
      return `${prefix}${"*".repeat(account.email.length - 6)}${visibleSuffix}`;
    })();

    return {
      email: emailMask,
      fullName: account?.fullName || "Đang cập nhật",
      dateOfBirth: account?.dateOfBirth
        ? dayjs(account.dateOfBirth).format("DD MMM, YYYY")
        : "Đang cập nhật",
      gender: account?.gender || "Đang cập nhật",
      phoneNumber: account?.phoneNumber || "Đang cập nhật",
    };
  }, [account]);

  const renderInfoRow = (label: string, value: string) => (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );

  const renderVerifyState = () => (
    <View style={styles.verifyWrapper}>
      <View style={styles.verifyCard}>
        <Text style={styles.verifyTitle}>Vì lý do bảo mật</Text>
        <Text style={styles.verifySubtitle}>
          Vui lòng nhập mật khẩu để tiếp tục
        </Text>
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Mật khẩu</Text>
          <View style={styles.passwordWrapper}>
            <TextInput
              placeholder="Nhập mật khẩu"
              placeholderTextColor="#a1a1aa"
              style={styles.passwordInput}
              secureTextEntry={!showPassword}
              value={password}
              onChangeText={setPassword}
            />
            <TouchableOpacity
              style={styles.eyeButton}
              onPress={() => setShowPassword((prev) => !prev)}
            >
              <Feather
                name={showPassword ? "eye" : "eye-off"}
                size={20}
                color="#6b7280"
              />
            </TouchableOpacity>
          </View>
        </View>
        {error && <Text style={styles.errorText}>{error}</Text>}
        <TouchableOpacity
          style={[styles.confirmButton, verifying && { opacity: 0.7 }]}
          onPress={handleVerifyPassword}
          disabled={verifying}
        >
          <Text style={styles.confirmButtonText}>
            {verifying ? "Đang kiểm tra..." : "XÁC NHẬN"}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderDetailState = () => (
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={styles.detailContent}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>TÀI KHOẢN CỦA TÔI LÀ...</Text>
        <View style={styles.fieldBox}>
          <Text style={styles.fieldValue}>{userDetails.email}</Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionLabel}>THÔNG TIN THÊM</Text>
        <View style={styles.infoCard}>
          {renderInfoRow("Họ tên", userDetails.fullName)}
          {renderInfoRow("Ngày sinh", userDetails.dateOfBirth)}
          {renderInfoRow("Giới tính", userDetails.gender)}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionLabel}>LIÊN HỆ</Text>
        <View style={styles.infoCard}>
          {renderInfoRow("SĐT di động", userDetails.phoneNumber)}
        </View>
      </View>

      <View style={styles.noteContainer}>
        <Text style={styles.noteText}>
          Khi đăng ký, tôi đã xem xét và đồng ý với{" "}
          <Text style={styles.noteLink}>Điều Khoản Sử Dụng</Text> và{" "}
          <Text style={styles.noteLink}>Chính Sách Bảo Mật</Text> của CineJoy.
        </Text>
      </View>
    </ScrollView>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.headerButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.headerIcon}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Thông tin tài khoản</Text>
        <TouchableOpacity
          style={styles.headerButton}
          onPress={() => setShowSideMenu(true)}
        >
          <Text style={styles.headerIcon}>☰</Text>
        </TouchableOpacity>
      </View>

      {!storedUser ? (
        <View style={styles.stateContainer}>
          <Text style={styles.stateText}>
            Bạn cần đăng nhập để xem thông tin tài khoản.
          </Text>
        </View>
      ) : step === "verify" ? (
        renderVerifyState()
      ) : (
        <>
          {renderDetailState()}
          <View style={styles.footerButtonContainer}>
            <TouchableOpacity style={styles.footerButton}>
              <Text style={styles.footerButtonText}>Cập nhật thông tin</Text>
            </TouchableOpacity>
          </View>
        </>
      )}

      <SideMenu visible={showSideMenu} onClose={() => setShowSideMenu(false)} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f4f4f5",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
    paddingTop: 28,
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
  headerIcon: {
    fontSize: 28,
    color: "#E50914",
    fontWeight: "700",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
  },
  verifyWrapper: {
    flex: 1,
  },
  verifyCard: {
    flex: 1,
    backgroundColor: "#faf3e0",
    padding: 24,
  },
  verifyTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#7c2d12",
    marginBottom: 8,
  },
  verifySubtitle: {
    fontSize: 14,
    color: "#6b7280",
    marginBottom: 20,
  },
  inputGroup: {
    marginBottom: 12,
  },
  inputLabel: {
    fontSize: 13,
    color: "#6b7280",
    marginBottom: 6,
  },
  passwordWrapper: {
    position: "relative",
    justifyContent: "center",
  },
  passwordInput: {
    backgroundColor: "#fff",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15,
    color: "#111827",
  },
  eyeButton: {
    position: "absolute",
    right: 14,
    top: 0,
    bottom: 0,
    justifyContent: "center",
  },
  confirmButton: {
    marginTop: 12,
    backgroundColor: "#b91c1c",
    borderRadius: 999,
    paddingVertical: 14,
    alignItems: "center",
  },
  confirmButtonText: {
    color: "#fff",
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  errorText: {
    marginTop: 6,
    color: "#b91c1c",
    fontSize: 13,
  },
  detailContent: {
    padding: 16,
    paddingBottom: 40,
    gap: 16,
  },
  section: {
    gap: 12,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: "#6b4f2d",
    letterSpacing: 0.5,
  },
  fieldBox: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  fieldValue: {
    fontSize: 15,
    color: "#111827",
    fontWeight: "600",
  },
  infoCard: {
    backgroundColor: "#fff",
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
  },
  infoLabel: {
    fontSize: 14,
    color: "#6b7280",
  },
  infoValue: {
    fontSize: 14,
    fontWeight: "600",
    color: "#111827",
    textAlign: "right",
  },
  noteContainer: {
    marginTop: 12,
    padding: 16,
    borderRadius: 12,
    backgroundColor: "#fef2f2",
  },
  noteText: {
    fontSize: 13,
    color: "#6b7280",
    lineHeight: 18,
  },
  noteLink: {
    color: "#b91c1c",
    fontWeight: "600",
  },
  footerButtonContainer: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  footerButton: {
    backgroundColor: "#b91c1c",
    borderRadius: 999,
    paddingVertical: 14,
    alignItems: "center",
  },
  footerButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  stateContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  stateText: {
    fontSize: 14,
    color: "#6b7280",
    textAlign: "center",
  },
});

export default AccountInfoScreen;
