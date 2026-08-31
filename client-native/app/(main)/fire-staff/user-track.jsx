import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  StatusBar,
  Linking,
  Platform,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import MapView, { Marker, Polyline } from "react-native-maps";
import { ref, onValue } from "firebase/database";
import { db } from "../../../lib/firebase";
import polyline from "@mapbox/polyline";
import { haversineDistance } from "../../../utils/geo";
import {
  ArrowLeft,
  Navigation,
  Phone,
  MapPin,
} from "lucide-react-native";

const FIRE_TRUCK_IMG = require("../../../assets/icons/fire-truck.png");

const ROUTE_COLOR = "#ea580c";
const GOOGLE_MAPS_KEY = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;

export default function UserFireTracking() {
  const router = useRouter();
  const params = useLocalSearchParams();

  // Report data passed via route params
  const report = {
    assignedTo: params.assignedTo,
    assignedToName: params.assignedToName || "Rescue Unit",
    geohash: params.geohash,
    userLat: parseFloat(params.userLat),
    userLng: parseFloat(params.userLng),
    userImage: params.userImage || null,
    address: params.address || "Your Location",
  };

  const mapRef = useRef(null);

  const [truckLocation, setTruckLocation] = useState(null);
  const [routeCoords, setRouteCoords] = useState([]);
  const [distance, setDistance] = useState("");
  const [duration, setDuration] = useState("");
  const [lastFetchedTruck, setLastFetchedTruck] = useState(null);

  // ── Listen to real-time truck location ───────────────────
  useEffect(() => {
    if (!report.assignedTo || !report.geohash) return;

    const sanitizedId = report.assignedTo.replace(/[^a-zA-Z0-9]/g, "_");
    const staffRef = ref(db, `staff/fire/${report.geohash}/${sanitizedId}`);

    const unsub = onValue(staffRef, (snapshot) => {
      const data = snapshot.val();
      if (data?.coords) {
        setTruckLocation({
          lat: parseFloat(data.coords.lat),
          lng: parseFloat(data.coords.lng),
        });
      }
    });

    return () => unsub();
  }, [report.assignedTo, report.geohash]);

  // ── Fetch route when truck position changes significantly ─
  useEffect(() => {
    if (!truckLocation) return;

    // Only re-fetch route if truck moved > 50m since last fetch
    if (lastFetchedTruck) {
      const moved = haversineDistance(truckLocation, lastFetchedTruck);
      if (moved < 50) return;
    }

    fetchRoute(truckLocation);
  }, [truckLocation]);

  const fetchRoute = async (truckLoc) => {
    try {
      const origin = `${truckLoc.lat},${truckLoc.lng}`;
      const dest = `${report.userLat},${report.userLng}`;
      const url = `https://maps.googleapis.com/maps/api/directions/json?origin=${origin}&destination=${dest}&mode=driving&key=${GOOGLE_MAPS_KEY}`;

      const resp = await fetch(url);
      const json = await resp.json();

      if (json.routes?.length > 0) {
        const route = json.routes[0];
        const leg = route.legs[0];
        setDistance(leg.distance.text);
        setDuration(leg.duration.text);

        const points = polyline
          .decode(route.overview_polyline.points)
          .map(([lat, lng]) => ({ latitude: lat, longitude: lng }));

        setRouteCoords(points);
        setLastFetchedTruck({ ...truckLoc });

        // Fit map to show both markers
        if (mapRef.current) {
          mapRef.current.fitToCoordinates(
            [
              { latitude: truckLoc.lat, longitude: truckLoc.lng },
              { latitude: report.userLat, longitude: report.userLng },
            ],
            {
              edgePadding: { top: 140, right: 60, bottom: 240, left: 60 },
              animated: true,
            }
          );
        }
      }
    } catch (err) {
      console.error("Directions fetch failed:", err);
    }
  };

  // ── Call emergency ───────────────────────────────────────
  const handleCall = () => {
    Linking.openURL("tel:112");
  };

  // ── Loading ──────────────────────────────────────────────
  if (!truckLocation) {
    return (
      <View className="flex-1 items-center justify-center bg-slate-900">
        <StatusBar barStyle="light-content" />
        <ActivityIndicator size="large" color="#ea580c" />
        <Text className="text-slate-400 text-sm font-medium mt-4">
          Locating rescue unit...
        </Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-white">
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      {/* ── Map ── */}
      <MapView
        ref={mapRef}
        style={{ flex: 1 }}
        initialRegion={{
          latitude: (truckLocation.lat + report.userLat) / 2,
          longitude: (truckLocation.lng + report.userLng) / 2,
          latitudeDelta: 0.02,
          longitudeDelta: 0.02,
        }}
        showsUserLocation={false}
        showsMyLocationButton={false}
        toolbarEnabled={false}
        mapPadding={{ top: 100, right: 0, bottom: 220, left: 0 }}
      >
        {/* Route polyline */}
        {routeCoords.length > 0 && (
          <Polyline
            coordinates={routeCoords}
            strokeColor={ROUTE_COLOR}
            strokeWidth={5}
            geodesic
          />
        )}

        {/* Fire Truck marker */}
        <Marker
          coordinate={{
            latitude: truckLocation.lat,
            longitude: truckLocation.lng,
          }}
          anchor={{ x: 0.5, y: 0.5 }}
          flat
          tracksViewChanges={false}
          zIndex={100}
        >
          <View className="items-center justify-center">
            <Image
              source={FIRE_TRUCK_IMG}
              style={{ width: 48, height: 48 }}
              resizeMode="contain"
            />
          </View>
        </Marker>

        {/* User's location marker (with profile pic) */}
        <Marker
          coordinate={{
            latitude: report.userLat,
            longitude: report.userLng,
          }}
          anchor={{ x: 0.5, y: 0.9 }}
          tracksViewChanges={false}
        >
          <View className="items-center">
            {/* Ping ring */}
            <View className="absolute w-16 h-16 bg-orange-500/30 rounded-full" />
            <View
              className="w-14 h-14 rounded-full border-4 border-white overflow-hidden bg-slate-200"
              style={{ elevation: 8 }}
            >
              {report.userImage ? (
                <Image
                  source={{ uri: report.userImage }}
                  className="w-full h-full"
                  resizeMode="cover"
                />
              ) : (
                <View className="flex-1 items-center justify-center">
                  <MapPin size={22} color="#94a3b8" />
                </View>
              )}
            </View>
            {/* Triangle pointer */}
            <View
              style={{
                width: 0,
                height: 0,
                borderLeftWidth: 8,
                borderRightWidth: 8,
                borderTopWidth: 10,
                borderLeftColor: "transparent",
                borderRightColor: "transparent",
                borderTopColor: "#fff",
                marginTop: -2,
              }}
            />
          </View>
        </Marker>
      </MapView>

      {/* ── Top header overlay ── */}
      <View
        className="absolute top-0 left-0 right-0"
        pointerEvents="box-none"
        style={{ paddingTop: Platform.OS === "ios" ? 54 : 44 }}
      >
        <View className="mx-4 flex-row items-center" pointerEvents="auto">
          <TouchableOpacity
            onPress={() => router.back()}
            className="bg-slate-900 p-2.5 rounded-full mr-3"
            style={{ elevation: 6 }}
            activeOpacity={0.85}
          >
            <ArrowLeft size={22} color="#fff" />
          </TouchableOpacity>

          <View
            className="flex-1 bg-slate-900/95 px-4 py-3 rounded-2xl flex-row items-center justify-between"
            style={{ elevation: 6 }}
          >
            <View className="flex-1 mr-3">
              <View className="flex-row items-center mb-0.5">
                <View className="w-2 h-2 rounded-full bg-emerald-400 mr-2" />
                <Text className="text-white font-bold text-sm">
                  Help is on the way
                </Text>
              </View>
              <View className="flex-row items-center">
                <Navigation size={11} color="#9ca3af" style={{ marginRight: 4 }} />
                <Text className="text-slate-400 text-xs">
                  {duration ? `ETA: ${duration}` : "Calculating..."}
                </Text>
              </View>
            </View>

            {/* Call button */}
            <TouchableOpacity
              onPress={handleCall}
              className="w-9 h-9 rounded-full bg-emerald-600 items-center justify-center"
              style={{ elevation: 4 }}
              activeOpacity={0.8}
            >
              <Phone size={16} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* ── Bottom stats card ── */}
      <View className="absolute bottom-6 left-4 right-4" pointerEvents="box-none">
        <View
          className="bg-white rounded-2xl p-5 border border-slate-100"
          style={{ elevation: 12 }}
          pointerEvents="auto"
        >
          <View className="flex-row justify-between items-center">
            {/* Distance */}
            <View className="flex-1">
              <Text className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-1">
                Distance
              </Text>
              <Text className="text-xl font-black text-slate-800">
                {distance || "--"}
              </Text>
            </View>

            {/* Divider */}
            <View className="w-px h-10 bg-slate-200 mx-4" />

            {/* Unit info */}
            <View className="flex-1">
              <Text className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-1">
                Unit
              </Text>
              <Text
                className="text-sm font-bold text-slate-700"
                numberOfLines={1}
              >
                {report.assignedToName}
              </Text>
              <Text className="text-[10px] text-slate-400">Fire Response</Text>
            </View>

            {/* Divider */}
            <View className="w-px h-10 bg-slate-200 mx-4" />

            {/* Location */}
            <View className="flex-1">
              <Text className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-1">
                Location
              </Text>
              <Text
                className="text-xs font-medium text-slate-700"
                numberOfLines={2}
              >
                {report.address}
              </Text>
            </View>
          </View>
        </View>
      </View>
    </View>
  );
}
