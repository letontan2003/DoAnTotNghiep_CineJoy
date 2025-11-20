import { memo, useEffect, useRef } from "react";
import { Animated, StyleSheet, View } from "react-native";

interface HotNewsListSkeletonProps {
  count?: number;
}

const HotNewsListSkeleton = ({ count = 6 }: HotNewsListSkeletonProps) => {
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
    <View style={styles.list}>
      {Array.from({ length: count }).map((_, index) => (
        <View key={index} style={styles.card}>
          <Animated.View style={[styles.imageSkeleton, animatedStyle]} />
          <View style={styles.cardBody}>
            <Animated.View style={[styles.titleSkeleton, animatedStyle]} />
            <Animated.View style={[styles.dateSkeleton, animatedStyle]} />
            <Animated.View
              style={[styles.descriptionSkeleton, animatedStyle]}
            />
          </View>
        </View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  list: {
    padding: 16,
    paddingBottom: 32,
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    marginBottom: 12,
    overflow: "hidden",
  },
  imageSkeleton: {
    width: "100%",
    height: 160,
    backgroundColor: "#e5e7eb",
  },
  cardBody: {
    padding: 12,
    gap: 8,
  },
  titleSkeleton: {
    width: "85%",
    height: 18,
    borderRadius: 6,
    backgroundColor: "#d1d5db",
  },
  dateSkeleton: {
    width: "50%",
    height: 12,
    borderRadius: 4,
    backgroundColor: "#e5e7eb",
  },
  descriptionSkeleton: {
    width: "100%",
    height: 14,
    borderRadius: 4,
    backgroundColor: "#e5e7eb",
  },
});

export default memo(HotNewsListSkeleton);
