import { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Dimensions,
  StatusBar,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
  Image,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import Fontisto from "@expo/vector-icons/Fontisto";
import bannerBG from "@/assets/bannerBG.png";
import {
  forgotPasswordApi,
  verifyOtpApi,
  resetPasswordApi,
} from "@/services/api";

const { width, height } = Dimensions.get("window");

type RootStackParamList = {
  HomeScreen: undefined;
  RegisterScreen: undefined;
  LoginScreen: undefined;
  MovieDetailScreen: { movie: any };
  ForgotPasswordScreen: undefined;
};

type ForgotPasswordScreenNavigationProp = StackNavigationProp<
  RootStackParamList,
  "ForgotPasswordScreen"
>;

type Step = "email" | "otp" | "newPassword";

const ForgotPasswordScreen = () => {
  const navigation = useNavigation<ForgotPasswordScreenNavigationProp>();
  const [currentStep, setCurrentStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [resendingOTP, setResendingOTP] = useState(false);

  const handleSendOTP = async () => {
    if (!email.trim()) {
      Alert.alert("Lỗi", "Vui lòng nhập email");
      return;
    }

    if (
      !/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(email.trim())
    ) {
      Alert.alert("Lỗi", "Email không hợp lệ");
      return;
    }

    // Nếu đang ở bước OTP, sử dụng resendingOTP state
    const isResending = currentStep === "otp";

    try {
      if (isResending) {
        setResendingOTP(true);
      } else {
        setLoading(true);
      }

      const response = await forgotPasswordApi({ email: email.trim() });

      if (response.status) {
        Alert.alert(
          "Thành công",
          response.message || "OTP đã được gửi đến email của bạn"
        );
        if (!isResending) {
          setCurrentStep("otp");
        }
      } else {
        Alert.alert(
          "Lỗi",
          response.message || "Không thể gửi OTP. Vui lòng thử lại."
        );
      }
    } catch (error: any) {
      console.error("Send OTP error:", error);
      Alert.alert(
        "Lỗi",
        error?.response?.data?.message ||
          error?.message ||
          "Không thể gửi OTP. Vui lòng thử lại."
      );
    } finally {
      if (isResending) {
        setResendingOTP(false);
      } else {
        setLoading(false);
      }
    }
  };

  const handleVerifyOTP = async () => {
    if (!otp.trim()) {
      Alert.alert("Lỗi", "Vui lòng nhập OTP");
      return;
    }

    if (otp.trim().length !== 6) {
      Alert.alert("Lỗi", "OTP phải có 6 chữ số");
      return;
    }

    try {
      setLoading(true);
      const response = await verifyOtpApi({
        email: email.trim(),
        otp: otp.trim(),
      });

      if (response.status) {
        setCurrentStep("newPassword");
      } else {
        Alert.alert(
          "Lỗi",
          response.message || "OTP không đúng. Vui lòng thử lại."
        );
      }
    } catch (error: any) {
      console.error("Verify OTP error:", error);
      Alert.alert(
        "Lỗi",
        error?.response?.data?.message ||
          error?.message ||
          "Không thể xác thực OTP. Vui lòng thử lại."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (!newPassword.trim()) {
      Alert.alert("Lỗi", "Vui lòng nhập mật khẩu mới");
      return;
    }

    if (newPassword.length < 8) {
      Alert.alert("Lỗi", "Mật khẩu phải có ít nhất 8 ký tự");
      return;
    }

    if (
      !/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/.test(
        newPassword
      )
    ) {
      Alert.alert(
        "Lỗi",
        "Mật khẩu phải chứa ít nhất 1 chữ thường, 1 chữ in hoa, 1 số và 1 ký tự đặc biệt"
      );
      return;
    }

    if (newPassword !== confirmPassword) {
      Alert.alert("Lỗi", "Mật khẩu xác nhận không khớp");
      return;
    }

    try {
      setLoading(true);
      const response = await resetPasswordApi({
        email: email.trim(),
        newPassword: newPassword,
      });

      if (response.status) {
        Alert.alert(
          "Thành công",
          response.message || "Đổi mật khẩu thành công!",
          [
            {
              text: "OK",
              onPress: () => navigation.navigate("LoginScreen"),
            },
          ]
        );
      } else {
        Alert.alert(
          "Lỗi",
          response.message || "Không thể đổi mật khẩu. Vui lòng thử lại."
        );
      }
    } catch (error: any) {
      console.error("Reset password error:", error);
      Alert.alert(
        "Lỗi",
        error?.response?.data?.message ||
          error?.message ||
          "Không thể đổi mật khẩu. Vui lòng thử lại."
      );
    } finally {
      setLoading(false);
    }
  };

  const renderEmailStep = () => (
    <View style={styles.formContainer}>
      <Text style={styles.stepTitle}>Quên mật khẩu</Text>
      <Text style={styles.stepDescription}>
        Nhập email của bạn để nhận mã OTP
      </Text>

      <View style={styles.inputContainer}>
        <Text style={styles.inputLabel}>
          Email <Text style={styles.required}>*</Text>
        </Text>
        <TextInput
          style={styles.input}
          placeholder="Email"
          placeholderTextColor="#999"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
        />
        <View style={styles.inputUnderline} />
      </View>

      <TouchableOpacity
        style={[styles.submitButton, loading && styles.submitButtonDisabled]}
        onPress={handleSendOTP}
        disabled={loading}
      >
        <Text style={styles.submitButtonText}>
          {loading ? "Đang gửi..." : "GỬI OTP"}
        </Text>
      </TouchableOpacity>
    </View>
  );

  const renderOTPStep = () => (
    <View style={styles.formContainer}>
      <Text style={styles.stepTitle}>Nhập mã OTP</Text>
      <Text style={styles.stepDescription}>
        Mã OTP đã được gửi đến email {email}
      </Text>

      <View style={styles.inputContainer}>
        <Text style={styles.inputLabel}>
          Mã OTP <Text style={styles.required}>*</Text>
        </Text>
        <TextInput
          style={styles.input}
          placeholder="Nhập mã OTP 6 chữ số"
          placeholderTextColor="#999"
          value={otp}
          onChangeText={setOtp}
          keyboardType="number-pad"
          maxLength={6}
        />
        <View style={styles.inputUnderline} />
      </View>

      <TouchableOpacity
        style={styles.resendButton}
        onPress={handleSendOTP}
        disabled={resendingOTP}
      >
        <Text style={styles.resendButtonText}>
          {resendingOTP ? "Đang gửi..." : "Gửi lại OTP"}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.submitButton, loading && styles.submitButtonDisabled]}
        onPress={handleVerifyOTP}
        disabled={loading}
      >
        <Text style={styles.submitButtonText}>
          {loading ? "Đang xác thực..." : "XÁC THỰC"}
        </Text>
      </TouchableOpacity>
    </View>
  );

  const renderNewPasswordStep = () => (
    <View style={styles.formContainer}>
      <Text style={styles.stepTitle}>Đặt mật khẩu mới</Text>
      <Text style={styles.stepDescription}>
        Vui lòng nhập mật khẩu mới của bạn
      </Text>

      <View style={styles.inputContainer}>
        <Text style={styles.inputLabel}>
          Mật khẩu mới <Text style={styles.required}>*</Text>
        </Text>
        <TextInput
          style={styles.input}
          placeholder="Mật khẩu mới"
          placeholderTextColor="#999"
          value={newPassword}
          onChangeText={setNewPassword}
          secureTextEntry={!showPassword}
          autoCapitalize="none"
          autoCorrect={false}
        />
        <TouchableOpacity
          style={styles.eyeIcon}
          onPress={() => setShowPassword(!showPassword)}
        >
          <Fontisto name="eye" size={20} color="#666" />
        </TouchableOpacity>
        <View style={styles.inputUnderline} />
      </View>

      <View style={styles.inputContainer}>
        <Text style={styles.inputLabel}>
          Xác nhận mật khẩu <Text style={styles.required}>*</Text>
        </Text>
        <TextInput
          style={styles.input}
          placeholder="Xác nhận mật khẩu"
          placeholderTextColor="#999"
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          secureTextEntry={!showConfirmPassword}
          autoCapitalize="none"
          autoCorrect={false}
        />
        <TouchableOpacity
          style={styles.eyeIcon}
          onPress={() => setShowConfirmPassword(!showConfirmPassword)}
        >
          <Fontisto name="eye" size={20} color="#666" />
        </TouchableOpacity>
        <View style={styles.inputUnderline} />
      </View>

      <TouchableOpacity
        style={[styles.submitButton, loading && styles.submitButtonDisabled]}
        onPress={handleResetPassword}
        disabled={loading}
      >
        <Text style={styles.submitButtonText}>
          {loading ? "Đang xử lý..." : "ĐỔI MẬT KHẨU"}
        </Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <StatusBar barStyle="light-content" backgroundColor="#1a1a1a" />
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Top Section với image */}
        <View style={styles.topSection}>
          <Image
            source={bannerBG}
            style={styles.topSectionImage}
            resizeMode="cover"
          />
          {/* Header với back button */}
          <View style={styles.header}>
            {currentStep !== "newPassword" && (
              <TouchableOpacity
                style={styles.backButton}
                onPress={() => {
                  if (currentStep === "email") {
                    navigation.goBack();
                  } else if (currentStep === "otp") {
                    setCurrentStep("email");
                  } else {
                    setCurrentStep("otp");
                  }
                }}
              >
                <Fontisto name="arrow-left" size={24} color="#fff" />
              </TouchableOpacity>
            )}
            <Text style={styles.headerTitle}>Quên mật khẩu</Text>
          </View>
        </View>

        {/* Bottom Section với form */}
        <View style={styles.bottomSection}>
          {currentStep === "email" && renderEmailStep()}
          {currentStep === "otp" && renderOTPStep()}
          {currentStep === "newPassword" && renderNewPasswordStep()}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  scrollContent: {
    flexGrow: 1,
  },
  topSection: {
    height: height * 0.3,
    width: "100%",
    position: "relative",
  },
  topSectionImage: {
    width: "100%",
    height: "100%",
  },
  header: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingTop:
      Platform.OS === "android" ? (StatusBar.currentHeight || 0) + 12 : 50,
    backgroundColor: "transparent",
    minHeight: 50,
    zIndex: 10,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
    zIndex: 11,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#fff",
    lineHeight: 24,
  },
  bottomSection: {
    flex: 1,
    backgroundColor: "#fff",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    marginTop: -20,
    paddingTop: 30,
  },
  formContainer: {
    paddingHorizontal: 20,
    paddingBottom: 30,
  },
  stepTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#000",
    marginBottom: 8,
  },
  stepDescription: {
    fontSize: 14,
    color: "#666",
    marginBottom: 30,
    lineHeight: 20,
  },
  inputContainer: {
    marginBottom: 20,
    position: "relative",
  },
  inputLabel: {
    fontSize: 14,
    color: "#000",
    marginBottom: 8,
  },
  required: {
    color: "#E50914",
  },
  input: {
    fontSize: 16,
    color: "#000",
    paddingVertical: 12,
    paddingHorizontal: 0,
  },
  inputUnderline: {
    height: 1,
    backgroundColor: "#ccc",
    marginTop: 4,
  },
  eyeIcon: {
    position: "absolute",
    right: 0,
    top: 40,
    padding: 4,
  },
  submitButton: {
    backgroundColor: "#E50914",
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 10,
  },
  submitButtonDisabled: {
    opacity: 0.7,
  },
  submitButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
    letterSpacing: 1,
  },
  resendButton: {
    alignItems: "center",
    marginTop: 10,
    marginBottom: 20,
  },
  resendButtonText: {
    color: "#0068FF",
    fontSize: 14,
  },
});

export default ForgotPasswordScreen;
