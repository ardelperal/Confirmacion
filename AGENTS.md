# Repository Guidelines

## Project Structure & Module Organization
The repository is split between automation utilities at the root and the public web app under `web/`. Use `web/app`, `web/components`, `web/lib`, and `web/data` for Next.js routes, shared UI, helpers, and serialized YAML content. Root `scripts/` hosts PowerShell/Node helpers (for example `sync-catequesis.mjs`) that hydrate `data/content` and should be run before building; long-form docs live in `docs/` and security notes in files such as `ci-security-workflow.yml`. External integrations and large assets stay in `external/` and `data/logs`.

## Build, Test, and Development Commands
Run `npm install` in both the repository root (for sync scripts) and `web/`. Use `npm run sync:catequesis` from the root after pulling to refresh catequesis content. Inside `web/`, `npm run dev` launches the Next.js server, `npm run build` produces the production bundle, and `npm run start` serves the build for smoke tests.

## Coding Style & Naming Conventions
TypeScript is the default; keep files in `web/` using ES modules with 2-space indentation. React components and server actions use PascalCase filenames (`components/AdminPanel.tsx`), while hooks or utilities are camelCase (`lib/useAuth.ts`). Follow the configured ESLint (`npm run lint`) and Tailwind setup; prefer co-locating component styles in `styles/` or Tailwind classes rather than inline overrides.

## Testing Guidelines
Jest-based unit and integration suites reside in `web/__tests__`, and Playwright E2E specs in `web/tests/e2e`. Run `npm run test` for the fast suite, `npm run test:watch` during feature work, and `npm run test:e2e` against a `npm run start` instance before merging. When adding critical logic (auth, rate limiting, catequesis exports), extend the nearest Jest describe block and capture fixtures under `__tests__/integration`; record failing scenarios in `test-results/` to aid CI triage.

## Commit & Pull Request Guidelines
Recent history mixes Spanish descriptive messages with conventional prefixes; keep the imperative mood and note the scope (`feat: Anadir exportaciones catequesis`). Reference issues in the footer when relevant (`Refs #123`) and avoid bundling unrelated changes. PRs should outline the problem, the solution, manual test evidence (commands plus screenshots when UI), and confirm that `sync:catequesis`, `lint`, `build`, and all test scripts pass before requesting review.

## Security & Configuration Tips
Never commit secrets; copy `.env.example` to `.env` locally and rely on repository secrets for CI. Trigger `scripts/verify-setup.ps1` (or `.sh` on macOS/Linux) after dependency changes to validate backup tooling. Review `ci-security-workflow.yml` when adjusting auth or storage modules to keep automated hardening steps intact.
