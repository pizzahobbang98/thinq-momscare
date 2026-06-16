type LightGlowProps = {
  brightness: number;
  color: string;
};

export function LightGlow({ brightness, color }: LightGlowProps) {
  return (
    <group>
      <mesh position={[0, -0.05, 0]} rotation-x={Math.PI / 2}>
        <circleGeometry args={[1.45, 96]} />
        <meshBasicMaterial color={color} transparent opacity={brightness * 0.34} depthWrite={false} />
      </mesh>
      <mesh position={[0, -0.08, 0]} rotation-x={Math.PI / 2}>
        <circleGeometry args={[2.6, 96]} />
        <meshBasicMaterial color={color} transparent opacity={brightness * 0.12} depthWrite={false} />
      </mesh>
    </group>
  );
}
