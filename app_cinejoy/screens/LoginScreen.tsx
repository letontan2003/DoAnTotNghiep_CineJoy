import { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Image,
  Dimensions,
  StatusBar,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import Fontisto from '@expo/vector-icons/Fontisto';
import { loginApi } from "@/services/api";
import { useAppDispatch } from "@/store/hooks";
import { setUser, setIsAuthenticated, setIsDarkMode } from "@/store/appSlice";
import AsyncStorage from "@react-native-async-storage/async-storage";
import bannerBG from "@/assets/bannerBG.png";

const { width, height } = Dimensions.get("window");

type RootStackParamList = {
  HomeScreen: undefined;
  RegisterScreen: undefined;
  LoginScreen: undefined;
};

type LoginScreenNavigationProp = StackNavigationProp<RootStackParamList, "LoginScreen">;

const LoginScreen = () => {
  const navigation = useNavigation<LoginScreenNavigationProp>();
  const dispatch = useAppDispatch();
  
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert("Lỗi", "Vui lòng nhập đầy đủ email và mật khẩu");
      return;
    }

    try {
      setLoading(true);
      const response = await loginApi({ email: email.trim(), password });

      if (response.status && response.data) {
        // Lưu token vào AsyncStorage
        await AsyncStorage.setItem("accessToken", response.data.accessToken);
        await AsyncStorage.setItem("current_user_id", response.data.user._id);
        
        // Cập nhật Redux store
        dispatch(setUser(response.data.user));
        dispatch(setIsAuthenticated(true));
        dispatch(setIsDarkMode(response.data.user.settings.darkMode));
        
        // Navigate về HomeScreen
        navigation.navigate("HomeScreen");
      } else {
        Alert.alert("Lỗi đăng nhập", response.message || "Đăng nhập thất bại. Vui lòng thử lại.");
      }
    } catch (error: any) {
      console.error("Login error:", error);
      Alert.alert(
        "Lỗi",
        error?.response?.data?.message || error?.message || "Có lỗi xảy ra khi đăng nhập. Vui lòng thử lại."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = () => {
    Alert.alert("Thông báo", "Tính năng quên mật khẩu sẽ được phát triển trong tương lai");
  };

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
        {/* Header với back button */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Fontisto name="arrow-left" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Đăng Nhập</Text>
        </View>

        {/* Top Section với background image */}
        <View style={styles.topSection}>
          <Image
            source={bannerBG}
            style={styles.topSectionBackground}
            resizeMode="cover"
          />
          <View style={styles.cardOverlay}>
            <View style={styles.cardContainer}>
              <Text style={styles.cardText}>HAVE A NICE DAY</Text>
              <Text style={styles.cardLogo}>CGV*</Text>
              <View style={styles.cardDivider} />
              <Text style={styles.cardSubtext}>CGV CINEMA STREET</Text>
            </View>
          </View>
        </View>

        {/* Bottom Section với form */}
        <View style={styles.bottomSection}>
          <View style={styles.formContainer}>
            {/* Email Input */}
            <View style={styles.inputContainer}>
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

            {/* Password Input */}
            <View style={styles.inputContainer}>
              <TextInput
                style={styles.input}
                placeholder="Mật khẩu"
                placeholderTextColor="#999"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                autoCorrect={false}
              />
              <TouchableOpacity
                style={styles.eyeIcon}
                onPress={() => setShowPassword(!showPassword)}
              >
                <Fontisto
                  name="eye"
                  size={20}
                  color="#666"
                />
              </TouchableOpacity>
              <View style={styles.inputUnderline} />
            </View>

            {/* Login Button */}
            <TouchableOpacity
              style={[styles.loginButton, loading && styles.loginButtonDisabled]}
              onPress={handleLogin}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.loginButtonText}>ĐĂNG NHẬP</Text>
              )}
            </TouchableOpacity>

            {/* Forgot Password */}
            <TouchableOpacity
              style={styles.forgotPasswordButton}
              onPress={handleForgotPassword}
            >
              <Text style={styles.forgotPasswordText}>Quên mật khẩu?</Text>
            </TouchableOpacity>

            {/* Separator */}
            <View style={styles.separator}>
              <View style={styles.separatorLine} />
              <Text style={styles.separatorText}>hoặc</Text>
              <View style={styles.separatorLine} />
            </View>

            {/* Register Button */}
            <TouchableOpacity
              style={styles.registerButton}
              onPress={() => navigation.navigate("RegisterScreen")}
            >
              <Text style={styles.registerButtonText}>Đăng ký tài khoản CGV</Text>
            </TouchableOpacity>
          </View>
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
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 10,
    backgroundColor: "#1a1a1a",
  },
  backButton: {
    padding: 8,
    marginRight: 16,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#fff",
    flex: 1,
  },
  topSection: {
    height: height * 0.35,
    position: "relative",
    backgroundColor: "#1a1a1a",
  },
  topSectionBackground: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: "100%",
    height: "100%",
    opacity: 0.8,
  },
  cardOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: "center",
    alignItems: "flex-end",
    paddingRight: 20,
    paddingTop: 20,
  },
  cardContainer: {
    backgroundColor: "#E50914",
    padding: 20,
    borderRadius: 8,
    alignItems: "center",
    minWidth: 150,
    maxWidth: 160,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 8,
    zIndex: 10,
  },
  cardText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "bold",
    marginBottom: 8,
    letterSpacing: 1,
  },
  cardLogo: {
    color: "#fff",
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 8,
  },
  cardDivider: {
    width: "100%",
    height: 1,
    backgroundColor: "#fff",
    marginVertical: 8,
    borderStyle: "dashed",
  },
  cardSubtext: {
    color: "#fff",
    fontSize: 10,
    textAlign: "center",
    letterSpacing: 0.5,
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
  inputContainer: {
    marginBottom: 20,
    position: "relative",
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
    top: 12,
    padding: 4,
  },
  loginButton: {
    backgroundColor: "#E50914",
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 10,
    marginBottom: 12,
  },
  loginButtonDisabled: {
    opacity: 0.7,
  },
  loginButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
    letterSpacing: 1,
  },
  forgotPasswordButton: {
    alignItems: "center",
    marginBottom: 20,
  },
  forgotPasswordText: {
    color: "#0068FF",
    fontSize: 14,
  },
  separator: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 20,
  },
  separatorLine: {
    flex: 1,
    height: 1,
    backgroundColor: "#ccc",
  },
  separatorText: {
    marginHorizontal: 12,
    color: "#666",
    fontSize: 14,
  },
  registerButton: {
    backgroundColor: "#fff",
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#ccc",
    marginBottom: 12,
  },
  registerButtonText: {
    color: "#000",
    fontSize: 14,
    fontWeight: "500",
  },
});

export default LoginScreen;

