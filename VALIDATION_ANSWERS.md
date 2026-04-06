# MamaAlert — Validation answers (code citations)

This document answers every question in `VALIDATION_QUESTIONS.md` using the codebase **after** the validation pass fixes. Line numbers refer to that revision.

---

## SECTION 1 — Database & schema

**1.** `patients.location` is `GEOGRAPHY (POINT, 4326) NOT NULL` — `supabase/schema.sql` line **53**.

**2.** GIST indexes: `patients_location_gix`, `volunteers_location_gix`, `hospitals_location_gix` — `supabase/schema.sql` lines **76**, **100**, **122**.

**3.** `get_nearby_volunteers` does **not** use `ST_Point()`; it uses **`ST_MakePoint(patient_lng, patient_lat)`** (longitude first). See `supabase/functions.sql` lines **29–40** and comment at **23**.

**4.** `WHERE v.is_active = true` — `supabase/functions.sql` line **35**. If none match, the function returns **zero rows**.

**5.** `status_token UUID NOT NULL UNIQUE DEFAULT gen_random_uuid()` — `supabase/schema.sql` line **62**.

**6.** `ALTER TABLE public.patients ENABLE ROW LEVEL SECURITY` — line **311**. Policies: `health_workers_see_own_patients` (SELECT own), `health_workers_insert_own_patients`, `health_workers_update_own_patients`, `health_workers_delete_own_patients`, `admin_zone_access_select`, `admin_zone_access_update` — lines **316–380**. Own-patients SELECT: **`health_workers_see_own_patients`** (lines **316–320**).

**7.** `priority INTEGER NOT NULL DEFAULT 1 CHECK (priority IN (1, 2, 3))` — `supabase/schema.sql` line **133**. `escalation.ts` updates `priority` in `runEscalationStep` — lines **188–191**.

**8.** `supabase/seed.sql` exists. Patient + health worker insert only when `demo_hw` is set to a real `auth.users` id — lines **114–126** (otherwise skipped). Three volunteers — **66–99**; one hospital — **24–50**. Third volunteer (Kofi) coordinates were adjusted to stay **within ~5 km** of the demo patient — **90–92** (`ST_MakePoint(73.8620, 18.5230)`).

---

## SECTION 2 — SOS route

**9.** Handler in `server/src/routes/sos.ts`: parse body (**18–22**); on failure 400 (**19–21**); call `triggerSos` (**25–28**); 201 success (**30**); catch 404/409/500 (**31–42**). Comment: duplicate logic in `sosService` — line **7**.

**10.** Not found: `triggerSos` throws 404 (`server/src/services/sosService.ts` **26–30**). Route returns **404** JSON (**33–35**). **No** `logError` for 404. Server does **not** crash.

**11.** Retry at 10 km: `sosService.ts` **88–92**.

**12.** Duplicate guard is in **`triggerSos`**, not in `sos.ts`: recent alert same patient, statuses `active` | `volunteer_responding` | `at_facility`, within **10 minutes** — `sosService.ts` **34–49**. Three taps within 30 s: **first** succeeds; **second/third** → **409** (if still within window).

**13.** SMS in **`sosService.ts`** loop with per-volunteer `try/catch` — **95–117** (not `sos.ts`).

**14.** Schema `sos.ts` **10–13**. Required: `phone`, `triggerMethod`. Missing `triggerMethod` → **400** (no default).

**15.** `app.use('/api/sos', sosRateLimit, sosRouter)` — `server/src/index.ts` **47**. Limits: **3** per **60_000 ms** — `server/src/middleware/rateLimiter.ts` **3–7**.

---

## SECTION 3 — SMS reply

**16.** `smsReplyRouter.use(validateTwilioSignature)` — `server/src/routes/smsReply.ts` **18–22**.

**17.** `applyVolunteerYes` order — `server/src/services/volunteerReply.ts`: `alert_responses` update **164–167**; `alerts` update **186–194**; directions SMS **200–207**; patient SMS **209–214**; family **216–225**; clinic **227–235**.

**18.** Yes — direct `alerts` update (**186–194**).

**19.** TwiML / empty Response — e.g. **36–37**, **54–55**, **64** in `smsReply.ts`.

**20.** `findActivePendingResponseForVolunteer` — `volunteerReply.ts` **66–87**. Ambiguity if multiple simultaneous active alerts with pending rows: **possible** wrong choice; documented in code review.

---

## SECTION 4 — Escalation

**21.** Default delay **`5 * 60 * 1000` ms** unless `ESCALATION_DELAY_MS` set — `escalation.ts` **27–34**. Zone `escalation_delay_ms` may override (≥ 30 s) — **69–72**.

**22.** `alreadyContactedVolunteerIds` + `fresh = volunteers.filter((v) => !contacted.has(v.id))` — `escalation.ts` **80–98**, **177–186**.

**23.** Guards: `alertData.status !== 'active'` → return — **159–161**; timer path **242–244**.

**24.** Wave index `2`: log + coordinator SMS + optional voice — `escalation.ts` **279–300**. No ambulance API.

---

## SECTION 5 — USSD

**25.** `res.type('text/plain')`; `CON` — `ussd.ts` **24–27**; `END` — e.g. **32**, **43**.

**26.** Same `triggerSos` — `ussd.ts` **38–41**.

**27.** `normalizePhone` + `triggerSos` / `fetchPatientForSos` — **38–39**, **64**.

---

## SECTION 6 — Geo

**28.** RPC params `patient_lat`, `patient_lng`, `radius_meters` — `server/src/services/geo.ts` **56–59**.

**29.** `geographyPointWkt(lng, lat)` → `SRID=4326;POINT(lng lat)` — `server/src/routes/register.ts` **66–68**, **97**.

**30.** Single nearest (`LIMIT 1` in SQL); `getNearbyHospital` returns **null** if empty, **throws** on RPC error — `geo.ts` **77–94**.

---

## SECTION 7 — Patient SOS

**31.** URL `phone`, `localStorage` — `PatientSOS.tsx` **41–47**; form if short — **231–250**.

**32.** Five states — `SOSButton.tsx` **8**, **18–36**.

**33.** Offline: `addToQueue` + `setStatus('offline')` — `PatientSOS.tsx` **174–177**; Background Sync via `registerSosBackgroundSync` in `useOfflineQueue.ts` **64–68**.

**34.** Button disabled for `sending` **and** `sent` — `SOSButton.tsx` **43**. Server **409** duplicate guard — `sosService.ts` **34–49**. **Reset** clears to new alert — `PatientSOS.tsx` (sent block). **409** handled without offline queue — `PatientSOS.tsx` + `ApiHttpError` in `api.ts`.

**35.** `postPatientHints` + `i18n.changeLanguage` — `PatientSOS.tsx` **119–138**.

---

## SECTION 8 — Realtime / volunteer

**36.** `channel('alerts:…')` + `postgres_changes` on `public.alerts` — `useRealtimeAlerts.ts` **138–141**.

**37.** `removeChannel` — **145–147**.

**38.** `POST /api/volunteer/response` — `api.ts` **143–148**. Loading: `actingId` — `VolunteerDashboard.tsx` **97–111**, **186**.

---

## SECTION 9 — Offline

**39.** DB `mamaalert-offline`, store `pending_alerts`, fields `id`, `payload`, `createdAt` — `offline.ts` **3–12**, **52–56**.

**40.** `await` chain in `addToQueue` — `useOfflineQueue.ts` **64–68**. Errors propagate; `PatientSOS` handles.

**41.** `pwaSync.ts` tag `sync-sos` — **1–13**; `sw-sos.js` sync listener **5–7**.

---

## SECTION 10 — Registration

**42.** `useGeolocation` → `getCurrentPosition` — `HealthWorkerRegister.tsx` **79**, **275–276**; timeout **15_000** — `geolocation.ts` **24**.

**43.** Zod `phone_primary` with `regex(/^\+?[0-9]{8,20}$/)` — `HealthWorkerRegister.tsx` **43**; server `register.ts` **21**.

**44.** Success UI with id, link, **Register another** — `HealthWorkerRegister.tsx` **179–219**.

---

## SECTION 11 — Auth & security

**45.** `supabaseAdmin.auth.getUser(token)` — `middleware/auth.ts` **12–15**. Routers using `requireAuth`: e.g. `register.ts` **70–72**, `adminData.ts` **10–11**, `alerts.ts` **9**, `workerPortal.ts` **9**, `auth.ts` **54** (grep `requireAuth`).

**46.** `helmet()` — `index.ts` **30**; CORS `origin: process.env.CLIENT_URL` — **31–36**.

**47.** `validateEnv()` — `index.ts` **2–3**; required keys — `config/env.ts` **6–37**; startup log lists validated key **names** — `env.ts` (after validation). Missing Twilio token when not mock → **throws** — **33–36**.

**48.** `status.ts` JSON fields **63–69** — no `blood_type`, `risk_flags`, `phone_primary`, `medication`.

---

## SECTION 12 — TypeScript / lint tokens

**49–50.** `npx tsc --noEmit`: **no errors** (client + server) at validation time.

**51.** Search `: any` in TS/JS sources: **none** found.

**52.** `@ts-ignore` / `@ts-expect-error`: **none** found.

---

## SECTION 13 — i18n

**53.** Some JSX still uses non-`t()` strings (e.g. language labels in `PatientSOS.tsx` **24–29**; `formatRelative` in `FamilyStatus.tsx` **8–19**). Full audit: manual review.

**54.** Keys present in `en.json` — `sos.button` **6**, `sos.offline` **10**, `sos.offlineSubtext` **11**, `volunteer.accept` **26**, `family.volunteerResponding` **105** (+ `sos.duplicateDetail`, `sos.reset` added in validation pass).

**55.** Locale files share structure; some **values** in non-English files remain English (pre-existing). Keys aligned for new `sos.duplicateDetail` / `sos.reset`.

---

## SECTION 14 — Message builder

**56.** Exports in `messageBuilder.ts` include the six required plus others (`buildSmsKeywordAck`, `buildFamilyIncapacitationSMS`, `buildVolunteerDoneAck`, `buildCoordinatorWave3ActionSMS`).

**57.** `truncateSmsTwoPart` allows up to **306** GSM characters across two parts — `smsLength.ts` **11–18**. Not limited to 160 when two-part.

**58.** `lang` + `pickLang` — `messageBuilder.ts` **10–15**, **55–62**.

---

## SECTION 15 — E2E

**59.** Example chain: `PatientSOS` → `api.postSos` → `sos.ts` → `sosService` → `geo`, `twilio`, `escalation`, etc.

**60.** Twilio → `smsReply.ts` → `volunteerReply.ts` → DB/Twilio. **Health worker dashboard** subscribes to **`public.alerts`** via **`useAlertsRealtimeRefresh`** and refetches **`getCoordinatorAlerts`** on change — `HealthWorkerDashboard.tsx` + `hooks/useAlertsRealtimeRefresh.ts` (90 s fallback refresh for alerts only). **Admin** uses **`useRealtimeAlerts`** — `AdminZone.tsx`.

**61.** IndexedDB → `useOfflineQueue` / `sw-sos.js` Background Sync.

**62.** `DemoFlow.tsx` **`postSos`** — **29–38** (real HTTP).

---

## SECTION 16 — Deployment

**63.** `client/vercel.json` SPA rewrite — lines **1–3**.

**64.** `server/Procfile`: `web: node dist/index.js`. `railway.json` runs `npm run build && npm start`; `package.json` **`start`** = `node dist/index.js`.

**65.** `localhost` / `127.0.0.1`: see `dev.env.example` files, `VALIDATION_QUESTIONS.md`, `CURSOR_PROMPT.md` (not production app code).

**66.** Demo phones in `DemoFlow.tsx`, placeholders in locale JSONs, `seed.sql` — not secrets. `.env` files excluded from listing secrets here.

---

## SECTION 17 — Live demo (manual)

**67–72.** Requires local run: `npm run dev` in `server/` and `client/`, browser, Twilio/Supabase. **72:** `/status/demo-status-token-abc123` resolves to **`VITE_DEMO_STATUS_TOKEN`** or default seed UUID — `FamilyStatus.tsx` (demo slug + `DEFAULT_DEMO_STATUS_TOKEN`). Auto-refresh **30 s** — `FamilyStatus.tsx` interval **50–53**.

---

## Code fixes applied in this validation pass

| Area | Change |
|------|--------|
| SOS client | `ApiHttpError` + correct handling of **409** / **404** vs offline queue (`api.ts`, `PatientSOS.tsx`) |
| SOS button | Disabled after **`sent`**; duplicate message + **Reset** (`SOSButton.tsx`, i18n) |
| Offline queue | Drop 409 as “already sent” (`useOfflineQueue.ts`, `sw-sos.js`) |
| Coordinator UI | Poll **30 s** on worker overview (`HealthWorkerDashboard.tsx`) |
| Demo status URL | Slug **`demo-status-token-abc123`** maps to seed UUID (`FamilyStatus.tsx`, `dev.env.example`) |
| Seed | Kofi volunteer point within **5 km** of patient (`seed.sql`) |
| SQL | Comment on lon/lat order (`functions.sql`) |
| Env | Log validated **key names** (no values) (`env.ts`) |
| Phone | `phone_primary` regex server + client (`register.ts`, `HealthWorkerRegister.tsx`) |
