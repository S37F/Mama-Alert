# MamaAlert — Landing Page Implementation Prompt

> This is a standalone landing page built inside the existing `client/` folder.
> It lives at `mamaalert.app/` (root route).
> The PWA is launched via an Install button on this page.
> No hackathon branding. No tech section. This looks like a real product launch.
> One mode only — warm light mode. No dark mode toggle.

---

## Design System — Commit To This Fully

### Color Palette
```css
:root {
  /* Core */
  --color-cream:      #FDFAF6;   /* page background */
  --color-sand:       #F5E6D3;   /* section backgrounds */
  --color-sand-dark:  #E8D5BC;   /* borders, dividers */

  /* Brand */
  --color-terra:      #C4522A;   /* primary — terracotta */
  --color-terra-dark: #9B3D1C;   /* hover state */
  --color-terra-light:#F0876A;   /* accents */

  /* Text */
  --color-charcoal:   #2C2416;   /* primary text */
  --color-warm-gray:  #6B5B4E;   /* secondary text */
  --color-muted:      #A89080;   /* captions, labels */

  /* Semantic */
  --color-forest:     #2D6A4F;   /* success, volunteer green */
  --color-alert:      #DC2626;   /* SOS red — used sparingly */
  --color-gold:       #D4A017;   /* statistics, highlights */

  /* Surfaces */
  --color-white:      #FFFFFF;
  --color-card:       #FFF8F2;   /* card backgrounds */
}
```

### Typography
```css
/* Import in index.html */
@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;700;900&family=Inter:wght@300;400;500;600&display=swap');

--font-display: 'Playfair Display', Georgia, serif;  /* headlines */
--font-body:    'Inter', system-ui, sans-serif;       /* body, UI */

/* Scale */
--text-xs:   0.75rem;    /* 12px — labels, captions */
--text-sm:   0.875rem;   /* 14px — secondary text */
--text-base: 1rem;       /* 16px — body */
--text-lg:   1.125rem;   /* 18px — lead text */
--text-xl:   1.25rem;    /* 20px */
--text-2xl:  1.5rem;     /* 24px */
--text-3xl:  1.875rem;   /* 30px */
--text-4xl:  2.25rem;    /* 36px */
--text-5xl:  3rem;       /* 48px */
--text-6xl:  3.75rem;    /* 60px */
--text-7xl:  4.5rem;     /* 72px */
--text-8xl:  6rem;       /* 96px — hero stat only */
```

### Spacing & Layout
- Max content width: `1200px` centered
- Section padding: `120px 0` desktop, `80px 0` mobile
- Grid gap: `32px`
- Border radius: `16px` cards, `8px` buttons, `4px` tags
- No box shadows — use border `1px solid var(--color-sand-dark)` instead

---

## Install Instructions

```bash
cd client

# Three.js for WebGL globe and particles
npm install three @types/three

# Framer Motion for scroll-triggered animations
npm install framer-motion

# React Intersection Observer for scroll triggers
npm install react-intersection-observer

# React CountUp for animated statistics
npm install react-countup

# Leaflet already installed — reuse for global map
```

---

## File Structure

All landing page files live inside the existing `client/src/` structure:

```
client/src/
├── landing/
│   ├── LandingPage.tsx          ← root component, assembles all sections
│   ├── sections/
│   │   ├── Hero.tsx
│   │   ├── TheTruth.tsx
│   │   ├── ThreeDelays.tsx
│   │   ├── MeetTheWomen.tsx
│   │   ├── HowItWorks.tsx
│   │   ├── GlobalImpact.tsx
│   │   ├── JoinTheNetwork.tsx
│   │   └── InstallSection.tsx
│   ├── components/
│   │   ├── DeathCounter.tsx
│   │   ├── PhoneMockup.tsx
│   │   ├── GlobeCanvas.tsx
│   │   ├── ScenarioCard.tsx
│   │   ├── StepFlow.tsx
│   │   ├── StatBlock.tsx
│   │   ├── NavBar.tsx
│   │   └── Footer.tsx
│   ├── hooks/
│   │   ├── usePWAInstall.ts
│   │   └── useScrollReveal.ts
│   └── styles/
│       └── landing.css
```

Update `App.tsx` to route `/` to `LandingPage` and `/app` to the existing PWA screens.

---

## Section 1 — NavBar

**Behaviour:** Transparent on load. Solid `var(--color-card)` with `border-bottom: 1px solid var(--color-sand-dark)` after 80px scroll. Smooth transition.

**Left:** MamaAlert logo — red circle pulse dot + "MamaAlert" in `--font-display` bold charcoal.

**Right:** Two buttons:
- "Watch Demo" — ghost button, charcoal border, charcoal text
- "Install App" — filled terracotta button, white text

**Mobile:** Hamburger menu. Both CTAs stack vertically in slide-down drawer.

**PWA Install logic:** The "Install App" button uses the `usePWAInstall` hook. If `beforeinstallprompt` is not available (already installed or unsupported), show "Open App" that navigates to `/app`.

```typescript
// client/src/landing/hooks/usePWAInstall.ts
import { useState, useEffect } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export function usePWAInstall() {
  const [installEvent, setInstallEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setInstallEvent(e as BeforeInstallPromptEvent);
    };

    window.addEventListener('beforeinstallprompt', handler);

    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
    }

    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const install = async () => {
    if (!installEvent) {
      window.location.href = '/app';
      return;
    }
    setIsInstalling(true);
    await installEvent.prompt();
    const { outcome } = await installEvent.userChoice;
    if (outcome === 'accepted') setIsInstalled(true);
    setIsInstalling(false);
    setInstallEvent(null);
  };

  return { install, isInstalled, isInstalling, canInstall: !!installEvent };
}
```

---

## Section 2 — Hero

**Layout:** Full viewport height (`100svh`). Two-column on desktop. Single column centered on mobile.

**Left column (60%):**

Top label — small uppercase terracotta text:
```
SDG 3 · MATERNAL HEALTH · 2026
```

Headline — `--font-display`, 72px, charcoal, tight line height 1.1:
```
Every 2 minutes,
a mother dies.
Not because we
lack medicine.
```

Subheadline — `--font-body`, 18px, warm gray, max-width 480px:
```
Because no one reached her in time.
MamaAlert changes that — one tap, one community,
one life saved.
```

Two CTA buttons side by side:
- **Primary:** "Install MamaAlert" — terracotta fill, white text, 52px height, 24px horizontal padding, subtle pulse animation on idle
- **Secondary:** "Watch how it works" — ghost, charcoal border, charcoal text, play icon on left

Below CTAs — social proof strip:
```
● Works offline  ·  ● No smartphone required  ·  ● Free forever
```
In `--text-sm`, warm gray, dot separator in terracotta.

**Right column (40%):**

The `DeathCounter` component — see below.

**Background:** Cream. Subtle warm grain texture via CSS `background-image: url("data:image/svg+xml,...")`. No photograph, no illustration.

---

## Component: DeathCounter

This is the centrepiece of the hero. It must feel visceral and real.

```typescript
// client/src/landing/components/DeathCounter.tsx
```

**Visual design:**
Large card with `var(--color-card)` background, `1px solid var(--color-sand-dark)` border, `16px` radius.

Inside the card:
```
┌────────────────────────────────────────┐
│                                        │
│  Women who have died in childbirth     │
│  since you opened this page            │
│                                        │
│              47                        │  ← giant number, 96px, terracotta
│                                        │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━   │  ← progress bar slowly filling
│                                        │
│  One death every 2 minutes             │
│  260,000 every year · WHO 2023        │
│                                        │
│  ● Counter started when you arrived   │
└────────────────────────────────────────┘
```

**Logic:**
- WHO data: 260,000 deaths/year = 1 death per 121.8 seconds
- On mount, record `startTime = Date.now()`
- Every 100ms, calculate `deaths = (Date.now() - startTime) / 121800`
- Display as integer with smooth decimal animation
- Progress bar fills from 0% toward 100% (resets every 121.8 seconds — one death cycle)
- The bar turning full red = one death. It resets. This is brutal and intentional.

```typescript
useEffect(() => {
  const startTime = Date.now();
  const DEATH_INTERVAL_MS = 121800; // one death every 121.8 seconds

  const timer = setInterval(() => {
    const elapsed = Date.now() - startTime;
    const deaths = elapsed / DEATH_INTERVAL_MS;
    setDeathCount(deaths);
    setProgress((elapsed % DEATH_INTERVAL_MS) / DEATH_INTERVAL_MS * 100);
  }, 100);

  return () => clearInterval(timer);
}, []);
```

The displayed integer increments with a brief flash animation each time it crosses a whole number.

Below the card — small note in `--text-xs` warm gray:
```
Based on WHO Global Health Estimates 2023.
Maternal deaths during pregnancy or within 42 days of termination.
```

---

## Section 3 — The Truth (Stats)

**Trigger:** Fade up + count up when scrolled into view (react-intersection-observer).

**Layout:** Three large stat blocks in a row on desktop, stacked on mobile.

**Stat Block 1:**
```
42–52%
of maternal deaths in South Asia
happen at home or in transit —
never reaching a hospital.
```

**Stat Block 2:**
```
4.1×
more likely — rural mothers face
this delay than urban mothers,
even controlling for poverty.
```

**Stat Block 3:**
```
0
new technology needed.
The community is already there.
It just needs to be called.
```

**Design:**
- Each stat: number in `--font-display` bold, 72px, `--color-terra`
- Label text below in `--font-body`, 16px, `--color-warm-gray`
- Thin terracotta left-border `3px solid var(--color-terra)` on each block
- Background: `var(--color-sand)` section with full-width earthy divider

**Section title above stats:**
```
The numbers they don't put on billboards.
```
In `--font-display`, 48px, centered, charcoal.

---

## Section 4 — The Three Delays

**Title:**
```
Why mothers die.
It's not one thing. It's three.
```

**Layout:** Horizontal timeline on desktop. Vertical accordion on mobile.

Three steps, each revealing on scroll:

**Delay 1 — The Decision**
```
Icon: Hourglass (SVG, hand-drawn style, terracotta)
Title: "She waits. Her family waits."
Body: The danger signs aren't recognized. Hours pass.
      Cultural norms, fear, uncertainty — all conspiring
      against the minutes she doesn't have.
Duration label: "Average: 2–6 hours lost"
```

**Delay 2 — The Journey**
```
Icon: Road (SVG, winding path)
Title: "No car. No road. No one awake."
Body: 42% of mothers in rural India die before
      reaching a hospital. Not from untreatable conditions —
      from not getting there.
Duration label: "Average: 1.5–3 hours lost"
```

**Delay 3 — The Wait**
```
Icon: Door (SVG, closed door with cross)
Title: "The facility isn't ready."
Body: She arrives. But the staff didn't know she was coming.
      No blood prepared. No operating room cleared.
      Minutes become fatal.
Duration label: "Average: 45 min–2 hours lost"
```

**Below the three delays — the MamaAlert answer:**
Thin terracotta divider, then:
```
MamaAlert addresses all three.
Simultaneously. In under 60 seconds.
```
`--font-display`, 36px, centered, charcoal. Fade in on scroll.

---

## Section 5 — Meet The Women

**Title:**
```
Real emergencies.
Real women.
Real minutes that mattered.
```

**Layout:** Three scenario cards in a horizontal scroll on mobile, three columns on desktop. Each card reveals on scroll with a stagger delay (card 1 at 0ms, card 2 at 150ms, card 3 at 300ms).

### Scenario Card Design

Each card: `var(--color-card)` background, `1px solid var(--color-sand-dark)` border, `16px` radius, `32px` padding. 100% height (all three same height).

**Card 1 — Priya**
```
Top tag: "2:41 AM · Maharashtra, India"  ← small pill, sand bg, warm gray text

Name: Priya, 24
      38 weeks pregnant

Situation:
"Severe bleeding. Husband 200km away.
 Elderly mother-in-law. No vehicle.
 No phone credit."

──────────────────────────────

Without MamaAlert:
"Waits until 4 AM. Reaches clinic at 5:15 AM."
[Red thin bar] FATAL DELAY: 2h 34min

With MamaAlert:
"Ravi (1.2km) responds in 90 seconds."
[Green thin bar] TOTAL RESPONSE: 22 minutes

──────────────────────────────

How she triggered it:
[Icon: Phone screen] One tap. PWA bookmark.
```

**Card 2 — Amara**
```
Top tag: "11:17 AM · Adansi, Ghana"

Name: Amara, 19
      40 weeks · First pregnancy

Situation:
"Active labour. Alone. No internet.
 No smartphone. Just a basic Nokia."

──────────────────────────────

Without MamaAlert:
"Neighbour walks 2km for help. Labour
 complications unattended."
[Red bar] FATAL DELAY: 3h 12min

With MamaAlert:
"Sister Agnes + Kofi (taxi) mobilised."
[Green bar] TOTAL RESPONSE: 38 minutes

──────────────────────────────

How she triggered it:
[Icon: Keypad] Dialled *456#. No internet needed.
```

**Card 3 — Fatima**
```
Top tag: "4:56 PM · Maiduguri, Nigeria"

Name: Fatima, 31
      Pre-eclampsia · Cannot speak

Situation:
"Blurred vision. Severe headache.
 Alone with two children aged 3 and 6.
 Cannot describe what's happening."

──────────────────────────────

Without MamaAlert:
"Children try to get help. Critical
 window passes."
[Red bar] FATAL DELAY: UNKNOWN

With MamaAlert:
"System detected no interaction.
 Auto-escalated. Nurse Blessing arrived."
[Green bar] RESPONSE: 7 minutes

──────────────────────────────

How she triggered it:
[Icon: Single tap] One tap. Couldn't do more.
System did the rest.
```

**Below cards:**
```
These are not hypotheticals.
These are the documented patterns behind 260,000 deaths a year.
MamaAlert is built around every single edge case.
```
Centered, `--font-body`, 18px, `--color-warm-gray`.

---

## Section 6 — How It Works

**Title:**
```
60 seconds.
That's all it takes.
```

**Layout:** Left side — vertical step flow. Right side — phone mockup showing the live PWA screen at each step.

### PhoneMockup Component

```typescript
// client/src/landing/components/PhoneMockup.tsx
```

**Design:** A realistic phone frame (pure CSS/SVG — no image). Rounded rectangle, 375×812 logical pixels displayed at ~280px wide. Inner screen shows an `<iframe src="/app">` or a static screenshot of the PWA screen relevant to the current step.

The phone mockup updates which screen it shows as the user scrolls through the steps. Use Intersection Observer — when step 2 comes into view, phone switches to volunteer dashboard view.

**Step 1 — Patient triggers SOS**
```
Step label: "01"
Title: "One tap. Any phone."
Body: "Priya taps the MamaAlert button installed
       on her home screen. The system reads her
       profile — 38 weeks, blood type B+, risk flags,
       nearest clinic — instantly."
Phone shows: PatientSOS screen with big red button
```

**Step 2 — Volunteers alerted**
```
Step label: "02"
Title: "Community activated in seconds."
Body: "Every trained volunteer within 5km receives
       an SMS simultaneously. No app required.
       Reply YES. That's it."
Phone shows: SMS notification screen (mockup)
SMS text visible: "MAMA ALERT: Priya Sharma, near the temple..."
```

**Step 3 — Response confirmed**
```
Step label: "03"
Title: "The nearest person commits."
Body: "Ravi is 1.2km away. He replies YES.
       The system sends him directions, alerts
       the clinic, and tells Priya: help is coming."
Phone shows: Volunteer dashboard with YES/NO buttons
```

**Step 4 — Clinic pre-alerted**
```
Step label: "04"
Title: "The facility prepares before she arrives."
Body: "PHC Wai receives: patient name, blood type,
       risk flags, volunteer name, ETA. Staff are ready.
       This eliminates the third delay entirely."
Phone shows: Hospital inbox pre-alert card
```

**Step 5 — Family knows**
```
Step label: "05"
Title: "No one is left wondering."
Body: "Her husband Rahul receives an SMS 800km away:
       'Priya has been helped. Ravi is taking her
       to PHC Wai. Track here.' One link. No login."
Phone shows: Family status page
```

---

## Section 7 — Global Impact (Three.js Globe)

**Title:**
```
A network built for the world's
most unreachable places.
```

**Component: GlobeCanvas**

```typescript
// client/src/landing/components/GlobeCanvas.tsx
// Uses Three.js — full WebGL globe
```

**Implementation:**

```typescript
import * as THREE from 'three';

// Globe setup
const globe = new THREE.Mesh(
  new THREE.SphereGeometry(2, 64, 64),
  new THREE.MeshPhongMaterial({
    color: 0xFDFAF6,        // cream — matches page bg
    shininess: 5,
    specular: 0xE8D5BC,     // sand highlight
  })
);

// Country outlines — draw as line segments on sphere surface
// Use a simplified GeoJSON of country borders projected onto sphere

// Alert dots — animated points appearing on the globe
// Locations: rural India, Ghana, Nigeria, Ethiopia, Bangladesh,
//            Myanmar, DRC, Sudan, Bolivia, Papua New Guinea
// Each dot: small sphere (radius 0.03), terracotta color
// Animation: scale from 0 → 1.5 → 0 (pulse) over 2 seconds
// Stagger: random delays so they don't all pulse together

// Ambient light: soft warm (0xFDF5E6, intensity 0.6)
// Directional light: from top-right (0xFFFFFF, intensity 0.8)
// Globe slowly rotates: 0.001 radians per frame on Y axis
// Mouse hover: slight tilt toward cursor (lerp, not snap)
```

**Layout:** Globe takes full width of section, 600px tall on desktop. Text overlay on left:

Left column (40%):
```
Works where infrastructure doesn't.

SMS-based alerting works in 190+ countries.
USSD works on any phone made since 1998.
No internet. No app store. No data plan.

Just a community, and a signal.
```

Right column (60%): The rotating WebGL globe with pulsing alert dots.

**Below globe — four capability pills:**
```
[● SMS in 190+ countries]  [● USSD zero-internet]  [● Offline PWA]  [● IVR voice call]
```
Horizontal scroll on mobile. Each pill: sand bg, terracotta border, warm-gray text.

---

## Section 8 — The Network Effect

**Title:**
```
The more communities join,
the faster every woman gets help.
```

**Layout:** Two columns — left text, right an animated network diagram (CSS only — nodes and connecting lines).

**Left column:**
```
MamaAlert runs on the people
already surrounding every
pregnant woman.

The neighbour with a motorcycle.
The retired nurse two streets over.
The community health worker
who already knows her name.

We don't build infrastructure.
We activate the one that exists.
```

**Right column — Network diagram:**
Pure CSS animated diagram. Central patient dot (red, pulsing). Six volunteer dots radiating out at different distances (green). Lines connecting them (dashed, animating dash-offset). Distance rings (dashed circles at 2km, 5km, 10km labels).

**Below — volunteer registration CTA:**
```
Are you a community health worker, nurse,
or someone who wants to help?

[Register as a volunteer →]
```
Ghost button, full width on mobile, auto width on desktop. Links to `/app/volunteer`.

---

## Section 9 — Install (Final CTA)

**Background:** Full terracotta (`var(--color-terra)`) section. White and cream text only.

**Layout:** Centered, single column, generous padding.

**Top:** Small label in cream, uppercase, `--text-sm`:
```
READY TO SAVE A LIFE
```

**Headline:** `--font-display`, 64px, white:
```
MamaAlert.
Install it today.
```

**Sub:** `--font-body`, 20px, cream opacity 0.8:
```
Free. Forever. For every community that needs it.
```

**Two CTAs side by side:**

Primary — "Install MamaAlert" — white fill, terracotta text, 56px height
Secondary — "Watch Demo" — white outline, white text, 56px height, play icon

**Below buttons — compatibility strip:**
```
Works on Android · iOS · Any phone via SMS · Feature phones via USSD
```
In cream, `--text-sm`, centered.

**Below that — the install explanation:**
```
What does "Install" mean?

MamaAlert is a Progressive Web App — no app store required.
Tap Install, tap "Add to Home Screen", and it lives on your
phone like any app. Works offline. Uses no storage.
Reaches you by SMS even when you close it.
```
In cream, `--text-sm`, max-width 480px, centered, subtle opacity 0.75.

---

## Component: useScrollReveal Hook

```typescript
// client/src/landing/hooks/useScrollReveal.ts
import { useInView } from 'react-intersection-observer';
import { useAnimation, AnimationControls } from 'framer-motion';
import { useEffect } from 'react';

export function useScrollReveal(threshold = 0.15): {
  ref: (node?: Element | null) => void;
  controls: AnimationControls;
} {
  const controls = useAnimation();
  const [ref, inView] = useInView({ threshold, triggerOnce: true });

  useEffect(() => {
    if (inView) controls.start('visible');
  }, [inView, controls]);

  return { ref, controls };
}

// Standard variants to use with this hook:
export const fadeUpVariants = {
  hidden: { opacity: 0, y: 40 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1] } },
};

export const staggerContainerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.15 } },
};

export const fadeUpChildVariants = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] } },
};
```

---

## Footer

**Background:** `var(--color-charcoal)`. Text: warm gray and cream.

**Layout:** Three columns on desktop.

**Column 1:**
Logo + tagline:
```
MamaAlert
One tap. One community. One life saved.
```
`--font-display`, terracotta logo color.

**Column 2:**
```
Links
  How it works
  Install the app
  Register as volunteer
  For health workers
```

**Column 3:**
```
Built for
  SDG 3: Good Health & Well-Being
  Rural communities worldwide
  Community health workers
  NGO field partners
```

**Bottom bar:**
```
© 2026 MamaAlert · Open Source · Built for the women who need it most
```
Thin line above. Tiny text. No legal fluff.

---

## App.tsx Routing Update

```typescript
// client/src/App.tsx
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { LandingPage } from './landing/LandingPage';
import { PatientSOS } from './views/PatientSOS';
import { VolunteerDashboard } from './views/VolunteerDashboard';
// ... other imports

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Landing page at root */}
        <Route path="/" element={<LandingPage />} />

        {/* PWA screens under /app */}
        <Route path="/app" element={<PatientSOS />} />
        <Route path="/app/volunteer" element={<VolunteerDashboard />} />
        <Route path="/app/hospital" element={<HospitalInbox />} />
        <Route path="/app/register" element={<ProtectedRoute><HealthWorkerRegister /></ProtectedRoute>} />
        <Route path="/app/admin" element={<ProtectedRoute role="admin"><AdminZone /></ProtectedRoute>} />
        <Route path="/status/:token" element={<FamilyStatus />} />
      </Routes>
    </BrowserRouter>
  );
}
```

Update `vite-plugin-pwa` manifest `start_url` to `/app` so installing the PWA opens the SOS screen, not the landing page.

---

## Performance Rules For The Landing Page

1. **Globe loads lazily** — wrap `GlobeCanvas` in `React.lazy()` + `Suspense`. Only load Three.js after hero is painted.
2. **Fonts preloaded** — add `<link rel="preload">` for Playfair Display and Inter in `index.html`.
3. **No images** — every visual is CSS, SVG, or Canvas. Zero image requests.
4. **Globe pauses when off-screen** — use Intersection Observer to stop the Three.js animation loop when the section is not visible. Saves CPU.
5. **Death counter uses requestAnimationFrame** — not `setInterval` alone. Smooth 60fps update.
6. **Scenario cards are CSS** — no external icons. Use inline SVG for the trigger icons.
7. **Target Lighthouse score: 95+ performance, 100 accessibility, 100 SEO.**

---

## Accessibility Rules For The Landing Page

1. All animated elements must respect `prefers-reduced-motion`:
```css
@media (prefers-reduced-motion: reduce) {
  * { animation-duration: 0.01ms !important; transition-duration: 0.01ms !important; }
}
```

2. Death counter must have `aria-live="polite"` and `aria-label="Deaths in childbirth since page load"`.

3. Globe canvas must have `aria-hidden="true"` — it is decorative. Provide a text summary nearby.

4. All buttons must have explicit `aria-label` if icon-only.

5. Colour contrast: all text on cream background must pass WCAG AA (4.5:1 minimum). Test terracotta on cream — it passes. Warm gray on cream — verify.

6. The install button must have `aria-describedby` pointing to the explanation paragraph about what PWA install means.

---

## Critical Implementation Notes

1. **PWA install prompt timing:** The `beforeinstallprompt` event fires before DOMContentLoaded on some browsers. Capture it in a global listener in `main.tsx` and pass it down — don't rely on component-level capture which may miss it.

2. **Globe on mobile:** Three.js is heavy. On screens under 768px, replace the globe with a static SVG world map with CSS-animated pulse dots. Same visual story, zero WebGL cost.

3. **Scenario cards equal height:** Use CSS Grid with `align-items: stretch` and `height: 100%` on cards. The three cards have different content lengths — force equal height so the grid looks intentional.

4. **Phone mockup iframe:** The `/app` route inside an iframe on the landing page will work in development. In production on Vercel, it will be same-origin so no CORS issues. Ensure the PWA screens don't redirect away from themselves when loaded inside an iframe (check for `window.top !== window` if needed).

5. **Death counter on tab switch:** When the user switches tabs and comes back, `Date.now() - startTime` will include the time away. This is correct — deaths happened while they were away. Do not reset on tab focus. This is intentional and more accurate.

6. **Scroll performance:** The Three.js globe rotation and Framer Motion scroll triggers run simultaneously. Use `will-change: transform` on animated elements. Use `passive: true` on scroll listeners.

7. **Three.js cleanup:** The globe `renderer.dispose()` and `scene.clear()` must be called in the `useEffect` cleanup. WebGL contexts are a limited resource — leaking them causes crashes on mobile.

8. **Font loading flash:** Add `font-display: swap` to the Google Fonts import URL: `&display=swap` (already in the import URL above). Use a system serif fallback that is close to Playfair in metrics.

---

## The One Thing That Must Be Perfect

The **DeathCounter** is the first thing every judge sees. It must:
- Start counting the instant the page loads — no delay
- Show a real decimal (47.3, not just 47) so it feels truly live
- Have a progress bar that visibly moves
- Reset the bar with a subtle flash when it crosses a whole number
- Never freeze, never stutter, never show NaN

If this component breaks, the entire emotional impact of the landing page is gone. Test it on slow connections, on mobile, on Safari. Make it bulletproof first before touching anything else.
