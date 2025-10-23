import React, { useRef, useState } from 'react';
import {
  View,
  Dimensions,
  FlatList,
  Animated,
  StyleSheet,
} from 'react-native';

const { width: screenWidth } = Dimensions.get('window');

interface StackCarouselProps<T> {
  data: T[];
  renderItem: (item: T, index: number) => React.ReactNode;
  itemWidth?: number;
  itemHeight?: number;
  onIndexChange?: (index: number) => void;
  spacing?: number;
  scaleFactor?: number;
  opacityFactor?: number;
}

const StackCarousel = <T,>({
  data,
  renderItem,
  itemWidth = screenWidth * 0.7,
  itemHeight = 400,
  onIndexChange,
  spacing = 20,
  scaleFactor = 0.85,
  opacityFactor = 0.7,
}: StackCarouselProps<T>) => {
  const scrollX = useRef(new Animated.Value(0)).current;
  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);

  // Tạo infinite data bằng cách thêm phần tử cuối vào đầu và phần tử đầu vào cuối
  const infiniteData = React.useMemo(() => {
    if (data.length === 0) return [];
    if (data.length === 1) return data;
    
    return [
      data[data.length - 1], // Phần tử cuối ở đầu
      ...data,                // Dữ liệu gốc
      data[0],               // Phần tử đầu ở cuối
    ];
  }, [data]);

  // Handle scroll events với logic jump sớm hơn
  const handleScroll = Animated.event(
    [{ nativeEvent: { contentOffset: { x: scrollX } } }],
    { 
      useNativeDriver: false,
      listener: (event: any) => {
        const offsetX = event.nativeEvent.contentOffset.x;
        const index = Math.round(offsetX / itemWidth);
        
        // Chỉ xử lý infinite scroll khi có nhiều hơn 1 phần tử
        if (data.length > 1) {
          // Xử lý jump sớm hơn để tránh giật
          if (offsetX <= itemWidth * 0.5) {
            // Gần đến phần tử đầu, jump đến cuối
            flatListRef.current?.scrollToIndex({ 
              index: data.length, 
              animated: false 
            });
            setCurrentIndex(data.length - 1);
            onIndexChange?.(data.length - 1);
          } else if (offsetX >= (infiniteData.length - 1.5) * itemWidth) {
            // Gần đến phần tử cuối, jump đến đầu
            flatListRef.current?.scrollToIndex({ 
              index: 1, 
              animated: false 
            });
            setCurrentIndex(0);
            onIndexChange?.(0);
          } else {
            // Cập nhật index thật
            const realIndex = index - 1;
            if (realIndex >= 0 && realIndex < data.length) {
              setCurrentIndex(realIndex);
              onIndexChange?.(realIndex);
            }
          }
        } else {
          // Khi chỉ có 1 phần tử, chỉ cập nhật index
          setCurrentIndex(0);
          onIndexChange?.(0);
        }
      }
    }
  );

  const handleMomentumScrollEnd = (event: any) => {
    // Chỉ xử lý infinite scroll khi có nhiều hơn 1 phần tử
    if (data.length <= 1) return;
    
    // Chỉ để xử lý các trường hợp edge case
    const index = Math.round(event.nativeEvent.contentOffset.x / itemWidth);
    
    if (index === 0) {
      flatListRef.current?.scrollToIndex({ 
        index: data.length, 
        animated: false 
      });
      setCurrentIndex(data.length - 1);
      onIndexChange?.(data.length - 1);
    } else if (index === infiniteData.length - 1) {
      flatListRef.current?.scrollToIndex({ 
        index: 1, 
        animated: false 
      });
      setCurrentIndex(0);
      onIndexChange?.(0);
    }
  };

  // Render individual carousel item with stack/flip effect
  const renderCarouselItem = ({ item, index }: { item: T; index: number }) => {
    const inputRange = [
      (index - 1) * itemWidth,
      index * itemWidth,
      (index + 1) * itemWidth,
    ];

    // Scale animation - điều chỉnh để tránh vùng đen
    const scale = scrollX.interpolate({
      inputRange,
      outputRange: [0.85, 0.8, 0.85],
      extrapolate: 'clamp',
    });

    // Rotation animation - nghiêng thẳng vào trong để không bị che
    const rotateY = scrollX.interpolate({
      inputRange,
      outputRange: ['-70deg', '0deg', '70deg'],
      extrapolate: 'clamp',
    });

    // TranslateX - giảm khoảng cách để tránh vùng đen
    const translateX = scrollX.interpolate({
      inputRange,
      outputRange: [-screenWidth * 0.2, 0, screenWidth * 0.2],
      extrapolate: 'clamp',
    });

    // TranslateY - giảm chiều sâu để tránh vùng đen
    const translateY = scrollX.interpolate({
      inputRange,
      outputRange: [20, 0, 20],
      extrapolate: 'clamp',
    });

    // Opacity - tất cả phần tử đều rõ nét, không bị mờ
    const opacity = scrollX.interpolate({
      inputRange,
      outputRange: [1, 1, 1],
      extrapolate: 'clamp',
    });

    // Tính toán realIndex để hiển thị đúng item
    const realIndex = index === 0 ? data.length - 1 : 
                     index === infiniteData.length - 1 ? 0 : 
                     index - 1;

    return (
      <View style={[styles.itemContainer, { width: itemWidth, height: itemHeight }]}>
        <Animated.View
          style={[
            styles.itemWrapper,
            {
              transform: [
                { perspective: 1000 },
                { translateX },
                { translateY },
                { rotateY },
                { scale },
              ],
              opacity,
              zIndex: currentIndex === realIndex ? 10 : 9 - Math.abs(currentIndex - realIndex),
            },
          ]}
        >
          {renderItem(item, realIndex)}
        </Animated.View>
      </View>
    );
  };

  // Khởi tạo vị trí ban đầu (phần tử đầu tiên thật) - chỉ khi có nhiều hơn 1 phần tử
  React.useEffect(() => {
    if (data.length > 1 && infiniteData.length > 2) {
      flatListRef.current?.scrollToIndex({ 
        index: 1, 
        animated: false 
      });
    }
  }, [infiniteData.length, data.length]);

  return (
    <View style={styles.container}>
      <FlatList
        ref={flatListRef}
        data={infiniteData}
        renderItem={renderCarouselItem}
        horizontal
        showsHorizontalScrollIndicator={false}
        onScroll={handleScroll}
        onMomentumScrollEnd={handleMomentumScrollEnd}
        snapToInterval={itemWidth}
        decelerationRate={0.98}
        style={{ backgroundColor: 'transparent' }}
        contentContainerStyle={[
          styles.contentContainer,
          { 
            paddingHorizontal: (screenWidth - itemWidth) / 2,
            backgroundColor: 'transparent',
          }
        ]}
        keyExtractor={(_, index) => `infinite-${index}`}
        getItemLayout={(_, index) => ({
          length: itemWidth,
          offset: itemWidth * index,
          index,
        })}
        initialNumToRender={Math.max(infiniteData.length, 3)}
        windowSize={Math.max(infiniteData.length, 3)}
        maxToRenderPerBatch={Math.max(infiniteData.length, 3)}
        removeClippedSubviews={false}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  contentContainer: {
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  itemContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  itemWrapper: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
    borderRadius: 16,
    overflow: 'hidden',
  },
});

export default StackCarousel;
