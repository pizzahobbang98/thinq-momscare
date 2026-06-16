import { Html } from "@react-three/drei";

type SceneLabelProps = {
  text: string;
  position: [number, number, number];
  active?: boolean;
};

export function SceneLabel({ text, position, active = false }: SceneLabelProps) {
  return (
    <Html position={position} center distanceFactor={7} occlude={false} style={{ pointerEvents: "none" }}>
      <div className={active ? "scene-label active" : "scene-label"}>{text}</div>
    </Html>
  );
}
