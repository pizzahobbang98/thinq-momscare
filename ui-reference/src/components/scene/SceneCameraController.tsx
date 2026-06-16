import { OrbitControls } from "@react-three/drei";

export function SceneCameraController() {
  return (
    <OrbitControls
      enablePan={false}
      minDistance={5.4}
      maxDistance={8.6}
      minPolarAngle={0.84}
      maxPolarAngle={1.56}
      target={[0, 0.38, -0.25]}
    />
  );
}
