import { memo, useEffect, useRef } from "react";
import { Animated, ScrollView, StyleSheet, View } from "react-native";

const BookingDetailSkeleton = () => {
  const pulse = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0.3,
          duration: 800,
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
      <View style={styles.card}>
        <Animated.View style={[styles.skeletonLineWide, animatedStyle]} />
        <Animated.View
          style={[
            styles.skeletonLine,
            { width: 140, marginTop: 8 },
            animatedStyle,
          ]}
        />
      </View>

      <View style={styles.card}>
        <Animated.View style={[styles.skeletonTitle, animatedStyle]} />
        <View style={styles.divider} />
        <View style={styles.infoGrid}>
          {[1, 2].map((key) => (
            <View key={key} style={styles.infoBox}>
              <Animated.View
                style={[
                  styles.skeletonLine,
                  { width: "60%", marginBottom: 12 },
                  animatedStyle,
                ]}
              />
              <Animated.View style={[styles.skeletonLine, animatedStyle]} />
              <Animated.View style={[styles.skeletonLine, animatedStyle]} />
              <Animated.View style={[styles.skeletonLine, animatedStyle]} />
            </View>
          ))}
        </View>
      </View>

      <View style={styles.card}>
        <Animated.View style={[styles.skeletonTitle, animatedStyle]} />
        <View style={styles.divider} />
        <View style={styles.transactionRow}>
          <Animated.View style={[styles.skeletonPoster, animatedStyle]} />
          <View style={{ flex: 1, gap: 8 }}>
            {[1, 2, 3, 4, 5].map((n) => (
              <Animated.View
                key={n}
                style={[styles.skeletonLine, animatedStyle]}
              />
            ))}
            <Animated.View
              style={[styles.skeletonLine, { width: "40%" }, animatedStyle]}
            />
          </View>
        </View>
      </View>

      <View style={styles.card}>
        <Animated.View style={[styles.skeletonTitle, animatedStyle]} />
        <View style={styles.divider} />
        {[1, 2, 3].map((n) => (
          <Animated.View
            key={n}
            style={[styles.skeletonLine, { marginBottom: 10 }, animatedStyle]}
          />
        ))}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  contentContainer: {
    padding: 16,
    paddingBottom: 32,
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  divider: {
    height: 1,
    backgroundColor: "#e5e7eb",
    marginVertical: 12,
  },
  infoGrid: {
    flexDirection: "row",
    gap: 12,
    flexWrap: "wrap",
  },
  infoBox: {
    flex: 1,
    minWidth: "48%",
  },
  transactionRow: { flexDirection: "row", gap: 12 },
  skeletonLine: {
    height: 12,
    borderRadius: 999,
    backgroundColor: "#e5e7eb",
  },
  skeletonLineWide: {
    height: 14,
    borderRadius: 12,
    backgroundColor: "#d1d5db",
  },
  skeletonTitle: {
    width: "40%",
    height: 14,
    borderRadius: 12,
    backgroundColor: "#d1d5db",
  },
  skeletonPoster: {
    width: 110,
    height: 150,
    borderRadius: 12,
    backgroundColor: "#e5e7eb",
  },
});

export default memo(BookingDetailSkeleton);
