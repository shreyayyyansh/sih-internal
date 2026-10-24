import React, { useRef } from 'react';
import {
  View,
  Text,
  Image,
  Animated,
  Dimensions,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';

const { width } = Dimensions.get('window');
const CARD_WIDTH = width * 0.75; // Cards take up 75% of screen width
const SPACING = 20;
const ITEM_SIZE = CARD_WIDTH + SPACING;

// --- Frosted Glass Card Component ---
// Replaces the HTML5 Canvas drawing logic
const GlassCard = ({ item }) => {
  return (
    <View
      className="rounded-[32px] border border-white/20 bg-white/10 p-6 shadow-xl"
      style={{
        width: CARD_WIDTH,
        height: CARD_WIDTH * 1.4, // Keep the roughly 3:4 aspect ratio
        justifyContent: 'flex-start',
      }}
    >
      {/* Icon/Image Box */}
      <View className="mb-8 h-24 w-24 items-center justify-center rounded-3xl border border-white/30 bg-white/10">
        {item.iconUrl ? (
          <Image
            source={{ uri: item.iconUrl }}
            className="h-12 w-12"
            resizeMode="contain"
          />
        ) : (
          <View className="h-8 w-8 rounded-full bg-white" />
        )}
      </View>

      {/* Text Content */}
      <Text className="mb-4 text-4xl font-bold tracking-tight text-white shadow-black/50 drop-shadow-md">
        {item.title}
      </Text>
      <Text className="text-lg leading-relaxed text-white/80">
        {item.description}
      </Text>
    </View>
  );
};

export default function CircularGallery({ items = [], onItemClick }) {
  const scrollX = useRef(new Animated.Value(0)).current;

  // Duplicate items slightly to mimic the infinite loop feel 
  // (A true infinite loop requires more complex FlatList manipulation, but this works well for a gallery)
  const displayItems = [...items, ...items, ...items];

  return (
    <View className="flex-1 items-center justify-center bg-black">
      <Animated.FlatList
        data={displayItems}
        keyExtractor={(_, index) => index.toString()}
        horizontal
        showsHorizontalScrollIndicator={false}
        snapToInterval={ITEM_SIZE}
        decelerationRate="fast"
        bounces={false}
        contentContainerStyle={{
          alignItems: 'center',
          paddingHorizontal: (width - ITEM_SIZE) / 2, // Center the first item
        }}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { x: scrollX } } }],
          { useNativeDriver: true }
        )}
        scrollEventThrottle={16}
        renderItem={({ item, index }) => {
          // --- Calculate the 3D Bend Effect ---
          const inputRange = [
            (index - 1) * ITEM_SIZE,
            index * ITEM_SIZE,
            (index + 1) * ITEM_SIZE,
          ];

          // 1. Shift cards down as they move away from center (The "Bend")
          const translateY = scrollX.interpolate({
            inputRange,
            outputRange: [50, 0, 50],
            extrapolate: 'clamp',
          });

          // 2. Scale cards down as they move away
          const scale = scrollX.interpolate({
            inputRange,
            outputRange: [0.8, 1, 0.8],
            extrapolate: 'clamp',
          });

          // 3. Rotate cards slightly away from the camera
          const rotateZ = scrollX.interpolate({
            inputRange,
            outputRange: ['-5deg', '0deg', '5deg'],
            extrapolate: 'clamp',
          });

          // 4. Fade outer cards slightly
          const opacity = scrollX.interpolate({
            inputRange,
            outputRange: [0.6, 1, 0.6],
            extrapolate: 'clamp',
          });

          return (
            <TouchableOpacity
              activeOpacity={0.9}
              onPress={() => {
                // Return the real index (accounting for duplicated items)
                if (onItemClick) {
                  const realIndex = index % items.length;
                  onItemClick(realIndex);
                }
              }}
            >
              <Animated.View
                style={{
                  width: ITEM_SIZE,
                  alignItems: 'center',
                  opacity,
                  transform: [
                    { translateY },
                    { scale },
                    { rotateZ },
                  ],
                }}
              >
                <GlassCard item={item} />
              </Animated.View>
            </TouchableOpacity>
          );
        }}
      />
    </View>
  );
}