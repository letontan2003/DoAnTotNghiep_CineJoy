import { memo, useEffect, useRef } from "react";
import { Animated, StyleSheet, View, FlatList, Dimensions } from "react-native";

const { width } = Dimensions.get("window");

interface HotNewsHorizontalSkeletonProps {
  count?: number;
}

const HotNewsHorizontalSkeleton = ({
  count = 4,
}: HotNewsHorizontalSkeletonProps) => {
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
    <FlatList
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.hotNewsContent}
      data={Array.from({ length: count })}
      keyExtractor={(item, index) => index.toString()}
      renderItem={() => (
        <View style={styles.hotNewsCardSkeleton}>
          <Animated.View style={[styles.hotNewsImageSkeleton, animatedStyle]} />
          <View style={styles.hotNewsCardContentSkeleton}>
            <Animated.View
              style={[styles.hotNewsTitleSkeleton, animatedStyle]}
            />
            <Animated.View
              style={[styles.hotNewsTitleSkeleton2, animatedStyle]}
            />
          </View>
        </View>
      )}
    />
  );
};

const styles = StyleSheet.create({
  hotNewsContent: {
    paddingLeft: 0,
  },
  hotNewsCardSkeleton: {
    width: width * 0.44,
    marginRight: 10,
    backgroundColor: "#1a1a1a",
    borderRadius: 12,
    overflow: "hidden",
  },
  hotNewsImageSkeleton: {
    width: "100%",
    height: 100,
    backgroundColor: "#333",
    borderRadius: 12,
  },
  hotNewsCardContentSkeleton: {
    paddingTop: 5,
    minHeight: 50,
    paddingHorizontal: 8,
    gap: 6,
  },
  hotNewsTitleSkeleton: {
    width: "90%",
    height: 12,
    borderRadius: 4,
    backgroundColor: "#333",
  },
  hotNewsTitleSkeleton2: {
    width: "70%",
    height: 12,
    borderRadius: 4,
    backgroundColor: "#333",
  },
});

export default memo(HotNewsHorizontalSkeleton);
