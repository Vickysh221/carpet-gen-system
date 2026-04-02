import { analyzeEntryText } from "../index";
import { buildIntentSemanticMappingFromAnalysis } from "../agentRuntime";

const CASES = [
  { id: "A1", input: "天青" },
  { id: "A2", input: "烟雨感" },
  { id: "A3", input: "像月白风清那种" },
  { id: "A4", input: "像竹影" },
  { id: "A5", input: "有点灯火感" },
  { id: "A6", input: "像冬天太阳照在冷石头上" },
  { id: "B1", input: "天青色等烟雨" },
  { id: "B2", input: "暮色里的灯火" },
  { id: "C1", input: "不要太花，像竹影" },
  { id: "C2", input: "想要安静一点，有点烟雨感" },
  { id: "D1", input: "月白里带一点灯火" },
  { id: "D2", input: "凌晨四点街灯下的雪" },
] as const;

function compactGoalState(result: Awaited<ReturnType<typeof analyzeEntryText>>) {
  return result.intakeGoalState?.slots.map((slot) => ({
    slot: slot.slot,
    topDirection: slot.topDirection,
    topScore: slot.topScore,
    phase: slot.phase,
    supportingSignals: slot.supportingSignals,
    patternIntent: slot.patternIntent,
  }));
}

for (const testCase of CASES) {
  const result = await analyzeEntryText({ text: testCase.input });
  const semanticMapping = buildIntentSemanticMappingFromAnalysis(result);
  const payload = {
    caseId: testCase.id,
    input: testCase.input,
    matchedMappings: result.semanticCanvas?.poeticSignal?.hits ?? [],
    poeticSignal: result.semanticCanvas?.poeticSignal,
    slotHypotheses: semanticMapping.slotHypotheses,
    updatedSlotStates: result.updatedSlotStates,
    intakeGoalState: compactGoalState(result),
    confidenceSummary: semanticMapping.confidenceSummary,
    questionPlan: result.questionPlan?.selectedQuestion
      ? {
          prompt: result.questionPlan.selectedQuestion.prompt,
          targetField: result.questionPlan.selectedQuestion.targetField,
          questionMode: result.questionPlan.selectedQuestion.questionMode,
        }
      : undefined,
  };

  console.log(JSON.stringify(payload));
}
