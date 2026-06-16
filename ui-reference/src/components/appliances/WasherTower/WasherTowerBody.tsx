import { RoundedBox } from "@react-three/drei";

export function WasherTowerBody() {
  return (
    <group name="WasherTower_Body">
      <RoundedBox args={[0.94, 2.58, 0.62]} radius={0.035} smoothness={8} castShadow receiveShadow>
        <meshStandardMaterial color="#e7e8e5" roughness={0.54} metalness={0.02} />
      </RoundedBox>

      <SectionPanel y={0.61} height={1.05} color="#758178" />
      <SectionPanel y={-0.74} height={1.12} color="#f2f0ea" />

      <mesh name="WasherTower_SeamTop" position={[0, 0.02, 0.324]}>
        <boxGeometry args={[0.82, 0.008, 0.012]} />
        <meshStandardMaterial color="#d4d0c8" roughness={0.58} />
      </mesh>
      <mesh name="WasherTower_SeamBottom" position={[0, -0.16, 0.324]}>
        <boxGeometry args={[0.82, 0.008, 0.012]} />
        <meshStandardMaterial color="#d4d0c8" roughness={0.58} />
      </mesh>

      <DoorAssembly y={0.64} radius={0.305} drumScale={0.84} />
      <DoorAssembly y={-0.73} radius={0.345} drumScale={1} />

      <ControlBand />
      <SidePanel x={-0.485} />
      <SidePanel x={0.485} />

      <mesh name="WasherTower_BottomPlinth" position={[0, -1.28, 0]}>
        <boxGeometry args={[0.84, 0.075, 0.56]} />
        <meshStandardMaterial color="#d8d4cb" roughness={0.6} metalness={0.01} />
      </mesh>
      <mesh name="WasherTower_ShadowGap" position={[0, -1.32, 0.01]}>
        <boxGeometry args={[0.78, 0.018, 0.52]} />
        <meshStandardMaterial color="#171615" roughness={0.8} />
      </mesh>
    </group>
  );
}

function SectionPanel({ y, height, color }: { y: number; height: number; color: string }) {
  return (
    <mesh position={[0, y, 0.321]} receiveShadow>
      <boxGeometry args={[0.82, height, 0.026]} />
      <meshStandardMaterial color={color} roughness={0.47} metalness={0.018} />
    </mesh>
  );
}

function DoorAssembly({ y, radius }: { y: number; radius: number; drumScale: number }) {
  return (
    <group name={y > 0 ? "WasherTower_DryerDoor" : "WasherTower_WasherDoor"} position={[0, y, 0.345]}>
      <mesh position={[0, 0, -0.01]}>
        <circleGeometry args={[radius + 0.035, 96]} />
        <meshStandardMaterial color="#dedbd3" roughness={0.38} metalness={0.06} />
      </mesh>
      <mesh>
        <torusGeometry args={[radius, 0.038, 18, 128]} />
        <meshStandardMaterial color="#0b0b0d" roughness={0.2} metalness={0.48} />
      </mesh>
      <mesh position={[0, 0, 0.02]}>
        <circleGeometry args={[radius * 0.74, 96]} />
        <meshStandardMaterial color="#15181c" transparent opacity={0.86} roughness={0.12} metalness={0.14} />
      </mesh>
      <mesh position={[radius * 0.37, radius * 0.42, 0.03]}>
        <circleGeometry args={[0.03, 24]} />
        <meshStandardMaterial color="#ffffff" transparent opacity={0.26} roughness={0.18} />
      </mesh>
    </group>
  );
}

function ControlBand() {
  return (
    <group name="WasherTower_CenterControlPanel" position={[0, -0.07, 0.35]}>
      <RoundedBox args={[0.72, 0.12, 0.035]} radius={0.018} smoothness={6}>
        <meshStandardMaterial color="#090a0c" roughness={0.24} metalness={0.1} />
      </RoundedBox>
      <mesh position={[0, 0, 0.023]}>
        <boxGeometry args={[0.22, 0.04, 0.012]} />
        <meshStandardMaterial color="#101820" emissive="#eafcff" emissiveIntensity={0.12} roughness={0.28} />
      </mesh>
      {[-0.27, -0.2, 0.2, 0.27].map((x) => (
        <mesh key={x} position={[x, 0, 0.026]}>
          <circleGeometry args={[0.011, 18]} />
          <meshStandardMaterial color="#f2f8fa" emissive="#dffbff" emissiveIntensity={0.08} roughness={0.38} />
        </mesh>
      ))}
    </group>
  );
}

function SidePanel({ x }: { x: number }) {
  return (
    <group position={[x, -0.03, 0.02]} rotation-y={Math.PI / 2}>
      <mesh receiveShadow>
        <boxGeometry args={[0.56, 2.34, 0.018]} />
        <meshStandardMaterial color="#ebe8e1" roughness={0.58} metalness={0.018} />
      </mesh>
      {[-0.24, 0.24].map((y) => (
        <mesh key={y} position={[0.18, y, 0.014]}>
          <boxGeometry args={[0.008, 0.9, 0.008]} />
          <meshStandardMaterial color="#d2cdc4" roughness={0.62} />
        </mesh>
      ))}
    </group>
  );
}
