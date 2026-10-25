import ngeohash from "ngeohash";
import { db, FieldValue } from "../../firebaseadmin/firebaseadmin.js";
import { runSafetyScoreJob } from "../../jobs/safetyScoreJob.js";

const HOUR_MS = 60 * 60 * 1000;
const MAX_EVENTS_PER_HOUR = 3;
// A second trigger while an unresolved event is this fresh is the same SOS session
// (e.g. notification button and in-app effect both reporting it).
const SESSION_DEDUPE_MS = 10 * 60 * 1000;
const RESOLUTIONS = ["false_alarm", "real"];
// Events queued on the phone (no network / login when SOS fired) arrive late with their real time
const MAX_CLIENT_TS_AGE_MS = 7 * 24 * HOUR_MS;
const MAX_CLOCK_SKEW_MS = 2 * 60 * 1000;

const isValidCoord = (lat, lng) =>
    Number.isFinite(lat) && Number.isFinite(lng) &&
    Math.abs(lat) <= 90 && Math.abs(lng) <= 180 &&
    !(lat === 0 && lng === 0);

/**
 * POST /api/women/sos-event  { lat, lng, ts?, resolution? }
 * Logs one SOS event per session. Scores are computed offline by safetyScoreJob.
 * `ts` is the session start time from the phone and acts as an idempotency key: the same
 * user + ts always maps to the same event, so retries and multiple trigger paths are safe.
 */
export async function createSosEvent(req, res) {
    try {
        const uid = req.auth.payload.sub;
        const lat = Number(req.body?.lat);
        const lng = Number(req.body?.lng);
        if (!isValidCoord(lat, lng)) {
            return res.status(400).json({ success: false, error: "Valid lat/lng required" });
        }

        const now = Date.now();
        const clientTs = Number(req.body?.ts);
        if (Number.isFinite(clientTs) && now - clientTs > MAX_CLIENT_TS_AGE_MS) {
            // Re-timing it to "now" would mark the area as dangerous today
            return res.status(400).json({ success: false, error: "SOS event too old to log" });
        }
        // Kept exactly as sent (not clamped) so every retry of a session carries the same key.
        // A phone clock far ahead falls back to server time.
        const ts = Number.isFinite(clientTs) && clientTs <= now + MAX_CLOCK_SKEW_MS ? clientTs : now;
        const resolution = RESOLUTIONS.includes(req.body?.resolution) ? req.body.resolution : "pending";

        const mine = (await db.collection("sos_events").where("uid", "==", uid).get())
            .docs.map((d) => ({ id: d.id, ...d.data() }));

        const sameSession = mine.find((e) => e.ts === ts);
        if (sameSession) {
            if (resolution !== "pending" && sameSession.resolution === "pending") {
                await db.collection("sos_events").doc(sameSession.id).update({ resolution, resolved_at: FieldValue.serverTimestamp() });
            }
            return res.json({ success: true, eventId: sameSession.id, deduped: true });
        }

        const lastHour = mine.filter((e) => ts - e.ts < HOUR_MS && e.ts <= ts);

        const openSession = lastHour.find((e) => e.resolution === "pending" && ts - e.ts < SESSION_DEDUPE_MS);
        if (openSession) {
            return res.json({ success: true, eventId: openSession.id, deduped: true });
        }
        if (lastHour.length >= MAX_EVENTS_PER_HOUR) {
            return res.status(429).json({ success: false, error: "Too many SOS events in the last hour" });
        }

        const userSnap = await db.collection("users").doc(uid).get();
        const trust = userSnap.exists ? userSnap.data().trust_score : undefined;

        const doc = await db.collection("sos_events").add({
            uid,
            lat,
            lng,
            geo8: ngeohash.encode(lat, lng, 8),
            ts,
            trust_at_time: typeof trust === "number" ? trust : 5.0,
            resolution,
            created_at: FieldValue.serverTimestamp(),
        });

        if (resolution === "real") runSafetyScoreJob();

        return res.status(201).json({ success: true, eventId: doc.id });
    } catch (err) {
        console.error("POST /sos-event error:", err);
        return res.status(500).json({ success: false, error: "Failed to log SOS event" });
    }
}

/**
 * PATCH /api/women/sos-event/:id/resolution  { resolution: 'false_alarm' | 'real' }
 */
export async function resolveSosEvent(req, res) {
    try {
        const uid = req.auth.payload.sub;
        const { resolution } = req.body || {};
        if (!RESOLUTIONS.includes(resolution)) {
            return res.status(400).json({ success: false, error: `resolution must be one of ${RESOLUTIONS.join(", ")}` });
        }

        const ref = db.collection("sos_events").doc(req.params.id);
        const snap = await ref.get();
        if (!snap.exists || snap.data().uid !== uid) {
            return res.status(404).json({ success: false, error: "SOS event not found" });
        }

        await ref.update({ resolution, resolved_at: FieldValue.serverTimestamp() });

        // A confirmed emergency should show up in scores without waiting for the next cron tick
        if (resolution === "real") runSafetyScoreJob();

        return res.json({ success: true });
    } catch (err) {
        console.error("PATCH /sos-event resolution error:", err);
        return res.status(500).json({ success: false, error: "Failed to resolve SOS event" });
    }
}
