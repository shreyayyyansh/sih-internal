import * as Location from 'expo-location';
import { endAt, onValue, orderByKey, query, ref, startAt, update } from 'firebase/database';
import { AlertTriangle, ArrowLeft, Compass, Shield } from 'lucide-react-native';
import ngeohash from 'ngeohash';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Animated, AppState, DeviceEventEmitter, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import MapView, { AnimatedRegion, Marker, PROVIDER_GOOGLE } from 'react-native-maps';

import { db } from '../../../../lib/firebase';
import { useAuthStore } from '../../../../store/useAuthStore';
import SOSBottomBar from './_components/SOSBottomBar';
import SOSResolutionModal from './_components/SOSResolutionModal';
import { getPersistedState, persistTrackingState, requestBackgroundLocationPermissions, startBackgroundService, stopBackgroundService } from './_utils/backgroundService';
import { createLocationFilter } from './_utils/locationFilter';
import { calculateBearing, calculateDistance } from './_utils/locationMath';
import { dismissPersistentNotification, showPersistentNotification } from './_utils/notificationActions';
import { addToRTDB } from './_utils/Rtdbadd';
import { removeFromRTDB } from './_utils/Rtdbdel';
import { broadcastSosLocation, clearSosBroadcast } from './_utils/sosBroadcast';
import { endSosSession, reportSosEvent, resolveSosEvent } from './_utils/sosEvents';
import { getInitialStationaryBlocks } from './_utils/stationaryManager';
import { useGracefulExit } from './_utils/useGracefulExit';
import { useSafetyScore } from './_utils/useSafetyScore';
import { useTrustScore } from './_utils/useTrustScore';
import { startVolumeListener, stopVolumeListener } from './_utils/volumeTrigger';
import { evaluateSlidingWindow, getForwardBlocks } from './_utils/windowManager';

const DISTANCE_THRESHOLD = 15;
const NEARBY_SOS_RADIUS_M = 2500;
const CAMERA_FOLLOW_INTERVAL_MS = 3000;
const CAMERA_ANIMATION_MS = 800;         // shorter than the follow interval so animations never chain
const STATE_UPDATE_MIN_MOVE_M = 3;       // re-render only for real movement
const BEARING_MIN_DISPLACEMENT_M = 10;   // two fixes 2 m apart are inside GPS noise
const HEADING_MIN_SPEED_MPS = 0.8;       // below this, coords.heading is unreliable
const GEO8_SWITCH_CONFIRMATIONS = 2;     // hysteresis for the displayed safety cell
const AHEAD_BLOCKS = 3;                  // 3 × 30 m ≈ the next 100 m

// Hoisted so MapView doesn't get a new style array on every render
const MAP_STYLE = [
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
];

/**
 * Remote SOS marker. Glides to each new broadcast position instead of jumping, and only
 * repaints its custom view for the first moment after mounting.
 */
function SOSMarker({ threat }) {
    const coordinate = useRef(new AnimatedRegion({
        latitude: threat.lat,
        longitude: threat.lng,
        latitudeDelta: 0,
        longitudeDelta: 0,
    })).current;
    const [tracksViewChanges, setTracksViewChanges] = useState(true);

    useEffect(() => {
        coordinate.timing({
            latitude: threat.lat,
            longitude: threat.lng,
            duration: 1000,
            useNativeDriver: false,
        }).start();
    }, [threat.lat, threat.lng]);

    // Custom-view markers need one live render to be snapshotted; after that, stop repainting every frame
    useEffect(() => {
        const timer = setTimeout(() => setTracksViewChanges(false), 500);
        return () => clearTimeout(timer);
    }, []);

    return (
        <Marker.Animated
            coordinate={coordinate}
            anchor={{ x: 0.5, y: 0.5 }}
            tracksViewChanges={tracksViewChanges}
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
        </Marker.Animated>
    );
}

export default function SisterHoodMap() {
    const user = useAuthStore(state => state.user);
    const mapRef = useRef(null)
    const [currentLocation, setCurrentLocation] = useState(null)
    const [trackingMode, setTrackingMode] = useState('STATIONARY')
    const [sosActive, setSosActive] = useState(false)
    const [isRecording, setIsRecording] = useState(false);
    const [sosByArea, setSosByArea] = useState({}); // { geo5: { uid: active_sos entry } }
    const [currentGeo8, setCurrentGeo8] = useState(null);
    const [currentGeo6, setCurrentGeo6] = useState(null);
    const [isFollowing, setIsFollowing] = useState(true);

    // SOS Alert Banner state
    const [showSOSBanner, setShowSOSBanner] = useState(false);
    const bannerSlideAnim = useRef(new Animated.Value(-120)).current; // starts off-screen above

    // Nearby SOS users, deduped across cells, with distance from our (filtered) position
    const nearbyThreats = useMemo(() => {
        if (!currentLocation) return [];
        const byUser = {};
        Object.values(sosByArea).forEach(entries => {
            Object.entries(entries).forEach(([uid, data]) => {
                if (!Number.isFinite(data?.lat) || !Number.isFinite(data?.lng)) return;
                if (!byUser[uid] || (data.timestamp || 0) > (byUser[uid].timestamp || 0)) byUser[uid] = data;
            });
        });
        return Object.entries(byUser)
            .map(([uid, data]) => ({
                id: uid,
                lat: data.lat,
                lng: data.lng,
                picture: data.picture,
                timestamp: data.timestamp,
                distance: Math.round(calculateDistance(currentLocation.latitude, currentLocation.longitude, data.lat, data.lng)),
            }))
            .filter(t => t.distance <= NEARBY_SOS_RADIUS_M);
    }, [sosByArea, currentLocation]);

    const focusedThreat = useMemo(
        () => nearbyThreats.length ? nearbyThreats.reduce((a, b) => a.distance < b.distance ? a : b) : null,
        [nearbyThreats]
    );
    // Changes only when someone starts/stops an SOS, not when their position updates
    const threatIdsKey = useMemo(() => nearbyThreats.map(t => t.id).sort().join(','), [nearbyThreats]);


    // Trust Score lifecycle
    const { handleSOSResolution, handleSafeWalkExit, flushTrustScoreToServer } = useTrustScore();

    // SOS Resolution Modal state
    const [showResolutionModal, setShowResolutionModal] = useState(false);

    // Session ref: did the user trigger SOS at any point this session?
    const sosWasTriggeredRef = useRef(false);

    // React to nearby threats — show the banner when someone new starts an SOS, hide when none are left
    useEffect(() => {
        if (threatIdsKey) {
            setShowSOSBanner(true);
            Animated.spring(bannerSlideAnim, {
                toValue: 0,
                useNativeDriver: true,
                tension: 65,
                friction: 10,
            }).start();
        } else {
            // Slide out and clear
            Animated.timing(bannerSlideAnim, {
                toValue: -120,
                duration: 300,
                useNativeDriver: true,
            }).start(() => setShowSOSBanner(false));
        }
    }, [threatIdsKey]);

    const modeRef = useRef('STATIONARY')
    const blocksRef = useRef([])
    const anchorRef = useRef(null)
    const bearingRef = useRef(0)
    const bearingAnchorRef = useRef(null)
    const lastGeo8Ref = useRef(null);
    const lastGeo6Ref = useRef(null);

    // Location signal: raw latest fix (for SOS), filtered fix (for everything else)
    const filterRef = useRef(createLocationFilter());
    const lastRawFixRef = useRef(null);
    const currentLocationRef = useRef(null);
    const shownLocationRef = useRef(null); // last fix pushed to state

    // Camera follow + safety-cell hysteresis
    const isFollowingRef = useRef(true);
    const lastCameraAtRef = useRef(0);
    const displayedGeo8Ref = useRef(null);
    const geo8CandidateRef = useRef({ cell: null, count: 0 });
    const initialRegionRef = useRef(null);

    const userRef = useRef(user);
    useEffect(() => {
        userRef.current = user;
    }, [user]);

    // Forward cells for the "next 100 m" score while walking
    const aheadCells = useMemo(() => {
        if (!currentLocation || trackingMode !== 'MOVING') return [];
        return getForwardBlocks(currentLocation.latitude, currentLocation.longitude, bearingRef.current, AHEAD_BLOCKS).slice(1);
    }, [currentLocation, trackingMode]);

    // Safety Score logic
    const { safetyScore, bucket: safetyBucket, aheadScore, getScoreColor } = useSafetyScore(currentGeo8, aheadCells);
    const showAheadScore = aheadScore !== null && (safetyScore === null || aheadScore < safetyScore - 0.5);

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
                await flushTrustScoreToServer(user?.id);
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

                const initialRaw = { ...initialLoc.coords, timestamp: initialLoc.timestamp };
                lastRawFixRef.current = initialRaw;
                // Seed the filter even if this first fix is coarse; later fixes refine it
                const initialFix = filterRef.current(initialRaw, { force: true });
                const { latitude, longitude } = initialFix;

                initialRegionRef.current = {
                    latitude,
                    longitude,
                    latitudeDelta: 0.005,
                    longitudeDelta: 0.005,
                };
                currentLocationRef.current = initialFix;
                shownLocationRef.current = initialFix;
                setCurrentLocation(initialFix);

                anchorRef.current = initialFix;
                bearingAnchorRef.current = initialFix;
                const initialGeo6 = ngeohash.encode(latitude, longitude, 6);
                lastGeo6Ref.current = initialGeo6;
                setCurrentGeo6(initialGeo6);

                const startingBlocks = getInitialStationaryBlocks(latitude, longitude, 50);
                blocksRef.current = startingBlocks;
                console.log(`Initial Load: Monitoring ${startingBlocks.length} stationary blocks.`);
                await addToRTDB(startingBlocks, user.id);

                if (!isMounted.current) return;
                const sub = await Location.watchPositionAsync(
                    {
                        accuracy: Location.Accuracy.High,
                        timeInterval: 3000,
                        distanceInterval: 5,
                    },
                    (newLocation) => {
                        if (!isMounted.current) return;
                        // Single writer: once the app leaves the foreground, the background task owns location writes
                        if (AppState.currentState !== 'active') return;

                        const raw = { ...newLocation.coords, timestamp: newLocation.timestamp };
                        lastRawFixRef.current = raw;
                        const fix = filterRef.current(raw);
                        if (fix && !isProcessingRef.current) {
                            handleLocationWorker(fix);
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
                    lastLat: latitude,
                    lastLng: longitude,
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
                        const raw = lastRawFixRef.current;
                        if (lastGeo6Ref.current && raw) {
                            await broadcastSosLocation({
                                userId: user.id,
                                geo6: ngeohash.encode(raw.latitude, raw.longitude, 6),
                                latitude: raw.latitude,
                                longitude: raw.longitude,
                                accuracy: raw.accuracy,
                                picture: user.picture || user.photoURL || 'https://i.pravatar.cc/100',
                                force: true,
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
    // 2. Main Logic Loop (runs on every accepted, filtered fix)
    // Reads SOS/user state through refs: this function is captured once by watchPositionAsync,
    // so closed-over state would be stale forever.
    const handleLocationWorker = async (fix) => {
        isProcessingRef.current = true;
        let currentGeohash6 = null;
        let currentGeohash8 = null;
        const currentUser = userRef.current;

        try {
            const { latitude: lat, longitude: lng } = fix;
            currentLocationRef.current = fix;

            // Re-render only on real movement
            const lastShown = shownLocationRef.current;
            if (!lastShown || calculateDistance(lastShown.latitude, lastShown.longitude, lat, lng) > STATE_UPDATE_MIN_MOVE_M) {
                shownLocationRef.current = fix;
                setCurrentLocation(fix);
            }

            // Follow the user only while they haven't panned away, and never chain animations
            const now = Date.now();
            if (mapRef.current && isFollowingRef.current && now - lastCameraAtRef.current >= CAMERA_FOLLOW_INTERVAL_MS) {
                lastCameraAtRef.current = now;
                mapRef.current.animateCamera({
                    center: { latitude: lat, longitude: lng },
                    zoom: 17,
                    pitch: 50, // Angled 3D downward view (Navigation layout)
                }, { duration: CAMERA_ANIMATION_MS });
            }

            currentGeohash6 = ngeohash.encode(lat, lng, 6);
            currentGeohash8 = ngeohash.encode(lat, lng, 8);
            if (currentUser?.id) {
                update(ref(db, `users/${currentUser.id}`), {
                    current_lat: lat,
                    current_lng: lng,
                    current_geohash_6: currentGeohash6,
                    current_geohash_8: currentGeohash8,
                    sos_triggered: sosActiveRef.current,
                    safe_walk_streak: currentUser.safe_walk_streak,
                    false_sos_count: currentUser.false_sos_count,
                    trust_score: currentUser.trust_score,
                    is_verified: currentUser.is_verified,
                }).catch(e => console.error("Error updating users geo footprint", e));
            }

            // Safety cell with hysteresis: switch only after the new cell is seen on consecutive fixes,
            // so standing on a cell edge doesn't flip the score back and forth
            if (currentGeohash8 === displayedGeo8Ref.current) {
                geo8CandidateRef.current = { cell: null, count: 0 };
            } else {
                const candidate = geo8CandidateRef.current;
                const count = candidate.cell === currentGeohash8 ? candidate.count + 1 : 1;
                geo8CandidateRef.current = { cell: currentGeohash8, count };
                if (count >= GEO8_SWITCH_CONFIRMATIONS || !displayedGeo8Ref.current) {
                    displayedGeo8Ref.current = currentGeohash8;
                    geo8CandidateRef.current = { cell: null, count: 0 };
                    setCurrentGeo8(currentGeohash8);
                }
            }

            if (currentGeohash6 !== lastGeo6Ref.current) {
                setCurrentGeo6(currentGeohash6);
            }

            // B. STATIONARY TO MOVING HANDOFF
            if (modeRef.current === 'STATIONARY') {
                // Safety: ensure anchor is set
                if (!anchorRef.current) {
                    anchorRef.current = fix;
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
                    bearingAnchorRef.current = fix;

                    // Fetch the forward path 
                    const newPath = getForwardBlocks(lat, lng, startBearing, 5);

                    console.log(`Switching to MOVING. Dropping 50m radius, tracking forward.`, newPath);

                    // Unload the old massive grid, load the 5 specific path blocks
                    removeFromRTDB(blocksRef.current, currentUser.id);
                    addToRTDB(newPath, currentUser.id);

                    blocksRef.current = newPath;
                    setTrackingMode('MOVING');
                    modeRef.current = 'MOVING';
                }
            }
            // C. MOVING SLIDING WINDOW
            else if (modeRef.current === 'MOVING') {
                // Bearing: GPS course when actually moving, otherwise only from a displacement
                // clearly larger than GPS noise
                if (!bearingAnchorRef.current) {
                    bearingAnchorRef.current = fix;
                }
                const displacement = calculateDistance(
                    bearingAnchorRef.current.latitude, bearingAnchorRef.current.longitude,
                    lat, lng
                );
                if (fix.speed > HEADING_MIN_SPEED_MPS && fix.heading >= 0) {
                    bearingRef.current = fix.heading;
                } else if (displacement > BEARING_MIN_DISPLACEMENT_M) {
                    bearingRef.current = calculateBearing(
                        bearingAnchorRef.current.latitude, bearingAnchorRef.current.longitude,
                        lat, lng
                    );
                }
                if (displacement > BEARING_MIN_DISPLACEMENT_M) {
                    bearingAnchorRef.current = fix;
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
                        removeFromRTDB(evalResult.toRemove, currentUser.id);
                    }
                    if (evalResult.toAdd.length > 0) {
                        addToRTDB(evalResult.toAdd, currentUser.id);
                    }

                    // Sync local state
                    blocksRef.current = evalResult.newWindow;
                }
            }

            // D. SOS: keep the broadcast fresh (every 5 s / 10 m). Block scores are computed
            // offline on the server from sos_events, so nothing is written per cell here.
            if (sosActiveRef.current && currentUser?.id) {
                broadcastSosLocation({
                    userId: currentUser.id,
                    geo6: currentGeohash6,
                    latitude: lat,
                    longitude: lng,
                    accuracy: fix.accuracy,
                    heading: fix.speed > HEADING_MIN_SPEED_MPS ? fix.heading : bearingRef.current,
                    picture: currentUser.picture || currentUser.photoURL || 'https://i.pravatar.cc/100',
                });
            }

        } catch (error) {
            console.error("Error in location loop worker:", error);
        } finally {
            isProcessingRef.current = false;
        }

        if (currentGeohash8) lastGeo8Ref.current = currentGeohash8;
        if (currentGeohash6) lastGeo6Ref.current = currentGeohash6;

        // Sync with background task state
        if (currentUser?.id) {
            persistTrackingState({
                userId: currentUser.id,
                sosActive: sosActiveRef.current,
                lastGeo6: lastGeo6Ref.current,
                lastGeo8: lastGeo8Ref.current,
                blocks: blocksRef.current,
                lastLat: fix.latitude,
                lastLng: fix.longitude,
            });
        }
    };
    // 4. SOS STATE TRACKING EFFECT: Handle turn-on (log event + broadcast) and turn-off (show modal)
    useEffect(() => {
        if (!user || !lastGeo6Ref.current) return;

        if (sosActive) {
            // ── SOS ACTIVATED ──
            sosWasTriggeredRef.current = true;

            // 1. Update user doc in RTDB
            update(ref(db, `users/${user.id}`), {
                sos_triggered: true
            }).catch(e => console.error("Failed to set user sos true", e));

            // 2. Broadcast the latest raw fix immediately (filtering only applies to the continuous stream)
            const raw = lastRawFixRef.current || currentLocationRef.current;
            if (raw) {
                broadcastSosLocation({
                    userId: user.id,
                    geo6: ngeohash.encode(raw.latitude, raw.longitude, 6),
                    latitude: raw.latitude,
                    longitude: raw.longitude,
                    accuracy: raw.accuracy,
                    picture: user.picture || user.photoURL || 'https://i.pravatar.cc/100',
                    force: true,
                });

                // 3. Log one event for offline scoring (server dedupes repeats in the same session)
                reportSosEvent(raw.latitude, raw.longitude);
            }
        } else {
            // ── SOS DEACTIVATED ──
            // 1. Erase broadcast and close the event session
            clearSosBroadcast(user.id, lastGeo6Ref.current);
            endSosSession();

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
            lastLat: currentLocationRef.current?.latitude,
            lastLng: currentLocationRef.current?.longitude,
        });
        showPersistentNotification(sosActive);
    }, [sosActive]);

    // 3. LISTEN FOR NEARBY THREATS / SOS GHOSTS
    // Keyed on the geo5 area (~4.9 km), not on every GPS tick. active_sos is stored per geo6, so a
    // key-prefix query per geo5 (own + 8 neighbours) covers the full 2.5 km radius with no border
    // blind spots; the distance filter happens in memory (nearbyThreats).
    const currentGeo5 = currentGeo6 ? currentGeo6.slice(0, 5) : null;
    useEffect(() => {
        if (!currentGeo5 || !user?.id) return;
        const areas = [currentGeo5, ...ngeohash.neighbors(currentGeo5)];

        const unsubscribers = areas.map((geo5) => {
            const areaQuery = query(ref(db, 'active_sos'), orderByKey(), startAt(geo5), endAt(`${geo5}\uf8ff`));
            return onValue(areaQuery, (snapshot) => {
                const entries = {};
                snapshot.forEach((cell) => {
                    cell.forEach((child) => {
                        // Don't show ourselves as a threat
                        if (child.key !== user.id) entries[child.key] = child.val();
                    });
                });
                setSosByArea(prev => ({ ...prev, [geo5]: entries }));
            });
        });

        // Drop areas we no longer listen to
        setSosByArea(prev => Object.fromEntries(Object.entries(prev).filter(([k]) => areas.includes(k))));
        return () => unsubscribers.forEach(unsubscribe => unsubscribe());
    }, [currentGeo5, user?.id]);

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
                initialRegion={initialRegionRef.current}
                customMapStyle={MAP_STYLE}
                onPanDrag={() => {
                    // User took over the camera: stop auto-follow until they tap recenter
                    if (isFollowingRef.current) {
                        isFollowingRef.current = false;
                        setIsFollowing(false);
                    }
                }}
            >
                {/* 1. CURRENT USER MARKER - Handled natively by Google Maps via showsUserLocation={true} on MapView */}

                {/* 2. SOS GHOST NEARBY MARKERS (Styled as solid red alerting dots) */}
                {nearbyThreats.map((threat) => (
                    <SOSMarker key={threat.id} threat={threat} />
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
                                // Stop auto-follow, otherwise the camera snaps back to us within 3 s
                                isFollowingRef.current = false;
                                setIsFollowing(false);
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
                        <Text style={styles.safetyLabel}>{safetyScore === null ? 'No data' : 'Safety'}</Text>
                        <Text style={[styles.safetyValue, { color: getScoreColor(safetyScore) }]}>
                            {safetyScore === null ? '—' : safetyScore.toFixed(1)}
                        </Text>
                        {safetyBucket && (
                            <Text style={[styles.safetySubText, { color: getScoreColor(safetyBucket.score) }]}>
                                {safetyBucket.name} {safetyBucket.score.toFixed(1)}
                            </Text>
                        )}
                        {showAheadScore && (
                            <Text style={[styles.safetySubText, { color: getScoreColor(aheadScore) }]}>
                                ahead {aheadScore.toFixed(1)}
                            </Text>
                        )}
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
                    const loc = currentLocationRef.current;
                    isFollowingRef.current = true;
                    setIsFollowing(true);
                    if (mapRef.current && loc) {
                        lastCameraAtRef.current = Date.now();
                        mapRef.current.animateCamera({
                            center: { latitude: loc.latitude, longitude: loc.longitude },
                            zoom: 17,
                            pitch: 50,
                            heading: 0
                        }, { duration: CAMERA_ANIMATION_MS });
                    }
                }}
                style={styles.compassButton}
            >
                <Compass size={24} color={isFollowing ? '#3b82f6' : '#a1a1aa'} />
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
                    await resolveSosEvent(outcome);
                    await flushTrustScoreToServer(user?.id);
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
    safetySubText: {
        fontSize: 9,
        fontWeight: '700',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
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