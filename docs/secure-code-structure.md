# Bauhaus Code Structure and Readiness

Document status: November 3, 2026. The current edition supports owner access and invitations with a separate SQLite DB per member; this does not make it an organization-based SaaS or constitute a security certification.

## Architecture decision

Keep the modular Next.js monolith; do not introduce microservices without a measured need. Security controls execute on the server. HTML, JS, and routes delivered to a browser are observable; they must never contain keys or authoritative permission checks. A hidden UI element is not a security boundary.

Current organized structure:

```text
apps/web/src/
  app/                       pages and HTTP adapters
    api/                     input validation → service → response
  components/                presentation; no database or secret access
  lib/                       shared utilities, types, and hooks without secrets
  server/
    security/
      auth.ts                signing, validation, and local session expiration
      request.ts             write-request origin checks and local login rate limit
      http.ts                API guard, error handling, and private responses
    auth.ts                  backward-compatible re-export
    api.ts                   backward-compatible re-export
    request-security.ts      backward-compatible re-export
    market-data/             providers and bounded HTTP transport
    settings.ts              configuration and local encrypted secrets
    ...                      existing logic, pending domain separation
  db/                        current SQLite schema and server-only access
packages/
  core/                      pure trading calculations
  importers/                 statement format parsers
scripts/
  check-security-boundaries.mjs
  benchmark-journal.py
deploy/
  compose.preview.yml        invite-only private preview, SQLite on persistent volume
  Caddyfile.example          frontend HTTPS termination and request-body limit
```

Do not move all files purely for aesthetics: preserve compatible imports and isolate sensitive responsibilities first. The frontend remains unchanged.

## Future scaling for organizations/SaaS

The invitation model and per-member separate DB already exist. The design below outlines a possible future evolution for organizations with shared data and SaaS deployment; it does not describe current capabilities.

```text
server/
  security/                  identity, session, authorization, quotas, and audit
  modules/
    accounts/                account and credential services and repositories
    trading/                 trades, executions, import, and deduplication
    journal/                 notes, folders, templates, and attachments
    discipline/              routines and rule checks
    prop-firms/              phases, expenses, payouts, receipts, and audit
    analytics/               aggregates, filters, and owner-scoped exports
    integrations/            brokers, AI, and external providers
  storage/                   private objects and short-lived signed URLs
  jobs/                      owner-scoped, idempotent workers
  db/                        PostgreSQL, transactions, migrations, and RLS
```

For that evolution, the request contract remains `route → validate → authenticate → authorize resource → service → owner-scoped repository → minimal public response`. Identity must be derived from the session and never from a browser-supplied field. Even if an attacker knows another user's resource ID, the query must reject it. Normal application users must have no migration privileges and no RLS bypass.

For every domain, the repository receives a verified user context. Authorization covers queries, mutations, files, settings, exports, jobs, and caches. Adding `user_id` only to `trades` is insufficient: rules, notes, providers, and routines also require an owner. RLS, write policies, and composite foreign keys provide a second barrier.

## Findings and actions

| Area           | Status                                                                                              | Action                                                                                                                                  |
| -------------- | --------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| Identities     | Owner with `JOURNAL_PASSWORD`; invited members with own password, revocable session, and suspension | Add mailbox verification and recovery/MFA if required; no automated email delivery exists                                               |
| Data           | Owner DB, separate DB per member, and read-only public demo DB                                      | For shared organizations, design per-tenant membership/roles and migrate to PostgreSQL with owner scoping on all private tables and RLS |
| Queries        | `queryTrades` filters and converts many records in memory                                           | Add pagination and aggregates by date/account/user; preserve timezone and currency semantics                                            |
| Attachments    | BLOB inside SQLite, signature validation, and 8 MB limit                                            | Move to private object storage, quarantine scanning, quotas, and authorized temporary links                                             |
| AI             | Encrypted backend credentials; env keys owner-only in multi-user mode                               | Confirm consent, spending caps, timeouts, and exact payload sent to the provider in each flow                                           |
| Market data    | Fixed URLs per provider; redirects rejected, bounded cache                                          | Keep controlled destinations; never add arbitrary URLs without egress/SSRF policy; isolate private datasets                             |
| Secrets        | Fallback key stored next to data                                                                    | For cloud deployments, keep persistent key separate with independent backups; avoid public env vars                                     |
| Backups        | Manual CLI encrypts consistent snapshots of `JOURNAL_DATA_DIR` and verifies SQLite restore          | Configure encrypted off-host retention, separate secret custody, and full staging restore drill                                         |
| Auth/HTTP      | Security logic previously split across three files                                                  | Centralized under `server/security` with backward-compatible entrypoints and tests                                                      |
| Dependencies   | Initial audit reported 19 advisories (2 critical)                                                   | Fixed: Next.js 15.5.27, PostCSS 8.5.26, source-map-js 1.2.2, and undici 7.29.1. Subsequent production audit: 0 known advisories         |
| Container      | Non-root `node` user already present                                                                | Prepared `compose.preview.yml` with read-only root filesystem, dropped capabilities, `no-new-privileges`, and loopback port             |
| Docker context | Already excluded data and `.env`                                                                    | Added exclusions for build outputs, backups, keys, and compilation artifacts                                                            |
| Public assets  | Landing page with demo images                                                                       | In production, serve only approved marketing assets; never copy journals, attachments, or credentials into `public`                     |

Dependency advisories indicate affected package versions rather than proving exploitability in this installation. Patching was completed without upgrading to a new major version of Next.js.

## Automated checks

`pnpm security:check` inspects literal static and dynamic local imports, ignores type-only imports, walks dependencies from `use client` entrypoints, and fails if any reach `server/` or `db/`. It detects secret names in public client variables and API variable exports that bypass the shared wrapper. It does not cover generated code, external packages, computed imports, or every possible export pattern; it is neither a penetration test nor a complete secret scanner.

Before every release: run `security:check`, the test suite, the production build, and dependency audit. In a SaaS model, also run A/B user isolation tests and reused job/pool tests; cross-user exports and attachment reads must fail even with valid IDs. Test backup restoration and migrations before modifying production.

## Pre-SaaS deployment

`deploy/compose.preview.yml` provides a single-host private preview with the owner and invited members in separate SQLite databases. It requires an owner password, encryption key, and public origin. It binds only `127.0.0.1:3000`; the host's HTTPS reverse proxy publishes port 443. The `journal_data` volume persists the owner DB, `users/` DBs, and the `public-demo/` DB across container recreations. Compose does not configure off-host backups; `docker compose down -v` deletes the volume. This deployment does not provide multi-tenant SaaS isolation between organizations.

The Caddy template caps request bodies at 10 MB: align large imports with application limits before enabling them. Never expose database ports publicly. Because Docker is unavailable in this environment, the image and Compose stack have not been runtime-tested here; verify them in staging, including volume permissions, `tmpfs`, recovery, and health checks. No cloud resources were provisioned and no user passwords were generated.

Full growth and migration plan: [hosted-data-security-plan.md](hosted-data-security-plan.md).

## Work sequence for a SaaS offering

1. Configure off-host backup/retention and rehearse a full restore in isolated staging; manual encrypted commands are already implemented and locally verified.
2. Individual identity and permission matrix.
3. PostgreSQL, owner columns, foreign-key relationships, and RLS; migrate with verified row counts, hashes, and P&L reconciliation.
4. Domain-scoped repositories and authorization across every route, job, and cache.
5. Private object storage, quotas, worker-based imports, and incremental statistics.
6. Revocable sessions, shared rate limits, secret-free observability, and alerting.
7. Load testing and external security review; gradual rollout and monitoring.

The current product can grant access to invited members with separate DBs; the sequence above applies to a multi-tenant SaaS offering with shared organizations and resources. There is no automated email invitation delivery: the owner shares links manually. The invitation page does not verify mailbox ownership, and each link is a bearer credential. The public demo is read-only, synthetic, and isolated at `JOURNAL_DATA_DIR/public-demo/journal.db`.

## Historical readiness results (October 2026)

Security logic was centralized without breaking existing imports. The frontend/backend boundary check runs automatically during `pnpm build` and Docker image builds. Next.js was updated to 15.5.27 and Vitest to 4.1.11, with patched transitive dependency versions pinned in `pnpm-workspace.yaml` and an updated lockfile.

Final verification: 583 tests across 63 files passed with Vitest 4.1.11; production build passed; full dependency audit (production and development) showed 0 known advisories at the time of review. The import boundary check inspected 225 files and 93 client entrypoints. These results do not replace multi-user isolation testing or infrastructure review. Docker is not installed here: container and proxy templates require staging validation before use.

Single-use private invitations and their limits: [invitations.md](invitations.md). Registration is invite-only via link, not open sign-up.

Current suspension, session, per-DB isolation, and private IP logging controls: [access-and-activity.md](access-and-activity.md). Historical test counts above do not by themselves verify subsequent changes.
