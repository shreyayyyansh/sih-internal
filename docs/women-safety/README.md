# Women Safety (SisterHood) — Enhancement Plan

This folder documents the planned enhancements to the women safety feature. For each idea from the team's "Current issues" list it explains **what is wrong today (with code references), what we will do, how, and answers to the open questions**.

> Scope: the mobile app `client-native/app/(main)/(tabs)/SisterHood/`, the Node backend `server/src/controllers/women/*`, and the Python agents in `agents/`.
> The old web app in `client/` is **out of scope** (it was downgraded).

## Index

| # | Idea | Doc | Priority | Effort |
|---|------|-----|----------|--------|
| 1 | Fix jitter in SOS feature | [01-sos-jitter.md](01-sos-jitter.md) | P0 | S–M |
| 2 | Fix scoring system at borders (offline normalization) | [02-scoring-normalization.md](02-scoring-normalization.md) | P1 | M |
| 3 | Police-based scoring (ML on crime reports + path insights) | [03-police-based-scoring.md](03-police-based-scoring.md) | P2 | L |
| 4 | Safe path A → B using our factors + Google Maps routes | [04-safe-route-a-to-b.md](04-safe-route-a-to-b.md) | P2 | M–L |
| 5 | Emergency number: forward voice message + location | [05-emergency-contacts-voice-forwarding.md](05-emergency-contacts-voice-forwarding.md) | P1 | M |
| 6 | Make UI / start / exit fast (optional) | [06-performance-start-exit.md](06-performance-start-exit.md) | P0 (quick wins) | S |

**Suggested order:** 6 + 1 (quick wins, same files) → 2 → 5 → 4 → 3.
4 depends on 2 (needs a reliable per-cell score) and gets better once 3 exists.

## How the feature works today

```
 ┌──────────────── client-native (Expo / React Native) ────────────────┐
 │ SisterHood/index.jsx → SisterHoodMap.jsx                            │
 │   • watchPositionAsync (2 s / 1 m) + background task (3 s / 1 m)    │
 │   • geohash-8 "blocks" window (windowManager.js, Rtdbadd/Rtdbdel)   │
 │   • SOS: button / call / voice "help" / volume x3 / notification    │
 │   • score: useSafetyScore → blocks/{geo8}/.../current_score         │
 │   • trust: trustScoreManager.js / useTrustScore.js                  │
 │   • voice note: expo-av → POST /api/voice/upload                    │
 └───────────┬────────────────────────────┬────────────────────────────┘
             │ Firebase RTDB               │ HTTP (EXPO_PUBLIC_API_URL)
             ▼                             ▼
   users/{uid}, blocks/{geo8},     server/ (Express)
   active_sos/{geo6}               • /api/voice/upload → Cloudinary + Firestore voice_alerts
                                   • /api/model/agent1, /api/model/throttle
                                   • /api/user/sisterhood-exit (trust fields)
                                   • /api/blocks/fetch|update
                                             │ PYTHON_SERVER
                                             ▼
                                   agents/ (FastAPI + LangGraph + Gemini)
                                   • /agent1 (layel_1.py chat risk)
                                   • /throttle (agent3.py)
                                   • /analyze-voice
```

**Data stores:** Firebase RTDB (live state), Firestore (`voice_alerts`, `log-sos`, `model_sos_activity`, `suspicious_activity`, `users`), Cloudinary (audio). MongoDB is not used by this feature.

### Current safety score (summary)
Computed **on the phone** in `_utils/trustScoreManager.js` (`computeBlockSafetyImpact`) and only when someone triggers SOS:

```
effectiveTrust = trust_score × timeMult      (1.5 at 22–04h, 0.7 at 08–18h, else 1.0)
impact         = oldImpact × e^(−0.01·hours) + effectiveTrust
score          = max(1, 10 × e^(−0.05·impact))     # stored per geohash-8 cell
```
Details and its failure modes are in [02-scoring-normalization.md](02-scoring-normalization.md).

## Repo-level blockers found during analysis

Fix these before any of the work below. They exist today, independent of the new ideas:

- `server/app.js` imports `./src/routes/room.js` and `./src/routes/voiceRoutes.js`, but **neither file exists**. 15 other route files imported there are missing too, so the server will not start as checked in.
- `agents/main.py` imports `brain.voice_analysis_agent` (and urbanconnect/civicconnect modules), which **do not exist**.
- `client-native/store/useAuthStore` (imported by `SisterHoodMap.jsx` and `useTrustScore.js`) and `client-native/package.json` are not in the repo.
- `POST /api/room/flag-room` is called by `agents/brain/layel_2.py`, but no controller exists for it.
- Internal Node ↔ Python calls are unauthenticated, and several have no timeout.

Most likely these files simply weren't committed. Push them, or `.gitignore` them knowingly.
