# Chess Horizon Technical Specification

**Document status:** Current implementation specification  
**Last audited:** 2026-09-23  
**Author:** Manus AI

## 1. Purpose and implementation status

Chess Horizon is a browser-based chess opening trainer organized as the **Atlas of Chess**. The application combines a three-dimensional world map, narrative kingdom progression, opening-line recall, tactical drills, move-level progress, trophy presentation, and optional account synchronization.

This document describes the implementation that exists in the repository today. It is not a proposal for unbuilt features. Items identified as incomplete or provisional are listed in the companion [Status Overview](./STATUS_OVERVIEW.md).

## 2. System boundary

Chess Horizon is currently a client-side single-page application. The browser owns route navigation, chess-board interaction, drill loading, progress calculations, local persistence, and most presentation logic. The production artifact is a static Vite bundle that can be hosted on Vercel, Netlify, Cloudflare Pages, or another static host.

The optional Supabase integration supplies authentication and cloud progress synchronization. When Supabase variables are absent, the application remains usable with local browser persistence. The Python Stockfish trainer is a separate local module. It is not currently exposed through an HTTP API or connected to the React coaching page.

## 3. Technology stack

| Area | Current implementation |
|---|---|
| UI framework | React 19 with TypeScript |
| Build tool | Vite 8 |
| Package manager | npm, with `package-lock.json` committed |
| Routing | Wouter |
| Chess rules and move validation | `chess.js` |
| 3D rendering | Three.js, React Three Fiber, and Drei |
| Animation | Framer Motion |
| Styling | Tailwind CSS, Tailwind Animate, and project CSS |
| Icons | Lucide React |
| Client persistence | Browser `localStorage` |
| Optional remote persistence | Supabase Auth and a `progress` table |
| Static deployment | Vercel configuration is present; any static host is technically suitable |
| Engine prototype | Python `python-chess`/Stockfish trainer under `python_trainer/` |
| Automated tests | Vitest unit tests plus the deterministic `validate:drills` content gate |

## 4. Repository structure

The repository is a single web package rather than a monorepo.

| Path | Responsibility |
|---|---|
| `src/main.tsx` | React bootstrap and root rendering |
| `src/App.tsx` | Providers, lazy page loading, and route table |
| `src/pages/` | Route-level screens and user journeys |
| `src/components/` | Reusable UI, board, trophy, and atlas components |
| `src/components/world-map/` | Three-dimensional atlas scene, map mesh, markers, and kingdom panel |
| `src/contexts/ProgressContext.tsx` | Move progress, stars, tiers, streaks, unlock state, and persistence orchestration |
| `src/contexts/AuthContext.tsx` | Optional Supabase authentication state |
| `src/contexts/WildernessContext.tsx` | Local custom-opening storage and wilderness state |
| `src/data/openings.json` | Opening, variation, kingdom, and narrative metadata |
| `src/data/drillRegistry.ts` | Production-visible main-line and validated tactical drill IDs |
| `src/data/quarantinedTacticalRegistry.ts` | Preserved tactical IDs excluded from production pending repair |
| `src/data/mapLocations.ts` | Kingdom metadata and atlas marker coordinates |
| `src/lib/drillLoader.ts` | Drill JSON fetching, normalization, caching, and chess-position helpers |
| `src/lib/supabaseClient.ts` and `src/lib/supabaseSync.ts` | Optional remote account and progress integration |
| `public/drill-data/` | Runtime drill JSON assets |
| `public/models/world-atlas.glb` | Three-dimensional atlas model, approximately 64.7 MB |
| `public/images/` | Runtime image assets |
| `scripts/validate-drills.mjs` | Active-pack JSON, FEN, registry, legal-sequence, and quarantine-boundary validator |
| `tests/` | Vitest loader and progression tests |
| `python_trainer/` | Standalone Stockfish analysis prototype |
| `dist/` | Regenerated production output; it is not source and should not be edited manually |

The current asset inventory contains 100 drill JSON files. Forty-six files are active in the production registry and 54 tactical files are preserved in an explicit quarantine manifest. The active registry-to-file boundary is part of content verification.

## 5. Application composition

`src/main.tsx` mounts `App`. `App` wraps the route tree with `AuthProvider`, `ProgressProvider`, and `WildernessProvider`. Pages are lazy-loaded to reduce the initial JavaScript payload. The route fallback returns the user to `/` for an unknown path.

The primary provider relationships are:

```text
React root
└── AuthProvider
    └── ProgressProvider
        └── WildernessProvider
            └── Wouter Switch
                ├── Home
                ├── WorldMap / Atlas
                ├── Drill
                ├── DrillSession
                ├── WatchMode
                ├── Drills
                ├── Board
                ├── TrophyBoard3D
                ├── Wilderness
                ├── Clearing
                └── Coaching
```

## 6. Route specification

| Route | Page | Intended function |
|---|---|---|
| `/` | `Home` | Entry screen and primary navigation |
| `/atlas` | `WorldMap` | Interactive three-dimensional kingdom map |
| `/drill/:openingId/:variationId/:moveIndex` | `Drill` | Legacy single-move opening practice |
| `/drill-session/:drillFileId` | `DrillSession` | JSON-backed main-line or tactical drill session |
| `/watch-mode/:drillFileId` | `WatchMode` | Guided playback of a registered drill |
| `/drills` | `Drills` | Drill browsing and selection |
| `/board/:openingId/:variationId` | `Board` | Opening variation board view |
| `/trophy/:openingId/:variationId` | `TrophyBoard3D` | Three-dimensional trophy and variation progress view |
| `/wilderness` | `Wilderness` | Custom opening creation and practice area |
| `/clearing` | `Clearing` | Local two-player/PvP-style chess area |
| `/coaching` | `Coaching` | Browser coaching interface with simulated analysis |

## 7. Training and drill data model

Opening metadata is stored in `src/data/openings.json`. Each opening belongs to a `KingdomId` and contains named variations with SAN move sequences. `src/data/drillRegistry.ts` maps user-facing variation concepts to active filenames under `public/drill-data/`. Invalid tactical files remain recoverable in the separate quarantine registry. `scripts/validate-drills.mjs` is the release content gate and reports illegal or malformed active packs rather than silently accepting them.

The loader supports two JSON shapes:

1. **Main-line packs** contain a `lines` array. Each line has a starting FEN and a sequence of moves.
2. **Tactical packs** contain a `drills` array. Each tactical position has a FEN and `solutionMoves`. The loader normalizes each tactical position into the same internal line representation used by the session player.

The loader caches fetched packs in memory. Session helpers derive the current FEN, determine the side to move, and select the correct player color. Tactical availability is determined from the active registry through `hasTacticalDrills`; quarantined IDs are rejected before their JSON is fetched and render an explicit unavailable state on direct routes.

The chess board uses `chess.js` for legal-move validation. The application therefore validates the move sequence at runtime rather than treating drill JSON as presentation-only text.

## 8. Progression and persistence

The progress model records total stars, per-move progress, attempts, last-drilled timestamps, streaks, prestige streak, unlocked regions, drill order, and side mode. Tiers range from Locked through Master and are calculated from consecutive completion thresholds.

`ProgressContext` is the authoritative client-side state manager. It persists progress to `localStorage`. If an authenticated Supabase user and configured Supabase client are available, progress is also synchronized through the `progress` table. Remote synchronization is optional and failures are logged without preventing local use.

Kingdom unlocks are represented by `KINGDOM_UNLOCK_ORDER`. The current intended progression begins with Italy and then advances through Spanish, French, Germany, Sicilian, English, Dutch, and Queendom. Coaching is explicitly accessible without the normal kingdom prerequisite. The source should be treated as the authority because older project documents describe different unlock sequences.

## 9. Atlas implementation

The atlas loads `public/models/world-atlas.glb` through React Three Fiber/Drei. Kingdom markers are rendered as separate interactive overlays in the three-dimensional scene. `src/data/mapLocations.ts` contains precise manually extracted marker coordinates aligned to named GLB objects. The world-map implementation includes defensive traversal and error boundaries because a malformed or unavailable WebGL asset can otherwise produce a blank page.

The atlas also implements kingdom locking and a fog-of-war presentation. A selected marker opens `KingdomPanel`, which routes the user to the applicable drill, watch mode, legacy practice, wilderness, clearing, or coaching destination.

The principal performance constraint is the 64.7 MB GLB model and a production WorldMap chunk that is approximately 1.04 MB before gzip. The build succeeds, but mobile loading and first-render performance still require real-device verification.

## 10. Optional integrations

### Supabase

The browser reads `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` from the environment. Without those values, authentication and cloud synchronization are disabled and local persistence remains the fallback. Production deployments must configure the variables and provide a compatible Supabase `progress` table if account sync is required.

### Python Stockfish trainer

`python_trainer/tactical_trainer.py` provides engine-backed move classification, principal variation data, exploration replies, and JSON export when Python dependencies and a Stockfish binary are available. `src/lib/coachingAnalysis.ts` currently simulates analysis in the browser. The React page does not call the Python process, so engine-backed coaching is a future integration rather than a completed production path.

## 11. Build and verification contract

The supported local workflow is:

```bash
npm ci
npm run dev
npm run typecheck
npm run lint
npm run test:unit
npm run validate:drills
npm test
npm run build
npm run preview
```

A pre-quarantine clean verification passed `npm ci`, TypeScript typechecking, ESLint with zero errors, the Vitest suite, and the Vite production build. The post-quarantine final gate must be recorded against the final repository. The active validator is expected to pass while quarantined chess content remains excluded from production. The build still reports the expected large WorldMap chunk warning. Vite uses root-relative assets so direct nested-route refreshes work on static hosts.

## 12. Security and operational constraints

No secrets should be committed. Only public Vite environment variable names belong in `.env.local.example`; real values belong in the local environment or deployment provider configuration. Supabase policies and schema are external to this repository and must be validated before enabling production account synchronization.

The application currently runs as a static client. Any future engine service, multiplayer service, or server-side account operation will introduce a new trust boundary and should be documented separately before implementation.

## References

[1]: ./package.json "Chess Horizon package manifest and scripts"
[2]: ./src/App.tsx "Chess Horizon route and provider composition"
[3]: ./src/types/index.ts "Shared domain types, tiers, and kingdom unlock definitions"
[4]: ./src/lib/drillLoader.ts "Drill loading, normalization, caching, and chess-position helpers"
[5]: ./src/contexts/ProgressContext.tsx "Client progress state and persistence orchestration"
[6]: ./src/data/mapLocations.ts "Atlas kingdom metadata and marker coordinates"
[7]: ./src/lib/supabaseSync.ts "Optional Supabase progress synchronization"
[8]: ./python_trainer/tactical_trainer.py "Standalone Stockfish analysis prototype"
[9]: ./DEVELOPMENT.md "Local development workflow"
[10]: ./DEPLOYMENT.md "Static deployment guidance"
