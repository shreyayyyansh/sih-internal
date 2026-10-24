import React, { useRef, useState } from 'react';
import { View, Animated, Pressable } from 'react-native';

const WHITE_PALETTE = ['#ffffff', '#f8fafc', '#e2e8f0'];

export default function PixelCard({
  variant = 'default',
  gap = 16, 
  colors,
  className = '',
  children,
  onClick,
}) {
  const [grid, setGrid] = useState([]);
  const animValue = useRef(new Animated.Value(0)).current;
  const palette = colors ? colors.split(',') : WHITE_PALETTE;

  const handleLayout = (e) => {
    const { width, height } = e.nativeEvent.layout;
    const newGrid = [];
    const centerX = width / 2;
    const centerY = height / 2;
    const maxDist = Math.sqrt(centerX * centerX + centerY * centerY);

    for (let x = 0; x < width; x += gap) {
      for (let y = 0; y < height; y += gap) {
        const dx = x - centerX;
        const dy = y - centerY;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const normalizedDelay = (distance / maxDist) * 0.7; 

        newGrid.push({
          x,
          y,
          color: palette[Math.floor(Math.random() * palette.length)],
          delay: normalizedDelay,
          maxScale: Math.random() * 2 + 1,
        });
      }
    }
    setGrid(newGrid);
  };

  const handlePressIn = () => {
    Animated.timing(animValue, {
      toValue: 1,
      duration: 600,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.timing(animValue, {
      toValue: 0,
      duration: 400,
      useNativeDriver: true,
    }).start();
    if (onClick) onClick();
  };

  return (
    <Pressable
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      className={`relative overflow-hidden items-center justify-center border border-[#27272a] rounded-[25px] bg-black ${className}`}
    >
      <View style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 }} onLayout={handleLayout}>
        {grid.map((pixel, index) => {
          const opacity = animValue.interpolate({
            inputRange: [pixel.delay, pixel.delay + 0.3],
            outputRange: [0, 1],
            extrapolate: 'clamp',
          });
          const scale = animValue.interpolate({
            inputRange: [pixel.delay, pixel.delay + 0.3],
            outputRange: [0.1, pixel.maxScale],
            extrapolate: 'clamp',
          });

          return (
            <Animated.View
              key={index}
              style={{
                position: 'absolute',
                left: pixel.x,
                top: pixel.y,
                width: 3,
                height: 3,
                backgroundColor: pixel.color,
                opacity,
                transform: [{ scale }],
              }}
            />
          );
        })}
      </View>
      <View className="z-10 items-center justify-center w-full h-full p-6">
         {children}
      </View>
    </Pressable>
  );
}