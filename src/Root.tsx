import "./index.css";
import { Composition, type CalculateMetadataFunction } from "remotion";
import { AgentImageMotion, agentImageMotionSchema } from "./AgentImageMotion";
import { exampleAgentScene } from "./agent-motion/defaults";
import { normalizeMotionSceneInput } from "./agent-motion/normalize";
import type { MotionSceneInput } from "./agent-motion/schema";

const calculateAgentMetadata: CalculateMetadataFunction<MotionSceneInput> = ({ props }) => {
  const normalized = normalizeMotionSceneInput(props);

  return {
    durationInFrames: normalized.canvas.durationInFrames,
    fps: normalized.canvas.fps,
    width: normalized.canvas.width,
    height: normalized.canvas.height,
    props: normalized,
  };
};

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="AgentImageMotion"
        component={AgentImageMotion}
        schema={agentImageMotionSchema}
        calculateMetadata={calculateAgentMetadata}
        defaultProps={exampleAgentScene}
      />
    </>
  );
};
