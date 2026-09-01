import "./global.css"; // Required for NativeWind
import React, { useEffect } from "react";
import { Stack } from "expo-router";
import * as Notifications from 'expo-notifications';
import AuthProvider from "../auth/AuthProvider";
import AuthSyncProvider from "../auth/AuthSyncProvider";

// Global imports to define background tasks and setup categories
import './(main)/(tabs)/SisterHood/_utils/backgroundService';
import { setupNotificationCategory, setupNotificationResponseListener } from './(main)/(tabs)/SisterHood/_utils/notificationActions';

// Setup notification behavior (how to handle when push is received while app is foreground)
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export default function RootLayout() {
  useEffect(() => {
    setupNotificationCategory();
    const sub = setupNotificationResponseListener();
    return () => sub.remove();
  }, []);

  return (
    <AuthProvider>
      <AuthSyncProvider>
        {/* The Stack automatically manages all files in the app folder */}
        <Stack screenOptions={{ headerShown: false }}>

          {/* Public Screens */}
          <Stack.Screen name="index" />
          <Stack.Screen name="mission" />
          <Stack.Screen name="about" />

          {/* Route Groups */}
          <Stack.Screen name="(main)" />

        </Stack>
      </AuthSyncProvider>
    </AuthProvider>
  );
}