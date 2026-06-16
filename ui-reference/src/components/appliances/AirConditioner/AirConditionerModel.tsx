export function AirConditionerModel() {
  return (
    <group name="AC_Body">
      <mesh castShadow receiveShadow position={[0, 0, 0]}>
        <boxGeometry args={[2.36, 0.55, 0.42]} />
        <meshStandardMaterial
          color="#edf3f5"
          roughness={0.58}
          metalness={0.05}
        />
      </mesh>

      <mesh castShadow receiveShadow position={[0, -0.18, 0.18]}>
        <boxGeometry args={[2.22, 0.14, 0.1]} />
        <meshStandardMaterial color="#cfdbdf" roughness={0.64} />
      </mesh>

      <mesh name="AC_InnerVent" position={[0, -0.31, 0.1]}>
        <boxGeometry args={[2.02, 0.1, 0.08]} />
        <meshStandardMaterial color="#263640" roughness={0.86} />
      </mesh>

      <mesh position={[0, 0.31, 0.015]}>
        <boxGeometry args={[2.18, 0.035, 0.4]} />
        <meshStandardMaterial color="#f9fcfd" roughness={0.43} />
      </mesh>
    </group>
  );
}
