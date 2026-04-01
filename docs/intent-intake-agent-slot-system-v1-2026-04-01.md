# Intent Intake Agent — Slot System v1

Date: 2026-04-01

## 1. Purpose

这份文档定义 `Intent Intake Agent` 的第一版槽位体系。

目标不是把所有用户表达都强行分类干净，而是建立一套：

- 用户可感知的大槽位
- 系统内部可推理的子槽位 / 子轴
- 能支撑文本 intake
- 能自然扩展到图文双决策链

这套体系服务的不是单次问答，而是整个 preference intake 过程。

---

## 2. Design principles

### 2.1 Outer layer should stay small
用户可感知的大槽位必须少，不然对话会像填表。

### 2.2 Inner layer can stay rich
系统内部可以更细，用于：
- 语义映射
- 问题规划
- resolution tracking
- visual feedback interpretation

### 2.3 Slots are not equal to final locked parameters
这些槽位首先服务于：
- intake
- understanding
- early generation guidance

不是一开始就把它们当成 rigid prompt fields。

### 2.4 Pattern must carry semantic subject, not only style tendency
`pattern` 不能只是“几何 / 自然 / 简繁”的形式轴。
它必须承载：
- key element
- symbolic imagery
- abstraction preference

---

## 3. Macro slot system (user-facing layer)

第一版建议采用 5 个大槽位：

1. **空间 / 使用场景**
2. **整体氛围 / 意境**
3. **图案意向 / pattern intent**
4. **颜色方向**
5. **融合方式 / 存在感**

说明：
- `图案意向` 不是传统 motif 的弱化版，而是更贴近用户自然表达的入口。
- `融合方式 / 存在感` 之所以单列，是因为它会强烈影响后续视觉权重、对比度、边界和空间关系。

---

## 4. Macro slot details

## 4.1 空间 / 使用场景

### User-level question it answers
- 这块地毯服务哪里？
- 谁在用？
- 它是偏日常、偏休息、偏展示，还是偏社交？

### Internal sub-slots
- roomType
  - bedroom
  - living room
  - study
  - office
  - lobby / public-like
- usageMode
  - resting
  - everyday living
  - social / receiving guests
  - focused work
- contextualTone
  - quiet private
  - open social
  - ceremonial
  - relaxed domestic

### Why it matters
空间不是最后才补的附属信息。
它会影响：
- 图案复杂度容忍度
- 色彩存在感
- 排布密度
- 地毯在空间中的角色

---

## 4.2 整体氛围 / 意境

### User-level question it answers
- 你想要的整体感觉是什么？
- 是安静、温暖、克制、轻松，还是更有张力、存在感？

### Internal sub-slots
- moodAxis
  - calm vs presence
  - soft vs crisp
  - warm vs cool distance
- emotionalTone
  - companionable
  - restrained
  - poetic
  - lively
  - grounded
- temporalTone
  - everyday
  - ceremonial
  - nostalgic
  - fresh / spring-like

### Notes
这一层不是 final style label，而是：
- early direction setter
- many other slots' prior modulator

---

## 4.3 图案意向 / Pattern Intent

这是本次升级最关键的新大槽位。

### User-level question it answers
- 图案里有没有一个你真正想抓住的东西？
- 这个东西是具象被看见，还是只是作为一种意向存在？

### Internal structure

#### A. subject / key element
例如：
- 荷花
- 草叶
- 山水
- 波纹
- 云气
- 石纹
- 花瓣
- 枝叶
- 几何母题
- 织物纹理

#### B. rendering mode
- literal / figurative
- semi-abstract
- suggestive / intentional
- texture-like
- geometricized

#### C. abstraction preference
- concrete
- softened figurative
- abstract but recognizable
- purely atmospheric trace

#### D. motion / compositional feeling
- wind-like
- flowing
- still
- layered
- dispersed
- gathered

### Example
用户说：
- “风中荷花”

系统不应只记成：
- natural pattern

而应拆成：
- subject = lotus / floral-leaf imagery
- rendering = suggestive / semi-abstract
- abstraction = abstract-preferred by default unless user wants literal
- motion = wind-like / dispersed / light

### Product principle
默认可推荐更抽象的地毯表达，
但必须尊重用户如果明确要具象。

---

## 4.4 颜色方向

### User-level question it answers
- 颜色是想更暖一点，还是更收一点？
- 想让颜色被看见，还是只作为整体气息？

### Internal sub-slots
- warmth
  - warm / neutral / cool
- saturation / restraint
  - vivid / visible / muted / restrained
- visibility mode
  - color-as-subject
  - color-as-atmosphere
- palette character
  - earthy
  - spring-green
  - low-contrast
  - softened contrast

### Notes
颜色方向不能只看色相。
在地毯语境里更重要的是：
- 颜色存在感
- 色彩与图案/空间的关系

---

## 4.5 融合方式 / 存在感

### User-level question it answers
- 你希望它更融进整体，还是稍微跳出来一点？
- 它在空间里是陪衬、支撑，还是一个视觉焦点？

### Internal sub-slots
- spatialPresence
  - blended
  - softly noticeable
  - focal
- contrastRole
  - low contrast support
  - moderate articulation
  - explicit statement
- visualWeight
  - light
  - medium
  - anchored / strong

### Why this should be a macro slot
用户其实很常以这类方式表达需求：
- “别太抢”
- “和整体融一点”
- “有一点存在感，但不要跳出来过头”

如果不把它单独建模，系统很容易把这类话混入 impression 或 color，导致后续理解失真。

---

## 5. Internal bridge to current implementation

为兼容当前系统，第一版可先做如下近似映射：

- 空间 / 使用场景 → `spaceContext`
- 整体氛围 / 意境 → `overallImpression`
- 图案意向 / pattern intent → 现阶段部分映射到 `patternTendency`，后续应单独扩展
- 颜色方向 → `colorMood`
- 融合方式 / 存在感 → 当前可先挂靠 impression + color + arrangement 的组合判断，后续建议独立出来

### Important note
这只是过渡，不是最终结构。
最终应该让 `patternIntent` 和 `presence/blending` 都拥有更独立的内部表示。

---

## 6. Slot progress semantics

每个 macro slot 不应只有“有没有命中”，而应有进度语义。

建议分三档：

### hinted
- 已出现相关信号
- 但还不足以形成 base direction

### base-captured
- 已有一个主方向可以作为首批图生成依据
- 但不代表锁定

### lock-candidate
- 信号强且稳定
- 可以进入用户确认“是否沿此方向持续探索”

---

## 7. Base capture heuristic (v1)

`> 0.5` 可以作为第一版 heuristics 的参考阈值，
但不应单独使用。

建议 base-captured 同时满足：

1. top direction score > 0.5
2. top direction exceeds second candidate by at least 0.15
3. 至少存在两个支持信号源（例如两次文本支持，或图文双侧支持）

### Why
这样可以避免：
- 一句话把某个方向推高
- 系统误以为已稳定

---

## 8. Lock-candidate heuristic (v1)

建议进入 lock-candidate 时满足：

1. top direction score > 0.68 ~ 0.7
2. 连续至少两轮未被反驳
3. 或者出现图文双侧一致支持
4. 同时相邻竞争分支明显落后

### Note
lock-candidate 不等于自动锁。
它只意味着：
- 现在值得和用户确认

---

## 9. Output discipline

### Internal layer may contain
- slot names
- sub-slot names
- confidence
- family ids
- resolution states

### User-facing layer must not expose directly
禁止直接对用户说：
- `patternTendency`
- `colorMood`
- `gap`
- `anchor`
- `confidence 28%`
- `family`
- `contrast-*`

用户看到的只应是：
- 自然语言中的理解
- 设计专家式的追问
- 是否继续沿某方向探索的确认

---

## 10. One-sentence summary

Slot System v1 的关键升级是：

> 把“图案偏好”从单纯形式轴，升级为能承载 key element、抽象程度与图案意向的 `pattern intent`；同时把“融合方式 / 存在感”提升为一个显式宏槽位，从而让 Intent Intake Agent 能更自然地收集一个可生成的 base preference profile。
