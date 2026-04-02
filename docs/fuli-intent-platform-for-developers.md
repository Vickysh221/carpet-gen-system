# Fuli Intent Platform — Developer / Partner Overview

Date: 2026-04-02

## 1. What this platform is

Fuli Plus / carpet-gen-system 不是一个普通的“用户说一句话 -> AI 生成一张图”的图像生成应用。

它的核心是一个：

> **把模糊审美意图逐步收敛为可解释、可追踪、可生成的设计状态（design state / visual intent state）的智能体平台。**

换句话说，它不是把用户输入直接翻译成 prompt，而是先做一层：

- 意图理解
- 设计语义映射
- 多轮收敛
- 状态更新
- 再编译为生成控制语言

这使它更像：
- 一个设计顾问 + 状态机 + 编译器

而不是：
- 一个 prompt bot
- 一个问答 bot
- 一个直接生图 bot

---

## 2. The core product problem it solves

传统生成系统面临一个典型问题：

用户真实会说：
- 安静一点
- 不要太花
- 有呼吸感
- 月白里带一点灯火
- 像竹影，但别太没存在感
- 像烟雨三月那种

这些语言不是标准参数，也不是稳定 prompt 片段。

如果系统直接把这些话喂给图像模型：
- 结果不可控
- 难以复现
- 难以调试
- 用户也无法知道系统到底理解成了什么

所以 Fuli 的解决方案不是“让 prompt 更聪明”，而是：

> **在用户语言和图像生成之间，插入一层结构化设计语义状态。**

这层状态既承接用户语言，又能稳定指导生成。

---

## 3. Core product logic

平台的核心逻辑可以概括为：

```text
用户输入 / 选择 / 反馈
-> 意图解析
-> 槽位状态构建
-> 多轮追问与收敛
-> 形成 base preference profile
-> visual intent compiler
-> prompt / negative prompt / test bundle
-> 生成 / 比较 / 继续反馈
```

其中最关键的不是“问问题”，而是：

> **每一轮都在把用户偏好压缩成更稳定的 design state。**

---

## 4. Two major bodies of the system

## 4.1 User-facing body: Intent Intake Agent

这是用户直接接触的前台智能体。

它的人格应当是：
- 资深但友好的地毯设计顾问
- 擅长听模糊表达
- 能做设计判断
- 不像客服，不像问卷系统

它每轮的任务不是把所有信息问全，而是：
1. 给一个当前意向快照
2. 指出一个关键分叉
3. 问一个最值钱的问题

例如用户说：
> 我想要烟雨三月那种，不要太花。

它不应该回复内部字段，而应该说：
> 我现在会先把它看成：安静、颜色收着、图案不太实，像雾气轻轻铺开。  
> 但这里还差一个关键判断：你更要雾感的朦胧，还是更要水汽流动的方向感？

也就是说：
- 前台负责被理解感
- 负责帮助用户继续收窄
- 但不暴露内部 state

---

## 4.2 Backend body: Visual Intent Compiler

这是后台真正的核心生产层。

它不负责和用户聊天，
它负责把当前累计出来的 design state 编译成：
- developerBrief
- semanticSpec
- generationPrompt
- negativePrompt
- confidenceState
- unresolvedQuestions
- trace

关键原则：

> **source of truth 不是某条 prompt，而是 canonical intent state / compiled visual intent package。**

这意味着：
- prompt 是派生结果
- prompt 不是系统真相
- 系统真相是结构化设计状态

---

## 5. Why this is not just “prompt engineering”

因为这里真正被构建的是一个：

### 5.1 Preference intake system
- 持续接收偏好信号
- 把用户反馈当作证据
- 维护置信度与完成度

### 5.2 Semantic state machine
- 把意图映射成若干设计槽位
- 维护哪些槽位已捕获 base direction
- 规划下一步应该问什么

### 5.3 Design-state compiler
- 从 state 编译成可生成、可测、可追踪的输出

这和“写一条 prompt”是不同层级的问题。

---

## 6. Slot system: the core semantic bridge

Fuli 平台的关键不是 UI 参数，而是内部槽位系统。

建议保持 5 个宏槽位：
1. 空间 / 使用场景
2. 整体氛围 / 意境
3. 图案意向 / pattern intent
4. 颜色方向
5. 融合方式 / 存在感

这些槽位的意义不是“给用户填表”，而是：

> **作为用户自然表达和生成控制语义之间的中间桥梁。**

例如：
- “不要太花” 不只是复杂度低一点
- “烟雨三月” 不只是 haze
- “月白里带一点灯火” 不只是冷暖混合
- “像竹影” 不只是 botanical

这些都需要先落到 state，再决定如何进入 prompt。

---

## 7. Pattern intent is the differentiator

这个平台和普通风格 bot 最大的差别之一，是它不把图案理解成单纯“几何 / 自然 / 简繁”的形式轴。

它把 `pattern intent` 升级成一个更复杂的层，至少要容纳：
- key element / motif subject
- rendering mode
- abstraction preference
- motion / compositional feeling
- presence behavior

例如：
- 花叶
- 荷花
- 波纹
- 孤帆
- 竹影
- 灯火

系统不能只问“是自然还是几何”，而要判断：
- 这是对象、气氛，还是诗性中介词？
- 该保对象还是该转成 atmosphere？
- 该 suggestive 还是 literal？

---

## 8. Poetic semantics and explicit motifs

平台目前有两条很重要的高阶语义链：

## 8.1 Poetic Semantic Layer
用于处理：
- 烟雨
- 月白
- 竹影
- 清辉
- 暮色
- 灯火

这些词不会直接字面进 prompt，
而是先映射成：
- color bias
- atmosphere
- pattern behavior
- presence

## 8.2 Explicit Motif Preservation
用于处理明确物像：
- 花朵
- 荷花
- 波纹
- 孤帆
- 枝叶

原则不是“直接写实生成”，而是：
> **先保留对象身份，再决定它以抽象 / suggestive / silhouette 的方式进入图案。**

这两条链一起，决定了平台不只是懂氛围，也开始懂对象。

---

## 9. Why canonical state matters

如果没有 canonical state，系统会退化成：
- 句子进来
- 拼接 prompt
- 结果不可解释

而有了 canonical state，系统就能做到：
- 哪些槽位已稳定
- 哪些还未稳定
- 哪些是用户明确说的
- 哪些是系统推断的
- prompt 为什么这么写
- 如果图跑偏，应该往哪边调

这也是为什么平台天然适合：
- 测试页
- debug panel
- 多模型 prompt adapter
- 回归测试

---

## 10. Output architecture

一个完整的后台输出，不应只有一条 prompt。

至少应有：
- `summary`
- `developerBrief`
- `semanticSpec`
- `generationPrompt`
- `negativePrompt`
- `confidenceState`
- `unresolvedQuestions`
- `trace`

如果是测试页，还应再包一层：
- `VisualIntentTestBundle`
  - risks
  - tuningSuggestions
  - testLabel

也就是说：

> **prompt 是输出的一部分，不是全部。**

---

## 11. Midjourney and other prompt views

Midjourney prompt 只是 display / adapter output 的一部分。
它不应该反向定义 backend 结构。

在这个平台里：
- source of truth 是 canonical state / semanticSpec
- Midjourney prompt 是 derived view

而且对于 pattern generation 语境，MJ prompt 应是：
- pattern-first
- no perspective
- seamless
- top-down composition
- no room scene / no product mockup

而不是“成品地毯效果图”。

---

## 12. Why this architecture matters for partners

如果合作方要复刻或接入，这套架构的价值在于：

### 12.1 It is explainable
不会只给一句模型黑箱结果，而是能解释：
- 为什么问这个问题
- 为什么 state 这么更新
- 为什么 prompt 这么生成

### 12.2 It is extensible
未来可以接：
- 文本
- 图片
- 图文双决策链
- 更复杂的 design asset retrieval
- 多模型 prompt adapter

### 12.3 It is testable
可以为每个 case 记录：
- semanticSpec
- prompt
- risks
- tuning suggestions
- regression behavior

### 12.4 It is productizable
它不是 demo prompt bot，
而是一套可以继续长成：
- preference intelligence layer
- design state layer
- generation control layer

的产品骨架。

---

## 13. If rebuilding on Coze, what should be preserved

如果要在 Coze 上复刻，真正要保住的不是原项目文件名，而是这几个机制：

1. 用户输入不是直接 prompt，而是 signal
2. 有一个前台设计顾问 agent
3. 有一个内部 slot / intent state
4. 有 question planning，不是固定问卷
5. 有 visual intent compiler，不是字符串拼接器
6. prompt 只是 adapter，不是系统真相

只要这六件事保住，平台逻辑就没有丢。

---

## 14. One-sentence summary

Fuli 平台的核心逻辑不是“让 AI 帮用户生成图案”，而是：

> **通过一个设计顾问式的意向 intake agent，把模糊审美表达收敛成结构化 design state，再由 backend compiler 把 design state 编译成可生成、可测试、可调试的视觉意向输出。**
