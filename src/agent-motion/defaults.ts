import type { MotionPreset, MotionSceneInput } from "./schema";

export type NormalizedMotionScene = {
  preset: MotionPreset;
  images: Array<{
    src: string;
    focalPoint: { x: number; y: number };
    role: "primary" | "support" | "detail";
  }>;
  text: {
    eyebrow: string;
    title: string;
    subtitle: string;
    badge: string;
  };
  palette: {
    backgroundFrom: string;
    backgroundTo: string;
    titleColor: string;
    accentColor: string;
  };
  effects: {
    atmosphere: boolean;
    particles: boolean;
    floatingCards: boolean;
    sweepLight: boolean;
    texture: boolean;
    intensity: number;
  };
  canvas: {
    width: number;
    height: number;
    fps: number;
    durationInFrames: number;
  };
};

const presetDefaults: Record<
  MotionPreset,
  Omit<NormalizedMotionScene, "images">
> = {
  editorial: {
    preset: "editorial",
    text: {
      eyebrow: "Agent Image Motion",
      title: "Still Image, Staged In Motion",
      subtitle: "A single image converted into layered cards, floating light and cinematic movement.",
      badge: "Editorial",
    },
    palette: {
      backgroundFrom: "#f2eee7",
      backgroundTo: "#dfe8ef",
      titleColor: "#121826",
      accentColor: "#d96c3f",
    },
    effects: {
      atmosphere: true,
      particles: true,
      floatingCards: true,
      sweepLight: true,
      texture: true,
      intensity: 1,
    },
    canvas: {
      width: 1920,
      height: 1080,
      fps: 30,
      durationInFrames: 180,
    },
  },
  cinematic: {
    preset: "cinematic",
    text: {
      eyebrow: "Cinematic Motion",
      title: "A Still Frame With Trailer Energy",
      subtitle: "Wide composition, restrained typography and softer atmosphere tuned for dramatic images.",
      badge: "Cinematic",
    },
    palette: {
      backgroundFrom: "#10151d",
      backgroundTo: "#283548",
      titleColor: "#f3f1eb",
      accentColor: "#f3ae64",
    },
    effects: {
      atmosphere: true,
      particles: false,
      floatingCards: true,
      sweepLight: true,
      texture: false,
      intensity: 0.82,
    },
    canvas: {
      width: 1920,
      height: 1080,
      fps: 30,
      durationInFrames: 180,
    },
  },
  gallery: {
    preset: "gallery",
    text: {
      eyebrow: "Gallery Motion",
      title: "Multiple Frames, One Motion System",
      subtitle: "Balanced layout for one to three images, with cleaner text placement and lighter decoration.",
      badge: "Gallery",
    },
    palette: {
      backgroundFrom: "#f6f4ef",
      backgroundTo: "#e7ecef",
      titleColor: "#162033",
      accentColor: "#4d8bb2",
    },
    effects: {
      atmosphere: true,
      particles: true,
      floatingCards: true,
      sweepLight: false,
      texture: true,
      intensity: 0.9,
    },
    canvas: {
      width: 1920,
      height: 1080,
      fps: 30,
      durationInFrames: 180,
    },
  },
};

export const exampleAgentScene: MotionSceneInput = {
  preset: "editorial",
  images: [{ src: "erik-fabian-Hwqc8Mv0KPM-unsplash.jpg" }],
  text: {
    title: "把静态照片变成会呼吸的画面",
    subtitle: "输入一张或多张 public 图片，交给同一套 motion engine 自动排版、裁切并生成动态场景。",
  },
};

export const getPresetDefaults = (preset: MotionPreset): Omit<NormalizedMotionScene, "images"> => {
  return presetDefaults[preset];
};
