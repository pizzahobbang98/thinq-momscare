import { RoundedBox } from "@react-three/drei";

export function RefrigeratorBody() {
  return (
    <group name="Refrigerator_Body">
      <RoundedBox args={[1.34, 2.38, 0.54]} radius={0.035} smoothness={8} castShadow receiveShadow>
        <meshStandardMaterial color="#e9e1d6" roughness={0.62} metalness={0.025} />
      </RoundedBox>
      <mesh name="Refrigerator_RecessShadow" position={[0, 0, 0.286]}>
        <boxGeometry args={[1.2, 2.16, 0.018]} />
        <meshStandardMaterial color="#cfc5b8" roughness={0.7} />
      </mesh>
      <mesh name="Refrigerator_TopCap" position={[0, 1.2, 0.02]}>
        <boxGeometry args={[1.24, 0.055, 0.44]} />
        <meshStandardMaterial color="#f6efe5" roughness={0.58} />
      </mesh>
      <mesh name="Refrigerator_LowPlinth" position={[0, -1.17, 0]}>
        <boxGeometry args={[1.12, 0.075, 0.56]} />
        <meshStandardMaterial color="#cfc4b5" roughness={0.64} />
      </mesh>
    </group>
  );
}
