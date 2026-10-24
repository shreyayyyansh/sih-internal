# 4. Safe path from A to B (our factors + Google Maps routes)

## What exists today
- SisterHood has **no routing.** There's no destination input, Directions API call or polyline.
- The "path" today is only a projected window of geo8 cells along the walking bearing (`_utils/windowManager.js`). It steps 30 m, which can skip ~19 m-tall cells, and has no side neighbours.
- **A reusable pattern already exists** elsewhere in the app:
  - `client-native/app/(main)/fire-staff/navigate.jsx:157-209` and `user-track.jsx:90-123` call the Google Directions REST API with `EXPO_PUBLIC_GOOGLE_MAPS_API_KEY`, decode with `@mapbox/polyline`, and use `fitToCoordinates` and remaining-path trimming.

## Proposed solution

**Don't build our own road graph.** Let Google produce the candidate real-world paths, then **re-rank them with our safety factors**.

### Flow
```
App: user enters destination (Places Autocomplete)
  → POST /api/women/safe-route { origin, destination, mode: "walking", departAt }
Server:
  1. Google Directions API: mode=walking, alternatives=true      → 1–3 routes
  2. (optional) generate extra candidates via waypoints that detour around hotspots
  3. score each route (below)
  4. return routes ranked, with per-segment colours + insights (from 03)
App: draws all routes, the safest highlighted; segment colours green→red;
     "Start safe walk" starts SisterHood tracking with the route attached
```

### Scoring a route
1. Decode the polyline and resample every **20 m**. Map each point → geo8 → `final_score` (from [02](02-scoring-normalization.md) + [03](03-police-based-scoring.md)) for the **time bucket at the expected arrival time** of that point.
2. Per route:
   ```
   avgRisk   = Σ (10 − score_i) × segLen_i / totalLen       # length-weighted average risk
   worstRisk = max over 100 m sliding window of avg risk     # one very bad stretch matters
   unknown   = share of length with confidence < 0.3
   safetyCost = 0.6·avgRisk + 0.4·worstRisk + 1.0·unknown
   totalCost  = safetyCost + μ · (duration_min / fastest_duration_min − 1) · 10
   ```
   μ ≈ 0.3 trades safety against extra time. Never suggest a route that is more than **1.5× the fastest** duration.
3. Return `{ routes: [{ polyline, duration, distance, safetyScore (1–10), segments: [{from,to,score}], insights }], recommendedIndex }`.

### Getting more alternatives (optional v2)
Google often returns only 1–2 walking routes. To get more:
- Find the riskiest segment of the best route, choose a safe cell ~150–300 m to the side, and request Directions **with that point as a waypoint**. Repeat for 2–3 hotspots and keep the best.
- Later: an OSRM / OpenStreetMap walking graph with edge weight = `length × (1 + k·risk)` for true shortest-safest paths. Only worth it if Google's alternatives prove insufficient.

### During the walk
- Reuse the route as the "forward window": prefetch the cells **along the route polyline** instead of the bearing projection. That also fixes the 30 m skip problem in `windowManager.js`.
- **Deviation alert:** if the user is > 50 m off the route for > 60 s, show "You left your route. Are you safe?" with an auto-SOS countdown. Optionally notify emergency contacts ([05](05-emergency-contacts-voice-forwarding.md)).
- **Expected-arrival check:** if the user hasn't arrived by ETA + buffer, prompt them, then alert contacts.

## Open questions, answered

- **Why not compute the path fully ourselves?** Google already knows real walkable paths, closures and travel times. We only add the safety layer. It's faster to build, accurate and cheap.
- **Cost of Google APIs?** Directions is about $5 per 1,000 requests, and Places Autocomplete is billed per session. Cache by `(origin geo7, destination geo7, mode, hour bucket)` for 10 minutes, and don't recompute while walking unless the user deviates. Move the API call to the **server**, so the key isn't exposed in the app and requests can be cached.
- **What if a cell has no data?** It counts as "unknown" (penalised a little, not treated as safe), and the UI says so.
- **Walking only?** Start with walking (the main use case). `mode=driving|two_wheeler|transit` can use the same scoring later.

## Files to touch
- Server: `server/src/controllers/women/safeRoute.js` (new), `server/src/routes/women.routes.js`
- Python (optional, if scoring lives with the model): `agents/brain/route_scorer.py`
- App: new `SisterHood/_components/RoutePlanner.jsx` (destination search + route cards), polyline layer in `SisterHoodMap.jsx`, `windowManager.js` (route-based window)
- Reuse decoding and drawing from `fire-staff/navigate.jsx`

## Acceptance criteria
- For a test A→B at night, the app shows ≥ 2 routes with safety scores and highlights the recommended one, with a reason ("avoids 2 hotspots, +3 min").
- Segments are coloured by score, and unknown stretches are grey.
- Leaving the route triggers the deviation prompt.
