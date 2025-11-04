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
  Modal,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import Fontisto from '@expo/vector-icons/Fontisto';
import { registerApi } from "@/services/api";
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

type RegisterScreenNavigationProp = StackNavigationProp<RootStackParamList, "RegisterScreen">;

const RegisterScreen = () => {
  const navigation = useNavigation<RegisterScreenNavigationProp>();
  const dispatch = useAppDispatch();
  
  const [fullName, setFullName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [dateOfBirth, setDateOfBirth] = useState<Date | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [gender, setGender] = useState("");
  const [showGenderPicker, setShowGenderPicker] = useState(false);
  const [loading, setLoading] = useState(false);
  
  // Checkboxes state
  const [checkbox1, setCheckbox1] = useState(false);
  const [checkbox2, setCheckbox2] = useState(false);
  const [checkbox3, setCheckbox3] = useState(false);
  const [checkbox4, setCheckbox4] = useState(false);

  const genders = ["Nam", "Nữ", "Khác"];

  const formatDate = (date: Date | null): string => {
    if (!date) return "";
    const day = date.getDate().toString().padStart(2, "0");
    const month = (date.getMonth() + 1).toString().padStart(2, "0");
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  };

  const handleDateChange = (selectedDate: Date) => {
    setDateOfBirth(selectedDate);
    setShowDatePicker(false);
  };

  const validateForm = (): boolean => {
    if (!fullName.trim()) {
      Alert.alert("Lỗi", "Vui lòng nhập họ tên");
      return false;
    }
    if (fullName.trim().length < 2) {
      Alert.alert("Lỗi", "Họ tên phải có ít nhất 2 ký tự");
      return false;
    }
    if (!phoneNumber.trim()) {
      Alert.alert("Lỗi", "Vui lòng nhập số điện thoại");
      return false;
    }
    if (!/^0[0-9]{9}$/.test(phoneNumber.trim())) {
      Alert.alert("Lỗi", "Số điện thoại phải có 10 chữ số và bắt đầu bằng số 0");
      return false;
    }
    if (!email.trim()) {
      Alert.alert("Lỗi", "Vui lòng nhập email");
      return false;
    }
    if (!/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(email.trim())) {
      Alert.alert("Lỗi", "Email không hợp lệ");
      return false;
    }
    if (!password.trim()) {
      Alert.alert("Lỗi", "Vui lòng nhập mật khẩu");
      return false;
    }
    if (password.length < 8) {
      Alert.alert("Lỗi", "Mật khẩu phải có ít nhất 8 ký tự");
      return false;
    }
    if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/.test(password)) {
      Alert.alert("Lỗi", "Mật khẩu phải chứa ít nhất 1 chữ thường, 1 chữ in hoa, 1 số và 1 ký tự đặc biệt");
      return false;
    }
    if (!dateOfBirth) {
      Alert.alert("Lỗi", "Vui lòng chọn ngày sinh");
      return false;
    }
    if (dateOfBirth > new Date()) {
      Alert.alert("Lỗi", "Ngày sinh không được lớn hơn ngày hiện tại");
      return false;
    }
    if (!gender) {
      Alert.alert("Lỗi", "Vui lòng chọn giới tính");
      return false;
    }
    if (!checkbox1 || !checkbox2 || !checkbox3 || !checkbox4) {
      Alert.alert("Lỗi", "Vui lòng đồng ý với tất cả các điều khoản");
      return false;
    }
    return true;
  };

  const handleRegister = async () => {
    if (!validateForm()) {
      return;
    }

    try {
      setLoading(true);
      const dateOfBirthStr = dateOfBirth 
        ? `${dateOfBirth.getFullYear()}-${String(dateOfBirth.getMonth() + 1).padStart(2, '0')}-${String(dateOfBirth.getDate()).padStart(2, '0')}`
        : "";

      const response = await registerApi({
        email: email.trim(),
        password,
        fullName: fullName.trim(),
        dateOfBirth: dateOfBirthStr,
        gender,
        phoneNumber: phoneNumber.trim(),
      });

      if (response.status && response.data) {
        // Lưu token vào AsyncStorage
        await AsyncStorage.setItem("accessToken", response.data.accessToken);
        await AsyncStorage.setItem("current_user_id", response.data.user._id);
        
        // Cập nhật Redux store
        dispatch(setUser(response.data.user));
        dispatch(setIsAuthenticated(true));
        dispatch(setIsDarkMode(response.data.user.settings.darkMode));
        
        Alert.alert("Thành công", "Đăng ký thành công!", [
          {
            text: "OK",
            onPress: () => navigation.navigate("HomeScreen"),
          },
        ]);
      } else {
        Alert.alert("Lỗi đăng ký", response.message || "Đăng ký thất bại. Vui lòng thử lại.");
      }
    } catch (error: any) {
      console.error("Register error:", error);
      Alert.alert(
        "Lỗi",
        error?.response?.data?.message || error?.message || "Có lỗi xảy ra khi đăng ký. Vui lòng thử lại."
      );
    } finally {
      setLoading(false);
    }
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
          <Text style={styles.headerTitle}>Đăng ký</Text>
        </View>

        {/* Top Section với background image */}
        <View style={styles.topSection}>
          <Image
            source={bannerBG}
            style={styles.topSectionBackground}
            resizeMode="cover"
          />
          <View style={styles.cardOverlay}>
            <View style={styles.whiteCard}>
              <Text style={styles.whiteCardText1}>CULTUREPLEX</Text>
              <View style={styles.freeBadge}>
                <Text style={styles.freeBadgeText}>FREE</Text>
              </View>
              <Text style={styles.whiteCardText2}>HELLO</Text>
            </View>
            <View style={styles.redCard}>
              <Text style={styles.redCardLogo}>CGV</Text>
              <Text style={styles.redCardText}>YOUR LIFE WITH DELIGHT</Text>
              <Text style={styles.redCardVerticalText}>CULTUREPLEX</Text>
              <View style={styles.redCardFreeBadge}>
                <Text style={styles.redCardFreeBadgeText}>FREE</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Bottom Section với form */}
        <View style={styles.bottomSection}>
          <View style={styles.formContainer}>
            {/* Full Name Input */}
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>
                Họ tên <Text style={styles.required}>*</Text>
              </Text>
              <TextInput
                style={styles.input}
                placeholder="Họ tên"
                placeholderTextColor="#999"
                value={fullName}
                onChangeText={setFullName}
                autoCapitalize="words"
              />
              <View style={styles.inputUnderline} />
            </View>

            {/* Phone Number Input */}
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>
                Số điện thoại <Text style={styles.required}>*</Text>
              </Text>
              <TextInput
                style={styles.input}
                placeholder="Số điện thoại"
                placeholderTextColor="#999"
                value={phoneNumber}
                onChangeText={setPhoneNumber}
                keyboardType="phone-pad"
                maxLength={10}
              />
              <View style={styles.inputUnderline} />
            </View>

            {/* Email Input */}
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

            {/* Password Input */}
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>
                Mật khẩu <Text style={styles.required}>*</Text>
              </Text>
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

            {/* Date of Birth Input */}
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Ngày sinh</Text>
              <TouchableOpacity
                style={styles.selectInput}
                onPress={() => setShowDatePicker(true)}
              >
                <Text style={[styles.selectInputText, !dateOfBirth && styles.placeholder]}>
                  {dateOfBirth ? formatDate(dateOfBirth) : "Chọn ngày sinh"}
                </Text>
                <Fontisto name="angle-down" size={16} color="#666" />
              </TouchableOpacity>
              <View style={styles.inputUnderline} />
            </View>

            {/* Gender Input */}
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Giới tính</Text>
              <TouchableOpacity
                style={styles.selectInput}
                onPress={() => setShowGenderPicker(true)}
              >
                <Text style={[styles.selectInputText, !gender && styles.placeholder]}>
                  {gender || "Chọn giới tính"}
                </Text>
                <Fontisto name="angle-down" size={16} color="#666" />
              </TouchableOpacity>
              <View style={styles.inputUnderline} />
            </View>

            {/* Checkboxes */}
            <View style={styles.checkboxContainer}>
              <TouchableOpacity
                style={styles.checkboxRow}
                onPress={() => setCheckbox1(!checkbox1)}
              >
                <View style={[styles.checkbox, checkbox1 && styles.checkboxChecked]}>
                  {checkbox1 && <Text style={styles.checkmark}>✓</Text>}
                </View>
                <Text style={styles.checkboxText}>
                  Bằng việc bấm nút "Đăng Ký" bên dưới. Tôi đồng ý cho phép CGV Việt Nam thực hiện xử lý dữ liệu cá nhân của tôi phù hợp với mục đích mà CGV Việt Nam đã thông báo tại Chính Sách Bảo Mật.
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.checkboxRow}
                onPress={() => setCheckbox2(!checkbox2)}
              >
                <View style={[styles.checkbox, checkbox2 && styles.checkboxChecked]}>
                  {checkbox2 && <Text style={styles.checkmark}>✓</Text>}
                </View>
                <Text style={styles.checkboxText}>
                  Thông tin cá nhân cung cấp tại đây là chính xác và trùng khớp với thông tin tại CMND/CCCD/Thẻ Căn cước và/hoặc Giấy khai sinh (Giấy tờ tùy thân). Email cung cấp tại đây là chính xác và thuộc quyền quản lý duy nhất của tôi.
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.checkboxRow}
                onPress={() => setCheckbox3(!checkbox3)}
              >
                <View style={[styles.checkbox, checkbox3 && styles.checkboxChecked]}>
                  {checkbox3 && <Text style={styles.checkmark}>✓</Text>}
                </View>
                <Text style={styles.checkboxText}>
                  Nếu các thông tin là không trùng khớp, sẽ không thể cập nhật thay đổi và không được hưởng các{" "}
                  <Text style={styles.linkText}>Quyền Lợi Thành Viên</Text>.
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.checkboxRow}
                onPress={() => setCheckbox4(!checkbox4)}
              >
                <View style={[styles.checkbox, checkbox4 && styles.checkboxChecked]}>
                  {checkbox4 && <Text style={styles.checkmark}>✓</Text>}
                </View>
                <Text style={styles.checkboxText}>
                  Tôi đồng ý với <Text style={styles.linkText}>Điều Khoản Sử Dụng</Text> của CGV Việt Nam.
                </Text>
              </TouchableOpacity>
            </View>

            {/* Register Button */}
            <TouchableOpacity
              style={[styles.registerButton, loading && styles.registerButtonDisabled]}
              onPress={handleRegister}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.registerButtonText}>ĐĂNG KÝ</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      {/* Date Picker Modal */}
      <Modal
        visible={showDatePicker}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowDatePicker(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Chọn ngày sinh</Text>
              <TouchableOpacity
                onPress={() => setShowDatePicker(false)}
                style={styles.modalCloseButton}
              >
                <Text style={styles.modalCloseText}>✕</Text>
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.datePickerContainer}>
              {Array.from({ length: 100 }, (_, i) => {
                const year = new Date().getFullYear() - 18 - i;
                return (
                  <TouchableOpacity
                    key={year}
                    style={styles.dateOption}
                    onPress={() => {
                      const newDate = new Date();
                      newDate.setFullYear(year);
                      handleDateChange(newDate);
                    }}
                  >
                    <Text style={styles.dateOptionText}>{year}</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Gender Picker Modal */}
      <Modal
        visible={showGenderPicker}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowGenderPicker(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Chọn giới tính</Text>
              <TouchableOpacity
                onPress={() => setShowGenderPicker(false)}
                style={styles.modalCloseButton}
              >
                <Text style={styles.modalCloseText}>✕</Text>
              </TouchableOpacity>
            </View>
            {genders.map((g) => (
              <TouchableOpacity
                key={g}
                style={styles.modalOption}
                onPress={() => {
                  setGender(g);
                  setShowGenderPicker(false);
                }}
              >
                <Text style={styles.modalOptionText}>{g}</Text>
                {gender === g && (
                  <Fontisto name="check" size={16} color="#E50914" />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </Modal>
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
    height: height * 0.3,
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
    top: 20,
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "flex-start",
    paddingHorizontal: 20,
  },
  whiteCard: {
    backgroundColor: "#fff",
    padding: 15,
    borderRadius: 8,
    width: width * 0.4,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    transform: [{ rotate: "-5deg" }],
  },
  whiteCardText1: {
    fontSize: 12,
    fontWeight: "bold",
    color: "#000",
    marginBottom: 8,
  },
  freeBadge: {
    backgroundColor: "#E50914",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    marginBottom: 8,
  },
  freeBadgeText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "bold",
  },
  whiteCardText2: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#000",
  },
  redCard: {
    backgroundColor: "#E50914",
    padding: 15,
    borderRadius: 8,
    width: width * 0.35,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    transform: [{ rotate: "5deg" }],
    position: "relative",
  },
  redCardLogo: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#fff",
    marginBottom: 8,
  },
  redCardText: {
    fontSize: 10,
    color: "#fff",
    textAlign: "center",
    marginBottom: 8,
  },
  redCardVerticalText: {
    fontSize: 12,
    fontWeight: "bold",
    color: "#fff",
    transform: [{ rotate: "-90deg" }],
    position: "absolute",
    left: -20,
    top: 40,
  },
  redCardFreeBadge: {
    backgroundColor: "#fff",
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 3,
    position: "absolute",
    top: 10,
    right: 10,
  },
  redCardFreeBadgeText: {
    color: "#E50914",
    fontSize: 8,
    fontWeight: "bold",
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
  selectInput: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
  },
  selectInputText: {
    fontSize: 16,
    color: "#000",
  },
  placeholder: {
    color: "#999",
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
  checkboxContainer: {
    marginTop: 10,
    marginBottom: 20,
  },
  checkboxRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 15,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderWidth: 2,
    borderColor: "#ccc",
    borderRadius: 4,
    marginRight: 10,
    marginTop: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  checkboxChecked: {
    backgroundColor: "#E50914",
    borderColor: "#E50914",
  },
  checkmark: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "bold",
  },
  checkboxText: {
    flex: 1,
    fontSize: 12,
    color: "#333",
    lineHeight: 18,
  },
  linkText: {
    color: "#0068FF",
    textDecorationLine: "underline",
  },
  registerButton: {
    backgroundColor: "#E50914",
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 10,
  },
  registerButtonDisabled: {
    opacity: 0.7,
  },
  registerButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
    letterSpacing: 1,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 20,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#000",
  },
  modalCloseButton: {
    padding: 5,
  },
  modalCloseText: {
    fontSize: 24,
    color: "#666",
  },
  modalOption: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  modalOptionText: {
    fontSize: 16,
    color: "#000",
  },
  datePickerContainer: {
    maxHeight: 300,
  },
  dateOption: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  dateOptionText: {
    fontSize: 16,
    color: "#000",
  },
});

export default RegisterScreen;

