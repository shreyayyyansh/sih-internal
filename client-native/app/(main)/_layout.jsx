import React, { useEffect } from "react";
import { View, Text } from "react-native";
import { Stack, Redirect, useSegments } from "expo-router";
import { useAuth0 } from "react-native-auth0";
import { useAuthStore } from "../../store/useAuthStore";
import { useNotificationStore } from "../../store/useNotificationStore";
import CircularText from "../../components/ui/CircularText";
import VyomAgentFAB from "../../components/features/VyomAgent/VyomAgentFAB";

export default function ProtectedLayout() {
  const { isLoading } = useAuth0();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const storedUser = useAuthStore((s) => s.user);
  const connectNotifications = useNotificationStore((s) => s.connect);
  const disconnectNotifications = useNotificationStore((s) => s.disconnect);
  const segments = useSegments();

  // Determine if we are on the SisterHood screen
  const isSisterHood = segments.includes('SisterHood');

  // Auto-connect SSE when authenticated
  useEffect(() => {
    const userId = storedUser?.sub || storedUser?.id;
    if (isAuthenticated && userId) {
      connectNotifications(userId);
    }
    return () => disconnectNotifications();
  }, [isAuthenticated, storedUser?.sub, storedUser?.id]);

  if (!isAuthenticated && !isLoading) {
    return <Redirect href="/" />;
  }

  return (
    <View style={{ flex: 1 }}>
      <Stack screenOptions={{ headerShown: false }} />
      {isLoading && (
        <View className="absolute inset-0 z-[999] bg-gray-900 items-center justify-center">
          <CircularText
            text="URBAN*FLOW*URBAN*FLOW "
            spinDuration={20}
            className="custom-class"
            textClassName="text-blue-400"
          />
        </View>
      )}
      {!isLoading && isAuthenticated && !isSisterHood && <VyomAgentFAB />}
    </View>
  );
}