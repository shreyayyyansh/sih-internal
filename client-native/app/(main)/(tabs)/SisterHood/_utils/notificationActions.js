import * as Notifications from 'expo-notifications';
import { Linking, Platform, DeviceEventEmitter } from 'react-native';
import { ref, update } from 'firebase/database';
import { db } from '../../../../../lib/firebase';
import { performExitCleanup } from './useGracefulExit';
import { Audio } from 'expo-av';
import { stopBackgroundService, getPersistedState, updatePersistedKey } from './backgroundService';
import { broadcastSosLocation, clearSosBroadcast } from './sosBroadcast';
import { endSosSession, reportSosEvent } from './sosEvents';

let backgroundRecording = null;

const NOTIFICATION_CATEGORY = 'SISTERHOOD_CONTROLS';
const NOTIFICATION_ID = 'sisterhood-persistent';

/**
 * Register notification action buttons.
 * Must be called once (e.g., on app start or when entering SisterHood).
 */
export const setupNotificationCategory = async () => {
    await Notifications.setNotificationCategoryAsync(NOTIFICATION_CATEGORY, [
        {
            identifier: 'RECORD',
            buttonTitle: '🎙️ Record',
            options: { opensAppToForeground: false },
        },
        {
            identifier: 'SOS',
            buttonTitle: '🚨 SOS',
            options: { opensAppToForeground: false },
        },
        {
            identifier: 'CALL_112',
            buttonTitle: '📞 Call 112',
            options: { opensAppToForeground: true },
        },
        {
            identifier: 'EXIT',
            buttonTitle: '🚪 Exit',
            options: { opensAppToForeground: false },
        },
    ]);
};

/**
 * Handle notification action button presses.
 */
export const handleNotificationAction = async (response) => {
    const actionId = response.actionIdentifier;

    if (actionId === 'RECORD') {
        try {
            const state = await getPersistedState();
            if (backgroundRecording) {
                const uri = await stopBackgroundRecording();

                // Update notification back to normal
                await showPersistentNotification(state.sosActive);

                // Real-time UI Sync
                DeviceEventEmitter.emit('RECORDING_STATE_CHANGED', false);

                if (!state.userId || !state.lastGeo6 || !uri) {
                    console.warn("Background audio upload skipped: missing user, location, or audio URI.");
                    return;
                }

                // Upload logic (matching SOSBottomBar)
                const formData = new FormData();
                formData.append('audio', {
                    uri: Platform.OS === 'ios' ? uri.replace('file://', '') : uri,
                    type: 'audio/m4a',
                    name: 'bg_voice_note.m4a',
                });
                formData.append('userId', state.userId);
                formData.append('userName', 'User (Background)');
                formData.append('roomId', 'SISTERHOOD_NATIVE_SOS');

                // Get last known location for the recording
                let bgLat = 0;
                let bgLng = 0;
                try {
                    const Location = require('expo-location');
                    const lastLoc = await Location.getLastKnownPositionAsync();
                    if (lastLoc) {
                        bgLat = lastLoc.coords.latitude;
                        bgLng = lastLoc.coords.longitude;
                    }
                } catch (locErr) {
                    console.warn('Could not get location for background recording:', locErr);
                }
                formData.append('lat', bgLat);
                formData.append('lng', bgLng);

                console.log('Uploading background voice note...');
                fetch(`${process.env.EXPO_PUBLIC_API_URL}/api/voice/upload`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'multipart/form-data' },
                    body: formData,
                }).then(res => res.json())
                    .then(data => console.log("✅ Background Voice Upload Complete:", data.url))
                    .catch(err => console.error("❌ Background Voice Upload Failed:", err));

            } else {
                // Start recording
                await Audio.setAudioModeAsync({
                    allowsRecordingIOS: true,
                    playsInSilentModeIOS: true,
                });
                const { recording } = await Audio.Recording.createAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
                backgroundRecording = recording;
                await updatePersistedKey('IS_RECORDING', true);

                // Real-time UI Sync
                DeviceEventEmitter.emit('RECORDING_STATE_CHANGED', true);

                // Update notification body to show recording status
                await Notifications.scheduleNotificationAsync({
                    identifier: NOTIFICATION_ID,
                    content: {
                        title: '🛡️ Sisterhood Shield Active',
                        body: '🎙️ RECORDING VOICE NOTE... Tap buttons below to control.',
                        sticky: true,
                        autoDismiss: false,
                        categoryIdentifier: NOTIFICATION_CATEGORY,
                        shouldShowAlert: true,
                        shouldShowBanner: true,
                        shouldShowList: true,
                    },
                    trigger: null,
                });
                console.log('🎙️ Background recording started.');
            }
        } catch (e) {
            console.error('Failed to toggle background recording:', e);
        }
    }

    if (actionId === 'SOS') {
        const state = await getPersistedState();
        if (!state.userId) return;

        const newSosState = !state.sosActive;
        await updatePersistedKey('SOS_ACTIVE', newSosState);

        // Update RTDB immediately
        await update(ref(db, `users/${state.userId}`), { sos_triggered: newSosState });

        const hasPosition = Number.isFinite(state.lastLat) && Number.isFinite(state.lastLng);
        if (newSosState && state.lastGeo6 && hasPosition) {
            // Activate: broadcast the last persisted position right away (not 0,0)
            await broadcastSosLocation({
                userId: state.userId,
                geo6: state.lastGeo6,
                latitude: state.lastLat,
                longitude: state.lastLng,
                force: true,
            });
            reportSosEvent(state.lastLat, state.lastLng);
        } else if (!newSosState) {
            // Deactivate: remove SOS broadcast
            await clearSosBroadcast(state.userId, state.lastGeo6);
            await endSosSession();
        }

        // Update notification body to reflect new state
        await showPersistentNotification(newSosState);

        // Real-time UI Sync
        DeviceEventEmitter.emit('SOS_STATE_CHANGED', newSosState);

        console.log(`🚨 SOS toggled from notification: ${newSosState ? 'ON' : 'OFF'}`);
    }

    if (actionId === 'CALL_112') {
        Linking.openURL('tel:112').catch(e => console.error('Failed to dial 112:', e));
    }

    if (actionId === 'EXIT') {
        const state = await getPersistedState();

        // Perform RTDB cleanup
        await performExitCleanup({
            userId: state.userId,
            blocks: state.blocks,
            lastGeo6: state.lastGeo6,
            sosActive: state.sosActive,
        });

        // Stop the background service
        await stopBackgroundService();

        // Dismiss the persistent notification
        await Notifications.dismissNotificationAsync(NOTIFICATION_ID);

        console.log('🚪 Exit from notification: cleanup done, service stopped.');
    }
};

/**
 * Stop background recording (can be called from foreground too).
 */
export const stopBackgroundRecording = async () => {
    if (!backgroundRecording) return null;
    try {
        console.log('🎙️ Background recording stopping...');
        await backgroundRecording.stopAndUnloadAsync();
        const uri = backgroundRecording.getURI();
        backgroundRecording = null;
        await updatePersistedKey('IS_RECORDING', false);

        // Notify user/sync if needed, though this is usually called from actions
        return uri;
    } catch (e) {
        console.error('Failed to stop background recording:', e);
        return null;
    }
};

/**
 * Display a persistent notification with action buttons.
 */
export const showPersistentNotification = async (sosActive = false) => {
    await Notifications.scheduleNotificationAsync({
        identifier: NOTIFICATION_ID,
        content: {
            title: '🛡️ Sisterhood Shield Active',
            body: sosActive
                ? '🚨 SOS IS ACTIVE — Your location is being broadcast.'
                : 'Your location is being tracked for safety.',
            sticky: true,
            autoDismiss: false,
            categoryIdentifier: NOTIFICATION_CATEGORY,
            data: { type: 'sisterhood_controls' },
            // Fixing deprecation warnings
            shouldShowAlert: true, // backward compat
            shouldShowBanner: true,
            shouldShowList: true,
        },
        trigger: null, // Show immediately
    });
};

/**
 * Dismiss the persistent notification.
 */
export const dismissPersistentNotification = async () => {
    await Notifications.dismissNotificationAsync(NOTIFICATION_ID);
};

/**
 * Setup notification response listener (call once at app startup level).
 */
export const setupNotificationResponseListener = () => {
    return Notifications.addNotificationResponseReceivedListener(handleNotificationAction);
};
