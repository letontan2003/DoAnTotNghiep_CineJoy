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
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import Fontisto from "@expo/vector-icons/Fontisto";
import { useEffect, useRef, useState, useCallback } from "react";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
// Lazy load ImagePicker to avoid crash on app startup with New Architecture
import SideMenu from "@/components/SideMenu";
import { getMovieByIdApi, sendChatbotMessageApi } from "@/services/api";
import Logo from "@/assets/CineJoyLogo.png";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { setChatbotScreenOpen } from "@/store/appSlice";
import AvatarModal from "@/components/AvatarModal";
import { IMovie } from "@/types/api";

dayjs.extend(utc);
dayjs.extend(timezone);
const VN_TZ = "Asia/Ho_Chi_Minh";
const VN_OFFSET_MS = 7 * 60 * 60 * 1000;

const formatVNDateLabel = (isoOrDate: string): string => {
  const t = Date.parse(isoOrDate);
  if (Number.isNaN(t)) return isoOrDate;
  const vn = new Date(t + VN_OFFSET_MS);
  const dd = String(vn.getUTCDate()).padStart(2, "0");
  const mm = String(vn.getUTCMonth() + 1).padStart(2, "0");
  const yyyy = vn.getUTCFullYear();
  return `${dd}/${mm}/${yyyy}`;
};

const formatVNTimeLabel = (isoOrTime: string): string => {
  if (/^\d{1,2}:\d{2}$/.test(isoOrTime)) {
    const [h, m] = isoOrTime.split(":");
    return `${String(h).padStart(2, "0")}:${m}`;
  }
  const t = Date.parse(isoOrTime);
  if (Number.isNaN(t)) return isoOrTime;
  const vn = new Date(t + VN_OFFSET_MS);
  const hh = String(vn.getUTCHours()).padStart(2, "0");
  const mm = String(vn.getUTCMinutes()).padStart(2, "0");
  return `${hh}:${mm}`;
};

type RootStackParamList = {
  ChatbotScreen: undefined;
  MovieDetailScreen: { movie: IMovie };
  SelectSeatScreen: {
    movie: IMovie;
    showtimeId: string;
    theaterId: string;
    date: string;
    startTime: string;
    endTime?: string;
    room: string | { _id: string; name: string; roomType?: string };
    theaterName: string;
  };
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
  movie?: any;
  showtimes?: any[];
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

const ChatbotScreen = () => {
  const navigation = useNavigation<ChatbotScreenNavigationProp>();
  const dispatch = useAppDispatch();
  const user = useAppSelector((state) => state.app.user);
  const [messages, setMessages] = useState<Message[]>(() => [
    {
      id: "bot-welcome",
      sender: "bot",
      text: getWelcomeText(user?.fullName || (user as any)?.name),
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
  const [showSideMenu, setShowSideMenu] = useState(false);
  const [showImageModal, setShowImageModal] = useState(false);
  const [selectedImageUri, setSelectedImageUri] = useState<string | null>(null);
  const scrollViewRef = useRef<ScrollView>(null);

  // Set state khi screen được focus (mở)
  useFocusEffect(
    useCallback(() => {
      dispatch(setChatbotScreenOpen(true));
      return () => {
        // Cleanup khi screen bị unfocus (thoát)
        dispatch(setChatbotScreenOpen(false));
      };
    }, [dispatch])
  );

  useEffect(() => {
    scrollViewRef.current?.scrollToEnd({ animated: true });
  }, [messages]);

  const handlePressShowtime = useCallback(
    (movie: any, showtime: any, st: any) => {
      try {
        const theaterName = showtime?.theaterId?.name || "Rạp CineJoy";
        const theaterId = showtime?.theaterId?._id;
        const showtimeId = showtime?._id;

        if (!theaterId || !showtimeId) {
          Alert.alert("Thông báo", "Không thể mở chọn ghế cho suất chiếu này.");
          return;
        }

        // Dùng raw ISO từ backend để backend so khớp chính xác (nhánh includes('T'))
        const date = st?.date;
        const startTime = st?.start;
        const endTime = st?.end ? formatVNTimeLabel(st.end) : undefined;
        const room = st?.room || "Rạp";

        navigation.navigate("SelectSeatScreen", {
          movie: movie as IMovie,
          showtimeId,
          theaterId,
          theaterName,
          date,
          startTime,
          endTime,
          room,
        });
      } catch (e) {
        console.error("handlePressShowtime error", e);
        Alert.alert("Lỗi", "Không thể mở chọn ghế. Vui lòng thử lại.");
      }
    },
    [navigation]
  );

  const handlePressMovie = useCallback(
    async (movie: any) => {
      try {
        const movieId = movie?._id;
        if (!movieId) {
          Alert.alert("Thông báo", "Không thể mở chi tiết phim.");
          return;
        }
        const fullMovie = await getMovieByIdApi(movieId);
        navigation.navigate("MovieDetailScreen", {
          movie: fullMovie as IMovie,
        });
      } catch (e) {
        console.error("handlePressMovie error", e);
        Alert.alert("Lỗi", "Không thể tải chi tiết phim. Vui lòng thử lại.");
      }
    },
    [navigation]
  );

  const renderMovieAndShowtimes = useCallback(
    (message: Message) => {
      if (message.sender !== "bot") return null;
      const movie = message.movie;
      const showtimes = message.showtimes;

      if (!movie && (!Array.isArray(showtimes) || showtimes.length === 0)) {
        return null;
      }

      const nowMs = Date.now();

      return (
        <View style={styles.payloadContainer}>
          {/* Movie card */}
          {movie && (
            <TouchableOpacity
              activeOpacity={0.9}
              style={styles.movieCard}
              onPress={() => {
                void handlePressMovie(movie);
              }}
            >
              <Image
                source={{ uri: movie?.posterImage || movie?.image }}
                style={styles.moviePoster}
              />
              <View style={styles.movieInfo}>
                <Text style={styles.movieTitle} numberOfLines={2}>
                  {movie?.title || "Phim"}
                </Text>
                <Text style={styles.movieMeta} numberOfLines={1}>
                  {(movie?.genre || []).join(", ")}
                </Text>
                <Text style={styles.movieMeta}>
                  {movie?.duration ? `${movie.duration} phút` : ""}{" "}
                  {movie?.ageRating ? `• ${movie.ageRating}` : ""}
                </Text>
              </View>
            </TouchableOpacity>
          )}

          {/* Showtimes */}
          {Array.isArray(showtimes) && showtimes.length > 0 && movie && (
            <View style={styles.showtimesContainer}>
              <Text style={styles.sectionTitle}>Suất chiếu:</Text>
              {showtimes.map((showtime: any, stIdx: number) => {
                const theaterName = showtime?.theaterId?.name || "Chưa có tên";
                const upcoming =
                  showtime?.showTimes
                    ?.filter((st: any) => {
                      if (st?.status && st.status !== "active") return false;
                      const startMs = Date.parse(st?.start);
                      if (Number.isNaN(startMs)) return false;
                      return startMs >= nowMs - 5 * 60 * 1000;
                    })
                    .sort(
                      (a: any, b: any) =>
                        Date.parse(a?.start) - Date.parse(b?.start)
                    ) || [];

                if (upcoming.length === 0) return null;

                const byDate: Record<string, any[]> = {};
                upcoming.forEach((st: any) => {
                  const key = st?.date ? formatVNDateLabel(st.date) : "N/A";
                  if (!byDate[key]) byDate[key] = [];
                  byDate[key].push(st);
                });

                return (
                  <View key={`theater-${stIdx}`} style={styles.theaterBlock}>
                    <Text style={styles.theaterName}>{theaterName}</Text>
                    {Object.entries(byDate).map(([dateLabel, sts]) => (
                      <View key={`date-${dateLabel}`} style={styles.dateBlock}>
                        <Text style={styles.dateLabel}>{dateLabel}:</Text>
                        <View style={styles.timeChips}>
                          {sts.map((st: any, timeIdx: number) => {
                            const time = st?.start
                              ? formatVNTimeLabel(st.start)
                              : "";
                            const roomName =
                              typeof st?.room === "object"
                                ? st?.room?.name
                                : st?.room || "Rạp";
                            return (
                              <TouchableOpacity
                                key={`time-${timeIdx}`}
                                style={styles.timeChip}
                                onPress={() =>
                                  handlePressShowtime(movie, showtime, st)
                                }
                                activeOpacity={0.85}
                              >
                                <Text style={styles.timeChipText}>{time}</Text>
                                <Text
                                  style={styles.roomChipText}
                                  numberOfLines={1}
                                >
                                  {roomName}
                                </Text>
                              </TouchableOpacity>
                            );
                          })}
                        </View>
                      </View>
                    ))}
                  </View>
                );
              })}
            </View>
          )}
        </View>
      );
    },
    [handlePressShowtime, navigation]
  );

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
      const hasPayload =
        Boolean(response?.movie) ||
        (Array.isArray(response?.showtimes) && response.showtimes.length > 0);
      const replyText = response?.reply?.trim()
        ? response.reply.trim()
        : hasPayload
        ? ""
        : "Xin lỗi, tôi chưa thể phản hồi ngay lúc này. Bạn vui lòng thử lại sau nhé!";
      setMessages((prev) => [
        ...prev,
        {
          id: `bot-${Date.now()}`,
          sender: "bot",
          text: replyText,
          timestamp: Date.now(),
          movie: response?.movie,
          showtimes: response?.showtimes,
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
      // Lazy load ImagePicker to avoid crash on startup
      const ImagePickerModule = await import("expo-image-picker");
      const ImagePicker =
        ImagePickerModule?.default &&
        typeof ImagePickerModule.default === "object"
          ? ImagePickerModule.default
          : ImagePickerModule;

      // Check if module loaded correctly
      if (
        !ImagePicker ||
        typeof ImagePicker.requestMediaLibraryPermissionsAsync !== "function"
      ) {
        console.error(
          "ImagePicker module structure:",
          Object.keys(ImagePickerModule || {})
        );
        throw new Error("ImagePicker module not loaded correctly");
      }

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
        <Text style={styles.headerTitle}>CineJoy hỗ trợ</Text>
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
                    <Image source={Logo} style={styles.avatarImage} />
                  </View>
                )}
                <View
                  style={[
                    styles.messageBubble,
                    message.sender === "user"
                      ? styles.bubbleUser
                      : styles.bubbleBot,
                    message.imageUri && styles.messageBubbleWithImage,
                    !message.text &&
                      message.imageUri &&
                      styles.messageBubbleImageOnly,
                  ]}
                >
                  {message.imageUri && (
                    <TouchableOpacity
                      activeOpacity={0.9}
                      onPress={() => {
                        setSelectedImageUri(message.imageUri || null);
                        setShowImageModal(true);
                      }}
                    >
                      <Image
                        source={{ uri: message.imageUri }}
                        style={[
                          styles.messageImage,
                          !message.text && styles.messageImageOnly,
                        ]}
                      />
                    </TouchableOpacity>
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

                  {renderMovieAndShowtimes(message)}
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
            disabled={(!inputMessage.trim() && !pendingImage) || isProcessing}
          >
            <Fontisto name="paper-plane" size={18} color="#fff" />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      <SideMenu visible={showSideMenu} onClose={closeSideMenu} />

      {/* Image Modal */}
      <AvatarModal
        visible={showImageModal}
        avatarUri={selectedImageUri}
        onClose={() => {
          setShowImageModal(false);
          setSelectedImageUri(null);
        }}
      />
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
    alignItems: "center",
    justifyContent: "center",
  },
  messageBubble: {
    maxWidth: "75%",
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 16,
  },
  messageBubbleWithImage: {
    maxWidth: "85%",
    minWidth: 200,
  },
  messageBubbleImageOnly: {
    overflow: "hidden",
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
  payloadContainer: {
    marginTop: 10,
    gap: 10,
  },
  movieCard: {
    flexDirection: "row",
    gap: 10,
    padding: 10,
    borderRadius: 14,
    backgroundColor: "rgba(15, 23, 42, 0.7)",
    borderWidth: 1,
    borderColor: "#334155",
  },
  moviePoster: {
    width: 62,
    height: 90,
    borderRadius: 10,
    backgroundColor: "#0b1220",
  },
  movieInfo: {
    flex: 1,
    justifyContent: "center",
    gap: 4,
  },
  movieTitle: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 14,
  },
  movieMeta: {
    color: "#cbd5e1",
    fontSize: 12,
  },
  showtimesContainer: {
    gap: 10,
  },
  sectionTitle: {
    color: "#e2e8f0",
    fontSize: 12,
    fontWeight: "700",
  },
  theaterBlock: {
    gap: 8,
  },
  theaterName: {
    color: "#e2e8f0",
    fontSize: 12,
    fontWeight: "700",
  },
  dateBlock: {
    gap: 6,
  },
  dateLabel: {
    color: "#cbd5e1",
    fontSize: 12,
    fontWeight: "600",
  },
  timeChips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  timeChip: {
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 12,
    backgroundColor: "rgba(37, 99, 235, 0.18)",
    borderWidth: 1,
    borderColor: "rgba(37, 99, 235, 0.35)",
    minWidth: 86,
  },
  timeChipText: {
    color: "#93c5fd",
    fontSize: 13,
    fontWeight: "700",
  },
  roomChipText: {
    marginTop: 2,
    color: "#cbd5e1",
    fontSize: 10,
  },
  messageImage: {
    width: "100%",
    height: 200,
    resizeMode: "cover",
    borderRadius: 12,
    marginBottom: 8,
  },
  messageImageOnly: {
    borderRadius: 12,
    marginBottom: 0,
    width: "100%",
    height: 200,
    resizeMode: "cover",
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
  pendingImageContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
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
  avatarImage: {
    width: 34,
    height: 34,
    borderRadius: 17,
  },
});

export default ChatbotScreen;
