import { useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { Float, Html } from '@react-three/drei';
import type { Mesh } from 'three';
import type { MapLocation } from '@/data/mapLocations';

interface LocationMarkerProps {
  location: MapLocation;
  selected: boolean;
  onSelect: (location: MapLocation) => void;
}

export function LocationMarker({ location, selected, onSelect }: LocationMarkerProps) {
  const ringRef = useRef<Mesh>(null);
  const [hovered, setHovered] = useState(false);

  useFrame((state) => {
    if (ringRef.current) {
      ringRef.current.rotation.z = state.clock.elapsedTime * 0.4;
      const scale = selected ? 1.35 : hovered ? 1.2 : 1;
      ringRef.current.scale.setScalar(scale + Math.sin(state.clock.elapsedTime * 2) * 0.05);
    }
  });

  const active = selected || hovered;

  return (
    <Float speed={1.5} rotationIntensity={0.1} floatIntensity={0.4}>
      <group position={location.position}>
        <mesh
          onClick={(e) => {
            e.stopPropagation();
            onSelect(location);
          }}
          onPointerOver={(e) => {
            e.stopPropagation();
            setHovered(true);
            document.body.style.cursor = 'pointer';
          }}
          onPointerOut={() => {
            setHovered(false);
            document.body.style.cursor = 'default';
          }}
        >
          <sphereGeometry args={[4.5, 16, 16]} />
          <meshStandardMaterial
            color={location.color}
            emissive={location.color}
            emissiveIntensity={active ? 1.2 : 0.5}
            transparent
            opacity={active ? 0.95 : 0.75}
          />
        </mesh>

        <mesh ref={ringRef} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[6, 7.5, 32]} />
          <meshBasicMaterial color={location.color} transparent opacity={active ? 0.7 : 0.35} />
        </mesh>

        {active && (
          <Html distanceFactor={120} center style={{ pointerEvents: 'none' }}>
            <MarkerLabel name={location.name} color={location.color} />
          </Html>
        )}
      </group>
    </Float>
  );
}

function MarkerLabel({ name, color }: { name: string; color: string }) {
  return (
    <div
      style={{
        transform: 'translate(-50%, -140%)',
        whiteSpace: 'nowrap',
        padding: '4px 10px',
        borderRadius: 8,
        background: 'rgba(10,10,31,0.85)',
        border: `1px solid ${color}66`,
        color: '#fff',
        fontSize: 11,
        fontWeight: 600,
        letterSpacing: '0.06em',
        textTransform: 'uppercase',
        boxShadow: `0 0 20px ${color}44`,
      }}
    >
      {name}
    </div>
  );
}
