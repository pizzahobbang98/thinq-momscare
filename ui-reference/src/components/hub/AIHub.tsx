import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import { AdditiveBlending, type Mesh, type MeshBasicMaterial } from "three";
import type { SceneState } from "../../types/applianceTypes";

type AIHubProps = {
  hub: SceneState["hub"];
};

export function AIHub({ hub }: AIHubProps) {
  const ringRef = useRef<Mesh>(null);
  const dotRefs = useRef<Mesh[]>([]);

  void hub;

  useFrame(() => {
    if (!ringRef.current) return;
    ringRef.current.scale.setScalar(1);
    dotRefs.current.forEach((dot) => {
      const material = dot.material as MeshBasicMaterial;
      material.opacity = 0;
    });
  });

  return (
    <group position={[0, -1.04, -0.4]} name="ThinQ_ON_AIHub">
      <DisplayPedestal />
      <HubSignal active={false} />

      <group name="ThinQ_ON_Product" position={[0, 1.04, 0]}>
        <mesh castShadow receiveShadow>
          <cylinderGeometry args={[0.34, 0.35, 0.18, 96]} />
          <meshStandardMaterial color="#ecefeb" roughness={0.76} metalness={0.02} />
        </mesh>
        <mesh position={[0, -0.006, 0]}>
          <cylinderGeometry args={[0.342, 0.35, 0.105, 96, 1, true]} />
          <meshStandardMaterial color="#cfd7d4" roughness={0.9} metalness={0.01} />
        </mesh>
        <mesh position={[0, 0.095, 0]} rotation-x={Math.PI / 2}>
          <circleGeometry args={[0.295, 96]} />
          <meshStandardMaterial color="#fafbf8" roughness={0.44} />
        </mesh>
        <mesh ref={ringRef} position={[0, 0.101, 0]} rotation-x={Math.PI / 2}>
          <torusGeometry args={[0.288, 0.006, 10, 96]} />
          <meshStandardMaterial
            color="#a8ebf2"
            emissive="#42d7e8"
            emissiveIntensity={0.16}
          />
        </mesh>
        {[-0.055, 0, 0.055].map((x, index) => (
          <mesh
            key={x}
            ref={(mesh) => {
              if (mesh) dotRefs.current[index] = mesh;
            }}
            position={[x, 0.112, 0.045]}
          >
            <sphereGeometry args={[0.01, 12, 12]} />
            <meshBasicMaterial color="#63dce8" transparent opacity={0} />
          </mesh>
        ))}
      </group>
    </group>
  );
}

function HubSignal({ active }: { active: boolean }) {
  const refs = useRef<Mesh[]>([]);

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    refs.current.forEach((ring, i) => {
      if (!ring) return;
      const phase = (t * 0.45 + i / 3) % 1;
      const r = 0.3 + phase * 1.0;
      ring.scale.set(r, r, r);
      (ring.material as MeshBasicMaterial).opacity = active ? (1 - phase) * 0.5 : 0;
    });
  });

  return (
    <group position={[0, 1.12, 0]} rotation-x={-Math.PI / 2}>
      {[0, 1, 2].map((i) => (
        <mesh
          key={i}
          ref={(mesh) => {
            if (mesh) refs.current[i] = mesh;
          }}
        >
          <torusGeometry args={[1, 0.01, 8, 96]} />
          <meshBasicMaterial color="#5fe6e0" transparent opacity={0} depthWrite={false} blending={AdditiveBlending} />
        </mesh>
      ))}
    </group>
  );
}

function DisplayPedestal() {
  const walnut = "#5b4636";
  const drawer = "#634d3a";
  const dark = "#241c15";

  return (
    <group name="AIHub_Console">
      {/* recessed toe-kick */}
      <mesh position={[0, 0.07, 0]}>
        <boxGeometry args={[1.32, 0.1, 0.4]} />
        <meshStandardMaterial color={dark} roughness={0.7} />
      </mesh>
      {/* cabinet body */}
      <mesh castShadow receiveShadow position={[0, 0.5, 0]}>
        <boxGeometry args={[1.5, 0.82, 0.48]} />
        <meshStandardMaterial color={walnut} roughness={0.5} metalness={0.06} />
      </mesh>
      {/* overhanging top */}
      <mesh position={[0, 0.925, 0]}>
        <boxGeometry args={[1.58, 0.04, 0.53]} />
        <meshStandardMaterial color="#6c543f" roughness={0.4} metalness={0.1} />
      </mesh>
      {/* two clean drawer fronts with slim recessed finger pulls */}
      {[-0.375, 0.375].map((x) => (
        <group key={x} position={[x, 0.5, 0.242]}>
          <mesh castShadow>
            <boxGeometry args={[0.7, 0.72, 0.012]} />
            <meshStandardMaterial color={drawer} roughness={0.48} metalness={0.06} />
          </mesh>
          <mesh position={[0, 0.28, 0.008]}>
            <boxGeometry args={[0.46, 0.022, 0.012]} />
            <meshStandardMaterial color={dark} roughness={0.6} />
          </mesh>
        </group>
      ))}
    </group>
  );
}
