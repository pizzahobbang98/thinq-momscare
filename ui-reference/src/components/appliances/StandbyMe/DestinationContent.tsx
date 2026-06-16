import { useLoader } from "@react-three/fiber";
import { LinearFilter, SRGBColorSpace, TextureLoader } from "three";

type DestinationContentProps = {
  content: "forest" | "ocean" | "city";
};

const imageMap = {
  forest:
    "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?auto=format&fit=crop&w=900&q=80",
  ocean:
    "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=900&q=80",
  city:
    "https://images.unsplash.com/photo-1519501025264-65ba15a82390?auto=format&fit=crop&w=900&q=80",
};

export function DestinationContent({ content }: DestinationContentProps) {
  const texture = useLoader(TextureLoader, imageMap[content]);
  texture.colorSpace = SRGBColorSpace;
  texture.minFilter = LinearFilter;
  texture.magFilter = LinearFilter;

  return (
    <group position={[0, 0, 0.045]}>
      <mesh>
        <planeGeometry args={[1.28, 0.72]} />
        <meshBasicMaterial map={texture} toneMapped={false} />
      </mesh>
      <mesh position={[0, -0.25, 0.003]}>
        <planeGeometry args={[1.28, 0.22]} />
        <meshBasicMaterial color="#101a20" transparent opacity={0.34} depthWrite={false} />
      </mesh>
    </group>
  );
}
