export type GenerationMode = "text_to_image" | "reference_conditioned";

export interface GenerationPromptSpec {
  positivePrompt: string;
  negativePrompt?: string;
  promptFragments: string[];
}

export interface ReferenceHandlingSpec {
  enabled: boolean;
  strategy?: "anchor_preserve" | "local_divergence" | "brand_shift";
  strength?: number;
}

export interface VariantGenerationSpec {
  variantId: string;
  hypothesis: string;
  changedSlots: string[];
}

export interface GenerationSpec {
  mode: GenerationMode;
  prompt: GenerationPromptSpec;
  reference: ReferenceHandlingSpec;
  modelPreference: {
    primary: "sdxl" | "flux";
    adapters: string[];
  };
  variants: VariantGenerationSpec[];
}
