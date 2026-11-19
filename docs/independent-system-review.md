# Independent Logic and Security Review

**Historical review: October 13, 2026.** This evaluation describes the codebase state on that date and must not be read as a current inventory. The original review was read-only; the fixes listed below were applied and verified in that edition. No secrets, journal data, or emails were transmitted to third parties. The project was not published.

**Update: November 3, 2026.** The codebase now includes individual invitations, separate SQLite databases per member and for the demo, account suspension/reactivation, private support reports, redacted server error references, and manual encrypted backup/restore commands. Comprehensive A/B/demo isolation verification remains ongoing; there is no email verification, account recovery/MFA, scheduled off-host backup, or verified remote staging deployment. For current status, see [launch-roadmap](launch-roadmap.md) and [access-and-activity](access-and-activity.md).

## Scope

Authentication, middleware, HTTP guard, invitations, planned user/session controls, proxy IP trust, activity retention and rate limits, Docker/reverse proxy setup, and frontend/backend import boundaries; plus a targeted review of statement import/deduplication, bulk editing, account transfer/deletion, round-trip reconstruction, attachment/note/rule-check references, and prop firm expense/receipt balances. It was neither an exhaustive audit of every feature nor a penetration test against published infrastructure.

## Findings fixed

| Finding                                                        | Fix                                                                                                      |
| -------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| Basic Docker exposed port without mandatory protection         | Loopback binding and mandatory credentials; `hosted` mode validates configuration and proxy              |
| Cookie lacked `Secure` behind HTTPS terminated at proxy        | Cookie policy derived from the configured public origin                                                  |
| Single client could exhaust the global login rate limit        | Per-trusted-IP buckets, in-memory HMAC, and cardinality/circuit limits                                   |
| Login parsed request bodies without a maximum size             | Streaming read capped at 2 KB                                                                            |
| IP logging derived keys via `scrypt` per event                 | Per-configuration/process key cache                                                                      |
| Middleware prevented logging rejected API requests             | API authentication delegated to the shared Node guard; pages remain protected                            |
| Account transfer lost references and could end up partial      | Single immediate transaction to move/rebuild/remap; attachments, rule checks, notes, and estimates kept  |
| Destination positions could silently merge                     | Rejection and rollback unless executions match exactly                                                   |
| Bulk edit accepted invalid tags/playbooks                      | Consistent validation of types, lengths, counts, and existence; updates wrapped in a transaction         |
| Polymorphic references were left orphaned when deleting trades | Blob/rule-check cleanup; notes preserved with cleared anchor; execution deletes batched in a transaction |

Transferred estimate caches retain their original fingerprint and are invalidated if the financial context changes. Old estimates are neither recalculated nor presented as verified for another currency or reconstruction. No real trades were transferred or deleted during these tests.

## Limits identified in the October review (historical state)

In October, individual access, per-member isolation, and active suspension enforcement on a published platform were still pending. Invitations, revocable sessions, per-member SQLite databases, and suspend/reactivate controls are now implemented in the current local codebase; exhaustive verification of all API routes, attachments, and exports remains pending before a pilot.

To enable real IP capture, configure a trusted proxy and a separate secret. The activity view maintains a logical seven-day window with physical cleanup on startup, hourly, and on reads/writes. Backups, WAL handling, and proxy logs must be configured separately. Do not log arbitrary headers as the user's IP or rely on IP address alone as proof of fraud.

The Docker/Caddy configuration still requires live verification in staging because Docker was not available on this machine. Within the reviewed scope, the independent review found no other specific blocker for a single-user private preview; this does not certify that the product is invulnerable.

Final verification: 610 tests across 69 files and the production build passed. No purchases, deployments, or changes to real accounts were made.
