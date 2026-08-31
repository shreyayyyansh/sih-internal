import { Audio } from 'expo-av';
import * as Haptics from 'expo-haptics';
import { ExpoSpeechRecognitionModule, useSpeechRecognitionEvent } from 'expo-speech-recognition';
import { Mic, Phone, ShieldAlert, X } from 'lucide-react-native';
import { useEffect, useRef, useState } from 'react';
import { Alert, Animated, Linking, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useAuthStore } from '../../../../../store/useAuthStore';
import { stopBackgroundRecording } from '../_utils/notificationActions';
export default function SOSBottomBar({ sosActive, onToggleSOS, currentLocation, isRecordingExternal, onToggleRecordingExternal }) {
    const user = useAuthStore(state => state.user);
    const [recording, setRecording] = useState();
    const [isRecording, setIsRecording] = useState(false);
    const [countdown, setCountdown] = useState(null);
    const intervalRef = useRef(null);
    const [callCountdown, setCallCountdown] = useState(null);
    const callIntervalRef = useRef(null);
    const stopRecordingRef = useRef(null); // Ref for stopping from external
    const prevSosActiveRef = useRef(sosActive);

    // AI/Mic Mutually Exclusive State Management
    const isSisterHoodActive = useRef(true); // Should background listening run
    const wasSisterHoodPausedForRecording = useRef(false); // Did the user intentionally steal the mic?
    const startVoiceLoopTimeout = useRef(null);

    // Sync external recording state (from notification)
    useEffect(() => {
        if (isRecordingExternal !== undefined) {
            setIsRecording(isRecordingExternal);
        }
    }, [isRecordingExternal]);

    // Auto-start recording when SOS becomes active
    useEffect(() => {
        if (sosActive && !prevSosActiveRef.current) {
            if (!isRecording) {
                console.log('SOS Active: Auto-starting voice recording...');
                startRecording();
            }
        }
        prevSosActiveRef.current = sosActive;
    }, [sosActive, isRecording]);

    // Background Voice Trigger Loop: Setup listeners via hooks
    useSpeechRecognitionEvent("error", (e) => {
        if (e.error?.includes('no-speech') || e.error?.includes('no-match')) return;
        console.warn("Speech Recognition Error:", e);
    });

    useSpeechRecognitionEvent("end", async () => {
        // The Infinite Loop Logic: Reclaim the microphone automatically when speech ends natively
        // ONLY if the app SOS listener is active AND we didn't pause it for explicit expo-av usage
        if (isSisterHoodActive.current && !wasSisterHoodPausedForRecording.current) {
            try {
                await startVoiceLoop();
            } catch (e) {
                console.error("Failed to re-trigger Speech Recognition loop internally", e);
            }
        }
    });

    useSpeechRecognitionEvent("result", async (e) => {
        if (!e.results || e.results.length === 0) return;

        // Flatten the multi-dimensional results array and check for triggers
        // expo-speech-recognition on Android/iOS sometimes directly returns the transcript string on the first index
        const transcriptions = e.results.flatMap((result) => {
            if (typeof result === 'string') return [result.toLowerCase()];
            if (result.transcript) return [result.transcript.toLowerCase()];
            if (result.alternatives) return result.alternatives.map((alt) => alt.transcript.toLowerCase());
            return [];
        });
        const triggered = transcriptions.some((t) => t.includes('help') || t.includes('sos'));

        if (triggered && !isRecording) {
            console.log("🗣️ SOS Voice Command Detected! Triggering Emergency Sequence...");

            // 1. Immediately kill the Voice loop so it frees resources for the subsequent automation
            if (!wasSisterHoodPausedForRecording.current) {
                try {
                    await ExpoSpeechRecognitionModule.stop();
                } catch (err) {
                    console.log("Failed to stop Speech Recognition immediately", err);
                }
            }

            // 2. We don't want it to immediately restart the loop onEnd
            wasSisterHoodPausedForRecording.current = true;

            // 3. Fire the UI interaction (this will also chain into auto-recording via the SOS use-effect above)
            onToggleSOS(true);
            if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        }
    });

    // Background Voice Trigger Loop: Setup Mount/Unmount
    useEffect(() => {
        const init = async () => {
            const perms = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
            if (perms.status === 'granted' && isSisterHoodActive.current) {
                startVoiceLoop();
            }
        };
        init();

        return () => {
            console.log('Voice API Unmounting - Destroying active loop');
            ExpoSpeechRecognitionModule.stop();
            if (startVoiceLoopTimeout.current) clearTimeout(startVoiceLoopTimeout.current);
        };
    }, []);

    const startVoiceLoop = async () => {
        try {
            await ExpoSpeechRecognitionModule.start({
                lang: 'en-US',
                interimResults: true, // We need fast detection
                continuous: true,     // Keep listening within the session
            });
        } catch (e) {
            if (!e.message?.includes('already started')) {
                console.error('Initial Speech Recognition loop failed to start:', e);
            }
        }
    };

    // Pulse animation for Active state
    const pulseAnim = useRef(new Animated.Value(1)).current;

    useEffect(() => {
        if (sosActive) {
            Animated.loop(
                Animated.sequence([
                    Animated.timing(pulseAnim, {
                        toValue: 1.2,
                        duration: 800,
                        useNativeDriver: true,
                    }),
                    Animated.timing(pulseAnim, {
                        toValue: 1,
                        duration: 800,
                        useNativeDriver: true,
                    }),
                ])
            ).start();
        } else {
            pulseAnim.setValue(1);
            Animated.timing(pulseAnim).stop();
        }
    }, [sosActive]);

    async function startRecording() {
        try {
            console.log('Checking permissions..');
            let perm = await Audio.getPermissionsAsync();

            if (perm.status !== 'granted') {
                console.log('Requesting permission..');
                perm = await Audio.requestPermissionsAsync();
            }

            if (perm.status !== 'granted') {
                console.warn('Microphone permission not granted.');
                Alert.alert("Permission Required", "Please allow microphone access in your device settings to use Voice SOS.");
                return;
            }

            // --- MUTUALLY EXCLUSIVE HARDWARE HANDOFF (PRESS IN) ---
            wasSisterHoodPausedForRecording.current = true;
            try {
                // Must explicitly tell the infinite voice loop to stop, forcing hardware yield.
                await ExpoSpeechRecognitionModule.stop();
            } catch (ignored) { }

            await Audio.setAudioModeAsync({
                allowsRecordingIOS: true,
                playsInSilentModeIOS: true,
            });

            if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

            // Clean up any previous recording that wasn't properly stopped
            if (recording) {
                try { await recording.stopAndUnloadAsync(); } catch (e) { /* ignore */ }
                setRecording(undefined);
            }

            console.log('Starting recording..');
            const { recording: newRecording } = await Audio.Recording.createAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
            setRecording(newRecording);
            setIsRecording(true);
        } catch (err) {
            console.error('Failed to start recording', err);
        }
    }

    async function stopRecording() {
        if (!recording && !isRecordingExternal) return;
        try {
            setIsRecording(false);
            if (onToggleRecordingExternal) onToggleRecordingExternal(false);

            let uri = null;
            if (recording) {
                console.log('Stopping local recording..');
                await recording.stopAndUnloadAsync();
                uri = recording.getURI();
                setRecording(undefined);
            } else if (isRecordingExternal) {
                console.log('Stopping background recording from UI..');
                uri = await stopBackgroundRecording();
            }

            if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

            if (!uri) return;
            console.log('Recording stopped and stored at', uri);

            if (!currentLocation || !user) {
                console.warn("Attempted to upload voice SOS without location or user.");
                return;
            }

            // Upload via FormData to Node backend (Controller handles Cloudinary)
            const formData = new FormData();
            formData.append('audio', {
                uri: Platform.OS === 'ios' ? uri.replace('file://', '') : uri,
                type: 'audio/m4a',
                name: 'voice_note.m4a',
            });
            formData.append('userId', user.sub || user.id);
            formData.append('userName', user.name || 'User');
            formData.append('roomId', 'SISTERHOOD_NATIVE_SOS');
            formData.append('lat', currentLocation.latitude);
            formData.append('lng', currentLocation.longitude);

            console.log('Uploading Voice SOS natively...');
            const response = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/api/voice/upload`, {
                method: 'POST',
                headers: { 'Content-Type': 'multipart/form-data' },
                body: formData,
            });

            const data = await response.json();
            if (data.success) {
                console.log("✅ Native Voice Secure Upload Complete:", data.url);
            }
        } catch (error) {
            console.error("❌ Error stopping or uploading recording:", error);
        } finally {
            // --- MUTUALLY EXCLUSIVE HARDWARE RECLAIM (PRESS OUT) ---
            wasSisterHoodPausedForRecording.current = false;

            // Wait 300ms buffer to ensure expo-av has fully released hardware bindings before reclaiming
            if (startVoiceLoopTimeout.current) clearTimeout(startVoiceLoopTimeout.current);
            startVoiceLoopTimeout.current = setTimeout(async () => {
                if (isSisterHoodActive.current) {
                    try {
                        console.log("🔄 Reclaiming microphone for background SOS trigger...");
                        await startVoiceLoop();
                    } catch (e) {
                        console.error('Failed to reclaim background voice loop', e);
                    }
                }
            }, 300);
        }
    }

    const handleSOSPress = () => {
        if (sosActive) {
            onToggleSOS(false);
            if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            return;
        }

        if (countdown !== null) {
            clearInterval(intervalRef.current);
            setCountdown(null);
            if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            return;
        }

        if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
        setCountdown(3);

        let currentCount = 3;
        intervalRef.current = setInterval(() => {
            currentCount -= 1;

            if (currentCount > 0) {
                setCountdown(currentCount);
                if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            } else {
                clearInterval(intervalRef.current);
                setCountdown(null);
                onToggleSOS(true);
                if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            }
        }, 1000);
    };

    const handleCallPress = () => {
        // If SOS already active, dial immediately — user is already in distress
        if (sosActive) {
            if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            Linking.openURL('tel:112').catch(e => console.error('Failed to dial 112:', e));
            return;
        }

        // If countdown is running, cancel it
        if (callCountdown !== null) {
            clearInterval(callIntervalRef.current);
            setCallCountdown(null);
            if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            return;
        }
        // Start 3-second countdown
        if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
        setCallCountdown(3);

        let currentCount = 3;
        callIntervalRef.current = setInterval(() => {
            currentCount -= 1;

            if (currentCount > 0) {
                setCallCountdown(currentCount);
                if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            } else {
                // Countdown reached 0: Activate SOS + Dial 112
                clearInterval(callIntervalRef.current);
                setCallCountdown(null);
                onToggleSOS(true);
                if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
                Linking.openURL('tel:112').catch(e => console.error('Failed to dial 112:', e));
            }
        }, 1000);
    };

    // Cleanup intervals on unmount
    useEffect(() => {
        return () => {
            if (intervalRef.current) clearInterval(intervalRef.current);
            if (callIntervalRef.current) clearInterval(callIntervalRef.current);
        };
    }, []);

    // Determine SOS button visuals
    let sosButtonColors = styles.sosDefault;
    let iconColor = "#ffffff";
    let buttonText = "SOS";
    let IconComponent = ShieldAlert;

    if (sosActive) {
        sosButtonColors = styles.sosActive;
        buttonText = "ACTIVE";
    } else if (countdown !== null) {
        sosButtonColors = styles.sosCountdown;
        buttonText = countdown.toString();
        IconComponent = X;
    }

    return (
        <View style={styles.container}>

            {/* Left Action: Record Audio */}
            <Pressable
                onPress={isRecording ? stopRecording : startRecording}
                style={[styles.sideButton, isRecording ? styles.micRecording : styles.micIdle]}
            >
                <Mic size={24} color={isRecording ? "#ef4444" : "#a1a1aa"} />
                <Text style={[styles.sideButtonText, isRecording ? styles.textRed : styles.textZinc]}>
                    {isRecording ? "Stop" : "Record"}
                </Text>
            </Pressable>

            {/* Central Action: SOS Trigger */}
            <Pressable
                onPress={handleSOSPress}
                style={styles.sosOuter}
            >
                <Animated.View
                    style={[styles.sosButton, sosButtonColors, { transform: [{ scale: pulseAnim }] }]}
                >
                    <IconComponent size={36} color={iconColor} strokeWidth={2.5} />
                    <Text style={styles.sosText}>
                        {buttonText}
                    </Text>
                </Animated.View>
            </Pressable>

            {/* Right Action: Call 112 Emergency */}
            <Pressable
                onPress={handleCallPress}
                style={[styles.sideButton, callCountdown !== null ? styles.callCountdownStyle : styles.micIdle]}
            >
                {callCountdown !== null ? (
                    <>
                        <X size={24} color="#f59e0b" />
                        <Text style={[styles.sideButtonText, styles.textAmber]}>{callCountdown}</Text>
                    </>
                ) : (
                    <>
                        <Phone size={24} color="#a1a1aa" />
                        <Text style={[styles.sideButtonText, styles.textZinc]}>Call</Text>
                    </>
                )}
            </Pressable>

        </View>
    );
}
const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        bottom: 24,
        left: 24,
        right: 24,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: 'rgba(24, 24, 27, 0.8)',
        borderWidth: 1,
        borderColor: '#27272a',
        borderRadius: 24,
        padding: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.5,
        shadowRadius: 15,
        elevation: 20,
    },
    sideButton: {
        width: 56,
        height: 56,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
    },
    micIdle: {
        backgroundColor: 'rgba(39, 39, 42, 0.8)',
        borderColor: 'rgba(63, 63, 70, 0.5)',
    },
    micRecording: {
        backgroundColor: 'rgba(239, 68, 68, 0.2)',
        borderColor: '#ef4444',
        shadowColor: '#ef4444',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.5,
        shadowRadius: 15,
        elevation: 8,
    },
    sideButtonText: {
        fontSize: 10,
        fontWeight: '500',
        marginTop: 4,
    },
    textRed: {
        color: '#f87171',
    },
    textZinc: {
        color: '#a1a1aa',
    },
    sosOuter: {
        marginTop: -32,
    },
    sosButton: {
        width: 112,
        height: 112,
        borderRadius: 56,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 4,
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.5,
        shadowRadius: 15,
        elevation: 20,
    },
    sosDefault: {
        backgroundColor: '#dc2626',
        borderColor: '#ef4444',
        shadowColor: 'rgba(239, 68, 68, 0.5)',
    },
    sosActive: {
        backgroundColor: '#7f1d1d',
        borderColor: '#ef4444',
        shadowColor: 'rgba(220, 38, 38, 0.8)',
    },
    sosCountdown: {
        backgroundColor: '#eab308',
        borderColor: '#facc15',
        shadowColor: 'rgba(234, 179, 8, 0.5)',
    },
    sosText: {
        color: '#ffffff',
        fontWeight: '900',
        fontSize: 20,
        letterSpacing: 4,
        marginTop: 4,
    },
    callCountdownStyle: {
        backgroundColor: 'rgba(245, 158, 11, 0.2)',
        borderColor: '#f59e0b',
        shadowColor: '#f59e0b',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.5,
        shadowRadius: 15,
        elevation: 8,
    },
    textAmber: {
        color: '#f59e0b',
    },
});
