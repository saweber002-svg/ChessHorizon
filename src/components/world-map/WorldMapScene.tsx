import { Suspense, useEffect, useRef } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { CameraControls, Stars, Sparkles, Html } from '@react-three/drei';
import type CameraControlsImpl from 'camera-controls';
import { WorldMapMesh } from './WorldMapMesh';
import { LocationMarker } from './LocationMarker';
import { MAP_LOCATIONS, type MapLocation } from '@/data/mapLocations';

interface WorldMapSceneProps {
  selectedId: string | null;
  onSelectLocation: (location: MapLocation) => void;
  flyToPosition: [number, number, number] | null;
}

function CameraRig({ flyTo }: { flyTo: [number, number, number] | null }) {
  const controlsRef = useRef<CameraControlsImpl>(null);
  const { camera } = useThree();

  useEffect(() => {
    camera.position.set(0, 280, 420);
    camera.lookAt(0, 0, 0);
  }, [camera]);

  useEffect(() => {
    if (!flyTo || !controlsRef.current) return;
    const [x, y, z] = flyTo;
    void controlsRef.current.setLookAt(x + 40, y + 55, z + 70, x, y, z, true);
  }, [flyTo]);

  return (
    <CameraControls
      ref={controlsRef}
      makeDefault
      minDistance={80}
      maxDistance={650}
      maxPolarAngle={Math.PI / 2.1}
      dampingFactor={0.08}
      smoothTime={0.35}
    />
  );
}

function SceneContent({ selectedId, onSelectLocation, flyToPosition }: WorldMapSceneProps) {
  return (
    <>
      <color attach="background" args={['#050510']} />
      <fog attach="fog" args={['#050510', 350, 900]} />
      <ambientLight intensity={0.35} />
      <directionalLight position={[120, 200, 80]} intensity={1.1} castShadow />
      <pointLight position={[-80, 60, -40]} intensity={0.5} color="#00f5d4" />
      <pointLight position={[80, 40, 60]} intensity={0.35} color="#f5a623" />

      <Stars radius={500} depth={80} count={3000} factor={3} saturation={0} fade speed={0.5} />
      <Sparkles count={120} scale={[500, 80, 400]} size={2} speed={0.2} opacity={0.35} color="#00f5d4" />

      <Suspense fallback={<LoaderFallback />}>
        <WorldMapMesh />
      </Suspense>

      {MAP_LOCATIONS.map((loc) => (
        <LocationMarker
          key={loc.id}
          location={loc}
          selected={selectedId === loc.id}
          onSelect={onSelectLocation}
        />
      ))}

      <CameraRig flyTo={flyToPosition} />
    </>
  );
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

export function WorldMapScene(props: WorldMapSceneProps) {
  return (
    <Canvas
      shadows
      camera={{ fov: 45, near: 1, far: 2000 }}
      gl={{ antialias: true, powerPreference: 'high-performance' }}
      style={{ width: '100%', height: '100%' }}
    >
      <SceneContent {...props} />
    </Canvas>
  );
}
