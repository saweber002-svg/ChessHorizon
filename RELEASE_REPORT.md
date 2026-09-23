# Chess Horizon Final Audit and Release Report

**Report date:** 2026-09-23  
**Repository:** Chess Horizon  
**Release decision:** **RELEASE READY WITH EXPLICIT UNVERIFIED EXTERNAL ITEMS**

The active release surface is stable and passes the complete internal command gate. Invalid tactical content is preserved but quarantined. This report does not claim a production deployment, Supabase validation, mobile acceptance, or browser-console verification where those resources were unavailable.

## Executive status

The application can be installed from the lockfile, typechecked, linted, unit-tested, content-validated, and built from a clean Linux copy. The active production registry contains only validated drill assets. The final HTTP smoke checks returned HTTP 200 for all inspected application routes and representative static assets.

The release is limited rather than feature-complete. Fifty-four tactical packs remain outside the active product path because the pre-quarantine validator found 126 issues in them. Ten tactical packs remain active because they passed the active-content gate. The invalid files were not deleted or repaired by guesswork.

## Codebase audit

The repository is a React 19 and TypeScript application built with Vite 8. It uses Wouter for routing, React Three Fiber and Three.js for the Atlas, Chess.js for legal move handling, Vitest for unit tests, Tailwind CSS for styling, and optional Supabase authentication and progress synchronization. The Python Stockfish trainer remains a separate prototype and is not called by the React Coaching page.

The verified core includes the application shell, Atlas route, GLB loading path, marker coordinate data, kingdom progression, main-line drills, legal move feedback, progress state, trophy rendering, local persistence, Wilderness local openings, and local two-player Clearing. Coaching remains a simulated analysis experience and is now labeled as such in the active UI and Atlas copy.

The final diff includes earlier repository cleanup and feature-repair work from the inherited working tree, including removal of unused UI modules and obsolete assets, map-coordinate updates, drill-loader changes, trophy refinements, documentation, tests, and data corrections. Those pre-existing changes were reviewed as part of the final diff and were not rewritten merely to simplify this directive.

## Tactical data audit and quarantine

The repository contains 100 drill JSON files, of which 64 are tactical packs. Before quarantine, the validator reported **126 issues across 54 tactical files**:

- 123 illegal tactical moves;
- two FENs with invalid piece-rank data; and
- one FEN missing a black king.

The active registry now contains **46 files**: 36 main-line packs and 10 tactical packs. The ten active tactical packs are:

- `caro-kann-advance-tacticals`;
- `english-reversed-sicilian-tacticals`;
- `german-berlin-tacticals`;
- `london-vs-qgd-tacticals`;
- `ruy-lopez-berlin-tacticals`;
- `ruy-lopez-morphy-tacticals`;
- `sicilian-classical-black-tacticals`;
- `sicilian-classical-tacticals`;
- `sicilian-dragon-tacticals`; and
- `slav-defense-tacticals`.

The 54 invalid tactical JSON files remain in `public/drill-data/`. Their IDs are preserved in [`src/data/quarantinedTacticalRegistry.ts`](./src/data/quarantinedTacticalRegistry.ts). The active registry excludes them, `hasTacticalDrills()` does not advertise them, and `loadDrillPack()` rejects them before fetching their JSON. A direct route shows a controlled temporary-unavailable state rather than a broken tactical session.

The validator was not weakened. It now validates every active production pack and verifies that quarantined files remain present, parse as JSON, are not active registry entries, and are not silently omitted. It reports:

```text
DRILL_VALIDATION_PASSED: 46 active files, 54 quarantined files, 119 unique active pack/puzzle IDs
```

The quarantine boundary and restoration requirements are documented in [`QUARANTINE.md`](./QUARANTINE.md).

## Final command gate

The final clean-copy run used the exact final source state and returned exit code zero for every required command.

| Command | Result | Evidence |
|---|---:|---|
| `npm ci` | PASS | 374 packages installed from the lockfile. |
| `npm run typecheck` | PASS | `tsc -b` completed without errors. |
| `npm run lint` | PASS | ESLint completed without errors. |
| `npm run test:unit` | PASS | 2 files and 11 tests passed. |
| `npm run validate:drills` | PASS | 46 active files and 54 quarantined files reported; zero active errors. |
| `npm test` | PASS | Validator and the 11-test Vitest suite both passed. |
| `npm run build` | PASS | Vite production build completed successfully. |

The build emits one known performance warning because the WorldMap chunk is approximately 1.04 MB before gzip. This warning does not prevent the build and was not addressed with a speculative rewrite.

The unit run prints an expected warning that Supabase credentials are not configured. This confirms local-only mode is being exercised; it is not evidence of production Supabase readiness.

## Route and asset verification

The final preview returned HTTP 200 for the following routes:

- `/`;
- `/atlas`;
- `/drills`;
- `/drill-session/english-main-main`;
- `/drill-session/english-main-tacticals`;
- `/drill-session/london-vs-qgd-tacticals`;
- `/watch-mode/english-main-main`;
- `/board/english/english-main`;
- `/trophy/english/english-main`;
- `/drill/english/english-main/0`;
- `/wilderness`;
- `/clearing`; and
- `/coaching`.

The following representative assets also returned HTTP 200:

- `/models/world-atlas.glb`;
- `/drill-data/english-main-main.json`; and
- `/drill-data/london-vs-qgd-tacticals.json`.

The direct quarantined tactical route rendered the expected unavailable state. The direct validated tactical route rendered the tactical selector. Browser navigation was available for route content inspection during the preview pass, but the connected browser’s console tools subsequently reported no current window/unsupported action. Therefore, no claim is made that a complete browser-console capture was performed.

## Core functionality and product truthfulness

The active main-line route remains available after tactical quarantine. Quarantined tactical IDs no longer appear in active drill discovery or kingdom tactical CTAs, so disabling invalid tactics does not block main-line training.

Coaching is labeled as simulated analysis and is not represented as Stockfish-backed. Clearing is labeled as local two-player play and is not represented as online multiplayer. Supabase remains optional, and local persistence remains the fallback when credentials are absent.

The Atlas marker coordinates remain aligned to the named GLB objects according to the previously completed coordinate extraction work. The GLB is approximately 64.7 MB. Mobile memory, loading performance, and WebGL stability were not tested on a real device or supported emulator.

## Security findings

The final security scan found no tracked `.env` file containing credentials, no likely service-role or private-key patterns, and no retained debug telemetry or hardcoded agent endpoint in `src`, `scripts`, or `public`. The only tracked environment file is `.env.local.example`, which contains placeholders and public variable names.

Supabase policies, schema, authentication behavior, and row-level security were not externally validated because the actual target project was not available. No production security claim is made for those external controls.

## Deployment status

No production deployment was performed. No deployment credential, DNS change, hosting-account action, or production database action was available or authorized in this run. The final build artifact was verified in a local preview service, and direct route and representative asset requests succeeded there.

The static deployment configuration remains suitable for a Vite SPA: the build output is `dist`, root-relative assets are used, and `vercel.json` provides an SPA fallback. A real deployment must still verify the hosting provider’s rewrite behavior, MIME types, CDN behavior, GLB delivery, nested-route refreshes, and browser network/console output.

## Mobile status

No real mobile device or supported emulator was available. Mobile acceptance is therefore **unverified**, not passed. Required future checks include Atlas loading, touch interaction, board sizing, trophy layout, route navigation, memory stability, loading performance, and WebGL behavior.

## Quarantined functionality and restoration list

The following functionality remains preserved but outside the verified production surface:

1. The 54 invalid tactical packs listed in `src/data/quarantinedTacticalRegistry.ts`.
2. The standalone Python Stockfish trainer, which is not integrated with the React Coaching Pavilion.
3. Supabase cloud auth and synchronization, pending validation against the actual target project.
4. Online multiplayer or server-authoritative Clearing functionality, which does not exist in the current implementation.
5. Mobile acceptance, pending a real device or supported emulator.

Tactical functionality may be restored only when every quarantined FEN is valid, every solution move is legal, IDs are unique, filenames match pack IDs, the pack is deliberately registered, the active validator passes, unit and full tests pass, and representative browser smoke tests succeed. No guessed positions or fabricated solutions may be used.

## Remaining work

### Must fix before a specific production deployment

- Perform deployment against the intended hosting account.
- Verify nested-route fallback, asset MIME types, GLB delivery, cache behavior, and production browser network output.
- Repeat the core user journey against the deployed URL.
- Perform browser persistence and reset acceptance in a fresh session.

### Future functionality

- Repair quarantined tactical packs from trusted chess source material.
- Integrate the Python Stockfish trainer through a deliberate service boundary if engine-backed coaching is desired.
- Build server-authoritative online multiplayer only after defining its trust, persistence, and synchronization model.
- Add repeatable browser automation for the core journey and active tactical route.

### External verification still required

- A real Supabase project for auth, schema, RLS, persistence, sync, and failure behavior.
- A real mobile device or supported emulator for mobile acceptance.
- Production hosting credentials and the actual deployment environment.

## Final diff review

The final review confirmed that the quarantine changes are understandable and bounded:

- invalid tactical JSON was not removed by this quarantine pass;
- active registry references were intentionally reduced;
- loader behavior explicitly rejects quarantined IDs;
- the validator was extended to enforce the active/quarantine boundary;
- tests were added for quarantine exclusion and route-safe loader behavior;
- product copy was corrected where it implied unsupported engine analysis or unsupported efficacy claims;
- no tests were removed to obtain green status; and
- no secrets or debug endpoints were introduced.

The working tree still contains the broader inherited cleanup and feature changes from the prior project sessions. Those changes should be reviewed and committed as coherent units before a production release.
