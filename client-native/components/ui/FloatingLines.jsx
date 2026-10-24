import React, { useRef, useEffect, useState } from 'react';
import { View, Animated, Dimensions, StyleSheet } from 'react-native';

const { width, height } = Dimensions.get('window');

// Generate random properties for our light streaks
const generateSticks = (count, side) => {
  return Array.from({ length: count }).map((_, i) => ({
    id: `${side}-${i}`,
    side: side,
    color: side === 'left' 
      ? ['#800080', '#EE82EE', '#9400D3'][Math.floor(Math.random() * 3)]
      : ['#00008B', '#4B0082', '#8A2BE2'][Math.floor(Math.random() * 3)],
    leftPos: side === 'left' 
      ? Math.random() * (width / 2 - 20) 
      : (width / 2) + 20 + Math.random() * (width / 2 - 40),
    stickWidth: Math.random() * 3 + 2,
    stickHeight: Math.random() * 150 + 50,
    delay: Math.random() * 2000,
    duration: Math.random() * 1000 + 800, 
  }));
};

const LightStreak = ({ item, isSpeeding = false }) => {
  const translateY = useRef(new Animated.Value(-200)).current;

  useEffect(() => {
    const currentDuration = isSpeeding ? item.duration * 0.3 : item.duration;

    const anim = Animated.loop(
      Animated.timing(translateY, {
        toValue: height + 200,
        duration: currentDuration,
        delay: item.delay,
        useNativeDriver: true, // Crucial for performance!
      })
    );
    anim.start();

    return () => anim.stop();
  }, [isSpeeding]);

  return (
    <Animated.View
      style={{
        position: 'absolute',
        left: item.leftPos,
        width: item.stickWidth,
        height: item.stickHeight,
        backgroundColor: item.color,
        opacity: 0.8,
        borderRadius: 10,
        transform: [{ translateY }],
        shadowColor: item.color,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 1,
        shadowRadius: 10,
        elevation: 10,
      }}
    />
  );
};

export default function FloatingLines() {
  const [leftLights] = useState(() => generateSticks(20, 'left'));
  const [rightLights] = useState(() => generateSticks(20, 'right'));

  return (
    // Replaced Tailwind with bulletproof React Native inline styles
    <View style={[StyleSheet.absoluteFillObject, { backgroundColor: '#000000', overflow: 'hidden' }]}>
      {leftLights.map((item) => (
        <LightStreak key={item.id} item={item} />
      ))}

      {rightLights.map((item) => (
        <LightStreak key={item.id} item={item} />
      ))}

      <View style={{ position: 'absolute', top: 0, bottom: 0, alignSelf: 'center', width: 2, backgroundColor: '#18181b', opacity: 0.5 }} />
    </View>
  );
}