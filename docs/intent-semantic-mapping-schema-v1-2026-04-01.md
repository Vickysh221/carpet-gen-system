# Intent Semantic Mapping Schema v1

Date: 2026-04-01

## 1. 这份文档是干什么的

这份文档同时服务两件事：

1. **产品定义**
   - 解释 `Intent Intake Agent` 内部到底应该接收和维护什么样的语义结构
   - 说明为什么现有粗粒度结构不够
   - 说明这套结构如何服务于提问、出图、确认、图文双决策链

2. **工程落地**
   - 给出一版可直接转成 TypeScript types 的 schema 草案
   - 让后续 Codex / 开发实现可以直接对齐

这不是最终数据库 schema，也不是最终 API contract。
它是：

> **Intent Intake Agent 的内部语义表示层 v1**

---

## 2. 为什么需要一套新的内部结构

当前如果系统内部只有类似：
- `colorMood`
- `patternTendency`
- `overallImpression`
- `arrangementTendency`

那么再强的模型输出也只能被压回几个粗桶里。

结果就是：
- 用户说了高阶语义，系统接不住
- `pattern intent` 无法承载 key element
- `presence / blending` 这种真实需求会被混入别的槽位
- 多轮里“已经收窄了什么”和“还差什么”说不清
- 图文双决策链接进来后，文本与图片无法写回同一套结构

所以，问题不是先问“模型会不会”，而是先问：

> **系统内部有没有足够高分辨率的承接结构。**

---

## 3. 这套结构要同时服务什么

它不是纯 NLP 输出，而是必须同时服务 4 件事：

1. **理解用户**
2. **决定下一问**
3. **决定何时出第一批图**
4. **吸收图片反馈并回写状态**

因此它必须是：

> **agent-consumable state**

而不是只是一个“语义解释结果”。

---

## 4. 产品视角下，这套结构应该分几层

建议分成 6 个层：

1. `rawCues`
2. `interpretedIntent`
3. `slotHypotheses`
4. `questionOpportunities`
5. `resolutionHints`
6. `confidenceSummary`

### 为什么是这 6 层

- `rawCues`：保留原始证据，方便 explainability 和问题引用
- `interpretedIntent`：给 agent 一个当前全局理解
- `slotHypotheses`：把用户意图映射到 macro slot / subslot
- `questionOpportunities`：给 planner 用，不直接等于用户问题
- `resolutionHints`：把多轮“收窄 / 结案”写回系统
- `confidenceSummary`：为 stop / generate / confirm 提供依据

---

## 5. 顶层结构（产品定义）

```ts
interface IntentSemanticMapping {
  rawCues: RawCue[];
  interpretedIntent: InterpretedIntent;
  slotHypotheses: SlotHypothesisBundle;
  questionOpportunities: QuestionOpportunity[];
  resolutionHints: ResolutionHint[];
  confidenceSummary: ConfidenceSummary;
}
```

这不是给用户看的，也不是给调试 UI 直接裸展示的。
它是 agent 内部的语义状态输入层。

---

## 6. Layer 1 — raw cues

### 产品意义
保留用户原始表达中最值得追踪的语义单位。

这样做的价值：
- 后面可以引用用户自己的词问问题
- 图文冲突时能回看最初到底说了什么
- debug 时能看出模型是不是过度发挥了

### Schema

```ts
interface RawCue {
  text: string;
  cueType:
    | "explicit"
    | "metaphoric"
    | "comparative"
    | "negative-boundary"
    | "spatial"
    | "visual-weight";
  strength: number;
}
```

### Example
用户输入：
- “风中荷花，卧室里用，别太碎太花，想安静一点但别没精神”

raw cues 里至少应保留：
- 风中荷花
- 卧室
- 别太碎太花
- 安静一点
- 别没精神

---

## 7. Layer 2 — interpreted intent

### 产品意义
给 agent 一个“当前整体上我是怎么理解这段输入的”总结。

它不是最终用户文案，
而是内部全局理解摘要。

### Schema

```ts
interface InterpretedIntent {
  dominantEntryPoint:
    | "space"
    | "mood"
    | "pattern-intent"
    | "color"
    | "presence";
  summary: string;
  designReading: string[];
  metaphorNotes: MetaphorNote[];
}

interface MetaphorNote {
  sourceCue: string;
  interpretedAs: string[];
  uncertaintyNote?: string;
}
```

### Example
```ts
{
  dominantEntryPoint: "pattern-intent",
  summary: "用户先从一个具意向性的图案母题进入，希望图案不要太碎，同时整体气质偏安静、适合卧室。",
  designReading: [
    "pattern should carry lotus-like imagery",
    "rendering should lean suggestive rather than literal",
    "overall mood should stay calm but not lifeless"
  ],
  metaphorNotes: [
    {
      sourceCue: "风中荷花",
      interpretedAs: ["lotus imagery", "wind-like motion", "light dispersed composition"]
    }
  ]
}
```

---

## 8. Layer 3 — slot hypotheses

这是整套 schema 的核心。

### 产品意义
把用户意图映射到：
- macro slot
- subslot
- branch candidates
- 当前 open questions

### Top-level schema

```ts
interface SlotHypothesisBundle {
  impression?: ImpressionHypothesis;
  color?: ColorHypothesis;
  patternIntent?: PatternIntentHypothesis;
  arrangement?: ArrangementHypothesis;
  space?: SpaceHypothesis;
  presence?: PresenceHypothesis;
}
```

这 6 个对象对应的不是现有粗 field 的简单复制，
而是为 Intent Intake Agent 和图文双决策链准备的更高阶承接层。

---

## 8.1 ImpressionHypothesis

```ts
interface ImpressionHypothesis {
  topDirections: Array<{
    label: "calm" | "warm" | "soft" | "presence" | "restrained";
    score: number;
    evidence: string[];
  }>;
  openQuestions: string[];
}
```

### 产品作用
承载：
- 安静 / 张力
- 柔和 / 利落
- 温暖 / 克制
- 整体氛围主导方向

---

## 8.2 ColorHypothesis

```ts
interface ColorHypothesis {
  warmth?: {
    top: "warm" | "neutral" | "cool";
    score: number;
  };
  saturation?: {
    top: "muted" | "visible" | "vivid";
    score: number;
  };
  role?: {
    top: "atmospheric" | "noticeable";
    score: number;
  };
  evidence: string[];
  openQuestions: string[];
}
```

### 产品作用
颜色不只是色相，还要承载：
- 颜色被不被看见
- 颜色是主体还是气息
- 颜色是暖、收、跳、还是低刺激

---

## 8.3 PatternIntentHypothesis

这是本轮最关键的新对象。

```ts
interface PatternIntentHypothesis {
  subject?: {
    candidates: Array<{
      label: string;
      score: number;
      evidence: string[];
    }>;
  };
  rendering?: {
    top:
      | "literal"
      | "softened-figurative"
      | "semi-abstract"
      | "suggestive"
      | "texture-like";
    score: number;
  };
  abstractionPreference?: {
    top: "concrete" | "semi-abstract" | "abstract";
    score: number;
  };
  compositionFeeling?: {
    tags: string[];
    score: number;
  };
  complexity?: {
    top: "low" | "medium" | "high";
    score: number;
  };
  geometryVsOrganic?: {
    top: "organic" | "balanced" | "geometric";
    score: number;
  };
  evidence: string[];
  openQuestions: string[];
}
```

### 为什么它必须存在
用户说：
- “风中荷花”

系统如果只输出：
- `patternTendency = natural`

其实丢失了最关键的信息：
- 荷花这个 key element
- 它是具象还是意向
- 它带有风感 / 轻 / 散开 / 流动

所以 `patternIntent` 是把：
- motif subject
- rendering style
- abstraction level
- compositional feeling
统一接住的内部对象。

---

## 8.4 ArrangementHypothesis

```ts
interface ArrangementHypothesis {
  density?: {
    top: "open" | "balanced" | "dense";
    score: number;
  };
  order?: {
    top: "free" | "balanced" | "ordered";
    score: number;
  };
  evidence: string[];
  openQuestions: string[];
}
```

### 产品作用
承载：
- 松 / 密
- 规整 / 自由
- 透气 / 充满

---

## 8.5 SpaceHypothesis

```ts
interface SpaceHypothesis {
  roomType?: {
    top: "bedroom" | "living-room" | "study" | "office" | "other";
    score: number;
  };
  usageMode?: {
    tags: string[];
    score: number;
  };
  evidence: string[];
}
```

### 产品作用
承载：
- 空间场景
- 使用方式
- 地毯在场景中的角色背景

---

## 8.6 PresenceHypothesis

这个也应该独立，不再混进 impression。

```ts
interface PresenceHypothesis {
  blendingMode?: {
    top: "blended" | "softly-noticeable" | "focal";
    score: number;
  };
  visualWeight?: {
    top: "light" | "medium" | "strong";
    score: number;
  };
  evidence: string[];
  openQuestions: string[];
}
```

### 为什么要单独建模
因为用户真实会这样表达：
- 别太抢
- 融进去一点
- 稍微有点存在感
- 不要太像一个强视觉中心

这些不能总被粗暴归到 impression 或 color 里。

---

## 9. Layer 4 — question opportunities

### 产品意义
这层不是直接给用户的问题文案。
而是给 planner 的问题机会空间。

```ts
interface QuestionOpportunity {
  targetMacroSlot:
    | "impression"
    | "color"
    | "patternIntent"
    | "arrangement"
    | "space"
    | "presence";
  targetSubslot: string;
  questionGoal:
    | "disambiguate"
    | "narrow-branch"
    | "confirm-base-direction"
    | "collect-missing-slot";
  expectedGain: number;
  suggestedUserFacingAngle: string;
  basedOnEvidence: string[];
}
```

### Example
```ts
{
  targetMacroSlot: "patternIntent",
  targetSubslot: "rendering",
  questionGoal: "disambiguate",
  expectedGain: 0.82,
  suggestedUserFacingAngle: "你说的荷花，更像要保留那个意向和动势，还是希望真的能看出荷花本身？",
  basedOnEvidence: ["风中荷花"]
}
```

最终用户看到的句子应由 persona renderer 来润色，
而不是直接把这个对象裸吐出去。

---

## 10. Layer 5 — resolution hints

### 产品意义
这层直接服务你现有的：
- question family
- resolution state
- multi-turn closure

```ts
interface ResolutionHint {
  familyId: string;
  status: "unresolved" | "narrowed" | "resolved";
  chosenBranch?: string;
  rejectedBranches?: string[];
  rationale: string;
}
```

### Example
当用户说：
- “不要太碎太花”

模型应能给出类似：

```ts
{
  familyId: "patternIntent:complexity-vs-geometry",
  status: "resolved",
  chosenBranch: "complexity-low",
  rejectedBranches: ["geometry-strong"],
  rationale: "用户明确排斥碎与花的复杂度方向，没有强化几何表达。"
}
```

这层很重要，因为它让高阶语义映射能直接写回多轮状态机。

---

## 11. Layer 6 — confidence summary

### 产品意义
这层不直接给用户看，
而是给 agent 判断：
- 什么时候够了
- 什么时候出图
- 什么时候确认
- 什么时候某槽位进入 lock-candidate

```ts
interface ConfidenceSummary {
  macroSlotCoverage: {
    impression: number;
    color: number;
    patternIntent: number;
    arrangement: number;
    space: number;
    presence: number;
  };
  baseReadySlots: string[];
  lockCandidateSlots: string[];
  missingCriticalSlots: string[];
  readyForFirstBatch: boolean;
}
```

### 关键原则
不要只靠单一 `> 0.5`。
更合理的是：
- `> 0.5` 作为 base-ready 的参考
- 还要看是否领先第二候选
- 是否有多源证据支持

---

## 12. 模型输出和 agent 决策的边界

### 模型可以输出
- hypotheses
- opportunities
- hints
- readiness clues

### 模型不应直接决定
- 现在就锁定
- 现在就结束 intake
- 现在就出图
- 忽略哪一类反馈

也就是说：

> 模型负责 semantic interpretation；
> agent 负责 state transition and decision control。

---

## 13. 最小可用版（MVP）

如果不想一开始就上完整 schema，可以先落一版精简版：

```ts
interface IntentSemanticMappingV1 {
  rawCues: string[];
  dominantEntryPoint: "space" | "mood" | "pattern-intent" | "color" | "presence";
  macroSlots: {
    impression?: { top: string; score: number; evidence: string[] };
    color?: { top: string; score: number; evidence: string[] };
    patternIntent?: {
      subject?: string;
      rendering?: string;
      abstraction?: string;
      score: number;
      evidence: string[];
    };
    arrangement?: { top: string; score: number; evidence: string[] };
    space?: { top: string; score: number; evidence: string[] };
    presence?: { top: string; score: number; evidence: string[] };
  };
  openQuestions: Array<{
    slot: string;
    subslot?: string;
    reason: string;
    suggestedAngle: string;
  }>;
  resolutionHints: ResolutionHint[];
  readyForFirstBatch: boolean;
}
```

这版已经足够比现有粗结构提升很多，
也足够作为接 DeepSeek-V3 的第一版承接层。

---

## 14. 建议的 TypeScript 类型草案

下面给一版适合直接落进代码里的类型定义草案。

```ts
export interface IntentSemanticMapping {
  rawCues: RawCue[];
  interpretedIntent: InterpretedIntent;
  slotHypotheses: SlotHypothesisBundle;
  questionOpportunities: QuestionOpportunity[];
  resolutionHints: ResolutionHint[];
  confidenceSummary: ConfidenceSummary;
}

export interface RawCue {
  text: string;
  cueType:
    | "explicit"
    | "metaphoric"
    | "comparative"
    | "negative-boundary"
    | "spatial"
    | "visual-weight";
  strength: number;
}

export interface MetaphorNote {
  sourceCue: string;
  interpretedAs: string[];
  uncertaintyNote?: string;
}

export interface InterpretedIntent {
  dominantEntryPoint:
    | "space"
    | "mood"
    | "pattern-intent"
    | "color"
    | "presence";
  summary: string;
  designReading: string[];
  metaphorNotes: MetaphorNote[];
}

export interface SlotHypothesisBundle {
  impression?: ImpressionHypothesis;
  color?: ColorHypothesis;
  patternIntent?: PatternIntentHypothesis;
  arrangement?: ArrangementHypothesis;
  space?: SpaceHypothesis;
  presence?: PresenceHypothesis;
}

export interface ImpressionHypothesis {
  topDirections: Array<{
    label: "calm" | "warm" | "soft" | "presence" | "restrained";
    score: number;
    evidence: string[];
  }>;
  openQuestions: string[];
}

export interface ColorHypothesis {
  warmth?: {
    top: "warm" | "neutral" | "cool";
    score: number;
  };
  saturation?: {
    top: "muted" | "visible" | "vivid";
    score: number;
  };
  role?: {
    top: "atmospheric" | "noticeable";
    score: number;
  };
  evidence: string[];
  openQuestions: string[];
}

export interface PatternIntentHypothesis {
  subject?: {
    candidates: Array<{
      label: string;
      score: number;
      evidence: string[];
    }>;
  };
  rendering?: {
    top:
      | "literal"
      | "softened-figurative"
      | "semi-abstract"
      | "suggestive"
      | "texture-like";
    score: number;
  };
  abstractionPreference?: {
    top: "concrete" | "semi-abstract" | "abstract";
    score: number;
  };
  compositionFeeling?: {
    tags: string[];
    score: number;
  };
  complexity?: {
    top: "low" | "medium" | "high";
    score: number;
  };
  geometryVsOrganic?: {
    top: "organic" | "balanced" | "geometric";
    score: number;
  };
  evidence: string[];
  openQuestions: string[];
}

export interface ArrangementHypothesis {
  density?: {
    top: "open" | "balanced" | "dense";
    score: number;
  };
  order?: {
    top: "free" | "balanced" | "ordered";
    score: number;
  };
  evidence: string[];
  openQuestions: string[];
}

export interface SpaceHypothesis {
  roomType?: {
    top: "bedroom" | "living-room" | "study" | "office" | "other";
    score: number;
  };
  usageMode?: {
    tags: string[];
    score: number;
  };
  evidence: string[];
}

export interface PresenceHypothesis {
  blendingMode?: {
    top: "blended" | "softly-noticeable" | "focal";
    score: number;
  };
  visualWeight?: {
    top: "light" | "medium" | "strong";
    score: number;
  };
  evidence: string[];
  openQuestions: string[];
}

export interface QuestionOpportunity {
  targetMacroSlot:
    | "impression"
    | "color"
    | "patternIntent"
    | "arrangement"
    | "space"
    | "presence";
  targetSubslot: string;
  questionGoal:
    | "disambiguate"
    | "narrow-branch"
    | "confirm-base-direction"
    | "collect-missing-slot";
  expectedGain: number;
  suggestedUserFacingAngle: string;
  basedOnEvidence: string[];
}

export interface ResolutionHint {
  familyId: string;
  status: "unresolved" | "narrowed" | "resolved";
  chosenBranch?: string;
  rejectedBranches?: string[];
  rationale: string;
}

export interface ConfidenceSummary {
  macroSlotCoverage: {
    impression: number;
    color: number;
    patternIntent: number;
    arrangement: number;
    space: number;
    presence: number;
  };
  baseReadySlots: string[];
  lockCandidateSlots: string[];
  missingCriticalSlots: string[];
  readyForFirstBatch: boolean;
}
```

---

## 15. 一句话总结

这套 schema 的核心不是“让模型多吐一些字段”，而是：

> 让你的项目第一次拥有一层足够高分辨率的内部语义结构，能够真正承接高阶语义映射、支持多轮 resolution、服务 intake goal，并为未来图文双决策链提供统一的语义状态底座。
