import { useMemo } from 'react';
import { useGLTF } from '@react-three/drei';

/**
 * WorldMapMesh
 * Renders the active 3D atlas GLB as the base world geometry.
 *
 * CURRENT MODEL: /models/world-atlas.glb  (the "New Atlas Map.glb" integrated 2026)
 * - This replaces the previous /models/atlas.glb (UVEurope1-style)
 * - Expected to contain properly named top-level or nested objects for each kingdom.
 * - Textures are expected to be embedded (self-contained). If the model appears
 *   untextured/white, the artist exported without baking textures or external
 *   texture references need to be resolved (add atlas-map.jpg equivalent if needed).
 *
 * EASY TO SWAP:
 *   1. Drop new .glb into public/models/
 *   2. Update MODEL_URL below (and the duplicate load site in WorldMap.tsx for extraction)
 *   3. Update GLB_NODE_NAME in mapLocations.ts if node names changed
 *   4. Adjust ATLAS_MODEL_CONFIG (scale/rotation/offset) in WorldMapScene.tsx
 *
 * The GLB is loaded via drei's useGLTF (caches + suspends with <Suspense>).
 */
const MODEL_URL = `${import.meta.env.BASE_URL}models/world-atlas.glb`;

export function WorldMapMesh() {
  // useGLTF from drei is preferred over raw useLoader for automatic caching,
  // progress, and glTF-specific parsing (nodes, materials, animations).
  const { scene } = useGLTF(MODEL_URL);

  console.log('%c[Atlas] WorldMapMesh: GLB parsed and ready', 'color:#0af');

  // Clone so the original cached scene isn't mutated by <primitive>.
  const clonedScene = useMemo(() => scene.clone(true), [scene]);

  return <primitive object={clonedScene} />;
}

// Preload for faster first paint (optional but nice for large 64MB asset).
useGLTF.preload(MODEL_URL);
