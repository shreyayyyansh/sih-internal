import admin from "firebase-admin";
import ngeohash from "ngeohash";
import { db } from "../firebaseadmin/firebaseadmin.js";

/**
 * Offline SisterHood safety score.
 *
 * The app only logs SOS events (sos_events in Firestore). This job turns them into
 * per-geohash8 scores and publishes them to RTDB `safety_tiles/{geo6}`:
 *
 *   w_e     = (trust / 5) × resolutionWeight × timeOfDayWeight(event hour)
 *   impact  = Σ_events w_e · e^(−λ·age) · exp(−d² / 2σ²)      (d = cell centre → event, within 3σ)
 *   raw     = 10 − 9 · percentile(impact | region baseline)     (baseline = same sums without decay)
 *   score   = (n·raw + k·regionMean) / (n + k),  confidence = n / (n + k)
 *
 * Decay is applied every run, so a quiet cell recovers without needing a new SOS.
 */

const LOOKBACK_DAYS = 90;
const DECAY_PER_HOUR = 0.01;        // half-life ≈ 69 h, same as the old on-phone formula
const SIGMA_M = 60;                 // spatial kernel; spreads each event over neighbouring cells
const CUTOFF_M = 3 * SIGMA_M;
const SHRINK_K = 2;                 // with k=5 a single confirmed emergency would always read "not enough data"
// geo4 (~39×20 km) stands in for "city" for baselines and the shrinkage prior. A geo6 prior would
// put a seam at every geo6 border, which is the problem this job exists to remove.
const REGION_PRECISION = 4;
const TIMEZONE = process.env.SAFETY_TIMEZONE || "Asia/Kolkata";

const RESOLUTION_WEIGHT = { real: 1.5, pending: 1.0, false_alarm: 0.05 };
const BUCKET_KEYS = ["night", "evening", "day"];

const hourFormatter = new Intl.DateTimeFormat("en-GB", { hour: "numeric", hourCycle: "h23", timeZone: TIMEZONE });
const localHour = (ts) => parseInt(hourFormatter.format(new Date(ts)), 10);

// Smooth curve peaking around 1 am instead of the old step function
const timeOfDayWeight = (hour) => 1 + 0.4 * Math.cos((2 * Math.PI * (hour - 1)) / 24);

const bucketOf = (hour) => {
    if (hour >= 21 || hour < 5) return "night";
    if (hour >= 17) return "evening";
    return "day";
};

const distanceMeters = (lat1, lng1, lat2, lng2) => {
    const R = 6371e3;
    const toRad = (d) => (d * Math.PI) / 180;
    const dLat = toRad(lat2 - lat1);
    const dLng = toRad(lng2 - lng1);
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(a));
};

const cellsNear = (lat, lng) => {
    const dLat = CUTOFF_M / 111320;
    const dLng = CUTOFF_M / (111320 * Math.cos((lat * Math.PI) / 180));
    const cells = [];
    for (const cell of ngeohash.bboxes(lat - dLat, lng - dLng, lat + dLat, lng + dLng, 8)) {
        const centre = ngeohash.decode(cell);
        const d = distanceMeters(lat, lng, centre.latitude, centre.longitude);
        if (d <= CUTOFF_M) cells.push({ cell, kernel: Math.exp(-(d * d) / (2 * SIGMA_M * SIGMA_M)) });
    }
    return cells;
};

const round = (v, digits = 2) => parseFloat(v.toFixed(digits));

/**
 * Pure computation, no I/O. `events` are { lat, lng, ts, trust_at_time, resolution }.
 * Returns { [geo6]: { [geo8]: { score, confidence, n, buckets } } }.
 */
export function computeSafetyTiles(events, now = Date.now()) {
    // acc[cell][key] = { now, ref, n }   key ∈ all | night | evening | day
    const acc = new Map();
    const bump = (cell, key, impactNow, impactRef, n) => {
        if (!acc.has(cell)) acc.set(cell, {});
        const slot = acc.get(cell);
        slot[key] ??= { now: 0, ref: 0, n: 0 };
        slot[key].now += impactNow;
        slot[key].ref += impactRef;
        slot[key].n += n;
    };

    for (const e of events) {
        if (!Number.isFinite(e.lat) || !Number.isFinite(e.lng) || !Number.isFinite(e.ts)) continue;
        const ageHours = Math.max(0, (now - e.ts) / 3.6e6);
        if (ageHours > LOOKBACK_DAYS * 24) continue;

        const hour = localHour(e.ts);
        const trust = Math.min(10, Math.max(1, e.trust_at_time ?? 5));
        const resolution = e.resolution in RESOLUTION_WEIGHT ? e.resolution : "pending";
        const weight = (trust / 5) * RESOLUTION_WEIGHT[resolution] * timeOfDayWeight(hour);
        const decay = Math.exp(-DECAY_PER_HOUR * ageHours);
        const evidence = resolution === "false_alarm" ? 0 : 1;
        const bucket = bucketOf(hour);

        for (const { cell, kernel } of cellsNear(e.lat, e.lng)) {
            for (const key of ["all", bucket]) {
                bump(cell, key, weight * decay * kernel, weight * kernel, evidence * kernel);
            }
        }
    }

    // Baselines per region + key: sorted undecayed impacts
    const baselines = new Map();
    for (const [cell, slot] of acc) {
        const region = cell.slice(0, REGION_PRECISION);
        for (const [key, v] of Object.entries(slot)) {
            const id = `${region}|${key}`;
            if (!baselines.has(id)) baselines.set(id, []);
            baselines.get(id).push(v.ref);
        }
    }
    for (const list of baselines.values()) list.sort((a, b) => a - b);

    const percentile = (sorted, x) => {
        let lo = 0, hi = sorted.length;
        while (lo < hi) {
            const mid = (lo + hi) >> 1;
            if (sorted[mid] <= x) lo = mid + 1; else hi = mid;
        }
        return lo / sorted.length;
    };

    // Raw percentile scores, then region means for shrinkage
    const raw = new Map();
    const regionSums = new Map();
    for (const [cell, slot] of acc) {
        const region = cell.slice(0, REGION_PRECISION);
        const scores = {};
        for (const [key, v] of Object.entries(slot)) {
            const s = 10 - 9 * percentile(baselines.get(`${region}|${key}`), v.now);
            scores[key] = s;
            const id = `${region}|${key}`;
            const sum = regionSums.get(id) || { total: 0, count: 0 };
            sum.total += s;
            sum.count += 1;
            regionSums.set(id, sum);
        }
        raw.set(cell, scores);
    }

    const tiles = {};
    for (const [cell, slot] of acc) {
        const region = cell.slice(0, REGION_PRECISION);
        const area = cell.slice(0, 6);
        const shrunk = {};
        for (const [key, v] of Object.entries(slot)) {
            const { total, count } = regionSums.get(`${region}|${key}`);
            const regionMean = total / count;
            shrunk[key] = {
                score: round((v.n * raw.get(cell)[key] + SHRINK_K * regionMean) / (v.n + SHRINK_K), 1),
                confidence: round(v.n / (v.n + SHRINK_K)),
            };
        }
        if (!shrunk.all) continue;

        const buckets = {};
        for (const key of BUCKET_KEYS) if (shrunk[key]) buckets[key] = shrunk[key];

        tiles[area] ??= {};
        tiles[area][cell] = { ...shrunk.all, n: round(slot.all.n), buckets };
    }
    return tiles;
}

let running = null;

/**
 * Reads recent events from Firestore and republishes `safety_tiles` in RTDB.
 * Concurrent calls share the in-flight run.
 */
export function runSafetyScoreJob() {
    if (running) return running;
    running = (async () => {
        const started = Date.now();
        try {
            const cutoff = started - LOOKBACK_DAYS * 24 * 3.6e6;
            const snap = await db.collection("sos_events").where("ts", ">=", cutoff).get();
            const events = snap.docs.map((d) => d.data());

            const cells = computeSafetyTiles(events, started);
            const tiles = {};
            for (const [geo6, children] of Object.entries(cells)) {
                tiles[geo6] = { updated_at: started, cells: children };
            }

            // Full replace: tiles whose events have all expired disappear
            await admin.database().ref("safety_tiles").set(Object.keys(tiles).length ? tiles : null);
            console.log(`🛡️ Safety scores published: ${events.length} events → ${Object.keys(tiles).length} tiles (${Date.now() - started} ms)`);
        } catch (err) {
            console.error("Safety score job failed:", err);
        } finally {
            running = null;
        }
    })();
    return running;
}
