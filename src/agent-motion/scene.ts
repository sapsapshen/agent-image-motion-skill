import type { NormalizedMotionScene } from "./defaults";

export type GlowSpec = {
  readonly top?: number;
  readonly right?: number;
  readonly bottom?: number;
  readonly left?: number;
  readonly size: number;
  readonly opacity: number;
  readonly blur: number;
  readonly colorSuffix: string;
  readonly speed: number;
};

export type ParticleSpec = {
  readonly x: number;
  readonly y: number;
  readonly size: number;
  readonly drift: number;
  readonly swing: number;
  readonly delay: number;
  readonly opacity: number;
};

export type ImageCardModel = {
  readonly src: string;
  readonly focalPoint: { x: number; y: number };
  readonly width: number;
  readonly height: number;
  readonly top?: number;
  readonly right?: number;
  readonly bottom?: number;
  readonly left?: number;
  readonly translateYFrom: number;
  readonly translateYTo: number;
  readonly rotateFrom: number;
  readonly rotateTo: number;
  readonly zoomFrom: number;
  readonly zoomTo: number;
  readonly fadeInStart: number;
  readonly fadeInEnd: number;
  readonly maxOpacity: number;
  readonly borderRadius: number;
  readonly sweepLight: boolean;
  readonly glass: boolean;
  readonly overlayOpacity: number;
  readonly breathStrength: number;
  readonly driftDivisor: number;
};

export type SceneModel = {
  readonly background: string;
  readonly ambientGradient: string;
  readonly mainCard: ImageCardModel;
  readonly floatingCards: ImageCardModel[];
  readonly glows: readonly GlowSpec[];
  readonly particles: readonly ParticleSpec[];
  readonly textLayout: {
    left: number;
    bottom: number;
    maxWidth: number;
  };
  readonly badgeLayout: {
    right: number;
    bottom: number;
  };
};

const pickImage = (scene: NormalizedMotionScene, index: number) => {
  return scene.images[Math.min(index, scene.images.length - 1)];
};

export const buildSceneModel = (scene: NormalizedMotionScene): SceneModel => {
  const intensity = scene.effects.intensity;

  if (scene.preset === "cinematic") {
    return {
      background: `radial-gradient(circle at top, rgba(255,255,255,0.14), rgba(255,255,255,0) 36%), linear-gradient(145deg, ${scene.palette.backgroundFrom} 0%, ${scene.palette.backgroundTo} 100%)`,
      ambientGradient: `radial-gradient(circle at 20% 20%, ${scene.palette.accentColor}20 0%, transparent 34%), radial-gradient(circle at 82% 22%, rgba(255,255,255,0.12) 0%, transparent 18%), radial-gradient(circle at 86% 86%, ${scene.palette.accentColor}18 0%, transparent 28%)`,
      mainCard: {
        src: pickImage(scene, 0).src,
        focalPoint: pickImage(scene, 0).focalPoint,
        width: 1120,
        height: 700,
        top: 170,
        left: 520,
        translateYFrom: 80,
        translateYTo: -8,
        rotateFrom: -2,
        rotateTo: 2,
        zoomFrom: 1.12,
        zoomTo: 1.01,
        fadeInStart: 4,
        fadeInEnd: 24,
        maxOpacity: 1,
        borderRadius: 30,
        sweepLight: scene.effects.sweepLight,
        glass: true,
        overlayOpacity: 0.18,
        breathStrength: 0.012,
        driftDivisor: 28,
      },
      floatingCards: scene.effects.floatingCards
        ? [
            {
              src: pickImage(scene, 1).src,
              focalPoint: pickImage(scene, 1).focalPoint,
              width: 280,
              height: 380,
              top: 120,
              left: 170,
              translateYFrom: 32,
              translateYTo: -22,
              rotateFrom: -8,
              rotateTo: -4,
              zoomFrom: 1.18,
              zoomTo: 1.06,
              fadeInStart: 0,
              fadeInEnd: 18,
              maxOpacity: 0.82,
              borderRadius: 28,
              sweepLight: false,
              glass: false,
              overlayOpacity: 0.22,
              breathStrength: 0.01,
              driftDivisor: 24,
            },
          ]
        : [],
      glows: [
        { top: 110, left: 180, size: 340, opacity: 0.22 * intensity, blur: 18, colorSuffix: "25", speed: 34 },
        { bottom: 120, right: 140, size: 380, opacity: 0.18 * intensity, blur: 24, colorSuffix: "20", speed: 40 },
      ],
      particles: [],
      textLayout: {
        left: 120,
        bottom: 120,
        maxWidth: 540,
      },
      badgeLayout: {
        right: 120,
        bottom: 110,
      },
    };
  }

  if (scene.preset === "gallery") {
    return {
      background: `radial-gradient(circle at top, rgba(255,255,255,0.82), rgba(255,255,255,0) 40%), linear-gradient(135deg, ${scene.palette.backgroundFrom} 0%, ${scene.palette.backgroundTo} 100%)`,
      ambientGradient: `radial-gradient(circle at 18% 20%, ${scene.palette.accentColor}24 0%, transparent 34%), radial-gradient(circle at 82% 18%, rgba(255,255,255,0.52) 0%, transparent 18%), radial-gradient(circle at 76% 84%, ${scene.palette.accentColor}16 0%, transparent 26%)`,
      mainCard: {
        src: pickImage(scene, 0).src,
        focalPoint: pickImage(scene, 0).focalPoint,
        width: 640,
        height: 760,
        top: 150,
        left: 640,
        translateYFrom: 90,
        translateYTo: -4,
        rotateFrom: -4,
        rotateTo: 3,
        zoomFrom: 1.14,
        zoomTo: 1.02,
        fadeInStart: 6,
        fadeInEnd: 24,
        maxOpacity: 1,
        borderRadius: 32,
        sweepLight: scene.effects.sweepLight,
        glass: true,
        overlayOpacity: 0.14,
        breathStrength: 0.013,
        driftDivisor: 30,
      },
      floatingCards: scene.effects.floatingCards
        ? [
            {
              src: pickImage(scene, 1).src,
              focalPoint: pickImage(scene, 1).focalPoint,
              width: 320,
              height: 420,
              top: 180,
              left: 170,
              translateYFrom: 34,
              translateYTo: -24,
              rotateFrom: -11,
              rotateTo: -6,
              zoomFrom: 1.22,
              zoomTo: 1.08,
              fadeInStart: 0,
              fadeInEnd: 18,
              maxOpacity: 0.88,
              borderRadius: 32,
              sweepLight: false,
              glass: false,
              overlayOpacity: 0.22,
              breathStrength: 0.011,
              driftDivisor: 22,
            },
            {
              src: pickImage(scene, 2).src,
              focalPoint: pickImage(scene, 2).focalPoint,
              width: 320,
              height: 420,
              top: 210,
              right: 160,
              translateYFrom: 40,
              translateYTo: -28,
              rotateFrom: 10,
              rotateTo: 5,
              zoomFrom: 1.24,
              zoomTo: 1.09,
              fadeInStart: 8,
              fadeInEnd: 26,
              maxOpacity: 0.9,
              borderRadius: 32,
              sweepLight: false,
              glass: false,
              overlayOpacity: 0.2,
              breathStrength: 0.012,
              driftDivisor: 24,
            },
          ]
        : [],
      glows: [
        { top: 120, left: 170, size: 300, opacity: 0.28 * intensity, blur: 14, colorSuffix: "2A", speed: 32 },
        { bottom: 150, left: 930, size: 380, opacity: 0.2 * intensity, blur: 22, colorSuffix: "20", speed: 44 },
      ],
      particles: [
        { x: 260, y: 760, size: 8, drift: 0.74, swing: 24, delay: 0, opacity: 0.18 * intensity },
        { x: 520, y: 840, size: 6, drift: 0.92, swing: 18, delay: 18, opacity: 0.16 * intensity },
        { x: 1290, y: 760, size: 10, drift: 0.65, swing: 28, delay: 12, opacity: 0.19 * intensity },
        { x: 1610, y: 680, size: 7, drift: 0.84, swing: 18, delay: 28, opacity: 0.15 * intensity },
      ],
      textLayout: {
        left: 150,
        bottom: 90,
        maxWidth: 620,
      },
      badgeLayout: {
        right: 140,
        bottom: 90,
      },
    };
  }

  return {
    background: `radial-gradient(circle at top, rgba(255,255,255,0.9), rgba(255,255,255,0) 38%), linear-gradient(135deg, ${scene.palette.backgroundFrom} 0%, ${scene.palette.backgroundTo} 52%, #f7f3ec 100%)`,
    ambientGradient: `radial-gradient(circle at 22% 18%, ${scene.palette.accentColor}33 0%, transparent 36%), radial-gradient(circle at 78% 28%, rgba(255,255,255,0.7) 0%, transparent 20%), radial-gradient(circle at 80% 82%, ${scene.palette.accentColor}22 0%, transparent 30%)`,
    mainCard: {
      src: pickImage(scene, 0).src,
      focalPoint: pickImage(scene, 0).focalPoint,
      width: 720,
      height: 860,
      left: 600,
      top: 110,
      translateYFrom: 120,
      translateYTo: -4,
      rotateFrom: -6,
      rotateTo: 4,
      zoomFrom: 1.16,
      zoomTo: 1.02,
      fadeInStart: 6,
      fadeInEnd: 24,
      maxOpacity: 1,
      borderRadius: 36,
      sweepLight: scene.effects.sweepLight,
      glass: true,
      overlayOpacity: 0.18,
      breathStrength: 0.015,
      driftDivisor: 24,
    },
    floatingCards: scene.effects.floatingCards
      ? [
          {
            src: pickImage(scene, 1).src,
            focalPoint: pickImage(scene, 1).focalPoint,
            width: 300,
            height: 420,
            top: 140,
            left: 170,
            translateYFrom: 32,
            translateYTo: -24,
            rotateFrom: -9,
            rotateTo: -5,
            zoomFrom: 1.24,
            zoomTo: 1.08,
            fadeInStart: 0,
            fadeInEnd: 18,
            maxOpacity: 0.8,
            borderRadius: 36,
            sweepLight: false,
            glass: false,
            overlayOpacity: 0.24,
            breathStrength: 0.012,
            driftDivisor: 26,
          },
          {
            src: pickImage(scene, 2).src,
            focalPoint: pickImage(scene, 2).focalPoint,
            width: 260,
            height: 320,
            top: 170,
            right: 180,
            translateYFrom: 44,
            translateYTo: -36,
            rotateFrom: 11,
            rotateTo: 7,
            zoomFrom: 1.32,
            zoomTo: 1.1,
            fadeInStart: 8,
            fadeInEnd: 24,
            maxOpacity: 0.92,
            borderRadius: 36,
            sweepLight: false,
            glass: false,
            overlayOpacity: 0.3,
            breathStrength: 0.014,
            driftDivisor: 34,
          },
        ]
      : [],
    glows: [
      { top: 120, left: 180, size: 380, opacity: 0.32 * intensity, blur: 12, colorSuffix: "33", speed: 34 },
      { top: 280, right: 170, size: 260, opacity: 0.28 * intensity, blur: 18, colorSuffix: "2A", speed: 28 },
      { bottom: 130, left: 860, size: 420, opacity: 0.24 * intensity, blur: 22, colorSuffix: "1F", speed: 44 },
    ],
    particles: [
      { x: 200, y: 760, size: 10, drift: 0.7, swing: 26, delay: 0, opacity: 0.24 * intensity },
      { x: 340, y: 620, size: 6, drift: 0.95, swing: 18, delay: 14, opacity: 0.2 * intensity },
      { x: 520, y: 830, size: 8, drift: 0.82, swing: 22, delay: 33, opacity: 0.16 * intensity },
      { x: 780, y: 700, size: 12, drift: 0.58, swing: 30, delay: 10, opacity: 0.18 * intensity },
      { x: 980, y: 780, size: 7, drift: 0.74, swing: 24, delay: 26, opacity: 0.18 * intensity },
      { x: 1180, y: 610, size: 9, drift: 0.9, swing: 19, delay: 8, opacity: 0.2 * intensity },
      { x: 1420, y: 800, size: 11, drift: 0.62, swing: 28, delay: 18, opacity: 0.22 * intensity },
      { x: 1650, y: 690, size: 6, drift: 0.86, swing: 16, delay: 4, opacity: 0.17 * intensity },
    ],
    textLayout: {
      left: 140,
      bottom: 110,
      maxWidth: 760,
    },
    badgeLayout: {
      right: 140,
      bottom: 100,
    },
  };
};
