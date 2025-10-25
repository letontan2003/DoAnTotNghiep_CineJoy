import { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  Dimensions,
  StatusBar,
  FlatList,
  ActivityIndicator,
  ScrollView,
} from "react-native";
import StackCarousel from "@/components/StackCarousel";
import { getMoviesByStatusApi } from "services/api";
import { IMovie } from "types/api";
import banner1 from "assets/banner1.png";
import banner2 from "assets/banner2.jpg";
import banner3 from "assets/banner3.png";
import banner4 from "assets/banner4.png";
import banner5 from "assets/banner5.jpg";
import bannerBG from "assets/bannerBG.png";
import backgroundImage from "assets/background.jpg";
import icon from "assets/iconHome.png";

const { width, height } = Dimensions.get("window");

const HomeScreen = () => {
  const [selectedTab, setSelectedTab] = useState("Đang chiếu");
  const [currentBannerIndex, setCurrentBannerIndex] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);
  const [movies, setMovies] = useState<IMovie[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentMovieIndex, setCurrentMovieIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);

  const tabs = ["Đang chiếu", "Đặc biệt", "Sắp chiếu"];

  // Hàm tính toán giờ và phút từ duration (phút)
  const formatDuration = (minutes: number): string => {
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    
    if (hours === 0) {
      return `${remainingMinutes} phút`;
    } else if (remainingMinutes === 0) {
      return `${hours} giờ`;
    } else {
      return `${hours} giờ ${remainingMinutes} phút`;
    }
  };

  // Mapping giữa tab và status
  const tabStatusMap: { [key: string]: string } = {
    "Đang chiếu": "Phim đang chiếu",
    "Đặc biệt": "Suất chiếu đặc biệt",
    "Sắp chiếu": "Phim sắp chiếu",
  };

  const banners = [banner1, banner2, banner3, banner4, banner5];

  // Hàm fetch movies theo status
  const fetchMovies = async (status: string) => {
    try {
      setLoading(true);
      const moviesData = await getMoviesByStatusApi(status);
      setMovies(moviesData);
      setCurrentMovieIndex(0); // Reset về phim đầu tiên
    } catch (error) {
      console.error("Error fetching movies:", error);
      setMovies([]);
    } finally {
      setLoading(false);
    }
  };

  // Fetch movies khi component mount và khi tab thay đổi
  useEffect(() => {
    const status = tabStatusMap[selectedTab];
    if (status) {
      fetchMovies(status);
    }
  }, [selectedTab]);

  // Auto-play effect
  useEffect(() => {
    if (!isAutoPlaying) return;

    const interval = setInterval(() => {
      setCurrentBannerIndex((prevIndex) => {
        const nextIndex = (prevIndex + 1) % banners.length;
        flatListRef.current?.scrollToIndex({
          index: nextIndex,
          animated: true,
        });
        return nextIndex;
      });
    }, 5000);

    return () => clearInterval(interval);
  }, [isAutoPlaying, banners.length]);

  // Handle manual scroll
  const handleScroll = (event: any) => {
    const index = Math.round(event.nativeEvent.contentOffset.x / width);
    setCurrentBannerIndex(index);
    // Pause auto-play when user manually scrolls
    setIsAutoPlaying(false);
    // Resume auto-play after 3 seconds of no interaction
    setTimeout(() => setIsAutoPlaying(true), 3000);
  };

  return (
    <ScrollView 
      style={styles.container}
      showsVerticalScrollIndicator={false}
      bounces={true}
    >
      <StatusBar
        barStyle="light-content"
        backgroundColor="#1a1a1a"
        translucent
      />

      {/* Header và Banner Section với background chung */}
      <View style={styles.headerBannerSection}>
        <Image source={bannerBG} style={styles.headerBannerBackground} />
        
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerContent}>
            <TouchableOpacity style={styles.headerIcon}>
              <Image source={icon} style={styles.headerIconImage} />
            </TouchableOpacity>

            <View style={styles.logoContainer}>
              <Text style={styles.logo}>CNJ</Text>
            </View>

            <View style={styles.headerRight}>
              <TouchableOpacity style={styles.headerIcon}>
                <Text style={styles.headerIconText}>🎫</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.headerIcon}>
                <Text style={styles.headerIconText}>☰</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Banner Carousel */}
        <View style={styles.carouselContainer}>
          <FlatList
            ref={flatListRef}
            data={banners}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.flatListContent}
            onMomentumScrollEnd={handleScroll}
            renderItem={({ item }) => (
              <View style={styles.banner}>
                <Image source={item} style={styles.bannerImage} />
              </View>
            )}
            keyExtractor={(item, index) => index.toString()}
          />

          {/* Pagination Dots */}
          <View style={styles.pagination}>
            {banners.map((_, index) => (
              <TouchableOpacity
                key={index}
                style={[
                  styles.dot,
                  currentBannerIndex === index && styles.activeDot,
                ]}
                onPress={() => {
                  setCurrentBannerIndex(index);
                  flatListRef.current?.scrollToIndex({ index, animated: true });
                  setIsAutoPlaying(false);
                  setTimeout(() => setIsAutoPlaying(true), 3000);
                }}
              />
            ))}
          </View>
        </View>
      </View>

      {/* Background Section - từ tabs đến button */}
      <View style={styles.backgroundSection}>
        <Image 
          source={backgroundImage} 
          style={styles.backgroundImage}
          resizeMode="cover"
        />
        
        {/* Navigation Tabs */}
        <View style={styles.tabsContainer}>
        {tabs.map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[styles.tab]}
            onPress={() => setSelectedTab(tab)}
          >
            <Text
              style={[
                styles.tabText,
                selectedTab === tab && styles.activeTabText,
              ]}
            >
              {tab}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Movies Carousel Section */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#fff" />
          <Text style={styles.loadingText}>Đang tải phim...</Text>
        </View>
      ) : (
        <View style={styles.carouselSection}>
          <StackCarousel
              data={movies}
              renderItem={(item: IMovie, index: number) => (
                <Image
                  source={{ uri: item.posterImage }}
                  style={styles.carouselPoster}
                />
              )}
              onIndexChange={(index) => setCurrentMovieIndex(index)}
              itemWidth={width * 0.65}
              itemHeight={height * 0.53}
            />
          </View>
        )}

        {/* Movie Details Bar - nằm trong background */}
        {movies.length > 0 && movies[currentMovieIndex] && (
          <View style={styles.movieDetailsContainer}>
            <View style={styles.movieDetailsBar}>
              <View style={styles.movieInfo}>
                <View style={styles.titleRow}>
                  <Text style={styles.movieTitleSmall} numberOfLines={1}>
                    {movies[currentMovieIndex].title.toUpperCase()}
                  </Text>
                  <View style={styles.ratingBadge}>
                    <Text style={styles.ratingText}>
                      {movies[currentMovieIndex].ageRating}
                    </Text>
                  </View>
                </View>
                <View style={styles.movieMeta}>
                    <Text style={styles.duration}>
                      {formatDuration(movies[currentMovieIndex].duration)}
                    </Text>
                  <Text style={styles.releaseDate}>
                    {new Date(
                      movies[currentMovieIndex].releaseDate
                    ).toLocaleDateString("vi-VN", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </Text>
                </View>
              </View>
            </View>
            <TouchableOpacity style={styles.bookButton}>
              <Text style={styles.bookButtonText}>Đặt Vé</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#1a1a1a",
  },
  headerBannerSection: {
    position: "relative",
    width: "100%",
  },
  headerBannerBackground: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },
  header: {
    backgroundColor: "#000014",
    paddingHorizontal: 16,
  },
  headerContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerIcon: {
    padding: 7,
  },
   headerIconImage: {
     width: 30,
     height: 30,
     borderRadius: 15,
     resizeMode: 'cover',
   },
  headerIconText: {
    fontSize: 24,
    color: "#fff",
  },
  logoContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  logo: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#ffffff",
    letterSpacing: 2,
  },
  star: {
    fontSize: 20,
    marginLeft: 2,
    color: "#E50914",
    fontWeight: "bold",
  },
  headerRight: {
    flexDirection: "row",
    gap: 4,
  },
  carouselContainer: {
    marginVertical: 8,
  },
  flatListContent: {
    paddingVertical: 0,
    paddingBottom: 0,
  },
  banner: {
    width: width - 60,
    marginHorizontal: 30,
    borderRadius: 12,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    backgroundColor: "transparent",
  },
  bannerHeader: {
    flexDirection: "row",
    alignItems: "center",
  },
  bannerLogo: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 4,
    flex: 1,
  },
  bannerLogoText: {
    fontSize: 12,
    fontWeight: "bold",
  },
  bannerWebsite: {
    fontSize: 10,
  },
  cgvLogo: {
    flexDirection: "row",
    alignItems: "center",
  },
  cgvText: {
    color: "#FF0000",
    fontSize: 14,
    fontWeight: "bold",
  },
  starSmall: {
    fontSize: 12,
    marginLeft: 2,
  },
  bannerTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#FF0000",
    marginBottom: 8,
  },
  bannerContact: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  phoneContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  phoneIcon: {
    fontSize: 14,
    marginRight: 6,
  },
  phoneNumber: {
    fontSize: 14,
    fontWeight: "bold",
  },
  socialIcons: {
    flexDirection: "row",
  },
  socialIcon: {
    fontSize: 20,
    marginLeft: 8,
  },
  bannerImageContainer: {
    alignItems: "center",
    marginVertical: 12,
  },
  bannerImage: {
    width: "100%",
    height: 150,
    alignSelf: "center",
    borderRadius: 12,
    marginHorizontal: 16,
    resizeMode: "cover",
    marginBottom: 8,
  },
  bannerBottom: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  rewardSection: {
    flex: 1,
  },
  rewardText: {
    backgroundColor: "#000",
    color: "#FFD700",
    padding: 4,
    fontSize: 12,
    textAlign: "center",
  },
  voucherText: {
    backgroundColor: "#FFD700",
    color: "#000",
    padding: 4,
    fontSize: 12,
    textAlign: "center",
  },
  voucherAmount: {
    color: "#FF0000",
    fontSize: 18,
    fontWeight: "bold",
    marginTop: 4,
  },
  qrCode: {
    width: 40,
    height: 40,
    backgroundColor: "#000",
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 16,
  },
  qrText: {
    color: "#fff",
    fontSize: 12,
  },
  pagination: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 0,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#555",
    marginHorizontal: 3,
  },
  activeDot: {
    backgroundColor: "#E50914",
    width: 20,
    height: 6,
    borderRadius: 3,
  },
  tabsContainer: {
    width: "100%",
    flexDirection: "row",
    justifyContent: "space-between",
    backgroundColor: "transparent",
    paddingHorizontal: 5,
    paddingVertical: 5,
    borderBottomWidth: 0,
  },
  tab: {
    paddingVertical: 5,
    paddingHorizontal: 10,
    marginHorizontal: 0,
  },
  tabText: {
    color: "#888",
    fontSize: 16,
    fontWeight: "500",
  },
  activeTabText: {
    color: "#fff",
    fontWeight: "bold",
  },
  moviesContainer: {
    flex: 1,
  },
  moviesContent: {
    paddingHorizontal: 16,
  },
  movieCard: {
    width: width * 0.7,
    marginRight: 16,
  },
  moviePoster: {
    width: "100%",
    height: height * 0.4,
    borderRadius: 8,
  },
  movieQuote: {
    color: "#fff",
    fontSize: 12,
    marginTop: 8,
    fontStyle: "italic",
  },
  movieTitle: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
    marginTop: 8,
  },
  specialScreening: {
    color: "#FFD700",
    fontSize: 12,
    marginTop: 4,
  },
  releaseInfo: {
    color: "#FF0000",
    fontSize: 12,
    fontWeight: "bold",
    marginTop: 4,
  },
  formatsContainer: {
    flexDirection: "row",
    marginTop: 8,
  },
  formatBadge: {
    backgroundColor: "#333",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    marginRight: 8,
  },
  formatText: {
    color: "#fff",
    fontSize: 10,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 40,
  },
  loadingText: {
    color: "#fff",
    marginTop: 10,
    fontSize: 16,
  },
  movieDuration: {
    color: "#ccc",
    fontSize: 12,
  },
  genresContainer: {
    flexDirection: "row",
    marginTop: 4,
  },
  genreText: {
    color: "#888",
    fontSize: 10,
    marginRight: 8,
    fontStyle: "italic",
  },
  // Background Section styles
  backgroundSection: {
    position: "relative",
  },
  backgroundImage: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: "100%",
    height: "100%",
  },
  // Carousel styles
  carouselSection: {
    backgroundColor: "transparent",
    justifyContent: "center",
    overflow: "hidden",
    height: height * 0.5, // Giảm từ 0.6 xuống 0.45
  },
  carouselPoster: {
    width: "100%",
    height: height * 0.5, // Giảm từ 0.6 xuống 0.45
    borderRadius: 16,
    resizeMode: "cover",
  },
  carouselQuote: {
    color: "#fff",
    fontSize: 14,
    textAlign: "center",
    fontStyle: "italic",
    marginBottom: 8,
    paddingHorizontal: 16,
  },
  carouselTitle: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 8,
    paddingHorizontal: 16,
  },
  movieDetailsContainer: {
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    paddingHorizontal: 10,
    flexDirection: "row",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  movieDetailsBar: {
    flex: 1,
    paddingVertical: 10,
  },
  movieInfo: {
    alignItems: "flex-start",
    flex: 1,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-start",
    marginBottom: 2,
    flex: 1,
    marginRight: 10,
    gap: 10,
  },
  movieTitleSmall: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
    textAlign: "left",
    flexShrink: 1,
  },
  movieMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  ratingBadge: {
    backgroundColor: "#FF0000",
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 6,
    flexShrink: 0,
  },
  ratingText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "bold",
  },
  duration: {
    color: "#fff",
    fontSize: 12.5,
    fontWeight: "400",
  },
  releaseDate: {
    color: "#fff",
    fontSize: 12.5,
    fontWeight: "400",
  },
  bookButton: {
    backgroundColor: "#E50914",
    paddingVertical: 7,
    paddingHorizontal: 18,
    borderRadius: 25,
    alignItems: "center",
    shadowColor: "#E50914",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
    flexShrink: 0,
    borderWidth: 1,
    borderColor: "#ffffff",
  },
  bookButtonText: {
    color: "#fff",
    fontSize: 12.5,
    fontWeight: "bold",
    letterSpacing: 0.5,
  },
});

export default HomeScreen;
