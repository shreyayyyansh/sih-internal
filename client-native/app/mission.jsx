import React, { useState, useRef, useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, Dimensions, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import FloatingLines from '../components/ui/FloatingLines';

// We use the raw screen height so the FlatList snap math is mathematically perfect
const { width, height } = Dimensions.get('window');

const missionData = [
  { name: "Urban Flow", subtitle: "THE MISSION", description: "To transform urban living through AI into a seamless, safe, and community-driven experience. We bridge the gap between technology and civic duty." },
  { name: "GeoScope", subtitle: "ENVIRONMENT", description: "AI-powered analysis of the city's environmental health. GeoScope leverages satellite data to monitor deforestation, air quality, and flood risks." },
  { name: "Sisterhood", subtitle: "SECURITY", description: "Never walk alone again. AI connects you with other women traveling along the same route in real-time." },
  { name: "EcoSnap", subtitle: "INFRASTRUCTURE", description: "AI-empowering citizens to report overflowing public dustbins by posting geo-tagged photos directly to municipal authorities." },
  { name: "StreetGig", subtitle: "COMMUNITY", description: "An AI-powered hyperlocal marketplace matching residents with quick chores, from grocery runs to technical fixes." },
  { name: "KindShare", subtitle: "CHARITY", description: "AI bridges the gap between your generosity and those in need. List clothes or essentials for donation." }
];

export default function Mission() {
  const [activeIndex, setActiveIndex] = useState(0);
  const flatListRef = useRef(null);

  const onViewableItemsChanged = useCallback(({ viewableItems }) => {
    if (viewableItems.length > 0) {
      setActiveIndex(viewableItems[0].index);
    }
  }, []);

  const viewabilityConfig = useRef({ itemVisiblePercentThreshold: 50 }).current;

  const scrollToSection = (index) => {
    flatListRef.current?.scrollToIndex({ index, animated: true });
  };

  return (
    // Swapped SafeAreaView for standard View here so the FlatList takes up 100% of the raw screen height
    <View style={{ flex: 1, backgroundColor: '#000000' }}>
      
      {/* Background Theme */}
      <View style={StyleSheet.absoluteFillObject} pointerEvents="none">
        <FloatingLines />
      </View>

      <FlatList
        ref={flatListRef}
        data={missionData}
        keyExtractor={(_, index) => index.toString()}
        // These 3 props guarantee buttery smooth, native-feeling scroll snapping
        pagingEnabled={true}
        snapToInterval={height}
        decelerationRate="fast"
        showsVerticalScrollIndicator={false}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        renderItem={({ item }) => (
          // Notice pr-16: This creates a dedicated column for the dots so they never overlap the card
          <View style={{ height, width }} className="justify-center pl-6 pr-16">
            
            {/* Premium Frosted Glass Card */}
            <View 
              className="w-full items-center rounded-[40px] border border-white/10 bg-[#0a0a0c]/85 px-6 py-12 shadow-2xl"
              style={{ elevation: 15, shadowColor: '#4f46e5' }}
            >
              <Text className="mb-3 text-indigo-400 font-bold tracking-[0.3em] text-xs text-center">
                {item.subtitle}
              </Text>

              <Text className="mb-6 text-center text-4xl font-black uppercase tracking-tighter text-white md:text-5xl">
                {item.name}
              </Text>

              <View className="h-[2px] w-16 bg-indigo-500/50 mb-6 rounded-full" />

              <Text className="text-center text-lg font-medium leading-relaxed text-gray-300">
                {item.description}
              </Text>
            </View>
          </View>
        )}
      />

      {/* Sleek Side Navigation Timeline - Locked to the right edge */}
      <View className="absolute right-4 top-0 bottom-0 z-50 flex-col justify-center gap-y-4" pointerEvents="box-none">
        {missionData.map((_, index) => (
          <TouchableOpacity
            key={index}
            onPress={() => scrollToSection(index)}
            className="items-center justify-center p-2"
          >
            <View
              className={`rounded-full transition-all duration-300 ${
                activeIndex === index
                  ? 'bg-indigo-500 h-8 w-[4px] shadow-lg shadow-indigo-500/50' 
                  : 'bg-white/20 h-2 w-2' 
              }`}
            />
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}