import React from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import { MapPin, AlertCircle } from 'lucide-react-native';

export default function LocationAccess({ onRequestLocation, isLoadingLocation, onSkip }) {
  return (
    <View className="flex-1 items-center justify-center px-6 bg-[#09090b]">
      <View className="w-full max-w-md bg-zinc-900/50 p-8 rounded-3xl border border-zinc-800 shadow-xl overflow-hidden">
        
        {/* MapPin Icon Circle */}
        <View className="items-center mb-8">
          <View className="h-20 w-20 rounded-full bg-white/10 items-center justify-center">
            <MapPin size={40} color="#ffffff" />
          </View>
        </View>

        {/* Text Section */}
        <View className="items-center mb-8">
          <Text className="text-3xl font-extrabold text-white tracking-tight mb-2">
            Enable Location
          </Text>
          <Text className="text-zinc-400 text-sm text-center font-medium leading-relaxed px-2">
            We need your location to find safe routes and enable real-time emergency tracking.
          </Text>
        </View>

        {/* Privacy Note Box */}
        <View className="bg-[#18181b] border border-[#27272a] rounded-2xl p-4 flex-row items-start mb-10">
           <AlertCircle size={20} color="#4ade80" style={{ marginTop: 2, marginRight: 12 }} />
           <View className="flex-1">
             <Text className="text-white text-sm font-bold mb-1">Privacy First</Text>
             <Text className="text-zinc-400 text-xs">
               Your location is encrypted and only shared with emergency contacts when you trigger an SOS.
             </Text>
           </View>
        </View>

        {/* Buttons */}
        <View className="space-y-4 gap-4">
          <TouchableOpacity
            onPress={onRequestLocation}
            disabled={isLoadingLocation}
            activeOpacity={0.8}
            className="w-full bg-white py-4 rounded-xl items-center justify-center shadow-md flex-row"
          >
            {isLoadingLocation ? (
              <>
                <ActivityIndicator color="#000000" style={{ marginRight: 8 }} />
                <Text className="text-black font-extrabold text-lg">Detecting...</Text>
              </>
            ) : (
              <Text className="text-black font-extrabold text-lg">Allow Access</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            onPress={onSkip}
            disabled={isLoadingLocation}
            className="w-full items-center justify-center py-2"
          >
            <Text className="text-zinc-500 font-bold text-sm">Skip for now</Text>
          </TouchableOpacity>
        </View>

      </View>
    </View>
  );
}
