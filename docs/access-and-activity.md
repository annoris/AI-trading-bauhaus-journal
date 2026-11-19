# Private Access and Activity

Code status: November 3, 2026. The current edition supports a single owner and invited members; it is not a multi-tenant SaaS with organizations, nor has it undergone an external security review.

## Current access

The owner signs in with `JOURNAL_PASSWORD`. Multi-user authentication is enabled by default in production and can be enabled in local development with `JOURNAL_MULTI_USER=true`. Hosted/production mode requires a password. In a local installation without a password configured, invitations are unavailable.

The owner can invite members from **Invitations** in the private sidebar. Each link is single-use and expires after seven days. No email is sent: the owner copies the link and shares it manually. The link acts as a bearer credential; the email address is associated with the invitation and displayed on the acceptance form, but the recipient does not prove mailbox ownership. Anyone who obtains the link can set the password for that invitation. Send it over a private channel and never publish it.

Each invited member creates a password of at least 12 characters, stored as an `scrypt`-derived key with a random salt. Session tokens are stored hashed, expire after 24 hours, and allow up to five active sessions per user. The owner retains a session signed with `JOURNAL_PASSWORD` that expires after 30 days. There is no password reset, two-factor authentication, or automated account recovery.

From **User access**, the owner can create and revoke invitations and enable or disable accounts. Suspending an account blocks new logins, revokes active sessions, and preserves the member's journal. Reactivating an account allows signing in again, without restoring previously revoked sessions. The protected `/api/admin/users` API also supports revoking sessions without suspending the account.

## Data isolation

The owner's database resides at `JOURNAL_DATA_DIR/journal.db`. Each member uses `JOURNAL_DATA_DIR/users/<user-id>/journal.db`; their journal, trades, accounts, notes, settings, and attachments live in that separate file. Identities, derived passwords, session hashes, invitations, and access-audit records remain in the owner's database. There are no shared spaces between members or customizable roles: the effective roles are owner and member.

The read-only public demo profile uses `JOURNAL_DATA_DIR/public-demo/journal.db` with seeded synthetic data. Demo mode blocks write HTTP requests; its queries run against a separate database and never touch the owner or member databases. User and demo directories receive restrictive POSIX permissions; all three database types reside within the same operational data directory/volume.

This provides per-member SQLite file separation within a single installation. It does not implement SaaS organizations/tenants, shared folders, storage quotas, or infrastructure-level resource isolation. For a hosted deployment, configure the owner password, encryption key, HTTPS origin, and trusted proxy.

## Backups

**Settings → Data & backups → Full backup (JSON)** continues to export only the journal belonging to the active session. For a full operational snapshot, CLI commands compress and encrypt all SQLite databases and files in `JOURNAL_DATA_DIR`, including the owner, every member, the demo, BLOB attachments, and `.secret` if present. SQLite databases are copied using SQLite's online backup API, and every restored database runs `PRAGMA quick_check`. Restore writes only to a new target path and verifies the databases before completing.

Stop the application before running a backup so the owner, member, and demo databases reflect a consistent window. Use a unique `JOURNAL_BACKUP_PASSPHRASE` of at least 20 characters stored in a secrets manager, and store the resulting `.tbjbackup` file off-host in a restricted-access destination. Temporary plaintext snapshots are created inside the same local `JOURNAL_DATA_DIR` with POSIX `700`/`600` permissions and deleted upon completion; use an encrypted volume because unlinking files does not guarantee secure physical erasure or remove filesystem snapshots. The archive includes `.secret` if one was generated. If `JOURNAL_SECRET` is used, that value must also be retrieved from the secrets manager. The owner password, proxy token, and public origin remain external configuration.

```sh
JOURNAL_BACKUP_PASSPHRASE="$BACKUP_PASSPHRASE" pnpm backup -- --confirm-app-stopped /secure-backups/bauhaus-YYYYMMDD.tbjbackup
JOURNAL_BACKUP_PASSPHRASE="$BACKUP_PASSPHRASE" pnpm restore -- /secure-backups/bauhaus-YYYYMMDD.tbjbackup /var/lib/bauhaus/data-restored
```

The restore target must be a new path outside the active `JOURNAL_DATA_DIR`. Before cutting over to it, configure the original external secrets and schedule the switch with the application stopped. These commands are run manually; no automated schedule, rotation policy, or off-host destination is configured yet. Backing up the Compose volume remains an operations responsibility.

## Activity and IP addresses

IP capture is enabled by configuring `JOURNAL_PROXY_TOKEN`. The backend requires the proxy token and then reads `X-Journal-Client-IP`; it does not trust `X-Forwarded-For` sent directly by the client. The Caddy template overwrites both headers and derives the address from `remote_host`. If a CDN or another proxy sits in front of Caddy, `remote_host` may identify only that upstream proxy: establish a trusted-proxy policy before enabling capture. In hosted mode, Node requests require the configured proxy; in local mode, a request without a trusted IP simply skips logging an event.

IP addresses are stored encrypted with AES-GCM, alongside an HMAC for correlation. Events record event type, HTTP status, actor, and timestamp; they never store passwords, tokens, request bodies, query strings, user-agent strings, or full URLs. Invitation and activity entries use the owner's database, not each member's private DB. Requests rejected before reaching the Node handler may bypass this log and require ingress logging under an equivalent retention policy.

Logging is rate-limited to 20 events per IP per minute and capped at 50,000 rows. The activity view flags ten or more failures from a single source within ten minutes; this is a review signal, not an automatic lockout. Logical retention is seven days. When `JOURNAL_PROXY_TOKEN` is configured, the process purges expired rows on startup and hourly; reads and writes also purge expired rows. No timer runs while the server is stopped, and SQLite WAL files, free pages, filesystem snapshots, and backups may retain earlier ciphertext. Instantaneous physical erasure must not be promised.

This mechanism is local to the Node process and SQLite: it is neither a distributed rate limiter nor a high-availability logging service. No cloud backups are configured. The Docker and Caddy templates must be validated in staging; their presence in the repository does not equate to a live deployment or a security certification.

## Support reports

Members can submit a report from **Support**. Each report stores the account, category, subject, user-written description, page route, and timestamps; it does not automatically attach trades, notes, screenshots, passwords, or payment information. Reports are saved in the owner's database; each member can view only their own reports. The owner can reply and update report status in **Support & errors**. The reply appears on the member's **Support** page when reopened; no email is sent.

This inbox receives user-submitted issue reports. When submitting a report, the member may include an error reference displayed in the UI; certain API failures populate this field automatically. The reference is retained in the browser tab for ten minutes, and the server only accepts a reference generated for the same account. Technical error events record only a reduced API route, HTTP method, account type, a hash of the internal account ID, and a timestamp; they never store error messages, stack traces, query strings, request bodies, or journal data. Purging runs when the list is queried or another error is recorded, capped at 20,000 rows; retention is up to 30 days rather than a guarantee of deletion at an exact hour. The panel displays unexpected API failures for signed-in owner and member requests; the counter summarizes seven days and the list displays up to 30 entries. It does not capture anonymous requests, the demo profile, 4xx responses, browser rendering errors, or exceptions that Next.js does not pass to the API wrapper. There is no external alerting or high-availability storage. The security-activity log described above remains limited to security events and requires a trusted proxy to capture IP addresses.
