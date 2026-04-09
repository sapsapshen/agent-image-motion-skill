import { zColor } from "@remotion/zod-types";
import { z } from "zod";

export const motionPresetSchema = z.enum(["editorial", "cinematic", "gallery"]);

export const focalPointSchema = z.object({
  x: z.number().min(0).max(1).optional(),
  y: z.number().min(0).max(1).optional(),
});

export const motionImageSchema = z.object({
  src: z.string().min(1),
  focalPoint: focalPointSchema.optional(),
  role: z.enum(["primary", "support", "detail"]).optional(),
});

export const motionTextSchema = z.object({
  eyebrow: z.string().max(80).optional(),
  title: z.string().max(120).optional(),
  subtitle: z.string().max(320).optional(),
  badge: z.string().max(80).optional(),
});

export const motionPaletteSchema = z.object({
  backgroundFrom: zColor().optional(),
  backgroundTo: zColor().optional(),
  titleColor: zColor().optional(),
  accentColor: zColor().optional(),
});

export const motionEffectsSchema = z.object({
  atmosphere: z.boolean().optional(),
  particles: z.boolean().optional(),
  floatingCards: z.boolean().optional(),
  sweepLight: z.boolean().optional(),
  texture: z.boolean().optional(),
  intensity: z.number().min(0).max(1.5).optional(),
});

export const motionCanvasSchema = z.object({
  width: z.number().int().min(320).max(7680).optional(),
  height: z.number().int().min(320).max(7680).optional(),
  fps: z.number().int().min(1).max(120).optional(),
  durationInFrames: z.number().int().min(45).max(1800).optional(),
});

export const motionSceneInputSchema = z.object({
  preset: motionPresetSchema.optional(),
  images: z.array(motionImageSchema).min(1).max(8),
  text: motionTextSchema.optional(),
  palette: motionPaletteSchema.optional(),
  effects: motionEffectsSchema.optional(),
  canvas: motionCanvasSchema.optional(),
});

export type MotionSceneInput = z.infer<typeof motionSceneInputSchema>;
export type MotionPreset = z.infer<typeof motionPresetSchema>;
