# Chess Horizon Deployment Readiness Checklist

**Checklist date:** 2026-09-23  
**Current release status:** **Release candidate pending final clean verification**  
**Reason:** The invalid tactical data is now explicitly quarantined and preserved. The post-quarantine clean gate, deployment-account smoke test, Supabase validation, and mobile acceptance still require final evidence.

> A successful production bundle is necessary but not sufficient for release. Chess Horizon must also pass the drill-content validator and the deployment acceptance checks below.

## 1. Release decision gate

- [x] The repository installs successfully from the committed lockfile with `npm ci`.
- [x] TypeScript validation passes with `npm run typecheck`.
- [x] ESLint passes with zero errors through `npm run lint`.
- [x] Unit tests pass through `npm run test:unit`.
- [ ] The complete test command passes through `npm test` after quarantine.
- [x] The production bundle succeeds through `npm run build`.
- [x] The active-content drill validator passes through `npm run validate:drills` after quarantine.

**Current decision:** Do not publish until the final clean gate passes and the remaining deployment acceptance items are dispositioned. The pre-quarantine validator found **123 illegal tactical moves and 3 malformed tactical FENs** across 54 tactical files. Those files remain preserved but are no longer registered or loadable through the active product surface. They must be repaired from trusted chess source material before restoration.

## 2. Required pre-deployment commands

Run these commands from a clean checkout. Do not substitute `npm install` for `npm ci` during the release check.

```bash
npm ci
npm run typecheck
npm run lint
npm run test:unit
npm run validate:drills
npm test
npm run build
```

The expected result is an exit code of zero for every command. `npm test` runs the drill validator first and then the Vitest unit suite. A unit-test pass does not override a content-validator failure.

## 3. Content readiness

- [ ] Every registered drill ID in `src/data/drillRegistry.ts` maps to an existing JSON file.
- [ ] Every main-line pack has valid required fields and legal move sequences.
- [ ] Every tactical pack has valid FEN data.
- [ ] Every tactical solution begins from its declared FEN and contains only legal moves.
- [ ] Tactical identifiers are unique across all packs.
- [ ] Pack IDs are consistent with their filenames.
- [ ] Corrected packs are revalidated after each repair batch.
- [ ] No pack is silently excluded merely to make the validator pass without a product decision.

The authoritative command is:

```bash
npm run validate:drills
```

The validator implementation is [`scripts/validate-drills.mjs`](./scripts/validate-drills.mjs). Its output should be attached to the content-repair work item before release approval.

## 4. Application and route readiness

The production-equivalent preview previously rendered the following desktop routes successfully:

- [x] `/`
- [x] `/atlas`
- [x] `/drills`
- [x] `/drill-session/english-main-main`
- [x] `/drill-session/english-main-tacticals`
- [x] `/watch-mode/english-main-main`
- [x] `/board/english/english-main`
- [x] `/trophy/english/english-main`
- [x] `/drill/english/english-main/0`
- [x] `/wilderness`
- [x] `/clearing`
- [x] `/coaching`

Before production approval, repeat the following checks against the actual deployment URL:

- [ ] Load the root route in a new browser session.
- [ ] Refresh every nested route directly rather than reaching it only through client-side navigation.
- [ ] Confirm unknown routes follow the intended fallback behavior.
- [ ] Enter the Atlas and confirm the GLB model loads without WebGL or runtime errors.
- [ ] Confirm colored kingdom markers remain aligned with their corresponding Atlas objects.
- [ ] Open a main-line drill and make a legal move.
- [ ] Open a tactical pack and select a puzzle.
- [ ] Confirm an invalid chess move is rejected.
- [ ] Confirm progress and trophy state update after a completed drill.
- [ ] Confirm watch-mode gating behaves correctly for a new local user.
- [ ] Confirm the local-storage fallback works when Supabase variables are absent.

## 5. Static deployment configuration

- [ ] Build command is `npm run build`.
- [ ] Publish directory is `dist`.
- [ ] The host provides an SPA fallback to `index.html` for application routes.
- [ ] Asset requests are not rewritten to HTML.
- [ ] Root-relative Vite asset paths resolve from nested routes.
- [ ] `/assets/*`, `/drill-data/*`, `/models/*`, and `/images/*` return the correct content types.
- [ ] `public/models/world-atlas.glb` is present in the deployed artifact.
- [ ] Representative main-line and tactical JSON files return HTTP 200.
- [ ] The deployment does not expose `.env.local` or other secret files.
- [ ] The deployed commit, build timestamp, and environment are recorded for rollback.

The Atlas model is approximately **64.7 MB**, and the WorldMap JavaScript chunk is approximately **1.04 MB before gzip**. Confirm that the hosting provider, CDN, and browser cache configuration can handle these assets.

## 6. Environment and integration readiness

### Local-only release mode

- [ ] No real secrets are committed.
- [ ] `.env.local.example` contains names and placeholders only.
- [ ] The app starts and remains usable without Supabase variables.
- [ ] Local progress persistence survives a refresh.
- [ ] Clearing local storage resets progress without crashing the app.

### Supabase-enabled mode, if intended for this release

- [ ] `VITE_SUPABASE_URL` is configured in the deployment environment.
- [ ] `VITE_SUPABASE_ANON_KEY` is configured in the deployment environment.
- [ ] The expected `progress` table exists.
- [ ] Row-level security policies have been reviewed and tested.
- [ ] Authentication sign-in, sign-out, and session restoration work.
- [ ] Cloud-sync failures fall back without blocking local training.

Do not mark this section complete based only on the presence of environment variables. It requires testing against the actual Supabase project.

## 7. Device and performance readiness

- [ ] Desktop route acceptance passes in the supported production browser.
- [ ] Mobile viewport layout is reviewed on a real device or supported emulator.
- [ ] Atlas load time is measured on a representative mobile connection.
- [ ] Atlas memory use does not cause tab termination or WebGL context loss.
- [ ] Drill controls remain usable on a touch screen.
- [ ] Trophy Board and chess boards fit the mobile viewport without clipped controls.
- [ ] No unacceptable long-task or first-render delay is observed.

Mobile readiness was **not verified** in the final session because no supported mobile-device or mobile-emulation control was available. This remains an explicit release risk.

## 8. Product-boundary checks

- [ ] Coaching is labeled accurately as simulated unless a real engine service has been connected and tested.
- [ ] Clearing is labeled accurately as local two-player functionality unless a server-authoritative multiplayer service exists.
- [ ] Supabase is described as optional unless the production integration has been validated.
- [ ] The standalone Python Stockfish trainer is not represented as connected to the React Coaching Pavilion.
- [ ] Historical specifications do not override the current source code and current status overview.

## 9. Post-deployment smoke test

Immediately after deployment, record the deployment URL and run this short sequence:

1. Open `/` in a new private browser session.
2. Navigate to `/atlas` and wait for the GLB scene to finish loading.
3. Open `/drills` and start a main-line pack.
4. Open a tactical pack and select one available puzzle.
5. Refresh the tactical session URL directly.
6. Navigate to a trophy route and verify the board renders.
7. Open `/wilderness`, `/clearing`, and `/coaching` directly.
8. Inspect the browser console and network panel for runtime exceptions, 404 responses, MIME errors, failed GLB requests, and WebGL errors.
9. Repeat at least the root, tactical-session, and trophy URLs in a mobile environment.

Record the result, browser version, device, deployment commit, and any warnings. A release is not complete until every failed check has an owner and a documented disposition.

## 10. Final sign-off

| Area | Owner | Result | Evidence or issue reference |
|---|---|---|---|
| Clean install |  | Pending / Pass / Fail |  |
| Typecheck and lint |  | Pending / Pass / Fail |  |
| Unit tests |  | Pending / Pass / Fail |  |
| Drill-content validation |  | Pending / Pass / Fail |  |
| Production build |  | Pending / Pass / Fail |  |
| Desktop deployment smoke test |  | Pending / Pass / Fail |  |
| Mobile/device acceptance |  | Pending / Pass / Fail |  |
| Supabase acceptance, if applicable |  | Pending / Pass / Fail |  |
| Final release decision |  | Hold / Approved |  |

## References

[1]: ./STATUS_OVERVIEW.md "Current Chess Horizon status overview"

[2]: ./TECH_SPEC.md "Current Chess Horizon technical specification"

[3]: ./DEVELOPMENT.md "Chess Horizon development workflow"

[4]: ./DEPLOYMENT.md "Chess Horizon deployment guide"

[5]: ./scripts/validate-drills.mjs "Chess Horizon drill-content validator"

[6]: ./package.json "Chess Horizon package scripts and dependencies"
