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
