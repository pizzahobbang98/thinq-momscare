import type { SceneState } from "../../types/applianceTypes";
import { koText } from "../../data/koText";

type DeviceStatusMiniProps = {
  state: SceneState;
};

export function DeviceStatusMini({ state }: DeviceStatusMiniProps) {
  return (
    <div className="device-status-mini">
      {koText.status(state).map((text) => (
        <span key={text}>{text}</span>
      ))}
    </div>
  );
}
