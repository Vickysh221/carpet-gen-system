# Fuli Semantic Canvas for Poetic and Metaphoric Inputs v0.1

## 1. Why this document exists

前面的文档已经逐步定义了：
- Fuli 作为 multimodal design-state mapper 的任务对象；
- prototype layer / merge logic / explainability；
- slot-question-spec 与 information-gain map；
- semantic expansion rule 与 candidate list。

这些机制已经足够处理一部分：
- direct cue
- prototype cue
- 高频 impression / color / pattern 表达

但实际测试中暴露出另一类输入：

- 诗句
- 隐喻性表达
- 复合意象
- 概念性 / 体验性语义簇

例如：
- 草色遥看近却无
- 咖啡时光
- 春天、鲜艳、明媚、绿意盎然
- 张扬快乐

这类输入的问题不是“词没识别到”这么简单，
而是：

1. 它们往往同时包含多个 cue；
2. 它们不适合直接被压成单一 mood；
3. 它们包含高层概念、隐喻域、体验感和视觉翻译的多个层次；
4. 它们既不能全丢给 LLM 自由解释，也不能直接压成底层参数。

因此，这份文档的目标是：

**把 poetic / metaphoric 输入的分析方式，正式翻译成 Fuli 可用的 semantic canvas。**

这个 canvas 的作用不是做文学分析，
而是：

- 帮系统承接诗性和隐喻输入；
- 把高层语义压回设计翻译层；
- 再压回 slot / axis mapping；
- 并为 explainability 与 question planning 提供更稳的上层结构。

---

## 2. Core conclusion

poetic / metaphoric 输入完全可以进入 Fuli，
而且应该进入。

但它们不应被直接当成：
- 一句 prompt
- 一个 mood label
- 一个立刻可落底层参数的“半成品答案”

更合理的方式是：

```text
poetic / metaphoric input
-> conceptual / experiential interpretation
-> metaphoric domains
-> design translation layer
-> slot / axis mapping
-> question implication
```

也就是说，Fuli 不应把诗句当成文学对象，
而应把它当成：

**一种需要经过 semantic canvas 压缩和翻译的设计意向输入。**

---

## 3. What is transferable from the prior semantic analysis mode

这类分析方式真正可迁移的，不是“诗意措辞”，
而是其分层结构。

当前最可迁移的部分至少有三层：

### 3.1 Conceptual layer
输入表达背后的核心概念主轴。

例如：
- return / home / continuity / eternity
- self-reflection / self-knowledge
- time / rhythm / order / meaning
- spring / freshness / emergence / subtle presence
- daily ritual / companionship / low-stimulation warmth

这一层的价值在于：
- 避免系统过早把输入压成表层词义；
- 让系统先理解“它在说什么方向的概念”。

### 3.2 Metaphoric domain layer
这些概念通过哪些域被承载。

例如：
- cultural
- conceptual
- physiological
- philosophical
- formal
- seasonal
- tactile
- atmospheric
- domestic / ritual

这一层的价值在于：
- 区分“同样叫平静”，它是 home、river、breath、order，还是 light；
- 决定后续视觉翻译不至于太扁平。

### 3.3 Visual / design encoding layer
把上面的高层语义，翻译成：
- color identity
- color restraint / vividness
- motif logic
- geometry / organicity
- spacing / order / rhythm
- presence intensity
- material / texture suggestion

这一步已经非常接近 Fuli 当前真正需要的：

**design translation**

---

## 4. Why carpet is especially suitable for this method

地毯并不是一个单纯“看上去是什么图案”的对象。

它非常适合承载：
- 气氛
- 节律
- 触感联想
- 空间中的存在方式
- 生活中的隐喻性角色

因此，像下面这些输入：
- 咖啡时光
- 草色遥看近却无
- 明媚的春天
- 张扬快乐
- 时间像秩序中的音乐

在地毯中都不是空泛表达，
而是可以被翻译成：
- palette
- motif logic
- arrangement rhythm
- density / visibility
- warmth / distance
- material feeling
- room presence

这也是为什么 Fuli 不应把这类表达简单归为“诗意噪音”。

---

## 5. Fuli semantic canvas: the four-layer structure

为了让 poetic / metaphoric 输入真能进入系统，
建议把当前分析方式统一成 Fuli 的四层 canvas。

### Layer 1 — Semantic cue layer
用户实际给出的输入。

例如：
- 草色遥看近却无
- 咖啡时光
- 春天，鲜艳，明媚，绿意盎然
- 张扬快乐

这一层仍然是 raw input layer，
但它已经可以做：
- cue decomposition
- semantic unit typing

### Layer 2 — Conceptual / experiential layer
把 raw cue 提炼成：
- seasonality
- freshness
- green presence
- daily ritual
- expressive energy
- subtle visibility
- companionship
- softness in presence

这一层不是参数，也不是视觉描述，
而是：

**经验性 / 概念性主轴**

### Layer 3 — Design translation layer
把 conceptual / experiential 主轴翻译成设计对象：
- color identity
- color vividness / restraint
- motif geometry / organicity
- arrangement order / openness / rhythm
- impression calm / energy / softness
- material suggestion
- presence intensity

这一层是 Fuli 最需要也最缺的一层。

它是真正把：
- metaphor
- poetic cue
- lifestyle cue

压回设计语言的桥。

### Layer 4 — Slot / axis mapping layer
最后才进入：
- `color.warmth`
- `color.saturation`
- `motif.complexity`
- `motif.geometry`
- `motif.organic`
- `arrangement.order`
- `arrangement.spacing`
- `impression.calm`
- `impression.energy`
- `impression.softness`

这一层不是 semantic canvas 的开始，
而是 semantic canvas 的落点。

---

## 6. Core metaphoric axes for Fuli

在 poetic / metaphoric 输入里，用户表达往往不是一个词，
而是站在某个更高的语义轴上。

因此，Fuli 可以引入一组更高层的 core metaphoric axes，
作为 semantic canvas 的上层框架。

当前建议至少考虑：

### 6.1 Presence ↔ Restraint
适合承接：
- 张扬
- 存在感
- 快乐
- 低调
- 克制
- 别太抢

### 6.2 Organic ↔ Geometric
适合承接：
- 自然一点
- 草色
- 生长感
- 硬几何感

### 6.3 Stillness ↔ Rhythm
适合承接：
- 安静
- 呼吸感
- 节律感
- 有秩序

### 6.4 Warmth ↔ Distance
适合承接：
- 咖啡时光
- 温暖
- 陪伴感
- 冷感
- 清冽感

### 6.5 Diffuse ↔ Defined
适合承接：
- 若有若无
- 草色遥看近却无
- 雾感
- 明媚
- 鲜艳

这些轴的意义，不是直接成为最终参数，
而是帮助系统先组织：
- 当前表达到底在更高层语义上站在哪边。

---

## 7. Two important semantic-specificity rules

poetic / metaphoric 输入进入 Fuli 时，
最重要的不只是“能识别到”，
而是要控制语义具象度。

### 7.1 Some signals must be preserved
有些意向不能被轻易模糊掉。

例如：
- 草色
- 春意
- 绿意
- 明媚
- 鲜艳
- 若有若无

这些意向一旦出现，
至少应在：
- color identity
- seasonal freshness
- subtle presence

中被保留，
而不能直接被 generic impression fallback 吞掉。

### 7.2 Some signals must not be over-literalized
有些意向不能被过快具象化成固定参数或单一视觉词。

例如：
- 咖啡
- 咖啡时光
- 陪伴感
- 日常感
- 生活感

这些更像：
- lifestyle tone
- atmosphere modifier
- experiential layer cue

而不是一上来就被压成：
- 暖棕
- muted brown
- artisan texture
- warm vs muted

也就是说：
- 绿意类信号通常需要 **must-preserve**；
- 咖啡类信号通常需要 **must-not-over-literalize**。

---

## 8. How this changes question planning

semantic canvas 不只影响理解，
也直接影响 next question。

### 8.1 Must-preserve cue
问题应保护它，不让它在主解释里消失。

例如：
- 你说的“绿意”，更像颜色本身要被看见，还是只是整体要有一点春天的气息？

### 8.2 Must-not-over-literalize cue
问题不能太早把它变成参数二选一。

例如：
- 咖啡时光这层，对你更重要的是温度感，还是那种日常陪伴的氛围？

而不是：
- 你是要更暖还是更收？

### 8.3 Directional-dominant cue
可以更直接进入主对比问题。

例如：
- 你更想让它快乐有张力，还是把存在感稍微收一点？

这说明：
poetic / metaphoric 分析如果真的接入系统，
其价值不只是“理解更丰富”，
而是：

**next question 也会更准确地切中真正的语义缺口。**

---

## 9. Which inputs should use the semantic canvas

这套 semantic canvas 不适合所有输入。

### Suitable inputs
- 诗句
- 隐喻性表达
- 意象型表达
- mixed cue input
- 用户自己也说不清、但有审美方向的输入

### Not suitable inputs
- 纯 direct cue
  - 别太花
  - 更暖一点
  - 有秩序
  - 安静一点

这些不需要经过完整 canvas，
直接进入 direct / prototype / retrieval 主链更高效。

也就是说，这套方法应作为：

**poetic / metaphoric / subtle / mixed input mode**

而不是所有输入的统一默认路径。

---

## 10. Proposed Fuli semantic canvas object

为了让这套方法可实现，建议引入一个 canvas 对象。

```ts
type FuliSemanticCanvas = {
  rawCues: string[];
  conceptualAxes: string[];
  metaphoricDomains: string[];
  designTranslations: {
    colorIdentity?: string[];
    colorRestraint?: string[];
    motifLogic?: string[];
    arrangementLogic?: string[];
    impressionTone?: string[];
    materialSuggestion?: string[];
    presenceIntensity?: string[];
  };
  slotMappings: {
    targetFields: HighValueField[];
    targetSlots: EntryAgentSlotKey[];
    targetAxes: string[];
  };
  narrativePolicy: {
    mustPreserve: string[];
    mustNotOverLiteralize: string[];
    directionalDominant: string[];
  };
  questionImplications: {
    likelyQuestionKinds: string[];
    likelyInformationGains: string[];
  };
};
```

这个对象不是要在第一轮完整上线，
而是作为一种设计模板，
帮助你判断：
- 当前 poetic input 是否被压得太早；
- 当前系统是否丢失了关键 identity signal；
- 当前 question 是否在过早具象化某类 tone cue。

---

## 11. Example: spring / vivid / green presence

### Input cue layer
- 春天
- 鲜艳
- 明媚
- 绿意盎然

### Conceptual / experiential layer
- seasonal emergence
- freshness
- green presence
- visible vitality

### Design translation layer
- color identity: green / spring / fresh
- color vividness: lively, visible, but maybe not neon
- impression tone: uplifting / open / bright
- presence intensity: visible but not necessarily aggressive

### Slot / axis layer
- primary: `colorMood`
- secondary: `overallImpression`
- likely axes:
  - `color.saturation`
  - `color.warmth` or cool-fresh equivalent semantic approximation
  - `impression.energy`

### Narrative policy
- `绿意盎然` -> must-preserve
- `鲜艳 / 明媚` -> directional-dominant within color
- do not collapse into generic `lively daily feeling`

### Question implication
- 你说的“绿意”，更重要的是颜色本身要被看见，还是整体有春天那种明亮鲜活感？

---

## 12. Example: coffee time

### Input cue layer
- 咖啡时光

### Conceptual / experiential layer
- daily ritual
- companionship
- slowing down
- low-stimulation warmth

### Design translation layer
- impression tone: warm / calm / companionable
- color identity: earthy / restrained / warm
- material suggestion: tactile / grounded / soft

### Slot / axis layer
- primary: `overallImpression` or `colorMood`
- secondary: `patternTendency`

### Narrative policy
- `咖啡时光` -> must-not-over-literalize
- do not immediately reduce to `warm brown` or `muted coffee palette`

### Question implication
- 咖啡时光这层，对你更重要的是温度感，还是那种日常陪伴的氛围？

---

## 13. Current design conclusion

poetic / metaphoric 输入完全可以进入 Fuli，
而且它们不应该被视为噪音。

但它们也不能被直接当成：
- 一个最终 mood label；
- 一个 prompt 片段；
- 一个立刻可落底层参数的单步答案。

更合理的方式是通过一层：

**semantic canvas**

把：
- 概念主轴
- 隐喻域
- 体验感
- 设计翻译
- slot mapping
- question implication

串成一条可解释、可翻译、可追问的链路。

这意味着，Fuli 下一步除了 semantic expansion 外，
还可以逐步建立一种更高层的：

**poetic / metaphoric input mode**

让系统既不把诗意输入当噪音丢掉，
也不把它们过快压成过于粗糙或过于具象的主解释。
