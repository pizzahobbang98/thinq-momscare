import { useMemo } from "react";
import { CanvasTexture, SRGBColorSpace } from "three";

type ACRoundDisplayProps = {
  brightness: number;
  mode: string;
};

type ModeMeta = { accent: string; label: string; arc: number; temp: string };

const MODE_META: Record<string, ModeMeta> = {
  sleep: { accent: "#9f8bff", label: "수면", arc: 0.5, temp: "24" },
  circulation: { accent: "#53d9e9", label: "순환", arc: 0.68, temp: "24.5" },
  breeze: { accent: "#3fe0b4", label: "산들바람", arc: 0.82, temp: "25" },
};

export function ACRoundDisplay({ brightness, mode }: ACRoundDisplayProps) {
  const meta = MODE_META[mode] ?? MODE_META.circulation;
  const active = brightness > 0.03;
  const texture = useMemo(
    () => createDisplayTexture(meta),
    [meta.accent, meta.label, meta.temp, meta.arc]
  );

  return (
    <group name="AC_RoundDisplay" position={[0, 0.78, 0.166]}>
      {/* dark glass backing */}
      <mesh>
        <circleGeometry args={[0.146, 80]} />
        <meshStandardMaterial color="#08121a" roughness={0.36} metalness={0.25} />
      </mesh>
      {/* emissive rim that glows into the room */}
      <mesh position={[0, 0, 0.002]}>
        <torusGeometry args={[0.15, 0.006, 14, 90]} />
        <meshStandardMaterial
          color={meta.accent}
          emissive={meta.accent}
          emissiveIntensity={active ? 1.5 : 0.1}
          roughness={0.3}
          transparent
          opacity={active ? 1 : 0.25}
        />
      </mesh>
      {/* self-lit screen face */}
      <mesh position={[0, 0, 0.006]}>
        <circleGeometry args={[0.142, 80]} />
        <meshBasicMaterial map={texture} transparent opacity={active ? Math.min(1, brightness * 1.5) : 0} depthWrite={false} />
      </mesh>
    </group>
  );
}

function createDisplayTexture(meta: ModeMeta): CanvasTexture {
  const size = 256;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  const cx = size / 2;
  const cy = size / 2;

  // Dial background
  const bg = ctx.createRadialGradient(cx, cy - 24, 12, cx, cy, 128);
  bg.addColorStop(0, "#15333d");
  bg.addColorStop(0.72, "#0a1a20");
  bg.addColorStop(1, "#040c0f");
  ctx.fillStyle = bg;
  ctx.beginPath();
  ctx.arc(cx, cy, 126, 0, Math.PI * 2);
  ctx.fill();

  // Gauge track
  const start = Math.PI * 0.75;
  const full = Math.PI * 1.5;
  ctx.lineCap = "round";
  ctx.lineWidth = 11;
  ctx.strokeStyle = "rgba(150, 185, 195, 0.16)";
  ctx.beginPath();
  ctx.arc(cx, cy, 102, start, start + full);
  ctx.stroke();

  // Accent gauge arc (glow)
  ctx.save();
  ctx.shadowColor = meta.accent;
  ctx.shadowBlur = 18;
  ctx.strokeStyle = meta.accent;
  ctx.lineWidth = 11;
  ctx.beginPath();
  ctx.arc(cx, cy, 102, start, start + full * meta.arc);
  ctx.stroke();
  ctx.restore();

  // Temperature
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = "#eafdff";
  ctx.shadowColor = "rgba(120, 230, 245, 0.85)";
  ctx.shadowBlur = 16;
  ctx.font = "700 70px Pretendard, 'Malgun Gothic', 'Noto Sans KR', sans-serif";
  ctx.fillText(`${meta.temp}°`, cx + 4, cy - 8);

  // Mode label
  ctx.shadowBlur = 0;
  ctx.fillStyle = meta.accent;
  ctx.font = "600 24px Pretendard, 'Malgun Gothic', 'Noto Sans KR', sans-serif";
  ctx.fillText(meta.label, cx, cy + 54);

  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}
