# Single-Use Private Invitations

Code status: November 3, 2026. Invitations and link-based redemption are implemented for one owner and members with separate journals. There is no email delivery or mailbox verification.

## Current flow

1. Configure `JOURNAL_PASSWORD` and sign in as the owner. In production, multi-user mode is enabled by default; locally it can be enabled with `JOURNAL_MULTI_USER=true`. Without an owner password, issuing and redeeming invitations are unavailable.
2. Open **Invitations** from the private sidebar, enter the email address you want to associate, and create a link valid for seven days.
3. Copy the link and share it manually over a private channel. The app does not send emails.
4. The invitee opens `/accept-invitation`, sees the associated email address, and creates a password of at least 12 characters. The invitation is consumed once and their session begins.

The link carries a 256-bit random token in the query string `?token=...`. The database stores only the SHA-256 hash; the plaintext token is returned once to the owner and appears in the copied link. Treat it like a password: anyone holding the link can accept the invitation. The token may also remain in browser history or infrastructure logs that record full URLs. Do not include it in support tickets, screenshots, or public channels; proxy/APM logs must not store invitation query strings.

The email address is bound and normalized, but not verified against an actual mailbox. The invitee does not have to prove ownership of that address: the redemption endpoint retrieves the email from the invitation and assigns a password to whoever presents the token. Share the link directly with the intended recipient. Real mailbox verification in the future will require an email provider, mailbox confirmation, abuse limits, and a transaction that consumes a single server-issued verification proof.

## Data and permissions

Invitation records, user accounts, password hashes, and sessions are stored in the owner's database at `JOURNAL_DATA_DIR/journal.db`. Each invited member receives an independent private database at `JOURNAL_DATA_DIR/users/<user-id>/journal.db`; they do not share trades, notes, accounts, or settings with other members or the owner. This is not an organization with shared folders, configurable roles, or SaaS multi-tenant isolation.

The owner can list, create, and revoke invitations, and suspend/reactivate members from **User access**. `/api/admin/users` also supports revoking sessions without suspending the account. Reactivating does not restore revoked sessions. Suspending preserves the member's data.

The invitation link is separate from the public `/demo` profile. The demo is read-only, uses synthetic data, and runs on its own database at `JOURNAL_DATA_DIR/public-demo/journal.db`; it never contains owner or member data.

## Limits and controls

- The form creates links with a seven-day TTL; the service supports 1 to 168 hours. Duplicate invitations cannot be issued while one remains pending for the same email address, and an invitation can be revoked without deleting its history.
- Issuance is capped at 10 per hour, 50 per day, and 50 pending invitations. Visible history shows at most the most recent 100 entries.
- Redemption counts up to 100 global attempts per five-minute window in a single SQLite row. This is not distributed rate limiting and does not replace per-IP abuse controls.
- User creation and token consumption occur within the same immediate SQLite transaction. Each token can be redeemed only once.
- Member passwords require at least 12 characters and are derived using `scrypt` with a random salt. Session tokens are stored hashed, expire after 24 hours, and allow up to five active sessions per user.
- There is no automated invitation email delivery, email verification, password reset, MFA, automated suspension, usage quotas, or organization management platform.
- The Full backup JSON corresponds only to the active session's journal, not other users or the demo. For full encrypted snapshots, stop the application and run `pnpm backup -- --confirm-app-stopped <archive.tbjbackup>`; restore to a new directory with `pnpm restore -- <archive.tbjbackup> <new-directory>`. The archive contains `.secret` if present. Store `JOURNAL_SECRET` and access secrets in a separate secrets manager. There is still no automated backup schedule or configured off-host destination.

## Current routes

- `GET/POST/DELETE /api/invitations`: list, create, and revoke invitations; require an owner session with multi-user mode enabled.
- `GET /api/invitations/validate?token=...`: validates an active link and returns the associated email address.
- `POST /api/invitations/redeem`: accepts the token and new password, creates the user, and issues a session.
- `GET/PATCH /api/admin/users`: lists members and supports `suspend`, `reactivate`, and `revoke-sessions`; restricted to the owner.

Registration is invite-only, not an open sign-up form. These controls limit casual access, but an insecurely shared token allows someone else to redeem that invitation.
