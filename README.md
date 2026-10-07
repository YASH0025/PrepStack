# PrepStack

Track every interview, prep specifically for it, and learn from real developer experiences, all in one place.

The full product specification lives in [docs/PROJECT_BRIEF.md](docs/PROJECT_BRIEF.md).

## Requirements

- Node.js 22 LTS
- npm 10+

## Getting started

```bash
npm install
cp .env.example .env.local   # then fill in the three secrets (openssl rand -base64 32)
npm run dev
```

Open http://localhost:3000. Seed content (the Full-Stack JavaScript track) is copied into the
data folder on first start. Emails print to the server console until `RESEND_API_KEY` is set.
Put your email in `ADMIN_EMAILS` before signing up to get access to the admin CMS.

## Scripts

| Script                  | What it does                                                     |
| ----------------------- | ---------------------------------------------------------------- |
| `npm run dev`           | Start the dev server                                             |
| `npm run build`         | Production build (standalone output)                             |
| `npm run start`         | Run the production build                                         |
| `npm run check`         | Typecheck, lint, format check and unit tests                     |
| `npm run lint`          | ESLint                                                           |
| `npm run typecheck`     | Generate route types, then TypeScript check                      |
| `npm run format`        | Prettier, write                                                  |
| `npm run format:check`  | Prettier, check only                                             |
| `npm test`              | Unit tests (Vitest)                                              |
| `npm run test:e2e`      | End-to-end tests (Playwright, starts its own dev server)         |
| `npm run seed:generate` | Rebuild the bundled seed content from `scripts/seed/`            |
| `npm run cron`          | Run scheduled jobs once (reminders, debrief prompts, follow-ups) |

## Scheduled jobs

Interview reminders (email + in-app), debrief prompts, follow-up reminders and overlap
warnings are processed by `POST /api/cron/run`, protected by `CRON_SECRET`.

```bash
npm run cron                 # run once
npm run cron -- --watch      # keep running every 5 minutes
npm run cron -- --watch=2    # every 2 minutes
```

For a server, schedule `npm run cron` with your OS scheduler, for example every 5 minutes with cron:
`*/5 * * * * cd /path/to/prepstack && npm run cron`. Jobs are idempotent, so overlapping runs are safe.
In-app prompts and follow-ups are also computed when you load a page, so the app works even if
the cron has not run; only emails depend on it.

## End-to-end tests

`npm run test:e2e` starts `next dev` on port 3200 with a throwaway `.e2e-data` folder and
test-only secrets, then runs the specs in `e2e/`: public pages and access control, and the core
journey (sign up → track a round → debrief → share an anonymized report → moderator approval →
public page without personal details → data export → account deletion).

Install a browser once with `npx playwright install chromium`, or point `PW_CHROMIUM_PATH`
(and optionally `PW_CHROMIUM_ARGS`, a JSON array) at an existing Chromium.

## Community and moderation

- "Share anonymized version" (from a debrief) builds a report from allowlisted fields only,
  removes people, contacts, salaries, links and exact dates, shows the exact public preview and
  publishes only after confirmation. The public record has no link back to the author.
- New reports wait in `/admin/moderation` (approve, hide, edit for anonymity, handle flags).
  Every moderation action is written to the audit log.
- Topic frequency is shown only when a company/role has at least `COMMUNITY_MIN_SAMPLE`
  reports (default 5); below that the app says "Not enough data yet".

## Public pages

`/topics`, `/topics/[slug]`, `/reports` and `/reports/[id]` are server-rendered and indexable,
with `sitemap.xml` and `robots.txt`. Set `APP_URL` to the public URL in production.

## Your data

Profile → "Download my data" exports everything stored about the signed-in user as JSON
(decrypted). "Delete my account" removes the account and the whole private folder; the user
chooses whether their shared reports stay (they are already anonymous) or are deleted too.

## Deploying with Docker

```bash
cp .env.example .env          # fill in the secrets; set APP_URL to your public URL
docker compose up -d --build  # app on :3000 plus a scheduler that runs jobs every 5 minutes
```

- All data (including private user data) lives in the `prepstack-data` volume. Back it up,
  together with `ENCRYPTION_KEY`: without that key encrypted fields cannot be read.
- `GET /api/health` reports whether the data folder is writable (used by the container healthcheck).
- Run one app container only: JSON storage and rate limits are per process.
- `npm run build` ends with `scripts/clean-standalone.mjs`, which strips any traced `data/` or
  `.env` files from `.next/standalone` and fails the build if private data is left.

## Continuous integration

`.github/workflows/ci.yml` runs on every push to `main` and on pull requests: `npm run check`,
the Playwright end-to-end suite, and a Docker image build.

## Data

In the current phase all data is stored as JSON files under `DATA_DIR` (default `./data`).
That folder holds private user data and is git-ignored. Do not deploy to serverless hosts
with a non-persistent filesystem, and run a single Node process.
