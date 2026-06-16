import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import { AdditiveBlending, CanvasTexture, type Group, type Mesh, type MeshBasicMaterial } from "three";

type RefrigeratorScanEffectProps = {
  active: boolean;
};

const TRAVEL = 2.3; // door span the scan sweeps over

export function RefrigeratorScanEffect({ active }: RefrigeratorScanEffectProps) {
  const groupRef = useRef<Group>(null);
  const bandRef = useRef<Mesh>(null);
  const lineRef = useRef<Mesh>(null);
  const texture = useMemo(createScanTexture, []);

  useFrame((state) => {
    if (!groupRef.current) return;
    const cycle = (state.clock.elapsedTime * 0.55) % TRAVEL;
    const y = cycle - TRAVEL / 2;
    groupRef.current.position.y = y;
    const edgeFade = Math.max(0, Math.sin((cycle / TRAVEL) * Math.PI));

    if (bandRef.current) {
      (bandRef.current.material as MeshBasicMaterial).opacity = active ? edgeFade * 0.7 : 0;
    }
    if (lineRef.current) {
      (lineRef.current.material as MeshBasicMaterial).opacity = active ? edgeFade * 0.95 : 0;
    }
  });

  if (!active) return null;

  return (
    <group name="Refrigerator_ScanEffect">
      <group ref={groupRef} position={[0, 0, 0.355]}>
        {/* soft glowing band */}
        <mesh ref={bandRef}>
          <planeGeometry args={[1.26, 0.5]} />
          <meshBasicMaterial map={texture} color="#9af1ff" transparent opacity={0} depthWrite={false} blending={AdditiveBlending} />
        </mesh>
        {/* crisp bright leading line */}
        <mesh ref={lineRef} position={[0, 0, 0.004]}>
          <planeGeometry args={[1.26, 0.016]} />
          <meshBasicMaterial color="#eafdff" transparent opacity={0} depthWrite={false} blending={AdditiveBlending} />
        </mesh>
      </group>
    </group>
  );
}

function createScanTexture(): CanvasTexture {
  const w = 16;
  const h = 128;
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d")!;
  const gradient = ctx.createLinearGradient(0, 0, 0, h);
  gradient.addColorStop(0, "rgba(255,255,255,0)");
  gradient.addColorStop(0.5, "rgba(255,255,255,1)");
  gradient.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, w, h);
  return new CanvasTexture(canvas);
}
