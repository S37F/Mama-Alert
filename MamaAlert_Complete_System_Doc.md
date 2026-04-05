# MamaAlert — Complete System Documentation
### GNEC Hackathon 2026 | SDG 3: Good Health & Well-Being
**Version 1.0 | Solo Developer Build**

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Problem Statement](#2-problem-statement)
3. [Solution Overview](#3-solution-overview)
4. [Real-World Impact & Statistics](#4-real-world-impact--statistics)
5. [System Architecture](#5-system-architecture)
6. [User Roles & Layouts](#6-user-roles--layouts)
7. [Complete Data Models](#7-complete-data-models)
8. [Database Schema](#8-database-schema)
9. [Tech Stack](#9-tech-stack)
10. [API Design](#10-api-design)
11. [Core Flows & Flowcharts](#11-core-flows--flowcharts)
12. [Offline & Accessibility Strategy](#12-offline--accessibility-strategy)
13. [SMS / USSD / Voice Architecture](#13-sms--ussd--voice-architecture)
14. [Geospatial Radius Logic](#14-geospatial-radius-logic)
15. [Escalation Logic](#15-escalation-logic)
16. [Security & Privacy](#16-security--privacy)
17. [Project Folder Structure](#17-project-folder-structure)
18. [Build Order & Hackathon Timeline](#18-build-order--hackathon-timeline)
19. [Test Case Scenarios](#19-test-case-scenarios)
20. [Judging Criteria Alignment](#20-judging-criteria-alignment)
21. [Presentation Video Arc](#21-presentation-video-arc)
22. [Environment Variables Reference](#22-environment-variables-reference)
23. [Free Tier Limits](#23-free-tier-limits)

---

## 1. Executive Summary

**MamaAlert** is a community-powered maternal emergency alert system built as a Progressive Web App (PWA). When a pregnant woman faces a life-threatening emergency, she triggers a single SOS — the system instantly activates every trained volunteer within 5km, pre-alerts the nearest clinic, and notifies her family. It works on basic feature phones via SMS and USSD, requires no internet on the patient's side, and functions offline.

**The core innovation:** MamaAlert does not try to replace healthcare infrastructure. It activates the human network that already surrounds every pregnant woman — before it is too late.

**SDG Alignment:** SDG 3.1 — Reduce global maternal mortality ratio to fewer than 70 per 100,000 live births by 2030.

**Hackathon Theme:** SDG 3 — Good Health and Well-Being

---

## 2. Problem Statement

### The Three Delays Model
The WHO framework identifies three phases where delay causes maternal death:

```
DELAY 1 — Decision to seek care
  └── Family doesn't recognise danger signs
  └── Cultural norms, fear, lack of awareness
  └── Average delay: 2–6 hours

DELAY 2 — Reaching a health facility
  └── No transport, no road access, no one available
  └── 42–52% of maternal deaths in India occur in transit
  └── Rural mothers are 4.1x more likely to face this delay

DELAY 3 — Receiving care at the facility
  └── Staff not prepared, no blood ready
  └── Avoidable if facility receives pre-alert
```

### Hard Statistics (2025–2026)
- **260,000** women die in childbirth globally per year — one every 2 minutes
- **42–52%** of maternal deaths in India, Rajasthan, Maharashtra, Andhra Pradesh occur at home or in transit
- **14.3 million** children missed vaccinations in 2024 — maternal care faces similar collapse
- Global maternal deaths are **regressing** in 2026 after years of progress
- Rural mothers face mortality rates **up to 2.5x higher** than urban areas
- **239 million** people require humanitarian health assistance in 2026
- Mothers in rural areas are **4.1 times** more likely to face delay in emergency obstetric care

### What Does Not Exist Yet
No tool today:
- Activates a **community volunteer circle via SMS** for maternal emergencies in low-connectivity settings
- Works entirely on **basic feature phones** (no smartphone, no internet, no app store)
- **Pre-alerts a clinic** before the patient arrives, eliminating Delay 3
- Is **deployable by NGO field workers** without technical setup

---

## 3. Solution Overview

### What MamaAlert Does

```
Patient triggers SOS (1 tap / SMS / USSD)
        │
        ▼
System reads her profile: name, location, weeks, risk flags, blood type
        │
        ▼
PostGIS radius query: finds all volunteers within 5km, sorted by distance
        │
        ▼
Twilio fires SMS to each volunteer simultaneously
        │
        ▼
Volunteers reply YES or NO
        │
        ▼
First YES → patient gets "Help is coming" SMS
           → clinic gets pre-alert with patient details
           → family gets status SMS
           → coordinator dashboard updates live
```

### Key Design Principles

| Principle | Implementation |
|---|---|
| Zero burden on patient | Health worker registers her at ANC visit |
| Works without internet | USSD `*456#` on any basic phone |
| Works without a voice | Single tap = full alert |
| Works without literacy | Icon-only UI, voice IVR confirmation |
| Works when no one responds | Layered escalation with wider radius + coordinator alert |
| Deployable by NGOs | Simple web dashboard, no technical knowledge needed |

---

## 4. Real-World Impact & Statistics

### Why This, Why Now
The year 2026 is a breaking point for global maternal health:
- WHO is losing 25% of its workforce by June 2026
- Global health funding has collapsed — 6,600+ facilities shut down
- Maternal death rates are *rising* in several regions after decades of progress
- Health misinformation is ranked a **top global risk** by WEF 2026

### MamaAlert's Direct Impact Model

```
Per 100,000 live births (rural low-income setting):
  Current maternal mortality rate:        ~500 deaths
  Deaths occurring in transit/at home:    ~230 deaths (46%)
  Addressable by faster community response: ~140 deaths

  Conservative impact estimate with MamaAlert deployment:
  → Response time reduced from 2.5 hrs → 22 minutes
  → Pre-alert eliminates Delay 3 at facility
  → Projected reduction: 30–40% of transit deaths
  → Lives saved per 100,000 births: ~42–56
```

### Sponsor Resonance

| Sponsor | MamaAlert Connection |
|---|---|
| GNEC + 1,600 NGO network | Field workers can deploy and seed volunteer registrations |
| Royal Academy of Science International Trust | Grounded in WHO's validated Three Delays research model |
| Seton Hall School of Diplomacy | SDG 3.1 policy alignment, UN health emergency context |
| World Yoga Community | Postpartum mental wellness module as future feature |
| Lehigh University | Scalable technical architecture, academic credibility |

---

## 5. System Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                         CLIENT LAYER (PWA)                          │
│                                                                     │
│  [Patient SOS]  [Volunteer]  [Hospital]  [Health Worker]  [Admin]  │
│       ↕              ↕           ↕             ↕             ↕      │
│                    React + Vite + Tailwind CSS                      │
│                    vite-plugin-pwa + Workbox                        │
│                    IndexedDB (offline queue)                        │
└──────────────────────────┬──────────────────────────────────────────┘
                           │ HTTPS REST API
                           │
┌──────────────────────────▼──────────────────────────────────────────┐
│                       SERVER LAYER (Node.js + Express)              │
│                                                                     │
│   POST /sos          POST /sms-reply      GET /alerts               │
│   POST /register     POST /escalate       GET /patients             │
│   POST /volunteer    GET /volunteers      POST /login               │
│                                                                     │
│   [SOS Handler] [Escalation Engine] [Auth Middleware] [JWT]        │
└──────────┬───────────────────────────────────────────┬─────────────┘
           │                                           │
┌──────────▼──────────┐                    ┌──────────▼──────────────┐
│   DATABASE LAYER    │                    │   COMMUNICATION LAYER   │
│                     │                    │                         │
│   Supabase          │                    │   Twilio SMS            │
│   PostgreSQL        │                    │   Twilio Voice/IVR      │
│   PostGIS (geo)     │                    │   Africa's Talking      │
│   Real-time subs    │                    │   USSD Gateway          │
│   Row-level security│                    │                         │
└─────────────────────┘                    └─────────────────────────┘
           │
┌──────────▼──────────┐
│    HOSTING LAYER    │
│                     │
│   Vercel (frontend) │
│   Railway (backend) │
│   GitHub Actions    │
└─────────────────────┘
```

### Data Flow Diagram

```
PATIENT PHONE                BACKEND                   EXTERNAL SERVICES
     │                          │                              │
     │── SOS tap ──────────────▶│                              │
     │                          │── PostGIS radius query ─────▶│ Supabase
     │                          │◀── [volunteers list] ────────│
     │                          │── SMS to each volunteer ────▶│ Twilio
     │                          │                              │
     │                       VOLUNTEER PHONE                   │
     │                          │◀── "MAMA ALERT: ..." SMS ────│
     │                          │── replies "YES" ────────────▶│ Twilio webhook
     │                          │◀── webhook fires ────────────│
     │                          │── UPDATE alerts table ──────▶│ Supabase
     │◀── "Help is coming" SMS ─│── Pre-alert SMS to clinic ──▶│ Twilio
     │                          │── Family notification SMS ──▶│ Twilio
     │                          │── Real-time push ───────────▶│ Supabase
     │                       COORDINATOR DASHBOARD             │
     │                          │◀── Live update ──────────────│
```

---

## 6. User Roles & Layouts

### 6 Roles, 6 PWA Screens, One Codebase

```
mamaalert.app/              → Patient SOS screen
mamaalert.app/volunteer     → Volunteer alert feed
mamaalert.app/hospital      → Hospital pre-alert inbox
mamaalert.app/register      → Patient registration (health worker)
mamaalert.app/status/:id    → Family read-only status page
mamaalert.app/admin         → NGO zone admin dashboard
```

---

### Role 1: Patient (SOS Screen)

**Who uses it:** Pregnant woman. Set up once by health worker at ANC visit.

**Screen design:**
```
┌─────────────────────────────┐
│  MamaAlert                  │
│  Hello, Priya Sharma        │
│  38 weeks pregnant          │
│                             │
│   ┌─────────────────────┐   │
│   │                     │   │
│   │    PRESS FOR        │   │
│   │    EMERGENCY HELP   │   │
│   │                     │   │
│   │   [BIG RED BUTTON]  │   │
│   │                     │   │
│   └─────────────────────┘   │
│                             │
│  Your helpers: Ravi, Meena  │
│  Nearest clinic: PHC Wai    │
└─────────────────────────────┘
```

**Key UX rules:**
- Button = entire screen. Cannot be missed.
- Confirmation: "Sending help..." → "Help is coming. Ravi Kumar is on the way."
- No login. Phone number = identity (set at registration).
- Offline: queues alert in IndexedDB → fires when signal returns.

---

### Role 2: Volunteer (Alert Feed)

**Who uses it:** Community health workers, nurses, neighbours with vehicles.

**Screen design:**
```
┌─────────────────────────────┐
│  MamaAlert — Volunteer      │
│  Ravi Kumar   [Active ●]    │
├─────────────────────────────┤
│  ⚠ ALERT — 2 mins ago      │
│  Priya Sharma               │
│  Near the temple, Khandala  │
│  38 weeks | Risk: Low       │
│  Distance: 1.2 km           │
│                             │
│  [YES, I'M GOING]  [NO]    │
├─────────────────────────────┤
│  Past alerts                │
│  ✓ Amara Owusu — 3 days ago │
│  ✓ Fatima Al-Hassan — 1 wk  │
└─────────────────────────────┘
```

**SMS fallback (no internet):**
Volunteer receives: `MAMA ALERT: Priya Sharma, near temple Khandala, 38 weeks. Reply YES to respond.`
They reply `YES` — Twilio webhook handles the rest.

---

### Role 3: Hospital / Clinic (Pre-Alert Inbox)

**Who uses it:** On-duty nurse or doctor at nearest facility.

**Screen design:**
```
┌─────────────────────────────┐
│  PHC Wai — Alert Inbox      │
├─────────────────────────────┤
│  🔴 INCOMING — 4 mins       │
│  Priya Sharma               │
│  38 weeks | Blood: B+       │
│  Risk flag: Low placenta    │
│  Transported by: Ravi Kumar │
│  ETA: ~18 minutes           │
│                             │
│  [READY] [NEED MORE INFO]   │
├─────────────────────────────┤
│  Today's alerts: 2          │
│  Last week: 7               │
└─────────────────────────────┘
```

**SMS fallback:**
`PRE-ALERT: Priya Sharma, 38 weeks, possible hemorrhage, Blood B+. Volunteer Ravi transporting. ETA ~20 mins. PHC Wai.`

---

### Role 4: Health Worker (Registration + Dashboard)

**Who uses it:** ASHA/ANM workers, nurses, community health officers.

**Screen design:**
```
┌─────────────────────────────┐
│  MamaAlert — Health Worker  │
│  Sister Meena               │
├─────────────────────────────┤
│  My Patients (47)           │
│  ⚠ Sunita Devi — 42 wks    │  ← no check-in 8 days
│  ● Priya Sharma — 38 wks   │
│  ● Kamla Bai — 32 wks      │
│                             │
│  [+ REGISTER NEW PATIENT]   │
├─────────────────────────────┤
│  Active Alerts (1)          │
│  🔴 Priya — Ravi responding │
│  Clinic pre-alerted ✓       │
│                             │
│  My Volunteers (12)         │
│  ● Ravi Kumar — Active      │
│  ● Sister Agnes — Active    │
└─────────────────────────────┘
```

---

### Role 5: Family Member (Read-Only Status)

**Who uses it:** Husband, mother-in-law, any registered emergency contact.

**Access method:** SMS contains link → `mamaalert.app/status/abc123` → no login needed.

**Screen design:**
```
┌─────────────────────────────┐
│  MamaAlert Status           │
├─────────────────────────────┤
│  Priya Sharma               │
│                             │
│  ✓ Alert received  2:41 AM  │
│  ✓ Ravi Kumar responded     │
│  ✓ En route to PHC Wai      │
│  ✓ Clinic prepared          │
│                             │
│  Last update: 2 mins ago    │
│  Auto-refreshes every 30s   │
└─────────────────────────────┘
```

No patient medical data shown. Name + status only.

---

### Role 6: NGO / Zone Admin

**Who uses it:** GNEC partner NGO managing a district or zone.

**Capabilities:**
- View all patients, volunteers, health workers in zone
- Full alert history with response times and outcomes
- Set escalation rules (time thresholds, radius expansion)
- Add/remove health workers
- Export monthly CSV reports
- Configure which hospitals receive pre-alerts

---

## 7. Complete Data Models

### Patient Registration Fields

**Identity**
- Full name
- Age
- Primary phone number (can be basic feature phone)
- Secondary phone (husband / family)
- Preferred language (for SMS language)

**Location**
- GPS coordinates (lat, lng) — captured by health worker's phone
- Village / area name
- Nearest landmark (free text: "near the blue gate", "behind temple")
- Estimated distance to nearest clinic (km)

**Pregnancy Details**
- Weeks pregnant
- Expected due date
- Number of previous pregnancies
- Number of previous live births
- Previous C-section (yes/no)
- Last ANC visit date
- Next ANC visit scheduled

**Medical Risk Flags** (multi-select checkboxes)
- Pre-eclampsia / hypertension
- Placenta previa / low-lying placenta
- Severe anaemia
- Gestational diabetes
- Multiple pregnancy (twins/triplets)
- Obstructed labour history
- HIV positive
- Currently on medication → medication name
- Other (free text)

**Emergency Contacts**
- Contact 1: name, phone, relationship
- Contact 2: name, phone, relationship

**Assignment**
- Assigned health worker (FK)
- Preferred hospital / clinic (FK)
- Blood type

---

### Volunteer Registration Fields

**Identity**
- Full name
- Phone number
- Preferred language
- GPS location (home/base coordinates)
- Village / area

**Skills** (multi-select)
- Trained midwife
- Registered nurse
- Community health worker (ASHA/ANM)
- First aid certified
- No formal training — willing to help

**Availability**
- Vehicle available (yes/no)
- Vehicle type (motorcycle / car / bicycle / none)
- Available hours (24/7 / daytime only / nights only / weekends)
- Currently active toggle (on/off — for when they travel)

**Alert Preferences**
- Max radius willing to respond (2km / 5km / 10km)
- Alert method (SMS / app push / both)

---

### Hospital Registration Fields

**Facility Info**
- Facility name
- Type (PHC / CHC / District Hospital / Private clinic)
- GPS coordinates
- Address + landmark

**Capacity & Services** (checkboxes)
- Normal delivery
- Emergency C-section
- Blood bank on site
- NICU available
- 24-hour service (yes/no)
- Current bed availability (optional live field)

**Contact**
- Main phone
- Emergency / on-call number
- WhatsApp (if available)
- On-duty staff name (rotatable)

**Alert Settings**
- Receive pre-alerts (yes/no)
- Radius to receive alerts from (10km / 25km / all zone)

---

### Health Worker Registration Fields

- Full name
- Role (ASHA / ANM / Nurse / Doctor / Community volunteer)
- Employee or registration ID
- Phone number
- Organisation / facility attached
- Zone / village cluster covered
- GPS base location
- Login email + password
- Access level (register patients / view dashboard / both)

---

## 8. Database Schema

```sql
-- Enable geospatial extension
CREATE EXTENSION IF NOT EXISTS postgis;

-- Patients table
CREATE TABLE patients (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT NOT NULL,
  age           INT,
  phone_primary TEXT NOT NULL,
  phone_secondary TEXT,
  language      TEXT DEFAULT 'en',
  location      GEOGRAPHY(POINT, 4326) NOT NULL,
  village       TEXT,
  landmark      TEXT,
  weeks_pregnant INT,
  due_date      DATE,
  prev_pregnancies INT DEFAULT 0,
  prev_births   INT DEFAULT 0,
  prev_csection BOOLEAN DEFAULT FALSE,
  last_anc_date DATE,
  risk_flags    TEXT[], -- ['preeclampsia', 'anaemia', ...]
  blood_type    TEXT,
  medication    TEXT,
  emergency_contact_1_name  TEXT,
  emergency_contact_1_phone TEXT,
  emergency_contact_1_rel   TEXT,
  emergency_contact_2_name  TEXT,
  emergency_contact_2_phone TEXT,
  health_worker_id UUID REFERENCES health_workers(id),
  preferred_hospital_id UUID REFERENCES hospitals(id),
  status_token  TEXT UNIQUE DEFAULT gen_random_uuid()::TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- Volunteers table
CREATE TABLE volunteers (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT NOT NULL,
  phone         TEXT NOT NULL UNIQUE,
  language      TEXT DEFAULT 'en',
  location      GEOGRAPHY(POINT, 4326) NOT NULL,
  village       TEXT,
  skills        TEXT[],
  vehicle       TEXT, -- 'motorcycle','car','bicycle','none'
  available_hours TEXT, -- '24/7','daytime','nights','weekends'
  max_radius_km INT DEFAULT 5,
  alert_method  TEXT DEFAULT 'sms', -- 'sms','push','both'
  is_active     BOOLEAN DEFAULT TRUE,
  zone_id       UUID REFERENCES zones(id),
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- Hospitals table
CREATE TABLE hospitals (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT NOT NULL,
  type          TEXT, -- 'PHC','CHC','district','private'
  location      GEOGRAPHY(POINT, 4326) NOT NULL,
  address       TEXT,
  landmark      TEXT,
  phone_main    TEXT,
  phone_emergency TEXT,
  services      TEXT[], -- ['normal_delivery','csection','blood_bank',...]
  is_24hr       BOOLEAN DEFAULT FALSE,
  receive_alerts BOOLEAN DEFAULT TRUE,
  alert_radius_km INT DEFAULT 25,
  zone_id       UUID REFERENCES zones(id),
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- Health workers table
CREATE TABLE health_workers (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID REFERENCES auth.users(id),
  name          TEXT NOT NULL,
  role          TEXT, -- 'ASHA','ANM','nurse','doctor','volunteer'
  employee_id   TEXT,
  phone         TEXT,
  organisation  TEXT,
  location      GEOGRAPHY(POINT, 4326),
  village_cluster TEXT,
  access_level  TEXT DEFAULT 'register', -- 'register','dashboard','both'
  zone_id       UUID REFERENCES zones(id),
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- Alerts table (one row per SOS event)
CREATE TABLE alerts (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id    UUID REFERENCES patients(id) NOT NULL,
  triggered_at  TIMESTAMPTZ DEFAULT NOW(),
  trigger_method TEXT, -- 'pwa','sms','ussd'
  priority      INT DEFAULT 1, -- 1=normal, 2=escalated, 3=critical
  status        TEXT DEFAULT 'active',
  -- 'active','volunteer_responding','at_facility','resolved','escalated'
  responding_volunteer_id UUID REFERENCES volunteers(id),
  volunteer_confirmed_at  TIMESTAMPTZ,
  facility_prealerted_at  TIMESTAMPTZ,
  patient_arrived_at      TIMESTAMPTZ,
  resolved_at             TIMESTAMPTZ,
  escalation_count        INT DEFAULT 0,
  notes         TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- Alert responses (log of each volunteer SMS sent + reply)
CREATE TABLE alert_responses (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_id      UUID REFERENCES alerts(id),
  volunteer_id  UUID REFERENCES volunteers(id),
  sms_sent_at   TIMESTAMPTZ DEFAULT NOW(),
  responded_at  TIMESTAMPTZ,
  response      TEXT, -- 'YES','NO','no_response'
  wave          INT DEFAULT 1 -- which escalation wave
);

-- Zones (for NGO admin management)
CREATE TABLE zones (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT NOT NULL,
  admin_org     TEXT,
  admin_email   TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- Geospatial index for fast radius queries
CREATE INDEX patients_location_idx  ON patients  USING GIST(location);
CREATE INDEX volunteers_location_idx ON volunteers USING GIST(location);
CREATE INDEX hospitals_location_idx  ON hospitals  USING GIST(location);

-- Row-level security
ALTER TABLE patients ENABLE ROW LEVEL SECURITY;
CREATE POLICY "health_workers_see_own_patients"
  ON patients FOR ALL
  USING (health_worker_id = auth.uid());
```

---

## 9. Tech Stack

### Complete Technology Reference

| Layer | Technology | Version | Purpose |
|---|---|---|---|
| **Frontend framework** | React | 18.x | UI components |
| **Build tool** | Vite | 5.x | Fast bundler + dev server |
| **Styling** | Tailwind CSS | 3.x | Mobile-first utility CSS |
| **PWA** | vite-plugin-pwa | 0.19.x | Service worker, manifest |
| **Offline sync** | Workbox | 7.x | Background sync, cache |
| **Offline storage** | IndexedDB (idb) | 8.x | Queue alerts on device |
| **Routing** | React Router | 6.x | 6 layout navigation |
| **Backend** | Node.js + Express | 20 LTS | REST API server |
| **Database** | Supabase (PostgreSQL) | — | Primary database |
| **Geospatial** | PostGIS | 3.x | 5km radius queries |
| **Real-time** | Supabase Realtime | — | Live dashboard updates |
| **Auth** | Supabase Auth + JWT | — | Health worker login |
| **SMS primary** | Twilio | — | SMS send/receive |
| **SMS Africa** | Africa's Talking | — | USSD + SMS fallback |
| **Voice/IVR** | Twilio Voice | — | Blind user audio confirm |
| **Maps** | Mapbox GL JS | 3.x | Coordinator map view |
| **Location** | Browser Geolocation API | — | GPS capture at registration |
| **Map tiles** | OpenStreetMap | — | Free map data |
| **Encryption** | AES-256 (Node crypto) | — | Patient data at rest |
| **Frontend hosting** | Vercel | — | PWA deployment |
| **Backend hosting** | Railway | — | Express API hosting |
| **CI/CD** | GitHub Actions | — | Auto deploy on push |

### Package Installation

```bash
# Frontend
npm create vite@latest mamaalert-client -- --template react
cd mamaalert-client
npm install react-router-dom @supabase/supabase-js
npm install mapbox-gl idb
npm install -D tailwindcss postcss autoprefixer vite-plugin-pwa workbox-window
npx tailwindcss init -p

# Backend
mkdir mamaalert-server && cd mamaalert-server
npm init -y
npm install express cors dotenv jsonwebtoken bcrypt
npm install twilio @supabase/supabase-js
npm install -D nodemon
```

---

## 10. API Design

### Endpoints Reference

```
POST   /api/sos                → Trigger SOS alert
POST   /api/sms-reply          → Twilio inbound SMS webhook
POST   /api/register/patient   → Register a new patient
POST   /api/register/volunteer → Register a new volunteer
POST   /api/register/hospital  → Register a hospital
POST   /api/login              → Health worker login
GET    /api/alerts             → Get active alerts (coordinator)
GET    /api/alerts/:id         → Get single alert + responder status
GET    /api/patients           → Get health worker's patients
GET    /api/volunteers/nearby  → Get volunteers within radius
GET    /api/status/:token      → Family status page (no auth)
POST   /api/escalate/:alertId  → Manually trigger escalation
PATCH  /api/alerts/:id/resolve → Mark alert resolved
```

### SOS Endpoint Detail

**Request:**
```json
POST /api/sos
{
  "phone": "+919876543210",
  "trigger_method": "pwa"
}
```

**Server logic:**
```javascript
app.post('/api/sos', async (req, res) => {
  const { phone, trigger_method } = req.body;

  // 1. Find patient by phone
  const patient = await supabase
    .from('patients')
    .select('*, preferred_hospital(*)')
    .eq('phone_primary', phone)
    .single();

  // 2. Create alert record
  const alert = await supabase
    .from('alerts')
    .insert({ patient_id: patient.id, trigger_method, priority: 1 })
    .select().single();

  // 3. Find volunteers within 5km (PostGIS)
  const volunteers = await supabase.rpc('get_nearby_volunteers', {
    patient_lat: patient.location.lat,
    patient_lng: patient.location.lng,
    radius_meters: 5000
  });

  // 4. Send SMS to each volunteer
  for (const v of volunteers.data) {
    await twilioClient.messages.create({
      to: v.phone,
      from: process.env.TWILIO_NUMBER,
      body: buildAlertSMS(patient, v)
    });
    await logAlertResponse(alert.id, v.id);
  }

  // 5. Schedule escalation check (5 min)
  setTimeout(() => checkEscalation(alert.id), 5 * 60 * 1000);

  res.json({ success: true, alert_id: alert.id });
});
```

### PostGIS Stored Function

```sql
CREATE OR REPLACE FUNCTION get_nearby_volunteers(
  patient_lat FLOAT,
  patient_lng FLOAT,
  radius_meters INT
)
RETURNS TABLE(id UUID, name TEXT, phone TEXT, distance_m FLOAT) AS $$
BEGIN
  RETURN QUERY
  SELECT
    v.id, v.name, v.phone,
    ST_Distance(
      v.location::geography,
      ST_Point(patient_lng, patient_lat)::geography
    ) AS distance_m
  FROM volunteers v
  WHERE
    v.is_active = TRUE AND
    ST_DWithin(
      v.location::geography,
      ST_Point(patient_lng, patient_lat)::geography,
      radius_meters
    )
  ORDER BY distance_m ASC;
END;
$$ LANGUAGE plpgsql;
```

### Twilio SMS Webhook

```javascript
app.post('/api/sms-reply', async (req, res) => {
  const from  = req.body.From;  // volunteer phone
  const body  = req.body.Body.trim().toUpperCase();

  const volunteer = await getVolunteerByPhone(from);
  const activeResponse = await getActiveAlertResponse(volunteer.id);

  if (!activeResponse) return res.sendStatus(204);

  if (body === 'YES') {
    // Update alert: volunteer confirmed
    await supabase.from('alerts').update({
      status: 'volunteer_responding',
      responding_volunteer_id: volunteer.id,
      volunteer_confirmed_at: new Date()
    }).eq('id', activeResponse.alert_id);

    // SMS to patient
    await sendSMS(activeResponse.patient.phone_primary,
      `Help is coming. ${volunteer.name} is on the way to you. Stay where you are.`);

    // SMS to family contacts
    await notifyFamily(activeResponse.patient);

    // SMS pre-alert to nearest clinic
    await prealertClinic(activeResponse.patient, volunteer);

    // Real-time push to coordinator dashboard
    await supabase.from('alert_responses').update({
      responded_at: new Date(), response: 'YES'
    }).eq('id', activeResponse.id);
  }

  if (body === 'NO') {
    await supabase.from('alert_responses').update({
      responded_at: new Date(), response: 'NO'
    }).eq('id', activeResponse.id);
  }

  res.sendStatus(200);
});
```

---

## 11. Core Flows & Flowcharts

### Flow 1: Full SOS Lifecycle

```
PATIENT taps SOS button
        │
        ▼
[Is device online?]
        │
   YES  │  NO
        │   └──▶ Queue in IndexedDB
        │         Retry when online ─────────────┐
        │                                        │
        ▼                                        │
POST /api/sos ◀──────────────────────────────────┘
        │
        ▼
Find patient by phone number
        │
        ▼
Create alert record in DB (status: 'active')
        │
        ▼
PostGIS: get volunteers within 5km, sorted by distance
        │
        ├── [0 volunteers found?]
        │         └──▶ Widen to 10km immediately
        │              Notify coordinator directly
        │
        ▼
Send SMS to each volunteer simultaneously via Twilio
        │
        ▼
Start 5-minute escalation timer
        │
        ▼
[Any volunteer replies YES within 5 min?]
        │
   YES  │  NO
        │   └──▶ ESCALATION WAVE 2
        │         (wider radius, more volunteers)
        │         Alert on-call coordinator
        │
        ▼
Update alert: status = 'volunteer_responding'
        │
        ├──▶ SMS to patient: "Help is coming. [Name] is on the way."
        ├──▶ SMS to family contacts
        ├──▶ SMS pre-alert to clinic: patient details + ETA
        └──▶ Real-time push to coordinator dashboard
                │
                ▼
[Patient arrives at clinic]
                │
                ▼
Health worker marks: status = 'resolved'
                │
                ▼
Outcome recorded → admin analytics
```

---

### Flow 2: Volunteer Response Flow

```
Volunteer receives SMS:
"MAMA ALERT: [Name], near [landmark],
 [N] weeks pregnant. Reply YES to go."
        │
        ▼
[Volunteer replies YES or NO?]
        │
   YES  │  NO
        │   └──▶ Mark NO in alert_responses
        │         System moves to next volunteer
        │
        ▼
Twilio webhook fires → POST /api/sms-reply
        │
        ▼
Find volunteer by phone number
Find their active alert response
        │
        ▼
Update alert → responding_volunteer_id = volunteer.id
        │
        ▼
Send volunteer directions SMS:
"Go to [patient name] at [landmark].
 Take to [clinic name]. They are expecting you."
        │
        ▼
Volunteer arrives → continues via SMS or app
```

---

### Flow 3: Escalation Logic

```
Alert created (T = 0)
        │
        ▼
Wave 1: SMS to all volunteers within 5km (T+0)
        │
        ▼ wait 5 minutes
        │
[Any YES response?]
        │
   YES  │  NO
        │   │
(done) │   ▼
        │  Wave 2: Widen to 10km radius (T+5)
        │  Mark alert priority = 2 (escalated)
        │  Notify on-call coordinator via SMS
        │          │
        │          ▼ wait 5 more minutes
        │          │
        │  [Any YES response?]
        │          │
        │     YES  │  NO
        │          │   │
        │  (done)  │   ▼
        │          │  Wave 3: Widen to 20km (T+10)
        │          │  Mark priority = 3 (critical)
        │          │  Coordinator must call patient directly
        │          │  Contact government ambulance
        │          │          │
        │          │          ▼
        │          │  Log as unresolved → manual follow-up
        │          │  required
        │
```

---

### Flow 4: USSD Flow (No Internet)

```
Patient dials *456#
        │
        ▼
USSD Gateway identifies phone number
        │
        ▼
Menu appears on phone screen (no internet needed):

  "MamaAlert
   1. I need help NOW
   2. I am okay
   3. Call my health worker"

        │
Patient presses 1
        │
        ▼
USSD Gateway sends HTTP request to backend
POST /api/sos with { phone, trigger_method: 'ussd' }
        │
        ▼
Same SOS flow as PWA trigger →
(PostGIS query → volunteer SMS → escalation timer)
        │
        ▼
SMS confirmation sent to patient:
"MamaAlert: Help is coming to you.
 Stay where you are."
```

---

### Flow 5: Offline PWA Queue

```
Patient taps SOS — no internet signal
        │
        ▼
Service Worker intercepts fetch → network fails
        │
        ▼
IndexedDB: save alert to 'pending_alerts' store
{
  phone: "+91...",
  trigger_method: "pwa",
  timestamp: Date.now(),
  queued: true
}
        │
        ▼
Background Sync API registers sync event: 'sync-sos'
        │
        ▼
[Phone regains signal — any time, even after browser closed]
        │
        ▼
Service Worker fires 'sync-sos' event
        │
        ▼
POST /api/sos with queued data
        │
        ▼
Server processes normally
        │
        ▼
IndexedDB: delete from 'pending_alerts'
        │
        ▼
Push notification to patient (if supported):
"Your emergency alert has been sent."
```

---

## 12. Offline & Accessibility Strategy

### Progressive Web App — Offline Capabilities

**Service Worker caches:**
```
CACHE_FIRST (never changes):
  - /index.html
  - /manifest.json
  - /icons/*
  - Tailwind CSS bundle
  - React bundle

NETWORK_FIRST (needs latest data):
  - /api/patients (health worker's list)
  - /api/alerts

BACKGROUND SYNC:
  - POST /api/sos → queued if offline
  - POST /api/register → queued if offline
```

**vite-plugin-pwa config:**
```javascript
// vite.config.js
VitePWA({
  registerType: 'autoUpdate',
  workbox: {
    globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
    runtimeCaching: [{
      urlPattern: /^https:\/\/api\.mamaalert\.app\/api\/patients/,
      handler: 'NetworkFirst',
      options: { cacheName: 'api-cache', expiration: { maxAgeSeconds: 3600 } }
    }]
  },
  manifest: {
    name: 'MamaAlert',
    short_name: 'MamaAlert',
    theme_color: '#DC2626',
    background_color: '#ffffff',
    display: 'standalone',
    orientation: 'portrait',
    start_url: '/',
    icons: [{ src: '/icon-192.png', sizes: '192x192' },
             { src: '/icon-512.png', sizes: '512x512' }]
  }
})
```

---

### Accessibility Matrix

| User Situation | Solution | Technology |
|---|---|---|
| No internet, basic phone | USSD `*456#` menu | Africa's Talking USSD |
| No smartphone at all | SMS trigger via registered number | Twilio inbound SMS |
| Visually impaired | IVR voice call reads alert status aloud | Twilio Voice |
| Cannot read | Icon-only SOS screen, no text needed | CSS + large iconography |
| Cannot speak | SOS tap only, no voice call made | PWA touch only |
| Deaf/mute volunteer | SMS-only flow, no call required | Twilio SMS |
| No phone at all | Family member's number as proxy trigger | Multi-contact registration |
| Low literacy health worker | Registration form with dropdowns only | React form, no free text |

### Incapacitation Detection
If patient triggers SOS but does not interact with any confirmation within 60 seconds:
- System auto-flags alert as **Priority 2**
- Doubles volunteer radius immediately
- Sends coordinator a "patient may be incapacitated" SMS
- Family contact is notified immediately (not after volunteer confirms)

---

## 13. SMS / USSD / Voice Architecture

### SMS Templates

**To volunteer (alert):**
```
MAMA ALERT: [Patient Name], near [Landmark], [N] weeks pregnant.
[Risk flags if any: "HIGH RISK - pre-eclampsia"]
Distance from you: [X] km.
Reply YES if you can go. Reply NO to decline.
- MamaAlert
```

**To volunteer (confirmed directions):**
```
Thank you [Name]. Go to: [Patient landmark, Village].
Take her to: [Clinic Name] ([X] km from patient).
They are expecting her. Blood type: [B+].
Reply DONE when she is at clinic.
```

**To patient (confirmation):**
```
MamaAlert: Help is coming.
[Volunteer name] is on the way to you.
Stay where you are. Do not walk to the road alone.
```

**To family:**
```
MamaAlert: [Patient name] has sent an emergency alert.
[Volunteer name] is going to help her.
She will be taken to [Clinic name].
Track here: mamaalert.app/status/[token]
```

**To clinic (pre-alert):**
```
PRE-ALERT - MamaAlert:
Patient: [Name], [N] weeks, Blood: [type]
Risk: [flags or "None"]
Transported by: [Volunteer name] ([skill])
ETA: approximately [N] minutes
Please prepare.
```

**To coordinator (no response):**
```
URGENT - MamaAlert:
[Patient name] triggered SOS [N] minutes ago.
No volunteer has confirmed.
Alert ID: [id]
Please intervene directly.
```

### Twilio Configuration

```javascript
// server/services/twilio.js
const twilio = require('twilio');
const client = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

const sendSMS = async (to, body) => {
  return client.messages.create({
    from: process.env.TWILIO_NUMBER,
    to,
    body
  });
};

// IVR voice call for visually impaired
const callPatient = async (phone, message) => {
  return client.calls.create({
    from: process.env.TWILIO_NUMBER,
    to: phone,
    twiml: `<Response><Say voice="alice" language="en-IN">
      ${message}
    </Say></Response>`
  });
};
```

---

## 14. Geospatial Radius Logic

### How Coordinates Are Stored

At registration, the health worker's browser captures GPS:
```javascript
navigator.geolocation.getCurrentPosition((pos) => {
  const { latitude, longitude } = pos.coords;
  // Stored in Supabase as GEOGRAPHY(POINT, 4326)
  // SRID 4326 = standard WGS84 used by GPS
});
```

### Radius Query Explained

```sql
-- Find all active volunteers within 5km of patient
SELECT
  v.id,
  v.name,
  v.phone,
  v.skills,
  v.vehicle,
  ST_Distance(
    v.location::geography,
    ST_Point(73.8567, 18.5204)::geography  -- patient's lng, lat
  ) AS distance_meters
FROM volunteers v
WHERE
  v.is_active = TRUE
  AND ST_DWithin(
    v.location::geography,
    ST_Point(73.8567, 18.5204)::geography,
    5000  -- 5000 meters = 5km
  )
ORDER BY distance_meters ASC;  -- nearest first
```

### Radius Expansion on Escalation

```javascript
const ESCALATION_RADII = [5000, 10000, 20000]; // meters
const ESCALATION_DELAYS = [5, 5]; // minutes between waves

const checkEscalation = async (alertId, wave = 0) => {
  const alert = await getAlert(alertId);
  if (alert.status !== 'active') return; // already resolved

  const radius = ESCALATION_RADII[wave];
  const volunteers = await getNearbyVolunteers(
    alert.patient.lat, alert.patient.lng, radius
  );

  // Filter out volunteers already contacted in previous waves
  const newVolunteers = volunteers.filter(
    v => !alert.previously_contacted.includes(v.id)
  );

  for (const v of newVolunteers) {
    await sendAlertSMS(v, alert);
  }

  // Update alert escalation count
  await supabase.from('alerts')
    .update({ escalation_count: wave + 1, priority: wave + 2 })
    .eq('id', alertId);

  // Schedule next escalation wave if not last
  if (wave < ESCALATION_RADII.length - 1) {
    setTimeout(
      () => checkEscalation(alertId, wave + 1),
      ESCALATION_DELAYS[wave] * 60 * 1000
    );
  } else {
    // Final escalation — alert coordinator directly
    await notifyCoordinatorDirectly(alert);
  }
};
```

### Landmark Fallback (No GPS)

If GPS is unavailable at registration:
1. Health worker types village name → system geocodes using OpenStreetMap Nominatim API
2. Accuracy: ~300–500m (sufficient for 5km radius)
3. Manual pin-drop on Mapbox map as final fallback

---

## 15. Escalation Logic

### Escalation State Machine

```
ALERT STATES:
  active              → waiting for first YES
  volunteer_responding → first YES received
  at_facility         → patient arrived at clinic
  resolved            → outcome recorded
  escalated           → no response, wider wave sent
  failed              → no response after all waves, manual needed

ESCALATION RULES (configurable by NGO admin):
  Wave 1: 5km radius, wait 5 min
  Wave 2: 10km radius, wait 5 more min → alert priority 2
  Wave 3: 20km radius, coordinator notified directly → priority 3
  Final:  Coordinator must call patient + government ambulance
```

### Priority System

| Priority | Trigger | Action |
|---|---|---|
| 1 — Normal | Standard SOS | 5km wave, 5min timer |
| 2 — Escalated | No response wave 1 | 10km wave, coordinator SMS |
| 3 — Critical | No response wave 2 | 20km wave, coordinator call, ambulance |
| 4 — Incapacitated | Patient unresponsive after tap | Auto-escalate to P2, family notified immediately |

---

## 16. Security & Privacy

### Data Protection

```
Patient data classified as: SENSITIVE HEALTH DATA

At rest:
  - Patient medical records: AES-256 encrypted column
  - Supabase Row-Level Security: health workers see only their patients
  - Admins see only their zone

In transit:
  - All API calls over HTTPS/TLS 1.3
  - Twilio SMS: encrypted in transit by Twilio
  - JWT tokens: signed with HS256, expiry 24h

Access control:
  - Patient screen: phone number as identity (no login)
  - Volunteer screen: phone number as identity (no login)
  - Health worker: email + password (Supabase Auth)
  - Admin: email + password + zone restriction

Family status page:
  - URL contains one-time random token (UUID)
  - Shows name + status only — NO medical data
  - Token invalidated after alert is resolved
```

### Supabase RLS Policies

```sql
-- Health workers see only their own patients
CREATE POLICY "hw_own_patients" ON patients
  FOR ALL USING (health_worker_id = auth.uid());

-- Admins see all patients in their zone
CREATE POLICY "admin_zone_patients" ON patients
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM health_workers hw
      WHERE hw.user_id = auth.uid()
      AND hw.access_level = 'admin'
      AND hw.zone_id = patients.zone_id
    )
  );

-- Alerts: only responding volunteer + coordinator can see full details
CREATE POLICY "alert_access" ON alerts
  FOR SELECT USING (
    responding_volunteer_id = auth.uid()
    OR EXISTS (SELECT 1 FROM health_workers
               WHERE user_id = auth.uid())
  );
```

---

## 17. Project Folder Structure

```
mamaalert/
├── client/                          ← React PWA (deploy to Vercel)
│   ├── public/
│   │   ├── manifest.json
│   │   ├── icon-192.png
│   │   └── icon-512.png
│   ├── src/
│   │   ├── main.jsx
│   │   ├── App.jsx                  ← Router setup
│   │   ├── views/
│   │   │   ├── PatientSOS.jsx       ← Big red button screen
│   │   │   ├── VolunteerDashboard.jsx
│   │   │   ├── HospitalInbox.jsx
│   │   │   ├── HealthWorkerRegister.jsx
│   │   │   ├── FamilyStatus.jsx     ← Public, token-based
│   │   │   └── AdminZone.jsx
│   │   ├── components/
│   │   │   ├── SOSButton.jsx
│   │   │   ├── AlertCard.jsx
│   │   │   ├── PatientCard.jsx
│   │   │   ├── MapView.jsx
│   │   │   └── StatusBadge.jsx
│   │   ├── hooks/
│   │   │   ├── useGeolocation.js
│   │   │   ├── useRealtimeAlerts.js
│   │   │   └── useOfflineQueue.js
│   │   ├── services/
│   │   │   ├── supabase.js          ← Supabase client init
│   │   │   ├── api.js               ← Axios API calls
│   │   │   └── offline.js           ← IndexedDB queue
│   │   └── service-worker.js        ← Workbox SW
│   ├── vite.config.js
│   └── tailwind.config.js
│
├── server/                          ← Express API (deploy to Railway)
│   ├── index.js                     ← App entry point
│   ├── routes/
│   │   ├── sos.js                   ← POST /api/sos
│   │   ├── smsReply.js              ← POST /api/sms-reply (Twilio webhook)
│   │   ├── register.js              ← POST /api/register/*
│   │   ├── alerts.js                ← GET /api/alerts
│   │   ├── auth.js                  ← POST /api/login
│   │   └── status.js               ← GET /api/status/:token
│   ├── services/
│   │   ├── twilio.js                ← SMS + IVR helpers
│   │   ├── supabase.js              ← DB queries
│   │   ├── geo.js                   ← Radius query helper
│   │   └── escalation.js           ← Escalation timer logic
│   ├── middleware/
│   │   ├── auth.js                  ← JWT verification
│   │   └── twilioValidate.js        ← Twilio signature check
│   └── .env
│
├── supabase/
│   ├── schema.sql                   ← Full DB schema (run once)
│   └── functions.sql               ← PostGIS stored functions
│
├── .github/
│   └── workflows/
│       └── deploy.yml              ← GitHub Actions CI/CD
│
└── README.md
```

---

## 18. Build Order & Hackathon Timeline

### Day 1 — Core Plumbing (Backend + DB)

```
Morning:
  □ Create Supabase project
  □ Run schema.sql — all tables created
  □ Run functions.sql — PostGIS radius function
  □ Enable Row-Level Security policies
  □ Create Twilio account → get phone number

Afternoon:
  □ Scaffold Express server
  □ POST /api/sos — basic handler
  □ PostGIS radius query working
  □ Twilio SMS sending working
  □ POST /api/sms-reply — webhook (YES/NO handling)

Evening:
  □ End-to-end test: manual SOS → SMS fires → reply YES → DB updated
  □ Patient confirmation SMS working
  □ Escalation timer working
```

### Day 2 — Both PWA Interfaces

```
Morning:
  □ Vite + React + Tailwind setup
  □ vite-plugin-pwa configured
  □ PatientSOS.jsx — big red button, phone-based identity
  □ Offline queue with IndexedDB working
  □ Background Sync service worker

Afternoon:
  □ HealthWorkerRegister.jsx — full registration form
  □ VolunteerDashboard.jsx — alert feed + YES/NO buttons
  □ Supabase real-time subscription for live updates

Evening:
  □ HospitalInbox.jsx — pre-alert feed
  □ FamilyStatus.jsx — token-based read-only page
  □ Basic AdminZone.jsx — patient + volunteer list
  □ MapView.jsx — Mapbox coordinator map
```

### Day 3 — Polish + Demo Prep

```
Morning:
  □ IVR voice call for visually impaired (Twilio Voice)
  □ USSD flow (Africa's Talking sandbox)
  □ Family notification SMS loop
  □ Clinic pre-alert SMS with all patient details
  □ Incapacitation detection logic

Afternoon:
  □ Full end-to-end demo walkthrough
  □ Seed demo data (test patients, volunteers, hospitals)
  □ Deploy frontend to Vercel
  □ Deploy backend to Railway
  □ Test on real mobile device

Evening:
  □ Record 2–5 minute demo video
  □ Prepare ZIP of source code
  □ Final submission
```

---

## 19. Test Case Scenarios

### Scenario 1 — Priya, Silent Emergency (2:40 AM)

**Profile:** 38 weeks, husband away, elderly mother-in-law, severe bleeding.

| Time | Event |
|---|---|
| 2:41 AM | Priya taps SOS on bookmarked PWA |
| 2:41 AM | System reads profile: 38 weeks, risk: low placenta, blood B+ |
| 2:42 AM | PostGIS finds 4 volunteers within 5km |
| 2:42 AM | SMS fires to all 4 simultaneously |
| 2:43 AM | Ravi (1.2km) replies YES |
| 2:43 AM | Priya receives: "Help is coming. Ravi is on the way." |
| 2:43 AM | PHC Wai receives pre-alert: blood B+, possible hemorrhage, ETA 20 min |
| 2:43 AM | Husband Rahul receives family status SMS |
| 3:05 AM | Priya arrives. Staff and blood already prepared. |

**Key outcome:** Delay 1 = 0 min. Delay 2 = 22 min (vs 2.5 hrs). Delay 3 = eliminated.

---

### Scenario 2 — Amara, No Internet, Feature Phone (Ghana)

**Profile:** 19 years, first pregnancy, 40 weeks, active labour, no smartphone.

| Time | Event |
|---|---|
| 11:17 AM | Amara dials `*456#`. USSD menu appears (no internet). |
| 11:17 AM | Presses 1 — "I need help now" |
| 11:18 AM | System identifies her by phone. Alert created. |
| 11:19 AM | 6 volunteers alerted. Sister Agnes (1.2km) replies YES. Kofi (taxi) replies YES. |
| 11:20 AM | Coordinator dashboard updates live. |
| 11:20 AM | SMS to Kofi: "Pick up Sister Agnes first, then take to Fomena Clinic." |
| 11:28 AM | Sister Agnes arrives at Amara's home. Monitors contractions. |
| 11:55 AM | Amara arrives with trained attendant. Clinic prepared. |

---

### Scenario 3 — Fatima, Cannot Speak (Nigeria)

**Profile:** 31 weeks, pre-eclampsia, blurred vision, alone with two small children.

| Time | Event |
|---|---|
| 4:56 PM | Fatima taps SOS. Does not interact further (cannot). |
| 4:56 PM | System detects no interaction → auto-escalates to Priority 2. |
| 4:57 PM | 8 volunteers alerted (wider radius, incapacitation mode). |
| 4:57 PM | Husband Malik on contact list receives immediate SMS. |
| 4:58 PM | Nurse Blessing (0.8km) replies YES. |
| 4:59 PM | Fatima receives SMS + IVR voice call: "Help is coming. Stay where you are." |
| 5:03 PM | Nurse Blessing arrives. Identifies pre-eclampsia. Calls clinic. |
| 5:06 PM | Malik receives: "Fatima has been helped. Being taken to Maiduguri General." |

---

### Scenario 4 — Sister Meena, Health Worker's Week

**Profile:** ASHA worker, 47 registered patients.

**Monday:** Dashboard shows Sunita Devi (42 weeks) has not checked in for 8 days. Meena visits proactively. Finds early obstructed labour signs. Refers before emergency.

**Wednesday:** Gets volunteer SMS alert at 6 PM. She is nearest. Replies YES. Supports Kamla through early labour, coordinates transport.

**Friday:** New patient moves to village. Registered in 3 minutes via registration form. Immediately in safety net.

---

### Scenario 5 — No One Responds (System Stress Test)

**Profile:** Maria, 3 AM, remote area. 4 volunteers alerted. No reply (phones on silent).

| Time | Action |
|---|---|
| T+0 | Wave 1: 4 volunteers within 5km alerted |
| T+5 min | No YES. Wave 2: 8 more volunteers in 10km alerted. |
| T+5 min | Coordinator on-call receives: "UNRESPONDED ALERT: Maria. 7 mins, no volunteer." |
| T+7 min | Coordinator calls Maria directly. |
| T+9 min | One Wave 2 volunteer replies YES. |
| T+10 min | Coordinator calls government ambulance as backup. |

**Why this matters:** Judges will ask "what if no one responds?" This shows the answer.

---

## 20. Judging Criteria Alignment

### Impact
- Directly addresses SDG 3.1 — maternal mortality reduction target by 2030
- 260,000 deaths/year globally; 42–52% occur in transit or at home — directly addressable
- GNEC's 1,600 NGO subsidiaries could deploy this to field workers on day one
- Every feature is grounded in WHO's Three Delays evidence base

### Innovation
- No existing solution activates a community volunteer circle via SMS in low-connectivity settings
- Incapacitation detection from interaction patterns — novel UX
- Pre-alert eliminates all three delays simultaneously, not just one
- USSD trigger means zero-internet, zero-smartphone required
- Patient-owned (no government server, no app store)

### Feasibility & Scalability
- Entire stack runs on free tiers during hackathon
- Three-day solo build is realistic with the scaffolded structure
- NGO deployment: health worker needs only a phone and 3 minutes to register a patient
- Scales geographically by adding zones to the admin panel
- SMS/USSD fallback means works in any country with mobile coverage (190+ countries)

### Design
- Patient screen: one button, full screen, no literacy required
- Volunteer screen: one decision (YES/NO), all context visible
- SMS as UI for feature phone users — no app to learn
- IVR voice for blind users — no screen required
- Registration form: dropdowns-first, minimal free text

### Presentation
- Opens with live 2026 data (WHO, Gavi, Project HOPE citations)
- Three compelling human stories (Priya, Fatima, Meena)
- Live demo of real end-to-end SOS flow
- Failure case demonstrated (no response scenario)
- Closes with GNEC deployment pitch — directly to this judging panel

---

## 21. Presentation Video Arc

```
0:00 – 0:30   THE HOOK
  "Right now. Tonight. A woman is dying not because
   medicine doesn't exist — but because no one could
   get to her in time."
  "260,000 women. Every year. One every two minutes."
  "42% of them never made it to a hospital."

0:30 – 1:00   THE PROBLEM
  Quick visual: the Three Delays model.
  "It's not the disease. It's the delay."

1:00 – 2:30   LIVE DEMO
  Show Priya's scenario:
  → SOS tap on phone
  → SMS fires to Ravi
  → Ravi replies YES
  → Coordinator dashboard updates live
  → PHC Wai pre-alert SMS shown

2:30 – 3:00   THE EDGE CASES
  "What if she has no internet?" — USSD demo
  "What if no one responds?" — escalation wave shown

3:00 – 3:30   THE SCALE STORY
  "GNEC has 1,600 NGO partners.
   Every one of them has field workers.
   Every field worker has a phone.
   MamaAlert can be deployed to all of them — today."

3:30 – 4:00   THE CLOSE
  "We didn't build a health app.
   We built a network activation system.
   For the humans who already surround every
   pregnant woman — and just need to be called."
```

---

## 22. Environment Variables Reference

```bash
# server/.env

# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Twilio
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your-auth-token
TWILIO_NUMBER=+14155238886

# Africa's Talking (USSD)
AT_API_KEY=your-africastalking-api-key
AT_USERNAME=sandbox
AT_USSD_CODE=*456#

# JWT
JWT_SECRET=your-super-secret-jwt-key-min-32-chars

# App
PORT=3000
CLIENT_URL=https://mamaalert.vercel.app
NODE_ENV=production
```

```bash
# client/.env

VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_API_URL=https://your-backend.railway.app
VITE_MAPBOX_TOKEN=pk.eyJ1...
```

---

## 23. Free Tier Limits

All services fit within free tiers for hackathon demo:

| Service | Free Limit | Expected Usage | Safe? |
|---|---|---|---|
| Supabase | 500MB DB, 50k rows, real-time included | < 1,000 rows demo | Yes |
| Twilio | $15 trial credit (~500 SMS) | < 50 SMS in demo | Yes |
| Vercel | Unlimited deploys, 100GB bandwidth | Negligible | Yes |
| Railway | $5/month free credit | < $0.50 demo | Yes |
| Mapbox | 50,000 map loads/month | < 100 demo | Yes |
| Africa's Talking | Free sandbox | Sandbox only | Yes |
| GitHub Actions | 2,000 min/month free | < 10 min | Yes |

**Total cost to build and demo MamaAlert: $0.**

---

## Quick Reference Card

```
WHAT IT IS:    Community-powered maternal emergency PWA
WHO IT HELPS:  Pregnant women in rural/low-connectivity areas
HOW IT WORKS:  1 tap → 5km radius volunteer SMS → clinic pre-alert
TECH:          React PWA + Node.js + Supabase + PostGIS + Twilio
ROLES:         Patient / Volunteer / Hospital / Health Worker / Family / Admin
OFFLINE:       USSD *456# for zero-internet, IndexedDB queue for PWA
ACCESSIBILITY: IVR voice, icon-only UI, SMS-only volunteer flow
SDG:           3.1 — Reduce maternal mortality to <70/100k by 2030
DEPLOY TIME:   3 days solo build
COST:          $0 (all free tiers)
```

---

*MamaAlert — GNEC Hackathon 2026 | Built for SDG 3: Good Health & Well-Being*
*"We didn't build a health app. We built a network activation system."*
