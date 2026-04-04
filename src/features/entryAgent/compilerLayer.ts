import type { CompiledVisualIntentPackage, VisualIntentCompilerInput } from "./types.visualIntent";
import { buildVisualIntentCompiler } from "./visualIntentCompiler";

export function compileVisualIntent(input: VisualIntentCompilerInput): CompiledVisualIntentPackage {
  return buildVisualIntentCompiler(input);
}
