import { useFrame } from "@react-three/fiber";
import { useState } from "react";
import type { SceneState } from "../../../types/applianceTypes";

export function useACAnimation(ac: SceneState["airConditioner"]) {
  const [current, setCurrent] = useState({
    displayBrightness: 0,
    ventDoorAngle: 0,
    louverAngle: 0,
    airflowOpacity: 0,
    airflowSpeed: 0,
  });

  useFrame((_, delta) => {
    const ease = 1 - Math.pow(0.001, delta);
    setCurrent((value) => {
      const settle = ac.power ? Math.sin(performance.now() * 0.006) * 0.8 : 0;
      return {
        displayBrightness: value.displayBrightness + (ac.displayBrightness - value.displayBrightness) * ease,
        ventDoorAngle: value.ventDoorAngle + (ac.ventDoorAngle - value.ventDoorAngle) * ease,
        louverAngle: value.louverAngle + (ac.louverAngle + settle - value.louverAngle) * ease,
        airflowOpacity: value.airflowOpacity + (ac.airflowOpacity - value.airflowOpacity) * ease,
        airflowSpeed: value.airflowSpeed + (ac.airflowSpeed - value.airflowSpeed) * ease,
      };
    });
  });

  return current;
}
