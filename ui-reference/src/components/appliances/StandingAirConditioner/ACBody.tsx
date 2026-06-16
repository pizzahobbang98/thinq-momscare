import { MathUtils } from "three";

type ACBodyProps = {
  openAmount: number;
};

// Shared outlet geometry. Everything is layered in FRONT of the body face with
// real z-gaps (backing < vanes < cover) so no solids intersect → no flicker.
export const AC_OUTLET = {
  x: 0.2,
  width: 0.07,
  top: 1.08,
  bottom: -0.46,
  backingZ: 0.14,
  vaneZ: 0.162,
  coverZ: 0.188,
};

export function ACBody({ openAmount }: ACBodyProps) {
  const open = MathUtils.clamp(openAmount, 0, 1);
  const { x, width, top, bottom, backingZ } = AC_OUTLET;
  const height = top - bottom;
  const centerY = (top + bottom) / 2;

  return (
    <group name="AC_Body">
      {/* slim tower */}
      <mesh castShadow receiveShadow>
        <boxGeometry args={[0.5, 2.3, 0.28]} />
        <meshStandardMaterial color="#f2f4f5" roughness={0.56} metalness={0.02} />
      </mesh>

      <mesh name="AC_FrontPlate" position={[0, 0.05, 0.149]}>
        <boxGeometry args={[0.3, 1.86, 0.016]} />
        <meshStandardMaterial color="#fbfbfb" roughness={0.48} />
      </mesh>

      {/* thin dark backing behind the louvers — only present when open */}
      {open > 0.01 &&
        ([-1, 1] as const).map((side) => (
          <mesh key={side} position={[side * x, centerY, backingZ]}>
            <boxGeometry args={[width, height, 0.008]} />
            <meshStandardMaterial color="#0d1115" roughness={0.62} metalness={0.05} />
          </mesh>
        ))}

      <mesh position={[0, -0.56, 0.158]}>
        <boxGeometry args={[0.4, 0.008, 0.012]} />
        <meshStandardMaterial color="#cdd3d5" roughness={0.58} />
      </mesh>
      <mesh position={[0, -0.86, 0.157]}>
        <boxGeometry args={[0.38, 0.42, 0.014]} />
        <meshStandardMaterial color="#f2f0ec" roughness={0.62} />
      </mesh>
      <mesh position={[0, -1.065, 0]}>
        <boxGeometry args={[0.48, 0.055, 0.28]} />
        <meshStandardMaterial color="#dce1e2" roughness={0.58} />
      </mesh>
    </group>
  );
}
