import type {
  FrontstageResponsePlan,
  FrontstageSemanticPackage,
  InterpretationDomain,
  InterpretationHandle,
  ProposalFeedbackSignal,
} from "./types";

function normalizeText(text: string | undefined) {
  return (text ?? "").toLowerCase().replace(/\s+/g, "").trim();
}

function unique(items: string[]) {
  return [...new Set(items)];
}

const REDUCE_CUES = [
  "不要那么",
  "别那么",
  "少一点",
  "减一点",
  "弱一点",
  "退一点",
  "轻一点",
  "收一点",
  "压一点",
  "先别那么重",
  "别太重",
  "再淡一点",
  "往后收一点",
];

const BOOST_CUES = [
  "多一点",
  "再多一点",
  "保留",
  "更足一点",
  "加强",
  "多一些",
  "多留一点",
  "再留一点",
  "更想留",
  "留一点",
  "留住",
  "再明显一点",
  "往前一点",
];

const DOMAIN_CORRECTION_CUES = [
  "不是",
  "更像",
  "偏了",
  "不太对",
  "跑偏",
  "抓偏",
  "更想要",
  "想要",
  "往这边",
  "这边",
];

function parseOrdinalMatches(text: string) {
  const matches: number[] = [];
  const digitMatches = [...text.matchAll(/\b([1-4])\b/g)].map((item) => Number(item[1]));
  matches.push(...digitMatches);

  const zhMap: Record<string, number> = {
    "第一种": 1,
    "第二种": 2,
    "第三种": 3,
    "第四种": 4,
    "一种": 1,
    "二种": 2,
    "三种": 3,
    "四种": 4,
  };
  for (const [label, value] of Object.entries(zhMap)) {
    if (text.includes(label)) matches.push(value);
  }
  return unique(matches.filter((value) => value >= 1 && value <= 4).map(String)).map(Number);
}

function findProposalIdsByOrdinals(text: string, plan: FrontstageResponsePlan | undefined) {
  if (!plan) return [];
  return parseOrdinalMatches(text)
    .map((ordinal) => plan.compositionProposals[ordinal - 1]?.id)
    .filter((item): item is string => Boolean(item));
}

function inferCorrectedDomain(text: string): InterpretationDomain | undefined {
  if (text.includes("草本花香") || text.includes("薰衣草") || text.includes("花香")) {
    return "floralHerbalScent";
  }
  if (text.includes("海边") || text.includes("海滩") || text.includes("沙滩") || text.includes("柠檬叶")) {
    return text.includes("柠檬叶") || text.includes("和") ? "mixedImageryComposition" : "coastalAiryBrightness";
  }
  if (text.includes("烟雨") || text.includes("竹影")) {
    return "mixedImageryComposition";
  }
  if (text.includes("高级一点") || text.includes("不确定")) {
    return "vagueRefinementPreference";
  }
  if (text.includes("石头肌理") || text.includes("别太硬")) {
    return "softMineralTexture";
  }
  return undefined;
}

function handleKeywords(handle: InterpretationHandle) {
  const keywords = new Set<string>();
  if (handle.label.includes("海边") || handle.label.includes("沙滩")) {
    keywords.add("海边");
    keywords.add("沙滩");
    keywords.add("海边那个");
  }
  if (handle.label.includes("空气")) keywords.add("空气");
  if (handle.label.includes("香气") || handle.label.includes("气味")) {
    keywords.add("香气");
    keywords.add("气味");
    keywords.add("味道");
    keywords.add("花香");
    keywords.add("草本花香");
  }
  if (handle.label.includes("叶")) {
    keywords.add("叶");
    keywords.add("叶感");
    keywords.add("植物");
  }
  if (handle.label.includes("竹影") || handle.label.includes("影痕")) {
    keywords.add("竹");
    keywords.add("竹影");
    keywords.add("影");
    keywords.add("痕迹");
  }
  if (handle.label.includes("痕迹")) keywords.add("痕迹");
  if (handle.label.includes("留白")) keywords.add("留白");
  if (handle.label.includes("烟雨")) keywords.add("烟雨");
  if (handle.kind === "scent") {
    keywords.add("香气");
    keywords.add("气味");
    keywords.add("花香");
    keywords.add("草本");
  }
  if (handle.kind === "atmosphere") {
    keywords.add("空气");
    keywords.add("气候");
    keywords.add("海边那个");
    keywords.add("烟雨那层");
  }
  if (handle.kind === "presence") {
    keywords.add("轻");
    keywords.add("少一点");
    keywords.add("退一点");
  }
  return [...keywords];
}

function inferHandlesFromText(input: {
  text: string;
  handles: InterpretationHandle[];
  mode: "boost" | "reduce";
}) {
  const wantsScent = input.text.includes("香气") || input.text.includes("气味") || input.text.includes("味道");
  const wantsFloral = input.text.includes("花香") || input.text.includes("草本");
  const wantsAir = input.text.includes("空气") || input.text.includes("烟雨") || input.text.includes("海边");
  const wantsTrace =
    input.text.includes("植物") ||
    input.text.includes("叶") ||
    input.text.includes("竹") ||
    input.text.includes("影") ||
    input.text.includes("痕迹");

  const matched = input.handles.filter((handle) => {
    if (input.mode === "boost" && (wantsScent || wantsFloral)) {
      return handle.kind === "scent" || handle.label.includes("香气") || handle.label.includes("气味");
    }
    if (input.mode === "boost" && wantsAir) {
      return handle.kind === "atmosphere" || handle.label.includes("空气") || handle.label.includes("烟雨");
    }
    if (input.mode === "reduce" && wantsTrace) {
      return handle.kind === "trace" || handle.label.includes("植物") || handle.label.includes("叶") || handle.label.includes("竹影") || handle.label.includes("痕迹");
    }

    const keywords = handleKeywords(handle);
    if (keywords.some((keyword) => keyword && input.text.includes(keyword.toLowerCase()))) {
      return true;
    }

    if (input.mode === "boost" && handle.kind === "atmosphere" && input.text.includes("多一点")) {
      return true;
    }
    if (input.mode === "reduce" && handle.kind === "trace" && input.text.includes("不要那么")) {
      return true;
    }
    return false;
  });

  return unique(matched.map((handle) => handle.id));
}

export function deriveProposalFeedbackSignal(input: {
  text: string;
  currentPlan?: FrontstageResponsePlan;
  currentPackage?: FrontstageSemanticPackage;
}): ProposalFeedbackSignal | undefined {
  const text = normalizeText(input.text);
  if (!text || !input.currentPlan || !input.currentPackage) {
    return undefined;
  }

  const selectedProposalIds = findProposalIdsByOrdinals(text, input.currentPlan);
  const isBlend =
    text.includes("混") ||
    text.includes("一起") ||
    text.includes("加一点") ||
    text.includes("blend");
  const blendedProposalIds = isBlend && selectedProposalIds.length >= 2 ? selectedProposalIds.slice(0, 2) : undefined;

  const reducedHandles = REDUCE_CUES.some((cue) => text.includes(cue))
    ? inferHandlesFromText({
        text,
        handles: input.currentPackage.interpretationHandles,
        mode: "reduce",
      })
    : [];
  const boostedHandles = BOOST_CUES.some((cue) => text.includes(cue))
    ? inferHandlesFromText({
        text,
        handles: input.currentPackage.interpretationHandles,
        mode: "boost",
      })
    : [];
  const handleById = new Map(input.currentPackage.interpretationHandles.map((handle) => [handle.id, handle]));
  const presenceLightnessHandles = reducedHandles.filter((handleId) => handleById.get(handleId)?.kind === "presence");
  const normalizedReducedHandles = reducedHandles.filter((handleId) => handleById.get(handleId)?.kind !== "presence");
  const normalizedBoostedHandles = unique([...boostedHandles, ...presenceLightnessHandles]);

  const correctedDomain =
    DOMAIN_CORRECTION_CUES.some((cue) => text.includes(cue))
      ? inferCorrectedDomain(text)
      : undefined;

  const signal: ProposalFeedbackSignal = {
    selectedProposalIds: blendedProposalIds ? [] : selectedProposalIds,
    blendedProposalIds,
    boostedHandles: normalizedBoostedHandles,
    reducedHandles: normalizedReducedHandles,
    correctedDomain,
    sourceText: input.text,
  };

  if (
    (signal.selectedProposalIds?.length ?? 0) === 0 &&
    (signal.blendedProposalIds?.length ?? 0) === 0 &&
    (signal.boostedHandles?.length ?? 0) === 0 &&
    (signal.reducedHandles?.length ?? 0) === 0 &&
    !signal.correctedDomain
  ) {
    return undefined;
  }

  return signal;
}
