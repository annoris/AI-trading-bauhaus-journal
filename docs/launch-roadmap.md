# Trading Bauhaus launch roadmap

Status: 3 November 2026. This roadmap separates working product features from launch operations. It does not enable customer billing or imply that the project is already deployed as a hosted service.

## Keep the current code structure

The repository is already a modular monorepo:

- `apps/web`: Next.js product UI, API routes, server modules, and app-specific tests.
- `packages/core`: trading calculations and reusable domain logic.
- `packages/importers`: broker and journal import adapters.
- `docs`, `scripts`, `deploy`, and `.github/workflows`: product/operations documentation, checks, deployment templates, and CI.

Add features beside their existing domain code. Do not move the whole app into new folders for appearance; update stale documentation and keep access/data boundaries easy to review.

## Current product foundation

- Public landing and fictional read-only demo use a database separate from owner and member journals.
- Owner-issued one-use invitations create separate SQLite databases for each member.
- Owner can view invited accounts, suspend/reactivate access, create/revoke invitations, and revoke sessions through the protected API.
- Member trading data is not shared with the owner through the journal UI.
- Members can submit a private support report with their account, page route, and time. The owner can review it, change status, and leave a reply that appears in the member's Support page.
- Report text is provided by the member; trades, notes, payment information, and screenshots are not attached automatically. Replies do not send email.

## Launch work by phase

### 1. Private pilot operations

- [x] Owner/member access and separate journal databases implemented; exhaustive cross-account validation remains pending below.
- [x] Account suspend/reactivate controls.
- [x] Member-submitted support queue and owner replies.
- [x] Redacted server error references for signed-in owner/member API failures, visible to the owner for up to 30 days.
- [x] Server environment AI and market-data credentials are restricted to the owner journal; members and demo must use their own saved credentials.
- [ ] Verify invitation email ownership, or keep sharing links only through a private channel and explicitly accept bearer-link risk.
- [x] Add encrypted full-data backup/restore commands, per-database integrity checks, and a repeatable `pnpm verify:backup` scratch verification for owner/member/demo data, attachment BLOBs, `.secret`, private permissions, tampering, bad passphrases, overwrite prevention, and failed-restore cleanup.
- [ ] Configure scheduled off-host retention, keep environment secrets independently recoverable, and validate a complete restore in isolated staging.
- [ ] Configure and verify HTTPS, trusted proxy headers, persistent storage, health checks, and recovery in staging.
- [ ] Add browser error capture and monitoring/alert delivery; keep request bodies and journal content out of diagnostics.

### 2. Billing readiness — no live charges

- [ ] Decide billing provider, plan names/prices, billing interval/currency, trial rules, cancellation/refund policy, and overdue grace period.
- [ ] Add account billing state and owner visibility for plan, processor customer ID, status, renewal, and payment history.
- [ ] Implement hosted checkout/portal and signed, idempotent webhook handling in test mode.
- [ ] Keep checkout disabled by default. Do not create live checkout links or charge members until the owner explicitly enables production billing after reviewing the complete flow.
- [ ] Define overdue behavior without deleting journals; prefer a notice and grace period, then a clearly explained restricted state with export access.

### 3. Launch validation

- [x] Add focused A/B isolation tests for accounts, exports, attachments, support reports, provider credentials, suspended sessions, and demo writes.
- [ ] Extend the A/B matrix across every remaining API and sensitive session/data path, then verify it against an isolated staging deployment.
- [x] Verify demo writes are rejected at middleware and API level, and demo requests do not expose owner environment credentials.
- [x] Run the local checks on 3 November 2026: 620 tests, typecheck, Prettier, the security-boundary check, encrypted-backup verification, production build, and full dependency audit (no known vulnerabilities).
- [x] Exercise encrypted backup/restore, SQLite integrity, attachment BLOBs, `.secret`, tamper rejection, bad passphrases, overwrite prevention, and cleanup with synthetic data.
- [ ] Confirm a restored app can decrypt a saved provider credential and complete a full restore in isolated staging.
- [ ] Review product copy, privacy/terms, support contact expectations, retention periods, and an incident response path.
- [ ] Decide whether invited members must prove mailbox ownership; until then, share each single-use invitation only through a private channel.

## Observability boundaries

The existing security-activity store records a limited set of authenticated request/security events for seven days when trusted proxy IP capture is configured. Separately, unexpected API exceptions from signed-in owner/member requests receive a random reference and store only a reduced API route, method, actor type, a hash of the internal account ID, and timestamp. The owner can review those records in Support & errors; a response reference is available to the member for ten minutes and can be included only in a report from the same account. Records are purged when the error list is read or another error is recorded, are capped at 20,000 rows, and may disappear sooner under heavy volume. Exception messages, stacks, query strings, request bodies, and journal data are excluded. Anonymous and demo requests, expected 4xx responses, framework-render errors, and browser exceptions are not captured. This local view is useful for issue triage, but it is not hosted high-availability monitoring or alert delivery.

## Billing boundary

The Prop firms ledger records a trader's own prop-firm costs and receipts. It is not a subscription system for Trading Bauhaus. No SaaS payment processor is integrated in this repository. Live billing stays out of scope until the business settings above are decided and the test-mode flow is verified.
