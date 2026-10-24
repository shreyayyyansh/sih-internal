import React, { useState, useEffect } from 'react';
import { View, Text, Alert, ActivityIndicator } from 'react-native';
import * as Location from 'expo-location';
import { router, Redirect } from 'expo-router';
import LocationAccess from './LocationAccess';
import SisterHoodMap from './SisterHoodMap';
export default function SisterHoodGateway() {
  const [hasPermission, setHasPermission] = useState(null); // null = checking
  const [isRequesting, setIsRequesting] = useState(false);

  useEffect(() => {
    (async () => {
      // Upon render, check if permission is already granted so we can skip the UI
      try {
        const { status } = await Location.getForegroundPermissionsAsync();
        if (status === 'granted') {
          setHasPermission(true);
        } else {
          setHasPermission(false);
        }
      } catch (err) {
        console.error("Error checking location permission", err);
        setHasPermission(false);
      }
    })();
  }, []);

  const requestPermission = async () => {
    setIsRequesting(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
         setHasPermission(true);
      } else {
         Alert.alert("Permission Denied", "Location is required to use SisterHood features effectively.");
         setHasPermission(false);
      }
    } catch (err) {
      console.error(err);
      Alert.alert("Error", "Could not request location at this time.");
    } finally {
      setIsRequesting(false);
    }
  };

  const skipPermission = () => {
    setHasPermission('skipped'); // triggers a re-render to the Redirect
  };

  if (hasPermission === 'skipped') {
    return <Redirect href="/(main)" />;
  }

  // 1. Still checking initial status
  if (hasPermission === null) {
      return (
          <View className="flex-1 bg-zinc-950 items-center justify-center">
             <ActivityIndicator color="#ffffff" size="large" />
          </View>
      );
  }

  // 2. Permission not granted -> show LocationAccess UI
  if (hasPermission === false) {
      return (
          <LocationAccess 
              onRequestLocation={requestPermission} 
              isLoadingLocation={isRequesting}
              onSkip={skipPermission}
          />
      );
  }

  // 3. Permission Granted -> Proceed to the actual Feature map
  return (
    <SisterHoodMap/>
  );
}
