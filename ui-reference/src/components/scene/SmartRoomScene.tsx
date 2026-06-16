import type { SceneState } from "../../types/applianceTypes";
import { CeilingLight } from "../appliances/CeilingLight/CeilingLight";
import { Refrigerator } from "../appliances/Refrigerator/Refrigerator";
import { StandbyMe } from "../appliances/StandbyMe/StandbyMe";
import { StandingAirConditioner } from "../appliances/StandingAirConditioner/StandingAirConditioner";
import { WasherTower } from "../appliances/WasherTower/WasherTower";
import { AIHub } from "../hub/AIHub";
import { RoomEnvironment } from "./RoomEnvironment";

type SmartRoomSceneProps = {
  state: SceneState;
};

export function SmartRoomScene({ state }: SmartRoomSceneProps) {
  return (
    <group>
      <RoomEnvironment light={state.ceilingLight} />
      <CeilingLight state={state.ceilingLight} />
      <Refrigerator state={state.refrigerator} mood={state.ceilingLight.mood} />
      <WasherTower state={state.washerTower} />
      <AIHub hub={state.hub} />
      <StandbyMe state={state.standbyMe} />
      <StandingAirConditioner state={state.airConditioner} />
    </group>
  );
}
