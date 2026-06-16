import type { SceneState } from "../../../types/applianceTypes";
import { StandbyMeScreen } from "./StandbyMeScreen";

type StandbyMeProps = {
  state: SceneState["standbyMe"];
};

export function StandbyMe({ state }: StandbyMeProps) {
  return (
    <group position={[1.65, -0.57, -0.35]} rotation-y={-0.16}>
      <StandbyMeScreen state={state} />

      <mesh position={[0, 0.28, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.045, 0.055, 1.42, 32]} />
        <meshStandardMaterial color="#dce6e7" roughness={0.48} />
      </mesh>

      <mesh position={[0, -0.43, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.4, 0.44, 0.08, 72]} />
        <meshStandardMaterial color="#e5eceb" roughness={0.56} />
      </mesh>
      <mesh position={[0, -0.385, 0]} rotation-x={Math.PI / 2}>
        <torusGeometry args={[0.36, 0.018, 12, 72]} />
        <meshStandardMaterial color="#f6f9f8" roughness={0.48} />
      </mesh>
      {Array.from({ length: 5 }, (_, index) => {
        const a = (Math.PI * 2 * index) / 5;
        return (
          <mesh
            key={index}
            position={[Math.cos(a) * 0.31, -0.49, Math.sin(a) * 0.31]}
            rotation-x={Math.PI / 2}
            castShadow
          >
            <cylinderGeometry args={[0.035, 0.035, 0.028, 16]} />
            <meshStandardMaterial color="#c8d2d1" roughness={0.48} />
          </mesh>
        );
      })}

    </group>
  );
}
