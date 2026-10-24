# 5. Emergency number: forward voice messages and location

> Team note: *"Setting up some emergency number so that voice messages are also forwarded to that number or location."*

## What exists today
- **The only number is a hard-coded `tel:112`** (`SisterHood/_components/SOSBottomBar.jsx:305,333`, `_utils/notificationActions.js:168`). It opens the dialer and doesn't send anything.
- **There are no emergency contacts** anywhere (no model, screen or API), but the permission screen promises them (`SisterHood/LocationAccess.jsx:33`).
- **Voice notes:**
  - Recording starts automatically on SOS (`expo-av`, `SOSBottomBar.jsx:151-194`).
  - It's uploaded **only when the user taps Stop** (`SOSBottomBar.jsx:196-247`) to `POST /api/voice/upload`. If she can't tap Stop, nothing is sent.
  - The upload sets `Content-Type` by hand, which breaks the multipart boundary, and sends no auth header.
  - Server side, `server/src/controllers/women/voiceController.js` uploads to Cloudinary, writes Firestore/RTDB `voice_alerts`, and calls Python `/analyze-voice`. The route file `server/src/routes/voiceRoutes.js` and `agents/brain/voice_analysis_agent.py` are **missing from the repo**.
- **There's no SMS, push or WhatsApp from the backend.** Alerts are only RTDB markers for nearby users and the admin panel.

## Proposed solution

### A. Emergency contacts
- **Data:** `users/{uid}.emergency_contacts` in Firestore:
  ```json
  [{ "name": "Mom", "phone": "+91…", "relation": "mother", "verified": true,
     "channels": ["sms","whatsapp","call"], "share_voice": true }]
  ```
  Allow up to 5 contacts.
- **Screen:** `SisterHood/_components/EmergencyContacts.jsx`, opened from the SisterHood settings / first-run screen. Pick from the phone book (`expo-contacts`) or type a number.
- **Verification:** send a one-time SMS asking the contact to confirm ("Reply YES" / tap link). This avoids spamming strangers and builds consent.
- **API:** `GET/PUT /api/women/emergency-contacts`, plus `POST /api/women/emergency-contacts/verify`.

### B. What happens on SOS
```
t = 0 s   SOS triggered (any trigger)
          → server POST /api/women/sos/start { lat, lng, accuracy }
             ├─ SMS / WhatsApp to all contacts:
             │   "⚠️ <Name> triggered SOS at 10:42 PM. Live location: https://<app>/t/<token>  Call: +91…"
             ├─ push notification to nearby app users (existing RTDB flow)
             └─ optional: auto-call first contact (Twilio voice / Exotel)
t = 0–∞   app records voice in chunks of ~15 s
          → each chunk: POST /api/voice/upload (alertId, seq) → Cloudinary
          → server sends contacts the chunk link, e.g. "🎙 New voice clip (0:15): https://…"
             (rate limited: first clip immediately, then 1 message per minute with a link to all clips)
t = end   SOS resolved → "✅ <Name> marked herself safe" (or "real emergency – continuing")
```
- **Live tracking link:** a tokenized public page (`/t/<token>`, expires when SOS ends + 1 h) showing the live location from `active_sos` and a voice-clip player. It can be one small Express route rendering a simple map page.
- **"Location" target:** if the team means forwarding to a fixed place (a police station or campus security desk), model it as a contact with `type: "authority"` that gets the same SMS. India's **ERSS 112** has no public API for apps. Keep `tel:112` as a one-tap call, and present this honestly as "notifies your contacts", not "notifies police".

### C. Fix voice recording / upload
1. Record in **15 s segments** (stop → upload → restart, or `expo-av` progress plus a segment timer) so data leaves the phone even if the phone is grabbed or broken.
2. Remove the manual `Content-Type` header (let `fetch` set the boundary) and add the auth token.
3. Use an **upload queue** with retry, persisted in AsyncStorage. If offline, retry when the network returns.
4. Auto-stop recording when SOS ends. Fix `persistTrackingState` resetting `IS_RECORDING=false` on every fix (`_utils/backgroundService.js:32`).
5. Commit the missing `voiceRoutes.js` and `voice_analysis_agent.py`. Analysis (transcript, urgency) can be appended to the contact message when ready, e.g. "Transcript: 'leave me alone…'".

### D. Offline fallback (no internet)
- When the server call fails, open the **native SMS composer** pre-filled for all contacts with a Google Maps link to the last location (`expo-sms`). One tap sends it over the cellular network. Voice can't go over SMS, so it's queued for later.

## Providers and cost (India)
| Need | Option | Note |
|------|--------|------|
| SMS | **MSG91**, Twilio, Fast2SMS | India needs DLT template registration. Register the SOS template early. |
| WhatsApp | Twilio / Gupshup / Meta Cloud API | Needs an approved template. Supports media links. |
| Auto-call | Exotel / Twilio Voice | Can play a TTS message: "<Name> needs help, check SMS." |

Rough cost: ₹0.15–0.25 per SMS. An SOS to 3 contacts with ~5 messages each costs a few rupees.

## Open questions, answered
- **Can we forward voice to a normal phone number?** Yes, as a **link** in SMS/WhatsApp (audio hosted on Cloudinary). WhatsApp can also send it as a media message. True voice forwarding means an auto-call that plays the recording (Exotel/Twilio `<Play>`), which is possible as v2.
- **What if the user didn't set contacts?** Prompt on first SisterHood use (skippable), and show a persistent banner "Add an emergency contact".
- **Privacy?** Voice links are unguessable and expire (e.g. 7 days, or signed Cloudinary URLs). Only verified contacts get them.
- **False alarms?** The 3 s countdown stays. If she resolves the SOS as a false alarm within 30 s, send a "false alarm, she is safe" message right away.

## Files to touch
- App: `SOSBottomBar.jsx` (chunked recording, upload queue), new `EmergencyContacts.jsx`, `notificationActions.js`, `backgroundService.js`
- Server: new `controllers/women/emergencyContacts.js`, `controllers/women/sosNotify.js`, `utils/sms.js`, the missing `routes/voiceRoutes.js`, tracking page route
- Agents: missing `brain/voice_analysis_agent.py`

## Acceptance criteria
- Triggering SOS sends an SMS with a live link to every verified contact within 5 s.
- Voice clips arrive as links at most every ~15–60 s without the user touching the phone.
- With airplane mode on, the SMS composer fallback opens with the location pre-filled.
