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

## Data

In the current phase all data is stored as JSON files under `DATA_DIR` (default `./data`).
That folder holds private user data and is git-ignored. Do not deploy to serverless hosts
with a non-persistent filesystem, and run a single Node process.
