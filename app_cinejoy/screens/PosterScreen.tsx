import { useEffect, useRef } from "react";
import {
  View,
  StyleSheet,
  Dimensions,
  Animated,
  Easing,
  Text,
  Image,
} from "react-native";
import { CommonActions, useNavigation } from "@react-navigation/native";
import posterBackground from "assets/posterBackground.jpg";
import logo from "assets/logoCNJ.png";

const { width, height } = Dimensions.get("window");

const POSTER_IMAGE = posterBackground;

// Component tạo hiệu ứng vignette mềm ở góc
const SoftCornerVignette = ({
  position,
}: {
  position: "topLeft" | "topRight" | "bottomLeft" | "bottomRight";
}) => {
  const cornerSize = Math.min(width, height) * 0.8;
  const layers = [0.2, 0.15, 0.1, 0.06, 0.03]; // Opacity giảm dần từ trong ra ngoài

  const getPosition = () => {
    switch (position) {
      case "topLeft":
        return { top: -cornerSize * 0.4, left: -cornerSize * 0.4 };
      case "topRight":
        return { top: -cornerSize * 0.4, right: -cornerSize * 0.4 };
      case "bottomLeft":
        return { bottom: -cornerSize * 0.4, left: -cornerSize * 0.4 };
      case "bottomRight":
        return { bottom: -cornerSize * 0.4, right: -cornerSize * 0.4 };
    }
  };

  return (
    <View style={[styles.cornerContainer, getPosition()]}>
      {layers.map((opacity, index) => {
        const size = cornerSize * (1 - index * 0.2);
        return (
          <View
            key={index}
            style={[
              styles.cornerLayer,
              {
                width: size,
                height: size,
                borderRadius: size / 2,
                backgroundColor: `rgba(0,0,0,${opacity})`,
              },
            ]}
          />
        );
      })}
    </View>
  );
};

const PosterScreen = () => {
  const navigation = useNavigation();
  const panAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Animation pan từ phải qua trái trong 2 giây
    Animated.timing(panAnim, {
      toValue: 1,
      duration: 2000,
      easing: Easing.linear,
      useNativeDriver: true,
    }).start();

    // Sau 2 giây, tự động chuyển sang HomeScreen
    const timer = setTimeout(() => {
      navigation.dispatch(
        CommonActions.reset({
          index: 0,
          routes: [{ name: "HomeScreen" as never }],
        })
      );
    }, 2000);

    return () => clearTimeout(timer);
  }, [navigation, panAnim]);

  // Tính toán translateX cho hiệu ứng pan từ phải qua trái
  // Ảnh sẽ rộng hơn màn hình để có thể pan
  const imageWidth = width * 1.3; // Rộng hơn 30% để có hiệu ứng pan mượt
  const translateX = panAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -(imageWidth - width)], // Pan từ cạnh phải sang trái
  });

  return (
    <View style={styles.container}>
      {/* Poster Image với animation pan */}
      <Animated.Image
        source={POSTER_IMAGE}
        style={[
          styles.posterImage,
          {
            width: imageWidth,
            transform: [{ translateX }],
          },
        ]}
        resizeMode="cover"
      />

      {/* Vignette Effect - Đen mờ mềm mại ở 4 góc */}
      <SoftCornerVignette position="topLeft" />
      <SoftCornerVignette position="topRight" />
      <SoftCornerVignette position="bottomLeft" />
      <SoftCornerVignette position="bottomRight" />

      {/* Footer với Logo */}
      <View style={styles.footer}>
        <View style={styles.logoContainer}>
          <Image source={logo} style={styles.logo} resizeMode="contain" />
          <Text style={styles.footerTextBottom}>CULTUREPLEX</Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000000",
    overflow: "hidden",
  },
  posterImage: {
    height: height,
    position: "absolute",
    left: 0,
    top: 0,
  },
  cornerContainer: {
    position: "absolute",
    justifyContent: "center",
    alignItems: "center",
  },
  cornerLayer: {
    position: "absolute",
  },
  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingVertical: height * 0.03,
    paddingHorizontal: width * 0.05,
    alignItems: "center",
    justifyContent: "center",
  },
  footerTextTop: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: 1,
  },
  logoContainer: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: 2,
  },
  logo: {
    width: width * 0.25,
    height: height * 0.08,
  },
  yearText: {
    color: "#FFFFFF",
    fontSize: 28,
    fontWeight: "700",
    marginLeft: width * 0.03,
  },
  footerTextBottom: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
    letterSpacing: 2,
    marginTop: -14,
  },
});

export default PosterScreen;
