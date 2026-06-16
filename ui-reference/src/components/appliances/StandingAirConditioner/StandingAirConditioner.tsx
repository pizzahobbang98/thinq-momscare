import type { SceneState } from "../../../types/applianceTypes";
import { ACAirflowEffect } from "./ACAirflowEffect";
import { ACBody } from "./ACBody";
import { ACLouver } from "./ACLouver";
import { ACRoundDisplay } from "./ACRoundDisplay";
import { ACVentDoor } from "./ACVentDoor";
import { useACAnimation } from "./useACAnimation";

type StandingAirConditionerProps = {
  state: SceneState["airConditioner"];
};

export function StandingAirConditioner({ state }: StandingAirConditionerProps) {
  const values = useACAnimation(state);

  return (
    <group name="AC_Root" position={[3.45, -0.02, -1.15]} rotation-y={-0.28}>
      <ACBody openAmount={values.ventDoorAngle / 38} />
      <ACRoundDisplay brightness={values.displayBrightness} mode={state.mode} />
      <ACVentDoor angle={values.ventDoorAngle} />
      <ACLouver angle={values.louverAngle} swingRange={state.swingRange} />
      <ACAirflowEffect opacity={values.airflowOpacity} speed={values.airflowSpeed} mode={state.mode} />
    </group>
  );
}
