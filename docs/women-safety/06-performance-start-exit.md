# 6. Make the UI and response time fast (start and exit) — optional

> Team note: *"currently start and getting out take a lot of time."*

## Why start is slow

`SisterHoodMap.jsx:145-220` runs **everything sequentially**, and the loading screen ("Establishing Identity Shield…") stays up until step 3 finishes:

1. `requestBackgroundLocationPermissions()` (foreground + background permission dialogs)
2. `getCurrentPositionAsync({ accuracy: Balanced })`: a fresh fix can take several seconds indoors
3. **`await addToRTDB(startingBlocks, user.id)`**: the 50 m radius gives ~15–25 geo8 blocks. For *each* one it does an RTDB `get` + `runTransaction`, plus `POST /api/blocks/fetch` for missing blocks (`_utils/Rtdbadd.js:22-97`, axios timeout 60 s). **Tracking can't start until all of them finish.**
4. `watchPositionAsync`, then `getPersistedState`, `persistTrackingState`, `startBackgroundService` and `showPersistentNotification`, each awaited one after another.

Also on mount: speech-recognition permission plus continuous listening, `watchHeadingAsync`, and the volume listener.

**Crash bug:** `Alert` is used at `SisterHoodMap.jsx:151` but isn't imported (line 6). If background permission is denied, `startTracking` throws before the `try`, and the screen stays on the loader **forever**.

## Why exit is slow

`_utils/useGracefulExit.js:40-72`:
```
await onBeforeExit()   → handleSafeWalkExit → await api.patch('/api/user/sisterhood-exit')   (60 s timeout + auth token)
await onExit()         → stopBackgroundService, dismissPersistentNotification
router.replace('/(main)')       ← navigation waits for both network calls above
await performExitCleanup(...)    → remove users/{uid}, removeFromRTDB transactions (+ POST /api/blocks/update each), remove active_sos
```
The code comment says "navigate immediately so the user experiences zero lag", but navigation actually comes *after* the network calls.

**Related bugs:**
- `flushTrustScoreToServer()` is called without `userId` (`SisterHoodMap.jsx:131, 904`), so it returns early and the trust result after an SOS is never saved.
- Leaving via tab switch or unmount only removes foreground listeners. The background service, RTDB presence and notification stay alive.

## Proposed solution

### Start: show the map in under 1 s
1. **Render the map immediately** using `Location.getLastKnownPositionAsync()` (instant) and refine with the first watcher fix.
2. **Start the watcher before loading blocks.** Don't await `addToRTDB`. Fire it in the background and let the safety pill show "loading…".
3. **Parallelise block loading:** `Promise.all` over blocks, or better, one server call `POST /api/blocks/fetch` with *all* block IDs in a single request plus a multi-path RTDB `update()` instead of N transactions. Reduce the initial radius to the current cell + 8 neighbours.
4. Run `getPersistedState`, `persistTrackingState`, `startBackgroundService` and `showPersistentNotification` **in parallel** (`Promise.allSettled`) after the map is visible.
5. **Ask for permissions earlier and once:** on `index.jsx` / `LocationAccess.jsx`, not inside the map screen.
6. Defer speech recognition and the compass by ~1 s (`InteractionManager.runAfterInteractions`).
7. Fix the missing `Alert` import and move the call inside `try`.

### Exit: navigate instantly
1. Reorder `handleExit`: **`router.replace` first**, then run cleanup without awaiting it:
   ```js
   router.replace('/(main)');
   Promise.allSettled([
     onBeforeExit?.(), onExit?.(),
     performExitCleanup({ ... }),
   ]);
   ```
2. **Server-side presence cleanup with RTDB `onDisconnect()`:** when tracking starts, register `onDisconnect().remove()` on `users/{uid}` and `active_sos/{geo6}/{uid}`. Even if the app is killed, Firebase removes them. Block user counts can be decremented by a server cron that sweeps stale `active_users`.
3. Exit trust update: write to RTDB immediately (already done optimistically) and queue the server `PATCH` (retry on next app open). Fix the missing `userId` argument.
4. Handle unmount and tab switch: call the same cleanup from the effect cleanup in `SisterHoodMap.jsx`.

### Render performance (shared with [01](01-sos-jitter.md))
- Memoise `customMapStyle` and `initialRegion`, remove per-frame compass state, re-subscribe the nearby-SOS listener only on geo6 change, and set `tracksViewChanges={false}` on markers.

### Backend latency (throttle / agent calls)
- `server/src/controllers/women/throttle_agent.js:10`: add an axios timeout (e.g. 8 s) and **respond to the app immediately** (202 Accepted). Do the Gemini summary asynchronously. The panic action must not wait on an LLM.
- `agents/brain/agent3.py` / `layel_1.py`: replace blocking `requests.post` inside async nodes with `httpx.AsyncClient`, add timeouts, and log the SOS **before** the LLM summary.
- `women_model_layer1.js`: the 100 s timeout is too long for a UI path. Make it async (fire-and-forget + RTDB result) or ≤ 10 s.

## Open questions, answered
- **Is fire-and-forget cleanup safe?** Yes, with `onDisconnect()` as a backstop: if the app dies mid-cleanup, Firebase removes the presence anyway.
- **Will the safety score show late on start?** For ~1 s it shows "loading…" instead of a number. That's much better than blocking the whole screen for 5–20 s.

## Target numbers
| Metric | Now (observed) | Target |
|--------|----------------|--------|
| Tap SisterHood → map visible | several seconds (blocked on blocks) | < 1 s |
| Map → first live location | after all blocks load | < 2 s |
| Tap exit → home screen | waits on network (up to 60 s worst case) | < 300 ms |
| Throttle button → acknowledged | Node → Python → Gemini → Node round trip | < 500 ms |

## Files to touch
- `SisterHood/SisterHoodMap.jsx`, `_utils/useGracefulExit.js`, `_utils/Rtdbadd.js`, `_utils/Rtdbdel.js`, `_utils/backgroundService.js`, `index.jsx`
- `server/src/controllers/women/throttle_agent.js`, `women_model_layer1.js`, blocks controller (batch fetch)
- `agents/brain/agent3.py`, `agents/brain/layel_1.py`
