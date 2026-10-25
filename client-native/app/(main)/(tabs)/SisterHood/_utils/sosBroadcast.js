import { ref, remove, update } from 'firebase/database';
import { db } from '../../../../../lib/firebase';
import { calculateDistance } from './locationMath';

const BROADCAST_INTERVAL_MS = 5000;
const BROADCAST_DISTANCE_M = 10;

// Module scope: foreground screen, background task and notification actions share one JS runtime,
// and only one of them writes at a time (see backgroundService), so this is the single source of truth.
let last = null; // { userId, geo6, lat, lng, ts }

/**
 * Publishes the SOS position to active_sos/{geo6}/{uid} every 5 s or 10 m (or immediately with force).
 * Moves the entry when the geo6 cell changes.
 */
export const broadcastSosLocation = async ({ userId, geo6, latitude, longitude, accuracy, heading, picture, force = false }) => {
    if (!userId || !geo6 || !Number.isFinite(latitude) || !Number.isFinite(longitude)) return;

    const now = Date.now();
    const sameCell = last && last.userId === userId && last.geo6 === geo6;
    if (!force && sameCell) {
        const moved = calculateDistance(last.lat, last.lng, latitude, longitude);
        if (now - last.ts < BROADCAST_INTERVAL_MS && moved < BROADCAST_DISTANCE_M) return;
    }

    if (last && last.userId === userId && last.geo6 !== geo6) {
        remove(ref(db, `active_sos/${last.geo6}/${userId}`)).catch(e => console.error('Failed to remove old SOS broadcast', e));
    }

    last = { userId, geo6, lat: latitude, lng: longitude, ts: now };

    const payload = {
        lat: latitude,
        lng: longitude,
        accuracy: Number.isFinite(accuracy) ? Math.round(accuracy) : null,
        heading: Number.isFinite(heading) ? Math.round(heading) : null,
        timestamp: now,
    };
    if (picture) payload.picture = picture;

    // update() rather than set() so a background tick doesn't wipe the picture written in foreground
    await update(ref(db, `active_sos/${geo6}/${userId}`), payload)
        .catch(e => console.error('Failed to broadcast SOS location', e));
};

/**
 * Removes the SOS broadcast. Pass the geo6 you know about; the last broadcast cell is removed too.
 */
export const clearSosBroadcast = async (userId, knownGeo6 = null) => {
    if (!userId) return;
    const cells = new Set([knownGeo6, last?.userId === userId ? last.geo6 : null].filter(Boolean));
    last = null;
    await Promise.all([...cells].map(geo6 =>
        remove(ref(db, `active_sos/${geo6}/${userId}`)).catch(e => console.error('Failed to clear SOS broadcast', e))
    ));
};
