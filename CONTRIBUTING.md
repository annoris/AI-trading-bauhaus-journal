# Contributing to Trading Bauhaus

Thank you for your interest in improving **Trading Bauhaus**! We welcome bug reports, importer improvements, analytics fixes, documentation updates, and UI refinements.

## Development Setup

Requirements:

- **Node.js** `>= 22`
- **pnpm** `11.25.0` (matches `packageManager` in `package.json`)

```bash
git clone https://github.com/annoris/trading-bauhaus-journal.git
cd trading-bauhaus-journal
pnpm install --frozen-lockfile
pnpm dev
```

Opening `http://127.0.0.1:3000` lands directly inside the pre-seeded Trading Bauhaus dashboard with no login required.

To preview the static GitHub Pages showcase (`site/`):

```bash
pnpm pages:serve
```

## Verification Checklist

Before opening a pull request, please run the full verification suite and confirm every check passes:

```bash
pnpm license:check
pnpm pages:check
pnpm format:check
pnpm typecheck
pnpm test
pnpm build
```

## Pull Request Guidelines

- Keep pull requests focused and scoped to a single bug fix or feature.
- Add or update Vitest unit tests under `apps/web/tests/`, `packages/core/tests/`, or `packages/importers/tests/` when changing logic.
- Follow the existing Prettier formatting (`pnpm format`) and strict TypeScript types.
- Respect the project's security boundary rules (`pnpm security:check`): client components must never import from `server/` or `db/`, and API routes must use the shared `handler(...)` wrapper.
- Do not modify or remove licensing notices in `LICENSE` or `docs/commercial-license.md`.

## Reporting Security Issues

Please do **not** open public issues for security vulnerabilities. Follow the reporting instructions in [SECURITY.md](SECURITY.md).
