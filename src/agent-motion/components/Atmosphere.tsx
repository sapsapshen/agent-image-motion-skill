import React from "react";
import { AbsoluteFill } from "remotion";
import type { GlowSpec, ParticleSpec } from "../scene";

export const Atmosphere: React.FC<{
  readonly accentColor: string;
  readonly frame: number;
  readonly glows: readonly GlowSpec[];
  readonly particles: readonly ParticleSpec[];
  readonly showParticles: boolean;
  readonly showTexture: boolean;
}> = ({ accentColor, frame, glows, particles, showParticles, showTexture }) => {
  return (
    <AbsoluteFill>
      {glows.map((glow, index) => {
        const verticalDrift = Math.sin((frame + index * 11) / glow.speed) * 22;
        const horizontalDrift = Math.cos((frame + index * 17) / (glow.speed + 8)) * 18;

        return (
          <div
            key={`glow-${index}`}
            style={{
              position: "absolute",
              width: glow.size,
              height: glow.size,
              top: glow.top,
              left: glow.left,
              right: glow.right,
              bottom: glow.bottom,
              borderRadius: "50%",
              background: `radial-gradient(circle, ${accentColor}${glow.colorSuffix} 0%, transparent 70%)`,
              transform: `translate(${horizontalDrift}px, ${verticalDrift}px)`,
              opacity: glow.opacity,
              filter: `blur(${glow.blur}px)`,
            }}
          />
        );
      })}

      {showParticles
        ? particles.map((particle, index) => {
            const particleFrame = frame + particle.delay;
            const translateY = -((particleFrame * particle.drift) % 240);
            const translateX = Math.sin(particleFrame / 22) * particle.swing;
            const flicker = 0.75 + Math.sin(particleFrame / 14) * 0.25;

            return (
              <div
                key={`particle-${index}`}
                style={{
                  position: "absolute",
                  width: particle.size,
                  height: particle.size,
                  left: particle.x,
                  top: particle.y,
                  borderRadius: "50%",
                  backgroundColor: "rgba(255,255,255,0.92)",
                  boxShadow: `0 0 ${particle.size * 2}px rgba(255,255,255,0.35)`,
                  transform: `translate(${translateX}px, ${translateY}px)`,
                  opacity: particle.opacity * flicker,
                }}
              />
            );
          })
        : null}

      {showTexture ? (
        <div
          style={{
            position: "absolute",
            inset: 0,
            opacity: 0.18,
            backgroundImage:
              "repeating-linear-gradient(0deg, rgba(255,255,255,0.22) 0 1px, transparent 1px 5px), repeating-linear-gradient(90deg, rgba(12,18,31,0.05) 0 1px, transparent 1px 7px)",
            mixBlendMode: "soft-light",
          }}
        />
      ) : null}
    </AbsoluteFill>
  );
};
