# MamaAlert

MamaAlert is a maternal emergency alert system with a React PWA client and an Express/Prisma API. It supports patient SOS alerts, SMS/USSD replies, volunteer dispatch, hospital pre-alerts, family status pages, health-worker registration, and zone administration.

## Project Layout

- `client/` - React, Vite, Tailwind, PWA service worker, i18n locale files.
- `server/` - Express API, Prisma schema/migrations, Twilio webhooks, delayed jobs.
- `server/Procfile` - Railway web process for the API when the Railway service root is `server/`.

## Local Setup

1. Install dependencies in both apps: `cd server && npm ci`, then `cd ../client && npm ci`.
2. Create env files with `npm run env:init` in each app.
3. Set server database/Twilio/Supabase values in `server/.env`; local SMS can use `TWILIO_MOCK=true`.
4. Run database migrations from `server/` with `npm run db:deploy` for deployed databases or `npm run db:migrate` for local development. Production starts attempt `prisma migrate deploy` before serving traffic.
5. Start the API with `npm run dev` in `server/`, then the client with `npm run dev` in `client/`.

## Required API Environment

Core values: `DATABASE_URL`, `DIRECT_DATABASE_URL`, `CLIENT_URL`, `SOS_SIGNING_SECRET`, `PORTAL_JWT_SECRET`, `ADMIN_SIGNUP_CODE`.

Production also needs `SERVER_PUBLIC_URL` so Twilio signature validation and delivery callbacks use the public API URL. For real SMS, set `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, and `TWILIO_NUMBER`.

Railway should use `server/Procfile` as the API web process when the Railway service root is `server/`. Set `CLIENT_URL` to the deployed PWA origin and, when needed, add extra comma-separated origins in `CLIENT_ORIGINS`.

For Supabase on Railway, use the Supavisor pooler connection strings unless Railway has IPv6 access to the direct database host. A typical setup is:

- `DATABASE_URL`: Supavisor transaction pooler string, port `6543`, with `pgbouncer=true`.
- `DIRECT_DATABASE_URL` or `MIGRATION_DATABASE_URL`: Supavisor session pooler string, port `5432`, for Prisma migrations.
- `REQUIRE_DB_MIGRATIONS_ON_START=true`: optional; use only when the migration database URL is known reachable and startup should fail if migrations fail.

For patient/volunteer signup on Railway, either allow browser location in the PWA or set `SELF_REG_FALLBACK_LAT` and `SELF_REG_FALLBACK_LNG` to coordinates inside your operating area. Without browser location or those fallback values, signup correctly returns a location-required error.

## Required Client Environment

Set these on the deployed PWA service:

- `VITE_API_URL`: public Railway API URL, for example `https://your-api.up.railway.app`.
- `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`: optional for realtime dashboard updates. If omitted, the client keeps working through API refreshes without realtime subscriptions.
- `VITE_HELP_PHONE`: phone number shown in patient-facing help paths.
- `VITE_DEMO_SOS_TOKEN` and `VITE_DEMO_STATUS_TOKEN`: optional demo tokens used by the demo flow.

## Twilio Webhooks

Configure Twilio to send inbound SMS replies to:

- `POST {SERVER_PUBLIC_URL}/api/sms-reply`
- `POST {SERVER_PUBLIC_URL}/api/ussd`

Outbound SMS status callbacks are sent to:

- `POST {SERVER_PUBLIC_URL}/api/sms-status`

All Twilio webhook routes validate Twilio signatures unless `TWILIO_MOCK=true`.

## Security Notes

Staff, volunteer, and hospital dashboard auth is cookie-first with HttpOnly cookies. The server also sets a readable CSRF cookie, and the client sends `X-CSRF-Token` for mutating dashboard requests. Existing bearer-token flows remain as a temporary migration fallback.

Patient SOS tokens remain available to the PWA for offline emergency use. Treat generated SOS links as private.

## Offline And Operations

Patient SOS alerts queue offline through IndexedDB and Background Sync. Health-worker registration/profile forms keep local drafts until the server confirms submission.

The API records alert timeline events and outbound message status so admins can inspect response progress, message delivery, unresolved alert age, volunteer coverage gaps, and hospital readiness.

## Verification

Run these manually before deployment:

- `cd server && npm test && npm run build && npm audit`
- `cd client && npm run lint && npm run i18n:check && npm run build && npm audit`

No CI workflow is included by design.
