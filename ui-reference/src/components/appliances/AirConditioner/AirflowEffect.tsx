import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import { AdditiveBlending, CatmullRomCurve3, Vector3, type Group } from "three";
import type { AirflowDirection } from "../../../types/appliance";

type AirflowEffectProps = {
  opacity: number;
  speed: number;
  direction: AirflowDirection;
};

const directionOffsets: Record<AirflowDirection, Vector3[]> = {
  front_soft: [
    new Vector3(-0.78, -0.36, 0.24),
    new Vector3(-0.55, -0.62, 0.82),
    new Vector3(-0.25, -0.82, 1.42),
    new Vector3(0.05, -0.92, 2.05),
  ],
  upward_soft: [
    new Vector3(-0.65, -0.34, 0.22),
    new Vector3(-0.35, -0.18, 0.8),
    new Vector3(-0.05, -0.04, 1.38),
    new Vector3(0.18, -0.12, 1.95),
  ],
  circulation: [
    new Vector3(-0.65, -0.36, 0.24),
    new Vector3(-0.08, -0.72, 0.86),
    new Vector3(0.58, -0.48, 1.42),
    new Vector3(0.2, -0.2, 2.0),
  ],
  breeze: [
    new Vector3(-0.8, -0.35, 0.22),
    new Vector3(-0.55, -0.58, 0.7),
    new Vector3(0.22, -0.7, 1.42),
    new Vector3(0.72, -0.46, 2.18),
  ],
};

export function AirflowEffect({ opacity, speed, direction }: AirflowEffectProps) {
  const groupRef = useRef<Group>(null);
  const particleRef = useRef<Group>(null);

  const curves = useMemo(() => {
    const base = directionOffsets[direction];
    return [-0.16, 0.02, 0.18].map((offset) =>
      new CatmullRomCurve3(
        base.map((point) => point.clone().add(new Vector3(offset, offset * 0.16, 0)))
      )
    );
  }, [direction]);

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    if (groupRef.current) {
      groupRef.current.visible = opacity > 0.01;
      groupRef.current.children.forEach((child, index) => {
        child.position.y = Math.sin(t * (1.5 + speed) + index) * 0.018;
      });
    }
    if (particleRef.current) {
      particleRef.current.children.forEach((child, index) => {
        const drift = (t * (0.18 + speed * 0.38) + index * 0.23) % 1;
        child.position.z = 0.18 + drift * 1.85;
        child.position.y = -0.38 - Math.sin(drift * Math.PI) * 0.42;
        child.position.x = -0.72 + ((index % 7) / 6) * 1.44;
      });
    }
  });

  return (
    <group name="AC_Airflow" ref={groupRef}>
      {curves.map((curve, index) => (
        <mesh key={index}>
          <tubeGeometry args={[curve, 48, 0.007, 8, false]} />
          <meshBasicMaterial
            color="#b9f4ff"
            transparent
            opacity={opacity * (0.55 - index * 0.08)}
            blending={AdditiveBlending}
            depthWrite={false}
          />
        </mesh>
      ))}

      <group ref={particleRef}>
        {Array.from({ length: 22 }, (_, index) => (
          <mesh key={index}>
            <sphereGeometry args={[0.008 + (index % 3) * 0.003, 8, 8]} />
            <meshBasicMaterial
              color="#d7fbff"
              transparent
              opacity={opacity * 0.52}
              blending={AdditiveBlending}
              depthWrite={false}
            />
          </mesh>
        ))}
      </group>
    </group>
  );
}
