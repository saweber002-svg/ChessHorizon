import type { KingdomId } from '@/types';
import { percentToWorld3D } from '@/lib/mapCoordinates';
import { KINGDOM_POSITIONS } from '@/types';

export interface MapLocation {
  id: string;
  name: string;
  subname: string;
  kingdom: KingdomId;
  openingId: string;
  /** Variation id in openings.json */
  variationId?: string;
  /** Drill JSON file id without .json */
  drillFileId?: string;
  position: [number, number, number];
  color: string;
  glowColor: string;
  symbol: string;
  description: string;
  starThreshold: number;
}

function loc(
  id: string,
  kingdom: KingdomId,
  openingId: string,
  name: string,
  subname: string,
  symbol: string,
  color: string,
  description: string,
  starThreshold: number,
  opts?: { variationId?: string; drillFileId?: string }
): MapLocation {
  const pos = KINGDOM_POSITIONS[kingdom];
  return {
    id,
    name,
    subname,
    kingdom,
    openingId,
    variationId: opts?.variationId,
    drillFileId: opts?.drillFileId,
    position: percentToWorld3D(pos.x, pos.y),
    color,
    glowColor: `${color}88`,
    symbol,
    description,
    starThreshold,
  };
}

export const MAP_LOCATIONS: MapLocation[] = [
  loc('italy', 'italian', 'italian', 'Kingdom of Italy', 'Italian Game & Two Knights', '♗', '#00f5d4', 'Renaissance courts — classical development and sharp tactics.', 0),
  loc('sicily', 'sicilian', 'sicilian', 'Queendom of Sicily', 'Sicilian Defense', '♚', '#ff7b72', 'The most combative reply to 1.e4.', 5),
  loc('spain', 'spanish', 'spanish', 'Kingdom of Spain', 'Ruy Lopez (Spanish Opening)', '♘', '#f5a623', 'Named after a 16th-century priest — cornerstone of classical chess.', 10),
  loc('england', 'english', 'english', 'Kingdom of England', 'English Opening', '♙', '#e8d5a3', 'Hypermodern flank play with flexible structures.', 15),
  loc('scandinavia', 'scandinavian', 'scandinavian', 'Realm of Scandinavia', 'Scandinavian Defense', '♛', '#7ec8e3', 'Bold counter-attack from move one.', 20),
  loc('queendom', 'queendom', 'queendom', 'The Queendom', "Queen's Pawn Openings", '♕', '#d6b6ff', 'A realm built on d4, gambits, and central ambition.', 25, { variationId: 'queen-gambit-declined' }),
  loc('french', 'french', 'french', 'Kingdom of France', 'French Defense', '♞', '#c026d3', 'The solid and counter-attacking choice against 1.e4.', 8),
  loc('dutch', 'dutch', 'dutch', 'Kingdom of the Netherlands', 'Dutch Defense', '♟', '#e11d48', 'Aggressive f5 counter against 1.d4.', 12),
  loc('germany', 'germany', 'germany', 'Kingdom of Germany', 'Caro-Kann & German Defenses', '♜', '#854d0e', 'Home of the rock-solid Caro-Kann and other sturdy German systems.', 18),
  loc('wilderness', 'wilderness', 'wilderness', 'The Wilderness', 'Custom Openings', '🌿', '#10b981', 'Forge your own paths beyond the charted kingdoms.', 0),
  loc('clearing', 'clearing', 'clearing', 'The Clearing', 'PvP Arena', '⚔', '#f59e0b', 'Test your steel against fellow travelers.', 0),
  loc('coaching', 'coaching', 'coaching', 'The Coaching Pavilion', 'Simulated Analysis Practice', '🎓', '#a78bfa', 'Practice with simulated move feedback while the engine integration remains future work.', 0),

];

export const ITALIAN_DRILL_VARIATIONS = [
  { variationId: 'giuoco-pianissimo', drillFileId: 'giuoco-pianissimo-main', label: 'Giuoco Pianissimo' },
  { variationId: 'evans-gambit', drillFileId: 'evans-gambit-main', label: 'Evans Gambit' },
  { variationId: 'two-knights', drillFileId: 'two-knights-main', label: 'Two Knights' },
  { variationId: 'fried-liver', drillFileId: 'fried-liver-attack-main', label: 'Fried Liver Attack' },
] as const;

// =============================================================================
// 3D ATLAS GLB NODE MAPPING (for new "world-atlas.glb" integration)
// =============================================================================

/**
 * Kingdom node names as they appear in the GLB scene graph (exact or close match).
 * The new atlas GLB ("New Atlas Map.glb") exports objects with these kingdom names.
 * 
 * HOW KINGDOM NODES ARE DETECTED (see WorldMapScene + WorldMap.tsx):
 * 1. GLTFLoader / useGLTF loads the model.
 * 2. scene.traverse((obj) => { ... }) walks every Object3D, Group, Mesh, etc.
 * 3. For each obj with a .name, we do case-insensitive + trim match against
 *    GLB_NODE_NAME[kingdom] and GLB_NODE_ALIASES.
 * 4. When matched, we compute world-space center via Box3.setFromObject(obj)
 *    (more reliable than obj.position if the node has children/geometry).
 * 5. Marker is placed at [cx, cy + VERTICAL_OFFSET, cz] so it floats above terrain.
 * 
 * TO ADD A NEW KINGDOM:
 * - Add to KingdomId union in src/types/index.ts
 * - Add fallback entry in KINGDOM_POSITIONS (src/types/index.ts)
 * - Add entry in KINGDOM_UNLOCK_STARS if gated
 * - Add a loc(...) entry to MAP_LOCATIONS below (or above the giuoco one)
 * - Add GLB_NODE_NAME entry here pointing to the exact node name in Blender/GLB
 * - Re-export the .glb with the new named object
 * 
 * TO CHANGE COLORS / METADATA: edit the loc() call in MAP_LOCATIONS array.
 * TO DEBUG NAMES: open browser console after /atlas loads; look for
 * "[Atlas] GLB loaded" and "[Atlas] Matched kingdom nodes" logs.
 */
export const GLB_NODE_NAME: Partial<Record<KingdomId, string>> = {
  italian: 'Italy',
  spanish: 'Spain',
  sicilian: 'Sicily',
  english: 'England',
  scandinavian: 'Scandinavia',
  queendom: 'London',
  french: 'France',
  dutch: 'Netherlands',
  germany: 'Germany',
  wilderness: 'The_Wilderness',
  clearing: 'The_Clearing',
  coaching: 'Coaching',
};

/**
 * How kingdom markers are placed in the 3D atlas:
 * - The WorldMapScene loads world-atlas.glb
 * - KingdomPositionExtractor traverses the scene for nodes matching GLB_NODE_NAME or GLB_NODE_ALIASES
 * - It computes the center of the object's bounding box (Box3)
 * - Adds markerVerticalOffset on Y
 * - Applies ATLAS_CONFIG scale/rotation/position via applyAtlasTransform
 * - These world positions are then used for LocationMarker components
 *
 * To adjust a marker's position for a specific kingdom without changing the GLB:
 * - Add an entry to manualMarkerPositions in ATLAS_CONFIG (in raw GLB space)
 *
 * The new kingdoms (France, Netherlands, Germany) now have dedicated GLB node mappings
 * and will automatically extract positions from objects named "France", "Netherlands", "Germany"
 * in the world-atlas.glb if they exist.
 */

/** Additional aliases the GLB might use (from spec + common variants). */
export const GLB_NODE_ALIASES: Array<[string, KingdomId]> = [
  ['London', 'queendom'],
  ['Sicilian', 'sicilian'],
  ['The_Wilderness', 'wilderness'],
  ['The_Clearing', 'clearing'],
  ['Wilderness', 'wilderness'],
  ['Clearing', 'clearing'],
  ['French', 'french'],
  ['Dutch', 'dutch'],
  ['Germany', 'germany'],
  ['Coaching', 'coaching'],
  ['The_Coaching_Pavilion', 'coaching'],
];

// =============================================================================
// ATLAS MODEL + MARKER CONFIG (single source of truth for the new GLB)
// =============================================================================

/**
 * This is the **single place** to tune the new world-atlas.glb integration.
 *
 * === Quick fixes for your latest feedback ("too small / wrong places / still too high") ===
 * 1. Too small?      → markerRadius is now 2.2 (with matching rings). Increase to 3.0+ if still tiny.
 * 2. Still too high? → markerVerticalOffset is now 0.35. Try 0.15–0.25 if markers float.
 * 3. Wrong places?   → Easiest: Set `forceLegacyPercentPositions: true` (or use "Toggle Legacy Positions" in the Atlas debug panel).
 *                      This gives you a working old-style layout immediately.
 *                      Then use the new "Flip 180°" and Raise/Lower buttons in the debug panel
 *                      to rotate and vertically adjust the entire set.
 *                      Finally tune individual kingdoms with manualMarkerPositions.
 * 4. Camera too far? → Use the suggested cameraStart the console prints on every load.
 *
 * After any change to this file → Hard refresh /atlas (Ctrl + Shift + R).
 */
export const ATLAS_CONFIG = {
  // === MODEL SCALE (the main lever you asked for) ===
  // Increase this to "treat the map model as larger".
  // This makes the kingdom geometry bigger in world space.
  // Result: your fixed-size glowing markers become relatively smaller,
  // and the kingdoms feel more substantial.
  // Typical values for new GLBs: 5, 10, 20, 50 — experiment.
  scale: 10,   // Good starting point for most new "New Atlas Map" style GLBs. Tweak up/down as needed.

  position: [0, 0, 0] as [number, number, number],
  rotation: [0, 0, 0] as [number, number, number],

  // Marker positioning
  // When you raise `scale`, you will almost always want to LOWER this value
  // so the markers sit close to the surface of the (now larger) kingdoms.
  // This value is overridden by the Atlas debug panel buttons via localStorage.
  markerVerticalOffset: typeof window !== 'undefined' 
    ? parseFloat(localStorage.getItem('atlas_marker_vertical_offset') || '0.35') 
    : 0.35,

  // Marker visual size
  // PRIMARY control for "markers too large".
  // After increasing model `scale`, you will usually want to LOWER these numbers.
  markerRadius: 5.0,          // Increased by ~125% from 2.2
  markerRingInner: 6.5,       // Scaled proportionally
  markerRingOuter: 8.0,       // Scaled proportionally

  // Camera tuning (used by CameraRig)
  // The console will suggest good values based on your current markers.
  // When you change scale a lot, you will also need to adjust these.
  cameraStart: {
    position: [3.3, 25, 30] as [number, number, number],   // Focused on Italy, looking down at it
    lookAt: [3.3, -3.6, 16.3] as [number, number, number], // Italy's center position
  },

  // Offset used when flying to a marker (added to the marker position).
  // Scale these roughly with your model `scale` so the camera doesn't overshoot.
  cameraFlyToOffset: {
    x: 12,
    y: 16,
    z: 18,
  },

  cameraControls: {
    minDistance: 15,
    maxDistance: 420,
  },

  /**
   * Emergency / development mode.
   * When true, ALL markers will use positions derived from the old percent-based
   * KINGDOM_POSITIONS, transformed to roughly match the current GLB scale.
   * This gives you a reliable "everything is visible" layout while you tune
   * individual manualMarkerPositions entries.
   *
   * Controlled via the debug panel buttons (stored in localStorage).
   */
  forceLegacyPercentPositions: typeof window !== 'undefined'
    ? localStorage.getItem('atlas_force_legacy_positions') === 'true'
    : false,

  /**
   * Rotation (in degrees) to apply to legacy percent positions around the Y axis.
   * 180 is very common when the new GLB map is oriented the opposite way
   * from the old percent coordinate system.
   *
   * Controlled via the "Flip 180°" button in the Atlas debug panel.
   */
  legacyRotationY: typeof window !== 'undefined'
    ? parseFloat(localStorage.getItem('atlas_legacy_rotation_y') || '180')
    : 180,

  /**
   * Optional extra offset applied to legacy positions after rotation and scaling.
   * Useful for fine-tuning the whole set of markers as a group.
   */
  legacyPositionOffset: [0, 0, 0] as [number, number, number],

  /**
   * Manual position overrides (raw GLB space, before scale/rotation/position).
   *
   * Current known issues with this GLB:
   * - "England" (or "London" alias) node center is over the London area instead of central/southern England.
   * - Clearing, Wilderness (and sometimes Queendom) nodes are placed way outside the main visual map.
   *
   * === FASTEST WAY TO GET EVERYTHING VISIBLE ===
   * Set `forceLegacyPercentPositions: true` in this object (or use the button in the Atlas debug panel).
   * All markers will switch to a scaled version of the old percent layout.
   * Then you can individually override only the ones that are still wrong using manualMarkerPositions.
   *
   * Fill in values by (safe path):
   * 1. Click "List ALL named objects in GLB (zero risk)" → confirms the names you just gave.
   * 2. Click "Safe extract centers for the real GLB objects" (new low-risk button).
   * 3. Copy the ready-to-paste manualMarkerPositions block from console.
   * 4. Paste here, hard refresh with all extraction flags OFF.
   *
   * The 10 confirmed object names in this GLB are exactly:
   * England, London, Spain, Italy, France, Netherlands, Scandinavia, Sicily,
   * The Wilderness, The Clearing
   */
  manualMarkerPositions: {
    italian: [3.276, -3.586, 16.308],
    spanish: [-18.416, -3.586, 21.183],
    english: [-18.114, -3.586, -1.185],
    scandinavian: [6.872, -3.852, -11.903],
    sicilian: [5.702, -3.586, 24.084],
    queendom: [-15.143, -3.586, 3.227],
    french: [-12.493, -3.586, 11.211],
    dutch: [-6.619, -3.586, 3.429],
    germany: [-0.156, -3.586, 5.298],
    wilderness: [25, -3.586, 25], // Default wilderness position
    clearing: [0, 5, 0], // Default clearing position
    coaching: [0, -3.586, 0], // Center position for coaching pavilion
  } as Partial<Record<KingdomId, [number, number, number]>>,
} as const;

/**
 * Applies the model transform (scale + rotation + position) to a raw 3D position
 * extracted from the GLB. This keeps marker positions in sync with the rendered model.
 */
export function applyAtlasTransform(
  pos: [number, number, number]
): [number, number, number] {
  const { scale, rotation, position } = ATLAS_CONFIG;
  const [x, y, z] = pos;

  // 1. Scale
  let tx = x * scale;
  let ty = y * scale;
  let tz = z * scale;

  // 2. Rotation (order: X then Y then Z, matching <group rotation>)
  const [rx, ry, rz] = rotation;

  // Rotate around X
  let y1 = ty * Math.cos(rx) - tz * Math.sin(rx);
  let z1 = ty * Math.sin(rx) + tz * Math.cos(rx);
  ty = y1; tz = z1;

  // Rotate around Y
  let x2 = tx * Math.cos(ry) + tz * Math.sin(ry);
  let z2 = -tx * Math.sin(ry) + tz * Math.cos(ry);
  tx = x2; tz = z2;

  // Rotate around Z
  let x3 = tx * Math.cos(rz) - ty * Math.sin(rz);
  let y3 = tx * Math.sin(rz) + ty * Math.cos(rz);
  tx = x3; ty = y3;

  // 3. Translate
  tx += position[0];
  ty += position[1];
  tz += position[2];

  return [tx, ty, tz];
}

/**
 * Converts an old-style percent position (from KINGDOM_POSITIONS) into a
 * reasonable *raw GLB space* coordinate that can be put into manualMarkerPositions.
 *
 * This is very useful as a starting point when the GLB nodes are misaligned.
 */
export function getLegacyRawGLBPosition(xPercent: number, yPercent: number): [number, number, number] {
  const { scale } = ATLAS_CONFIG;

  // The old map roughly spanned X: -255..255, Z: -184..184
  // We divide by a factor of the scale to get back into "raw GLB object space"
  const factor = scale * 2.5; // heuristic that works reasonably at scale=10

  const x = ((xPercent - 50) / 100) * 500 / factor;
  const z = ((yPercent - 50) / 100) * 370 / factor;

  // Y is height in raw GLB space (before vertical offset is added later)
  return [x, 0, z];
}

/**
 * Returns a fully transformed world position for a kingdom using the old
 * percent-based layout, but adapted to the current GLB model.
 *
 * This is the function used when `forceLegacyPercentPositions` is true.
 * It applies: scale → Y rotation (legacyRotationY) → vertical offset → extra offset.
 */
export function getLegacyTransformedPosition(xPercent: number, yPercent: number): [number, number, number] {
  const {
    scale,
    markerVerticalOffset,
    legacyRotationY = 0,
    legacyPositionOffset = [0, 0, 0],
  } = ATLAS_CONFIG;

  // Start from the reliable old percent coordinate
  const oldWorld = percentToWorld3D(xPercent, yPercent);
  let [x, y, z] = oldWorld;

  // Scale it up to the current model size
  const s = scale || 10;
  x *= (s / 25);
  z *= (s / 25);

  // Apply Y rotation (in degrees) — this is what you need for the 180° flip
  const rotRad = (legacyRotationY * Math.PI) / 180;
  const cos = Math.cos(rotRad);
  const sin = Math.sin(rotRad);

  const rx = x * cos - z * sin;
  const rz = x * sin + z * cos;
  x = rx;
  z = rz;

  // Add vertical offset (to sit above the terrain)
  y += markerVerticalOffset;

  // Apply any extra group offset the user wants
  x += legacyPositionOffset[0];
  y += legacyPositionOffset[1];
  z += legacyPositionOffset[2];

  return [x, y, z];
}
