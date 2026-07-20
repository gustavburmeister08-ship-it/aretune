# Aretune

Aretune is an Expo/React Native application with a Fastify API and Supabase
backend. This directory is the canonical product codebase. See
[`../README.md`](../README.md) for the project-wide overview (website,
Cloudflare projects, CRM link).

## Product loop

1. Onboarding establishes a baseline and selects focus pillars.
2. A short daily check-in records vitals and leading metrics.
3. The API produces one authenticated, data-informed daily directive.
4. The user completes, skips, or rates the directive.
5. A weekly audit explains progress, gaps, and the next focus.

The canonical product model has six pillars and currently 46 categories:
Body, Mind, Spirit, Relationships, Vocation, and Lore. See
[`PRODUCT_SPEC.md`](./PRODUCT_SPEC.md).

## Local setup

Copy `.env.example` to `.env` and fill in the public Supabase values. Copy
`api/.env.example` to `api/.env` and configure at least one AI provider plus
Supabase credentials.

```powershell
npm install
npm run dev
```

In a second terminal:

```powershell
npm run api
```

## Verification

```powershell
npm run typecheck
npm run test
npm run api:build
```

Database migrations live in `supabase/migrations` and must be applied in order.
After schema changes, regenerate `types/database.ts` from the target Supabase
project before releasing.
