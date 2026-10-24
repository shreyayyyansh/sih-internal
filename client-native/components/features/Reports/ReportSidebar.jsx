// client-native/components/features/reports/ReportSidebar.jsx
import React, { useState } from "react";
import { View, Text, ScrollView } from "react-native";
import ReportForm from "./ReportForm";
import ComplaintList from "./ComplaintList";

export default function ReportSidebar({ userLocation, userAddress, onReportSubmitGlobal }) {
  const [refreshKey, setRefreshKey] = useState(0);

  // When form submits successfully, increment key to force ComplaintList re-fetch
  const handleSuccess = () => {
    setRefreshKey(prev => prev + 1);

    if (onReportSubmitGlobal) {
        onReportSubmitGlobal(); 
    }
  };

  return (
    <View className="flex-1 relative overflow-hidden bg-transparent">
      {/* Background Ambience (Simplified for Native performance) */}
      <View className="absolute top-0 left-0 w-full h-64 bg-indigo-900/10 opacity-40 pointer-events-none" />

      {/* Main Scrollable Content */}
      <ScrollView 
        className="flex-1 z-10 px-6 pt-6"
        contentContainerStyle={{ paddingBottom: 40 }} // Ensures you can scroll past the bottom edge
        showsVerticalScrollIndicator={false}
      >
        <View className="space-y-8">
          
          {/* Section: New Report */}
          <View>
            <View className="mb-4">
              <Text className="text-2xl font-black text-white tracking-tight">
                Report Issue
              </Text>
            </View>
            
            <ReportForm 
              userLocation={userLocation} 
              userAddress={userAddress} 
              onSubmitSuccess={handleSuccess} 
            />
          </View>

          {/* Divider line */}
          <View className="w-full h-px bg-white/10 my-2" />

          {/* Section: History */}
          <View>
            <Text className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-4 ml-1">
              Recent Activity
            </Text>
            <ComplaintList key={refreshKey} />
          </View>

        </View>
      </ScrollView>
    </View>
  );
}