# Intent Intake Agent — Signal Schema v1

Date: 2026-04-01

## 1. Purpose

这份文档定义 `Intent Intake Agent` 的第一版 signal schema。

它的目标是把：
- 文本输入
- 图片选择 / 排斥
- 图片比较
- 用户确认

统一成一套 agent 可消费的输入事件模型，
从而为后续的 **图文双决策链** 提供一致的状态更新接口。

这份文档承接：
- `intent-intake-agent-slot-system-v1-2026-04-01.md`
- `intent-intake-agent-dialogue-state-machine-v1-2026-04-01.md`

---

## 2. Why signal schema is necessary

如果没有统一 signal schema，系统很容易变成两套并行逻辑：

- 文本链：负责问问题、解析用户说法
- 图片链：负责记录 like/dislike、做排序

这会导致：
- 两条链路的状态不一致
- 文本和图片互相打架时没有统一仲裁点
- 某些槽位在文本侧稳定了，但图像侧又重新漂移
- agent 无法真正拥有一个统一的“意向状态”

因此：

> 后续系统必须不是 text-first + image-sidecar，
> 而是 signal-first 的统一 intake agent。

---

## 3. Design principles

### 3.1 Modality-agnostic state update
状态更新逻辑不能只服务文本。
它必须能够接收不同模态的 signal，并更新同一份 preference state。

### 3.2 Not all signals are equal
不同 signal 的权重与含义不同：
- 用户明确文本表达
- 用户喜欢某张图
- 用户在 A / B 中选 A
- 用户确认“以后沿这个方向走”

它们不应该被简单视为同一种证据。

### 3.3 Signals update beliefs, not just logs
signal schema 不是记录日志用的。
它必须直接服务于：
- slot belief update
- resolution state update
- intake goal progress update
- phase transition decision

### 3.4 Signals must preserve interpretability
所有 signal 都应保留足够信息，便于 debug 和 explainability。

---

## 4. Signal families

第一版建议至少定义 4 大类 signal：

1. **Text signals**
2. **Image preference signals**
3. **Image comparison signals**
4. **Confirmation / control signals**

后续还可扩展：
- image attribute annotation signals
- system recommendation acceptance / rejection signals
- external context signals (room photo, reference board, etc.)

---

## 5. Text signals

### Role
承载用户语言中的：
- 显性偏好
- 抽象意象
- metaphor / imagery
- 对上一问的回答
- 对系统理解的纠正

### Suggested schema

```ts
interface TextIntakeSignal {
  type: "text";
  text: string;
  turnIndex: number;
  source: "user";
  replyToQuestionId?: string;
  replyToQuestionFamilyId?: string;
}
```

### Notes
`replyToQuestionFamilyId` 很重要。
它让系统能判断：
- 这不是普通新输入
- 而是在回答上一轮某个 question family

---

## 6. Image preference signals

### Role
承载用户对单张图的直接偏好态度。

### Suggested schema

```ts
interface ImagePreferenceSignal {
  type: "image-preference";
  action: "like" | "dislike" | "neutral-save";
  imageId: string;
  roundIndex: number;
  source: "user";
  note?: string;
}
```

### Semantics
- `like`: 强正向信号
- `dislike`: 强负向或排斥区间信号
- `neutral-save`: 用户未必最喜欢，但觉得“有点对”，可作为 softer evidence

### Important note
单张图片偏好不应直接等于某个槽位锁定。
它应通过 image annotation / variant delta / state comparison 映射回内部槽位。

---

## 7. Image comparison signals

### Role
在很多场景下，比起绝对喜欢，用户的 A/B 偏好更稳定。

### Suggested schema

```ts
interface ImageComparisonSignal {
  type: "image-compare";
  preferredImageId: string;
  rejectedImageId: string;
  roundIndex: number;
  source: "user";
  note?: string;
}
```

### Why this matters
A/B 比较通常能更清楚地告诉系统：
- 是哪个变化被喜欢
- 是哪条轴向的差异更重要

如果 image generation 或 retrieval pipeline 能记录每张图相对于 base state 改了哪些轴，
那么 comparison signal 的信息量通常高于单张 like/dislike。

---

## 8. Confirmation / control signals

### Role
承载用户对 agent 策略层的显式反馈。

这类 signal 与普通 preference signal 不同，它直接影响：
- soft lock
- exploration vs exploitation
- phase transition
- branch continuation

### Suggested schema

```ts
interface ConfirmationSignal {
  type: "confirm-direction" | "phase-control";
  slot?: string;
  familyId?: string;
  choice:
    | "continue-this-direction"
    | "explore-other-options"
    | "soft-lock"
    | "unlock"
    | "go-broader"
    | "go-finer";
  source: "user";
  note?: string;
}
```

### Example uses
- “对，就沿这个方向继续。”
- “先别锁，我还想看看别的。”
- “大的方向差不多了，接下来想看更细一点的变化。”

---

## 9. Optional future signal family: visual semantic note

未来如果用户对图片直接说：
- “这张太跳了”
- “这张像晨雾”
- “这张更像我要的自然感”

其实这是 text signal + image grounding 的混合体。

第一版可先并入普通 text signal。
后续可单独升级为：

```ts
interface VisualSemanticNoteSignal {
  type: "visual-semantic-note";
  imageId: string;
  text: string;
  source: "user";
}
```

---

## 10. Unified signal type

第一版建议统一成：

```ts
type IntakeSignal =
  | TextIntakeSignal
  | ImagePreferenceSignal
  | ImageComparisonSignal
  | ConfirmationSignal;
```

这是后续所有 agent 决策的统一入口。

---

## 11. Signal processing pipeline

每次接收到 signal 后，agent 不应直接跳到 UI 文案，
而应经过以下统一管线：

### Step 1 — normalize
把 signal 转成标准输入格式

### Step 2 — interpret
从 signal 中提取：
- affected macro slots
- possible sub-slot updates
- confidence delta
- resolution impact
- control intent

### Step 3 — update state
更新：
- semantic state
- resolution state
- intake goal state
- exploration / lock policy state

### Step 4 — decide next action
agent 选择：
- ask follow-up question
- generate first batch
- request confirmation
- switch phase

### Step 5 — render user-facing response
再由 persona renderer 输出：
- current understanding
- transition sentence
- next question / confirmation / recommendation

---

## 12. Signal-to-state mapping principles

### 12.1 Text signal
主要更新：
- semantic state
- resolution state
- macro slot progress

### 12.2 Image preference signal
主要更新：
- slot preference weight
- rejection boundary
- macro slot confidence

### 12.3 Image comparison signal
主要更新：
- pairwise preference evidence
- axis-level belief delta
- branch ranking inside one macro slot

### 12.4 Confirmation signal
主要更新：
- lock policy
- phase control
- exploration breadth

---

## 13. Cross-modal conflict handling

图文双决策链的关键不是把信号强行合并平均，
而是要有明确的冲突识别。

### Example
- 文本说：别太抢
- 选图却持续偏向更亮眼、更有存在感的图

系统应识别出：
- text-side belief
- image-side belief
- conflict detected

这时不应该偷偷决定谁更真，
而应触发一种 **cross-modal conflict confirmation**。

---

## 14. Suggested state hooks

为接 signal schema，建议后续系统显式维护以下状态：

### A. Semantic state
- 当前 macro slots / sub-slots 的 belief

### B. Resolution state
- 哪些 question families 已 narrowed / resolved

### C. Intake goal state
- 哪些 macro slots 已 base-captured
- 哪些仍缺失

### D. Control state
- 当前 phase
- exploration / exploitation 模式
- soft-locked slots

---

## 15. Explainability requirements

signal-first architecture 也必须可解释。
因此每次重要状态变化都应保留：
- which signal caused update
- which slots were affected
- what confidence delta was applied
- whether a family was resolved / conflicted
- whether goal progress changed

这会直接影响 future debug inspect。

---

## 16. What not to do

### Do not
- 把图片反馈单独放在另一套 preference 系统里
- 让 text side 和 image side 使用不同的 slot ontology
- 只记录 signal，不让它进入统一 state update
- 在用户界面直接暴露 signal schema 或内部 delta

### Do
- 统一事件入口
- 统一状态更新
- 统一 explainability
- 用户侧通过人格层自然表达

---

## 17. Immediate implementation consequence

既然 signal schema 已定义，
当前系统不应继续只依赖：
- `analyzeEntryText(text)`

后续应逐步升级为类似：

```ts
processIntakeSignal(signal, currentState)
```

文本只是 signal 的一种，而不是整个 agent 的唯一驱动源。

---

## 18. One-sentence summary

Signal Schema v1 的核心是：

> 让 Intent Intake Agent 从“处理文本输入的问答器”升级为“统一处理文本、图片选择、图像比较与用户确认的多模态 preference intake agent”。
