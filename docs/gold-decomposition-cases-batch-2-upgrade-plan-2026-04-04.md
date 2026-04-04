# Gold Decomposition Cases Batch 2 Upgrade Plan

Date: 2026-04-04
Project: carpet-gen-system
Status: schema tightening / execution plan

---

## 0. Purpose

这份文档不是新增 case bundle。

它的职责是把 Batch 1 的问题收敛成一份更硬的 Batch 2 升级规范，用于：
- 收紧 schema
- 降低解释漂移
- 提升 engine 可执行性
- 明确后续改文档和改实现时的最低完成线

一句话：

> Batch 1 解决“能不能把问题写清楚”，Batch 2 解决“能不能把它压成不容易作弊的 engine spec”。

---

## 1. Batch 2 Non-Goals

Batch 2 当前不应优先做：
- 扩大 case 数量
- 增加更多 prose 风格解释
- 用更漂亮的文案替代更硬的判定条件

Batch 2 当前应优先做：
- 收紧 schema
- 收紧 `expected / acceptable / forbidden` 的边界
- 把 stress points 升级成 schema action items

---

## 2. Batch 2 Deliverables

Batch 2 应至少产出以下 4 个结果：

1. `schema upgrade`
   - 把 Batch 1 的 case schema 升级成更可执行的 engine contract

2. `canonical core subset`
   - 从 Batch 1 的 12 条里挑出 5 条 canonical core，要求最严格

3. `actionized stress points`
   - 把文末 stress points 转成 action items

4. `case upgrade protocol`
   - 规定后续如何把 Batch 1 case 升级到 Batch 2，而不是随意重写

---

## 3. Schema Changes

### 3.1 Split Span Structure

这是 Batch 2 的第一优先级。

Batch 1 的问题是把：
- 结构形式
- 语义类别
- 句内角色

混在了一起。

Batch 2 应改成三列。

#### New Span Fields

- `spanForm`
  - `phrase`
  - `modifier`
  - `connective`
  - `negation`

- `spanSemanticClass`
  - `atmosphere-source`
  - `motif-source`
  - `sensory-source`
  - `constraint-source`
  - `rendering-bias-source`
  - `color-source`
  - `structure-source`

- `semanticFunction`
  - `base-source`
  - `accent-source`
  - `modifier`
  - `constraint`
  - `anti-literal-bias`

#### Why This Change Is Required

- `phrase-span / modifier-span / composition-span / negation-span` 是结构形态
- `sensory-span / constraint-span` 已经是语义类别

这两层混在一个字段里，会导致：
- preprocessing 输出不稳定
- interpretation layer 难以复用规则
- mixed / constraint case 很难做 proof-based 判断

#### Batch 2 Rule

任何新升级的 case，不再允许只写旧式 `spanType`。

必须至少同时写出：
- `spanForm`
- `spanSemanticClass`
- `semanticFunction`

---

### 3.2 Tighten Case Outcome Bands

Batch 1 的 `expected / acceptable / forbidden` 还不够硬。

Batch 2 改为三档：

- `expected-primary`
  - 主目标，必须优先命中

- `expected-secondary`
  - 可以存在，但不能覆盖 primary

- `forbidden`
  - 明确错误

#### Batch 2 Rule

对 canonical core cases，不再允许只写 `acceptable`。

必须写成：
- `expected-primary`
- `expected-secondary`
- `forbidden`

#### Why This Change Is Required

如果不拆这三档，后续实现很容易出现：
- 没命中 primary
- 但命中了一个宽泛 acceptable
- 然后宣称“整体可接受”

Batch 2 要消灭这种逃生口。

---

### 3.3 Upgrade Slot Expectation Into Gating Spec

Batch 1 的 slot expectation 更像“偏好判断”。

Batch 2 要求每个核心 slot 都能表达：
- 这个值为什么能进入主链
- 缺什么证据就不能进入主链
- planner 最低要到什么置信度才能用

#### New Slot Fields

每个核心 slot 增加：
- `requiredEvidence`
- `optionalEvidence`
- `minConfidenceForPlannerUse`

#### Example Shape

`Flow Direction`

- `expected-primary`: `horizontal_drift`
- `expected-secondary`: `upward_evaporation`, `multi_directional_soft`
- `forbidden`: `still_field`
- `requiredEvidence`
  - coastal air
  - drift
  - shoreline openness
- `optionalEvidence`
  - scent diffusion
  - softness
- `minConfidenceForPlannerUse`
  - `0.6`

#### Batch 2 Rule

canonical core cases 的 8 个核心 slots，不允许只给值，不给证据和 planner gating。

---

## 4. Query Route Must Become Discriminative

### 4.1 Add `whyNotRoute`

Batch 1 已经有：
- expected route
- forbidden routes

但还不够。

Batch 2 必须新增：
- `whyNotRoute`

#### Required Shape

- `expectedRoute`
- `whyNotRoute`
  - `route`
  - `reason`

#### Example

- `expectedRoute`: `mixed-compositional`
- `whyNotRoute`
  - `poetic-atmospheric`
    - accent motif is semantically load-bearing
  - `explicit-motif`
    - atmosphere remains dominant and motif is low-presence

#### Batch 2 Rule

如果一个 case 有至少一个“很像但不该选”的 route，
就必须显式写出 `whyNotRoute`。

这会逼 engine 做 route discrimination，而不是只做 route hit。

---

### 4.2 Add `minimalSufficientChain`

Batch 1 的 full-chain 是完整的，但工程上还缺：
- 最低完成线

Batch 2 每条 case 都应增加：
- `minimalSufficientChain`

#### Example Shape

- preserve phrase
- detect base source
- detect accent source
- derive one unresolved split
- planner must not fallback to generic atmospheric card

#### Batch 2 Rule

每条 case 的 `minimalSufficientChain` 必须满足：
- 足够短，能做工程里程碑
- 足够硬，不能只写空泛目标

#### Why This Change Is Required

它用来区分：
- “最低完成线”
- “理想完成线”

否则 full-chain 容易太丰满，开发难以判断当前是否已经跨过最低门槛。

---

## 5. Mixed Cases Must Provide Proof

### 5.1 Add Base-Accent Proof Requirement

Batch 2 规定：

凡是 `mixed-compositional` case，必须新增：
- `baseProof`
- `accentProof`
- `relationProof`

#### Required Meaning

- `baseProof`
  - 哪个 span / role 支撑 base

- `accentProof`
  - 哪个 span / role 支撑 accent

- `relationProof`
  - 哪个 connective / modifier / low-presence cue 支撑主次关系

#### Batch 2 Rule

以下行为一律不算完成 mixed case：
- route 对了，但没有明确 base proof
- route 对了，但没有明确 accent proof
- route 对了，但 relation 只靠模糊 prose，没有落在 evidence 上

#### Why This Change Is Required

mixed case 最容易被：
- `route = mixed-compositional`

冒充完成。

Batch 2 的 mixed case 必须可证。

---

## 6. Constraint Cases Must Enforce Precedence

### 6.1 Add Constraint Precedence Block

Batch 2 规定：

凡是 `constraint-negation` case，必须新增：
- `constraintMustOverride`
- `constraintTargets`
- `forbiddenIfConstraintIgnored`

#### Required Meaning

- `constraintMustOverride`
  - 哪些默认 projection / planner tendency 必须被压住

- `constraintTargets`
  - `density`
  - `hardness`
  - `objectness`
  - `scenic tendency`
  - `contrast`

- `forbiddenIfConstraintIgnored`
  - 如果忽略 constraint，会发生的典型误读

#### Batch 2 Rule

只要一个 constraint case 里出现以下情况，就视为失败：
- constraint 只出现在 rationale，不影响 slot
- constraint 没有进入 unresolved / planner 优先级
- constraint 没有压住默认投影

#### Why This Change Is Required

constraint case 的主问题不是：
- 有没有识别到 `不要` / `别`

而是：
- 有没有真正改变 projection 和 planner 的主链

---

## 7. Planner Spec Must Tighten

### 7.1 Add `splitOwnedBy`

Batch 1 已经写了 candidate themes，
但 Batch 2 要进一步写清楚：

这个 split 到底是谁拥有的。

#### New Planner Fields

- `splitOwnedBy`
  - `role tension`
  - `slot tension`
  - `constraint tension`
  - `base/accent tension`

- `mustNotDegradeTo`
  - generic atmosphere softness
  - generic complexity question
  - object category choice

#### Batch 2 Rule

如果 comparison 已经写出主题，
就必须同步写出：
- 这道 split 的 ownership
- 它不能退化成什么

---

### 7.2 Add Hard Fail Follow-up Patterns

Batch 1 的 `forbidden fallback style` 还偏软。

Batch 2 要升级成：
- `hardFailFollowUpPatterns`

#### Meaning

这些默认问题一旦出现，就直接算失败。

#### Typical Hard Fail Patterns

- `你喜欢复杂一点还是简单一点`
- `你喜欢什么颜色`
- `你想要花还是叶`
- `你喜欢海浪还是沙滩`

#### Batch 2 Rule

对 canonical core cases，`hardFailFollowUpPatterns` 必写。

---

## 8. Add `whatCountsAsCheating`

这是 Batch 2 的关键防作弊规则。

每条升级后的 case 增加：
- `whatCountsAsCheating`

#### Meaning

如果系统做到了表面形式，但没有真正完成 engine-level requirement，
这些模式要被明确标出。

#### Example

对 `烟雨里有一点竹影`：
- route = `mixed-compositional` but no explicit base/accent proof
- planner still uses generic atmospheric card
- bamboo only appears in motif family but not unresolved split

对 `花叶意向，但不要太满`：
- mentions constraint in rationale but does not affect density/breathing
- planner asks floral recognizability but not density control

#### Batch 2 Rule

canonical core cases 的 `whatCountsAsCheating` 必写。

---

## 9. Canonical Core Cases

Batch 2 不应让 12 条 case 同权推进。

需要定义主战场。

### 9.1 Recommended Canonical Core

- `Core A`
  - `GD-B1-01`
  - `加州沙滩和柠檬叶的香气`
  - reason: mixed + sensory + anti-literal

- `Core B`
  - `GD-B1-03`
  - `烟雨里有一点竹影`
  - reason: mixed + base/accent + low-presence motif

- `Core C`
  - `GD-B1-04`
  - `花叶意向，但不要太满`
  - reason: motif + constraint + density/breathing

- `Core D`
  - `GD-B1-08`
  - `石头肌理但别太硬`
  - reason: material cue + constraint precedence

- `Core E`
  - `GD-B1-10`
  - `还不确定，想高级一点`
  - reason: vague / no premature locking

### 9.2 Canonical Core Rule

对 canonical core cases，Batch 2 要求最严格：
- 所有 schema upgrade 都必须先在这 5 条上完成
- 如果实现资源有限，优先跑这 5 条
- 只有 canonical core 稳住后，再批量升级其余 7 条

---

## 10. Schema Action Items

Batch 1 的 stress points 在 Batch 2 不能只停留在 notes。

必须变成 action items。

### 10.1 Action Item A

- `stressPoint`
  - span schema mixes structural form and semantic class
- `impact`
  - preprocessing 与 interpretation 输出难以稳定对齐
- `affectedCases`
  - `GD-B1-01`
  - `GD-B1-03`
  - `GD-B1-04`
  - `GD-B1-08`
- `requiredSchemaChange`
  - introduce `spanForm` + `spanSemanticClass` + keep `semanticFunction`
- `implementationNote`
  - update input normalization output shape
  - update interpretation rules to consume the new span contract

### 10.2 Action Item B

- `stressPoint`
  - `acceptable` boundary is too wide in Batch 1
- `impact`
  - implementation can miss primary target but still claim partial success
- `affectedCases`
  - all cases
- `requiredSchemaChange`
  - replace `expected / acceptable / forbidden` with `expected-primary / expected-secondary / forbidden`
- `implementationNote`
  - update any eval harness to score primary miss as non-pass

### 10.3 Action Item C

- `stressPoint`
  - slot expectations are not yet evidence-gated
- `impact`
  - planner may consume slot values without enough evidence
- `affectedCases`
  - `GD-B1-01`
  - `GD-B1-03`
  - `GD-B1-05`
  - `GD-B1-08`
  - `GD-B1-10`
- `requiredSchemaChange`
  - add `requiredEvidence`, `optionalEvidence`, `minConfidenceForPlannerUse`
- `implementationNote`
  - planner selection layer must check slot confidence threshold before use

### 10.4 Action Item D

- `stressPoint`
  - route expectation lacks explicit `why not X`
- `impact`
  - route discrimination remains too soft
- `affectedCases`
  - all mixed and boundary cases
- `requiredSchemaChange`
  - add `whyNotRoute`
- `implementationNote`
  - route eval should check not only selected route but discriminative rationale

### 10.5 Action Item E

- `stressPoint`
  - mixed cases can pass without base/accent proof
- `impact`
  - `mixed-compositional` label can be correct while semantics remain shallow
- `affectedCases`
  - `GD-B1-01`
  - `GD-B1-03`
  - `GD-B1-09`
- `requiredSchemaChange`
  - add `baseProof`, `accentProof`, `relationProof`
- `implementationNote`
  - unresolved split generation should consume proof outputs directly

### 10.6 Action Item F

- `stressPoint`
  - constraint cases do not yet enforce precedence
- `impact`
  - engine can acknowledge constraint without changing projection
- `affectedCases`
  - `GD-B1-04`
  - `GD-B1-08`
  - `GD-B1-05` as boundary case
- `requiredSchemaChange`
  - add `constraintMustOverride`, `constraintTargets`, `forbiddenIfConstraintIgnored`
- `implementationNote`
  - slot projection and planner modules must both respect override semantics

### 10.7 Action Item G

- `stressPoint`
  - planner expectations lack split ownership and hard-fail prohibition
- `impact`
  - planner can regress to generic prompts while still sounding plausible
- `affectedCases`
  - all canonical core cases
- `requiredSchemaChange`
  - add `splitOwnedBy`, `mustNotDegradeTo`, `hardFailFollowUpPatterns`
- `implementationNote`
  - planner eval must classify generic fallback patterns as hard failure

### 10.8 Action Item H

- `stressPoint`
  - current Flow Direction enum is not expressive enough for some natural cases
- `impact`
  - cases like bamboo shadow cannot be expressed precisely
- `affectedCases`
  - `GD-B1-03`
- `requiredSchemaChange`
  - add `vertical_drift` or redefine into `directional_soft_vertical`
- `implementationNote`
  - update slot enum, slot projection rules, and planner mapping

### 10.9 Action Item I

- `stressPoint`
  - `Color Climate` cannot clearly stay open in vague or constraint-led cases
- `impact`
  - engine is incentivized to overfill color decisions prematurely
- `affectedCases`
  - `GD-B1-04`
  - `GD-B1-08`
  - `GD-B1-10`
- `requiredSchemaChange`
  - allow explicit `open / not-yet-locked` state
- `implementationNote`
  - eval should not punish open color state when evidence is intentionally weak

### 10.10 Action Item J

- `stressPoint`
  - `Semantic Anchor Strength` mixes anchor type and strength
- `impact`
  - difficult to evaluate whether wrong anchor type or wrong strength caused failure
- `affectedCases`
  - `GD-B1-01`
  - `GD-B1-03`
  - `GD-B1-07`
  - `GD-B1-10`
- `requiredSchemaChange`
  - split into `anchorType` and `anchorStrength`
- `implementationNote`
  - planner and eval should inspect both dimensions separately

---

## 11. Upgrade Protocol

Batch 2 不应直接重写全部 12 条。

应按下面顺序推进。

### 11.1 Step 1

先升级 schema 模板：
- new span fields
- tighter outcome bands
- slot gating fields
- route discrimination fields
- planner hard-fail fields

### 11.2 Step 2

先升级 5 条 canonical core：
- `GD-B1-01`
- `GD-B1-03`
- `GD-B1-04`
- `GD-B1-08`
- `GD-B1-10`

### 11.3 Step 3

验证 canonical core 是否已满足：
- minimal sufficient chain clear
- no route-level cheating
- no planner generic fallback
- no constraint lip service

### 11.4 Step 4

再批量升级其余 7 条非 core cases。

---

## 12. Recommended Batch 2 Template Additions

后续升级 case 时，建议在每条 case 里新增以下结构段：

### 12.1 New Sections

- `minimalSufficientChain`
- `whyNotRoute`
- `baseProof` / `accentProof` / `relationProof`
  - mixed only
- `constraintMustOverride` / `constraintTargets` / `forbiddenIfConstraintIgnored`
  - constraint only
- `splitOwnedBy`
- `mustNotDegradeTo`
- `hardFailFollowUpPatterns`
- `whatCountsAsCheating`

### 12.2 New Field Conventions

- 统一使用 `expected-primary`
- 统一使用 `expected-secondary`
- 保留 `forbidden`

---

## 13. Minimal Success Criteria For Batch 2

Batch 2 成功的最低标准不是“文档更长”，而是下面这些条件成立：

1. canonical core 5 条已经能明确区分：
   - primary hit
   - secondary hit
   - hard fail

2. mixed cases 已经不能只靠 route label 过关

3. constraint cases 已经不能只靠写一句“不要太满 / 别太硬”过关

4. planner generic fallback 已经被升级成 hard fail

5. schema action items 已经能直接指导 engine implementation

---

## 14. Suggested Next Work Item

下一轮最合理的执行任务不是“继续写更多 cases”，而是：

> 按本升级规范，把 5 条 canonical core cases 从 Batch 1 升级到 Batch 2 schema。

推荐顺序：
1. `GD-B1-01`
2. `GD-B1-03`
3. `GD-B1-04`
4. `GD-B1-08`
5. `GD-B1-10`

原因：
- 覆盖 mixed
- 覆盖 sensory
- 覆盖 anti-literal
- 覆盖 constraint precedence
- 覆盖 vague no-locking

