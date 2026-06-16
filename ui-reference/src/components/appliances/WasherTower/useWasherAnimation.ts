import type { SceneState } from "../../../types/applianceTypes";

export function useWasherAnimation(state: SceneState["washerTower"]) {
  return {
    panelGlow: state.panelOn ? 0.35 : 0,
    drumActive: state.drumActive,
    isCareHold: state.status === "care_hold",
  };
}
