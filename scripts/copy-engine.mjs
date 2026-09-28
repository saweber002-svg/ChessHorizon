/**
 * Copies the Stockfish WASM engine files into public/engine/ so they are
 * served as static assets (never bundled). Runs on postinstall, so both
 * local dev and the GitHub Pages deploy (npm ci) get the engine.
 *
 * We use the lite single-threaded build: the multi-threaded build needs
 * COOP/COEP response headers that GitHub Pages cannot set, while the
 * single-threaded build runs anywhere and is still ~3300 Elo.
 */
import { copyFileSync, mkdirSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const bin = join(root, 'node_modules', 'stockfish', 'bin');
const dest = join(root, 'public', 'engine');

const FILES = ['stockfish-18-lite-single.js', 'stockfish-18-lite-single.wasm'];

mkdirSync(dest, { recursive: true });

let copied = 0;
for (const file of FILES) {
  const src = join(bin, file);
  if (!existsSync(src)) {
    console.error(`[copy-engine] missing ${src} — is the stockfish package installed?`);
    process.exit(1);
  }
  copyFileSync(src, join(dest, file));
  copied++;
}

console.log(`[copy-engine] copied ${copied} engine files to public/engine/`);
