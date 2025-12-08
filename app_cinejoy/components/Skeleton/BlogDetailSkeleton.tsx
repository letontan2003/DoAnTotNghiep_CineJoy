import { memo, useEffect, useRef } from "react";
import { Animated, ScrollView, StyleSheet, View } from "react-native";

const BlogDetailSkeleton = () => {
  const pulse = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 700,
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0.3,
          duration: 700,
          useNativeDriver: true,
        }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, [pulse]);

  const animatedStyle = { opacity: pulse };

  return (
    <ScrollView
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={false}
    >
      {/* Hero Image Skeleton */}
      <Animated.View style={[styles.heroImageSkeleton, animatedStyle]} />

      {/* Card Skeleton */}
      <View style={styles.card}>
        {/* Title Skeleton */}
        <Animated.View style={[styles.titleSkeleton, animatedStyle]} />

        {/* Date Skeleton */}
        <Animated.View
          style={[styles.dateSkeleton, { marginTop: 8 }, animatedStyle]}
        />

        {/* Description Skeleton */}
        <View style={styles.descriptionContainer}>
          <Animated.View
            style={[styles.descriptionLine, { marginTop: 12 }, animatedStyle]}
          />
          <Animated.View
            style={[styles.descriptionLine, { marginTop: 8 }, animatedStyle]}
          />
          <Animated.View
            style={[
              styles.descriptionLine,
              { width: "70%", marginTop: 8 },
              animatedStyle,
            ]}
          />
        </View>

        {/* Divider */}
        <View style={styles.divider} />

        {/* Content Lines Skeleton */}
        {[1, 2, 3, 4, 5, 6].map((index) => (
          <Animated.View
            key={index}
            style={[
              styles.contentLine,
              { marginTop: index === 1 ? 0 : 12 },
              index === 6 ? { width: "60%" } : {},
              animatedStyle,
            ]}
          />
        ))}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  contentContainer: {
    paddingBottom: 40,
  },
  heroImageSkeleton: {
    width: "100%",
    height: 220,
    backgroundColor: "#e5e7eb",
    marginBottom: 16,
  },
  card: {
    backgroundColor: "#ffffff",
    padding: 20,
  },
  titleSkeleton: {
    width: "90%",
    height: 28,
    borderRadius: 6,
    backgroundColor: "#d1d5db",
  },
  dateSkeleton: {
    width: "50%",
    height: 14,
    borderRadius: 4,
    backgroundColor: "#e5e7eb",
  },
  descriptionContainer: {
    marginTop: 6,
  },
  descriptionLine: {
    width: "100%",
    height: 16,
    borderRadius: 4,
    backgroundColor: "#e5e7eb",
  },
  divider: {
    height: 1,
    backgroundColor: "#e5e7eb",
    marginTop: 16,
    marginBottom: 16,
  },
  contentLine: {
    width: "100%",
    height: 16,
    borderRadius: 4,
    backgroundColor: "#e5e7eb",
  },
});

export default memo(BlogDetailSkeleton);
