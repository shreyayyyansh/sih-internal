import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import ngeohash from 'ngeohash';
import { ref, update } from 'firebase/database';
import { AppState } from 'react-native';
import { db } from '../../../../../lib/firebase';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createLocationFilter } from './locationFilter';
import { broadcastSosLocation } from './sosBroadcast';

export const BACKGROUND_LOCATION_TASK = 'SISTERHOOD_BACKGROUND_LOCATION';

// Keys for persisting state across background ↔ foreground
const STORAGE_KEYS = {
    USER_ID: 'bg_userId',
    SOS_ACTIVE: 'bg_sosActive',
    LAST_GEO6: 'bg_lastGeo6',
    LAST_GEO8: 'bg_lastGeo8',
    BLOCKS: 'bg_blocks',
    IS_RECORDING: 'bg_isRecording',
    LAST_LAT: 'bg_lastLat',
    LAST_LNG: 'bg_lastLng',
    SOS_EVENT_ID: 'bg_sosEventId',
    SOS_STARTED_AT: 'bg_sosStartedAt', // session id for event logging; cleared when SOS ends
    PENDING_SOS_EVENTS: 'bg_pendingSosEvents',
};

/**
 * Persist current tracking state so the background task can read it.
 * Called from SisterHoodMap before transitioning to background.
 */
export const persistTrackingState = async ({ userId, sosActive, lastGeo6, lastGeo8, blocks, lastLat, lastLng }) => {
    try {
        const entries = [
            [STORAGE_KEYS.USER_ID, userId || ''],
            [STORAGE_KEYS.SOS_ACTIVE, JSON.stringify(sosActive)],
            [STORAGE_KEYS.LAST_GEO6, lastGeo6 || ''],
            [STORAGE_KEYS.LAST_GEO8, lastGeo8 || ''],
            [STORAGE_KEYS.BLOCKS, JSON.stringify(blocks || [])],
            [STORAGE_KEYS.IS_RECORDING, JSON.stringify(false)], // Reset on manual persist (start)
        ];
        // Last known position, so a notification-triggered SOS can broadcast real coordinates
        if (Number.isFinite(lastLat) && Number.isFinite(lastLng)) {
            entries.push([STORAGE_KEYS.LAST_LAT, String(lastLat)], [STORAGE_KEYS.LAST_LNG, String(lastLng)]);
        }
        await AsyncStorage.multiSet(entries);
    } catch (e) {
        console.error('Failed to persist tracking state:', e);
    }
};

/**
 * Read persisted tracking state (used by background task and notification actions).
 */
export const getPersistedState = async () => {
    try {
        const results = await AsyncStorage.multiGet(Object.values(STORAGE_KEYS));
        const map = {};
        results.forEach(([key, value]) => { map[key] = value; });
        return {
            userId: map[STORAGE_KEYS.USER_ID] || null,
            sosActive: JSON.parse(map[STORAGE_KEYS.SOS_ACTIVE] || 'false'),
            lastGeo6: map[STORAGE_KEYS.LAST_GEO6] || null,
            lastGeo8: map[STORAGE_KEYS.LAST_GEO8] || null,
            blocks: JSON.parse(map[STORAGE_KEYS.BLOCKS] || '[]'),
            isRecording: JSON.parse(map[STORAGE_KEYS.IS_RECORDING] || 'false'),
            lastLat: map[STORAGE_KEYS.LAST_LAT] ? parseFloat(map[STORAGE_KEYS.LAST_LAT]) : null,
            lastLng: map[STORAGE_KEYS.LAST_LNG] ? parseFloat(map[STORAGE_KEYS.LAST_LNG]) : null,
            sosEventId: map[STORAGE_KEYS.SOS_EVENT_ID] || null,
            sosStartedAt: map[STORAGE_KEYS.SOS_STARTED_AT] ? parseInt(map[STORAGE_KEYS.SOS_STARTED_AT], 10) : null,
            pendingSosEvents: JSON.parse(map[STORAGE_KEYS.PENDING_SOS_EVENTS] || '[]'),
        };
    } catch (e) {
        console.error('Failed to read persisted state:', e);
        return { userId: null, sosActive: false, lastGeo6: null, lastGeo8: null, blocks: [], lastLat: null, lastLng: null, sosEventId: null, sosStartedAt: null, pendingSosEvents: [] };
    }
};

/**
 * Update a single persisted key (e.g., toggling SOS from notification).
 */
export const updatePersistedKey = async (key, value) => {
    try {
        const storageKey = STORAGE_KEYS[key];
        if (storageKey) {
            await AsyncStorage.setItem(storageKey, typeof value === 'string' ? value : JSON.stringify(value));
        }
    } catch (e) {
        console.error('Failed to update persisted key:', e);
    }
};

// Separate from the foreground filter: the two never run at the same time (see the AppState check below)
const backgroundFilter = createLocationFilter();

/**
 * Define the background location task at module scope (required by expo-task-manager).
 */
TaskManager.defineTask(BACKGROUND_LOCATION_TASK, async ({ data, error }) => {
    if (error) {
        console.error('Background location error:', error);
        return;
    }

    // Single writer: while the app is open, SisterHoodMap's foreground watcher owns users/{uid} and active_sos
    if (AppState.currentState === 'active') return;

    if (data) {
        const { locations } = data;
        const location = locations[0];
        if (!location) return;

        const fix = backgroundFilter({ ...location.coords, timestamp: location.timestamp });
        if (!fix) return;

        const { latitude, longitude } = fix;
        const state = await getPersistedState();
        if (!state.userId) return;

        const currentGeo6 = ngeohash.encode(latitude, longitude, 6);
        const currentGeo8 = ngeohash.encode(latitude, longitude, 8);

        // Update user location in RTDB
        try {
            await update(ref(db, `users/${state.userId}`), {
                current_lat: latitude,
                current_lng: longitude,
                current_geohash_6: currentGeo6,
                current_geohash_8: currentGeo8,
                sos_triggered: state.sosActive,
            });
        } catch (e) {
            console.error('Background RTDB user update failed:', e);
        }

        // Keep the SOS position fresh for people nearby (every 5 s / 10 m).
        // Block scores are no longer written here; the server computes them from sos_events.
        if (state.sosActive) {
            await broadcastSosLocation({
                userId: state.userId,
                geo6: currentGeo6,
                latitude,
                longitude,
                accuracy: fix.accuracy,
                heading: fix.speed > 0.8 ? fix.heading : null,
            });
        }

        // Persist updated geo references
        await AsyncStorage.multiSet([
            [STORAGE_KEYS.LAST_GEO6, currentGeo6],
            [STORAGE_KEYS.LAST_GEO8, currentGeo8],
            [STORAGE_KEYS.LAST_LAT, String(latitude)],
            [STORAGE_KEYS.LAST_LNG, String(longitude)],
        ]);
    }
});

/**
 * Start background location tracking with an Android foreground service.
 */
export const startBackgroundService = async () => {
    const isRegistered = await TaskManager.isTaskRegisteredAsync(BACKGROUND_LOCATION_TASK);
    if (isRegistered) {
        console.log('Background task already running.');
        return;
    }

    await Location.startLocationUpdatesAsync(BACKGROUND_LOCATION_TASK, {
        accuracy: Location.Accuracy.High,
        timeInterval: 3000,
        distanceInterval: 5,
        deferredUpdatesInterval: 3000,
        showsBackgroundLocationIndicator: true,
        foregroundService: {
            notificationTitle: '🛡️ Sisterhood Shield Active',
            notificationBody: 'Your location is being tracked for safety.',
            notificationColor: '#dc2626',
        },
    });

    console.log('✅ Background location service started.');
};

/**
 * Request background location permissions.
 * Must be called in foreground context (e.g., from SisterHoodMap).
 */
export const requestBackgroundLocationPermissions = async () => {
    const { status: fgStatus } = await Location.requestForegroundPermissionsAsync();
    if (fgStatus !== 'granted') {
        console.warn('Foreground location permission denied.');
        return false;
    }

    const { status: bgStatus } = await Location.requestBackgroundPermissionsAsync();
    if (bgStatus !== 'granted') {
        console.warn('Background location permission denied.');
        return false;
    }

    return true;
};

/**
 * Stop background location tracking.
 */
export const stopBackgroundService = async () => {
    const isRegistered = await TaskManager.isTaskRegisteredAsync(BACKGROUND_LOCATION_TASK);
    if (isRegistered) {
        await Location.stopLocationUpdatesAsync(BACKGROUND_LOCATION_TASK);
        console.log('⏹️ Background location service stopped.');
    }
};
