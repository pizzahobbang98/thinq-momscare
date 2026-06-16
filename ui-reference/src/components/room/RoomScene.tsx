import type { ACMode } from "../../types/appliance";
import { AirConditioner } from "../appliances/AirConditioner/AirConditioner";

type RoomSceneProps = {
  isOn: boolean;
  mode: ACMode;
  sequenceKey: number;
};

export function RoomScene({ isOn, mode, sequenceKey }: RoomSceneProps) {
  return (
    <group>
      <mesh receiveShadow rotation-x={-Math.PI / 2} position={[0, -1.04, 0]}>
        <planeGeometry args={[8.5, 7.5]} />
        <meshStandardMaterial color="#dbe5e8" roughness={0.74} />
      </mesh>

      <mesh receiveShadow position={[0, 1.1, -1.18]}>
        <boxGeometry args={[8.6, 4.3, 0.12]} />
        <meshStandardMaterial color="#f7fafb" roughness={0.82} />
      </mesh>

      <mesh position={[-2.65, 0.68, -1.08]}>
        <boxGeometry args={[0.08, 2.45, 0.08]} />
        <meshStandardMaterial color="#b9c7cc" roughness={0.45} />
      </mesh>
      <mesh position={[2.65, 0.68, -1.08]}>
        <boxGeometry args={[0.08, 2.45, 0.08]} />
        <meshStandardMaterial color="#b9c7cc" roughness={0.45} />
      </mesh>

      <AirConditioner
        isOn={isOn}
        mode={mode}
        sequenceKey={sequenceKey}
        position={[0, 1.35, -0.92]}
      />
    </group>
  );
}
