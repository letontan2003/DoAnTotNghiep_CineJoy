import { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  StatusBar,
  ScrollView,
  Platform,
  ActivityIndicator,
  FlatList,
} from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import Fontisto from "@expo/vector-icons/Fontisto";
import { IMovie, IRegion, ITheater, IShowtime } from "@/types/api";
import SideMenu from "@/components/SideMenu";
import {
  getRegionsApi,
  getTheatersApi,
  getShowtimesByTheaterMovieApi,
} from "services/api";
import { useAppSelector } from "@/store/hooks";

const { width, height } = Dimensions.get("window");

type RootStackParamList = {
  HomeScreen: undefined;
  MovieDetailScreen: { movie: IMovie };
  BookTicketScreen: { movie: IMovie };
  MemberScreen: undefined;
  LoginScreen: undefined;
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

type BookTicketScreenNavigationProp = StackNavigationProp<
  RootStackParamList,
  "BookTicketScreen"
>;

type BookTicketScreenRouteProp = {
  key: string;
  name: "BookTicketScreen";
  params: { movie: IMovie };
};

const BookTicketScreen = () => {
  const navigation = useNavigation<BookTicketScreenNavigationProp>();
  const route = useRoute<BookTicketScreenRouteProp>();
  const { movie } = route.params;

  // Lấy thông tin authentication từ Redux store
  const isAuthenticated = useAppSelector((state) => state.app.isAuthenticated);

  const [showSideMenu, setShowSideMenu] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedRegion, setSelectedRegion] = useState<IRegion | null>(null);
  const [regions, setRegions] = useState<IRegion[]>([]);
  const [theaters, setTheaters] = useState<ITheater[]>([]);
  const [filteredTheaters, setFilteredTheaters] = useState<ITheater[]>([]);
  const [showtimes, setShowtimes] = useState<{
    [theaterId: string]: IShowtime;
  }>({});
  const [expandedTheaters, setExpandedTheaters] = useState<{
    [theaterId: string]: boolean;
  }>({});
  const [loading, setLoading] = useState(false);
  const [loadingShowtimes, setLoadingShowtimes] = useState<{
    [theaterId: string]: boolean;
  }>({});

  // Render tên rạp với phần "CNJ" màu đỏ, phần còn lại màu đen
  const renderTheaterName = (name: string) => {
    if (name?.startsWith("CNJ")) {
      const restName = name.slice(3); // Cắt bỏ "CNJ"
      return (
        <Text style={styles.theaterName}>
          <Text style={styles.theaterNamePrefix}>CNJ</Text>
          <Text style={styles.theaterNameRest}>{restName}</Text>
        </Text>
      );
    }
    // Nếu không bắt đầu bằng "CNJ" thì hiển thị bình thường
    return <Text style={styles.theaterName}>{name}</Text>;
  };

  // Hàm mở/đóng side menu
  const toggleSideMenu = () => {
    setShowSideMenu(!showSideMenu);
  };

  const closeSideMenu = () => {
    setShowSideMenu(false);
  };

  // Tạo danh sách ngày (30 ngày từ hôm nay)
  const generateDates = () => {
    const dates = [];
    const today = new Date();

    // Tạo danh sách ngày: từ hôm nay đến 30 ngày sau
    const totalDays = 30;

    for (let i = 0; i < totalDays; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      dates.push(date);
    }

    return dates;
  };

  const dates = generateDates();

  // Tính width của 7 ngày để scroll theo tuần và đảm bảo hiển thị đủ 7 ngày
  // Mỗi tuần chiếm đúng width của màn hình để scroll mượt mà
  const dateItemWidth = width / 7; // Chia đều màn hình cho 7 ngày
  const weekWidth = width; // Mỗi tuần = 1 màn hình

  // Tính toán các vị trí snap (mỗi 7 ngày)
  const snapOffsets = dates
    .map((_, index) => index * dateItemWidth)
    .filter((_, index) => index % 7 === 0);

  // Format ngày để hiển thị
  const formatDateDisplay = (date: Date) => {
    const days = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];
    return days[date.getDay()];
  };

  const formatFullDate = (date: Date) => {
    const days = [
      "Chủ nhật",
      "Thứ hai",
      "Thứ ba",
      "Thứ tư",
      "Thứ năm",
      "Thứ sáu",
      "Thứ bảy",
    ];
    const months = [
      "Tháng 1",
      "Tháng 2",
      "Tháng 3",
      "Tháng 4",
      "Tháng 5",
      "Tháng 6",
      "Tháng 7",
      "Tháng 8",
      "Tháng 9",
      "Tháng 10",
      "Tháng 11",
      "Tháng 12",
    ];
    return `${days[date.getDay()]}, ${date.getDate()} ${
      months[date.getMonth()]
    }, ${date.getFullYear()}`;
  };

  // Format time để hiển thị
  const formatTime = (date: Date) => {
    const hours = date.getHours().toString().padStart(2, "0");
    const minutes = date.getMinutes().toString().padStart(2, "0");
    return `${hours}:${minutes}`;
  };

  // Lấy regions và theaters khi component mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [regionsData, theatersData] = await Promise.all([
          getRegionsApi(),
          getTheatersApi(),
        ]);
        const regionsArray = Array.isArray(regionsData) ? regionsData : [];
        const theatersArray = Array.isArray(theatersData) ? theatersData : [];

        setRegions(regionsArray);
        setTheaters(theatersArray);

        if (regionsArray.length > 0) {
          const hoChiMinhRegion = regionsArray.find(
            (region) =>
              region.name === "Hồ Chí Minh" || region.name === "Ho Chi Minh"
          );
          if (hoChiMinhRegion) {
            setSelectedRegion(hoChiMinhRegion);
          }
        }
      } catch (error) {
        console.error("Error fetching data:", error);
        setRegions([]);
        setTheaters([]);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // Lọc theaters theo region đã chọn
  useEffect(() => {
    if (selectedRegion && Array.isArray(theaters)) {
      const filtered = theaters.filter(
        (theater) => theater.regionId === selectedRegion._id
      );
      setFilteredTheaters(filtered);
    } else {
      setFilteredTheaters([]);
    }
  }, [selectedRegion, theaters]);

  // Lấy showtimes khi chọn theater
  const fetchShowtimesForTheater = async (theaterId: string) => {
    const isCurrentlyExpanded = expandedTheaters[theaterId];

    // Nếu đang expanded, chỉ toggle để đóng lại
    if (isCurrentlyExpanded) {
      setExpandedTheaters((prev) => ({
        ...prev,
        [theaterId]: false,
      }));
      return;
    }

    // Nếu đã có data nhưng chưa expanded, chỉ toggle để mở
    if (showtimes[theaterId]) {
      setExpandedTheaters((prev) => ({
        ...prev,
        [theaterId]: true,
      }));
      return;
    }

    // Chưa có data, fetch và mở
    try {
      setLoadingShowtimes((prev) => ({ ...prev, [theaterId]: true }));
      const showtimesData = await getShowtimesByTheaterMovieApi(
        theaterId,
        movie._id
      );
      if (Array.isArray(showtimesData) && showtimesData.length > 0) {
        setShowtimes((prev) => ({
          ...prev,
          [theaterId]: showtimesData[0],
        }));
      }
      setExpandedTheaters((prev) => ({
        ...prev,
        [theaterId]: true,
      }));
    } catch (error) {
      console.error("Error fetching showtimes:", error);
    } finally {
      setLoadingShowtimes((prev) => ({ ...prev, [theaterId]: false }));
    }
  };

  // Helper function để format date theo local time (không phải UTC)
  const formatLocalDate = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  // Lọc showtimes theo ngày đã chọn và ẩn các suất chiếu quá 5 phút
  const getShowtimesForDate = (showtime: IShowtime, date: Date) => {
    if (
      !showtime ||
      !showtime.showTimes ||
      !Array.isArray(showtime.showTimes)
    ) {
      return [];
    }
    // Sử dụng local date thay vì UTC để tránh lệch timezone
    const dateStr = formatLocalDate(date);
    const now = new Date();

    // Lấy ngày hôm nay (local time) để so sánh
    const today = new Date();
    const todayStr = formatLocalDate(today);

    return showtime.showTimes.filter((st) => {
      if (!st || !st.date) return false;
      const stDate = new Date(st.date);
      // Sử dụng local date thay vì UTC để so sánh đúng
      const stDateStr = formatLocalDate(stDate);

      // Kiểm tra ngày
      if (stDateStr !== dateStr || st.status !== "active") {
        return false;
      }

      // Chỉ kiểm tra "quá 5 phút" nếu suất chiếu là ngày hôm nay
      // Nếu là ngày mai hoặc sau đó, luôn hiển thị
      if (stDateStr === todayStr) {
        // Kiểm tra thời gian: ẩn nếu đã quá 5 phút kể từ lúc phim chiếu
        const showtimeStart = new Date(st.start);
        const timeDiff = now.getTime() - showtimeStart.getTime();
        const minutesDiff = timeDiff / (1000 * 60);

        // Nếu quá 5 phút thì ẩn
        if (minutesDiff > 5) {
          return false;
        }
      }

      return true;
    });
  };

  // Format room name
  const getRoomName = (room: any) => {
    if (typeof room === "object" && room?.name) {
      return room.name;
    }
    return "Rạp";
  };

  const resolveRoomType = (roomData: any): string => {
    if (!roomData) return "2D";
    if (typeof roomData === "object") {
      if (roomData.roomType) {
        return roomData.roomType;
      }
      if (
        typeof roomData.name === "string" &&
        roomData.name.toLowerCase().includes("4dx")
      ) {
        return "4DX";
      }
    } else if (
      typeof roomData === "string" &&
      roomData.toLowerCase().includes("4dx")
    ) {
      return "4DX";
    }
    return "2D";
  };

  const getSessionRoomType = (session: any): string => {
    if (!session) return "2D";
    if (session.roomType) {
      return session.roomType;
    }
    return resolveRoomType(session.room);
  };

  // Group showtimes theo format và room
  const groupShowtimesByFormat = (showtimes: any[]) => {
    if (!Array.isArray(showtimes)) return {};
    const grouped: { [key: string]: any[] } = {};
    showtimes.forEach((st) => {
      if (!st) return;
      const roomName =
        typeof st.room === "object" && st.room?.name ? st.room.name : "Rạp";
      const key = roomName;
      if (!grouped[key]) {
        grouped[key] = [];
      }
      grouped[key].push(st);
    });
    return grouped;
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#000" translucent />

      {/* Sticky Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Fontisto name="arrow-left" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {movie.title.toUpperCase()}
        </Text>
        <View style={styles.headerRight}>
          <TouchableOpacity style={styles.headerIcon} onPress={toggleSideMenu}>
            <Text style={styles.menuIconText}>☰</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Sub Header */}
      <View style={styles.subHeader}>
        <Text style={styles.subHeaderLeft}>Định dạng phim</Text>
        <TouchableOpacity>
          <Text style={styles.subHeaderRight}>TẤT CẢ</Text>
        </TouchableOpacity>
      </View>

      {/* Date Selection Bar */}
      <View style={styles.dateBar}>
        <FlatList
          data={dates}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.dateScrollContent}
          snapToOffsets={snapOffsets}
          snapToAlignment="start"
          decelerationRate="fast"
          pagingEnabled={false}
          bounces={false}
          keyExtractor={(item, index) => index.toString()}
          getItemLayout={(data, index) => ({
            length: dateItemWidth,
            offset: dateItemWidth * index,
            index,
          })}
          renderItem={({ item: date, index }) => {
            const isSelected =
              date.toDateString() === selectedDate.toDateString();
            const isToday = index === 0;
            return (
              <TouchableOpacity
                style={[styles.dateItem, { width: dateItemWidth }]}
                onPress={() => setSelectedDate(date)}
              >
                {isToday ? (
                  <Text style={styles.dateLabel}>Hôm nay</Text>
                ) : (
                  <Text
                    style={[
                      styles.dateDay,
                      isSelected && styles.dateDaySelected,
                    ]}
                  >
                    {formatDateDisplay(date)}
                  </Text>
                )}
                <View
                  style={[
                    styles.dateCircle,
                    isSelected && styles.dateCircleSelected,
                  ]}
                >
                  <Text
                    style={[
                      styles.dateNumber,
                      isSelected && styles.dateNumberSelected,
                    ]}
                  >
                    {date.getDate()}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          }}
        />
        <Text style={styles.fullDateText}>{formatFullDate(selectedDate)}</Text>
      </View>

      {/* Region Selection */}
      <View style={styles.regionSection}>
        <Text style={styles.regionLabel}>Chọn khu vực:</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.regionScrollContent}
        >
          {regions && regions.length > 0 ? (
            regions.map((region) => (
              <TouchableOpacity
                key={region._id}
                style={[
                  styles.regionChip,
                  selectedRegion?._id === region._id &&
                    styles.regionChipSelected,
                ]}
                onPress={() => setSelectedRegion(region)}
              >
                <Text
                  style={[
                    styles.regionChipText,
                    selectedRegion?._id === region._id &&
                      styles.regionChipTextSelected,
                  ]}
                >
                  {region.name}
                </Text>
              </TouchableOpacity>
            ))
          ) : (
            <Text style={styles.emptyText}>Đang tải khu vực...</Text>
          )}
        </ScrollView>
      </View>

      {/* Theaters and Showtimes List */}
      <FlatList
        data={
          filteredTheaters && filteredTheaters.length > 0
            ? filteredTheaters
            : []
        }
        keyExtractor={(item) => item._id}
        renderItem={({ item: theater }) => {
          const isExpanded = expandedTheaters[theater._id];
          const theaterShowtime = showtimes[theater._id];
          const showtimesForDate = theaterShowtime
            ? getShowtimesForDate(theaterShowtime, selectedDate)
            : [];
          const groupedShowtimes = groupShowtimesByFormat(showtimesForDate);

          return (
            <View style={styles.theaterCard}>
              <TouchableOpacity
                style={styles.theaterHeader}
                onPress={() => fetchShowtimesForTheater(theater._id)}
              >
                <View style={styles.theaterHeaderLeft}>
                  {renderTheaterName(theater.name)}
                </View>
                <View style={styles.theaterHeaderRight}>
                  {loadingShowtimes[theater._id] ? (
                    <ActivityIndicator size="small" color="#E50914" />
                  ) : (
                    <Fontisto
                      name={isExpanded ? "angle-up" : "angle-down"}
                      size={20}
                      color="#E50914"
                    />
                  )}
                </View>
              </TouchableOpacity>

              {isExpanded && (
                <View style={styles.showtimesContainer}>
                  {!showtimesForDate || showtimesForDate.length === 0 ? (
                    <Text style={styles.noShowtimeText}>
                      Không có suất chiếu cho ngày này
                    </Text>
                  ) : groupedShowtimes &&
                    Object.keys(groupedShowtimes).length > 0 ? (
                    Object.entries(groupedShowtimes).map(
                      ([format, sessions]) => (
                        <View key={format} style={styles.formatGroup}>
                          <Text style={styles.formatText}>
                            • {getSessionRoomType(sessions?.[0])} Phụ Đề Anh |
                            Rạp {getRoomName(sessions?.[0]?.room)}
                          </Text>
                          <View style={styles.showtimesRow}>
                            {sessions &&
                            Array.isArray(sessions) &&
                            sessions.length > 0
                              ? sessions.map((session, idx) => {
                                  const showtimeId = theaterShowtime?._id || "";
                                  const theaterId = theater._id;
                                  const sessionDate = new Date(session.date);
                                  // Format date theo YYYY-MM-DD để backend parse đúng
                                  const year = sessionDate.getFullYear();
                                  const month = String(
                                    sessionDate.getMonth() + 1
                                  ).padStart(2, "0");
                                  const day = String(
                                    sessionDate.getDate()
                                  ).padStart(2, "0");
                                  const dateStr = `${year}-${month}-${day}`;
                                  const startTimeStr = formatTime(
                                    new Date(session.start)
                                  );
                                  const endTimeStr = session.end
                                    ? formatTime(new Date(session.end))
                                    : undefined;
                                  const roomObj = session.room;
                                  const sessionRoomType =
                                    getSessionRoomType(session);
                                  const roomParam =
                                    typeof roomObj === "object"
                                      ? {
                                          ...roomObj,
                                          roomType:
                                            roomObj.roomType || sessionRoomType,
                                        }
                                      : roomObj;

                                  return (
                                    <TouchableOpacity
                                      key={idx}
                                      style={styles.showtimeButton}
                                      onPress={() => {
                                        // Kiểm tra nếu chưa đăng nhập thì chuyển đến LoginScreen
                                        if (!isAuthenticated) {
                                          navigation.navigate("LoginScreen");
                                          return;
                                        }
                                        // Nếu đã đăng nhập thì chuyển đến SelectSeatScreen
                                        navigation.navigate(
                                          "SelectSeatScreen",
                                          {
                                            movie,
                                            showtimeId,
                                            theaterId,
                                            date: dateStr,
                                            startTime: startTimeStr,
                                            endTime: endTimeStr,
                                            room: roomParam,
                                            theaterName: theater.name,
                                          }
                                        );
                                      }}
                                    >
                                      <Text style={styles.showtimeButtonText}>
                                        {startTimeStr}
                                      </Text>
                                    </TouchableOpacity>
                                  );
                                })
                              : null}
                          </View>
                        </View>
                      )
                    )
                  ) : (
                    <Text style={styles.noShowtimeText}>
                      Không có suất chiếu cho ngày này
                    </Text>
                  )}
                </View>
              )}
            </View>
          );
        }}
        ListHeaderComponent={() => (
          <>
            {loading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#E50914" />
                <Text style={styles.loadingText}>Đang tải...</Text>
              </View>
            ) : !selectedRegion ? (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>
                  Vui lòng chọn khu vực để xem danh sách rạp
                </Text>
              </View>
            ) : null}
          </>
        )}
        ListEmptyComponent={() => {
          if (loading) return null;
          if (!selectedRegion) return null;
          return (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>
                Không có rạp nào trong khu vực này
              </Text>
            </View>
          );
        }}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      />

      {/* Side Menu */}
      <SideMenu visible={showSideMenu} onClose={closeSideMenu} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  header: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop:
      Platform.OS === "android" ? (StatusBar.currentHeight || 0) + 12 : 35,
    paddingBottom: 12,
    backgroundColor: "#000",
    zIndex: 1000,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#fff",
    flex: 1,
    textAlign: "center",
    paddingHorizontal: 8,
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  headerIcon: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  menuIconText: {
    fontSize: 28,
    color: "#fff",
  },
  subHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingTop:
      Platform.OS === "android" ? (StatusBar.currentHeight || 0) + 70 : 100,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  subHeaderLeft: {
    fontSize: 14,
    color: "#333",
    fontWeight: "500",
  },
  subHeaderRight: {
    fontSize: 14,
    color: "#E50914",
    fontWeight: "600",
  },
  dateBar: {
    backgroundColor: "#1a1a1a",
    paddingVertical: 16,
    paddingTop: 20,
  },
  dateScrollContent: {
    paddingBottom: 12,
  },
  dateItem: {
    display: "flex",
    flexDirection: "column",
    gap: 8,
    alignItems: "center",
    justifyContent: "flex-start",
    marginRight: 0,
    height: 80,
  },
  dateLabel: {
    fontSize: 11,
    color: "#E50914",
    marginBottom: 4,
    fontWeight: "500",
    height: 14,
    lineHeight: 14,
    textAlign: "center",
  },
  dateCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "transparent",
    borderWidth: 2,
    borderColor: "#666",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 4,
    flexShrink: 0,
  },
  dateCircleSelected: {
    backgroundColor: "#E50914",
    borderColor: "#E50914",
  },
  dateNumber: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#fff",
  },
  dateNumberSelected: {
    color: "#fff",
  },
  dateDay: {
    fontSize: 12,
    color: "#999",
    height: 14,
    lineHeight: 14,
    marginBottom: 4,
    textAlign: "center",
  },
  dateDaySelected: {
    fontWeight: "600",
  },
  fullDateText: {
    fontSize: 12,
    color: "#fff",
    textAlign: "center",
    marginTop: -15,
  },
  regionSection: {
    backgroundColor: "#fff",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  regionLabel: {
    fontSize: 14,
    color: "#333",
    fontWeight: "600",
    marginBottom: 8,
  },
  regionScrollContent: {
    gap: 8,
  },
  regionChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#f5f5f5",
    marginRight: 8,
    borderWidth: 1,
    borderColor: "#e0e0e0",
  },
  regionChipSelected: {
    backgroundColor: "#E50914",
    borderColor: "#E50914",
  },
  regionChipText: {
    fontSize: 14,
    color: "#666",
    fontWeight: "500",
  },
  regionChipTextSelected: {
    color: "#fff",
    fontWeight: "600",
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: 8,
    paddingBottom: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 40,
  },
  loadingText: {
    color: "#666",
    marginTop: 10,
    fontSize: 14,
  },
  emptyContainer: {
    padding: 40,
    alignItems: "center",
  },
  emptyText: {
    fontSize: 14,
    color: "#999",
    textAlign: "center",
  },
  theaterCard: {
    backgroundColor: "#fff",
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#e0e0e0",
    overflow: "hidden",
  },
  theaterHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  theaterHeaderLeft: {
    flex: 1,
  },
  theaterName: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#000",
  },
  theaterNamePrefix: {
    color: "#E50914",
  },
  theaterNameRest: {
    color: "#555",
  },
  theaterHeaderRight: {
    width: 30,
    alignItems: "flex-end",
  },
  showtimesContainer: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderTopWidth: 1,
    borderTopColor: "#f0f0f0",
  },
  noShowtimeText: {
    fontSize: 14,
    color: "#999",
    textAlign: "center",
    paddingVertical: 20,
  },
  formatGroup: {
    marginTop: 16,
  },
  formatText: {
    fontSize: 14,
    color: "#333",
    marginBottom: 8,
    fontWeight: "500",
  },
  showtimesRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  showtimeButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 6,
    backgroundColor: "#f5f5f5",
    borderWidth: 1,
    borderColor: "#e0e0e0",
    minWidth: 70,
    alignItems: "center",
  },
  showtimeButtonText: {
    fontSize: 14,
    color: "#333",
    fontWeight: "500",
  },
  bottomNav: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    backgroundColor: "#1a1a1a",
    paddingVertical: 12,
    paddingBottom: Platform.OS === "ios" ? 30 : 12,
    borderTopWidth: 1,
    borderTopColor: "#333",
  },
  bottomNavItem: {
    alignItems: "center",
  },
  bottomNavNumber: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#fff",
    marginBottom: 4,
  },
  bottomNavLabel: {
    fontSize: 12,
    color: "#999",
  },
});

export default BookTicketScreen;
