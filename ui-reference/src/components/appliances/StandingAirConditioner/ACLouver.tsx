import { useFrame } from "@react-three/fiber";
import { useRef, type RefObject } from "react";
import { MathUtils, type Group } from "three";
import { AC_OUTLET } from "./ACBody";

type ACLouverProps = {
  angle: number;
  swingRange: number;
};

// Solid, well-separated horizontal vanes in their own z-layer (between the dark
// backing and the cover). Swing is small + eased so vanes never cross a layer.
const VANES = 8;
const TOP = 0.96;
const BOTTOM = -0.36;

export function ACLouver({ angle, swingRange }: ACLouverProps) {
  const leftRef = useRef<Group>(null);
  const rightRef = useRef<Group>(null);
  const open = MathUtils.clamp(angle / 38, 0, 1);

  useFrame((state, delta) => {
    if (open <= 0.02) return;
    const swing = Math.sin(state.clock.elapsedTime * 0.6) * Math.min(swingRange, 4);
    const base = 2 + angle * 0.06;
    const ease = 1 - Math.pow(0.0001, delta);
    if (leftRef.current)
      leftRef.current.rotation.y = MathUtils.lerp(leftRef.current.rotation.y, MathUtils.degToRad(base + swing), ease);
    if (rightRef.current)
      rightRef.current.rotation.y = MathUtils.lerp(rightRef.current.rotation.y, MathUtils.degToRad(-base - swing), ease);
  });

  if (open <= 0.02) return null;

  return (
    <>
      <LouverBank refGroup={leftRef} side={-1} name="AC_LeftLouverBank" />
      <LouverBank refGroup={rightRef} side={1} name="AC_RightLouverBank" />
    </>
  );
}

function LouverBank({
  refGroup,
  side,
  name,
}: {
  refGroup: RefObject<Group | null>;
  side: -1 | 1;
  name: string;
}) {
  const step = (TOP - BOTTOM) / (VANES - 1);

  return (
    <group ref={refGroup} name={name} position={[side * AC_OUTLET.x, 0, AC_OUTLET.vaneZ]}>
      {Array.from({ length: VANES }, (_, index) => (
        <mesh key={index} position={[0, TOP - index * step, 0]} rotation-x={-0.3}>
          <boxGeometry args={[AC_OUTLET.width * 0.82, 0.018, 0.012]} />
          <meshStandardMaterial color="#1c2024" roughness={0.5} metalness={0.12} />
        </mesh>
      ))}
    </group>
  );
}
