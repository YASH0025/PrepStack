# PrepStack

Track every interview, prep specifically for it, and learn from real developer experiences, all in one place.

The full product specification lives in [docs/PROJECT_BRIEF.md](docs/PROJECT_BRIEF.md).

## Requirements

- Node.js 22 LTS
- npm 10+

## Getting started

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open http://localhost:3000.

## Scripts

| Script | What it does |
| --- | --- |
| `npm run dev` | Start the dev server |
| `npm run build` | Production build (standalone output) |
| `npm run start` | Run the production build |
| `npm run lint` | ESLint |
| `npm run typecheck` | TypeScript, no emit |
| `npm run format` | Prettier, write |
| `npm run format:check` | Prettier, check only |

## Data

In the current phase all data is stored as JSON files under `DATA_DIR` (default `./data`).
That folder holds private user data and is git-ignored. Do not deploy to serverless hosts
with a non-persistent filesystem, and run a single Node process.
