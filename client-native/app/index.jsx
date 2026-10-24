import React, { useEffect } from "react";
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useAuth0 } from "react-native-auth0";
import FloatingLines from "../components/ui/FloatingLines";

const logo = require("../assets/images/logo.png");

export default function Home() {
  const router = useRouter();
  const { authorize, user, isLoading } = useAuth0();
  useEffect(() => {
    if (!isLoading && user) {
      router.replace("/(main)");
    }
  }, [user, isLoading, router]);
  if (isLoading || user) {
    return (
      <View style={{ flex: 1, backgroundColor: "#000000", justifyContent: "center" }}>
        <ActivityIndicator size="large" color="#3b82f6" />
      </View>
    );
  }

  const handleLogin = async () => {
    try {
      const result = await authorize({
        audience: process.env.EXPO_PUBLIC_AUTH0_AUDIENCE,
        scope: "openid profile email",
        customScheme:"com.anonymous.urbanflow.auth0",
      });

    } catch (e) {
      console.log("Login cancelled or failed:", e);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#000000" }}>
      {/* Background Theme */}
      <View style={StyleSheet.absoluteFillObject} pointerEvents="none">
        <FloatingLines />
      </View>

      {/* Header */}
      <View className="absolute top-12 left-6 z-50 flex-row items-center gap-x-3">
        <Image
          source={logo}
          style={{ width: 40, height: 40 }}
          resizeMode="contain"
        />
        <Text className="text-2xl font-black tracking-tighter text-blue-100">
          UrbanFlow
        </Text>
      </View>

      {/* Main Content */}
      <View
        className="flex-1 items-center justify-center px-6 z-10"
        pointerEvents="box-none"
      >
        <View className="w-full max-w-lg items-center rounded-[3rem] border border-white/10 bg-zinc-900/90 p-8 py-12 shadow-2xl">
          <Text className="text-center text-4xl font-bold leading-tight tracking-tight">
            <Text className="text-white">
              Be one with the city,{"\n"}
            </Text>
            <Text className="text-purple-300">not the chaos</Text>
          </Text>

          <Text className="mt-6 text-center text-base font-medium leading-relaxed text-gray-300">
            Experience urban navigation reimagined with real-time intelligence.
          </Text>

          <View className="mt-10 flex-col gap-y-4 w-full px-4">
            {/* Login Button */}
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={handleLogin}
              className="w-full items-center rounded-full bg-blue-600 py-4 shadow-lg shadow-blue-500/40"
            >
              <Text className="text-lg font-bold text-white">
                Get Started
              </Text>
            </TouchableOpacity>
            
            {/* Mission Page */}
            <TouchableOpacity
              activeOpacity={0.6}
              onPress={() => router.push("/mission")}
              className="w-full items-center rounded-full border border-white/20 bg-transparent py-4"
            >
              <Text className="text-lg font-bold text-white">
                Learn More
              </Text>
            </TouchableOpacity>

            {/* About Page */}
            <TouchableOpacity
              activeOpacity={0.6}
              onPress={() => router.push("/about")}
              className="mt-2 w-full items-center py-2"
            >
              <Text className="text-sm font-medium text-gray-400">
                Meet the Team
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}