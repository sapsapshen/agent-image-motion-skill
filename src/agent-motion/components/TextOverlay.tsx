import React from "react";
import { AbsoluteFill, interpolate } from "remotion";
import { FONT_FAMILY } from "../constants";
import type { NormalizedMotionScene } from "../defaults";

const getTitleFontSize = (title: string, preset: NormalizedMotionScene["preset"]) => {
  if (preset === "cinematic") {
    if (title.length > 42) return 62;
    if (title.length > 26) return 76;
    return 88;
  }

  if (title.length > 42) return 64;
  if (title.length > 26) return 78;
  return 92;
};

const getSubtitleFontSize = (subtitle: string) => {
  if (subtitle.length > 180) return 26;
  if (subtitle.length > 110) return 30;
  return 34;
};

export const TextOverlay: React.FC<{
  readonly scene: NormalizedMotionScene;
  readonly frame: number;
  readonly durationInFrames: number;
  readonly textLayout: {
    left: number;
    bottom: number;
    maxWidth: number;
  };
  readonly badgeLayout: {
    right: number;
    bottom: number;
  };
}> = ({ scene, frame, durationInFrames, textLayout, badgeLayout }) => {
  const textOpacity = interpolate(frame, [6, 24], [0.3, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const textTranslateY = interpolate(frame, [0, 28], [48, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const titleFontSize = getTitleFontSize(scene.text.title, scene.preset);
  const subtitleFontSize = getSubtitleFontSize(scene.text.subtitle);
  const subtitleColor =
    scene.preset === "cinematic" ? "rgba(243, 241, 235, 0.78)" : "rgba(18, 24, 38, 0.72)";
  const badgeTextColor =
    scene.preset === "cinematic" ? "rgba(243, 241, 235, 0.82)" : "rgba(18, 24, 38, 0.72)";
  const badgeBackground =
    scene.preset === "cinematic" ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.52)";
  const badgeBorder =
    scene.preset === "cinematic" ? "1px solid rgba(255,255,255,0.18)" : "1px solid rgba(255,255,255,0.6)";

  return (
    <AbsoluteFill>
      <div
        style={{
          fontFamily: FONT_FAMILY,
          position: "absolute",
          left: textLayout.left,
          bottom: textLayout.bottom,
          maxWidth: textLayout.maxWidth,
          color: scene.palette.titleColor,
          opacity: textOpacity,
          transform: `translateY(${textTranslateY}px)`,
        }}
      >
        <div
          style={{
            fontSize: 24,
            fontWeight: 600,
            letterSpacing: 6,
            textTransform: "uppercase",
            color: scene.palette.accentColor,
            marginBottom: 18,
          }}
        >
          {scene.text.eyebrow}
        </div>
        <div
          style={{
            fontSize: titleFontSize,
            lineHeight: 1.04,
            fontWeight: 700,
            letterSpacing: -3,
            marginBottom: 22,
          }}
        >
          {scene.text.title}
        </div>
        <div
          style={{
            fontSize: subtitleFontSize,
            lineHeight: 1.45,
            color: subtitleColor,
            maxWidth: textLayout.maxWidth - 60,
          }}
        >
          {scene.text.subtitle}
        </div>
      </div>

      <div
        style={{
          fontFamily: FONT_FAMILY,
          position: "absolute",
          right: badgeLayout.right,
          bottom: badgeLayout.bottom,
          padding: "20px 26px",
          borderRadius: 999,
          border: badgeBorder,
          backgroundColor: badgeBackground,
          backdropFilter: "blur(12px)",
          color: badgeTextColor,
          fontSize: 22,
          letterSpacing: 1.5,
          textTransform: "uppercase",
          opacity: interpolate(frame, [16, 34], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          }),
          transform: `translateX(${interpolate(frame, [12, 40], [50, 0], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          })}px)`,
        }}
      >
        {scene.text.badge}
      </div>

      <div
        style={{
          position: "absolute",
          inset: 0,
          opacity: interpolate(frame, [durationInFrames - 25, durationInFrames - 15], [1, 0], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          }),
          pointerEvents: "none",
        }}
      />
    </AbsoluteFill>
  );
};
