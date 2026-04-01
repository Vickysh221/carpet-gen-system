import { createIntentIntakeAgentState } from "./agentRuntime";
import { applyOpeningSelectionToAgentState } from "./openingOptionDelta";

export function buildOpeningOptionsExample() {
  const initialState = createIntentIntakeAgentState();
  return applyOpeningSelectionToAgentState({
    selections: ["space-bedroom", "presence-blended"],
    currentState: initialState,
  });
}
