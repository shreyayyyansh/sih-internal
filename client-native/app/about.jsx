import React from 'react';
import { View, Text, Image, TouchableOpacity, Linking, StyleSheet, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import FloatingLines from '../components/ui/FloatingLines';

// Get screen width to calculate perfect 2x2 grid sizing
const { width, height } = Dimensions.get('window');
const CARD_WIDTH = (width - 48 - 16) / 2; // Screen width minus padding minus gap

const teamMembers = [
  { name: "Aryan Gupta", email: "aryan072806@gmail.com", image: require('../components/ui/aryan.jpg'), linkedin: "https://www.linkedin.com/in/aryan-gupta-278376313/" },
  { name: "Ishwar", email: "ishwarkumawat@gmail.com", image: require('../components/ui/ishwar.jpg'), linkedin: "https://www.linkedin.com/in/ishwarkumawat/" },
  { name: "Arushi Nayak", email: "nayakarushi2005@gmail.com", image: require('../components/ui/arushi.jpg'), linkedin: "https://www.linkedin.com/in/arushi-nayak-29299a344/" },
  { name: "Shreyansh Sachan", email: "shreyansh.sachan@hotmail.com", image: require('../components/ui/shreyansh.jpg'), linkedin: "https://www.linkedin.com/in/shreyansh-sachan/" },
];

export default function AboutUs() {
  // Dynamic sizing for smaller screens
  const isSmallScreen = height < 750;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#000000' }}>
      
      {/* Animated Background */}
      <View style={StyleSheet.absoluteFillObject} pointerEvents="none">
        <FloatingLines />
      </View>

      {/* Main Container - justify-evenly distributes space without scrolling */}
      <View className="flex-1 px-6 justify-evenly z-10" pointerEvents="box-none">
        
        {/* Header Section */}
        <View className="items-center mt-4">
          <Text className="text-indigo-500 font-bold tracking-[0.3em] text-xs mb-2">
            MEET THE CREATORS
          </Text>
          <Text className="text-4xl font-black text-white tracking-tighter uppercase mb-3">
            TEAM <Text className="text-blue-400">CONSTANTS</Text>
          </Text>
          <Text className="text-center text-sm leading-relaxed text-gray-400 px-2">
            Small indie developers from MNNIT. Building Urban Flow to guide everyone through the city with the ease and comfort of their fingertips.
          </Text>
        </View>

        {/* 2x2 Grid Section */}
        <View className="flex-row flex-wrap justify-between gap-y-4 w-full">
          {teamMembers.map((member, index) => (
            <TouchableOpacity 
              key={index} 
              activeOpacity={0.7}
              onPress={() => Linking.openURL(member.linkedin)}
              style={{ width: CARD_WIDTH, elevation: 10, shadowColor: '#4f46e5' }}
              className="bg-[#0a0a0c]/80 border border-white/10 rounded-[30px] items-center p-4 py-6"
            >
              {/* Avatar with glowing border */}
              <View className={`rounded-full border-[3px] border-indigo-500/50 mb-4 overflow-hidden shadow-lg ${isSmallScreen ? 'h-16 w-16' : 'h-20 w-20'}`}>
                <Image 
                  source={member.image} 
                  className="h-full w-full" 
                  resizeMode="cover" 
                />
              </View>

              {/* Text Info */}
              <Text className="text-base font-bold text-white text-center mb-1" numberOfLines={1}>
                {member.name}
              </Text>
              <Text className="text-[10px] font-medium text-blue-300 text-center px-1" numberOfLines={1}>
                {member.email}
              </Text>
              
              {/* Fake "Connect" Badge */}
              <View className="mt-3 bg-indigo-500/20 px-3 py-1 rounded-full border border-indigo-500/30">
                <Text className="text-[9px] text-indigo-300 font-bold tracking-wider uppercase">
                  LinkedIn
                </Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {/* Footer padding so it doesn't hug the bottom of the screen */}
        <View className="h-4" />
      </View>
    </SafeAreaView>
  );
}