# 3. Police-based scoring

> Team note: *"a ML model will take a police crime report and based on it we will recommend insights based on travelling path."*

## What exists today
- **Nothing.** There's no crime or police data ingestion, no dataset, no trained model. "Police" appears only inside Gemini prompt text.
- All current "ML" is Gemini through `langchain_google_genai` (`agents/brain/layel_1.py`, `layel_2.py`, `agent3.py`). It classifies chat messages, not places.
- The only area signal is community SOS (see [02](02-scoring-normalization.md)).

## Proposed solution

Three layers: **ingest → model → insights on a path**.

### Layer 1: Ingest police crime reports into structured data
**Sources**, in order of ease:
1. **Uploaded reports from admins or police partners:** CSV/Excel exports or PDF FIR summaries uploaded via the admin panel.
2. **Public data:** NCRB / state police open-data portals (district- or station-level counts), city open-data portals and news reports (lower trust).
3. **Optional later:** a direct feed from a police partner (API / scheduled CSV drop).

**Extraction pipeline** (`agents/brain/police_ingest.py`, new):
- CSV/Excel → column mapping → records.
- PDF / free text → **Gemini structured output** (same pattern as `layel_1.py`) into:
  ```json
  { "crime_type": "harassment|chain_snatching|stalking|assault|kidnapping|other",
    "severity": 1-5, "occurred_at": "ISO", "time_bucket": "night|evening|day",
    "location_text": "Near X metro gate 2, Y road",
    "lat": null, "lng": null, "police_station": "...", "source": "...", "confidence": 0-1 }
  ```
- **Geocode** `location_text` with the Google Geocoding API (biased to the city) when lat/lng is missing. Drop records with geocode confidence below a threshold.
- **Dedup** on (type, ±200 m, ±2 h).
- **Privacy:** strip victim and accused names and any PII before storing. Store only type, time, approximate location and severity.
- **Store** in a `crime_incidents` collection (Firestore, or MongoDB since `MONGODB_URI` already exists) with a `geo8` field.

### Layer 2: Police risk model
Start simple, explainable and cheap, and only go "real ML" once there's enough data.

**v1: Kernel density hotspot model (no training needed)**
```
police_risk(cell, bucket) = Σ_incidents severity_i × typeWeight_i × e^(−age_i/τ) × K(d(cell, i))
```
- `K` is the same Gaussian kernel as [02](02-scoring-normalization.md) (σ ≈ 100 m; police locations are less precise).
- τ ≈ 180 days (crime patterns change more slowly than SOS).
- Computed per time bucket (night/evening/day), so night-time hotspots show up at night.
- Normalized to 1–10 by percentile per city, like [02](02-scoring-normalization.md).

**v2: Predictive model (once there's ≥ 6–12 months of data)**
- Features per (cell, time bucket): past incident counts at several radii and windows, SOS-event density, POI features (bars, bus stops, metro exits, parks, from Google Places / OSM), street-light density if available, day of week.
- Target: an incident occurred in the next period.
- Model: **LightGBM / XGBoost** (fast, works on small tabular data, gives feature importance for explanations). Train offline in `agents/` and export predictions to the same cell table.

**Combined score** (what the app shows):
```
final_score = 10 − (α·police_risk_norm + β·community_risk_norm + γ·context_risk)
α = 0.5, β = 0.4, γ = 0.1  (start; tune with feedback)
```
`context_risk` covers time of day plus a POI/lighting factor. Weights live in config, not code.

### Layer 3: Insights on a travel path
Given a route polyline (from [04](04-safe-route-a-to-b.md)) or the user's current heading:
1. Sample the polyline every ~20 m → geo8 cells → look up `final_score`, `police_risk` and the top incident types.
2. Find **risky segments** (consecutive cells below a threshold).
3. Generate **insights** with deterministic rules plus an optional Gemini rephrasing:
   - "200 m ahead near *Y road*: 4 chain-snatching reports at night in the last 6 months."
   - "This route passes a low-lit park after 9 pm. Route B is 3 min longer but avoids it."
   - "Nearest police station: *Z PS*, 600 m (call / navigate)."
4. Endpoint: `POST /api/women/route-insights { polyline, time }` → `{ segments: [...], insights: [...], summary }`.

Rules decide *what* is said, so the facts stay grounded. The LLM only rewrites them into friendly text, so it can't hallucinate crime.

## Open questions, answered

- **Do we need a trained ML model from day one?** No. Without labelled history a trained model would be guesswork. The kernel-density hotspot model is the standard first step, is explainable, and can feed a real model later (v2).
- **Where does the "ML model takes a police crime report" part fit?** In Layer 1: the LLM reads unstructured reports (PDF/text) and extracts structured, geocoded incidents. That's where ML adds the most value early.
- **What if police data is coarse (station-level only)?** Spread station-level counts uniformly over the station's jurisdiction polygon, or a radius around the station, with low confidence. The community SOS signal provides the finer detail.
- **Staleness?** Each incident decays with τ ≈ 180 days. Ingest runs on upload, plus weekly for public sources.
- **Legal / ethics?** Store aggregated, anonymised incidents only. Show "reports nearby" rather than labelling an area "dangerous". Keep the source and date visible for transparency.

## Files to touch (new)
- `agents/brain/police_ingest.py`, `agents/brain/police_risk.py`, plus FastAPI endpoints in `agents/main.py`
- `server/src/controllers/women/policeData.js` (upload → Python), `routeInsights.js`
- Admin panel upload screen (`client-native` admin side)
- Extend the job from [02](02-scoring-normalization.md) to blend `police_risk` into the final score

## Acceptance criteria
- Uploading a sample CSV/PDF creates geocoded, PII-free `crime_incidents`.
- Cells near clustered incidents score lower, at night more than in the day.
- `route-insights` returns grounded insights that cite counts, type and time window.
