import { createIntentIntakeAgentState, decideNextAction, updateAgentStateFromSignal } from "./agentRuntime";
import type { EntryAgentResult, IntakeSignal, IntakeSignalContext } from "./types";

/**
 * Unified signal-first entry point for the Intent Intake Agent.
 *
 * Accepts any IntakeSignal and routes it through the appropriate processing
 * pipeline, updating the agent's internal semantic / goal / resolution state.
 *
 * Current support:
 *   - "text" — full semantic analysis pipeline (Stage 0, pre-visual intake)
 *
 * Reserved for future stages:
 *   - "image-preference" — Stage 1, visual grounding
 *   - "image-compare"    — Stage 1, visual grounding
 *   - "confirm-direction" / "phase-control" — Stage 2+, direction confirmation
 *
 * The next natural extension point is the "image-preference" case below.
 */
export async function processIntakeSignal(
  signal: IntakeSignal,
  context: IntakeSignalContext = {},
): Promise<EntryAgentResult> {
  switch (signal.type) {
    case "text": {
      const seededState = context.currentAgentState
        ? createIntentIntakeAgentState(context.currentAgentState)
        : createIntentIntakeAgentState({
            cumulativeText: context.cumulativeText,
            resolutionState: context.resolutionState,
            goalState: context.previousGoalState,
            previousQuestion: context.previousQuestionTrace,
            questionHistory: context.questionHistory ?? [],
          });
      const agentState = await updateAgentStateFromSignal(signal, seededState);
      const nextAction = decideNextAction(agentState);
      const analysis = agentState.latestAnalysis;
      if (!analysis) {
        throw new Error('processIntakeSignal: text signal did not produce analysis.');
      }
      return {
        ...analysis,
        semanticMapping: agentState.latestSemanticMapping,
        agentState: { ...agentState, nextAction },
        nextAction,
      };
    }

    case "image-preference":
      // TODO Stage 1: map image like/dislike to slot belief updates
      // Natural entry point: extract affected macro slots from image annotation,
      // compute confidence delta, update IntakeGoalState.
      throw new Error(
        `processIntakeSignal: "image-preference" signals are not yet implemented. ` +
          `Wire this in when adding Stage 1 (visual grounding).`,
      );

    case "image-compare":
      // TODO Stage 1: map pairwise preference to axis-level belief delta
      throw new Error(
        `processIntakeSignal: "image-compare" signals are not yet implemented. ` +
          `Wire this in when adding Stage 1 (visual grounding).`,
      );

    case "confirm-direction":
    case "phase-control":
      // TODO Stage 2+: update lock policy and exploration mode
      throw new Error(
        `processIntakeSignal: "${signal.type}" signals are not yet implemented. ` +
          `Wire this in when adding Stage 2 (direction confirmation).`,
      );
  }
}
