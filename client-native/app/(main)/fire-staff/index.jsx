import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  ScrollView,
  ActivityIndicator,
  StatusBar,
  Dimensions,
} from "react-native";
import { useRouter } from "expo-router";
import { useAuth0 } from "react-native-auth0";
import { useAuthStore } from "../../../store/useAuthStore";
import { ref, onValue } from "firebase/database";
import { db } from "../../../lib/firebase";
import { api } from "../../../lib/api";
import {
  MapPin,
  Clock,
  Camera,
  CheckCircle,
  Navigation,
  LogOut,
  ShieldCheck,
  ThumbsUp,
} from "lucide-react-native";

const { width: SCREEN_W } = Dimensions.get("window");

export default function FireStaffDashboard() {
  const router = useRouter();
  const { clearSession } = useAuth0();
  const user = useAuthStore((s) => s.user);
  const clearUser = useAuthStore((s) => s.clearUser);

  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("active");
  const [staffStatus, setStaffStatus] = useState("AVAILABLE");
  const [showSuccessToast, setShowSuccessToast] = useState(false);

  // ── Fetch tasks ──────────────────────────────────────────
  useEffect(() => {
    if (!user) return;
    setLoading(true);
    setTasks([]);

    if (activeTab === "active") {
      const alertsRef = ref(db, "fireAlerts/");
      const unsubscribe = onValue(alertsRef, (snapshot) => {
        const data = snapshot.val();
        const myTasks = [];

        if (data) {
          Object.keys(data).forEach((geohash) => {
            const bucket = data[geohash];
            Object.keys(bucket).forEach((alertId) => {
              const alert = bucket[alertId];
              const uid = user.sub || user.id;
              if (alert.assignedTo === uid) {
                myTasks.push({
                  id: alertId,
                  title: alert.userName
                    ? `Fire Response: ${alert.userName}`
                    : "Emergency Response",
                  image: alert.imageUrl || alert.userProfileUrl,
                  location: {
                    address: alert.location?.address || "GPS Coordinates",
                    lat: alert.location?.lat,
                    lng: alert.location?.lng,
                  },
                  status: alert.status,
                  timestamp: alert.timestamp,
                  geohash,
                });
              }
            });
          });
        }

        const activeTasks = myTasks.filter((t) => t.status !== "RESOLVED");
        activeTasks.sort((a, b) => b.timestamp - a.timestamp);
        setTasks(activeTasks);
        setStaffStatus(activeTasks.length > 0 ? "ENGAGED" : "AVAILABLE");
        setLoading(false);
      });

      return () => unsubscribe();
    } else {
      // History
      const fetchHistory = async () => {
        try {
          const res = await api.get("/api/reports/FetchAdminFireHistory");
          if (res.data && Array.isArray(res.data)) {
            const uid = user.sub || user.id;
            const mine = res.data.filter((r) => r.assignedTo === uid);
            const formatted = mine.map((r) => ({
              id: r._id || r.id,
              title: r.userName
                ? `Fire Response: ${r.userName}`
                : "Anonymous Report",
              image: r.imageUrl || r.userProfileUrl,
              location: {
                address:
                  r.address || r.location?.address || "Recorded Location",
                lat: r.coords?.lat || r.location?.lat,
                lng: r.coords?.lng || r.location?.lng,
              },
              status: "RESOLVED",
              timestamp: r.timestamp,
              completedAt: r.archivedAt,
            }));
            formatted.sort(
              (a, b) => new Date(b.timestamp) - new Date(a.timestamp)
            );
            setTasks(formatted);
          }
        } catch (err) {
          console.error("Failed to fetch history:", err);
        } finally {
          setLoading(false);
        }
      };
      fetchHistory();
    }
  }, [user, activeTab]);

  // ── Logout ───────────────────────────────────────────────
  const handleLogout = useCallback(async () => {
    try {
      await clearSession();
    } catch (_) {}
    clearUser();
    router.replace("/");
  }, []);

  // ── Navigate to map ──────────────────────────────────────
  const handleStartNavigation = (task) => {
    router.push({
      pathname: "/fire-staff/navigate",
      params: {
        taskId: task.id,
        taskTitle: task.title,
        taskImage: task.image || "",
        taskAddress: task.location.address,
        taskLat: String(task.location.lat),
        taskLng: String(task.location.lng),
        taskGeohash: task.geohash,
      },
    });
  };

  // ── Render helpers ───────────────────────────────────────
  const isEngaged = staffStatus === "ENGAGED";
  const headerBg = isEngaged ? "#ea580c" : "#1e293b";

  if (!user || loading) {
    return (
      <View className="flex-1 items-center justify-center bg-slate-50">
        <StatusBar barStyle="dark-content" />
        <ActivityIndicator size="large" color="#1e293b" />
        <Text className="text-slate-500 text-sm font-medium mt-4">
          Syncing Network...
        </Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-slate-50">
      <StatusBar
        barStyle="light-content"
        backgroundColor={headerBg}
        translucent={false}
      />

      {/* ── Success Toast ───────────────────────────── */}
      {showSuccessToast && (
        <View className="absolute top-14 left-6 right-6 z-50">
          <View className="bg-emerald-600 rounded-2xl p-4 flex-row items-center shadow-2xl"
            style={{ elevation: 20 }}>
            <View className="bg-white/20 p-2 rounded-full mr-3">
              <ThumbsUp size={22} color="#fff" />
            </View>
            <View className="flex-1">
              <Text className="text-white font-bold text-base">
                Mission Successful
              </Text>
              <Text className="text-emerald-100 text-xs">
                User confirmed resolution.
              </Text>
            </View>
          </View>
        </View>
      )}

      {/* ── Header ──────────────────────────────────── */}
      <View
        className="px-6 pt-4 pb-8"
        style={{
          backgroundColor: headerBg,
          borderBottomLeftRadius: 32,
          borderBottomRightRadius: 32,
          elevation: 8,
        }}
      >
        <View className="flex-row justify-between items-start mb-5">
          <View className="flex-1 mr-3">
            <View className="flex-row items-center mb-1">
              <ShieldCheck size={14} color="rgba(255,255,255,0.5)" />
              <Text className="text-white/50 text-[10px] font-bold uppercase tracking-widest ml-1.5">
                Fire Response Unit
              </Text>
            </View>
            <Text
              className="text-white text-2xl font-black"
              numberOfLines={1}
            >
              {user?.name}
            </Text>

            <View
              className="flex-row items-center mt-3 px-3 py-1.5 rounded-full self-start"
              style={{
                backgroundColor: isEngaged
                  ? "rgba(234,88,12,0.25)"
                  : "rgba(16,185,129,0.2)",
                borderWidth: 1,
                borderColor: isEngaged
                  ? "rgba(251,146,60,0.35)"
                  : "rgba(52,211,153,0.35)",
              }}
            >
              <View
                className="w-2.5 h-2.5 rounded-full mr-2"
                style={{
                  backgroundColor: isEngaged ? "#fdba74" : "#34d399",
                }}
              />
              <Text
                className="text-xs font-bold"
                style={{
                  color: isEngaged ? "#fed7aa" : "#a7f3d0",
                }}
              >
                {isEngaged ? "ENGAGED IN MISSION" : "ONLINE & AVAILABLE"}
              </Text>
            </View>
          </View>

          <TouchableOpacity
            onPress={handleLogout}
            className="bg-white/10 p-2.5 rounded-full"
            activeOpacity={0.7}
          >
            <LogOut size={20} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>

      {/* ── Tabs ────────────────────────────────────── */}
      <View className="flex-row px-6 mt-5 border-b border-slate-200">
        {["active", "history"].map((tab) => (
          <TouchableOpacity
            key={tab}
            onPress={() => setActiveTab(tab)}
            className="mr-6 pb-3"
            activeOpacity={0.7}
          >
            <Text
              className={`text-sm font-bold ${
                activeTab === tab ? "text-slate-800" : "text-slate-400"
              }`}
            >
              {tab === "active" ? "Assigned Missions" : "History"}
            </Text>
            {activeTab === tab && (
              <View className="h-0.5 bg-slate-800 mt-2 rounded-full" />
            )}
          </TouchableOpacity>
        ))}
      </View>

      {/* ── Task List ───────────────────────────────── */}
      <ScrollView
        className="flex-1 px-6 pt-4"
        contentContainerStyle={{ paddingBottom: 32 }}
        showsVerticalScrollIndicator={false}
      >
        {tasks.length === 0 ? (
          <View className="items-center pt-20">
            <View className="w-20 h-20 bg-slate-100 rounded-full items-center justify-center mb-4">
              <ShieldCheck size={40} color="#cbd5e1" />
            </View>
            <Text className="text-slate-800 font-bold text-lg">
              {activeTab === "active" ? "No Active Missions" : "No History"}
            </Text>
            <Text className="text-slate-400 text-sm mt-1 text-center max-w-[220px]">
              {activeTab === "active"
                ? "Stand by. You are visible to the dispatcher."
                : "No mission history found."}
            </Text>
          </View>
        ) : (
          tasks.map((task) => (
            <View
              key={task.id}
              className="bg-white rounded-3xl p-5 mb-4 border border-slate-100"
              style={{ elevation: 2 }}
            >
              {/* Card top */}
              <View className="flex-row mb-4">
                <View className="w-20 h-20 rounded-2xl bg-slate-100 overflow-hidden mr-4">
                  {task.image ? (
                    <Image
                      source={{ uri: task.image }}
                      className="w-full h-full"
                      resizeMode="cover"
                    />
                  ) : (
                    <View className="flex-1 items-center justify-center">
                      <Camera size={22} color="#cbd5e1" />
                    </View>
                  )}
                </View>

                <View className="flex-1">
                  <Text
                    className="text-slate-900 font-bold text-base leading-tight mb-1"
                    numberOfLines={2}
                  >
                    {task.title}
                  </Text>
                  <View className="flex-row items-start mb-2">
                    <MapPin
                      size={12}
                      color="#94a3b8"
                      style={{ marginTop: 2, marginRight: 4 }}
                    />
                    <Text
                      className="text-slate-500 text-xs leading-relaxed flex-1"
                      numberOfLines={2}
                    >
                      {task.location?.address}
                    </Text>
                  </View>
                  <View className="flex-row items-center bg-orange-50 self-start px-2 py-1 rounded-md">
                    <Clock size={10} color="#c2410c" style={{ marginRight: 4 }} />
                    <Text className="text-orange-700 text-[10px] font-bold uppercase tracking-wide">
                      {new Date(task.timestamp).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </Text>
                  </View>
                </View>
              </View>

              {/* Action */}
              {activeTab === "active" ? (
                <TouchableOpacity
                  onPress={() => handleStartNavigation(task)}
                  className="bg-slate-800 rounded-xl py-3.5 flex-row items-center justify-center"
                  style={{ elevation: 4 }}
                  activeOpacity={0.85}
                >
                  <Navigation size={16} color="#fff" style={{ marginRight: 8 }} />
                  <Text className="text-white text-xs font-bold">
                    Start Navigation
                  </Text>
                </TouchableOpacity>
              ) : (
                <View className="bg-emerald-50 rounded-xl py-3 flex-row items-center justify-center mt-1">
                  <CheckCircle
                    size={16}
                    color="#059669"
                    style={{ marginRight: 8 }}
                  />
                  <Text className="text-emerald-600 text-xs font-bold">
                    Mission Accomplished
                  </Text>
                </View>
              )}
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
}
