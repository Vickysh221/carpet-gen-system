# Intent System + Frontstage Interaction Refactor Plan

Date: 2026-04-03
Project: carpet-gen-system
Status: strategic refactor proposal

---

## 0. Executive Summary

当前系统已经不是“再补几个规则、再修几个 case”就能自然长好的阶段。

它已经暴露出两个结构性问题：

1. **后台语义机制正在快速复杂化**
   - poetic semantic layer
   - explicit motif preservation
   - semantic retrieval bridge
   - negation handling
   - imagery-preserving fallback
   - visual intent compiler

2. **前台交互仍然停留在“会说话的 intake form”阶段**
   - 问答驱动
   - 预设问题可见
   - 用户一边自由表达，一边被要求回答结构化问题
   - 前台节奏与后台真实意图识别机制并未完全对齐

因此，建议不再继续沿着 patch-based intake 演化，而是做一次**基于现有资产的结构性重构**：

> **从 patch-based intake 升级为 routing-based interpretation，**
> **从 talking intake form 升级为 curated showroom exploration。**

这不是推翻重写。
这是一轮“把已经验证有效的东西重新排线”的重构。

---

## 1. Why a refactor is needed now

### 1.1 The system is no longer simple enough for linear intake

当前输入已经明显不是单一路径：
- 诗性表达
- 明确物像
- 否定/约束表达
- 混合型表达
- 模糊偏好表达
- vivid but unregistered imagery

但系统仍然残留大量“统一 intake 后再补规则”的习惯。

这导致的问题不是单个 case 不准，而是：

- 不同 query type 被同一种 intake skeleton 处理
- 前台问话像在收集表单字段
- 后台却已经变成多通道路由 + compiler
- 新增一个能力，就要在多个层里打补丁

这类系统会越来越难维护，也越来越难解释。

---

### 1.2 Frontstage interaction is misaligned with backend semantics

当前前台模式的问题，不是语气不够好，而是**交互隐喻错了**。

即使把回复文案写得更像“设计顾问”，用户体感仍然会觉得：
- 一边像在聊天
- 一边像在答题
- 一边又看到系统在提预设问题

这会制造一种根本性的割裂：

> 我到底是在被理解，还是在被系统采样？

而后台实际上已经不再只是“问三个问题收槽位”的系统。
它已经在做：
- semantic recognition
- semantic routing
- retrieval augmentation
- motif preservation
- compiled generation control

所以前台不能继续用旧的问答骨架去包装一个已经复杂化的语义系统。

---

### 1.3 Patch accumulation is becoming a structural smell

近期新增或讨论中的 patch，包括但不限于：
- poetic semantic layer wiring
- explicitMotifs
- motifTraces
- retrieval bridge
- negation hard block
- query-derived fallback
- semantic trace acceptance updates

这些 patch 单独看都有理由。
问题在于，它们已经开始跨层相互牵动：
- retrieval patch 影响 compiler
- negation patch 影响 candidate handling
- explicit motif patch 影响 semanticSpec / prompt adapter
- fallback patch 影响 follow-up planner
- debug acceptance patch 又要跟着改

这说明：

> 当前问题已经不是“局部修补”，而是“系统主流程需要重新定义”。

---

## 2. Product principle: open input, bounded interpretation

这应该成为接下来所有重构的总原则。

### 2.1 What should remain open

在地毯生成场景里，用户输入应该继续保持开放。
用户完全可以说：
- 烟雨
- 月白风清
- 下雨前五分钟的空气
- 花叶意向
- 荷花在风里摇曳
- 不要太花
- 不是金尊也不是锦
- 更像薄纱后面的光

这是产品价值的一部分，不应该退回“只能选标签”。

---

### 2.2 What must be bounded

虽然输入开放，但系统不应假装可以无限理解。
它必须把开放表达收进一个**有限的设计语义空间**。

建议的 bounded interpretation space：

- **atmosphere**
- **color / palette relation**
- **pattern behavior**
- **motif trace / explicit motif**
- **presence**
- **arrangement**
- **constraints / anti-directions**

也就是说：

> 用户可以自由说，
> 但系统不能自由乱懂。

---

### 2.3 Why this is especially valid for carpet generation

地毯图样不是精确叙事图像，也不是一物一图。
它更接近：
- surface pattern language
- atmosphere made material
- motif abstraction
- trace / rhythm / silhouette / field behavior

所以用户说“雨”“帆”“光”“花叶”，
很多时候并不是在要求 literal depiction，
而是在借这些词表达：
- 组织方式
- 轮廓残留
- 存在感
- 光感
- 边界
- 节奏

因此，地毯生成比很多其他生成任务更适合：

> **open input + bounded interpretation**

---

## 3. Diagnosis of the current system

### 3.1 What is already strong

当前系统已经建立了一批非常有价值、且应保留的资产：

- poetic semantic layer 接入主链
- semanticCanvas / slot / confidence 的主链整合
- visual intent compiler
- explicit motif preservation 的方向
- semantic retrieval helper / bridge
- pattern-first / no perspective / seamless 的生成约束
- Midjourney prompt 降级为 adapter 而不是 source of truth

这些都不该推翻。

---

### 3.2 What is structurally weak

当前弱点主要不在“有没有功能”，而在“功能是如何被组织的”。

#### Weakness A — query types are mixed together too early

系统现在还存在一种倾向：
把所有表达先投入统一 intake，然后在过程中补区别。

但现实是：
- poetic atmospheric query
- explicit motif query
- negation query
- mixed query
- vague query

这些输入不该共享同一个 early-stage decision skeleton。

---

#### Weakness B — question planning lags behind semantic recognition

当前问话逻辑仍然残留旧阶段影子：
- 像在继续收信息
- 像在追预设问题
- 不够 query-type-aware
- 有时没有真正顺着识别出的 semantic split 问

结果是：
- 后台在做复杂识别
- 前台却仍像单通道问答

这会让系统显得“内部很复杂，外部却不自然”。

---

#### Weakness C — frontstage interaction metaphor is wrong

当前用户体验依然接近：
- 问答机器人
- 表单式引导
- 可见预设问题 + 自由输入并置

这与品牌调性、产品目标和实际语义机制都不完全匹配。

它使系统很难体现：
- 诗性
- 审美判断
- 辨认过程
- 比较式收窄
- spatial/showroom-like exploration

---

## 4. Refactor direction: routing-based intent architecture

建议将当前主流程重构为：

> **query-type-aware routing -> path-specific interpretation -> unified compiler**

而不是：

> unified intake -> exception patches -> compiler

---

### 4.1 Proposed top-level query types

#### Type A — Poetic Atmospheric
例子：
- 清明时节雨纷纷
- 薄纱后面的光
- 雪地与天空没有分界线
- 下雨前五分钟的空气

主更新目标：
- atmosphere
- color
- renderingMode
- atmosphericPattern
- presence behavior

---

#### Type B — Explicit Motif
例子：
- 花叶意向
- 孤帆
- 荷花在风里摇曳
- 水波纹慢慢散开

主更新目标：
- explicitMotifs
- motifTraces
- motif visibility
- structuralPattern
- anti-literal rendering choice

---

#### Type C — Constraint / Negation
例子：
- 不要太花
- 不是金尊也不是锦
- 不要酒店大堂感
- 不要儿童房那种可爱花花草草

主更新目标：
- anchor suppression
- blocked motifs/styles
- anti-directions
- contrastive alternatives

---

#### Type D — Mixed / Compositional
例子：
- 烟雨里有一点竹影
- 月白底上浮一层水波
- 花叶意向，但不要大朵花

主更新目标：
- base vs accent
- coexisting motif + atmosphere
- composition priorities
- routing disambiguation

---

#### Type E — Vague / Underspecified Preference
例子：
- 高级一点
- 自然一点
- 柔一点
- 还不确定

主更新目标：
- preserve openness
- identify highest-value split
- ask narrowing questions without fake certainty

---

### 4.2 Why routing should happen early

如果不先做 early routing，系统就会继续出现：
- 用 poetic path 处理 literal motif
- 用 motif path 处理 vague mood
- 用 ordinary retrieval 处理 negation
- 用 generic fallback 处理 vivid but unregistered imagery

结果就是：
- 解释不稳定
- follow-up 不自然
- patch 越来越多

所以 routing 应该在 unified slot accumulation 之前就发生。

---

## 5. Refactor direction: frontstage should become a curated showroom

这是本次重构的另一半，不能只改后端。

### 5.1 What should be abandoned

建议逐步废弃以下前台形态作为主交互：
- 用户一进来就被提问
- 预设问题与自由输入并排存在
- 同时显示“系统正在问什么”和“系统理解了什么”
- 让用户感觉自己在配合系统填表

这些方式即使可用，也不再是最适合当前产品的形态。

---

### 5.2 New frontstage metaphor

建议将产品前台主隐喻重构为：

> **virtual carpet showroom / curated motif gallery**

或者更准确地说：

> **一个被策展过的地毯意向陈列空间**

用户不是来回答问题的，
而是来“边看边辨认自己更靠近什么”。

agent 不是问答助手，
而是：

> **设计顾问 / 审美策展人 / 导览者**

它的职责不是把用户分类，
而是帮助用户：
- 看见差异
- 命名差异
- 保住感觉
- 缩小分叉

---

### 5.3 Why showroom is better than Q&A for this product

#### A. It naturally accommodates uncertainty
用户一开始完全可以“不知道自己要什么”。
showroom 模式允许：
- 边看边想
- 用比较表达偏好
- 先说“不像哪个”，再说“更像哪个”

#### B. It naturally accommodates poetry
诗性并不是系统底层暗自运行的一层，而应该成为用户一进入就能感知到的品牌气质。
showroom / exhibition 的空间语义，比问答机器人更容易承载这一点。

#### C. It matches carpet as a material/design object
地毯适合：
- 同一 motif 的多个变体
- 同一 atmosphere 的不同 materialization
- 同一结构骨架的不同 presence / density / palette

这正是陈列比问答更强的地方。

---

## 6. Proposed frontstage interaction model

### 6.1 Layer 1 — Entrance / worldbuilding

入口不先提问，而先建立期待：

- 这不是参数面板
- 这不是风格测试题
- 这是一个虚拟地毯陈列室 / 图案意向展厅
- 你可以带着模糊感觉进来
- agent 会陪你一起辨认你更靠近哪一种图案语言

这个入口要明确传达“诗性是设计调性，不是系统彩蛋”。

---

### 6.2 Layer 2 — Curated comparison display

前台主交互不应是问题列表，而应是可比较的陈列单元。
在重构早期，这些陈列单元**不必依赖即时生图能力**，可以先用：
- curated text cards
- textual comparison descriptions
- static swatches / archived samples
- prebuilt motif variation references

也就是说，第一阶段应优先验证“比较—辨认—收窄”的交互骨架，而不是被动态生成能力卡住。
只有当这一骨架成立之后，再逐步接入更强的视觉生成或变体展示。

建议的展示单位：

#### Unit A — same motif, different atmosphere
例如同一 botanical skeleton，展示：
- mist-softened
- crisp-light
- dusk-muted
- quiet-warm
- high-haze
- directional-flow

#### Unit B — same atmosphere, different motif trace strength
例如同一 humid quiet field，展示：
- no motif trace
- faint floral trace
- stronger leaf silhouette
- visible lotus-petal rhythm

#### Unit C — same direction, different presence
例如同一 palette + pattern family，展示：
- blended
- softly noticeable
- focal

用户不需要先组织语言，
可以先通过比较表达：
- 更像这个
- 这个太实了
- 这个气氛对，但 motif 太明显
- 这个颜色对，但存在感太强

---

### 6.3 Layer 3 — Composition proposals + refinement prompts

这里不应再把用户交互理解成“二选一确认问题”。
更准确的目标是：

> 系统先把已经识别到的意向编排成几种**可成立的融合方案**（composition proposals），
> 再邀请用户继续调重心、调比例、调进入方式。

也就是说，前台不应默认追问：
- 你到底要空气还是要痕迹？
- 你到底要潮气还是要边界？

而应更像：
- 我先把你这句话里已经成立的几层东西编成 2–4 种可行方案
- 用户选择“更像哪一种成立方式”
- 或者进一步说“我想要 A 的轻和 B 的结构，但不要 C 那么满”

因此，这一层更适合产出：

#### A. Interpretation snapshot
先把当前已识别到的高价值语义抬到前景，例如：
- 海边空气的亮和留白
- 柠檬叶那一点清绿苦感
- 香气更像漂在空气里，而不是立成对象

#### B. Composition proposals
不是参数轴，不是标签选项，而是几种意向如何一起成立的方案，例如：
- 空气主导，痕迹轻轻浮着
- 痕迹在，但已经被空气揉开
- 两者都在，但通过留白和节奏托住，不让任何一层太满

#### C. Refinement prompt
最后再邀请用户继续细化，例如：
- 这几种里哪一种更像你？
- 或者你想把哪两种混在一起？
- 你可以直接顺着这些词继续说：你更想让哪一层再多一点、再轻一点、再退后一点

这意味着：
- 前台不是在逼用户二选一
- 而是在帮助用户把多个意向融合成更准确的图样成立方式

所以，这一层的职责不是普通 confirmation，
而更接近：

> **composition refinement / 意向融合 / 方向编排**

问话如果出现，也必须从这些 composition proposals 中自然长出来，
而不是系统自己抽一道题给用户做。

---

## 7. Role redesign for the agent

agent 的身份应该重新定义。

### 7.1 What the agent should not be

- 不是表单式 intake assistant
- 不是强行分类器
- 不是“我已经理解你”的全知型专家
- 不是一轮轮追问字段的系统代理

---

### 7.2 What the agent should be

> **一个在虚拟地毯陈列室里陪用户辨认图案意向的策展人 / 设计顾问。**

它的工作是：
- 做有判断的回显
- 提出最关键的分叉
- 用对比帮助用户辨认
- 在不确定时诚实收窄，而不是装懂
- 把诗性转译成可落地的图案语言

---

## 8. Proposed internal system flow

### Stage 1 — Input ingestion
接收：
- free text
- display selections
- comparisons
- rejection / preference edits

### Stage 2 — Query-type routing
识别本轮输入主类型：
- poetic atmospheric
- explicit motif
- negation/constraint
- mixed
- vague

### Stage 3 — Path-specific interpretation
按 path 更新不同语义层：
- atmosphere path
- motif path
- suppression path
- compositional path
- narrowing path

### Stage 4 — Canonical intent update
统一写回：
- atmosphere
- palette
- pattern
- motif traces
- presence
- arrangement
- constraints
- unresolved split

### Stage 5 — Compiler
产出：
- semanticSpec
- generation controls
- debug traces
- prompt adapters
- display variants

### Stage 6 — Frontstage response planner
不再只生成一句问话，
而是同时决定：
- 给用户看哪一组陈列
- 当前最值钱的比较维度是什么
- 本轮是否需要问问题
- 如果要问，问哪一种 split

---

## 9. Design implications for the UI

### 9.1 What should move to the background

以下内容应更多留在内部或开发态：
- 预设问题的显式展示
- slot 字段名
- compiler status 朗读
- intake state panel 作为前台主视图

---

### 9.2 What should move to the foreground

前台应更突出：
- 陈列对比
- motif-based variant groups
- atmosphere-based comparison sets
- “更像这个 / 不像那个”交互
- agent 的导览式语言
- 简短而有判断的回显

---

### 9.3 The role of cards / draw mechanics

“抽卡”可以作为次级机制，而不是主隐喻。

适合的用法：
- 首轮探索给出 3 张方向卡
- 给出 motif seed / mood chamber / field behavior 三张比较卡
- 用于降低首次进入门槛

不适合的用法：
- 把整个产品做成随机游戏
- 让用户觉得意向理解只是抽签

---

## 10. Migration strategy

不建议大爆破重写。
建议分三阶段迁移。

### Phase 1 — Architectural cleanup
目标：先让后台主线变干净

实施项：
- 正式引入 query-type routing layer
- 将 negation / explicit motif / poetic atmospheric / vague fallback 分开处理
- 保持 compiler 作为统一出口
- 对 retrieval bridge 的 effect tracing 做类型化标注

产物：
- refactored intent flow 文档
- query-type-aware test bundle
- updated debug acceptance standard

---

### Phase 2 — Frontstage decoupling from preset Q&A
目标：先把“预设问题可见”降级

实施项：
- 前台移除显式预设问卷结构
- 改成 summary + comparison + one high-value prompt
- follow-up planner 改为 type-aware question planner
- 引入“小样对比而不是题目列表”

产物：
- 新的对话/展示组件规范
- curated comparison prototypes

---

### Phase 3 — Curated showroom experience
目标：完成主隐喻升级

实施项：
- entrance / onboarding worldbuilding
- motif gallery / comparison grids
- atmosphere variation chambers
- selection + free-text combined interaction
- agent 作为导览/策展角色正式前景化

产物：
- frontstage interaction spec
- showroom UX prototype
- new multi-turn examples

---

## 11. What should NOT be done

### 11.1 Do not continue endless case-by-case patching as the main strategy
case 可以继续收集，
但它们应成为：
- routing tests
- mechanism tests
- failure exemplars

而不是无限增长的 if/else 列表。

---

### 11.2 Do not swing back to rigid preset-question UX
这会短期看似更稳，
但会直接破坏这个产品最有价值的部分：
- 用户能自由表达
- 系统能把自由表达转成设计判断

---

### 11.3 Do not pretend the agent fully understands every poetic input
更好的策略是：
- 诚实回显当前理解
- 给出最关键分叉
- 让用户在比较中继续辨认

---

## 12. Recommended immediate next deliverables

### Deliverable A — Technical refactor brief
一份给开发/agent 的 technical brief，内容包括：
- query-type router
- path-specific interpretation
- type-aware question planner
- unified compiler contract

### Deliverable B — Frontstage interaction spec
一份给产品/设计的 spec，内容包括：
- showroom metaphor
- entrance copy principle
- comparison unit types
- agent response role
- display vs question priority

### Deliverable C — Example interaction bundle
至少做三类多轮示例：
- poetic atmospheric path
- explicit motif path
- comparison-led showroom path

### Deliverable D — Refactor test bundle
建立新的 acceptance bundle，覆盖：
- routing correctness
- follow-up correctness by query type
- comparison-display coherence
- semantic compiler stability

---

## 13. Final judgment

当前系统最根本的问题，不是“还缺几个规则”，而是：

> **系统主线需要从 patch-based intake 升级为 routing-based interpretation，**
> **前台交互需要从 talking intake form 升级为 curated showroom exploration。**

如果只继续补规则，系统会越来越像：
- 内部复杂，外部别扭
- case 越修越多
- 问话越来越不自然
- 维护成本不断上升

如果按这份方案重构，系统会逐渐变成：
- 输入开放，但解释收敛
- 后台机制与前台体验一致
- 用户不是在答题，而是在被导览着辨认偏好
- 诗性不只是 retrieval 层能力，而是整个产品世界观的一部分

这才是 carpet-gen-system 更稳、更自然、也更有品牌性的方向。
