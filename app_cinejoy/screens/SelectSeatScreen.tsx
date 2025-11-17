import { useState, useEffect, useCallback, useRef } from "react";
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
  ImageBackground,
  Alert,
} from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import Fontisto from "@expo/vector-icons/Fontisto";
import { IMovie } from "@/types/api";
import {
  getSeatsForShowtimeApi,
  getSeatsWithReservationStatusApi,
  reserveSeatsApi,
} from "services/api";
import { useAppSelector } from "@/store/hooks";
import SideMenu from "@/components/SideMenu";

const { width, height } = Dimensions.get("window");

type RootStackParamList = {
  SelectSeatScreen: {
    movie: IMovie;
    showtimeId: string;
    theaterId: string;
    date: string;
    startTime: string;
    endTime?: string;
    room: string | { _id: string; name: string };
    theaterName: string;
  };
  BookTicketScreen: { movie: IMovie };
};

type SelectSeatScreenNavigationProp = StackNavigationProp<
  RootStackParamList,
  "SelectSeatScreen"
>;

type SelectSeatScreenRouteProp = {
  key: string;
  name: "SelectSeatScreen";
  params: {
    movie: IMovie;
    showtimeId: string;
    theaterId: string;
    date: string;
    startTime: string;
    endTime?: string;
    room: string | { _id: string; name: string };
    theaterName: string;
  };
};

type SeatType = "normal" | "vip" | "couple" | "4dx";
type SeatStatus =
  | "available"
  | "maintenance"
  | "occupied"
  | "selected"
  | "reserved";

interface SeatData {
  seatId: string;
  status: SeatStatus;
  type: SeatType;
  price?: number;
  isReservedByMe?: boolean;
}

const SelectSeatScreen = () => {
  const navigation = useNavigation<SelectSeatScreenNavigationProp>();
  const route = useRoute<SelectSeatScreenRouteProp>();
  const {
    movie,
    showtimeId,
    theaterId,
    date,
    startTime,
    endTime,
    room,
    theaterName,
  } = route.params;

  const user = useAppSelector((state) => state.app.user);
  const isAuthenticated = useAppSelector((state) => state.app.isAuthenticated);

  const [selectedSeats, setSelectedSeats] = useState<string[]>([]);
  const [soldSeats, setSoldSeats] = useState<string[]>([]);
  const [reservedSeats, setReservedSeats] = useState<string[]>([]);
  const [selectedSeatType, setSelectedSeatType] = useState<SeatType | null>(
    null
  );
  const [seatTypeMap, setSeatTypeMap] = useState<Record<string, SeatType>>({});
  const [seatMap, setSeatMap] = useState<Record<string, SeatData>>({});
  const [layoutCols, setLayoutCols] = useState<number>(10);
  const [layoutRows, setLayoutRows] = useState<number>(8);
  const [has4dx, setHas4dx] = useState<boolean>(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showSideMenu, setShowSideMenu] = useState(false);

  const roomId = typeof room === "object" ? room._id : room;
  const roomName = typeof room === "object" ? room.name : room || "Rạp";

  // Side menu handlers
  const toggleSideMenu = () => {
    setShowSideMenu(!showSideMenu);
  };

  const closeSideMenu = () => {
    setShowSideMenu(false);
  };

  // Format date từ YYYY-MM-DD sang DD-MM-YYYY
  const formatDateVN = (dateStr: string): string => {
    if (!dateStr) return dateStr;
    const parts = dateStr.split("-");
    if (parts.length === 3) {
      return `${parts[2]}-${parts[1]}-${parts[0]}`;
    }
    return dateStr;
  };

  // Load seats from API
  useEffect(() => {
    const loadSeats = async () => {
      try {
        setLoading(true);
        setError(null);

        // Backend so sánh room bằng room.name, không phải room._id
        const response = await getSeatsForShowtimeApi(
          showtimeId,
          date,
          startTime,
          roomName
        );

        if (!response) {
          setError("Không nhận được phản hồi từ server");
          return;
        }

        if (!response.status) {
          const errorMsg = response.message || "Không thể tải dữ liệu ghế";
          setError(errorMsg);
          return;
        }

        if (response.status && response.data) {
          const { seats, seatLayout } = response.data;

          if (!seats || !Array.isArray(seats)) {
            setError("Dữ liệu ghế không hợp lệ");
            return;
          }

          if (!seatLayout) {
            setError("Dữ liệu layout ghế không hợp lệ");
            return;
          }

          setLayoutCols(seatLayout.cols || 10);
          setLayoutRows(seatLayout.rows || 8);

          // Build seat map
          const newSeatMap: Record<string, SeatData> = {};
          const newSeatTypeMap: Record<string, SeatType> = {};
          const occupiedSeats: string[] = [];

          seats.forEach((seat) => {
            if (!seat || !seat.seatId) return;

            newSeatMap[seat.seatId] = {
              seatId: seat.seatId,
              status: (seat.status || "available") as SeatStatus,
              type: (seat.type || "normal") as SeatType,
              price: seat.price,
            };
            newSeatTypeMap[seat.seatId] = (seat.type || "normal") as SeatType;

            if (seat.status === "occupied" || seat.status === "selected") {
              occupiedSeats.push(seat.seatId);
            }
          });

          setSeatMap(newSeatMap);
          setSeatTypeMap(newSeatTypeMap);
          setSoldSeats(occupiedSeats);
          setHas4dx(Object.values(newSeatTypeMap).some((t) => t === "4dx"));

          // Load reservation status if authenticated
          if (isAuthenticated && user?._id) {
            try {
              const reservationResponse =
                await getSeatsWithReservationStatusApi(
                  showtimeId,
                  date,
                  startTime,
                  roomName,
                  false
                );

              if (
                reservationResponse &&
                reservationResponse.status &&
                reservationResponse.data &&
                Array.isArray(reservationResponse.data)
              ) {
                const updatedMap = { ...newSeatMap };
                reservationResponse.data.forEach((seatItem) => {
                  if (
                    seatItem &&
                    seatItem.seatId &&
                    updatedMap[seatItem.seatId]
                  ) {
                    if (seatItem.isReservedByMe) {
                      updatedMap[seatItem.seatId].status = "selected";
                      updatedMap[seatItem.seatId].isReservedByMe = true;
                    } else if (
                      seatItem.status === "reserved" ||
                      seatItem.status === "selected"
                    ) {
                      updatedMap[seatItem.seatId].status = "reserved";
                      updatedMap[seatItem.seatId].isReservedByMe = false;
                    }
                  }
                });
                setSeatMap(updatedMap);
              }
            } catch (reservationError) {
              // Silently fail - reservation status is optional
            }
          }
        } else {
          setError(
            response?.message || "Không thể tải dữ liệu ghế. Vui lòng thử lại."
          );
        }
      } catch (err: any) {
        console.error("Error loading seats:", err);
        const errorMessage =
          err?.response?.data?.message ||
          err?.message ||
          "Lỗi kết nối khi tải dữ liệu ghế. Vui lòng thử lại.";
        setError(errorMessage);
      } finally {
        setLoading(false);
      }
    };

    loadSeats();
  }, [showtimeId, date, startTime, roomId, isAuthenticated, user]);

  // Validate seat type selection
  const validateSeatTypeSelection = useCallback(
    (newSeatType: SeatType): boolean => {
      if (selectedSeatType === null) {
        return true;
      }
      if (selectedSeatType === newSeatType) {
        return true;
      }

      const seatTypeNames: Record<SeatType, string> = {
        normal: "Ghế thường",
        vip: "Ghế VIP",
        couple: "Ghế cặp đôi",
        "4dx": "Ghế 4DX",
      };

      Alert.alert(
        "Cảnh báo",
        `Bạn chỉ có thể chọn ${seatTypeNames[selectedSeatType]}. Vui lòng bỏ chọn ghế ${seatTypeNames[selectedSeatType]} trước khi chọn ${seatTypeNames[newSeatType]}.`
      );
      return false;
    },
    [selectedSeatType]
  );

  // Handle seat selection
  const handleSelectSeat = useCallback(
    (seatId: string) => {
      if (!isAuthenticated || !user?._id) {
        Alert.alert("Thông báo", "Vui lòng đăng nhập để chọn ghế.");
        return;
      }

      const seatData = seatMap[seatId];
      if (!seatData) {
        Alert.alert("Lỗi", "Không thể xác định loại ghế!");
        return;
      }

      const seatType = seatData.type;
      const isCurrentlySelected = selectedSeats.includes(seatId);
      const isMaintenance = seatData.status === "maintenance";
      const isSelectedFromServer =
        seatData.status === "reserved" ||
        seatData.status === "occupied" ||
        (seatData.status === "selected" && !seatData.isReservedByMe) ||
        soldSeats.includes(seatId);

      if (isSelectedFromServer || isMaintenance) {
        return;
      }

      if (isCurrentlySelected) {
        // Deselect
        // Nếu là ghế đôi, bỏ chọn cả cặp
        if (seatType === "couple") {
          const row = seatId.charAt(0);
          const col = parseInt(seatId.substring(1));
          const pairCol = col % 2 === 1 ? col + 1 : col - 1;
          const pairSeatId = `${row}${pairCol}`;
          const newSeats = selectedSeats.filter(
            (s) => s !== seatId && s !== pairSeatId
          );
          setSelectedSeats(newSeats);
          if (newSeats.length === 0) {
            setSelectedSeatType(null);
          }
        } else {
          const newSeats = selectedSeats.filter((s) => s !== seatId);
          setSelectedSeats(newSeats);
          if (newSeats.length === 0) {
            setSelectedSeatType(null);
          }
        }
        return;
      }

      // Check max 8 seats
      if (selectedSeats.length >= 8) {
        Alert.alert(
          "Cảnh báo",
          "Bạn chỉ có thể chọn tối đa 8 ghế. Vui lòng bỏ chọn một số ghế trước khi chọn ghế mới."
        );
        return;
      }

      // Validate seat type
      if (!validateSeatTypeSelection(seatType)) {
        return;
      }

      // Handle couple seats
      if (seatType === "couple") {
        const row = seatId.charAt(0);
        const col = parseInt(seatId.substring(1));
        const pairCol = col % 2 === 1 ? col + 1 : col - 1;
        const pairSeatId = `${row}${pairCol}`;
        const pairSeatData = seatMap[pairSeatId];

        if (
          !pairSeatData ||
          pairSeatData.status === "maintenance" ||
          pairSeatData.status === "reserved" ||
          pairSeatData.status === "occupied" ||
          soldSeats.includes(pairSeatId)
        ) {
          Alert.alert("Cảnh báo", "Ghế cặp đôi không khả dụng.");
          return;
        }

        const isPairSelected = selectedSeats.includes(pairSeatId);
        if (isPairSelected) {
          // Deselect both
          setSelectedSeats(
            selectedSeats.filter((s) => s !== seatId && s !== pairSeatId)
          );
          if (selectedSeats.length === 2) {
            setSelectedSeatType(null);
          }
        } else {
          // Select both
          if (selectedSeats.length + 2 > 8) {
            Alert.alert(
              "Cảnh báo",
              "Bạn chỉ có thể chọn tối đa 8 ghế. Vui lòng bỏ chọn một số ghế trước khi chọn ghế cặp đôi mới."
            );
            return;
          }
          if (selectedSeatType === null) {
            setSelectedSeatType(seatType);
          }
          setSelectedSeats([...selectedSeats, seatId, pairSeatId]);
        }
        return;
      }

      // Select single seat
      if (selectedSeatType === null) {
        setSelectedSeatType(seatType);
      }
      setSelectedSeats([...selectedSeats, seatId]);
    },
    [
      selectedSeats,
      selectedSeatType,
      seatMap,
      soldSeats,
      validateSeatTypeSelection,
      isAuthenticated,
      user,
    ]
  );

  // Render seat
  const renderSeat = (seatId: string, rowIndex: number, colIndex: number) => {
    const seatData = seatMap[seatId];
    if (!seatData) {
      return null;
    }

    const isChecked = selectedSeats.includes(seatId);
    const isMaintenance = seatData.status === "maintenance";
    const isSelectedFromServer =
      seatData.status === "reserved" ||
      seatData.status === "occupied" ||
      (seatData.status === "selected" && !seatData.isReservedByMe) ||
      soldSeats.includes(seatId);

    let seatColor = "#d1d5db"; // gray-300
    let borderColor = "#6b7280"; // gray-500

    switch (seatData.type) {
      case "vip":
        seatColor = "#facc15"; // yellow-400
        borderColor = "#ca8a04"; // yellow-600
        break;
      case "couple":
        seatColor = "#f472b6"; // pink-400
        borderColor = "#db2777"; // pink-600
        break;
      case "4dx":
        seatColor = "#a855f7"; // purple-400
        borderColor = "#9333ea"; // purple-600
        break;
    }

    if (isMaintenance) {
      seatColor = "#4b5563"; // gray-600
      borderColor = "#1f2937"; // gray-800
    } else if (isSelectedFromServer) {
      seatColor = "#b3210e"; // red
      borderColor = "#b3210e";
    } else if (isChecked) {
      seatColor = "#2563eb"; // blue-600
      borderColor = "#2563eb";
    }

    return (
      <TouchableOpacity
        key={seatId}
        style={[
          styles.seat,
          {
            backgroundColor: seatColor,
            borderColor: borderColor,
            width: (width - 80) / layoutCols - 4,
            height: (width - 80) / layoutCols - 4,
          },
        ]}
        onPress={() => handleSelectSeat(seatId)}
        disabled={isSelectedFromServer || isMaintenance}
      >
        <Text
          style={[
            styles.seatText,
            (isSelectedFromServer || isChecked) && styles.seatTextWhite,
          ]}
        >
          {seatId}
        </Text>
        {isMaintenance && <Text style={styles.maintenanceIcon}>✕</Text>}
      </TouchableOpacity>
    );
  };

  // Render rows
  const renderRows = () => {
    const rows = [];
    for (let row = 0; row < layoutRows; row++) {
      const rowLetter = String.fromCharCode(65 + row); // A, B, C, ...
      const rowSeats = [];
      for (let col = 0; col < layoutCols; col++) {
        const seatId = `${rowLetter}${col + 1}`;
        rowSeats.push(renderSeat(seatId, row, col));
      }
      rows.push(
        <View key={rowLetter} style={styles.seatRow}>
          {rowSeats}
        </View>
      );
    }
    return rows;
  };

  // Helper functions để convert giữa seatId và tọa độ
  const toCoord = (seatId: string) => {
    const rowChar = seatId.charAt(0);
    const colNum = parseInt(seatId.substring(1), 10);
    return { row: rowChar.charCodeAt(0) - 65, col: colNum - 1 };
  };

  const toSeatId = (row: number, col: number) => {
    return `${String.fromCharCode(65 + row)}${col + 1}`;
  };

  // Validate không chừa ghế trống bên trái/phải (logic giống web)
  const validateNoGapSeats = (): boolean => {
    if (selectedSeats.length === 0) return true;

    const selectedSet = new Set(selectedSeats);
    const soldSet = new Set(soldSeats);
    const reservedSet = new Set(reservedSeats);

    // Hàm kiểm tra ghế có bị chiếm không (bao gồm cả ngoài biên coi như tường)
    const isOccupied = (seatId: string | null): boolean => {
      if (!seatId) return true; // ngoài biên coi như chiếm chỗ (tường)
      return (
        selectedSet.has(seatId) ||
        soldSet.has(seatId) ||
        reservedSet.has(seatId) ||
        (seatMap[seatId] &&
          (seatMap[seatId].status === "reserved" ||
            seatMap[seatId].status === "occupied" ||
            seatMap[seatId].status === "selected"))
      );
    };

    // Kiểm tra từng ghế đã chọn
    for (const seatId of selectedSeats) {
      // Bỏ qua ràng buộc cho ghế cặp đôi (couple)
      const seatType = seatTypeMap[seatId];
      if (seatType === "couple") {
        continue; // Ghế couple không áp dụng ràng buộc single gap
      }

      const { row, col } = toCoord(seatId);

      // Kiểm tra bên trái
      const left = col - 1 >= 0 ? toSeatId(row, col - 1) : null; // ghế kề trái
      const leftFar = col - 2 >= 0 ? toSeatId(row, col - 2) : null; // ghế cách 2 bên trái hoặc null nếu tường
      const leftEmpty =
        left &&
        !selectedSet.has(left) &&
        !soldSet.has(left) &&
        !reservedSet.has(left) &&
        seatMap[left] &&
        seatMap[left].status === "available";

      // Nếu ghế kề trái trống VÀ ghế cách 2 bên trái bị chiếm (hoặc là tường), thì vi phạm
      if (leftEmpty && isOccupied(leftFar)) {
        return false;
      }

      // Kiểm tra bên phải
      const right = col + 1 < layoutCols ? toSeatId(row, col + 1) : null; // ghế kề phải
      const rightFar = col + 2 < layoutCols ? toSeatId(row, col + 2) : null; // ghế cách 2 bên phải hoặc null nếu tường
      const rightEmpty =
        right &&
        !selectedSet.has(right) &&
        !soldSet.has(right) &&
        !reservedSet.has(right) &&
        seatMap[right] &&
        seatMap[right].status === "available";

      // Nếu ghế kề phải trống VÀ ghế cách 2 bên phải bị chiếm (hoặc là tường), thì vi phạm
      if (rightEmpty && isOccupied(rightFar)) {
        return false;
      }
    }

    return true;
  };

  // Handle continue button
  const handleContinue = async () => {
    if (selectedSeats.length === 0) {
      Alert.alert("Thông báo", "Vui lòng chọn ít nhất một ghế.");
      return;
    }

    if (!isAuthenticated || !user?._id) {
      Alert.alert("Thông báo", "Vui lòng đăng nhập để tiếp tục.");
      return;
    }

    // Kiểm tra không chừa ghế trống
    if (!validateNoGapSeats()) {
      Alert.alert(
        "Cảnh báo",
        "Vui lòng không chừa 1 ghế trống bên trái hoặc bên phải của các ghế bạn đã chọn."
      );
      return;
    }

    try {
      // Reserve seats - backend cần room name, không phải room id
      await reserveSeatsApi(
        showtimeId,
        date,
        startTime,
        roomName,
        selectedSeats
      );

      // Navigate to payment screen (you can add this later)
      Alert.alert("Thành công", "Đã tạm giữ ghế thành công!");
      // navigation.navigate("PaymentScreen", { ... });
    } catch (error: any) {
      console.error("Error reserving seats:", error);
      Alert.alert(
        "Lỗi",
        error.message || "Không thể tạm giữ ghế. Vui lòng thử lại."
      );
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#E50914" />
        <Text style={styles.loadingText}>Đang tải dữ liệu...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backButtonText}>Quay lại</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#000" translucent />

      {/* Background Image */}
      <ImageBackground
        // source={require("assets/posterBackground.jpg")}
        style={styles.backgroundImage}
        resizeMode="cover"
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.headerBackButton}
            onPress={() => navigation.goBack()}
          >
            <Fontisto name="arrow-left" size={24} color="#fff" />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>{theaterName}</Text>
            <Text style={styles.headerSubtitle}>
              {roomName} | {formatDateVN(date)} |{" "}
              {endTime ? `${startTime} ~ ${endTime}` : startTime}
            </Text>
          </View>
          <TouchableOpacity style={styles.headerRight} onPress={toggleSideMenu}>
            <Text style={styles.menuIconText}>☰</Text>
          </TouchableOpacity>
        </View>

        {/* Screen indicator */}
        <View style={styles.screenIndicator}>
          <Text style={styles.screenText}>MÀN HÌNH CHIẾU</Text>
        </View>

        {/* Seats Layout */}
        <ScrollView
          style={styles.seatsContainer}
          contentContainerStyle={styles.seatsContent}
          showsVerticalScrollIndicator={false}
        >
          {renderRows()}
        </ScrollView>

        {/* Legend */}
        <View style={styles.legend}>
          <View style={styles.legendSection}>
            <View style={styles.legendRow}>
              {!has4dx && (
                <>
                  <View style={styles.legendItem}>
                    <View
                      style={[
                        styles.legendColor,
                        { backgroundColor: "#d1d5db" },
                      ]}
                    />
                    <Text style={styles.legendText}>Ghế thường</Text>
                  </View>
                  <View style={styles.legendItem}>
                    <View
                      style={[
                        styles.legendColor,
                        { backgroundColor: "#facc15" },
                      ]}
                    />
                    <Text style={styles.legendText}>Ghế VIP</Text>
                  </View>
                  <View style={styles.legendItem}>
                    <View
                      style={[
                        styles.legendColor,
                        { backgroundColor: "#f472b6" },
                      ]}
                    />
                    <Text style={styles.legendText}>Ghế đôi</Text>
                  </View>
                </>
              )}
              {has4dx && (
                <View style={styles.legendItem}>
                  <View
                    style={[styles.legendColor, { backgroundColor: "#a855f7" }]}
                  />
                  <Text style={styles.legendText}>Ghế 4DX</Text>
                </View>
              )}
            </View>
          </View>
          <View style={styles.legendSection}>
            <View style={styles.legendRow}>
              <View style={styles.legendItem}>
                <View
                  style={[styles.legendColor, { backgroundColor: "#2563eb" }]}
                />
                <Text style={styles.legendText}>Ghế đang chọn</Text>
              </View>
              <View style={styles.legendItem}>
                <View
                  style={[styles.legendColor, { backgroundColor: "#b3210e" }]}
                />
                <Text style={styles.legendText}>Ghế đã chọn</Text>
              </View>
              <View style={styles.legendItem}>
                <View
                  style={[
                    styles.legendColor,
                    {
                      backgroundColor: "#4b5563",
                      display: "flex",
                      justifyContent: "center",
                      alignItems: "center",
                    },
                  ]}
                >
                  <Text style={styles.maintenanceIconSmall}>✕</Text>
                </View>
                <Text style={styles.legendText}>Bảo trì</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Bottom Bar */}
        <View style={styles.bottomBar}>
          <View style={styles.bottomInfo}>
            <Text style={styles.movieTitle}>{movie.title}</Text>
            <Text style={styles.movieFormat}>2D Phụ Đề Anh</Text>
            <Text style={styles.selectedSeatsText}>
              {selectedSeats.length > 0
                ? `Đã chọn: ${selectedSeats.length} ghế`
                : "Chưa chọn ghế"}
            </Text>
          </View>
          <TouchableOpacity
            style={[
              styles.continueButton,
              selectedSeats.length === 0 && styles.continueButtonDisabled,
            ]}
            onPress={handleContinue}
            disabled={selectedSeats.length === 0}
          >
            <Text style={styles.continueButtonText}>Đặt Vé</Text>
          </TouchableOpacity>
        </View>
      </ImageBackground>
      <SideMenu visible={showSideMenu} onClose={closeSideMenu} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
  },
  backgroundImage: {
    flex: 1,
    width: "100%",
    height: "100%",
    backgroundColor: "#333",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#000",
  },
  loadingText: {
    color: "#fff",
    marginTop: 10,
    fontSize: 14,
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#000",
    padding: 20,
  },
  errorText: {
    color: "#fff",
    fontSize: 16,
    textAlign: "center",
    marginBottom: 20,
  },
  backButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: "#E50914",
    borderRadius: 8,
  },
  backButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop:
      Platform.OS === "android" ? (StatusBar.currentHeight || 0) + 12 : 30,
    paddingBottom: 12,
    backgroundColor: "#000",
  },
  headerBackButton: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  headerCenter: {
    flex: 1,
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#fff",
  },
  headerSubtitle: {
    fontSize: 12,
    color: "#ccc",
    marginTop: 4,
  },
  headerRight: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  menuIconText: {
    fontSize: 28,
    color: "#fff",
    fontWeight: "bold",
  },
  screenIndicator: {
    alignItems: "center",
    paddingVertical: 20,
  },
  screenText: {
    color: "#fff",
    borderWidth: 1,
    borderColor: "#fff",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    fontSize: 16,
    fontWeight: "500",
    marginTop: 5,
    marginBottom: 15,
  },
  seatsContainer: {
    flex: 1,
  },
  seatsContent: {
    paddingHorizontal: 20,
    paddingBottom: 20,
    alignItems: "center",
  },
  seatRow: {
    flexDirection: "row",
    justifyContent: "center",
    marginBottom: 4,
    gap: 4,
  },
  seat: {
    borderWidth: 2,
    borderRadius: 4,
    justifyContent: "center",
    alignItems: "center",
    marginHorizontal: 2,
  },
  seatText: {
    fontSize: 10,
    fontWeight: "bold",
    color: "#000",
  },
  seatTextWhite: {
    color: "#fff",
  },
  maintenanceIcon: {
    position: "absolute",
    fontSize: 16,
    fontWeight: "bold",
    color: "#ef4444",
  },
  maintenanceIconSmall: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#ef4444",
  },
  legend: {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: "#333",
  },
  legendSection: {
    marginBottom: 20,
  },
  legendTitle: {
    fontSize: 12,
    fontWeight: "600",
    color: "#fff",
    marginBottom: 8,
  },
  legendRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 16,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  legendColor: {
    width: 24,
    height: 24,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: "#666",
  },
  legendText: {
    fontSize: 12,
    color: "#fff",
  },
  bottomBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingBottom: Platform.OS === "ios" ? 30 : 12,
    backgroundColor: "rgba(0, 0, 0, 0.9)",
    borderTopWidth: 1,
    borderTopColor: "#333",
  },
  bottomInfo: {
    flex: 1,
  },
  movieTitle: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#fff",
  },
  movieFormat: {
    fontSize: 12,
    color: "#ccc",
    marginTop: 4,
  },
  selectedSeatsText: {
    fontSize: 12,
    color: "#E50914",
    marginTop: 4,
  },
  continueButton: {
    backgroundColor: "#E50914",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  continueButtonDisabled: {
    backgroundColor: "#666",
    opacity: 0.5,
  },
  continueButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
});

export default SelectSeatScreen;
