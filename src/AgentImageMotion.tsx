import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { Atmosphere } from "./agent-motion/components/Atmosphere";
import { ImageCard } from "./agent-motion/components/ImageCard";
import { TextOverlay } from "./agent-motion/components/TextOverlay";
import { normalizeMotionSceneInput } from "./agent-motion/normalize";
import { buildSceneModel } from "./agent-motion/scene";
import { motionSceneInputSchema, type MotionSceneInput } from "./agent-motion/schema";

export { motionSceneInputSchema as agentImageMotionSchema };

export const AgentImageMotion: React.FC<MotionSceneInput> = (input) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const scene = normalizeMotionSceneInput(input);
  const sceneModel = buildSceneModel(scene);
  const opacity = interpolate(frame, [durationInFrames - 25, durationInFrames - 15], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill style={{ background: sceneModel.background }}>
      <AbsoluteFill style={{ opacity }}>
        <AbsoluteFill
          style={{
            justifyContent: "center",
            alignItems: "center",
            padding: "90px 110px",
          }}
        >
          <div
            style={{
              position: "absolute",
              inset: 0,
              background: sceneModel.ambientGradient,
            }}
          />

          {scene.effects.atmosphere ? (
            <Atmosphere
              accentColor={scene.palette.accentColor}
              frame={frame}
              glows={sceneModel.glows}
              particles={sceneModel.particles}
              showParticles={scene.effects.particles}
              showTexture={scene.effects.texture}
            />
          ) : null}

          {sceneModel.floatingCards.map((card, index) => (
            <ImageCard
              key={`floating-card-${index}-${card.src}`}
              card={card}
              frame={frame}
              durationInFrames={durationInFrames}
            />
          ))}

          <ImageCard
            card={sceneModel.mainCard}
            frame={frame}
            durationInFrames={durationInFrames}
          />

          <TextOverlay
            scene={scene}
            frame={frame}
            durationInFrames={durationInFrames}
            textLayout={sceneModel.textLayout}
            badgeLayout={sceneModel.badgeLayout}
          />
        </AbsoluteFill>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
