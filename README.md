# MamaAlert

MamaAlert is a maternal emergency alert system with a React PWA client and an Express/Prisma API. It supports patient SOS alerts, SMS/USSD replies, volunteer dispatch, hospital pre-alerts, family status pages, health-worker registration, and zone administration.

## Project Layout

- `client/` - React, Vite, Tailwind, PWA service worker, i18n locale files.
- `server/` - Express API, Prisma schema/migrations, Twilio webhooks, delayed jobs.
- `render.yaml` - Render web service deployment for the API.

## Local Setup

1. Install dependencies in both apps: `cd server && npm ci`, then `cd ../client && npm ci`.
2. Create env files with `npm run env:init` in each app.
3. Set server database/Twilio/Supabase values in `server/.env`; local SMS can use `TWILIO_MOCK=true`.
4. Run database migrations from `server/` with `npm run db:deploy` for deployed databases or `npm run db:migrate` for local development.
5. Start the API with `npm run dev` in `server/`, then the client with `npm run dev` in `client/`.

## Required API Environment

Core values: `DATABASE_URL`, `DIRECT_DATABASE_URL`, `CLIENT_URL`, `SOS_SIGNING_SECRET`, `PORTAL_JWT_SECRET`, `ADMIN_SIGNUP_CODE`.

Production also needs `SERVER_PUBLIC_URL` so Twilio signature validation and delivery callbacks use the public API URL. For real SMS, set `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, and `TWILIO_NUMBER`.

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
