# MamaAlert — Cursor Rules

## Core Principle

This is a life-critical system. Code quality, error handling, and offline resilience are not optional — they directly affect whether a woman gets help in time. Every function that touches the SOS flow must handle failure gracefully.

---

## TypeScript Rules

### Strict Mode — Non-Negotiable
```json
// tsconfig.json — both client and server
{
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "exactOptionalPropertyTypes": true
  }
}
```

### No `any` — Ever
```typescript
// ❌ NEVER
const patient: any = await getPatient();

// ✅ ALWAYS — define the type
import type { Patient } from '@/types/patient';
const patient: Patient = await getPatient();
```

### No `as` Type Assertions — Except Supabase Returns
```typescript
// ❌ Never assert unless you have no choice
const data = response as Patient;

// ✅ Use type guards
function isPatient(obj: unknown): obj is Patient {
  return typeof obj === 'object' && obj !== null && 'phone_primary' in obj;
}
```

### Type Files Location
- Client types: `client/src/types/`
- Server types: `server/src/types/`
- Shared types that appear in both: define in both (no shared package for hackathon)

### Required Type Files
```
types/
├── patient.ts       ← Patient, PatientRiskFlag, PatientStatus
├── volunteer.ts     ← Volunteer, VolunteerSkill, VolunteerVehicle
├── hospital.ts      ← Hospital, HospitalService
├── alert.ts         ← Alert, AlertStatus, AlertPriority, AlertResponse
├── healthWorker.ts  ← HealthWorker, AccessLevel
├── zone.ts          ← Zone
└── api.ts           ← ApiResponse<T>, ApiError, SosPayload
```

---

## File & Folder Naming

```
Folders:     kebab-case          → alert-responses/, health-workers/
Components:  PascalCase.tsx      → SOSButton.tsx, AlertCard.tsx
Hooks:       camelCase.ts        → useRealtimeAlerts.ts, useGeolocation.ts
Services:    camelCase.ts        → twilioService.ts, geoService.ts
Routes:      camelCase.ts        → sos.ts, smsReply.ts
Types:       camelCase.ts        → patient.ts, alert.ts
Utils:       camelCase.ts        → formatPhone.ts, buildSMSMessage.ts
i18n files:  locale code         → en.json, hi.json, fr.json
```

---

## React Component Rules

### Always Use Named Exports — No Default Exports for Components
```typescript
// ❌
export default function SOSButton() {}

// ✅
export function SOSButton() {}
```

### Props Interface Always Above Component
```typescript
interface SOSButtonProps {
  patientName: string;
  onTrigger: () => Promise<void>;
  isLoading: boolean;
}

export function SOSButton({ patientName, onTrigger, isLoading }: SOSButtonProps) {
  // ...
}
```

### No Inline Styles — Tailwind Only
```typescript
// ❌
<div style={{ backgroundColor: 'red' }}>

// ✅
<div className="bg-red-600">
```

### shadcn/ui Usage
- Always install components via `npx shadcn-ui@latest add [component]`
- Never copy-paste shadcn source manually
- Place shadcn components in `client/src/components/ui/` (shadcn default)
- Custom components go in `client/src/components/` (not in `ui/`)

### i18n — Every User-Facing String
```typescript
// ❌
<h1>Emergency Help</h1>

// ✅
import { useTranslation } from 'react-i18next';
const { t } = useTranslation();
<h1>{t('sos.title')}</h1>
```

### Loading & Error States — Always Handle Both
```typescript
// Every async component must handle all three states
if (isLoading) return <LoadingSpinner />;
if (error) return <ErrorMessage message={error.message} />;
return <MainContent data={data} />;
```

---

## API & Data Fetching Rules

### Supabase Client — Client Side
```typescript
// client/src/services/supabase.ts — single instance, import everywhere
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/supabase';

export const supabase = createClient<Database>(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);
```

### Supabase Client — Server Side
```typescript
// server/src/services/supabase.ts — uses service role key
import { createClient } from '@supabase/supabase-js';

export const supabaseAdmin = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);
```

### API Calls from Client — Always Wrap in Try/Catch
```typescript
// ❌
const response = await axios.post('/api/sos', payload);

// ✅
try {
  const response = await axios.post<ApiResponse<Alert>>('/api/sos', payload);
  return response.data;
} catch (error) {
  if (axios.isAxiosError(error)) {
    throw new Error(error.response?.data?.message ?? 'SOS failed');
  }
  throw error;
}
```

### Server Routes — Always Return Typed Responses
```typescript
interface SosResponse {
  success: boolean;
  alertId: string;
  volunteersNotified: number;
}

app.post('/api/sos', async (req: Request, res: Response<SosResponse>) => {
  // ...
  res.json({ success: true, alertId: alert.id, volunteersNotified: volunteers.length });
});
```

---

## Error Handling Rules

### The SOS Route is Life-Critical — Triple Wrap It
```typescript
// Every step in the SOS flow must be wrapped independently
// If volunteer SMS fails, the alert must still be created
// If clinic pre-alert fails, the volunteer must still be confirmed
// Partial success is always better than total failure

try {
  await createAlert(patient.id);
} catch (err) {
  logger.error('Alert creation failed', { patientId: patient.id, err });
  throw err; // This one we must throw — alert is the core
}

try {
  await sendVolunteerSMS(volunteers, alert);
} catch (err) {
  logger.error('Volunteer SMS failed', { alertId: alert.id, err });
  // Don't throw — alert exists, escalation will still run
}
```

### Never Swallow Errors Silently
```typescript
// ❌
try {
  await sendSMS(phone, message);
} catch {}

// ✅
try {
  await sendSMS(phone, message);
} catch (err) {
  logger.error('SMS send failed', { phone, err });
  // Then decide: throw or continue based on criticality
}
```

### Validation on Every API Route
```typescript
import { z } from 'zod';

const SosPayloadSchema = z.object({
  phone: z.string().min(10).max(15),
  triggerMethod: z.enum(['pwa', 'sms', 'ussd']),
});

app.post('/api/sos', async (req, res) => {
  const parsed = SosPayloadSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Invalid payload', details: parsed.error });
  }
  // ...
});
```

---

## Offline & PWA Rules

### IndexedDB Queue — Always Use the `idb` Library
```typescript
import { openDB } from 'idb';

// Never use localStorage for SOS queue — it doesn't survive service worker
// Never use sessionStorage — it clears on close
// Always use IndexedDB via idb for pending_alerts store
```

### Service Worker — Never Skip the Offline Fallback for SOS
```typescript
// In service-worker.ts — SOS must queue if offline
self.addEventListener('fetch', (event) => {
  if (event.request.url.includes('/api/sos')) {
    event.respondWith(
      fetch(event.request).catch(() => queueForSync(event.request))
    );
  }
});
```

### Background Sync — Register Before Returning to User
```typescript
// Queue first, then show "sending..." — never show "sent" until confirmed
await addToQueue(payload);
await navigator.serviceWorker.ready.then(sw =>
  sw.sync.register('sync-sos')
);
```

---

## SMS & Communication Rules

### All SMS Messages Via Central Builder — No Inline Strings
```typescript
// ❌
await sendSMS(volunteer.phone, `MAMA ALERT: ${patient.name}, go now`);

// ✅ — use the message builder, respects language
import { buildVolunteerAlertSMS } from '@/services/messageBuilder';
await sendSMS(volunteer.phone, buildVolunteerAlertSMS(patient, volunteer, alert));
```

### Message Builder Must Support All Languages
```typescript
// server/src/services/messageBuilder.ts
export function buildVolunteerAlertSMS(
  patient: Patient,
  volunteer: Volunteer,
  alert: Alert,
  lang: string = 'en'
): string {
  // Use i18next server-side for SMS language
  // Fall back to English if translation missing
}
```

### Twilio Webhook Validation — Always Verify Signature
```typescript
// middleware/twilioValidate.ts
import twilio from 'twilio';

export function validateTwilioSignature(req: Request, res: Response, next: NextFunction) {
  const valid = twilio.validateRequest(
    process.env.TWILIO_AUTH_TOKEN!,
    req.headers['x-twilio-signature'] as string,
    `${process.env.CLIENT_URL}/api/sms-reply`,
    req.body
  );
  if (!valid) return res.status(403).send('Forbidden');
  next();
}
```

---

## Database Rules

### Never Query Without RLS in Mind
```typescript
// Client-side Supabase always uses anon key → RLS enforced automatically
// Server-side uses service role key → RLS bypassed → be explicit about filters

// ❌ Server-side without explicit filter
const patients = await supabaseAdmin.from('patients').select('*');

// ✅ Server-side always filter by context
const patients = await supabaseAdmin
  .from('patients')
  .select('*')
  .eq('health_worker_id', healthWorkerId);
```

### All Location Columns — Insert as WKT String
```typescript
// PostGIS GEOGRAPHY columns must be inserted as WKT
const locationWKT = `POINT(${lng} ${lat})`; // Note: lng first, then lat

await supabase.from('patients').insert({
  name: patient.name,
  location: locationWKT,
  // ...
});
```

### Radius Query — Always Use the Stored Function
```typescript
// Never write raw PostGIS SQL in route handlers
// Always use the get_nearby_volunteers RPC function

const { data: volunteers } = await supabaseAdmin.rpc('get_nearby_volunteers', {
  patient_lat: patient.lat,
  patient_lng: patient.lng,
  radius_meters: 5000,
});
```

---

## Security Rules

### Environment Variables
- Never commit `.env` files
- Always validate env vars exist at startup — crash fast if missing
- Use `process.env.VAR!` only after startup validation

```typescript
// server/src/index.ts — validate on boot
const requiredEnvVars = [
  'SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY',
  'TWILIO_ACCOUNT_SID', 'TWILIO_AUTH_TOKEN', 'TWILIO_NUMBER',
  'JWT_SECRET', 'CLIENT_URL'
];

for (const key of requiredEnvVars) {
  if (!process.env[key]) {
    throw new Error(`Missing required env var: ${key}`);
  }
}
```

### Rate Limiting on SOS — Prevent Abuse
```typescript
import rateLimit from 'express-rate-limit';

export const sosRateLimit = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 3, // max 3 SOS per minute per IP
  message: { error: 'Too many requests' },
});

app.post('/api/sos', sosRateLimit, sosHandler);
```

### CORS — Whitelist Only
```typescript
app.use(cors({
  origin: process.env.CLIENT_URL,
  methods: ['GET', 'POST', 'PATCH'],
  credentials: true,
}));
```

---

## Code Style Rules

### Async/Await — Never Raw Promises with .then()
```typescript
// ❌
sendSMS(phone, message).then(result => {
  console.log(result);
}).catch(err => {
  console.error(err);
});

// ✅
try {
  const result = await sendSMS(phone, message);
  console.log(result);
} catch (err) {
  console.error(err);
}
```

### Functions — Single Responsibility, Max 40 Lines
- If a function exceeds 40 lines, split it
- The `sosHandler` route should only orchestrate — delegate to service functions

### Comments — Only Explain Why, Not What
```typescript
// ❌ — describes what the code does (obvious)
// Get the patient by phone number
const patient = await getPatientByPhone(phone);

// ✅ — explains why a decision was made
// Use phone as identity instead of session token — patients never log in
const patient = await getPatientByPhone(phone);
```

### Imports — Absolute Paths via Path Alias
```typescript
// ❌
import { supabase } from '../../../services/supabase';

// ✅ — configure '@/' alias in vite.config.ts and tsconfig.json
import { supabase } from '@/services/supabase';
```

---

## Git Rules

### Branch Strategy
```
main          → production (Vercel + Railway auto-deploy)
dev           → integration branch
feature/*     → individual features (e.g. feature/volunteer-dashboard)
fix/*         → bug fixes
```

### Commit Format (Conventional Commits)
```
feat: add volunteer SMS alert with 5km radius
fix: correct PostGIS longitude/latitude order in insert
chore: add seed.sql with demo patient data
refactor: extract SMS message builder to service
docs: update CONTEXT.md with USSD flow details
```

---

## What Cursor Must Never Do

1. **Never use `localStorage` for the SOS queue** — it doesn't survive service worker scope
2. **Never hardcode phone numbers, API keys, or secrets** in any file
3. **Never skip error handling in the SOS route** — partial failure is acceptable, silent failure is not
4. **Never use `any` type** — define the type properly
5. **Never write hardcoded English strings in JSX** — always use `t('key')`
6. **Never query `patients` table server-side without a filter** — always scope by healthWorkerId or zone
7. **Never insert coordinates as `lat, lng`** — PostGIS requires `POINT(lng lat)` (longitude first)
8. **Never skip Twilio signature validation** on the `/api/sms-reply` webhook
9. **Never show "Alert sent" to patient until backend confirms** — show "Sending..." until confirmed
10. **Never build a new shadcn component from scratch** — always install via CLI first
