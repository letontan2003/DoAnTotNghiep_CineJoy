import {
  View,
  Text,
  StyleSheet,
  StatusBar,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Platform,
  KeyboardAvoidingView,
  Image,
  Alert,
  Animated,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import Fontisto from "@expo/vector-icons/Fontisto";
import { useEffect, useRef, useState } from "react";
import * as ImagePicker from "expo-image-picker";
import SideMenu from "@/components/SideMenu";
import { sendChatbotMessageApi, uploadChatbotImageApi } from "@/services/api";

type RootStackParamList = {
  ChatbotScreen: undefined;
};

type ChatbotScreenNavigationProp = StackNavigationProp<
  RootStackParamList,
  "ChatbotScreen"
>;

type Message = {
  id: string;
  sender: "user" | "bot";
  text: string;
  timestamp: number;
  imageUri?: string;
};

const WELCOME_MESSAGE: Message = {
  id: "bot-welcome",
  sender: "bot",
  text: "CineJoy xin chào! Bạn cần thông tin gì về phim, lịch chiếu, giá vé hay các dịch vụ của rạp không ạ?",
  timestamp: Date.now(),
};

const quickSuggestions = [
  "Lịch chiếu hôm nay",
  "Phim đang hot",
  "Giá vé VIP",
  "Khuyến mãi tuần này",
];

const TypingIndicator = () => {
  const anims = [
    useRef(new Animated.Value(0.2)).current,
    useRef(new Animated.Value(0.2)).current,
    useRef(new Animated.Value(0.2)).current,
  ];

  useEffect(() => {
    const loops = anims.map((anim, index) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(index * 120),
          Animated.timing(anim, {
            toValue: 1,
            duration: 250,
            useNativeDriver: true,
          }),
          Animated.timing(anim, {
            toValue: 0.2,
            duration: 250,
            useNativeDriver: true,
          }),
        ])
      )
    );
    loops.forEach((loop) => loop.start());
    return () => loops.forEach((loop) => loop.stop());
  }, [anims]);

  return (
    <View style={styles.typingDots}>
      {anims.map((anim, idx) => (
        <Animated.View
          key={`dot-${idx}`}
          style={[
            styles.dot,
            {
              opacity: anim,
              transform: [
                {
                  scale: anim.interpolate({
                    inputRange: [0.2, 1],
                    outputRange: [0.8, 1.1],
                  }),
                },
              ],
            },
          ]}
        />
      ))}
    </View>
  );
};

const ChatbotScreen = () => {
  const navigation = useNavigation<ChatbotScreenNavigationProp>();
  const [messages, setMessages] = useState<Message[]>([WELCOME_MESSAGE]);
  const [inputMessage, setInputMessage] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [showSideMenu, setShowSideMenu] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);

  useEffect(() => {
    scrollViewRef.current?.scrollToEnd({ animated: true });
  }, [messages]);

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || isProcessing) return;
    const trimmed = inputMessage.trim();
    const userMessage: Message = {
      id: `user-${Date.now()}`,
      sender: "user",
      text: trimmed,
      timestamp: Date.now(),
    };
    setMessages((prev) => [...prev, userMessage]);
    setInputMessage("");
    setIsProcessing(true);
    try {
      const response = await sendChatbotMessageApi(trimmed);
      const replyText =
        response?.reply?.trim() ||
        "Xin lỗi, tôi chưa thể phản hồi ngay lúc này. Bạn vui lòng thử lại sau nhé!";
      const botMessage: Message = {
        id: `bot-${Date.now()}`,
        sender: "bot",
        text: replyText,
        timestamp: Date.now(),
      };
      setMessages((prev) => [...prev, botMessage]);
    } catch (error) {
      setMessages((prev) => [
        ...prev,
        {
          id: `bot-error-${Date.now()}`,
          sender: "bot",
          text: "Xin lỗi, hệ thống đang bận. Bạn vui lòng thử lại sau một chút nhé!",
          timestamp: Date.now(),
        },
      ]);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSuggestionPress = (text: string) => {
    setInputMessage(text);
  };

  const handlePickImage = async () => {
    if (isProcessing) return;
    try {
      const permission =
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert(
          "Quyền truy cập",
          "CineJoy cần quyền truy cập thư viện ảnh để gửi hình. Hãy cấp quyền trong phần Cài đặt nhé!"
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsMultipleSelection: false,
        base64: true,
        quality: 0.7,
      });

      if (result.canceled) return;

      const asset = result.assets?.[0];
      if (!asset?.uri) {
        Alert.alert("Lỗi", "Không thể đọc ảnh. Bạn vui lòng thử lại.");
        return;
      }

      const base64Source = asset.base64;
      if (!base64Source) {
        Alert.alert("Lỗi", "Không đọc được dữ liệu ảnh. Hãy thử ảnh khác nhé!");
        return;
      }

      const imageMessage: Message = {
        id: `user-img-${Date.now()}`,
        sender: "user",
        text: "📷 Đã gửi hình ảnh",
        timestamp: Date.now(),
        imageUri: asset.uri,
      };

      setMessages((prev) => [...prev, imageMessage]);
      setIsProcessing(true);

      const response = await uploadChatbotImageApi(
        base64Source,
        asset.mimeType || "image/jpeg"
      );
      const replyText =
        response?.reply ||
        "Đã nhận được hình ảnh của bạn. CineJoy sẽ hỗ trợ ngay!";
      setMessages((prev) => [
        ...prev,
        {
          id: `bot-${Date.now()}`,
          sender: "bot",
          text: replyText,
          timestamp: Date.now(),
        },
      ]);
    } catch (error) {
      console.error("handlePickImage error", error);
      setMessages((prev) => [
        ...prev,
        {
          id: `bot-error-${Date.now()}`,
          sender: "bot",
          text: "Xin lỗi, có lỗi khi xử lý ảnh. Bạn vui lòng thử lại sau.",
          timestamp: Date.now(),
        },
      ]);
    } finally {
      setIsProcessing(false);
    }
  };

  const toggleSideMenu = () => setShowSideMenu((prev) => !prev);
  const closeSideMenu = () => setShowSideMenu(false);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0f172a" />
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Fontisto name="arrow-left" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Chatbot hỗ trợ</Text>
        <TouchableOpacity style={styles.menuButton} onPress={toggleSideMenu}>
          <Text style={styles.menuButtonText}>☰</Text>
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        style={styles.chatWrapper}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? 10 : 0}
      >
        <View style={styles.chatContainer}>
          <ScrollView
            ref={scrollViewRef}
            contentContainerStyle={styles.messagesContainer}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {messages.map((message) => (
              <View
                key={message.id}
                style={[
                  styles.messageRow,
                  message.sender === "user" ? styles.rowUser : styles.rowBot,
                ]}
              >
                {message.sender === "bot" && (
                  <View style={styles.avatarBot}>
                    <Text style={styles.avatarText}>CJ</Text>
                  </View>
                )}
                <View
                  style={[
                    styles.messageBubble,
                    message.sender === "user"
                      ? styles.bubbleUser
                      : styles.bubbleBot,
                  ]}
                >
                  {message.imageUri && (
                    <Image
                      source={{ uri: message.imageUri }}
                      style={styles.messageImage}
                    />
                  )}
                  <Text
                    style={[
                      styles.messageText,
                      message.sender === "user"
                        ? styles.messageTextUser
                        : styles.messageTextBot,
                    ]}
                  >
                    {message.text}
                  </Text>
                </View>
              </View>
            ))}
            {isProcessing && (
              <View style={[styles.messageRow, styles.rowBot]}>
                <View style={styles.avatarBot}>
                  <Text style={styles.avatarText}>CJ</Text>
                </View>
                <View style={[styles.messageBubble, styles.bubbleBot]}>
                  <TypingIndicator />
                </View>
              </View>
            )}
          </ScrollView>
        </View>

        {messages.length === 1 && (
          <View style={styles.suggestionContainer}>
            {quickSuggestions.map((suggestion) => (
              <TouchableOpacity
                key={suggestion}
                style={styles.suggestionChip}
                onPress={() => handleSuggestionPress(suggestion)}
              >
                <Text style={styles.suggestionText}>{suggestion}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        <View style={styles.inputContainer}>
          <TouchableOpacity
            style={[
              styles.mediaButton,
              isProcessing && styles.mediaButtonDisabled,
            ]}
            onPress={handlePickImage}
            disabled={isProcessing}
          >
            <Text style={styles.mediaButtonText}>+</Text>
          </TouchableOpacity>
          <TextInput
            style={styles.input}
            placeholder="Nhập nội dung bạn cần hỗ trợ..."
            placeholderTextColor="#94a3b8"
            value={inputMessage}
            onChangeText={setInputMessage}
            multiline
          />
          <TouchableOpacity
            style={[
              styles.sendButton,
              (!inputMessage.trim() || isProcessing) &&
                styles.sendButtonDisabled,
            ]}
            onPress={handleSendMessage}
            disabled={!inputMessage.trim() || isProcessing}
          >
            <Fontisto name="paper-plane" size={18} color="#fff" />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      <SideMenu visible={showSideMenu} onClose={closeSideMenu} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#020617",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 10,
    paddingTop:
      Platform.OS === "android" ? (StatusBar.currentHeight || 0) + 12 : 40,
    paddingBottom: 12,
    backgroundColor: "#020617",
    borderBottomWidth: 1,
    borderBottomColor: "#1f2937",
    marginBottom: 15,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
  },
  menuButton: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  menuButtonText: {
    color: "#fff",
    fontSize: 28,
  },
  chatWrapper: {
    flex: 1,
    backgroundColor: "#020617",
  },
  chatContainer: {
    flex: 1,
    backgroundColor: "#020617",
    paddingHorizontal: 10,
  },
  messagesContainer: {
    paddingBottom: 20,
    gap: 12,
  },
  messageRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 8,
  },
  rowUser: {
    justifyContent: "flex-end",
  },
  rowBot: {
    justifyContent: "flex-start",
  },
  avatarBot: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#f97316",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 12,
  },
  messageBubble: {
    maxWidth: "75%",
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 16,
  },
  bubbleUser: {
    backgroundColor: "#2563eb",
    borderBottomRightRadius: 4,
  },
  bubbleBot: {
    backgroundColor: "#1e293b",
    borderBottomLeftRadius: 4,
  },
  messageText: {
    fontSize: 15,
    lineHeight: 20,
    textAlign: "justify",
  },
  messageTextUser: {
    color: "#fff",
  },
  messageTextBot: {
    color: "#e2e8f0",
  },
  messageImage: {
    width: 180,
    height: 180,
    borderRadius: 12,
    marginBottom: 8,
  },
  typingDots: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#94a3b8",
  },
  suggestionContainer: {
    paddingHorizontal: 10,
    paddingVertical: 10,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    backgroundColor: "#020617",
  },
  suggestionChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#334155",
  },
  suggestionText: {
    color: "#e2e8f0",
    fontSize: 12,
    fontWeight: "500",
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "flex-end",
    paddingHorizontal: 10,
    paddingVertical: 12,
    gap: 12,
    backgroundColor: "#020617",
    borderTopWidth: 1,
    borderTopColor: "#1f2937",
  },
  mediaButton: {
    width: 45,
    height: 45,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#334155",
    backgroundColor: "#1e293b",
    alignItems: "center",
    justifyContent: "center",
  },
  mediaButtonDisabled: {
    opacity: 0.5,
  },
  mediaButtonText: {
    color: "#e2e8f0",
    fontSize: 22,
    fontWeight: "700",
  },
  input: {
    flex: 1,
    minHeight: 44,
    maxHeight: 120,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#334155",
    paddingHorizontal: 10,
    paddingVertical: 10,
    color: "#e2e8f0",
    fontSize: 15,
    backgroundColor: "#1e293b",
  },
  sendButton: {
    width: 45,
    height: 45,
    borderRadius: 18,
    backgroundColor: "#f97316",
    alignItems: "center",
    justifyContent: "center",
  },
  sendButtonDisabled: {
    backgroundColor: "#9ca3af",
  },
});

export default ChatbotScreen;
