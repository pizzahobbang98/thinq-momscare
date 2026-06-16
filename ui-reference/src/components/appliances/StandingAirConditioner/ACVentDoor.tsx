import { MathUtils } from "three";
import { AC_OUTLET } from "./ACBody";

type ACVentDoorProps = {
  angle: number;
};

// Full-height cover panel over each outlet, hinged on the outer edge and sitting
// flush on the body front. Closed = no black visible; open = swings outward.
export function ACVentDoor({ angle }: ACVentDoorProps) {
  const open = MathUtils.clamp(angle / 38, 0, 1);

  return (
    <group name="AC_OutletCoverDoors">
      <CoverDoor side={-1} open={open} />
      <CoverDoor side={1} open={open} />
    </group>
  );
}

function CoverDoor({ side, open }: { side: -1 | 1; open: number }) {
  const { x, top, bottom, width, coverZ } = AC_OUTLET;
  const height = top - bottom;
  const centerY = (top + bottom) / 2;
  const halfW = width / 2 + 0.014;
  const hingeX = side * (x + halfW);
  const swing = side * MathUtils.degToRad(70 * open);

  return (
    <group position={[hingeX, centerY, coverZ]} rotation-y={swing}>
      <mesh position={[-side * halfW, 0, 0]} castShadow receiveShadow>
        <boxGeometry args={[halfW * 2, height + 0.04, 0.018]} />
        <meshStandardMaterial color="#f2f4f5" roughness={0.5} metalness={0.02} />
      </mesh>
    </group>
  );
}
