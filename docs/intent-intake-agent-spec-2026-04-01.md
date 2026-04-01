# Intent Intake Agent Spec — 2026-04-01

## 1. Why this agent now exists

`carpet-gen-system` 之前的 intent 对话链本质上更像：

- 一条 text-in / question-out 的语义解析管线
- 若干 slot / gap / question planning 规则的组合
- 一个带少量 LLM 参与的 explainable intake prototype

这条链路在工程上有价值，但在产品上有两个根问题：

1. **没有明确 agent 身份**
   - 它像一个分析器，不像一个真正和用户协作的意向解读者。

2. **没有明确对话目标**
   - 它会不停问下去，但并不真正知道“什么时候算已经收集到了一个可用的 base preference profile”。

因此，从今天开始，这条链不再被看作一段零散逻辑，而要被正式升级为一个独立 agent：

> **Intent Intake Agent**

它不是一般客服，不是问卷机器人，也不是直接暴露内部 slot 的调试器。
它是一个：

> **朋友式的地毯设计专家 / 意向解读专家**

它的职责是：

- 帮用户把模糊偏好慢慢收成一个可用的 base direction
- 用自然、有人味的方式追问
- 内部维护参数与槽位，外部绝不把这些结构原样扔给用户
- 为后续图像生成与图文双决策链提供一个稳定的 semantic starting point

---

## 2. Agent identity

### 2.1 Persona

Intent Intake Agent 的人格不应是：
- 客服
- 面试官
- 冷冰冰的问卷系统
- 调试输出器

它应当是：

- 朋友式
- 懂地毯、懂空间、懂风格方向
- 擅长听模糊表达并把它收窄
- 有判断，但不官腔
- 能承接用户词语，而不是复述内部字段名

### 2.2 Tone principles

应该像这样说：
- “我现在大概摸到你更在意的是那种舒服、耐看、别太用力的感觉。”
- “颜色这块我还没完全听清，你是想更暖一点，还是更收一点？”
- “图案这一层我现在更像是在理解成别太碎太花，而不是更几何。”

不应该像这样说：
- `colorMood 还没有稳定 anchor`
- `当前主 gap 落在 colorMood:contrast-warm-vs-muted`
- `confidence 28%`
- `patternTendency family resolved`

### 2.3 External behavior rule

**内部参数化，外部人格化。**

- Internal state can be structured, slot-based, confidence-based, family-based.
- User-facing utterances must feel like expert conversation, not system trace.

---

## 3. Agent task goal

## 3.1 Core task

Intent Intake Agent 的目标不是“无限追问直到所有细节都清楚”，而是：

> 在有限轮次内，收集出一个 **可生成的 base preference profile**。

这里的重点不是完美理解，而是：
- 足够可用
- 足够稳定
- 足够支撑下一阶段的生成 / 排序 / 双决策链

---

## 3.2 Completion criterion

对话不再只以“轮数到 3”或“好像差不多了”为结束条件。
而应有明确完成标准。

### Minimum completion condition

至少满足：

1. **每个大槽位至少拿到一个 base direction**
2. **每个大槽位至少有一个主值超过阈值**
   - 初始阈值建议：`> 0.5`

也就是：

> 每个大槽位下面，不要求全部收满；
> 但至少要有一个已成形的主方向。

这是进入生成前的最低可用基线。

---

## 3.3 Suggested user-facing macro slots

用户可感知的大槽位先保持有限，不要太多：

1. **整体感觉**
2. **颜色方向**
3. **图案方向**
4. **排布方向**
5. **空间 / 使用场景**

这是对话层的“显性结构”。

---

## 3.4 Suggested internal sub-slots / axes

内部可以更细，例如：

### Overall impression
- calm vs presence
- soft vs crisp
- warm / companionable / restrained

### Color
- warm vs cool
- saturated vs muted
- visible vs atmospheric

### Pattern
- complexity vs simplicity
- geometry vs organic
- dense vs sparse / fragmented vs coherent

### Arrangement
- open vs ordered
- breathing vs packed
- regular vs free

### Space
- bedroom / living room / study / office
- ceremonial vs everyday
- quiet vs social context

原则：

> 外层少而稳；内层细而可推理。

---

## 4. Internal architecture shift

Intent Intake Agent 需要明确区分三层：

### Layer A — Internal semantic state

内部语义状态，允许包含：
- slots
- axes
- confidence
- question family
- resolution state
- semantic gaps
- intake progress

### Layer B — Goal state

新增一个显式的：

> **IntakeGoalState**

用于回答：
- 哪些大槽位已经拿到 base direction
- 哪些还没有
- 当前完成度多少
- 是否已经可以进入下一阶段

### Layer C — Persona renderer

用户看到的语言必须经过人格层渲染。
它只消费 A / B 两层输出的结构化状态，然后说“人话”。

---

## 5. Proposed new internal state

```ts
interface IntakeSlotProgress {
  slot: "impression" | "color" | "pattern" | "arrangement" | "space";
  topDirection?: string;
  topScore: number;
  supportingSignals: string[];
  isBaseCaptured: boolean;
}

interface IntentIntakeGoalState {
  slots: IntakeSlotProgress[];
  completed: boolean;
  completionReason?: string;
  missingSlots: string[];
}
```

### Completion heuristic (initial)

- `topScore >= 0.5` → this macro slot is considered base-captured
- all critical slots captured → `completed = true`

Critical slots can initially be:
- impression
- color
- pattern
- arrangement

Space can be optional but bonus-bearing.

---

## 6. Question planning should become goal-aware

当前 question planning 更多是：
- 哪个 gap 最大，就先问哪个

升级后应变成双重目标：

### Local objective
- 当前最值得补的 semantic gap 是什么

### Global objective
- 哪个大槽位还没有 base direction
- 哪个大槽位采集过度、哪个槽位采集不足

也就是说：

> 不再允许某一个 slot 因为 gap 反复复活就长期霸占对话。

如果 color 已经被问了 2 轮，而 pattern / arrangement 仍然空白，
那么 planner 应优先把问题切向缺失的大槽位。

---

## 7. Resolution-aware multi-turn dialogue

这次重构已经开始建立：
- `QuestionFamilyId`
- `QuestionResolutionState`
- `latestResolution`

下一步 agent 层必须正式利用它：

### The system should know
- 上一问属于哪个 family
- 用户是否已经选边
- 哪个 family 已经 narrowed / resolved
- 哪个 family 已经不应该再问

### The system should stop doing
- 仅根据累计文本重跑，导致同一问题家族复活
- 仅判断 answered / partial / shifted，而不判断 resolved

---

## 8. User-facing rendering rule

### Hard rule

以下内容**禁止直接出现在用户可见文案中**：

- `colorMood`
- `patternTendency`
- `overallImpression`
- `gap`
- `anchor`
- `question family`
- `contrast-*`
- 内部 confidence 数值
- `resolved family`
- `targetField / targetAxes`

这些只能存在于：
- debug inspect
- internal state
- logs
- evaluation tooling

### User-facing rendering should express

- 这轮我更怎么理解你了
- 哪部分已经有点样子了
- 还有哪部分没听清
- 下一步为什么想问这个

但必须说成人话。

---

## 9. Understanding layer should become state-driven, not cue-driven

原先 `buildCumulativeUnderstanding()` 的问题在于：
- cue 命中
- 固定句输出

未来应改为：
- 从 `resolutionState + semanticUnderstanding + intakeGoalState` 先产出结构化 summary
- 再由 persona renderer 输出自然语言

所以 understanding 不再是：
- `mustPreserve` -> canned sentence

而应是：
- 已收窄了什么
- 还 open 的是什么
- 当前更稳的 base direction 是什么
- 还差哪个 macro slot

---

## 10. Follow-up question should be rendered in persona voice

内部 question planner 可以仍然产出：
- selected target
- selected family
- selected axes
- expected gain

但对用户外显时，应变成类似：

- “整体那个舒服、别太用力的感觉我大概摸到了。现在我更想确认颜色：你是想更暖一点，还是更收一点？”
- “图案这一层我不太把你理解成几何感太强，反而更像是在回避太碎太花。那我再问近一点：你希望它自然一点，还是只是简一点？”

即：
- 先承接
- 再过渡
- 再提问

而不是直接裸露 slot question。

---

## 11. Future extension: image-text dual decision chain

这个 agent 不能只为文本设计，因为后续很可能要扩展到：

> **图文双决策链**

也就是：
- 用户通过文字表达方向
- 用户也通过图片选择 / 排除 / 对比表达方向
- 系统把两者合并成统一 preference state

### Therefore the agent spec must remain modality-agnostic

Intent Intake Agent 的输入不应只定义为 `text`。
未来应允许：
- text utterance
- image selection / rejection event
- image comparison event
- annotated visual cue

### Suggested future abstraction

```ts
type IntakeSignal =
  | { type: "text"; text: string }
  | { type: "image-like"; imageId: string; reasons?: string[] }
  | { type: "image-dislike"; imageId: string; reasons?: string[] }
  | { type: "image-compare"; preferredImageId: string; rejectedImageId: string; note?: string };
```

这样未来的图文双决策链就不会与当前 agent 架构冲突。

---

## 12. Near-term implementation roadmap

### Phase A — formalize agent state

新增：
- `IntentIntakeGoalState`
- `IntakeSlotProgress`
- clear separation between:
  - internal semantic state
  - resolution state
  - goal state
  - persona rendering layer

### Phase B — persona rendering layer

新增 user-facing renderer：
- 输入：state summary
- 输出：朋友式设计专家口吻的 understanding / transition / question

### Phase C — goal-aware planner

让 planner 同时考虑：
- current semantic gap
- resolution state
- missing macro slots
- progress balance across slots

### Phase D — multimodal preparation

把 intake 输入抽象升级成 signal-based 结构，
确保未来图文双决策链可以无缝接入。

---

## 13. One-sentence summary

Intent Intake Agent 的正式目标不是“多问几句直到像是理解了”，而是：

> 以朋友式地毯设计专家的方式，在有限轮次内，为每个关键大槽位收集到至少一个可用的 base direction，并为未来图文双决策链建立统一的语义入口。
