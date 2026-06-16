import { Html } from "@react-three/drei";
import type { ACState } from "../../../types/appliance";

type AirConditionerDisplayProps = {
  opacity: number;
  ledIntensity: number;
  displayBrightness: number;
  temperature: string;
  state: ACState;
};

export function AirConditionerDisplay({
  opacity,
  ledIntensity,
  displayBrightness,
  temperature,
  state,
}: AirConditionerDisplayProps) {
  return (
    <group name="AC_Display" position={[0.72, 0.06, 0.225]}>
      <mesh>
        <boxGeometry args={[0.46, 0.16, 0.018]} />
        <meshStandardMaterial
          color="#13252b"
          emissive="#163d46"
          emissiveIntensity={displayBrightness * 0.35}
          roughness={0.4}
          transparent
          opacity={0.72}
        />
      </mesh>
      <HtmlText text={`${temperature}°`} opacity={opacity} position={[-0.09, -0.035, 0.025]} />
      <mesh name="AC_LED" position={[-0.39, 0, 0.012]}>
        <sphereGeometry args={[0.025, 18, 18]} />
        <meshStandardMaterial
          color="#d8fbff"
          emissive="#56e0f4"
          emissiveIntensity={ledIntensity * 1.7}
          transparent
          opacity={0.2 + ledIntensity * 0.8}
        />
      </mesh>
      <HtmlText
        text={state === "running" ? "COOL" : "ON"}
        opacity={opacity * 0.58}
        position={[0.1, -0.029, 0.025]}
        scale={0.68}
      />
    </group>
  );
}

type HtmlTextProps = {
  text: string;
  opacity: number;
  position: [number, number, number];
  scale?: number;
};

function HtmlText({
  text,
  opacity,
  position,
  scale = 0.86,
}: HtmlTextProps) {
  return (
    <Html
      position={position}
      transform
      distanceFactor={2.1}
      occlude={false}
      style={{
        pointerEvents: "none",
      }}
    >
      <span
        style={{
          color: `rgba(145, 239, 255, ${opacity})`,
          display: "block",
          fontFamily: "Inter, Arial, sans-serif",
          fontSize: 18,
          fontWeight: 700,
          letterSpacing: 0,
          lineHeight: 1,
          opacity,
          textShadow: `0 0 8px rgba(89, 225, 245, ${opacity})`,
          transform: `scale(${scale})`,
          transformOrigin: "left top",
          whiteSpace: "nowrap",
        }}
      >
        {text}
      </span>
    </Html>
  );
}
