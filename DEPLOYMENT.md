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

- Marketing website: `https://uebermensch-ai.pages.dev/`.
- Web app: `https://uebermensch-ai.pages.dev/app/`.
- API origin: `https://uebermensch-ai.pages.dev/api/`.
- The marketing website, Expo static output under `/app`, and Cloudflare Pages
  Functions are deployed together from `main`. Run `npm run bundle:pages` before
  deploying so a Pages release cannot replace the website with the app again.
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
- A real production E2E created an immediately authenticated temporary account,
  generated a valid directive, and deleted the test account afterward.
- External tracking is deployed at `/integrations`. CSV/JSON import is available
  for all catalog providers. OAuth routes and automatic adapters are deployed for
  Strava, Oura, WHOOP and Fitbit; Withings, Polar and Dexcom authorization is
  scaffolded behind provider credentials/approval. `INTEGRATION_ENCRYPTION_KEY`
  is stored as an encrypted Pages secret.
- **BLOCKED PER PROVIDER:** add each provider's client ID/secret in Cloudflare
  and register `https://uebermensch-ai.pages.dev/api/integrations/{provider}/callback`.
  Garmin, Samsung Health, Dexcom and some other providers additionally require
  partner approval. Apple HealthKit and Android Health Connect require native
  builds and cannot be read directly by the Pages web app.

- **BLOCKED:** configure Cloudflare alerts/log retention and review Workers AI
  usage before inviting a larger cohort.
- **BLOCKED:** decide whether `uebermensch.ai` should be moved away from its
  current Squarespace DNS target and connected to Pages.

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
- **BLOCKED:** add `https://uebermensch-ai.pages.dev` as the API URL in EAS
  before building the native apps. The web app URL is
  `https://uebermensch-ai.pages.dev/app/`; OAuth callbacks remain under the API
  origin, for example
  `https://uebermensch-ai.pages.dev/api/integrations/{provider}/callback`.

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
2. Confirmation that `support@uebermensch.ai` and `privacy@uebermensch.ai`
   exist and are monitored.
3. Decision and DNS access for the final custom domain.
4. Confirmed backup deletion period and signed processor agreements with
   Supabase and Cloudflare (AVV/DPA).
