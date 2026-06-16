import type { SceneState } from "../../../types/applianceTypes";

export function useStandbyMeAnimation(state: SceneState["standbyMe"]) {
  return {
    active: state.power && state.content !== "off",
    dimmed: state.content === "sleep_fade",
  };
}
