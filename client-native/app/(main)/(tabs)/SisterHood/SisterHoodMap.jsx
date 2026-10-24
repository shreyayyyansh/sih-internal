import * as Location from 'expo-location';
import { off, onValue, ref, remove, runTransaction, set, update } from 'firebase/database';
import { AlertTriangle, ArrowLeft, Compass, Shield } from 'lucide-react-native';
import ngeohash from 'ngeohash';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Animated, AppState, DeviceEventEmitter, PixelRatio, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import MapView, { AnimatedRegion, Marker, PROVIDER_GOOGLE } from 'react-native-maps';

import { db } from '../../../../lib/firebase';
import { useAuthStore } from '../../../../store/useAuthStore';
import SOSBottomBar from './_components/SOSBottomBar';
import SOSResolutionModal from './_components/SOSResolutionModal';
import { getPersistedState, persistTrackingState, requestBackgroundLocationPermissions, startBackgroundService, stopBackgroundService } from './_utils/backgroundService';
import { calculateBearing, calculateDistance } from './_utils/locationMath';
import { dismissPersistentNotification, showPersistentNotification } from './_utils/notificationActions';
import { addToRTDB } from './_utils/Rtdbadd';
import { removeFromRTDB } from './_utils/Rtdbdel';
import { getInitialStationaryBlocks } from './_utils/stationaryManager';
import { computeBlockSafetyImpact } from './_utils/trustScoreManager';
import useCompass from './_utils/useCompass';
import { useGracefulExit } from './_utils/useGracefulExit';
import { useSafetyScore } from './_utils/useSafetyScore';
import { useTrustScore } from './_utils/useTrustScore';
import { startVolumeListener, stopVolumeListener } from './_utils/volumeTrigger';
import { evaluateSlidingWindow, getForwardBlocks } from './_utils/windowManager';

const DISTANCE_THRESHOLD = 15;
export default function SisterHoodMap() {
    const user = useAuthStore(state => state.user);
    const mapRef = useRef(null)
    const [currentLocation, setCurrentLocation] = useState(null)
    const [trackingMode, setTrackingMode] = useState('STATIONARY')
    const [sosActive, setSosActive] = useState(false)
    const [isRecording, setIsRecording] = useState(false);
    const [nearbyThreats, setNearbyThreats] = useState([]);
    const [markerLoaded, setMarkerLoaded] = useState(false);
    const [currentGeo8, setCurrentGeo8] = useState(null);

    // SOS Alert Banner state
    const [focusedThreat, setFocusedThreat] = useState(null);
    const [showSOSBanner, setShowSOSBanner] = useState(false);
    const bannerSlideAnim = useRef(new Animated.Value(-120)).current; // starts off-screen above

    // Safety Score logic
    const { safetyScore, getScoreColor } = useSafetyScore(currentGeo8);

    // Trust Score lifecycle
    const { handleSOSResolution, handleSafeWalkExit, flushTrustScoreToServer } = useTrustScore();

    // SOS Resolution Modal state
    const [showResolutionModal, setShowResolutionModal] = useState(false);

    // Session ref: did the user trigger SOS at any point this session?
    const sosWasTriggeredRef = useRef(false);

    // React to nearby threats — show / hide the alert banner
    useEffect(() => {
        if (nearbyThreats.length > 0) {
            const closest = nearbyThreats.reduce((a, b) => a.distance < b.distance ? a : b);
            setFocusedThreat(closest);
            // Only animate in if not already showing
            if (!showSOSBanner) {
                setShowSOSBanner(true);
                Animated.spring(bannerSlideAnim, {
                    toValue: 0,
                    useNativeDriver: true,
                    tension: 65,
                    friction: 10,
                }).start();
            }
        } else {
            // Slide out and clear
            Animated.timing(bannerSlideAnim, {
                toValue: -120,
                duration: 300,
                useNativeDriver: true,
            }).start(() => {
                setShowSOSBanner(false);
                setFocusedThreat(null);
            });
        }
    }, [nearbyThreats]);

    // Hardware Accelerated Compass FOV indicator
    const { headingAnim } = useCompass(100, 2);
    const spin = headingAnim.interpolate({
        inputRange: [-3600, 3600], // Extraneous range to prevent clamping wraparound
        outputRange: ['-3600deg', '3600deg']
    });

    // Smooth Marker Animation State
    const animatedLocRef = useRef(new AnimatedRegion({
        latitude: 0,
        longitude: 0,
        latitudeDelta: 0,
        longitudeDelta: 0,
    }));

    const modeRef = useRef('STATIONARY')
    const blocksRef = useRef([])
    const anchorRef = useRef(null)
    const lastCoordRef = useRef(null)
    const bearingRef = useRef(0)
    const lastGeo8Ref = useRef(null);
    const lastGeo6Ref = useRef(null);

    const isMounted = useRef(true);
    const isProcessingRef = useRef(false);
    const locationSubRef = useRef(null);
    const appStateRef = useRef(AppState.currentState);
    const isInBackground = useRef(false);
    const isTransitioningRef = useRef(false);
    const sosActiveRef = useRef(sosActive);

    // Keep ref in sync
    useEffect(() => {
        sosActiveRef.current = sosActive;
    }, [sosActive]);

    const { handleBackPress } = useGracefulExit({
        user,
        blocksRef,
        lastGeo6Ref,
        sosActive,
        onBeforeExit: async () => {
            if (!sosWasTriggeredRef.current) {
                // Safe walk exit — increment streak, maybe award bonus
                await handleSafeWalkExit();
            } else {
                // SOS was triggered — flush the final trust state to Firestore
                await flushTrustScoreToServer();
            }
        },
        onExit: async () => {
            console.log("⏹️ Stopping services from in-app exit.");
            await stopBackgroundService();
            await dismissPersistentNotification();
        }
    });

    useEffect(() => {
        isMounted.current = true;
        let locationSubscription;

        const startTracking = async () => {
            if (!user) return;

            // Request background permissions
            const hasBgPerms = await requestBackgroundLocationPermissions();
            if (!hasBgPerms) {
                Alert.alert(
                    "Background Access Required",
                    "Sisterhood Shield needs 'Allow all the time' location access to protect you when the app is minimized.",
                    [{ text: "OK" }]
                );
                // Continue with foreground only if denied
            }

            try {
                const initialLoc = await Location.getCurrentPositionAsync({
                    accuracy: Location.Accuracy.Balanced
                });

                if (!isMounted.current) return; // Prevent state update if unmounted during await

                const { latitude, longitude } = initialLoc.coords;

                setCurrentLocation(initialLoc.coords);

                animatedLocRef.current.setValue({
                    latitude: initialLoc.coords.latitude,
                    longitude: initialLoc.coords.longitude,
                });

                lastCoordRef.current = initialLoc.coords;
                anchorRef.current = initialLoc.coords;

                const startingBlocks = getInitialStationaryBlocks(latitude, longitude, 50);
                blocksRef.current = startingBlocks;
                console.log(`Initial Load: Monitoring ${startingBlocks.length} stationary blocks.`);
                await addToRTDB(startingBlocks, user.id);

                if (!isMounted.current) return;
                const sub = await Location.watchPositionAsync(
                    {
                        accuracy: Location.Accuracy.High,
                        timeInterval: 2000,
                        distanceInterval: 1,
                    },
                    (newLocation) => {
                        if (isMounted.current && !isProcessingRef.current) {
                            handleLocationWorker(newLocation.coords);
                        }
                    }
                );
                locationSubRef.current = sub;

                // Robust Startup: Start the background service while in foreground to avoid Android background restrictions
                // Before overwriting, let's sync local UI in case background was already running (e.g. app killed but service alive)
                try {
                    const state = await getPersistedState();
                    if (state.sosActive !== sosActiveRef.current) setSosActive(state.sosActive);
                    if (state.isRecording) setIsRecording(true);
                } catch (e) {
                    console.error("Initial state sync failed:", e);
                }

                await persistTrackingState({
                    userId: user.id,
                    sosActive: sosActiveRef.current,
                    lastGeo6: lastGeo6Ref.current,
                    lastGeo8: lastGeo8Ref.current,
                    blocks: blocksRef.current,
                });
                await startBackgroundService();
                await showPersistentNotification(sosActiveRef.current);
            } catch (error) {
                console.error("Error starting location tracking:", error);
            }
        }

        // Setup notification infrastructure (listener handled globally in root layout)
        startTracking();

        // Listen for real-time updates from notification actions while app is active
        const sosListener = DeviceEventEmitter.addListener('SOS_STATE_CHANGED', (newState) => {
            if (isMounted.current && sosActiveRef.current !== newState) {
                console.log(`📡 Real-time sync: SOS changed to ${newState}`);
                setSosActive(newState);
            }
        });

        const recordListener = DeviceEventEmitter.addListener('RECORDING_STATE_CHANGED', (newState) => {
            if (isMounted.current) {
                console.log(`📡 Real-time sync: Recording changed to ${newState}`);
                setIsRecording(newState);
            }
        });

        // Start listening to Hardware Volume Buttons for SOS Trigger
        startVolumeListener(async () => {
            if (isMounted.current && !sosActiveRef.current) {
                console.log("🔊 Volume SOS Triggered! Activating Shield...");
                setSosActive(true);

                // If user is available, force an immediate RTDB update just like the UI button does
                if (user?.id) {
                    try {
                        await update(ref(db, `users/${user.id}`), { sos_triggered: true });
                        if (lastGeo6Ref.current) {
                            await set(ref(db, `active_sos/${lastGeo6Ref.current}/${user.id}`), {
                                lat: lastCoordRef.current?.latitude || 0,
                                lng: lastCoordRef.current?.longitude || 0,
                                picture: user.picture || user.photoURL || 'https://i.pravatar.cc/100',
                                timestamp: Date.now(),
                            });
                        }
                    } catch (e) {
                        console.error("Failed to broadcast Volume SOS to RTDB:", e);
                    }
                }
            }
        });

        return () => {
            isMounted.current = false;
            if (locationSubRef.current) {
                locationSubRef.current.remove();
            }
            sosListener.remove();
            recordListener.remove();
            stopVolumeListener();
        };
    }, []);

    // AppState listener: foreground ↔️ background transitions
    useEffect(() => {
        const handleAppStateChange = async (nextAppState) => {
            if (!user || isTransitioningRef.current) return;

            const prevState = appStateRef.current;
            appStateRef.current = nextAppState; // Update immediately

            // App going to BACKGROUND
            if (prevState === 'active' && nextAppState.match(/inactive|background/)) {
                isTransitioningRef.current = true;
                console.log('📱 Transitioning to background tray');
                isInBackground.current = true;

                // We keep the background service running (it was started in foreground)
                // Just ensure notification is synced
                await showPersistentNotification(sosActiveRef.current);
                isTransitioningRef.current = false;
            }

            // App coming back to FOREGROUND
            if (prevState.match(/inactive|background/) && nextAppState === 'active') {
                isTransitioningRef.current = true;
                console.log('📱 App returning to foreground');
                isInBackground.current = false;

                // Sync states that might have changed in background notification
                try {
                    const state = await getPersistedState();
                    if (sosActiveRef.current !== state.sosActive) {
                        setSosActive(state.sosActive);
                    }
                    setIsRecording(state.isRecording);
                } catch (e) {
                    console.error("Failed to sync background state on foreground return:", e);
                }

                // We keep the background service running, but we might want to refresh the foreground watcher 
                // if it was killed by the OS (though watchPositionAsync usually persists)
                isTransitioningRef.current = false;
            }
        };

        const subscription = AppState.addEventListener('change', handleAppStateChange);
        return () => subscription.remove();
    }, [user]); // Removed sosActive from dependencies to prevent listener re-registration
    // 2. Main Logic Loop (Runs on every step)
    const handleLocationWorker = async (newCoords) => {
        isProcessingRef.current = true;
        let currentGeohash6 = null;
        let currentGeohash8 = null;

        try {
            setCurrentLocation(newCoords);
            if (Platform.OS === 'android') {
                if (animatedLocRef.current) {
                    animatedLocRef.current.timing({
                        latitude: newCoords.latitude,
                        longitude: newCoords.longitude,
                        duration: 1500,
                        useNativeDriver: false
                    }).start();
                }
            }

            if (mapRef.current) {
                mapRef.current.animateCamera({
                    center: {
                        latitude: newCoords.latitude,
                        longitude: newCoords.longitude,
                    },
                    zoom: 17,
                    pitch: 50, // Angled 3D downward view (Navigation layout)
                }, { duration: 1500 });
            }
            const { latitude: lat, longitude: lng } = newCoords;
            currentGeohash6 = ngeohash.encode(lat, lng, 6);
            currentGeohash8 = ngeohash.encode(lat, lng, 8);
            if (user?.id) {
                update(ref(db, `users/${user.id}`), {
                    current_lat: lat,
                    current_lng: lng,
                    current_geohash_6: currentGeohash6,
                    current_geohash_8: currentGeohash8,
                    sos_triggered: sosActive,
                    safe_walk_streak: user.safe_walk_streak,
                    false_sos_count: user.false_sos_count,
                    trust_score: user.trust_score,
                    is_verified: user.is_verified,
                }).catch(e => console.error("Error updating users geo footprint", e));
            }

            // Update local state for safety score hook
            if (currentGeohash8 && currentGeohash8 !== currentGeo8) {
                setCurrentGeo8(currentGeohash8);
            }

            // B. STATIONARY TO MOVING HANDOFF
            if (modeRef.current === 'STATIONARY') {
                // Safety: ensure anchor is set
                if (!anchorRef.current) {
                    anchorRef.current = newCoords;
                }
                const distanceWalked = calculateDistance(
                    anchorRef.current.latitude, anchorRef.current.longitude,
                    lat, lng
                );

                if (distanceWalked >= DISTANCE_THRESHOLD) {
                    // We broke the 15m threshold! Calculate starting bearing.
                    const startBearing = calculateBearing(
                        anchorRef.current.latitude, anchorRef.current.longitude,
                        lat, lng
                    );
                    bearingRef.current = startBearing;

                    // Fetch the forward path 
                    const newPath = getForwardBlocks(lat, lng, startBearing, 5);

                    console.log(`Switching to MOVING. Dropping 50m radius, tracking forward.`, newPath);

                    // Unload the old massive grid, load the 5 specific path blocks
                    removeFromRTDB(blocksRef.current, user.id);
                    addToRTDB(newPath, user.id);

                    blocksRef.current = newPath;
                    setTrackingMode('MOVING');
                    modeRef.current = 'MOVING';
                }
            }
            // C. MOVING SLIDING WINDOW
            else if (modeRef.current === 'MOVING') {
                // Safety: ensure lastCoord is set
                if (!lastCoordRef.current) {
                    lastCoordRef.current = newCoords;
                }
                const stepDistance = calculateDistance(
                    lastCoordRef.current.latitude, lastCoordRef.current.longitude,
                    lat, lng
                );

                // Only update our bearing heavily if we've taken a distinct step to prevent jitter
                if (stepDistance > 2) {
                    bearingRef.current = calculateBearing(
                        lastCoordRef.current.latitude, lastCoordRef.current.longitude,
                        lat, lng
                    );
                }
                const evalResult = evaluateSlidingWindow(
                    currentGeohash8,
                    blocksRef.current,
                    lat,
                    lng,
                    bearingRef.current
                );

                if (evalResult.status !== 'ON_TRACK') {
                    console.log(`Window Action Triggered: ${evalResult.status}`);
                    if (evalResult.toRemove.length > 0) {
                        removeFromRTDB(evalResult.toRemove, user.id);
                    }
                    if (evalResult.toAdd.length > 0) {
                        addToRTDB(evalResult.toAdd, user.id);
                    }

                    // Sync local state
                    blocksRef.current = evalResult.newWindow;
                }
            }

            // D. SOS STATE TRACKING EDGE CASES
            if (sosActive) {
                // Case 1 & 2: User stepped into a NEW geo8 block while SOS is active
                // Apply Reverse Gaussian impact to the new block using trust score
                if (currentGeohash8 !== lastGeo8Ref.current) {
                    const userTrustScore = user.trust_score ?? 5.0;
                    const blockRef = ref(db, `blocks/${currentGeohash8}`);
                    runTransaction(blockRef, (currentBlock) => {
                        if (currentBlock && currentBlock.block_state) {
                            const metrics = currentBlock.block_state.safety_metrics || {};
                            const { newWeightedImpact, newCurrentScore } = computeBlockSafetyImpact(
                                metrics.weighted_sos_impact || 0,
                                userTrustScore,
                                metrics.last_updated || null
                            );
                            currentBlock.block_state.sos_count = (currentBlock.block_state.sos_count || 0) + 1;
                            currentBlock.block_state.safety_metrics = {
                                ...metrics,
                                weighted_sos_impact: newWeightedImpact,
                                current_score: newCurrentScore,
                                last_updated: Date.now(),
                            };
                        }
                        return currentBlock;
                    }).catch(e => console.error("Failed to apply block safety impact on move", e));
                }

                // Case 3: Geo6 Broadcasting Updates (Update active_sos)
                if (currentGeohash6 !== lastGeo6Ref.current) {
                    if (lastGeo6Ref.current) {
                        // Remove from old geo6
                        remove(ref(db, `active_sos/${lastGeo6Ref.current}/${user.id}`))
                            .catch(e => console.error("Failed to remove old SOS broadast", e));
                    }

                    // Add to new geo6
                    set(ref(db, `active_sos/${currentGeohash6}/${user.id}`), {
                        lat: lat,
                        lng: lng,
                        picture: user.picture || user.photoURL || 'https://i.pravatar.cc/100',
                        timestamp: Date.now()
                    }).catch(e => console.error("Failed to add new SOS broadcast", e));
                }
            }

        } catch (error) {
            console.error("Error in location loop worker:", error);
        } finally {
            isProcessingRef.current = false;
        }

        if (currentGeohash8) lastGeo8Ref.current = currentGeohash8;
        if (currentGeohash6) lastGeo6Ref.current = currentGeohash6;
        lastCoordRef.current = newCoords;

        // Sync with background task state
        if (user?.id) {
            persistTrackingState({
                userId: user.id,
                sosActive: sosActiveRef.current,
                lastGeo6: lastGeo6Ref.current,
                lastGeo8: lastGeo8Ref.current,
                blocks: blocksRef.current,
            });
        }
    };
    // 4. SOS STATE TRACKING EFFECT: Handle turn-on (boost block) and turn-off (show modal)
    useEffect(() => {
        if (!user || !lastGeo6Ref.current) return;

        if (sosActive) {
            // ── SOS ACTIVATED ──
            sosWasTriggeredRef.current = true;

            // 1. Update user doc in RTDB
            update(ref(db, `users/${user.id}`), {
                sos_triggered: true
            }).catch(e => console.error("Failed to set user sos true", e));

            // 2. Apply Reverse Gaussian block safety impact using trust score
            if (lastGeo8Ref.current) {
                const userTrustScore = user.trust_score ?? 5.0;
                const blockRef = ref(db, `blocks/${lastGeo8Ref.current}`);

                runTransaction(blockRef, (currentBlock) => {
                    if (currentBlock && currentBlock.block_state) {
                        const metrics = currentBlock.block_state.safety_metrics || {};
                        const { newWeightedImpact, newCurrentScore } = computeBlockSafetyImpact(
                            metrics.weighted_sos_impact || 0,
                            userTrustScore,
                            metrics.last_updated || null
                        );
                        currentBlock.block_state.sos_count = (currentBlock.block_state.sos_count || 0) + 1;
                        currentBlock.block_state.safety_metrics = {
                            ...metrics,
                            weighted_sos_impact: newWeightedImpact,
                            current_score: newCurrentScore,
                            last_updated: Date.now(),
                        };
                    }
                    return currentBlock;
                }).catch(e => console.error("Failed to apply block safety impact", e));
            }

            // 3. Immediately broadcast to nearby threats channel
            if (currentLocation) {
                set(ref(db, `active_sos/${lastGeo6Ref.current}/${user.id}`), {
                    lat: currentLocation.latitude,
                    lng: currentLocation.longitude,
                    picture: user.picture || user.photoURL || 'https://i.pravatar.cc/100',
                    timestamp: Date.now()
                }).catch(e => console.error("Failed to start SOS broadcast", e));
            }
        } else {
            // ── SOS DEACTIVATED ──
            // 1. Erase broadcast
            remove(ref(db, `active_sos/${lastGeo6Ref.current}/${user.id}`))
                .catch(e => console.error("Failed to clean up SOS broadcast", e));

            // 2. Update user doc
            update(ref(db, `users/${user.id}`), {
                sos_triggered: false
            }).catch(e => console.error("Failed to set user sos false", e));

            // 3. Show the resolution modal (only if SOS was actually triggered in this session)
            if (sosWasTriggeredRef.current) {
                setShowResolutionModal(true);
            }
        }

        // Sync with background task
        persistTrackingState({
            userId: user.id,
            sosActive: sosActive,
            lastGeo6: lastGeo6Ref.current,
            lastGeo8: lastGeo8Ref.current,
            blocks: blocksRef.current,
        });
        showPersistentNotification(sosActive);
    }, [sosActive]);

    // 3. LISTEN FOR NEARBY THREATS / SOS GHOSTS
    useEffect(() => {
        if (!currentLocation || !user) return;
        const currentGeo6 = ngeohash.encode(currentLocation.latitude, currentLocation.longitude, 6);

        // Listen to active_sos inside the current geo6 region
        const nearbySosRef = ref(db, `active_sos/${currentGeo6}`);

        const listener = onValue(nearbySosRef, (snapshot) => {
            if (!snapshot.exists()) {
                setNearbyThreats([]);
                return;
            }

            const threats = [];
            snapshot.forEach((child) => {
                const threatData = child.val();
                const threatUserId = child.key;

                // Don't show ourselves as a threat
                if (threatUserId === user.id) return;

                const dist = calculateDistance(
                    currentLocation.latitude, currentLocation.longitude,
                    threatData.lat, threatData.lng
                );

                // Show women triggering SOS within a 2.5km vicinity locally
                if (dist <= 2500) {
                    threats.push({
                        id: threatUserId,
                        lat: threatData.lat,
                        lng: threatData.lng,
                        picture: threatData.picture,
                        distance: Math.round(dist)
                    });
                }
            });
            setNearbyThreats(threats);
        });

        return () => off(nearbySosRef, 'value', listener);
    }, [currentLocation, user]);

    // RENDER STATES
    if (!currentLocation) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#ffffff" />
                <Text style={styles.loadingText}>Establishing Identity Shield...</Text>
            </View>
        );
    }

    return (
        <View style={styles.mainContainer}>
            <MapView
                ref={mapRef}
                provider={PROVIDER_GOOGLE}
                style={{ flex: 1, width: '100%', height: '100%' }}
                showsUserLocation={true}
                showsMyLocationButton={false}
                showsCompass={false}
                showsUserHeadingIndicator={true}
                initialRegion={{
                    latitude: currentLocation.latitude,
                    longitude: currentLocation.longitude,
                    latitudeDelta: 0.005,
                    longitudeDelta: 0.005,
                }}
                customMapStyle={[
                    { elementType: "geometry", stylers: [{ color: "#242f3e" }] },
                    { elementType: "labels.text.stroke", stylers: [{ color: "#242f3e" }] },
                    { elementType: "labels.text.fill", stylers: [{ color: "#746855" }] },
                    {
                        featureType: "administrative.locality",
                        elementType: "labels.text.fill",
                        stylers: [{ color: "#d59563" }],
                    },
                    {
                        featureType: "poi",
                        elementType: "labels.text.fill",
                        stylers: [{ color: "#d59563" }],
                    },
                    {
                        featureType: "road",
                        elementType: "geometry",
                        stylers: [{ color: "#38414e" }],
                    },
                    {
                        featureType: "road",
                        elementType: "geometry.stroke",
                        stylers: [{ color: "#212a37" }],
                    },
                    {
                        featureType: "road.highway",
                        elementType: "geometry",
                        stylers: [{ color: "#746855" }],
                    },
                    {
                        featureType: "road.highway",
                        elementType: "geometry.stroke",
                        stylers: [{ color: "#1f2835" }],
                    },
                    {
                        featureType: "water",
                        elementType: "geometry",
                        stylers: [{ color: "#17263c" }],
                    },
                    {
                        featureType: "water",
                        elementType: "labels.text.fill",
                        stylers: [{ color: "#515c6d" }],
                    },
                    {
                        featureType: "water",
                        elementType: "labels.text.stroke",
                        stylers: [{ color: "#17263c" }],
                    },
                ]}
            >
                {/* 1. CURRENT USER MARKER - Handled natively by Google Maps via showsUserLocation={true} on MapView */}

                {/* 2. SOS GHOST NEARBY MARKERS (Styled as solid red alerting dots) */}
                {nearbyThreats.map((threat) => (
                    <Marker
                        key={threat.id}
                        coordinate={{ latitude: threat.lat, longitude: threat.lng }}
                        anchor={{ x: 0.5, y: 0.5 }}
                        tracksViewChanges={true}
                    >
                        <View style={styles.sosMarkerContainer}>
                            {/* Blinking Red Ring Effect representing an active SOS user */}
                            <View style={styles.sosMarkerRing}>
                                {/* The solid red inner dot with white border */}
                                <View style={styles.sosMarkerDot} />
                            </View>
                            <View style={styles.sosMarkerLabel}>
                                <Text style={styles.sosMarkerLabelText}>SOS</Text>
                            </View>
                        </View>
                    </Marker>
                ))}

            </MapView>

            {/* SOS ALERT BANNER — slides in from top when nearby SOS detected */}
            {showSOSBanner && focusedThreat && (
                <Animated.View
                    style={[
                        {
                            position: 'absolute',
                            top: 130, // below the upper HUD row
                            left: 16,
                            right: 16,
                            zIndex: 100,
                            transform: [{ translateY: bannerSlideAnim }],
                        }
                    ]}
                >
                    <TouchableOpacity
                        activeOpacity={0.85}
                        onPress={() => {
                            if (mapRef.current && focusedThreat) {
                                mapRef.current.animateCamera({
                                    center: { latitude: focusedThreat.lat, longitude: focusedThreat.lng },
                                    zoom: 18,
                                    pitch: 45,
                                }, { duration: 900 });
                            }
                        }}
                        style={{
                            backgroundColor: 'rgba(127, 29, 29, 0.92)',
                            borderWidth: 1,
                            borderColor: 'rgba(239, 68, 68, 0.6)',
                            borderRadius: 16,
                            paddingHorizontal: 16,
                            paddingVertical: 12,
                            flexDirection: 'row',
                            alignItems: 'center',
                            shadowColor: '#ef4444',
                            shadowOffset: { width: 0, height: 4 },
                            shadowOpacity: 0.4,
                            shadowRadius: 12,
                            elevation: 12,
                        }}
                    >
                        {/* Pulsing red dot */}
                        <View style={{
                            width: 36, height: 36, borderRadius: 18,
                            backgroundColor: 'rgba(239,68,68,0.25)',
                            alignItems: 'center', justifyContent: 'center',
                            marginRight: 12,
                        }}>
                            <View style={{
                                width: 14, height: 14, borderRadius: 7,
                                backgroundColor: '#ef4444',
                                borderWidth: 2, borderColor: '#fff',
                            }} />
                        </View>

                        {/* Text block */}
                        <View style={{ flex: 1 }}>
                            <Text style={{ color: '#fca5a5', fontSize: 11, fontWeight: '700', letterSpacing: 1.5, textTransform: 'uppercase' }}>
                                SOS Alert Nearby
                            </Text>
                            <Text style={{ color: '#ffffff', fontSize: 14, fontWeight: '800', marginTop: 2 }}>
                                {focusedThreat.distance < 1000
                                    ? `~${focusedThreat.distance}m away`
                                    : `~${(focusedThreat.distance / 1000).toFixed(1)}km away`
                                }
                            </Text>
                            <Text style={{ color: '#fca5a599', fontSize: 11, marginTop: 1 }}>Tap to locate on map</Text>
                        </View>

                        {/* Dismiss X */}
                        <TouchableOpacity
                            onPress={() => {
                                Animated.timing(bannerSlideAnim, {
                                    toValue: -120,
                                    duration: 250,
                                    useNativeDriver: true,
                                }).start(() => setShowSOSBanner(false));
                            }}
                            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                            style={{
                                width: 28, height: 28, borderRadius: 14,
                                backgroundColor: 'rgba(255,255,255,0.1)',
                                alignItems: 'center', justifyContent: 'center',
                                marginLeft: 8,
                            }}
                        >
                            <Text style={{ color: '#ffffff', fontSize: 14, fontWeight: '800', lineHeight: 16 }}>✕</Text>
                        </TouchableOpacity>
                    </TouchableOpacity>
                </Animated.View>
            )}

            {/* UPPER HUD */}
            <View style={styles.upperHud}>

                {/* Back Button */}
                <TouchableOpacity
                    onPress={handleBackPress}
                    activeOpacity={0.8}
                    style={styles.backButton}
                >
                    <ArrowLeft size={22} color="#ffffff" />
                </TouchableOpacity>

                {/* Status Indicator (Sleek Pill) */}
                <View style={styles.statusPill}>
                    <Shield size={16} color={trackingMode === 'MOVING' ? '#3b82f6' : '#22c55e'} style={{ marginRight: 8 }} />
                    <Text style={styles.statusText}>
                        {trackingMode === 'STATIONARY' ? 'Securing Perimeter' : 'Shield Active'}
                    </Text>
                </View>

                {/* Safety Score Component */}
                <View
                    style={[styles.safetyScorePill, { borderColor: `${getScoreColor(safetyScore)}44`, backgroundColor: `${getScoreColor(safetyScore)}11` }]}
                >
                    <View
                        style={[styles.safetyDot, { backgroundColor: getScoreColor(safetyScore) }]}
                    />
                    <View>
                        <Text style={styles.safetyLabel}>Safety</Text>
                        <Text style={[styles.safetyValue, { color: getScoreColor(safetyScore) }]}>
                            {safetyScore.toFixed(1)}
                        </Text>
                    </View>
                </View>

                {/* Threat Banner / Invisible Spacer */}
                {nearbyThreats.length > 0 ? (
                    <View style={styles.threatBadge}>
                        <AlertTriangle size={16} color="#ef4444" style={{ marginRight: 6 }} />
                        <Text style={styles.threatBadgeText}>{nearbyThreats.length}</Text>
                    </View>
                ) : (
                    <View style={styles.spacer} />
                )}
            </View>

            {/* Recalibrate / Compass Button (Bottom Right) */}
            <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => {
                    if (mapRef.current && currentLocation) {
                        mapRef.current.animateCamera({
                            center: { latitude: currentLocation.latitude, longitude: currentLocation.longitude },
                            zoom: 17,
                            pitch: 50,
                            heading: 0
                        }, { duration: 1000 });
                    }
                }}
                style={styles.compassButton}
            >
                <Compass size={24} color="#3b82f6" />
            </TouchableOpacity>

            {/* ACTION BOTTOM BAR */}
            <SOSBottomBar
                sosActive={sosActive}
                onToggleSOS={setSosActive}
                currentLocation={currentLocation}
                isRecordingExternal={isRecording}
                onToggleRecordingExternal={setIsRecording}
            />

            {/* SOS RESOLUTION MODAL */}
            <SOSResolutionModal
                visible={showResolutionModal}
                onOutcome={async (outcome) => {
                    setShowResolutionModal(false);
                    await handleSOSResolution(outcome);
                    await flushTrustScoreToServer();
                }}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    loadingContainer: {
        flex: 1,
        backgroundColor: '#09090b',
        alignItems: 'center',
        justifyContent: 'center',
    },
    loadingText: {
        color: '#a1a1aa',
        marginTop: 16,
        fontWeight: '500',
    },
    mainContainer: {
        flex: 1,
        backgroundColor: '#000000',
    },
    upperHud: {
        position: 'absolute',
        top: 64,
        left: 16,
        right: 16,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        zIndex: 50,
        paddingHorizontal: 4,
    },
    backButton: {
        backgroundColor: 'rgba(24, 24, 27, 0.95)',
        borderWidth: 1,
        borderColor: '#27272a',
        height: 48,
        width: 48,
        borderRadius: 24,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 10,
    },
    statusPill: {
        backgroundColor: 'rgba(24, 24, 27, 0.95)',
        borderWidth: 1,
        borderColor: '#27272a',
        borderRadius: 9999,
        paddingHorizontal: 16,
        paddingVertical: 8,
        flexDirection: 'row',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 10,
        marginHorizontal: 12,
        flex: 1,
        justifyContent: 'center',
        maxWidth: 220,
    },
    statusText: {
        color: '#ffffff',
        fontWeight: '700',
        fontSize: 14,
        letterSpacing: 0.5,
    },
    safetyScorePill: {
        borderWidth: 1,
        borderRadius: 9999,
        paddingHorizontal: 12,
        paddingVertical: 6,
        flexDirection: 'row',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
        elevation: 6,
        marginHorizontal: 4,
    },
    safetyDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        marginRight: 8,
    },
    safetyLabel: {
        color: '#a1a1aa',
        fontSize: 8,
        fontWeight: '700',
        textTransform: 'uppercase',
        letterSpacing: 1.5,
    },
    safetyValue: {
        fontSize: 14,
        fontWeight: '900',
        letterSpacing: -0.5,
    },
    threatBadge: {
        backgroundColor: 'rgba(69, 10, 10, 0.9)',
        borderWidth: 1,
        borderColor: 'rgba(239, 68, 68, 0.5)',
        borderRadius: 9999,
        paddingHorizontal: 12,
        paddingVertical: 8,
        flexDirection: 'row',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
        elevation: 6,
    },
    threatBadgeText: {
        color: '#f87171',
        fontSize: 12,
        fontWeight: '700',
        letterSpacing: 1,
    },
    spacer: {
        width: 48,
        height: 48,
    },
    compassButton: {
        position: 'absolute',
        bottom: 160,
        right: 16,
        backgroundColor: 'rgba(24, 24, 27, 0.9)',
        borderWidth: 1,
        borderColor: 'rgba(63, 63, 70, 0.5)',
        width: 48,
        height: 48,
        borderRadius: 24,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
        elevation: 6,
        zIndex: 50,
    },
    // SOS Ghost Marker styles — use fixed dp values on both platforms.
    // react-native-maps handles pixel density internally when snapshotting custom Views.
    sosMarkerContainer: {
        width: 70,
        height: 84,
        alignItems: 'center',
        justifyContent: 'flex-start',
        paddingTop: 4,
    },
    sosMarkerRing: {
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: 'rgba(239, 68, 68, 0.25)',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 2,
        borderColor: 'rgba(239, 68, 68, 0.4)',
    },
    sosMarkerDot: {
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: '#ef4444',
        borderColor: '#ffffff',
        borderWidth: 3,
        elevation: 4,
        shadowColor: '#ef4444',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.5,
        shadowRadius: 6,
    },
    sosMarkerLabel: {
        backgroundColor: '#dc2626',
        borderRadius: 6,
        paddingHorizontal: 10,
        paddingVertical: 3,
        marginTop: 4,
        borderWidth: 1.5,
        borderColor: '#f87171',
        elevation: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
    },
    sosMarkerLabelText: {
        fontSize: 10,
        color: '#ffffff',
        fontWeight: 'bold',
        letterSpacing: 1.5,
        textTransform: 'uppercase',
    },
});