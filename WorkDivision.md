# UrbanFlow Code Migration & Work Division Schedule

This document serves as the workload partition and daily pushing schedule for migrating the **UrbanFlow** codebase to the new repository. 

To ensure **zero merge conflicts**, the codebase has been strictly partitioned into mutually exclusive file sets. Each teammate will commit and push only their assigned files using their specific branch at their designated time slot.

---

## The Core Strategy
*   **Branches**: 4 development branches (`ishwar`, `arushi`, `shreyansh`, `aryan`) and `main`.
*   **Time Slots**:
    *   **Morning**: Ishwar (`ishwar` branch)
    *   **Afternoon**: Arushi (`arushi` branch)
    *   **Evening**: Shreyansh (`shreyansh` branch)
    *   **Night**: Aryan (`aryan` branch)
*   **Workflow**:
    1. Checkout your branch: `git checkout <your_branch>`
    2. Copy/paste the files allocated for the day from your local copy of the full repository.
    3. Stage **only** the specified files: `git add <files>`
    4. Commit using the exact command listed for the day: `git commit -m "<message>"`
    5. Push to your remote branch.
    6. **At the end (June 27)**, merge all 4 branches into `main` sequentially.

---

## Daily Schedule & Git Commands

### Day 1: June 16, 2026

#### 🌅 Morning: Ishwar (Branch: `ishwar`)
*   **Target Files/Folders**:
    *   `client/src/ui/` (Common styling gallery, avatar, cards, inputs, buttons, team member portraits)
*   **Git Commands**:
    ```bash
    git checkout -b ishwar
    git add client/src/ui/
    git commit -m "Ishwar [Day 1]: Add common client UI component files"
    git push origin ishwar
    ```

#### ☀️ Afternoon: Arushi (Branch: `arushi`)
*   **Target Files/Folders**:
    *   `client/src/pages/features/ngo/` (NGO web chat client, DonorInbox, portal layout, modals)
*   **Git Commands**:
    ```bash
    git checkout -b arushi
    git add client/src/pages/features/ngo/
    git commit -m "Arushi [Day 1]: Add ngo web portal pages"
    git push origin arushi
    ```

#### 🌆 Evening: Shreyansh (Branch: `shreyansh`)
*   **Target Files/Folders**:
    *   `client/index.html`
    *   `client/src/App.css`
    *   `client/src/index.css`
    *   `client/src/App.jsx`
    *   `client/src/main.jsx`
*   **Git Commands**:
    ```bash
    git checkout -b shreyansh
    git add client/index.html client/src/App.css client/src/index.css client/src/App.jsx client/src/main.jsx
    git commit -m "Shreyansh [Day 1]: Add client root layout and styling files"
    git push origin shreyansh
    ```

#### 🌃 Night: Aryan (Branch: `aryan`)
*   **Target Files/Folders**:
    *   Root configuration and documentation: `UF.code-workspace`, `.gitignore`, `package.json`, `package-lock.json`, `instruction.md`, `README.md`, `test.txt`, `ReadmeMedia/`, `WorkDivision.md`
*   **Git Commands**:
    ```bash
    git checkout -b aryan
    git add UF.code-workspace .gitignore package.json package-lock.json instruction.md README.md test.txt ReadmeMedia/ WorkDivision.md
    git commit -m "Aryan [Day 1]: Initialize repository configuration and documentation files"
    git push origin aryan
    ```

---

### Day 2: June 17, 2026

#### 🌅 Morning: Ishwar (Branch: `ishwar`)
*   **Target Files/Folders**:
    *   Client config and assets: `client/package.json`, `client/package-lock.json`, `client/vite.config.js`, `client/tailwind.config.js`, `client/eslint.config.js`, `client/jsconfig.json`, `client/vercel.json`, `client/README.md`, `client/example.env`, `client/public/background.jpg`, `client/public/icons/`, `client/public/vite.svg`, `client/src/assets/react.svg`
*   **Git Commands**:
    ```bash
    git checkout ishwar
    git add client/package.json client/package-lock.json client/vite.config.js client/tailwind.config.js client/eslint.config.js client/jsconfig.json client/vercel.json client/README.md client/example.env client/public/background.jpg client/public/icons/ client/public/vite.svg client/src/assets/react.svg
    git commit -m "Ishwar [Day 2]: Add client package configs and bundler settings"
    git push origin ishwar
    ```

#### ☀️ Afternoon: Arushi (Branch: `arushi`)
*   **Target Files/Folders**:
    *   `client/src/pages/features/kindshare-new/` (KindShare web portals: ngorenew, donor, receiver UI layouts)
*   **Git Commands**:
    ```bash
    git checkout arushi
    git add client/src/pages/features/kindshare-new/
    git commit -m "Arushi [Day 2]: Add kindshare ngo web portal pages"
    git push origin arushi
    ```

#### 🌆 Evening: Shreyansh (Branch: `shreyansh`)
*   **Target Files/Folders**:
    *   `client/src/context/`
    *   `client/src/auth/`
*   **Git Commands**:
    ```bash
    git checkout shreyansh
    git add client/src/context/ client/src/auth/
    git commit -m "Shreyansh [Day 2]: Add client context providers and authentication components"
    git push origin shreyansh
    ```

#### 🌃 Night: Aryan (Branch: `aryan`)
*   **Target Files/Folders**:
    *   `client/src/firebase/` (Firebase client config setup)
    *   `client/src/lib/` (Auth0 Axios links, standard API requests wrapper)
*   **Git Commands**:
    ```bash
    git checkout aryan
    git add client/src/firebase/ client/src/lib/
    git commit -m "Aryan [Day 2]: Add client firebase integration and API middleware wrappers"
    git push origin aryan
    ```

---

### Day 3: June 18, 2026

#### 🌅 Morning: Ishwar (Branch: `ishwar`)
*   **Target Files/Folders**:
    *   `client/src/pages/CivicHub.jsx`
    *   `client/src/pages/fireAlert.jsx`
*   **Git Commands**:
    ```bash
    git checkout ishwar
    git add client/src/pages/CivicHub.jsx client/src/pages/fireAlert.jsx
    git commit -m "Ishwar [Day 3]: Add CivicHub and fireAlert web pages"
    git push origin ishwar
    ```

#### ☀️ Afternoon: Arushi (Branch: `arushi`)
*   **Target Files/Folders**:
    *   `client/src/pages/administration/KindShareAdmin.jsx`
*   **Git Commands**:
    ```bash
    git checkout arushi
    git add client/src/pages/administration/KindShareAdmin.jsx
    git commit -m "Arushi [Day 3]: Add KindShare Admin page"
    git push origin arushi
    ```

#### 🌆 Evening: Shreyansh (Branch: `shreyansh`)
*   **Target Files/Folders**:
    *   `client/src/components/Navbar.jsx`, `client/src/components/loginButton.jsx`, `client/src/components/CircularText.jsx`, `client/src/components/dashboard-map.jsx`, `client/src/pages/AboutUs.jsx`, `client/src/pages/Home.jsx`, `client/src/pages/Mission.jsx`, `client/src/pages/features.config.js`
*   **Git Commands**:
    ```bash
    git checkout shreyansh
    git add client/src/components/Navbar.jsx client/src/components/loginButton.jsx client/src/components/CircularText.jsx client/src/components/dashboard-map.jsx client/src/pages/AboutUs.jsx client/src/pages/Home.jsx client/src/pages/Mission.jsx client/src/pages/features.config.js
    git commit -m "Shreyansh [Day 3]: Add client common components and dashboards"
    git push origin shreyansh
    ```

#### 🌃 Night: Aryan (Branch: `aryan`)
*   **Target Files/Folders**:
    *   `client/src/pages/UserLiveTracking.jsx`
    *   `client/src/pages/administration/Administration.jsx`
    *   `client/src/pages/administration/SafetyReports.jsx`
    *   `client/src/pages/administration/CivicAnalytics.jsx`
*   **Git Commands**:
    ```bash
    git checkout aryan
    git add client/src/pages/UserLiveTracking.jsx client/src/pages/administration/Administration.jsx client/src/pages/administration/SafetyReports.jsx client/src/pages/administration/CivicAnalytics.jsx
    git commit -m "Aryan [Day 3]: Add admin panels and analytics views"
    git push origin aryan
    ```

---

### Day 4: June 19, 2026

#### 🌅 Morning: Ishwar (Branch: `ishwar`)
*   **Target Files/Folders**:
    *   `client/src/pages/staff/` (infra, water, fire, waste, electricity web interfaces)
    *   `client/src/pages/reports/` (web reports, track, user, garbage subpages)
*   **Git Commands**:
    ```bash
    git checkout ishwar
    git add client/src/pages/staff/ client/src/pages/reports/
    git commit -m "Ishwar [Day 4]: Add client staff action tools and report tracking dashboards"
    git push origin ishwar
    ```

#### ☀️ Afternoon: Arushi (Branch: `arushi`)
*   **Target Files/Folders**:
    *   `server/src/controllers/kindshare/` (NGO Controllers: requests, ngo feedback, donations)
    *   `server/src/controllers/donation.controller.js`
*   **Git Commands**:
    ```bash
    git checkout arushi
    git add server/src/controllers/kindshare/ server/src/controllers/donation.controller.js
    git commit -m "Arushi [Day 4]: Add backend controllers for KindShare and NGO donations"
    git push origin arushi
    ```

#### 🌆 Evening: Shreyansh (Branch: `shreyansh`)
*   **Target Files/Folders**:
    *   `client/src/pages/features/garbage/` (GarbageMap, Upload, cleanup verify UI)
    *   `client/src/pages/features/reports/` (WaterMap, report maps, forms)
*   **Git Commands**:
    ```bash
    git checkout shreyansh
    git add client/src/pages/features/garbage/ client/src/pages/features/reports/
    git commit -m "Shreyansh [Day 4]: Add client garbage and report submission features"
    git push origin shreyansh
    ```

#### 🌃 Night: Aryan (Branch: `aryan`)
*   **Target Files/Folders**:
    *   `client/src/store/` (Global auth states)
    *   `client/src/hooks/` (Reverse geocoding hooks, maps loading triggers, sentinel audio sentinel)
    *   `client/src/utils/` (userLocation map helpers, geocoding configs)
*   **Git Commands**:
    ```bash
    git checkout aryan
    git add client/src/store/ client/src/hooks/ client/src/utils/
    git commit -m "Aryan [Day 4]: Add web client custom hooks, state stores, and util helpers"
    git push origin aryan
    ```

---

### Day 5: June 20, 2026

#### 🌅 Morning: Ishwar (Branch: `ishwar`)
*   **Target Files/Folders**:
    *   `client/src/components/urbanFlow/` (UrbanFlow main dashboard view)
    *   `client/src/components/RegionSelector.jsx`
    *   `client/src/components/feature-panel.jsx`
    *   `client/src/components/google-map.jsx`
    *   `client/src/components/google-map1.jsx`
    *   `client/src/components/safety-onboarding.jsx`
    *   `client/src/components/NotificationFeed.jsx`
    *   `client/src/pages/administration/muncipal/` (Municipal action assignments and maps)
*   **Git Commands**:
    ```bash
    git checkout ishwar
    git add client/src/components/urbanFlow/ client/src/components/RegionSelector.jsx client/src/components/feature-panel.jsx client/src/components/google-map.jsx client/src/components/google-map1.jsx client/src/components/safety-onboarding.jsx client/src/components/NotificationFeed.jsx client/src/pages/administration/muncipal/
    git commit -m "Ishwar [Day 5]: Add common dashboard maps, selectors, onboarding widgets, and municipal pages"
    git push origin ishwar
    ```

#### ☀️ Afternoon: Arushi (Branch: `arushi`)
*   **Target Files/Folders**:
    *   `server/src/routes/kindshare/` (NGO endpoints)
    *   `server/src/routes/donation.routes.js`
    *   `server/src/services/kindshare/` (NGO DB transaction scripts, auto emailers)
*   **Git Commands**:
    ```bash
    git checkout arushi
    git add server/src/routes/kindshare/ server/src/routes/donation.routes.js server/src/services/kindshare/
    git commit -m "Arushi [Day 5]: Add KindShare NGO backend router and email/db services"
    git push origin arushi
    ```

#### 🌆 Evening: Shreyansh (Branch: `shreyansh`)
*   **Target Files/Folders**:
    *   `client/src/pages/features/jobs/` (StreetGig web client maps, job list cards)
*   **Git Commands**:
    ```bash
    git checkout shreyansh
    git add client/src/pages/features/jobs/
    git commit -m "Shreyansh [Day 5]: Add StreetGig client job listings and boards UI"
    git push origin shreyansh
    ```

#### 🌃 Night: Aryan (Branch: `aryan`)
*   **Target Files/Folders**:
    *   `client/src/pages/administration/DepartmentComplaintMap.jsx`
    *   `client/src/pages/administration/ComplaintsMapAdmin.jsx`
    *   `client/src/pages/administration/garbage/` (Garbage admin portals)
    *   `client/src/pages/administration/women/`
    *   `client/src/pages/administration/client__women_admin/`
    *   `client/src/components/gee/` (Google Earth Engine dashboard cards)
    *   `client/src/pages/features/women/` (Women features, Commute maps, SOS panel)
    *   `client/src/pages/administration/gee/` (GEE admin pages, charts, flood, deforestation maps)
*   **Git Commands**:
    ```bash
    git checkout aryan
    git add client/src/pages/administration/DepartmentComplaintMap.jsx client/src/pages/administration/ComplaintsMapAdmin.jsx client/src/pages/administration/garbage/ client/src/pages/administration/women/ client/src/pages/administration/client__women_admin/ client/src/components/gee/ client/src/pages/features/women/ client/src/pages/administration/gee/
    git commit -m "Aryan [Day 5]: Add department administration maps, women safety admin, GEE controls, and pages"
    git push origin aryan
    ```

---

### Day 6: June 21, 2026

#### 🌅 Morning: Ishwar (Branch: `ishwar`)
*   **Target Files/Folders**:
    *   `client-native/store/` (Mobile notification store, mobile authentication store)
    *   `client-native/auth/` (Expo Auth0 provider and logout helpers)
*   **Git Commands**:
    ```bash
    git checkout ishwar
    git add client-native/store/ client-native/auth/
    git commit -m "Ishwar [Day 6]: Add mobile client authentication state managers and stores"
    git push origin ishwar
    ```

#### ☀️ Afternoon: Arushi (Branch: `arushi`)
*   **Target Files/Folders**:
    *   `server/src/controllers/women/` (Women voice analysis, room triggers, SOS audio controllers: `voiceAnalysisController.js`, `voiceController.js`, `roomController.js`, `room_data.js`, `getalertdetails.js`)
    *   `client-native/app/kindshare/` (Mobile KindShare NGO portal: receiver categories, donor categorization, complaints, requests, feedback forms)
*   **Git Commands**:
    ```bash
    git checkout arushi
    git add server/src/controllers/women/voiceAnalysisController.js server/src/controllers/women/voiceController.js server/src/controllers/women/roomController.js server/src/controllers/women/room_data.js server/src/controllers/women/getalertdetails.js client-native/app/kindshare/
    git commit -m "Arushi [Day 6]: Add backend voice SOS, rooms controllers and mobile KindShare pages"
    git push origin arushi
    ```

#### 🌆 Evening: Shreyansh (Branch: `shreyansh`)
*   **Target Files/Folders**:
    *   `client-native/package.json`
    *   `client-native/package-lock.json`
    *   `client-native/metro.config.js`
    *   `client-native/babel.config.js`
    *   `client-native/tsconfig.json`
    *   `client-native/eslint.config.js`
    *   `client-native/nativewind-env.d.ts`
    *   `client-native/app.json`
    *   `client-native/eas.json`
    *   `client-native/requirement.txt`
    *   `client-native/.gitignore`
    *   `client-native/README.md`
    *   `client-native/example.env`
    *   `client-native/tailwind.config.js`
*   **Git Commands**:
    ```bash
    git checkout shreyansh
    git add client-native/package.json client-native/package-lock.json client-native/metro.config.js client-native/babel.config.js client-native/tsconfig.json client-native/eslint.config.js client-native/nativewind-env.d.ts client-native/app.json client-native/eas.json client-native/requirement.txt client-native/.gitignore client-native/README.md client-native/example.env client-native/tailwind.config.js
    git commit -m "Shreyansh [Day 6]: Add native app configs, tsconfigs, and dependencies list"
    git push origin shreyansh
    ```

#### 🌃 Night: Aryan (Branch: `aryan`)
*   **Target Files/Folders**:
    *   `client-native/lib/` (Auth0 client native bindings, API request setups, native firebase connector)
    *   `client-native/utils/` (Mobile geo coordinates solver, schemes settings)
    *   `client-native/assets/` (Mobile UI images and map icons)
*   **Git Commands**:
    ```bash
    git checkout aryan
    git add client-native/lib/ client-native/utils/ client-native/assets/
    git commit -m "Aryan [Day 6]: Add native helper libraries, geocoding utils, and local assets/icons"
    git push origin aryan
    ```

---

### Day 7: June 22, 2026

#### 🌅 Morning: Ishwar (Branch: `ishwar`)
*   **Target Files/Folders**:
    *   `server/src/controllers/complaint.controller.js`
    *   `server/src/controllers/complaintStats.controller.js`
    *   `server/src/controllers/complaintHistory.controller.js`
*   **Git Commands**:
    ```bash
    git checkout ishwar
    git add server/src/controllers/complaint.controller.js server/src/controllers/complaintStats.controller.js server/src/controllers/complaintHistory.controller.js
    git commit -m "Ishwar [Day 7]: Add backend handlers for complaints submission, stats and histories"
    git push origin ishwar
    ```

#### ☀️ Afternoon: Arushi (Branch: `arushi`)
*   **Target Files/Folders**:
    *   `server/src/routes/voiceRoutes.js`
    *   `server/src/routes/room.js`
*   **Git Commands**:
    ```bash
    git checkout arushi
    git add server/src/routes/voiceRoutes.js server/src/routes/room.js
    git commit -m "Arushi [Day 7]: Add voice analysis API endpoints and rooms routing"
    git push origin arushi
    ```

#### 🌆 Evening: Shreyansh (Branch: `shreyansh`)
*   **Target Files/Folders**:
    *   `client-native/app/index.jsx`
    *   `client-native/app/(main)/index.jsx`
    *   `client-native/app/(main)/(tabs)/_layout.jsx`
    *   `client-native/app/_layout.jsx`
    *   `client-native/app/(main)/_layout.jsx`
    *   `client-native/app/about.jsx`
    *   `client-native/app/global.css`
    *   `client-native/app/mission.jsx`
*   **Git Commands**:
    ```bash
    git checkout shreyansh
    git add client-native/app/index.jsx client-native/app/(main)/index.jsx client-native/app/(main)/(tabs)/_layout.jsx client-native/app/_layout.jsx client-native/app/(main)/_layout.jsx client-native/app/about.jsx client-native/app/global.css client-native/app/mission.jsx
    git commit -m "Shreyansh [Day 7]: Add mobile main layouts, root configurations, about and mission pages"
    git push origin shreyansh
    ```

#### 🌃 Night: Aryan (Branch: `aryan`)
*   **Target Files/Folders**:
    *   `server/package.json`
    *   `server/package-lock.json`
    *   `server/index.js`
    *   `server/app.js`
    *   `server/example.env`
    *   `server/requirements.txt`
    *   `server/serviceAccountKey.json`
    *   `server/.vscode`
    *   `server/config/cloudinary.js`
    *   `server/config/env.js`
    *   `server/uploads/`
*   **Git Commands**:
    ```bash
    git checkout aryan
    git add server/package.json server/package-lock.json server/index.js server/app.js server/example.env server/requirements.txt server/serviceAccountKey.json server/.vscode server/config/cloudinary.js server/config/env.js server/uploads/
    git commit -m "Aryan [Day 7]: Add backend entry points, env files, vscode configurations, and uploads"
    git push origin aryan
    ```

---

### Day 8: June 23, 2026

#### 🌅 Morning: Ishwar (Branch: `ishwar`)
*   **Target Files/Folders**:
    *   `server/src/controllers/saveReports/` (Report save, admin fire history logs, water/waste checks: `saveFireReport.js`, `fetchAdminFireHistory.js`, `localityCheck/infraCheck.js`, `localityCheck/wasteCheck.js`, `localityCheck/waterCheck.js`, `localityCheck/electrictiyCheck.js`)
    *   `server/src/controllers/fetchReports/` (`fetch3Reports.js`)
    *   `server/src/controllers/report/report.controller.js`
    *   `server/src/controllers/user/getRepots.js`
*   **Git Commands**:
    ```bash
    git checkout ishwar
    git add server/src/controllers/saveReports/ server/src/controllers/fetchReports/ server/src/controllers/report/report.controller.js server/src/controllers/user/getRepots.js
    git commit -m "Ishwar [Day 8]: Add report database saving endpoints, report controllers and user report retrievers"
    git push origin ishwar
    ```

#### ☀️ Afternoon: Arushi (Branch: `arushi`)
*   **Target Files/Folders**:
    *   `agents/brain/vyomai/tools/kindshare.py`
    *   `agents/test_kindshare_tools.py`
*   **Git Commands**:
    ```bash
    git checkout arushi
    git add agents/brain/vyomai/tools/kindshare.py agents/test_kindshare_tools.py
    git commit -m "Arushi [Day 8]: Add KindShare tool integrations for vyomai LLM agent"
    git push origin arushi
    ```

#### 🌆 Evening: Shreyansh (Branch: `shreyansh`)
*   **Target Files/Folders**:
    *   `client-native/app/(main)/(tabs)/StreetGig/` (StreetGig citizen jobs, Chats list, create listings, profile setups)
*   **Git Commands**:
    ```bash
    git checkout shreyansh
    git add client-native/app/(main)/(tabs)/StreetGig/
    git commit -m "Shreyansh [Day 8]: Add mobile StreetGig job listing components and forms"
    git push origin shreyansh
    ```

#### 🌃 Night: Aryan (Branch: `aryan`)
*   **Target Files/Folders**:
    *   `server/src/firebaseadmin/` (Node.js Firebase Admin wrapper setup)
    *   `server/src/config/` (MongoDB connection hooks, Redis caching wrapper client)
    *   `server/src/auth/` (Passport / JWToken auth verify middleware)
    *   `server/src/utils/` (Server helper files: `uploadToFirebase.js`, `sendEmail.js`, `apiResponse.js`, `apiError.js`, `aysncHandler.js`, `uploadVoiceCloudinary.js`, `cronJobs.js`, `pushNotification.js`, `startQueueWorker.js`, `uploadCloudinary.js`)
    *   `server/middlewares/upload.js`
*   **Git Commands**:
    ```bash
    git checkout aryan
    git add server/src/firebaseadmin/ server/src/config/ server/src/auth/ server/src/utils/ server/middlewares/upload.js
    git commit -m "Aryan [Day 8]: Add firebase admin initialization, database links, auth middlewares, and common utils"
    git push origin aryan
    ```

---

### Day 9: June 24, 2026

#### 🌅 Morning: Ishwar (Branch: `ishwar`)
*   **Target Files/Folders**:
    *   `server/src/controllers/updateReports/` (Updates for: fireUpdate, wasteUpdate, electricityUpdate, infraUpdate, waterUpdate)
    *   `server/src/controllers/localityCheck/` (Validation: infraCheck, wasteCheck, waterCheck, electrictiyCheck)
*   **Git Commands**:
    ```bash
    git checkout ishwar
    git add server/src/controllers/updateReports/ server/src/controllers/localityCheck/
    git commit -m "Ishwar [Day 9]: Add report update controllers and geo-locality validation systems"
    git push origin ishwar
    ```

#### ☀️ Afternoon: Arushi (Branch: `arushi`)
*   **Target Files/Folders**:
    *   `agents/brain/voice_analysis_agent.py`
*   **Git Commands**:
    ```bash
    git checkout arushi
    git add agents/brain/voice_analysis_agent.py
    git commit -m "Arushi [Day 9]: Add voice pattern and signal analysis agent pipeline"
    git push origin arushi
    ```

#### 🌆 Evening: Shreyansh (Branch: `shreyansh`)
*   **Target Files/Folders**:
    *   `client-native/app/(main)/(tabs)/CivicConnect/`
    *   `client-native/app/(main)/(tabs)/urbanconnect/` (Post creation, comment sheets, explore channels)
*   **Git Commands**:
    ```bash
    git checkout shreyansh
    git add client-native/app/(main)/(tabs)/CivicConnect/ client-native/app/(main)/(tabs)/urbanconnect/
    git commit -m "Shreyansh [Day 9]: Add mobile CivicConnect and urbanconnect feed pages"
    git push origin shreyansh
    ```

#### 🌃 Night: Aryan (Branch: `aryan`)
*   **Target Files/Folders**:
    *   `server/src/alerts/` (Coastal, deforestation, pollutants, flood, heat alarm triggers)
    *   `server/src/controllers/gee/` (Google Earth Engine Landsat/Sentinel trackers)
    *   `server/src/controllers/aiReports/` (AI analysis: auto-dispatch, fireReports, uncertainReports, infra/waste/water/electricity reports)
*   **Git Commands**:
    ```bash
    git checkout aryan
    git add server/src/alerts/ server/src/controllers/gee/ server/src/controllers/aiReports/
    git commit -m "Aryan [Day 9]: Add satellite GEE alerts processors and auto-dispatch logic"
    git push origin aryan
    ```

---

### Day 10: June 25, 2026

#### 🌅 Morning: Ishwar (Branch: `ishwar`)
*   **Target Files/Folders**:
    *   `server/src/controllers/urbanconnect.controller.js`
    *   `server/src/controllers/urbanconnect/` (CityPulse, Announcements feed, post clustering controllers)
*   **Git Commands**:
    ```bash
    git checkout ishwar
    git add server/src/controllers/urbanconnect.controller.js server/src/controllers/urbanconnect/
    git commit -m "Ishwar [Day 10]: Add urbanconnect pulse analysis and community feed managers"
    git push origin ishwar
    ```

#### ☀️ Afternoon: Arushi (Branch: `arushi`)
*   **Target Files/Folders**:
    *   NGO / Voice SOS check validation
*   **Git Commands**:
    ```bash
    git checkout arushi
    git commit --allow-empty -m "Arushi [Day 10]: Verify all KindShare and NGO web/server files are in place"
    git push origin arushi
    ```

#### 🌆 Evening: Shreyansh (Branch: `shreyansh`)
*   **Target Files/Folders**:
    *   `client-native/components/` (Common UI items, FAB icons, features maps and complaint cards)
    *   `client-native/app-example/` (Native boilerplate examples)
*   **Git Commands**:
    ```bash
    git checkout shreyansh
    git add client-native/components/ client-native/app-example/
    git commit -m "Shreyansh [Day 10]: Add mobile common custom components, FABs, and boilerplates"
    git push origin shreyansh
    ```

#### 🌃 Night: Aryan (Branch: `aryan`)
*   **Target Files/Folders**:
    *   `server/src/controllers/women/` (Women safety: `throttle_agent.js`, `throttle_room.js`, `agent2.js`, `women_model_layer1.js`, `log-sos.js`, `log-suspicious.js`) - *staged as specific files to avoid overlapping with Arushi's controllers.*
    *   `server/src/controllers/user.controller.js`
    *   `server/src/controllers/chat.controller.js`
    *   `server/src/controllers/interest.controller.js`
*   **Git Commands**:
    ```bash
    git checkout aryan
    git add server/src/controllers/women/throttle_agent.js server/src/controllers/women/throttle_room.js server/src/controllers/women/agent2.js server/src/controllers/women/women_model_layer1.js server/src/controllers/women/log-sos.js server/src/controllers/women/log-suspicious.js server/src/controllers/user.controller.js server/src/controllers/chat.controller.js server/src/controllers/interest.controller.js
    git commit -m "Aryan [Day 10]: Add women safety SOS logger, and main user, chat, interest controllers"
    git push origin aryan
    ```

---

### Day 11: June 26, 2026

#### 🌅 Morning: Ishwar (Branch: `ishwar`)
*   **Target Files/Folders**:
    *   `server/src/routes/complaint.routes.js`
    *   `server/src/routes/complaintStats.routes.js`
    *   `server/src/routes/complaintHistory.routes.js`
    *   `server/src/routes/urbanconnect.route.js`
    *   `server/src/routes/cityPulse.routes.js`
    *   `server/src/routes/announcement.routes.js`
    *   `server/src/routes/mapReports.js`
    *   `server/src/routes/garbageReports.js`
    *   `server/src/routes/locality.routes.js`
    *   `server/src/routes/setalertsRoutes.js`
    *   `server/src/models/urbanconnect/` (Social pulse schemas)
*   **Git Commands**:
    ```bash
    git checkout ishwar
    git add server/src/routes/complaint.routes.js server/src/routes/complaintStats.routes.js server/src/routes/complaintHistory.routes.js server/src/routes/urbanconnect.route.js server/src/routes/cityPulse.routes.js server/src/routes/announcement.routes.js server/src/routes/mapReports.js server/src/routes/garbageReports.js server/src/routes/locality.routes.js server/src/routes/setalertsRoutes.js server/src/models/urbanconnect/
    git commit -m "Ishwar [Day 11]: Add backend complaint and urbanconnect routes and models"
    git push origin ishwar
    ```

#### ☀️ Afternoon: Arushi (Branch: `arushi`)
*   **Target Files/Folders**:
    *   NGO/Voice SOS routes final verification
*   **Git Commands**:
    ```bash
    git checkout arushi
    git commit --allow-empty -m "Arushi [Day 11]: Final check of NGO controllers, routes, and services"
    git push origin arushi
    ```

#### 🌆 Evening: Shreyansh (Branch: `shreyansh`)
*   **Target Files/Folders**:
    *   `server/src/controllers/garbage.controller.js`
    *   `server/src/controllers/blocks.controller.js`
    *   `server/src/routes/garbage.route.js`
    *   `server/src/routes/blocks.route.js`
    *   `server/src/routes/waste.route.js`
    *   `server/src/routes/job.route.js`
    *   `server/src/services/garbage.service.js`
*   **Git Commands**:
    ```bash
    git checkout shreyansh
    git add server/src/controllers/garbage.controller.js server/src/controllers/blocks.controller.js server/src/routes/garbage.route.js server/src/routes/blocks.route.js server/src/routes/waste.route.js server/src/routes/job.route.js server/src/services/garbage.service.js
    git commit -m "Shreyansh [Day 11]: Add backend garbage, waste, job boards and blocks controllers, services, and routes"
    git push origin shreyansh
    ```

#### 🌃 Night: Aryan (Branch: `aryan`)
*   **Target Files/Folders**:
    *   Server routes: `geeRoutes.js`, `model.js`, `chat.routes.js`, `interest.routes.js`, `auth.js`, `report.routes.js`, `staff.js`, `user.routes.js`, `track.route.js`, `notification.route.js`, `departmentMap.routes.js`, `civicAnalytics.routes.js`
    *   GEE Engine scripts: `server/src/gee/` (deforestation, pollutants, flood, coastal erosion, fire viirs monitor)
    *   Core services and crons: `server/src/services/` (`syncReportStatus.js`, `uploadImage.js`, `autoDispatch.js`, `civicSyndication.js`), `server/src/cron/` (`autoDispatchCron.js`)
    *   Server administration and staff handlers: `server/src/controllers/track/`, `server/src/controllers/notification/`, `server/src/controllers/administration/`, `server/src/controllers/staff/`
*   **Git Commands**:
    ```bash
    git checkout aryan
    git add server/src/routes/geeRoutes.js server/src/routes/model.js server/src/routes/chat.routes.js server/src/routes/interest.routes.js server/src/routes/auth.js server/src/routes/report.routes.js server/src/routes/user.routes.js server/src/routes/track.route.js server/src/routes/staff.js server/src/routes/notification.route.js server/src/routes/departmentMap.routes.js server/src/routes/civicAnalytics.routes.js server/src/gee/ server/src/services/syncReportStatus.js server/src/services/uploadImage.js server/src/services/autoDispatch.js server/src/services/civicSyndication.js server/src/cron/ server/src/controllers/track/ server/src/controllers/notification/ server/src/controllers/administration/ server/src/controllers/staff/
    git commit -m "Aryan [Day 11]: Add server routing for GEE, chat, users, tracking, notification, and services/crons"
    git push origin aryan
    ```

---

### Day 12: June 27, 2026

#### 🌅 Morning: Ishwar (Branch: `ishwar`)
*   **Target Files/Folders**:
    *   `agents/brain/civicconnect/` (CivicConnect AI agents, waste, water, infra agents)
    *   `agents/brain/urbanconnect/` (UrbanConnect clustering and Pulse checking AI agents)
    *   `agents/brain/resolveWasteAgent.py`
*   **Git Commands**:
    ```bash
    git checkout ishwar
    git add agents/brain/civicconnect/ agents/brain/urbanconnect/ agents/brain/resolveWasteAgent.py
    git commit -m "Ishwar [Day 12]: Add CivicConnect and UrbanConnect AI agent logic and scrapers"
    git push origin ishwar
    ```

#### ☀️ Afternoon: Arushi (Branch: `arushi`)
*   **Target Files/Folders**:
    *   Final verify
*   **Git Commands**:
    ```bash
    git checkout arushi
    git commit --allow-empty -m "Arushi [Day 12]: Verify branch and prepare for merge to main"
    git push origin arushi
    ```

#### 🌆 Evening: Shreyansh (Branch: `shreyansh`)
*   **Target Files/Folders**:
    *   Final verify
*   **Git Commands**:
    ```bash
    git checkout shreyansh
    git commit --allow-empty -m "Shreyansh [Day 12]: Verify branch and prepare for merge to main"
    git push origin shreyansh
    ```

#### 🌃 Night: Aryan (Branch: `aryan`)
*   **Target Files/Folders**:
    *   Mobile applications features: `client-native/app/(main)/(tabs)/SisterHood/`, `client-native/app/(main)/fire-staff/`, `client-native/app/(main)/track/[id].jsx`
    *   Agents core setup configurations: `agents/.gitignore`, `agents/.vscode`, `agents/example.env`, `agents/requirements.txt`, `agents/main.py`, `agents/test_api.py`, `agents/test_embed.py`, `agents/scripts/`
    *   AI agents scripts: `agents/brain/__init__.py`, `agents/brain/agent3.py`, `agents/brain/embedding_agent.py`, `agents/brain/safety_agent.py`, `agents/brain/vyomai/__init__.py`, `agents/brain/vyomai/agent.py`, `agents/brain/vyomai/state.py`, `agents/brain/vyomai/tools/general.py`, `agents/brain/vyomai/tools/__init__.py`, `agents/brain/vyomai/tools/_constants.py`, `agents/brain/vyomai/tools/_http.py`, `agents/brain/vyomai/tools/civic.py`, `agents/brain/vyomai/tools/streetgig.py`, `agents/brain/vyomai/__pycache__/`, `agents/brain/vyomai/tools/__pycache__/`, `agents/brain/streetgig/`, `agents/brain/gee/`, `agents/brain/layel_1.py`, `agents/brain/layel_2.py`
    *   Server testing setups: `server/seedAnnouncements.js`, `server/testSearch.js`, `server/testSearchBehavior.js`, `server/testRawAuthors.js`, `server/testQuestionVote.js`, `server/testDisplay.js`, `server/testFixAuthors.js`, `server/testProfile.js`, `server/testVote.js`, `server/testPopulation.js`, `server/testAdminData.js`
*   **Git Commands**:
    ```bash
    git checkout aryan
    git add client-native/app/(main)/(tabs)/SisterHood/ client-native/app/(main)/fire-staff/ client-native/app/(main)/track/[id].jsx agents/.gitignore agents/.vscode agents/example.env agents/requirements.txt agents/main.py agents/test_api.py agents/test_embed.py agents/scripts/ agents/brain/__init__.py agents/brain/agent3.py agents/brain/embedding_agent.py agents/brain/safety_agent.py agents/brain/vyomai/__init__.py agents/brain/vyomai/agent.py agents/brain/vyomai/state.py agents/brain/vyomai/tools/general.py agents/brain/vyomai/tools/__init__.py agents/brain/vyomai/tools/_constants.py agents/brain/vyomai/tools/_http.py agents/brain/vyomai/tools/civic.py agents/brain/vyomai/tools/streetgig.py agents/brain/vyomai/__pycache__/ agents/brain/vyomai/tools/__pycache__/ agents/brain/streetgig/ agents/brain/gee/ agents/brain/layel_1.py agents/brain/layel_2.py server/seedAnnouncements.js server/testSearch.js server/testSearchBehavior.js server/testRawAuthors.js server/testQuestionVote.js server/testDisplay.js server/testFixAuthors.js server/testProfile.js server/testVote.js server/testPopulation.js server/testAdminData.js
    git commit -m "Aryan [Day 12]: Add SisterHood, fire-staff mobile apps, GEE/StreetGig AI agents, and server test scripts"
    git push origin aryan
    ```

---

## Post-Migration Merging (End of Day 12)

Once all time slots are completed, merge all four branches into the main branch sequentially to combine all components. Aryan will run the following commands:

```bash
git checkout main
git merge ishwar --no-ff -m "Merge branch 'ishwar' into main"
git merge arushi --no-ff -m "Merge branch 'arushi' into main"
git merge shreyansh --no-ff -m "Merge branch 'shreyansh' into main"
git merge aryan --no-ff -m "Merge branch 'aryan' into main"
git push origin main
```
