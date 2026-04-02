import type { PatternIntentState } from "./types";
import type { TemporaryMotifTemplate, VisualIntentCompilerInput } from "./types.visualIntent";

function unique<T>(items: T[]) {
  return [...new Set(items)];
}

function uniqueStrings(items: Array<string | undefined>) {
  return unique(items.filter((item): item is string => Boolean(item && item.trim())));
}

export interface ExplicitMotifExpansionResult {
  coreSubjects: string[];
  coreExplicitMotifs: string[];
  coreStructuralPatterns: string[];
  antiLiteralRules: string[];
  temporaryMotifs: TemporaryMotifTemplate[];
}

function buildTextCorpus(input: VisualIntentCompilerInput) {
  return [
    ...(input.freeTextInputs ?? []),
    ...(input.selectedOptions?.map((option) => option.label) ?? []),
    input.analysis.agentState?.cumulativeText ?? "",
  ].join(" ");
}

function buildCoreExplicitMotifs(textCorpus: string, patternIntent: PatternIntentState | undefined) {
  return uniqueStrings([
    /荷花|莲花|荷叶|莲/.test(textCorpus) || patternIntent?.keyElement === "lotus" ? "lotus petal motif" : undefined,
    /花叶|花卉|花朵|花瓣/.test(textCorpus) || patternIntent?.keyElement === "floral" ? "floral accent" : undefined,
    /花叶|叶影|叶片|枝叶/.test(textCorpus) ? "leaf silhouette" : undefined,
    /竹|枝|枝影|植物/.test(textCorpus) || patternIntent?.keyElement === "botanical" ? "leaf rhythm" : undefined,
    /孤帆|云帆|远帆|帆影|白帆/.test(textCorpus) ? "distant sail silhouette" : undefined,
    /波纹|水波|水纹|涟漪/.test(textCorpus) || patternIntent?.keyElement === "water-wave" ? "water trace" : undefined,
    /灯火|光斑|灯影/.test(textCorpus) || patternIntent?.keyElement === "light-trace" ? "light trace accent" : undefined,
  ]);
}

function buildCoreStructuralPatterns(textCorpus: string, patternIntent: PatternIntentState | undefined) {
  return uniqueStrings([
    patternIntent?.keyElement === "floral" ? "petal rhythm" : undefined,
    patternIntent?.keyElement === "lotus" ? "lotus-petal rhythm" : undefined,
    patternIntent?.keyElement === "botanical" ? "branch-shadow rhythm" : undefined,
    patternIntent?.keyElement === "water-wave" ? "water-trace" : undefined,
    patternIntent?.keyElement === "light-trace" ? "light-trace" : undefined,
    /孤帆|云帆|远帆|帆影|白帆/.test(textCorpus) ? "distant sail trace" : undefined,
  ]);
}

function buildCoreSubjects(textCorpus: string, patternIntent: PatternIntentState | undefined) {
  return uniqueStrings([
    patternIntent?.keyElement,
    /叶影|叶片|枝叶/.test(textCorpus) ? "leaf" : undefined,
    /孤帆|云帆|远帆|帆影|白帆/.test(textCorpus) ? "sail" : undefined,
  ]);
}

function buildTemporaryTemplates(textCorpus: string): TemporaryMotifTemplate[] {
  const templates: TemporaryMotifTemplate[] = [];

  if (/葡萄/.test(textCorpus)) {
    templates.push({
      rawText: "葡萄",
      normalizedSubject: "grape",
      confidence: 0.72,
      visualTraits: ["clustered rounded forms", "hanging grouped rhythm", "dense-but-organized punctuation"],
      structuralPatternCandidates: ["cluster rhythm", "bead-like grouping", "hanging punctuation"],
      explicitMotifPhrases: ["grape-like clustered accents", "rounded clustered punctuation"],
      antiLiteralWarnings: ["avoid literal fruit illustration", "avoid vineyard decorative motif"],
      recommendedRenderingMode: "suggestive",
      recommendedAbstraction: "semi-abstract",
      provisionalNegativeHints: ["realistic grapes", "vineyard scene", "fruit basket illustration"],
      reviewStatus: "temporary",
    });
  }

  if (/虾/.test(textCorpus)) {
    templates.push({
      rawText: "虾",
      normalizedSubject: "shrimp",
      confidence: 0.68,
      visualTraits: ["curved segmented silhouette", "small directional hooks", "repeating bent rhythm"],
      structuralPatternCandidates: ["curved hook rhythm", "segmented arc repetition"],
      explicitMotifPhrases: ["shrimp-like curved accents", "segmented arc motif"],
      antiLiteralWarnings: ["avoid seafood illustration", "avoid restaurant decorative theme"],
      recommendedRenderingMode: "silhouette",
      recommendedAbstraction: "semi-abstract",
      provisionalNegativeHints: ["realistic shrimp", "seafood platter", "restaurant poster"],
      reviewStatus: "temporary",
    });
  }

  if (/贝壳|海螺/.test(textCorpus)) {
    templates.push({
      rawText: /海螺/.test(textCorpus) ? "海螺" : "贝壳",
      normalizedSubject: /海螺/.test(textCorpus) ? "conch" : "shell",
      confidence: 0.7,
      visualTraits: ["fan-like radial spread", "layered shell contour", "spiral shell trace"],
      structuralPatternCandidates: ["shell fan rhythm", "spiral contour trace"],
      explicitMotifPhrases: ["shell-like radial accent", "spiral shell silhouette"],
      antiLiteralWarnings: ["avoid seaside souvenir illustration", "avoid literal shell still life"],
      recommendedRenderingMode: "structural",
      recommendedAbstraction: "semi-abstract",
      provisionalNegativeHints: ["realistic shell", "beach scene", "sea souvenir graphic"],
      reviewStatus: "temporary",
    });
  }

  return templates.slice(0, 2);
}

export function expandExplicitMotifs(
  input: VisualIntentCompilerInput,
  patternIntent: PatternIntentState | undefined,
): ExplicitMotifExpansionResult {
  const textCorpus = buildTextCorpus(input);
  const temporaryMotifs = buildTemporaryTemplates(textCorpus);

  return {
    coreSubjects: buildCoreSubjects(textCorpus, patternIntent),
    coreExplicitMotifs: buildCoreExplicitMotifs(textCorpus, patternIntent),
    coreStructuralPatterns: buildCoreStructuralPatterns(textCorpus, patternIntent),
    antiLiteralRules: uniqueStrings([
      /孤帆|云帆|远帆|帆影|白帆/.test(textCorpus) ? "avoid literal sailboat illustration" : undefined,
      /花叶|花卉|花朵|花瓣/.test(textCorpus) ? "avoid realistic floral bouquet" : undefined,
      ...temporaryMotifs.flatMap((item) => item.antiLiteralWarnings),
    ]),
    temporaryMotifs,
  };
}
