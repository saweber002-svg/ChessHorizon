# Chess Horizon Status Overview

**Status date:** 2026-09-23  
**Executive status:** **Release candidate pending final clean verification**

## Executive summary

Chess Horizon is a client-side React/Vite opening trainer. Its active surface includes the application shell, Atlas navigation, GLB-backed map, kingdom progression, validated main-line drills, a limited set of validated tactical packs, legal move feedback, local progress persistence, trophy presentation, Wilderness local openings, Clearing local two-player play, and explicitly simulated Coaching analysis.

The tactical system is now split intentionally. The repository preserves 54 tactical packs that failed the pre-quarantine validator, while the active registry exposes 10 tactical packs that passed validation. Quarantined IDs are excluded from the active UI and rejected by the loader. The active validator confirms the boundary and validates every registered production pack.

## Functional area status

| Area | Status | Evidence or limitation |
|---|---|---|
| Install/build health | Pending final gate | The clean-copy gate is being rerun against the post-quarantine repository. |
| Typecheck and lint | Pending final gate | Must be re-run after the final copy and truthfulness edits. |
| Home/navigation | Desktop verified previously | Root and nested direct routes rendered in the production-equivalent preview. |
| Three-dimensional Atlas | Desktop verified | GLB marker coordinates are stored in `src/data/mapLocations.ts`; mobile performance remains unverified. |
| Main-line drills | Active | Main-line packs are included in the production registry and checked by the validator. |
| Tactical drills | Limited active surface | Ten validated tactical packs remain active; 54 invalid packs are preserved and unavailable. |
| Watch mode | Active with progression gate | New-user and returning-user acceptance should be repeated in the final preview. |
| Progress and persistence | Local active path | Reducer coverage exists; browser refresh and malformed-storage acceptance remain deployment checks. |
| Trophy Board | Active | The board and progression logic remain in the active application surface. |
| Wilderness | Local functional | Stored local openings are supported; cloud collaboration is not present. |
| Clearing/PvP | Local prototype | Two players share one device; there is no online multiplayer or server-authoritative state. |
| Coaching | Simulation | The browser UI uses simulated analysis and is not connected to Stockfish. |
| Supabase | Optional/unverified | Local mode is supported; external auth, schema, RLS, and synchronization were not validated against a real project. |
| Mobile acceptance | Unverified | No real device or supported emulator was available. |
| Deployment acceptance | Not performed | No production deployment credentials or hosting action was used. |

## Tactical quarantine result

The pre-quarantine validator inspected 100 drill JSON files and found 126 issues across 54 tactical files. The issues comprised 123 illegal moves and three malformed FENs. The current validator reports the active result as:

```text
DRILL_VALIDATION_PASSED: 46 active files, 54 quarantined files, 119 unique active pack/puzzle IDs
```

The active registry contains 36 main-line files and 10 tactical files. The preserved quarantine manifest is [`src/data/quarantinedTacticalRegistry.ts`](./src/data/quarantinedTacticalRegistry.ts), and the restoration contract is [`QUARANTINE.md`](./QUARANTINE.md).

## Required final verification

Run the following commands from a clean checkout and record the exact exit status for each command:

```bash
npm ci
npm run typecheck
npm run lint
npm run test:unit
npm run validate:drills
npm test
npm run build
```

All commands must pass before the release can be called internally ready. The validator is intentionally scoped to active production content and separately checks that quarantined content is present, valid JSON, and not active.

## External items that remain unverified

Mobile-device acceptance requires a real device or supported emulator. Supabase acceptance requires the actual target project, including authentication, schema, row-level security, persistence, and sync behavior. Production deployment requires hosting credentials and a target environment. These items must not be simulated or represented as complete.

## Performance findings

The production WorldMap chunk is approximately 1.04 MB before gzip, and `public/models/world-atlas.glb` is approximately 64.7 MB. These are measured release risks rather than automatic defects. Performance changes should follow real desktop or mobile measurements.

## References

- [`TECH_SPEC.md`](./TECH_SPEC.md)
- [`DEVELOPMENT.md`](./DEVELOPMENT.md)
- [`DEPLOYMENT_READINESS_CHECKLIST.md`](./DEPLOYMENT_READINESS_CHECKLIST.md)
- [`QUARANTINE.md`](./QUARANTINE.md)
- [`scripts/validate-drills.mjs`](./scripts/validate-drills.mjs)
