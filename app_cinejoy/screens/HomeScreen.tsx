import React, { useState, useRef, useEffect } from 'react';
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
  Animated,
} from 'react-native';
import banner from "assets/banner.png";
import { getMoviesByStatusApi } from 'services/api';
import { IMovie } from 'types/api';

const { width, height } = Dimensions.get('window');

const HomeScreen = () => {
  const [selectedTab, setSelectedTab] = useState('Đang chiếu');
  const [currentBannerIndex, setCurrentBannerIndex] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);
  const [movies, setMovies] = useState<IMovie[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentMovieIndex, setCurrentMovieIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);
  const moviesCarouselRef = useRef<FlatList>(null);
  const scrollX = useRef(new Animated.Value(0)).current;

  const tabs = ['Đang chiếu', 'Đặc biệt', 'Sắp chiếu'];
  
  // Mapping giữa tab và status
  const tabStatusMap: { [key: string]: string } = {
    'Đang chiếu': 'Phim đang chiếu',
    'Đặc biệt': 'Suất chiếu đặc biệt',
    'Sắp chiếu': 'Phim sắp chiếu'
  };

  const banners = [
    banner,
    banner,
    banner
  ];

  // Hàm fetch movies theo status
  const fetchMovies = async (status: string) => {
    try {
      setLoading(true);
      const moviesData = await getMoviesByStatusApi(status);
      setMovies(moviesData);
      setCurrentMovieIndex(0); // Reset về phim đầu tiên
    } catch (error) {
      console.error('Error fetching movies:', error);
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

  // Render carousel item
  const renderCarouselItem = ({ item, index }: { item: IMovie; index: number }) => {
    const inputRange = [
      (index - 1) * width,
      index * width,
      (index + 1) * width,
    ];

    const scale = scrollX.interpolate({
      inputRange,
      outputRange: [0.8, 1, 0.8],
      extrapolate: 'clamp',
    });

    const opacity = scrollX.interpolate({
      inputRange,
      outputRange: [0.6, 1, 0.6],
      extrapolate: 'clamp',
    });

    return (
      <View style={styles.carouselItemContainer}>
        <Animated.View style={[
          styles.carouselItem,
          {
            transform: [{ scale }],
            opacity,
          }
        ]}>
          <Image source={{ uri: item.posterImage }} style={styles.carouselPoster} />
          
          {item.description && (
            <Text style={styles.carouselQuote} numberOfLines={2}>
              {item.description}
            </Text>
          )}
          
          <Text style={styles.carouselTitle}>{item.title}</Text>
          
          {item.status === 'Suất chiếu đặc biệt' && (
            <Text style={styles.specialScreening}>
              SUẤT CHIẾU ĐẶC BIỆT TỪ 18H 8.10.2025 VÀ CẢ NGÀY 9.10.2025
            </Text>
          )}
          
          <Text style={styles.releaseInfo}>
            KHỞI CHIẾU {new Date(item.releaseDate).toLocaleDateString('vi-VN')}
          </Text>
          
          <View style={styles.formatsContainer}>
            <View style={styles.formatBadge}>
              <Text style={styles.formatText}>2D</Text>
            </View>
            <View style={styles.formatBadge}>
              <Text style={styles.formatText}>3D</Text>
            </View>
            <View style={styles.formatBadge}>
              <Text style={styles.formatText}>IMAX</Text>
            </View>
            <View style={styles.formatBadge}>
              <Text style={styles.formatText}>4DX</Text>
            </View>
          </View>
        </Animated.View>
      </View>
    );
  };

  // Auto-play effect
  useEffect(() => {
    if (!isAutoPlaying) return;

    const interval = setInterval(() => {
      setCurrentBannerIndex((prevIndex) => {
        const nextIndex = (prevIndex + 1) % banners.length;
        flatListRef.current?.scrollToIndex({ 
          index: nextIndex, 
          animated: true 
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
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#000" translucent />
      
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <TouchableOpacity style={styles.headerIcon}>
            <Text style={styles.headerIconText}>☁️</Text>
          </TouchableOpacity>
          
          <View style={styles.logoContainer}>
            <Text style={styles.logo}>CNJ</Text>
            <Text style={styles.star}>⭐</Text>
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
                currentBannerIndex === index && styles.activeDot
              ]}
              onPress={() => {
                setCurrentBannerIndex(index);
                flatListRef.current?.scrollToIndex({ index, animated: true });
                // Pause auto-play when user taps dot
                setIsAutoPlaying(false);
                // Resume auto-play after 3 seconds
                setTimeout(() => setIsAutoPlaying(true), 3000);
              }}
            />
          ))}
        </View>
      </View>

      {/* Navigation Tabs */}
      <View style={styles.tabsContainer}>
        {tabs.map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[
              styles.tab,
              selectedTab === tab && styles.activeTab
            ]}
            onPress={() => setSelectedTab(tab)}
          >
            <Text style={[
              styles.tabText,
              selectedTab === tab && styles.activeTabText
            ]}>
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
          <FlatList
            ref={moviesCarouselRef}
            data={movies}
            renderItem={renderCarouselItem}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onScroll={Animated.event(
              [{ nativeEvent: { contentOffset: { x: scrollX } } }],
              { useNativeDriver: false }
            )}
            onMomentumScrollEnd={(event) => {
              const index = Math.round(event.nativeEvent.contentOffset.x / width);
              setCurrentMovieIndex(index);
            }}
            snapToInterval={width}
            decelerationRate="fast"
            contentContainerStyle={styles.carouselWrapper}
          />
        </View>
      )}

      {/* Movie Details Bar */}
      {movies.length > 0 && movies[currentMovieIndex] && (
        <View style={styles.movieDetailsBar}>
          <View style={styles.movieInfo}>
            <Text style={styles.movieTitleSmall}>{movies[currentMovieIndex].title}</Text>
            <View style={styles.movieMeta}>
              <View style={styles.ratingBadge}>
                <Text style={styles.ratingText}>{movies[currentMovieIndex].ageRating}</Text>
              </View>
              <Text style={styles.duration}>{movies[currentMovieIndex].duration} phút</Text>
              <Text style={styles.releaseDate}>
                {new Date(movies[currentMovieIndex].releaseDate).toLocaleDateString('vi-VN')}
              </Text>
            </View>
          </View>
          <TouchableOpacity style={styles.bookButton}>
            <Text style={styles.bookButtonText}>Đặt Vé</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  header: {
    backgroundColor: '#000',
    paddingHorizontal: 16,
    paddingVertical: 4,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerIcon: {
    padding: 8,
  },
  headerIconText: {
    fontSize: 20,
    color: '#fff',
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logo: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  star: {
    fontSize: 16,
    marginLeft: 4,
  },
  headerRight: {
    flexDirection: 'row',
  },
  carouselContainer: {
    marginVertical: 8,
  },
  flatListContent: {
    paddingVertical: 0,
    paddingBottom: 0,
  },
  banner: {
    width: width - 32,
    marginHorizontal: 16,
    marginBottom: 0,
    borderRadius: 12,
    overflow: 'hidden',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    backgroundColor: 'transparent',
  },
  bannerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    // marginBottom: 8,
  },
  bannerLogo: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 4,
    flex: 1,
  },
  bannerLogoText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  bannerWebsite: {
    fontSize: 10,
  },
  cgvLogo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cgvText: {
    color: '#FF0000',
    fontSize: 14,
    fontWeight: 'bold',
  },
  starSmall: {
    fontSize: 12,
    marginLeft: 2,
  },
  bannerTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FF0000',
    marginBottom: 8,
  },
  bannerContact: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  phoneContainer: {
    flexDirection: 'row',
    alignItems: 'center',
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
    fontWeight: 'bold',
  },
  socialIcons: {
    flexDirection: 'row',
  },
  socialIcon: {
    fontSize: 20,
    marginLeft: 8,
  },
  bannerImageContainer: {
    alignItems: 'center',
    marginVertical: 12,
  },
  bannerImage: {
    width: '100%',
    height: 150,
    objectFit: 'cover',
    marginBottom: 8,
  },
  bannerBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  rewardSection: {
    flex: 1,
  },
  rewardText: {
    backgroundColor: '#000',
    color: '#FFD700',
    padding: 4,
    fontSize: 12,
    textAlign: 'center',
  },
  voucherText: {
    backgroundColor: '#FFD700',
    color: '#000',
    padding: 4,
    fontSize: 12,
    textAlign: 'center',
  },
  voucherAmount: {
    color: '#FF0000',
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 4,
  },
  qrCode: {
    width: 40,
    height: 40,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 16,
  },
  qrText: {
    color: '#fff',
    fontSize: 12,
  },
  pagination: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 0,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#666',
    marginHorizontal: 4,
  },
  activeDot: {
    backgroundColor: '#FF0000',
    width: 12,
    height: 8,
    borderRadius: 4,
  },
  tabsContainer: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'center',
    backgroundColor: '#000',
    paddingHorizontal: 16,
  },
  tab: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginRight: 16,
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: '#FF0000',
  },
  tabText: {
    color: '#666',
    fontSize: 16,
  },
  activeTabText: {
    color: '#fff',
    fontWeight: 'bold',
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
    width: '100%',
    height: height * 0.4,
    borderRadius: 8,
  },
  movieQuote: {
    color: '#fff',
    fontSize: 12,
    marginTop: 8,
    fontStyle: 'italic',
  },
  movieTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 8,
  },
  specialScreening: {
    color: '#FFD700',
    fontSize: 12,
    marginTop: 4,
  },
  releaseInfo: {
    color: '#FF0000',
    fontSize: 12,
    fontWeight: 'bold',
    marginTop: 4,
  },
  formatsContainer: {
    flexDirection: 'row',
    marginTop: 8,
  },
  formatBadge: {
    backgroundColor: '#333',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    marginRight: 8,
  },
  formatText: {
    color: '#fff',
    fontSize: 10,
  },
  movieDetailsBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#111',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  movieInfo: {
    flex: 1,
  },
  movieTitleSmall: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  movieMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  ratingBadge: {
    backgroundColor: '#FF0000',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginRight: 8,
  },
  ratingText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  duration: {
    color: '#666',
    fontSize: 12,
    marginRight: 8,
  },
  releaseDate: {
    color: '#666',
    fontSize: 12,
  },
  bookButton: {
    backgroundColor: '#FF0000',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 6,
  },
  bookButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    color: '#fff',
    marginTop: 10,
    fontSize: 16,
  },
  movieDuration: {
    color: '#ccc',
    fontSize: 12,
  },
  genresContainer: {
    flexDirection: 'row',
    marginTop: 4,
  },
  genreText: {
    color: '#888',
    fontSize: 10,
    marginRight: 8,
    fontStyle: 'italic',
  },
  // Carousel styles
  carouselSection: {
    flex: 1,
    paddingVertical: 20,
  },
  carouselWrapper: {
    paddingHorizontal: 0,
  },
  carouselItemContainer: {
    width: width,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  carouselItem: {
    width: width * 0.8,
    alignItems: 'center',
  },
  carouselPoster: {
    width: '100%',
    height: height * 0.5,
    borderRadius: 12,
    marginBottom: 12,
  },
  carouselQuote: {
    color: '#fff',
    fontSize: 14,
    textAlign: 'center',
    fontStyle: 'italic',
    marginBottom: 8,
    paddingHorizontal: 16,
  },
  carouselTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
    paddingHorizontal: 16,
  },
});

export default HomeScreen;