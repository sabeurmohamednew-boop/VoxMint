# VoxMint

VoxMint is a consent-first voice creation and text-to-speech workspace. Authenticated users can create private voices from short samples they own or have permission to use, generate speech, play and download protected audio, manage voices and history, and review account usage.

The application follows the supplied dark audio-production dashboard reference while adding responsive mobile navigation, accessible dialogs and menus, server-enforced ownership, transactional quotas, provider/storage abstractions, and a complete local mock workflow.

## Stack

- Next.js 16 App Router, React 19, strict TypeScript, Tailwind CSS 4
- Auth.js 5 with Google OAuth, optional email magic links, and a development-only demo provider
- PostgreSQL with Prisma ORM 7 and the PostgreSQL driver adapter
- Cartesia’s official TypeScript SDK or a deterministic local WAV mock provider
- Cloudflare R2/S3-compatible storage or a development-only local filesystem adapter
- Radix UI primitives and Lucide icons
- Vitest, React Testing Library, and Playwright

## Architecture

```text
Browser client islands
  ├─ upload/dropzone, script editor, audio player, dialogs
  └─ authenticated route-handler mutations
                 │
Next.js server components and API routes
  ├─ Auth.js session + per-object ownership checks
  ├─ Zod validation + request IDs + rate limits
  └─ domain services
       ├─ VoiceProvider: mock | Cartesia
       ├─ ObjectStorage: local | R2
       └─ Prisma transactions: PostgreSQL + usage ledger
```

Pages and layouts are Server Components by default. Browser-only behavior is isolated in components under `components/`. Provider credentials, database access, audio inspection, storage, quota logic, and ownership checks are server-only.

Important locations:

- `app/(app)`: protected dashboard pages
- `app/api`: authenticated API routes
- `components`: shell, dashboard, voice, history, audio, settings, and UI components
- `lib/providers`: provider interface, Cartesia adapter, mock provider, typed errors
- `lib/storage`: local and R2 adapters
- `server/services`: voice, generation, usage, and account workflows
- `prisma/schema.prisma`: application and Auth.js data model
- `prisma/migrations/20260716130000_init`: initial PostgreSQL migration

## Prerequisites

- Node.js 20.19+ (Node.js 24 is supported)
- npm
- PostgreSQL 15+ locally, or a Neon-compatible PostgreSQL connection string

## Local setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Copy `.env.example` to `.env` and set at least:

   ```dotenv
   DATABASE_URL=postgresql://postgres:postgres@localhost:5432/voxmint
   AUTH_SECRET=replace-with-a-long-random-secret
   DEV_BYPASS_AUTH=true
   VOICE_PROVIDER=mock
   STORAGE_PROVIDER=local
   RATE_LIMIT_PROVIDER=memory
   ```

   `DEV_BYPASS_AUTH=true` and the mock provider are both rejected in production.

3. Generate the Prisma client, apply the migration, and seed development content:

   ```bash
   npm run db:generate
   npm run db:migrate -- --name init
   npm run db:seed
   ```

4. Start VoxMint:

   ```bash
   npm run dev
   ```

5. Open `http://localhost:3000/login` and choose **Enter demo workspace**.

When `VOICE_PROVIDER=mock`, the seed creates a synthetic demo user and fictional mock voices. In Cartesia mode it skips mock voice records, so fake voices are not mixed into a real provider workspace.

The current `FREE` and `PRO` database values are internal allowance tiers, not paid VoxMint products. The canonical `/status` page presents development access, configured provider ceilings, and payment availability as separate concepts; `/billing` permanently redirects there for compatibility. Checkout remains hidden until a real `BillingAdapter`, webhook handling, and persisted application-access mapping exist.

## Environment variables

See `.env.example` for the documented list.

Required for all database-backed modes:

- `DATABASE_URL`
- `AUTH_SECRET`
- `NEXT_PUBLIC_APP_URL`

Authentication:

- `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET`: required for Google OAuth in production
- `AUTH_EMAIL_SERVER`, `AUTH_EMAIL_FROM`: optional email magic-link provider
- `DEV_BYPASS_AUTH`: development demo login; cannot run in production
- `E2E_TEST_AUTH`: isolated two-user Playwright login; valid only with `NODE_ENV=test`

Voice provider:

- `VOICE_PROVIDER=mock|cartesia`
- `CARTESIA_API_KEY`
- `CARTESIA_API_VERSION=2026-03-01`
- `CARTESIA_TTS_MODEL=sonic-3`

Storage:

- `STORAGE_PROVIDER=local|r2`
- `LOCAL_STORAGE_PATH`
- `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET`, `R2_ENDPOINT`

Rate limiting:

- `RATE_LIMIT_PROVIDER=memory|upstash`
- `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`

Cost and launch controls:

- `VOICE_OPERATIONS_ENABLED`: emergency switch for new clone/generation operations; existing playback remains available
- `VOICE_CREATIONS_PER_HOUR`, `GENERATIONS_PER_MINUTE`, `DOWNLOADS_PER_MINUTE`
- `DAILY_CHARACTER_LIMIT`, `MONTHLY_CHARACTER_LIMIT`, `GLOBAL_DAILY_CHARACTER_LIMIT`
- `MAX_CONCURRENT_PROVIDER_REQUESTS`
- `PUBLIC_LAUNCH`: requires real operator, support, abuse, privacy, effective-date, and jurisdiction settings in production

Limits:

- `VOICE_SAMPLE_MIN_SECONDS`, `VOICE_SAMPLE_MAX_SECONDS`, `VOICE_SAMPLE_MAX_BYTES`
- `GENERATION_MAX_CHARACTERS`

Operations and disclosure:

- `SUPPORT_EMAIL`, `ABUSE_REPORT_URL`: optional monitored operator channels shown on Help & Safety
- `RETENTION_WORKER_ENABLED`: keep `false` unless a real scheduled deletion worker is deployed
- `SHOW_PROVIDER_BRANDING`: controls the optional Cartesia badge; demo mode is always disclosed

## Google OAuth

Create an OAuth application in Google Cloud and add the Auth.js callback URL:

```text
http://localhost:3000/api/auth/callback/google
https://your-domain.example/api/auth/callback/google
```

Set `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET`, `AUTH_SECRET`, and the production `NEXT_PUBLIC_APP_URL`. Logged-out users are redirected to `/login` with the intended protected return URL preserved by Auth.js. Server actions reduce root-relative and canonical-origin callback URLs to a local path; external, protocol-relative, backslash, control-character, credential-bearing, and malformed values fall back to `/dashboard`.

## Cartesia

VoxMint uses the current ordinary clone and bytes TTS flow:

- `POST /voices/clone` with a private voice and provider-supported clip
- `POST /tts/bytes` with the returned voice ID
- `Cartesia-Version: 2026-03-01`
- a configurable Sonic model, defaulting to `sonic-3`

The older voice embedding and create-voice endpoints were discontinued in June 2026 and are not used. The server currently accepts Cartesia-documented FLAC, MP3/MPEG, OGG/OGA, WAV, and WebM formats after magic-byte and decoder inspection.

To enable Cartesia:

```dotenv
VOICE_PROVIDER=cartesia
CARTESIA_API_KEY=sk_car_...
CARTESIA_API_VERSION=2026-03-01
CARTESIA_TTS_MODEL=sonic-3
```

The API key is read only by server modules and is never returned to the browser.

## Production R2 storage

Create a private R2 bucket and an API token restricted to that bucket. Configure:

```dotenv
STORAGE_PROVIDER=r2
R2_ACCESS_KEY_ID=...
R2_SECRET_ACCESS_KEY=...
R2_BUCKET=voxmint-audio
R2_ENDPOINT=https://ACCOUNT_ID.r2.cloudflarestorage.com
```

Objects are stored under `users/{userId}/generations/{generationId}/audio.{extension}`. Bucket URLs remain private. Audio is streamed through an ownership-checked route with `HEAD` and single-range request support.

## Commands

```bash
npm run dev          # development server
npm run build        # production build
npm run start        # production server
npm run lint         # ESLint
npm run typecheck    # Next route types + strict TypeScript
npm test             # unit, component, and adapter integration tests
npm run test:watch   # Vitest watch mode
npm run test:e2e     # Playwright desktop and mobile workflows
npm run test:e2e:readonly # clean-browser checks that never sign in or mutate data
npm run db:generate  # generate Prisma client
npm run db:migrate   # apply a development migration
npm run db:deploy    # apply committed migrations in production
npm run db:seed      # seed synthetic mock data
npm run db:studio    # Prisma Studio
npm run db:cleanup-demo # dry-run report for safely removable, unreferenced demo voices
npm run db:reconcile-voices # dry-run Cartesia existence report; -- --apply marks only missing records
npm run preflight:production # redacted production configuration gate
```

`npm run db:cleanup-demo -- --apply` only soft-deletes unreferenced mock voices, only outside production, and only while Cartesia is active. It never deletes generations, referenced voices, real Cartesia voices, or user accounts.

Playwright requires an isolated PostgreSQL database or schema whose URL visibly contains `test`, `e2e`, or `playwright`. It refuses a missing `TEST_DATABASE_URL`, equality with `DATABASE_URL`/`PRODUCTION_DATABASE_URL`, and obvious production targets. The harness applies committed migrations, clears only that isolated target, uses `.data/e2e-storage`, mock audio, and two identities. It never calls paid Cartesia APIs.

`npm run test:cartesia:live` is disabled unless `LIVE_CARTESIA_E2E=true` and separate `CARTESIA_E2E_API_KEY` and `CARTESIA_E2E_VOICE_ID` values are supplied. It makes one tiny generation and is never part of CI.

## Security and consent

- Every protected read and mutation derives the user ID from the authenticated session.
- Cross-user object IDs return not found and never authorize from client state.
- Uploads require a declared size before multipart buffering, are capped, magic-byte detected, decoded, duration checked, and never executed.
- Source samples are validated only in memory and are not retained in application storage or temporary files after provider cloning.
- Usage is reserved and committed in serializable database transactions, then released on provider or storage failure.
- Displayed Cartesia usage is the VoxMint deployment ledger and configured ceiling, not the authoritative Cartesia subscription balance.
- Generated audio is stored outside PostgreSQL and streamed through an authenticated, private, no-store endpoint with byte-range support.
- Scripts, audio, credentials, raw provider responses, OAuth tokens, and signed URLs are excluded from structured logs.
- Local storage, in-memory rate limiting, demo auth, and the mock provider are development tools—not multi-instance production controls.
- The consent checkbox records the user’s assertion; it does not prove or replace permission.

## Deployment

For Vercel, provision PostgreSQL (for example Neon), R2, Upstash Redis, Google OAuth, and Cartesia. Add all production variables, run `npm run db:deploy`, then deploy. Production validation refuses demo auth, local storage, in-memory rate limiting, and the mock provider by default.

See [`docs/deployment-readiness.md`](docs/deployment-readiness.md) for the runtime topology, environment mapping, secret boundaries, migration order, rollback considerations, and currently inactive services.
See [`docs/operations-runbook.md`](docs/operations-runbook.md) for release owner actions, alerts, recovery, isolated E2E, and rollback.

## Known limitations

- Online upgrades are intentionally unavailable until a payment provider is integrated.
- Automated retention stays disabled in the UI unless `RETENTION_WORKER_ENABLED=true`; enabling that flag is only honest when a production cron/queue worker exists.
- TTS currently uses the regular bytes endpoint; WebSocket streaming is an extension point, not an MVP dependency.
- Clone and generation calls are synchronous within a request. A durable queue is recommended for higher-volume deployments.
- API list endpoints cap results at 100; UI search/filtering operates on the loaded set. Add cursor controls when accounts can exceed that scale.
- The template provides policy starting points and must receive legal review before public launch.
