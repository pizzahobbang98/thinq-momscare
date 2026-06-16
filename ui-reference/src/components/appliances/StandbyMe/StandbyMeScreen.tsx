import type { SceneState } from "../../../types/applianceTypes";
import { DestinationContent } from "./DestinationContent";
import { FoodRecommendationContent } from "./FoodRecommendationContent";

type StandbyMeScreenProps = {
  state: SceneState["standbyMe"];
};

export function StandbyMeScreen({ state }: StandbyMeScreenProps) {
  const visible = state.power && state.content !== "off";

  return (
    <group position={[0, 1.0, 0.05]}>
      <mesh castShadow receiveShadow>
        <boxGeometry args={[1.34, 0.78, 0.05]} />
        <meshStandardMaterial color="#f5f6f5" roughness={0.42} metalness={0.04} />
      </mesh>
      <mesh position={[0, 0, -0.03]} castShadow receiveShadow>
        <boxGeometry args={[1.3, 0.74, 0.022]} />
        <meshStandardMaterial color="#d6c6b6" roughness={0.58} />
      </mesh>
      <mesh position={[0, 0, 0.03]}>
        <boxGeometry args={[1.3, 0.74, 0.024]} />
        <meshStandardMaterial
          color={visible ? "#111a1f" : "#0d1216"}
          emissive={visible ? "#67d5e7" : "#000000"}
          emissiveIntensity={state.screenBrightness * 0.12}
          roughness={0.42}
        />
      </mesh>

      {visible && state.content === "food_recommendation" && <FoodRecommendationContent />}
      {visible && (state.content === "forest" || state.content === "ocean" || state.content === "city") && (
        <DestinationContent content={state.content} />
      )}
    </group>
  );
}
