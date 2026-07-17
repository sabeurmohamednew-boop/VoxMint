# VoxMint operations runbook

## Release checklist

The release owner must confirm each item; this repository cannot provision external accounts.

- [ ] Select the production Neon database and take a provider-native backup.
- [ ] Configure the production Google OAuth client and exact HTTPS Auth.js callback URL.
- [ ] Create a private R2 bucket and bucket-scoped application token.
- [ ] Configure Upstash and Cartesia for the Production environment.
- [ ] Set `VOICE_OPERATIONS_ENABLED` deliberately and review every cost ceiling.
- [ ] Keep development and E2E authentication disabled in production.
- [ ] If `PUBLIC_LAUNCH=true`, confirm monitored support, abuse, and privacy contacts and complete legal review.
- [ ] Run `npm run preflight:production`; resolve every FAIL without pasting values into logs or tickets.
- [ ] Run install, client generation, schema validation, typecheck, lint, unit tests, isolated E2E/accessibility, and production build.
- [ ] Review committed SQL, then run `npm run db:deploy` as a controlled release step.
- [ ] Verify liveness, readiness, login, clone/generate, authenticated HEAD/range/download, usage, and deletion in a production-like environment.

## Environment separation

Local development may use demo auth, mock provider, local storage, and memory limiting. Playwright uses only `TEST_DATABASE_URL`, test-only auth, mock provider, and isolated storage. Vercel Preview must use non-production OAuth callbacks, database/storage resources, and secrets. Production must use Google OAuth, Cartesia, private R2, and Upstash. Never reuse the development or test database URL in Production.

## Migrations, backup, and rollback

Review migration SQL, take a database backup, then use `npm run db:deploy`; never use reset or development migration commands in production. Application rollback does not reverse schema changes. Roll back the application only when the forward-compatible migration permits it. Restore data through the database provider only under an approved incident plan.

## Alerts

Alert on repeated Cartesia authentication, timeout, rate-limit, or malformed-audio failures; storage writes or compensation failures; database readiness failures; unusual generation volume; the global daily character threshold; and account-deletion cleanup failures. Logs contain request IDs, hashed user identifiers, operation, provider, status, latency, count, and category—not scripts, audio, object keys, credentials, tokens, or authorization headers.

## Recovery

- Provider or cost incident: set `VOICE_OPERATIONS_ENABLED=false`; browsing, playback, and download remain available.
- Provider voice drift: run `npm run db:reconcile-voices` without `--apply` first and review the table.
- Account deletion incomplete: preserve the active account, inspect provider/storage availability, and retry. Do not manually delete database rows first.
- Storage cleanup failure: identify the request through safe logs, verify ownership through the database, then use provider-native tooling under an approved procedure.
- R2 lifecycle: keep the bucket private and ensure lifecycle deletion does not precede the product retention policy.

## Testing

Run `npm run test:e2e:readonly` for extension-free public-route, signed-out protection, hydration, security-header, health, redirect, network, and viewport checks. It neither signs in nor sends mutations. Set an unmistakably isolated `TEST_DATABASE_URL` before `npm run test:e2e`; that mutation suite migrates and clears only the isolated target. It refuses a missing URL, a URL equal to development/production, or a database name that is not visibly test-specific. `npm run test:cartesia:live` is never run by CI; it requires `LIVE_CARTESIA_E2E=true`, a separate test key and voice ID, and creates one tiny generation.

## Intentionally unavailable

VoxMint does not provide payments or checkout, automated scheduled retention without a worker, automatic import/deletion of external provider voices, or final legal approval. Do not enable or advertise these capabilities until real infrastructure and review exist.
