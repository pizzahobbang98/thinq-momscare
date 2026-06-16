import { useFrame, useLoader } from "@react-three/fiber";
import { useRef } from "react";
import { LinearFilter, SRGBColorSpace, TextureLoader, type Mesh } from "three";

// Appetizing food visual for 입덧(nausea) mode. Slow Ken-Burns zoom gives it a
// "video" feel; can be swapped for a real VideoTexture later.
const FOOD_IMAGE =
  "https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=1000&q=80";

export function FoodRecommendationContent() {
  const ref = useRef<Mesh>(null);
  const texture = useLoader(TextureLoader, FOOD_IMAGE);
  texture.colorSpace = SRGBColorSpace;
  texture.minFilter = LinearFilter;
  texture.magFilter = LinearFilter;

  useFrame((state) => {
    if (!ref.current) return;
    const t = state.clock.elapsedTime;
    const s = 1.0 + (0.5 + 0.5 * Math.sin(t * 0.16)) * 0.05;
    ref.current.scale.set(s, s, 1);
    ref.current.position.x = Math.sin(t * 0.1) * 0.02;
  });

  return (
    <group position={[0, 0, 0.045]}>
      <mesh ref={ref}>
        <planeGeometry args={[1.34, 0.78]} />
        <meshBasicMaterial map={texture} toneMapped={false} />
      </mesh>
    </group>
  );
}
