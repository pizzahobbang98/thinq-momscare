import { Line } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import type { Group, Vector3Tuple } from "three";
import type { ACSceneMode } from "../../../types/applianceTypes";

type ACAirflowEffectProps = {
  opacity: number;
  speed: number;
  mode: ACSceneMode;
};

const LANES_PER_SIDE = 4;
const SAMPLES = 36;
const START_Y = [0.55, 0.28, 0.0, -0.28];
const FLOOR_Y = -0.92;

type Lane = { points: Vector3Tuple[] };

// Realistic cool-air behaviour drawn as clean laminar streamlines. Motion/
// direction is shown by flowing dashes along the lines — no round particles.
export function ACAirflowEffect({ opacity, speed, mode }: ACAirflowEffectProps) {
  const rootRef = useRef<Group>(null);
  // drei <Line> refs (Line2) — we animate their dashOffset for the flow effect
  const lineRefs = useRef<any[]>([]);
  const lanes = useMemo<Lane[]>(() => buildLanes(mode), [mode]);

  useFrame((state) => {
    const visible = opacity > 0.02;
    if (rootRef.current) rootRef.current.visible = visible;
    if (!visible) return;

    const offset = -state.clock.elapsedTime * (0.35 + speed * 0.5);
    lineRefs.current.forEach((line) => {
      if (line?.material) line.material.dashOffset = offset;
    });
  });

  return (
    <group ref={rootRef} name="AC_AirflowEffect">
      {lanes.map((lane, index) => (
        <Line
          key={index}
          ref={(line) => {
            if (line) lineRefs.current[index] = line;
          }}
          points={lane.points}
          color="#bdeeff"
          lineWidth={2.6}
          transparent
          opacity={Math.min(0.62, opacity * 0.85)}
          dashed
          dashSize={0.13}
          gapSize={0.09}
          depthWrite={false}
        />
      ))}
    </group>
  );
}

function buildLanes(mode: ACSceneMode): Lane[] {
  return ([-1, 1] as const).flatMap((side) =>
    Array.from({ length: LANES_PER_SIDE }, (_, lane) => ({
      points: Array.from({ length: SAMPLES }, (_, i) =>
        sampleAirflow(mode, side, lane, i / (SAMPLES - 1))
      ),
    }))
  );
}

function sampleAirflow(mode: ACSceneMode, side: number, lane: number, t: number): Vector3Tuple {
  const reach = mode === "breeze" ? 2.2 : mode === "circulation" ? 1.7 : 1.1;
  const forward = mode === "breeze" ? 1.3 : mode === "circulation" ? 1.0 : 0.7;
  const startY = START_Y[lane];

  const x = side * (0.2 + reach * (1 - Math.pow(1 - t, 1.8)));
  const fall = Math.min(1, t / 0.7);
  const y = startY - (startY - FLOOR_Y) * Math.pow(fall, 1.6);
  const z = 0.16 + forward * t + (lane - (LANES_PER_SIDE - 1) / 2) * 0.14;

  return [x, y, z];
}
