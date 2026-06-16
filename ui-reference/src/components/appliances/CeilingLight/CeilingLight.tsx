import type { SceneState } from "../../../types/applianceTypes";
import { useLightAnimation } from "./useLightAnimation";
import { getLightingPalette } from "../../scene/lightingPalette";

type CeilingLightProps = {
  state: SceneState["ceilingLight"];
};

export function CeilingLight({ state }: CeilingLightProps) {
  const brightness = useLightAnimation(state);
  const palette = getLightingPalette(state);
  const lit = brightness.current;

  return (
    <group position={[0, 2.78, -0.4]}>
      {/* canopy plate flush against the ceiling */}
      <mesh position={[0, 0.07, 0]}>
        <cylinderGeometry args={[0.46, 0.46, 0.05, 48]} />
        <meshStandardMaterial color="#e7e8e5" roughness={0.6} metalness={0.1} />
      </mesh>
      {/* fixture body / rim */}
      <mesh castShadow>
        <cylinderGeometry args={[0.56, 0.58, 0.1, 64]} />
        <meshStandardMaterial color="#f2f3f0" roughness={0.5} metalness={0.18} />
      </mesh>
      {/* frosted diffuser — the visibly glowing lamp face */}
      <mesh position={[0, -0.06, 0]}>
        <cylinderGeometry args={[0.5, 0.53, 0.04, 64]} />
        <meshStandardMaterial
          color="#fcfdfb"
          emissive={palette.moodColor}
          emissiveIntensity={lit * 2.6}
          roughness={0.38}
        />
      </mesh>
    </group>
  );
}
