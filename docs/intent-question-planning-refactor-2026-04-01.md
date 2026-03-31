# Intent question planning refactor — 2026-04-01

## 背景

这轮修改聚焦 simulator 里的 `intent stabilization` / `next question` 链路。

用户侧暴露出来的问题不是“完全没做语义分析”，而是：

- 首轮输入经常被过早压到 `overallImpression`
- 一旦落到 `overallImpression`
- `questionPlanning` 又会回到固定模板
- 最终页面经常重复：

> 如果先只收一个大方向，你更想让它整体偏安静放松，还是保留一点存在感和张力？

这让系统看起来像在“问卷式追问”，而不是顺着用户表达继续逼近。

---

## 这轮的核心判断

系统当前的真正问题不是单点 LLM 没调用，而是：

1. `semanticGapPlanner` 的 field 选择偏向 `overallImpression`
2. `slotQuestionSpec` 的 field-level template 过于强势
3. `questionPlanning` 缺少“顺着最近 cue 继续问”的偏置
4. 页面缺少足够的 trace 信息，导致很难直接看到：
   - hit field 是什么
   - semantic gaps 怎么排
   - selected question 为什么被选中
   - 当前 prompt 是 template 还是 override

因此这一轮的目标不是“让系统百分百精确理解用户”，而是：

> 不管怎样，都尽量把用户表达映射到相对近似的槽位；
> 宁可做带误差的近似挂靠，也不要因为不确定就退回抽象总问句。

---

## 本轮改动总览

### A. 加了 question trace debug 面板

文件：
- `src/features/simulator/explainability.ts`
- `src/features/simulator/SimulatorPage.tsx`

新增内容：
- `selectedGapId`
- `selectedPrompt`
- `selectedBecause`
- `hitFieldEvidence`
- `semanticGapSummaries`
- `questionCandidateSummaries`
- `deferredTargets`

目的：
让页面自己吐出证据，而不是靠外部猜：
- 本轮命中了哪些 field
- evidence / confidence / slotState 是什么
- semantic gap 是怎么排序的
- question candidate 是怎么生成的
- 当前 selected question 为什么赢

---

### B. 调整 missing-slot 默认优先级

文件：
- `src/features/entryAgent/semanticGapPlanner.ts`

从：
- `overallImpression`
- `colorMood`
- `patternTendency`
- `arrangementTendency`
- `spaceContext`

改为：
- `colorMood`
- `patternTendency`
- `arrangementTendency`
- `overallImpression`
- `spaceContext`

目的：
优先把输入挂到更具体、更可操作的槽位；
不要让 `overallImpression` 成为默认第一落点。

---

### C. 给 anchored field 选择加 cue bonus / impression penalty

文件：
- `src/features/entryAgent/semanticGapPlanner.ts`

在 `pickAnchoredMissingField()` 里加入：
- `cue bonus`：如果 reading 带明确 matched cue，则更值得继续追问
- `impression penalty`：如果只是弱 impression anchor，则不要轻易压过 color / pattern / arrangement

目的：
减少 `overallImpression` 靠“宽泛可解释性”吞掉具体线索的情况。

---

### D. 问句生成改为 cue-grounded 优先

文件：
- `src/features/entryAgent/questionPlanning.ts`

新增：
- `buildCueGroundedPrompt()`
- `getPrimaryCue()`
- `quoteCue()`

当前策略：
如果 gap 里有比较明确的 cue，优先生成承接用户原词的问题，例如：

- color:
  - “你说的『X』这层感觉，你更想让颜色本身被看见一点，还是只作为整体气息轻轻带到？”
- motif:
  - “你说的『X』如果先挂到图案这一层，你更像是在回避太碎太花，还是太硬太几何？”
- arrangement:
  - “你说的『X』如果先挂到排布这一层，你更想让它松一点、有呼吸感，还是更整齐一些？”
- impression:
  - “你说的『X』我先把它理解成整体气质线索，你更想让它偏安静松一点，还是保留一点存在感？”

目的：
从“字段模板问答”转向“顺着用户最近 cue 继续问”。

---

### E. generic impression 模板降权

文件：
- `src/features/entryAgent/questionPlanning.ts`

新增：
- `isGenericPrompt()`

对以下类型的 prompt 施加 penalty：
- “如果先只收一个大方向……”
- “如果先只确认一个最关键的缺口……”
- “你更想让它整体偏安静放松……”

同时：
- `questionPromptOverride` 有 bonus
- evidence 中存在明确 cue 的 candidate 有 bonus

目的：
让 planner 更偏向：

> 有承接感的近似追问 > 泛泛的总方向模板

---

## 这轮修改背后的产品原则

### 原则 1
不要把“不够确定”错误处理成“退回抽象模板”。

### 原则 2
系统目标不是做 ontology 洁癖式的百分百精确分类。
系统目标是：
- 把用户表达投影到最近的可操作槽位
- 再通过下一问继续逼近

### 原则 3
如果用户已经给出了可挂靠的 cue，问题必须顺着 cue 继续，不要像问卷一样重新起题。

### 原则 4
`overallImpression` 可以是兜底层，但不应该是所有模糊表达的默认吞噬层。

---

## 当前仍未完成的部分

这轮还是最小可用重构，不是最终版。

还没完成的关键点包括：

1. `field` 内部仍然过粗
   - 现在主要还是 `colorMood / patternTendency / arrangementTendency / overallImpression`
   - 还没有完全拆成更细的 subgap

2. `questionPlanning` 仍主要围绕 gap candidate 做排序
   - 还没有真正形成独立的 `nearest slot projection` scoring layer

3. cue-grounded prompt 目前仍是规则生成
   - 不是最终的 planner-driven question drafting

4. semantic trace 已可见
   - 但还没有沉淀成系统化测试集 / case regression suite

---

## 下一步建议

### Phase 2 — subgap 化
把高层 field 继续拆细，例如：

- `colorMood`
  - identity visibility
  - restraint boundary
  - warmth vs muted
  - literal vs atmospheric

- `patternTendency`
  - complexity avoidance
  - geometry vs organic
  - density / fragmentation

- `overallImpression`
  - calm vs presence
  - softness vs crispness
  - warmth / companionship / restraint

这样 planner 选的就不只是“问哪个 field”，而是“问哪个 field 内部缺口”。

### Phase 3 — nearest-slot projection scoring
新增一层更明确的 scoring：
- cue 到 slot 的近邻分数
- already-covered dimension penalty
- repeated-question penalty
- generic-template penalty
- information-gain bonus

### Phase 4 — case regression
把典型输入沉淀成固定 case，至少覆盖：
- 绿意 / 春意 / 草色
- 咖啡时光
- 张扬 / 快乐
- 自然一点
- 不要太花
- 安静一点 / 别太抢
- 若有若无 / 雾里有色

用于验证：
- hitFields
- selected gap
- question mode
- final prompt

---

## 本轮涉及的主要文件

- `src/features/simulator/explainability.ts`
- `src/features/simulator/SimulatorPage.tsx`
- `src/features/entryAgent/semanticGapPlanner.ts`
- `src/features/entryAgent/questionPlanning.ts`

---

## 一句话总结

这轮修改的本质不是“多写几个模板”，而是把系统从：

> field-template first

往：

> nearest-cue-to-slot first

掰正了一步。
