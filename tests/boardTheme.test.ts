import { describe, expect, it } from "vitest";
import type { PieceSymbol } from "chess.js";
import {
  PIECE_SVG_BUILDERS,
  NEBULA_SLATE_PIECES,
  pieceGradientDefIds,
  buildGradientDefsMarkup,
} from "../src/components/pieceSvgs";

const SYMBOLS: PieceSymbol[] = ["p", "n", "b", "r", "q", "k"];

describe("Nebula Slate piece theme", () => {
  it("generates distinct gradient ids per board uid", () => {
    const a = pieceGradientDefIds("board-a");
    const b = pieceGradientDefIds("board-b");
    expect(a.white).not.toBe(b.white);
    expect(a.black).not.toBe(b.black);
    expect(a.white).not.toBe(a.black);
  });

  it("defs markup defines both gradients with the token colors", () => {
    const markup = buildGradientDefsMarkup("x1");
    const ids = pieceGradientDefIds("x1");
    expect(markup).toContain(`id="${ids.white}"`);
    expect(markup).toContain(`id="${ids.black}"`);
    expect(markup).toContain(NEBULA_SLATE_PIECES.white.gradientFrom);
    expect(markup).toContain(NEBULA_SLATE_PIECES.white.gradientTo);
    expect(markup).toContain(NEBULA_SLATE_PIECES.black.gradientFrom);
    expect(markup).toContain(NEBULA_SLATE_PIECES.black.gradientTo);
  });

  it("every piece svg honors the supplied fill and stroke", () => {
    const ids = pieceGradientDefIds("t7");
    for (const s of SYMBOLS) {
      const whiteSvg = PIECE_SVG_BUILDERS[s]({
        fill: `url(#${ids.white})`,
        stroke: NEBULA_SLATE_PIECES.white.stroke,
      });
      expect(whiteSvg).toContain(`fill="url(#${ids.white})"`);
      expect(whiteSvg).toContain(
        `stroke="${NEBULA_SLATE_PIECES.white.stroke}"`
      );
      const blackSvg = PIECE_SVG_BUILDERS[s]({
        fill: `url(#${ids.black})`,
        stroke: NEBULA_SLATE_PIECES.black.stroke,
      });
      expect(blackSvg).toContain(`fill="url(#${ids.black})"`);
      expect(blackSvg).toContain(
        `stroke="${NEBULA_SLATE_PIECES.black.stroke}"`
      );
    }
  });

  it("every url(#id) referenced by a piece is defined in the defs markup", () => {
    const markup = buildGradientDefsMarkup("zz");
    const ids = pieceGradientDefIds("zz");
    const defined = new Set(
      [...markup.matchAll(/id="([^"]+)"/g)].map((m) => m[1])
    );
    for (const s of SYMBOLS) {
      for (const id of [ids.white, ids.black]) {
        const svg = PIECE_SVG_BUILDERS[s]({
          fill: `url(#${id})`,
          stroke: "#000",
        });
        const refs = [...svg.matchAll(/url\(#([^)]+)\)/g)].map((m) => m[1]);
        expect(refs.length).toBeGreaterThan(0);
        for (const ref of refs) {
          expect(defined.has(ref)).toBe(true);
        }
      }
    }
  });
});
