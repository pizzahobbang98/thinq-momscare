import type { CeilingMood, SceneState } from "../../../types/applianceTypes";
import { RefrigeratorBody } from "./RefrigeratorBody";
import { RefrigeratorDoors } from "./RefrigeratorDoors";
import { RefrigeratorScanEffect } from "./RefrigeratorScanEffect";

type RefrigeratorProps = {
  state: SceneState["refrigerator"];
  mood: CeilingMood;
};

export function Refrigerator({ state, mood }: RefrigeratorProps) {
  return (
    <group position={[-3.42, 0.12, -1.12]} rotation-y={0.05}>
      <RefrigeratorBody />
      <RefrigeratorDoors mood={mood} />
      <RefrigeratorScanEffect active={state.scanActive} />
    </group>
  );
}
