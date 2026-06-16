import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import type { Group } from "three";
import type { ACMode } from "../../../types/appliance";
import { AirConditionerDisplay } from "./AirConditionerDisplay";
import { AirConditionerFlap } from "./AirConditionerFlap";
import { AirConditionerLouver } from "./AirConditionerLouver";
import { AirConditionerModel } from "./AirConditionerModel";
import { AirflowEffect } from "./AirflowEffect";
import { useAirConditionerAnimation } from "./useAirConditionerAnimation";

type AirConditionerProps = {
  isOn: boolean;
  mode?: ACMode;
  sequenceKey: number;
  position?: [number, number, number];
};

export function AirConditioner({
  isOn,
  mode = "default",
  sequenceKey,
  position = [0, 0, 0],
}: AirConditionerProps) {
  const rootRef = useRef<Group>(null);
  const animation = useAirConditionerAnimation({ isOn, mode, sequenceKey });

  useFrame((state) => {
    if (!rootRef.current) return;

    const t = state.clock.elapsedTime;
    rootRef.current.position.y =
      position[1] + (animation.isRunning ? Math.sin(t * 2) * 0.002 : 0);
  });

  return (
    <group
      ref={rootRef}
      name="AC_Root"
      position={position}
      rotation={[0.03, 0, 0]}
      scale={1.05}
    >
      <AirConditionerModel />
      <AirConditionerDisplay
        opacity={animation.displayOpacity}
        ledIntensity={animation.ledIntensity}
        displayBrightness={animation.displayBrightness}
        temperature={animation.temperature}
        state={animation.state}
      />
      <AirConditionerFlap angle={animation.flapAngle} />
      <AirConditionerLouver
        angle={animation.louverAngle}
        isRunning={animation.isRunning}
        swingRange={animation.swingRange}
      />
      <AirflowEffect
        opacity={animation.airflowOpacity}
        speed={animation.airflowSpeed}
        direction={animation.airflowDirection}
      />
    </group>
  );
}
