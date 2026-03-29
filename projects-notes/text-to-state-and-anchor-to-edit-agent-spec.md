# Text-to-State / Anchor-to-Edit Agent Spec

## 1. Why this layer matters

Fuli Plus 后续真正要补上的，不只是更好的 retrieval / probing / recommendation，
而是更前面的一层：

**用户的模糊输入，如何被组织成可探索的 design state。**

如果这一步不清楚，后面的：
- slot
- probing
- reducer
- recommendation
都会悬着，因为系统没有一个可靠的起始状态。

---

## 2. Core principle

这层不应该被理解成“文本转参数模块”。

更准确的说法是：

**这是一个把模糊输入组织成可探索 design state 的入口 agent。**

它不是在追求一次性最准确地猜中参数，
而是在做：
- 模糊偏好解释
- 歧义澄清
- 初始状态估计
- 不确定性标记
- probing 优先级生成

---

## 3. Two entry agents

Fuli Plus 至少需要两个不同的入口 agent：

### A. Text-to-State Agent
适用于：
- 用户没有上传图
- 输入主要是自然语言
- 偏好模糊，且常常层级混杂

### B. Anchor-to-Edit Agent
适用于：
- 用户上传了一张图
- 同时给出局部调整意图
- 目标不是找最像，而是围绕 anchor 进行定向偏移

这两个入口都要落到 slot state，
但前面的 interpretation 逻辑不同，不能混成一个模块。

---

## 4. Agent A — Text-to-State Agent

### 4.1 Input
输入可能是：
- 一句自然语言
- 多句模糊描述
- 一组偏好表达

典型输入例如：
- 想要温暖一点，但不要太甜
- 我喜欢有秩序感，但不要太硬
- 希望更安静、更有呼吸感
- 不要像酒店地毯那么重

### 4.2 Problem nature
这里的问题不是“信息太少”而已，
而是：
- 语义模糊
- 层级混杂
- 同一个词可能映射多个 slot

例如：
- “温暖”可能是 color，也可能是 impression
- “不跳”可能是 color contrast，也可能是 motif / arrangement
- “安静”可能对应 energy、spacing、saturation、order

### 4.3 Agent task
Text-to-State Agent 的任务不是直接吐出一个精确 JSON，
而是：

1. 识别显性偏好表达
2. 找出潜在歧义点
3. 判断哪些 slot 已较明确，哪些仍不确定
4. 生成一个可探索的初始 base state
5. 输出 confidence / uncertainty
6. 给出下一轮 probing priority

### 4.4 Output
建议输出结构：

- initial base slot state
- confidence per slot
- uncertainty per slot
- slots to probe first
- optional clarification questions

### 4.5 Product role
它的作用不是一次性猜中用户想要什么，
而是：

**把纯语言变成一个足够合理、且可继续探索的起始状态。**

---

## 5. Agent B — Anchor-to-Edit Agent

### 5.1 Input
输入是：
- 一张参考图
- 一段文字说明 / 偏移意图

典型输入例如：
- 我喜欢这张图的感觉，但图案太碎
- 颜色可以更深一点，但不要更沉
- 保留这种秩序感，但不要这么硬
- 我喜欢这个 mood，但不要像原图这么满

### 5.2 Problem nature
这里系统不是从零猜测，
而是在做：

**anchor-relative interpretation**

也就是：
- 原图已经提供了一个 anchor state
- 文本要被解释成 keep / vary / reject

### 5.3 Agent task
Anchor-to-Edit Agent 的任务：

1. 先从图中估计 anchor state
2. 再把文本转成相对编辑意图
3. 识别：
   - 哪些 slot 要 keep
   - 哪些 slot 要 vary
   - 哪些方向要 reject
4. 生成 anchor-relative base state / edit intent
5. 给出 probing priority

### 5.4 Output
建议输出结构：
- anchor state
- keep slots
- vary slots
- reject directions
- updated base state proposal
- slots to probe first

### 5.5 Product role
它不是图像描述器，
也不是相似图匹配器，
而是：

**一个把“参考图 + 偏移意图”转成结构化编辑方向的 agent。**

---

## 6. Clarification strategy

系统不能一味硬猜。
特别是 Text-to-State Agent，
要明确什么时候应该追问。

### Need clarification when:
1. 一个词明显可映射多个 slot
2. 用户说法层级混杂
3. 当前输入对关键 slot 覆盖太低
4. 用户表达中存在明显冲突

### Clarification goal
不是让用户填复杂表单，
而是以低负担问题帮助系统缩小歧义。

例如：
- 你说“温暖”，更偏向颜色，还是整体感觉？
- 你说“不跳”，更像是颜色太亮，还是图案太碎？
- 你更想保留原图的结构，还是整体气质？

---

## 7. Confidence & uncertainty

这一步非常关键。

系统入口不应假装已经知道完整答案。
输出除了 state 之外，还应包含：
- confidence
- uncertainty

### Why
因为后续 probing 应该优先处理：
- confidence 低的 slot
- uncertainty 高的 slot

### Example logic
- color.warmth: high confidence
- motif.geometry: medium confidence
- arrangement.order: low confidence
- style.graphic: unclear

这样第一轮 probing 才能真正对准“不确定的地方”，
而不是盲目展开。

---

## 8. How this connects to probing

入口 agent 的输出，不是最终答案，
而是：

**下一轮 exploration 的起点。**

### Connection rule
- confidence 高 → 尽量先保持
- uncertainty 高 → 优先 probing
- reject direction 明确 → 直接排除

这意味着：
入口 agent 和 probing system 之间的关系不是串联，而是：

**入口 agent 负责构造“当前可探索状态”， probing system 负责围绕这个状态组织比较。**

---

## 9. Product interpretation summary

### Upload mode
不是 image similarity mode，
而是：
**anchored possibility exploration mode**

### Language mode
不是 parameter guessing mode，
而是：
**dimensional probing mode**

### Shared principle
两者共同的目标都不是“找最接近的”，
而是：

**把模糊偏好组织成一个可继续探索、可逐步收敛的 design state。**

---

## 10. Immediate design task after this spec

下一步值得做的不是直接编码所有 agent，
而是先补一层产品定义：

### A. 定义 Text-to-State Agent 输出 schema
### B. 定义 Anchor-to-Edit Agent 输出 schema
### C. 定义 clarification rules
### D. 定义 confidence / uncertainty 如何进入 probing priority

也就是说，下一阶段的具体任务将是：

**设计“模糊输入 → 初始 slot state”这一层的输入输出协议。**
