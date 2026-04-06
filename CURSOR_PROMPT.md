# MamaAlert — Cursor Implementation Prompt

> **Read CONTEXT.md and rules.md before writing a single line of code.**
> Every architectural decision, naming convention, and constraint is defined there.
> This file tells you WHAT to build. Those files tell you HOW to build it.

---

## Project Summary

Build **MamaAlert** — a life-critical maternal emergency PWA. A pregnant woman taps one button → volunteers within 5km get SMS alerts → nearest clinic gets pre-alerted → family gets status updates. Works offline, works on feature phones via USSD, works for blind users via IVR voice.

**Stack:** React 18 + Vite + TypeScript (strict) + Tailwind + shadcn/ui + Node.js + Express + Supabase + PostGIS + Twilio + Africa's Talking + Leaflet + i18next. Deployed to Vercel (client) + Railway (server).

---

## Phase 0 — Project Scaffolding

> Complete this phase entirely before touching any feature code.

### 0.1 — Monorepo Init

```bash
mkdir mamaalert && cd mamaalert
git init
echo "node_modules\n.env\ndist\n.DS_Store" > .gitignore
mkdir client server supabase .github/workflows
```

### 0.2 — Client Scaffold

```bash
cd client
npm create vite@latest . -- --template react-ts
npm install
npm install react-router-dom @supabase/supabase-js
npm install react-leaflet leaflet
npm install i18next react-i18next i18next-browser-languagedetector
npm install axios idb
npm install -D tailwindcss postcss autoprefixer vite-plugin-pwa workbox-window
npm install -D @types/leaflet
npx tailwindcss init -p
npx shadcn-ui@latest init
```

**shadcn init options:**
- Style: Default
- Base color: Slate
- CSS variables: Yes

**Install shadcn components needed:**
```bash
npx shadcn-ui@latest add button card badge alert dialog sheet toast
npx shadcn-ui@latest add input label select textarea form
npx shadcn-ui@latest add table dropdown-menu separator skeleton
```

### 0.3 — Server Scaffold

```bash
cd ../server
npm init -y
npm install express cors helmet express-rate-limit dotenv
npm install @supabase/supabase-js twilio africastalking
npm install jsonwebtoken bcrypt zod
npm install -D typescript ts-node-dev @types/express @types/node
npm install -D @types/jsonwebtoken @types/bcrypt @types/cors
npx tsc --init
```

### 0.4 — TypeScript Config

**client/tsconfig.json:**
```json
{
  "compilerOptions": {
    "target": "ES2020",
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitReturns": true,
    "baseUrl": ".",
    "paths": { "@/*": ["./src/*"] }
  },
  "include": ["src"]
}
```

**server/tsconfig.json:**
```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "CommonJS",
    "lib": ["ES2020"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitReturns": true,
    "esModuleInterop": true,
    "resolveJsonModule": true,
    "skipLibCheck": true,
    "baseUrl": ".",
    "paths": { "@/*": ["./src/*"] }
  },
  "include": ["src"],
  "exclude": ["node_modules", "dist"]
}
```

### 0.5 — Vite Config

**client/vite.config.ts:**
```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import path from 'path';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'icon-192.png', 'icon-512.png'],
      manifest: {
        name: 'MamaAlert',
        short_name: 'MamaAlert',
        description: 'Maternal emergency alert system',
        theme_color: '#DC2626',
        background_color: '#ffffff',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        icons: [
          { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/tile\.openstreetmap\.org/,
            handler: 'CacheFirst',
            options: { cacheName: 'osm-tiles', expiration: { maxEntries: 500, maxAgeSeconds: 604800 } },
          },
        ],
      },
    }),
  ],
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
});
```

### 0.6 — Folder Structure

Create all these empty folders and placeholder index files:

```
client/src/
├── views/
│   ├── PatientSOS.tsx
│   ├── VolunteerDashboard.tsx
│   ├── HospitalInbox.tsx
│   ├── HealthWorkerRegister.tsx
│   ├── HealthWorkerDashboard.tsx
│   ├── FamilyStatus.tsx
│   ├── AdminZone.tsx
│   └── DemoFlow.tsx
├── components/
│   ├── ui/              ← shadcn auto-generates this
│   ├── SOSButton.tsx
│   ├── AlertCard.tsx
│   ├── PatientCard.tsx
│   ├── VolunteerCard.tsx
│   ├── MapView.tsx
│   ├── StatusBadge.tsx
│   ├── LoadingSpinner.tsx
│   └── ErrorMessage.tsx
├── hooks/
│   ├── useGeolocation.ts
│   ├── useRealtimeAlerts.ts
│   ├── useOfflineQueue.ts
│   └── useAuth.ts
├── services/
│   ├── supabase.ts
│   ├── api.ts
│   ├── offline.ts
│   └── geolocation.ts
├── i18n/
│   ├── index.ts
│   └── locales/
│       ├── en.json
│       ├── hi.json
│       ├── fr.json
│       ├── sw.json
│       ├── ar.json
│       └── pt.json
├── types/
│   ├── patient.ts
│   ├── volunteer.ts
│   ├── hospital.ts
│   ├── alert.ts
│   ├── healthWorker.ts
│   ├── zone.ts
│   └── api.ts
├── App.tsx
└── main.tsx

server/src/
├── routes/
│   ├── sos.ts
│   ├── smsReply.ts
│   ├── ussd.ts
│   ├── register.ts
│   ├── alerts.ts
│   ├── auth.ts
│   └── status.ts
├── services/
│   ├── supabase.ts
│   ├── twilio.ts
│   ├── africasTalking.ts
│   ├── geo.ts
│   ├── escalation.ts
│   └── messageBuilder.ts
├── middleware/
│   ├── auth.ts
│   ├── twilioValidate.ts
│   └── rateLimiter.ts
├── types/
│   ├── patient.ts
│   ├── volunteer.ts
│   ├── alert.ts
│   └── api.ts
└── index.ts
```

### 0.7 — Environment Files

Create `.env.example` in both `client/` and `server/` with all required keys (values empty). Create actual `.env` files and add to `.gitignore`.

---

## Phase 1 — Database Foundation

> Run these SQL files in Supabase SQL editor in order: schema → functions → seed.

### 1.1 — supabase/schema.sql

Write the complete schema exactly as defined in the system documentation:

- Enable `postgis` extension
- Create tables: `zones`, `health_workers`, `patients`, `volunteers`, `hospitals`, `alerts`, `alert_responses`
- All location columns use `GEOGRAPHY(POINT, 4326)`
- Create GIST indexes on all location columns
- Enable Row-Level Security on `patients`, `alerts`, `alert_responses`
- Write RLS policies:
  - `health_workers_see_own_patients` — patients where `health_worker_id = auth.uid()`
  - `admin_zone_access` — admins see all patients in their zone
  - `alert_access` — alerts visible to responding volunteer or any health worker
- Add `updated_at` triggers on `patients` and `alerts` tables
- Add `status_token` column to `patients` (UUID, unique) for family status page

### 1.2 — supabase/functions.sql

Write these PostgreSQL stored functions:

**`get_nearby_volunteers(patient_lat, patient_lng, radius_meters)`**
- Returns: `id, name, phone, skills, vehicle, distance_m, language`
- Filters: `is_active = TRUE` and within radius
- Orders: by `distance_m ASC`
- Uses `ST_DWithin` + `ST_Distance` on GEOGRAPHY columns

**`get_nearby_hospitals(patient_lat, patient_lng, radius_meters)`**
- Returns: `id, name, phone_emergency, services, is_24hr, distance_m`
- Filters: `receive_alerts = TRUE` and within radius
- Orders: by `distance_m ASC`
- Limit: 1 (nearest only for pre-alert)

### 1.3 — supabase/seed.sql

Insert demo data for hackathon:

```sql
-- Demo zone
INSERT INTO zones (id, name, admin_org) VALUES
  ('00000000-0000-0000-0000-000000000001', 'Demo Zone', 'GNEC Demo NGO');

-- Demo hospital (PHC)
INSERT INTO hospitals (name, type, location, phone_main, phone_emergency, services, is_24hr, receive_alerts, zone_id)
VALUES (
  'PHC Demo Clinic',
  'PHC',
  ST_GeographyFromText('POINT(73.8567 18.5204)'),
  '+1234567890',
  '+1234567891',
  ARRAY['normal_delivery', 'blood_bank'],
  TRUE, TRUE,
  '00000000-0000-0000-0000-000000000001'
);

-- 3 demo volunteers at different distances from patient
INSERT INTO volunteers (name, phone, location, skills, vehicle, is_active, max_radius_km, language, zone_id)
VALUES
  ('Ravi Kumar', '+[YOUR_TEST_PHONE_1]', ST_GeographyFromText('POINT(73.8590 18.5251)'), ARRAY['first_aid'], 'motorcycle', TRUE, 5, 'en', '00000000-0000-0000-0000-000000000001'),
  ('Sister Agnes', '+[YOUR_TEST_PHONE_2]', ST_GeographyFromText('POINT(73.8601 18.5180)'), ARRAY['nurse'], 'none', TRUE, 5, 'en', '00000000-0000-0000-0000-000000000001'),
  ('Kofi Adu', '+[YOUR_TEST_PHONE_3]', ST_GeographyFromText('POINT(73.9100 18.5390)'), ARRAY['community_health_worker'], 'car', TRUE, 10, 'en', '00000000-0000-0000-0000-000000000001');

-- Demo patient (use a real phone number you control for demo)
INSERT INTO patients (name, age, phone_primary, location, village, landmark, weeks_pregnant, due_date, blood_type, language, status_token)
VALUES (
  'Priya Sharma',
  24,
  '+[YOUR_PATIENT_DEMO_PHONE]',
  ST_GeographyFromText('POINT(73.8567 18.5204)'),
  'Demo Village',
  'Near the temple',
  38,
  CURRENT_DATE + INTERVAL '2 weeks',
  'B+',
  'en',
  'demo-status-token-abc123'
);
```

---

## Phase 2 — Backend Core

> Build the Express server. Every route must be working and tested before Phase 3.

### 2.1 — server/src/index.ts

```typescript
// Startup validation → middleware setup → route mounting → server listen
// Order: env validation → express init → helmet → cors → rateLimit → json parser → routes → error handler
// Port from process.env.PORT with fallback to 3000
// Log "MamaAlert server running on port X" on start
```

Build this file with:
- Env var validation for all required keys (crash if missing)
- `helmet()` for security headers
- `cors()` whitelisted to `CLIENT_URL`
- `express.json()` body parser
- `express.urlencoded({ extended: true })` for Twilio webhook form data
- Mount all routes under `/api/*`
- Global error handler at bottom

### 2.2 — server/src/services/supabase.ts

Single `supabaseAdmin` client using service role key. Export typed client.

### 2.3 — server/src/services/twilio.ts

Export these functions:
- `sendSMS(to: string, body: string): Promise<void>`
- `sendVoiceConfirmation(to: string, message: string): Promise<void>` — IVR for visually impaired
- `validateWebhookSignature(req): boolean`

### 2.4 — server/src/services/africasTalking.ts

Export these functions:
- `sendSMS(to: string, message: string): Promise<void>` — Africa fallback
- `handleUSSDSession(sessionId: string, phoneNumber: string, text: string): string` — returns USSD response string

### 2.5 — server/src/services/messageBuilder.ts

Export these functions (all accept `lang: string = 'en'`):
- `buildVolunteerAlertSMS(patient, volunteer, alert, lang): string`
- `buildVolunteerDirectionsSMS(patient, volunteer, hospital, lang): string`
- `buildPatientConfirmationSMS(volunteerName: string, lang): string`
- `buildFamilySMS(patient, volunteerName: string, token: string, lang): string`
- `buildClinicPreAlertSMS(patient, volunteer, etaMinutes: number, lang): string`
- `buildCoordinatorEscalationSMS(patient, alertId: string, minutesSince: number, lang): string`

All messages must be under 160 characters (one SMS unit). Test each one.

### 2.6 — server/src/services/geo.ts

Export:
- `getNearbyVolunteers(lat: number, lng: number, radiusMeters: number): Promise<Volunteer[]>`
- `getNearbyHospital(lat: number, lng: number): Promise<Hospital | null>`

Both use the Supabase `.rpc()` stored functions from Phase 1.

### 2.7 — server/src/services/escalation.ts

Export:
- `scheduleEscalation(alertId: string, patientId: string, wave: number): void`

Logic:
- Wave 0: wait 5 min → check if `alerts.status` is still `active` → if yes, run Wave 1
- Wave 1: query volunteers at 10km, filter out already-contacted, SMS new ones, update priority to 2, SMS coordinator, schedule Wave 2
- Wave 2: query at 20km, filter, SMS new ones, update priority to 3, SMS coordinator with escalation message, no more waves — log as critical
- Use `setTimeout` for hackathon. Add a note: production would use a job queue (Bull/BullMQ)

### 2.8 — server/src/routes/sos.ts

`POST /api/sos`

Full implementation:
1. Validate payload with Zod: `{ phone: string, triggerMethod: 'pwa' | 'sms' | 'ussd' }`
2. Find patient by `phone_primary` — return 404 if not found
3. Check for active alert on this patient — prevent duplicate alerts within 10 min
4. Create alert record with status `active`, priority `1`
5. Call `getNearbyVolunteers(lat, lng, 5000)`
6. If 0 volunteers found at 5km → immediately try 10km (log this)
7. For each volunteer: insert `alert_responses` row, send SMS via Twilio
8. Schedule escalation timer: `scheduleEscalation(alert.id, patient.id, 0)`
9. Detect incapacitation: if `triggerMethod === 'ussd'` with single keypress, set flag
10. Return `{ success: true, alertId, volunteersNotified: number }`

Apply `sosRateLimit` middleware (3 requests per minute per IP).

### 2.9 — server/src/routes/smsReply.ts

`POST /api/sms-reply` (Twilio webhook)

1. Apply `validateTwilioSignature` middleware
2. Parse `req.body.From` (volunteer phone) and `req.body.Body` (YES/NO)
3. Find volunteer by phone
4. Find their most recent `alert_responses` row with `response = null`
5. If body is `YES`:
   - Update `alert_responses`: `response = 'YES'`, `responded_at = NOW()`
   - Update `alerts`: `status = 'volunteer_responding'`, `responding_volunteer_id`, `volunteer_confirmed_at`
   - Send volunteer directions SMS (include patient landmark + hospital name + blood type)
   - Send patient confirmation SMS
   - Send family notification SMS to all emergency contacts
   - Send clinic pre-alert SMS to nearest hospital
   - Trigger Supabase real-time update (update the alert row — real-time subscribers auto-receive)
6. If body is `NO`:
   - Update `alert_responses`: `response = 'NO'`, `responded_at = NOW()`
   - No further action (escalation timer handles next steps)
7. Return TwiML `<Response></Response>` (empty response to Twilio)

### 2.10 — server/src/routes/ussd.ts

`POST /api/ussd` (Africa's Talking USSD webhook)

1. Parse: `sessionId`, `serviceCode`, `phoneNumber`, `text`
2. Route on `text` value:
   - `""` (empty = first request): Show menu "1. I need help NOW\n2. I am okay\n3. Call my health worker"
   - `"1"`: Trigger SOS — call same logic as `/api/sos` with `triggerMethod: 'ussd'`
   - `"2"`: Respond "Thank you. Stay safe." — END session
   - `"3"`: Send SMS to patient's assigned health worker — END session
3. Return Africa's Talking USSD format: `CON [message]` (continues) or `END [message]` (ends session)

### 2.11 — server/src/routes/register.ts

Three sub-routes:

`POST /api/register/patient` — auth required (health worker)
- Validate all patient fields with Zod
- Convert `{ lat, lng }` to WKT: `POINT(${lng} ${lat})`
- Insert into `patients` table
- Auto-generate `status_token` UUID
- Return created patient id

`POST /api/register/volunteer` — no auth (self-registration)
- Validate volunteer fields with Zod
- Insert into `volunteers` table
- Return created volunteer id

`POST /api/register/hospital` — auth required (admin)
- Validate hospital fields
- Insert into `hospitals` table

### 2.12 — server/src/routes/auth.ts

`POST /api/login`
- Accept `{ email, password }`
- Use Supabase Auth `signInWithPassword`
- Return session token + user role

`POST /api/logout`
- Invalidate Supabase session

### 2.13 — server/src/routes/alerts.ts

`GET /api/alerts` — auth required
- Return all active alerts in health worker's zone
- Include patient name, landmark, weeks, status, responding volunteer name
- Order by `triggered_at DESC`

`GET /api/alerts/:id` — auth required
- Return single alert with full patient details + all alert_responses

`PATCH /api/alerts/:id/resolve` — auth required
- Update status to `resolved`, set `resolved_at`

### 2.14 — server/src/routes/status.ts

`GET /api/status/:token` — no auth
- Find patient by `status_token`
- Return: patient first name, alert status, volunteer name (if confirmed), hospital name, last updated
- NEVER return medical data, blood type, risk flags, phone numbers

### 2.15 — server/src/middleware/

`auth.ts` — verify Supabase JWT on protected routes
`twilioValidate.ts` — verify Twilio webhook signature
`rateLimiter.ts` — export `sosRateLimit`, `generalRateLimit`

---

## Phase 3 — Frontend Views

> Build all role views + shared components. Reference CONTEXT.md for exact route paths.

### 3.1 — client/src/main.tsx + App.tsx

**main.tsx:** Init i18next before rendering. Wrap app in Supabase auth context.

**App.tsx:** Set up React Router with core routes (patient, volunteer, hospital, register, worker dashboard, family, admin, demo):
```typescript
<Routes>
  <Route path="/" element={<PatientSOS />} />
  <Route path="/volunteer" element={<VolunteerDashboard />} />
  <Route path="/hospital" element={<HospitalInbox />} />
  <Route path="/register" element={<ProtectedRoute><HealthWorkerRegister /></ProtectedRoute>} />
  <Route path="/worker" element={<ProtectedRoute role="health_worker"><HealthWorkerDashboard /></ProtectedRoute>} />
  <Route path="/status/:token" element={<FamilyStatus />} />
  <Route path="/admin" element={<ProtectedRoute role="admin"><AdminZone /></ProtectedRoute>} />
  <Route path="/demo" element={<DemoFlow />} />
</Routes>
```

### 3.2 — client/src/i18n/index.ts

```typescript
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import en from './locales/en.json';
import hi from './locales/hi.json';
// ... import all locales

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: { en: { translation: en }, hi: { translation: hi }, /* ... */ },
    fallbackLng: 'en',
    interpolation: { escapeValue: false },
  });
```

**en.json must include all keys:**
```json
{
  "sos": {
    "title": "MamaAlert",
    "greeting": "Hello, {{name}}",
    "weeks": "{{n}} weeks pregnant",
    "button": "Press for emergency help",
    "sending": "Sending alert...",
    "sent": "Help is coming",
    "helpMessage": "{{volunteerName}} is on the way to you",
    "offline": "No signal — your alert is queued",
    "offlineSubtext": "It will send automatically when you have signal"
  },
  "volunteer": {
    "title": "Volunteer Dashboard",
    "activeAlert": "Emergency Alert",
    "minutesAgo": "{{n}} minutes ago",
    "distance": "{{km}} km from you",
    "accept": "Yes, I am going",
    "decline": "No",
    "pastAlerts": "Past alerts"
  },
  "hospital": {
    "title": "Incoming Alert",
    "eta": "ETA ~{{n}} minutes",
    "ready": "We are ready",
    "moreInfo": "Need more info"
  },
  "register": {
    "title": "Register Patient",
    "sections": {
      "identity": "Patient identity",
      "location": "Location",
      "pregnancy": "Pregnancy details",
      "risks": "Risk flags",
      "contacts": "Emergency contacts"
    },
    "submit": "Register patient",
    "success": "Patient registered successfully"
  },
  "family": {
    "title": "MamaAlert Status",
    "alertReceived": "Alert received",
    "volunteerResponding": "{{name}} is on the way",
    "atFacility": "Arrived at {{hospital}}",
    "resolved": "All safe",
    "lastUpdate": "Last updated {{time}} ago"
  },
  "admin": {
    "title": "Zone Admin",
    "patients": "Patients",
    "volunteers": "Volunteers",
    "alerts": "Alert history"
  },
  "common": {
    "loading": "Loading...",
    "error": "Something went wrong",
    "retry": "Try again",
    "save": "Save",
    "cancel": "Cancel"
  }
}
```

Translate all keys for: `hi.json`, `fr.json`, `sw.json`, `ar.json`, `pt.json`. Use accurate translations.

### 3.3 — PatientSOS.tsx

**This is the most critical screen. Design for zero literacy.**

- Identify patient by reading `phone` from URL param or localStorage (set during registration by health worker)
- Full-viewport layout — the SOS button fills the entire screen
- Patient's name shown at top in large text (via `t('sos.greeting')`)
- Weeks pregnant shown below name
- The button: minimum 200px × 200px, bright red (#DC2626), rounded-full, pulsing animation when idle
- On tap: button shows spinner, text changes to `t('sos.sending')`
- On success: button turns green, text shows `t('sos.sent')`, then `t('sos.helpMessage')` with volunteer name
- On offline: button shows `t('sos.offline')` + `t('sos.offlineSubtext')` — queue the alert
- Language switcher in top-right corner (small, not distracting)
- No navigation, no menu — this screen does ONE thing

**Offline behaviour:**
- Call `useOfflineQueue` hook
- If `navigator.onLine === false`: save to IndexedDB, show offline state, register background sync
- If online: `POST /api/sos` directly

### 3.4 — VolunteerDashboard.tsx

- Identify volunteer by phone (stored in localStorage after first visit + phone input)
- Show active alerts in a card list, newest first
- Each `AlertCard` shows: patient first name, landmark, distance, weeks pregnant, time since alert
- Two prominent buttons: `YES I AM GOING` (green, full width) and `NO` (outlined, smaller)
- On YES tap: call `POST /api/volunteer/response` with YES → show "Directions sent to your phone" confirmation
- Show past alerts history below (greyed out cards)
- **Live updates:** `EventSource` to `GET /api/volunteer/events?phone=…` (SSE). Server emits `feed_refresh` when this volunteer’s feed changes (SOS, escalation wave, YES/NO). Volunteers are phone-identified and do not use Supabase Realtime as `anon`.
- If no active alerts: show "Watching for alerts..." with a subtle pulse indicator

### 3.5 — HospitalInbox.tsx

- Hospital identified by URL param `?hospitalId=` or stored preference
- Show incoming pre-alerts in card format
- Each card: patient name, weeks, blood type, risk flags (shown as red badges), volunteer transporting, ETA
- Two action buttons: `WE ARE READY` (green) and `NEED MORE INFO` (amber)
- Alert count badge in header
- Supabase real-time subscription

### 3.6 — HealthWorkerRegister.tsx

Five-section form using shadcn `Form` + `react-hook-form` + `zod` validation:

**Section 1 — Patient Identity**
Fields: name, age, phone_primary, phone_secondary, language (select dropdown with all supported languages)

**Section 2 — Location**
- "Capture my current location" button → calls `navigator.geolocation.getCurrentPosition`
- Show captured coordinates + a small Leaflet map with pin
- Fallback: village name text input + landmark text input

**Section 3 — Pregnancy Details**
Fields: weeks_pregnant (number input 1–44), due_date (date picker), prev_pregnancies, prev_births, prev_csection (checkbox), last_anc_date

**Section 4 — Risk Flags**
Multi-select checkboxes: pre-eclampsia, placenta_previa, severe_anaemia, gestational_diabetes, multiple_pregnancy, obstructed_labour_history, hiv_positive, on_medication (+ medication name text if checked)

**Section 5 — Emergency Contacts**
Two sets of: name, phone, relationship (select: husband/mother/sister/neighbour/other)

Submit → `POST /api/register/patient` → show success with patient ID → offer "Register another patient"

Auth guard: if not logged in, show login form first (Supabase Auth email + password).

### 3.7 — FamilyStatus.tsx

- Read `:token` from URL params
- `GET /api/status/:token` on load + poll every 30 seconds
- Simple timeline showing alert lifecycle:
  - Alert received (timestamp)
  - Volunteer confirmed (name + timestamp, or "Finding help...")
  - En route to clinic (clinic name, or waiting...)
  - Arrived + being cared for (or waiting...)
- No medical data shown — name + status only
- Auto-refresh indicator at bottom
- Works without any login

### 3.8 — AdminZone.tsx

Auth-protected (admin role only). Three tabs using shadcn `Tabs`:

**Tab 1 — Patients**
- Table (shadcn `Table`) of all zone patients
- Columns: name, health worker, weeks, risk flags, last ANC visit
- Filter by health worker, risk level
- "At risk" badge for overdue ANC visits (>4 weeks since last visit)

**Tab 2 — Volunteers**
- Table of all volunteers with active/inactive toggle
- Columns: name, skills, vehicle, radius, last response date
- Toggle active status directly from table

**Tab 3 — Alert History**
- Table of all past alerts with response times
- Columns: patient, triggered at, response time, volunteer, outcome
- Show average response time metric at top

**Tab 4 — Map**
- Leaflet map with all patients (red dots), volunteers (green dots), hospitals (blue squares)
- Active alerts shown as pulsing red circles
- Legend at bottom-right

### 3.9 — DemoFlow.tsx

**This screen is for the hackathon demo presentation only.**

A step-by-step animated walkthrough of the full SOS flow:

Step 1: "Patient Priya triggers SOS" — show PatientSOS screen in an iframe/mock
Step 2: "SMS sent to 3 volunteers within 5km" — show SMS text appearing on a phone mockup
Step 3: "Ravi replies YES" — animate the YES response
Step 4: "Priya receives confirmation" — show SMS on patient phone
Step 5: "PHC Demo Clinic pre-alerted" — show clinic inbox updating
Step 6: "Family gets status link" — show FamilyStatus page

Navigation: Previous / Next buttons + step counter. Auto-advance option.
Also include a "TRIGGER REAL DEMO" button that actually fires the SOS flow with seed data.

---

## Phase 4 — Shared Components & Hooks

### 4.1 — Components

**SOSButton.tsx**
```typescript
interface SOSButtonProps {
  onTrigger: () => Promise<void>;
  status: 'idle' | 'sending' | 'sent' | 'offline' | 'error';
}
```
Renders full-screen button with correct state visuals + pulsing animation on idle.

**AlertCard.tsx**
```typescript
interface AlertCardProps {
  alert: AlertSummary;
  onAccept: (alertId: string) => Promise<void>;
  onDecline: (alertId: string) => Promise<void>;
  showActions?: boolean;
}
```

**MapView.tsx**
```typescript
interface MapViewProps {
  patients?: MapPoint[];
  volunteers?: MapPoint[];
  hospitals?: MapPoint[];
  center: [number, number];
  zoom?: number;
}
```
Uses `react-leaflet` with OpenStreetMap tiles. No API key needed.

**StatusBadge.tsx** — renders alert status as a colour-coded shadcn `Badge`

**LoadingSpinner.tsx** — full-screen overlay with spinner for async operations

**ErrorMessage.tsx** — shadcn `Alert` with destructive variant + retry button

### 4.2 — Hooks

**useGeolocation.ts**
```typescript
export function useGeolocation(): {
  lat: number | null;
  lng: number | null;
  accuracy: number | null;
  error: string | null;
  isLoading: boolean;
  capture: () => void;
}
```

**useRealtimeAlerts.ts**
```typescript
export function useRealtimeAlerts(zone?: string): {
  alerts: Alert[];
  isLoading: boolean;
  error: Error | null;
}
```
Uses `supabase.channel('alerts').on('postgres_changes', ...)` for real-time.

**useOfflineQueue.ts**
```typescript
export function useOfflineQueue(): {
  queue: PendingAlert[];
  addToQueue: (payload: SosPayload) => Promise<void>;
  processPending: () => Promise<void>;
  pendingCount: number;
}
```
Uses `idb` to manage `pending_alerts` store in IndexedDB.

**useAuth.ts**
```typescript
export function useAuth(): {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  role: 'health_worker' | 'admin' | null;
}
```

---

## Phase 5 — PWA & Offline

### 5.1 — Service Worker (Workbox auto-generates from vite.config.ts)

Add custom handler for SOS route in `vite.config.ts` workbox config:

```typescript
// In VitePWA workbox config — add SOS background sync
workbox: {
  // ... existing config
  additionalManifestEntries: [],
  // Custom SW code for SOS queue
  importScripts: ['./sw-sos.js'],
}
```

Create `public/sw-sos.js`:
```javascript
// Background sync for queued SOS alerts
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-sos') {
    event.waitUntil(processPendingSOS());
  }
});

async function processPendingSOS() {
  // Open IndexedDB, get pending alerts, POST each one
}
```

### 5.2 — Offline State Detection

In `PatientSOS.tsx`:
```typescript
const [isOnline, setIsOnline] = useState(navigator.onLine);

useEffect(() => {
  const handleOnline = () => setIsOnline(true);
  const handleOffline = () => setIsOnline(false);
  window.addEventListener('online', handleOnline);
  window.addEventListener('offline', handleOffline);
  return () => {
    window.removeEventListener('online', handleOnline);
    window.removeEventListener('offline', handleOffline);
  };
}, []);
```

---

## Phase 6 — Deployment

### 6.1 — GitHub Actions (.github/workflows/deploy.yml)

```yaml
name: Deploy MamaAlert

on:
  push:
    branches: [main]

jobs:
  deploy-client:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '20' }
      - run: cd client && npm ci && npm run build
      - uses: amondnet/vercel-action@v25
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
          working-directory: client

  deploy-server:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '20' }
      - run: cd server && npm ci && npm run build
      # Railway deploys automatically via GitHub integration
```

### 6.2 — Vercel Configuration

Create `client/vercel.json`:
```json
{
  "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }]
}
```

### 6.3 — Railway Configuration

Create `server/Procfile`:
```
web: node dist/index.js
```

Create `server/railway.json`:
```json
{
  "build": { "builder": "NIXPACKS" },
  "deploy": { "startCommand": "npm run build && npm start" }
}
```

### 6.4 — Deployment Order

1. Push schema.sql + functions.sql + seed.sql to Supabase SQL editor and run
2. Deploy server to Railway — get the Railway URL
3. Set all server env vars in Railway dashboard
4. Deploy client to Vercel — set `VITE_API_URL` to Railway URL
5. Set Twilio webhook URL to `https://[railway-url]/api/sms-reply`
6. Set Africa's Talking USSD callback to `https://[railway-url]/api/ussd`
7. Test full flow end-to-end on production URLs

---

## Phase 7 — Demo Preparation

### 7.1 — Seed Real Phone Numbers

Update `supabase/seed.sql` with real phone numbers you control:
- Patient phone: a phone that will receive SMS confirmation
- Volunteer phone 1 (Ravi): your main demo phone — will receive alert SMS and reply YES
- Volunteer phone 2 (Agnes): a second phone for realism
- Volunteer phone 3 (Kofi): placed >5km away — should NOT receive alert

### 7.2 — Demo Script

**Live demo flow (2 minutes):**
1. Open `mamaalert.app/` on a phone — show Priya's SOS screen
2. Tap the SOS button
3. On laptop: show coordinator dashboard updating live (real-time)
4. On demo phone (Ravi): show the SMS arriving
5. Reply `YES` to the SMS from Ravi's phone
6. Show PHC Demo Clinic inbox updating
7. Show patient phone receiving "Help is coming" SMS
8. Open `mamaalert.app/status/demo-status-token-abc123` — show family view

### 7.3 — DemoFlow Route

The `/demo` route should present this same flow visually with step cards for judges who want to understand the flow without triggering real SMS.

---

## Implementation Checklist

### Phase 0 — Scaffolding
- [ ] Monorepo created with correct folder structure
- [ ] Client: Vite + React + TS + Tailwind + shadcn installed
- [ ] Server: Express + TS configured
- [ ] Both tsconfigs have strict mode enabled
- [ ] Path aliases configured (`@/`) in both vite.config.ts and tsconfig.json
- [ ] All shadcn components installed
- [ ] `.env.example` files created for both client and server
- [ ] `.gitignore` excludes `.env` and `dist/`

### Phase 1 — Database
- [ ] PostGIS extension enabled in Supabase
- [ ] schema.sql runs without errors
- [ ] functions.sql stored procedures created and testable
- [ ] GIST indexes created on all location columns
- [ ] RLS enabled and policies working (test with different auth contexts)
- [ ] seed.sql runs and populates demo data with real phone numbers

### Phase 2 — Backend
- [ ] Server starts and validates env vars on boot
- [ ] `POST /api/sos` triggers SMS to nearby volunteers (real SMS sent)
- [ ] `POST /api/sms-reply` webhook handles YES correctly (volunteer confirmed, patient SMS, clinic SMS, family SMS)
- [ ] `POST /api/ussd` handles Africa's Talking session correctly
- [ ] Escalation timer fires after 5 minutes of no response
- [ ] `POST /api/register/patient` creates patient with geo coordinates
- [ ] `GET /api/status/:token` returns safe data only (no medical info)
- [ ] All routes have rate limiting
- [ ] Twilio webhook signature validation working

### Phase 3 — Frontend
- [ ] PatientSOS: full-screen button, handles offline state, sends SOS
- [ ] VolunteerDashboard: shows alerts, YES/NO works, SSE live refresh (`/api/volunteer/events`)
- [ ] HospitalInbox: shows pre-alerts, real-time updates
- [ ] HealthWorkerRegister: full 5-section form, GPS capture, Supabase auth
- [ ] FamilyStatus: loads by token, polls every 30s, no medical data
- [ ] AdminZone: auth-protected, 4 tabs, Leaflet map
- [ ] DemoFlow: step-by-step walkthrough + real trigger button
- [ ] i18n working: all keys defined in en.json, language switcher functional
- [ ] All 5 other language files translated

### Phase 4 — Components & Hooks
- [ ] SOSButton handles all 5 states correctly
- [ ] useOfflineQueue: adds to IndexedDB, registers background sync
- [ ] useRealtimeAlerts: Supabase channel subscription working
- [ ] useGeolocation: captures coordinates + shows on Leaflet map
- [ ] useAuth: Supabase session management working

### Phase 5 — PWA
- [ ] App installs to home screen (test on Android)
- [ ] SOS works offline (airplane mode test)
- [ ] Alert queues in IndexedDB when offline
- [ ] Background sync fires when signal returns
- [ ] OpenStreetMap tiles cached for offline map

### Phase 6 — Deployment
- [ ] Client deployed to Vercel with correct env vars
- [ ] Server deployed to Railway with correct env vars
- [ ] Twilio webhook URL set to Railway URL
- [ ] Africa's Talking callback set to Railway URL
- [ ] Full end-to-end flow works on production URLs (not localhost)
- [ ] GitHub Actions deploys on push to main

### Phase 7 — Demo
- [ ] Seed data loaded in production Supabase
- [ ] Real phone numbers in seed data for demo
- [ ] DemoFlow route working
- [ ] Live demo rehearsed at least 3 times
- [ ] Backup plan if SMS fails (screenshot/video of successful SMS)
- [ ] Source code zipped for submission
- [ ] 2–5 minute video recorded

---

## Critical Reminders for Cursor

1. **PostGIS coordinate order is `POINT(longitude latitude)` — not lat/lng.** Getting this backwards silently breaks all radius queries.

2. **The SOS route must never throw a single error that kills the whole flow.** Wrap each step (create alert, send SMS, schedule escalation) independently. Partial success is always better than total failure.

3. **Twilio sends form-encoded POST bodies to webhooks** — you need `express.urlencoded({ extended: true })` or the webhook body will be empty.

4. **Supabase real-time only fires when the DB row changes.** In `smsReply.ts`, make sure you actually update the `alerts` table row after a YES — don't just update `alert_responses`. The coordinator dashboard subscribes to `alerts`, not `alert_responses`.

5. **Background sync only works on HTTPS** — test offline queue on the deployed Vercel URL, not localhost.

6. **Africa's Talking USSD sessions are stateful by `sessionId`.** Parse the `text` field to determine which step the user is on (e.g., `text = "1"` means they chose option 1 from the first menu).

7. **shadcn/ui components must be installed via CLI** — `npx shadcn-ui@latest add [component]` — never manually copied. The CLI sets up proper dependencies and handles your specific Tailwind config.

8. **i18next language detection reads the browser language by default.** For the Patient SOS screen, also read the `language` field from the patient's profile (fetched by phone number) and override i18next language accordingly.

9. **The FamilyStatus page must never expose medical data.** The `/api/status/:token` route must only return: patient first name, alert status enum, responding volunteer first name, hospital name. Nothing else.

10. **Test the escalation timer manually** by setting `ESCALATION_DELAY_MS=30000` (30 seconds) as an env var during development instead of 5 minutes. Reset to 300000 before demo.
