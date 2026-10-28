# AGENTS.md

Instructions for code agents working in this repository.

## Overview

Web-based vacation scheduling system for public servants. The application uses Nuxt 4 with SSR, Vue 3, Tailwind CSS 4, PostgreSQL 18, Drizzle ORM, and Vitest/Playwright.

## Working guidelines

- Always consult and follow the `/karpathy-guidelines` skill before planning, implementing, or reviewing changes.

## Requirements

- Node.js 24.19.0 (`.nvmrc`)
- pnpm 11.22.0
- Docker and Docker Compose
- PostgreSQL 18 for local development or project containers

## Commands

```bash
nvm use
corepack enable
pnpm install --frozen-lockfile
cp .env.example .env

pnpm dev
pnpm build
pnpm start

pnpm lint
pnpm lint:fix
pnpm typecheck
pnpm test:unit
pnpm test:nuxt
pnpm test:coverage
pnpm test:integration
pnpm test:e2e

pnpm db:generate
pnpm db:migrate
pnpm db:seed
```

- `pnpm lint` uses ESLint with `--max-warnings 0`. Do not use Prettier, Biome, or dprint.
- Run `pnpm lint` and `pnpm typecheck` before finishing any change.
- For behavior changes, run the relevant suite: unit/nuxt, integration, and E2E.
- `pnpm test:integration` requires the test database at `localhost:5433`:

```bash
docker compose -f docker-compose.test.yml up -d
pnpm test:integration
docker compose -f docker-compose.test.yml down -v
```

- E2E starts and tears down the isolated stack. If the default ports are in use:

```bash
APP_PORT=3100 POSTGRES_PORT=5434 \
NUXT_PUBLIC_APP_URL=http://localhost:3100 \
E2E_BASE_URL=http://localhost:3100 \
pnpm test:e2e
```

## Structure

```text
app/       Nuxt pages, layouts, components, composables, and middleware
server/    Nitro API, authentication, sessions, and database access
shared/    Zod schemas, pure vacation rules, types, and utilities
drizzle/   schema and SQL migrations
tests/     unit, component, integration, and E2E tests
scripts/   migrations, seed, entrypoint, and automation
docs/      operational documentation
```

## Business rules

- Each employee has 30 vacation days per cycle.
- At most 3 periods are allowed.
- Each period must be at least 1 day long.
- There must be at least 15 free days between periods.
- Periods cannot overlap or fall outside the configured cycle.
- The current cycle is defined in `settings`; do not hardcode cycle dates.
- The internal `confirmed` status represents a submitted request, not approved vacation. In the UI, the corresponding badge is `Solicitado`.
- Review/approval happens outside the system.
- Pure rules live in `shared/rules/vacation.ts` and must be reused on the client and server.
- The server always revalidates business rules, even if the UI already validates them.

## Code conventions

- TypeScript throughout the project; avoid `any` without justification.
- Vue components use `<script setup lang="ts">`.
- Follow the style and structure of neighboring files before creating new patterns.
- Do not add comments to code unless they are truly necessary to explain a non-obvious decision.
- UI text is in Brazilian Portuguese.
- Dates shown to users use `DD/MM/AAAA`; in the database and API use ISO `YYYY-MM-DD`.
- Input validation uses Zod in `shared/schemas`.
- API errors must follow the existing structured format and be normalized on the client.
- Use Tailwind and the existing components; do not introduce UI libraries unnecessarily.
- `VueDatePicker` uses `formats`/`textInput` for `dd/MM/yyyy`, `partialRange: false`, and `ariaLabels` to keep the label accessible.

## Testing

- TDD when possible: reproduce the bug with a test before fixing it.
- Tests must be deterministic: control the clock/time zone and avoid order dependence.
- The unit suite runs with `TZ=UTC` and `TZ=America/Sao_Paulo` in CI.
- Minimum global coverage: 80%. In `shared/rules`: 100% lines and branches.
- Critical pages and flows are covered by E2E.
- Do not remove tests to make the suite pass; adjust the behavior or the test with justification.

## Database and migrations

- The Drizzle schema lives in `server/database/schema.ts`.
- Generate migrations with `pnpm db:generate` and apply them with `pnpm db:migrate`.
- Never edit a migration already applied in production; create a new one.
- The seed is idempotent and creates the admin from `ADMIN_EMAIL`/`ADMIN_PASSWORD`.
- `SEED_DEMO_DATA=true` creates Maria, João, and Ana for demonstration.
- Employee login is email-only; do not reintroduce an employee password.

## Security

- Never commit `.env`, secrets, tokens, or real credentials.
- Sessions use sealed `httpOnly` cookies, separate for employee and admin.
- Write routes require `Origin`/`Sec-Fetch-Site` validation.
- Keep rate limiting on login and generic messages to reduce enumeration.
- Admin passwords use Argon2id.
- Validate and authorize again on the server; never trust only the client.

## Git and PR

- `main` is protected. Work on short-lived branches:
  - `feature/short-name`
  - `fix/short-name`
  - `chore/short-name`
  - `docs/short-name`
- Use Conventional Commits: `feat`, `fix`, `test`, `refactor`, `chore`, `docs`, `ci`.
- Open a PR to `main`; merging is by squash.
- The required status for `main` is `ci-success`.
- Do not force push or delete `main`.
- Keep the PR small, with evidence of the tests run.

## Checklist before finishing

1. `pnpm lint`
2. `pnpm typecheck`
3. `pnpm test:unit`
4. `pnpm test:nuxt`
5. `pnpm test:integration` when there is a server/database change
6. `pnpm test:e2e` when there is a flow/interface change
7. Review `git status` and ensure no secret or artifact was included
