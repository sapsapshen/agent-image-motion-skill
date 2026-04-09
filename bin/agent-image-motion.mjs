#!/usr/bin/env node
import { runAgentImageMotionCli } from "../lib/run-agent-image-motion.mjs";

runAgentImageMotionCli({
  argv: process.argv.slice(2),
  hostRoot: process.cwd(),
}).catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
