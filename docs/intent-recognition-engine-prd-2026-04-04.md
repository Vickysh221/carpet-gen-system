# Intent Recognition Engine PRD

Date: 2026-04-04
Project: carpet-gen-system
Status: product / engine specification

---

## 1. Purpose

本 PRD 用于补足当前系统文档中相对缺失的两部分：

1. **文本预处理（Text Preprocessing）**
2. **意图识别引擎（Intent Recognition Engine）**

此前文档已经说明了：
- 系统需要分层
- 需要 query routing
- 需要 pattern-semantic intermediate representation
- 需要 showroom/comparison-first interaction

但如果没有更细的 engine 规范，开发实现仍容易退回：
- 抽几个 cue
- 做一个 route
- 再靠 planner fallback 补洞

这不够。

本 PRD 的目标是正式定义：

> **一句用户输入如何从原始文本，经过预处理、语义识别、角色拆分、pattern-semantic slot projection，最终进入 planner 与 compiler。**

---

## 2. Core Design Principle

意图识别引擎不是普通的分类器，也不是简单的 embedding retrieval 封装。

它的职责不是回答：
- 这句话像什么词
- 这句话最接近哪个标签

而是回答：

1. 这句话在当前产品语境中属于哪类输入？
2. 这句话里的各个语义片段分别在扮演什么角色？
3. 哪些信息应该进入图案语义层？
4. 哪些信息应作为约束、锚点、变体或待确认项存在？
5. 哪些不确定性应该保留给 comparison/planner，而不是被系统硬猜？

因此：

> **Intent Recognition Engine = preprocess-aware + role-aware + route-aware + slot-aware + unresolved-aware**

---

## 3. Why this engine needs to exist explicitly

如果没有显式定义的 intent recognition engine，系统会持续出现以下问题：

- 输入污染（例如：`加州海滩 加州海滩`）直接进入 planner 文案
- 单个 cue 过度拉偏路径（例如：`叶` -> explicit motif）
- `香气`、`空气`、`湿度`、`边界感` 这类感官语义难以结构化吸收
- retrieval 命中稀薄时，planner 只能从 nearest available seed 里近似取
- compiler 最终消费到的是粗糙文本印象，而不是 pattern-capable semantic structure

所以，这层不能再隐含在若干 helper 和 fallback 之中。
它必须成为一条明确主线。

---

## 4. Engine Overview

建议将意图识别引擎定义为 7 个阶段：

1. Text Preprocessing
2. Candidate Gathering
3. Query Routing
4. Semantic Role Extraction
5. Pattern-Semantic Slot Projection
6. Confidence / Unresolved Management
7. Planner Handoff

这是系统从“原始文本”走向“可用于 comparison / compiler 的结构化表示”的核心链路。

---

## 5. Stage 1 — Text Preprocessing

### 5.1 Goal

将原始用户输入转化为：
- 更干净
- 语义更稳定
- 可追踪
- 不破坏 poetic phrase integrity

的标准化文本事件。

### 5.2 Why this is important

文本预处理不是边角料，而是质量闸门。

如果这层做不好，会直接导致：
- 重复文本污染
- phrase 被切碎
- cue 被误抽
- retrieval 命中异常
- comparison card 文案直接带脏 query

### 5.3 Required preprocessing steps

#### A. Basic normalization
- trim 前后空白
- collapse multiple spaces
- 全角/半角统一
- 中英文标点统一
- 英文大小写规范化
- 特殊符号清洗（但避免破坏有意义连接词）

#### B. Duplicate / pollution cleanup
- 检测相邻重复片段（例如 `加州海滩 加州海滩`）
- 检测 UI 拼接污染 / accidental duplication
- 标记重复风险，而不是盲目删光
- 对高置信重复片段进行折叠

#### C. Phrase preservation
- 尽量保留具有完整语义的 multi-word spans
- 不要把 `下雨前五分钟的空气` 切碎成弱 token
- 不要把 `柠檬叶的香气` 最后只剩 `叶`
- 支持 phrase locking / span preservation

#### D. Language hints
- 识别中文/英文/混合输入
- 标记英文短语、品牌风格词、材料感词
- 为后续 retrieval 和 routing 提供 language hint

### 5.4 Output contract

建议输出结构至少包含：

```ts
{
  rawText: string;
  normalizedText: string;
  preservedPhrases: string[];
  duplicateFlags: string[];
  languageHints: string[];
  preprocessingTrace: string[];
}
```

### 5.5 Important principle

> 预处理的目标不是让文本“更短”，而是让文本“更适合语义识别”。

---

## 6. Stage 2 — Candidate Gathering

### 6.1 Goal

为后续 routing / role extraction 提供候选语义邻域。

### 6.2 Inputs
- normalized text
- preserved phrases
- optional session context

### 6.3 Candidate sources
建议包括：
- poetic mappings
- explicit motifs
- opening options
- comparison library items
- curated semantic anchors

### 6.4 Important principle

Candidate gathering 只负责：

> **开放输入 -> 有限候选集合**

它不负责：
- query type 最终判定
- polarity 解释
- slot 填充
- planner 决策

### 6.5 Output contract

```ts
{
  semanticCandidates: Candidate[];
  comparisonCandidates: Candidate[];
  retrievalTrace: string[];
}
```

---

## 7. Stage 3 — Query Routing

### 7.1 Goal

先判断这句话属于哪类输入，再决定后续 interpretation emphasis。

### 7.2 Required query types
至少包括：
- poetic-atmospheric
- explicit-motif
- constraint-negation
- mixed-compositional
- vague-underspecified

### 7.3 Important principle

routing 必须发生在 unified slot accumulation 之前。

否则系统会继续把：
- negation
- vivid imagery
- explicit motif
- mixed query

都塞进一个统一早期骨架里，再靠 patch 补差异。

### 7.4 Output contract

```ts
{
  detectedType: QueryType;
  confidence: number;
  rationale: string[];
  recommendedInterpretationPath: string;
  routeTrace: string[];
}
```

---

## 8. Stage 4 — Semantic Role Extraction

### 8.1 Goal

不要直接从词跳槽位，
而是先判断：

> 这些语义片段在这句话里分别扮演什么角色。

### 8.2 Recommended semantic roles
至少支持：
- base atmosphere
- accent motif
- sensory modifier
- color cue
- structure hint
- constraint / anti-direction
- rendering bias

### 8.3 Example

输入：`加州沙滩和柠檬叶的香气`

不应只是抽出：
- 加州
- 沙滩
- 柠檬叶
- 香气

而应优先判角色：
- base atmosphere: 海边空气 / 通透 / 日照 / 留白
- accent semantic trace: 柠檬叶青绿与轻苦感
- sensory modifier: 香气 -> 扩散 / 悬浮 / 挥发
- anti-literal bias: 不落成海景图标 / 完整叶片

### 8.4 Output contract

```ts
{
  semanticRoleHints: {
    baseAtmosphere?: string[];
    accentMotif?: string[];
    sensoryModifiers?: string[];
    colorCues?: string[];
    structureHints?: string[];
    constraints?: string[];
    renderingBiases?: string[];
  };
  roleTrace: string[];
}
```

---

## 9. Stage 5 — Pattern-Semantic Slot Projection

### 9.1 Goal

将 semantic roles 压入适合地毯图样的中间语义空间，
而不是直接跳到 prompt 或最终生成参数。

### 9.2 Slot system
此处应对接：
`docs/carpet-pattern-semantic-slots-prd-2026-04-04.md`

核心槽位包括：
- Pattern Architecture
- Motif Family
- Abstraction Level
- Structural Order
- Density & Breathing
- Flow Direction
- Color Climate
- Semantic Anchor Strength

### 9.3 Important principle

这些 slots：
- 可以是候选集
- 可以低置信
- 可以 unresolved
- 不要求每轮都填满

它们是：

> **中间压缩空间，不是问卷字段。**

### 9.4 Output contract

建议输出：

```ts
{
  formativeStructure: Partial<...>;
  semanticMaterial: Partial<...>;
  atmosphericSurface: Partial<...>;
  anchorHints: string[];
  variantHints: string[];
  constraintHints: string[];
  slotTrace: string[];
}
```

---

## 10. Stage 6 — Confidence / Unresolved Management

### 10.1 Goal

不是所有输入都应被系统强行解释到底。

这一步要明确：
- 哪些信息高置信
- 哪些信息只是候选
- 哪些需要 planner 引导用户确认
- 哪些不能被系统过度脑补

### 10.2 Required behaviors

#### A. High-confidence lock
例如：
- 明确 negation
- 强 motif cue
- 高置信 atmosphere cue

#### B. Candidate-only retention
例如：
- 可能是 architecture 候选
- 可能是 motif family 候选
- 但证据不足，不应硬写死

#### C. Unresolved split creation
例如：
- 空气先行 vs 痕迹先行
- 香气融入空气 vs 叶感稍微保留
- 边界压低 vs 细流动方向

#### D. Misleading path suppression
例如：
- 不要让 `叶` 直接把整句拖成 motif-only
- 不要让 `海边` 自动变 scenic illustration

### 10.3 Important principle

> 系统应保留高价值不确定性，而不是用低质量确定性覆盖它。

---

## 11. Stage 7 — Planner Handoff

### 11.1 Goal

向 planning layer 交出可用于：
- 判断性回显
- comparison generation
- follow-up selection

的结构化结果。

### 11.2 Planner should receive
至少包括：
- query route
- semantic role hints
- projected pattern-semantic slots
- unresolved splits
- misleading paths to avoid

### 11.3 Important principle

planner 不应再只消费：
- cue hits
- missing slot gaps

而应消费：

> **一份已经经过角色判定和图样语义压缩的中间结果。**

---

## 12. Failure Modes to Design For

### Failure Mode A — Single cue over-dominance
例如：
- `叶` 抢走整句主导权

### Failure Mode B — Atmosphere collapse into generic fallback
例如：
- `下雨前五分钟的空气` 被压成 generic atmosphere card

### Failure Mode C — Input pollution leaks into frontstage
例如：
- `加州海滩 加州海滩` 原样出现在 comparison 文案

### Failure Mode D — Scent / sensory semantics lost
例如：
- `香气` 没被结构化吸收，只剩 object cue

### Failure Mode E — Planner confirms nearest available split, not most valuable split
例如：
- 真正该确认的是“海风空气 vs 柠檬叶清绿香”
- 实际却确认成“柔化扩散 vs 细雾流动”

---

## 13. Implementation Requirements

### IR-1
必须显式实现 preprocessing output，而不是只在 util 中隐含清洗。

### IR-2
routing 必须早于 slot accumulation。

### IR-3
semantic role extraction 必须成为单独阶段，不能只靠 route + cue 推断。

### IR-4
pattern-semantic slot projection 必须是 interpretation layer 的正式输出之一。

### IR-5
engine 必须支持 unresolved / candidate-only 状态。

### IR-6
planner 必须读取 slot projection 和 unresolved splits，而不是只看 cue / gap。

---

## 14. Suggested next engineering tasks

1. 在 `inputLayer.ts` 中补齐 preprocessing contract
2. 在 `interpretationLayer.ts` 中新增 semantic role extraction 阶段
3. 将 `carpet-pattern-semantic-slots-prd` 对应的数据结构接入 interpretation output
4. 选 5-10 条代表性输入建立 engine evaluation bundle
5. 验证 planner 是否已从 slot projection 派生 comparison，而不是继续从 nearest seed 近似取

---

## 15. Final Decision

下一阶段，不能再把 intent recognition 理解成：
- 抽几个 cue
- route 一下
- fallback 一下

而应正式定义为：

> **从原始文本到 pattern-semantic intermediate representation 的完整识别引擎。**

其中：
- 文本预处理是质量闸门
- semantic role extraction 是关键转译层
- slot projection 是进入地毯图样逻辑的核心
- unresolved management 是避免系统胡乱脑补的必要机制

本 PRD 将作为后续 `Interpretation Layer` 实现与迭代的直接依据。
