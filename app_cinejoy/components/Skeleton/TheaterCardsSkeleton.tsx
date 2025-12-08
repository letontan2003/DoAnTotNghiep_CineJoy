import { memo, useEffect, useRef } from "react";
import { Animated, StyleSheet, View } from "react-native";
import ShowtimeListSkeleton from "./ShowtimeListSkeleton";

interface TheaterCardsSkeletonProps {
  count?: number;
}

const TheaterCardsSkeleton = ({ count = 3 }: TheaterCardsSkeletonProps) => {
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
    <View style={styles.container}>
      {Array.from({ length: count }).map((_, index) => (
        <View key={index} style={styles.card}>
          <View style={styles.cardHeader}>
            <Animated.View style={[styles.titleLine, animatedStyle]} />
            <Animated.View style={[styles.icon, animatedStyle]} />
          </View>
          <ShowtimeListSkeleton rows={2} />
        </View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingTop: 12,
    gap: 12,
  },
  card: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    padding: 16,
    backgroundColor: "#fff",
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  titleLine: {
    height: 16,
    borderRadius: 8,
    backgroundColor: "#e5e7eb",
    flex: 1,
    marginRight: 12,
  },
  icon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#e5e7eb",
  },
});

export default memo(TheaterCardsSkeleton);
