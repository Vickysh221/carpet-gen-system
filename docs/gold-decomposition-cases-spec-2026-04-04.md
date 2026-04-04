# Gold Decomposition Cases Spec

Date: 2026-04-04
Project: carpet-gen-system
Status: evaluation / supervision specification

---

## 0. 目的 / Purpose

这份文档不是训练集说明，而是 **gold decomposition cases specification**。

它的目标不是让模型“记住这些例子”，而是让系统先拥有一套稳定的、可评测的、可监督的中间解析标准。

核心原则：

> 先把 case 强化成 **gold cases / regression oracle / engine benchmark**，
> 再考虑是否把它们转成模型监督样本。

Do **not** treat these cases as immediate finetuning data.
Treat them first as:
- engine evaluation bundle
- schema stabilization tool
- regression oracle
- future supervision asset

---

## 1. Why this spec exists

当前系统的主问题不是样本数量不够，而是中间层还不够稳定：
- span decomposition 未完全站住
- semantic role assignment 仍偏浅
- pattern-semantic slot projection 仍有模板化倾向
- unresolved split derivation 不够稳定
- planner handoff 仍可能掉回默认逻辑

因此，现在最需要的不是“继续喂样本给模型”，而是：

> **先定义每条代表性输入在 engine 内部应该如何被逐步解析。**

---

## 2. What a gold case must contain

For each case, define the expected output at **every important stage**.
Do not only define the final route or final follow-up.

Each gold case must include:

1. Raw Input
2. Preprocessing Expectation
3. Span Decomposition Expectation
4. Query Routing Expectation
5. Semantic Role Assignment Expectation
6. Pattern-Semantic Slot Projection Expectation
7. Unresolved Split Expectation
8. Planner Comparison / Follow-up Expectation
9. Forbidden Wrong Interpretations

---

## 3. Gold case schema

Each case should follow this schema.

### 3.1 Raw Input
- `id`
- `inputText`
- `caseType`
  - poetic-atmospheric
  - explicit-motif
  - mixed-compositional
  - constraint-negation
  - vague-underspecified
  - sensory / scent-led

---

### 3.2 Preprocessing Expectation
Define:
- `normalizedText`
- `preservedPhrases`
- `duplicateFlags`
- `pollutionFlags`
- `languageHints`

要求：
- 说明哪些 phrase 必须被锁住
- 说明哪些重复必须被折叠
- 说明哪些内容不能泄漏到前台 comparison 文案中

---

### 3.3 Span Decomposition Expectation
Define spans explicitly.

Each span should include:
- `spanText`
- `spanType`
  - phrase-span
  - modifier-span
  - composition-span
  - negation-span
  - constraint-span
  - sensory-span
- `semanticFunction`
  - base-source
  - accent-source
  - modifier
  - constraint
  - anti-literal-bias
- `whyPreserved`

要求：
- 不是只拆词，而是拆成对语义角色有意义的 span
- 必须能体现句内关系，而不是 token list

---

### 3.4 Query Routing Expectation
Define:
- expected `queryRoute`
- acceptable alternative route(s), if any
- forbidden routes
- rationale

要求：
- 不只说 route 是什么
- 要说明为什么不是另一个 route

---

### 3.5 Semantic Role Assignment Expectation
Define expected role structure.

Each expected role should include:
- `role`
  - base-atmosphere
  - accent-motif
  - sensory-modifier
  - color-cue
  - structure-hint
  - constraint
  - rendering-bias
- `sourceSpanIds`
- `confidenceBand`
  - high / medium / low
- `rationale`

要求：
- 角色必须绑定到 source spans
- 必须说明 base / accent / modifier / constraint 的关系
- 不能只写一个标签结果

---

### 3.6 Pattern-Semantic Slot Projection Expectation
Define expected slot outcome.

Each slot should include:
- `expectedHighConfidence`
- `acceptableCandidates`
- `forbiddenProjection`
- `projectionRationale`

Core slots:
- Pattern Architecture
- Motif Family
- Abstraction Level
- Structural Order
- Density & Breathing
- Flow Direction
- Color Climate
- Semantic Anchor Strength

要求：
- 不要求单一正确答案，但要明确：
  - 哪些是应该出现的
  - 哪些只是可接受候选
  - 哪些明显是错的

---

### 3.7 Unresolved Split Expectation
Define:
- `expectedUnresolvedSplits`
- `whyHighValue`
- `whatMisleadingPathItPrevents`

要求：
- unresolved 必须是当前最值钱的分叉
- 不能只是 generic fallback question

---

### 3.8 Planner Expectation
Define:
- expected comparison dimensions
- expected comparison candidate themes
- acceptable follow-up direction
- forbidden fallback style

要求：
- 不要求文案逐字一致
- 但必须规定 planner 应围绕什么差异发问
- 并明确哪些默认问法是不合格的

---

### 3.9 Forbidden Wrong Interpretations
每个 case 必须明确列出：
- 不应掉入什么 route
- 不应强化什么对象
- 不应使用什么 comparison fallback
- 不应导向什么图案误解

This is critical.
A gold case is not only about what should happen,
but also about what must **not** happen.

---

## 4. How these gold cases should be used

### 4.1 As evaluation bundle
Use them to test:
- preprocessing correctness
- span decomposition correctness
- role assignment correctness
- slot projection quality
- unresolved derivation quality
- planner split quality

### 4.2 As regression oracle
Every major engine change must be checked against this bundle.

### 4.3 As schema stabilization tool
If a gold case cannot be written clearly,
that usually means the schema itself is still unstable.

### 4.4 As future supervision asset
Only after the schema is stable,
these gold cases may be converted into supervision / training assets.

---

## 5. Recommended first batch of gold cases

At minimum, include the following:

1. `加州沙滩和柠檬叶的香气`
2. `下雨前五分钟的空气`
3. `烟雨里有一点竹影`
4. `花叶意向，但不要太满`
5. `雪地与天空没有分界线`
6. `薄纱后面的光`
7. `一点孤帆远影`
8. `石头肌理但别太硬`
9. `荷花在风里摇曳`
10. `还不确定，想高级一点`
11. `加州海滩 加州海滩`
12. `加州海滩`

建议按类型分组：
- poetic-atmospheric
- explicit-motif
- mixed-compositional
- constraint-negation
- vague-underspecified
- polluted-input / preprocessing-sensitive

---

## 6. Example shape (not full content)

### Case Example
`加州沙滩和柠檬叶的香气`

#### Preprocessing
- normalizedText: `加州沙滩和柠檬叶的香气`
- preservedPhrases:
  - `柠檬叶的香气`
- duplicateFlags: none
- pollutionFlags: none

#### Span decomposition
- span-1: `加州沙滩` → phrase-span → base-source
- span-2: `柠檬叶` → phrase-span → accent-source
- span-3: `香气` → sensory-span → modifier

#### Route
- expected: `mixed-compositional`
- forbidden:
  - `explicit-motif`
  - `vague-underspecified`

#### Roles
- base-atmosphere ← span-1
- accent-motif ← span-2
- sensory-modifier ← span-3
- rendering-bias ← anti-literal

#### Slot projection
- Pattern Architecture:
  - expected: `field`
  - acceptable: `scattered`
  - forbidden: `medallion`
- Motif Family:
  - expected: `hybrid_botanical_fluid`
  - acceptable: `botanical_linear`
  - forbidden: full lemon object illustration

#### Unresolved
- preserve air vs preserve trace
- diffuse scent vs retain slight leaf trace

#### Planner
- comparison should revolve around:
  - coastal air clarity
  - lemon-leaf green-bitter accent
  - scent diffused into air
  - slight trace retention
- forbidden generic fallback:
  - generic fog softness card
  - generic “complex or simple” question

---

## 7. Success criteria for this spec work

This spec work is successful if:

1. Each case can be written in full chain form
2. The schema is clear enough that engineers can test against it
3. We can tell whether a system output is:
   - correct
   - acceptable
   - weak
   - wrong
4. We can distinguish:
   - case patching
   - mechanism-level progress

---

## 8. Anti-patterns

Do **not** do the following:

1. Do not define gold cases only by final route / final follow-up
2. Do not turn these into one-line label annotations
3. Do not use them as immediate training data before schema stabilization
4. Do not silently encode case-specific word patches and call that “gold behavior”
5. Do not skip forbidden wrong interpretations

---

## 9. Final principle

一句话原则：

> **先把例子变成 gold decomposition cases，再把它们变成可能的训练资产。**

English version:

> **Stabilize the cases as gold decomposition specifications first; only later consider turning them into training assets.**
