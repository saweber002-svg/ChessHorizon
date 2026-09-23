# Plan: Atlas Unlock System (Fog of War)

This document outlines the proposed implementation for the Atlas unlock system, which will introduce a "Fog of War" mechanic and progression-based discovery of new kingdoms.

## 1. Core Logic & State Management

The unlock state will be integrated into the existing `ProgressContext` to ensure persistence across sessions. The project already contains a `KINGDOM_UNLOCK_STARS` mapping in `src/types/index.ts`, which we will refine to support a linear progression path.

- **Initial State:** Only the **Kingdom of Italy**, **The Wilderness**, and **The Clearing** will be unlocked by default.
- **Progression Data:** We will expand the existing `KINGDOM_UNLOCK_STARS` and introduce a `PREVIOUS_KINGDOM_REQUIREMENT` to enforce the unlock order.
- **Criteria:** Unlocking will be based on both a total star threshold (existing) and a completion margin in the preceding kingdom (new).
    - *Example:* To unlock Spain, a player must have 5 total stars (existing) AND have completed the Italian main line with at least 2 stars on each move.

## 2. Fog of War Visualization

We will implement the "Fog of War" using a multi-layered approach in the 3D scene:

- **Marker Visibility:** Markers for locked kingdoms will be hidden or rendered as "Undiscovered" (e.g., a greyed-out question mark).
- **Map Shading:** We will apply a custom shader or a darkened material to the GLB nodes of locked kingdoms. As a kingdom is unlocked, its material will transition to its full, vibrant color.
- **Atmospheric Fog:** A localized particle effect or volumetric fog can be placed over locked regions to enhance the "undiscovered" feel.

## 3. Proposed Unlock Order

The kingdoms will unlock in a sequence that reflects a logical progression for learning chess openings:

| Order | Kingdom | Opening Focus | Unlock Requirement |
| :--- | :--- | :--- | :--- |
| 1 | **Italy** | Italian Game / Two Knights | *Default* |
| 2 | **Spain** | Ruy Lopez (Spanish) | Complete Italy with 2+ stars on all moves |
| 3 | **France** | French Defense | Complete Spain with 2+ stars on all moves |
| 4 | **Germany** | Caro-Kann / German Defenses | Complete France with 2+ stars on all moves |
| 5 | **Sicily** | Sicilian Defense | Complete Germany with 2+ stars on all moves |
| 6 | **England** | English Opening | Complete Sicily with 2+ stars on all moves |
| 7 | **Netherlands** | Dutch Defense | Complete England with 2+ stars on all moves |
| 8 | **Queendom** | Queen's Pawn Openings | Complete Netherlands with 2+ stars on all moves |

## 4. Implementation Steps

1.  **Update `ProgressContext.tsx`:** Add `unlockedKingdoms` to the state and implement the logic to check and update unlocks after each drill session.
2.  **Modify `WorldMapScene.tsx`:** 
    - Filter `activeLocations` based on the `unlockedKingdoms` state.
    - Implement the visual "Fog" effect on the GLB nodes.
3.  **Update `KingdomPanel.tsx`:** Add a "Locked" state UI for kingdoms that are visible but not yet accessible.
4.  **Notification System:** Add a toast or overlay that celebrates the discovery of a new kingdom.

## 5. Next Steps for Discussion

- Should we allow players to see the names of locked kingdoms, or should they be "Unknown Lands" until unlocked?
- Do we want to allow "skipping" if a player achieves a very high score (e.g., 3 stars) on a subset of moves?
- How should the "Unlock Margin" be visualized on the map? (e.g., a progress bar floating over the next kingdom).
