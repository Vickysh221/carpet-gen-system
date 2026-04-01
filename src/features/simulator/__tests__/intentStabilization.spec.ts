import type { TextIntakeSignal } from "@/features/entryAgent";
import { buildIntentStabilizationSnapshot } from "../intentStabilization";

interface MultiTurnSpecResult {
  name: string;
  pass: boolean;
  checks: Record<string, boolean>;
}

function makeTextSignal(text: string, turnIndex: number): TextIntakeSignal {
  return { type: "text", text, turnIndex, source: "user" };
}

async function runThreadSwitchCase() {
  const first = await buildIntentStabilizationSnapshot({
    signal: makeTextSignal("想安静一点", 1),
  });

  const second = await buildIntentStabilizationSnapshot({
    previousSnapshot: first,
    previousText: first.text,
    signal: makeTextSignal("春天 鲜艳 明媚 绿意盎然", first.turnCount + 1),
    previousTurnCount: first.turnCount,
  });

  return {
    name: "switch thread when user introduces new imagery",
    checks: {
      firstQuestionTargetsImpression: first.analysis.questionPlan?.selectedTargetField === "overallImpression",
      secondAlignmentShifted: second.analysis.questionPlan?.answerAlignment?.status === "shifted",
      secondStrategySwitchThread: second.analysis.questionPlan?.planningStrategy === "switch-thread",
      secondQuestionNotRepeated: second.followUpQuestion !== first.followUpQuestion,
      secondQuestionTargetsColor: second.analysis.questionPlan?.selectedTargetField === "colorMood",
    },
  };
}

async function runAdvanceCase() {
  const first = await buildIntentStabilizationSnapshot({
    signal: makeTextSignal("草色遥看近却无", 1),
  });

  const second = await buildIntentStabilizationSnapshot({
    previousSnapshot: first,
    previousText: first.text,
    signal: makeTextSignal("颜色本身要被轻轻看见", first.turnCount + 1),
    previousTurnCount: first.turnCount,
  });

  return {
    name: "advance when user answers previous question",
    checks: {
      secondAlignmentAnsweredOrPartial:
        second.analysis.questionPlan?.answerAlignment?.status === "answered" ||
        second.analysis.questionPlan?.answerAlignment?.status === "partial",
      secondStrategyAdvances:
        second.analysis.questionPlan?.planningStrategy === "advance" ||
        second.analysis.questionPlan?.planningStrategy === "reframe",
      secondQuestionChanged: second.followUpQuestion !== first.followUpQuestion,
    },
  };
}

async function runCumulativeCanvasCase() {
  const first = await buildIntentStabilizationSnapshot({
    signal: makeTextSignal("草色遥看近却无", 1),
  });
  const second = await buildIntentStabilizationSnapshot({
    previousSnapshot: first,
    previousText: first.text,
    signal: makeTextSignal("想要春天那种明媚", first.turnCount + 1),
    previousTurnCount: first.turnCount,
  });
  const third = await buildIntentStabilizationSnapshot({
    previousSnapshot: second,
    previousText: second.text,
    signal: makeTextSignal("但不要很浓很满", second.turnCount + 1),
    previousTurnCount: second.turnCount,
  });

  const cues = third.conversationState.cumulativeCanvas?.rawCues ?? [];
  return {
    name: "cumulative canvas preserves multi-turn imagery",
    checks: {
      keepsFirstTurnCue: cues.some((cue) => cue.includes("草色")),
      keepsSecondTurnCue: cues.some((cue) => cue.includes("明媚") || cue.includes("春天")),
      cumulativeUnderstandingExists: third.currentUnderstanding.length > 0,
      cumulativeQuestionHistoryExists: third.conversationState.questionHistory.length >= 2,
    },
  };
}

export async function buildMultiTurnIntentSpecSummary(): Promise<MultiTurnSpecResult[]> {
  const cases = await Promise.all([
    runThreadSwitchCase(),
    runAdvanceCase(),
    runCumulativeCanvasCase(),
  ]);

  return cases.map((item) => ({
    name: item.name,
    pass: Object.values(item.checks).every(Boolean),
    checks: item.checks,
  }));
}
