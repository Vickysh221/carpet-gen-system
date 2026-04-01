# carpet-gen-system — Development Summary

## Project focus

当前 `carpet-gen-system` 的开发重点不是立刻接真实生图，而是先建立一个可解释、可更新、可继续迭代的 simulator sandbox。

核心目标：
- 跑通 state → variants → feedback → reducer → next state
- 把 FULI 真实资产接进 reference system
- 让 matching / exploration / preference accumulation 开始可观察

---

## Major implemented milestones

### 1. Simulator sandbox established
已建立独立 simulator 模块，不再继续把新逻辑塞进 `App.tsx`。

核心文件包括：
- `src/features/simulator/types.ts`
- `src/features/simulator/mockEngine.ts`
- `src/features/simulator/SimulatorPage.tsx`
- `src/features/simulator/SimulatorSandbox.tsx`
- `src/features/simulator/ontology.ts`

### 2. Minimal simulator loop completed
已实现：
- 随机 base state
- 4 张变体卡
- like / dislike
- continue 进入下一轮
- liked anchors 保留
- final 选择

### 3. Ontology-first simulator logic
已按 ontology 开始落实：
- 一阶参数：`color` / `motif` / `arrangement`
- 二阶参数：`impression` / `style`
- `applyMetaInfluence()` 让二阶参数调制一阶趋势
- round 分为 `direct` / `modulated`

### 4. Asset engineering skeleton
已建立：
- asset types
- matching
- annotation strategy
- mock / real asset entry
- generation spec skeleton

---

## Real asset pipeline progress

### 1. Main FULI asset registry
真实素材目录：
- `public/products`

已建立主 registry：
- `src/core/assets/generated/productAssetIndex.json`
- `src/core/assets/productAssetIndex.ts`

并新增更新脚本：
- `tools/build_product_asset_index.py`
- `npm run assets:index`

### 2. Extended asset downloads
已从 `https://fuli-plus.com/product` 抓取扩展图片，并修复过一次错误抓取逻辑。

当前正确扩展目录：
- `public/products-extra-fixed`

对应索引：
- `src/core/assets/generated/productAssetExtraFixedIndex.json`
- `src/core/assets/productAssetExtraFixedIndex.ts`

### 3. Seed shortlist and preannotation
已建立：
- `src/core/assets/seedShortlist.ts`
- `src/core/assets/seedPreannotations.ts`

用途：
- core semantic reference layer
- 第一批手工/辅助校正入口

### 4. Extended simplified preannotation batch 1
已建立第一批扩展粗标注：
- `src/core/assets/extendedPreannotationsBatch1.ts`

目的：
- 让部分 extended assets 进入 matching space
- 扩大 early retrieval coverage

---

## Current asset layer structure

### Core layer
当前主要使用：
- `seedPreannotations`

特点：
- 小规模
- 已带较明确语义标注
- 适合作为当前主要 semantic reference

### Extended layer
当前来自：
- `products-extra-fixed`
- `extendedPreannotationsBatch1`

特点：
- 更大范围
- 一部分已进入 matching
- 其余仍主要作为 retrieval reserve

### Source switching
simulator 中支持：
- `core only`
- `core + extended`

---

## Matching evolution summary

### Phase 1 — simple nearest
最初为简单 first-order euclidean nearest。

### Phase 2 — weighted distance
已将 matching 改成 weighted distance，提升：
- motif.geometry
- motif.organic
- arrangement.order
- arrangement.direction

降低颜色轻微变化的影响。

### Phase 3 — diversity penalty
为同一轮 variant 匹配加入：
- diversity penalty
- near-duplicate penalty

避免所有 variant 都映到同一张或同一小簇。

### Phase 4 — novelty / exploration memory
加入：
- `seenRefIds`
- novelty penalty

让 `explore` 模式不总复读已出现过的 ref。

### Phase 5 — match modes
当前支持：
- `stable`
- `explore`
- `auto`

其中：
- `auto` 前两轮默认更 explorative
- 后续再逐步转稳

---

## Preference and state display strategy

当前已明确区分：

### Base ref
当前系统 state 的参考图

### Preference ref
已提交偏好状态的参考图

### Important timing update
`Preference ref` 不会在当前 round 点击 like/dislike 时实时更新。
它只会在点击“继续生成下一轮”后，基于已提交的 liked anchors 更新。

这是为了避免：
- 当前试探中的点击
- 与已提交偏好
混在一起。

---

## Current diagnosis of remaining problem

虽然做了：
- weighted distance
- diversity penalty
- novelty penalty
- auto early exploration

但当前 early exploration 仍然不够展开。

这说明问题不只是 penalty 大小，而是 retrieval strategy 本身仍偏局部。

### Current conclusion
前两轮需要的不是：
- 每张 variant 各自 nearest with small penalties

而是：
- **round-level exploration set retrieval**

即：
1. 先取一批 relevant 候选
2. 再从中做 diversity selection
3. 构造一组更分散的 exploration refs

---

## Current mechanism freeze point

截至目前，机制可以收束为一个相对稳定的中间版本：

### Mechanism v0.3
关键词：
- staged exploration
- submitted preference
- real asset matching
- constrained reference pool
- soft-avoid / hard-exclude logic

### What is now relatively stable
1. 设计状态分层（first-order / second-order）
2. round-based simulator 闭环
3. Base ref / Preference ref / Variant matched ref 区分
4. Preference ref 延迟到“继续生成下一轮”后才更新
5. weighted distance
6. stable / explore / auto matching modes
7. seen refs soft avoid / disliked refs hard exclude
8. liked cards 历史保留到右侧下方
9. 素材池推进逻辑开始成立

### What is still the key unsolved point
当前最未收束的一点仍然是：
- early-round retrieval 仍偏 per-variant
- exploration 还不够 genuinely spread-out

下一阶段真正值得做的是：
- round-level exploration set retrieval

---

## Important development heuristics learned

1. `SimulatorPage.tsx` 多次出现尾部残片问题，编辑时要格外小心
2. 当前最值得投入的工作，不是继续堆 UI，而是 retrieval strategy
3. 当前系统问题已从“接图和显示”推进到“阶段化探索策略”
4. 对象层必须分清：
   - base state
   - preference state
   - current variant
5. 时序也必须分清：
   - 当前试探中的点击
   - 已提交进入下一轮的偏好

---

## Ongoing update log convention

今后新的关键开发节点，统一补进以下文件：
- 本文件：`projects-notes/carpet-gen-system-dev-summary.md`（保留结构化摘要）
- 产品/策略总览：`projects-notes/fuli-plus-product-and-strategy-summary.md`

建议更新触发条件：
1. 新的产品原则出现
2. 新的 matching / exploration / reducer 机制落地
3. 新的资产层结构变化
4. 新的重大问题诊断完成
5. 新的阶段目标切换

---

## 2026-04-01 — intent question planning refactor snapshot

### Problem diagnosed
intent stabilization 阶段的 `next question` 过于稳定地退回到：
- `overallImpression`
- `contrast-calm-vs-presence`
- 泛化模板问句

典型表现是重复：
- “如果先只收一个大方向，你更想让它整体偏安静放松，还是保留一点存在感和张力？”

这暴露出来的问题不是单纯 LLM 没调用，而是：
1. `semanticGapPlanner` 对 `overallImpression` 偏置过强
2. `slotQuestionSpec` 的 field-level template 过于强势
3. `questionPlanning` 缺少对用户当前 cue 的承接
4. 页面缺少足够 trace，导致难以直接看见为什么这句被选中

### Product principle updated
新的原则不是追求：
- 百分百精确分类

而是追求：
- 尽量把用户表达映射到相对近似的槽位
- 宁可做带误差的近似挂靠，也不要因为不确定就退回抽象总问句

### What changed in code
本轮已落地：

1. **Question trace debug 面板**
   - 在 simulator inspect 中显示：
     - hit field evidence
     - semantic gap ranking
     - question candidates
     - selected gap / selected prompt / deferred targets

2. **Missing-slot priority 调整**
   - 从 impression-first 改为：
     - colorMood
     - patternTendency
     - arrangementTendency
     - overallImpression
     - spaceContext

3. **Anchored field 选择偏置修正**
   - 增加 `cue bonus`
   - 增加 `impression penalty`
   - 避免 impression 靠宽泛解释力吞掉具体线索

4. **Question prompt 改为 cue-grounded 优先**
   - 如果 gap 里有明确 cue，则优先生成承接用户原词的问题
   - 不再优先回退到 field-level 的固定模板

5. **Generic prompt penalty**
   - 对“如果先只收一个大方向……”这类泛化问题降权
   - 让 planner 更倾向选择有具体承接感的问题

### Main files touched
- `src/features/simulator/explainability.ts`
- `src/features/simulator/SimulatorPage.tsx`
- `src/features/entryAgent/semanticGapPlanner.ts`
- `src/features/entryAgent/questionPlanning.ts`

### Documentation added
详细沉淀见：
- `docs/intent-question-planning-refactor-2026-04-01.md`

### Next likely step
下一阶段最值得继续做的是：
- 把 `colorMood / patternTendency / overallImpression` 继续拆成更细的 subgap
- 让 planner 选的是“field 内部缺口”，而不是只选高层 field

---

## 2026-04-01 — intent intake agent formalization

### Strategic shift
意向对话链不再被视为一段零散的 text intake / question planning 逻辑，而被正式升级为一个独立 agent：

- **Intent Intake Agent**

它的身份不是：
- 调试器
- 问卷系统
- 裸露 slot / gap / confidence 的规则链

它的身份应是：
- 朋友式的地毯设计专家
- 意向解读专家
- 帮用户把模糊偏好慢慢收成一个可用 base profile 的 intake agent

### Product-level goal clarified
这个 agent 的任务目标被明确为：

- 在有限轮次内，收集出一个 **可生成的 base preference profile**
- 每个大槽位至少拿到一个 base direction
- 每个大槽位至少有一个主值超过阈值（初始建议 `> 0.5`）

建议的大槽位层为：
- 整体感觉
- 颜色方向
- 图案方向
- 排布方向
- 空间 / 使用场景

### Critical architecture separation
正式要求分清三层：

1. **Internal semantic state**
   - slot / axis / confidence / question family / resolution state

2. **Goal state**
   - 哪些 macro slot 已拿到 base direction
   - 哪些还没拿到
   - 当前是否可以进入下一阶段

3. **Persona renderer**
   - 内部参数化
   - 外部人格化
   - 禁止把 slot / gap / confidence / family 直接暴露给用户

### Important user-facing rule
以下内容未来不应直接出现在用户文案中：
- `colorMood`
- `patternTendency`
- `gap`
- `anchor`
- `question family`
- `confidence 28%`
- `contrast-*`

这些只应留在 debug inspect / internal state。

### Future extensibility requirement
这个 agent 从一开始就不能只为文本写死，因为后续大概率要扩展到：

- **图文双决策链**

因此 intake input 未来应升级成 signal-based abstraction，使以下都能接进同一 agent：
- text utterance
- image like/dislike
- image comparison
- visual cue note

### Documentation added
详细 spec 见：
- `docs/intent-intake-agent-spec-2026-04-01.md`
- `docs/intent-intake-agent-slot-system-v1-2026-04-01.md`
- `docs/intent-intake-agent-dialogue-state-machine-v1-2026-04-01.md`
- `docs/intent-intake-agent-signal-schema-v1-2026-04-01.md`

### Execution order agreed
后续按以下顺序推进：
1. **A. 宏槽位 / 子槽位体系 v1**
2. **B. 对话阶段状态机 v1**
3. **C. 图文双决策链 signal schema v1**

目前 A / B / C 已完成文档沉淀。下一步应开始把现有代码从 text-only intake 改造成 signal-based intake，并逐步引入：
- text signal
- image preference signal
- image comparison signal
- confirmation / control signal
