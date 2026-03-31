# Fuli Slot Question Spec and Information Gain Map v0.1

## 1. Why this document exists

当前 Fuli 已经逐步建立了：
- text entry
- high-value field hits
- prototype interpretation
- deterministic merge
- state patch reducer
- semantic understanding
- semantic gap planning
- question planning

但还有一个关键问题必须单独钉住：

**agent 到底该怎么问，才能真的补到槽位需要的值。**

如果这一层不说清楚，系统很容易滑成两种坏状态：

1. 问题自然，但不补真正缺失的信息；
2. 问题看似对着参数问，但把内部设计语言直接甩给用户。

因此，这份文档的目的不是收集问题话术，
而是定义：

- 当前有哪些高价值槽位；
- 它们分别映射到哪些底层参数；
- 每个槽位真正需要什么类型的信息；
- question planning 应该如何围绕这些信息缺口提问；
- 什么样的问题算“切中槽位”，什么样的问题只是看起来合理。

---

## 2. Core conclusion

要保证 agent 问的问题切中槽位，关键不是让它“更会聊天”，
而是让每一轮问题都满足这条链：

```text
current semantic gap
-> target field / slot / axes
-> required discriminative information
-> question type
-> generated question
```

也就是说，问题不应从语言表面长出来，
而应从：

**当前缺失的槽位信息需求**

里长出来。

因此，一个好的问题必须至少绑定：
- target field
- target slot
- target axes（可选）
- question intent
- expected information gain

如果没有这几个对象，问题即使听起来顺，也可能在机制上是空的。

---

## 3. Two-layer slot structure

Fuli 当前实际有两层“槽位”。

### 3.1 High-value entry fields

这是对话阶段先收的高价值入口槽位：
- `overallImpression`
- `colorMood`
- `patternTendency`
- `arrangementTendency`
- `spaceContext`

这些不是最终参数本身，
而是当前对话里最值得先确定的入口对象。

### 3.2 Simulator-facing state slots

这是最终进入 simulator / state patch 的底层状态槽位：

#### color
- warmth
- saturation

#### motif
- complexity
- geometry
- organic

#### arrangement
- order
- spacing

#### impression
- calm
- energy
- softness

问题不能直接面向这组底层轴来问，
否则用户会被迫说设计语言。

因此，高层 field 的作用就是：
- 用用户自然表达承接对话
- 再逐步映射到底层 state slots

---

## 4. Mapping from high-value fields to state slots

### 4.1 overallImpression

主要影响：
- `impression.calm`
- `impression.energy`
- `impression.softness`

它需要回答的问题通常是：
- 更安静还是更有存在感
- 更柔和还是更利落
- 更低刺激还是更张扬

因此它不是一个单轴问题，
而是一个主氛围方向问题。

### 4.2 colorMood

主要影响：
- `color.warmth`
- `color.saturation`

它需要回答的问题通常是：
- 偏暖还是偏冷
- 更收还是更跳
- 自然克制还是更显眼

### 4.3 patternTendency

主要影响：
- `motif.complexity`
- `motif.geometry`
- `motif.organic`

它需要回答的问题通常是：
- 图案复杂度
- 几何感
- organic 感

### 4.4 arrangementTendency

主要影响：
- `arrangement.order`
- `arrangement.spacing`

它需要回答的问题通常是：
- 更整齐有秩序
- 更松、更有呼吸感

### 4.5 spaceContext

它更像上下文 anchor，
不主要直接生成 aesthetic patch，
而是提供：
- context prior
- weak bias
- usage framing

它需要回答的问题通常是：
- 服务哪个空间
- 优先解决哪个空间问题
- 是安定气氛还是提存在感

---

## 5. What each field actually needs from the user

这一节的关键不是“能问什么”，
而是：

**问完之后，系统期望得到什么判别信息。**

### 5.1 overallImpression

#### Required information
- 主氛围方向
- calm vs energy 的偏向
- softness 是主目标还是次级修饰

#### Good questions
- 你更希望它先安静下来，还是更有一点存在感？
- 你说的柔和，更像是更松弛，还是只是不要太硬？
- 你想避免的是太刺激，还是想更明确地往安静那边走？

#### Bad questions
- 你喜欢 calm 还是 energy？
- softness 要不要提高？

这些问题虽然直指参数，但直接把内部设计语言甩给用户了。

### 5.2 colorMood

#### Required information
- warmth 方向
- saturation restraint 程度
- 色彩存在感是否是主问题

#### Good questions
- 颜色上你更想往温一点、自然一点走，还是先把颜色收得更克制？
- 你更在意颜色别太跳，还是整体暖一点更重要？

#### Bad questions
- warmth 要不要更高？
- saturation 要不要降一点？

### 5.3 patternTendency

#### Required information
- complexity 是否要降低
- geometry 是否要回避
- organic 是否是你说“自然”的核心含义

#### Good questions
- 你更想先避免图案太碎，还是先少一点硬几何感？
- 你说的自然一点，更像是图案更 organic，还是只是别太规整？

#### Bad questions
- 复杂度要不要降低？
- geometry 要不要减一点？

### 5.4 arrangementTendency

#### Required information
- order vs openness
- spacing 是不是主感受来源
- 呼吸感是空间感还是情绪感

#### Good questions
- 排布上你更想更松一点、有呼吸感，还是更整齐一点？
- 你更在意透气感，还是规整感？

#### Bad questions
- spacing 要加吗？
- order 要提高吗？

### 5.5 spaceContext

#### Required information
- 主要服务场景
- 场景中的优先目标
- aesthetic choice 是否受使用场景强约束

#### Good questions
- 这块地毯现在主要还是想服务哪个空间场景？
- 这个空间里，你更希望它安定气氛，还是提一点存在感？

#### Bad questions
- roomType 是什么？

---

## 6. SlotQuestionSpec

为了让 question planning 真正对齐槽位需求，
建议为每个高价值 field 定义一个 `SlotQuestionSpec`。

```ts
type SlotQuestionSpec = {
  field: HighValueField;
  targetSlot: EntryAgentSlotKey | "context";
  targetAxes?: string[];
  questionKinds: Array<"contrast" | "clarify" | "anchor" | "strength">;
  expectedAnswerShape: string[];
  informationGainTargets: string[];
  examplePatterns: string[];
};
```

这个对象的意义不是给前端直接渲染，
而是给 question planner 一个“这个槽位到底需要什么信息”的约束表。

---

## 7. Suggested SlotQuestionSpec examples

### 7.1 overallImpression

```ts
{
  field: "overallImpression",
  targetSlot: "impression",
  targetAxes: ["calm", "energy", "softness"],
  questionKinds: ["contrast", "clarify", "strength"],
  expectedAnswerShape: [
    "quiet vs presence",
    "soft vs crisp",
    "lower stimulation vs more expressive"
  ],
  informationGainTargets: [
    "main atmosphere direction",
    "impression axis disambiguation",
    "softness as primary or secondary"
  ],
  examplePatterns: [
    "你更希望它先安静下来，还是更有一点存在感？",
    "你说的柔和，更像是更松弛，还是只是不要太硬？"
  ]
}
```

### 7.2 colorMood

```ts
{
  field: "colorMood",
  targetSlot: "color",
  targetAxes: ["warmth", "saturation"],
  questionKinds: ["contrast", "anchor", "strength"],
  expectedAnswerShape: [
    "warmer vs cooler",
    "restrained vs more noticeable",
    "natural vs vivid"
  ],
  informationGainTargets: [
    "warmth direction",
    "saturation restraint",
    "color presence priority"
  ],
  examplePatterns: [
    "颜色上你更想往温一点、自然一点走，还是先把颜色收得更克制？",
    "你更在意颜色别太跳，还是整体暖一点更重要？"
  ]
}
```

### 7.3 patternTendency

```ts
{
  field: "patternTendency",
  targetSlot: "motif",
  targetAxes: ["complexity", "geometry", "organic"],
  questionKinds: ["contrast", "clarify", "anchor"],
  expectedAnswerShape: [
    "busy vs restrained pattern",
    "geometric vs organic",
    "less fragmented vs less rigid"
  ],
  informationGainTargets: [
    "motif complexity reduction",
    "geometry avoidance",
    "organic interpretation of naturalness"
  ],
  examplePatterns: [
    "你更想先避免图案太碎，还是先少一点硬几何感？",
    "你说的自然一点，更像是图案更 organic，还是只是别太规整？"
  ]
}
```

### 7.4 arrangementTendency

```ts
{
  field: "arrangementTendency",
  targetSlot: "arrangement",
  targetAxes: ["order", "spacing"],
  questionKinds: ["contrast", "clarify", "anchor"],
  expectedAnswerShape: [
    "order vs openness",
    "breathability vs regularity"
  ],
  informationGainTargets: [
    "spacing preference",
    "order preference",
    "breathability interpretation"
  ],
  examplePatterns: [
    "排布上你更想更松一点、有呼吸感，还是更整齐一点？",
    "你更在意透气感，还是规整感？"
  ]
}
```

### 7.5 spaceContext

```ts
{
  field: "spaceContext",
  targetSlot: "context",
  questionKinds: ["anchor", "clarify"],
  expectedAnswerShape: [
    "room / scene",
    "primary usage need",
    "stabilize vs accent"
  ],
  informationGainTargets: [
    "context prior",
    "space-specific weak bias",
    "functional constraint"
  ],
  examplePatterns: [
    "这块地毯现在主要还是想服务哪个空间场景？",
    "这个空间里，你更希望它安定气氛，还是提一点存在感？"
  ]
}
```

---

## 8. How question planning should use this map

question planner 的正确流程不应是：
- 先有一句想问的话
- 再去找它对应哪个 field

而应是：

### Step 1
先确定当前最高优先级的 `SemanticGap`

### Step 2
把 gap 映射到：
- target field
- target slot
- target axes

### Step 3
查对应 `SlotQuestionSpec`

### Step 4
按 gap 类型选择问题形式：
- `prototype-conflict` -> contrast question
- `unresolved-ambiguity` -> clarify question
- `missing-slot` -> anchor question
- `weak-anchor` -> strength question

### Step 5
生成问题文本，并附带 expected information gain

因此，问题的来源不是“语言模板池”，
而是：

**slot need + gap type + information gain target**

---

## 9. What guarantees a question is actually useful

一个问题要算“切中槽位”，至少应满足：

### 9.1 It is tied to a concrete target
它必须绑定：
- targetField
- targetSlot
- optional targetAxes

### 9.2 It resolves a real gap
它必须对应当前某个真实 semantic gap，
而不是问一个看似合理、实际上不补信息的话。

### 9.3 It has expected information gain
它必须能说明：
- 问完这句后，系统期待缩小哪种不确定性；
- 是要裁决 conflict，还是补 missing slot，还是压窄 ambiguity。

### 9.4 It does not expose internal parameter language directly
它不能把内部轴值直接甩给用户。

这意味着：
- `calm vs energy` 可以转成“安静 vs 存在感”
- `geometry vs organic` 可以转成“硬几何 vs 自然生长感”

而不是直接使用内部术语。

---

## 10. Current recommendation for first implementation

第一版 question planning 不需要一次支持所有问题形式。

更合理的实现顺序是：

### Phase 1
先支持：
- `overallImpression`
- `patternTendency`
- `colorMood`

因为它们最常决定首轮探索质量。

### Phase 2
再补：
- `arrangementTendency`
- `spaceContext`

### Phase 3
再把 `weak-anchor` 等更细粒度 gap 类型接进问题生成。

---

## 11. Current design conclusion

要让 Fuli 的 agent 真正“问到点上”，
关键不是让它更像聊天助手，
而是让它每句提问都绑定：

- 当前最关键的 semantic gap
- 对应的高价值 field
- 对应的 state slot / axes
- 对应的 expected information gain

也就是说，问题的根源不在语言表面，
而在：

**当前系统到底还缺哪一种可判别的信息。**

这也是为什么 question planning 必须建立在 slot-question-spec 与 information-gain map 之上，
而不能只是从字段名或模板池里直接挑一句看起来像问题的话。
