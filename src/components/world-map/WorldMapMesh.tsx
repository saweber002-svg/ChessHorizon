import { useEffect, useMemo } from 'react';
import { useLoader } from '@react-three/fiber';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';
import { TextureLoader, Mesh, MeshStandardMaterial, SRGBColorSpace } from 'three';

export function WorldMapMesh() {
  const obj = useLoader(OBJLoader, '/models/world-map.obj');
  const texture = useLoader(TextureLoader, '/models/world-map.jpg');

  useEffect(() => {
    texture.colorSpace = SRGBColorSpace;
  }, [texture]);

  const scene = useMemo(() => {
    const cloned = obj.clone();
    const material = new MeshStandardMaterial({
      map: texture,
      roughness: 0.85,
      metalness: 0.08,
    });

    cloned.traverse((child) => {
      if (child instanceof Mesh) {
        child.material = material;
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });

    return cloned;
  }, [obj, texture]);

  return <primitive object={scene} />;
}
