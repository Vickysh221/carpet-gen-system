# Visual Intent Compiler Spec

Date: 2026-04-02

## 1. Purpose

这份文档定义后台用的 **Visual Intent Compiler**。

它的职责不是给用户回复，而是：

> 把用户当前累计出来的设计意向，编译成开发者与生成系统可消费的视觉意向包。

也就是说，它是：
- 用户语言 / 选项点击 / poetic semantics
- → 系统中间意向状态
- → 生成控制语义
- → prompt package

它不是聊天层，不负责“被理解感”；
它负责的是：
- 可生成性
- 可调试性
- 可追踪性
- 可继续追问时的稳态管理

---

## 2. Separation of concerns

系统必须明确分成两层：

### 2.1 User-facing layer
用于前台交流：
- 资深但友好的地毯设计顾问口吻
- 当前意向快照
- 一个关键分叉
- 一个下一问

### 2.2 Compiler layer
用于后台编译：
- 输入所有已知槽位与约束
- 输出 developer brief / semantic spec / generation prompt / negative prompt
- 标记哪些稳定，哪些未稳定
- 标记来源与置信度

这两层不能混写。

---

## 3. Compiler goal

Visual Intent Compiler 不是单纯生成一条 prompt string。

它要输出的是一份 **Compiled Visual Intent Package**，至少包含：

1. `developerBrief`
2. `semanticSpec`
3. `generationPrompt`
4. `negativePrompt`
5. `confidenceState`
6. `unresolvedQuestions`
7. `trace`

如果只输出 prompt string，会有三个问题：
- 不可 debug
- 不可控制
- 不可追问

所以 prompt 只是编译产物之一，不是系统唯一真相。

---

## 4. Input slots

Compiler 输入必须覆盖的不只是生成槽位，还包括交互与状态槽位。

## 4.1 Raw user inputs
- `freeTextInputs: string[]`
- `selectedOptions: { questionId: string; optionId: string; label: string }[]`
- `turnHistory: TurnSnapshot[]`

## 4.2 Semantic outputs from intake pipeline
- `semanticCanvas`
- `poeticSignal`
- `semanticMapping`
- `updatedSlotStates`
- `intakeGoalState`

## 4.3 Interaction/meta state
- `currentRound`
- `totalRounds`
- `readiness`
- `resolvedQuestions`
- `unresolvedQuestions`
- `confidenceSummary`

## 4.4 Constraint state
- `negations`
- `antiBias`
- `conflictSignals`
- `hardConstraints`
- `softPreferences`

## 4.5 Source typing
每个输入信号最好标记来源：
- `explicit_user_text`
- `option_click`
- `poetic_mapping`
- `semantic_inference`
- `planner_bridge`

---

## 5. Canonical intermediate state

Compiler 需要一个统一的中间态，不直接从 intake 输出拼 prompt。

建议命名：

## `CanonicalIntentState`

```ts
export type SlotStatus = "missing" | "tentative" | "stable" | "committed";
export type SignalSourceType =
  | "explicit_user_text"
  | "option_click"
  | "poetic_mapping"
  | "semantic_inference"
  | "planner_bridge";

export interface SourcedValue<T> {
  value: T;
  confidence: number;        // 0~1
  status: SlotStatus;
  sources: SignalSourceType[];
  traces?: string[];         // raw quotes / mapping ids / rule ids
}

export interface CanonicalIntentState {
  atmosphere?: SourcedValue<AtmosphereState>;
  color?: SourcedValue<ColorState>;
  impression?: SourcedValue<ImpressionState>;
  pattern?: SourcedValue<PatternState>;
  presence?: SourcedValue<PresenceState>;
  arrangement?: SourcedValue<ArrangementState>;
  materiality?: SourcedValue<MaterialityState>;
  focalStrategy?: SourcedValue<FocalStrategyState>;
  constraints?: SourcedValue<ConstraintState>;
  antiBias?: SourcedValue<AntiBiasState>;
  unresolvedSplits: UnresolvedSplit[];
  readiness: {
    score: number;
    mode: "exploratory" | "preview" | "committed";
  };
}
```

---

## 6. Required canonical slots

下面这些槽位，不一定都直接以同名进入 prompt，但必须在中间态里被完整表示。

## 6.1 Atmosphere
这是最容易被忽略，但最重要的层。

```ts
interface AtmosphereState {
  quietness?: number;
  warmth?: number;
  distance?: number;
  softness?: number;
  humidity?: number;
  clarity?: number;
  haze?: number;
  restraint?: number;
  liveliness?: number;
  intimacy?: number;
}
```

作用：
- 承接“安静、烟雨、夜里一点灯火、月白风清”这类高层气质
- 不等于 impression，也不完全等于 color

---

## 6.2 Color

```ts
interface ColorState {
  temperature?: "cool" | "cool-neutral" | "neutral" | "warm-neutral" | "warm";
  saturation?: "very-low" | "low" | "medium-low" | "medium" | "high";
  brightness?: "dark" | "mid-dark" | "medium" | "medium-light" | "light";
  contrast?: "very-soft" | "soft" | "moderate" | "high";
  haze?: "none" | "low" | "medium" | "high";
  paletteBias?: string[]; // blue-gray / off-white / amber / muted green-gray...
  baseAccentRelation?: {
    base?: string;
    accent?: string;
    relation?: "base-only" | "base-plus-accent" | "dual-tone";
  };
}
```

必须能承接：
- 天青 vs 月白 vs 暮色 vs 灯火
- 冷底里一点暖
- 低饱和但不寡淡

---

## 6.3 Impression

```ts
interface ImpressionState {
  primary?: string[];   // quiet / restrained / delicate / intimate / contemplative
  secondary?: string[];
  tension?: string[];   // restrained-but-present / calm-with-warmth / gentle-but-directional
}
```

这里不要只用通用情绪词。
必须容纳：
- intimate
- lived-in
- delicate
- austere
- contemplative
- quietly luminous

---

## 6.4 Pattern

```ts
interface PatternState {
  abstraction?: "figurative" | "semi-abstract" | "abstract";
  density?: "very-low" | "low" | "medium-low" | "medium" | "high";
  scale?: "micro" | "small" | "medium" | "large";
  motion?: "still" | "gentle-flow" | "directional-flow" | "pulsed";
  edgeDefinition?: "blurred" | "soft" | "mixed" | "clear";
  motifBehavior?: "implicit" | "suggestive" | "visible";
  structuralPattern?: string[];  // terrain-flow / linear rhythm / light-trace / stone-texture
  atmosphericPattern?: string[]; // cloud-mist / diffusion / soft layering
  keyElements?: string[];
}
```

这层一定要明确区分：
- `structuralPattern`
- `atmosphericPattern`

否则会再次出现：
- 暮色吞掉灯火的 pattern ownership

---

## 6.5 Presence

```ts
interface PresenceState {
  blending?: "blended" | "softly-noticeable" | "noticeable" | "focal";
  focalness?: "low" | "medium-low" | "medium" | "high";
  visualWeight?: "light" | "medium-light" | "medium" | "heavy";
  behavior?: "overall-blended" | "local-lift" | "distributed-presence" | "clear-focal-accent";
}
```

必须支持：
- 融进去
- 被看见一点
- 整体很轻，但局部有存在感
- 低 visual weight 但情绪强

---

## 6.6 Arrangement / composition

这层在当前系统里是隐性的，但必须正式化。

```ts
interface ArrangementState {
  spread?: "compact" | "balanced" | "open" | "loose";
  directionalFlow?: "low" | "medium" | "high";
  rhythm?: "smooth" | "segmented" | "layered" | "linear";
  symmetry?: "none" | "soft" | "strong";
  centerOfGravity?: "centered" | "distributed" | "edge-biased";
  orderliness?: "organic" | "soft-order" | "structured";
}
```

用于承接：
- 松一点 / 有呼吸感
- 更整齐一些
- 更散 / 更有走势
- 线性节奏 / 地貌流线

---

## 6.7 Materiality

```ts
interface MaterialityState {
  surfaceFeel?: string[]; // dry / airy / soft / stone-like / aged-warm / glazed-light
  textureBias?: string[];
}
```

用于承接：
- 旧木头被太阳晒过
- 冷石头上的光
- 琉璃

---

## 6.8 Constraints / anti-bias

```ts
interface ConstraintState {
  avoidMotifs?: string[];
  avoidStyles?: string[];
  avoidPalette?: string[];
  avoidComposition?: string[];
  keepQualities?: string[];
}

interface AntiBiasState {
  negativePromptHints?: string[];
  misreadRisks?: string[];
}
```

必须显式承接：
- 不要太花
- 不要酒店感
- 不要 literal landscape
- 不要高饱和蓝
- 不要 shiny luxury

---

## 7. Stable vs tentative vs committed

这是 compiler 必须有的 gating。

不是所有信息都该直接进最终 prompt。

## 7.1 Tentative
- 只有弱信号
- 用户未明确确认
- 可以进 preview prompt
- 不应用强确定语气

## 7.2 Stable
- 多个来源支持
- 用户有明确表达
- 可以进入 developer brief 和 semanticSpec
- 可以进入 generation prompt 但措辞留一点弹性

## 7.3 Committed
- 高 confidence
- 多轮确认过
- 可直接成为正式出图 prompt 的核心内容

---

## 8. Compiler output package

建议统一输出：

```ts
export interface CompiledVisualIntentPackage {
  summary: string;
  developerBrief: string;
  semanticSpec: GenerationSemanticSpec;
  generationPrompt: string;
  negativePrompt: string;
  confidenceState: ConfidenceState;
  unresolvedQuestions: string[];
  trace: TraceBundle;
}
```

---

## 9. Output field definitions

## 9.1 summary
给人快速看的一句话。

例：
> Quiet natural carpet direction with mist-softened terrain flow and low visual weight.

---

## 9.2 developerBrief
给开发者/设计师看的简要说明。

要求：
- 比 summary 更完整
- 有 base / accent / constraints
- 有 pattern organization
- 有 presence

例：
> A quiet, natural, low-saturation carpet direction. The pattern should feel like abstract terrain flow softened by moisture, rather than literal scenery. Overall presence should stay blended and light, with gentle directional movement and soft edges. Avoid dense ornament and literal landscape motifs.

---

## 9.3 semanticSpec
供程序消费的结构化输出。

```ts
interface GenerationSemanticSpec {
  baseMood?: string[];
  palette?: {
    temperature?: string;
    saturation?: string;
    brightness?: string;
    contrast?: string;
    haze?: string;
    base?: string;
    accent?: string;
  };
  atmosphere?: string[];
  pattern?: {
    abstraction?: string;
    density?: string;
    structuralPattern?: string[];
    atmosphericPattern?: string[];
    motion?: string;
    edgeDefinition?: string;
    motifBehavior?: string;
  };
  presence?: {
    blending?: string;
    focalness?: string;
    visualWeight?: string;
    behavior?: string;
  };
  arrangement?: ArrangementState;
  constraints?: ConstraintState;
}
```

---

## 9.4 generationPrompt
给生成模型的主 prompt。

要求：
- 优先写感知结果，不写 poetic term 字面
- 先写整体方向，再写 pattern，再写 presence，再写 constraints
- 尽量短而强，不要把 debug 信息塞进去

模板建议：

> [design type], [overall atmosphere], [palette], [pattern organization], [presence behavior], [composition tendency], [important constraints]

例：
> Abstract carpet design, quiet natural atmosphere, cool-neutral low-saturation palette, mist-softened terrain-like flowing lines, sparse composition, soft transitions, blended presence, low visual weight, gentle directional movement, non-literal, non-floral, low contrast.

---

## 9.5 negativePrompt
用于 anti-bias 和误生成抑制。

例：
> No literal mountains, no scenic illustration, no floral ornament, no dense decoration, no sharp geometry, no hotel-luxury gold, no glossy finish, no high-saturation blue.

---

## 9.6 confidenceState

```ts
interface ConfidenceState {
  mode: "exploratory" | "preview" | "committed";
  overallConfidence: number;
  slotConfidence: Record<string, number>;
  stableSlots: string[];
  tentativeSlots: string[];
  missingSlots: string[];
}
```

---

## 9.7 unresolvedQuestions

例：
- more misty or more directional flow?
- more blended or slightly noticeable?
- looser spread or more ordered rhythm?

---

## 9.8 trace
必须可追踪。

```ts
interface TraceBundle {
  slotTrace: Record<
    string,
    {
      rawEvidence: string[];
      poeticMappings?: string[];
      optionSelections?: string[];
      rulesApplied?: string[];
    }
  >;
}
```

---

## 10. Preview mode vs committed mode

Compiler 至少支持两种输出模式：

## 10.1 Preview mode
用于：
- 当前轮次中途
- 方向已出现，但未完全稳定
- 适合低保真出图或开发预览

特点：
- 允许 tentative 内容进入 prompt
- unresolvedQuestions 不为空
- prompt 用语稍留活口

## 10.2 Committed mode
用于：
- readiness 足够高
- 核心槽位已稳定
- 适合正式出图

特点：
- 只保留 stable / committed 信息
- prompt 更紧、更强
- unresolvedQuestions 应很少或为空

---

## 11. Suggested compiler pipeline

```ts
raw user input + option clicks
  -> semantic intake pipeline
  -> CanonicalIntentState
  -> GenerationSemanticSpec
  -> Prompt Package Builder
  -> { developerBrief, generationPrompt, negativePrompt, trace }
```

建议实现拆成四步：

1. `buildCanonicalIntentState(...)`
2. `compileGenerationSemanticSpec(...)`
3. `buildGenerationPrompt(...)`
4. `buildCompiledVisualIntentPackage(...)`

---

## 12. Example outputs

## 12.1 Example A
### User direction
- 自然
- 烟雨三月
- 水汽流动感

### Compiled package (preview)

**summary**
> Quiet natural direction with mist-softened terrain flow and gentle directional movement.

**developerBrief**
> A quiet, natural carpet direction with low-saturation color, softened edges, and a lightly humid atmosphere. The pattern should feel like abstract terrain flow touched by moisture, not literal landscape imagery. Overall presence should stay blended and light, while movement should be directional rather than static.

**semanticSpec**
```json
{
  "baseMood": ["quiet", "natural", "restrained"],
  "palette": {
    "temperature": "cool-neutral",
    "saturation": "low",
    "contrast": "soft",
    "haze": "medium-high"
  },
  "atmosphere": ["mist-softened", "humid", "calm"],
  "pattern": {
    "abstraction": "abstract",
    "density": "low",
    "structuralPattern": ["terrain-flow"],
    "atmosphericPattern": ["cloud-mist"],
    "motion": "directional-flow",
    "edgeDefinition": "soft",
    "motifBehavior": "suggestive"
  },
  "presence": {
    "blending": "blended",
    "focalness": "low",
    "visualWeight": "light",
    "behavior": "overall-blended"
  },
  "arrangement": {
    "spread": "open",
    "directionalFlow": "medium",
    "orderliness": "organic"
  },
  "constraints": {
    "avoidMotifs": ["literal mountains", "scenic illustration", "floral motifs"],
    "avoidComposition": ["dense decoration", "hard segmentation"]
  }
}
```

**generationPrompt**
> Abstract carpet design, quiet natural atmosphere, cool-neutral low-saturation palette, mist-softened terrain-like flowing lines, gentle directional movement, sparse and breathable composition, soft transitions, blended presence, low visual weight, non-literal, non-floral, low contrast.

**negativePrompt**
> No literal mountains, no scenic illustration, no floral ornament, no dense decoration, no sharp geometry, no glossy luxury finish, no high-saturation blue.

---

## 12.2 Example B
### User direction
- 不要太花
- 像竹影
- 想被看见一点

### Compiled package (preview)

**summary**
> Restrained sparse direction with linear rhythmic structure and slightly lifted presence.

**developerBrief**
> A restrained, non-decorative carpet direction with sparse linear rhythm inspired by the feel of bamboo shadow rather than literal botanical imagery. The design should stay quiet overall, but not disappear entirely; presence should be lifted slightly through structure and rhythm rather than brightness.

**generationPrompt**
> Abstract carpet design, restrained quiet atmosphere, muted palette, sparse linear rhythmic structure, subtle botanical shadow feeling, soft but legible edges, lightly lifted presence, low-to-medium focalness, non-literal, non-floral, not dense, not ornate.

**negativePrompt**
> No literal bamboo leaves, no floral decoration, no dense ornament, no childish patterning, no overly explicit botanical illustration.

---

## 12.3 Example C
### User direction
- 月白
- 带一点灯火
- 不要太亮

### Compiled package (preview)

**summary**
> Pale restrained base with a softly embedded warm light accent.

**developerBrief**
> A light, restrained, low-saturation base with a subtle warm accent inspired by lamplight at night. The warmth should not become bright or luxurious; it should feel embedded, intimate, and lightly present rather than focal or glossy.

**generationPrompt**
> Abstract carpet design, pale low-saturation base, cool-light neutral palette with a softly embedded warm accent, restrained and intimate atmosphere, sparse composition, soft edges, blended overall presence with slight local warmth, not bright, not glossy, not hotel-luxury.

**negativePrompt**
> No bright gold, no glossy finish, no hotel-luxury styling, no strong focal highlight, no heavy contrast, no ornate decorative motifs.

---

## 13. What must always be included

如果要回答“这个 prompt compiler 有没有囊括所有关键槽位”，下面这些是最低必须项：

### Must include
- color
- atmosphere / impression
- pattern
- presence
- arrangement
- constraints / anti-bias
- confidence / slot status
- unresolved questions
- trace

### Prompt-only is not enough
如果只有：
- generationPrompt
- negativePrompt

但没有：
- semanticSpec
- confidenceState
- trace

那它还不能算完整 compiler。

---

## 14. Recommended implementation files

建议实现拆成：
- `src/features/entryAgent/visualIntentCompiler.ts`
- `src/features/entryAgent/buildCanonicalIntentState.ts`
- `src/features/entryAgent/buildGenerationPrompt.ts`
- `src/features/entryAgent/types.visualIntent.ts`

如果想先做最小版，也至少应有：
- `visualIntentCompiler.ts`
- `types.visualIntent.ts`

---

## 15. Final standard

一个合格的 Visual Intent Compiler 必须同时满足：

1. **用户语言不会被字面化**
   - 烟雨 ≠ rain graphic
   - 竹影 ≠ bamboo motif
   - 月白 ≠ plain white

2. **前台交流语言和后台编译语言彻底分离**
   - 用户看到的是设计顾问
   - 开发者/模型拿到的是 visual spec

3. **输出可以 debug**
   - 知道为什么得出这个 prompt

4. **输出可以继续追问**
   - 知道哪些已经稳，哪些还没稳

5. **输出可以真正指导生成**
   - 不只是好听，而是能控制图的方向
