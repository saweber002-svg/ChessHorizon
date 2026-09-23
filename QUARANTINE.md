# Chess Horizon Quarantine Register

**Status:** Active release-control boundary  
**Purpose:** Keep known-invalid or unverified functionality recoverable without exposing it through normal production flows.

## Tactical drill quarantine

The repository contains **64 tactical JSON packs**. The pre-quarantine validator inspected all 100 drill JSON files and reported **126 issues across 54 tactical files**: 123 illegal solution moves, two malformed FENs with invalid piece-rank data, and one malformed FEN with no black king.

The affected JSON files remain in `public/drill-data/` with their current contents. They were not rewritten to invent positions, repair moves, or suppress failures. Their IDs are listed in [`src/data/quarantinedTacticalRegistry.ts`](./src/data/quarantinedTacticalRegistry.ts).

Ten tactical packs passed the active-content validation and remain production-visible:

- `caro-kann-advance-tacticals`
- `english-reversed-sicilian-tacticals`
- `german-berlin-tacticals`
- `london-vs-qgd-tacticals`
- `ruy-lopez-berlin-tacticals`
- `ruy-lopez-morphy-tacticals`
- `sicilian-classical-black-tacticals`
- `sicilian-classical-tacticals`
- `sicilian-dragon-tacticals`
- `slav-defense-tacticals`

The active registry in [`src/data/drillRegistry.ts`](./src/data/drillRegistry.ts) contains only production-visible files. `hasTacticalDrills()` therefore does not advertise quarantined packs from kingdom panels or main-line sessions. The loader rejects a quarantined ID before fetching its JSON, and a direct quarantined route renders a controlled unavailable state rather than a broken page.

The validator in [`scripts/validate-drills.mjs`](./scripts/validate-drills.mjs) validates every active registered pack and checks the quarantine boundary. It confirms that quarantined files exist, remain valid JSON, are not active registry entries, and are not silently omitted. It does not treat quarantined chess content as production-valid content.

## Restoration contract

A quarantined tactical pack may return to the active registry only after all of the following are true:

1. Its FEN is syntactically valid and represents the intended usable position.
2. Every declared solution move is legal from the preceding position.
3. The tactical identifier is unique across all packs.
4. The filename and pack ID match.
5. The pack is deliberately re-added to `ALL_DRILL_FILE_IDS`.
6. `npm run validate:drills` passes with zero active-content errors.
7. Unit tests and the full `npm test` command pass.
8. The restored pack has a representative browser smoke test, including direct route loading and a playable solution.
9. The restored product copy accurately describes the pack and does not imply validation that has not occurred.

Repair work must use trusted chess source material. Guessing or changing moves solely to make the validator green is prohibited.

## Other provisional functionality

### Coaching

The Coaching Pavilion is retained as a clearly simulated browser-analysis experience. It is not connected to the standalone Python Stockfish trainer and must not be described as engine-backed until a real integration exists and is tested.

### Clearing

The Clearing is retained as a local two-player prototype. It is not online multiplayer, does not provide matchmaking, and does not have a server-authoritative game state.

### Supabase

Supabase remains optional. Local-only mode is the supported fallback when environment variables are absent. Authentication, database schema, row-level security, cloud persistence, and synchronization have not been validated against a production Supabase project in this session.

### Mobile acceptance

Desktop preview routes have been smoke-tested. Mobile device or supported mobile-emulator acceptance remains unverified because the required external device/emulation resource was unavailable.
