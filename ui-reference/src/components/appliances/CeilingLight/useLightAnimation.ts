import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import type { SceneState } from "../../../types/applianceTypes";

export function useLightAnimation(light: SceneState["ceilingLight"]) {
  const brightness = useRef(light.brightness);

  useFrame((_, delta) => {
    const ease = 1 - Math.pow(0.001, delta);
    brightness.current += (light.brightness - brightness.current) * ease;
  });

  return brightness;
}
