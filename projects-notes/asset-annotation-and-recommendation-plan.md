# Asset Annotation & Recommendation System Plan

## 1. Why this phase exists

在新机制（dimensional probing / anchored possibility exploration）站稳之后，下一阶段的核心任务不是继续单纯扩图库，而是：

**把更多真实图片升级成可进入推荐系统、可承担不同推荐角色的语义资产。**

这一步的目标不是“让库更大”，而是：
- 让系统有更多可被调用的语义锚点
- 让 early-round probing 真正有更多方向可展开
- 让 mid / late round recommendation 不只靠少量核心图反复承担

---

## 2. Product goal of asset annotation

标注更多图片，不是为了静态归档，而是为了让这些图进入以下三个推荐场景：

### A. Probing recommendation
用于 early rounds。
目标：给用户展示不同方向的可能性，而不是局部近邻。

### B. Preference recommendation
用于偏好形成中的中期阶段。
目标：帮助系统理解用户逐渐显现的偏好中心。

### C. Convergence recommendation
用于后期收敛。
目标：围绕已形成的偏好方向做更稳、更贴近的推荐。

因此，图片标注最终要服务于：
**recommendation by role**，而不仅是 recommendation by similarity。

---

## 3. Three-layer asset structure

后续图片不要一口气平铺进入系统，而要分成三层：

## Layer 1 — Anchor Assets
### Role
系统的核心语义锚点。

### Suggested size
20–40 张。

### Selection rule
优先挑能明显代表不同分叉方向的图：
- 深色 / 浅色
- 几何 / organic
- centered / border / all-over / field
- solid / textural / complex
- calm / energetic
- graphic / painterly / heritage

### Requirement
这层必须标得最认真，因为它决定系统的方向骨架。

---

## Layer 2 — Support Assets
### Role
填充每个方向内部的细分差异。

### Suggested size
40–80 张。

### Selection rule
不是继续扩新大类，而是补方向内部的连续变化：
- 深色几何内部的不同秩序感
- organic 内部的不同密度与流动性
- border 类内部的不同层级与边界处理
- texture-heavy 内部的不同复杂度

### Requirement
可比 anchor 粗一些，但仍要保证基本可用。

---

## Layer 3 — Long-tail Assets
### Role
大范围补充、召回、后续长尾探索。

### Suggested size
剩余更多图。

### Requirement
可先粗标、继承式标注、半自动标注。
不要一开始就把它们和 anchor 层同等对待。

---

## 4. Annotation fields by priority

## Level A — First-order fields (must-have first)
第一阶段先标：
- `color`
- `motif`
- `arrangement`

原因：
这三层最直接决定：
- probing 方向
- hypothesis carrier selection
- early retrieval / recommendation 的主要分叉

---

## Level B — Second-order fields (add after Level A stabilizes)
第二阶段补：
- `impression`
- `style`

原因：
这部分更适合：
- 用户语言映射
- preference ref 解释
- 中后期推荐细化

---

## Level C — Role fields (important for recommendation)
第三阶段补：
- `roles`
- `strongSlots`
- `probeSuitability`
- `preferenceSuitability`
- `convergenceSuitability`

原因：
未来推荐系统不应只问“像不像”，还应问：
- 这张图适不适合做 probing carrier？
- 适不适合做 preference anchor？
- 适不适合做 convergence ref？

---

## 5. Recommendation-oriented role model

建议后续至少引入三种 role：

### 1. `probe-carrier`
适合在 early-round 用来承载 keep / vary hypothesis。
特征：
- 分叉明显
- 方向性强
- 可读性高

### 2. `preference-carrier`
适合在偏好逐渐形成时承载 preference ref。
特征：
- 方向稳定
- 语义清楚
- 容易被用户认出“我在往这个方向走”

### 3. `convergence-carrier`
适合在后期做更稳的收敛推荐。
特征：
- 不需要太有张力
- 但要和 preference center 高相关

同一张图可以有多个 role，但不能默认每张图在每个阶段都同样适合。

---

## 6. Recommendation system: future scoring dimensions

后续推荐系统不应该只有一个 similarity score，而应该逐步变成多目标选择：

### A. Relevance score
和当前 state / preference center 的相关度。

### B. Diversity score
和同轮其他候选的差异度。

### C. Role suitability score
这张图在当前阶段是否适合承担这个角色。

### D. Freshness / history score
是否已经出现过太多次；是否已被 dislike。

即：
**recommendation = relevance + diversity + role + history constraints**

---

## 7. Immediate execution order

在新机制站稳之后，推荐按以下顺序推进：

### Step 1
先挑一批 Anchor Assets（20–40 张）

### Step 2
先只做 first-order annotation：
- color
- motif
- arrangement

### Step 3
给这批 anchor assets 加简单 role：
- probe-carrier
- preference-carrier
- convergence-carrier

### Step 4
先只让这批 anchor assets 进入新推荐机制

### Step 5
验证：
- probing 阶段是否更开
- preference 阶段是否更稳
- convergence 阶段是否更像收敛

### Step 6
再逐步加入 support assets

---

## 8. Immediate next sub-task

### First concrete sub-task
从现有扩展资产中挑一批 20–40 张 **anchor assets shortlist**。

### Selection criteria
优先挑：
- 黑 / 深色代表图
- 浅色 / neutral 代表图
- 强几何代表图
- organic / flow 代表图
- border / centered 代表图
- solid / minimal 代表图
- texture-heavy / complex 代表图
- energetic / playful 代表图

### Output form
建议先形成：
- 一份 shortlist 文件
- 一份每张图的 first-order annotation 表
- 一份 role 初判表

---

## 9. Core product principle to keep in mind

后续标图时，不要只问：
- 这张图属于什么风格？

更重要的问题是：

**这张图在系统里适合扮演什么推荐角色？**

比如：
- 它是不是很好的 probing carrier？
- 它是不是很适合承载 preference ref？
- 它是不是虽然好看，但不适合作为 early-round 的探索锚点？

只有这样，标注才真正服务推荐系统，而不是只服务资产归档。

---

## 10. Current conclusion

这一步的目标不是“让库变大”，而是：

**建立一个按角色分层、按阶段调用、可持续扩展的推荐资产系统。**

也就是说：
- 先建高质量 anchor layer
- 再建 support layer
- 再让推荐系统按阶段调用不同角色的资产
