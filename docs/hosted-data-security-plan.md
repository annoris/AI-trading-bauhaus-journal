# Bauhaus: Data and Security Plan for Private Pilot and Growth

Revision: November 3, 2026. This document separates the current private-pilot edition from the future design for hundreds of users. Deployment templates do not prove that a remote hosted service exists or is deployed.

## Verified current state

The application is a modular Next.js monolith backed by SQLite and Drizzle. The owner signs in with `JOURNAL_PASSWORD`; production multi-user mode uses single-use invitations, member accounts with `scrypt`-derived passwords, and hashed opaque sessions. The owner's database holds identities, invitations, and access activity. Each member has a separate SQLite file under `users/<user-id>/journal.db`; the public demo uses another at `public-demo/journal.db`. Middleware and route handlers resolve the database context server-side.

Current isolation is per-SQLite-file within a single installation and operational volume. There is no `user_id` column on every journal row and no isolation across processes or servers; this must not be described as a validated multi-tenant SaaS. Existing A/B isolation tests exercise real handlers for accounts, exports, attachments, support, provider credentials, session revocation/suspension, and demo writes. Full API coverage and executing that test matrix in staging remain pending. The demo uses a separate database, and write requests to it are blocked in both middleware and handlers.

Invitations are shared manually as expiring single-use bearer links; they do not yet verify email ownership. There is no password recovery or MFA. A support inbox and a redacted local log of authenticated API failures exist; there is no browser error capture or external alerting. AI and market-data keys configured in the server environment are available only inside the owner's journal in multi-user mode; each member requires personal credentials. There is no subscription billing system to charge for Bauhaus.

Docker/Caddy templates exist for a private preview. A remote installation, live HTTPS, reverse proxy behavior, persistent storage, off-host backups, and staging restore have not been verified. Capacity for cohorts of hundreds of users has not been measured.

The earlier local estimate of 169 trades, 368 executions, one attachment, and two datasets describes only an old development snapshot; it must not be used to size a current installation or project costs.

## Volume and capacity

300 × 50 = 15,000 trades/day. 22 sessions/month = 330,000 trades/month; 252 sessions/year = 3,780,000 trades/year. Across 365 trading days, that is 5,475,000 trades/year. A single trade may include multiple executions, annotations, and rule checks.

Illustrative sizing estimate, not a benchmark measurement: if a trade plus executions and indexes averages 2–5 KB, 3.78 million trades represent roughly 7.56–18.9 GB/year, excluding attachments, lengthy notes, WAL overhead, and backups. Measure under a representative workload before provisioning capacity. One 1 MB screenshot per trade equals 330 GB/month: images dominate storage cost. Moving them outside PostgreSQL still consumes storage and incurs cost; separating them does not eliminate those bytes.

## Current architecture and recommended evolution

For the private pilot, keeping modular Next.js with one SQLite database per member reduces the risk of cross-journal leakage while validating the product with a small number of accounts. First complete encrypted backup/restore workflows, staging validation, observability, support policies, and isolation testing. Measure database size, query latency, concurrency, attachments, and imports on pilot data before deciding on a migration.

If real usage reaches hundreds of users or multiple app instances, evaluate a shared architecture using PostgreSQL, row-level isolation, and private object storage for attachments. Do not migrate solely on generic projections, and do not assume a database-per-member or process-per-user model will scale without measurement.

### Future design for scale

The future target design is a containerized Next.js application, PostgreSQL with row-level isolation, private object storage for attachments and imported files, and background workers for imports and statistics. None of this is implemented or deployed. Do not provision one server per user or shard tables without evidence that it is required.

Every private resource carries `user_id NOT NULL`. Derive the individual identity exclusively from a server-verified session; never trust a `user_id` sent by the browser. Authentication should migrate to a maintained provider or library with properly hashed passwords, account recovery, revocable sessions, and MFA where appropriate.

PostgreSQL RLS acts as a second defense layer: `ENABLE ROW LEVEL SECURITY` and `FORCE ROW LEVEL SECURITY`, `USING` and `WITH CHECK` policies, and an application role without superuser or `BYPASSRLS`. Use separate migration roles. Set the user context inside every transaction via `SET LOCAL`/`set_config(..., true)` with parameterized values before running any query. Never allow user context to persist on pooled connections across requests. RLS does not replace API authorization or protect against stolen server credentials.

Composite foreign keys `(user_id, account_id)` → `(user_id, id)` prevent a user's row from referencing another user's account. Apply the same constraint across trades, executions, daily journal, notebook, routines, templates, playbooks/rules, prop firms, receipts, attachments, settings, providers, imports, exports, and background jobs. Map legacy trade keys while preserving annotations, rule checks, and attachments; test for key collisions and account transfers.

Design indexes around query patterns: `(user_id, closed_at DESC, id)`, `(user_id, account_id, closed_at DESC, id)`, and deduplication keys scoped by owner, broker, and execution. Store monetary values as integer minor units or `NUMERIC`, timestamps with time zone, and structured attributes in typed columns; use `JSONB` only for variable data. Avoid redundant indexes.

## Reducing storage and load

- Store PNG/JPEG/WebP/PDF files in private object storage; PostgreSQL retains only the owner, random object key, validated MIME type, byte size, hash, and timestamps. Generate thumbnails in a worker; retain originals per policy. Never make the bucket public or expose permanent URLs.
- Deduplicate imports by broker/file hash without dropping legitimately identical executions. Store compressed original source files in object storage with configurable retention; do not retain repeated full JSON snapshots indefinitely.
- Share public market candles by provider, contract, market, resolution, timestamp, and price adjustment basis when licensing permits. Never share private user-uploaded datasets. Do not conflate NQ with specific contracts/rollovers or adjusted prices with unadjusted fills.
- Use cursor-based paginated queries, date-range filters, daily aggregates per user/account/currency, and incremental updates. Summary tables must not replace raw trade history or mix currencies. Invalidate summaries when editing or deleting a trade.
- Process imports in batches inside a worker with idempotency, backpressure, per-user limits, and file/storage quotas. Use a bounded connection pool; never open a database connection per trade.
- Keep financial history queryable. Archive and purge data only under documented retention policies and appropriate user consent. Apply monthly table partitioning only when table size or query plans justify it; millions of rows alone do not require partitioning.
- Scope caches by owner and permissions; never serve one user's cached private result to another. Public market candles may use a shared cache.

## Controls currently present in the codebase

Hosted/production mode fails closed if the owner password is missing; `hosted` mode additionally requires `JOURNAL_SECRET` of at least 32 characters, `JOURNAL_PROXY_TOKEN` of at least 32 characters, and a valid HTTPS `JOURNAL_PUBLIC_ORIGIN`. The Caddy template sets the client IP and proxy token. That template requires staging validation to confirm the live proxy rejects spoofed headers.

Members use individual credentials and separate databases; suspending a member revokes active sessions. Cookies use `HttpOnly` and `SameSite`; `hosted` mode adds `Secure`. Write requests validate origin, and stored provider credentials are encrypted with AES-256-GCM. If `JOURNAL_SECRET` is not configured, a fallback `.secret` key is written inside the data directory: protect and back up the full directory, or configure and retain the external key.

The API hides exception details and can issue error references without recording request bodies, query strings, internal messages, or journal content. The error view is local, retention-bounded, and lacks external alerting or high availability. Security headers and a baseline CSP are configured; the CSP does not constitute a full XSS audit. See [Private Access and Activity](access-and-activity.md) for current limits.

## Controls still required before real customers

Extend existing A/B isolation tests to every API route, resource, export, session, and background task; rerun them in staging and verify that no demo flow accesses private databases. Per-file SQLite separation does not replace explicit authorization or an audit of every data boundary.

Verify HTTPS, `Secure` cookies, trusted proxy behavior, effective request-body size limits, persistence, quotas, and recovery procedures in an isolated staging environment. Add email verification, account recovery, and MFA as required for the pilot. Plan shared rate/abuse limits and alerting before expanding access.

Encrypt broker/API credentials with keys stored outside the server, database, and backups—ideally in a secrets manager or KMS. Local AES-GCM encryption already exists, but a fallback key stored alongside the database does not protect against theft of the full data directory. Never expose secrets to client components, `NEXT_PUBLIC_` variables, logs, or exports. Audit provider and importer URLs for SSRF, restrict outbound egress, and block internal/metadata networks.

Files: validate file signatures/sizes, sanitize filenames, enforce quotas, scan uploads in quarantine for malware, serve files only after authorization, and use short-lived signed URLs. Perform an XSS review of notes, HTML, and PDF exports; keep dependencies updated and verify a full CSP without breaking application tools. Checking declared content length alone does not replace a true body-size limit at the server/proxy layer.

Place the database on a private network with no public port, least-privilege roles, non-root container user, persistent disk, separate encrypted backups, point-in-time recovery, and tested restore drills. Measure CPU, RAM, latency, and storage growth at 15,000 trades/day, import bursts, and 300 active sessions; never promise capacity based on user count alone.

## Deployment

A Hostinger VPS running Docker is compatible with the included deployment template; none has been provisioned, configured, or deployed. Before inviting a pilot group, verify domain + HTTPS, reverse proxy rules, secret environment variables, persistent volume behavior, container restarts, off-host backups, and restore procedures. Keep staging with synthetic data separate from production. A Compose volume is not a backup.

## Zero-data-loss migration

1. Take a consistent backup using SQLite's online backup API, verify checksums, and rehearse a restore; never copy `journal.db` directly while WAL files are active.
2. Provision PostgreSQL and the new schema in staging; map existing data to an explicit owner.
3. Update all queries and background jobs to require an authenticated context; migrate attachment files while preserving relationships. Reconcile row counts, checksums, P&L, and balances by account, currency, and date.
4. Test isolation, RLS roles, connection-pool reuse, concurrency, imports, and recovery.
5. Cut over during a controlled write-freeze window with a tested rollback plan; open customer access only after validation.

## Official references

- PostgreSQL RLS: https://www.postgresql.org/docs/17/ddl-rowsecurity.html
- PostgreSQL partitioning: https://www.postgresql.org/docs/current/ddl-partitioning.html
- OWASP multitenancy: https://cheatsheetseries.owasp.org/cheatsheets/Multi_Tenant_Security_Cheat_Sheet.html
- OWASP authorization: https://cheatsheetseries.owasp.org/cheatsheets/Authorization_Cheat_Sheet.html
- OWASP sessions: https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html
- OWASP CSRF: https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html
- Hostinger Docker deployment: https://github.com/hostinger/deploy-on-vps/blob/main/README.md

## Oracle Cloud alternative

Oracle Cloud Infrastructure also supports this architecture: a VM for the app/worker, private PostgreSQL (managed or self-managed), and private Object Storage. Oracle Cloud does not require using Oracle Database; switching to that engine would require another codebase adaptation. Evaluate region availability, managed PostgreSQL pricing, object storage, backups, and egress traffic. Do not assume managed PostgreSQL is included in Always Free. Idle Always Free Compute instances may be reclaimed by Oracle; do not base commercial availability solely on that tier.

Sources: https://www.oracle.com/cloud/postgresql/ and https://docs.oracle.com/en-us/iaas/Content/FreeTier/freetier_topic-Always_Free_Resources.htm

## Verification history

Local verification on November 3, 2026: 620 tests passed; typecheck, Prettier, security-boundary check, backup/restore verifier, and production build passed; `pnpm audit` found no known vulnerabilities. This covers the codebase at that revision only; it is not an external penetration test and does not validate cloud infrastructure, staging, email delivery, or off-host recovery.
