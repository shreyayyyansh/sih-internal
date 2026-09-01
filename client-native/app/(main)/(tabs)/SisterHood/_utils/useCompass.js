import { useState, useEffect, useRef } from 'react';
import { Animated } from 'react-native';
import * as Location from 'expo-location';

/**
 * Custom hook to read device compass heading.
 * Instead of returning raw state, it drives a performant React Native Animated.Value
 * to guarantee 60fps torch rotation without blocking the main JS thread.
 */
export default function useCompass(throttleMs = 200, degreeThreshold = 2) {
    const headingAnim = useRef(new Animated.Value(0)).current;
    const lastHeadingRef = useRef(0);
    const lastTimeRef = useRef(0);

    useEffect(() => {
        let subscription;
        
        const startCompass = async () => {
             try {
                 const { status } = await Location.getForegroundPermissionsAsync();
                 if (status !== 'granted') return;

                 subscription = await Location.watchHeadingAsync((headingData) => {
                      const now = Date.now();
                      const newHeading = headingData.trueHeading >= 0 ? headingData.trueHeading : headingData.magHeading;
                      
                      // Calculate shortest turn direction
                      let diff = newHeading - lastHeadingRef.current;
                      if (diff > 180) diff -= 360;
                      if (diff < -180) diff += 360;
                      
                      const targetHeading = lastHeadingRef.current + diff;

                      if (now - lastTimeRef.current > throttleMs && Math.abs(diff) >= degreeThreshold) {
                          // Animate the needle natively
                          Animated.timing(headingAnim, {
                              toValue: targetHeading,
                              duration: throttleMs,
                              useNativeDriver: true // Hardware acceleration out of the JS thread!
                          }).start();
                          
                          lastHeadingRef.current = targetHeading;
                          lastTimeRef.current = now;
                      }
                 });
             } catch (error) {
                 console.error("Compass tracking failed:", error);
             }
        };

        startCompass();

        return () => {
            if (subscription) {
                subscription.remove();
            }
        };
    }, []);

    // Also return the raw degrees for calculations like reset buttons
    const [rawHeading, setRawHeading] = useState(0);
    useEffect(() => {
        headingAnim.addListener(({ value }) => {
            setRawHeading(value % 360);
        });
        return () => headingAnim.removeAllListeners();
    }, []);

    return { headingAnim, rawHeading };
}
