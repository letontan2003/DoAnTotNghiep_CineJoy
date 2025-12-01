import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  PanResponder,
  Animated,
  Dimensions,
  ScrollView,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Image,
  Alert,
} from "react-native";
import Fontisto from "@expo/vector-icons/Fontisto";
import * as ImagePicker from "expo-image-picker";
import { sendChatbotMessageApi } from "@/services/api";
import Logo from "@/assets/CineJoyLogo.png";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { setChatbotEnabled } from "@/store/appSlice";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

type Message = {
  id: string;
  sender: "user" | "bot";
  text: string;
  timestamp: number;
  imageUri?: string;
};

const getWelcomeText = (fullName?: string | null) => {
  const raw = fullName?.trim();
  if (raw && raw.length > 0) {
    const parts = raw.split(/\s+/);
    const firstName = parts[parts.length - 1];
    return `CineJoy xin chào ${firstName}! Bạn cần thông tin gì về phim, lịch chiếu, giá vé hay các dịch vụ của rạp không ạ?`;
  }
  return "CineJoy xin chào! Bạn cần thông tin gì về phim, lịch chiếu, giá vé hay các dịch vụ của rạp không ạ?";
};

const quickSuggestions = [
  "Lịch chiếu hôm nay",
  "Phim đang hot",
  "Giá vé VIP",
  "Khuyến mãi tuần này",
];

const TypingIndicator = () => {
  const anims = [
    useRef(new Animated.Value(0)).current,
    useRef(new Animated.Value(0)).current,
    useRef(new Animated.Value(0)).current,
  ];

  useEffect(() => {
    const loops = anims.map((anim, index) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(index * 350),
          Animated.timing(anim, {
            toValue: -6,
            duration: 400,
            useNativeDriver: true,
          }),
          Animated.timing(anim, {
            toValue: 0,
            duration: 400,
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
              transform: [{ translateY: anim }],
            },
          ]}
        />
      ))}
    </View>
  );
};

interface ChatBubbleProps {
  enabled: boolean;
}

const ChatBubble: React.FC<ChatBubbleProps> = ({ enabled }) => {
  const dispatch = useAppDispatch();
  const isChatbotScreenOpen = useAppSelector(
    (state) => state.app.isChatbotScreenOpen
  );
  const currentScreen = useAppSelector((state) => state.app.currentScreen);
  const user = useAppSelector((state) => state.app.user);

  // Danh sách các screen không nên hiển thị bong bóng chat
  const hiddenScreens = ["LoadingScreen", "PosterScreen"];
  const shouldHideBubble =
    currentScreen && hiddenScreens.includes(currentScreen);

  const [isOpen, setIsOpen] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [messages, setMessages] = useState<Message[]>(() => [
    {
      id: "bot-welcome",
      sender: "bot",
      text: getWelcomeText(),
      timestamp: Date.now(),
    },
  ]);
  const [inputMessage, setInputMessage] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [pendingImage, setPendingImage] = useState<{
    uri: string;
    base64: string;
    mimeType: string;
  } | null>(null);

  // Khởi tạo vị trí ban đầu (góc phải trên)
  const initialX = SCREEN_WIDTH - 80; // 60 (bubble size) + 20 (margin)
  const initialY = 100; // Phía trên, tránh status bar và header
  const pan = useRef(
    new Animated.ValueXY({ x: initialX, y: initialY })
  ).current;
  const scrollViewRef = useRef<ScrollView>(null);
  const lastPosition = useRef({ x: initialX, y: initialY });

  // Animation cho modal
  const modalScale = useRef(new Animated.Value(0)).current;
  const modalOpacity = useRef(new Animated.Value(0)).current;
  const modalTranslateX = useRef(new Animated.Value(0)).current;
  const modalTranslateY = useRef(new Animated.Value(0)).current;

  // Animation cho close zone scale
  const closeZoneScale = useRef(new Animated.Value(1)).current;

  // Lưu vị trí bong bóng khi mở modal
  const [bubblePositionOnOpen, setBubblePositionOnOpen] = useState({
    x: initialX,
    y: initialY,
  });

  useEffect(() => {
    scrollViewRef.current?.scrollToEnd({ animated: true });
  }, [messages]);

  // Cập nhật lại câu chào khi thông tin user (tên) thay đổi
  useEffect(() => {
    setMessages((prev) => {
      if (prev.length === 0) {
        return [
          {
            id: "bot-welcome",
            sender: "bot",
            text: getWelcomeText(user?.fullName || (user as any)?.name),
            timestamp: Date.now(),
          },
        ];
      }
      const [first, ...rest] = prev;
      if (first.sender !== "bot") return prev;
      const newText = getWelcomeText(user?.fullName || (user as any)?.name);
      if (first.text === newText) return prev;
      return [{ ...first, text: newText }, ...rest];
    });
  }, [user?.fullName]);

  // Đóng modal khi disabled
  useEffect(() => {
    if (!enabled) {
      setIsOpen(false);
    }
  }, [enabled]);

  useEffect(() => {
    if (isOpen) {
      // Hiệu ứng mở ra giống Messenger - scale và translate từ vị trí bong bóng
      Animated.parallel([
        Animated.spring(modalScale, {
          toValue: 1,
          useNativeDriver: true,
          tension: 50,
          friction: 7,
          overshootClamping: false,
        }),
        Animated.spring(modalTranslateX, {
          toValue: 0,
          useNativeDriver: true,
          tension: 50,
          friction: 7,
        }),
        Animated.spring(modalTranslateY, {
          toValue: 0,
          useNativeDriver: true,
          tension: 50,
          friction: 7,
        }),
        Animated.timing(modalOpacity, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      // Hiệu ứng đóng lại - thu nhỏ và di chuyển về vị trí bong bóng (góc phải phía trên modal)
      // Vị trí bong bóng trong modal khi mở
      const bubbleTop = SCREEN_HEIGHT * 0.07 - 5;
      const bubbleRight = 10;
      const bubbleSize = 60;

      // Center của bong bóng
      const bubbleCenterX = SCREEN_WIDTH - bubbleRight - bubbleSize / 2; // SCREEN_WIDTH - 10 - 30
      const bubbleCenterY = bubbleTop + bubbleSize / 2; // SCREEN_HEIGHT * 0.07 - 5 + 30

      // Center của modal content
      const modalTop = SCREEN_HEIGHT * 0.15; // Modal chiếm 85%, nằm ở dưới cùng
      const modalHeight = SCREEN_HEIGHT * 0.85;
      const modalCenterX = SCREEN_WIDTH / 2;
      const modalCenterY = modalTop + modalHeight / 2;

      // Tính translate để modal thu lại vào bong bóng
      const translateX = bubbleCenterX - modalCenterX;
      const translateY = bubbleCenterY - modalCenterY;

      Animated.parallel([
        Animated.spring(modalScale, {
          toValue: 0.1, // Thu nhỏ về kích thước bong bóng
          useNativeDriver: true,
          tension: 50,
          friction: 7,
        }),
        Animated.spring(modalTranslateX, {
          toValue: translateX,
          useNativeDriver: true,
          tension: 50,
          friction: 7,
        }),
        Animated.spring(modalTranslateY, {
          toValue: translateY,
          useNativeDriver: true,
          tension: 50,
          friction: 7,
        }),
        Animated.timing(modalOpacity, {
          toValue: 0,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [isOpen]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (evt, gestureState) => {
        // Cho phép di chuyển khi có di chuyển đáng kể
        return Math.abs(gestureState.dx) > 2 || Math.abs(gestureState.dy) > 2;
      },
      onPanResponderGrant: () => {
        setIsDragging(true);
        // Lưu vị trí hiện tại
        pan.setOffset({
          x: lastPosition.current.x,
          y: lastPosition.current.y,
        });
        pan.setValue({ x: 0, y: 0 });
      },
      onPanResponderMove: (evt, gestureState) => {
        Animated.event([null, { dx: pan.x, dy: pan.y }], {
          useNativeDriver: false,
        })(evt, gestureState);

        // Tính vị trí hiện tại của bong bóng
        const currentX = lastPosition.current.x + gestureState.dx;
        const currentY = lastPosition.current.y + gestureState.dy;

        // Kiểm tra nếu bong bóng đang trong vùng close
        const closeZoneX = SCREEN_WIDTH / 2;
        const closeZoneCenterY = SCREEN_HEIGHT - 100;
        const closeZoneRadius = 80;
        const closeZoneY = SCREEN_HEIGHT - 150;

        const distanceFromClose = Math.sqrt(
          Math.pow(currentX - closeZoneX, 2) +
            Math.pow(currentY - closeZoneCenterY, 2)
        );

        // Nếu trong vùng close, scale lên, nếu không thì scale về 1
        if (distanceFromClose < closeZoneRadius && currentY > closeZoneY) {
          // Scale lên tức thì (không animation)
          closeZoneScale.setValue(1.3);
        } else {
          // Scale về bình thường tức thì
          closeZoneScale.setValue(1);
        }
      },
      onPanResponderRelease: (evt, gestureState) => {
        setIsDragging(false);

        // Reset close zone scale về 1 tức thì
        closeZoneScale.setValue(1);

        // Tính vị trí mới dựa trên vị trí ban đầu + gesture
        const newX = lastPosition.current.x + gestureState.dx;
        const newY = lastPosition.current.y + gestureState.dy;

        // Kiểm tra nếu kéo xuống vùng close icon (footer) - KIỂM TRA TRƯỚC KHI FLATTEN
        const closeZoneY = SCREEN_HEIGHT - 150; // Vùng close icon
        const closeZoneX = SCREEN_WIDTH / 2; // Ở giữa màn hình
        const closeZoneRadius = 80; // Bán kính vùng close
        const closeZoneCenterY = SCREEN_HEIGHT - 100; // Tọa độ Y của center close zone

        const distanceFromClose = Math.sqrt(
          Math.pow(newX - closeZoneX, 2) + Math.pow(newY - closeZoneCenterY, 2)
        );

        // Kiểm tra vùng close - nếu trong vùng thì đóng modal ngay
        if (distanceFromClose < closeZoneRadius && newY > closeZoneY) {
          // Tắt CNJ hỗ trợ trong Settings trước
          dispatch(setChatbotEnabled(false));
          // Đóng modal
          setIsOpen(false);
          // Reset vị trí bong bóng về ban đầu ngay lập tức (không animate)
          lastPosition.current = { x: initialX, y: initialY };
          pan.setOffset({ x: 0, y: 0 });
          pan.setValue({ x: initialX, y: initialY });
          // Dừng tất cả animation đang chạy
          pan.stopAnimation();
          return; // Return ngay, không chạy logic bên dưới
        }

        // Flatten offset để merge vào giá trị chính
        pan.flattenOffset();

        // Lấy giá trị hiện tại sau khi flatten
        const currentX = (pan.x as any)._value;
        const currentY = (pan.y as any)._value;

        // Giới hạn để bong bóng không ra ngoài màn hình
        // Cho phép chạm đến các cạnh màn hình nhưng không ra ngoài
        const bubbleSize = 60;
        const maxX = SCREEN_WIDTH - bubbleSize; // Cạnh phải màn hình
        const maxY = SCREEN_HEIGHT - bubbleSize; // Cạnh dưới màn hình
        const minX = 0; // Cạnh trái màn hình
        const minY = 0; // Cạnh trên màn hình

        // Giới hạn vị trí trong phạm vi màn hình
        let finalX = Math.max(minX, Math.min(currentX, maxX));
        let finalY = Math.max(minY, Math.min(currentY, maxY));

        // Lưu vị trí mới (đã được giới hạn trong màn hình)
        lastPosition.current = { x: finalX, y: finalY };

        // Set giá trị trực tiếp (không cần animate nếu đã ở đúng vị trí)
        if (
          Math.abs(finalX - currentX) < 1 &&
          Math.abs(finalY - currentY) < 1
        ) {
          // Đã ở đúng vị trí, chỉ cần set lại để đảm bảo
          pan.setValue({ x: finalX, y: finalY });
        } else {
          // Animate đến vị trí mới nếu cần điều chỉnh
          Animated.spring(pan, {
            toValue: { x: finalX, y: finalY },
            useNativeDriver: false,
            tension: 50,
            friction: 7,
          }).start(() => {
            // Đảm bảo giá trị cuối cùng được set đúng
            pan.setValue({ x: finalX, y: finalY });
          });
        }
      },
    })
  ).current;

  const handleSendMessage = async () => {
    const trimmed = inputMessage.trim();
    if ((!trimmed && !pendingImage) || isProcessing) return;

    const imageToSend = pendingImage;
    const userMessage: Message = {
      id: `user-${Date.now()}`,
      sender: "user",
      text: trimmed,
      timestamp: Date.now(),
      imageUri: imageToSend?.uri,
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputMessage("");
    setPendingImage(null);
    setIsProcessing(true);

    try {
      const response = await sendChatbotMessageApi({
        message: trimmed || undefined,
        imageBase64: imageToSend?.base64,
        mimeType: imageToSend?.mimeType,
      });
      const replyText =
        response?.reply?.trim() ||
        "Xin lỗi, tôi chưa thể phản hồi ngay lúc này. Bạn vui lòng thử lại sau nhé!";
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
      setPendingImage({
        uri: asset.uri,
        base64: base64Source,
        mimeType: asset.mimeType || "image/jpeg",
      });
    } catch (error) {
      console.error("handlePickImage error", error);
      Alert.alert("Lỗi", "Không thể chọn ảnh. Bạn vui lòng thử lại sau.");
    }
  };

  // Ẩn bong bóng nếu:
  // - Chatbot không được bật
  // - ChatbotScreen đang mở
  // - Đang ở LoadingScreen hoặc PosterScreen
  if (!enabled || isChatbotScreenOpen || shouldHideBubble) return null;

  return (
    <>
      {/* Floating Bubble Button - Render bên ngoài modal khi chưa mở */}
      {!isOpen && (
        <>
          {/* Close Icon ở footer khi đang di chuyển */}
          {isDragging && (
            <Animated.View style={styles.closeZoneContainer}>
              <Animated.View
                style={[
                  styles.closeZone,
                  {
                    transform: [{ scale: closeZoneScale }],
                  },
                ]}
              >
                <Fontisto name="close-a" size={26} color="#fff" />
              </Animated.View>
            </Animated.View>
          )}

          <Animated.View
            style={[
              styles.bubbleContainer,
              {
                transform: [{ translateX: pan.x }, { translateY: pan.y }],
              },
            ]}
            {...panResponder.panHandlers}
            pointerEvents="box-none"
          >
            <TouchableOpacity
              style={styles.bubbleButton}
              onPress={() => {
                // Lưu vị trí hiện tại của bong bóng
                const currentBubbleX = lastPosition.current.x;
                const currentBubbleY = lastPosition.current.y;
                setBubblePositionOnOpen({
                  x: currentBubbleX,
                  y: currentBubbleY,
                });

                // Modal sẽ mở từ vị trí phía dưới bong bóng và mở từ trên xuống
                const bubbleBottomY = currentBubbleY + 60; // Phần dưới của bong bóng
                const modalHeight = SCREEN_HEIGHT * 0.85; // 85% chiều cao màn hình

                // Modal được render với justifyContent: "flex-end", nên bottom = SCREEN_HEIGHT
                // Modal top cuối cùng = SCREEN_HEIGHT - modalHeight = SCREEN_HEIGHT * 0.15
                // Để modal bắt đầu từ vị trí bubbleBottomY (top = bubbleBottomY):
                // translateY = bubbleBottomY - (SCREEN_HEIGHT - modalHeight)
                // translateY = bubbleBottomY - SCREEN_HEIGHT * 0.15
                const translateY =
                  bubbleBottomY - (SCREEN_HEIGHT - modalHeight);

                // Set giá trị ban đầu cho animation
                modalTranslateX.setValue(0);
                modalTranslateY.setValue(translateY);

                setIsOpen(true);
              }}
              activeOpacity={0.8}
            >
              <Image source={Logo} style={styles.bubbleLogo} />
            </TouchableOpacity>
          </Animated.View>
        </>
      )}

      {/* Chat Modal */}
      <Modal
        visible={isOpen}
        transparent
        animationType="none"
        onRequestClose={() => setIsOpen(false)}
      >
        <Animated.View
          style={[
            styles.modalOverlay,
            {
              opacity: modalOpacity,
            },
          ]}
          pointerEvents="box-none"
        >
          <KeyboardAvoidingView
            style={{ flex: 1, justifyContent: "flex-end", zIndex: 1 }}
            behavior={Platform.OS === "ios" ? "padding" : undefined}
            keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 0}
            pointerEvents="box-none"
          >
            <Animated.View
              style={[
                styles.modalContent,
                {
                  transform: [
                    {
                      scale: modalScale.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0.1, 1], // Scale từ rất nhỏ (kích thước bong bóng) lên đầy đủ
                      }),
                    },
                    {
                      translateX: modalTranslateX,
                    },
                    {
                      translateY: modalTranslateY,
                    },
                  ],
                  opacity: modalOpacity,
                  zIndex: 1, // Thấp hơn bong bóng
                },
              ]}
            >
              {/* Header */}
              <View style={styles.modalHeader}>
                <View style={styles.headerLeft}>
                  <Image source={Logo} style={styles.headerLogo} />
                  <Text style={styles.headerTitle}>CineJoy hỗ trợ</Text>
                </View>
                <TouchableOpacity
                  style={styles.closeButton}
                  onPress={() => setIsOpen(false)}
                >
                  <Fontisto name="close-a" size={20} color="#fff" />
                </TouchableOpacity>
              </View>

              {/* Messages */}
              <ScrollView
                ref={scrollViewRef}
                style={styles.messagesScroll}
                contentContainerStyle={styles.messagesContainer}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
                keyboardDismissMode="interactive"
              >
                {messages.map((message) => (
                  <View
                    key={message.id}
                    style={[
                      styles.messageRow,
                      message.sender === "user"
                        ? styles.rowUser
                        : styles.rowBot,
                    ]}
                  >
                    {message.sender === "bot" && (
                      <View style={styles.avatarBot}>
                        <Image source={Logo} style={styles.avatarImage} />
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
                      {!!message.text && (
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
                      )}
                    </View>
                  </View>
                ))}
                {isProcessing && (
                  <View style={[styles.messageRow, styles.rowBot]}>
                    <View style={styles.avatarBot}>
                      <Image source={Logo} style={styles.avatarImage} />
                    </View>
                    <View style={[styles.messageBubble, styles.bubbleBot]}>
                      <TypingIndicator />
                    </View>
                  </View>
                )}
              </ScrollView>

              {/* Quick Suggestions */}
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

              {/* Pending Image */}
              {pendingImage && (
                <View style={styles.pendingImageContainer}>
                  <Image
                    source={{ uri: pendingImage.uri }}
                    style={styles.pendingImage}
                  />
                  <TouchableOpacity
                    style={styles.removePendingButton}
                    onPress={() => setPendingImage(null)}
                  >
                    <Text style={styles.removePendingText}>×</Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* Input */}
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
                    ((!inputMessage.trim() && !pendingImage) || isProcessing) &&
                      styles.sendButtonDisabled,
                  ]}
                  onPress={handleSendMessage}
                  disabled={
                    (!inputMessage.trim() && !pendingImage) || isProcessing
                  }
                >
                  <Fontisto name="paper-plane" size={18} color="#fff" />
                </TouchableOpacity>
              </View>
            </Animated.View>
          </KeyboardAvoidingView>

          {/* Floating Bubble Button - Render SAU modal content để đảm bảo hiển thị trên */}
          {/* Khi modal mở, bong bóng luôn ở góc phải phía trên của modal content */}
          <Animated.View
            style={[
              styles.bubbleContainerModal,
              {
                // Modal content chiếm 85% chiều cao và nằm ở dưới cùng
                // Top của modal = SCREEN_HEIGHT * 0.15
                // Đặt bong bóng ngay phía trên header của modal
                top: SCREEN_HEIGHT * 0.07 - 5, // Gần với header của modal
                right: 10,
                zIndex: 10003, // Cao hơn modal content
                elevation: 10003, // Android
              },
            ]}
            {...panResponder.panHandlers}
            pointerEvents="box-none"
          >
            <TouchableOpacity
              style={styles.bubbleButton}
              onPress={() => setIsOpen(false)}
              activeOpacity={0.8}
            >
              <Image source={Logo} style={styles.bubbleLogo} />
            </TouchableOpacity>
          </Animated.View>
        </Animated.View>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  bubbleContainer: {
    position: "absolute",
    zIndex: 10002, // Cao hơn modal để luôn hiển thị ở trên
    width: 60,
    height: 60,
    elevation: 10002, // Android
  },
  bubbleContainerModal: {
    position: "absolute",
    width: 60,
    height: 60,
    zIndex: 10003,
    elevation: 10003, // Android
  },
  bubbleButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  bubbleLogo: {
    width: 70,
    height: 70,
    borderRadius: 20,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
    overflow: "visible", // Cho phép bong bóng hiển thị ngoài overlay
  },
  modalContent: {
    height: "85%",
    maxHeight: "85%",
    backgroundColor: "#020617",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    justifyContent: "flex-end",
    zIndex: 1,
    elevation: 1, // Android
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#1f2937",
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  headerLogo: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  headerTitle: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
  },
  closeButton: {
    width: 36,
    height: 36,
    justifyContent: "center",
    alignItems: "center",
  },
  messagesScroll: {
    flex: 1,
  },
  messagesContainer: {
    padding: 16,
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
    alignItems: "center",
    justifyContent: "center",
  },
  avatarImage: {
    width: 34,
    height: 34,
    borderRadius: 17,
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
    width: "100%",
    height: 200,
    resizeMode: "cover",
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
    paddingHorizontal: 16,
    paddingVertical: 10,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
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
  pendingImageContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    marginBottom: 6,
    gap: 12,
  },
  pendingImage: {
    width: 64,
    height: 64,
    borderRadius: 12,
  },
  removePendingButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#ef4444",
    alignItems: "center",
    justifyContent: "center",
  },
  removePendingText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "700",
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "flex-end",
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
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
  closeZoneContainer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 100,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 10000,
    pointerEvents: "none",
  },
  closeZone: {
    width: 70,
    height: 70,
    borderRadius: 40,
    backgroundColor: "rgba(239, 68, 68, 0.9)",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  closeZoneText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "600",
    marginTop: 4,
  },
});

export default ChatBubble;
