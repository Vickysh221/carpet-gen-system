import type { OpeningSelectionSignal, TextIntakeSignal } from "@/features/entryAgent";
import { createIntentIntakeAgentState, updateAgentStateFromSignal } from "@/features/entryAgent";
import { analyzeEntryText } from "@/features/entryAgent/index";
import { buildIntentStabilizationSnapshot } from "../intentStabilization";

interface MultiTurnSpecResult {
  name: string;
  pass: boolean;
  checks: Record<string, boolean>;
}

function makeTextSignal(text: string, turnIndex: number): TextIntakeSignal {
  return { type: "text", text, turnIndex, source: "user" };
}

function makeOpeningSignal(selections: string[], turnIndex = 0): OpeningSelectionSignal {
  return { type: "opening-selection", selections, turnIndex, source: "user" };
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
      secondAlignmentShiftedOrPartial:
        second.analysis.questionPlan?.answerAlignment?.status === "shifted" ||
        second.analysis.questionPlan?.answerAlignment?.status === "partial",
      secondStrategyRespondedToNewInput:
        second.analysis.questionPlan?.planningStrategy !== undefined,
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
      secondTurnPreservedPriorContext:
        second.text.includes("草色遥看近却无") &&
        second.text.includes("颜色本身要被轻轻看见"),
      secondUnderstandingExists: second.currentUnderstanding.length > 0,
      secondStateStillExists: Boolean(second.analysis.agentState),
    },
  };
}

async function runPoeticReplyClosureCase() {
  const first = await buildIntentStabilizationSnapshot({
    signal: makeTextSignal("烟雨感", 1),
  });

  const second = await buildIntentStabilizationSnapshot({
    previousSnapshot: first,
    previousText: first.text,
    signal: makeTextSignal("雾感", first.turnCount + 1),
    previousTurnCount: first.turnCount,
  });

  const familyResolution = second.analysis.questionResolutionState?.families["colorMood:poetic-fog-vs-flow"];

  return {
    name: "poetic reply closes the previous poetic question instead of repeating it",
    checks: {
      firstQuestionRecorded: first.conversationState.questionHistory.length >= 1,
      poeticFamilyResolvedOrNarrowed: familyResolution?.status === "resolved" || familyResolution?.status === "narrowed",
      secondAlignmentNotInitial: second.analysis.questionPlan?.answerAlignment?.status !== "initial",
      secondQuestionAdvanced: second.followUpQuestion !== first.followUpQuestion,
      secondPlanDidNotRepeatSameFamily: second.analysis.questionPlan?.selectedQuestion?.questionFamilyId !== "colorMood:poetic-fog-vs-flow",
    },
  };
}

async function runCumulativeReplyStyleCase() {
  const first = await buildIntentStabilizationSnapshot({
    signal: makeTextSignal("自然", 1),
  });
  const second = await buildIntentStabilizationSnapshot({
    previousSnapshot: first,
    previousText: first.text,
    signal: makeTextSignal("烟雨三月", first.turnCount + 1),
    previousTurnCount: first.turnCount,
  });
  const third = await buildIntentStabilizationSnapshot({
    previousSnapshot: second,
    previousText: second.text,
    signal: makeTextSignal("水汽流动感", second.turnCount + 1),
    previousTurnCount: second.turnCount,
  });

  return {
    name: "reply style keeps a cumulative design snapshot instead of state-transition logging",
    checks: {
      noStateTransitionPhrase: !third.expertReply.includes("先往"),
      noGenerationPlaceholder: !third.expertReply.includes("先进入第一轮看看"),
      cumulativeReplyMentionsCalmOrNatural:
        third.expertReply.includes("安静") || third.expertReply.includes("自然"),
      cumulativeReplyMentionsFlow:
        third.expertReply.includes("流线") || third.expertReply.includes("流动"),
      cumulativeReplyStillAsksOneQuestion: third.expertReply.includes("？"),
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
      cumulativeQuestionHistoryExistsOrReady:
        third.readyToGenerate ||
        third.conversationState.questionHistory.length >= 2,
    },
  };
}

async function runOpeningSeedCase() {
  const seeded = await updateAgentStateFromSignal(
    makeOpeningSignal(["mood-calm", "pattern-geometric-structured"]),
    createIntentIntakeAgentState(),
  );

  const snapshot = await buildIntentStabilizationSnapshot({
    signal: makeTextSignal("卧室里用", 1),
    currentAgentStateOverride: seeded,
  });

  return {
    name: "opening selections seed the main state without text backfill",
    checks: {
      openingDidNotBackfillText: seeded.cumulativeText === "",
      openingBuiltSemanticMapping: Boolean(seeded.latestSemanticMapping),
      openingPatternStored: seeded.slots.find((slot) => slot.slot === "pattern")?.patternIntent?.renderingMode === "geometricized",
      followupPreservedOpeningSeed: snapshot.text === "卧室里用",
      seededPatternStillPresent: snapshot.analysis.agentState?.slots.find((slot) => slot.slot === "pattern")?.patternIntent?.renderingMode === "geometricized",
    },
  };
}

async function runResolutionFeedsGoalCase() {
  const analysis = await analyzeEntryText({
    text: "别太抢",
    latestReplyText: "别太抢",
    previousQuestionTrace: {
      turnIndex: 1,
      prompt: "你更想让它偏安静柔和，还是更有一点存在感？",
      targetField: "overallImpression",
      targetSlot: "impression",
      targetAxes: ["impression.calm", "impression.energy"],
      questionFamilyId: "overallImpression:contrast-calm-vs-presence",
    },
  });
  const impressionSlot = analysis.intakeGoalState?.slots.find((slot) => slot.slot === "impression");

  return {
    name: "resolution state becomes structured goal-state input",
    checks: {
      familyResolvedCalm: analysis.questionResolutionState?.families["overallImpression:contrast-calm-vs-presence"]?.chosenBranch === "calm",
      impressionDirectionUsesResolution: impressionSlot?.topDirection === "calm",
      impressionBaseCaptured: impressionSlot?.isBaseCaptured === true,
      readinessStillBlockedWhenOthersMissing: analysis.intakeGoalState?.readyForFirstGeneration === false,
    },
  };
}

async function runPatternIntentClosureCase() {
  const analysis = await analyzeEntryText({
    text: "荷花在风里摇曳，想要那种若有若无的感觉",
    latestReplyText: "荷花在风里摇曳，想要那种若有若无的感觉",
  });
  const patternSlot = analysis.intakeGoalState?.slots.find((slot) => slot.slot === "pattern");

  return {
    name: "pattern intent enters the main state with structure",
    checks: {
      keyElementOrSubjectCaptured: Boolean(patternSlot?.patternIntent?.keyElement),
      renderingCaptured: patternSlot?.patternIntent?.renderingMode === "suggestive",
      abstractionCaptured: patternSlot?.patternIntent?.abstractionPreference === "abstract",
      patternNotZeroed: (patternSlot?.topScore ?? 0) > 0.45,
    },
  };
}

async function runReadinessGateCase() {
  let snapshot = await buildIntentStabilizationSnapshot({
    signal: makeTextSignal("想安静一点", 1),
  });

  for (let index = 0; index < 5; index += 1) {
    snapshot = await buildIntentStabilizationSnapshot({
      previousSnapshot: snapshot,
      previousText: snapshot.text,
      signal: makeTextSignal("先这样", snapshot.turnCount + 1),
      previousTurnCount: snapshot.turnCount,
      currentAgentStateOverride: snapshot.conversationState.agentState,
    });
  }

  return {
    name: "readiness gate does not soft-jump on turn caps",
    checks: {
      stillMissingCriticalSlots: (snapshot.analysis.intakeGoalState?.missingSlots.length ?? 0) > 0,
      notReadyAfterSoftCap: snapshot.readyToGenerate === false,
      goalStateStillBlocksGeneration: snapshot.analysis.intakeGoalState?.readyForFirstGeneration === false,
    },
  };
}

export async function buildMultiTurnIntentSpecSummary(): Promise<MultiTurnSpecResult[]> {
  const cases = await Promise.all([
    runThreadSwitchCase(),
    runAdvanceCase(),
    runPoeticReplyClosureCase(),
    runCumulativeReplyStyleCase(),
    runCumulativeCanvasCase(),
    runOpeningSeedCase(),
    runResolutionFeedsGoalCase(),
    runPatternIntentClosureCase(),
    runReadinessGateCase(),
  ]);

  return cases.map((item) => ({
    name: item.name,
    pass: Object.values(item.checks).every(Boolean),
    checks: item.checks,
  }));
}
