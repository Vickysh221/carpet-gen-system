import type { EntryAgentInput, QuestionFamilyId, QuestionResolution, QuestionResolutionState, QuestionTrace, SemanticGap } from "./types";

function normalizeText(text: string | undefined) {
  return (text ?? "").toLowerCase().replace(/\s+/g, "").trim();
}

function hasAny(text: string, cues: string[]) {
  return cues.some((cue) => text.includes(cue));
}

function mergeResolutionRecord(
  previous: QuestionResolutionState | undefined,
  resolution: QuestionResolution | undefined,
): QuestionResolutionState | undefined {
  if (!resolution) {
    return previous;
  }

  return {
    families: {
      ...(previous?.families ?? {}),
      [resolution.familyId]: resolution,
    },
  };
}

function resolveBranchForFamily(input: {
  familyId: QuestionFamilyId;
  latestReplyText?: string;
  previousQuestionPrompt?: string;
}): Pick<QuestionResolution, "status" | "chosenBranch" | "rejectedBranches" | "reason"> | undefined {
  const text = normalizeText(input.latestReplyText);
  if (!text) {
    return undefined;
  }

  if (input.familyId === "colorMood:poetic-fog-vs-flow") {
    const fogCues = ["雾感", "雾一点", "更雾", "空濛", "朦胧", "迷蒙"];
    const flowCues = ["水汽流动", "流动感", "流动一点", "水汽", "流动", "湿润"];
    const pickedFog = hasAny(text, fogCues);
    const pickedFlow = hasAny(text, flowCues);

    if (pickedFog && !pickedFlow) {
      return {
        status: "resolved",
        chosenBranch: "fog",
        rejectedBranches: ["flow"],
        reason: "用户顺着上一轮的诗性追问，明确把颜色气息收向雾感这一支。",
      };
    }

    if (pickedFlow && !pickedFog) {
      return {
        status: "resolved",
        chosenBranch: "flow",
        rejectedBranches: ["fog"],
        reason: "用户顺着上一轮的诗性追问，明确把颜色气息收向水汽流动感这一支。",
      };
    }

    if ((pickedFog || pickedFlow) && input.previousQuestionPrompt?.includes("雾感")) {
      return {
        status: "narrowed",
        chosenBranch: pickedFog ? "fog" : "flow",
        rejectedBranches: [],
        reason: "用户明显是在回应上一轮的雾感/流动感分叉，但表述还没完全排掉另一侧。",
      };
    }
  }

  if (input.familyId === "patternTendency:contrast-complexity-vs-geometry") {
    const complexityCues = ["不要太碎", "别太碎", "不要太花", "别太花", "不要太碎太花", "图案别太碎", "图案不要太碎"];
    const geometryCues = ["太硬", "别太硬", "不要太硬", "太几何", "别太几何", "不要太几何", "几何感太强"];
    const pickedComplexity = hasAny(text, complexityCues);
    const pickedGeometry = hasAny(text, geometryCues);

    if (pickedComplexity && !pickedGeometry) {
      return {
        status: "resolved",
        chosenBranch: "complexity",
        rejectedBranches: ["geometry"],
        reason: "用户明确把 pattern 问题收窄到不要太碎太花这一支。",
      };
    }

    if (pickedGeometry && !pickedComplexity) {
      return {
        status: "resolved",
        chosenBranch: "geometry",
        rejectedBranches: ["complexity"],
        reason: "用户明确把 pattern 问题收窄到不要太硬/太几何这一支。",
      };
    }

    if (pickedComplexity || pickedGeometry) {
      return {
        status: "narrowed",
        chosenBranch: pickedComplexity ? "complexity" : "geometry",
        rejectedBranches: [],
        reason: "用户开始在 pattern 的对比分支里选边，但还没有完全排除另一侧。",
      };
    }
  }

  if (input.familyId === "overallImpression:contrast-calm-vs-presence") {
    const calmCues = ["安静", "放松", "柔和", "低调", "别太抢", "不要太抢", "克制"];
    const presenceCues = ["存在感", "张力", "活力", "精神一点", "更亮眼"];
    const pickedCalm = hasAny(text, calmCues);
    const pickedPresence = hasAny(text, presenceCues);

    if (pickedCalm && !pickedPresence) {
      return {
        status: "resolved",
        chosenBranch: "calm",
        rejectedBranches: ["presence"],
        reason: "用户明确把整体印象收窄到安静/克制这一支。",
      };
    }

    if (pickedPresence && !pickedCalm) {
      return {
        status: "resolved",
        chosenBranch: "presence",
        rejectedBranches: ["calm"],
        reason: "用户明确把整体印象收窄到存在感/张力这一支。",
      };
    }
  }

  if (input.familyId === "colorMood:contrast-warm-vs-muted") {
    const warmCues = ["温暖", "暖一点", "暖色", "更暖"];
    const mutedCues = ["淡一点", "收一点", "克制一点", "不要太跳", "别太跳"];
    const pickedWarm = hasAny(text, warmCues);
    const pickedMuted = hasAny(text, mutedCues);

    if (pickedWarm && !pickedMuted) {
      return {
        status: "resolved",
        chosenBranch: "warm",
        rejectedBranches: ["muted"],
        reason: "用户明确把颜色问题收窄到更暖这一支。",
      };
    }

    if (pickedMuted && !pickedWarm) {
      return {
        status: "resolved",
        chosenBranch: "muted",
        rejectedBranches: ["warm"],
        reason: "用户明确把颜色问题收窄到更收、更克制这一支。",
      };
    }
  }

  if (input.familyId === "arrangementTendency:contrast-open-vs-ordered") {
    const openCues = ["松一点", "透气", "有呼吸感", "别太满", "不要太满"];
    const orderedCues = ["整齐一点", "规整一点", "有秩序", "整整齐齐"];
    const pickedOpen = hasAny(text, openCues);
    const pickedOrdered = hasAny(text, orderedCues);

    if (pickedOpen && !pickedOrdered) {
      return {
        status: "resolved",
        chosenBranch: "open",
        rejectedBranches: ["ordered"],
        reason: "用户明确把排布问题收窄到更松、更有呼吸感这一支。",
      };
    }

    if (pickedOrdered && !pickedOpen) {
      return {
        status: "resolved",
        chosenBranch: "ordered",
        rejectedBranches: ["open"],
        reason: "用户明确把排布问题收窄到更整齐、更有秩序这一支。",
      };
    }
  }

  return undefined;
}

export function resolvePreviousQuestion(input: {
  previousQuestion?: QuestionTrace;
  latestReplyText?: string;
  previousResolutionState?: QuestionResolutionState;
  currentHitFields?: EntryAgentInput["previousQuestionTrace"] extends never ? never : unknown;
}): { resolution?: QuestionResolution; resolutionState?: QuestionResolutionState } {
  const previousQuestion = input.previousQuestion;
  if (!previousQuestion?.questionFamilyId) {
    return {
      resolution: undefined,
      resolutionState: input.previousResolutionState,
    };
  }

  const branchResolution = resolveBranchForFamily({
    familyId: previousQuestion.questionFamilyId,
    latestReplyText: input.latestReplyText,
    previousQuestionPrompt: previousQuestion.prompt,
  });

  if (!branchResolution) {
    return {
      resolution: undefined,
      resolutionState: input.previousResolutionState,
    };
  }

  const resolution: QuestionResolution = {
    familyId: previousQuestion.questionFamilyId,
    status: branchResolution.status,
    chosenBranch: branchResolution.chosenBranch,
    rejectedBranches: branchResolution.rejectedBranches,
    sourceTurn: previousQuestion.turnIndex + 1,
    sourceQuestionGapId: previousQuestion.gapId,
    sourceQuestionPrompt: previousQuestion.prompt,
    reason: branchResolution.reason,
  };

  return {
    resolution,
    resolutionState: mergeResolutionRecord(input.previousResolutionState, resolution),
  };
}

export function isGapBlockedByResolution(gap: SemanticGap, resolutionState: QuestionResolutionState | undefined) {
  if (!gap.questionFamilyId || !resolutionState) {
    return false;
  }

  const resolution = resolutionState.families[gap.questionFamilyId];
  if (!resolution) {
    return false;
  }

  return resolution.status === "resolved";
}
