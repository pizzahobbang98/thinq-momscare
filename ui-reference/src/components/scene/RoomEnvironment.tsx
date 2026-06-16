import { useMemo } from "react";
import { CanvasTexture, RepeatWrapping, SRGBColorSpace } from "three";
import type { SceneState } from "../../types/applianceTypes";

type RoomEnvironmentProps = {
  light: SceneState["ceilingLight"];
};

const FLOOR_Y = -1.02;
const CEILING_Y = 2.86;
const BACK_Z = -1.85;

// Real-home shell: modern light laminate floor, warm textured walls, trim.
// Mood is produced by colored LIGHT (SceneLighting), not by repainting.
export function RoomEnvironment({ light: _light }: RoomEnvironmentProps) {
  const floorTexture = useMemo(createFloorTexture, []);
  const wallTexture = useMemo(createWallTexture, []);

  return (
    <group>
      {/* modern wide-plank laminate floor */}
      <mesh receiveShadow rotation-x={-Math.PI / 2} position={[0, FLOOR_Y, 0.7]}>
        <planeGeometry args={[9.4, 7.2]} />
        <meshStandardMaterial map={floorTexture} roughness={0.5} metalness={0.05} />
      </mesh>

      {/* ceiling */}
      <mesh rotation-x={Math.PI / 2} position={[0, CEILING_Y, 0.4]}>
        <planeGeometry args={[9.4, 7.0]} />
        <meshStandardMaterial color="#f2f2ef" roughness={1} />
      </mesh>

      {/* walls */}
      <mesh receiveShadow position={[0, 1.12, BACK_Z]}>
        <boxGeometry args={[9.4, 4.4, 0.14]} />
        <meshStandardMaterial map={wallTexture} roughness={0.97} />
      </mesh>
      <mesh receiveShadow position={[-4.58, 1.1, 0.7]} rotation-y={Math.PI / 2}>
        <boxGeometry args={[7.2, 4.4, 0.14]} />
        <meshStandardMaterial map={wallTexture} roughness={0.97} />
      </mesh>
      <mesh receiveShadow position={[4.58, 1.1, 0.7]} rotation-y={Math.PI / 2}>
        <boxGeometry args={[7.2, 4.4, 0.14]} />
        <meshStandardMaterial map={wallTexture} roughness={0.97} />
      </mesh>

      {/* baseboards */}
      <mesh position={[0, -0.93, BACK_Z + 0.075]}>
        <boxGeometry args={[9.4, 0.16, 0.04]} />
        <meshStandardMaterial color="#f7f7f4" roughness={0.65} />
      </mesh>
      {[-4.5, 4.5].map((x) => (
        <mesh key={x} position={[x, -0.93, 0.7]} rotation-y={Math.PI / 2}>
          <boxGeometry args={[7.2, 0.16, 0.04]} />
          <meshStandardMaterial color="#f7f7f4" roughness={0.65} />
        </mesh>
      ))}

      {/* crown molding */}
      <mesh position={[0, 2.78, BACK_Z + 0.08]}>
        <boxGeometry args={[9.4, 0.12, 0.1]} />
        <meshStandardMaterial color="#f7f7f4" roughness={0.6} />
      </mesh>
      {[-4.5, 4.5].map((x) => (
        <mesh key={x} position={[x, 2.78, 0.7]} rotation-y={Math.PI / 2}>
          <boxGeometry args={[7.2, 0.12, 0.1]} />
          <meshStandardMaterial color="#f7f7f4" roughness={0.6} />
        </mesh>
      ))}
    </group>
  );
}

function createFloorTexture(): CanvasTexture {
  const size = 512;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;

  // light, modern greige laminate
  const tones = ["#dcd3c2", "#d6ccba", "#e0d8c8", "#d2c8b5", "#dad1bf"];
  const rows = 6;
  const rowH = size / rows;

  for (let r = 0; r < rows; r += 1) {
    const y = r * rowH;
    ctx.fillStyle = tones[r % tones.length];
    ctx.fillRect(0, y, size, rowH);

    const offset = (r % 2) * (size / 3);
    for (let x = offset; x < size + offset; x += size / 1.5) {
      ctx.fillStyle = "rgba(120, 104, 80, 0.28)";
      ctx.fillRect(x % size, y, 1.5, rowH);
    }

    ctx.strokeStyle = "rgba(150, 132, 104, 0.12)";
    ctx.lineWidth = 1;
    for (let g = 0; g < 3; g += 1) {
      const gy = y + rowH * (0.28 + g * 0.24);
      ctx.beginPath();
      ctx.moveTo(0, gy);
      ctx.bezierCurveTo(size * 0.3, gy + 2, size * 0.6, gy - 2, size, gy + 1);
      ctx.stroke();
    }

    ctx.fillStyle = "rgba(110, 94, 70, 0.32)";
    ctx.fillRect(0, y, size, 1.5);
  }

  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  texture.wrapS = RepeatWrapping;
  texture.wrapT = RepeatWrapping;
  texture.repeat.set(2.6, 2.0);
  texture.anisotropy = 8;
  return texture;
}

function createWallTexture(): CanvasTexture {
  const size = 256;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;

  // warm matte paint base
  ctx.fillStyle = "#ece6da";
  ctx.fillRect(0, 0, size, size);

  // very subtle fine speckle so the wall isn't dead-flat CG
  for (let i = 0; i < 2600; i += 1) {
    const x = Math.random() * size;
    const y = Math.random() * size;
    const shade = Math.random() > 0.5 ? "rgba(255,255,255,0.05)" : "rgba(150,138,118,0.05)";
    ctx.fillStyle = shade;
    ctx.fillRect(x, y, 1, 1);
  }

  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  texture.wrapS = RepeatWrapping;
  texture.wrapT = RepeatWrapping;
  texture.repeat.set(3, 1.6);
  return texture;
}
