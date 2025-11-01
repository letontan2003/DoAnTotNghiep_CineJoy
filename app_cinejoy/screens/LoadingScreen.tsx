import { useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  Image,
  Dimensions,
  Animated,
  Easing,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import logo from "assets/logoCNJ.png";

const { width, height } = Dimensions.get("window");

// Custom Loading Spinner Component
const LoadingSpinner = () => {
  const spinValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const spinAnimation = Animated.loop(
      Animated.timing(spinValue, {
        toValue: 1,
        duration: 1000,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );
    spinAnimation.start();
    return () => spinAnimation.stop();
  }, []);

  const spin = spinValue.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "360deg"],
  });

  return (
    <Animated.View style={[styles.spinnerContainer, { transform: [{ rotate: spin }] }]}>
      {[0, 1, 2, 3, 4, 5].map((index) => (
        <View
          key={index}
          style={[
            styles.spinnerPetal,
            {
              transform: [
                { rotate: `${index * 60}deg` },
                { translateY: -15 },
              ],
              opacity: 0.3 + (index * 0.12),
            },
          ]}
        />
      ))}
    </Animated.View>
  );
};

// Animated Dot Component with color wave effect
const AnimatedDot = ({ delay }: { delay: number }) => {
  const animValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const colorWaveAnimation = Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.timing(animValue, {
          toValue: 1,
          duration: 300,
          easing: Easing.ease,
          useNativeDriver: false,
        }),
        Animated.timing(animValue, {
          toValue: 0,
          duration: 300,
          easing: Easing.ease,
          useNativeDriver: false,
        }),
        Animated.delay(400 - delay),
      ])
    );
    colorWaveAnimation.start();
    return () => colorWaveAnimation.stop();
  }, [delay]);

  const backgroundColor = animValue.interpolate({
    inputRange: [0, 1],
    outputRange: ["#CCCCCC", "#E50914"],
  });

  const scale = animValue.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.2],
  });

  return (
    <Animated.View
      style={[
        styles.dot,
        {
          backgroundColor: backgroundColor as any,
          transform: [{ scale }],
        },
      ]}
    />
  );
};

const LoadingScreen = () => {
  const navigation = useNavigation();

  useEffect(() => {
    const timer = setTimeout(() => {
      navigation.navigate("PosterScreen" as never);
    }, 2000);

    return () => clearTimeout(timer);
  }, [navigation]);

  return (
    <View style={styles.container}>
      {/* Logo - Positioned at top */}
      <View style={styles.logoContainer}>
        <Image source={logo} style={styles.logo} resizeMode="contain" />
        <Text style={styles.cultureplexText}>CULTUREPLEX</Text>
      </View>

      {/* Center Content - Loading Spinner Only */}
      <View style={styles.centerContent}>
        {/* Loading Spinner */}
        <LoadingSpinner />
      </View>

      {/* Bottom Section - Text and Dots */}
      <View style={styles.bottomSection}>
        {/* Loading Text */}
        <View style={styles.textContainer}>
          <Text style={styles.loadingText}>ĐANG TẢI DỮ LIỆU...</Text>
          <Text style={styles.subText}>Vui lòng chờ trong giây lát</Text>
        </View>

        {/* Animated Dots with wave effect */}
        <View style={styles.dotsContainer}>
          <AnimatedDot delay={0} />
          <AnimatedDot delay={200} />
          <AnimatedDot delay={400} />
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "space-between",
  },
  logoContainer: {
    justifyContent: "center",
    alignItems: "center",
    marginTop: height * 0.08,
    height: height * 0.25,
  },
  logo: {
    width: width * 0.6,
    height: height * 0.15,
    tintColor: "#E50914",
  },
  cultureplexText: {
    fontSize: 24,
    fontWeight: "900",
    color: "#333333",
    letterSpacing: 2,
    marginTop: -20,
  },
  centerContent: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    marginTop: -height * 0.15,
  },
  spinnerContainer: {
    width: 50,
    height: 50,
    justifyContent: "center",
    alignItems: "center",
  },
  spinnerPetal: {
    position: "absolute",
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#E50914",
  },
  bottomSection: {
    alignItems: "center",
    marginBottom: 40,
  },
  textContainer: {
    alignItems: "center",
    marginBottom: 25,
  },
  loadingText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333333",
    marginBottom: 8,
    letterSpacing: 1,
  },
  subText: {
    fontSize: 13,
    fontWeight: "500",
    color: "#333333",
  },
  dotsContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    height: 30,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginHorizontal: 5,
  },
});

export default LoadingScreen;

