# Deployment readiness

VoxMint is deployable as a single Next.js runtime backed by managed PostgreSQL, private object storage, persistent rate limiting, Auth.js, and Cartesia. This repository does not include empty infrastructure scaffolding; the concrete provider resources and account identifiers are deployment-specific.

## Runtime topology

- Host the Next.js application on a Node.js 20.19+ runtime that supports route handlers and streaming responses.
- Use managed PostgreSQL for application, Auth.js, consent, and usage-ledger data.
- Use a private Cloudflare R2 or S3-compatible bucket for generated audio. Do not make the bucket public.
- Use Upstash Redis for multi-instance rate limits.
- Use Cartesia for voice cloning and speech generation.
- Configure Google OAuth for production authentication. Email magic links are optional when both email variables are present.

Audio remains behind `/api/generation-audio/[generationId]`, where the server verifies ownership before streaming it. Source voice samples are validated in memory and are not written to application storage.

## Environment mapping

| Concern | Development | Production |
| --- | --- | --- |
| Authentication | `DEV_BYPASS_AUTH=true` may be used | `DEV_BYPASS_AUTH=false`, Google OAuth configured |
| Voice provider | `mock` or `cartesia` | `cartesia` |
| Generated audio | `local` | `r2` |
| Rate limiting | `memory` | `upstash` |
| Retention | disabled unless a real worker exists | keep disabled until a scheduled worker is deployed |
| Application billing | disabled | disabled until a payment adapter and webhooks exist |

Only `NEXT_PUBLIC_APP_URL` is public by convention. Database credentials, Auth.js secrets, OAuth secrets, Cartesia credentials, object-storage credentials, and Upstash tokens must remain server runtime secrets. Never prefix those values with `NEXT_PUBLIC_`.

Production environment validation fails fast if demo authentication, local storage, memory-only rate limiting, incomplete OAuth, missing Cartesia credentials, or mock provider mode is configured. `ALLOW_MOCK_PROVIDER_IN_PRODUCTION` is an explicit test-deployment escape hatch and should remain false.

## Provisioning and release order

1. Provision PostgreSQL, a private R2/S3-compatible bucket, Upstash Redis, Google OAuth, and Cartesia.
2. Add production secrets to the host. Set `NEXT_PUBLIC_APP_URL` to the canonical HTTPS origin and add that origin's Auth.js callback URL to Google.
3. Generate the Prisma client during the build and run `npm run db:deploy` as a controlled release step before starting the new application version.
4. Run `npm run typecheck`, `npm run lint`, `npm test`, and `npm run build` against the release commit.
5. Verify login, cloning, generation, authenticated audio range requests, usage accounting, deletion, and account ownership checks in a non-production environment using equivalent managed services.

Database migrations are forward-only in normal operation. Before a schema-changing release, take a provider-native database backup and document the application rollback version. Rolling the application back does not automatically reverse a migration.

## Inactive capabilities

- Payments and checkout are unavailable. The `BillingAdapter` interface is the integration boundary; no paid VoxMint plan is advertised today.
- Scheduled retention is unavailable unless `RETENTION_WORKER_ENABLED=true` and an actual scheduled deletion worker has been deployed. The UI cannot save an unenforced retention value.
- Voice previews are not stored. The voice library says "No preview available" and does not silently generate paid test audio.
- Abuse reporting is a configured operator link or email, not an in-app case-management system.

## Operational checks

- Monitor 5xx responses, provider latency and failures, rate-limit rejections, database saturation, object-storage failures, and usage reservation releases without logging scripts, audio, provider responses, object keys, tokens, or credentials.
- Keep the R2 bucket private and restrict its token to the single application bucket.
- Rotate `AUTH_SECRET`, provider keys, storage keys, and Upstash tokens through the hosting platform's secret manager.
- Review consent and acceptable-use copy with counsel before public launch.
- Do not run the demo cleanup command without its dry-run review. It only soft-deletes unreferenced mock voices and never removes Cartesia voices or generations.
