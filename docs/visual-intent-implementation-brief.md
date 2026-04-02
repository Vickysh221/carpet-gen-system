# Visual Intent Implementation Brief

Date: 2026-04-02

## 1. Purpose

这份文档是给 Codex / 开发实现直接开工用的施工说明。

它整合了以下几份文档的核心要求：
- `docs/visual-intent-compiler-spec.md`
- `docs/visual-intent-test-bundle-spec.md`

并补充一个关键约束：

> **Midjourney prompt 只是 display / adapter output 的一部分，不是 backend compiler 的 source of truth。**

目标不是只做一个 prompt string 生成器，而是建立一条完整链路：

```text
用户输入 / 选项点击 / 语义状态
  -> CanonicalIntentState
  -> CompiledVisualIntentPackage
  -> VisualIntentTestBundle
  -> Prompt adapters (Midjourney / generic image prompt / compact display views)
```

---

## 2. Core design decision

## 2.1 Source of truth
系统的 source of truth 必须是：
- `CanonicalIntentState`
- `CompiledVisualIntentPackage`
- `VisualIntentTestBundle`

而不是：
- Midjourney prompt string
- 某一条 developer brief
- 某一段用户可见文案

## 2.2 Midjourney prompt is a derived view
Midjourney prompt：
- 只是 simulator 页面中 `Prompt outputs` 的一个派生结果
- 只能从 `semanticSpec + constraints + antiBias + confidenceState` 编译出来
- 不应反向污染 compiler 核心数据结构

禁止直接把 backend 做成：

```text
intent -> mj prompt string
```

这会导致：
- 无法 debug
- 无法追踪来源
- 无法支持其他模型 / planner
- 无法做 slot 级调参与状态判断

---

## 3. Implementation goals

本轮实现目标分三层：

### Layer 1 — Intent compiler
建立统一中间态，把当前累计设计意向编译成 canonical state。

### Layer 2 — Test bundle builder
把 canonical state 转成 simulator / 测试页可消费的 bundle。

### Layer 3 — Prompt adapters
在 bundle / semanticSpec 之上，派生不同 prompt 展示输出。
例如：
- `buildMidjourneyPrompt(...)`
- `buildPatternFirstPrompt(...)`
- `buildCompactPromptLabel(...)`

---

## 4. Minimum scope for this round

请先做“最小但完整”的版本，不要一上来铺太大。

### 本轮必须完成
1. `CanonicalIntentState`
2. `CompiledVisualIntentPackage`
3. `VisualIntentTestBundle`
4. `buildVisualIntentCompiler(...)` 最小可运行实现
5. `buildVisualIntentTestBundle(...)` 最小可运行实现
6. `buildMidjourneyPrompt(...)` 作为 adapter
7. 用文档里的 3 组 case 跑通示例输出

### 本轮不要做太深的事
- 不要为了 MJ prompt 反向改核心 state
- 不要把所有 image model provider 差异一次做完
- 不要一口气做完整 UI 重构
- 不要先优化用户回复层
- 不要先扩充大批 poetic mappings

---

## 5. Files to add / modify

建议新增：

- `src/features/entryAgent/types.visualIntent.ts`
- `src/features/entryAgent/visualIntentCompiler.ts`
- `src/features/entryAgent/visualIntentTestBundle.ts`
- `src/features/entryAgent/promptAdapters.ts`

如果已有相近文件，可按现有结构合并，但职责要清楚。

### 推荐职责拆分

#### `types.visualIntent.ts`
定义：
- `CanonicalIntentState`
- `CompiledVisualIntentPackage`
- `VisualIntentTestBundle`
- `GenerationSemanticSpec`
- `ConfidenceState`
- `TraceBundle`
- `VisualIntentRisk`
- `TuningSuggestions`

#### `visualIntentCompiler.ts`
负责：
- 从已有 intake 语义状态构建 `CanonicalIntentState`
- 生成 `CompiledVisualIntentPackage`

#### `visualIntentTestBundle.ts`
负责：
- 把 compiler 输出包装成测试页需要的 bundle
- 补充 risks / tuningSuggestions / testLabel

#### `promptAdapters.ts`
负责：
- `buildMidjourneyPrompt(...)`
- `buildPatternFirstPrompt(...)`
- 其他 display-oriented prompt 输出

---

## 6. Required data structures

## 6.1 CanonicalIntentState
至少包含：
- `atmosphere`
- `color`
- `impression`
- `pattern`
- `presence`
- `arrangement`
- `materiality`
- `constraints`
- `antiBias`
- `unresolvedSplits`
- `readiness`

每个槽位最好使用统一包装：
- `value`
- `confidence`
- `status`
- `sources`
- `traces`

### 状态枚举
- `missing`
- `tentative`
- `stable`
- `committed`

---

## 6.2 CompiledVisualIntentPackage
至少包含：
- `summary`
- `developerBrief`
- `semanticSpec`
- `generationPrompt`
- `negativePrompt`
- `confidenceState`
- `unresolvedQuestions`
- `trace`

---

## 6.3 VisualIntentTestBundle
至少包含：
- `testLabel`
- `summary`
- `semanticSpec`
- `prompt`
- `negativePrompt`
- `risks`
- `tuningSuggestions`
- `confidenceState`
- `unresolvedQuestions`
- `trace`

---

## 7. Input sources

Compiler 输入应从现有系统里拿，而不是重新发明一套来源。

优先接入：
- `semanticCanvas`
- `poeticSignal`
- `semanticMapping`
- `updatedSlotStates`
- `intakeGoalState`
- 用户自由输入
- 选项点击记录
- negation / constraints
- readiness / confidenceSummary

### 关键要求
要保留 source typing：
- `explicit_user_text`
- `option_click`
- `poetic_mapping`
- `semantic_inference`
- `planner_bridge`

---

## 8. Canonical slot mapping requirements

本轮最少要完整映射这些：

### 8.1 color
必须包括：
- temperature
- saturation
- brightness
- contrast
- haze
- base / accent relation

### 8.2 atmosphere / impression
必须能表达：
- quiet
- restrained
- delicate
- intimate
- mist-softened
- warm-light accent
- calm-with-distance / calm-with-warmth 等 tension

### 8.3 pattern
必须明确：
- abstraction
- density
- motion
- edgeDefinition
- structuralPattern
- atmosphericPattern
- motifBehavior

### 8.4 presence
必须明确：
- blending
- focalness
- visualWeight
- behavior

### 8.5 arrangement
至少支持：
- spread
- directionalFlow
- rhythm
- orderliness

### 8.6 constraints / antiBias
必须承接：
- 不要太花
- 不要酒店感
- 不要 literal landscape
- 不要 bright gold
- 不要 floral ornament

---

## 9. Important semantic rule

## 9.1 Do not literalize poetic terms
禁止把 poetic term 直接原词塞进 prompt 当作主理解。

正确做法：
- 烟雨 -> mist-softened / humid / blurred edges / cloud-mist atmosphere
- 竹影 -> sparse linear rhythm / shadow-like movement / subtle botanical shadow
- 月白 -> pale cool-light low-saturation base
- 灯火 -> softly embedded warm accent / intimate night warmth

## 9.2 Preserve role assignment in combinations
组合 case 不要只做总量叠加。

必须尽量保留：
- base vs accent
- atmosphere vs structural pattern
- overall blending vs local focal lift

例如：
- 月白 + 灯火 = pale restrained base + warm accent
- 暮色 + 灯火 = dusk-toned base + intimate light-trace accent

---

## 10. Test bundle requirements

Test bundle 必须是“测试友好”的，而不是用户友好的。

### 必须做到
1. 一眼能看出当前意向
2. 一眼能看出 prompt
3. 一眼能看出 negative prompt
4. 一眼能看出当前主要风险
5. 一眼能看出下一步该怎么调

### risks 最少支持
- `too-literal`
- `too-flat`
- `too-decorative`
- `too-loud`
- `too-luxury`
- `pattern-collapse`
- `accent-loss`
- `presence-loss`

### tuningSuggestions 最少支持
- `ifTooFlat`
- `ifTooLiteral`
- `ifTooDecorative`
- `ifTooLoud`
- `ifPresenceTooWeak`
- `ifAccentLost`

---

## 11. Prompt adapters

## 11.1 General principle
Prompt adapters 是 view layer artifact。

它们从：
- `semanticSpec`
- `constraints`
- `antiBias`
- `confidenceState`

派生出不同显示/测试 prompt。

它们不能反向定义 canonical state。

## 11.2 Midjourney adapter
`buildMidjourneyPrompt(...)` 要求：
- 输出 pattern-first / no perspective / seamless 版本
- 不必强调 carpet/rug
- 更强调：
  - `flat 2D pattern`
  - `seamless textile pattern`
  - `top-down composition`
  - `edge-to-edge pattern field`
  - `no perspective`
  - `no room scene`
  - `no product mockup`

### 示例思路
不是：
- `abstract carpet design`

而是：
- `quiet natural atmosphere, ... flat 2D pattern, seamless textile pattern, top-down composition...`

## 11.3 Adapter outputs
建议先支持：
- `midjourneyPrompt`
- `genericImagePrompt`
- `compactPromptSummary`

---

## 12. Suggested pipeline

```ts
function buildVisualIntentCompiler(input): CompiledVisualIntentPackage
function buildVisualIntentTestBundle(pkg): VisualIntentTestBundle
function buildMidjourneyPrompt(spec): string
```

### 流程
```text
existing intake outputs
  -> buildCanonicalIntentState(...)
  -> buildCompiledVisualIntentPackage(...)
  -> buildVisualIntentTestBundle(...)
  -> buildMidjourneyPrompt(bundle.semanticSpec)
```

---

## 13. Example cases to support now

请至少用以下 3 组例子验证：

### Case A
- 自然
- 烟雨三月
- 水汽流动感

### Case B
- 不要太花
- 像竹影
- 想被看见一点

### Case C
- 月白
- 带一点灯火
- 不要太亮

要求输出：
- canonical state
- compiled package
- test bundle
- midjourney prompt

---

## 14. Acceptance criteria

完成后至少满足：

### Core compiler
- 能从现有 intake 状态生成 canonical intent state
- 能输出 semanticSpec / developerBrief / prompt / negativePrompt
- 能区分 tentative / stable / committed
- 能保留 unresolvedQuestions 和 trace

### Test bundle
- 能输出 risks 和 tuningSuggestions
- 能给 simulator 页面直接消费
- 不是只有一条 prompt

### Midjourney adapter
- 只是派生输出
- 使用 pattern-first / no perspective / seamless 风格
- 不反向驱动 canonical state

### Build quality
- TypeScript 类型清晰
- 不破坏现有 build
- 最小实现可运行

---

## 15. What to return after implementation

请在完成后说明：

1. 新增/修改了哪些文件
2. canonical state 的结构最终长什么样
3. compiled package 和 test bundle 如何分工
4. midjourney prompt adapter 接在哪一层
5. 3 组示例 case 的输出长什么样
6. 当前哪些字段还是 stub / heuristic
7. 下一轮最值得补的 3 个点

---

## 16. Direct task text for Codex

可以直接把下面这段发给 Codex：

```text
请根据 docs/visual-intent-implementation-brief.md 实现 visual intent backend 的最小可运行版本。

任务目标：
建立这条链路：
existing intake outputs -> CanonicalIntentState -> CompiledVisualIntentPackage -> VisualIntentTestBundle -> Prompt adapters

本轮必须完成：
1. types.visualIntent.ts
2. visualIntentCompiler.ts
3. visualIntentTestBundle.ts
4. promptAdapters.ts
5. buildMidjourneyPrompt(...) 作为 adapter
6. 用 3 组示例 case 验证输出

关键约束：
- Midjourney prompt 只是 display / adapter output，不是 source of truth
- 不要直接做成 intent -> mj prompt string
- 先建立 canonical state 和 test bundle
- prompt adapter 必须从 semanticSpec 派生
- Midjourney prompt 采用 pattern-first / no perspective / seamless 的写法，不要默认强调 carpet product

完成后请输出：
- 改了哪些文件
- 数据结构
- 示例输出
- 当前 heuristic / stub
- 下一轮建议
```

---

## 17. Final standard

这次实现的目标不是“又多了一条 prompt”，而是：

> **把用户意图真正变成一个可编译、可测试、可调试、可派生不同 prompt 视图的中间系统。**

如果最后只有一个 `midjourneyPrompt: string`，那这次实现就是失败的。
