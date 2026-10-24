// client-native/app/(main)/reports/index.jsx
import React, { useState, useEffect } from "react";
import { View, Text, TouchableOpacity, Platform, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import { ArrowLeft, ArrowRight, List, MapPinOff, MapPin, AlertCircle } from "lucide-react-native";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";
import * as Location from 'expo-location'; 
import ReportSidebar from "../../../../components/features/Reports/ReportSidebar";
import ReportMap from "../../../../components/features/Reports/ReportMap";

export default function ComplaintsPage() {
  const router = useRouter();
  // Location States
  const [userLocation, setUserLocation] = useState(null); 
  const [userAddress, setUserAddress] = useState(null);
  const [isLocating, setIsLocating] = useState(false);
  const [locationError, setLocationError] = useState(null);
  
  // View States
  const [viewMode, setViewMode] = useState("form");
  const [mapRefreshTrigger, setMapRefreshTrigger] = useState(0);

  const handleReportSubmitted = () => setMapRefreshTrigger(prev => prev + 1);

  // Fetch Location Automatically on Mount
  useEffect(() => {
    (async () => {
      setIsLocating(true);
      try {
        let { status } = await Location.getForegroundPermissionsAsync();
        if (status !== 'granted') {
          const request = await Location.requestForegroundPermissionsAsync();
          status = request.status;
        }
        if (status === 'granted') {
          const location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
          const locCoords = { lat: location.coords.latitude, lng: location.coords.longitude };
          setUserLocation(locCoords);
          
          try {
            const addressData = await Location.reverseGeocodeAsync({
              latitude: locCoords.lat,
              longitude: locCoords.lng
            });
            if (addressData && addressData.length > 0) {
              const addr = addressData[0];
              setUserAddress([addr.street || addr.name, addr.city || addr.subregion, addr.region].filter(Boolean).join(', '));
            }
          } catch(e) { console.log('Reverse geocode failed:', e); }
        } else {
          setLocationError("Permission denied.");
        }
      } catch (err) {
        console.error('Error getting location', err);
        setLocationError("Could not determine your location.");
      } finally {
        setIsLocating(false);
      }
    })();
  }, []);

  // --- UI: Main Content ---
  return (
    <SafeAreaView className="flex-1 bg-[#050510]">
      <LinearGradient
        colors={['#050510', '#0a0a14', '#000000']} 
        style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 }}
      />

      {/* Header */}
      <View style={{ paddingTop: Platform.OS === 'ios' ? 10 : 0, height: 64, px: 4, flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.06)', zIndex: 50 }}>
        <TouchableOpacity onPress={() => router.back()} style={{ marginLeft: 16, height: 40, width: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.05)', alignItems: 'center', justifyContent: 'center' }}>
          <ArrowLeft size={20} color="#a1a1aa" />
        </TouchableOpacity>
        <Text style={{ marginLeft: 12, fontSize: 22, fontWeight: '900', color: '#fff', letterSpacing: -0.5 }}>
          Urban<Text style={{ color: '#818cf8' }}>Flow</Text>
        </Text>
      </View>

      {/* Main Content Area */}
      <View className="flex-1">
        {viewMode === "form" ? (
          <View className="flex-1 w-full">
            <ReportSidebar 
              userLocation={userLocation} 
              userAddress={userAddress}
              onReportSubmitGlobal={handleReportSubmitted} 
            />
            
            {/* Map Toggle Button */}
            <View className="p-4 bg-[#050510]">
              <TouchableOpacity 
                onPress={() => setViewMode("map")}
                className="w-full bg-white/5 p-4 rounded-xl flex-row justify-center items-center"
              >
                <Text className="text-zinc-300 font-bold mr-2">View Issue Heatmap</Text>
                <ArrowRight size={16} color="#d4d4d8" />
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <View className="flex-1 relative">
            <ReportMap userLocation={userLocation} refreshTrigger={mapRefreshTrigger} />
            
            {/* Back to Form Toggle */}
            <TouchableOpacity 
              onPress={() => setViewMode("form")}
              className="absolute bottom-8 self-center bg-white px-8 py-4 rounded-full shadow-lg flex-row items-center"
            >
              <List size={16} color="black" className="mr-2" />
              <Text className="text-black font-bold">Back to Report</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}