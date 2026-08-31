import { useEffect, useRef } from 'react';
import { Alert, BackHandler } from 'react-native';
import { router } from 'expo-router';
import { ref, remove } from 'firebase/database';
import { db } from '../../../../../lib/firebase';
import { removeFromRTDB } from './Rtdbdel';

/**
 * Standalone cleanup function — callable from background notification actions.
 * Does NOT navigate (can't navigate from background).
 */
export const performExitCleanup = async ({ userId, blocks, lastGeo6, sosActive }) => {
    if (!userId) return;

    const cleanupTasks = [];
    cleanupTasks.push(remove(ref(db, `users/${userId}`)));

    if (blocks && blocks.length > 0) {
        cleanupTasks.push(removeFromRTDB(blocks, userId));
    }

    if (sosActive && lastGeo6) {
        cleanupTasks.push(remove(ref(db, `active_sos/${lastGeo6}/${userId}`)));
    }

    try {
        await Promise.allSettled(cleanupTasks);
        console.log('✅ Graceful exit cleanup complete');
    } catch (error) {
        console.error("Error during graceful exit cleanup:", error);
    }
};

/**
 * Hook for in-app usage — wraps the standalone function with navigation + back button handling.
 */
export const useGracefulExit = ({ user, blocksRef, lastGeo6Ref, sosActive, onExit, onBeforeExit }) => {
    const isExiting = useRef(false);

    const handleExit = async () => {
        if (!user || isExiting.current) return;
        isExiting.current = true;

        // 1. Run any pre-exit logic (e.g. flush trust score to server)
        if (onBeforeExit) {
            try {
                await onBeforeExit();
            } catch (e) {
                console.error("Error during onBeforeExit callback:", e);
            }
        }

        // 2. Call system-level cleanup (stop service, etc.) if provided
        if (onExit) {
            try {
                await onExit();
            } catch (e) {
                console.error("Error during onExit callback:", e);
            }
        }

        // Navigate immediately so the user experiences zero lag
        router.replace('/(main)');

        // RTDB cleanup
        await performExitCleanup({
            userId: user.id,
            blocks: blocksRef.current,
            lastGeo6: lastGeo6Ref.current,
            sosActive,
        });
    };

    const handleBackPress = () => {
        Alert.alert(
            "Exit Sisterhood Shield",
            "Are you sure you want to stop location tracking and exit?",
            [
                {
                    text: "Cancel",
                    style: "cancel",
                    onPress: () => { }
                },
                {
                    text: "Yes, Exit",
                    style: "destructive",
                    onPress: handleExit
                }
            ],
            { cancelable: true }
        );
        return true;
    };

    useEffect(() => {
        const backHandler = BackHandler.addEventListener('hardwareBackPress', handleBackPress);
        return () => backHandler.remove();
    }, [user, blocksRef.current, lastGeo6Ref.current, sosActive]);

    return { handleBackPress };
};
