# MamaAlert — Project Context

## What This Project Is

MamaAlert is a community-powered maternal emergency alert Progressive Web App (PWA). When a pregnant woman faces a life-threatening emergency, she triggers a single SOS. The system instantly activates every trained volunteer within 5km via SMS, pre-alerts the nearest clinic, and notifies her family — all in under 60 seconds.

Built for the **GNEC Hackathon 2026** under **SDG 3: Good Health and Well-Being**.

**The core problem it solves:** The WHO Three Delays Model identifies that most maternal deaths happen not because medicine doesn't exist, but because of three delays:
- Delay 1: Decision to seek care (family/community level)
- Delay 2: Reaching a health facility (transport, distance)
- Delay 3: Receiving care at the facility (unpreparedness)

MamaAlert collapses all three delays simultaneously using SMS, USSD, and a community volunteer network.

---

## Tech Stack — Exact Versions

### Frontend
- **React 18** with **Vite 5**
- **TypeScript** (strict mode — `"strict": true` in tsconfig)
- **Tailwind CSS v3**
- **shadcn/ui** (component library on top of Radix UI)
- **React Router v6** (role-based routes; see route table below)
- **vite-plugin-pwa** + **Workbox** (offline PWA, background sync)
- **idb** (IndexedDB wrapper for offline queue)
- **@supabase/supabase-js** (DB + real-time + auth)
- **Leaflet + react-leaflet** (maps, OpenStreetMap tiles — free)
- **i18next + react-i18next** (internationalisation, default English)
- **Axios** (HTTP client for backend API calls)

### Backend
- **Node.js 20 LTS** + **Express 4**
- **TypeScript** (strict mode)
- **@supabase/supabase-js** (server-side DB queries)
- **twilio** (SMS + Voice/IVR)
- **africastalking** (USSD + SMS Africa fallback)
- **dotenv**, **cors**, **helmet**, **express-rate-limit**
- Protected routes: **Supabase Auth** access token in `Authorization: Bearer` verified via `supabaseAdmin.auth.getUser` (no app-managed `JWT_SECRET`)
- **Volunteer live feed:** Server-Sent Events (`GET /api/volunteer/events?phone=…`) so phone-only volunteers get push refresh without Postgres Realtime as `anon`
- **ts-node-dev** (dev server with hot reload)

### Database
- **Supabase** (hosted PostgreSQL)
- **PostGIS** extension (geospatial radius queries)
- **Supabase Auth** (health worker + admin login)
- **Supabase Realtime** (live coordinator dashboard)
- **Row-Level Security** (patients visible only to their health worker)

### Infrastructure
- **Vercel** — frontend PWA deployment
- **Railway** — backend Express API deployment
- **GitHub Actions** — CI/CD (auto deploy on push to main)
- **OpenStreetMap** — free map tiles (no API key needed)

---

## Monorepo Structure

```
mamaalert/
├── client/                  ← React PWA → deploys to Vercel
│   ├── src/
│   │   ├── views/           ← role-based screens (SOS, volunteer, hospital, register, worker dashboard, family, admin, demo)
│   │   ├── components/      ← reusable UI components
│   │   ├── hooks/           ← custom React hooks
│   │   ├── services/        ← supabase client, api calls, offline queue
│   │   ├── i18n/            ← translation files
│   │   └── types/           ← shared TypeScript types
│   ├── public/
│   └── vite.config.ts
│
├── server/                  ← Express API → deploys to Railway
│   ├── src/
│   │   ├── routes/          ← API endpoints
│   │   ├── services/        ← twilio, supabase, geo, escalation
│   │   ├── middleware/       ← auth, twilio validation, rate limit
│   │   └── types/           ← shared TypeScript types
│   └── tsconfig.json
│
├── supabase/
│   ├── schema.sql           ← full DB schema with PostGIS
│   ├── functions.sql        ← stored procedures (radius query)
│   └── seed.sql             ← demo data for hackathon
│
└── .github/
    └── workflows/deploy.yml
```

---

## User Roles & Routes

| Route | Role | Auth Required |
|---|---|---|
| `/` | Patient SOS — big red button | None (phone = identity) |
| `/volunteer` | Volunteer alert feed + YES/NO (SSE live refresh) | None (phone = identity) |
| `/hospital` | Hospital pre-alert inbox | None (SMS fallback exists) |
| `/register` | Health worker registers patients | Supabase Auth |
| `/worker` | Health worker dashboard (patients, alerts, volunteers) | Supabase Auth (health_worker) |
| `/status/:token` | Family read-only status page | None (token in URL) |
| `/admin` | NGO zone admin dashboard | Supabase Auth (admin role) |
| `/demo` | Hackathon demo walkthrough | None |

---

## Database Tables (Summary)

- `patients` — registered pregnant women with GEOGRAPHY(POINT) location
- `volunteers` — community responders with GEOGRAPHY(POINT) location
- `hospitals` — clinics with GEOGRAPHY(POINT) location + services
- `health_workers` — ASHA/ANM workers linked to Supabase auth.users
- `alerts` — one row per SOS event, tracks full lifecycle
- `alert_responses` — per-volunteer SMS log (sent, replied, wave number)
- `zones` — NGO admin boundaries

All location fields use PostGIS `GEOGRAPHY(POINT, 4326)` for accurate distance calculations in meters.

---

## Key Business Logic

### SOS Trigger Flow
1. Patient taps button (PWA) or dials `*456#` (USSD) or sends SMS keyword
2. Backend identifies patient by phone number
3. PostGIS `ST_DWithin` query finds volunteers within 5km sorted by distance
4. Twilio fires SMS to all volunteers simultaneously
5. 5-minute escalation timer starts
6. First `YES` reply → patient confirmation + clinic pre-alert + family SMS
7. No reply after 5min → Wave 2 (10km) → Wave 3 (20km) → coordinator

### Escalation Waves
- Wave 1: 5km radius, 5 min wait
- Wave 2: 10km radius, 5 min wait + coordinator SMS
- Wave 3: 20km radius + coordinator direct call + ambulance

### Incapacitation Detection
If patient triggers SOS but shows no further interaction within 60 seconds:
- Auto-escalate to Priority 2
- Immediately notify family (don't wait for volunteer YES)
- Double volunteer radius

### Offline Queue
Service Worker intercepts failed POST /api/sos → saves to IndexedDB → Background Sync fires when signal returns → even if browser is closed.

---

## SMS Providers

### Twilio (primary — global)
- Outbound SMS to volunteers, patients, clinics, family
- Inbound webhook: `POST /api/sms-reply` (volunteer YES/NO)
- IVR Voice: confirmation call for visually impaired patients
- Environment: `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_NUMBER`

### Africa's Talking (USSD + Africa SMS fallback)
- USSD gateway: `*456#` for zero-internet phones
- Inbound USSD webhook: `POST /api/ussd`
- Environment: `AT_API_KEY`, `AT_USERNAME`

---

## Internationalisation

- Library: `i18next` + `react-i18next`
- Default language: English (`en`)
- Translation files in `client/src/i18n/locales/`
- All UI strings must use `t('key')` — no hardcoded English strings in JSX
- SMS messages sent in patient's registered `language` field
- Languages to support: en, hi, fr, sw, ar, pt (add more via locale files)

---

## Authentication

- **Health workers and admins:** Supabase Auth (email + password)
- **Patients:** No login — identified by phone number from registration
- **Volunteers:** No login — identified by phone number from registration
- **Family:** No login — URL token (`/status/:token`)
- `requireAuth` middleware on protected Express routes verifies the **Supabase** access token (`supabaseAdmin.auth.getUser`)

---

## Demo Setup

The hackathon demo requires:
1. Real seed data in Supabase (1 test patient, 3 test volunteers, 1 test hospital)
2. A `/demo` route in the client that walks through the SOS flow step by step
3. Real Twilio SMS sent to a real phone during the demo
4. Live coordinator dashboard updating in real-time on screen

Seed file: `supabase/seed.sql` — always run after schema.sql in fresh environments.

---

## Environment Variables

### client/.env
```
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
VITE_API_URL=
```

### server/.env
```
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
SUPABASE_ANON_KEY=
# Set TWILIO_MOCK=true for local dev without real Twilio (SMS logged; webhook validation relaxed).
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_NUMBER=
AT_API_KEY=
AT_USERNAME=
PORT=3000
CLIENT_URL=
NODE_ENV=
```

---

## Constraints & Non-Negotiables

1. The Patient SOS screen must work with zero literacy — icon-driven, no required reading
2. The volunteer SMS reply flow must work on a basic Nokia feature phone — plain SMS only
3. Offline SOS queue must survive browser close — use Background Sync, not just localStorage
4. All patient medical data must use Row-Level Security in Supabase — no exceptions
5. The demo must show a real SMS arriving on a real phone — not simulated
6. TypeScript strict mode throughout — no `any`, no `@ts-ignore` (includes `exactOptionalPropertyTypes` and `noFallthroughCasesInSwitch` per [rules.md](rules.md))
7. All UI text must go through i18next — no hardcoded strings in JSX
