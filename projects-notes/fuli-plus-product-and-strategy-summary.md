# Fuli Plus — Product & Strategy Summary

## One-line product description

**Fuli Plus 是一个把用户偏好反馈逐步压成可更新设计状态，并用 FULI 真实资产作为参考语义层的地毯设计探索系统。**

它不是单纯图库检索，也不是一句 prompt 直接生图，而是一个 human-in-the-loop 的设计闭环：

- 初始化 design state
- 生成候选变体
- 收集 like / dislike / compare
- feedback → evidence
- reducer 更新 state
- 继续探索 / 收敛

---

## Core product goal

系统要解决的不是“如何一次性出很多图”，而是：

1. 如何把审美反馈变成结构化设计信号
2. 如何让偏好逐轮收敛，而不是每轮重新开始
3. 如何让 FULI 真实产品资产变成可计算、可匹配、可参考的设计语义资产

---

## Core product structure

### 1. Design state as center
系统核心对象不是 prompt，而是 **design state**。

当前状态结构：
- first-order: `color` / `motif` / `arrangement`
- second-order: `impression` / `style`

### 2. First-order vs second-order separation
#### First-order
直接驱动主要可见变化：
- color
- motif
- arrangement

#### Second-order
不是同权可视滑杆，而是调制层：
- impression
- style

### 3. Reducer as evidence-based update
Reducer 不是简单平均，而是：
- feedback
- evidence
- operator
- state update

当前 reducer operator 框架：
- `keep`
- `narrow`
- `reverse`
- `expand`

### 4. Human-in-the-loop exploration
系统当前的产品逻辑是：
- 先探索
- 再收敛
- 在探索与收敛之间逐轮切换

---

## Important strategy decisions

### A. Physical Product Layer is a constraint layer
真实产品实现层不直接进入主搜索闭环，避免把“可制造约束”混成“用户审美偏好”。

### B. MVP does not expand slot count first
MVP 阶段先不继续加 slot，优先保证：
- 子参数有代表性
- 参数之间有差异性
- reducer 与归因不被混层破坏

### C. FULI assets are semantic design assets, not just image inventory
`public/products` 和后续扩展资产被视为：
- 可标注
- 可匹配
- 可承担 reference / anchor / evaluation 角色
的设计资产层。

### D. Simulator-first before real generation
在接入真实生图模型之前，先把以下闭环跑通：
- 随机 base state
- variant generation
- like / dislike
- reducer update
- anchors 保留
- final selection

---

## Current strategic understanding

当前系统的主要难点已经从：
- 图片有没有接进来
- UI 有没有显示出来

转移到：

### 1. Retrieval / matching strategy
特别是 early rounds：
- 不能过早收敛到少数几张图
- 不能只做局部 nearest
- 需要 exploration-biased retrieval

### 2. Preference accumulation
系统需要区分：
- 当前 base state 像谁
- 用户已经提交的偏好方向像谁

### 3. Exploration vs convergence scheduling
前几轮更偏 exploration，后续再逐步进入 convergence。

---

## Current product-facing UI concepts

当前 simulator 中有三个重要 reference 对象：

### Base ref
回答：当前系统状态像谁

### Preference ref
回答：已提交的偏好方向像谁

### Variant matched ref
回答：当前候选变体像谁

其中：
- `Preference ref` 只在点击“继续生成下一轮”后更新
- 不会在当前 round 的点击过程中实时跳动

---

## Current matching philosophy

### Stable mode
偏向局部最近邻，适合收敛阶段。

### Explore mode
加入 novelty / seen-ref penalty，适合探索阶段。

### Auto mode
作为默认模式：
- early rounds 更 explorative
- later rounds 再逐步转稳

---

## What still needs to improve

1. early-round exploration 还不够展开
2. matching 仍容易局部塌缩到少数图
3. extended assets 进入 matching space 的密度仍不足
4. 需要从 per-variant nearest 继续升级到 round-level exploration set retrieval

---

## Next strategic direction

下一阶段最重要的方向不是继续小修 UI，而是：

### Round-level exploration set retrieval
尤其前两轮，不再让每张 variant 各自独立找最近邻，而是：
1. 先取一批相关候选
2. 再从中做 diversity selection
3. 构造一组 genuinely spread-out 的 exploration refs

这会让系统在 early rounds 更像真正的 search，而不是过早 settle。
