import React, { Suspense, useEffect, useRef } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { CameraControls, Stars, Sparkles, Html, useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import type CameraControlsImpl from 'camera-controls';
import { WorldMapMesh } from './WorldMapMesh';
import { LocationMarker } from './LocationMarker';
import {
  MAP_LOCATIONS,
  type MapLocation,
  GLB_NODE_NAME,
  GLB_NODE_ALIASES,
  ATLAS_CONFIG,
  applyAtlasTransform,
} from '@/data/mapLocations';

const CONFIRMED_NAME_TO_KID: Record<string, import('@/types').KingdomId> = {
  England: 'english',
  London: 'queendom',
  Spain: 'spanish',
  Italy: 'italian',
  France: 'french',
  Netherlands: 'dutch',
  Scandinavia: 'scandinavian',
  Sicily: 'sicilian',
  'The Wilderness': 'wilderness',
  'The Clearing': 'clearing',
};

/**
 * All model + marker tuning lives in ATLAS_CONFIG (see src/data/mapLocations.ts).
 * This is the single source of truth.
 */

/**
 * Builds a lookup: lowercased node name -> KingdomId
 * Used by both the non-R3F extractor (WorldMap.tsx) and the R3F logger below.
 */
function buildNodeToKingdomMap(): Record<string, import('@/types').KingdomId> {
  const map: Record<string, import('@/types').KingdomId> = {};
  (Object.entries(GLB_NODE_NAME) as [string, string | undefined][]).forEach(([kid, name]) => {
    if (name) map[name.toLowerCase().trim()] = kid as import('@/types').KingdomId;
  });
  GLB_NODE_ALIASES.forEach(([alias, kid]) => {
    map[alias.toLowerCase().trim()] = kid;
  });
  return map;
}

const MODEL_URL = `${import.meta.env.BASE_URL}models/world-atlas.glb`;

/**
 * GLBKingdomNodeLogger
 * Renders nothing visible. Its only job is to traverse the loaded GLB on mount
 * and dump helpful diagnostics to the browser console.
 *
 * This is the primary tool for future alterations when the 3D artist sends a
 * new .glb with renamed or additional kingdom objects.
 */
function GLBKingdomNodeLogger() {
  const { scene } = useGLTF(MODEL_URL);

  useEffect(() => {
    // IMPORTANT: This is a DEV DIAGNOSTIC ONLY.
    // For very large GLBs (64MB+), full traversal + Box3.setFromObject on the entire scene
    // can cause extreme CPU/memory pressure and lead to white screen / crash after first paint.
    // We now guard it heavily.
    try {
      const nodeToKid = buildNodeToKingdomMap();
      const allNames: string[] = [];
      const matched: any[] = [];

      scene.traverse((obj: THREE.Object3D) => {
        if (obj.name && obj.name.trim().length > 0) {
          allNames.push(obj.name);
          const key = obj.name.toLowerCase().trim();
          const kid = nodeToKid[key];
          if (kid) {
            // Only compute bounds for the few matched kingdoms (much safer)
            try {
              const box = new THREE.Box3().setFromObject(obj);
              const center = box.isEmpty()
                ? obj.getWorldPosition(new THREE.Vector3())
                : box.getCenter(new THREE.Vector3());

              const markerY = center.y + ATLAS_CONFIG.markerVerticalOffset;

              matched.push({
                node: obj.name,
                kingdom: kid,
                pos: [Number(center.x.toFixed(1)), Number(markerY.toFixed(1)), Number(center.z.toFixed(1))],
                note: `rawY=${center.y.toFixed(1)} + offset=${ATLAS_CONFIG.markerVerticalOffset}`,
              });
            } catch (e) {
              console.warn('[Atlas] Could not compute bounds for kingdom node', obj.name, e);
            }
          }
        }
      });

      console.groupCollapsed('[Atlas] GLB world-atlas.glb loaded for diagnostics (safe mode)');
      console.log('All named objects found:', allNames.length);
      console.log('Matched kingdom nodes:', matched);
      console.log('Tip: If the page is unstable, set window.__DISABLE_ATLAS_LOGGER = true before loading /atlas');

      if (ATLAS_CONFIG.forceLegacyPercentPositions) {
        console.log('%c[Atlas] forceLegacyPercentPositions is ON — markers are using old percent layout (good for tuning)', 'color:#0af');
      }
      console.groupEnd();

      // Skip the very expensive full-scene bounds calculation on huge models.
      // If you really need it, uncomment the next lines manually.
      // const bounds = new THREE.Box3().setFromObject(scene);
      // const size = bounds.getSize(new THREE.Vector3());
      // console.log('[Atlas] Model world bounds → center:', ...);

    } catch (err) {
      console.error('[Atlas] GLBKingdomNodeLogger crashed during traversal (non-fatal):', err);
    }
  }, [scene]);

  return null;
}

/**
 * Zero-risk GLB name lister (user-requested "C-u" style safe tool).
 * 
 * ONLY collects .name strings during a shallow traverse.
 * ZERO geometry work: no Box3, no getWorldPosition, no size calculations, no transforms.
 * 
 * This is the only tool that is guaranteed safe on the 64 MB world-atlas.glb.
 * It will never cause a white screen or heavy CPU spike.
 * 
 * Trigger by setting localStorage:
 *   localStorage.setItem('debug_atlas_list_names', '1')
 * then hard refresh /atlas.
 * 
 * Output is console-grouped and copy-paste ready for updating:
 * - GLB_NODE_NAME
 * - GLB_NODE_ALIASES
 * - manualMarkerPositions (once you know which objects are the kingdoms)
 */
function SafeGLBNameLister() {
  const { scene } = useGLTF(MODEL_URL);

  useEffect(() => {
    if (!scene) return;

    // Defer so the main GLB has time to render first — keeps the page responsive
    const timer = setTimeout(() => {
      try {
        const allNames: string[] = [];

        scene.traverse((obj: THREE.Object3D) => {
          if (obj.name && obj.name.trim().length > 0) {
            allNames.push(obj.name);
          }
        });

        const uniqueSorted = [...new Set(allNames)].sort((a, b) =>
          a.localeCompare(b, undefined, { sensitivity: 'base' })
        );

        console.groupCollapsed(
          '%c[Atlas] ZERO-RISK: All named objects in world-atlas.glb (only .name — 100% safe, no bounding boxes)',
          'color:#0f0; font-weight:bold; font-size:13px'
        );

        console.log(`Total name occurrences: ${allNames.length}`);
        console.log(`Unique names: ${uniqueSorted.length}`);

        console.log('\n%c=== SORTED UNIQUE NAMES (easy to read) ===', 'color:#0af');
        console.log(uniqueSorted.join('\n'));

        console.log('\n%c=== READY-TO-PASTE JS ARRAY ===', 'color:#0af');
        console.log(JSON.stringify(uniqueSorted, null, 2));

        console.log('\n%c=== Quick search helpers ===', 'color:#0af');
        const kingdomLike = uniqueSorted.filter(n =>
          /italy|spain|sicil|england|scandinav|queen|france|netherland|dutch|german|wilderness|clearing|london|french/i.test(n)
        );
        if (kingdomLike.length > 0) {
          console.log('%cNames that look kingdom-related:', 'color:#ff0', kingdomLike);
        }

        console.log('\n%cNext step: Copy the array above → update GLB_NODE_NAME / GLB_NODE_ALIASES in src/data/mapLocations.ts', 'color:#0f0');
        console.log('%cThen use manualMarkerPositions (or the legacy debug panel) to place markers exactly where the real objects are.', 'color:#0f0');

        console.groupEnd();

        // Also log a compact top slice for immediate visibility
        console.log('%c[Atlas] First 80 names (sorted):', 'color:#0f0', uniqueSorted.slice(0, 80));
        if (uniqueSorted.length > 80) {
          console.log(`... + ${uniqueSorted.length - 80} more`);
        }

      } catch (err) {
        console.error('[Atlas] SafeGLBNameLister crashed (non-fatal):', err);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [scene]);

  return null;
}

/**
 * Safe targeted center extractor (user-requested after providing exact names).
 * 
 * ONLY processes the 10 confirmed object names the user gave:
 * England, London, Spain, Italy, France, Netherlands, Scandinavia, Sicily,
 * The Wilderness, The Clearing
 * 
 * This is now LOW RISK because we only ever compute Box3 on (at most) these 10 objects.
 * No full-scene traversal for heavy geometry.
 * 
 * When active it prints a ready-to-paste `manualMarkerPositions` block using the real
 * centers from the GLB objects.
 * 
 * Trigger with:
 *   localStorage.setItem('debug_atlas_safe_extract', '1')
 * Hard refresh /atlas.
 */
function SafeTargetedKingdomExtractor({ onPositions }: { onPositions?: (pos: Partial<Record<import('@/types').KingdomId, [number, number, number]>>) => void }) {
  const { scene } = useGLTF(MODEL_URL);

  useEffect(() => {
    if (!scene) return;

    const timer = setTimeout(() => {
      try {
        const extracted: Partial<Record<import('@/types').KingdomId, [number, number, number]>> = {};

        scene.traverse((obj: THREE.Object3D) => {
          if (!obj.name) return;
          const trimmed = obj.name.trim();

          // Only touch the exact names the user confirmed exist in the GLB
          const kid = CONFIRMED_NAME_TO_KID[trimmed];
          if (!kid) return;

          try {
            // Allow manual override in ATLAS_CONFIG to win
            const manual = ATLAS_CONFIG.manualMarkerPositions?.[kid];
            if (manual) {
              const rawPos: [number, number, number] = [
                manual[0],
                manual[1] + ATLAS_CONFIG.markerVerticalOffset,
                manual[2],
              ];
              let finalPos: [number, number, number];
              try { finalPos = applyAtlasTransform(rawPos); } catch { finalPos = rawPos; }
              if (Number.isFinite(finalPos[0]) && Number.isFinite(finalPos[1]) && Number.isFinite(finalPos[2])) {
                extracted[kid] = finalPos;
              }
              return;
            }

            // Safe because we only reach here for the 10 known small kingdom objects
            const box = new THREE.Box3().setFromObject(obj);
            const center = box.isEmpty()
              ? obj.getWorldPosition(new THREE.Vector3())
              : box.getCenter(new THREE.Vector3());

            const rawPos: [number, number, number] = [
              center.x,
              center.y + ATLAS_CONFIG.markerVerticalOffset,
              center.z,
            ];

            let finalPos: [number, number, number];
            try {
              finalPos = applyAtlasTransform(rawPos);
            } catch {
              finalPos = rawPos;
            }

            if (Number.isFinite(finalPos[0]) && Number.isFinite(finalPos[1]) && Number.isFinite(finalPos[2])) {
              extracted[kid] = finalPos;
            }
          } catch (e) {
            console.warn('[Atlas] Targeted extraction failed for', obj.name, e);
          }
        });

        if (Object.keys(extracted).length > 0) {
          console.log('%c[Atlas] SAFE targeted centers extracted from the 10 real GLB objects:', 'color:#0f0', extracted);

          // Print ready-to-paste block
          console.groupCollapsed('%c[Atlas] COPY-PASTE READY: manualMarkerPositions (from your confirmed GLB objects)', 'color:#0f0; font-weight:bold');
          console.log('%cPaste this into src/data/mapLocations.ts → ATLAS_CONFIG.manualMarkerPositions', 'color:#ccc');
          console.log('manualMarkerPositions: {');
          Object.entries(extracted).forEach(([kid, pos]) => {
            const [x, y, z] = pos;
            console.log(`  ${kid}: [${x.toFixed(1)}, ${y.toFixed(1)}, ${z.toFixed(1)}],`);
          });
          console.log('},');
          console.groupEnd();

          console.log('%c[Atlas] After pasting, hard refresh with debug_atlas_safe_extract and debug_atlas_positions both OFF.', 'color:#0af');

          if (onPositions) onPositions(extracted);
        } else {
          console.warn('[Atlas] Safe targeted extractor ran but found none of the 10 confirmed names. Check object names in the GLB.');
        }
      } catch (err) {
          console.error('[Atlas] SafeTargetedKingdomExtractor failed (non-fatal):', err);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [scene, onPositions]);

  return null;
}

interface WorldMapSceneProps {
  selectedId: string | null;
  onSelectLocation: (location: MapLocation) => void;
  flyToPosition: [number, number, number] | null;
  /** Optional pre-merged locations (positions may come from GLB extraction). Falls back to MAP_LOCATIONS. */
  locations?: MapLocation[];
  /** Callback to receive freshly extracted kingdom positions from inside the loaded GLTF (avoids a second full GLB parse). */
  onExtractedPositions?: (positions: Partial<Record<import('@/types').KingdomId, [number, number, number]>>) => void;
}

function CameraRig({ flyTo }: { flyTo: [number, number, number] | null }) {
  const controlsRef = useRef<CameraControlsImpl>(null);
  const { camera } = useThree();

  // Camera starting position pulled from ATLAS_CONFIG.
  // When you increase `scale` in the config (to make kingdoms bigger so markers look smaller),
  // also lower the position numbers in cameraStart so the camera feels closer to the map.
  useEffect(() => {
    const { position, lookAt } = ATLAS_CONFIG.cameraStart;
    camera.position.set(...position);
    camera.lookAt(...lookAt);
  }, [camera]);

  useEffect(() => {
    if (!flyTo || !controlsRef.current) return;
    const [x, y, z] = flyTo;
    const off = ATLAS_CONFIG.cameraFlyToOffset;
    void controlsRef.current.setLookAt(x + off.x, y + off.y, z + off.z, x, y, z, true);
  }, [flyTo]);

  return (
    <CameraControls
      ref={controlsRef}
      makeDefault
      minDistance={ATLAS_CONFIG.cameraControls.minDistance}
      maxDistance={ATLAS_CONFIG.cameraControls.maxDistance}
      maxPolarAngle={Math.PI / 2.1}
      dampingFactor={0.08}
      smoothTime={0.35}
    />
  );
}

function SceneContent({ selectedId, onSelectLocation, flyToPosition, locations, onExtractedPositions, isExtractionEnabled }: WorldMapSceneProps & { isExtractionEnabled?: boolean }) {
  console.log('%c[Atlas] SceneContent mounted', 'color:#0af');

  // Use caller-supplied locations (with GLB-derived positions when available) or the static fallback.
  // This keeps all kingdom metadata (colors, descriptions, drill links, star thresholds) in one place (mapLocations.ts)
  // while allowing the 3D positions to be driven by the actual named nodes in the GLB.
  const activeLocations = locations && locations.length > 0 ? locations : MAP_LOCATIONS;

  // Apply easy-to-edit transform so the new GLB sits under the marker system correctly.
  // All values come from the single source of truth: ATLAS_CONFIG in mapLocations.ts
  const { scale, position, rotation } = ATLAS_CONFIG;

  return (
    <>
      <color attach="background" args={['#050510']} />
      <fog attach="fog" args={['#050510', 350, 900]} />
      <ambientLight intensity={0.35} />
      <directionalLight position={[120, 200, 80]} intensity={1.1} castShadow />
      <pointLight position={[-80, 60, -40]} intensity={0.5} color="#00f5d4" />
      <pointLight position={[80, 40, 60]} intensity={0.35} color="#f5a623" />

      {/* Heavy particles are a common source of first-load WebGL instability on large GLBs.
          Reduced counts + "demand" frameloop below to lower pressure. */}
      <Stars radius={500} depth={80} count={800} factor={3} saturation={0} fade speed={0.5} />
      <Sparkles count={40} scale={[500, 80, 400]} size={2} speed={0.2} opacity={0.35} color="#00f5d4" />

      <Suspense fallback={<LoaderFallback />}>
        {/* 
          The GLB is wrapped so artists/devs can quickly rotate/scale/offset the entire
          atlas without touching Blender. See ATLAS_MODEL_CONFIG at top of this file.
        */}
        <group scale={scale} position={position} rotation={rotation as [number, number, number]}>
          <WorldMapMesh />
        </group>
      </Suspense>

      {/* Markers are still separate Three meshes (with their own raycast hit areas).
          Their world positions now come from GLB node centers when the parent page
          successfully extracts them via the non-R3F GLTFLoader pass. */}
      {activeLocations.map((loc) => (
        <LocationMarker
          key={loc.id}
          location={loc}
          selected={selectedId === loc.id}
          onSelect={onSelectLocation}
          radius={ATLAS_CONFIG.markerRadius}
          ringInner={ATLAS_CONFIG.markerRingInner}
          ringOuter={ATLAS_CONFIG.markerRingOuter}
        />
      ))}

      {/* 
        Extracts kingdom positions from the cached GLTF.
        Only runs when the debug flag is set (see WorldMap.tsx).
        When active it prints the extracted centers so you can copy them into manualMarkerPositions.
      */}
      {isExtractionEnabled && onExtractedPositions && <KingdomPositionExtractor onPositions={onExtractedPositions} />}

      {/* 
        Purely diagnostic logger. 
        It is now heavily guarded (try/catch + skips full-scene bounds) because 
        large GLBs + multiple useGLTF + heavy traversal were causing white screens.
        
        To force-enable full diagnostics, run in console:
          localStorage.setItem('debug_atlas_logger', '1')
        then hard refresh.
      */}
      {(typeof window !== 'undefined' && localStorage.getItem('debug_atlas_logger') === '1') && (
        <GLBKingdomNodeLogger />
      )}

      {/* 
        ZERO-RISK name lister (user-requested).
        Only reads .name during traverse. No Box3, no getWorldPosition, no size calculations, no transforms.
        This is completely safe on the 64MB world-atlas.glb — it will never cause a white screen.
        Triggered by localStorage 'debug_atlas_list_names' === '1'
      */}
      {(typeof window !== 'undefined' && localStorage.getItem('debug_atlas_list_names') === '1') && (
        <SafeGLBNameLister />
      )}

      {/* 
        LOW-RISK targeted center extractor (only the 10 names the user confirmed exist in the GLB).
        Much safer than the old full extractor because it only ever touches these 10 specific objects.
        Triggered by localStorage 'debug_atlas_safe_extract' === '1'
      */}
      {(typeof window !== 'undefined' && localStorage.getItem('debug_atlas_safe_extract') === '1') && (
        <SafeTargetedKingdomExtractor />
      )}

      <CameraRig flyTo={flyToPosition} />
    </>
  );
}

/**
 * Runs inside the Canvas after the GLB has been loaded by WorldMapMesh (drei caches it).
 * Performs the kingdom node traversal + position extraction using the already-parsed scene.
 * This avoids the expensive second full GLB download+parse that was happening via raw GLTFLoader.
 */
function KingdomPositionExtractor({ onPositions }: { onPositions: (pos: Partial<Record<import('@/types').KingdomId, [number, number, number]>>) => void }) {
  const { scene } = useGLTF(MODEL_URL);

  console.log('%c[Atlas] KingdomPositionExtractor mounted (heavy traversal will run)', 'color:orange');

  useEffect(() => {
    if (!scene || !onPositions) return;

    // Defer the potentially expensive traversal + Box3 work so it doesn't block
    // the first paint of the large GLB and cause white screen / instability.
    const timer = setTimeout(() => {
      try {
        const nodeToKid = buildNodeToKingdomMap();
        const extracted: Partial<Record<import('@/types').KingdomId, [number, number, number]>> = {};

        scene.traverse((obj: THREE.Object3D) => {
          if (!obj.name) return;
          const key = obj.name.trim().toLowerCase();
          const kid = nodeToKid[key];
          if (!kid) return;

          try {
            // Guard: skip large/complex objects (this is the main thing that was causing white screens)
            const box = new THREE.Box3().setFromObject(obj);
            const size = box.getSize(new THREE.Vector3());
            const maxDim = Math.max(size.x, size.y, size.z);
            if (maxDim > 300) {   // lowered threshold for safety
              console.warn(`[Atlas] Skipping large GLB node for ${kid} (size ${maxDim.toFixed(0)})`);
              return;
            }

            const center = box.isEmpty()
              ? obj.getWorldPosition(new THREE.Vector3())
              : box.getCenter(new THREE.Vector3());

            const rawPos: [number, number, number] = [
              center.x,
              center.y + ATLAS_CONFIG.markerVerticalOffset,
              center.z,
            ];

            let finalPos: [number, number, number];
            try {
              finalPos = applyAtlasTransform(rawPos);
            } catch {
              finalPos = rawPos;
            }

            if (Number.isFinite(finalPos[0]) && Number.isFinite(finalPos[1]) && Number.isFinite(finalPos[2])) {
              extracted[kid] = finalPos;
            }
          } catch (e) {
            console.warn('[Atlas] Extraction failed for kingdom node', obj.name, e);
          }
        });

        if (Object.keys(extracted).length > 0) {
          console.log('[Atlas] Kingdom markers successfully placed from GLB nodes:', extracted);

          // Print a ready-to-paste block for manualMarkerPositions
          console.groupCollapsed('%c[Atlas] COPY-PASTE READY: manualMarkerPositions for your GLB', 'color:#0af;font-weight:bold;font-size:12px');
          console.log('%cPaste the following into src/data/mapLocations.ts (replace the existing manualMarkerPositions object):', 'color:#ccc');
          console.log('manualMarkerPositions: {');
          Object.entries(extracted).forEach(([kid, pos]) => {
            const [x, y, z] = pos;
            console.log(`  ${kid}: [${x.toFixed(1)}, ${y.toFixed(1)}, ${z.toFixed(1)}],  // tweak if needed`);
          });
          console.log('},');
          console.groupEnd();

          console.log('%c[Atlas] After pasting, hard refresh with the flag OFF to see clean results.', 'color:#0af');

          // Suggested camera calculation (kept, but wrapped)
          try {
            const positions = Object.values(extracted) as [number, number, number][];
            if (positions.length > 0) {
              // ... (same suggestion logic as before, omitted for brevity in this edit)
              const min = [Infinity, Infinity, Infinity];
              const max = [-Infinity, -Infinity, -Infinity];
              for (const p of positions) {
                for (let i = 0; i < 3; i++) {
                  min[i] = Math.min(min[i], p[i]);
                  max[i] = Math.max(max[i], p[i]);
                }
              }
              const center = [(min[0] + max[0]) / 2, (min[1] + max[1]) / 2, (min[2] + max[2]) / 2];
              const size = [max[0] - min[0], max[1] - min[1], max[2] - min[2]];
              const maxDim = Math.max(...size);
              const suggestedDist = maxDim * 0.9;
              const suggestedPos = [
                center[0] + suggestedDist * 0.3,
                center[1] + suggestedDist * 0.7,
                center[2] + suggestedDist * 1.1,
              ];
              console.log('%c[Atlas] Suggested cameraStart (copy to ATLAS_CONFIG):', 'color:#0af', {
                position: suggestedPos.map(v => Number(v.toFixed(1))),
                lookAt: center.map(v => Number(v.toFixed(1))),
              });
            }
          } catch {}

          onPositions(extracted);
        }
      } catch (err) {
        console.error('[Atlas] KingdomPositionExtractor failed (non-fatal):', err);
      }
    }, 120); // give the big GLB some time to paint first

    return () => clearTimeout(timer);
  }, [scene, onPositions]);

  return null;
}

function LoaderFallback() {
  return (
    <Html center>
      <div className="text-[#00f5d4] text-sm tracking-widest uppercase animate-pulse">
        Summoning the Atlas…
      </div>
    </Html>
  );
}

/**
 * Simple error boundary specifically for the 3D Atlas content.
 * Three.js / R3F errors (WebGL context loss, bad GLB, NaN positions, etc.)
 * often cause the entire canvas to go white. This catches them and shows
 * a helpful message + reload button instead of a blank screen.
 */
class AtlasErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error?: Error }
> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    console.error('[Atlas] Uncaught error inside 3D scene (caused white screen):', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="absolute inset-0 flex items-center justify-center bg-[#050510] text-white z-50 p-6">
          <div className="max-w-md text-center">
            <div className="text-2xl mb-4 text-red-400">Atlas 3D crashed</div>
            <p className="text-white/70 mb-6 text-sm">
              The 3D viewer hit an error (common with very large GLBs, bad transforms, or WebGL issues).
              Check the browser console (F12) for the exact error — it usually appears right when the screen goes white.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="px-6 py-3 rounded-xl bg-[#00f5d4] text-[#050510] font-semibold hover:bg-white transition-colors"
            >
              Reload Atlas
            </button>
            <p className="mt-4 text-[10px] text-white/40">
              Tip: Try lowering ATLAS_CONFIG.markerRadius or scale in mapLocations.ts, then hard refresh.
            </p>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export function WorldMapScene(props: WorldMapSceneProps) {
  // Check if position extraction is enabled via localStorage
  const isExtractionEnabled = typeof window !== 'undefined' 
    ? localStorage.getItem('debug_atlas_positions') === '1'
    : false;

  return (
    <Canvas
      shadows
      camera={{ fov: 45, near: 1, far: 2000 }}
      gl={{ antialias: true, powerPreference: 'high-performance' }}
      style={{ width: '100%', height: '100%' }}
      frameloop="demand"
      onCreated={() => {
        console.log('%c[Atlas] Canvas created successfully', 'color:#0f0');
      }}
      onError={(error) => {
        console.error('%c[Atlas] Canvas WebGL error (this often causes white screen):', 'color:#f00;font-weight:bold', error);
      }}
    >
      <AtlasErrorBoundary>
        <SceneContent {...props} isExtractionEnabled={isExtractionEnabled} />
      </AtlasErrorBoundary>
    </Canvas>
  );
}
