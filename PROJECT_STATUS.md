# Chess Horizon Project Status

**Status date:** 2026-09-23  
**Release state:** Controlled release candidate; not yet approved for publication until the post-quarantine gates are re-run against the final repository.

## Current implementation

The active application is a client-side React/Vite chess opening trainer. Its verified surface includes the application shell, Atlas navigation, GLB-backed map rendering, kingdom progression, main-line drills, legal move handling, feedback, local progress persistence, trophy presentation, the drill browser, local Wilderness openings, local two-player Clearing, and the Coaching Pavilion’s explicitly simulated analysis experience.

Atlas marker coordinates were synchronized to the named objects in the current GLB model. Root-relative Vite assets and SPA fallback configuration support direct refreshes of nested routes on a static host.

## Tactical status

The repository contains 100 drill JSON files, including 64 tactical packs. The pre-quarantine validator found 126 issues across 54 tactical files. The invalid tactical files remain preserved in `public/drill-data/` and are listed in `src/data/quarantinedTacticalRegistry.ts`.

The active registry exposes 46 validated files, including 10 tactical packs. Quarantined IDs are excluded from normal drill lists and kingdom tactical CTAs. The loader rejects a quarantined tactical ID before fetching its JSON, and direct access produces an explicit unavailable state.

The active-content validator now checks that:

- active registry files are structurally valid;
- active main-line and tactical sequences pass Chess.js legality checks;
- quarantined files still exist and remain valid JSON;
- quarantined IDs are not accidentally active; and
- active and quarantined identifiers do not silently overlap.

See [`QUARANTINE.md`](./QUARANTINE.md) for the restoration contract.

## Test and build state

The last pre-quarantine clean verification passed installation, typecheck, lint, unit tests, and production build. The quarantine-aware gate must be run again after the final changes with:

```bash
npm ci
npm run typecheck
npm run lint
npm run test:unit
npm run validate:drills
npm test
npm run build
```

The expected post-quarantine result is zero active-content validation errors. The quarantined files are intentionally not treated as production content.

## Explicitly limited functionality

The Coaching Pavilion uses simulated browser analysis and is not connected to the Python Stockfish trainer. The Clearing is a local two-player prototype rather than online multiplayer. Supabase remains optional and has not been validated against a production project, schema, or row-level security policy. Mobile-device performance and WebGL stability remain unverified without a real device or supported emulator.

## Release priorities

Before publication, complete the clean final command gate, verify the active routes after quarantine, run the core user journey from a fresh local user through progress and trophy persistence, inspect the final Git diff, and perform deployment smoke tests if deployment credentials are available. Repairing quarantined tactical content is future work and must use trusted chess source data rather than guessed replacements.
