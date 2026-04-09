import { getPresetDefaults, type NormalizedMotionScene } from "./defaults";
import { motionSceneInputSchema, type MotionSceneInput } from "./schema";

const clamp01 = (value: number | undefined, fallback: number) => {
  if (value === undefined || Number.isNaN(value)) {
    return fallback;
  }

  return Math.min(1, Math.max(0, value));
};

const normalizeAssetSrc = (src: string) => {
  return src
    .trim()
    .replace(/^\.\//, "")
    .replace(/^public[\\/]/, "")
    .replace(/\\/g, "/")
    .replace(/^\//, "");
};

const beautifyFilename = (src: string) => {
  const filename = normalizeAssetSrc(src).split("/").pop() ?? "image";
  const withoutExtension = filename.replace(/\.[^.]+$/, "");
  const withoutHash = withoutExtension.replace(/[-_]+/g, " ").replace(/\b[a-f0-9]{8,}\b/gi, "");
  const compact = withoutHash.replace(/\s+/g, " ").trim();

  if (!compact) {
    return "Animated Image";
  }

  return compact.charAt(0).toUpperCase() + compact.slice(1);
};

export const focalPointToObjectPosition = (focalPoint: { x: number; y: number }) => {
  return `${Math.round(focalPoint.x * 100)}% ${Math.round(focalPoint.y * 100)}%`;
};

export const normalizeMotionSceneInput = (input: MotionSceneInput): NormalizedMotionScene => {
  const parsed = motionSceneInputSchema.parse(input);
  const preset = parsed.preset ?? "editorial";
  const defaults = getPresetDefaults(preset);
  const normalizedImages = parsed.images.map((image, index) => ({
    src: normalizeAssetSrc(image.src),
    focalPoint: {
      x: clamp01(image.focalPoint?.x, 0.5),
      y: clamp01(image.focalPoint?.y, 0.5),
    },
    role: image.role ?? (index === 0 ? "primary" : "support"),
  }));

  const fallbackTitle =
    normalizedImages.length === 1
      ? `Motion From ${beautifyFilename(normalizedImages[0].src)}`
      : `Motion From ${normalizedImages.length} Images`;

  return {
    preset,
    images: normalizedImages,
    text: {
      eyebrow: parsed.text?.eyebrow ?? defaults.text.eyebrow,
      title: parsed.text?.title ?? fallbackTitle,
      subtitle: parsed.text?.subtitle ?? defaults.text.subtitle,
      badge: parsed.text?.badge ?? defaults.text.badge,
    },
    palette: {
      backgroundFrom: parsed.palette?.backgroundFrom ?? defaults.palette.backgroundFrom,
      backgroundTo: parsed.palette?.backgroundTo ?? defaults.palette.backgroundTo,
      titleColor: parsed.palette?.titleColor ?? defaults.palette.titleColor,
      accentColor: parsed.palette?.accentColor ?? defaults.palette.accentColor,
    },
    effects: {
      atmosphere: parsed.effects?.atmosphere ?? defaults.effects.atmosphere,
      particles: parsed.effects?.particles ?? defaults.effects.particles,
      floatingCards: parsed.effects?.floatingCards ?? defaults.effects.floatingCards,
      sweepLight: parsed.effects?.sweepLight ?? defaults.effects.sweepLight,
      texture: parsed.effects?.texture ?? defaults.effects.texture,
      intensity: parsed.effects?.intensity ?? defaults.effects.intensity,
    },
    canvas: {
      width: parsed.canvas?.width ?? defaults.canvas.width,
      height: parsed.canvas?.height ?? defaults.canvas.height,
      fps: parsed.canvas?.fps ?? defaults.canvas.fps,
      durationInFrames: parsed.canvas?.durationInFrames ?? defaults.canvas.durationInFrames,
    },
  };
};
