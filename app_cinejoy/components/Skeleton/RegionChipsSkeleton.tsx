import { memo, useEffect, useRef } from "react";
import { Animated, StyleSheet, View } from "react-native";

const RegionChipsSkeleton = () => {
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
      {Array.from({ length: 5 }).map((_, index) => (
        <Animated.View key={index} style={[styles.chip, animatedStyle]} />
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    gap: 8,
  },
  chip: {
    height: 36,
    borderRadius: 18,
    backgroundColor: "#e5e7eb",
    flex: 1,
  },
});

export default memo(RegionChipsSkeleton);
