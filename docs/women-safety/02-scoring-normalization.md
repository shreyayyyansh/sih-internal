# 2. Fix the scoring system at borders (offline normalization)

> Team note: *"current system is good but it fails on borders → we can do normalization over the time offline."*

## How the score works today

`client-native/app/(main)/(tabs)/SisterHood/_utils/trustScoreManager.js:87-128`, run **on the phone** inside an RTDB transaction (`SisterHoodMap.jsx:~453`, `~530`) when an SOS happens:

```
effectiveTrust = trust_score × timeMult        # 1.5 (22:00–04:59), 0.7 (08:00–18:59), 1.0 otherwise
decayedImpact  = oldImpact × e^(−0.01 × hoursSinceLastUpdate)   # half-life ≈ 69 h
impact         = decayedImpact + effectiveTrust
current_score  = max(1, 10 × e^(−0.05 × impact))                # 10 = safe, 1 = dangerous
```
Stored at `blocks/{geohash8}/block_state/safety_metrics/{current_score, weighted_sos_impact, last_updated}` and read by `_utils/useSafetyScore.js`, which **defaults to 10** when the value is missing.

The idea itself (trust-weighted, time-weighted, exponentially decaying) is good. It's kept as the base signal.

## Where it fails ("borders" and other edges)

1. **Spatial borders.** A geohash-8 cell is only ~38 × 19 m and each one is scored independently. A dangerous cell can sit next to a "perfect 10" cell, and crossing a street changes the score from 3 to 10. GPS noise at a cell edge flips the displayed score back and forth.
2. **Unknown = safe.** A cell nobody has reported on shows **10.0**, the same as a cell with years of quiet history. Side cells outside the forward window are never loaded, so the score jumps between the real value and 10.
3. **Decay only runs on the next SOS.** A cell that had incidents last month still shows its old low score today, because `current_score` is only recomputed when another SOS happens there.
4. **One person, many cells.** During one SOS walk, every new geo8 entered gets the full impact (`SisterHoodMap.jsx:~449`). A 500 m walk poisons ~15–25 cells. A→B→A penalises the same cell again.
5. **Time-of-day borders.** The multiplier changes in steps at 05:00, 08:00, 19:00 and 22:00. It uses the phone's clock at *processing* time, not event time.
6. **Lost writes.** The transaction is skipped if `blocks/{geo8}/block_state` doesn't exist yet, so impact is silently dropped. The background path increments `sos_count` but never updates `safety_metrics` (`backgroundService.js:115-120`).
7. **No normalization.** Raw impact means different things in a dense city centre and a quiet suburb. There's no baseline, so scores aren't comparable across areas or times of day.
8. **Client-side trust.** Any client can write any score. There's no dedup or per-user rate limit.

## Proposed solution

Split the score into an **online event log** (what the app writes) and an **offline score** (what the app reads).

### Step 1: The app logs events, it doesn't compute scores
On SOS, the app (or `POST /api/women/sos-event` on the server) appends one record:
```
sos_events/{eventId} = { uid, lat, lng, geo8, ts, trust_at_time, resolution: pending|false_alarm|real }
```
- **One event per SOS session,** not per cell. The path during SOS is stored as a polyline on the event, if wanted.
- `resolution` is filled in from `SOSResolutionModal`. False alarms get weight ≈ 0 when recomputed.
- Write through the server (Firestore) so it can be validated, deduped and rate-limited (e.g. max 3 events per user per hour).

### Step 2: An offline job recomputes the score (every 15 min, plus nightly)
Run it as a Node cron in `server/src/utils/cronJobs.js` (that pattern already exists), or as a Python job in `agents/`. For each city:

1. **Time decay for every cell, every run.** `impact_cell = Σ_events w_e · e^(−λ·age_e)`, where `w_e = trust × resolutionWeight × timeOfDayWeight(event_hour)`. That fixes cause 3, and uses event time instead of processing time (cause 5).
2. **Spatial smoothing (the border fix).** Spread each event over nearby cells with a Gaussian kernel (σ ≈ 50–75 m) instead of dropping it in one cell:
   `impact_cell = Σ_events w_e · e^(−λ·age) · exp(−d(cell, event)² / 2σ²)` for events within 3σ.
   Neighbouring cells now get similar scores, and crossing a street changes the score gradually.
3. **Smooth time-of-day.** Replace the step function with a smooth curve, e.g. `1 + 0.4·cos(2π(hour − 1)/24)` (peaks at ~1 am). Also keep separate **time buckets** (night / evening / day) so the app can show "this area at night".
4. **Normalization against a baseline.** For each city and time bucket, compute the distribution of `impact_cell` and map it to 1–10 by **percentile** (robust to outliers), e.g. score = 10 − 9·percentile. A quiet suburb's single incident and a busy market's ten incidents become comparable.
5. **Confidence for sparse cells (unknown ≠ safe).** Use a Bayesian shrinkage toward the area (geo6) mean:
   `score = (n·cellScore + k·areaMean) / (n + k)`, with `k ≈ 5`, and publish `confidence = n/(n+k)`. The UI shows "Not enough data" (grey) instead of a fake green 10.
6. **Publish.** Write `{score, confidence, bucket_scores:{night,evening,day}, updated_at}` to `blocks/{geo8}/safety` in RTDB, or a `safety_tiles/{geo6}` doc holding all its geo8 children so the app fetches one doc per area.

### Step 3: Client changes
- `useSafetyScore` reads the published score, and shows grey or "unknown" when `confidence < 0.3`.
- **Hysteresis:** only switch the displayed cell when the filtered location is > 5 m inside the new cell, or has been there for 2 fixes. Combined with the GPS filter from [01](01-sos-jitter.md), that ends the flip-flopping.
- Optionally show the **min score over the next 100 m** ahead instead of the current cell. It's more useful while walking.
- Remove `computeBlockSafetyImpact` writes from the client.

## Open questions, answered

- **What does "normalization over time offline" mean concretely?** (a) Decay is applied on a schedule, not only when new events arrive. (b) Scores are normalized against a rolling baseline per city and time-of-day bucket (last 90 days). Both run in a batch job, so the app only reads results.
- **Why not just use bigger cells (geo7)?** Bigger cells move the border problem around without fixing it, and lose detail. Kernel smoothing over geo8 keeps detail *and* removes hard edges. Geo7 can still serve as the aggregation level for confidence.
- **Isn't 15 min too slow for a fresh SOS?** Live SOS is shown separately (red markers / banner from `active_sos`). The *score* is a historical risk measure and doesn't need to be real-time. The job can also be triggered on demand after a confirmed "real emergency".
- **Cost?** Events are few (hundreds or thousands per city per month), and a kernel over ~30 nearby cells per event is trivial. One cron job is enough, no ML needed.
- **How does this combine with police data ([03](03-police-based-scoring.md))?** Police incidents become another event source with their own weight in the same kernel pipeline. The final score blends both.

## Files to touch
- `server/src/utils/cronJobs.js` + new `server/src/jobs/safetyScoreJob.js` (or `agents/brain/safety_score_job.py`)
- new route `server/src/routes/women.routes.js` → `POST /api/women/sos-event`
- `client-native/.../SisterHood/_utils/useSafetyScore.js`, `trustScoreManager.js`, `SisterHoodMap.jsx` (remove client score writes)

## Acceptance criteria
- Two adjacent cells never differ by more than ~2 points unless real data supports it.
- A cell with no events shows "unknown", not 10.
- A cell's score recovers over time with no new SOS.
- One SOS walk creates exactly one event.
