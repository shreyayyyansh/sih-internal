import { api } from '../../../../../lib/api';
import { getStoredAccessToken } from '../../../../../lib/auth0Client';
import { getPersistedState, updatePersistedKey } from './backgroundService';

const MAX_QUEUED = 10;

// Keep for retry: offline, no token yet, auth expired, server down. Drop: invalid data, rate-limited.
const isRetryable = (e) => !e.response || e.response.status === 401 || e.response.status >= 500;

let flushing = null;

/**
 * Sends queued SOS events (logged while there was no network or no valid login, e.g. the
 * notification SOS button after the app was killed). Safe to call often; runs one flush at a time.
 */
export const flushPendingSosEvents = () => {
    if (flushing) return flushing;
    flushing = (async () => {
        try {
            const { pendingSosEvents, sosStartedAt } = await getPersistedState();
            if (!pendingSosEvents.length || !(await getStoredAccessToken())) return;

            const remaining = [];
            for (const event of pendingSosEvents) {
                try {
                    const { data } = await api.post('/api/women/sos-event', event);
                    // Still the live session → remember the id so the resolution modal can reach it
                    if (data?.eventId && event.ts === sosStartedAt) {
                        await updatePersistedKey('SOS_EVENT_ID', data.eventId);
                    }
                } catch (e) {
                    if (isRetryable(e)) remaining.push(event);
                }
            }
            await updatePersistedKey('PENDING_SOS_EVENTS', remaining);
        } catch (e) {
            console.error('Failed to flush queued SOS events:', e.message);
        } finally {
            flushing = null;
        }
    })();
    return flushing;
};

const enqueue = async (event) => {
    const { pendingSosEvents } = await getPersistedState();
    const queue = pendingSosEvents.filter(e => e.ts !== event.ts);
    queue.push(event);
    await updatePersistedKey('PENDING_SOS_EVENTS', queue.slice(-MAX_QUEUED));
};

/**
 * Logs one SOS event for offline scoring. Every trigger path (button, volume key, notification,
 * app restart mid-SOS) shares the session start time as `ts`, which the server treats as an
 * idempotency key — so calling this from several places, or retrying later, never duplicates.
 * Without network or a valid login the event is queued and sent by flushPendingSosEvents().
 */
export const reportSosEvent = async (latitude, longitude) => {
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude) || (latitude === 0 && longitude === 0)) return null;

    let { sosStartedAt } = await getPersistedState();
    if (!sosStartedAt) {
        sosStartedAt = Date.now();
        await updatePersistedKey('SOS_STARTED_AT', sosStartedAt);
    }
    const event = { lat: latitude, lng: longitude, ts: sosStartedAt };

    await flushPendingSosEvents();
    try {
        if (!(await getStoredAccessToken())) throw new Error('No stored login');
        const { data } = await api.post('/api/women/sos-event', event);
        if (data?.eventId) await updatePersistedKey('SOS_EVENT_ID', data.eventId);
        return data?.eventId || null;
    } catch (e) {
        if (!e.response || isRetryable(e)) {
            await enqueue(event);
            console.log('SOS event queued for later:', e.message);
        } else {
            console.error('Failed to log SOS event:', e.message);
        }
        return null;
    }
};

/**
 * Ends the SOS session (called on deactivation from any path). The next SOS gets a new event.
 */
export const endSosSession = async () => {
    await updatePersistedKey('SOS_STARTED_AT', '');
};

/**
 * Sends the resolution modal's answer for the current session's event.
 * If the event is still queued, the answer rides along with it.
 * @param {'FALSE_ALARM' | 'REAL_EMERGENCY'} outcome
 */
export const resolveSosEvent = async (outcome) => {
    const resolution = outcome === 'REAL_EMERGENCY' ? 'real' : 'false_alarm';
    const { sosEventId, pendingSosEvents } = await getPersistedState();

    if (!sosEventId) {
        if (pendingSosEvents.length) {
            const queue = [...pendingSosEvents];
            queue[queue.length - 1] = { ...queue[queue.length - 1], resolution };
            await updatePersistedKey('PENDING_SOS_EVENTS', queue);
            flushPendingSosEvents();
        }
        return;
    }
    try {
        await api.patch(`/api/women/sos-event/${sosEventId}/resolution`, { resolution });
        await updatePersistedKey('SOS_EVENT_ID', '');
    } catch (e) {
        console.error('Failed to resolve SOS event:', e.message);
    }
};
