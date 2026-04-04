# Gold Decomposition Cases Batch 2 Canonical Core

Date: 2026-04-04
Project: carpet-gen-system
Status: canonical-core / tightened engine specification

---

## 0. Scope

这份文档只升级 5 条 canonical core cases。

目标不是新增案例，而是把 Batch 1 的代表性 case 压成更难作弊的 engine 规范。

这些 case 必须同时满足：
- full-chain 可读
- schema 更硬
- planner 可判 fail
- engine 可以据此做 regression

### 0.1 Batch 2 Additions

相对于 Batch 1，本批 canonical core 强制新增：
- `spanForm`
- `spanSemanticClass`
- `expected-primary / expected-secondary / forbidden`
- `requiredEvidence`
- `optionalEvidence`
- `minConfidenceForPlannerUse`
- `whyNotRoute`
- `minimalSufficientChain`
- `baseProof / accentProof / relationProof`
  - mixed only
- `constraintMustOverride / constraintTargets / forbiddenIfConstraintIgnored`
  - constraint only
- `splitOwnedBy`
- `mustNotDegradeTo`
- `hardFailFollowUpPatterns`
- `whatCountsAsCheating`

---

## 1. Canonical Core Case CCA

### 1.1 Raw Input
- `id`: `GD-B2-CCA`
- `batch1Ref`: `GD-B1-01`
- `inputText`: `加州沙滩和柠檬叶的香气`
- `caseType`: `mixed-compositional`
- `priority`: `canonical-core`
- `whyThisCaseExists`: mixed + sensory + anti-literal 的综合 benchmark。它检验 engine 能否同时保住 base atmosphere、轻植物痕迹和感官扩散，而不是被任何单个对象词拉偏。

### 1.2 Minimal Sufficient Chain
- lock `加州沙滩` and `柠檬叶的香气`
- derive one base source and one accent source
- detect sensory modifier as anti-literal force
- route to `mixed-compositional`
- generate at least one unresolved split around `air vs trace`
- planner must not degrade to generic coastal softness card

### 1.3 Preprocessing Expectation
- `normalizedText`
  - `expected-primary`: `加州沙滩和柠檬叶的香气`
- `preservedPhrases`
  - `expected-primary`: `加州沙滩`
  - `expected-primary`: `柠檬叶的香气`
  - `expected-secondary`: `柠檬叶`
  - `forbidden`: `柠檬`
- `duplicateFlags`
  - `expected-primary`: none
- `pollutionFlags`
  - `expected-primary`: none
- `languageHints`
  - `expected-primary`: `zh`
  - `expected-secondary`: `zh-poetic`
- `whyDefinedThisWay`: `柠檬叶的香气` 必须整体锁住，否则 engine 会把 scent 错拆成对象识别。

### 1.4 Span Decomposition Expectation
- span-1
  - `spanText`: `加州沙滩`
  - `spanForm`: `phrase`
  - `spanSemanticClass`: `atmosphere-source`
  - `semanticFunction`: `base-source`
  - `whyPreserved`: 提供海边空气、日照、留白和明亮，不等于写实海滩对象库。
- span-2
  - `spanText`: `和`
  - `spanForm`: `connective`
  - `spanSemanticClass`: `structure-source`
  - `semanticFunction`: `modifier`
  - `whyPreserved`: 明确 base 与 accent 为并置，不是同义扩写。
- span-3
  - `spanText`: `柠檬叶`
  - `spanForm`: `phrase`
  - `spanSemanticClass`: `motif-source`
  - `semanticFunction`: `accent-source`
  - `whyPreserved`: 提供轻植物线性和清绿苦感。
- span-4
  - `spanText`: `香气`
  - `spanForm`: `modifier`
  - `spanSemanticClass`: `sensory-source`
  - `semanticFunction`: `anti-literal-bias`
  - `whyPreserved`: 强制系统优先解释为扩散、悬浮和挥发行为。

### 1.5 Query Routing Expectation
- `expectedRoute`
  - `expected-primary`: `mixed-compositional`
  - `expected-secondary`: `poetic-atmospheric`
  - `forbidden`: `explicit-motif`
  - `forbidden`: `vague-underspecified`
  - `forbidden`: `constraint-negation`
- `whyNotRoute`
  - `poetic-atmospheric`
    - because `柠檬叶` is semantically load-bearing and cannot be dropped as mere atmosphere garnish
  - `explicit-motif`
    - because `加州沙滩` and `香气` together keep atmosphere dominant over objectness
- `rationale`: 这是 base + accent + sensory 三层共存的标准 mixed case。

### 1.6 Base-Accent Proof Requirement
- `baseProof`
  - span evidence: `span-1`
  - role evidence: `base-atmosphere`
  - proof statement: `加州沙滩` 承担全句的空气与亮度底子
- `accentProof`
  - span evidence: `span-3`
  - role evidence: `accent-motif`
  - proof statement: `柠檬叶` 只作为轻线性植物痕迹出现
- `relationProof`
  - span evidence: `span-2`, `span-4`
  - role evidence: `sensory-modifier`, `rendering-bias`
  - proof statement: `和` 提供并置关系，`香气` 把 accent 拉回 trace/diffusion，而不是 object main subject

### 1.7 Semantic Role Assignment Expectation
- `base-atmosphere`
  - `expected-primary`
    - source spans: `span-1`
    - confidence: `high`
  - `expected-secondary`
    - source spans: `span-1`, `span-4`
    - confidence: `medium`
  - `forbidden`
    - omit base atmosphere entirely
- `accent-motif`
  - `expected-primary`
    - source spans: `span-3`
    - confidence: `medium`
  - `forbidden`
    - promote `柠檬叶` to dominant object anchor
- `sensory-modifier`
  - `expected-primary`
    - source spans: `span-4`
    - confidence: `high`
  - `forbidden`
    - treat `香气` as color or sweetness cue only
- `rendering-bias`
  - `expected-primary`
    - source spans: `span-4`
    - confidence: `high`
  - `forbidden`
    - no anti-literal bias attached

### 1.8 Pattern-Semantic Slot Projection Expectation
- `Pattern Architecture`
  - `expected-primary`: `field`
  - `expected-secondary`: `scattered`, `lattice_vine`
  - `forbidden`: `medallion`, `panelled`
  - `requiredEvidence`
    - base atmosphere present
    - scent diffusion present
  - `optionalEvidence`
    - connective relation
  - `minConfidenceForPlannerUse`: `0.65`
- `Motif Family`
  - `expected-primary`: `hybrid_botanical_fluid`
  - `expected-secondary`: `botanical_linear`, `wave_fluid`
  - `forbidden`: `botanical_mass`, `full lemon object illustration`
  - `requiredEvidence`
    - botanical trace
    - atmospheric base
  - `optionalEvidence`
    - sensory diffusion
  - `minConfidenceForPlannerUse`: `0.62`
- `Abstraction Level`
  - `expected-primary`: `suggestive`
  - `expected-secondary`: `ambient`, `hybrid`
  - `forbidden`: `literal`
  - `requiredEvidence`
    - sensory source
    - anti-literal bias
  - `optionalEvidence`
    - airy field structure
  - `minConfidenceForPlannerUse`: `0.6`
- `Structural Order`
  - `expected-primary`: `hidden_grid`
  - `expected-secondary`: `organic_repeat`, `mid_order`
  - `forbidden`: `high_order`
  - `requiredEvidence`
    - atmosphere-led field
  - `optionalEvidence`
    - connective relation
  - `minConfidenceForPlannerUse`: `0.55`
- `Density & Breathing`
  - `expected-primary`: `breathing_gradient`
  - `expected-secondary`: `sparse`, `clustered_sparse`
  - `forbidden`: `dense`
  - `requiredEvidence`
    - air cue
    - scent cue
  - `optionalEvidence`
    - low-presence accent
  - `minConfidenceForPlannerUse`: `0.6`
- `Flow Direction`
  - `expected-primary`: `horizontal_drift`
  - `expected-secondary`: `upward_evaporation`, `multi_directional_soft`
  - `forbidden`: `still_field`
  - `requiredEvidence`
    - coastal air
    - drift behavior
  - `optionalEvidence`
    - scent diffusion
  - `minConfidenceForPlannerUse`: `0.6`
- `Color Climate`
  - `expected-primary`: `sun-bleached sand`, `lemon-leaf green`
  - `expected-secondary`: `sea-salt white`, `washed sage`, `pale aqua`
  - `forbidden`: `high-saturation citrus yellow`, `tropical orange-green`
  - `requiredEvidence`
    - beach brightness
    - leaf-green trace
  - `optionalEvidence`
    - salt-air whiteness
  - `minConfidenceForPlannerUse`: `0.58`
- `Semantic Anchor`
  - `expected-primary`
    - `anchorType`: `hybrid_anchor`
    - `anchorStrength`: `medium_high`
  - `expected-secondary`
    - `anchorType`: `mood_anchor`
    - `anchorStrength`: `medium`
  - `forbidden`
    - `anchorType`: `object_anchor`
    - `anchorStrength`: `high`
  - `requiredEvidence`
    - base + accent coexist
  - `optionalEvidence`
    - scent anti-literal bias
  - `minConfidenceForPlannerUse`: `0.62`

### 1.9 Unresolved Split Expectation
- `expected-primary`
  - `保海边空气感` vs `保一点柠檬叶痕迹`
  - `让香气更融进整体` vs `让叶子线性稍可辨认`
- `expected-secondary`
  - `更沙白晒感` vs `更清绿苦感`
- `forbidden`
  - `海浪还是叶子`
- `whyHighValue`: 直接决定 base/accent 权重和 scent 的存在方式。
- `whatMisleadingPathItPrevents`
  - coastal postcard
  - lemon-leaf motif-only
  - generic clean freshness fallback

### 1.10 Planner Comparison / Follow-up Expectation
- `splitOwnedBy`
  - `base/accent tension`
  - `role tension`
- `expected comparison dimensions`
  - 海边空气的亮与留白
  - 柠檬叶痕迹保留强度
  - 香气是融进空气还是挂在线性痕迹上
- `expected comparison candidate themes`
  - `coastal airy field`
  - `leaf-trace with bitter-green accent`
  - `scent-diffused hybrid field`
- `mustNotDegradeTo`
  - generic atmosphere softness
  - generic complexity question
  - object category choice
- `hardFailFollowUpPatterns`
  - `你喜欢复杂一点还是简单一点`
  - `你喜欢海浪还是叶子`
  - `你喜欢什么颜色`
  - any California lifestyle framing

### 1.11 Forbidden Wrong Interpretations
- 不应把 `柠檬叶` 变成主图案对象。
- 不应把 `加州沙滩` 强化成写实海滩景观。
- 不应把 `香气` 误转成黄色、甜度或柠檬果实感。
- 不应在 unresolved 缺失时退回 generic coastal softness cards。

### 1.12 What Counts As Cheating
- route = `mixed-compositional` but no explicit `baseProof / accentProof / relationProof`
- planner still uses generic atmospheric card
- `香气` 只出现在 rationale，不影响 abstraction / unresolved / planner
- `柠檬叶` 只进入 motif family，但不进入 unresolved split

---

## 2. Canonical Core Case CCB

### 2.1 Raw Input
- `id`: `GD-B2-CCB`
- `batch1Ref`: `GD-B1-03`
- `inputText`: `烟雨里有一点竹影`
- `caseType`: `mixed-compositional`
- `priority`: `canonical-core`
- `whyThisCaseExists`: mixed + low-presence motif 的核心 benchmark。重点不是竹，而是 `烟雨` 和 `一点竹影` 如何在同一张图里成立。

### 2.2 Minimal Sufficient Chain
- lock `烟雨` and `一点竹影`
- detect `烟雨` as base
- detect `竹影` as accent with low presence
- preserve `一点` as relation-weight evidence
- derive unresolved split around `mist vs bamboo trace`
- planner must not fallback to generic mist card

### 2.3 Preprocessing Expectation
- `normalizedText`
  - `expected-primary`: `烟雨里有一点竹影`
- `preservedPhrases`
  - `expected-primary`: `烟雨`
  - `expected-primary`: `一点竹影`
  - `expected-secondary`: `竹影`
  - `forbidden`: `竹`
- `duplicateFlags`
  - `expected-primary`: none
- `pollutionFlags`
  - `expected-primary`: none
- `languageHints`
  - `expected-primary`: `zh-poetic`

### 2.4 Span Decomposition Expectation
- span-1
  - `spanText`: `烟雨`
  - `spanForm`: `phrase`
  - `spanSemanticClass`: `atmosphere-source`
  - `semanticFunction`: `base-source`
- span-2
  - `spanText`: `里有`
  - `spanForm`: `connective`
  - `spanSemanticClass`: `structure-source`
  - `semanticFunction`: `modifier`
- span-3
  - `spanText`: `一点`
  - `spanForm`: `modifier`
  - `spanSemanticClass`: `constraint-source`
  - `semanticFunction`: `constraint`
- span-4
  - `spanText`: `竹影`
  - `spanForm`: `phrase`
  - `spanSemanticClass`: `motif-source`
  - `semanticFunction`: `accent-source`

### 2.5 Query Routing Expectation
- `expectedRoute`
  - `expected-primary`: `mixed-compositional`
  - `expected-secondary`: `poetic-atmospheric`
  - `forbidden`: `explicit-motif`
  - `forbidden`: `vague-underspecified`
- `whyNotRoute`
  - `poetic-atmospheric`
    - because `竹影` is semantically load-bearing and must survive into unresolved/planner
  - `explicit-motif`
    - because `烟雨` stays dominant and `一点` suppresses object presence

### 2.6 Base-Accent Proof Requirement
- `baseProof`
  - span evidence: `span-1`
  - role evidence: `base-atmosphere`
  - proof statement: `烟雨` is the overall field
- `accentProof`
  - span evidence: `span-4`
  - role evidence: `accent-motif`
  - proof statement: `竹影` remains a trace motif rather than a scene object
- `relationProof`
  - span evidence: `span-2`, `span-3`
  - role evidence: `structure-hint`, `constraint`
  - proof statement: `里有一点` proves the accent is embedded and low-presence

### 2.7 Semantic Role Assignment Expectation
- `base-atmosphere`
  - `expected-primary`
    - source spans: `span-1`
    - confidence: `high`
- `accent-motif`
  - `expected-primary`
    - source spans: `span-4`
    - confidence: `medium`
  - `forbidden`
    - bamboo promoted to dominant object anchor
- `constraint`
  - `expected-primary`
    - source spans: `span-3`
    - confidence: `high`
- `structure-hint`
  - `expected-primary`
    - source spans: `span-2`, `span-3`
    - confidence: `high`
- `rendering-bias`
  - `expected-primary`
    - source spans: `span-1`, `span-4`
    - confidence: `high`
  - `forbidden`
    - no shadow bias attached

### 2.8 Pattern-Semantic Slot Projection Expectation
- `Pattern Architecture`
  - `expected-primary`: `field`
  - `expected-secondary`: `scattered`
  - `forbidden`: `lattice_vine` as dominant
  - `requiredEvidence`
    - mist field base
    - low-presence accent
  - `optionalEvidence`
    - embedded relation cue
  - `minConfidenceForPlannerUse`: `0.65`
- `Motif Family`
  - `expected-primary`: `hybrid_botanical_fluid`
  - `expected-secondary`: `botanical_linear`, `mist_field`
  - `forbidden`: `botanical_mass`
  - `requiredEvidence`
    - bamboo trace
    - mist base
  - `optionalEvidence`
    - shadow bias
  - `minConfidenceForPlannerUse`: `0.62`
- `Abstraction Level`
  - `expected-primary`: `suggestive`
  - `expected-secondary`: `ambient`
  - `forbidden`: `recognizable`
  - `requiredEvidence`
    - shadow trace
    - low presence constraint
  - `optionalEvidence`
    - mist diffusion
  - `minConfidenceForPlannerUse`: `0.6`
- `Structural Order`
  - `expected-primary`: `hidden_grid`
  - `expected-secondary`: `organic_repeat`
  - `forbidden`: `high_order`
  - `requiredEvidence`
    - atmosphere-led field
  - `optionalEvidence`
    - embedded accent relation
  - `minConfidenceForPlannerUse`: `0.55`
- `Density & Breathing`
  - `expected-primary`: `sparse`
  - `expected-secondary`: `clustered_sparse`, `breathing_gradient`
  - `forbidden`: `dense`
  - `requiredEvidence`
    - `一点`
    - mist openness
  - `optionalEvidence`
    - shadow trace
  - `minConfidenceForPlannerUse`: `0.6`
- `Flow Direction`
  - `expected-primary`: `vertical_drift`
  - `expected-secondary`: `diagonal_breeze`, `multi_directional_soft`
  - `forbidden`: `tidal_wave`
  - `requiredEvidence`
    - bamboo shadow descent/soft verticality
    - mist suspension
  - `optionalEvidence`
    - air movement
  - `minConfidenceForPlannerUse`: `0.58`
- `Color Climate`
  - `expected-primary`: `misty blue-grey`
  - `expected-secondary`: `washed sage`, `pale aqua`
  - `forbidden`: `fresh bamboo green`
  - `requiredEvidence`
    - mist cue
  - `optionalEvidence`
    - bamboo green trace
  - `minConfidenceForPlannerUse`: `0.55`
- `Semantic Anchor`
  - `expected-primary`
    - `anchorType`: `hybrid_anchor`
    - `anchorStrength`: `medium`
  - `expected-secondary`
    - `anchorType`: `mood_anchor`
    - `anchorStrength`: `medium_high`
  - `forbidden`
    - `anchorType`: `object_anchor`
    - `anchorStrength`: `high`
  - `requiredEvidence`
    - atmosphere + motif coexist
  - `optionalEvidence`
    - low presence modifier
  - `minConfidenceForPlannerUse`: `0.6`

### 2.9 Unresolved Split Expectation
- `expected-primary`
  - `更保烟雨整体` vs `更保一点竹影`
  - `竹影更像影子` vs `竹影稍可辨认`
- `expected-secondary`
  - `更偏灰蓝雾场` vs `更偏浅青影痕`
- `forbidden`
  - `要竹子吗`
- `whyHighValue`: 一道控制主导权，一道控制 recognizability。

### 2.10 Planner Comparison / Follow-up Expectation
- `splitOwnedBy`
  - `base/accent tension`
  - `role tension`
  - `constraint tension`
- `expected comparison dimensions`
  - 竹影保留强度
  - 烟雨厚度
  - 影子线条是否可读
- `expected comparison candidate themes`
  - `mist-first with faint bamboo trace`
  - `bamboo-shadow trace in soft rain`
- `mustNotDegradeTo`
  - generic atmosphere softness
  - object category choice
  - style/culture tag choice
- `hardFailFollowUpPatterns`
  - `要竹子吗`
  - `想中式一点吗`
  - `你喜欢什么颜色`
  - generic mist card with no bamboo split

### 2.11 Forbidden Wrong Interpretations
- 不应把 `竹影` 拉成高存在感竹林 motif。
- 不应把 `烟雨` 仅当色彩滤镜。
- 不应忽略 `一点` 的低存在约束。
- 不应导向传统山水场景。

### 2.12 What Counts As Cheating
- route = `mixed-compositional` but no explicit base/accent proof
- planner still uses generic atmospheric card
- bamboo only appears in motif family but not unresolved split
- `一点` appears in rationale but does not affect density/breathing or anchor strength

---

## 3. Canonical Core Case CCC

### 3.1 Raw Input
- `id`: `GD-B2-CCC`
- `batch1Ref`: `GD-B1-04`
- `inputText`: `花叶意向，但不要太满`
- `caseType`: `constraint-negation`
- `priority`: `canonical-core`
- `whyThisCaseExists`: 约束 precedence benchmark。这里的核心不是识别花叶，而是确保 `不要太满` 真的压住密度、objectness 和 planner 默认补满冲动。

### 3.2 Minimal Sufficient Chain
- lock `花叶意向` and `不要太满`
- route to `constraint-negation`
- identify floral/leaf trace as positive anchor
- identify density constraint as higher-precedence control
- constraint must alter density/breathing projection
- planner must ask density-related split, not only recognizability split

### 3.3 Preprocessing Expectation
- `normalizedText`
  - `expected-primary`: `花叶意向，但不要太满`
- `preservedPhrases`
  - `expected-primary`: `花叶意向`
  - `expected-primary`: `不要太满`
  - `forbidden`: dropping `意向`
- `duplicateFlags`
  - `expected-primary`: none
- `pollutionFlags`
  - `expected-primary`: none
- `languageHints`
  - `expected-primary`: `zh`

### 3.4 Span Decomposition Expectation
- span-1
  - `spanText`: `花叶意向`
  - `spanForm`: `phrase`
  - `spanSemanticClass`: `motif-source`
  - `semanticFunction`: `accent-source`
- span-2
  - `spanText`: `但`
  - `spanForm`: `connective`
  - `spanSemanticClass`: `structure-source`
  - `semanticFunction`: `modifier`
- span-3
  - `spanText`: `不要太满`
  - `spanForm`: `modifier`
  - `spanSemanticClass`: `constraint-source`
  - `semanticFunction`: `constraint`

### 3.5 Query Routing Expectation
- `expectedRoute`
  - `expected-primary`: `constraint-negation`
  - `expected-secondary`: `mixed-compositional`
  - `forbidden`: `explicit-motif`
  - `forbidden`: `poetic-atmospheric`
  - `forbidden`: `vague-underspecified`
- `whyNotRoute`
  - `explicit-motif`
    - because constraint is more stable than motif elaboration and must be processed first
  - `mixed-compositional`
    - because the connective does not create a balanced base/accent composition; it creates correction by override

### 3.6 Constraint Precedence Rule
- `constraintMustOverride`
  - default dense botanical fill
  - default floral recognizability boost
  - default decorative fullness
- `constraintTargets`
  - `density`
  - `objectness`
  - `scenic tendency`
- `forbiddenIfConstraintIgnored`
  - crowded floral field
  - full flower-and-leaf repeat
  - planner only asking flower-vs-leaf recognizability

### 3.7 Semantic Role Assignment Expectation
- `accent-motif`
  - `expected-primary`
    - source spans: `span-1`
    - confidence: `medium`
- `constraint`
  - `expected-primary`
    - source spans: `span-3`
    - confidence: `high`
- `structure-hint`
  - `expected-primary`
    - source spans: `span-3`
    - confidence: `high`
- `rendering-bias`
  - `expected-primary`
    - source spans: `span-1`, `span-3`
    - confidence: `medium`
  - `forbidden`
    - floral objectness raised without density suppression

### 3.8 Pattern-Semantic Slot Projection Expectation
- `Pattern Architecture`
  - `expected-primary`: `scattered`
  - `expected-secondary`: `field`, `lattice_vine`
  - `forbidden`: `bordered_field` with dense fill
  - `requiredEvidence`
    - floral/leaf trace
    - anti-fullness constraint
  - `optionalEvidence`
    - airy breathing
  - `minConfidenceForPlannerUse`: `0.62`
- `Motif Family`
  - `expected-primary`: `botanical_linear`
  - `expected-secondary`: `hybrid_botanical_fluid`
  - `forbidden`: `botanical_mass`
  - `requiredEvidence`
    - flower/leaf trace
    - non-literal `意向`
  - `optionalEvidence`
    - softened flow
  - `minConfidenceForPlannerUse`: `0.6`
- `Abstraction Level`
  - `expected-primary`: `suggestive`
  - `expected-secondary`: `hybrid`
  - `forbidden`: `literal`
  - `requiredEvidence`
    - `意向`
  - `optionalEvidence`
    - density suppression
  - `minConfidenceForPlannerUse`: `0.58`
- `Structural Order`
  - `expected-primary`: `organic_repeat`
  - `expected-secondary`: `hidden_grid`
  - `forbidden`: `high_order`
  - `requiredEvidence`
    - textile control without overfill
  - `optionalEvidence`
    - scattered architecture
  - `minConfidenceForPlannerUse`: `0.55`
- `Density & Breathing`
  - `expected-primary`: `sparse`
  - `expected-secondary`: `clustered_sparse`, `center_loose`
  - `forbidden`: `dense`, `balanced` if visually crowded
  - `requiredEvidence`
    - `不要太满`
  - `optionalEvidence`
    - floral trace remains
  - `minConfidenceForPlannerUse`: `0.68`
- `Flow Direction`
  - `expected-primary`: `multi_directional_soft`
  - `expected-secondary`: `diagonal_breeze`
  - `forbidden`: `still_field`
  - `requiredEvidence`
    - floral/leaf spread not too rigid
  - `optionalEvidence`
    - airy spacing
  - `minConfidenceForPlannerUse`: `0.5`
- `Color Climate`
  - `expected-primary`: `open`
  - `expected-secondary`: `washed sage`, `muted olive`, `sea-salt white`
  - `forbidden`: `high-saturation floral multicolor`
  - `requiredEvidence`
    - none strong enough to lock color
  - `optionalEvidence`
    - vegetal trace
  - `minConfidenceForPlannerUse`: `0.45`
- `Semantic Anchor`
  - `expected-primary`
    - `anchorType`: `object_anchor`
    - `anchorStrength`: `medium`
  - `expected-secondary`
    - `anchorType`: `hybrid_anchor`
    - `anchorStrength`: `medium`
  - `forbidden`
    - `anchorType`: `object_anchor`
    - `anchorStrength`: `high`
  - `requiredEvidence`
    - floral/leaf trace
  - `optionalEvidence`
    - abstracted delivery
  - `minConfidenceForPlannerUse`: `0.58`

### 3.9 Unresolved Split Expectation
- `expected-primary`
  - `更偏花叶线性痕迹` vs `更偏抽象植物气息`
  - `更疏` vs `局部有小簇但整体留白`
- `expected-secondary`
  - `更轻轮廓` vs `更轻枝叶走向`
- `forbidden`
  - `喜欢花还是叶`

### 3.10 Planner Comparison / Follow-up Expectation
- `splitOwnedBy`
  - `constraint tension`
  - `slot tension`
- `expected comparison dimensions`
  - 花叶是否仍可辨认
  - 留白比例
  - 局部簇状程度
- `expected comparison candidate themes`
  - `airy floral-leaf trace`
  - `sparser botanical contour`
  - `small clusters with breathing room`
- `mustNotDegradeTo`
  - generic complexity question
  - object category choice
  - density-agnostic floral selection
- `hardFailFollowUpPatterns`
  - `你想花多一点还是少一点`
  - `你想热闹一点还是简单一点`
  - `你想要花还是叶`
  - any follow-up that ignores density control

### 3.11 Forbidden Wrong Interpretations
- 不应因 `花叶` 直接补满密度。
- 不应把 `不要太满` 当语气词。
- 不应导向高饱和花布或满铺欧式花纹。
- 不应先做 floral recognizability comparison，再事后补 constraint。

### 3.12 What Counts As Cheating
- mentions constraint in rationale but does not affect `Density & Breathing`
- planner asks floral recognizability but not density control
- route is `constraint-negation` but projection still defaults to dense botanical family
- `意向` is preserved textually but ignored in abstraction-level decision

---

## 4. Canonical Core Case CCD

### 4.1 Raw Input
- `id`: `GD-B2-CCD`
- `batch1Ref`: `GD-B1-08`
- `inputText`: `石头肌理但别太硬`
- `caseType`: `constraint-negation`
- `priority`: `canonical-core`
- `whyThisCaseExists`: material cue + constraint precedence benchmark。重点是 `石头` 不能被直接翻译成硬质对象，而应被 constraint 压成 softened mineral texture。

### 4.2 Minimal Sufficient Chain
- lock `石头肌理` and `别太硬`
- route to `constraint-negation`
- preserve material cue as texture source
- constraint must affect hardness/contrast/objectness
- projection must not become hard blocks
- planner must compare mineral grain vs softened textile texture

### 4.3 Preprocessing Expectation
- `normalizedText`
  - `expected-primary`: `石头肌理但别太硬`
- `preservedPhrases`
  - `expected-primary`: `石头肌理`
  - `expected-primary`: `别太硬`
  - `forbidden`: `石头`
- `duplicateFlags`
  - `expected-primary`: none
- `pollutionFlags`
  - `expected-primary`: none
- `languageHints`
  - `expected-primary`: `zh`

### 4.4 Span Decomposition Expectation
- span-1
  - `spanText`: `石头肌理`
  - `spanForm`: `phrase`
  - `spanSemanticClass`: `structure-source`
  - `semanticFunction`: `base-source`
- span-2
  - `spanText`: `但`
  - `spanForm`: `connective`
  - `spanSemanticClass`: `structure-source`
  - `semanticFunction`: `modifier`
- span-3
  - `spanText`: `别太硬`
  - `spanForm`: `modifier`
  - `spanSemanticClass`: `constraint-source`
  - `semanticFunction`: `constraint`

### 4.5 Query Routing Expectation
- `expectedRoute`
  - `expected-primary`: `constraint-negation`
  - `expected-secondary`: `explicit-motif`
  - `forbidden`: `poetic-atmospheric`
  - `forbidden`: `vague-underspecified`
- `whyNotRoute`
  - `explicit-motif`
    - because the user is not asking for a stone object; they are correcting hardness of a texture interpretation
  - `poetic-atmospheric`
    - because the phrase carries material/texture specificity, not open atmosphere

### 4.6 Constraint Precedence Rule
- `constraintMustOverride`
  - hard geometric tiling
  - high-contrast mineral slab rendering
  - object-like stone block interpretation
- `constraintTargets`
  - `hardness`
  - `contrast`
  - `objectness`
- `forbiddenIfConstraintIgnored`
  - brick / slab / tile logic
  - charcoal high-contrast surface
  - planner only asking whether stone should be stronger

### 4.7 Semantic Role Assignment Expectation
- `base-atmosphere`
  - `expected-secondary`
    - source spans: `span-1`
    - confidence: `medium`
  - `forbidden`
    - replacing material cue with pure atmosphere
- `structure-hint`
  - `expected-primary`
    - source spans: `span-1`
    - confidence: `high`
- `constraint`
  - `expected-primary`
    - source spans: `span-3`
    - confidence: `high`
- `rendering-bias`
  - `expected-primary`
    - source spans: `span-1`, `span-3`
    - confidence: `high`

### 4.8 Pattern-Semantic Slot Projection Expectation
- `Pattern Architecture`
  - `expected-primary`: `field`
  - `expected-secondary`: `scattered`
  - `forbidden`: `panelled` as hard blocks
  - `requiredEvidence`
    - texture field
    - anti-hardness constraint
  - `optionalEvidence`
    - softened edges
  - `minConfidenceForPlannerUse`: `0.6`
- `Motif Family`
  - `expected-primary`: `grain_speckle`
  - `expected-secondary`: `organic_contour`
  - `forbidden`: `geometric stone tiles`
  - `requiredEvidence`
    - mineral/texture cue
  - `optionalEvidence`
    - softened contour
  - `minConfidenceForPlannerUse`: `0.62`
- `Abstraction Level`
  - `expected-primary`: `hybrid`
  - `expected-secondary`: `suggestive`, `ambient`
  - `forbidden`: `literal`
  - `requiredEvidence`
    - texture-derived reading
    - anti-object bias
  - `optionalEvidence`
    - softness correction
  - `minConfidenceForPlannerUse`: `0.58`
- `Structural Order`
  - `expected-primary`: `organic_repeat`
  - `expected-secondary`: `hidden_grid`
  - `forbidden`: `high_order`
  - `requiredEvidence`
    - textile softness
    - no slab partitioning
  - `optionalEvidence`
    - field organization
  - `minConfidenceForPlannerUse`: `0.55`
- `Density & Breathing`
  - `expected-primary`: `balanced`
  - `expected-secondary`: `clustered_sparse`
  - `forbidden`: `dense`
  - `requiredEvidence`
    - texture presence without crowding
  - `optionalEvidence`
    - softened surface layer
  - `minConfidenceForPlannerUse`: `0.55`
- `Flow Direction`
  - `expected-primary`: `still_field`
  - `expected-secondary`: `multi_directional_soft`
  - `forbidden`: `stripe_band`
  - `requiredEvidence`
    - material stillness
  - `optionalEvidence`
    - softened edge drift
  - `minConfidenceForPlannerUse`: `0.5`
- `Color Climate`
  - `expected-primary`: `muted olive`, `washed depth`
  - `expected-secondary`: `misty blue-grey`, `neutral_clean`
  - `forbidden`: `charcoal-black high contrast`
  - `requiredEvidence`
    - softened mineral reading
  - `optionalEvidence`
    - textile restraint
  - `minConfidenceForPlannerUse`: `0.52`
- `Semantic Anchor`
  - `expected-primary`
    - `anchorType`: `palette_anchor`
    - `anchorStrength`: `medium`
  - `expected-secondary`
    - `anchorType`: `mood_anchor`
    - `anchorStrength`: `medium`
  - `forbidden`
    - `anchorType`: `object_anchor`
    - `anchorStrength`: `high`
  - `requiredEvidence`
    - material cue preserved without object literalization
  - `optionalEvidence`
    - softened rendering
  - `minConfidenceForPlannerUse`: `0.55`

### 4.9 Unresolved Split Expectation
- `expected-primary`
  - `更偏颗粒矿物感` vs `更偏柔化纹理层`
- `expected-secondary`
  - `更偏哑光沉静` vs `更偏轻微层次感`
- `forbidden`
  - only color-temperature split

### 4.10 Planner Comparison / Follow-up Expectation
- `splitOwnedBy`
  - `constraint tension`
  - `slot tension`
- `expected comparison dimensions`
  - 颗粒感强弱
  - 边缘软硬
  - 石感来自结构还是表层
- `expected comparison candidate themes`
  - `softened mineral grain`
  - `stone-derived but textile-soft texture`
- `mustNotDegradeTo`
  - generic contrast question
  - object category choice
  - hardness-blind texture suggestions
- `hardFailFollowUpPatterns`
  - `喜欢石头图案吗`
  - `要不要更硬朗一点`
  - `你喜欢什么颜色`
  - any comparison that ignores hardness suppression

### 4.11 Forbidden Wrong Interpretations
- 不应把它做成砖、岩板或瓷砖拼法。
- 不应忽略 `别太硬`。
- 不应自动提升对比、直线、切割边界。
- 不应把 `石头` 当完整对象而非 texture cue。

### 4.12 What Counts As Cheating
- route is `constraint-negation` but hardness does not affect projection
- planner asks only dark-vs-light, not mineral-vs-softened-textile
- `石头肌理` is treated as explicit stone object while abstraction stays `literal`
- `别太硬` exists in rationale but not in `constraintTargets`

---

## 5. Canonical Core Case CCE

### 5.1 Raw Input
- `id`: `GD-B2-CCE`
- `batch1Ref`: `GD-B1-10`
- `inputText`: `还不确定，想高级一点`
- `caseType`: `vague-underspecified`
- `priority`: `canonical-core`
- `whyThisCaseExists`: vague / no premature locking benchmark。它检查 engine 是否能克制不补内容，并把“高级一点”只当作 disambiguation 方向而不是固定模板。

### 5.2 Minimal Sufficient Chain
- preserve `还不确定` and `高级一点`
- route to `vague-underspecified`
- avoid locking motif family
- avoid locking color climate
- generate at least one high-value aesthetic split
- planner must not degrade to generic complexity-only question

### 5.3 Preprocessing Expectation
- `normalizedText`
  - `expected-primary`: `还不确定，想高级一点`
- `preservedPhrases`
  - `expected-primary`: `还不确定`
  - `expected-primary`: `高级一点`
- `duplicateFlags`
  - `expected-primary`: none
- `pollutionFlags`
  - `expected-primary`: none
- `languageHints`
  - `expected-primary`: `zh`

### 5.4 Span Decomposition Expectation
- span-1
  - `spanText`: `还不确定`
  - `spanForm`: `modifier`
  - `spanSemanticClass`: `constraint-source`
  - `semanticFunction`: `constraint`
- span-2
  - `spanText`: `高级一点`
  - `spanForm`: `modifier`
  - `spanSemanticClass`: `rendering-bias-source`
  - `semanticFunction`: `modifier`

### 5.5 Query Routing Expectation
- `expectedRoute`
  - `expected-primary`: `vague-underspecified`
  - `expected-secondary`: none
  - `forbidden`: `explicit-motif`
  - `forbidden`: `poetic-atmospheric`
  - `forbidden`: `mixed-compositional`
  - `forbidden`: `constraint-negation`
- `whyNotRoute`
  - `poetic-atmospheric`
    - because no stable atmosphere content is present
  - `explicit-motif`
    - because no object/motif commitment is present
  - `constraint-negation`
    - because `还不确定` is uncertainty state, not a projection override against an existing positive anchor

### 5.6 Semantic Role Assignment Expectation
- `constraint`
  - `expected-primary`
    - source spans: `span-1`
    - confidence: `high`
- `rendering-bias`
  - `expected-primary`
    - source spans: `span-2`
    - confidence: `low`
  - `forbidden`
    - using `高级一点` to lock a style template
- `forbidden`
  - any stable `accent-motif`
  - any stable `base-atmosphere`

### 5.7 Pattern-Semantic Slot Projection Expectation
- `Pattern Architecture`
  - `expected-primary`: `open`
  - `expected-secondary`: `field` as exploratory candidate only
  - `forbidden`: any locked architecture
  - `requiredEvidence`
    - none sufficient to lock
  - `optionalEvidence`
    - restrained aesthetic bias
  - `minConfidenceForPlannerUse`: `0.4`
- `Motif Family`
  - `expected-primary`: `open`
  - `expected-secondary`: none
  - `forbidden`: any locked motif family
  - `requiredEvidence`
    - none sufficient to lock
  - `optionalEvidence`
    - later user preference only
  - `minConfidenceForPlannerUse`: `0.4`
- `Abstraction Level`
  - `expected-primary`: `open`
  - `expected-secondary`: `suggestive`, `hybrid` as exploratory candidates only
  - `forbidden`: locked `literal`, locked `ambient`
  - `requiredEvidence`
    - none sufficient to lock
  - `optionalEvidence`
    - elevated restraint cue
  - `minConfidenceForPlannerUse`: `0.42`
- `Structural Order`
  - `expected-primary`: `open`
  - `expected-secondary`: none
  - `forbidden`: locked `high_order`
  - `requiredEvidence`
    - none sufficient to lock
  - `optionalEvidence`
    - later comparison choice
  - `minConfidenceForPlannerUse`: `0.4`
- `Density & Breathing`
  - `expected-primary`: `open`
  - `expected-secondary`: none
  - `forbidden`: locked `dense`
  - `requiredEvidence`
    - none sufficient to lock
  - `optionalEvidence`
    - restrained/airy direction in comparison only
  - `minConfidenceForPlannerUse`: `0.4`
- `Flow Direction`
  - `expected-primary`: `open`
  - `expected-secondary`: none
  - `forbidden`: any locked directional claim
  - `requiredEvidence`
    - none sufficient to lock
  - `optionalEvidence`
    - none
  - `minConfidenceForPlannerUse`: `0.4`
- `Color Climate`
  - `expected-primary`: `open`
  - `expected-secondary`: restrained low-saturation candidates for comparison only
  - `forbidden`: fixed black-gold luxury palette
  - `requiredEvidence`
    - none sufficient to lock
  - `optionalEvidence`
    - elevated restraint cue
  - `minConfidenceForPlannerUse`: `0.42`
- `Semantic Anchor`
  - `expected-primary`
    - `anchorType`: `open`
    - `anchorStrength`: `low`
  - `expected-secondary`
    - none
  - `forbidden`
    - any `medium_high` or `high` anchor
  - `requiredEvidence`
    - none sufficient to lock
  - `optionalEvidence`
    - future user choice only
  - `minConfidenceForPlannerUse`: `0.4`

### 5.8 Unresolved Split Expectation
- `expected-primary`
  - `更偏留白克制` vs `更偏有存在感但不俗`
  - `更偏抽象气质` vs `更偏轻对象痕迹`
- `expected-secondary`
  - `更偏低饱和 clean` vs `更偏层次 depth`
- `forbidden`
  - asking for object category immediately
- `whyHighValue`: 这些分叉能先建立审美坐标，而不是乱补内容。

### 5.9 Planner Comparison / Follow-up Expectation
- `splitOwnedBy`
  - `slot tension`
  - `constraint tension`
- `expected comparison dimensions`
  - 克制 vs 存在感
  - 抽象 vs 轻母题
  - clean vs layered depth
- `expected comparison candidate themes`
  - `restrained airy sophistication`
  - `layered but quiet refinement`
  - `minimal trace sophistication`
- `mustNotDegradeTo`
  - generic complexity question
  - object category choice
  - style-template choice
- `hardFailFollowUpPatterns`
  - `你喜欢什么花`
  - `你喜欢什么颜色`
  - `复杂一点还是简单一点`
  - `高级一点是法式还是中古`

### 5.10 Forbidden Wrong Interpretations
- 不应把 `高级一点` 硬映射成黑金、轻奢、法式、中古等固定模板。
- 不应锁任何 motif family、color climate 或 flow direction。
- 不应假装系统已经知道用户想要海边、花叶或几何。
- 不应把 `还不确定` 当弱噪声忽略。

### 5.11 What Counts As Cheating
- route is `vague-underspecified` but engine still locks motif family
- planner only asks `复杂还是简单`
- `高级一点` is converted into a fixed luxury style palette
- unresolved split exists, but all options are stylistic labels rather than information-gain dimensions

---

## 6. Batch 2 Core Success Criteria

这 5 条 canonical core 在 Batch 2 下至少要能做到：

1. mixed cases 不能只靠 route label 过关
2. constraint cases 不能只靠识别到否定词过关
3. vague case 不能提前锁 slots
4. planner generic fallback 一出现就是 hard fail
5. 每条 case 都能写清楚 `whatCountsAsCheating`

