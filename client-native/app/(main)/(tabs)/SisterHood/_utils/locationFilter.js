import { calculateDistance, getDestinationPoint } from './locationMath';

const MAX_ACCURACY_M = 25;      // drop fixes worse than this...
const STALE_ACCEPT_MS = 20000;  // ...unless nothing better has arrived for this long (indoors)
const MAX_SPEED_MPS = 15;       // faster than a walker/rickshaw → GPS jump
const RESET_AFTER_JUMPS = 3;    // consecutive "jumps" mean we really moved; re-seed
const STILL_SPEED_MPS = 0.5;    // below this the GPS says we're standing still
const STILL_Q = 0.15;           // process noise while still: average the noise out instead of following it

/**
 * Accuracy gate + 1-D Kalman filter (shared variance for lat/lng).
 * When the fix carries a GPS speed/heading, the estimate is first moved along it (so walking
 * doesn't lag behind), and while standing still the process noise drops so the dot stays put.
 * Returns a function: (fix) => filtered fix, or null when the fix is rejected.
 * `fix` = { latitude, longitude, accuracy, timestamp, heading, speed } (expo-location coords + timestamp).
 *
 * @param {number} q process noise in m/s (how fast we expect to move)
 */
export function createLocationFilter(q = 3) {
    let lat, lng, variance = -1, ts = 0;
    let lastAcceptedAt = 0;
    let jumpCount = 0;

    const seed = (fix, acc) => {
        lat = fix.latitude;
        lng = fix.longitude;
        variance = acc * acc;
        ts = fix.timestamp;
        jumpCount = 0;
    };

    return (fix, { force = false } = {}) => {
        const acc = Math.max(fix.accuracy || 10, 1);
        const timestamp = Number.isFinite(fix.timestamp) ? fix.timestamp : Date.now();
        fix = { ...fix, timestamp };

        if (variance < 0 || force) {
            seed(fix, acc);
        } else {
            if (acc > MAX_ACCURACY_M && timestamp - lastAcceptedAt < STALE_ACCEPT_MS) return null;

            const dt = Math.max((timestamp - ts) / 1000, 0.001);
            const speed = calculateDistance(lat, lng, fix.latitude, fix.longitude) / dt;
            if (speed > MAX_SPEED_MPS) {
                jumpCount += 1;
                if (jumpCount < RESET_AFTER_JUMPS) return null;
                seed(fix, acc);
            } else {
                jumpCount = 0;
                ts = timestamp;

                const hasSpeed = Number.isFinite(fix.speed) && fix.speed >= 0;
                const moving = hasSpeed && fix.speed >= STILL_SPEED_MPS;
                if (moving && Number.isFinite(fix.heading) && fix.heading >= 0) {
                    const predicted = getDestinationPoint(lat, lng, fix.speed * dt, fix.heading);
                    lat = predicted.latitude;
                    lng = predicted.longitude;
                }
                const qEff = hasSpeed && !moving ? STILL_Q : q;
                variance += dt * qEff * qEff;
                const k = variance / (variance + acc * acc);
                lat += k * (fix.latitude - lat);
                lng += k * (fix.longitude - lng);
                variance = (1 - k) * variance;
            }
        }

        lastAcceptedAt = timestamp;
        return {
            latitude: lat,
            longitude: lng,
            accuracy: Math.sqrt(variance),
            timestamp,
            heading: fix.heading,
            speed: fix.speed,
        };
    };
}
