import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import { CanvasTexture, Color, RepeatWrapping, type Group, type MeshStandardMaterial } from "three";

type RefrigeratorLEDProps = {
  active: boolean;
};

const BARS = 18;

// LG MoodUP-style LED door panels: the two upper doors are a colour-changing
// LED surface with a music equaliser mode.
export function RefrigeratorLED({ active }: RefrigeratorLEDProps) {
  const panelRefs = useRef<MeshStandardMaterial[]>([]);
  const barRefs = useRef<Group[]>([]);
  const grid = useMemo(createLEDGrid, []);
  const color = useMemo(() => new Color(), []);

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    // slow colour change to show MoodUP's adjustable colour
    const hue = (t * 0.045) % 1;
    color.setHSL(hue, 0.6, 0.52);

    panelRefs.current.forEach((material) => {
      if (!material) return;
      material.emissive.copy(color);
      material.emissiveIntensity = active ? 1.55 : 1.05;
    });

    barRefs.current.forEach((bar, i) => {
      if (!bar) return;
      bar.visible = active;
      if (!active) return;
      const h = 0.18 + Math.abs(Math.sin(t * 6 + i * 0.55)) * Math.abs(Math.sin(t * 2.3 + i)) * 1.0;
      bar.scale.y = Math.max(0.04, h);
    });
  });

  return (
    <group name="Refrigerator_MoodUP_LED">
      {[-0.315, 0.315].map((x, i) => (
        <group key={x} position={[x, 0.58, 0.335]}>
          {/* emissive colour panel */}
          <mesh>
            <planeGeometry args={[0.58, 1.04]} />
            <meshStandardMaterial
              ref={(material) => {
                if (material) panelRefs.current[i] = material as MeshStandardMaterial;
              }}
              color="#0a0d10"
              emissive="#3a64ff"
              emissiveIntensity={1}
              roughness={0.34}
              metalness={0.12}
            />
          </mesh>
          {/* LED pixel grid */}
          <mesh position={[0, 0, 0.002]}>
            <planeGeometry args={[0.58, 1.04]} />
            <meshBasicMaterial map={grid} transparent color="#04070a" depthWrite={false} />
          </mesh>
        </group>
      ))}

      {/* music equaliser across the lower part of the LED wall */}
      {Array.from({ length: BARS }, (_, i) => {
        const x = -0.52 + (i / (BARS - 1)) * 1.04;
        return (
          <group
            key={i}
            ref={(group) => {
              if (group) barRefs.current[i] = group;
            }}
            position={[x, 0.16, 0.34]}
          >
            <mesh position={[0, 0.06, 0]}>
              <planeGeometry args={[0.024, 0.12]} />
              <meshStandardMaterial color="#0a0d10" emissive="#f4fbff" emissiveIntensity={2.4} />
            </mesh>
          </group>
        );
      })}
    </group>
  );
}

function createLEDGrid(): CanvasTexture {
  const size = 64;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  ctx.clearRect(0, 0, size, size);

  // dark grid lines, transparent cells → reads as an LED pixel matrix
  ctx.fillStyle = "rgba(3, 6, 9, 0.92)";
  const cell = 16;
  const gap = 3;
  for (let x = 0; x < size; x += cell) ctx.fillRect(x, 0, gap, size);
  for (let y = 0; y < size; y += cell) ctx.fillRect(0, y, size, gap);

  const texture = new CanvasTexture(canvas);
  texture.wrapS = RepeatWrapping;
  texture.wrapT = RepeatWrapping;
  texture.repeat.set(11, 20);
  return texture;
}
