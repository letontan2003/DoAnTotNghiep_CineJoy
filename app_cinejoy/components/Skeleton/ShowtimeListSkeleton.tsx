import { memo, useEffect, useRef } from "react";
import { Animated, StyleSheet, View } from "react-native";

interface ShowtimeListSkeletonProps {
  rows?: number;
}

const ShowtimeListSkeleton = ({ rows = 2 }: ShowtimeListSkeletonProps) => {
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
      {Array.from({ length: rows }).map((_, index) => (
        <View key={index} style={styles.row}>
          <Animated.View style={[styles.labelLine, animatedStyle]} />
          <View style={styles.buttonsRow}>
            {Array.from({ length: 3 }).map((__, idx) => (
              <Animated.View key={idx} style={[styles.button, animatedStyle]} />
            ))}
          </View>
        </View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingVertical: 8,
    gap: 16,
  },
  row: {
    gap: 10,
  },
  labelLine: {
    height: 14,
    borderRadius: 8,
    backgroundColor: "#e5e7eb",
    width: "60%",
  },
  buttonsRow: {
    flexDirection: "row",
    gap: 8,
  },
  button: {
    flex: 1,
    height: 38,
    borderRadius: 8,
    backgroundColor: "#e5e7eb",
  },
});

export default memo(ShowtimeListSkeleton);
