import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import { MathUtils, type Group } from "three";

type AirConditionerLouverProps = {
  angle: number;
  isRunning: boolean;
  swingRange: number;
};

export function AirConditionerLouver({
  angle,
  isRunning,
  swingRange,
}: AirConditionerLouverProps) {
  const pivotRef = useRef<Group>(null);

  useFrame((state) => {
    if (!pivotRef.current) return;

    const swing = isRunning
      ? Math.sin(state.clock.elapsedTime * 1.45) * swingRange
      : 0;
    pivotRef.current.rotation.x = MathUtils.degToRad(-(angle + swing));
  });

  return (
    <group
      ref={pivotRef}
      name="AC_Louver_Pivot"
      position={[0, -0.31, 0.24]}
    >
      {[-0.62, 0, 0.62].map((x) => (
        <mesh
          key={x}
          name="AC_Louver"
          castShadow
          receiveShadow
          position={[x, -0.035, 0.01]}
        >
          <boxGeometry args={[0.5, 0.035, 0.18]} />
          <meshStandardMaterial color="#c9d8dd" roughness={0.52} />
        </mesh>
      ))}
    </group>
  );
}
