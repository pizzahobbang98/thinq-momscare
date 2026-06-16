import { RoundedBox } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import { Color, type MeshStandardMaterial } from "three";
import type { CeilingMood } from "../../../types/applianceTypes";

type RefrigeratorDoorsProps = {
  mood: CeilingMood;
};

// MoodUP-style: each of the 4 door panels takes a colour from the active mode
// and transitions smoothly when the routine changes.
const PANELS: Record<CeilingMood, [string, string, string, string]> = {
  neutral: ["#e9e3d6", "#e4ded0", "#e7e1d3", "#e1dbcd"],
  calm: ["#ffd6b0", "#ffc79c", "#ffcfa6", "#ffbf92"],
  sleep: ["#c2925f", "#b58656", "#bd8c5b", "#a97c4e"],
  forest: ["#9ed47e", "#79c065", "#8ecb73", "#6db35b"],
  ocean: ["#8fd0f0", "#5cb4e8", "#7ac6ee", "#4aa6df"],
  city: ["#ffc279", "#ff9f49", "#ffb461", "#f5923f"],
};

const GLOW: Record<CeilingMood, number> = {
  neutral: 0.1,
  calm: 0.42,
  sleep: 0.28,
  forest: 0.5,
  ocean: 0.52,
  city: 0.5,
};

const POSITIONS: Array<[number, number]> = [
  [-0.315, 0.58],
  [0.315, 0.58],
  [-0.315, -0.6],
  [0.315, -0.6],
];

export function RefrigeratorDoors({ mood }: RefrigeratorDoorsProps) {
  const matRefs = useRef<MeshStandardMaterial[]>([]);
  const targets = useMemo(() => PANELS[mood].map((c) => new Color(c)), [mood]);
  const targetGlow = GLOW[mood];

  useFrame((_, delta) => {
    const ease = 1 - Math.pow(0.04, delta);
    matRefs.current.forEach((material, i) => {
      if (!material) return;
      material.color.lerp(targets[i], ease);
      material.emissive.lerp(targets[i], ease);
      material.emissiveIntensity += (targetGlow - material.emissiveIntensity) * ease;
    });
  });

  return (
    <group name="Refrigerator_MoodPanels">
      {POSITIONS.map(([x, y], i) => (
        <RoundedBox
          key={i}
          args={[0.6, 1.06, 0.04]}
          radius={0.018}
          smoothness={5}
          position={[x, y, 0.315]}
          castShadow
          receiveShadow
        >
          <meshStandardMaterial
            ref={(material) => {
              if (material) matRefs.current[i] = material as MeshStandardMaterial;
            }}
            color="#e9e3d6"
            emissive="#e9e3d6"
            emissiveIntensity={0.1}
            roughness={0.4}
            metalness={0.12}
          />
        </RoundedBox>
      ))}

      <mesh name="Refrigerator_CenterVerticalSeam" position={[0, 0, 0.34]}>
        <boxGeometry args={[0.018, 2.14, 0.018]} />
        <meshStandardMaterial color="#cdc6ba" roughness={0.5} />
      </mesh>
      <mesh name="Refrigerator_CenterHorizontalSeam" position={[0, 0.01, 0.342]}>
        <boxGeometry args={[1.18, 0.018, 0.018]} />
        <meshStandardMaterial color="#cdc6ba" roughness={0.5} />
      </mesh>

      {/* recessed vertical handle grooves near the center seam */}
      {(
        [
          [-0.06, 0.58],
          [0.06, 0.58],
          [-0.06, -0.6],
          [0.06, -0.6],
        ] as const
      ).map(([x, y], index) => (
        <mesh key={index} position={[x, y, 0.337]}>
          <boxGeometry args={[0.012, 0.78, 0.02]} />
          <meshStandardMaterial color="#23211e" roughness={0.5} metalness={0.12} />
        </mesh>
      ))}
    </group>
  );
}
