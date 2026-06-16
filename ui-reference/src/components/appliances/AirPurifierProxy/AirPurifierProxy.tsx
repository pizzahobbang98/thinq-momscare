import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import type { Group } from "three";
import type { SceneState } from "../../../types/applianceTypes";

type AirPurifierProxyProps = {
  state: SceneState["airPurifier"];
};

export function AirPurifierProxy({ state }: AirPurifierProxyProps) {
  const particlesRef = useRef<Group>(null);

  useFrame((clock) => {
    if (!particlesRef.current) return;
    particlesRef.current.children.forEach((child, index) => {
      child.position.y = 0.48 + ((clock.clock.elapsedTime * 0.18 + index * 0.21) % 0.75);
      child.position.x = Math.sin(clock.clock.elapsedTime + index) * (state.level === "sleep" ? 0.06 : 0.16);
    });
  });

  return (
    <group position={[-0.72, -0.55, -1.03]} rotation-y={0.04}>
      <mesh castShadow receiveShadow>
        <boxGeometry args={[0.46, 0.9, 0.36]} />
        <meshStandardMaterial color="#eef4f2" roughness={0.52} />
      </mesh>
      <mesh position={[0, 0.34, 0.19]}>
        <boxGeometry args={[0.34, 0.12, 0.025]} />
        <meshStandardMaterial color="#202f33" emissive="#5bdce8" emissiveIntensity={state.power ? 0.5 : 0} />
      </mesh>
      {state.power && (
        <group ref={particlesRef}>
          {Array.from({ length: 12 }, (_, index) => (
            <mesh key={index} position={[0, 0.5, 0.08]}>
              <sphereGeometry args={[0.01, 8, 8]} />
              <meshBasicMaterial color="#ccf8ff" transparent opacity={state.level === "sleep" ? 0.22 : 0.42} />
            </mesh>
          ))}
        </group>
      )}
    </group>
  );
}
