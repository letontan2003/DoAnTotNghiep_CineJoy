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
  Animated,
  Modal,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import StackCarousel from "@/components/StackCarousel";
import { getMoviesByStatusApi } from "services/api";
import { IMovie } from "types/api";
import Fontisto from '@expo/vector-icons/Fontisto';
import banner1 from "assets/banner1.png";
import banner2 from "assets/banner2.jpg";
import banner3 from "assets/banner3.png";
import banner4 from "assets/banner4.png";
import banner5 from "assets/banner5.jpg";
import bannerBG from "assets/bannerBG.png";
import backgroundImage from "assets/background.jpg";
import backgroundTab from "assets/backgroundTab.png";
import logo from "assets/logoCNJ.png";
import icon from "assets/iconHome.png";
import startHome from "assets/startHome.png";
import maVach from "assets/maVach.png";

const { width, height } = Dimensions.get("window");

const HomeScreen = () => {
  const [selectedTab, setSelectedTab] = useState("Đang chiếu");
  const [currentBannerIndex, setCurrentBannerIndex] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);
  const [movies, setMovies] = useState<IMovie[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentMovieIndex, setCurrentMovieIndex] = useState(0);
  const [currentPromotionalPage, setCurrentPromotionalPage] = useState(0);
  const [isStickyHeader, setIsStickyHeader] = useState(false);
  const [showPromoModal, setShowPromoModal] = useState(false);
  const [showSideMenu, setShowSideMenu] = useState(false);
  const hasShownModal = useRef(false);
  const flatListRef = useRef<FlatList>(null);
  const promotionalFlatListRef = useRef<FlatList>(null);
  const partnerOffersFlatListRef = useRef<FlatList>(null);
  const scrollViewRef = useRef<ScrollView>(null);
  const headerOpacity = useRef(new Animated.Value(1)).current; // Opacity cho header
  const sideMenuTranslateX = useRef(new Animated.Value(width)).current; // Side menu position
  const [currentPartnerOfferIndex, setCurrentPartnerOfferIndex] = useState(0);
  const [isPartnerOfferAutoScroll, setIsPartnerOfferAutoScroll] = useState(true);

  // Promotional items data
  const promotionalItems = [
    { id: 1, title: "THẺ QUÀ TẶNG", image: banner1 },
    { id: 2, title: "CNJ STORE", image: banner2 },
    { id: 3, title: "QUÀ SINH NHẬT MIỄN PHÍ", image: banner3 },
    { id: 4, title: "SWEETBOX", image: banner1 },
    { id: 5, title: "THUÊ RẠP VÀ VÉ NHÓM", image: banner2 },
    { id: 6, title: "4DX", image: banner3 },
  ];

  // Hot News banners data
  const hotNewsItems = [
    { 
      id: 1, 
      title: "ORION 2MIX - 2 LÁT KHOAI, CÚ NÓ VỊ GIÁC CỰC ĐÌNH! CHỈ TỪ 20.000Đ", 
      image: banner1,
      brand: "ORION"
    },
    { 
      id: 2, 
      title: "MUA VÉ XEM PHIM C18 TẠI CGV NHẬN QUÀ SPECIAL TỪ SWEETBOX", 
      image: banner2,
      brand: "SWEETBOX"
    },
    { 
      id: 3, 
      title: "KHUYẾN MÃI THÁNG 12 - ƯU ĐÃI ĐẶC BIỆT CHO THÀNH VIÊN", 
      image: banner3,
      brand: "CGV"
    },
    { 
      id: 4, 
      title: "COMBO BẮP NƯỚC GIÁ SỐC - TIẾT KIỆM ĐẾN 50%", 
      image: banner4,
      brand: "COMBO"
    },
  ];

  // Partner Offers data - chỉ chứa ảnh, tất cả text đã có trong ảnh
  const partnerOffersOriginal = [
    {
      id: 1,
      image: banner1,
    },
    {
      id: 2,
      image: banner2,
    },
    {
      id: 3,
      image: banner3,
    },
  ];

  // Duplicate data để scroll vô cực
  const partnerOffers = [...partnerOffersOriginal, ...partnerOffersOriginal, ...partnerOffersOriginal];

  // Side menu items data - Grid menu với icons
  const menuGridItems = [
    { id: 1, title: "Trang chủ", icon: "🏠" },
    { id: 2, title: "Thành viên CGV", icon: "👤" },
    { id: 3, title: "Rạp", icon: "ℹ️" },
    { id: 4, title: "Rạp đặc biệt", icon: "⭐" },
    { id: 5, title: "Tin mới & Ưu đãi", icon: "🎁" },
    { id: 6, title: "Vé của tôi", icon: "🎟️" },
    { id: 7, title: "CGV Store", icon: "🍿" },
    { id: 8, title: "CGV eGift", icon: "🎁" },
    { id: 9, title: "Đổi ưu đãi", icon: "🎗️" },
  ];

  // Hàm mở/đóng side menu
  const toggleSideMenu = () => {
    const willOpen = !showSideMenu;
    setShowSideMenu(willOpen);
    
    Animated.timing(sideMenuTranslateX, {
      toValue: willOpen ? 0 : width,
      duration: 300,
      useNativeDriver: true,
    }).start();
  };

  // Khởi tạo animation value khi component mount
  useEffect(() => {
    sideMenuTranslateX.setValue(width); // Menu ban đầu nằm ngoài màn hình bên phải
  }, []);

  // Đóng side menu khi click overlay
  const closeSideMenu = () => {
    if (showSideMenu) {
      toggleSideMenu();
    }
  };

  const tabs = ["Đang chiếu", "Đặc biệt", "Sắp chiếu"];

  // Hàm xử lý scroll để detect sticky header
  const handleMainScroll = (event: any) => {
    const scrollY = event.nativeEvent.contentOffset.y;
    const bannerHeight = 179; // Chiều cao của banner section
    const stickyThreshold = bannerHeight; // Khi tabs đụng header
    
    // Tính toán opacity dựa trên scroll position
    // Bắt đầu mờ từ scrollY = 0, hoàn thành khi tabs đụng header (179px)
    const opacityValue = Math.max(0, Math.min(1, scrollY / stickyThreshold));
    
    // Animate opacity
    Animated.timing(headerOpacity, {
      toValue: 1 - opacityValue,
      duration: 0,
      useNativeDriver: false,
    }).start();
    
    if (scrollY >= stickyThreshold) {
      setIsStickyHeader(true);
    } else {
      setIsStickyHeader(false);
    }
  };

  // Hàm xử lý scroll promotional carousel khi click pagination
  const handlePromotionalPageChange = (pageIndex: number) => {
    setCurrentPromotionalPage(pageIndex);
    promotionalFlatListRef.current?.scrollToOffset({
      offset: pageIndex * width, // Mỗi trang = width màn hình
      animated: true,
    });
  };

  // Hàm xử lý khi click tab trong sticky header
  const handleStickyTabClick = (tab: string) => {
    setSelectedTab(tab);
    const stickySectionHeight = 0;
    scrollViewRef.current?.scrollTo({
      y: stickySectionHeight,
      animated: true,
    });
  };

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

  // Hiển thị modal khi vào HomeScreen lần đầu tiên
  useFocusEffect(() => {
    if (!hasShownModal.current) {
      hasShownModal.current = true;
      // Delay một chút để đảm bảo HomeScreen đã render xong
      setTimeout(() => {
        setShowPromoModal(true);
      }, 500);
    }
  });

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

  // Auto-scroll cho Partner Offers
  useEffect(() => {
    if (!isPartnerOfferAutoScroll) return;

    const originalLength = partnerOffersOriginal.length;
    const cardWidth = width * 0.85 + 12; // width của card + marginRight

    const interval = setInterval(() => {
      setCurrentPartnerOfferIndex((prevIndex) => {
        const nextIndex = prevIndex + 1;
        
        // Nếu đã scroll đến cuối phần duplicate thứ 2, reset về đầu không animation
        if (nextIndex >= originalLength * 2) {
          setTimeout(() => {
            partnerOffersFlatListRef.current?.scrollToOffset({
              offset: 0,
              animated: false,
            });
          }, 50);
          return 0;
        }

        partnerOffersFlatListRef.current?.scrollToOffset({
          offset: nextIndex * cardWidth,
          animated: true,
        });
        
        return nextIndex;
      });
    }, 3000); // Scroll mỗi 3 giây

    return () => clearInterval(interval);
  }, [isPartnerOfferAutoScroll]);

  // Handle manual scroll cho Partner Offers
  const handlePartnerOfferScroll = (event: any) => {
    const cardWidth = width * 0.85 + 12;
    const offsetX = event.nativeEvent.contentOffset.x;
    const index = Math.round(offsetX / cardWidth);
    const originalLength = partnerOffersOriginal.length;
    
    // Nếu scroll đến gần cuối phần duplicate thứ 2, reset về đầu
    if (index >= originalLength * 2 - 1) {
      setTimeout(() => {
        partnerOffersFlatListRef.current?.scrollToOffset({
          offset: 0,
          animated: false,
        });
      }, 50);
      setCurrentPartnerOfferIndex(0);
    } else {
      setCurrentPartnerOfferIndex(index);
    }

    // Pause auto-scroll khi user scroll thủ công
    setIsPartnerOfferAutoScroll(false);
    setTimeout(() => setIsPartnerOfferAutoScroll(true), 5000);
  };

  return (
    <View style={styles.container}>
      <StatusBar
        barStyle="light-content"
        backgroundColor="#1a1a1a"
        translucent
      />

      {/* Sticky Header - chỉ có header */}
      <View style={[
        styles.stickyHeaderContainer,
        isStickyHeader && styles.stickyHeaderActive
      ]}>
        {/* Header */}
        <Animated.View style={[
          styles.header,
          isStickyHeader && styles.headerSticky,
          { opacity: headerOpacity, backgroundColor: "rgba(0, 0, 0, 0.7)", shadowColor: "rgba(0, 0, 0, 0.7)", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 5 }
        ]}>
          <View style={styles.headerContent}>
            <TouchableOpacity style={styles.headerIcon}>
              <Image source={icon} style={styles.headerIconImage} />
            </TouchableOpacity>

            <View style={styles.logoContainer}>
              <Image 
                source={logo} 
                style={[
                  styles.logoImage,
                  isStickyHeader && styles.logoImageSticky
                ]} 
              />
            </View>

            <View style={styles.headerRight}>
              <TouchableOpacity style={styles.headerIcon}>
                <Fontisto 
                  name="ticket-alt" 
                  size={22} 
                  color={isStickyHeader ? "#E50914" : "#fff"} 
                />
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.headerIcon}
                onPress={toggleSideMenu}
              >
                <Text style={[
                  styles.headerIconText,
                  isStickyHeader && styles.headerIconTextSticky
                ]}>☰</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Animated.View>

        {/* White background layer for fade effect */}
        <Animated.View style={[
          styles.headerWhiteLayer,
          { opacity: Animated.subtract(1, headerOpacity) }
        ]}>
          <View style={styles.headerContent}>
            <TouchableOpacity style={styles.headerIcon}>
              <Image source={icon} style={styles.headerIconImage} />
            </TouchableOpacity>

            <View style={styles.logoContainer}>
              <Image 
                source={logo} 
                style={[
                  styles.logoImage,
                  styles.logoImageSticky
                ]} 
              />
            </View>

            <View style={styles.headerRight}>
              <TouchableOpacity style={styles.headerIcon}>
                <Fontisto 
                  name="ticket-alt" 
                  size={22} 
                  color="#E50914"
                />
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.headerIcon}
                onPress={toggleSideMenu}
              >
                <Text style={[
                  styles.headerIconText,
                  styles.headerIconTextSticky
                ]}>☰</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Animated.View>

        {/* Background Image cho sticky tabs */}
        {isStickyHeader && (
          <Image 
            source={backgroundTab} 
            style={styles.stickyBackgroundImage}
            resizeMode="cover"
          />
        )}
        
        {/* Sticky Tabs - chỉ hiển thị khi sticky */}
        {isStickyHeader && (
          <View style={styles.tabsContainerSticky}>
            {tabs.map((tab) => (
              <TouchableOpacity
                key={tab}
                style={[styles.tab]}
                onPress={() => handleStickyTabClick(tab)}
              >
                <Text
                  style={[
                    styles.tabTextSticky,
                    selectedTab === tab && styles.activeTabTextSticky,
                  ]}
                >
                  {tab}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>

      <ScrollView 
        ref={scrollViewRef}
        style={styles.scrollContent}
        contentContainerStyle={styles.scrollContentContainer}
        showsVerticalScrollIndicator={false}
        bounces={true}
        onScroll={handleMainScroll}
        scrollEventThrottle={16}
      >
        {/* Banner Section - SCROLL */}
        <View style={styles.bannerSection}>
          <Image source={bannerBG} style={styles.bannerBackground} />
          
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
        
        {/* Navigation Tabs - ban đầu nằm trong scroll */}
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

        {/* Promotional Items Section */}
        <View style={styles.promotionalSection}>
          {/* Banner Image trong promotional section */}
          <View style={styles.bannerImageInPromotional}>
            <Image source={banner2} style={styles.bannerImageFull} />
          </View>
          
          {/* Promotional Items Carousel */}
          <FlatList
            ref={promotionalFlatListRef}
            data={promotionalItems}
            horizontal
            showsHorizontalScrollIndicator={false}
            pagingEnabled={false}
            snapToInterval={width}
            snapToAlignment="start"
            decelerationRate="fast"
            contentContainerStyle={styles.promotionalCarouselContent}
            onMomentumScrollEnd={(event) => {
              const offsetX = event.nativeEvent.contentOffset.x;
              const pageIndex = Math.round(offsetX / width);
              setCurrentPromotionalPage(pageIndex);
            }}
            renderItem={({ item }) => (
              <View style={styles.promotionalItem}>
                <View style={styles.promotionalCircle}>
                  <Image source={item.image} style={styles.promotionalImage} />
                </View>
                <View style={styles.promotionalTextContainer}>
                  <Text style={styles.promotionalText}>{item.title}</Text>
                </View>
              </View>
            )}
            keyExtractor={(item) => item.id.toString()}
          />
          
          {/* Pagination Dots */}
          <View style={styles.promotionalPagination}>
            {[0, 1].map((pageIndex) => (
              <TouchableOpacity
                key={pageIndex}
                style={[
                  styles.promotionalDot,
                  currentPromotionalPage === pageIndex && styles.activePromotionalDot,
                ]}
                onPress={() => handlePromotionalPageChange(pageIndex)}
              />
            ))}
          </View>
        </View>

        {/* Hot News Section */}
        <View style={styles.hotNewsSection}>
          <View style={styles.hotNewsHeader}>
            <Text style={styles.hotNewsTitle}>Tin nóng</Text>
            <TouchableOpacity style={styles.viewAllButton}>
              <Text style={styles.viewAllText}>TẤT CẢ</Text>
            </TouchableOpacity>
          </View>
          
          <FlatList
            data={hotNewsItems}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.hotNewsContent}
            renderItem={({ item }) => (
              <TouchableOpacity style={styles.hotNewsCard}>
                <Image source={item.image} style={styles.hotNewsImage} />
                <View style={styles.hotNewsCardContent}>
                  <Text style={styles.hotNewsCardTitle} numberOfLines={2}>
                    {item.title}
                  </Text>
                </View>
              </TouchableOpacity>
            )}
            keyExtractor={(item) => item.id.toString()}
          />
        </View>

        {/* Partner Offers Section */}
        <View style={styles.partnerOffersSection}>
          <Text style={styles.partnerOffersTitle}>Ưu đãi từ đối tác</Text>
          
          <FlatList
            ref={partnerOffersFlatListRef}
            data={partnerOffers}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.partnerOffersContent}
            onScroll={handlePartnerOfferScroll}
            onMomentumScrollEnd={handlePartnerOfferScroll}
            scrollEventThrottle={16}
            decelerationRate="fast"
            snapToInterval={width * 0.85 + 12}
            snapToAlignment="start"
            pagingEnabled={false}
            renderItem={({ item, index }) => (
              <TouchableOpacity style={styles.partnerOfferCard}>
                <Image 
                  source={item.image} 
                  style={styles.partnerOfferImage}
                  resizeMode="cover"
                />
              </TouchableOpacity>
            )}
            keyExtractor={(item, index) => `partner-offer-${item.id}-${index}`}
            getItemLayout={(data, index) => ({
              length: width * 0.85 + 12,
              offset: (width * 0.85 + 12) * index,
              index,
            })}
          />
        </View>
        </View>
      </ScrollView>

      {/* Side Menu - Slide from right */}
      {showSideMenu && (
        <View style={styles.sideMenuOverlay}>
          <TouchableOpacity
            style={styles.sideMenuOverlayTouchable}
            activeOpacity={1}
            onPress={closeSideMenu}
          />
          <Animated.View
            style={[
              styles.sideMenuContainer,
              {
                transform: [{ translateX: sideMenuTranslateX }],
              },
            ]}
          >
            <ScrollView 
              style={styles.sideMenuContent} 
              contentContainerStyle={styles.sideMenuContentContainer}
              showsVerticalScrollIndicator={true}
            >
              {/* User Profile Section */}
              <View style={styles.menuProfileSection}>
                <View style={styles.menuProfileHeader}>
                  <TouchableOpacity style={styles.menuHeaderIcon}>
                    <Fontisto name="bell" size={26} color="#fff" />
                    <View style={styles.menuBellBadge} />
                  </TouchableOpacity>
                  <View style={styles.menuAvatarContainer}>
                    <Image source={icon} style={styles.menuProfileAvatar} />
                  </View>
                  <TouchableOpacity style={styles.menuHeaderIcon}>
                    <Fontisto name="player-settings" size={26} color="#fff" />
                  </TouchableOpacity>
                </View>
                <View style={styles.menuNameRow}>
                  <Text style={styles.menuProfileName}>Ngô Nhựt Tân</Text>
                  <View style={styles.menuMemberBadge}>
                    <Text style={styles.menuMemberBadgeText}>MEMBER</Text>
                  </View>
                </View>
                <Text style={styles.menuProfileMember}>Thẻ thành viên</Text>
              </View>

              {/* Member Card with Barcode */}
              <View style={styles.menuMemberCard}>
                <View style={styles.menuCardHeader}>
                  <View style={styles.menuCardU22Badge}>
                    <Text style={styles.menuCardU22Text}>U22</Text>
                  </View>
                  <Text style={styles.menuCardTitle}>ĐẶC QUYỀN</Text>
                  <TouchableOpacity>
                    <Text style={styles.menuCardArrow}>→</Text>
                  </TouchableOpacity>
                </View>
                <View style={styles.menuBarcodeContainer}>
                  <Image source={maVach} style={styles.menuBarcode} />
                  <Text style={styles.menuBarcodeNumber}>9992123603894608</Text>
                </View>
              </View>

              {/* Points Section */}
              <View style={styles.menuPointsSection}>
                <View style={styles.menuPointItem}>
                  <Text style={styles.menuPointLabel}>Tổng chi tiêu 2025</Text>
                  <Text style={styles.menuPointValue}>341.636 ₫</Text>
                </View>
                <View style={styles.menuPointItem}>
                  <Text style={styles.menuPointLabel}>Điểm thưởng</Text>
                  <Text style={styles.menuPointValue}>15</Text>
                </View>
              </View>

              {/* Booking Buttons */}
              <TouchableOpacity style={styles.menuBookingButton}>
                <Text style={styles.menuBookingButtonText}>Đặt vé theo Phim</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.menuBookingButton}>
                <Text style={styles.menuBookingButtonText}>Đặt vé theo Rạp</Text>
              </TouchableOpacity>

              {/* Menu Grid */}
              <View style={styles.menuGrid}>
                {menuGridItems.map((item) => (
                  <TouchableOpacity key={item.id} style={styles.menuGridItem}>
                    <View style={styles.menuGridIconContainer}>
                      <Text style={styles.menuGridIcon}>{item.icon}</Text>
                      {item.id === 8 && <View style={styles.menuGridBadge} />}
                    </View>
                    <Text style={styles.menuGridItemText}>{item.title}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Logout Button */}
              <TouchableOpacity style={styles.menuLogoutButton}>
                <Text style={styles.menuLogoutButtonText}>Đăng xuất</Text>
              </TouchableOpacity>

              <View style={styles.menuFooter}>
                <Image source={logo} style={styles.menuFooterLogo} />
                <Text style={styles.menuFooterText}>CULTUREPLEX</Text>
              </View>
            </ScrollView>
          </Animated.View>
        </View>
      )}

      {/* Promo Modal - Hiển thị khi vào HomeScreen lần đầu */}
      <Modal
        visible={showPromoModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowPromoModal(false)}
      >
        <View style={styles.modalOverlay}>
          {/* Blur Background - Overlay với opacity để tạo hiệu ứng mờ */}
          <View style={styles.blurBackground} />
          
          {/* Central Image */}
          <View style={styles.modalContent}>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setShowPromoModal(false)}
            >
              <Text style={styles.closeButtonText}>✕</Text>
            </TouchableOpacity>
            
            {/* Placeholder image - Bạn sẽ thay thế sau */}
            <Image
              source={startHome}
              style={styles.modalImage}
              resizeMode="contain"
            />
            
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#1a1a1a",
  },
  scrollContent: {
    flex: 1,
  },
  scrollContentContainer: {
    paddingTop: 90, // Chiều cao của header
    paddingBottom: 20, // Thêm padding bottom để scroll hết nội dung
    flexGrow: 1, // Đảm bảo ScrollView có đủ không gian
  },
  // Sticky Header styles
  stickyHeaderContainer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
    backgroundColor: "transparent",
  },
  stickyHeaderActive: {
    backgroundColor: "transparent",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
  },
  stickyBackgroundImage: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 50, // Chiều cao của tabs
    width: "100%",
    zIndex: -1, // Đặt ảnh nền phía sau tabs
  },
  headerSticky: {
    backgroundColor: "#fff",
  },
  headerWhiteLayer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: "#fff",
    paddingHorizontal: 6,
    paddingTop: 10,
    height: 90,
  },
  tabsContainerSticky: {
    backgroundColor: "transparent",
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 5,
    paddingVertical: 5,
  },
  tabTextSticky: {
    color: "#888",
    fontSize: 16,
    fontWeight: "500",
  },
  activeTabTextSticky: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 17,
  },
  bannerSection: {
    position: "relative",
    width: "100%",
  },
  bannerBackground: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: "100%",
    height: "100%",
    resizeMode: "cover",
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
    paddingHorizontal: 6,
    paddingTop: 10,
    height: 90,
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
     width: 26,
     height: 26,
     borderRadius: 15,
     resizeMode: 'cover',
   },
  headerIconText: {
    fontSize: 24,
    color: "#fff",
  },
  headerIconTextSticky: {
    color: "#E50914",
  },
  logoContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  logoImage: {
    width: 100,
    height: 100,
    marginLeft: 25,
    resizeMode: "contain",
  },
  logoImageSticky: {
    tintColor: "#E50914",
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
    alignItems: "center",
  },
  carouselContainer: {
    marginVertical: 8,
  },
  flatListContent: {
    paddingVertical: 0,
    paddingBottom: 0,
  },
  banner: {
    width: width - 70,
    marginHorizontal: 35,
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
    fontSize: 17,
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
  // Promotional Section styles
  promotionalSection: {
    backgroundColor: "#f5f5f5",
    paddingBottom: 10,
  },
  // Banner Image trong promotional section styles
  bannerImageInPromotional: {
    width: "100%",
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  bannerImageFull: {
    width: "100%",
    height: 180,
    borderRadius: 12,
    resizeMode: "cover",
  },
  promotionalCarouselContent: {
    paddingHorizontal: 0,
    alignItems: "center",
  },
  promotionalItem: {
    alignItems: "center",
    width: width / 3,
    paddingHorizontal: 8,
    minHeight: 100,
    justifyContent: "flex-start",
    paddingTop: 10,
  },
  promotionalCircle: {
    width: 70,
    height: 70,
    borderRadius: 35,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 5,
  },
  promotionalImage: {
    width: 70,
    height: 70,
    borderRadius: 35,
    resizeMode: "cover",
  },
  promotionalTextContainer: {
    height: 28,
    justifyContent: "center",
    alignItems: "center",
    width: "100%",
  },
  promotionalText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#333",
    textAlign: "center",
    lineHeight: 16,
  },
  promotionalPagination: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 12,
  },
  promotionalDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#ccc",
    marginHorizontal: 4,
  },
  activePromotionalDot: {
    backgroundColor: "#E50914",
  },
  // Hot News Section styles
  hotNewsSection: {
    backgroundColor: "#fff",
    paddingTop: 10,
    paddingBottom: 5,
    paddingLeft: 16,
    paddingRight: 0,
  },
  hotNewsHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
    paddingRight: 16,
  },
  hotNewsTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#000",
  },
  viewAllButton: {
    backgroundColor: "#fff",
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: "#000",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 2,
    elevation: 2,
  },
  viewAllText: {
    color: "#000",
    fontSize: 10,
    fontWeight: "bold",
    letterSpacing: 0.8,
  },
  hotNewsContent: {
    paddingLeft: 0,
  },
  hotNewsCard: {
    width: width * 0.44,
    marginRight: 10,
    backgroundColor: "#fff",
    borderRadius: 12,
    overflow: "hidden",
  },
  hotNewsImage: {
    width: "100%",
    height: 100,
    resizeMode: "cover",
    borderRadius: 12,
  },
  hotNewsCardContent: {
    paddingTop: 5,
    minHeight: 50,
  },
  hotNewsCardTitle: {
    fontSize: 12,
    color: "#333",
    lineHeight: 16,
    fontWeight: "600",
  },
  // Partner Offers Section styles
  partnerOffersSection: {
    borderTopWidth: 9,
    borderColor: "#dddacf",
    backgroundColor: "#fff",
    paddingTop: 10,
    paddingBottom: 15,
    paddingLeft: 16,
    paddingRight: 0,
  },
  partnerOffersTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#000",
    marginBottom: 8,
    paddingRight: 16,
  },
  partnerOffersContent: {
    paddingLeft: 0,
  },
  partnerOfferCard: {
    width: width * 0.85,
    height: 140,
    marginRight: 12,
    borderRadius: 16,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  partnerOfferImage: {
    width: "100%",
    height: "100%",
    borderRadius: 16,
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "transparent",
  },
  blurBackground: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
  },
  modalContent: {
    width: width * 0.85,
    maxHeight: height * 0.85,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  closeButton: {
    position: "absolute",
    top: 20,
    right: -15,
    width: 40,
    height: 40,
    display: "flex",
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 20,
    borderWidth: 4,
    borderColor: "#fff",
    backgroundColor: "transparent",
    zIndex: 1000,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  closeButtonText: {
    fontSize: 24,
    color: "#fff",
    fontWeight: "bold",
    marginTop: -3,
  },
  modalImage: {
    width: width * 0.85,
    height: height * 0.6,
    borderRadius: 10,
  },
  // Side Menu Styles
  sideMenuOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 2000,
    flexDirection: "row",
  },
  sideMenuOverlayTouchable: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  sideMenuContainer: {
    width: width * 0.85,
    height: "100%",
    backgroundColor: "#1a1a1a",
    shadowColor: "#000",
    shadowOffset: { width: -2, height: 0 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 10,
  },
  sideMenuContent: {
    flex: 1,
  },
  sideMenuContentContainer: {
    paddingTop: 50,
    paddingBottom: 40,
    paddingHorizontal: 0,
  },
  // Profile Section
  menuProfileSection: {
    alignItems: "center",
    paddingTop: 20,
    paddingBottom: 10,
  },
  menuProfileHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
    marginBottom: 10,
    paddingHorizontal: 40,
  },
  menuHeaderIcon: {
    padding: 10,
    position: "relative",
  },
  menuBellBadge: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#E50914",
  },
  menuHeaderIconText: {
    fontSize: 24,
  },
  menuAvatarContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginHorizontal: 20,
    padding: 3,
    alignItems: "center",
    justifyContent: "center",
  },
  menuProfileAvatar: {
    width: 74,
    height: 74,
    borderRadius: 37,
    backgroundColor: "#fff",
  },
  menuNameRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  menuProfileName: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#fff",
    marginRight: 8,
  },
  menuMemberBadge: {
    backgroundColor: "#fff",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 3,
  },
  menuMemberBadgeText: {
    fontSize: 9,
    fontWeight: "bold",
    color: "#000",
  },
  menuProfileMember: {
    fontSize: 13,
    color: "#E50914",
  },
  // Member Card
  menuMemberCard: {
    backgroundColor: "#fff",
    marginHorizontal: 16,
    marginVertical: 10,
    borderRadius: 4,
    padding: 2,
    paddingHorizontal: 8,
  },
  menuCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  menuCardU22Badge: {
    backgroundColor: "#9C27B0",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    marginRight: 8,
  },
  menuCardU22Text: {
    fontSize: 11,
    fontWeight: "bold",
    color: "#fff",
  },
  menuCardLogo: {
    width: 40,
    height: 20,
    resizeMode: "contain",
    marginRight: 8,
  },
  menuCardTitle: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#000",
    flex: 1,
  },
  menuCardArrow: {
    fontSize: 35,
    color: "#000",
  },
  menuBarcodeContainer: {
    borderTopWidth: 1,
    borderColor: "#000",
    borderStyle: "solid",
    paddingVertical: 6,
    alignItems: "center",
  },
  menuBarcode: {
    width: width * 0.75,
    height: 50,
    resizeMode: "cover",
    marginBottom: 8,
  },
  menuBarcodeNumber: {
    fontSize: 12,
    color: "#666",
  },
  // Points Section
  menuPointsSection: {
    display: "flex",
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  menuPointItem: {
    alignItems: "flex-start",
    marginRight: 15,
  },
  menuPointLabel: {
    fontSize: 11,
    color: "#999",
    marginBottom: 4,
  },
  menuPointValue: {
    fontSize: 16,
    fontWeight: "600",
    color: "#fff",
  },
  // Booking Buttons
  menuBookingButton: {
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: "#333",
    borderStyle: "solid",
    backgroundColor: "transparent",
    marginHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: "center",
  },
  menuBookingButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "500",
  },
  // Menu Grid
  menuGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: 8,
    paddingTop: 16,
    paddingBottom: 10,
  },
  menuGridItem: {
    width: "33.33%",
    alignItems: "center",
    paddingVertical: 16,
  },
  menuGridIconContainer: {
    width: 50,
    height: 50,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
    position: "relative",
  },
  menuGridIcon: {
    fontSize: 24,
  },
  menuGridBadge: {
    position: "absolute",
    top: 5,
    right: 5,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#E50914",
  },
  menuGridItemText: {
    fontSize: 11,
    color: "#fff",
    textAlign: "center",
    paddingHorizontal: 4,
  },
  // Logout Button
  menuLogoutButton: {
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: "#333",
    borderStyle: "solid",
    backgroundColor: "transparent",
    marginHorizontal: 16,
    marginTop: 10,
    paddingVertical: 14,
    alignItems: "center",
  },
  menuLogoutButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "500",
  },
  menuFooter: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
  },
  menuFooterLogo: {
    width: 100,
    height: 100,
    resizeMode: "contain",
    marginBottom: -20,
    tintColor: "#444"
  },
  menuFooterText: {
    color: "#333",
    fontSize: 12,
    fontWeight: "500",
  },
});

export default HomeScreen;
