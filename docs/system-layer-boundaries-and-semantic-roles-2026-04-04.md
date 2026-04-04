# System Layer Boundaries And Semantic Roles

Date: 2026-04-04
Project: carpet-gen-system
Status: implementation note / terminology boundary brief

---

## 1. 这份文档解决什么问题

在当前系统里，下面这些词很容易被混在一起：

- `query type`
- `semantic role hints`
- `slot`
- `canonical state`

如果这四层不分开，就会反复出现两类误判：

1. 把 `poetic atmospheric / explicit motif` 误当成 slot
2. 把 comparison / planner 的中间判断，误当成 compiler 最终状态

这份文档的目的就是把它们的边界说清楚，并对应到当前实现。

---

## 2. 一句话定义

- `query type`: 这句输入更应该按什么解释路径进入系统
- `semantic role hints`: 这句输入内部哪些语义角色更可能成立
- `slot`: 系统内部持续积累的结构化意图维度
- `canonical state`: compiler 最终统一消费的标准化意图状态

所以它们不是一组同层概念，而是从前到后的不同层：

`input`
-> `query type`
-> `semantic role hints`
-> `slot accumulation`
-> `canonical state`

---

## 3. Layer -> Responsibility -> Example

| Layer | 主要职责 | 典型输出 | 例子 |
| --- | --- | --- | --- |
| Input | 接收用户输入事件 | normalized text / comparison selection signal | `烟雨里有一点竹影`，或点击“更像这个” |
| Retrieval | 召回候选语义项，不做最终解释 | semantic candidates / comparison candidates / scores | 命中 `烟雨`、`竹影`、`atmosphere-humidity-suspended` |
| Interpretation / Routing | 判断这句该按哪种方式理解 | `queryRoute`、`semanticRoleHints` | `mixed-compositional` + `base-accent-split` |
| Planning | 决定先回显什么、展示什么差异、是否要问 | `replySnapshot`、`comparisonCandidates`、`followUpQuestion` | 先给 atmosphere + motif 的并置 cards |
| Compiler | 把上游结果统一折叠进标准意图状态 | canonical intent state / generation controls | `impression`、`pattern`、`constraints` 的统一输出 |

关键点：

- `query type` 属于 Interpretation / Routing 层
- `comparisonCandidates` 属于 Planning 层
- `slot` 和 `canonical state` 属于更靠后、更稳定的状态层

---

## 4. Query Type 是什么，不是什么

### 4.1 是什么

`query type` 是对输入句子“解释路径”的第一层判断。

当前实现定义在 [types.ts](/Users/vickyshou/Documents/trae_projects/carpet-gen-system/src/features/entryAgent/types.ts)：

- `poetic-atmospheric`
- `explicit-motif`
- `constraint-negation`
- `mixed-compositional`
- `vague-underspecified`

对应的解释路径是：

- `atmosphere-first`
- `motif-trace-first`
- `constraint-first`
- `compositional-bridge`
- `guided-disambiguation`

实现入口在 [queryRouting.ts](/Users/vickyshou/Documents/trae_projects/carpet-gen-system/src/features/entryAgent/queryRouting.ts)。

### 4.2 不是什么

`query type` 不是：

- 不是 slot 名
- 不是 compiler 字段
- 不是最终设计结论
- 不是“用户想要什么”的最终真值

它只是一个上游判断：

> 这句话现在应该优先按哪种语义结构进入系统

### 4.3 例子

#### 例子 A
输入：`下雨前五分钟的空气`

- query type: `poetic-atmospheric`
- 含义：先保空气、湿度、边界，不先逼它落成具体 motif

#### 例子 B
输入：`花叶意向`

- query type: `explicit-motif`
- 含义：先按 motif trace 处理，再决定是痕迹、轮廓还是可辨认

#### 例子 C
输入：`烟雨里有一点竹影`

- query type: `mixed-compositional`
- 含义：不能只按 atmosphere 或 motif 单线处理，要先做 base vs accent 并置

---

## 5. Semantic Role Hints 是什么，不是什么

### 5.1 是什么

`semantic role hints` 是 interpretation 层对句内语义角色的轻量提示。

当前实现入口在 [interpretationLayer.ts](/Users/vickyshou/Documents/trae_projects/carpet-gen-system/src/features/entryAgent/interpretationLayer.ts)。

它会产出这类 hint：

- `constraint-before-positive-anchor`
- `base-accent-split`
- `motif-trace-candidate`
- `atmosphere-candidate`

这些 hint 的作用不是替代 query type，而是补充“句内结构”。

### 5.2 不是什么

`semantic role hints` 不是：

- 不是最终 slot 值
- 不是 compiler 最终字段
- 不是前台直接展示给用户的 card

它更像“解释时的姿态提示”。

### 5.3 例子

输入：`烟雨里有一点竹影`

可能得到：

- query type: `mixed-compositional`
- semantic role hints:
  - `base-accent-split`
  - `motif-trace-candidate`
  - `atmosphere-candidate`

这里 `mixed-compositional` 说明“整体怎么解释”，而 `base-accent-split` 说明“句内关系更像底子 + 轻题材点缀”。

---

## 6. Slot 是什么，不是什么

### 6.1 是什么

`slot` 是系统内部持续积累的结构化意图维度。

它解决的不是“这句话属于哪类”，而是：

> 到目前为止，用户在整体气质、图案、排布、颜色、约束等维度上，已经稳定到了什么程度

slot 是多轮累积的，不是单句标签。

### 6.2 不是什么

slot 不是：

- 不是 router 的 query type
- 不是 planner 的 comparison group
- 不是 retrieval 命中的候选项

### 6.3 为什么 query type 不等于 slot

因为同一个 `query type` 可以影响多个 slot。

例如 `poetic-atmospheric` 常常会优先影响：

- `impression`
- `color`
- `pattern` 里的 atmospheric pattern
- `constraints`

而不是只落进一个叫“atmosphere”的 slot。

同样，`explicit-motif` 也不等于“pattern slot”本身，因为它还会影响：

- motif 的可辨认度
- presence 强度
- arrangement 上的点缀 vs 铺开

---

## 7. Canonical State 是什么，不是什么

### 7.1 是什么

`canonical state` 是 compiler 最终统一消费的标准化状态。

它的职责是：

> 不管上游是 poetic、motif、constraint 还是 mixed，最后都要折叠成一套统一出口

当前 compiler 入口在 [visualIntentCompiler.ts](/Users/vickyshou/Documents/trae_projects/carpet-gen-system/src/features/entryAgent/visualIntentCompiler.ts)。

### 7.2 为什么它必须和 query type 分开

因为 query type 是“解释入口”，canonical state 是“统一出口”。

如果两者混在一起，就会变成：

- router 直接写最终设计结论
- planner 直接污染 compiler
- 每加一种 query type，就得重写 compiler contract

这正是当前系统想避免的事。

### 7.3 comparison selection 如何进入 canonical state

现在 comparison card 的选择不会只停在 UI。

它的链路是：

1. 前台点击 card
2. 形成 `comparison-selection` signal
3. signal 写入 `comparisonSelections`
4. candidate 携带的 `selectionEffect.canonicalEffects`
5. compiler 在 [visualIntentCompiler.ts](/Users/vickyshou/Documents/trae_projects/carpet-gen-system/src/features/entryAgent/visualIntentCompiler.ts) 里 additive 写回 canonical state

所以 comparison 是：

- 不是 slot 本身
- 不是 canonical state 本身
- 而是进入 canonical state 的一个结构化前台输入机制

---

## 8. 四层边界表

| 概念 | 所在层 | 作用 | 生命周期 | 是否直接给 compiler 用 |
| --- | --- | --- | --- | --- |
| `query type` | Interpretation / Routing | 决定解释路径 | 单轮优先 | 否 |
| `semantic role hints` | Interpretation / Routing | 提示句内语义角色 | 单轮优先，可被后续吸收 | 否 |
| `slot` | Stateful semantic accumulation | 记录多轮结构化意图进展 | 多轮累积 | 间接 |
| `canonical state` | Compiler | 统一输出标准状态 | 每轮重算 / 汇总 | 是 |

一句话归纳：

- `query type` 决定先怎么理解
- `semantic role hints` 决定句内哪些关系要被保住
- `slot` 决定系统目前已经稳定知道了什么
- `canonical state` 决定最终往生成系统输出什么

---

## 9. 三条典型路径

### 9.1 Poetic Atmospheric

输入：`下雨前五分钟的空气`

1. router 判成 `poetic-atmospheric`
2. interpretation 给出 `atmosphere-first`
3. planner 输出 atmosphere-first comparisons
4. 用户选中“潮气悬着”或“边界压低”
5. selection effect 最后写回 impression / pattern / constraints 等 canonical 字段

关键点：

- 这不是“落进 atmosphere slot”
- 而是“以 atmosphere-first 的方式进入统一状态”

### 9.2 Explicit Motif

输入：`花叶意向`

1. router 判成 `explicit-motif`
2. interpretation 优先保 motif trace
3. planner 输出：
   - 只剩痕迹
   - 留一点轮廓
   - 可辨认一点
4. 用户的选择决定 motif 的 trace 强度和 presence
5. compiler 仍然统一写回 pattern / presence / constraints

关键点：

- 它不是“用户要一个花叶 slot”
- 它是“系统先按 motif-trace-first 理解，再统一折叠”

### 9.3 Mixed Compositional

输入：`烟雨里有一点竹影`

1. router 判成 `mixed-compositional`
2. interpretation 给出 `base-accent-split`
3. planner 同时给 atmosphere 和 motif 两组差异
4. follow-up 不是补字段，而是问：
   - 保空气
   - 还是让竹影更清楚
5. compiler 把 base 和 accent 的倾向统一折叠到 canonical state

关键点：

- 它不是一个新的 slot
- 它是一种“并置解释方式”

---

## 10. 常见误区

### 误区 1
`poetic atmospheric` 就是 impression slot

不对。

它通常优先影响 impression，但也可能影响 color、pattern、constraints。

### 误区 2
`explicit motif` 就是 pattern slot

不对。

它会影响 pattern，但也会牵动 presence、arrangement、abstraction level。

### 误区 3
comparison card 就是标签选择器

不对。

现在 comparison card 已经通过 `selectionEffect` 进入 canonical state，它是结构化输入机制，不是 UI 装饰按钮。

### 误区 4
semantic role hints 和 query type 是一回事

不对。

- query type 解决“整句先怎么解释”
- semantic role hints 解决“句内哪些角色关系值得保留”

---

## 11. 当前实现对应文件

- Input / signal entry:
  [signalProcessor.ts](/Users/vickyshou/Documents/trae_projects/carpet-gen-system/src/features/entryAgent/signalProcessor.ts)
- Retrieval:
  [retrievalLayer.ts](/Users/vickyshou/Documents/trae_projects/carpet-gen-system/src/features/entryAgent/retrievalLayer.ts)
- Interpretation / Routing:
  [queryRouting.ts](/Users/vickyshou/Documents/trae_projects/carpet-gen-system/src/features/entryAgent/queryRouting.ts)
  [interpretationLayer.ts](/Users/vickyshou/Documents/trae_projects/carpet-gen-system/src/features/entryAgent/interpretationLayer.ts)
- Planning:
  [questionPlanning.ts](/Users/vickyshou/Documents/trae_projects/carpet-gen-system/src/features/entryAgent/questionPlanning.ts)
  [comparisonLibrary.ts](/Users/vickyshou/Documents/trae_projects/carpet-gen-system/src/features/entryAgent/comparisonLibrary.ts)
- Compiler:
  [visualIntentCompiler.ts](/Users/vickyshou/Documents/trae_projects/carpet-gen-system/src/features/entryAgent/visualIntentCompiler.ts)
- Type definitions:
  [types.ts](/Users/vickyshou/Documents/trae_projects/carpet-gen-system/src/features/entryAgent/types.ts)

---

## 12. 最终结论

`poetic atmospheric / explicit motif` 在项目中的地位，不是 slot，也不是最终 canonical 字段。

它们的真正位置是：

> 位于 Retrieval 之后、slot accumulation 之前的 interpretation path type

它们至少有三重作用：

1. 决定系统先怎样理解一句话
2. 决定 planner 先展示哪种 comparison 差异
3. 决定哪些语义优先被折叠进统一 canonical state

因此，未来如果继续扩展：

- `ink-density`
- `material-pressure`
- `trace-geometry`

这些也应该优先被看作新的 interpretation path / semantic role / planning dimension，
而不是直接去扩 slot 枚举或改 compiler contract。

---

## 13. 词级映射：谁来判断“哪个词落入什么维度”

这一层最容易被误解。

系统里并不存在一个单独的“词语归类总开关”一次性决定所有事情。  
实际是分层判断的：

1. retrieval 先召回和这个词或短语相近的候选语义项
2. routing / interpretation 再判断它在整句里扮演什么角色
3. field analysis 再判断它对哪些结构化字段产生证据
4. compiler 最后把这些证据统一折叠进 canonical state

所以不是：

`某个词 -> 一步到位变成某个字段`

而是：

`某个词 -> 相似候选 -> 句内角色 -> 字段证据 -> 统一状态`

### 13.1 各层各自负责什么

| 问题 | 负责层 | 当前实现 | 说明 |
| --- | --- | --- | --- |
| 这句话和哪些语义项相似 | Retrieval | [retrievalLayer.ts](/Users/vickyshou/Documents/trae_projects/carpet-gen-system/src/features/entryAgent/retrievalLayer.ts) | 只召回近邻，不做最终解释 |
| 这句话整体更像 `poetic-atmospheric` 还是 `explicit-motif` | Interpretation / Routing | [queryRouting.ts](/Users/vickyshou/Documents/trae_projects/carpet-gen-system/src/features/entryAgent/queryRouting.ts) | 决定解释路径，不直接写最终状态 |
| 句内哪些成分更像 atmosphere / motif / constraint / accent | Interpretation / Routing | [interpretationLayer.ts](/Users/vickyshou/Documents/trae_projects/carpet-gen-system/src/features/entryAgent/interpretationLayer.ts) | 产出 `semanticRoleHints` |
| 这句话命中了哪些 high-value fields | Field analysis | [fieldHitDetection.ts](/Users/vickyshou/Documents/trae_projects/carpet-gen-system/src/features/entryAgent/fieldHitDetection.ts) | 产出 `hitFields / evidence / confidence` |
| 这些证据最后如何写入统一意图状态 | Compiler | [visualIntentCompiler.ts](/Users/vickyshou/Documents/trae_projects/carpet-gen-system/src/features/entryAgent/visualIntentCompiler.ts) | 统一折叠到 canonical state |

### 13.2 retrieval 不负责什么

retrieval 不负责直接判断：

- `poetic-atmospheric`
- `explicit-motif`
- 哪个 slot 已经稳定
- 最终该给用户看哪张 comparison card
- 最终 canonical state 应该是什么

retrieval 负责的是：

- 把相似的 poetic / motif / comparison 候选找出来
- 给 routing 和 planning 提供候选证据

也就是说，retrieval 是证据提供层，不是解释裁决层。

### 13.3 routing 在词级别上做什么

routing 判断的不是“某个词永远属于哪个字段”，而是：

> 这个词在这句话里更像哪类语义线索，它让整句更应该按什么路径理解

例如当前实现里：

- `雨 / 雾 / 空气 / 光` 更像 atmosphere 线索
- `花 / 叶 / 竹 / 荷花 / 水波` 更像 motif 线索
- `不要 / 别 / 避免` 更像 constraint 线索
- `有一点 / 带一点 / 里有` 更像 compositional/base-accent 线索

这些判断现在主要在 [queryRouting.ts](/Users/vickyshou/Documents/trae_projects/carpet-gen-system/src/features/entryAgent/queryRouting.ts) 和 [interpretationLayer.ts](/Users/vickyshou/Documents/trae_projects/carpet-gen-system/src/features/entryAgent/interpretationLayer.ts)。

所以 router 做的是“解释性维度归属”，不是最终字段归属。

### 13.4 field analysis 在词级别上做什么

field analysis 关注的是：

- 这句话是否给 `overallImpression` 提供了证据
- 是否给 `patternTendency` 提供了证据
- 是否给 `colorMood` 提供了证据
- 当前证据强度是高、中还是低

这一步当前主要在 [fieldHitDetection.ts](/Users/vickyshou/Documents/trae_projects/carpet-gen-system/src/features/entryAgent/fieldHitDetection.ts) 完成。

它和 routing 的差别是：

- routing 关心“这句话先怎么理解”
- field analysis 关心“这句话对哪些结构化字段有增量”

两者可以同时成立，但不应该互相替代。

### 13.5 一个词为什么可以影响多个维度

因为词的语义作用有上下文。

例如 `雾感`：

- 在 routing 层，它很可能是 atmosphere cue
- 在 field analysis 层，它可能同时给：
  - `colorMood`
  - `overallImpression`
  - `patternTendency`
  提供不同强度的证据
- 在 compiler 层，它最后可能被折叠进：
  - impression 的 calm / haze qualities
  - pattern 的 atmospheric pattern
  - constraints 的 keep / avoid qualities

所以系统不应该把词和字段做成一对一硬映射。

---

## 14. 词 -> semantic role -> field -> canonical state 映射表

下面这张表不是“永远唯一正确”的固定词典，而是当前系统里最合理的层间理解方式。

| 词或短语 | retrieval 可能召回 | semantic role 倾向 | field evidence 倾向 | canonical state 常见落点 |
| --- | --- | --- | --- | --- |
| `雨` / `烟雨` | poetic mapping, atmosphere comparison | atmosphere cue | `overallImpression`, `colorMood` | `impression`, `color`, `constraints` |
| `空气` | poetic mapping, atmosphere comparison | atmosphere cue | `overallImpression` | `impression`, `pattern.atmosphericPattern` |
| `雾感` | poetic mapping, atmosphere comparison | atmosphere cue | `colorMood`, `overallImpression` | `impression`, `color`, `pattern` |
| `光` / `薄纱后面的光` | poetic mapping | atmosphere cue / light-presence cue | `overallImpression`, `colorMood` | `impression`, `color` |
| `花叶` | motif entry, motif comparison | motif-trace cue | `patternTendency` | `pattern`, `presence` |
| `竹影` | motif entry, motif comparison | motif-trace cue | `patternTendency`, `arrangementTendency` | `pattern`, `presence`, `arrangement` |
| `荷花在风里摇曳` | motif entry, semantic prototype | motif cue + motion nuance | `patternTendency`, `overallImpression` | `pattern`, `presence`, `constraints` |
| `不要太花` | weak semantic retrieval or none | constraint cue | `patternTendency` | `constraints`, `pattern` |
| `别太满` | weak semantic retrieval or none | constraint cue | `arrangementTendency` | `constraints`, `arrangement` |
| `有一点` / `带一点` | comparison seeds, compositional patterns | base-accent split cue | 不直接对应单一 field | 通过 planning / compiler 影响 base vs accent 权重 |

这张表要表达的核心是：

- retrieval 看“像什么”
- semantic role 看“它在句子里扮演什么”
- field evidence 看“它给哪个结构化维度带来了证据”
- canonical state 看“这些证据最后统一收口到哪里”

---

## 15. 一个完整例子

输入：`烟雨里有一点竹影`

### Step 1: Retrieval

retrieval 可能召回：

- `烟雨`
- `竹影`
- atmosphere comparisons
- motif-trace comparisons

这一层只能说明：

> 这句话同时和 atmosphere 语义、motif 语义都有相似性

### Step 2: Interpretation / Routing

routing 判断：

- query type: `mixed-compositional`
- path: `compositional-bridge`

semantic role hints 判断：

- `烟雨` 更像 base atmosphere
- `竹影` 更像 accent motif
- `有一点` 更像 base-accent-split cue

### Step 3: Field Analysis

field analysis 可能认为：

- `overallImpression` 有证据
- `patternTendency` 有证据
- `arrangementTendency` 也可能被轻度触发

但这还不是最终状态，只是结构化证据。

### Step 4: Planning

planner 不会直接问：

- `patternTendency` 是什么

而会把这些证据转成 comparison：

- 保烟雨的空气
- 还是让竹影更清楚

### Step 5: Compiler

用户选择之后，compiler 再把这些偏好统一折叠进：

- `impression`
- `pattern`
- `presence`
- `constraints`

这就是为什么：

- retrieval 不负责最终分类
- routing 不等于 field analysis
- field analysis 不等于 compiler

---

## 16. 最终回答

如果问：

> retrieval 层处理区分 `poetic-atmospheric` / `explicit-motif` 吗？谁在判断哪个词落入什么维度？

最准确的回答是：

- retrieval 层不负责最终区分 `poetic-atmospheric` / `explicit-motif`
- 这一步由 interpretation / routing 层负责
- “哪个词落入什么维度”也不是 retrieval 单独决定，而是多层协作：
  - retrieval 决定它像哪些候选
  - routing 决定它在整句里扮演什么语义角色
  - field analysis 决定它对哪些结构化字段形成证据
  - compiler 决定这些证据最后统一写回哪个 canonical state

一句话收束：

> retrieval 找相似项，routing 判解释路径，field analysis 判结构化证据，compiler 做统一收口。
