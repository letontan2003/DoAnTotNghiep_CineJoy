import { memo, useEffect, useMemo, useRef } from "react";
import { Animated, StyleSheet, View, Dimensions } from "react-native";

const { width } = Dimensions.get("window");
const ROWS = 8;
const COLS = 10;

const SeatSelectionSkeleton = () => {
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

  const animatedStyle = useMemo(
    () => [{ opacity: pulse }, styles.animatePulse],
    [pulse]
  );

  return (
    <View style={styles.seatGrid}>
      {Array.from({ length: ROWS }).map((_, row) => (
        <View key={row} style={styles.seatRow}>
          {Array.from({ length: COLS }).map((_, col) => {
            const palette =
              row >= ROWS - 2
                ? styles.coupleSeat
                : row >= 1
                ? styles.vipSeat
                : styles.normalSeat;
            return (
              <Animated.View
                key={`${row}-${col}`}
                style={[styles.seat, palette, ...animatedStyle]}
              />
            );
          })}
        </View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  seatGrid: {
    paddingHorizontal: 20,
    paddingBottom: 12,
    width: "100%",
  },
  seatRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 6,
    marginBottom: 6,
  },
  seat: {
    width: (width - 90) / COLS,
    height: (width - 90) / COLS,
    borderRadius: 6,
    backgroundColor: "#1f2937",
  },
  normalSeat: {
    backgroundColor: "#4b5563",
  },
  vipSeat: {
    backgroundColor: "#b45309",
  },
  coupleSeat: {
    backgroundColor: "#be185d",
  },
  animatePulse: {
    // stylistic placeholder to mimic tailwind `animate-pulse`
  },
});

export default memo(SeatSelectionSkeleton);
