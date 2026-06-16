import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import { AdditiveBlending, type Group } from "three";

type WasherDrumProps = {
  active: boolean;
};

// Visible "care cycle" treatment on the doors when the care mode is running:
// a soft glow, a slow-rotating gentle drum motion, and a status ring.
export function WasherDrum({ active }: WasherDrumProps) {
  const spinRef = useRef<Group>(null);

  useFrame((_, delta) => {
    if (spinRef.current && active) spinRef.current.rotation.z += delta * 0.7;
  });

  if (!active) return null;

  return (
    <group name="WasherTower_CareMotion">
      {/* washer (bottom) door — active care cycle */}
      <group position={[0, -0.73, 0.372]}>
        <mesh>
          <circleGeometry args={[0.235, 48]} />
          <meshBasicMaterial color="#6fe0cb" transparent opacity={0.24} depthWrite={false} blending={AdditiveBlending} />
        </mesh>
        <group ref={spinRef}>
          {[0, 1, 2, 3].map((k) => (
            <mesh key={k} rotation-z={(k * Math.PI) / 4}>
              <planeGeometry args={[0.48, 0.012]} />
              <meshBasicMaterial color="#cffff4" transparent opacity={0.3} depthWrite={false} blending={AdditiveBlending} />
            </mesh>
          ))}
        </group>
        <mesh>
          <ringGeometry args={[0.225, 0.24, 48]} />
          <meshBasicMaterial color="#86ecd9" transparent opacity={0.45} depthWrite={false} blending={AdditiveBlending} />
        </mesh>
      </group>

      {/* dryer (top) door — soft care glow */}
      <group position={[0, 0.64, 0.372]}>
        <mesh>
          <circleGeometry args={[0.2, 48]} />
          <meshBasicMaterial color="#6fe0cb" transparent opacity={0.16} depthWrite={false} blending={AdditiveBlending} />
        </mesh>
      </group>
    </group>
  );
}
