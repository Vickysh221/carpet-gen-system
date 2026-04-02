import type { CompiledVisualIntentPackage, GenerationSemanticSpec } from "./types.visualIntent";

function compact(parts: Array<string | undefined | null | false>) {
  return parts.filter((part): part is string => Boolean(part && part.trim())).join(", ");
}

function joinList(values: string[] | undefined) {
  return values && values.length > 0 ? values.join(", ") : undefined;
}

const MIDJOURNEY_TERM_MAP: Array<[RegExp, string]> = [
  [/整体先带一点存在感和活力/g, "visible lively presence"],
  [/存在感和活力/g, "visible lively presence"],
  [/存在感/g, "presence"],
  [/活力/g, "liveliness"],
  [/灯火\s*impression/gi, "lamp-glow impression"],
  [/月白/g, "moonwhite"],
  [/灯火/g, "lamplight"],
  [/暮色/g, "dusk"],
  [/烟雨/g, "mist-rain"],
  [/竹影/g, "bamboo-shadow"],
  [/不要太花/g, "avoid dense ornament"],
];

function sanitizeMidjourneyToken(value: string | undefined) {
  if (!value) {
    return undefined;
  }

  let result = value;
  for (const [pattern, replacement] of MIDJOURNEY_TERM_MAP) {
    result = result.replace(pattern, replacement);
  }

  result = result
    .replace(/[^\x00-\x7F]+/g, " ")
    .replace(/\bavoid\s+/gi, "")
    .replace(/\s+/g, " ")
    .replace(/\s+,/g, ",")
    .trim();

  return result.length > 0 ? result : undefined;
}

function sanitizeMidjourneyList(values: string[] | undefined) {
  return values
    ?.map((value) => sanitizeMidjourneyToken(value))
    .filter((value): value is string => Boolean(value));
}

function dedupeCsvParts(values: Array<string | undefined>) {
  return [...new Set(values.filter((value): value is string => Boolean(value && value.trim())))];
}

function mapPatternMotion(value: string | undefined) {
  switch (value) {
    case "still":
      return "still pattern flow";
    case "gentle-flow":
      return "gentle flowing movement";
    case "directional-flow":
      return "clear directional flow";
    case "pulsed":
      return "pulsed rhythmic movement";
    default:
      return value;
  }
}

function mapPresenceBlending(value: string | undefined) {
  switch (value) {
    case "blended":
      return "blended presence";
    case "softly-noticeable":
      return "softly noticeable presence";
    case "focal":
      return "focal presence";
    default:
      return value;
  }
}

function mapArrangementSpread(value: string | undefined) {
  switch (value) {
    case "airy":
      return "airy spacing";
    case "balanced":
      return "balanced spacing";
    case "compact":
      return "compact spacing";
    default:
      return value;
  }
}

function mapArrangementFlow(value: string | undefined) {
  switch (value) {
    case "none":
      return "non-directional layout";
    case "gentle":
      return "gentle directional drift";
    case "clear":
      return "clear directional flow";
    default:
      return value;
  }
}

function mapOrderliness(value: string | undefined) {
  switch (value) {
    case "loose":
      return "loose ordering";
    case "balanced":
      return "balanced ordering";
    case "ordered":
      return "ordered structure";
    default:
      return value;
  }
}

function mapPaletteDescriptor(label: string, value: string | undefined) {
  if (!value) {
    return undefined;
  }

  switch (label) {
    case "temperature":
      return `${value} palette`;
    case "saturation":
      return `${value} saturation`;
    case "brightness":
      return `${value} brightness`;
    case "contrast":
      return `${value} contrast`;
    case "haze":
      return `${value} haze`;
    default:
      return value;
  }
}

function buildMidjourneyPatternBlock(spec: GenerationSemanticSpec) {
  if (!spec.pattern) {
    return undefined;
  }

  return compact([
    spec.pattern.abstraction ? `${spec.pattern.abstraction} pattern language` : undefined,
    joinList(sanitizeMidjourneyList(spec.pattern.explicitMotifs)),
    joinList(sanitizeMidjourneyList(spec.pattern.structuralPattern)),
    joinList(sanitizeMidjourneyList(spec.pattern.atmosphericPattern)),
    sanitizeMidjourneyToken(mapPatternMotion(spec.pattern.motion)),
    spec.pattern.edgeDefinition ? sanitizeMidjourneyToken(`${spec.pattern.edgeDefinition} edges`) : undefined,
    spec.pattern.motifBehavior ? sanitizeMidjourneyToken(`${spec.pattern.motifBehavior} motif visibility`) : undefined,
  ]);
}

function buildMidjourneyAtmosphereBlock(spec: GenerationSemanticSpec) {
  return joinList(sanitizeMidjourneyList(spec.atmosphere));
}

function buildMidjourneyPaletteBlock(spec: GenerationSemanticSpec) {
  if (!spec.palette) {
    return undefined;
  }

  return compact([
    sanitizeMidjourneyToken(mapPaletteDescriptor("temperature", spec.palette.temperature)),
    sanitizeMidjourneyToken(mapPaletteDescriptor("saturation", spec.palette.saturation)),
    sanitizeMidjourneyToken(mapPaletteDescriptor("brightness", spec.palette.brightness)),
    sanitizeMidjourneyToken(mapPaletteDescriptor("contrast", spec.palette.contrast)),
    sanitizeMidjourneyToken(mapPaletteDescriptor("haze", spec.palette.haze)),
    spec.palette.base ? sanitizeMidjourneyToken(`base tone ${spec.palette.base}`) : undefined,
    spec.palette.accent ? sanitizeMidjourneyToken(`accent ${spec.palette.accent}`) : undefined,
  ]);
}

function buildMidjourneyPresenceBlock(spec: GenerationSemanticSpec) {
  if (!spec.presence) {
    return undefined;
  }

  return compact([
    sanitizeMidjourneyToken(mapPresenceBlending(spec.presence.blending)),
    spec.presence.visualWeight ? sanitizeMidjourneyToken(`${spec.presence.visualWeight} visual weight`) : undefined,
    spec.presence.behavior ? sanitizeMidjourneyToken(spec.presence.behavior) : undefined,
  ]);
}

function buildMidjourneyArrangementBlock(spec: GenerationSemanticSpec) {
  if (!spec.arrangement) {
    return undefined;
  }

  return compact([
    sanitizeMidjourneyToken(mapArrangementSpread(spec.arrangement.spread)),
    sanitizeMidjourneyToken(mapArrangementFlow(spec.arrangement.directionalFlow)),
    spec.arrangement.rhythm ? sanitizeMidjourneyToken(`${spec.arrangement.rhythm} rhythm`) : undefined,
    sanitizeMidjourneyToken(mapOrderliness(spec.arrangement.orderliness)),
  ]);
}

export function buildPatternFirstPrompt(spec: GenerationSemanticSpec) {
  return compact([
    spec.pattern
      ? compact([
          spec.pattern.abstraction && `${spec.pattern.abstraction} pattern language`,
          joinList(spec.pattern.structuralPattern),
          joinList(spec.pattern.atmosphericPattern),
          spec.pattern.motion && `${spec.pattern.motion} movement`,
          spec.pattern.edgeDefinition && `${spec.pattern.edgeDefinition} edges`,
          spec.pattern.motifBehavior && `${spec.pattern.motifBehavior} motif visibility`,
        ])
      : undefined,
    spec.atmosphere ? joinList(spec.atmosphere) : undefined,
    spec.palette
      ? compact([
          spec.palette.temperature && `${spec.palette.temperature} palette`,
          spec.palette.saturation && `${spec.palette.saturation} saturation`,
          spec.palette.brightness && `${spec.palette.brightness} brightness`,
          spec.palette.haze && `${spec.palette.haze} haze`,
        ])
      : undefined,
    spec.presence
      ? compact([
          spec.presence.blending && `${spec.presence.blending} presence`,
          spec.presence.visualWeight && `${spec.presence.visualWeight} visual weight`,
        ])
      : undefined,
    spec.arrangement
      ? compact([
          spec.arrangement.spread && `${spec.arrangement.spread} spread`,
          spec.arrangement.directionalFlow && `${spec.arrangement.directionalFlow} directional flow`,
          spec.arrangement.orderliness && `${spec.arrangement.orderliness} orderliness`,
        ])
      : undefined,
  ]);
}

export function buildGenericImagePrompt(spec: GenerationSemanticSpec) {
  return compact([
    "abstract textile surface design",
    spec.baseMood ? joinList(spec.baseMood) : undefined,
    spec.atmosphere ? joinList(spec.atmosphere) : undefined,
    spec.palette
      ? compact([
          spec.palette.base,
          spec.palette.accent,
          spec.palette.relation,
          spec.palette.temperature,
          spec.palette.saturation,
          spec.palette.brightness,
          spec.palette.contrast,
        ])
      : undefined,
    buildPatternFirstPrompt(spec),
    spec.constraints?.keepQualities ? joinList(spec.constraints.keepQualities) : undefined,
  ]);
}

export function buildMidjourneyPrompt(spec: GenerationSemanticSpec) {
  const prompt = compact([
    buildMidjourneyPatternBlock(spec),
    buildMidjourneyAtmosphereBlock(spec),
    buildMidjourneyPaletteBlock(spec),
    buildMidjourneyPresenceBlock(spec),
    buildMidjourneyArrangementBlock(spec),
    joinList(sanitizeMidjourneyList(spec.baseMood)),
    "flat 2D pattern",
    "seamless textile pattern",
    "orthographic top-down view",
    "edge-to-edge pattern field",
  ]);

  return sanitizeMidjourneyToken(prompt) ?? prompt;
}

export function buildMidjourneyNegativePrompt(spec: GenerationSemanticSpec) {
  const negatives = dedupeCsvParts([
    ...(sanitizeMidjourneyList(spec.constraints?.avoidMotifs) ?? []),
    ...(sanitizeMidjourneyList(spec.constraints?.avoidStyles) ?? []),
    ...(sanitizeMidjourneyList(spec.constraints?.avoidPalette) ?? []),
    ...(sanitizeMidjourneyList(spec.constraints?.avoidComposition) ?? []),
    "literal landscape",
    "perspective view",
    "room scene",
    "product mockup",
    "perspective staging",
  ])
    .map((item) => item.replace(/^no\s+/i, "").trim())
    .filter(Boolean);

  return negatives.length > 0 ? `--no ${negatives.join(", ")}` : "--no room scene, product mockup, perspective staging";
}

export function buildCompactPromptSummary(pkg: Pick<CompiledVisualIntentPackage, "semanticSpec" | "summary">) {
  return compact([
    pkg.summary,
    pkg.semanticSpec.pattern?.structuralPattern?.[0],
    pkg.semanticSpec.palette?.base,
    pkg.semanticSpec.palette?.accent,
  ]);
}
