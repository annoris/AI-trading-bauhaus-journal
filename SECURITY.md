# Security policy

## Reporting a vulnerability

Please report security concerns privately to the website administrators.

You can expect an acknowledgment within a few business days. Please include reproduction steps and relevant details.

## Scope notes

Trading Bauhaus is invite-only software: it stores broker credentials (encrypted at rest) and trading history in its configured data directory. Reports about credential handling, the encryption layer (`apps/web/src/server/crypto.ts`), authentication, and statement importers (untrusted file parsing) are especially valuable.

## Supported versions

Security fixes target the latest release on `main`.
