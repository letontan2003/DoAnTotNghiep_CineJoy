import { useEffect, useRef } from "react";
import { Animated, StyleSheet, View } from "react-native";

interface FormatFilterSkeletonProps {
  cardCount?: number;
}

const FormatFilterSkeleton = ({ cardCount = 3 }: FormatFilterSkeletonProps) => {
  const pulseAnim = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0.4,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    );
    animation.start();

    return () => animation.stop();
  }, [pulseAnim]);

  return (
    <View style={styles.container}>
      {Array.from({ length: cardCount }).map((_, idx) => (
        <View key={idx} style={styles.card}>
          <Animated.View style={[styles.title, { opacity: pulseAnim }]} />
          <Animated.View style={[styles.subtitle, { opacity: pulseAnim }]} />
          <View style={styles.timeRow}>
            <Animated.View style={[styles.timeChip, { opacity: pulseAnim }]} />
            <Animated.View style={[styles.timeChip, { opacity: pulseAnim }]} />
            <Animated.View style={[styles.timeChip, { opacity: pulseAnim }]} />
          </View>
        </View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
    gap: 12,
  },
  card: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    padding: 16,
    backgroundColor: "#fff",
    gap: 12,
  },
  title: {
    height: 18,
    borderRadius: 4,
    backgroundColor: "#e5e7eb",
  },
  subtitle: {
    height: 14,
    width: "70%",
    borderRadius: 4,
    backgroundColor: "#f0f2f5",
  },
  timeRow: {
    flexDirection: "row",
    gap: 8,
  },
  timeChip: {
    flex: 1,
    height: 32,
    borderRadius: 6,
    backgroundColor: "#f0f2f5",
  },
});

export default FormatFilterSkeleton;
