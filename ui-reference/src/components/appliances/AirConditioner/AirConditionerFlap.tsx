import { MathUtils } from "three";

type AirConditionerFlapProps = {
  angle: number;
};

export function AirConditionerFlap({ angle }: AirConditionerFlapProps) {
  return (
    <group
      name="AC_FrontFlap_Pivot"
      position={[0, -0.2, 0.24]}
      rotation={[MathUtils.degToRad(-angle), 0, 0]}
    >
      <mesh
        name="AC_FrontFlap"
        castShadow
        receiveShadow
        position={[0, -0.13, 0.035]}
      >
        <boxGeometry args={[2.12, 0.08, 0.1]} />
        <meshStandardMaterial color="#e5eef1" roughness={0.48} metalness={0.02} />
      </mesh>
    </group>
  );
}
