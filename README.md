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

   `DEV_BYPASS_AUTH=true` is rejected in production. The mock provider is also refused in production unless the explicit dangerous override is set.

3. Generate the Prisma client, apply the migration, and seed demo content:

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

The seed creates a synthetic demo user, three fictional mock voices, and generated tone-based WAV examples. It does not contain a real person’s voice or copyrighted audio.

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

Limits:

- `VOICE_SAMPLE_MIN_SECONDS`, `VOICE_SAMPLE_MAX_SECONDS`, `VOICE_SAMPLE_MAX_BYTES`
- `GENERATION_MAX_CHARACTERS`

## Google OAuth

Create an OAuth application in Google Cloud and add the Auth.js callback URL:

```text
http://localhost:3000/api/auth/callback/google
https://your-domain.example/api/auth/callback/google
```

Set `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET`, `AUTH_SECRET`, and the production `NEXT_PUBLIC_APP_URL`. Logged-out users are redirected to `/login` with the intended protected return URL preserved by Auth.js.

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

Objects are stored under `users/{userId}/generations/{generationId}/audio.{extension}`. Bucket URLs remain private. Audio is returned through an ownership-checked route or a short-lived signed URL.

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
npm run db:generate  # generate Prisma client
npm run db:migrate   # apply a development migration
npm run db:deploy    # apply committed migrations in production
npm run db:seed      # seed synthetic mock data
npm run db:studio    # Prisma Studio
```

Playwright needs an initialized PostgreSQL database. Set `TEST_DATABASE_URL` to an isolated migrated test database before running `npm run test:e2e`; tests never call paid Cartesia APIs.

## Security and consent

- Every protected read and mutation derives the user ID from the authenticated session.
- Cross-user object IDs return not found and never authorize from client state.
- Uploads are capped, magic-byte detected, decoded, duration checked, and never executed.
- Source samples are not retained after provider cloning.
- Usage is reserved and committed in serializable database transactions, then released on provider or storage failure.
- Generated audio is stored outside PostgreSQL and delivered with private, no-store semantics.
- Scripts, audio, credentials, raw provider responses, OAuth tokens, and signed URLs are excluded from structured logs.
- Local storage, in-memory rate limiting, demo auth, and the mock provider are development tools—not multi-instance production controls.
- The consent checkbox records the user’s assertion; it does not prove or replace permission.

## Deployment

For Vercel, provision PostgreSQL (for example Neon), R2, Upstash Redis, Google OAuth, and Cartesia. Add all production variables, run `npm run db:deploy`, then deploy. Production validation refuses demo auth, local storage, in-memory rate limiting, and the mock provider by default.

## Known limitations

- Online upgrades are intentionally unavailable until a payment provider is integrated.
- Retention preferences are stored, but scheduled deletion needs a production cron/queue worker.
- TTS currently uses the regular bytes endpoint; WebSocket streaming is an extension point, not an MVP dependency.
- Clone and generation calls are synchronous within a request. A durable queue is recommended for higher-volume deployments.
- API list endpoints cap results at 100; UI search/filtering operates on the loaded set. Add cursor controls when accounts can exceed that scale.
- The template provides policy starting points and must receive legal review before public launch.
