import { spawnSync } from "node:child_process";
import { mkdirSync, copyFileSync, existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { imageSizeFromFile } from "image-size/fromFile";
import { Jimp } from "jimp";
import { normalizeAgentSkillRequest } from "./agent-skill-contract.mjs";

const supportedImageExtensions = new Set([".jpg", ".jpeg", ".png", ".webp", ".gif", ".bmp", ".svg"]);
const rasterExtensions = new Set([".jpg", ".jpeg", ".png", ".webp", ".gif", ".bmp"]);
const presetAccentDefaults = {
  editorial: "#d96c3f",
  cinematic: "#f3ae64",
  gallery: "#4d8bb2",
};

const stageOrder = {
  draft: 0,
  still: 1,
  render: 2,
};

const parseArgs = (argv) => {
  const args = {};

  for (let index = 0; index < argv.length; index += 1) {
    const current = argv[index];

    if (!current.startsWith("--")) {
      continue;
    }

    const withoutPrefix = current.slice(2);
    const [rawKey, inlineValue] = withoutPrefix.split("=", 2);
    const key = rawKey.trim();

    if (inlineValue !== undefined) {
      args[key] = inlineValue;
      continue;
    }

    const next = argv[index + 1];
    if (!next || next.startsWith("--")) {
      args[key] = "true";
      continue;
    }

    args[key] = next;
    index += 1;
  }

  return args;
};

const hasCliFlag = (argv, ...flags) => {
  return (argv ?? []).some((arg) => flags.includes(arg));
};

const getPackageMetadata = (runtimeRoot) => {
  const packageJsonPath = path.join(runtimeRoot, "package.json");
  const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf8"));
  const commandName = packageJson.bin && typeof packageJson.bin === "object"
    ? Object.keys(packageJson.bin)[0]
    : packageJson.name;

  return {
    name: packageJson.name ?? "agent-image-motion",
    version: packageJson.version ?? "0.0.0",
    commandName: commandName ?? "agent-image-motion",
  };
};

const printHelp = ({ commandName, version }) => {
  console.log(
    [
      `${commandName} v${version}`,
      "",
      "Generate image-based motion outputs from any terminal directory.",
      "",
      "Usage:",
      `  ${commandName} --mode=<draft|still|render> --images=\"path1,path2\" [options]`,
      `  ${commandName} --request=.\\request.json`,
      "",
      "Core options:",
      "  --mode                 draft, still, or render",
      "  --images               Comma-separated image paths",
      "  --title                Main title text",
      "  --subtitle             Supporting subtitle text",
      "  --eyebrow              Small upper label text",
      "  --badge                Badge text",
      "  --preset               editorial, cinematic, or gallery",
      "  --output               Output file path relative to current terminal directory",
      "  --request              JSON request file path",
      "  --frame                Frame number for still mode",
      "  --codec                Video codec for render mode",
      "",
      "Utility options:",
      "  -h, --help             Show this help message",
      "  -v, --version          Show installed CLI version",
      "",
      "Examples:",
      `  ${commandName} --mode=render --images=\"D:\\images\\hero.jpg\" --title=\"Balanced Review\" --output=out\\balanced-review.mp4`,
      `  ${commandName} --mode=still --images=\"public\\hero.jpg\" --frame=45 --output=out\\preview.jpg`,
      `  ${commandName} --request=.\\examples\\agent-image-motion.request.v2.json`,
      "",
      "Path behavior:",
      "  Relative input and output paths resolve from the current terminal directory.",
      "  Absolute image paths are supported directly.",
      "  /example.jpg first checks the installed package public directory, then ./public in the current terminal directory.",
    ].join("\n"),
  );
};

const ensureDir = (dirPath) => {
  mkdirSync(dirPath, { recursive: true });
};

const slugify = (value) => {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
};

const readJsonFile = (jsonPath) => {
  const raw = readFileSync(jsonPath, "utf8");
  return JSON.parse(raw);
};

const sanitizeRelativePublicPath = (value) => {
  return value.replace(/^\/+/, "").replace(/\\/g, "/");
};

const getDefaultRuntimeRoot = () => {
  return path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
};

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

const resolveImageSourcePath = ({ sourcePath, baseDir, runtimePublicRoot, hostRoot }) => {
  if (sourcePath.startsWith("/")) {
    const runtimePublicCandidate = path.resolve(runtimePublicRoot, `.${sourcePath}`);
    if (existsSync(runtimePublicCandidate)) {
      return runtimePublicCandidate;
    }

    const hostPublicCandidate = path.resolve(hostRoot, `.${sourcePath}`);
    if (existsSync(hostPublicCandidate)) {
      return hostPublicCandidate;
    }

    return runtimePublicCandidate;
  }

  if (path.isAbsolute(sourcePath)) {
    return sourcePath;
  }

  if (sourcePath.startsWith("public/") || sourcePath.startsWith("public\\")) {
    return path.resolve(hostRoot, sourcePath);
  }

  return path.resolve(baseDir, sourcePath);
};

const inferIntentText = (request) => {
  return [request.intent, request.text.title, request.text.subtitle, request.text.eyebrow, request.text.badge]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
};

const classifyOrientation = (width, height) => {
  if (!width || !height) {
    return "unknown";
  }

  const ratio = width / height;
  if (ratio > 1.2) return "landscape";
  if (ratio < 0.84) return "portrait";
  return "square";
};

const inferPreset = ({ explicitPreset, intentText, assets }) => {
  if (explicitPreset) {
    return explicitPreset;
  }

  if (assets.length >= 2) {
    return "gallery";
  }

  const cinematicKeywords = ["cinematic", "trailer", "dramatic", "film", "movie", "dark", "moody", "epic", "luxury"];
  if (cinematicKeywords.some((keyword) => intentText.includes(keyword))) {
    return "cinematic";
  }

  const productKeywords = ["product", "catalog", "gallery", "lookbook", "detail", "showcase", "listing"];
  if (productKeywords.some((keyword) => intentText.includes(keyword))) {
    return assets.length > 1 ? "gallery" : "editorial";
  }

  const firstAsset = assets[0];
  if (firstAsset?.analysis?.averageBrightness !== undefined && firstAsset.analysis.averageBrightness < 0.4) {
    return "cinematic";
  }

  const firstOrientation = assets[0]?.orientation ?? "unknown";
  if (firstOrientation === "landscape") {
    return "cinematic";
  }

  return "editorial";
};

const inferFocalPoint = (asset, preset, index) => {
  if (asset.analysis?.focalPoint) {
    return asset.analysis.focalPoint;
  }

  if (asset.orientation === "portrait") {
    return { x: 0.5, y: preset === "cinematic" ? 0.42 : 0.38 };
  }

  if (asset.orientation === "landscape") {
    return { x: 0.5, y: 0.46 };
  }

  const galleryOffsets = [0.46, 0.24, 0.78];
  return { x: galleryOffsets[index] ?? 0.5, y: 0.42 };
};

const rgbToHex = ({ r, g, b }) => {
  return `#${[r, g, b]
    .map((component) => clamp(Math.round(component), 0, 255).toString(16).padStart(2, "0"))
    .join("")}`;
};

const computeColorSaturation = ({ r, g, b }) => {
  const max = Math.max(r, g, b) / 255;
  const min = Math.min(r, g, b) / 255;
  return max === 0 ? 0 : (max - min) / max;
};

const hexToRgb = (hexColor) => {
  const normalized = hexColor.replace("#", "");
  const value = normalized.length === 3
    ? normalized.split("").map((part) => part + part).join("")
    : normalized;

  return {
    r: Number.parseInt(value.slice(0, 2), 16),
    g: Number.parseInt(value.slice(2, 4), 16),
    b: Number.parseInt(value.slice(4, 6), 16),
  };
};

const computeRgbLuminance = ({ r, g, b }) => {
  return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
};

const chooseSafeAccentColor = ({ extractedAccentColor, preset }) => {
  const fallback = presetAccentDefaults[preset] ?? presetAccentDefaults.editorial;

  if (!extractedAccentColor) {
    return fallback;
  }

  const rgb = hexToRgb(extractedAccentColor);
  const luminance = computeRgbLuminance(rgb);
  const saturation = computeColorSaturation(rgb);

  if (luminance < 0.32 || luminance > 0.82 || saturation < 0.18) {
    return fallback;
  }

  return extractedAccentColor;
};

const analyzeRasterImage = async (filePath) => {
  const image = await Jimp.read(filePath);
  const { width, height, data } = image.bitmap;
  const stepX = Math.max(1, Math.floor(width / 64));
  const stepY = Math.max(1, Math.floor(height / 64));

  let weightSum = 0;
  let weightX = 0;
  let weightY = 0;
  let colorWeightSum = 0;
  let weightedR = 0;
  let weightedG = 0;
  let weightedB = 0;
  let luminanceSum = 0;
  let edgeSum = 0;
  let sampleCount = 0;

  const readPixel = (x, y) => {
    const offset = (y * width + x) * 4;
    return {
      r: data[offset],
      g: data[offset + 1],
      b: data[offset + 2],
      a: data[offset + 3] / 255,
    };
  };

  for (let y = 0; y < height; y += stepY) {
    for (let x = 0; x < width; x += stepX) {
      const pixel = readPixel(x, y);
      if (pixel.a < 0.08) {
        continue;
      }

      const maxChannel = Math.max(pixel.r, pixel.g, pixel.b);
      const minChannel = Math.min(pixel.r, pixel.g, pixel.b);
      const saturation = maxChannel === 0 ? 0 : (maxChannel - minChannel) / maxChannel;
      const luminance = (0.2126 * pixel.r + 0.7152 * pixel.g + 0.0722 * pixel.b) / 255;

      const right = readPixel(Math.min(x + stepX, width - 1), y);
      const down = readPixel(x, Math.min(y + stepY, height - 1));
      const rightLuminance = (0.2126 * right.r + 0.7152 * right.g + 0.0722 * right.b) / 255;
      const downLuminance = (0.2126 * down.r + 0.7152 * down.g + 0.0722 * down.b) / 255;
      const edgeStrength = (Math.abs(luminance - rightLuminance) + Math.abs(luminance - downLuminance)) / 2;

      const normX = x / Math.max(1, width - 1);
      const normY = y / Math.max(1, height - 1);
      const centerDistance = Math.hypot(normX - 0.5, normY - 0.5) / Math.hypot(0.5, 0.5);
      const centerBias = 1 - clamp(centerDistance, 0, 1);

      const weight = pixel.a * (edgeStrength * 0.48 + saturation * 0.28 + centerBias * 0.16 + (1 - Math.abs(luminance - 0.5) * 2) * 0.08 + 0.02);
      const colorWeight = weight * (0.65 + saturation * 0.9);

      weightSum += weight;
      weightX += normX * weight;
      weightY += normY * weight;
      colorWeightSum += colorWeight;
      weightedR += pixel.r * colorWeight;
      weightedG += pixel.g * colorWeight;
      weightedB += pixel.b * colorWeight;
      luminanceSum += luminance;
      edgeSum += edgeStrength;
      sampleCount += 1;
    }
  }

  const focalPoint = weightSum > 0
    ? {
        x: clamp(weightX / weightSum, 0.12, 0.88),
        y: clamp(weightY / weightSum, 0.12, 0.88),
      }
    : { x: 0.5, y: 0.5 };

  const accentRgb = colorWeightSum > 0
    ? {
        r: weightedR / colorWeightSum,
        g: weightedG / colorWeightSum,
        b: weightedB / colorWeightSum,
      }
    : { r: 217, g: 108, b: 63 };

  return {
    focalPoint,
    averageBrightness: sampleCount > 0 ? luminanceSum / sampleCount : 0.5,
    detailScore: sampleCount > 0 ? edgeSum / sampleCount : 0.15,
    accentColor: computeColorSaturation(accentRgb) >= 0.18 ? rgbToHex(accentRgb) : null,
  };
};

const buildAutoText = ({ intent, preset, assets }) => {
  const subject = assets.length === 1 ? "Image" : `${assets.length} Images`;

  if (intent) {
    return {
      eyebrow: "Agent Skill Render",
      title: intent,
      subtitle: `Auto-generated ${preset} motion scene from ${subject.toLowerCase()}.`,
      badge: preset.charAt(0).toUpperCase() + preset.slice(1),
    };
  }

  return {
    eyebrow: "Agent Skill Render",
    title: `${subject} In Motion`,
    subtitle: `Auto-generated ${preset} motion scene prepared in a single agent call.`,
    badge: preset.charAt(0).toUpperCase() + preset.slice(1),
  };
};

const buildPlaceholderSvg = ({ title, intent, preset }) => {
  const safeTitle = (title || intent || "Agent Image Motion").replace(/[<&>]/g, "");
  return `
<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="1200" viewBox="0 0 1600 1200">
  <defs>
    <linearGradient id="bg" x1="0" x2="1" y1="0" y2="1">
      <stop offset="0%" stop-color="#efe7dd"/>
      <stop offset="100%" stop-color="#dce6ef"/>
    </linearGradient>
  </defs>
  <rect width="1600" height="1200" fill="url(#bg)"/>
  <circle cx="320" cy="260" r="220" fill="#d96c3f" opacity="0.15"/>
  <circle cx="1280" cy="980" r="260" fill="#4d8bb2" opacity="0.12"/>
  <text x="120" y="520" font-family="Arial, Helvetica, sans-serif" font-size="62" font-weight="700" fill="#1b2433">${safeTitle}</text>
  <text x="120" y="610" font-family="Arial, Helvetica, sans-serif" font-size="30" fill="#516070">Generated automatically because no source image was provided.</text>
  <text x="120" y="680" font-family="Arial, Helvetica, sans-serif" font-size="24" fill="#d96c3f">Preset: ${preset}</text>
</svg>`.trim();
};

const escapeXml = (value) => {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&apos;");
};

const buildDraftLayout = ({ preset }) => {
  if (preset === "gallery") {
    return [
      { x: 850, y: 170, width: 600, height: 760, rotate: 4 },
      { x: 150, y: 250, width: 340, height: 420, rotate: -8 },
      { x: 520, y: 700, width: 290, height: 220, rotate: -3 },
    ];
  }

  if (preset === "editorial") {
    return [
      { x: 820, y: 120, width: 520, height: 760, rotate: 0 },
      { x: 1230, y: 560, width: 210, height: 270, rotate: 5 },
      { x: 740, y: 690, width: 180, height: 180, rotate: -6 },
    ];
  }

  return [
    { x: 470, y: 120, width: 910, height: 610, rotate: -2 },
    { x: 110, y: 130, width: 260, height: 320, rotate: -8 },
    { x: 1220, y: 760, width: 200, height: 120, rotate: 0 },
  ];
};

const buildDraftPreviewSvg = ({ compositionProps, assets, preset, reportLabel }) => {
  const width = compositionProps.canvas.width ?? 1920;
  const height = compositionProps.canvas.height ?? 1080;
  const accent = compositionProps.palette?.accentColor ?? presetAccentDefaults[preset] ?? presetAccentDefaults.editorial;
  const backgroundFrom = compositionProps.palette?.backgroundFrom ?? (preset === "cinematic" ? "#1f2430" : preset === "gallery" ? "#e8edf4" : "#efe7dd");
  const backgroundTo = compositionProps.palette?.backgroundTo ?? (preset === "cinematic" ? "#31394c" : preset === "gallery" ? "#cad8e8" : "#dfe7ef");
  const titleColor = compositionProps.palette?.titleColor ?? (preset === "cinematic" ? "#f6f2ec" : "#141d29");
  const bodyColor = preset === "cinematic" ? "#c9cfdb" : "#5c6878";
  const badgeLabel = compositionProps.text?.badge || reportLabel;
  const eyebrowLabel = compositionProps.text?.eyebrow || `${preset.toUpperCase()} DRAFT`;
  const title = compositionProps.text?.title || "Draft Preview";
  const subtitle = compositionProps.text?.subtitle || "Lightweight preview generated without Remotion.";
  const cards = buildDraftLayout({ preset });

  const imageNodes = assets.map((asset, index) => {
    const card = cards[index] ?? cards[cards.length - 1];
    const href = escapeXml(pathToFileURL(asset.absolutePath).href);
    const objectPosition = compositionProps.images[index]?.focalPoint
      ? `${Math.round(compositionProps.images[index].focalPoint.x * 100)}% ${Math.round(compositionProps.images[index].focalPoint.y * 100)}%`
      : "50% 50%";

    return `
    <g transform="translate(${card.x} ${card.y}) rotate(${card.rotate})">
      <rect x="0" y="0" width="${card.width}" height="${card.height}" rx="28" fill="#ffffff" fill-opacity="0.12" stroke="#ffffff" stroke-opacity="0.32"/>
      <clipPath id="clip-${index}">
        <rect x="0" y="0" width="${card.width}" height="${card.height}" rx="28"/>
      </clipPath>
      <image href="${href}" x="0" y="0" width="${card.width}" height="${card.height}" preserveAspectRatio="xMidYMid slice" clip-path="url(#clip-${index})" style="object-position:${objectPosition};"/>
      <rect x="0" y="0" width="${card.width}" height="${card.height}" rx="28" fill="url(#cardShade)"/>
    </g>`.trim();
  });

  return `
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <defs>
    <linearGradient id="bg" x1="0" x2="1" y1="0" y2="1">
      <stop offset="0%" stop-color="${escapeXml(backgroundFrom)}"/>
      <stop offset="100%" stop-color="${escapeXml(backgroundTo)}"/>
    </linearGradient>
    <linearGradient id="cardShade" x1="0" x2="0" y1="0" y2="1">
      <stop offset="0%" stop-color="#ffffff" stop-opacity="0.04"/>
      <stop offset="100%" stop-color="#000000" stop-opacity="0.18"/>
    </linearGradient>
    <filter id="softBlur">
      <feGaussianBlur stdDeviation="60"/>
    </filter>
  </defs>
  <rect width="${width}" height="${height}" fill="url(#bg)"/>
  <circle cx="${Math.round(width * 0.18)}" cy="${Math.round(height * 0.22)}" r="${Math.round(width * 0.12)}" fill="${escapeXml(accent)}" fill-opacity="0.18" filter="url(#softBlur)"/>
  <circle cx="${Math.round(width * 0.82)}" cy="${Math.round(height * 0.78)}" r="${Math.round(width * 0.15)}" fill="#ffffff" fill-opacity="0.08" filter="url(#softBlur)"/>
  ${imageNodes.join("\n")}
  <text x="120" y="600" font-family="Arial, Helvetica, sans-serif" font-size="28" font-weight="700" letter-spacing="8" fill="${escapeXml(accent)}">${escapeXml(eyebrowLabel.toUpperCase())}</text>
  <text x="120" y="690" font-family="Arial, Helvetica, sans-serif" font-size="74" font-weight="800" fill="${escapeXml(titleColor)}">${escapeXml(title)}</text>
  <text x="120" y="760" font-family="Arial, Helvetica, sans-serif" font-size="74" font-weight="800" fill="${escapeXml(titleColor)}">${escapeXml(reportLabel)}</text>
  <text x="120" y="845" font-family="Arial, Helvetica, sans-serif" font-size="28" fill="${escapeXml(bodyColor)}">${escapeXml(subtitle)}</text>
  <rect x="${width - 270}" y="${height - 150}" width="180" height="68" rx="34" fill="#ffffff" fill-opacity="0.10" stroke="#ffffff" stroke-opacity="0.22"/>
  <text x="${width - 180}" y="${height - 107}" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="22" font-weight="700" letter-spacing="2" fill="${escapeXml(titleColor)}">${escapeXml(badgeLabel.toUpperCase())}</text>
  <text x="120" y="${height - 80}" font-family="Arial, Helvetica, sans-serif" font-size="20" fill="${escapeXml(bodyColor)}">Generated in draft mode without invoking Remotion.</text>
</svg>`.trim();
};

const collectInputImages = (request) => request.images;

const prepareAsset = async ({
  sourcePath,
  sessionId,
  index,
  baseDir,
  request,
  publicRoot,
  runtimePublicRoot,
  hostRoot,
  generatedPublicRoot,
}) => {
  const resolvedSource = resolveImageSourcePath({
    sourcePath,
    baseDir,
    runtimePublicRoot,
    hostRoot,
  });
  if (!existsSync(resolvedSource)) {
    throw new Error(`Image not found: ${sourcePath}`);
  }

  const extension = path.extname(resolvedSource).toLowerCase();
  if (!supportedImageExtensions.has(extension)) {
    throw new Error(`Unsupported image extension: ${extension}`);
  }

  const assetDir = path.join(generatedPublicRoot, sessionId);
  ensureDir(assetDir);
  const filename = `${String(index + 1).padStart(2, "0")}-${slugify(path.basename(resolvedSource, extension)) || "image"}${extension}`;
  const outputPath = path.join(assetDir, filename);
  copyFileSync(resolvedSource, outputPath);

  const dimensions = await imageSizeFromFile(outputPath);
  const width = dimensions.width ?? 1600;
  const height = dimensions.height ?? 1200;
  const extensionSupportsAnalysis = rasterExtensions.has(extension);
  const analysis = request.analysis.enabled && extensionSupportsAnalysis
    ? await analyzeRasterImage(outputPath)
    : null;

  return {
    absolutePath: outputPath,
    publicSrc: sanitizeRelativePublicPath(path.relative(publicRoot, outputPath)),
    width,
    height,
    orientation: classifyOrientation(width, height),
    analysis,
  };
};

const preparePlaceholderAsset = ({ sessionId, title, intent, preset, publicRoot, generatedPublicRoot }) => {
  const assetDir = path.join(generatedPublicRoot, sessionId);
  ensureDir(assetDir);
  const outputPath = path.join(assetDir, "generated-placeholder.svg");
  writeFileSync(outputPath, buildPlaceholderSvg({ title, intent, preset }), "utf8");

  return {
    absolutePath: outputPath,
    publicSrc: sanitizeRelativePublicPath(path.relative(publicRoot, outputPath)),
    width: 1600,
    height: 1200,
    orientation: "landscape",
  };
};

const buildCompositionResult = ({ request, assets, preset }) => {
  const autoText = buildAutoText({ intent: request.intent, preset, assets });
  const firstAccent = assets.find((asset) => asset.analysis?.accentColor)?.analysis?.accentColor;
  const resolvedAccentColor = request.palette.accentColor ?? (request.analysis.extractAccentColor ? chooseSafeAccentColor({ extractedAccentColor: firstAccent, preset }) : undefined);
  const text = {
    ...autoText,
    ...request.text,
  };

  return {
    compositionProps: {
      preset,
      images: assets.map((asset, index) => ({
        src: asset.publicSrc,
        focalPoint: inferFocalPoint(asset, preset, index),
        role: index === 0 ? "primary" : index === assets.length - 1 ? "detail" : "support",
      })),
      text,
      palette: {
        ...request.palette,
        accentColor: resolvedAccentColor,
      },
      effects: request.effects,
      canvas: request.canvas,
    },
    decisionMetadata: {
      candidateAccentColor: firstAccent,
      resolvedAccentColor,
      accentFallbackApplied:
        Boolean(firstAccent) &&
        Boolean(resolvedAccentColor) &&
        firstAccent.toLowerCase() !== resolvedAccentColor.toLowerCase(),
    },
  };
};

const removeUndefinedDeep = (value) => {
  if (Array.isArray(value)) {
    return value.map(removeUndefinedDeep);
  }

  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value)
        .filter(([, entryValue]) => entryValue !== undefined)
        .map(([key, entryValue]) => [key, removeUndefinedDeep(entryValue)]),
    );
  }

  return value;
};

const describeBrightness = (value) => {
  if (value === undefined || value === null) return "unknown";
  if (value < 0.25) return "very dark";
  if (value < 0.42) return "dark";
  if (value > 0.72) return "bright";
  return "balanced";
};

const describeDetail = (value) => {
  if (value === undefined || value === null) return "unknown";
  if (value < 0.04) return "low detail";
  if (value < 0.09) return "medium detail";
  return "high detail";
};

const buildReviewIssue = ({ severity, code, message, imageIndex }) => {
  return removeUndefinedDeep({ severity, code, message, imageIndex });
};

const getReviewScore = ({ blockingIssues, warnings }) => {
  const score = 100 - blockingIssues.length * 25 - warnings.length * 8;
  return clamp(score, 0, 100);
};

const evaluateApproval = ({ review, approvalConfig }) => {
  if (approvalConfig.enabled === false) {
    return {
      approved: true,
      recommendedNextMode: approvalConfig.autoPromoteTarget ?? "still",
    };
  }

  const hasBlockingIssues = review.blockingIssues.length > 0;
  const hasTooManyWarnings = review.warnings.length > (approvalConfig.maxWarnings ?? 3);
  const hasWarningsDisallowed = approvalConfig.allowWarnings === false && review.warnings.length > 0;
  const belowScoreThreshold = review.score < (approvalConfig.minScore ?? 70);

  const approved =
    (!hasBlockingIssues || approvalConfig.allowBlockingIssues === true) &&
    !hasTooManyWarnings &&
    !hasWarningsDisallowed &&
    !belowScoreThreshold;

  return {
    approved,
    recommendedNextMode: approved ? approvalConfig.autoPromoteTarget ?? "still" : "draft",
  };
};

const buildPromotedOutputPath = ({ resolvedHostRoot, draftOutputPath, approvalConfig, promotedMode }) => {
  const explicitStageOutput = approvalConfig.promotedOutputs?.[promotedMode];
  if (explicitStageOutput) {
    return path.resolve(resolvedHostRoot, explicitStageOutput);
  }

  if (approvalConfig.promotedOutput) {
    if (promotedMode === "render") {
      return path.resolve(resolvedHostRoot, approvalConfig.promotedOutput);
    }

    const explicitTarget = approvalConfig.autoPromoteTarget ?? "still";
    if (explicitTarget === promotedMode) {
      return path.resolve(resolvedHostRoot, approvalConfig.promotedOutput);
    }
  }

  const extension = promotedMode === "still" ? ".approved-still.jpg" : ".approved-render.mp4";
  return draftOutputPath.replace(/\.svg$/i, extension);
};

const buildStageOutputPath = ({ resolvedHostRoot, baseOutputPath, approvalConfig, promotedMode }) => {
  const explicitStageOutput = approvalConfig.promotedOutputs?.[promotedMode];
  if (explicitStageOutput) {
    return path.resolve(resolvedHostRoot, explicitStageOutput);
  }

  if (approvalConfig.promotedOutput && promotedMode === "render") {
    return path.resolve(resolvedHostRoot, approvalConfig.promotedOutput);
  }

  const parsedPath = path.parse(baseOutputPath);
  const stageSuffix = promotedMode === "still" ? ".promoted-still" : ".promoted-render";
  const extension = promotedMode === "still" ? ".jpg" : ".mp4";

  return path.join(parsedPath.dir, `${parsedPath.name}${stageSuffix}${extension}`);
};

const getPromotionPath = ({ currentMode, approvalConfig }) => {
  if (!approvalConfig.autoPromote) {
    return [];
  }

  const desiredPath = approvalConfig.autoPromotePath ?? [];
  return desiredPath.filter((mode) => stageOrder[mode] > stageOrder[currentMode]);
};

const runPromotionPipeline = ({
  resolvedHostRoot,
  resolvedRuntimeRoot,
  currentMode,
  baseOutputPath,
  approvalConfig,
  propsPath,
  request,
}) => {
  const promotionPath = getPromotionPath({ currentMode, approvalConfig });
  const steps = [];

  for (const promotedMode of promotionPath) {
    const promotedOutputPath = currentMode === "draft"
      ? buildPromotedOutputPath({
          resolvedHostRoot,
          draftOutputPath: baseOutputPath,
          approvalConfig,
          promotedMode,
        })
      : buildStageOutputPath({
          resolvedHostRoot,
          baseOutputPath,
          approvalConfig,
          promotedMode,
        });

    ensureDir(path.dirname(promotedOutputPath));
    runRemotionOutput({
      resolvedRuntimeRoot,
      mode: promotedMode,
      outputPath: promotedOutputPath,
      propsPath,
      request,
    });

    steps.push({
      mode: promotedMode,
      output: promotedOutputPath,
    });
  }

  return steps;
};

const runRemotionOutput = ({ resolvedRuntimeRoot, mode, outputPath, propsPath, request }) => {
  const entryFile = path.join(resolvedRuntimeRoot, "src", "index.ts");
  const remotionBin = path.join(
    resolvedRuntimeRoot,
    "node_modules",
    ".bin",
    process.platform === "win32" ? "remotion.cmd" : "remotion",
  );

  const renderArgs = mode === "still"
    ? ["still", entryFile, "AgentImageMotion", outputPath, `--props=${propsPath}`]
    : ["render", entryFile, "AgentImageMotion", outputPath, `--props=${propsPath}`];

  if (mode === "still") {
    renderArgs.push(`--frame=${request.frame ?? 45}`);
  }

  if (request.codec && mode === "render") {
    renderArgs.push(`--codec=${request.codec}`);
  }

  const result = process.platform === "win32"
    ? spawnSync("cmd.exe", ["/d", "/s", "/c", remotionBin, ...renderArgs], {
        cwd: resolvedRuntimeRoot,
        stdio: "inherit",
      })
    : spawnSync(remotionBin, renderArgs, {
        cwd: resolvedRuntimeRoot,
        stdio: "inherit",
      });

  if (result.error) {
    throw result.error;
  }

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
};

const buildDraftReview = ({ request, preset, assets, compositionProps, decisionMetadata, outputPath }) => {
  const width = compositionProps.canvas.width ?? 1920;
  const height = compositionProps.canvas.height ?? 1080;
  const importedImages = assets.map((asset, index) => ({
    index: index + 1,
    src: asset.publicSrc,
    orientation: asset.orientation,
    brightness: describeBrightness(asset.analysis?.averageBrightness),
    detail: describeDetail(asset.analysis?.detailScore),
    focalPoint: compositionProps.images[index]?.focalPoint,
    extractedAccentColor: asset.analysis?.accentColor ?? null,
  }));

  const blockingIssues = [];
  const warnings = [];
  const recommendedChanges = [];

  const title = compositionProps.text?.title?.trim();
  const subtitle = compositionProps.text?.subtitle?.trim();
  const hasPlaceholder = assets.some((asset) => asset.publicSrc.endsWith("generated-placeholder.svg"));
  const veryDarkImages = importedImages.filter((image) => image.brightness === "very dark");
  const lowDetailImages = importedImages.filter((image) => image.detail === "low detail");
  const unknownOrientationImages = importedImages.filter((image) => image.orientation === "unknown");

  if (!title) {
    blockingIssues.push(
      buildReviewIssue({
        severity: "blocking",
        code: "missing-title",
        message: "No title was provided. Add a clear title before promoting this draft to still or render.",
      }),
    );
    recommendedChanges.push({ action: "addTitle", reason: "A title is required for a production-facing motion scene." });
  }

  if (hasPlaceholder) {
    blockingIssues.push(
      buildReviewIssue({
        severity: "blocking",
        code: "placeholder-asset",
        message: "The draft is using a generated placeholder asset. Replace it with a real image before still or render.",
      }),
    );
    recommendedChanges.push({ action: "replacePlaceholder", reason: "Placeholder assets should not move into still or render stages." });
  }

  if (!subtitle) {
    warnings.push(
      buildReviewIssue({
        severity: "warning",
        code: "missing-subtitle",
        message: "No subtitle was provided. Consider adding supporting copy for better motion hierarchy.",
      }),
    );
    recommendedChanges.push({ action: "addSubtitle", reason: "Supporting copy can improve narrative clarity in motion previews." });
  }

  if (assets.length > 1 && preset !== "gallery") {
    warnings.push(
      buildReviewIssue({
        severity: "warning",
        code: "multi-image-non-gallery",
        message: "Multiple images were provided but the preset is not gallery. Review whether sequencing would read better with gallery preset.",
      }),
    );
    recommendedChanges.push({ action: "changePreset", target: "gallery", reason: "Gallery preset usually reads more clearly for multi-image layouts." });
  }

  if (veryDarkImages.length > 0) {
    warnings.push(
      buildReviewIssue({
        severity: "warning",
        code: "very-dark-image",
        message: `${veryDarkImages.length} image(s) are very dark. Confirm subject clarity before promoting to still.`,
        imageIndex: veryDarkImages[0]?.index,
      }),
    );
    recommendedChanges.push({ action: "increaseContrast", reason: "Dark assets may hide the subject in motion unless contrast is improved." });
  }

  if (lowDetailImages.length > 0) {
    warnings.push(
      buildReviewIssue({
        severity: "warning",
        code: "low-detail-image",
        message: `${lowDetailImages.length} image(s) have low detected detail. Validate that the crop still feels intentional.`,
        imageIndex: lowDetailImages[0]?.index,
      }),
    );
  }

  if (unknownOrientationImages.length > 0) {
    warnings.push(
      buildReviewIssue({
        severity: "warning",
        code: "unknown-orientation",
        message: "Some images could not be classified by orientation. Review the layout manually before moving forward.",
        imageIndex: unknownOrientationImages[0]?.index,
      }),
    );
  }

  if (decisionMetadata.accentFallbackApplied) {
    warnings.push(
      buildReviewIssue({
        severity: "warning",
        code: "accent-fallback-applied",
        message: `Extracted accent ${decisionMetadata.candidateAccentColor} was replaced with ${decisionMetadata.resolvedAccentColor} for readability.`,
      }),
    );
    recommendedChanges.push({ action: "reviewAccentColor", reason: "Auto-extracted accent was unsafe, so the preset fallback was used instead." });
  }

  const score = getReviewScore({ blockingIssues, warnings });

  const checks = [
    {
      name: "layout-strategy",
      status: "pass",
      detail: `Preset ${preset} selected for ${assets.length} asset(s) on a ${width}x${height} canvas.`,
    },
    {
      name: "copy-coverage",
      status: title ? "pass" : "warning",
      detail: title
        ? "Title is present for review."
        : "No title was provided; consider adding stronger headline copy before still/render.",
    },
    {
      name: "accent-safety",
      status: decisionMetadata.accentFallbackApplied ? "pass" : "pass",
      detail: decisionMetadata.accentFallbackApplied
        ? `Extracted accent ${decisionMetadata.candidateAccentColor} was replaced with ${decisionMetadata.resolvedAccentColor} for readability.`
        : `Accent color resolved as ${decisionMetadata.resolvedAccentColor ?? "default preset accent"}.`,
    },
    {
      name: "engine-cost",
      status: "pass",
      detail: "Draft preview was generated without invoking Remotion.",
    },
  ];

  const recommendations = [
    "Use draft mode for approval of layout, hierarchy, and palette direction.",
    "Switch to still mode when you need a frame-accurate Remotion-backed preview.",
    "Switch to render mode only after text and preset are approved.",
  ];

  if (assets.length > 1 && preset !== "gallery") {
    recommendations.unshift("Consider gallery preset if multiple images should read as a sequence rather than a hero/detail pairing.");
  }

  const baseReview = {
    mode: request.mode,
    reviewType: "draft-approval",
    score,
    outputPreview: outputPath,
    canvas: { width, height },
    preset,
    images: importedImages,
    checks,
    blockingIssues,
    warnings,
    recommendations,
    recommendedChanges,
  };

  const approvalDecision = evaluateApproval({
    review: {
      blockingIssues,
      warnings,
      score,
    },
    approvalConfig: request.approval,
  });

  return {
    ...baseReview,
    approved: approvalDecision.approved,
    recommendedNextMode: approvalDecision.recommendedNextMode,
    nextBestMode: approvalDecision.recommendedNextMode,
    approvalConfig: {
      enabled: request.approval.enabled,
      minScore: request.approval.minScore,
      allowWarnings: request.approval.allowWarnings,
      maxWarnings: request.approval.maxWarnings,
      allowBlockingIssues: request.approval.allowBlockingIssues,
      autoPromote: request.approval.autoPromote,
      autoPromoteTarget: request.approval.autoPromoteTarget,
      autoPromotePath: request.approval.autoPromotePath,
    },
  };
};

const buildDraftReviewMarkdown = (review) => {
  return [
    "# Draft Review Report",
    "",
    `Preview: ${review.outputPreview}`,
    `Preset: ${review.preset}`,
    `Canvas: ${review.canvas.width}x${review.canvas.height}`,
    `Approved: ${review.approved ? "yes" : "no"}`,
    `Score: ${review.score}/100`,
    `Suggested Next Mode: ${review.recommendedNextMode}`,
    `Auto Promotion: ${review.autoPromotion?.promoted ? review.autoPromotion.steps.map((step) => `${step.mode} -> ${step.output}`).join(" | ") : `not promoted (${review.autoPromotion?.reason ?? "n/a"})`}`,
    "",
    "## Checks",
    ...review.checks.map((check) => `- ${check.name}: ${check.status} — ${check.detail}`),
    "",
    "## Blocking Issues",
    ...(review.blockingIssues.length > 0
      ? review.blockingIssues.map((issue) => `- ${issue.code}: ${issue.message}`)
      : ["- None"]),
    "",
    "## Warnings",
    ...(review.warnings.length > 0
      ? review.warnings.map((issue) => `- ${issue.code}: ${issue.message}`)
      : ["- None"]),
    "",
    "## Images",
    ...review.images.map(
      (image) => `- Image ${image.index}: ${image.src} | ${image.orientation} | ${image.brightness} | ${image.detail} | focal ${Math.round((image.focalPoint?.x ?? 0.5) * 100)}%/${Math.round((image.focalPoint?.y ?? 0.5) * 100)}%`,
    ),
    "",
    "## Recommended Changes",
    ...(review.recommendedChanges.length > 0
      ? review.recommendedChanges.map((change) => `- ${change.action}${change.target ? ` -> ${change.target}` : ""}: ${change.reason}`)
      : ["- None"]),
    "",
    "## Recommendations",
    ...review.recommendations.map((item) => `- ${item}`),
    "",
  ].join("\n");
};

const printSummary = (report) => {
  console.log("\nAgent skill render summary:");
  console.log(JSON.stringify(report, null, 2));
};

export const runAgentImageMotionCli = async ({
  argv,
  hostRoot = process.cwd(),
  runtimeRoot = getDefaultRuntimeRoot(),
} = {}) => {
  const resolvedHostRoot = path.resolve(hostRoot);
  const resolvedRuntimeRoot = path.resolve(runtimeRoot);
  const { name, version, commandName } = getPackageMetadata(resolvedRuntimeRoot);

  if (hasCliFlag(argv, "--help", "-h")) {
    printHelp({ commandName, version });
    return { name, version, commandName, command: "help" };
  }

  if (hasCliFlag(argv, "--version", "-v")) {
    console.log(version);
    return { name, version, commandName, command: "version" };
  }

  const publicRoot = path.join(resolvedRuntimeRoot, "public");
  const outRoot = path.join(resolvedHostRoot, "out", "agent-skill");
  const generatedPublicRoot = path.join(publicRoot, "agent-inputs");

  const args = parseArgs(argv ?? []);
  const requestPath = args.request ? path.resolve(resolvedHostRoot, args.request) : null;
  const rawRequest = requestPath ? readJsonFile(requestPath) : args;
  const request = normalizeAgentSkillRequest(rawRequest);
  const requestBaseDir = requestPath ? path.dirname(requestPath) : resolvedHostRoot;
  const sessionId = `${new Date().toISOString().replace(/[:.]/g, "-")}-${Math.random().toString(36).slice(2, 8)}`;
  ensureDir(outRoot);
  ensureDir(generatedPublicRoot);

  const inputImages = collectInputImages(request);
  const intentText = inferIntentText(request);

  let assets;
  if (inputImages.length === 0) {
    const provisionalPreset = request.preset || "editorial";
    assets = [preparePlaceholderAsset({ sessionId, title: request.text.title, intent: request.intent, preset: provisionalPreset, publicRoot, generatedPublicRoot })];
  } else {
    assets = [];
    for (let index = 0; index < inputImages.length; index += 1) {
      const asset = await prepareAsset({
        sourcePath: inputImages[index],
        sessionId,
        index,
        baseDir: requestBaseDir,
        request,
        publicRoot,
        runtimePublicRoot: publicRoot,
        hostRoot: resolvedHostRoot,
        generatedPublicRoot,
      });
      assets.push(asset);
    }
  }

  const preset = inferPreset({ explicitPreset: request.preset, intentText, assets });

  if (inputImages.length === 0) {
    assets = [preparePlaceholderAsset({ sessionId, title: request.text.title, intent: request.intent, preset, publicRoot, generatedPublicRoot })];
  }

  const { compositionProps: rawCompositionProps, decisionMetadata } = buildCompositionResult({ request, assets, preset });
  const compositionProps = removeUndefinedDeep(rawCompositionProps);
  const propsPath = path.join(outRoot, `${sessionId}.props.json`);
  writeFileSync(propsPath, JSON.stringify(compositionProps, null, 2), "utf8");

  const isDraftMode = request.mode === "draft";
  const isStillMode = request.mode === "still";
  const outputPath = request.output
    ? path.resolve(resolvedHostRoot, request.output)
    : path.join(outRoot, `${sessionId}.${isDraftMode ? "svg" : isStillMode ? "jpg" : "mp4"}`);
  ensureDir(path.dirname(outputPath));

  if (isDraftMode) {
    const draftSvg = buildDraftPreviewSvg({
      compositionProps,
      assets,
      preset,
      reportLabel: "Draft Preview",
    });
    writeFileSync(outputPath, draftSvg, "utf8");

    const review = buildDraftReview({
      request,
      preset,
      assets,
      compositionProps,
      decisionMetadata,
      outputPath,
    });
    const reviewJsonPath = outputPath.replace(/\.svg$/i, ".review.json");
    const reviewMdPath = outputPath.replace(/\.svg$/i, ".review.md");

    let autoPromotion = null;
    if (review.approved && request.approval.autoPromote) {
      const promotionSteps = runPromotionPipeline({
        resolvedHostRoot,
        resolvedRuntimeRoot,
        currentMode: "draft",
        baseOutputPath: outputPath,
        approvalConfig: request.approval,
        propsPath,
        request,
      });
      autoPromotion = {
        promoted: promotionSteps.length > 0,
        steps: promotionSteps,
      };
      review.autoPromotion = autoPromotion;
    } else {
      review.autoPromotion = {
        promoted: false,
        steps: [],
        reason: review.approved ? "autoPromote disabled" : "draft approval did not pass",
      };
    }

    writeFileSync(reviewJsonPath, JSON.stringify(review, null, 2), "utf8");
    writeFileSync(reviewMdPath, buildDraftReviewMarkdown(review), "utf8");

    const report = {
      mode: request.mode,
      engine: "draft-preview",
      output: outputPath,
      propsPath,
      preset,
      reviewJsonPath,
      reviewMdPath,
      autoPromotion,
      importedImages: assets.map((asset) => ({
        src: asset.publicSrc,
        width: asset.width,
        height: asset.height,
        orientation: asset.orientation,
        analysis: asset.analysis,
      })),
    };

    printSummary(report);
    return report;
  }

  runRemotionOutput({
    resolvedRuntimeRoot,
    mode: isStillMode ? "still" : "render",
    outputPath,
    propsPath,
    request,
  });

  const promotionSteps = isStillMode
    ? runPromotionPipeline({
      resolvedHostRoot,
      resolvedRuntimeRoot,
        currentMode: "still",
        baseOutputPath: outputPath,
        approvalConfig: request.approval,
        propsPath,
        request,
      })
    : [];

  const report = {
    mode: request.mode,
    engine: "remotion",
    output: outputPath,
    propsPath,
    preset,
    autoPromotion: promotionSteps.length > 0 ? {
      promoted: true,
      steps: promotionSteps,
    } : null,
    importedImages: assets.map((asset) => ({
      src: asset.publicSrc,
      width: asset.width,
      height: asset.height,
      orientation: asset.orientation,
      analysis: asset.analysis,
    })),
  };

  printSummary(report);
  return report;
};
