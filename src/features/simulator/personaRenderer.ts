import type { EntryAgentResult, IntakeMacroSlot, IntentIntakeGoalState } from "@/features/entryAgent";
import type { UnderstandingSummary } from "./understandingSummary";

function slotLabel(slot: IntakeMacroSlot) {
  if (slot === "impression") return "整体感觉";
  if (slot === "color") return "颜色";
  if (slot === "pattern") return "图案";
  if (slot === "arrangement") return "排布";
  if (slot === "space") return "空间场景";
  return slot;
}

function describeGoalState(goalState: IntentIntakeGoalState | undefined) {
  if (!goalState) {
    return undefined;
  }

  if (goalState.completed) {
    return "几块关键方向我都摸到一个初步基线了，已经够支撑我们进下一步看图了。";
  }

  if (goalState.missingSlots.length === 0) {
    return undefined;
  }

  return `现在还差一点的是${goalState.missingSlots.map(slotLabel).join("、")}，我会尽量一边承接你已经说清的部分，一边把这些关键方向补齐。`;
}

function renderResolvedTone(summary: UnderstandingSummary) {
  if (summary.resolvedItems.length === 0) {
    return undefined;
  }

  const latest = summary.resolvedItems[0];
  if (latest.detail.includes("complexity")) {
    return "图案这层我已经不太会往‘更几何’那边误解了，现在更像是在顺着你说的‘别太碎太花’收。";
  }

  if (latest.detail.includes("calm")) {
    return "整体气质这层我已经更稳地理解成偏安静、克制，不会往太张扬那边带。";
  }

  if (latest.detail.includes("muted")) {
    return "颜色这层我会先按更收一点、别太跳来理解，不会急着往浓重表达那边跑。";
  }

  return "有一块主分叉我已经跟上你了，不会再按刚才那种旧理解打转。";
}

function renderActiveTone(summary: UnderstandingSummary) {
  if (summary.activeItems.length === 0) {
    return "我现在先只有一个很粗的感觉，还想再贴着你的话近一点。";
  }

  const topLabels = summary.activeItems.map((item) => item.label).join("、");
  return `我现在比较稳地摸到的是：${topLabels}。`;
}

function renderOpenTone(summary: UnderstandingSummary, analysis: EntryAgentResult) {
  const focus = analysis.questionPlan?.selectedTargetField;
  if (focus === "colorMood") {
    return "颜色边界我还没真正听清，是想更暖一点，还是更收一点、别太跳。";
  }
  if (focus === "patternTendency") {
    return "图案边界还差最后一点，我想再听清你是在意自然感，还是更在意把复杂度继续压下去。";
  }
  if (focus === "arrangementTendency") {
    return "排布方式这块还没落稳，我还想再确认它是偏松、偏透气，还是偏整齐一点。";
  }
  if (focus === "overallImpression") {
    return "整体感觉我大概有了，但边界还不够稳，还想再确认它是更柔和，还是还要留一点存在感。";
  }

  if (summary.openItems.length > 0) {
    return "还有一块我没完全听清，所以我会继续沿着你已经给出的方向往近处问。";
  }

  return undefined;
}

export function renderPersonaUnderstanding(input: {
  analysis: EntryAgentResult;
  summary: UnderstandingSummary;
  goalState?: IntentIntakeGoalState;
}) {
  const parts: string[] = [];

  const resolved = renderResolvedTone(input.summary);
  if (resolved) {
    parts.push(resolved);
  }

  parts.push(renderActiveTone(input.summary));

  const open = renderOpenTone(input.summary, input.analysis);
  if (open) {
    parts.push(open);
  }

  const goal = describeGoalState(input.goalState);
  if (goal) {
    parts.push(goal);
  }

  return parts.join(" ");
}

export function renderPersonaQuestionBridge(input: {
  analysis: EntryAgentResult;
  goalState?: IntentIntakeGoalState;
}) {
  const target = input.analysis.questionPlan?.selectedTargetField;
  const missing = input.goalState?.missingSlots ?? [];

  if (target === "colorMood") {
    return missing.includes("color")
      ? "整体那个感觉我大概摸到了，接下来我更想把颜色这块听清。"
      : "我先不动整体感觉，想把颜色边界再收紧一点。";
  }

  if (target === "patternTendency") {
    return missing.includes("pattern")
      ? "图案这块还是关键空白，我想先把它收出一个基线。"
      : "图案方向已经有个轮廓了，但我想再把边界问近一点。";
  }

  if (target === "arrangementTendency") {
    return missing.includes("arrangement")
      ? "排布方式这块还没真正摸到，我想先把这个基线补上。"
      : "排布方向还差一点，我想再把它收稳。";
  }

  if (target === "overallImpression") {
    return "我先不急着下图案细节，想把整体感觉再听稳一点。";
  }

  if (target === "spaceContext") {
    return "我想先搞清这块地毯主要服务什么场景，这会影响后面很多判断。";
  }

  return "我先顺着你已经说出来的方向，继续把关键边界收清。";
}
