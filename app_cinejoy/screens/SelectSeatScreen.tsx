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
  Modal,
} from "react-native";
import {
  useNavigation,
  useRoute,
  useFocusEffect,
} from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import Fontisto from "@expo/vector-icons/Fontisto";
import { IMovie } from "@/types/api";
import {
  getSeatsForShowtimeApi,
  getSeatsWithReservationStatusApi,
  reserveSeatsApi,
  releaseSeatsApi,
  getCurrentPriceListApi,
  IPriceList,
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
    room: string | { _id: string; name: string; roomType?: string };
    theaterName: string;
  };
  BookTicketScreen: { movie: IMovie };
  ComboSelectionScreen: {
    movie: IMovie;
    showtimeId: string;
    theaterId: string;
    date: string;
    startTime: string;
    endTime?: string;
    room: string | { _id: string; name: string; roomType?: string };
    roomName: string;
    theaterName: string;
    selectedSeats: string[];
    totalTicketPrice: number;
    seatTypeCounts: SeatTypeCounts;
    seatTypeMap: Record<string, SeatType>;
  };
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
    room: string | { _id: string; name: string; roomType?: string };
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

type SeatTypeCounts = Record<SeatType, number>;

const resolveRoomTypeFromParam = (
  roomData: string | { _id: string; name: string; roomType?: string }
): string => {
  if (typeof roomData === "object") {
    if (roomData?.roomType) {
      return roomData.roomType;
    }
    if (roomData?.name && roomData.name.toLowerCase().includes("4dx")) {
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

const parseMinAgeFromAgeRating = (ageRating?: string): number => {
  if (!ageRating) {
    return 13;
  }
  const digits = ageRating.match(/\d+/);
  if (digits && digits[0]) {
    const parsed = parseInt(digits[0], 10);
    if (!Number.isNaN(parsed)) {
      return parsed;
    }
  }
  if (ageRating.trim().toUpperCase().startsWith("P")) {
    return 0;
  }
  return 13;
};

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
  const [ticketPrices, setTicketPrices] = useState<Record<string, number>>({});
  const [totalTicketPrice, setTotalTicketPrice] = useState<number>(0);
  const [confirmVisible, setConfirmVisible] = useState(false);
  const [confirmLoading, setConfirmLoading] = useState(false);

  // Lưu lại các ghế đã reserve để giải phóng khi quay lại
  const reservedSeatsRef = useRef<string[]>([]);
  const hasReservedSeatsRef = useRef<boolean>(false);

  const roomId = typeof room === "object" ? room._id : room;
  const roomName = typeof room === "object" ? room.name : room || "Rạp";
  const roomTypeLabel = resolveRoomTypeFromParam(room);
  const minAge = parseMinAgeFromAgeRating(movie?.ageRating);
  const showUnder16Notice = minAge < 16;

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

  // Load giá vé từ bảng giá đang hoạt động
  useEffect(() => {
    const loadTicketPrices = async () => {
      try {
        const priceList: IPriceList | null = await getCurrentPriceListApi();

        if (!priceList) {
          setTicketPrices({});
          return;
        }

        if (!priceList.lines || !Array.isArray(priceList.lines)) {
          setTicketPrices({});
          return;
        }

        const map: Record<string, number> = {};
        priceList.lines.forEach((line) => {
          if (line.type === "ticket" && line.seatType) {
            map[line.seatType] = line.price || 0;
          }
        });

        setTicketPrices(map);
      } catch (error) {
        console.error("❌ Error loading ticket prices:", error);
        setTicketPrices({});
      }
    };
    loadTicketPrices();
  }, []);

  // Tính tổng tiền vé theo loại ghế và giá từ bảng giá
  useEffect(() => {
    if (!selectedSeats || selectedSeats.length === 0) {
      setTotalTicketPrice(0);
      return;
    }

    const total = selectedSeats.reduce((sum, seatId) => {
      const st = seatTypeMap[seatId];
      const price = ticketPrices[st];
      if (price === undefined || price === null) {
        return sum;
      }
      return sum + price;
    }, 0);

    setTotalTicketPrice(total);
  }, [selectedSeats, seatTypeMap, ticketPrices]);

  const loadSeats = useCallback(async () => {
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
            const reservationResponse = await getSeatsWithReservationStatusApi(
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
              const myReservedSeats: string[] = [];

              reservationResponse.data.forEach((seatItem) => {
                if (
                  seatItem &&
                  seatItem.seatId &&
                  updatedMap[seatItem.seatId]
                ) {
                  if (seatItem.isReservedByMe) {
                    updatedMap[seatItem.seatId].status = "selected";
                    updatedMap[seatItem.seatId].isReservedByMe = true;
                    // Lưu lại các ghế đang được reserve bởi user
                    myReservedSeats.push(seatItem.seatId);
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

              // Lưu danh sách ghế đang được reserve để giải phóng khi quay lại
              if (myReservedSeats.length > 0) {
                reservedSeatsRef.current = myReservedSeats;
                hasReservedSeatsRef.current = true;
              } else {
                reservedSeatsRef.current = [];
                hasReservedSeatsRef.current = false;
              }
            }
          } catch (reservationError) {
            console.error(
              "[SelectSeatScreen] loadSeats - reservation status error:",
              reservationError
            );
            // Silently fail - reservation status is optional
          }
        }
      } else {
        setError(
          response?.message || "Không thể tải dữ liệu ghế. Vui lòng thử lại."
        );
      }
    } catch (err: any) {
      console.error("[SelectSeatScreen] loadSeats - error:", err);
      const errorMessage =
        err?.response?.data?.message ||
        err?.message ||
        "Lỗi kết nối khi tải dữ liệu ghế. Vui lòng thử lại.";
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [showtimeId, date, startTime, roomName, isAuthenticated, user]);

  const releaseReservedSeats = useCallback(async (): Promise<boolean> => {
    let seatsToRelease: string[] = [];

    if (hasReservedSeatsRef.current && reservedSeatsRef.current.length > 0) {
      seatsToRelease = [...reservedSeatsRef.current];
    } else if (isAuthenticated && user?._id) {
      try {
        const reservationResponse = await getSeatsWithReservationStatusApi(
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
          const myReservedSeats = reservationResponse.data
            .filter((seatItem) => seatItem.isReservedByMe && seatItem.seatId)
            .map((seatItem) => seatItem.seatId);

          if (myReservedSeats.length > 0) {
            seatsToRelease = myReservedSeats;
          }
        }
      } catch (error) {
        console.error(
          "[SelectSeatScreen] releaseReservedSeats - error checking reserved seats",
          error
        );
      }
    }

    if (seatsToRelease.length === 0) {
      return false;
    }

    reservedSeatsRef.current = [];
    hasReservedSeatsRef.current = false;

    try {
      await releaseSeatsApi(
        showtimeId,
        date,
        startTime,
        roomName,
        seatsToRelease
      );
    } catch (error) {
      console.error(
        "[SelectSeatScreen] releaseReservedSeats - release error",
        error
      );
      // Vẫn tiếp tục loadSeats để đảm bảo UI cập nhật
    }

    setSelectedSeats([]);
    setSelectedSeatType(null);
    return true;
  }, [date, isAuthenticated, roomName, showtimeId, startTime, user]);

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

  const canProceedToBooking = useCallback((): boolean => {
    if (selectedSeats.length === 0) {
      Alert.alert("Thông báo", "Vui lòng chọn ít nhất một ghế.");
      return false;
    }

    if (!isAuthenticated || !user?._id) {
      Alert.alert("Thông báo", "Vui lòng đăng nhập để tiếp tục.");
      return false;
    }

    if (!validateNoGapSeats()) {
      Alert.alert(
        "Cảnh báo",
        "Vui lòng không chừa 1 ghế trống bên trái hoặc bên phải của các ghế bạn đã chọn."
      );
      return false;
    }

    return true;
  }, [isAuthenticated, selectedSeats, user, validateNoGapSeats]);

  const handleOpenConfirmModal = useCallback(() => {
    if (canProceedToBooking()) {
      setConfirmVisible(true);
    }
  }, [canProceedToBooking]);

  const handleCancelConfirm = useCallback(() => {
    if (!confirmLoading) {
      setConfirmVisible(false);
    }
  }, [confirmLoading]);

  const buildSeatTypeCounts = useCallback((): SeatTypeCounts => {
    return selectedSeats.reduce((acc, seatId) => {
      const seatType = seatTypeMap[seatId] || "normal";
      acc[seatType] = (acc[seatType] || 0) + 1;
      return acc;
    }, {} as SeatTypeCounts);
  }, [seatTypeMap, selectedSeats]);

  // Handle continue button
  const handleContinue = async () => {
    if (!canProceedToBooking()) {
      setConfirmVisible(false);
      return;
    }

    try {
      setConfirmLoading(true);
      await reserveSeatsApi(
        showtimeId,
        date,
        startTime,
        roomName,
        selectedSeats
      );

      // Lưu lại các ghế đã reserve để giải phóng khi quay lại
      reservedSeatsRef.current = [...selectedSeats];
      hasReservedSeatsRef.current = true;

      setConfirmVisible(false);
      const seatTypeCounts = buildSeatTypeCounts();
      navigation.navigate("ComboSelectionScreen", {
        movie,
        showtimeId,
        theaterId,
        date,
        startTime,
        endTime,
        room,
        roomName,
        theaterName,
        selectedSeats,
        totalTicketPrice,
        seatTypeCounts,
        seatTypeMap,
      });
    } catch (error: any) {
      console.error("Error reserving seats:", error);
      Alert.alert(
        "Lỗi",
        error.message || "Không thể tạm giữ ghế. Vui lòng thử lại."
      );
    } finally {
      setConfirmLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      let isActive = true;

      const syncSeats = async () => {
        await releaseReservedSeats();
        if (!isActive) return;
        await loadSeats();
      };

      syncSeats();

      return () => {
        isActive = false;
      };
    }, [releaseReservedSeats, loadSeats])
  );

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
            <View style={styles.movieTitleRow}>
              <Text style={styles.movieTitle}>{movie.title}</Text>
              {movie.ageRating && (
                <View style={styles.ageRatingBadge}>
                  <Text style={styles.ageRatingText}>{movie.ageRating}</Text>
                </View>
              )}
            </View>
            <Text style={styles.movieFormat}>{roomTypeLabel} Phụ Đề Anh</Text>
            <View style={styles.priceAndSeatsRow}>
              <Text style={styles.totalPriceText}>
                {totalTicketPrice.toLocaleString("vi-VN")} ₫
              </Text>
              <Text style={styles.selectedSeatsText}>
                {selectedSeats.length} ghế
              </Text>
            </View>
          </View>
          <TouchableOpacity
            style={[
              styles.continueButton,
              (selectedSeats.length === 0 || confirmLoading) &&
                styles.continueButtonDisabled,
            ]}
            onPress={handleOpenConfirmModal}
            disabled={selectedSeats.length === 0 || confirmLoading}
          >
            <Text style={styles.continueButtonText}>Đặt Vé</Text>
          </TouchableOpacity>
        </View>
      </ImageBackground>
      <Modal
        transparent
        animationType="fade"
        visible={confirmVisible}
        onRequestClose={handleCancelConfirm}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.confirmModal}>
            <Text style={styles.confirmTitle}>Xác nhận</Text>
            <Text style={styles.confirmMessage}>
              Tôi xác nhận mua vé cho người xem từ đủ {minAge} tuổi trở lên và
              đồng ý cung cấp giấy tờ tùy thân để xác thực độ tuổi người xem.
              CGV sẽ không hoàn tiền nếu người xem không đáp ứng đủ điều kiện.
            </Text>
            <Text style={styles.confirmMessage}>
              Tham khảo <Text style={styles.confirmLink}>quy định</Text> của Bộ
              Văn Hóa, Thể Thao và Du Lịch.
            </Text>
            {showUnder16Notice && (
              <Text style={styles.confirmNote}>
                CNJ không được phép phục vụ khách hàng dưới 16 tuổi cho các suất
                chiếu kết thúc sau 23:00.
              </Text>
            )}
            <View style={styles.confirmButtons}>
              <TouchableOpacity
                style={[styles.confirmButton, styles.confirmButtonCancel]}
                onPress={handleCancelConfirm}
                disabled={confirmLoading}
              >
                <Text style={styles.confirmButtonText}>Hủy</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.confirmButton,
                  styles.confirmButtonPrimary,
                  confirmLoading && styles.confirmButtonDisabled,
                ]}
                onPress={handleContinue}
                disabled={confirmLoading}
              >
                {confirmLoading ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.confirmButtonPrimaryText}>Đồng ý</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
  movieTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexWrap: "wrap",
  },
  movieTitle: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#fff",
  },
  ageRatingBadge: {
    backgroundColor: "#FFA500",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  ageRatingText: {
    fontSize: 10,
    fontWeight: "bold",
    color: "#000",
  },
  movieFormat: {
    fontSize: 12,
    color: "#ccc",
    marginTop: 4,
  },
  priceAndSeatsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 4,
  },
  selectedSeatsText: {
    fontSize: 12,
    color: "#999",
  },
  totalPriceText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#fff",
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
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  confirmModal: {
    width: "90%",
    maxWidth: 340,
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 20,
    marginHorizontal: 20,
  },
  confirmTitle: {
    fontSize: 18,
    fontWeight: "600",
    textAlign: "center",
    marginBottom: 8,
    color: "#111",
  },
  confirmMessage: {
    fontSize: 14,
    color: "#333",
    textAlign: "justify",
    lineHeight: 20,
    marginBottom: 10,
  },
  confirmLink: {
    color: "#b91c1c",
    fontWeight: "600",
  },
  confirmNote: {
    fontSize: 13,
    color: "#b91c1c",
    marginBottom: 12,
    textAlign: "justify",
  },
  confirmButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
  },
  confirmButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  confirmButtonCancel: {
    backgroundColor: "#e5e7eb",
  },
  confirmButtonPrimary: {
    backgroundColor: "#E50914",
  },
  confirmButtonText: {
    color: "#111",
    fontSize: 16,
    fontWeight: "600",
  },
  confirmButtonPrimaryText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  confirmButtonDisabled: {
    opacity: 0.7,
  },
});

export default SelectSeatScreen;
