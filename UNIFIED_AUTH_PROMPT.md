# MamaAlert — Unified Sign-Up & Login System

## What This Replaces

Remove entirely:
- All existing role-specific onboarding flows
- Admin invite email flow for health workers
- `WorkerVolunteerRegisterForm.tsx` as the only volunteer creation path
- Any email + password authentication
- Phone OTP verification on login

Replace with:
- Single unified `/signup` page with role picker + dynamic form
- Single unified `/login` page toggled on the same `/signup` page
- Phone number only authentication — no OTP, no password, no email
- All roles self-sign-up freely on the same page
- Immediate redirect to role dashboard after sign-up or login

---

## Route

```
mamaalert.app/signup     → unified sign-up + login (toggled)
```

This route lives on the landing page domain — not inside the PWA scope.
After authentication, users are redirected to their role-specific route.

---

## Visual Flow — Step by Step

```
mamaalert.app/signup
│
├── TOP TOGGLE
│   [  Sign Up  ] [  Login  ]   ← pill toggle, terracotta active state
│
├── ─────────────────────────────────────────────
│
├── IF "Sign Up" ACTIVE
│   │
│   ├── STEP 1 — Pick Your Role
│   │   Four role cards in a 2×2 grid:
│   │
│   │   ┌─────────────────┐  ┌─────────────────┐
│   │   │ 🔴              │  │ 🟢              │
│   │   │ I am a          │  │ I am a          │
│   │   │ Patient         │  │ Volunteer       │
│   │   │                 │  │                 │
│   │   │ Register for    │  │ Help women in   │
│   │   │ emergency help  │  │ my community    │
│   │   └─────────────────┘  └─────────────────┘
│   │
│   │   ┌─────────────────┐  ┌─────────────────┐
│   │   │ 🔵              │  │ ⚙️              │
│   │   │ I am a          │  │ I am an         │
│   │   │ Health Worker   │  │ Admin           │
│   │   │                 │  │                 │
│   │   │ Register and    │  │ Manage a zone   │
│   │   │ monitor patients│  │ or NGO network  │
│   │   └─────────────────┘  └─────────────────┘
│   │
│   │   Selected card: terracotta border + subtle bg fill
│   │   [Continue →] button activates after selection
│   │
│   └── STEP 2 — Fill Your Details
│       Dynamic fields based on role selected (see below)
│       [← Back] [Create Account →]
│
└── IF "Login" ACTIVE
    │
    └── Single field: phone number input
        [Enter your phone number]
        [Login →]
        Role auto-detected from DB by phone number
        Redirect to correct dashboard immediately
```

---

## Step 2 Fields — Per Role

### Patient
```
Full name *
Phone number *
Weeks pregnant * (number 1–44)
Village / area *
Nearest landmark (optional)
Language preference (select: English, Hindi, French, Swahili, Arabic, Portuguese)
```
Minimal required fields only. Additional pregnancy/risk data collected later
by health worker during ANC visit. Patient must be able to complete this
in under 60 seconds.

After submit:
- Creates patient profile in DB with `self_registered: true`, `is_verified: false`
- Stores phone number in localStorage
- Redirect → `/sos`

### Volunteer
```
Full name *
Phone number *
Village / area *
Skills * (multi-select checkboxes):
  □ Trained midwife  □ Registered nurse
  □ Community health worker (ASHA/ANM)
  □ First aid certified  □ Willing to help (no formal training)
Vehicle (select: Motorcycle / Car / Bicycle / None)
Available hours (select: 24/7 / Daytime only / Nights only / Weekends)
Max radius willing to respond (select: 2km / 5km / 10km)
```

After submit:
- Creates volunteer profile in DB with `is_active: true`
- Stores phone number in localStorage
- Redirect → `/volunteer`

### Health Worker
```
Full name *
Phone number *
Role title (select: ASHA / ANM / Nurse / Doctor / Community volunteer)
Organisation / facility name *
Zone / district covered *
```

After submit:
- Creates health worker profile in DB
- Stores phone number in localStorage
- Redirect → `/register` (health worker dashboard)

### Admin
```
Full name *
Phone number *
Organisation name *
Zone / district to manage *
Admin access code * ← secret code, set via environment variable ADMIN_SIGNUP_CODE
                      If code doesn't match → show "Invalid access code" error
                      This is the ONLY protection for admin self-signup
```

After submit:
- Creates admin profile in DB with `access_level: 'admin'`
- Stores phone number in localStorage
- Redirect → `/admin`

---

## Login Flow — Phone Number Only

```
User enters phone number
        │
        ▼
POST /api/auth/login { phone }
        │
        ▼
Server looks up phone in all tables:
  patients → role: 'patient'
  volunteers → role: 'volunteer'
  health_workers → role: 'health_worker' or 'admin'
        │
        ▼
[Phone found?]
  NO → "No account found with this number. Sign up first."
       Show link back to sign-up tab
  YES → Return { role, profileId, name }
        Store in localStorage: { phone, role, profileId, name }
        │
        ▼
Redirect based on role:
  patient       → /sos
  volunteer     → /volunteer
  health_worker → /register
  admin         → /admin
```

**No OTP. No password. Trust the phone number.**
Session persists in localStorage until manually cleared.
No expiry — patient must never be locked out in an emergency.

---

## UI Design Spec

### Page Layout
```
Background: var(--cream) #FDFAF6
Max width: 480px centered
Vertical center on desktop
Full width on mobile with 24px padding

Logo at top: MamaAlert pulse dot + name
Subtitle: "Community maternal emergency network"

Toggle pill: Sign Up | Login
  Active: terracotta bg, white text
  Inactive: sand bg, warm-gray text

Progress indicator on sign-up (step 1 of 2):
  ● ○  (step 1)
  ● ●  (step 2)
  Terracotta dots
```

### Role Cards (Step 1)
```
Card size: equal height, 2×2 grid, 16px gap
Background: white
Border: 1.5px solid var(--sand-dark)
Border radius: 16px
Padding: 24px

Selected state:
  Border: 2px solid var(--terra)
  Background: var(--terra-pale)
  Subtle scale: transform: scale(1.02)

Icon: large colored circle (no emoji)
  Patient: red circle
  Volunteer: green circle
  Health Worker: blue circle
  Admin: gray circle

Role name: Playfair Display, 18px, bold
Description: DM Sans, 13px, warm-gray, 2 lines max

Hover: border-color darkens, cursor pointer
Transition: all 0.15s ease
```

### Form Fields (Step 2)
```
Use existing shadcn/ui Input, Select, Label components
Field spacing: 20px gap between fields
Label: DM Mono, 11px, uppercase, letter-spacing 0.08em, warm-gray
Input: standard shadcn input with terracotta focus ring

Required field indicator: red dot after label (not asterisk in placeholder)
Error state: red border + error message below field

Phone input: always shows country code selector (+91, +233, +234, etc.)
```

### Buttons
```
Primary [Continue →] / [Create Account →] / [Login →]:
  Background: var(--terra) #C4522A
  Text: white, DM Sans, 15px, weight 500
  Height: 52px
  Full width
  Border radius: 10px
  Loading state: spinner replaces text

Secondary [← Back]:
  Background: transparent
  Text: var(--warm-gray)
  No border
  Position: top-left above form
```

---

## Backend — New/Modified Routes

### POST /api/auth/signup
```typescript
// Zod schema
const SignupSchema = z.discriminatedUnion('role', [
  z.object({
    role: z.literal('patient'),
    name: z.string().min(2),
    phone: z.string().min(10),
    weeksPregnant: z.number().min(1).max(44),
    village: z.string().min(2),
    landmark: z.string().optional(),
    language: z.string().default('en'),
  }),
  z.object({
    role: z.literal('volunteer'),
    name: z.string().min(2),
    phone: z.string().min(10),
    village: z.string().min(2),
    skills: z.array(z.string()).min(1),
    vehicle: z.enum(['motorcycle', 'car', 'bicycle', 'none']),
    availableHours: z.enum(['24/7', 'daytime', 'nights', 'weekends']),
    maxRadiusKm: z.number().default(5),
  }),
  z.object({
    role: z.literal('health_worker'),
    name: z.string().min(2),
    phone: z.string().min(10),
    roleTitle: z.string(),
    organisation: z.string().min(2),
    zone: z.string().min(2),
  }),
  z.object({
    role: z.literal('admin'),
    name: z.string().min(2),
    phone: z.string().min(10),
    organisation: z.string().min(2),
    zone: z.string().min(2),
    adminCode: z.string(), // validated against process.env.ADMIN_SIGNUP_CODE
  }),
]);

// Handler logic
// 1. Validate with Zod discriminatedUnion
// 2. Check phone not already registered across ALL tables
//    (patient + volunteer + health_worker tables)
//    If duplicate → 409 "Phone already registered. Login instead."
// 3. For admin: validate adminCode === process.env.ADMIN_SIGNUP_CODE
//    If wrong → 403 "Invalid access code"
// 4. Insert into correct table based on role
// 5. Return { success: true, role, name, profileId }
```

### POST /api/auth/login
```typescript
const LoginSchema = z.object({
  phone: z.string().min(10),
});

// Handler logic
// 1. Validate phone
// 2. Search across all tables in order:
//    a. health_workers (check access_level for admin distinction)
//    b. volunteers
//    c. patients
// 3. If found in health_workers with access_level='admin' → role: 'admin'
// 4. If found in health_workers → role: 'health_worker'
// 5. If found in volunteers → role: 'volunteer'
// 6. If found in patients → role: 'patient'
// 7. If not found anywhere → 404 "No account found"
// 8. Return { role, profileId, name, phone }
// No JWT, no session, no OTP — client stores in localStorage
```

---

## localStorage Schema

After sign-up or login, store this in localStorage:
```typescript
interface MamaAlertSession {
  phone: string;
  role: 'patient' | 'volunteer' | 'health_worker' | 'admin';
  profileId: string;
  name: string;
  signedInAt: number; // Date.now()
}

// Key: 'mamaalert_session'
// No expiry — persistent until user manually logs out
```

All existing hooks that read phone from localStorage must read from
`mamaalert_session.phone` — update `useAuth.ts` to parse this shape.

---

## Files to Create

```
client/src/views/
└── SignupLogin.tsx          ← main component, manages toggle + step state

client/src/views/signup/
├── RolePicker.tsx           ← Step 1: 2×2 role cards grid
├── PatientSignupForm.tsx    ← Step 2: patient fields
├── VolunteerSignupForm.tsx  ← Step 2: volunteer fields
├── HealthWorkerSignupForm.tsx ← Step 2: HW fields
├── AdminSignupForm.tsx      ← Step 2: admin fields + code
└── LoginForm.tsx            ← phone number login

client/src/hooks/
└── useSignup.ts             ← handles form submission, API call, redirect
```

---

## Files to Modify

```
client/src/App.tsx
  Add route: <Route path="/signup" element={<SignupLogin />} />
  Update: /sos, /volunteer, /register, /admin all read from
          localStorage mamaalert_session instead of separate auth

client/src/hooks/useAuth.ts
  Replace existing auth logic with localStorage session read
  Add: logout() clears mamaalert_session and redirects to /signup

client/src/components/ProtectedRoute.tsx
  Read role from localStorage mamaalert_session
  Redirect to /signup if no session found

server/src/routes/
  Add: auth.ts with POST /api/auth/signup and POST /api/auth/login
  Keep: all existing /api/sos, /api/sms-reply, /api/register/* routes
  Remove: admin invite route (adminData.ts invite flow)
```

---

## Files to Delete / Deprecate

```
Remove or gut these (keep file, empty the old logic):
- Existing auth flows tied to email/password
- Admin invite email sending logic in adminData.ts
- OTP generation and verification routes
- Any Supabase Auth session management (replace with localStorage)
```

---

## Route Guard Logic (Updated ProtectedRoute)

```typescript
// client/src/components/ProtectedRoute.tsx
export function ProtectedRoute({
  children,
  requiredRole,
}: {
  children: ReactNode;
  requiredRole?: 'health_worker' | 'admin';
}) {
  const sessionRaw = localStorage.getItem('mamaalert_session');

  if (!sessionRaw) {
    return <Navigate to="/signup" replace />;
  }

  const session = JSON.parse(sessionRaw) as MamaAlertSession;

  if (requiredRole === 'admin' && session.role !== 'admin') {
    return <Navigate to="/signup" replace />;
  }

  if (requiredRole === 'health_worker' &&
      session.role !== 'health_worker' &&
      session.role !== 'admin') {
    return <Navigate to="/signup" replace />;
  }

  return <>{children}</>;
}
```

---

## Redirect Map After Sign-Up / Login

```typescript
const ROLE_REDIRECT: Record<string, string> = {
  patient:        '/sos',
  volunteer:      '/volunteer',
  health_worker:  '/register',
  admin:          '/admin',
};
```

---

## Landing Page CTA Update

Update the landing page NavBar and Install section:

```
Current: "Install App" → triggers PWA install
Add:     "Sign Up" → navigates to mamaalert.app/signup

NavBar right side:
  [Sign Up]        ← outlined, charcoal
  [Install App]    ← filled terracotta

Hero CTAs:
  [Install MamaAlert]    ← primary
  [Sign Up / Login →]    ← secondary (links to /signup)
```

---

## Critical Implementation Notes

1. **Phone duplicate check across all tables** — a person cannot register as
   both a patient and a volunteer with the same phone. The signup route must
   check all tables before inserting. Return 409 with message
   "This phone is already registered. Try logging in."

2. **Admin code via environment variable** — `ADMIN_SIGNUP_CODE` must be in
   `server/.env`. If the env var is missing at startup, server must crash
   with: "Missing ADMIN_SIGNUP_CODE — admin sign-up will be disabled."

3. **No Supabase Auth** — This system replaces Supabase Auth entirely.
   The existing `supabase.auth.signIn()` calls must be removed.
   Authentication is now: phone lookup in DB → localStorage session.
   This means RLS policies that use `auth.uid()` will break — update
   all server-side queries to filter by `profileId` from the request
   body/header instead of Supabase auth context.

4. **Patient localStorage key** — `PatientSOS.tsx` must read phone from
   `mamaalert_session.phone` not a separate key. The setup URL
   `/sos?setup=PHONE` still works for HW-installed devices — it writes
   to `mamaalert_session` with role: 'patient'.

5. **No session expiry** — localStorage persists until cleared. This is
   intentional — a patient must never be locked out of SOS in an emergency.
   Add a logout button in the top-right of each dashboard for HW and admin.
   Do NOT add a logout button on the patient SOS screen.

6. **Role detection on login must be deterministic** — if someone's phone
   appears in both patients and volunteers tables (edge case), always
   prefer the higher-privilege role: admin > health_worker > volunteer > patient.

7. **Back button on Step 2** — must clear selected role and return to
   Step 1 role cards. Do not navigate back in browser history — use
   React state to control step.

8. **Form validation** — all required fields must show inline errors on
   submit attempt. Do not scroll to top — scroll to first error field.
   Use react-hook-form + zod resolver matching the server Zod schema.

9. **Mobile first** — the 2×2 role card grid must stack to 1×4 (single
   column) on screens under 480px. The entire form must be usable on
   a 375px wide phone with one thumb.

10. **Loading state during API calls** — the submit button must show a
    spinner and be disabled during the signup/login request. Never allow
    double-submission.
