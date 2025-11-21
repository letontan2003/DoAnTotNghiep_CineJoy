import { memo, useEffect, useRef } from "react";
import { Animated, StyleSheet, View } from "react-native";

interface VoucherSkeletonProps {
  count?: number;
}

const VoucherSkeleton = ({ count = 3 }: VoucherSkeletonProps) => {
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
            <Animated.View style={[styles.titleSkeleton, animatedStyle]} />
            <Animated.View style={[styles.badgeSkeleton, animatedStyle]} />
          </View>
          <Animated.View style={[styles.infoSkeleton, animatedStyle]} />
          <Animated.View style={[styles.infoSkeleton2, animatedStyle]} />
          <Animated.View style={[styles.buttonSkeleton, animatedStyle]} />
        </View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    gap: 16,
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  titleSkeleton: {
    width: "60%",
    height: 20,
    borderRadius: 4,
    backgroundColor: "#e5e7eb",
  },
  badgeSkeleton: {
    width: 60,
    height: 24,
    borderRadius: 4,
    backgroundColor: "#e5e7eb",
  },
  infoSkeleton: {
    width: "80%",
    height: 16,
    borderRadius: 4,
    backgroundColor: "#e5e7eb",
    marginBottom: 8,
  },
  infoSkeleton2: {
    width: "70%",
    height: 16,
    borderRadius: 4,
    backgroundColor: "#e5e7eb",
    marginBottom: 12,
  },
  buttonSkeleton: {
    width: "100%",
    height: 44,
    borderRadius: 8,
    backgroundColor: "#e5e7eb",
  },
});

export default memo(VoucherSkeleton);
