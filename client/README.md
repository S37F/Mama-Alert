# MamaAlert Client

React/Vite frontend for MamaAlert: patient SOS PWA, phone sign-up/login, volunteer dashboard, hospital inbox, health-worker hub, and zone admin tools.

## Local Setup

1. Install dependencies with `npm ci`.
2. Create `.env` with `npm run env:init`, then set `VITE_API_URL=http://localhost:3000`.
3. Start the app with `npm run dev`.

Useful checks:

- `npm run lint`
- `npm run i18n:check`
- `npm run build`

## Auth And Security

Dashboard sessions are cookie-first. The API sets HttpOnly auth cookies plus a readable `mama_csrf` cookie. Mutating dashboard requests send `X-CSRF-Token` automatically through the shared Axios client.

The patient SOS PWA intentionally keeps its SOS token in browser storage so the offline emergency flow can work after installation or poor connectivity.

## Offline Behavior

The SOS page queues emergency alerts in IndexedDB and registers Background Sync when available. Health-worker patient registration and profile completion forms save local drafts until the API confirms the submission.

## Localization

Locale files must match `src/i18n/locales/en.json`; run `npm run i18n:check` after changing copy. Some non-English fallback strings may currently be English and should be reviewed by native speakers before production deployment.
