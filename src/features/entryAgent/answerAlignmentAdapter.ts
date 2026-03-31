import { requestDirectOllamaAnswerAlignment } from "./localOllamaAnswerAlignment";
import type { AnswerAlignment, EntryAgentResult, QuestionTrace } from "./types";

export interface AnswerAlignmentProvider {
  generate(input: {
    previousQuestion: QuestionTrace;
    hitFields: EntryAgentResult["hitFields"];
    semanticCanvas: EntryAgentResult["semanticCanvas"];
  }): Promise<{
    available: boolean;
    degraded: boolean;
    provider: "ollama-direct";
    errorMessage?: string;
    alignment?: AnswerAlignment;
  }>;
}

export const directOllamaAnswerAlignmentProvider: AnswerAlignmentProvider = {
  async generate({ previousQuestion, hitFields, semanticCanvas }) {
    return requestDirectOllamaAnswerAlignment({
      previousQuestion,
      hitFields,
      semanticCanvas,
    });
  },
};

export const activeAnswerAlignmentProvider = directOllamaAnswerAlignmentProvider;
