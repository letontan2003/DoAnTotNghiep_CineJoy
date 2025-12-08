import { useEffect, useRef } from "react";
import { View, StyleSheet, Animated, StyleProp, ViewStyle } from "react-native";

interface BookingHistorySkeletonProps {
  count?: number;
}

const BookingHistorySkeleton = ({ count = 3 }: BookingHistorySkeletonProps) => {
  const pulseOpacity = useRef(new Animated.Value(0.6)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseOpacity, {
          toValue: 1,
          duration: 900,
          useNativeDriver: true,
        }),
        Animated.timing(pulseOpacity, {
          toValue: 0.4,
          duration: 900,
          useNativeDriver: true,
        }),
      ])
    );

    animation.start();
    return () => animation.stop();
  }, [pulseOpacity]);

  const renderShimmer = (extraStyle: StyleProp<ViewStyle>) => (
    <Animated.View
      style={[styles.shimmer, { opacity: pulseOpacity }, extraStyle]}
    />
  );

  const placeholders = Array.from({ length: count });

  return (
    <View style={styles.list}>
      {placeholders.map((_, index) => (
        <View key={`skeleton-${index}`} style={styles.card}>
          <View style={styles.cardHeader}>
            {renderShimmer({ width: 160, height: 12 })}
            {renderShimmer(styles.statusChip)}
          </View>
          <View style={styles.cardBody}>
            {renderShimmer(styles.poster)}
            <View style={styles.info}>
              {renderShimmer({ width: "70%", height: 14 })}
              {renderShimmer({ width: "60%", height: 12 })}
              {renderShimmer({ width: "65%", height: 12 })}
              {renderShimmer({ width: "55%", height: 12 })}
              {renderShimmer({ width: "40%", height: 12 })}
              {renderShimmer({ width: "50%", height: 16 })}
            </View>
          </View>
        </View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  list: {
    padding: 16,
    paddingBottom: 40,
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  statusChip: {
    width: 64,
    height: 20,
    borderRadius: 999,
  },
  cardBody: {
    flexDirection: "row",
    gap: 12,
  },
  poster: {
    width: 90,
    height: 120,
    borderRadius: 10,
  },
  info: {
    flex: 1,
    gap: 8,
  },
  shimmer: {
    backgroundColor: "#e5e7eb",
    borderRadius: 8,
  },
});

export default BookingHistorySkeleton;
