import { VolumeManager } from 'react-native-volume-manager';
import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

let volumeListenerSubscription = null;
let clickCount = 0;
let lastClickTime = 0;
const CLICK_THRESHOLD_MS = 2000;
const REQUIRED_CLICKS = 3;

/**
 * Starts listening to hardware volume button press events (Foreground Only).
 * If the user changes the volume 3 times within 2 seconds, the onTrigger callback is fired.
 * 
 * @param {Function} onTrigger Callback to execute when SOS is triggered.
 */
export const startVolumeListener = (onTrigger) => {
    if (volumeListenerSubscription) {
        console.log('Volume listener already active.');
        return;
    }

    console.log('🔊 Starting foreground volume listener for SOS...');

    // Hide native volume UI for a smoother SOS experience (Optional)
    if (VolumeManager.showNativeVolumeUI) {
        VolumeManager.showNativeVolumeUI({ enabled: false });
    }

    volumeListenerSubscription = VolumeManager.addVolumeListener((result) => {
        const now = Date.now();

        // If the interval between clicks is small, increment count
        if (now - lastClickTime < CLICK_THRESHOLD_MS) {
            clickCount++;
        } else {
            clickCount = 1; // Restart sequence
        }

        lastClickTime = now;

        if (clickCount >= REQUIRED_CLICKS) {
            console.log('🚨 Hardware Volume SOS Triggered (Foreground)!');
            clickCount = 0; // Reset sequence

            // Provide immediate tactile feedback
            if (Platform.OS !== 'web') {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            }

            if (typeof onTrigger === 'function') {
                onTrigger();
            }
        }
    });
};

/**
 * Stops and cleans up the volume listener.
 */
export const stopVolumeListener = () => {
    if (volumeListenerSubscription) {
        console.log('🎧 Stopping hardware volume listener...');
        volumeListenerSubscription.remove();
        volumeListenerSubscription = null;

        // Restore native volume UI
        if (VolumeManager.showNativeVolumeUI) {
            VolumeManager.showNativeVolumeUI({ enabled: true });
        }
    }
};
