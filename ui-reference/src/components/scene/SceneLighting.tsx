import type { SceneState } from "../../types/applianceTypes";
import { getLightingPalette } from "./lightingPalette";

type SceneLightingProps = {
  ceilingLight: SceneState["ceilingLight"];
};

export function SceneLighting({ ceilingLight }: SceneLightingProps) {
  const palette = getLightingPalette(ceilingLight);

  return (
    <>
      {/* low neutral base so nothing is pitch black */}
      <ambientLight intensity={palette.ambient} color={palette.color} />

      {/* neutral key — gives form and is the only shadow caster */}
      <directionalLight
        castShadow
        position={[3.2, 4.6, 3.4]}
        intensity={palette.key}
        color="#fff5ec"
        shadow-mapSize={[2048, 2048]}
        shadow-bias={-0.0004}
      />

      {/* daylight coming through the back window (cool, from behind the wall) */}
      <directionalLight position={[0.4, 2.2, -5]} intensity={palette.day} color="#eaf2ff" />

      {/* ceiling lamp = the dominant, LOCALIZED mood source. Bright pool under the
          fixture falling off into the corners reads as real light, not a flat wash. */}
      <pointLight position={[0, 2.64, -0.4]} intensity={palette.ceiling} color={palette.moodColor} distance={13} decay={1.5} />

      <hemisphereLight args={[palette.color, palette.floor, palette.ambient * 0.5]} />
    </>
  );
}
