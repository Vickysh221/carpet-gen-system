# Visual Intent Test Bundle Spec

Date: 2026-04-02

## 1. Purpose

这份文档定义的是：

> **给 simulator / 生图测试页面使用的 Visual Intent Test Bundle**

它不是给用户看的，也不是给前台顾问回复层用的。

它服务的是：
- 你自己测试生图功能
- 开发阶段对 prompt / semantic state 的调试
- 数值闭环模拟页面里的状态观察与 prompt 迭代

所以它的第一优先级不是“像人话”，而是：
- 可控
- 可比
- 可复现
- 可调试
- 可调参

---

## 2. What it is NOT

它不是：
- 用户可见文案
- 顾问式回复
- 只输出一条自然语言 prompt

它也不应该为了“像设计师在说话”而牺牲结构清晰度。

---

## 3. Core output principle

Test Bundle 必须同时提供五种能力：

1. **看到系统当前理解成什么**
2. **看到实际喂给图像生成器的 prompt 是什么**
3. **看到 negative prompt / anti-bias 是什么**
4. **看到当前最可能出错的风险点**
5. **看到下一步怎么调更有方向**

所以它不是单条 prompt，而是一整包测试材料。

---

## 4. Recommended output shape

```ts
export interface VisualIntentTestBundle {
  testLabel: string;
  summary: string;
  semanticSpec: GenerationSemanticSpec;
  prompt: string;
  negativePrompt: string;
  risks: VisualIntentRisk[];
  tuningSuggestions: TuningSuggestions;
  confidenceState: ConfidenceState;
  unresolvedQuestions: string[];
  trace?: TraceBundle;
}
```

---

## 5. Field definitions

## 5.1 testLabel

用于测试页归档、比较、版本记录。

要求：
- 简短
- 可辨认
- 尽量体现核心方向

例：
- `quiet-natural-misty-flow_v1`
- `moonwhite-lamplight-softaccent_v1`
- `bamboo-shadow-sparse-rhythm_v2`

---

## 5.2 summary

给测试者快速看的“一句话意向摘要”。

要求：
- 不是用户文案
- 是工程/设计可读摘要
- 尽量包含 base direction + pattern + presence

例：
> Quiet natural direction with mist-softened terrain flow and blended low-weight presence.

---

## 5.3 semanticSpec

这是核心。必须是结构化输出。

```ts
export interface GenerationSemanticSpec {
  baseMood?: string[];
  palette?: {
    temperature?: string;
    saturation?: string;
    brightness?: string;
    contrast?: string;
    haze?: string;
    base?: string | null;
    accent?: string | null;
    relation?: "base-only" | "base-plus-accent" | "dual-tone";
  };
  atmosphere?: string[];
  pattern?: {
    abstraction?: string;
    density?: string;
    scale?: string;
    structuralPattern?: string[];
    atmosphericPattern?: string[];
    motion?: string;
    edgeDefinition?: string;
    motifBehavior?: string;
    keyElements?: string[];
  };
  presence?: {
    blending?: string;
    focalness?: string;
    visualWeight?: string;
    behavior?: string;
  };
  arrangement?: {
    spread?: string;
    directionalFlow?: string;
    rhythm?: string;
    symmetry?: string;
    orderliness?: string;
  };
  materiality?: {
    surfaceFeel?: string[];
    textureBias?: string[];
  };
  constraints?: {
    avoidMotifs?: string[];
    avoidStyles?: string[];
    avoidPalette?: string[];
    avoidComposition?: string[];
    keepQualities?: string[];
  };
}
```

要求：
- 这是最重要的 debug 面
- prompt 只是它的压缩表达
- 测试时先看 semanticSpec 对不对，再看 prompt 对不对

---

## 5.4 prompt

给图像生成器的主 prompt。

要求：
- 压缩 semanticSpec
- 先整体，再 pattern，再 presence，再 composition，再 constraints
- 偏可生成，不偏文学
- 不把 poetic term 原词直接塞进 prompt，优先转成感知结果

模板：
> [design type], [overall atmosphere], [palette], [pattern organization], [presence], [composition], [constraints]

例：
> Abstract carpet design, quiet natural atmosphere, cool-neutral low-saturation palette, mist-softened terrain-like flowing lines, gentle directional movement, sparse breathable composition, soft transitions, blended presence, low visual weight, non-literal, non-floral, low contrast.

---

## 5.5 negativePrompt

用于抑制误生成。

要求：
- 明确写出最可能的偏移方向
- 尽量和当前 poetic term 的 anti-bias 对齐

例：
> No literal mountains, no scenic illustration, no floral ornament, no dense decoration, no sharp geometry, no glossy luxury finish, no high-saturation blue.

---

## 5.6 risks

这是 test bundle 相比普通 compiler 最重要的新增之一。

```ts
export interface VisualIntentRisk {
  type:
    | "too-literal"
    | "too-flat"
    | "too-decorative"
    | "too-loud"
    | "too-cold"
    | "too-luxury"
    | "pattern-collapse"
    | "accent-loss"
    | "presence-loss";
  description: string;
  severity: "low" | "medium" | "high";
}
```

例：
```json
[
  {
    "type": "too-literal",
    "description": "May turn into literal mountain / mist landscape imagery instead of abstract terrain flow.",
    "severity": "high"
  },
  {
    "type": "pattern-collapse",
    "description": "Directional flow may collapse into generic soft haze if structural pattern is not strong enough.",
    "severity": "medium"
  }
]
```

---

## 5.7 tuningSuggestions

这是给模拟页面非常关键的字段。

```ts
export interface TuningSuggestions {
  ifTooFlat?: string[];
  ifTooLiteral?: string[];
  ifTooDecorative?: string[];
  ifTooLoud?: string[];
  ifPresenceTooWeak?: string[];
  ifAccentLost?: string[];
}
```

例：
```json
{
  "ifTooFlat": [
    "increase focalness slightly",
    "add subtle local lift",
    "raise structure clarity"
  ],
  "ifTooLiteral": [
    "increase abstraction",
    "remove scenic cues",
    "reduce motif explicitness"
  ],
  "ifAccentLost": [
    "strengthen accent relation",
    "increase local warmth slightly",
    "preserve base-accent contrast"
  ]
}
```

目的不是让系统自动调参，而是让测试者知道：
- 这轮图如果跑偏，下一步往哪里拨

---

## 5.8 confidenceState

```ts
export interface ConfidenceState {
  mode: "exploratory" | "preview" | "committed";
  overallConfidence: number;
  slotConfidence: Record<string, number>;
  stableSlots: string[];
  tentativeSlots: string[];
  missingSlots: string[];
}
```

测试时很重要，因为你需要知道：
- 这条 prompt 是建立在稳定意向上，还是只是半猜

---

## 5.9 unresolvedQuestions

用于显示当前还没收稳的分叉。

例：
- more misty or more directional flow?
- more blended or slightly noticeable?
- looser spread or more ordered rhythm?

---

## 5.10 trace

```ts
export interface TraceBundle {
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

trace 是为了：
- 看这个 prompt 为什么会长成这样
- 方便你在 simulator 里做可解释调试

---

## 6. Preview UI recommendation

既然这是 simulator 页面，建议前台分成几个区块，而不是只展示一长串 prompt。

## 6.1 Current intent
展示：
- summary
- baseMood
- palette
- pattern
- presence

## 6.2 Prompt package
展示：
- prompt
- negativePrompt

## 6.3 Risks
展示：
- 当前最可能误生成的方向

## 6.4 Tuning knobs / suggestions
展示：
- 如果图太平 / 太像风景 / 太花 / 太没存在感，下一步怎么拨

## 6.5 Confidence / unresolved
展示：
- 现在是 preview 还是 committed
- 还有哪些分叉没问清

---

## 7. Two operating modes

## 7.1 Preview bundle
用于：
- 中途测试
- 边收敛边出低保真图

特点：
- unresolvedQuestions 允许存在
- risks 更重要
- tuningSuggestions 更重要
- prompt 可带一点弹性

## 7.2 Committed bundle
用于：
- 方向比较稳后
- 正式出图或对外展示前

特点：
- stableSlots 应更多
- unresolvedQuestions 应更少
- prompt 更短、更强
- risks 更集中在微调而不是大偏差

---

## 8. Example bundles

## 8.1 Example A
### Direction
- 自然
- 烟雨三月
- 水汽流动感

```json
{
  "testLabel": "quiet-natural-misty-flow_v1",
  "summary": "Quiet natural direction with mist-softened terrain flow and blended low-weight presence.",
  "semanticSpec": {
    "baseMood": ["quiet", "natural", "restrained"],
    "palette": {
      "temperature": "cool-neutral",
      "saturation": "low",
      "contrast": "soft",
      "haze": "medium-high",
      "base": "muted blue-gray",
      "accent": null,
      "relation": "base-only"
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
  },
  "prompt": "Abstract carpet design, quiet natural atmosphere, cool-neutral low-saturation palette, mist-softened terrain-like flowing lines, gentle directional movement, sparse breathable composition, soft transitions, blended presence, low visual weight, non-literal, non-floral, low contrast.",
  "negativePrompt": "No literal mountains, no scenic illustration, no floral ornament, no dense decoration, no sharp geometry, no glossy luxury finish, no high-saturation blue.",
  "risks": [
    {
      "type": "too-literal",
      "description": "May become literal mountain / mist landscape imagery.",
      "severity": "high"
    },
    {
      "type": "pattern-collapse",
      "description": "Directional flow may collapse into generic haze if structure is too weak.",
      "severity": "medium"
    }
  ],
  "tuningSuggestions": {
    "ifTooLiteral": ["increase abstraction", "remove scenic cues", "reduce motif explicitness"],
    "ifTooFlat": ["raise structure clarity", "slightly increase directional flow", "add subtle local lift"]
  },
  "confidenceState": {
    "mode": "preview",
    "overallConfidence": 0.77,
    "slotConfidence": {
      "color": 0.78,
      "pattern": 0.81,
      "presence": 0.73,
      "arrangement": 0.58
    },
    "stableSlots": ["color", "pattern", "presence"],
    "tentativeSlots": ["arrangement"],
    "missingSlots": []
  },
  "unresolvedQuestions": ["more misty or more directional flow?", "looser spread or more ordered rhythm?"]
}
```

---

## 8.2 Example B
### Direction
- 月白
- 带一点灯火
- 不要太亮

```json
{
  "testLabel": "moonwhite-lamplight-softaccent_v1",
  "summary": "Pale restrained base with a softly embedded warm light accent.",
  "semanticSpec": {
    "baseMood": ["restrained", "light", "intimate"],
    "palette": {
      "temperature": "cool-light-neutral",
      "saturation": "low",
      "contrast": "soft",
      "base": "off-white",
      "accent": "soft amber",
      "relation": "base-plus-accent"
    },
    "pattern": {
      "abstraction": "abstract",
      "density": "low",
      "structuralPattern": ["light-trace"],
      "atmosphericPattern": [],
      "motion": "gentle-flow",
      "edgeDefinition": "soft",
      "motifBehavior": "suggestive"
    },
    "presence": {
      "blending": "softly-noticeable",
      "focalness": "medium-low",
      "visualWeight": "light",
      "behavior": "local-lift"
    },
    "constraints": {
      "avoidStyles": ["hotel luxury", "glossy gold"],
      "avoidPalette": ["bright gold"],
      "keepQualities": ["soft warmth", "embedded accent"]
    }
  },
  "prompt": "Abstract carpet design, pale low-saturation base, cool-light neutral palette with a softly embedded warm accent, restrained intimate atmosphere, sparse composition, soft edges, blended overall presence with slight local warmth, not bright, not glossy, not hotel-luxury.",
  "negativePrompt": "No bright gold, no glossy finish, no hotel-luxury styling, no strong focal highlight, no heavy contrast, no ornate decorative motifs.",
  "risks": [
    {
      "type": "accent-loss",
      "description": "The warm accent may disappear entirely if the base dominates too strongly.",
      "severity": "medium"
    },
    {
      "type": "too-luxury",
      "description": "The lamplight accent may drift into glossy hotel-style gold.",
      "severity": "high"
    }
  ],
  "tuningSuggestions": {
    "ifAccentLost": ["slightly increase local warmth", "preserve base-accent relation", "raise focalness a little"],
    "ifTooLuxury": ["reduce gloss cues", "lower gold intensity", "keep accent embedded rather than focal"]
  },
  "confidenceState": {
    "mode": "preview",
    "overallConfidence": 0.74,
    "slotConfidence": {
      "color": 0.75,
      "pattern": 0.62,
      "presence": 0.71
    },
    "stableSlots": ["color", "presence"],
    "tentativeSlots": ["pattern"],
    "missingSlots": ["arrangement"]
  },
  "unresolvedQuestions": ["more blended or slightly more noticeable?", "accent spread or local accent?"]
}
```

---

## 8.3 Example C
### Direction
- 不要太花
- 像竹影
- 想被看见一点

```json
{
  "testLabel": "bamboo-shadow-sparse-rhythm_v2",
  "summary": "Restrained sparse direction with linear rhythmic structure and slightly lifted presence.",
  "semanticSpec": {
    "baseMood": ["quiet", "restrained", "disciplined"],
    "palette": {
      "temperature": "cool-neutral",
      "saturation": "low",
      "contrast": "soft",
      "base": "muted green-gray",
      "accent": null,
      "relation": "base-only"
    },
    "pattern": {
      "abstraction": "semi-abstract",
      "density": "low",
      "structuralPattern": ["linear rhythm"],
      "atmosphericPattern": [],
      "motion": "gentle-flow",
      "edgeDefinition": "soft",
      "motifBehavior": "suggestive",
      "keyElements": ["botanical shadow"]
    },
    "presence": {
      "blending": "softly-noticeable",
      "focalness": "medium-low",
      "visualWeight": "medium-light",
      "behavior": "distributed-presence"
    },
    "arrangement": {
      "spread": "open",
      "directionalFlow": "medium",
      "rhythm": "linear",
      "orderliness": "soft-order"
    },
    "constraints": {
      "avoidMotifs": ["literal bamboo leaves", "floral ornament"],
      "avoidComposition": ["dense decoration"],
      "keepQualities": ["sparse", "rhythmic", "legible but restrained"]
    }
  },
  "prompt": "Abstract carpet design, restrained quiet atmosphere, muted cool-neutral palette, sparse linear rhythmic structure with a subtle bamboo-shadow feeling, soft but legible edges, lightly lifted presence, open composition, non-literal, non-floral, not dense, not ornate.",
  "negativePrompt": "No literal bamboo leaves, no floral decoration, no dense ornament, no childish patterning, no overly explicit botanical illustration.",
  "risks": [
    {
      "type": "too-literal",
      "description": "May become literal bamboo motif instead of abstract shadow rhythm.",
      "severity": "high"
    },
    {
      "type": "presence-loss",
      "description": "The pattern may become too faint and lose the intended slight visibility.",
      "severity": "medium"
    }
  ],
  "tuningSuggestions": {
    "ifTooLiteral": ["reduce botanical explicitness", "increase abstraction", "treat bamboo as shadow/rhythm instead of motif"],
    "ifPresenceTooWeak": ["increase line clarity slightly", "raise focalness a little", "strengthen rhythmic contrast without adding density"]
  },
  "confidenceState": {
    "mode": "preview",
    "overallConfidence": 0.79,
    "slotConfidence": {
      "pattern": 0.83,
      "presence": 0.69,
      "color": 0.62,
      "arrangement": 0.66
    },
    "stableSlots": ["pattern"],
    "tentativeSlots": ["presence", "color", "arrangement"],
    "missingSlots": []
  },
  "unresolvedQuestions": ["more blended or slightly more legible?", "looser spread or more ordered rhythm?"]
}
```

---

## 9. Implementation recommendation

建议实现为一个与用户回复层分离的模块：

- `src/features/entryAgent/visualIntentTestBundle.ts`
- `src/features/entryAgent/types.visualIntent.ts`

如果已经实现了 `visualIntentCompiler.ts`，那 test bundle 可以在 compiler 之后做一层包装：

```ts
CanonicalIntentState
  -> CompiledVisualIntentPackage
  -> VisualIntentTestBundle
```

也就是说：
- compiler 负责“编译正确”
- test bundle 负责“测试可用”

---

## 10. Final standard

一个好的 Visual Intent Test Bundle，不只是给你一句 prompt，
而是让你在 simulator 页面里一眼看到：

1. **系统现在把这张图理解成什么**
2. **实际喂给生图模型的是什么**
3. **最可能跑偏到哪里**
4. **如果跑偏，下一步应该往哪边调**

如果做不到这四点，那它还只是 prompt 输出，不是测试用 bundle。
