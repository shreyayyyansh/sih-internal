import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  StatusBar,
  Platform,
  Alert,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useAuthStore } from "../../../store/useAuthStore";
import MapView, { Marker, Polyline, Callout } from "react-native-maps";
import * as Location from "expo-location";
import { ref, onValue, update, set, remove, onDisconnect } from "firebase/database";
import { db } from "../../../lib/firebase";
import ngeohash from "ngeohash";
import polyline from "@mapbox/polyline";
import { haversineDistance } from "../../../utils/geo";
import {
  ArrowLeft,
  Timer,
  CheckCircle,
  Loader as LoaderIcon,
  MapPin,
} from "lucide-react-native";

const FIRE_TRUCK_IMG = require("../../../assets/icons/fire-truck.png");
const ROUTE_COLOR = "#ea580c";
const GOOGLE_MAPS_KEY = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;
const ARRIVAL_THRESHOLD_M = 20;

export default function FireStaffNavigate() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const user = useAuthStore((s) => s.user);

  const activeTask = {
    id: params.taskId,
    title: params.taskTitle,
    image: params.taskImage || null,
    location: {
      address: params.taskAddress,
      lat: parseFloat(params.taskLat),
      lng: parseFloat(params.taskLng),
    },
    geohash: params.taskGeohash,
  };

  const mapRef = useRef(null);

  const [currentLocation, setCurrentLocation] = useState(null);
  const [routeCoords, setRouteCoords] = useState([]);
  const [remainingCoords, setRemainingCoords] = useState([]);
  const [distance, setDistance] = useState("");
  const [duration, setDuration] = useState("");
  const [routeFetched, setRouteFetched] = useState(false);

  const [waitingForUser, setWaitingForUser] = useState(false);
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);


  const distanceToTarget =
    currentLocation && activeTask.location.lat
      ? haversineDistance(currentLocation, activeTask.location)
      : Infinity;

  const isArrivalDisabled = distanceToTarget > ARRIVAL_THRESHOLD_M;


  useEffect(() => {
    let sub = null;
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permission denied", "Location access is required.");
        return;
      }

      sub = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          distanceInterval: 5,
        },
        (loc) => {
          const newLoc = {
            lat: loc.coords.latitude,
            lng: loc.coords.longitude,
          };
          setCurrentLocation(newLoc);
          updateRemainingPath(newLoc);
          updatePresence(newLoc);
        }
      );
    })();

    return () => {
      if (sub) sub.remove();
    };
  }, []);

  //Firebase presence
  const updatePresence = useCallback(
    (loc) => {
      if (!user || !loc) return;
      const uid = (user.sub || user.id || "").replace(/[^a-zA-Z0-9]/g, "_");
      const geohash = ngeohash.encode(loc.lat, loc.lng, 6);
      const path = `staff/fire/${geohash}/${uid}`;

      const userRef = ref(db, path);
      set(userRef, {
        userId: user.sub || user.id,
        name: user.name,
        email: user.email,
        picture: user.picture,
        coords: loc,
        status: "ENGAGED",
        lastSeen: Date.now(),
        device: Platform.OS,
      });
      onDisconnect(userRef).remove();
    },
    [user]
  );

  //Mark COMMUTING on mount
  useEffect(() => {
    if (!activeTask.geohash || !activeTask.id) return;
    const p = `fireAlerts/${activeTask.geohash}/${activeTask.id}`;
    update(ref(db, p), { status: "COMMUTING" }).catch(console.error);
  }, []);

  // ── Listen for resolution (admin/user closing the alert)
  useEffect(() => {
    if (!activeTask.geohash || !activeTask.id) return;
    const taskRef = ref(
      db,
      `fireAlerts/${activeTask.geohash}/${activeTask.id}`
    );

    const unsub = onValue(taskRef, (snap) => {
      if (!snap.exists()) {
        setIsRedirecting(true);
        setWaitingForUser(false);
        setTimeout(() => {
          setIsRedirecting(false);
          router.back();
        }, 3000);
      }
    });

    return () => unsub();
  }, []);

  //Fetch Google Directions route 
  useEffect(() => {
    if (routeFetched || !currentLocation || !activeTask.location.lat) return;
    fetchRoute();
  }, [currentLocation, routeFetched]);

  const fetchRoute = async () => {
    try {
      const origin = `${currentLocation.lat},${currentLocation.lng}`;
      const dest = `${activeTask.location.lat},${activeTask.location.lng}`;
      const url = `https://maps.googleapis.com/maps/api/directions/json?origin=${origin}&destination=${dest}&mode=driving&key=${GOOGLE_MAPS_KEY}`;

      const resp = await fetch(url);
      const json = await resp.json();

      if (json.routes && json.routes.length > 0) {
        const route = json.routes[0];
        const leg = route.legs[0];
        setDistance(leg.distance.text);
        setDuration(leg.duration.text);

        const points = polyline
          .decode(route.overview_polyline.points)
          .map(([lat, lng]) => ({ latitude: lat, longitude: lng }));

        setRouteCoords(points);
        setRemainingCoords(points);
        setRouteFetched(true);

        // Fit map to route
        if (mapRef.current && points.length > 0) {
          mapRef.current.fitToCoordinates(
            [
              {
                latitude: currentLocation.lat,
                longitude: currentLocation.lng,
              },
              {
                latitude: activeTask.location.lat,
                longitude: activeTask.location.lng,
              },
              ...points,
            ],
            {
              edgePadding: { top: 140, right: 60, bottom: 260, left: 60 },
              animated: true,
            }
          );
        }
      }
    } catch (err) {
      console.error("Directions fetch failed:", err);
    }
  };

  // ── Trim polyline to remaining portion ───────────────────
  const updateRemainingPath = (loc) => {
    if (routeCoords.length === 0) return;
    let closestIdx = 0;
    let minDist = Infinity;

    routeCoords.forEach((pt, i) => {
      const d = haversineDistance(loc, {
        lat: pt.latitude,
        lng: pt.longitude,
      });
      if (d < minDist) {
        minDist = d;
        closestIdx = i;
      }
    });

    const sliced = routeCoords.slice(closestIdx);
    setRemainingCoords([
      { latitude: loc.lat, longitude: loc.lng },
      ...sliced,
    ]);
  };

  // ── Resolve task ─────────────────────────────────────────
  const handleResolveTask = async () => {
    if (!activeTask.geohash || !activeTask.id) return;
    try {
      await update(
        ref(db, `fireAlerts/${activeTask.geohash}/${activeTask.id}`),
        { status: "RESOLVED" }
      );
      setWaitingForUser(true);
    } catch (err) {
      console.error("Error resolving:", err);
      Alert.alert("Error", "Failed to update status. Try again.");
    }
  };

  // ── Exit ─────────────────────────────────────────────────
  const exitNavigation = () => {
    router.back();
  };

  // ── Loading state ────────────────────────────────────────
  if (!currentLocation) {
    return (
      <View className="flex-1 items-center justify-center bg-white">
        <StatusBar barStyle="dark-content" />
        <ActivityIndicator size="large" color="#1e293b" />
        <Text className="text-slate-500 text-sm font-medium mt-4">
          Acquiring Location...
        </Text>
      </View>
    );
  }

  // ── Main render ──────────────────────────────────────────
  return (
    <View className="flex-1 bg-white">
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      {/* ── Redirecting overlay ── */}
      {isRedirecting && (
        <View
          className="absolute inset-0 z-50 items-center justify-center"
          style={{ backgroundColor: "rgba(0,0,0,0.8)" }}
        >
          <View className="bg-white p-8 rounded-3xl items-center max-w-[85%]" style={{ elevation: 20 }}>
            <View className="w-20 h-20 bg-emerald-100 rounded-full items-center justify-center mb-5">
              <CheckCircle size={40} color="#059669" />
            </View>
            <Text className="text-2xl font-black text-slate-800 text-center">
              Mission Resolved!
            </Text>
            <Text className="text-slate-500 font-medium mt-1">
              Returning to dashboard...
            </Text>
            <View className="flex-row items-center mt-4 bg-slate-100 px-4 py-2 rounded-full">
              <ActivityIndicator size="small" color="#059669" />
              <Text className="text-[10px] font-bold text-slate-600 uppercase tracking-widest ml-2">
                Redirecting
              </Text>
            </View>
          </View>
        </View>
      )}

      {/* ── Map ── */}
      <MapView
        ref={mapRef}
        style={{ flex: 1 }}
        initialRegion={{
          latitude: currentLocation.lat,
          longitude: currentLocation.lng,
          latitudeDelta: 0.005,
          longitudeDelta: 0.005,
        }}
        showsUserLocation={false}
        showsMyLocationButton={false}
        toolbarEnabled={false}
        mapPadding={{ top: 100, right: 0, bottom: 220, left: 0 }}
      >
        {/* Route polyline */}
        {remainingCoords.length > 0 && (
          <Polyline
            coordinates={remainingCoords}
            strokeColor={ROUTE_COLOR}
            strokeWidth={6}
            geodesic
          />
        )}

        {/* Staff marker */}
        <Marker
          coordinate={{
            latitude: currentLocation.lat,
            longitude: currentLocation.lng,
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

        {/* Target / victim marker */}
        {activeTask.location.lat && (
          <Marker
            coordinate={{
              latitude: activeTask.location.lat,
              longitude: activeTask.location.lng,
            }}
            anchor={{ x: 0.5, y: 0.9 }}
            tracksViewChanges={false}
          >
            <View className="items-center">
              {/* Ping ring */}
              <View className="absolute w-16 h-16 bg-orange-500/30 rounded-full" />
              <View className="w-14 h-14 rounded-full border-4 border-white overflow-hidden bg-slate-200" style={{ elevation: 8 }}>
                {activeTask.image ? (
                  <Image
                    source={{ uri: activeTask.image }}
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
        )}
      </MapView>

      {/* ── Top header overlay ── */}
      <View
        className="absolute top-0 left-0 right-0 pt-12 px-4 pb-4"
        pointerEvents="box-none"
        style={{
          background: "transparent",
        }}
      >
        <View className="flex-row items-center" pointerEvents="auto">
          <TouchableOpacity
            onPress={exitNavigation}
            className="bg-white p-2.5 rounded-full mr-3"
            style={{ elevation: 6 }}
            activeOpacity={0.85}
          >
            <ArrowLeft size={24} color="#1e293b" />
          </TouchableOpacity>

          <View
            className="flex-1 bg-white/95 px-4 py-2.5 rounded-2xl"
            style={{ elevation: 6 }}
          >
            <Text
              className="font-bold text-slate-800 text-sm"
              numberOfLines={1}
            >
              Navigating to Incident
            </Text>
            <Text className="text-xs text-slate-500" numberOfLines={1}>
              {activeTask.location.address}
            </Text>
          </View>
        </View>
      </View>

      {/* ── Bottom action card ── */}
      <View className="absolute bottom-6 left-4 right-4" pointerEvents="box-none">
        <View
          className="bg-white rounded-2xl p-5 border border-slate-100"
          style={{ elevation: 12 }}
          pointerEvents="auto"
        >
          {/* ETA row */}
          <View className="flex-row justify-between items-end mb-4">
            <View>
              <Text className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mb-1">
                Estimated Arrival
              </Text>
              <View className="flex-row items-baseline">
                <Text className="text-3xl font-black text-slate-800">
                  {duration || "--"}
                </Text>
                <Text className="text-slate-500 font-medium ml-1">
                  ({distance || "--"})
                </Text>
              </View>
            </View>
            <View className="bg-orange-100 p-3 rounded-full">
              <Timer size={24} color="#ea580c" />
            </View>
          </View>

          {/* Action button */}
          <TouchableOpacity
            disabled={isArrivalDisabled || waitingForUser || isRedirecting}
            onPress={handleResolveTask}
            className={`w-full py-4 rounded-xl items-center justify-center ${isArrivalDisabled || waitingForUser || isRedirecting
                ? "bg-slate-100 border border-slate-200"
                : "bg-emerald-500"
              }`}
            style={
              !(isArrivalDisabled || waitingForUser || isRedirecting)
                ? { elevation: 6 }
                : {}
            }
            activeOpacity={0.85}
          >
            {waitingForUser ? (
              <View className="flex-row items-center">
                <ActivityIndicator size="small" color="#64748b" />
                <Text className="text-slate-500 font-bold text-sm ml-2">
                  Waiting for user confirmation...
                </Text>
              </View>
            ) : (
              <View className="items-center">
                <Text
                  className={`font-bold text-sm ${isArrivalDisabled ? "text-slate-500" : "text-white"
                    }`}
                >
                  {isArrivalDisabled
                    ? "Arrive at Destination"
                    : "Mark On Scene / Complete"}
                </Text>
                {isArrivalDisabled && distanceToTarget !== Infinity && (
                  <Text className="text-[10px] text-slate-400 font-medium mt-0.5">
                    Move {Math.round(distanceToTarget - ARRIVAL_THRESHOLD_M)}m
                    closer to unlock
                  </Text>
                )}
              </View>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}
