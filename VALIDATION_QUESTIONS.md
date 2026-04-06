# MamaAlert — Codebase Validation Questions

> Paste this entire file into Cursor and say:
> "Answer every question below by reading the actual codebase. For each answer, cite the exact file and line number. If something is missing, broken, or incomplete — say so explicitly. Do not guess."

---

## SECTION 1 — Database & Schema Integrity

1. Open `supabase/schema.sql`. What is the exact column definition for `patients.location`? Confirm it uses `GEOGRAPHY(POINT, 4326)` and not `GEOMETRY` or plain `TEXT`.

2. What GIST indexes exist on location columns? List every `CREATE INDEX` statement that uses `USING GIST`. Are all three tables covered — `patients`, `volunteers`, `hospitals`?

3. Open `supabase/functions.sql`. In the `get_nearby_volunteers` function, what is the exact coordinate order passed to `ST_Point()`? It must be `ST_Point(longitude, latitude)` — NOT `ST_Point(latitude, longitude)`. Confirm which order is used and cite the line.

4. Does the `get_nearby_volunteers` function filter by `is_active = TRUE`? What happens if all volunteers in the radius have `is_active = FALSE` — what does the function return?

5. Does the `patients` table have a `status_token` column? What is its type and is it marked `UNIQUE`? This column powers the family status page.

6. Are Row-Level Security policies enabled on the `patients` table? List every RLS policy by name and describe what it allows. Which policy ensures a health worker only sees their own patients?

7. Does the `alerts` table have a `priority` column? What are its possible values and what is its default? Cross-check this with how `escalation.ts` updates it.

8. Does `supabase/seed.sql` exist? Does it insert at least one patient, three volunteers at different distances, and one hospital? Are the volunteer coordinates actually within 5km of the patient coordinates — or did the seed data place them incorrectly?

---

## SECTION 2 — Backend: SOS Route (Most Critical)

9. Open `server/src/routes/sos.ts`. Walk through every step of the handler from top to bottom. List each step as a numbered action. How many distinct operations happen between receiving the request and sending the response?

10. In `sos.ts`, what happens if the patient's phone number is not found in the database? Does it return a 404? Does it log the error? Does it crash the server?

11. What happens in `sos.ts` if `getNearbyVolunteers()` returns an empty array at 5km? Does the system silently fail, or does it automatically retry at 10km? Show the exact code that handles this case.

12. Is there a duplicate alert guard in `sos.ts`? If Priya taps the SOS button 3 times in 30 seconds, does the system send 3 separate alert waves to volunteers, or does it detect the active alert and block duplicates? Show the exact check.

13. In `sos.ts`, are the Twilio SMS sends wrapped in individual try/catch blocks? If one volunteer's SMS fails (invalid number), does the entire route crash or does it continue to the next volunteer?

14. What is the exact Zod schema used to validate the SOS request body? What fields are required? What happens if `triggerMethod` is missing — does it default or reject?

15. Is the `sosRateLimit` middleware applied to `POST /api/sos`? What are the exact limits (requests per window, window duration)?

---

## SECTION 3 — Backend: SMS Reply Webhook

16. Open `server/src/routes/smsReply.ts`. Is Twilio signature validation middleware applied to this route? Show the exact middleware import and usage. If it is missing, this is a critical security vulnerability.

17. In `smsReply.ts`, when a volunteer replies `YES`, list every action the system takes in order. Are all of these present: (a) update `alert_responses`, (b) update `alerts` table status, (c) SMS to patient, (d) SMS to family contacts, (e) SMS to clinic?

18. In `smsReply.ts`, when updating the `alerts` table after a YES — does the code update the `alerts` table directly (not just `alert_responses`)? This is critical because the coordinator dashboard subscribes to `alerts` via Supabase real-time. If only `alert_responses` is updated, the dashboard will not refresh.

19. What does the route return to Twilio after processing? It must return a valid TwiML response — even if empty (`<Response></Response>`). If it returns nothing or a JSON object, Twilio will retry the webhook repeatedly causing duplicate alerts.

20. In `smsReply.ts`, how does the system find which alert a volunteer's YES reply belongs to? What query does it run? Could a volunteer who is in two simultaneous alert networks accidentally confirm the wrong one?

---

## SECTION 4 — Backend: Escalation Logic

21. Open `server/src/services/escalation.ts`. What is the escalation timing — exactly how many milliseconds between Wave 1 and Wave 2? Is there an environment variable to override this for testing (e.g. `ESCALATION_DELAY_MS`)?

22. In the escalation logic, how does Wave 2 avoid re-alerting volunteers already contacted in Wave 1? Show the exact filter or query that excludes previously contacted volunteers.

23. What happens in the escalation function if the alert has already been resolved (volunteer confirmed between Wave 1 firing and the setTimeout callback executing)? Is there a status check at the start of each wave? Show the exact guard.

24. After Wave 3 with no response — what does the system do? Does it notify the coordinator? Does it attempt to contact an ambulance service? Or does it silently stop? Show the exact final-wave code.

---

## SECTION 5 — Backend: USSD Route

25. Open `server/src/routes/ussd.ts`. What is the exact response format returned to Africa's Talking? Does it use `CON` prefix for continuing sessions and `END` prefix for terminal responses? Show one example of each.

26. In the USSD handler, when a user presses `1` (emergency), does it call the same SOS logic as the PWA trigger? Or is there a separate implementation that might behave differently? Confirm they share the same underlying service.

27. How does the USSD handler identify which patient is calling? Does it look up the phone number in the `patients` table the same way `sos.ts` does?

---

## SECTION 6 — Geospatial Logic

28. Open `server/src/services/geo.ts`. In `getNearbyVolunteers()`, what exact parameters are passed to the Supabase `.rpc()` call? Are they named `patient_lat`, `patient_lng`, `radius_meters` — matching exactly what the stored function expects? A mismatch here causes silent failures with zero volunteers returned.

29. In `server/src/routes/register.ts`, when a patient is registered with GPS coordinates `{ lat: 18.5204, lng: 73.8567 }`, what exact string is inserted into the `location` column? It must be `POINT(73.8567 18.5204)` — longitude first. Show the exact WKT construction code.

30. In `getNearbyHospital()`, does it return only the single nearest hospital or a list? What happens if no hospital is within range — does it return `null` gracefully or throw?

---

## SECTION 7 — Frontend: Patient SOS Screen

31. Open `client/src/views/PatientSOS.tsx`. How does the screen identify which patient is using it? Does it read a phone number from a URL param, localStorage, or somewhere else? What happens if no phone is stored — does it show an error or crash?

32. In `PatientSOS.tsx`, what are the exact 5 button states and how does each one render? The states should be: `idle`, `sending`, `sent`, `offline`, `error`. Is each one visually distinct?

33. In `PatientSOS.tsx`, what happens when the SOS button is tapped and `navigator.onLine === false`? Show the exact offline handling code. Does it add to IndexedDB? Does it register a background sync? Does it show the user feedback that their alert is queued?

34. In `PatientSOS.tsx`, is the button disabled after a successful SOS to prevent double-tapping? What prevents Priya from accidentally sending 5 alerts?

35. Is the language of the SOS screen driven by the patient's `language` field from the database, or just browser detection? If Priya's profile says `language: 'hi'` but her browser is in English, which wins?

---

## SECTION 8 — Frontend: Real-Time Updates

36. Open `client/src/hooks/useRealtimeAlerts.ts`. What exact Supabase real-time channel and event does it subscribe to? Show the exact `.channel()` and `.on()` call. Does it subscribe to the `alerts` table specifically, or a different table?

37. In `useRealtimeAlerts.ts`, is the subscription cleaned up when the component unmounts? Show the exact cleanup function in the `useEffect` return. A missing cleanup causes memory leaks and ghost subscriptions that fire on wrong screens.

38. In `VolunteerDashboard.tsx`, when a volunteer taps `YES I AM GOING` — what API call is made? What is the endpoint URL and payload? Does the button show a loading state while the request is in flight?

---

## SECTION 9 — Frontend: Offline Queue

39. Open `client/src/services/offline.ts`. What is the exact name of the IndexedDB database and the object store used for pending alerts? List the schema: what fields does each queued alert record contain?

40. Open `client/src/hooks/useOfflineQueue.ts`. When `addToQueue()` is called, does it use `await` properly? If IndexedDB throws (e.g. storage full), is that error caught and shown to the user or silently swallowed?

41. Does the service worker Background Sync registration exist? Search the codebase for `sync.register` — where is it called and with what tag name? Does the service worker `sync` event listener use the same tag name?

---

## SECTION 10 — Frontend: Registration Form

42. Open `client/src/views/HealthWorkerRegister.tsx`. In the Location section, when the health worker taps "Capture my current location", what hook or function is called? Does it use `navigator.geolocation.getCurrentPosition`? Is there a timeout set in case GPS takes too long?

43. In the registration form, what Zod schema validates the patient data before submission? Is `phone_primary` validated as a proper phone number format? What happens if the health worker submits with an invalid phone number?

44. After successful patient registration, what does the form do? Does it show the generated patient ID? Does it offer to register another patient? Does it clear the form?

---

## SECTION 11 — Authentication & Security

45. Open `server/src/middleware/auth.ts`. How does it verify the Supabase JWT? Does it use the Supabase client's `getUser()` method, or raw JWT verification? Which routes have this middleware applied?

46. In `server/src/index.ts`, is `helmet()` applied? Is CORS configured with a whitelist? Show the exact `origin` value in the CORS config — it should be `process.env.CLIENT_URL`, not `'*'`.

47. In `server/src/index.ts`, is there a startup env var validation block? List every required env var that is checked. What happens if `TWILIO_AUTH_TOKEN` is missing — does the server crash with a clear message or start silently broken?

48. Open `server/src/routes/status.ts`. What exact fields does `GET /api/status/:token` return? Confirm that `blood_type`, `risk_flags`, `phone_primary`, `medication`, and any other medical fields are NOT included in the response.

---

## SECTION 12 — TypeScript Compliance

49. Run `cd client && npx tsc --noEmit` in the terminal and report the output. Are there any TypeScript errors? List every error by file and line number if any exist.

50. Run `cd server && npx tsc --noEmit` in the terminal and report the output. Are there any TypeScript errors on the backend?

51. Search the entire codebase for the string `: any`. List every file and line where `any` is used. Each one is a rules violation that needs to be fixed.

52. Search the entire codebase for `@ts-ignore` and `@ts-expect-error`. List every occurrence. Each one needs justification or removal.

---

## SECTION 13 — i18n Compliance

53. Search the entire `client/src/views/` folder for hardcoded English strings in JSX (text content that is not wrapped in `t()`). List every occurrence by file and line. Examples to search for: `>Help<`, `>Loading<`, `>Submit<`, `>Cancel<`.

54. Open `client/src/i18n/locales/en.json`. Does it contain all the keys listed in the CURSOR_PROMPT? Specifically check for: `sos.button`, `sos.offline`, `sos.offlineSubtext`, `volunteer.accept`, `family.volunteerResponding`.

55. Do all other locale files (`hi.json`, `fr.json`, `sw.json`, `ar.json`, `pt.json`) exist and contain the same keys as `en.json`? Or are some keys missing in non-English files?

---

## SECTION 14 — Message Builder

56. Open `server/src/services/messageBuilder.ts`. List every exported function by name. Are all 6 required functions present: `buildVolunteerAlertSMS`, `buildVolunteerDirectionsSMS`, `buildPatientConfirmationSMS`, `buildFamilySMS`, `buildClinicPreAlertSMS`, `buildCoordinatorEscalationSMS`?

57. For `buildVolunteerAlertSMS` — what is the maximum character length of the output? Run it mentally with a patient named "Priya Sharma", landmark "Near the temple, Khandala Village", 38 weeks. Does the result stay under 160 characters (one SMS unit)?

58. Does `messageBuilder.ts` accept a `lang` parameter? Does it actually change the output language, or is it hardcoded in English regardless of the `lang` value?

---

## SECTION 15 — End-to-End Flow Verification

59. Trace the complete path of a single SOS event from tap to volunteer SMS. List every file touched in order: view → hook → service → API route → service → external API. How many files are involved?

60. Trace what happens when a volunteer replies `YES` via SMS. List every file the code passes through from the Twilio webhook hitting the server to the coordinator dashboard updating. Confirm Supabase real-time is in this chain.

61. Trace the offline SOS flow: patient taps with no signal → signal returns 10 minutes later (browser closed). List every file involved in the queue → sync → send chain. Confirm the flow survives browser close.

62. Open the `DemoFlow.tsx` view. Does the "TRIGGER REAL DEMO" button actually call `POST /api/sos` with the seed patient's phone number? Or does it just simulate visually? For the live hackathon demo, this must send a real SMS.

---

## SECTION 16 — Deployment Readiness

63. Does `client/vercel.json` exist with a rewrite rule for SPA routing? Without it, refreshing `/volunteer` on Vercel returns a 404.

64. Does `server/Procfile` or `railway.json` exist? What is the exact start command for production — does it run `node dist/index.js` (compiled) or `ts-node src/index.ts` (development only)?

65. Search the codebase for `localhost` and `127.0.0.1`. List every occurrence. Any hardcoded localhost URLs will break in production.

66. Search the codebase for any hardcoded phone numbers, API keys, or secrets outside of `.env` files. List every occurrence.

---

## SECTION 17 — Final Demo Checklist

Ask Cursor to run through this live:

67. Start the backend locally (`npm run dev` in `server/`). Does it start without errors? Does it print all env vars as validated?

68. Start the frontend locally (`npm run dev` in `client/`). Does it compile without TypeScript errors?

69. Open `http://localhost:5173/` — does the PatientSOS screen load? Does it show the demo patient's name (Priya Sharma)?

70. Open `http://localhost:5173/volunteer` — does the VolunteerDashboard load? Does it show "Watching for alerts..."?

71. Trigger a test SOS from the PatientSOS screen. Within 30 seconds: (a) does the volunteer phone receive an SMS? (b) does the coordinator dashboard show the alert? (c) does replying YES to the SMS trigger a patient confirmation SMS?

72. Open `http://localhost:5173/status/demo-status-token-abc123` — does the FamilyStatus page load and show Priya's status? Does it auto-refresh?

---

## How to Use This File

Paste into Cursor chat:

> "Read every question in this validation file. Answer each one by examining the actual codebase — cite the exact file and line number for every answer. If any question reveals a bug, missing feature, or rules violation, fix it immediately before moving to the next question. Do not skip any question."

Work through sections in order. Fix issues as they are found. Do not proceed to the demo until all 72 questions have a satisfactory answer.
