import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  Image,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { RouteProp, useNavigation, useRoute } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import dayjs from "dayjs";
import { getBlogByIdApi, getVisibleBlogsApi } from "@/services/api";
import { IBlog } from "@/types/api";
import SideMenu from "@/components/SideMenu";
import BlogDetailSkeleton from "@/components/Skeleton/BlogDetailSkeleton";
import banner1 from "assets/banner1.png";

const { width } = Dimensions.get("window");

type RootStackParamList = {
  BlogDetailScreen: { blogId: string; blog?: IBlog };
  HomeScreen: undefined;
};

type BlogDetailRouteProp = RouteProp<RootStackParamList, "BlogDetailScreen">;
type BlogDetailNavProp = StackNavigationProp<
  RootStackParamList,
  "BlogDetailScreen"
>;

const BlogDetailScreen = () => {
  const navigation = useNavigation<BlogDetailNavProp>();
  const route = useRoute<BlogDetailRouteProp>();
  const { blogId, blog: initialBlog } = route.params;

  const scrollViewRef = useRef<ScrollView>(null);
  const [currentBlogId, setCurrentBlogId] = useState(blogId);
  const [blog, setBlog] = useState<IBlog | null>(initialBlog || null);
  const [loading, setLoading] = useState(!initialBlog);
  const [error, setError] = useState<string | null>(null);
  const [relatedBlogs, setRelatedBlogs] = useState<IBlog[]>([]);
  const [relatedLoading, setRelatedLoading] = useState(true);
  const [showSideMenu, setShowSideMenu] = useState(false);

  const fetchBlog = useCallback(
    async (id?: string) => {
      const targetId = id || currentBlogId;
      try {
        setLoading(true);
        setError(null);
        const response = await getBlogByIdApi(targetId);
        if (response && response._id) {
          setBlog(response);
          setCurrentBlogId(targetId);
        } else {
          setError("Không tải được nội dung tin nóng.");
        }
      } catch (err) {
        console.error("fetchBlog error:", err);
        setError("Không tải được nội dung tin nóng.");
      } finally {
        setLoading(false);
      }
    },
    [currentBlogId]
  );

  const fetchRelatedBlogs = useCallback(async () => {
    try {
      setRelatedLoading(true);
      const list = await getVisibleBlogsApi();
      if (Array.isArray(list)) {
        setRelatedBlogs(list);
      } else {
        setRelatedBlogs([]);
      }
    } catch (err) {
      console.error("fetchRelatedBlogs error:", err);
      setRelatedBlogs([]);
    } finally {
      setRelatedLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!initialBlog || currentBlogId !== blogId) {
      fetchBlog();
    }
  }, [fetchBlog, initialBlog, currentBlogId, blogId]);

  useEffect(() => {
    fetchRelatedBlogs();
  }, [fetchRelatedBlogs]);

  const formattedDate = useMemo(() => {
    if (!blog?.postedDate) return "";
    return dayjs(blog.postedDate).format("dddd, DD/MM/YYYY");
  }, [blog?.postedDate]);

  const contentBlocks = useMemo(() => {
    if (!blog?.content) return [];
    return blog.content
      .split(/\n{2,}/)
      .map((block) => block.trim())
      .filter(Boolean);
  }, [blog?.content]);

  const extraBlogs = useMemo(() => {
    if (!blog) return [];
    return relatedBlogs.filter((item) => item._id !== blog._id).slice(0, 6);
  }, [relatedBlogs, blog]);

  const handleBlogPress = (item: IBlog) => {
    if (!item._id) return;

    // Scroll lên đầu màn hình
    scrollViewRef.current?.scrollTo({ y: 0, animated: true });

    // Cập nhật blogId và load dữ liệu mới
    setCurrentBlogId(item._id);
    setError(null);
    // Fetch dữ liệu mới
    fetchBlog(item._id);
  };

  const renderRelated = () => {
    if (relatedLoading) {
      return (
        <View style={styles.relatedPlaceholder}>
          <ActivityIndicator color="#E50914" />
        </View>
      );
    }
    if (!extraBlogs.length) return null;
    return (
      <View style={styles.relatedSection}>
        <View style={styles.relatedHeader}>
          <Text style={styles.relatedTitle}>Tin nóng khác</Text>
        </View>
        <FlatList
          data={extraBlogs}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.relatedList}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.relatedCard}
              activeOpacity={0.8}
              onPress={() => handleBlogPress(item)}
            >
              <Image
                source={item.posterImage ? { uri: item.posterImage } : banner1}
                style={styles.relatedImage}
              />
              <View style={styles.relatedCardContent}>
                <Text style={styles.relatedCardTitle} numberOfLines={2}>
                  {item.title}
                </Text>
              </View>
            </TouchableOpacity>
          )}
          keyExtractor={(item) => item._id}
        />
      </View>
    );
  };

  const renderBody = () => {
    if (loading) {
      return <BlogDetailSkeleton />;
    }
    if (error || !blog) {
      return (
        <View style={styles.stateContainer}>
          <Text style={styles.errorText}>{error || "Không có dữ liệu."}</Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={() => fetchBlog()}
          >
            <Text style={styles.retryText}>Thử lại</Text>
          </TouchableOpacity>
        </View>
      );
    }
    return (
      <ScrollView
        ref={scrollViewRef}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {blog.backgroundImage ? (
          <Image
            source={{ uri: blog.backgroundImage }}
            style={styles.heroImage}
          />
        ) : null}
        <View style={styles.card}>
          <Text style={styles.title}>{blog.title}</Text>
          {formattedDate ? (
            <Text style={styles.dateText}>Ngày đăng: {formattedDate}</Text>
          ) : null}
          <Text style={styles.description}>{blog.description}</Text>
          <View style={styles.divider} />
          {contentBlocks.map((paragraph, index) => (
            <Text
              key={`${index}-${paragraph.slice(0, 10)}`}
              style={styles.contentText}
            >
              {paragraph}
            </Text>
          ))}
        </View>
        {renderRelated()}
      </ScrollView>
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
        <Text style={styles.headerTitle}>Tin nóng</Text>
        <TouchableOpacity
          style={styles.menuButton}
          onPress={() => setShowSideMenu(true)}
        >
          <Text style={styles.menuIcon}>☰</Text>
        </TouchableOpacity>
      </View>
      {renderBody()}
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
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 26,
    paddingBottom: 12,
    backgroundColor: "#0b1327",
  },
  backButton: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  backIcon: {
    color: "#fff",
    fontSize: 28,
    fontWeight: "600",
  },
  menuButton: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  menuIcon: {
    color: "#fff",
    fontSize: 28,
  },
  headerTitle: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "700",
  },
  contentContainer: {
    paddingBottom: 40,
  },
  heroImage: {
    width: "100%",
    height: 220,
    marginBottom: 16,
  },
  card: {
    backgroundColor: "#ffffff",
    padding: 20,
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 6,
    textAlign: "justify",
  },
  dateText: {
    color: "#6b7280",
    fontSize: 12,
    marginBottom: 12,
  },
  description: {
    color: "#374151",
    fontSize: 15,
    lineHeight: 21,
    marginBottom: 16,
    textAlign: "justify",
  },
  divider: {
    height: 1,
    backgroundColor: "#e5e7eb",
    marginBottom: 16,
  },
  contentText: {
    color: "#374151",
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 12,
    textAlign: "justify",
  },
  stateContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  stateText: {
    marginTop: 12,
    color: "#6b7280",
  },
  errorText: {
    color: "#dc2626",
    textAlign: "center",
    marginBottom: 12,
  },
  retryButton: {
    borderWidth: 1,
    borderColor: "#dc2626",
    borderRadius: 999,
    paddingHorizontal: 24,
    paddingVertical: 10,
  },
  retryText: {
    color: "#dc2626",
    fontWeight: "600",
  },
  relatedSection: {
    backgroundColor: "#fff",
    paddingTop: 10,
    paddingBottom: 5,
    paddingLeft: 16,
    paddingRight: 0,
    marginTop: 20,
  },
  relatedHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
    paddingRight: 16,
  },
  relatedTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#000",
  },
  relatedList: {
    paddingLeft: 0,
  },
  relatedCard: {
    width: width * 0.44,
    marginRight: 10,
    backgroundColor: "#fff",
    borderRadius: 12,
    overflow: "hidden",
  },
  relatedImage: {
    width: "100%",
    height: 100,
    resizeMode: "cover",
    borderRadius: 12,
  },
  relatedCardContent: {
    paddingTop: 5,
    minHeight: 50,
    paddingHorizontal: 8,
    paddingBottom: 8,
  },
  relatedCardTitle: {
    fontSize: 12,
    color: "#333",
    lineHeight: 16,
    fontWeight: "600",
  },
  relatedPlaceholder: {
    paddingVertical: 20,
    alignItems: "center",
    justifyContent: "center",
  },
});

export default BlogDetailScreen;
