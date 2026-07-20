# Alpha Deployment Runbook

Status: 14 July 2026. The application, database, consent flow, legal drafts,
tests, Cloudflare Pages production bundle, and Pages Functions API are ready. Items marked **BLOCKED** require
operator information, credentials, or a hosting decision before publication.

## 1. Supabase

- Production project `qixluaundyxqsnrktfdu` restored and healthy.
- Migrations `001` through `015` are applied and migration history matches.
- 46 categories, detailed category tracking, social/community tables, public
  sextet profiles, tracking integrations, encrypted server-only credentials,
  normalized events and atomic import/check-in RPCs are present.
- RLS isolation was verified with two real temporary accounts; test data was
  deleted afterward.
- Open email signup without confirmation, secure password change, strong
  passwords, and TOTP are configured through `supabase/config.toml` and pushed.
- **BLOCKED:** create a separate staging project before a wider beta.

## 2. Website, web app, and API

- Marketing website: `https://aretune.com/` (Cloudflare Pages project
  `aretune`, repo `hub-aretune`).
- Web app: `https://app.aretune.com/` (own Cloudflare Pages project
  `app-aretune`, this repo, no `/app` path prefix).
- API origin: `https://app.aretune.com/api/`.
- The website and app deploy independently onto separate Cloudflare Pages
  projects with separate custom domains (`aretune.com` / `app.aretune.com`);
  a website release can no longer overwrite the app or its API functions.
  Run `npm run deploy:test` / `npm run deploy:live` from this repo to build
  the Expo web export and deploy `dist/` (including Pages Functions, which
  Wrangler auto-discovers from `functions/` relative to the repo root).
- `/api/health`, account deletion, authenticated AI directives, AI audits,
  consent enforcement, and daily token accounting run on Pages Functions.
- Cloudflare Workers AI uses `@cf/meta/llama-3.1-8b-instruct-fast`; no separate
  OpenAI or Anthropic key is required for the Pages deployment.
- The local Pages Function now prefers Anthropic `claude-sonnet-4-6` with
  structured outputs when `ANTHROPIC_API_KEY` is present and keeps Workers AI
  as fallback. `ANTHROPIC_API_KEY` is stored as an encrypted Cloudflare
  production secret. Per operator instruction, the code change has not yet
  been deployed or live-tested.
- The Supabase service-role key is stored as an encrypted Cloudflare secret.
- **BLOCKED:** `ANTHROPIC_API_KEY`, the Supabase service-role key, and
  `INTEGRATION_ENCRYPTION_KEY` need to be set on the `app-aretune` project
  (`wrangler pages secret put <NAME> --project-name app-aretune`). Until then
  the app falls back to Workers AI and integration connect/callback routes
  that need `INTEGRATION_ENCRYPTION_KEY` will fail.
- A real production E2E created an immediately authenticated temporary account,
  generated a valid directive, and deleted the test account afterward.
- External tracking is deployed at `/integrations`. CSV/JSON import is available
  for all catalog providers. OAuth routes and automatic adapters are deployed for
  Strava, Oura, WHOOP and Fitbit; Withings, Polar and Dexcom authorization is
  scaffolded behind provider credentials/approval. `INTEGRATION_ENCRYPTION_KEY`
  is stored as an encrypted Pages secret.
- **BLOCKED PER PROVIDER:** add each provider's client ID/secret in Cloudflare
  and register `https://app.aretune.com/api/integrations/{provider}/callback`.
  As of the 2026-07-20 rename to Aretune, no provider had this callback
  registered yet under any prior domain.
  Garmin, Samsung Health, Dexcom and some other providers additionally require
  partner approval. Apple HealthKit and Android Health Connect require native
  builds and cannot be read directly by the Pages web app.

- **BLOCKED:** configure Cloudflare alerts/log retention and review Workers AI
  usage before inviting a larger cohort.
- `aretune.com` is registered on Cloudflare. It is used as a custom domain on
  the `aretune` (website, root) and `app-aretune` (app, `app.` subdomain)
  Pages projects.

## 3. App

Set the public Supabase URL, anonymous key, and deployed API URL in EAS for each
build profile. Run:

```powershell
npm ci
npm ci --prefix api
npm run typecheck
npm test
npm run api:build
npx expo-doctor
npm run export:web
```

Then create an internal preview build with `eas build --profile preview`.

The static web export succeeds with 23 routes. EAS profiles, bundle identifiers,
and package name are configured.

- **BLOCKED:** authenticate the Expo/EAS account and initialize/link the EAS
  project; the current machine has no Expo session or `EXPO_TOKEN`.
- **BLOCKED:** add `https://app.aretune.com` as the API URL in EAS before
  building the native apps. The web app URL is the same origin
  (`https://app.aretune.com/`); OAuth callbacks remain under the API path,
  for example
  `https://app.aretune.com/api/integrations/{provider}/callback`.

## 4. Alpha gate

Before inviting users:

- complete the full flow on a physical iOS and Android device
- verify open-signup abuse protection, expired sessions, offline retry, and API timeout
- review medical, mental-health, and financial coaching guardrails
- replace every publication blocker in `legal/`, then publish privacy notice,
  terms, support contact, and data-retention policy
- configure crash reporting and provider/API cost alerts
- recruit 10-15 Alpha users and measure activation, directive completion, and
  seven-day retention

Community, leaderboards, public benchmarks, and paid subscriptions remain gated
on Alpha retention evidence as defined in `PRODUCT_SPEC.md`.

## Required operator input

1. Ladungsfähige postal address for the Impressum and privacy notice.
2. Confirmation that `support@aretune.com` and `privacy@aretune.com`
   exist and are monitored.
3. ~~Decision and DNS access for the final custom domain.~~ Done: `aretune.com`
   registered on Cloudflare, 2026-07-20.
4. Confirmed backup deletion period and signed processor agreements with
   Supabase and Cloudflare (AVV/DPA).
