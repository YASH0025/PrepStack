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

## Peer mock interviews

`/practice/mock`: users join with a display name, role and level (nothing else is shared),
then book open slots, post their own, or ask to be matched automatically. A session is 60
minutes with turns; partners meet on their own Google Meet or Zoom link. Each interviewer gets
questions from the topics their partner chose, with model answers; interviewees never see
their questions in advance. Private feedback turns missed questions into review cards and
roadmap weaknesses. No-shows pause booking for a week only when reported by two different
partners (or after late cancellations); reports and pauses are handled in
`/admin/moderation` → Mock interviews. Matching and the 1-hour reminder email run with
`npm run cron`.

## Coding practice

`/practice/coding`: 73 problems across 16 topics (arrays to dynamic programming), solved in
JavaScript or Python with the Monaco editor. Code runs **in the user's browser** inside a Web
Worker (Python via Pyodide), so there is no server to sandbox; a runaway loop is stopped by
terminating the worker. Run checks the examples; Submit also runs the hidden tests and saves
the verdict and code to the user's private `coding.json` (self-reported, so it is never used
for anything public or ranked). The list shows a daily set (3 easy, 2 medium, 1 hard,
unfinished ones first), per-topic progress and "needs work" topics; roadmap items for the DSA
topics link straight to it.

- Problems are written in our own words in `scripts/coding/problems/*.mjs` (format in the
  README there), each with a JavaScript and an independent Python reference solution.
  `npm run coding:generate -- --check` computes expected outputs from the JS solution, checks
  the Python one agrees in real Pyodide, and writes `src/modules/coding/content/problems.json`
  (bundled with the app; CI fails if it is stale). Each problem links to LeetCode's version.
- Pyodide, Monaco and the runner workers are served from `public/vendor`, prepared by
  `scripts/copy-vendor.mjs` before dev and build (the workers are built from
  `src/modules/coding/runner/*.ts` by stripping types; rerun it after editing them).

## System design practice

`/practice/system-design` lists ScaleLab's interview problems and opens each one in ScaleLab
(`SCALELAB_URL`, default https://scale-lab-pi.vercel.app) on `/play?interview=<id>`. Users mark
problems done to track them; the system design roadmap topic links here.

## Readiness passport

`/profile/passport`: a private, revocable share link showing preparation progress (topics at
target depth, plan progress, review streak, diagnostic, and the opt-in peer score after 3
sessions with 3 different partners). The public page shows a stored snapshot only, refreshed
daily by `npm run cron` or on demand; it never shows salaries, companies, interview history or
notes, and is sent with `X-Robots-Tag: noindex`.

## Public pages

`/topics`, `/topics/[slug]`, `/reports` and `/reports/[id]` are server-rendered and indexable,
with `sitemap.xml` and `robots.txt`. Set `APP_URL` to the public URL in production.

## Your data

Profile → "Download my data" exports everything stored about the signed-in user as JSON
(decrypted). "Delete my account" removes the account and the whole private folder; the user
chooses whether their shared reports stay (they are already anonymous) or are deleted too.

## PostgreSQL and Better Auth

Set `STORAGE_DRIVER=postgres` and `DATABASE_URL` (a local Postgres or Neon). On start the app
applies the SQL migrations in `drizzle/` and then works exactly as in JSON mode; every module
stores the same envelopes as rows, with per-key transactional locks (safe for several app
instances). Sign-in switches to Better Auth: database sessions, password reset, and
"Continue with Google/GitHub" when `GOOGLE_*` / `GITHUB_*` credentials are set.

Moving existing JSON data (take a backup first; keep the same `ENCRYPTION_KEY`):

```bash
DATA_DIR=./data DATABASE_URL=postgres://… node scripts/import-json-to-postgres.mjs
```

It copies every data file and creates Better Auth accounts with the existing bcrypt
passwords, so everyone signs in as before. It is safe to run twice.

Testing on Postgres: `TEST_DATABASE_URL=postgres://… npm test` (a schema per test file) and
`E2E_DATABASE_URL=postgres://…/prepstack_e2e npm run test:e2e` (the database is wiped first, so
its name must contain "test" or "e2e"). After changing `src/lib/db/schema.ts`, run
`npx drizzle-kit generate` and commit the new migration.

## Deploying with Docker

```bash
cp .env.example .env          # fill in the secrets; set APP_URL to your public URL
docker compose up -d --build  # app on :3000 plus a scheduler that runs jobs every 5 minutes
```

- All data (including private user data) lives in the `prepstack-data` volume. Back it up,
  together with `ENCRYPTION_KEY`: without that key encrypted fields cannot be read.
- `GET /api/health` reports whether the data folder is writable (used by the container healthcheck).
- JSON mode: run one app container only (file storage and rate limits are per process).
- Postgres mode: `docker compose -f docker-compose.yml -f docker-compose.postgres.yml up -d --build`
  (set `POSTGRES_PASSWORD` in `.env`).
- `npm run build` ends with `scripts/clean-standalone.mjs`, which strips any traced `data/` or
  `.env` files from `.next/standalone` and fails the build if private data is left.

## Deploying to Vercel + Neon (free)

Vercel has no persistent disk, so it runs in Postgres mode. Neither service needs a card.

1. **Neon** (https://neon.tech): create a project in **AWS Asia Pacific (Singapore)** (the
   app's functions run in Vercel's `sin1` region, see `vercel.json`). Copy the **pooled**
   connection string (host contains `-pooler`) and the direct one.
2. **Vercel** (https://vercel.com): "Add New → Project", import this GitHub repository and
   keep the defaults (it runs `npm run vercel-build`). Before the first deploy, add these
   Environment Variables:

   | Variable                                          | Value                                                                |
   | ------------------------------------------------- | -------------------------------------------------------------------- |
   | `STORAGE_DRIVER`                                  | `postgres`                                                           |
   | `DATABASE_URL`                                    | Neon pooled connection string                                        |
   | `DATABASE_URL_UNPOOLED`                           | Neon direct connection string (used for migrations during the build) |
   | `APP_URL`                                         | `https://<your-project>.vercel.app` (fix it after the first deploy)  |
   | `SESSION_SECRET`, `ENCRYPTION_KEY`, `CRON_SECRET` | `openssl rand -base64 32` each; back up `ENCRYPTION_KEY`             |
   | `ADMIN_EMAILS`                                    | your email, before you sign up                                       |
   | `RESEND_API_KEY`, `EMAIL_FROM`                    | optional (see below)                                                 |
   | `CLOUDINARY_*`                                    | optional, enables attachments and avatars                            |
   | `GOOGLE_CLIENT_*`, `GITHUB_CLIENT_*`              | optional, enables social sign-in                                     |

3. Deploy. Production builds apply the database migrations before `next build`; preview
   deployments skip them so a pull request never changes the production schema.
4. **Scheduled jobs**: Vercel's free plan only allows daily cron jobs, so
   `.github/workflows/cron.yml` calls `/api/cron/run` every 30 minutes instead. In GitHub →
   Settings → Secrets and variables → Actions, add the variable `APP_URL` and the secret
   `CRON_SECRET` (same value as on Vercel). Test it with "Run workflow" in the Actions tab.
   Every 30 minutes keeps Neon inside its free compute hours; GitHub can start runs a few
   minutes late and pauses schedules after 60 days without commits.

Notes:

- The app never sleeps on Vercel. Neon pauses the database after 5 idle minutes and wakes
  on the next request (under a second).
- Rate limits are stored in the `rate_limits` table (hashed keys), so they hold across
  serverless instances, including direct calls to `/api/auth/*`.
- Uploads are limited to 4 MB (Vercel rejects larger request bodies) and need Cloudinary.
- Resend's `onboarding@resend.dev` sender only delivers to your own Resend account email;
  verify a domain in Resend to email other users.
- With `VERCEL` set the app refuses to start unless `STORAGE_DRIVER=postgres`.
- `npm run db:migrate` applies migrations by hand (reads `.env.local`).

## Continuous integration

`.github/workflows/ci.yml` runs on every push to `main` and on pull requests: `npm run check`,
the Playwright end-to-end suite, and a Docker image build. `.github/workflows/cron.yml` runs
the scheduled jobs against the deployed app (see Deploying to Vercel).

## Data

In JSON mode all data is stored as JSON files under `DATA_DIR` (default `./data`). That
folder holds private user data and is git-ignored. JSON mode needs a persistent disk and a
single Node process; use Postgres mode on serverless hosts such as Vercel.
