import type { EntryAgentResult, HighValueField, QuestionResolution, QuestionResolutionState } from "@/features/entryAgent";

export interface UnderstandingSummaryItem {
  label: string;
  detail: string;
}

export interface UnderstandingSummary {
  latestShift?: string;
  resolvedItems: UnderstandingSummaryItem[];
  activeItems: UnderstandingSummaryItem[];
  openItems: UnderstandingSummaryItem[];
  nextFocus?: string;
}

function toFriendlyFocus(field: HighValueField | undefined): string | undefined {
  if (field === "colorMood") return "颜色方向";
  if (field === "patternTendency") return "图案感";
  if (field === "arrangementTendency") return "排布方式";
  if (field === "overallImpression") return "整体氛围";
  if (field === "spaceContext") return "空间场景";
  return undefined;
}

function describeResolution(resolution: QuestionResolution): UnderstandingSummaryItem {
  const branch = resolution.chosenBranch ? ` · 已选 ${resolution.chosenBranch}` : "";
  return {
    label: resolution.familyId,
    detail: `${resolution.status}${branch} · ${resolution.reason}`,
  };
}

function summarizeResolvedFamilies(resolutionState: QuestionResolutionState | undefined) {
  if (!resolutionState) {
    return [];
  }

  return Object.values(resolutionState.families)
    .filter((item) => item.status === "resolved" || item.status === "narrowed")
    .sort((left, right) => right.sourceTurn - left.sourceTurn)
    .slice(0, 2)
    .map(describeResolution);
}

function summarizeActiveDirections(analysis: EntryAgentResult): UnderstandingSummaryItem[] {
  const directions = analysis.semanticUnderstanding.confirmedDirections;
  if (directions.length > 0) {
    return directions.slice(0, 2).map((item) => ({
      label: item.label,
      detail: `confidence ${Math.round(item.confidence * 100)}%`,
    }));
  }

  return analysis.semanticUnderstanding.activeReadings.slice(0, 2).map((item) => ({
    label: item.label,
    detail: `${item.primarySlot} · confidence ${Math.round(item.confidence * 100)}%`,
  }));
}

function summarizeOpenQuestions(analysis: EntryAgentResult): UnderstandingSummaryItem[] {
  const openQuestions = analysis.semanticUnderstanding.openQuestions;
  if (openQuestions.length > 0) {
    return openQuestions.slice(0, 2).map((item, index) => ({
      label: `open-${index + 1}`,
      detail: item,
    }));
  }

  if (analysis.semanticGaps.length > 0) {
    return analysis.semanticGaps.slice(0, 2).map((gap, index) => ({
      label: `gap-${index + 1}`,
      detail: `${gap.targetField ?? "unknown"} · ${gap.reason}`,
    }));
  }

  return [];
}

function describeLatestShift(analysis: EntryAgentResult) {
  const resolution = analysis.latestResolution;
  if (resolution) {
    if (resolution.status === "resolved") {
      return `这轮你把 ${resolution.familyId} 这组问题基本收窄并结案了。`;
    }
    if (resolution.status === "narrowed") {
      return `这轮你开始把 ${resolution.familyId} 这组问题往一边收。`;
    }
  }

  const alignment = analysis.questionPlan?.answerAlignment;
  if (!alignment) {
    return undefined;
  }

  if (alignment.status === "shifted") {
    return "这轮你主动切到了一个新语义线程。";
  }

  if (alignment.status === "partial") {
    return "这轮你一边回应上一问，一边补进了新线索。";
  }

  if (alignment.status === "answered") {
    return "这轮你基本顺着上一问继续把方向收窄了。";
  }

  return undefined;
}

function describeNextFocus(analysis: EntryAgentResult) {
  const focus = toFriendlyFocus(analysis.questionPlan?.selectedTargetField);
  if (!focus) {
    return undefined;
  }

  const selectedQuestion = analysis.questionPlan?.selectedQuestion;
  if (!selectedQuestion) {
    return `下一步还想再确认一下${focus}。`;
  }

  return `下一步更值得继续确认的是${focus}，因为当前主 gap 还落在 ${selectedQuestion.questionFamilyId ?? selectedQuestion.targetField ?? "当前问题"}。`;
}

export function buildUnderstandingSummary(analysis: EntryAgentResult): UnderstandingSummary {
  return {
    latestShift: describeLatestShift(analysis),
    resolvedItems: summarizeResolvedFamilies(analysis.questionResolutionState),
    activeItems: summarizeActiveDirections(analysis),
    openItems: summarizeOpenQuestions(analysis),
    nextFocus: describeNextFocus(analysis),
  };
}

export function renderUnderstandingSummary(summary: UnderstandingSummary) {
  const parts: string[] = [];

  if (summary.latestShift) {
    parts.push(summary.latestShift);
  }

  if (summary.resolvedItems.length > 0) {
    const resolvedText = summary.resolvedItems.map((item) => `${item.label}：${item.detail}`).join("；");
    parts.push(`已经收窄的部分有：${resolvedText}。`);
  }

  if (summary.activeItems.length > 0) {
    const activeText = summary.activeItems.map((item) => `${item.label}（${item.detail}）`).join("、");
    parts.push(`我现在较稳地抓到的是：${activeText}。`);
  }

  if (summary.openItems.length > 0) {
    const openText = summary.openItems.map((item) => item.detail).join("；");
    parts.push(`还没完全收清楚的是：${openText}。`);
  }

  if (summary.nextFocus) {
    parts.push(summary.nextFocus);
  }

  if (parts.length === 0) {
    return "我先有一个很粗的感觉，但还不想太早替你下结论。";
  }

  return parts.join("");
}
