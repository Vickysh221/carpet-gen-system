# Frontstage Closed Loop Implementation Status

Date: 2026-04-04

## 中文交付摘要

### 本步目标

把已经存在于 `entryAgent` 内部的三类 frontstage 对象真正接到真实前台消费链上，而不是继续停留在后端分析层：

- `FrontstageSemanticPackage`
- `FrontstageResponsePlan`
- `ProposalFeedbackSignal`

### 本步实际完成

1. 已完成真实前台 consumer migration
   - simulator 侧不再默认由旧 `displayPlan` 主导
   - 真实前台已优先消费 `analysis.frontstageResponsePlan`

2. 已完成前台展示结构迁移
   - 现在前台围绕这四个产物展开：
   - `replySnapshot`
   - `optionalDomainCheck`
   - `compositionProposals`
   - `refinementPrompt`

3. 已保留旧链作为兼容 fallback
   - `displayPlan.replySnapshot`
   - `displayPlan.comparisonCandidates`
   - `displayPlan.followUpQuestion`
   - 仅在新链缺失时兜底，不再主导真实前台体验

4. 已补最小闭环文档与验证
   - 增加 implementation status 文档
   - benchmark 输出已显式展示新 frontstage plan
   - feedback benchmark 样本已改为更像真人会说的话

### 这一步改动的关键文件

- [src/features/simulator/intentStabilization.ts](/Users/vickyshou/Documents/trae_projects/carpet-gen-system/src/features/simulator/intentStabilization.ts)
- [src/features/simulator/SimulatorPage.tsx](/Users/vickyshou/Documents/trae_projects/carpet-gen-system/src/features/simulator/SimulatorPage.tsx)
- [src/features/entryAgent/frontstageResponsePlanner.ts](/Users/vickyshou/Documents/trae_projects/carpet-gen-system/src/features/entryAgent/frontstageResponsePlanner.ts)
- [src/features/entryAgent/frontstageSemanticPackage.ts](/Users/vickyshou/Documents/trae_projects/carpet-gen-system/src/features/entryAgent/frontstageSemanticPackage.ts)
- [src/features/entryAgent/proposalFeedbackSignals.ts](/Users/vickyshou/Documents/trae_projects/carpet-gen-system/src/features/entryAgent/proposalFeedbackSignals.ts)

### 现在用户真实能看到的变化

在这一步之前：

- 新 frontstage objects 已经能在 analysis 里生成
- 但 simulator 前台仍主要显示旧 `displayPlan` 的 comparison cards 和 follow-up question

在这一步之后：

- 前台主展示已经切到 `frontstageResponsePlan`
- 用户首先看到的是顾问式 `replySnapshot`
- 接着是可选的 `optionalDomainCheck`
- 然后是 2 到 4 个可融合的 `compositionProposals`
- 最后是邀请继续细化的 `refinementPrompt`

也就是说，这一步不是只补内部对象，而是把“真实可见前台”切到了新链。

### 本步验证结论

已完成以下验证：

- `npm run build`
- `node scripts/run-frontstage-response-plan.mjs`
- `node scripts/run-frontstage-feedback-loop.mjs`
- `node scripts/run-intent-engine-eval.mjs`
- `node scripts/run-system-layering-mvp.mjs`

当前可确认：

- `薰衣草的芳香` 不再主要掉进 generic moist atmosphere 的旧 comparison 腔
- `加州沙滩和柠檬叶的香气` 已能以前台 proposal 形式体现空气 / 叶感 / 香气的可融合编排
- `烟雨里有一点竹影` 已能以前台 proposal 形式体现 threshold atmosphere + trace 的组合
- feedback benchmark 已改为更像真人说话的样本，而不是机器指令句

### 本步后仍未完全解决

1. `correctedDomain` 已能结构化回流，但 domain 更正后，下一轮 proposal 仍可能沿用旧 handles
2. feedback parser 仍是 minimum viable，不是完整自然语言理解
3. 旧 `displayPlan` 仍在内部并行产出，尚未彻底退役

### 一句话结论

这一步已经把 frontstage refactor 从“后端对象已落地”推进到了“真实前台已切到新链，但内部仍保留兼容 fallback”的阶段。

## 1. Landed objects

The following frontstage-facing objects are implemented in the entry agent:

- `FrontstageSemanticPackage`
- `FrontstageResponsePlan`
- `ProposalFeedbackSignal`

These are now the primary semantic objects for frontstage curation. The old `displayPlan` remains in the codebase as a compatibility layer and fallback.

## 2. Where they are generated and consumed

### `FrontstageSemanticPackage`

Generated in:

- [src/features/entryAgent/frontstageSemanticPackage.ts](/Users/vickyshou/Documents/trae_projects/carpet-gen-system/src/features/entryAgent/frontstageSemanticPackage.ts)

Injected into the main analysis pipeline in:

- [src/features/entryAgent/index.ts](/Users/vickyshou/Documents/trae_projects/carpet-gen-system/src/features/entryAgent/index.ts)

Consumed by:

- [src/features/entryAgent/planningLayer.ts](/Users/vickyshou/Documents/trae_projects/carpet-gen-system/src/features/entryAgent/planningLayer.ts)
- [src/features/entryAgent/frontstageResponsePlanner.ts](/Users/vickyshou/Documents/trae_projects/carpet-gen-system/src/features/entryAgent/frontstageResponsePlanner.ts)

### `FrontstageResponsePlan`

Generated in:

- [src/features/entryAgent/frontstageResponsePlanner.ts](/Users/vickyshou/Documents/trae_projects/carpet-gen-system/src/features/entryAgent/frontstageResponsePlanner.ts)

Attached to analysis in:

- [src/features/entryAgent/index.ts](/Users/vickyshou/Documents/trae_projects/carpet-gen-system/src/features/entryAgent/index.ts)

Consumed by:

- [src/features/simulator/intentStabilization.ts](/Users/vickyshou/Documents/trae_projects/carpet-gen-system/src/features/simulator/intentStabilization.ts)
- [src/features/simulator/SimulatorPage.tsx](/Users/vickyshou/Documents/trae_projects/carpet-gen-system/src/features/simulator/SimulatorPage.tsx)

### `ProposalFeedbackSignal`

Generated in:

- [src/features/entryAgent/proposalFeedbackSignals.ts](/Users/vickyshou/Documents/trae_projects/carpet-gen-system/src/features/entryAgent/proposalFeedbackSignals.ts)

Fed back into runtime state in:

- [src/features/entryAgent/agentRuntime.ts](/Users/vickyshou/Documents/trae_projects/carpet-gen-system/src/features/entryAgent/agentRuntime.ts)

Consumed by planner in:

- [src/features/entryAgent/frontstageResponsePlanner.ts](/Users/vickyshou/Documents/trae_projects/carpet-gen-system/src/features/entryAgent/frontstageResponsePlanner.ts)

## 3. Current minimum viable closed loop

The current loop is:

1. User input enters `analyzeEntryText`.
2. The analysis builds a `FrontstageSemanticPackage`.
3. The planner turns that package into a `FrontstageResponsePlan`.
4. The simulator frontstage now renders:
   - `replySnapshot`
   - `optionalDomainCheck`
   - `compositionProposals`
   - `refinementPrompt`
5. A later user utterance can be parsed into `ProposalFeedbackSignal`.
6. The next-turn planner consumes those feedback signals to rerank proposals, adjust handle weights, or correct domain.

## 4. What changed in this round

The real frontstage consumer migration is now partially completed:

- [src/features/simulator/intentStabilization.ts](/Users/vickyshou/Documents/trae_projects/carpet-gen-system/src/features/simulator/intentStabilization.ts)
  now prefers `analysis.frontstageResponsePlan` and only falls back to `displayPlan` when the new plan is unavailable.

- [src/features/simulator/SimulatorPage.tsx](/Users/vickyshou/Documents/trae_projects/carpet-gen-system/src/features/simulator/SimulatorPage.tsx)
  now renders:
  - `replySnapshot`
  - `optionalDomainCheck`
  - `compositionProposals`
  - `refinementPrompt`

The old frontstage path remains visible only as fallback:

- legacy comparison cards render only when `frontstageResponsePlan` is not present
- legacy follow-up question renders only when `refinementPrompt` is not present

## 5. What is still not fully complete

The refactor is materially further along, but not fully done:

- `displayPlan` still exists and is still produced in the planner
- the new proposal planner still relies on a meaningful amount of case-driven logic
- interpretation handle granularity is still minimal in several domains
- feedback parsing is still minimum-viable rather than broad natural-language coverage
- old comparison-selection UI logic still exists for compatibility, even though it is no longer the primary frontstage mode

## 6. Frontstage status after this round

Places now truly cut to the new chain:

- main simulator snapshot rendering
- main simulator proposal display
- main simulator refinement prompt display
- simulator-side expert reply composition
- benchmark runners now emit `frontstageResponsePlan` output explicitly

Places still acting as fallback:

- `displayPlan.replySnapshot`
- `displayPlan.comparisonCandidates`
- `displayPlan.followUpQuestion`
- simulator comparison selection affordance when the new frontstage plan is absent

## 7. Humanized feedback benchmark samples

These are user feedback examples, not system output:

- “我更偏第二种，不过空气还想再多一点。”
- “我可能会想把第一种和第三种揉在一起。”
- “植物那层可以再退一点，我更想留香气。”
- “海边那个感觉有点偏了，我更想要草本花香这边。”
- “烟雨那层我还想多留一点，竹影可以再轻一点。”

These samples are now used as the canonical direction for parser benchmarks and documentation. The parser still supports ordinal and keyword mapping internally, but the benchmark-facing examples are no longer phrased like machine instructions.

## 8. This implementation step summary

This step moved the work from backend-only frontstage objects to actual frontstage consumption.

### Files changed in this step

- [src/features/simulator/intentStabilization.ts](/Users/vickyshou/Documents/trae_projects/carpet-gen-system/src/features/simulator/intentStabilization.ts)
- [src/features/simulator/SimulatorPage.tsx](/Users/vickyshou/Documents/trae_projects/carpet-gen-system/src/features/simulator/SimulatorPage.tsx)
- [src/features/entryAgent/frontstageResponsePlanner.ts](/Users/vickyshou/Documents/trae_projects/carpet-gen-system/src/features/entryAgent/frontstageResponsePlanner.ts)
- [src/features/entryAgent/frontstageSemanticPackage.ts](/Users/vickyshou/Documents/trae_projects/carpet-gen-system/src/features/entryAgent/frontstageSemanticPackage.ts)
- [src/features/entryAgent/proposalFeedbackSignals.ts](/Users/vickyshou/Documents/trae_projects/carpet-gen-system/src/features/entryAgent/proposalFeedbackSignals.ts)
- [src/features/entryAgent/__tests__/engineEvaluationRunner.ts](/Users/vickyshou/Documents/trae_projects/carpet-gen-system/src/features/entryAgent/__tests__/engineEvaluationRunner.ts)
- [src/features/entryAgent/__tests__/layeringMvpRunner.ts](/Users/vickyshou/Documents/trae_projects/carpet-gen-system/src/features/entryAgent/__tests__/layeringMvpRunner.ts)
- [src/features/entryAgent/__tests__/proposalFeedbackBenchmarkRunner.ts](/Users/vickyshou/Documents/trae_projects/carpet-gen-system/src/features/entryAgent/__tests__/proposalFeedbackBenchmarkRunner.ts)
- [scripts/run-frontstage-feedback-loop.mjs](/Users/vickyshou/Documents/trae_projects/carpet-gen-system/scripts/run-frontstage-feedback-loop.mjs)
- [docs/39-frontstage-semantic-curation-closed-loop-v0.1.md](/Users/vickyshou/Documents/trae_projects/carpet-gen-system/docs/39-frontstage-semantic-curation-closed-loop-v0.1.md)

### What changed

1. The simulator snapshot contract was expanded so the simulator can carry:
   - `replySnapshot`
   - `optionalDomainCheck`
   - `compositionProposals`
   - `refinementPrompt`
   - `usesFrontstagePlan`

2. The simulator now prefers `analysis.frontstageResponsePlan` over `analysis.displayPlan`.

3. The main simulator UI now renders the new frontstage structure:
   - snapshot
   - optional domain check
   - composition proposals
   - refinement prompt

4. Legacy comparison cards and legacy follow-up text were kept only as fallback UI.

5. Frontstage-facing language was tightened so the visible prompt text is no longer placeholder-style text like “你怎么看 / 说说看”.

6. Feedback benchmarks and docs were rewritten to use more human user utterances rather than machine-like instruction sentences.

### What the user can now actually see

Before this step, the new frontstage objects existed in analysis output, but the simulator UI still mainly surfaced the legacy `displayPlan`.

After this step, the simulator UI now primarily surfaces:

- `frontstageResponsePlan.replySnapshot`
- `frontstageResponsePlan.optionalDomainCheck`
- `frontstageResponsePlan.compositionProposals`
- `frontstageResponsePlan.refinementPrompt`

This means the visible frontstage is now materially different, not just the backend analysis payload.

### Validation run in this step

The following validation was run:

- `npm run build`
- `node scripts/run-frontstage-response-plan.mjs`
- `node scripts/run-frontstage-feedback-loop.mjs`
- `node scripts/run-intent-engine-eval.mjs`
- `node scripts/run-system-layering-mvp.mjs`

### Known remaining gaps after this step

- corrected-domain feedback can already re-enter the structure, but the next-turn proposal set may still reuse handles from the pre-correction domain
- feedback parsing is now more human-facing, but still minimum-viable rather than broad natural-language coverage
- legacy `displayPlan` is still produced internally and has not yet been fully retired
