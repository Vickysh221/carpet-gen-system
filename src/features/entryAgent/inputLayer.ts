import type { NormalizedInputEvent, SemanticInputSpan } from "./types";

const PHRASE_LOCK_PATTERNS = [
  /[\u4e00-\u9fa5]{2,12}的香气/g,
  /[\u4e00-\u9fa5]{2,14}的空气/g,
  /[\u4e00-\u9fa5]{2,14}后面的光/g,
  /[\u4e00-\u9fa5]{2,14}前五分钟的空气/g,
  /[\u4e00-\u9fa5]{2,10}没有分界线/g,
];

function toHalfWidth(text: string) {
  return text.replace(/[\uFF01-\uFF5E]/g, (char) =>
    String.fromCharCode(char.charCodeAt(0) - 0xfee0),
  ).replace(/\u3000/g, " ");
}

function normalizePunctuation(text: string) {
  return text
    .replace(/[“”]/g, "\"")
    .replace(/[‘’]/g, "'")
    .replace(/[，、]/g, ", ")
    .replace(/[。]/g, ". ")
    .replace(/[；]/g, "; ")
    .replace(/[：]/g, ": ")
    .replace(/[（]/g, "(")
    .replace(/[）]/g, ")")
    .replace(/[！]/g, "!")
    .replace(/[？]/g, "?")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeCase(text: string) {
  return text.replace(/[A-Z]+/g, (token) => token.toLowerCase());
}

function splitSegments(text: string) {
  return text
    .split(/[\s,.;!?]+/)
    .map((segment) => segment.trim())
    .filter(Boolean);
}

function foldAdjacentDuplicates(text: string) {
  const segments = splitSegments(text);
  const duplicateFlags: string[] = [];
  const pollutionFlags: string[] = [];
  const folded: string[] = [];

  for (const segment of segments) {
    const previous = folded[folded.length - 1];
    if (previous && previous === segment) {
      duplicateFlags.push(`adjacent-duplicate:${segment}`);
      pollutionFlags.push(`folded-duplicate:${segment}`);
      continue;
    }
    folded.push(segment);
  }

  return {
    text: folded.join(" "),
    duplicateFlags,
    pollutionFlags,
  };
}

function preservePhrases(text: string) {
  const locked = new Set<string>();
  for (const pattern of PHRASE_LOCK_PATTERNS) {
    for (const match of text.matchAll(pattern)) {
      if (match[0]) locked.add(match[0].trim());
    }
  }

  for (const segment of text.split(/[,.!?;:]/).map((item) => item.trim()).filter(Boolean)) {
    if (segment.length >= 5 && segment.length <= 18 && /的/.test(segment)) {
      locked.add(segment);
    }
  }

  return [...locked];
}

function detectLanguageHints(text: string) {
  const hints: string[] = [];
  if (/[\u4e00-\u9fa5]/.test(text)) hints.push("zh");
  if (/[a-z]/i.test(text)) hints.push("latin");
  if (/[\u4e00-\u9fa5]/.test(text) && /[a-z]/i.test(text)) hints.push("mixed-script");
  return hints;
}

function collapseWhitespace(text: string) {
  return text.replace(/\s+/g, " ").trim();
}

function createSpan(input: {
  id: string;
  text: string;
  spanType: SemanticInputSpan["spanType"];
  confidence: number;
  trace: string[];
  preservedReason: string;
}): SemanticInputSpan {
  return {
    id: input.id,
    text: input.text,
    normalizedText: input.text.replace(/\s+/g, ""),
    spanType: input.spanType,
    confidence: Number(input.confidence.toFixed(2)),
    trace: input.trace,
    preservedReason: input.preservedReason,
  };
}

function buildSemanticSpans(text: string, preservedPhrases: string[]) {
  const spans: SemanticInputSpan[] = [];
  let counter = 0;
  const nextId = () => `span-${++counter}`;

  for (const phrase of preservedPhrases) {
    spans.push(createSpan({
      id: nextId(),
      text: phrase,
      spanType: "phrase-span",
      confidence: 0.91,
      trace: ["preserved-phrase"],
      preservedReason: "matched multi-word semantic phrase",
    }));
  }

  const compositionPatterns = ["和", "有一点", "带一点", "里有", "但", "而", "以及"];
  for (const pattern of compositionPatterns) {
    if (!text.includes(pattern)) continue;
    spans.push(createSpan({
      id: nextId(),
      text: pattern,
      spanType: "composition-span",
      confidence: 0.82,
      trace: ["composition-connector"],
      preservedReason: "marks compositional relation between spans",
    }));
  }

  const negationPatterns = ["不要", "别", "不是", "避免", "不想", "别太", "不要太"];
  for (const pattern of negationPatterns) {
    if (!text.includes(pattern)) continue;
    spans.push(createSpan({
      id: nextId(),
      text: pattern,
      spanType: "negation-span",
      confidence: 0.88,
      trace: ["negation-cue"],
      preservedReason: "marks anti-direction or suppression",
    }));
  }

  const modifierPatterns = ["香气", "空气", "湿度", "边界", "通透", "留白", "摇曳", "流动", "薄纱", "分界线", "高级一点"];
  for (const pattern of modifierPatterns) {
    if (!text.includes(pattern)) continue;
    spans.push(createSpan({
      id: nextId(),
      text: pattern,
      spanType: "modifier-span",
      confidence: 0.76,
      trace: ["modifier-cue"],
      preservedReason: "marks modifier, atmosphere, or rendering behavior",
    }));
  }

  const anchorPatterns = ["叶", "花", "竹影", "竹", "荷花", "孤帆", "帆", "石头肌理", "肌理", "雪地", "天空", "沙滩", "海滩"];
  for (const pattern of anchorPatterns) {
    if (!text.includes(pattern)) continue;
    spans.push(createSpan({
      id: nextId(),
      text: pattern,
      spanType: "anchor-span",
      confidence: 0.7,
      trace: ["anchor-cue"],
      preservedReason: "marks candidate semantic anchor or motif trace",
    }));
  }

  return spans.filter((span, index, items) => items.findIndex((candidate) => candidate.text === span.text && candidate.spanType === span.spanType) === index);
}

export function normalizeTextInputEvent(text: string): NormalizedInputEvent {
  const rawText = text;
  const halfWidth = toHalfWidth(rawText);
  const punctuationNormalized = normalizePunctuation(halfWidth);
  const cased = normalizeCase(punctuationNormalized);
  const collapsed = collapseWhitespace(cased);
  const deduped = foldAdjacentDuplicates(collapsed);
  const normalizedText = deduped.text;
  const preservedPhrases = preservePhrases(normalizedText);
  const spans = buildSemanticSpans(normalizedText, preservedPhrases);
  const languageHints = detectLanguageHints(normalizedText);

  return {
    kind: "text",
    rawText,
    normalizedText,
    preservedPhrases,
    spans,
    duplicateFlags: deduped.duplicateFlags,
    pollutionFlags: deduped.pollutionFlags,
    languageHints,
    preprocessingTrace: [
      "trim-whitespace",
      "normalize-fullwidth-halfwidth",
      "normalize-punctuation",
      "normalize-case",
      deduped.duplicateFlags.length > 0 ? `folded-duplicates=${deduped.duplicateFlags.join("|")}` : "folded-duplicates=none",
      preservedPhrases.length > 0 ? `preserved-phrases=${preservedPhrases.join("|")}` : "preserved-phrases=none",
      languageHints.length > 0 ? `language-hints=${languageHints.join("|")}` : "language-hints=none",
    ],
  };
}
