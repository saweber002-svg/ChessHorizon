# Chess Horizon Deployment Guide

Chess Horizon is a static Vite application. The repository contains a Vercel configuration with an SPA rewrite to `index.html`; equivalent static hosts must provide the same fallback so direct nested routes refresh correctly.

## Release commands

```bash
npm ci
npm run typecheck
npm run lint
npm run test:unit
npm run validate:drills
npm run build
npm run preview
```

`npm test` runs the active drill validator and unit tests together. It passes for the current production registry; invalid tactical packs remain preserved but quarantined. Do not restore quarantined content until it passes validation.

The production output is generated in `dist/`. Do not edit `dist/` manually. Root-hosted builds use `/`, while the GitHub Actions Pages build uses `/ChessHorizon/`. The build also generates `dist/404.html` for SPA route refreshes.

## Vercel

The included `vercel.json` declares the Vite framework and rewrites application routes to `/index.html`. Use:

- **Build command:** `npm run build`
- **Output directory:** `dist`
- **Node version:** a current Node 22 LTS-compatible runtime

Configure `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` only if cloud authentication and progress synchronization are intended for the deployment. The `.env.local.example` file contains placeholder names only. Without those variables, local persistence remains the supported mode.

## Static-host acceptance checklist

After deployment, verify all of the following with a desktop browser and the browser console/network panel:

- root route `/` loads;
- direct refresh works for `/atlas`, `/drills`, `/drill-session/<id>`, `/watch-mode/<id>`, `/board/<opening>/<variation>`, `/trophy/<opening>/<variation>`, `/wilderness`, `/clearing`, and `/coaching`;
- `public/models/world-atlas.glb` loads successfully;
- representative main-line and tactical JSON files return HTTP 200;
- Atlas markers and kingdom navigation work;
- main and tactical sessions load;
- trophy navigation and local progress work;
- no runtime exceptions, asset 404s, MIME errors, or WebGL failures occur.

The Atlas model is approximately 64.7 MB and the WorldMap JavaScript chunk is approximately 1.04 MB before gzip. Mobile memory, first-load, and time-to-interactive acceptance require a real device or supported mobile-emulation environment; they are not considered verified by a desktop deployment check.

Supabase-enabled acceptance additionally requires a real project, compatible `progress` schema, authentication configuration, and RLS policy review. Never invent those external settings.

## GitHub Pages demo

The repository includes `.github/workflows/deploy-pages.yml`. It runs the validation, typecheck, lint, and production build gates, then deploys `dist/` through the GitHub Pages artifact workflow.

Before the first deployment, open the repository’s **Settings → Pages** and set **Source** to **GitHub Actions**. The GitHub account must have Pages enabled for the private repository. The expected project URL is:

```text
https://saweber002-svg.github.io/ChessHorizon/
```
