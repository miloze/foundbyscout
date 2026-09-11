"use client";
import Image from "next/image";

type Props = {
  heroImage?: string | null;
  parkName: string;
  modelFile: string;
  cameraPos?: [number, number, number];
  cameraTarget?: [number, number, number];
  modelRotation?: [number, number, number];
  autoRotate?: boolean;
  ambientIntensity?: number;
  directionalIntensity?: number;
  environmentPreset?: string;
  environmentIntensity?: number;
};

export default function ParkHeroMobile({ heroImage, parkName }: Props) {
  return (
    <div style={{ position: "relative", width: "100%", height: "100%" }}>
      {heroImage ? (
        <Image
          src={heroImage}
          alt={parkName}
          fill
          style={{ objectFit: "cover" }}
          priority
        />
      ) : (
        <div style={{ position: "absolute", inset: 0, background: "var(--card)" }} />
      )}
    </div>
  );
}
