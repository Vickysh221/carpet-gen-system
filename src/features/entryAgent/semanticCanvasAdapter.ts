import { requestDirectOllamaSemanticCanvas } from "./localOllamaSemanticCanvas";
import type { FuliSemanticCanvas, HighValueField, SemanticUnit } from "./types";

export interface SemanticCanvasProvider {
  generate(input: {
    text: string;
    hitFields: HighValueField[];
    semanticUnits: SemanticUnit[];
  }): Promise<{
    available: boolean;
    degraded: boolean;
    provider: "ollama-direct";
    errorMessage?: string;
    canvas?: FuliSemanticCanvas;
  }>;
}

export const directOllamaSemanticCanvasProvider: SemanticCanvasProvider = {
  async generate({ text, hitFields, semanticUnits }) {
    return requestDirectOllamaSemanticCanvas({
      text,
      hitFields,
      semanticUnits,
    });
  },
};

export const activeSemanticCanvasProvider = directOllamaSemanticCanvasProvider;
