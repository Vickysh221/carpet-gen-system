import { buildCompactPromptSummary, buildMidjourneyNegativePrompt, buildMidjourneyPrompt } from "./promptAdapters";
import type {
  CompiledVisualIntentPackage,
  TuningSuggestions,
  VisualIntentRisk,
  VisualIntentTestBundle,
} from "./types.visualIntent";

function buildTestLabel(pkg: CompiledVisualIntentPackage) {
  const base = pkg.semanticSpec.baseMood?.[0] ?? "open";
  const pattern = pkg.semanticSpec.pattern?.structuralPattern?.[0] ?? pkg.semanticSpec.pattern?.atmosphericPattern?.[0] ?? "pattern";
  const accent = pkg.semanticSpec.palette?.accent ? "accent" : "base";
  return `${base}-${pattern}-${accent}_v1`
    .replace(/\s+/g, "-")
    .replace(/[^a-zA-Z0-9\-_]/g, "")
    .toLowerCase();
}

function buildRisks(pkg: CompiledVisualIntentPackage): VisualIntentRisk[] {
  const risks: VisualIntentRisk[] = [];
  const spec = pkg.semanticSpec;

  if ((spec.pattern?.atmosphericPattern?.length ?? 0) > 0 && (spec.pattern?.structuralPattern?.length ?? 0) === 0) {
    risks.push({
      type: "pattern-collapse",
      description: "Atmospheric pattern may collapse into generic haze if structural pattern is too weak.",
      severity: "medium",
    });
  }

  if (pkg.negativePrompt.includes("literal landscape") || spec.pattern?.keyElements?.includes("landscape")) {
    risks.push({
      type: "too-literal",
      description: "May drift into scenic illustration instead of abstract pattern behavior.",
      severity: "high",
    });
  }

  if ((spec.presence?.visualWeight === "light" || spec.presence?.focalness === "low") && Boolean(spec.palette?.accent)) {
    risks.push({
      type: "accent-loss",
      description: "Warm or local accent may disappear if blended presence stays too weak.",
      severity: "medium",
    });
  }

  if ((spec.presence?.visualWeight === "light" || spec.presence?.focalness === "low") && !spec.palette?.accent) {
    risks.push({
      type: "presence-loss",
      description: "The image may become too backgrounded and lose readable intention.",
      severity: "medium",
    });
  }

  if (pkg.negativePrompt.includes("dense decorative floral ornament")) {
    risks.push({
      type: "too-decorative",
      description: "Decorative motif density may come back unless the negative prompt is strongly respected.",
      severity: "high",
    });
  }

  if (pkg.negativePrompt.includes("hotel-luxury styling")) {
    risks.push({
      type: "too-luxury",
      description: "Warm accent and restraint may be misread as hotel-luxury styling.",
      severity: "medium",
    });
  }

  if (spec.palette?.contrast === "soft" && spec.pattern?.density === "low") {
    risks.push({
      type: "too-flat",
      description: "Soft palette plus low-density pattern may flatten into an under-articulated surface.",
      severity: "medium",
    });
  }

  return risks;
}

function buildTuningSuggestions(pkg: CompiledVisualIntentPackage): TuningSuggestions {
  const risks = buildRisks(pkg);

  return {
    ifTooFlat: risks.some((risk) => risk.type === "too-flat")
      ? ["raise structure clarity slightly", "add subtle local lift", "increase edge definition one step"]
      : undefined,
    ifTooLiteral: risks.some((risk) => risk.type === "too-literal")
      ? ["increase abstraction", "reduce scenic cues", "emphasize pattern field over imagery"]
      : undefined,
    ifTooDecorative: risks.some((risk) => risk.type === "too-decorative")
      ? ["lower density", "remove ornamental repetition", "push motif behavior toward suggestive"]
      : undefined,
    ifTooLoud: ["lower contrast", "reduce accent visibility", "pull back saturation"],
    ifPresenceTooWeak: risks.some((risk) => risk.type === "presence-loss")
      ? ["raise focalness slightly", "let one local area lift", "increase visual weight one step"]
      : undefined,
    ifAccentLost: risks.some((risk) => risk.type === "accent-loss")
      ? ["protect accent relation", "raise local warmth slightly", "keep accent small but readable"]
      : undefined,
  };
}

export function buildVisualIntentTestBundle(pkg: CompiledVisualIntentPackage): VisualIntentTestBundle {
  return {
    testLabel: buildTestLabel(pkg),
    canonicalState: pkg.canonicalState,
    summary: buildCompactPromptSummary(pkg),
    semanticSpec: pkg.semanticSpec,
    prompt: buildMidjourneyPrompt(pkg.semanticSpec),
    negativePrompt: buildMidjourneyNegativePrompt(pkg.semanticSpec),
    risks: buildRisks(pkg),
    tuningSuggestions: buildTuningSuggestions(pkg),
    confidenceState: pkg.confidenceState,
    unresolvedQuestions: pkg.unresolvedQuestions,
    trace: pkg.trace,
  };
}
