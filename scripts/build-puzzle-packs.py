#!/usr/bin/env python3
"""
Build real-puzzle drill packs from the Lichess open puzzle database (CC0).

Reads ~/workspace/puzzles/lichess_db_puzzle.csv.zst (download from
https://database.lichess.org/#puzzles), selects quality puzzles per opening
(rating band, established deviation, enough plays, sane length, theme
diversity, globally unique), converts them to Chess Horizon drill packs, and
writes public/drill-data/<variationId>-puzzles.json.

Each Lichess row: PuzzleId,FEN,Moves,Rating,RatingDeviation,Popularity,
NbPlays,Themes,GameUrl,OpeningTags. FEN is the position BEFORE the opponent's
setup move; Moves[0] is the opponent's move (UCI), Moves[1:] the solution.

Usage:
    python3 scripts/build-puzzle-packs.py [--per-pack 8]

Requires: zstandard, python-chess (pip install zstandard python-chess).
"""

import argparse
import io
import json
import re
import sys
from collections import defaultdict
from pathlib import Path

import zstandard
import chess

REPO = Path(__file__).resolve().parent.parent
ZST = Path.home() / "workspace" / "puzzles" / "lichess_db_puzzle.csv.zst"
OUT_DIR = REPO / "public" / "drill-data"

# variationId -> Lichess OpeningTags value. Openings without a direct tag fall
# back to the parent opening's pool; puzzle IDs are deduplicated globally so
# shared pools still yield disjoint packs.
TAG_MAP = {
    "sicilian-dragon": ["Sicilian_Defense Sicilian_Defense_Dragon_Variation"],
    "sicilian-kan": ["Sicilian_Defense Sicilian_Defense_Kan_Variation"],
    "sicilian-scheveningen": ["Sicilian_Defense Sicilian_Defense_Open"],
    "sicilian-sveshnikov": ["Sicilian_Defense Sicilian_Defense_Open"],
    "sicilian-classical": ["Sicilian_Defense Sicilian_Defense_Open"],
    "ruy-lopez-morphy": ["Ruy_Lopez Ruy_Lopez_Morphy_Defense"],
    "ruy-lopez-berlin": ["Ruy_Lopez Ruy_Lopez_Berlin_Defense"],
    "ruy-lopez-exchange": ["Ruy_Lopez Ruy_Lopez_Exchange_Variation"],
    "french-advance": ["French_Defense French_Defense_Advance_Variation"],
    "french-winawer": ["French_Defense French_Defense_Winawer_Variation"],
    "french-classical": ["French_Defense French_Defense_Classical_Variation"],
    "caro-kann-classical": ["Caro-Kann_Defense Caro-Kann_Defense_Classical_Variation"],
    "scandinavian-qd6": ["Scandinavian_Defense Scandinavian_Defense_Main_Line"],
    "london-system": ["Queens_Pawn_Game Queens_Pawn_Game_London_System"],
    "queen-gambit-declined": ["Queens_Gambit_Declined Queens_Gambit_Declined_Other_variations"],
    "queen-gambit-accepted": ["Queens_Gambit_Accepted Queens_Gambit_Accepted_Other_variations"],
    "slav-defense": ["Slav_Defense Slav_Defense_Other_variations"],
    "english-main": ["English_Opening English_Opening_Kings_English_Variation"],
    "dutch-leningrad": ["Dutch_Defense Dutch_Defense_Other_variations"],
    "giuoco-piano": ["Italian_Game Italian_Game_Giuoco_Piano"],
    "giuoco-pianissimo": ["Italian_Game Italian_Game_Giuoco_Pianissimo"],
    "evans-gambit": ["Italian_Game Italian_Game_Evans_Gambit"],
    "two-knights": ["Italian_Game Italian_Game_Two_Knights_Defense"],
    "fried-liver-attack": ["Italian_Game Italian_Game_Two_Knights_Defense"],
    "traxler-counter-attack": ["Italian_Game Italian_Game_Two_Knights_Defense"],
}

LABELS = {
    "sicilian-dragon": "Sicilian Dragon",
    "sicilian-kan": "Sicilian Kan",
    "sicilian-scheveningen": "Sicilian Scheveningen",
    "sicilian-sveshnikov": "Sicilian Sveshnikov",
    "sicilian-classical": "Sicilian Classical",
    "ruy-lopez-morphy": "Ruy Lopez, Morphy Defense",
    "ruy-lopez-berlin": "Ruy Lopez, Berlin Defense",
    "ruy-lopez-exchange": "Ruy Lopez, Exchange Variation",
    "french-advance": "French Defense, Advance",
    "french-winawer": "French Defense, Winawer",
    "french-classical": "French Defense, Classical",
    "caro-kann-classical": "Caro-Kann, Classical",
    "scandinavian-qd6": "Scandinavian, Qd6",
    "london-system": "London System",
    "queen-gambit-declined": "Queen's Gambit Declined",
    "queen-gambit-accepted": "Queen's Gambit Accepted",
    "slav-defense": "Slav Defense",
    "english-main": "English Opening",
    "dutch-leningrad": "Dutch Leningrad",
    "giuoco-piano": "Giuoco Piano",
    "giuoco-pianissimo": "Giuoco Pianissimo",
    "evans-gambit": "Evans Gambit",
    "two-knights": "Two Knights Defense",
    "fried-liver-attack": "Fried Liver Attack",
    "traxler-counter-attack": "Traxler Counter-Attack",
}

# Themes that describe length/phase rather than the tactical idea; skipped when
# picking the headline theme.
IGNORED_THEMES = {
    "short", "long", "veryLong", "middlegame", "endgame", "opening",
    "advantage", "crushing", "equality", "mate", "quietMove",
}

THEME_BLURBS = {
    "hangingPiece": "punishing a loose, undefended piece",
    "mateIn1": "delivering checkmate",
    "mateIn2": "forcing checkmate in two",
    "mateIn3": "forcing checkmate in three",
    "mateIn4": "forcing checkmate in four",
    "mateIn5": "forcing a long mating sequence",
    "fork": "forking two targets with one move",
    "pin": "exploiting an absolute or relative pin",
    "skewer": "skewering two pieces on a line",
    "deflection": "deflecting a key defender away",
    "decoy": "decoying a piece onto a bad square",
    "discoveredAttack": "unleashing a discovered attack",
    "doubleCheck": "giving a crushing double check",
    "sacrifice": "offering a sound sacrifice",
    "trappedPiece": "trapping an enemy piece",
    "backRankMate": "mating on the back rank",
    "smotheredMate": "weaving a smothered mate",
    "arabianMate": "an Arabian-style mate net",
    "anastasiaMate": "an Anastasia's mate pattern",
    "bodenMate": "a Boden's mate battery",
    "dovetailMate": "a dovetail mate",
    "hookMate": "a hook mate finish",
    "interference": "interfering with a defensive line",
    "xRayAttack": "an x-ray attack through a piece",
    "windmill": "a windmill sequence",
    "zugzwang": "putting the opponent in zugzwang",
    "zwischenzug": "an in-between move that changes everything",
    "attraction": "attracting a piece to its doom",
    "clearance": "clearing a square or line with tempo",
    "overloading": "overloading a defender",
    "doubleBishopSacrifice": "the classic double bishop sacrifice",
    "kingsideAttack": "a direct kingside attack",
    "queensideAttack": "a queenside breakthrough",
    "pawnStorm": "a pawn storm against the king",
    "advancedPawn": "pushing a dangerous passer",
    "promotion": "forcing a promotion",
    "underPromotion": "an underpromotion tactic",
    "enPassant": "an en passant tactic",
    "castling": "a castling-related idea",
    "defensiveMove": "finding the only defensive resource",
}


def readable_theme(theme: str) -> str:
    return re.sub(r"(?<!^)(?=[A-Z0-9])", " ", theme).replace("In ", "in ").title().replace("X Ray", "X-Ray")


def headline_theme(themes):
    for t in themes:
        if t not in IGNORED_THEMES:
            return t
    return themes[0] if themes else "tactic"


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--per-pack", type=int, default=8)
    ap.add_argument("--min-rating", type=int, default=1150)
    ap.add_argument("--max-rating", type=int, default=1700)
    args = ap.parse_args()

    if not ZST.exists():
        sys.exit(f"missing {ZST} — download it from https://database.lichess.org/#puzzles")

    wanted_tags = {t for tags in TAG_MAP.values() for t in tags}
    pools = defaultdict(list)  # tag -> list of candidate dicts

    dctx = zstandard.ZstdDecompressor()
    with open(ZST, "rb") as f:
        stream = dctx.stream_reader(f)
        text = io.TextIOWrapper(stream, encoding="utf-8")
        next(text)  # header
        for line in text:
            parts = line.rstrip("\n").split(",")
            if len(parts) < 10:
                continue
            pid, fen, moves_s, rating_s, rd_s, pop_s, plays_s, themes_s, url, tag = (
                parts[0], parts[1], parts[2], parts[3], parts[4],
                parts[5], parts[6], parts[7], parts[8], parts[9].strip(),
            )
            if tag not in wanted_tags:
                continue
            try:
                rating, rd, pop, plays = int(rating_s), int(rd_s), int(pop_s), int(plays_s)
            except ValueError:
                continue
            if not (args.min_rating <= rating <= args.max_rating):
                continue
            if rd > 85 or plays < 2000:
                continue
            moves = moves_s.split(" ")
            if not (3 <= len(moves) <= 9):
                continue
            pools[tag].append({
                "id": pid, "fen": fen, "moves": moves, "rating": rating,
                "popularity": pop, "plays": plays,
                "themes": themes_s.split(" ") if themes_s else [],
                "url": url,
            })

    for tag, pool in pools.items():
        pool.sort(key=lambda p: (p["popularity"], p["plays"]), reverse=True)

    used_ids = set()
    packs_written = 0
    total_drills = 0

    for variation_id, tags in TAG_MAP.items():
        # Merge the tag pools for this variation, best-first.
        candidates = []
        seen = set()
        for tag in tags:
            for p in pools.get(tag, []):
                if p["id"] not in seen:
                    seen.add(p["id"])
                    candidates.append(p)

        drills = []
        theme_use = defaultdict(int)
        for p in candidates:
            if len(drills) >= args.per_pack:
                break
            if p["id"] in used_ids:
                continue
            theme = headline_theme(p["themes"])
            if theme_use[theme] >= 2:
                continue
            drill = convert(variation_id, len(drills) + 1, p, theme)
            if drill is None:
                continue
            used_ids.add(p["id"])
            theme_use[theme] += 1
            drills.append(drill)

        if not drills:
            print(f"  !! no puzzles for {variation_id}", file=sys.stderr)
            continue

        pack = {
            "id": f"{variation_id}-puzzles",
            "name": f"{LABELS[variation_id]} Puzzles",
            "description": (
                f"Real tactical puzzles from {LABELS[variation_id]} games, sourced from the "
                "Lichess open puzzle database (CC0). Solve them like a game: find the strongest "
                "continuation for the side to move."
            ),
            "arena": variation_id,
            "source": "Lichess open puzzle database (CC0) — https://database.lichess.org/#puzzles",
            "drills": drills,
        }
        out = OUT_DIR / f"{variation_id}-puzzles.json"
        out.write_text(json.dumps(pack, indent=2, ensure_ascii=False) + "\n")
        packs_written += 1
        total_drills += len(drills)
        print(f"  wrote {out.name} ({len(drills)} puzzles)")

    print(f"Done: {packs_written} packs, {total_drills} puzzles.")


def convert(variation_id, n, p, theme):
    """Lichess row -> drill dict. Returns None if the move sequence is illegal."""
    try:
        board = chess.Board(p["fen"])
    except ValueError:
        return None
    try:
        setup = board.parse_uci(p["moves"][0])
    except ValueError:
        return None
    board.push(setup)
    drill_fen = board.fen()
    solver = "White" if board.turn == chess.WHITE else "Black"

    san_moves = []
    try:
        for m in p["moves"][1:]:
            san_moves.append(board.san(board.parse_uci(m)))
            board.push(board.parse_uci(m))
    except ValueError:
        return None
    if not san_moves:
        return None

    theme_name = readable_theme(theme)
    blurb = THEME_BLURBS.get(theme, "finding the strongest continuation")
    first = san_moves[0]
    opp_reply = san_moves[1] if len(san_moves) > 1 else None

    # Narrate the solution compactly: "1. Nxf7+ Kxf7 2. Qh5+ ..."
    narration = []
    for i, s in enumerate(san_moves):
        if i % 2 == 0:
            narration.append(f"{i // 2 + 1}. {s}")
        else:
            narration[-1] += f" {s}"
    line_str = " ".join(narration)

    return {
        "drillId": f"{variation_id}-pz{n}",
        "name": f"{theme_name} ({p['rating']})",
        "theme": theme_name,
        "description": (
            f"{solver} to play. A real {LABELS[variation_id]} tactic rated {p['rating']} — "
            f"{blurb}."
        ),
        "fen": drill_fen,
        "solutionMoves": san_moves,
        **({"opponentResponse": opp_reply} if opp_reply else {}),
        "stars": {"3": "First move correct", "2": "Second attempt", "1": "Third attempt"},
        "briefExplanation": f"The key move is {first}: {blurb}. Solution: {line_str}.",
        "explanation": (
            f"{solver} to move in this {LABELS[variation_id]} position. The solution begins "
            f"with {first} — {blurb}. Full line: {line_str}. "
            f"Source: Lichess puzzle {p['id']} (CC0), {p['url']}."
        ),
        "lichessPuzzleId": p["id"],
        "lichessUrl": p["url"],
    }


if __name__ == "__main__":
    main()
