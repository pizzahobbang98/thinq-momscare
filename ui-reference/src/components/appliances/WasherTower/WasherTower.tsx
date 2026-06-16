import type { SceneState } from "../../../types/applianceTypes";
import { WasherDrum } from "./WasherDrum";
import { WasherStatusPanel } from "./WasherStatusPanel";
import { WasherTowerBody } from "./WasherTowerBody";
import { useWasherAnimation } from "./useWasherAnimation";

type WasherTowerProps = {
  state: SceneState["washerTower"];
};

export function WasherTower({ state }: WasherTowerProps) {
  const animation = useWasherAnimation(state);

  return (
    <group position={[-2.08, 0.32, -1.18]} rotation-y={0.03}>
      <WasherTowerBody />
      <WasherDrum active={animation.drumActive} />
      <WasherStatusPanel state={state} />
      {state.panelOn && (
        <pointLight position={[0, -0.07, 0.55]} color="#dff5ff" intensity={0.5} distance={1.7} decay={2} />
      )}
    </group>
  );
}
