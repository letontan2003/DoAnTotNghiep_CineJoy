import { useCallback, useEffect, useState } from "react";
import {
  FlatList,
  Image,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { RouteProp, useNavigation, useRoute } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import dayjs from "dayjs";
import { getVisibleBlogsApi } from "@/services/api";
import { IBlog } from "@/types/api";
import banner1 from "assets/banner1.png";
import HotNewsListSkeleton from "@/components/Skeleton/HotNewsListSkeleton";
import SideMenu from "@/components/SideMenu";

type RootStackParamList = {
  HotNewsListScreen: undefined;
  BlogDetailScreen: { blogId: string; blog?: IBlog };
  HomeScreen: undefined;
};

type HotNewsListNavProp = StackNavigationProp<
  RootStackParamList,
  "HotNewsListScreen"
>;
type HotNewsListRouteProp = RouteProp<RootStackParamList, "HotNewsListScreen">;

const HotNewsListScreen = () => {
  const navigation = useNavigation<HotNewsListNavProp>();
  useRoute<HotNewsListRouteProp>();

  const [blogs, setBlogs] = useState<IBlog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showSideMenu, setShowSideMenu] = useState(false);

  const fetchBlogs = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await getVisibleBlogsApi();
      if (Array.isArray(response)) {
        setBlogs(response);
      } else {
        setBlogs([]);
      }
    } catch (err) {
      console.error("fetchBlogs error:", err);
      setError("Không tải được danh sách tin nóng");
      setBlogs([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBlogs();
  }, [fetchBlogs]);

  const handlePressItem = (item: IBlog) => {
    if (!item?._id) return;
    navigation.navigate("BlogDetailScreen", {
      blogId: item._id,
      blog: item,
    });
  };

  const renderItem = ({ item }: { item: IBlog }) => {
    return (
      <TouchableOpacity
        style={styles.card}
        activeOpacity={0.85}
        onPress={() => handlePressItem(item)}
      >
        <Image
          source={item.posterImage ? { uri: item.posterImage } : banner1}
          style={styles.cardImage}
        />
        <View style={styles.cardContent}>
          <Text style={styles.cardTitle} numberOfLines={2}>
            {item.title}
          </Text>
          <Text style={styles.cardDate}>
            Ngày đăng:{" "}
            {item.postedDate
              ? dayjs(item.postedDate).format("DD/MM/YYYY")
              : "Đang cập nhật"}
          </Text>
          <Text style={styles.cardDescription} numberOfLines={2}>
            {item.description}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  const renderContent = () => {
    if (loading) {
      return <HotNewsListSkeleton />;
    }

    if (error) {
      return (
        <View style={styles.stateContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={fetchBlogs}>
            <Text style={styles.retryText}>Thử lại</Text>
          </TouchableOpacity>
        </View>
      );
    }

    if (!blogs.length) {
      return (
        <View style={styles.stateContainer}>
          <Text style={styles.stateText}>Hiện chưa có tin nóng.</Text>
        </View>
      );
    }

    return (
      <FlatList
        data={blogs}
        keyExtractor={(item) => item._id}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      />
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Tin mới và ưu đãi</Text>
        <TouchableOpacity
          style={styles.menuButton}
          onPress={() => setShowSideMenu(true)}
        >
          <Text style={styles.menuIcon}>☰</Text>
        </TouchableOpacity>
      </View>
      {renderContent()}
      <SideMenu visible={showSideMenu} onClose={() => setShowSideMenu(false)} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f4f4f5",
  },
  header: {
    backgroundColor: "#111827",
    paddingTop: 28,
    paddingBottom: 16,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  backButton: {
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  backIcon: {
    color: "#fff",
    fontSize: 28,
    fontWeight: "600",
  },
  headerTitle: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "700",
    textAlign: "center",
  },
  menuButton: {
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  menuIcon: {
    color: "#fff",
    fontSize: 24,
    fontWeight: "600",
  },
  listContent: {
    padding: 16,
    paddingBottom: 32,
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    marginBottom: 12,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  cardImage: {
    width: "100%",
    height: 160,
    resizeMode: "cover",
  },
  cardContent: {
    padding: 12,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 4,
  },
  cardDate: {
    fontSize: 12,
    color: "#6b7280",
    marginBottom: 6,
  },
  cardDescription: {
    fontSize: 13,
    color: "#4b5563",
  },
  stateContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  stateText: {
    marginTop: 8,
    fontSize: 14,
    color: "#4b5563",
    textAlign: "center",
  },
  errorText: {
    fontSize: 14,
    color: "#b91c1c",
    textAlign: "center",
    marginBottom: 16,
  },
  retryButton: {
    borderRadius: 999,
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: "#b91c1c",
  },
  retryText: {
    fontWeight: "600",
    color: "#b91c1c",
  },
});

export default HotNewsListScreen;
