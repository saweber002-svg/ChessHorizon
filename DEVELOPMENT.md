# Chess Horizon Development Guide

Chess Horizon is a React 19 single-page application with an Express 4/tRPC 11 backend, Vite 8, TypeScript, Tailwind CSS, Wouter, Three.js, React Three Fiber, Chess.js, Drizzle ORM, and MySQL. Authentication uses Manus OAuth; completed drills and watch-mode consumption are submitted to the server-authoritative progression API. The supported iteration loop is **alter → run → test → repeat**.

## Install and run

Use the lockfile for reproducible installs:

```bash
npm ci
npm run dev
```

The development server runs at `http://localhost:3000` when the port is available. The Express server automatically selects the next available port if needed and serves Vite middleware plus `/api/trpc`. For a production-equivalent local preview:

```bash
npm run build
npm run preview
```

The preview server runs at `http://localhost:4173` by default. Vercel/static-host rewrites are defined in `vercel.json`, and the Vite build uses root-relative assets so direct navigation and refreshes work on nested routes.

## Verification commands

```bash
npm run typecheck
npm run lint
npm run test:unit
npm run validate:drills
npm test
npm run build
```

`npm run test:unit` currently covers drill-loader normalization, tactical-pack handling, chess helper functions, registry lookup, progression, streaks, and kingdom unlock behavior. `npm run validate:drills` parses every JSON pack, checks registry/file consistency, validates FENs, and replays every line or tactical solution with Chess.js. The combined `npm test` command intentionally fails when content validation finds an illegal or corrupt drill; this is a release-blocking content signal, not a test-runner failure.

## Environment

The backend reads the following platform-provided variables when database/auth features are enabled:

```text
DATABASE_URL=mysql://user:password@host/database
JWT_SECRET=replace-with-a-secret
VITE_APP_ID=your-manus-app-id
OAUTH_SERVER_URL=https://api.manus.im
VITE_OAUTH_PORTAL_URL=https://oauth.manus.im
```

The client can still render without a database, but authenticated persistence and the server-authoritative prestige/watch rules require `DATABASE_URL` and Manus OAuth variables. Never commit `.env`, `.env.local`, or credentials. After changing `drizzle/schema.ts`, run `npm run db:push` against the configured database.

## Repository structure

| Path | Purpose |
|---|---|
| `src/main.tsx` | Browser entry point and React bootstrap. |
| `src/App.tsx` | Route table and top-level providers. |
| `src/pages/` | Route-level screens: Atlas, drills, sessions, watch mode, trophy board, wilderness, clearing, and coaching. |
| `src/components/` | Reusable UI, chess boards, trophy components, and Atlas components. |
| `src/components/world-map/` | Three.js/React Three Fiber Atlas scene, GLB loading, markers, and kingdom panel. |
| `src/contexts/` | Auth, progress, and wilderness state plus local persistence. |
| `src/data/` | Opening definitions, kingdom metadata, marker coordinates, and the drill registry. |
| `src/lib/` | Drill loading/normalization, tRPC client, and coaching helpers. |
| `server/` | Express/tRPC procedures, OAuth, database helpers, and authoritative progression persistence. |
| `drizzle/` | MySQL schema, generated migrations, and relations. |
| `shared/progressRules.ts` | Pure prestige and watch-quota rules shared by server tests and UI adapters. |
| `public/drill-data/` | Main-line and tactical JSON packs served as static assets. |
| `public/models/world-atlas.glb` | The approximately 64.7 MB Atlas model. |
| `scripts/validate-drills.mjs` | Deterministic all-pack content validator. |
| `tests/` | Vitest unit tests. |

## Data and feature boundaries

Every drill JSON filename must correspond to an ID in `src/data/drillRegistry.ts`. Main-line packs use `lines[]`; tactical packs use `drills[]` with a FEN and solution moves. The loader normalizes both formats into `DrillPack`/`DrillLine` objects. Do not add or alter a pack without running the validator.

The Coaching Pavilion currently presents simulated analysis; it is not connected to the standalone Python Stockfish trainer. The Clearing is a local two-player prototype, not network multiplayer. The Manus OAuth and MySQL integration must still be validated with real platform credentials and a migrated database before production launch.

## Recommended workflow

Make one narrow change, run `npm run typecheck` and `npm run lint`, run the affected unit tests, then use `npm run build` and the browser preview for route-level checks. For opening or tactical-data changes, run `npm run validate:drills` before committing. Review `git diff` and `git status` before creating a commit. Keep generated `dist/`, `node_modules/`, caches, and local environment files out of version control.

## Known release risks

The current WorldMap JavaScript chunk is approximately 1.04 MB and the GLB is approximately 64.7 MB; mobile memory and first-load performance require real-device validation. The full content validator currently reports illegal tactical sequences and a small number of malformed tactical FENs; those packs must be corrected or removed from the release set before declaring the repository publish-ready.
