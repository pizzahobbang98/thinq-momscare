import { Html } from "@react-three/drei";

type IngredientOverlayProps = {
  visible: boolean;
  highlighted: string[];
  excluded: string[];
};

export function IngredientOverlay({ visible, highlighted, excluded }: IngredientOverlayProps) {
  if (!visible) return null;

  return (
    <Html position={[0.88, 0.22, 0.34]} distanceFactor={6.5} occlude={false} style={{ pointerEvents: "none" }}>
      <div className="device-card">
        <b>제외</b>
        <span>{excluded.join(" · ")}</span>
        <b>추천</b>
        <span>{highlighted.join(" · ")}</span>
      </div>
    </Html>
  );
}
