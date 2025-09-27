# Repository Guidelines

## Project Structure & Module Organization
- Root hosts automation utilities and scripts; public web app lives in `web/` (Next.js).
- Key paths: `web/app` (routes), `web/components` (UI), `web/lib` (helpers), `web/data` (YAML content).
- Sync/utility scripts in `scripts/` (e.g., `sync-catequesis.mjs`) hydrate `web/data/content`.
- Long-form docs in `docs/`; security notes like `ci-security-workflow.yml` at root.
- External integrations in `external/`; large assets and logs in `data/logs`.

## Build, Test, and Development Commands
- Install deps: `npm install` (root) and `cd web && npm install`.
- Sync content: from root run `npm run sync:catequesis` after pulling.
- Local dev: `cd web && npm run dev` (Next.js server).
- Build: `cd web && npm run build`; serve: `npm run start` for smoke tests.
- Lint: `cd web && npm run lint`.

## Coding Style & Naming Conventions
- TypeScript + ES modules; 2-space indentation.
- Components and server actions: PascalCase (e.g., `components/AdminPanel.tsx`).
- Hooks/utilities: camelCase (e.g., `lib/useAuth.ts`).
- Use Tailwind classes or `styles/`; avoid ad‑hoc inline overrides.
- Follow configured ESLint rules before pushing.

## Testing Guidelines
- Jest unit/integration in `web/__tests__`; prefer `*.test.ts`/`*.test.tsx` names.
- E2E with Playwright in `web/tests/e2e` (run against `npm run start`).
- Commands: `cd web && npm run test`, `npm run test:watch`, `npm run test:e2e`.
- For critical logic (auth, rate limiting, catequesis exports), extend nearest describe block; store fixtures under `__tests__/integration`. Keep failing artifacts under `test-results/`.

## Commit & Pull Request Guidelines
- Commits: imperative mood with scope, e.g., `feat: Anadir exportaciones catequesis`. Reference issues in footer (e.g., `Refs #123`). Avoid unrelated bundles.
- PRs: describe problem and solution, include manual test evidence (commands, screenshots), and confirm `sync:catequesis`, `lint`, `build`, and all tests pass.

## Security & Configuration Tips
- Never commit secrets. Copy `.env.example` to `.env` locally; use CI secrets.
- After dependency changes, run `scripts/verify-setup.ps1` (or `.sh`).
- Review `ci-security-workflow.yml` when modifying auth/storage to keep hardening intact.

## Agent Notes
- Scope: applies repo-wide; deeper `AGENTS.md` files override locally.
- Keep changes minimal and aligned with the existing style.
- Prefer surgical edits and do not introduce unrelated fixes.
