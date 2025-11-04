import { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  Dimensions,
  StatusBar,
  ScrollView,
  Platform,
} from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import Fontisto from "@expo/vector-icons/Fontisto";
import { IMovie } from "@/types/api";

const { width, height } = Dimensions.get("window");

type RootStackParamList = {
  HomeScreen: undefined;
  RegisterScreen: undefined;
  LoginScreen: undefined;
  MovieDetailScreen: { movie: IMovie };
};

type MovieDetailScreenNavigationProp = StackNavigationProp<
  RootStackParamList,
  "MovieDetailScreen"
>;

type MovieDetailScreenRouteProp = {
  key: string;
  name: "MovieDetailScreen";
  params: { movie: IMovie };
};

const MovieDetailScreen = () => {
  const navigation = useNavigation<MovieDetailScreenNavigationProp>();
  const route = useRoute<MovieDetailScreenRouteProp>();
  const { movie } = route.params;

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const day = date.getDate().toString().padStart(2, "0");
    const month = (date.getMonth() + 1).toString().padStart(2, "0");
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  };

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) {
      return `${hours}giờ ${mins}phút`;
    }
    return `${mins}phút`;
  };

  const getAgeRatingText = (ageRating: string) => {
    const ratingMap: { [key: string]: string } = {
      G: "Tất cả lứa tuổi",
      PG: "Có hướng dẫn của phụ huynh",
      PG13: "PHIM ĐƯỢC PHỔ BIẾN ĐẾN NGƯỜI XEM TỪ ĐỦ 13 TUỔI TRỞ LÊN (13+)",
      T16: "PHIM ĐƯỢC PHỔ BIẾN ĐẾN NGƯỜI XEM TỪ ĐỦ 16 TUỔI TRỞ LÊN (16+)",
      T18: "PHIM ĐƯỢC PHỔ BIẾN ĐẾN NGƯỜI XEM TỪ ĐỦ 18 TUỔI TRỞ LÊN (18+)",
    };
    return ratingMap[ageRating] || ageRating;
  };

  return (
    <View style={styles.container}>
      <StatusBar
        barStyle="light-content"
        backgroundColor="transparent"
        translucent
      />
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Top Section với movie poster */}
        <View style={styles.topSection}>
          <Image
            source={{ uri: movie.image || movie.posterImage }}
            style={styles.topSectionImage}
            resizeMode="cover"
          />
          {/* Play button overlay */}
          <View style={styles.playButtonContainer}>
            <TouchableOpacity style={styles.playButton}>
              <View style={styles.playIconContainer}>
                <Fontisto name="play" size={24} color="#E50914" />
              </View>
            </TouchableOpacity>
          </View>

          {/* Header với back button */}
          <View style={styles.header}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => navigation.goBack()}
            >
              <Fontisto name="arrow-left" size={24} color="#fff" />
            </TouchableOpacity>
            {/* <Text style={styles.headerTitle}>Quay lại</Text> */}
          </View>
        </View>

        {/* Movie Title Section */}
        <View style={styles.movieTitleSection}>
          <Image
            source={{ uri: movie.posterImage }}
            style={styles.movieThumbnail}
            resizeMode="cover"
          />
          <View style={styles.movieTitleContainer}>
            <Text style={styles.movieTitle}>{movie.title}</Text>
            <Text style={styles.movieReleaseDate}>
              {formatDate(movie.releaseDate)}
            </Text>
            <TouchableOpacity style={styles.stariumButton}>
              <Text style={styles.stariumButtonText}>STARIUM</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Movie Metadata Bar */}
        <View style={styles.metadataBar}>
          <View style={styles.metadataItem}>
            <Fontisto name="calendar" size={16} color="#fff" />
            <Text style={styles.metadataText}>
              {formatDate(movie.releaseDate)}
            </Text>
          </View>
          <View style={styles.metadataItem}>
            <Fontisto name="clock" size={16} color="#fff" />
            <Text style={styles.metadataText}>
              {formatDuration(movie.duration)}
            </Text>
          </View>
          <View style={styles.metadataItem}>
            <Fontisto name="heart" size={16} color="#fff" />
            <Text style={styles.metadataText}>
              {movie.reviews?.length || 0}
            </Text>
            <TouchableOpacity style={styles.shareButton}>
              <Fontisto name="share" size={16} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Synopsis Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Tóm tắt</Text>
          <Text style={styles.synopsisText}>{movie.description}</Text>
        </View>

        {/* Additional Movie Details */}
        <View style={styles.section}>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Kiểm duyệt:</Text>
            <Text style={styles.detailValue}>
              {getAgeRatingText(movie.ageRating)}
            </Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Thể loại:</Text>
            <Text style={styles.detailValue}>{movie.genre.join(", ")}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Đạo diễn:</Text>
            <Text style={styles.detailValue}>{movie.director}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Diễn viên:</Text>
            <Text style={styles.detailValue}>
              {movie.actors.join(", ")}
              {movie.actors.length > 5 ? "..." : ""}
            </Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Ngôn ngữ:</Text>
            <Text style={styles.detailValue}>{movie.language.join(", ")}</Text>
          </View>
        </View>

        {/* Promotions Section */}
        <View style={styles.promotionsSection}>
          <View style={styles.promotionsHeader}>
            <Text style={styles.promotionsTitle}>Tin mới & Ưu đãi</Text>
            <TouchableOpacity>
              <Text style={styles.promotionsAllButton}>TẤT CẢ</Text>
            </TouchableOpacity>
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.promotionsScrollContent}
          >
            <View style={styles.promotionCard}>
              <Text style={styles.promotionCardLogo}>CGV</Text>
              <Text style={styles.promotionCardTitle}>QUÀ ĐỘC QUYỀN</Text>
              <TouchableOpacity style={styles.promotionCardButton}>
                <Text style={styles.promotionCardButtonText}>ĐẶT VÉ</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.promotionCard}>
              <Text style={styles.promotionCardLogo}>Zalopay</Text>
              <Text style={styles.promotionCardTitle}>CGV</Text>
              <Text style={styles.promotionCardSubtitle}>Khao Ban T</Text>
              <Text style={styles.promotionCardText}>Không giới hạn</Text>
            </View>
          </ScrollView>
        </View>

        {/* Bottom padding for floating button */}
        <View style={styles.bottomPadding} />
      </ScrollView>

      {/* Floating Book Tickets Button */}
      <View style={styles.floatingButtonContainer}>
        <TouchableOpacity style={styles.bookButton}>
          <Text style={styles.bookButtonText}>ĐẶT VÉ</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 80,
  },
  topSection: {
    height: height * 0.5,
    width: "100%",
    position: "relative",
  },
  topSectionImage: {
    width: "100%",
    height: "100%",
  },
  playButtonContainer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 1,
    pointerEvents: "box-none",
  },
  playButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "rgba(255, 255, 255, 0.9)",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 3,
    borderColor: "#fff",
  },
  playIconContainer: {
    marginLeft: 4,
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
  movieTitleSection: {
    flexDirection: "row",
    padding: 16,
    backgroundColor: "#000",
    paddingBottom: 20,
  },
  movieThumbnail: {
    width: 80,
    height: 120,
    borderRadius: 8,
    marginRight: 16,
  },
  movieTitleContainer: {
    flex: 1,
    justifyContent: "flex-start",
  },
  movieTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#fff",
    marginBottom: 8,
  },
  movieReleaseDate: {
    fontSize: 14,
    color: "#888",
    marginBottom: 12,
  },
  stariumButton: {
    backgroundColor: "#1a1a1a",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
    alignSelf: "flex-start",
  },
  stariumButtonText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
  },
  metadataBar: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    paddingVertical: 16,
    paddingHorizontal: 16,
    backgroundColor: "#1a1a1a",
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: "#333",
  },
  metadataItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  metadataText: {
    color: "#fff",
    fontSize: 14,
  },
  shareButton: {
    marginLeft: 8,
    padding: 4,
  },
  section: {
    padding: 16,
    backgroundColor: "#000",
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#fff",
    marginBottom: 12,
  },
  synopsisText: {
    fontSize: 14,
    color: "#ccc",
    lineHeight: 22,
  },
  detailRow: {
    flexDirection: "row",
    marginBottom: 12,
    alignItems: "flex-start",
  },
  detailLabel: {
    fontSize: 14,
    color: "#888",
    width: 100,
    fontWeight: "600",
  },
  detailValue: {
    fontSize: 14,
    color: "#fff",
    flex: 1,
    lineHeight: 20,
  },
  promotionsSection: {
    backgroundColor: "#000",
    paddingVertical: 16,
  },
  promotionsHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  promotionsTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#fff",
  },
  promotionsAllButton: {
    fontSize: 14,
    color: "#E50914",
    fontWeight: "600",
  },
  promotionsScrollContent: {
    paddingHorizontal: 16,
    gap: 12,
  },
  promotionCard: {
    width: width * 0.7,
    backgroundColor: "#1a1a1a",
    borderRadius: 8,
    padding: 16,
    marginRight: 12,
  },
  promotionCardLogo: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#E50914",
    marginBottom: 8,
  },
  promotionCardTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#fff",
    marginBottom: 4,
  },
  promotionCardSubtitle: {
    fontSize: 12,
    color: "#ccc",
    marginBottom: 4,
  },
  promotionCardText: {
    fontSize: 12,
    color: "#888",
    marginBottom: 12,
  },
  promotionCardButton: {
    backgroundColor: "#E50914",
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 4,
    alignSelf: "flex-start",
  },
  promotionCardButtonText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "bold",
  },
  bottomPadding: {
    height: 20,
  },
  floatingButtonContainer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#000",
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingBottom: Platform.OS === "ios" ? 30 : 12,
    borderTopWidth: 1,
    borderTopColor: "#333",
  },
  bookButton: {
    backgroundColor: "#E50914",
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: "center",
  },
  bookButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
    letterSpacing: 1,
  },
});

export default MovieDetailScreen;
