import React from "react";
import { Img, interpolate, spring, staticFile, useVideoConfig } from "remotion";
import { focalPointToObjectPosition } from "../normalize";
import type { ImageCardModel } from "../scene";

const baseShadow = "0 30px 80px rgba(11, 16, 32, 0.22)";

export const ImageCard: React.FC<{
  readonly card: ImageCardModel;
  readonly frame: number;
  readonly durationInFrames: number;
}> = ({ card, frame, durationInFrames }) => {
  const { fps } = useVideoConfig();
  const entrance = spring({
    frame: frame - card.fadeInStart,
    fps,
    config: {
      damping: 18,
      stiffness: 90,
      mass: 0.9,
    },
  });

  const translateY = interpolate(entrance, [0, 1], [card.translateYFrom, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const driftY = Math.sin(frame / card.driftDivisor) * card.translateYTo;
  const rotation = interpolate(frame, [0, durationInFrames], [card.rotateFrom, card.rotateTo]);
  const baseScale = interpolate(frame, [0, durationInFrames], [card.zoomFrom, card.zoomTo]);
  const scale = baseScale + Math.sin(frame / 24) * card.breathStrength;
  const startingOpacity = Math.min(card.maxOpacity, 0.22);
  const opacity = interpolate(frame, [card.fadeInStart, card.fadeInEnd], [startingOpacity, card.maxOpacity], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const sweepX = interpolate(frame, [12, durationInFrames - 12], [-480, card.width + 260], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <div
      style={{
        position: "absolute",
        overflow: "hidden",
        width: card.width,
        height: card.height,
        top: card.top,
        right: card.right,
        bottom: card.bottom,
        left: card.left,
        borderRadius: card.borderRadius,
        border: "1px solid rgba(255,255,255,0.45)",
        boxShadow: baseShadow,
        opacity,
        backgroundColor: card.glass ? "rgba(255,255,255,0.45)" : "rgba(255,255,255,0.12)",
        backdropFilter: card.glass ? "blur(8px)" : undefined,
        transform: `translateY(${translateY + driftY}px) rotate(${rotation}deg)`,
      }}
    >
      <Img
        src={staticFile(card.src)}
        style={{
          width: "100%",
          height: "100%",
          objectFit: "cover",
          objectPosition: focalPointToObjectPosition(card.focalPoint),
          transform: `scale(${scale})`,
        }}
      />
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: `linear-gradient(160deg, rgba(255,255,255,${card.overlayOpacity}) 0%, rgba(255,255,255,0) 42%), linear-gradient(180deg, rgba(8,12,24,0) 40%, rgba(8,12,24,0.08) 100%)`,
        }}
      />
      {card.sweepLight ? (
        <div
          style={{
            position: "absolute",
            top: -120,
            left: -180,
            width: 300,
            height: card.height + 320,
            background: "linear-gradient(90deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.08) 22%, rgba(255,255,255,0.42) 50%, rgba(255,255,255,0.08) 78%, rgba(255,255,255,0) 100%)",
            mixBlendMode: "screen",
            opacity: interpolate(frame, [10, 34, durationInFrames - 26], [0, 0.7, 0.18], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            }),
            transform: `translateX(${sweepX}px) rotate(18deg)`,
          }}
        />
      ) : null}
    </div>
  );
};
