import { reduceMergeResultToState } from "./statePatchReducer";
import type {
  EntryAgentBridgeResult,
  EntryAgentDetectionResult,
  EntryAgentInput,
  InterpretationMergeResult,
  WeakBiasHint,
} from "./types";

function normalizeText(text: string) {
  return text.toLowerCase().replace(/\s+/g, "").trim();
}

function createEmptyBridgeResult(): EntryAgentBridgeResult {
  return {
    provisionalStateHints: {},
    ambiguities: [],
    axisHints: {},
    weakBiasHints: [],
    statePatch: {},
  };
}

function pushWeakBias(result: EntryAgentBridgeResult, weakBias: WeakBiasHint) {
  result.weakBiasHints.push(weakBias);
}

function applySpaceContextBridge(result: EntryAgentBridgeResult, context: { text: string; detection: EntryAgentDetectionResult }) {
  const { text, detection } = context;

  if (!detection.hitFields.includes("spaceContext")) {
    return;
  }

  if (text.includes("卧室")) {
    result.provisionalStateHints.roomType = "bedroom";
    pushWeakBias(result, {
      source: "spaceContext: bedroom",
      axes: {
        impression: { calm: 0.58, softness: 0.56 },
        motif: { complexity: 0.44 },
        color: { saturation: 0.46 },
      },
    });
    return;
  }

  if (text.includes("客厅")) {
    result.provisionalStateHints.roomType = "livingRoom";
    pushWeakBias(result, {
      source: "spaceContext: livingRoom",
      axes: {
        impression: { energy: 0.52, calm: 0.5 },
      },
    });
    return;
  }

  if (text.includes("书房")) {
    result.provisionalStateHints.roomType = "study";
    pushWeakBias(result, {
      source: "spaceContext: study",
      axes: {
        arrangement: { order: 0.57 },
        impression: { calm: 0.56 },
      },
    });
    return;
  }

  if (text.includes("办公室") || text.includes("会议室")) {
    result.provisionalStateHints.roomType = text.includes("会议室") ? "conferenceRoom" : "office";
    pushWeakBias(result, {
      source: text.includes("会议室") ? "spaceContext: conferenceRoom" : "spaceContext: office",
      axes: {
        arrangement: { order: 0.58 },
        motif: { complexity: 0.43 },
      },
    });
  }
}

export function buildSemanticToAxisBridge(
  input: Pick<EntryAgentInput, "text">,
  detection: EntryAgentDetectionResult,
  interpretationMerge: InterpretationMergeResult,
): EntryAgentBridgeResult {
  const result = createEmptyBridgeResult();
  const context = {
    text: normalizeText(input.text),
    detection,
  };

  applySpaceContextBridge(result, context);

  const reduced = reduceMergeResultToState({
    interpretationMerge,
    baseAmbiguities: [],
  });

  result.provisionalStateHints = {
    ...result.provisionalStateHints,
    ...reduced.provisionalStateHints,
  };
  result.ambiguities = reduced.ambiguities;
  result.axisHints = reduced.axisHints;
  result.statePatch = reduced.statePatch;

  return result;
}
