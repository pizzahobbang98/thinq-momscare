import { Html } from "@react-three/drei";
import type { SceneState } from "../../../types/applianceTypes";

type WasherCareOverlayProps = {
  state: SceneState["washerTower"];
};

export function WasherCareOverlay({ state }: WasherCareOverlayProps) {
  if (!state.groupedAlert && !state.partnerShareVisible) return null;

  return (
    <Html position={[0.78, 0.3, 0.36]} distanceFactor={6.5} occlude={false} style={{ pointerEvents: "none" }}>
      <div className="device-card">
        <b>의류 케어 유지</b>
        <span>지금 바로 꺼내지 않아도 괜찮아요.</span>
        {state.groupedAlert && <span>건조 완료 · 환기 · 청소 확인을 하나로 묶었어요.</span>}
        {state.partnerShareVisible && <span>파트너에게 함께 확인 카드가 준비됐어요.</span>}
      </div>
    </Html>
  );
}
