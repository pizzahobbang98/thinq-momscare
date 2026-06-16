const FLOOR_Y = -1.02;

// Minimal real-home accent. (Sofa / coffee table / window removed per request.)
export function RoomFurniture() {
  return (
    <group name="Room_Furniture">
      <Plant />
    </group>
  );
}

function Plant() {
  // Tall snake-plant in the front-left as a soft foreground accent.
  return (
    <group position={[-3.05, FLOOR_Y, 1.45]}>
      <mesh position={[0, 0.24, 0]} castShadow>
        <cylinderGeometry args={[0.21, 0.16, 0.48, 28]} />
        <meshStandardMaterial color="#d9cfc0" roughness={0.7} />
      </mesh>
      <mesh position={[0, 0.47, 0]}>
        <cylinderGeometry args={[0.2, 0.2, 0.04, 28]} />
        <meshStandardMaterial color="#2b2620" roughness={0.9} />
      </mesh>
      {Array.from({ length: 9 }, (_, i) => {
        const a = (Math.PI * 2 * i) / 9;
        const r = 0.07 + (i % 2) * 0.04;
        const h = 0.85 + (i % 3) * 0.22;
        return (
          <mesh
            key={i}
            position={[Math.cos(a) * r, 0.48 + h / 2, Math.sin(a) * r]}
            rotation-z={Math.cos(a) * 0.18}
            rotation-x={Math.sin(a) * 0.18}
            castShadow
          >
            <boxGeometry args={[0.05, h, 0.12]} />
            <meshStandardMaterial color={i % 2 === 0 ? "#4f7a4d" : "#5c8a55"} roughness={0.8} />
          </mesh>
        );
      })}
    </group>
  );
}
