import { z } from "zod";

const presetSchema = z.enum(["editorial", "cinematic", "gallery"]);

const textSchema = z.object({
  eyebrow: z.string().max(80).optional(),
  title: z.string().max(120).optional(),
  subtitle: z.string().max(320).optional(),
  badge: z.string().max(80).optional(),
});

const paletteSchema = z.object({
  backgroundFrom: z.string().optional(),
  backgroundTo: z.string().optional(),
  titleColor: z.string().optional(),
  accentColor: z.string().optional(),
});

const effectsSchema = z.object({
  atmosphere: z.boolean().optional(),
  particles: z.boolean().optional(),
  floatingCards: z.boolean().optional(),
  sweepLight: z.boolean().optional(),
  texture: z.boolean().optional(),
  intensity: z.number().min(0).max(1.5).optional(),
});

const canvasSchema = z.object({
  width: z.number().int().min(320).max(7680).optional(),
  height: z.number().int().min(320).max(7680).optional(),
  fps: z.number().int().min(1).max(120).optional(),
  durationInFrames: z.number().int().min(45).max(1800).optional(),
});

const analysisSchema = z.object({
  enabled: z.boolean().optional(),
  detectFocalPoint: z.boolean().optional(),
  extractAccentColor: z.boolean().optional(),
});

const approvalProfileSchema = z.enum(["strict", "balanced", "fast-track"]);

const promotedOutputsSchema = z.object({
  still: z.string().optional(),
  render: z.string().optional(),
});

const approvalSchema = z.object({
  profile: approvalProfileSchema.optional(),
  enabled: z.boolean().optional(),
  minScore: z.number().int().min(0).max(100).optional(),
  allowWarnings: z.boolean().optional(),
  maxWarnings: z.number().int().min(0).max(50).optional(),
  allowBlockingIssues: z.boolean().optional(),
  autoPromote: z.boolean().optional(),
  autoPromoteTarget: z.enum(["still", "render"]).optional(),
  autoPromotePath: z.array(z.enum(["still", "render"])).optional(),
  promotedOutput: z.string().optional(),
  promotedOutputs: promotedOutputsSchema.optional(),
}).default({});

const approvalProfileDefaults = {
  strict: {
    minScore: 88,
    allowWarnings: false,
    maxWarnings: 0,
    allowBlockingIssues: false,
    autoPromoteTarget: "still",
  },
  balanced: {
    minScore: 70,
    allowWarnings: true,
    maxWarnings: 3,
    allowBlockingIssues: false,
    autoPromoteTarget: "still",
  },
  "fast-track": {
    minScore: 60,
    allowWarnings: true,
    maxWarnings: 6,
    allowBlockingIssues: false,
    autoPromoteTarget: "render",
  },
};

export const agentSkillRequestSchema = z.object({
  mode: z.enum(["render", "still", "draft"]).default("render"),
  images: z.array(z.string()).default([]),
  intent: z.string().optional(),
  preset: presetSchema.optional(),
  output: z.string().optional(),
  codec: z.string().optional(),
  frame: z.number().int().min(0).optional(),
  text: textSchema.default({}),
  palette: paletteSchema.default({}),
  effects: effectsSchema.default({}),
  canvas: canvasSchema.default({}),
  approval: approvalSchema,
  analysis: analysisSchema.default({
    enabled: true,
    detectFocalPoint: true,
    extractAccentColor: true,
  }),
});

const maybeNumber = (value) => {
  if (value === undefined || value === null || value === "") {
    return undefined;
  }

  if (typeof value === "number") {
    return Number.isFinite(value) ? value : undefined;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
};

const maybeBoolean = (value) => {
  if (value === undefined || value === null || value === "") {
    return undefined;
  }

  if (typeof value === "boolean") {
    return value;
  }

  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (normalized === "true") return true;
    if (normalized === "false") return false;
  }

  return undefined;
};

const asString = (value) => {
  if (value === undefined || value === null || value === "") {
    return undefined;
  }

  return String(value);
};

const asStringArray = (value) => {
  if (Array.isArray(value)) {
    return value.map(String).map((item) => item.trim()).filter(Boolean);
  }

  if (typeof value === "string") {
    return value.split(",").map((item) => item.trim()).filter(Boolean);
  }

  return [];
};

const buildAutoPromotePath = ({ explicitPath, autoPromoteTarget }) => {
  if (explicitPath.length > 0) {
    return [...new Set(explicitPath.filter((item) => item === "still" || item === "render"))];
  }

  if (autoPromoteTarget === "render") {
    return ["still", "render"];
  }

  if (autoPromoteTarget === "still") {
    return ["still"];
  }

  return [];
};

const resolveApprovalConfig = (approval = {}) => {
  const profile = approval.profile ?? "balanced";
  const profileDefaults = approvalProfileDefaults[profile] ?? approvalProfileDefaults.balanced;
  const autoPromoteTarget = approval.autoPromoteTarget ?? profileDefaults.autoPromoteTarget;

  return {
    profile,
    enabled: approval.enabled ?? true,
    minScore: approval.minScore ?? profileDefaults.minScore,
    allowWarnings: approval.allowWarnings ?? profileDefaults.allowWarnings,
    maxWarnings: approval.maxWarnings ?? profileDefaults.maxWarnings,
    allowBlockingIssues: approval.allowBlockingIssues ?? profileDefaults.allowBlockingIssues,
    autoPromote: approval.autoPromote ?? false,
    autoPromoteTarget,
    autoPromotePath: buildAutoPromotePath({
      explicitPath: approval.autoPromotePath ?? [],
      autoPromoteTarget,
    }),
    promotedOutput: approval.promotedOutput,
    promotedOutputs: approval.promotedOutputs ?? {},
  };
};

export const normalizeAgentSkillRequest = (rawRequest) => {
  const normalized = {
    mode:
      asString(rawRequest.mode) ??
      (maybeBoolean(rawRequest.draft)
        ? "draft"
        : maybeBoolean(rawRequest.still)
          ? "still"
          : "render"),
    images: asStringArray(rawRequest.images),
    intent: asString(rawRequest.intent),
    preset: asString(rawRequest.preset),
    output: asString(rawRequest.output),
    codec: asString(rawRequest.codec),
    frame: maybeNumber(rawRequest.frame),
    text: {
      eyebrow: asString(rawRequest.text?.eyebrow ?? rawRequest.eyebrow),
      title: asString(rawRequest.text?.title ?? rawRequest.title),
      subtitle: asString(rawRequest.text?.subtitle ?? rawRequest.subtitle),
      badge: asString(rawRequest.text?.badge ?? rawRequest.badge),
    },
    palette: {
      backgroundFrom: asString(rawRequest.palette?.backgroundFrom ?? rawRequest.backgroundFrom),
      backgroundTo: asString(rawRequest.palette?.backgroundTo ?? rawRequest.backgroundTo),
      titleColor: asString(rawRequest.palette?.titleColor ?? rawRequest.titleColor),
      accentColor: asString(rawRequest.palette?.accentColor ?? rawRequest.accentColor),
    },
    effects: {
      atmosphere: maybeBoolean(rawRequest.effects?.atmosphere ?? rawRequest.atmosphere),
      particles: maybeBoolean(rawRequest.effects?.particles ?? rawRequest.particles),
      floatingCards: maybeBoolean(rawRequest.effects?.floatingCards ?? rawRequest.floatingCards),
      sweepLight: maybeBoolean(rawRequest.effects?.sweepLight ?? rawRequest.sweepLight),
      texture: maybeBoolean(rawRequest.effects?.texture ?? rawRequest.texture),
      intensity: maybeNumber(rawRequest.effects?.intensity ?? rawRequest.intensity),
    },
    approval: {
      profile: asString(rawRequest.approval?.profile ?? rawRequest.approvalProfile ?? rawRequest.profile),
      enabled: maybeBoolean(rawRequest.approval?.enabled ?? rawRequest.approvalEnabled),
      minScore: maybeNumber(rawRequest.approval?.minScore ?? rawRequest.minScore),
      allowWarnings: maybeBoolean(rawRequest.approval?.allowWarnings ?? rawRequest.allowWarnings),
      maxWarnings: maybeNumber(rawRequest.approval?.maxWarnings ?? rawRequest.maxWarnings),
      allowBlockingIssues: maybeBoolean(rawRequest.approval?.allowBlockingIssues ?? rawRequest.allowBlockingIssues),
      autoPromote: maybeBoolean(rawRequest.approval?.autoPromote ?? rawRequest.autoPromote),
      autoPromoteTarget: asString(rawRequest.approval?.autoPromoteTarget ?? rawRequest.autoPromoteTarget),
      autoPromotePath: asStringArray(rawRequest.approval?.autoPromotePath ?? rawRequest.autoPromotePath),
      promotedOutput: asString(rawRequest.approval?.promotedOutput ?? rawRequest.promotedOutput),
      promotedOutputs: {
        still: asString(rawRequest.approval?.promotedOutputs?.still ?? rawRequest.promotedStillOutput),
        render: asString(rawRequest.approval?.promotedOutputs?.render ?? rawRequest.promotedRenderOutput),
      },
    },
    canvas: {
      width: maybeNumber(rawRequest.canvas?.width ?? rawRequest.width),
      height: maybeNumber(rawRequest.canvas?.height ?? rawRequest.height),
      fps: maybeNumber(rawRequest.canvas?.fps ?? rawRequest.fps),
      durationInFrames: maybeNumber(rawRequest.canvas?.durationInFrames ?? rawRequest.durationInFrames),
    },
    analysis: {
      enabled: maybeBoolean(rawRequest.analysis?.enabled ?? rawRequest.analysisEnabled),
      detectFocalPoint: maybeBoolean(rawRequest.analysis?.detectFocalPoint ?? rawRequest.detectFocalPoint),
      extractAccentColor: maybeBoolean(rawRequest.analysis?.extractAccentColor ?? rawRequest.extractAccentColor),
    },
  };

  const parsed = agentSkillRequestSchema.parse(normalized);

  return {
    ...parsed,
    approval: resolveApprovalConfig(parsed.approval),
  };
};
