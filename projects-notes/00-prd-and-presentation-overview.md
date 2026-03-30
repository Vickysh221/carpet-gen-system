# Fuli Plus — PRD & Presentation Overview

> 一个统一入口：既可作为产品定义总览，也可作为对外表达 / presentation 版本的主稿底座。

---

## 1. 一句话定义

**Fuli Plus 是一个把用户模糊审美偏好持续建模为 design state，并通过多轮反馈逐步收敛设计方向的 agentic design system。**

它不是：
- 固定参数调图工具
- 一次性 prompt 生图系统
- 普通图片推荐器

它要做的是：
- 承接模糊感受
- 把感受映射成结构化设计状态
- 通过反馈解释与状态更新持续推进探索
- 最终沉淀为可复用、可解释、可继承的 design state

---

## 2. 它要解决什么问题

传统生成 / 调图系统的问题在于：
- 控制项往往固定、浅层
- 用户必须一开始就“知道自己想要什么”
- 系统更像一次性求解，而不是形成中的偏好建模

Fuli Plus 的核心问题意识是：

### 用户的偏好经常不是预先清楚的，而是在比较、选择、反馈中逐渐形成的。

因此系统不能只做：
- 输入 prompt
- 出一组图
- 再次重来

而要做：
- 形成中的偏好建模
- 反馈驱动的状态更新
- 逐轮收敛而不是每轮重启

---

## 3. 核心产品结构

### 总流程
用户输入（自然语言 / 选择 / 参考图）
→ Intent Parser
→ Slot State Builder
→ Variant Orchestrator
→ 候选结果
→ Feedback Interpreter
→ State Updater / Convergence Agent
→ 下一轮推荐 + design state 沉淀

### 核心对象
系统沉淀的不是单次 prompt，而是：
- 槽位状态
- 锁定路径
- 偏好结构
- 探索轨迹
- 可复用 design state

---

## 4. design state 是系统中心

Fuli Plus 的中心对象不是 prompt，而是 **design state**。

### 当前状态结构
#### first-order
直接决定主要可见变化：
- `color`
- `motif`
- `arrangement`

#### second-order
不是同权视觉滑杆，而是调制层：
- `impression`
- `style`

### 关键原则
- first-order 承担主要视觉差异
- second-order 调制 first-order 趋势
- 不能把它们混成一层普通参数面板

---

## 5. 槽位是什么

槽位不是传统 UI 控件，
而是：

### 面向地毯设计语言的中间表示层

它既承接：
- 用户模糊感受

也承接：
- 系统对反馈的解释
- 下一轮推荐策略
- 后续生成系统输入

所以槽位不是“几个可调参数”，
而是系统内部的设计语义状态层。

---

## 6. feedback loop 的核心机制

传统方案：
- 固定控制项
- 用户手动调节
- 优化单次结果

Fuli Plus：
- 模糊感受
- 槽位映射
- 多轮反馈
- 状态更新
- 逐步收敛

### reducer 的产品定义
Reducer 不是算平均值的公式，而是：

> 一个把用户反馈转译为 design state 更新的规则层。

它决定：
- 哪些维度保持不动
- 哪些维度应当收束
- 哪些维度需要反向探索
- 哪些维度需要更细粒度展开

### 当前 operator 框架
- `keep`
- `narrow`
- `reverse`
- `expand`

---

## 7. FULI 真实资产在系统里的角色

FULI 资产不是普通图片库存，
而是：

### 设计语义资产层

它们应该是：
- 可标注的
- 可匹配的
- 可承担 reference / anchor / evaluation 角色的

因此，真实产品图需要逐步升级为：
- annotated assets
- role-defined assets
- retrievable semantic assets

---

## 8. 当前产品策略重点

### A. Physical Product Layer 是 constraint layer
Physical Product Layer 不直接进入主生图搜索闭环。
它主要作为前置约束层存在，避免把制造 / 形态约束混成审美搜索逻辑。

### B. MVP 先不扩张 slot 数量
优先保证：
- 代表性
- 可区分性
- 归因清晰度

### C. 先把 simulator 闭环做稳，再接真实生图
当前重点不是模型接入速度，
而是先把：
- state
- feedback
- reducer
- reference matching
- exploration / convergence
跑顺。

---

## 9. 当前工程上已经形成的机制原型

截至目前，机制已经开始收束为一个相对稳定的中间版本：

### Simulator Mechanism v0.3
关键词：
- staged exploration
- submitted preference
- real asset matching
- constrained reference pool
- soft-avoid / hard-exclude logic

### 已相对稳定的部分
1. design state 分层
2. round-based simulator 闭环
3. Base ref / Preference ref / Variant matched ref 三对象区分
4. Preference ref 延迟到“继续生成下一轮”后更新
5. weighted distance
6. stable / explore / auto matching modes
7. seen refs soft avoid / disliked refs hard exclude
8. liked cards 保留在右侧历史区
9. core / extended 资产层分开

---

## 10. 当前最关键的未完成问题

当前最未收束的一点，已经不能再简单表述为“找更分散的最近邻”。

### 更准确的问题是：early rounds 还没有真正升级为 dimensional probing / anchored possibility exploration

也就是说，系统虽然已经有：
- explore / stable / auto
- weighted distance
- diversity
- novelty
- expanded asset pool

但 early rounds 的逻辑仍偏：
- per-variant
- local nearest-ish
- 把 FULI 资产当作 nearest ref 来找

而不是：
- 先决定这一轮要 probing 哪些维度
- 再构造 4 个有张力的 design hypotheses
- 再让 FULI 资产成为这些 hypothesis 的 carrier

### 关键转向
Fuli Plus 的目标不是“帮用户找一张最接近的图”。

如果目标只是：
- 上传一张图
- 找最像的图
- 或围绕它做轻微近邻变化

那么图相似度模型 / embedding retrieval / image-to-image 就足够了。

Fuli Plus 引入 slot / design state 的理由在于：

> 系统不是为了更准确地找近邻，而是为了可控地制造差异。

### 两种模式下的正确理解
#### 上传图模式
不是 image similarity mode，而是：
**anchored possibility exploration mode**

系统要做的是：
- 以原图作为 anchor state
- 故意构造“保留某一层、打开其他层”的可能性
- 帮用户发现自己真正想保留的是 motif、arrangement、style、还是整体 mood

#### 语言模式
不是 parameter guessing mode，而是：
**dimensional probing mode**

系统第一轮要做的不是猜完整答案，而是沿不同维度分别试探：
- color
- motif
- arrangement
- style / impression

让用户通过比较发现自己到底在意哪一层。

### 下一阶段真正值得的方向
不是继续优化 nearest retrieval，
而是：

#### round-level hypothesis construction
尤其前两轮：
1. 先选本轮要 probing 的维度
2. 让每张图代表一个明确的 keep / vary hypothesis
3. 再从资产库中找最适合承载这个 hypothesis 的 carrier asset

这时资产图的角色就不再是“最像当前状态的图”，
而是：
**最适合表达这一维度张力的图。**

---

## 11. 对外 presentation 版本怎么讲

### 不要说轻的版本
不要说成：
- 我们做了一个地毯图案生成系统
- 用户可以调几个槽位
- 系统会继续推荐图片

这样会把项目说轻成：
- 参数面板
- 推荐逻辑
- 内容生成工具

### 更准确的说法
可以直接这样讲：

**Fuli Plus 不是一个通过固定参数调图的生成系统，而是一个通过 design state 持续建模用户审美偏好，并在多轮反馈中逐步收敛设计方向的 agentic design system。**

### 对外表达重点
- 重点不在“出图”
- 而在“如何把模糊审美输入转成可持续收敛的设计状态”
- 用户偏好不是预先完全清楚的，而是在反馈中逐渐形成的
- 系统沉淀的不是一次性 prompt，而是可复用 design state

### 可直接用的句子
- 这个项目的重点不在“出图”，而在于如何把模糊审美输入转成可持续收敛的设计状态。
- 我们不是把用户输入直接翻译成 prompt，而是先构建一层更贴近地毯设计语言的槽位表示，再让反馈进入这个状态层。
- 用户的偏好很多时候是在比较、选择和反馈中逐渐形成的，所以系统需要支持这种“形成中的偏好”被持续建模。
- 系统最终沉淀的不是单次 prompt，也不只是单张图片，而是一组可解释、可继承、可复用的 design state。

---

## 12. 当前阅读建议

### 如果你要快速理解产品
先看本文件，然后继续：
1. `01-project-definition.md`
2. `02-agent-workflow.md`
3. `13-reducer-product-design-v0.1.md`
4. `16-generation-system-and-roadmap-v0.1.md`

### 如果你要准备讲述 / 面试 / presentation
先看本文件，然后继续：
1. `05-interview-language.md`
2. `README.md`

### 如果你要继续机制设计
先看本文件，然后继续：
1. `11-slot-schema-v0.2-proposal.md`
2. `12-layer-update-strategy-v0.1.md`
3. `14-reducer-operators-and-decision-rules-v0.1.md`
4. `15-feedback-to-evidence-mapping-v0.1.md`

---

## 13. 当前一句话总结

**Fuli Plus 的核心不是生成图片，而是把“形成中的审美偏好”持续转译为可更新、可解释、可收敛的 design state。**
