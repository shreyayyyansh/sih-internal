# 1. Fix jitter in the SOS feature

## Problem today

The map and markers shake, jump and flicker while tracking, and it gets worse during SOS. People nearby see an SOS marker that freezes, then jumps.

All references are in `client-native/app/(main)/(tabs)/SisterHood/` (`SHM` = `SisterHoodMap.jsx`).

## Root causes

| # | Cause | Where |
|---|-------|-------|
| 1 | **Raw GPS is used directly.** There's no accuracy check (`coords.accuracy` is ignored) and no smoothing. `distanceInterval: 1` passes through every 1 m of noise. | `SHM:184-195` |
| 2 | **The camera re-centers on every fix.** `animateCamera` runs for 1500 ms but is called every ~2 s, so animations chain and fight user pans. They also drift out of sync with the native blue dot. | `SHM:341-350` |
| 3 | **Two location streams write the same node.** The foreground watcher (2 s) and the background task (3 s, started while still in foreground) both write `users/{uid}`. | `SHM:184`, `SHM:215`, `_utils/backgroundService.js:155-166` |
| 4 | **The nearby-SOS listener is re-subscribed on every GPS tick.** The effect depends on `[currentLocation]`, so each tick tears down and re-creates the RTDB `onValue`. That produces a new `nearbyThreats` array, re-runs the banner animation and rebuilds the markers. | `SHM:588-629` |
| 5 | **Markers use `tracksViewChanges={true}`.** Markers repaint every frame and flicker. | `SHM:~716` |
| 6 | **The compass causes a re-render every frame.** `headingAnim` listener → `setRawHeading` up to 60 fps, and the value is never used. | `_utils/useCompass.js:61-67` |
| 7 | **Whole-screen re-render each tick.** `setCurrentLocation` re-renders `MapView` with a new inline `customMapStyle` array and `initialRegion` object. | `SHM:~657` |
| 8 | **Stale closure overwrites SOS state.** `handleLocationWorker` captures `sosActive=false` once, then writes `sos_triggered: sosActive` every 2 s. The `true` set when SOS starts gets overwritten, and the SOS path inside the worker never runs in the foreground. | `SHM:360`, `SHM:447-489` |
| 9 | **The SOS position is only republished on a geohash-6 change** (~1.2 × 0.6 km). Other users see the victim frozen for a long time, then jumping. | `SHM:474-488`, `backgroundService.js:127-136` |
| 10 | **Bearing comes from two fixes just 2 m apart.** That's inside GPS noise, so the "forward" block window points in random directions and keeps hitting `PATH_CHANGED`. | `SHM:418`, `_utils/windowManager.js` |
| 11 | **Border blind spot.** Nearby SOS is read only from the user's own geo6 cell, while the UI promises 2.5 km. An SOS 50 m away across a geo6 border is invisible. | `SHM:590-593` |

## Proposed solution

### A. Clean the location signal (one source, filtered)
1. **One writer only:** the foreground watcher while the app is active, and the background task only when `AppState` ≠ `active`. Use a shared module flag, or check `AppState.currentState` inside the task.
2. **Accuracy gate:** drop fixes with `accuracy > 25 m`, and drop impossible jumps (speed > 15 m/s for a walker).
3. **Smoothing:** a tiny 1-D Kalman filter per axis, or an EMA with α depending on accuracy, before the fix is used anywhere.
   ```js
   // _utils/locationFilter.js (new)
   export function createFilter(q = 3) {           // q = process noise (m/s)
     let lat, lng, variance = -1, ts;
     return ({ latitude, longitude, accuracy, timestamp }) => {
       const acc = Math.max(accuracy || 10, 1);
       if (variance < 0) { lat = latitude; lng = longitude; variance = acc * acc; ts = timestamp; }
       else {
         const dt = (timestamp - ts) / 1000; ts = timestamp;
         variance += dt * q * q;
         const k = variance / (variance + acc * acc);
         lat += k * (latitude - lat); lng += k * (longitude - lng);
         variance = (1 - k) * variance;
       }
       return { latitude: lat, longitude: lng, accuracy: Math.sqrt(variance) };
     };
   }
   ```
4. Use `distanceInterval: 5` and `timeInterval: 3000` for the foreground watcher. Walkers don't need 1 m resolution.
5. **Bearing:** compute it only when the filtered displacement is > 10 m, or use `coords.heading` when `speed > 0.8 m/s`.

### B. Stop the UI from fighting itself
1. **Camera follow mode:** follow only while `isFollowing === true`. Set it to false on `onPanDrag` and back to true from the recenter button. Throttle `animateCamera` to at most once per 3 s and keep `duration` shorter than the interval (e.g. 800 ms).
2. Keep `currentLocation` in a **ref** for logic, and push to state only after a fix is filtered and has moved > 3 m.
3. Hoist `customMapStyle` and `initialRegion` to module constants or `useMemo`.
4. Delete the unused `AnimatedRegion`, `markerLoaded`, `spin` and `rawHeading` code paths. In `useCompass`, only update state when heading changes by > 5°.
5. Markers: `tracksViewChanges={false}`, flipped to true for one render once the image loads.

### C. Fix SOS state and broadcasting
1. Replace the closed-over `sosActive` and `user` in `handleLocationWorker` with `sosActiveRef.current` and `userRef.current`. The refs already exist for SOS.
2. While SOS is active, write `active_sos/{geo6}/{uid}` **every 5 s or every 10 m**, not only on a geo6 change. Include `accuracy`, `heading` and `timestamp`.
3. **Nearby listener keyed on geo6, not on location:** an effect with deps `[currentGeo6, user.id]` that subscribes to the **own cell plus its 8 neighbours** (`ngeohash.neighbors(geo6)`), then filters by distance in memory. That fixes the border blind spot (#11) and the re-subscribe churn (#4).
4. **Receiver-side interpolation:** animate the remote SOS marker from its old position to the new one over ~1 s with `AnimatedRegion` / `Marker.animateMarkerToCoordinate`. Movement looks smooth even with 5 s updates.
5. Notification-triggered SOS currently writes `lat:0, lng:0` (`_utils/notificationActions.js:137-165`). Use the last persisted location instead.

## Open questions, answered

- **Will filtering delay the SOS location?** No. The SOS trigger itself writes the latest raw fix immediately. Filtering only affects the continuous stream. Kalman lag at walking speed is < 2 s.
- **Do we lose accuracy by raising `distanceInterval` to 5 m?** Not meaningfully. A geo8 cell is ~38 × 19 m, so 5 m steps still catch every cell change.
- **Is the extra RTDB traffic from 5 s SOS writes a problem?** One small write per 5 s per *active SOS* user is negligible. Normal tracking traffic actually drops, thanks to the single writer and the 5 m interval.
- **Battery?** It improves: fewer fixes, fewer re-renders and one location stream instead of two.

## Files to touch
- `SisterHoodMap.jsx`: worker refs, camera follow, listener effect, memoised map props
- `_utils/backgroundService.js`: skip writes when the app is active
- `_utils/useCompass.js`: remove per-frame setState
- `_utils/locationFilter.js`: new
- `_utils/notificationActions.js`: real coords for notification SOS

## Acceptance criteria
- Standing still outdoors for 2 minutes, the blue dot and camera move < 5 m and no marker flickers.
- On a second phone, a walking SOS user's marker moves smoothly and is never more than 10 s or 15 m stale.
- `users/{uid}/sos_triggered` stays `true` for the whole SOS session.
- An SOS just across a geo6 border shows up in the nearby list.
