# System Layering PRD

Date: 2026-04-04
Project: carpet-gen-system
Status: PRD / implementation-alignment brief

Related:
- `docs/system-layer-boundaries-and-semantic-roles-2026-04-04.md`

---

## 1. Background

当前 carpet-gen-system 已经不再是一个单纯的文本 intake + prompt 拼接系统。

现有能力已经包括：
- poetic semantic layer
- explicit motif preservation
- semantic retrieval helper / bridge
- negation handling
- imagery-preserving fallback
- visual intent compiler
- simulator-side frontstage experimentation

问题不在于“没有能力”，而在于这些能力当前还没有被稳定地分层。

结果是：
- retrieval 被期待承担 interpretation / planning 的职责
- planner 仍带有旧式 gap-questioning 骨架
- frontstage 同时承担问答、展示、debug 三种角色
- compiler 虽然相对稳定，但上游职责边界不清

因此，下一阶段的首要任务不是继续加模型或补 case，
而是：

> 先把系统分层，明确每层职责、输入输出和接口边界。

---

## 2. Problem Statement

当前系统的核心问题是职责混杂：

1. **Retrieval layer**
   - 本应只负责“开放输入 -> 候选集合”
   - 但实际上常被期待去承担理解、路由、前台 comparison 生成等职责

2. **Interpretation logic**
   - 目前更多隐含在 detection / semanticCanvas / merge / gap planning 中
   - 还没有被正式提升为独立的 query-type-aware routing + interpretation layer

3. **Planning logic**
   - 仍偏向“系统下一句问什么”
   - 尚未稳定升级为“给用户看什么比较 + 是否要问 + 问哪个 split”

4. **Frontstage**
   - 仍保留 visible preset questions / Q&A 主隐喻
   - 与 showroom / curated comparison 方向不完全一致

5. **Compiler**
   - 已经较稳定，但上游的混杂让 compiler 负担了过多不确定性

---

## 3. Product Decision

下一阶段先不以“接入更强模型”为主目标。

先做：

> **System Layering First**

即优先建立清晰的系统分层：
- Input
- Retrieval
- Interpretation / Routing
- Planning
- Compiler

在这一结构稳定之前：
- 不引入新的核心主模型作为生产依赖
- 不继续以 case-by-case patch 作为主策略
- 不把前台体验优化误解为文案润色

---

## 4. Goals

### Primary Goal
建立清晰、可替换、可调试的系统分层，使后续：
- 模型替换
- retrieval 增强
- frontstage showroom 重构
- planner 升级
- compiler 稳定输出

都能在明确边界内推进。

### Secondary Goal
为后续模型选型提供稳定接口，使模型只被放在适合它的层里，而不是被当作万能黑箱。

---

## 5. Non-Goals

本阶段不追求：
- 完成最终 showroom UI 高保真
- 接入动态生图作为前台主依赖
- 找到一个“万能模型”一把解决所有问题
- 大规模重写 visualIntentCompiler 主 contract

---

## 6. Proposed System Layers

### 6.1 Input Layer
**职责**
- 接收用户文本
- 接收 comparison selection / reject / prefer / edit
- 接收后续补充输入

**不负责**
- 语义理解
- 候选召回
- compiler 写入

**输出**
- normalized user input event

---

### 6.2 Retrieval Layer
**职责**
- 依据原始输入召回候选语义项
- 从有限候选池中给出近邻：
  - poetic mappings
  - explicit motifs
  - opening options
  - comparison library items

**推荐模型/方式**
- bge-m3 或同类 embedding retrieval

**不负责**
- query type 判定
- negation / polarity 最终解释
- planner 决策
- compiler 最终写入

**输出**
- candidate set
- score / source / retrieval trace

---

### 6.3 Interpretation / Routing Layer
**职责**
- 判断 query type：
  - poetic atmospheric
  - explicit motif
  - constraint / negation
  - mixed / compositional
  - vague / underspecified
- 判断语义角色与层级：
  - object vs atmosphere vs constraint
  - base vs accent
  - polarity / suppression
- 形成 path-specific interpretation

**可用模型/方式**
- rules + heuristics first
- later: instruct / reasoning LLM as router candidate

**输出**
- detectedType
- rationale
- semantic role hints
- path recommendation
- interpretation trace

---

### 6.4 Planning Layer
**职责**
- 生成判断性回显（reply snapshot）
- 生成 comparison candidates
- 决定本轮是否需要继续问
- 若需要，生成一个高价值 split question

**关键要求**
- 不是单纯 question planner
- 必须是 display-aware planner
- comparison candidates 可以 text-first
- comparison candidates 必须能回写语义差异，不只是展示文案

**输出**
- replySnapshot
- comparisonCandidates
- whetherToAskQuestion
- followUpQuestion
- planner trace

---

### 6.5 Compiler Layer
**职责**
- 统一消费上游 path-specific interpretation 结果
- 写回 canonical intent state
- 产出 semanticSpec / generation controls / prompt adapters

**关键要求**
- 维持 unified output contract
- 对新增信息优先 additive wiring
- 避免被 planner / retrieval 直接污染

---

## 7. Why this layering matters

### 7.1 For model selection
只有系统分层后，模型选型才有意义：
- embedding 适合 retrieval
- instruct / reasoning model 适合 interpretation / routing
- planner 可以先规则化，再局部接 LLM 润色

否则无论换什么模型，职责都会继续缠在一起。

### 7.2 For UX evolution
只有分层后，frontstage 才能真正从：
- talking intake form
转向：
- curated showroom exploration

因为 planner 才有清晰的位置去决定：
- 展示什么比较
- 问不问
- 先展示还是先追问

### 7.3 For debugability
系统分层后，才能清楚定位问题在：
- retrieval 召回差
- routing 判错
- planner 比较项太像 debug card
- compiler 投影失真

---

## 8. Functional Requirements

### FR-1
系统必须有显式的 layer boundary，至少区分：
- retrieval
- interpretation/routing
- planning
- compiler

### FR-2
query type 必须在 unified slot accumulation 之前被显式判定或提示。

### FR-3
comparison candidates 必须属于 planning 层输出，而不是 retrieval 层的直接展示。

### FR-4
每个 comparison candidate 至少应包含：
- id
- user-facing curated text
- intended split dimension
- semantic delta hint / effect

### FR-5
compiler 接口应保持统一，不因上游分层而被大范围打碎。

### FR-6
frontstage 不应继续让 visible preset questions 占主位。

---

## 9. Implementation Strategy

### Phase 1 — Layer extraction
- 抽出 query routing 模块
- 抽出 comparison-aware planner 输出结构
- 给现有流程加 trace
- 不大改 compiler

### Phase 2 — Frontstage skeleton alignment
- 将前台首轮区域改成 comparison-first
- visible preset questions 降级
- comparison cards 先 text-first

### Phase 3 — Model slotting
- 在 retrieval 层继续使用 bge-m3
- 在 interpretation 层试验 Qwen instruct / reasoning candidate
- 不让新模型直接掌管 compiler final decision

---

## 10. Success Criteria

### System success
- 可以明确看出每层输入输出
- routing 结果可被 trace
- planner 产出 comparison candidates 不再只是标签词
- compiler 保持 build/test 稳定

### UX success
- 首轮体验不再以 visible Q&A 为主
- comparison cards 成为前景
- 用户可通过“更像这个 / 不像这个”推进，而不是先组织完整回答

### Architecture success
- 可以单独替换 interpretation layer 模型，而不破坏 retrieval / planner / compiler contract

---

## 11. Open Questions

1. query routing 第一版是否完全规则化，还是从一开始就留 LLM 接口？
2. comparison candidate 的 semantic delta 是否由 planner 直接给出，还是由 comparison library item 挂载？
3. frontstage 在 simulator 中是直接替换现有结构，还是先以实验区并存？

---

## 12. Final Decision

下一阶段先做系统分层，不先追求模型升级。

核心原则：

> **先把系统拆清，再谈哪个模型放哪一层。**

这一步完成后，再讨论：
- 是否引入更强 instruct/reasoning 模型
- 是否替换 interpretation layer
- 是否扩大 retrieval candidate pool
- 是否进一步升级 showroom interaction
