import React, { useEffect, useRef } from 'react';
import { Animated, Easing, Pressable } from 'react-native';
import { cn } from '../../lib/utils'; 

const CircularText = ({ 
  text, 
  spinDuration = 20, 
  onHover = 'speedUp', 
  className = '',
  textClassName = 'text-white',
  isLoading = true // Useful prop if you use this as a loader
}) => {
  const letters = Array.from(text);
  
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const startAnimation = (durationMultiplier = 1, targetScale = 1) => {
    Animated.spring(scaleAnim, {
      toValue: targetScale,
      damping: 20,
      stiffness: 300,
      useNativeDriver: true,
    }).start();

    rotateAnim.stopAnimation((currentVal) => {
      if (durationMultiplier === 'pause') return;

      const timeForOneRotation = (spinDuration * 1000) * durationMultiplier;

      Animated.timing(rotateAnim, {
        toValue: currentVal + 1000, 
        duration: timeForOneRotation * 1000, 
        easing: Easing.linear,
        useNativeDriver: true,
      }).start();
    });
  };

  useEffect(() => {
    startAnimation(1, 1);

    // CRITICAL FIX: Cleanup function to prevent memory leaks on unmount
    return () => {
      rotateAnim.stopAnimation();
      scaleAnim.stopAnimation();
    };
  }, [spinDuration, text]);

  const handlePressIn = () => {
    if (!onHover) return;

    let speedMult = 1;
    let scaleVal = 1;

    switch (onHover) {
      case 'slowDown': speedMult = 2; break;
      case 'speedUp': speedMult = 0.25; break;
      case 'pause': speedMult = 'pause'; scaleVal = 1; break;
      case 'goBonkers': speedMult = 0.05; scaleVal = 0.8; break;
      default: speedMult = 1;
    }

    startAnimation(speedMult, scaleVal);
  };

  const handlePressOut = () => {
    startAnimation(1, 1);
  };

  const spin = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <Pressable
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      className={cn("mx-auto w-[200px] h-[200px] items-center justify-center relative", className)}
      // CRITICAL FIX: Accessibility tags for a loader
      accessible={true}
      accessibilityRole="progressbar"
      accessibilityState={{ busy: isLoading }}
      accessibilityLabel={`Loading... ${text}`}
    >
      <Animated.View
        style={{
          width: 200,
          height: 200,
          transform: [{ rotate: spin }, { scale: scaleAnim }],
        }}
        // Hide the individual gibberish letters from screen readers
        importantForAccessibility="no-hide-descendants" 
      >
        {letters.map((letter, i) => {
          const rotationDeg = (360 / letters.length) * i;
          const factor = Math.PI / letters.length;
          const x = factor * i;
          const y = factor * i;

          return (
            <Animated.Text
              key={i}
              className="absolute inset-0 text-2xl font-black text-center text-white"
              style={{
                textAlignVertical: 'top', 
                transform: [
                  { rotateZ: `${rotationDeg}deg` },
                  { translateX: x },
                  { translateY: y }
                ],
              }}
            >
              {letter}
            </Animated.Text>
          );
        })}
      </Animated.View>
    </Pressable>
  );
};

export default CircularText;