# Seven-theme asset rebuild

## Status

**Implemented on branch `rebuild-seven-themes`; not yet merged.** The production boards and sprites are derived from the seven supplied full-board reference images. No chess artwork was redrawn or synthesized.

## Source mapping

| Theme | Supplied reference | Format / size |
|---|---|---|
| Horizon | `48147519-DA9B-4DB0-9758-5438C05301A8.jpeg` | JPEG, 2048×2048 |
| Gatsby | `photo-output.png` | PNG, 2048×2048 |
| Emerald | `IMG_1784.JPG` | JPEG, 1408×1408 |
| Terracotta | `IMG_1782.JPG` | JPEG, 1408×1408 |
| Glacier | `IMG_1783.JPG` | JPEG, 1408×1408 |
| Plum | `IMG_1785.JPG` | JPEG, 1408×1408 |
| Crimson | `photo-output-2.png` | PNG, 2048×2048 |

The six files without `photo-output-2.png` are in the project-file directory; Crimson's second composite is in the same shared project-file directory.

## Derivation

`scripts/rebuild-theme-assets.py` performs a deterministic rebuild:

1. It uses measured playable-board bounds for each reference and linearly divides them into a uniform 8×8 grid.
2. It reconstructs an empty board by replacing only the four occupied ranks with same-color empty-square pixels from clean ranks in the same source image. The frame and all non-board pixels remain from the reference.
3. It extracts the twelve piece sprites per theme from their occupied source cells using matched clean-square background subtraction, retaining the original RGB artwork and a transparent alpha mask.
4. Each sprite is emitted as a 256×256 RGBA cell canvas, preserving its original position and scale relative to a board square. This avoids the previous tight-crop scaling mismatch in `ThemePiece`.

The script requires Pillow and NumPy, and accepts explicit `--source-dir`, `--project-file-dir`, and `--out-dir` arguments so it does not depend on a particular machine path.

## Runtime integration

`src/data/gameThemes.ts` contains the measured grid fractions for the seven source boards. `ChessBoard` now displays the configured light/dark square fallback when a board image fails instead of leaving an empty overlay after hiding the failed image.

## Known verification boundary

Automated verification covers asset dimensions, alpha channels, TypeScript, unit tests, and the production build. Final visual approval still requires cycling through all seven themes in the running app at desktop and mobile sizes.
