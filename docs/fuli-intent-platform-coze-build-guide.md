# Fuli Intent Platform — Coze Build Guide

Date: 2026-04-02

## 1. Goal

这份文档不是讲产品愿景，而是讲：

> **如果要在 Coze 上复刻 Fuli / carpet-gen-system 这套智能体平台，应该怎么拆节点、怎么组织状态、怎么安排工作流。**

目标不是 1:1 搬代码，
而是保住平台的核心逻辑：
- 多轮意向收敛
- 槽位状态
- 设计顾问式对话
- visual intent compiler
- prompt adapter

---

## 2. First principle

在 Coze 上复刻时，最容易犯的错误是：

### 错误做法
- 用户输入一句话
- Bot 直接回一条 prompt
- 或直接生成图片

### 正确做法
必须保留这条链：

```text
user signal
-> intent parsing
-> slot state update
-> question planning
-> expert reply
-> state accumulation
-> visual intent compiler
-> test bundle / prompt outputs
```

也就是说：
> **先有 design state，后有 prompt。**

---

## 3. Recommended Coze module split

建议至少拆成 5 个模块。

## Module A — Main Agent: Intent Intake Agent

### Role
这是用户真正聊天的主 Agent。

### Responsibility
- 接收用户自由输入
- 接收用户点击选项后的对话 continuation
- 输出“设计顾问式回复”
- 每轮只做：
  1. 当前意向快照
  2. 一个关键分叉
  3. 一个问题

### Important rule
它不能直接暴露内部字段名。
不能说：
- colorMood
- patternTendency
- confidence 0.62
- semantic canvas

它要像：
- 一个资深但友好的地毯设计顾问

### Coze setup suggestion
- 作为主 Bot
- 主 Prompt 里明确写 persona 与回复规则
- 回复长度限制 2-3 句

---

## Module B — State Builder Workflow

### Role
把用户输入变成结构化 state。

### Input
- free text
- option click
- current conversation turn
- current stored state

### Output
- updated intent state
- slot progress
- unresolved splits
- confidence changes

### Recommended fields
至少维护：

```json
{
  "space": {},
  "impression": {},
  "pattern": {},
  "color": {},
  "presence": {},
  "arrangement": {},
  "constraints": {},
  "confidence": {},
  "unresolvedQuestions": []
}
```

### Coze implementation suggestion
- 用 workflow / tool 节点维护 JSON state
- 每轮把 state 存入 session memory / variables
- 不要只把历史文本当唯一真相

---

## Module C — Question Planner

### Role
决定下一轮最该问什么。

### It should consider
- 哪个 macro slot 还没 base-captured
- 哪个分叉当前最值钱
- 哪个问题已经问过了
- 哪个方向已经被确认，不该反复复活

### It should NOT do
- 只是看到哪个 gap 大就一直问那个
- 反复问 color 而不问 pattern/presence

### Output
至少输出：
- `currentSnapshot`
- `questionSplit`
- `questionText`

### Coze implementation suggestion
- 作为 hidden tool / sub-workflow
- 不直接对用户可见
- 主 Agent 只消费 question planner 的结果

---

## Module D — Visual Intent Compiler

### Role
把当前收集到的 intent state 编译成后台用的 visual intent package。

### Core principle
source of truth 不是 prompt string，
而是：
- canonical intent state
- semanticSpec
- confidenceState
- unresolvedQuestions

### Output
建议至少输出：

```json
{
  "summary": "...",
  "developerBrief": "...",
  "semanticSpec": {...},
  "generationPrompt": "...",
  "negativePrompt": "...",
  "confidenceState": {...},
  "unresolvedQuestions": [...],
  "trace": {...}
}
```

### Coze implementation suggestion
- 作为 workflow 节点或 tool
- 主 Agent 不直接展示全量结果
- 给后续测试页 / prompt 输出卡片 / image tool 使用

---

## Module E — Prompt Adapters

### Role
从 semanticSpec 派生不同 prompt 视图。

### Examples
- Midjourney prompt
- generic image prompt
- compact prompt card
- simulator display strings

### Important rule
它是 adapter，不是 compiler 本体。

### Midjourney-specific rule
Midjourney 版本应采用：
- pattern-first
- flat 2D pattern
- seamless textile pattern
- top-down composition
- no perspective
- no room scene
- no product mockup

而不是默认：
- carpet product render

---

## 4. Suggested state schema in Coze

如果在 Coze 里不能直接照搬 TS 类型，也建议维护一份简化 JSON。

### Minimal recommended state
```json
{
  "macroSlots": {
    "space": { "topDirection": null, "score": 0, "status": "missing" },
    "impression": { "topDirection": null, "score": 0, "status": "missing" },
    "pattern": { "topDirection": null, "score": 0, "status": "missing" },
    "color": { "topDirection": null, "score": 0, "status": "missing" },
    "presence": { "topDirection": null, "score": 0, "status": "missing" }
  },
  "patternIntent": {
    "keyElement": null,
    "renderingMode": null,
    "abstractionPreference": null,
    "motionFeeling": null,
    "explicitMotifs": []
  },
  "poeticSignals": [],
  "constraints": [],
  "unresolvedQuestions": [],
  "completed": false
}
```

### Status recommendation
- missing
- hinted
- base-captured
- lock-candidate

---

## 5. Recommended turn loop

在 Coze 上，一轮建议走这个顺序：

### Step 1
用户输入文本 / 点击选项

### Step 2
调用 State Builder，更新内部 state

### Step 3
调用 Question Planner，得到：
- 当前意向快照
- 当前最关键分叉
- 下一问

### Step 4
主 Agent 根据 persona 规则，把这些渲染成自然回复

### Step 5
如果达到生成阈值，同时调用 Visual Intent Compiler

### Step 6
在需要时展示：
- 当前意向摘要
- prompt outputs
- risks / tuningSuggestions

---

## 6. How to define completion

系统不能无限问。要定义“什么时候足够进入生成”。

### Minimum completion condition
至少这些槽位拿到 base direction：
- impression
- color
- pattern
- presence / arrangement 至少一个

### Suggested heuristic
- topDirection score > 0.5
- 且有至少 2 个支持信号
- unresolvedQuestions 不再全是关键分叉

### Coze implementation suggestion
用一个 workflow condition：
- 如果 `completed = true`
  - 进入 compiler / preview generation branch
- 否则继续 intake loop

---

## 7. How to support poetic language

如果要复刻得像原系统，必须支持 poetic semantic layer。

### Typical poetic inputs
- 烟雨
- 月白
- 竹影
- 清辉
- 暮色
- 灯火

### Do not
不要把这些词直接字面化。

### Do
先把它们映射到：
- atmosphere
- color bias
- pattern behavior
- presence

例如：
- 烟雨 -> mist-softened / cloud-mist / low contrast / blended
- 月白 -> pale cool-light base / low saturation / delicate
- 灯火 -> softly embedded warm accent / light trace / intimate warmth

### Coze implementation suggestion
- 主 Agent / state builder 里写规则模板
- 或用 hidden reasoning tool 先归一化 poetic semantics

---

## 8. How to support explicit motifs

如果要做得更强，还要保住明确物像。

### Examples
- 花朵
- 荷花
- 花叶
- 波纹
- 孤帆
- 枝叶

### Core rule
明确物像不要直接被吞成泛 pattern。
应该：
1. 先保留对象身份
2. 再决定抽象方式

### Recommended fields
- keyElement
- motifSubject
- renderingMode
- abstractionPreference
- explicitMotifs
- structuralPattern

### Coze implementation suggestion
- 核心对象走 rule-based core motif matcher
- 长尾对象可走 LLM-assisted temporary motif expander

---

## 9. What to show in the UI

如果 Coze 有卡片 / 面板能力，建议把用户可见层分成两部分：

## 9.1 Main conversation
这里永远是：
- 顾问式回复
- 当前快照
- 一个问题

## 9.2 Optional debug / simulator panel
这里可以展示：
- current intent summary
- semanticSpec
- prompt outputs
- risks
- tuningSuggestions

### Important
不要让 debug panel 替代主对话。
用户面对的主界面还是应该像对谈，不像状态机面板。

---

## 10. Minimal Coze build order

如果让别人一步步搭，我建议顺序是：

### Phase 1 — Make it conversational
先做：
- 主 Agent persona
- state memory
- question planner
- 2-3 轮意向收敛

### Phase 2 — Make it structured
再做：
- slot state
- completion logic
- unresolved questions
- explicit pattern intent

### Phase 3 — Make it generative
再做：
- visual intent compiler
- semanticSpec
- generic prompt
- negative prompt

### Phase 4 — Make it testable
最后做：
- test bundle
- risks
- tuningSuggestions
- Midjourney adapter

---

## 11. Common failure modes when rebuilding on Coze

### Failure 1: It becomes a questionnaire
原因：
- 问题是固定表单
- 没有意向快照
- 没有 question planning

### Failure 2: It becomes a prompt bot
原因：
- 直接 text -> prompt
- 没有 slot state
- 没有 compiler

### Failure 3: It becomes a debug console
原因：
- 内部字段直接外显
- 说话像系统 trace

### Failure 4: It loses pattern intent
原因：
- pattern 只剩风格轴
- 没有 explicit motif / poetic semantic layer

### Failure 5: It cannot stop asking
原因：
- 没有 completion criterion
- 没有 base-captured 逻辑

---

## 12. Practical checklist

如果在 Coze 上复刻，最后至少检查这 10 点：

1. 用户输入后，系统先给当前意向快照，而不是直接追问
2. 每轮只问一个高价值问题
3. 内部有 slot state，而不是只靠文本历史
4. 有 completed / base-captured 判断
5. pattern intent 不是只有 geometry / organic
6. poetic 输入不会直接字面化
7. 明确物像可以被保留后再抽象
8. compiler 输出不只是 prompt string
9. Midjourney prompt 是 derived view，不是 source of truth
10. 整个系统可以继续扩到图文双决策链

---

## 13. One-sentence summary

如果要在 Coze 上成功复刻这套平台，关键不是把“聊天 + 生图”拼起来，而是：

> **搭出一个会多轮收敛设计意图、内部维护 design state、并能把 design state 编译成生成语义的智能体系统。**
