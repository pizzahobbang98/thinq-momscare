import { Text } from "@react-three/drei";
import type { SceneState } from "../../../types/applianceTypes";

type WasherStatusPanelProps = {
  state: SceneState["washerTower"];
};

// On-device screen only shows glanceable numerics/icons — Korean copy lives in
// the HTML care overlay (the default 3D font has no Hangul glyphs).
export function WasherStatusPanel({ state }: WasherStatusPanelProps) {
  if (!state.panelOn) return null;

  const careHold = state.status === "care_hold";
  const accent = careHold ? "#5ad8bf" : "#7fd2ff";
  const progress = careHold ? 1 : 0.45;
  const time = careHold ? "DONE" : "0:42";

  return (
    <group position={[0, -0.07, 0.375]}>
      <mesh>
        <planeGeometry args={[0.34, 0.082]} />
        <meshStandardMaterial color="#05080a" emissive={accent} emissiveIntensity={0.16} roughness={0.28} metalness={0.1} />
      </mesh>

      <Text position={[-0.145, 0.014, 0.004]} fontSize={0.03} color="#eafcff" anchorX="left" anchorY="middle" renderOrder={20}>
        {time}
      </Text>

      {/* status dot */}
      <mesh position={[0.142, 0.016, 0.004]}>
        <circleGeometry args={[0.0085, 20]} />
        <meshBasicMaterial color={accent} />
      </mesh>

      {/* progress track + fill */}
      <mesh position={[0, -0.022, 0.004]}>
        <planeGeometry args={[0.29, 0.007]} />
        <meshBasicMaterial color="#16242a" />
      </mesh>
      <mesh position={[-0.145 + 0.145 * progress, -0.022, 0.005]}>
        <planeGeometry args={[0.29 * progress, 0.007]} />
        <meshBasicMaterial color={accent} />
      </mesh>
    </group>
  );
}
