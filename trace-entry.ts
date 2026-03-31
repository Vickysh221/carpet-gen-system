import { analyzeEntryText } from './src/features/entryAgent/index.ts';

const samples = [
  '春天 鲜艳 明媚 绿意盎然',
  '想给卧室找一块更安静一点、不要太花的地毯',
  '草色遥看近却无',
  '咖啡时光',
  '想自然一点'
];
for (const text of samples) {
  const result = await analyzeEntryText({ text });
  console.log('\n===', text, '===');
  console.log(JSON.stringify({
    hitFields: result.hitFields,
    evidence: result.evidence,
    confidence: result.confidence,
    updatedSlotStates: result.updatedSlotStates,
    semanticCanvas: result.semanticCanvas && {
      source: result.semanticCanvas.source,
      rawCues: result.semanticCanvas.rawCues,
      targetFields: result.semanticCanvas.slotMappings.targetFields,
      targetAxes: result.semanticCanvas.slotMappings.targetAxes,
      mustPreserve: result.semanticCanvas.narrativePolicy.mustPreserve,
      mustNotOverLiteralize: result.semanticCanvas.narrativePolicy.mustNotOverLiteralize,
      directionalDominant: result.semanticCanvas.narrativePolicy.directionalDominant,
    },
    finalResolvedReadings: result.interpretationMerge.finalResolvedReadings.map(r => ({id:r.id, field:r.field, label:r.label, confidence:r.confidence, semanticHints:r.semanticHints})),
    semanticGaps: result.semanticGaps.map(g => ({id:g.id, type:g.type, priority:g.priority, targetField:g.targetField, targetSlot:g.targetSlot, questionMode:g.questionMode, reason:g.reason, promptOverride:g.questionPromptOverride})),
    selectedQuestion: result.questionPlan?.selectedQuestion && {
      prompt: result.questionPlan.selectedQuestion.prompt,
      targetField: result.questionPlan.selectedQuestion.targetField,
      targetSlot: result.questionPlan.selectedQuestion.targetSlot,
      questionMode: result.questionPlan.selectedQuestion.questionMode,
      questionIntent: result.questionPlan.selectedQuestion.questionIntent,
      expectedInformationGain: result.questionPlan.selectedQuestion.expectedInformationGain,
    },
  }, null, 2));
}
