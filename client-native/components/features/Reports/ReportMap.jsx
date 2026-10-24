// client-native/components/features/reports/ReportMap.jsx
import React from 'react';
import { View, StyleSheet, Text } from 'react-native';
import MapView, { Marker, Callout } from 'react-native-maps';

export default function ReportMap({ userLocation, reports = [] }) {
  if (!userLocation) return null;

  return (
    <View style={StyleSheet.absoluteFillObject}>
      <MapView
        style={StyleSheet.absoluteFillObject}
        initialRegion={{
          latitude: userLocation.lat,
          longitude: userLocation.lng,
          latitudeDelta: 0.05,
          longitudeDelta: 0.05,
        }}
        userInterfaceStyle="dark" // Applies native dark mode map
      >
        {/* User Location */}
        <Marker 
          coordinate={{ latitude: userLocation.lat, longitude: userLocation.lng }}
          pinColor="blue"
        />

        {/* Issue Markers */}
        {reports.map((report, index) => (
          <Marker
            key={report.id || index}
            coordinate={{ lat: report.latitude, longitude: report.longitude }}
            pinColor={report.status === 'resolved' ? 'green' : 'orange'}
          >
            <Callout>
              <View className="p-2 w-48">
                <Text className="font-bold">{report.title}</Text>
                <Text className="text-xs text-gray-600">{report.description}</Text>
              </View>
            </Callout>
          </Marker>
        ))}
      </MapView>
    </View>
  );
}