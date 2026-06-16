import type { RoutineConfig } from "../../types/demoTypes";
import { koText } from "../../data/koText";

type ModeTitleOverlayProps = {
  activeRoutine?: RoutineConfig;
};

export function ModeTitleOverlay({ activeRoutine }: ModeTitleOverlayProps) {
  return (
    <div className="mode-title">
      <span>{activeRoutine?.title ?? koText.appTitle}</span>
      <small>{activeRoutine?.spokenTrigger ?? koText.idleSubtitle}</small>
    </div>
  );
}
