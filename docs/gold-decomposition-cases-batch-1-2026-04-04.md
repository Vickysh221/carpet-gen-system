# Gold Decomposition Cases Batch 1

Date: 2026-04-04
Project: carpet-gen-system
Status: evaluation / regression oracle / schema stabilization bundle

---

## 0. Scope

本批文档不是训练样本，也不是 case-specific prompt patch 清单。

它用于：
- engine evaluation
- regression oracle
- schema stabilization

每条 case 都按 full-chain 写出：
1. Raw Input
2. Preprocessing Expectation
3. Span Decomposition Expectation
4. Query Routing Expectation
5. Semantic Role Assignment Expectation
6. Pattern-Semantic Slot Projection Expectation
7. Unresolved Split Expectation
8. Planner Comparison / Follow-up Expectation
9. Forbidden Wrong Interpretations

判定语义：
- `expected`: 当前 gold 行为，应优先稳定命中
- `acceptable`: 允许存在的候选，不算主错，但不应替代 expected
- `forbidden`: 明显错误，或会把系统带进误解路径

---

## 1. Case GD-B1-01

### 1.1 Raw Input
- `id`: `GD-B1-01`
- `inputText`: `加州沙滩和柠檬叶的香气`
- `caseType`: `mixed-compositional`
- `whyThisCaseExists`: 这个 case 用来验证系统是否能把 `海边空气`、`植物痕迹`、`香气扩散` 分成 base / accent / sensory modifier，而不是掉成海景插画或柠檬对象识别。

### 1.2 Preprocessing Expectation
- `normalizedText`: `加州沙滩和柠檬叶的香气`
- `preservedPhrases`
  - expected: `加州沙滩`
  - expected: `柠檬叶的香气`
  - acceptable: `柠檬叶`
- `duplicateFlags`
  - expected: none
- `pollutionFlags`
  - expected: none
- `languageHints`
  - expected: `zh`
  - acceptable: `zh-poetic`
- `whyDefinedThisWay`: `柠檬叶的香气` 必须作为感官短语锁住，不能预处理成单独 `柠檬` 或 `叶`。`加州` 也不能在前台 comparison 文案里泄漏成风格标签或 lifestyle 标签。

### 1.3 Span Decomposition Expectation
- span-1
  - `spanText`: `加州沙滩`
  - `spanType`: `phrase-span`
  - `semanticFunction`: `base-source`
  - `whyPreserved`: 提供海边空气、日照、留白与通透的 base atmosphere，不等于海景对象清单。
- span-2
  - `spanText`: `和`
  - `spanType`: `composition-span`
  - `semanticFunction`: `modifier`
  - `whyPreserved`: 明确 base 与 accent 是并置关系，不是同义堆叠。
- span-3
  - `spanText`: `柠檬叶`
  - `spanType`: `phrase-span`
  - `semanticFunction`: `accent-source`
  - `whyPreserved`: 提供轻植物性和清绿苦感，是痕迹性 accent，不是完整对象主角。
- span-4
  - `spanText`: `香气`
  - `spanType`: `sensory-span`
  - `semanticFunction`: `anti-literal-bias`
  - `whyPreserved`: 强制系统优先解释为扩散、挥发、悬浮，而非具象柠檬叶插画。

### 1.4 Query Routing Expectation
- `expected queryRoute`: `mixed-compositional`
- `acceptable alternative routes`
  - `poetic-atmospheric`
    - only if engine 尚未稳定支持 `base + accent + sensory` 三分，但仍明确保住海边空气优先
- `forbidden routes`
  - `explicit-motif`
  - `vague-underspecified`
  - `constraint-negation`
- `rationale`: 这里同时有 base atmosphere、motif trace、sensory modifier 和显式并置词 `和`。如果进 `explicit-motif`，说明对象词把空气层挤掉了；如果进 `poetic-atmospheric` 且完全不保叶痕，则又把轻母题抹平了。

### 1.5 Semantic Role Assignment Expectation
- role-1
  - `role`: `base-atmosphere`
  - `sourceSpanIds`: `span-1`
  - `confidenceBand`: `high`
  - `rationale`: `加州沙滩` 在这里首先提供的是明亮、通透、海盐空气，而不是海浪图案对象。
- role-2
  - `role`: `accent-motif`
  - `sourceSpanIds`: `span-3`
  - `confidenceBand`: `medium`
  - `rationale`: `柠檬叶` 是保一点植物线性和清绿苦感的痕迹。
- role-3
  - `role`: `sensory-modifier`
  - `sourceSpanIds`: `span-4`
  - `confidenceBand`: `high`
  - `rationale`: `香气` 决定它应更像空气行为，不应像完整叶片铺陈。
- role-4
  - `role`: `color-cue`
  - `sourceSpanIds`: `span-1`, `span-3`
  - `confidenceBand`: `medium`
  - `rationale`: 允许出现 `sun-bleached sand` 与 `lemon-leaf green` 的双锚色候选。
- role-5
  - `role`: `rendering-bias`
  - `sourceSpanIds`: `span-4`
  - `confidenceBand`: `high`
  - `rationale`: 明确 anti-literal，防止海边景观和写实柠檬叶。

### 1.6 Pattern-Semantic Slot Projection Expectation
- `Pattern Architecture`
  - `expectedHighConfidence`: `field`
  - `acceptableCandidates`: `scattered`, `lattice_vine`
  - `forbiddenProjection`: `medallion`, `panelled`
  - `projectionRationale`: 这是空气性底子上带一点植物痕迹的场，不适合中心徽章式成立。
- `Motif Family`
  - `expectedHighConfidence`: `hybrid_botanical_fluid`
  - `acceptableCandidates`: `botanical_linear`, `wave_fluid`
  - `forbiddenProjection`: `botanical_mass`, `full lemon object illustration`
  - `projectionRationale`: 应保植物线性和轻流动，不应长成厚重叶团或水果插画。
- `Abstraction Level`
  - `expectedHighConfidence`: `suggestive`
  - `acceptableCandidates`: `ambient`, `hybrid`
  - `forbiddenProjection`: `literal`
  - `projectionRationale`: 用户说的是香气，不是要求叶子长什么样。
- `Structural Order`
  - `expectedHighConfidence`: `hidden_grid`
  - `acceptableCandidates`: `organic_repeat`, `mid_order`
  - `forbiddenProjection`: `high_order`
  - `projectionRationale`: 要有织物秩序，但不能太死。
- `Density & Breathing`
  - `expectedHighConfidence`: `breathing_gradient`
  - `acceptableCandidates`: `sparse`, `clustered_sparse`
  - `forbiddenProjection`: `dense`
  - `projectionRationale`: 香气与海边空气都要求留白。
- `Flow Direction`
  - `expectedHighConfidence`: `horizontal_drift`
  - `acceptableCandidates`: `upward_evaporation`, `multi_directional_soft`
  - `forbiddenProjection`: `still_field`
  - `projectionRationale`: 海边与香气都支持轻漂移。
- `Color Climate`
  - `expectedHighConfidence`: `sun-bleached sand`, `lemon-leaf green`
  - `acceptableCandidates`: `sea-salt white`, `washed sage`, `pale aqua`
  - `forbiddenProjection`: `high-saturation citrus yellow`, `tropical orange-green`
  - `projectionRationale`: 要的是海边干净亮度和叶子的清绿苦感，不是果汁广告。
- `Semantic Anchor Strength`
  - `expectedHighConfidence`: `hybrid_anchor:medium_high`
  - `acceptableCandidates`: `mood_anchor:medium`, `palette_anchor:medium`
  - `forbiddenProjection`: `object_anchor:high`
  - `projectionRationale`: 命中感来自空气 + 叶痕 + 香气，不是靠单一物体。

### 1.7 Unresolved Split Expectation
- `expectedUnresolvedSplits`
  - `保海边空气感` vs `保一点柠檬叶痕迹`
  - `让香气更融进整体` vs `让叶子线性稍可辨认`
- `whyHighValue`: 这两道分叉会直接改变图案是更偏 atmosphere field，还是更偏带植物痕迹的织物。
- `whatMisleadingPathItPrevents`
  - 防止掉成海边写实景观
  - 防止掉成柠檬叶 motif-only
  - 防止被 planner 抹平成 generic 清新风

### 1.8 Planner Comparison / Follow-up Expectation
- `expected comparison dimensions`
  - 海边空气的亮与留白
  - 柠檬叶痕迹保留强度
  - 香气是漂在空气里还是附着在线性母题上
- `expected comparison candidate themes`
  - `coastal airy field`
  - `leaf-trace with bitter-green accent`
  - `scent-diffused hybrid field`
- `acceptable follow-up direction`
  - 问用户更想保空气还是保叶痕
  - 问用户香气更想做成整体扩散还是局部可辨认
- `forbidden fallback style`
  - `你喜欢复杂一点还是简单一点`
  - `你喜欢海浪还是叶子`
  - 泛化成任何 lifestyle / California style 提问

### 1.9 Forbidden Wrong Interpretations
- 不应掉进 `explicit-motif`，然后把 `柠檬叶` 变成主图案对象。
- 不应把 `加州沙滩` 强化成写实海滩、太阳、海浪、棕榈树景观。
- 不应把 `香气` 理解成黄色、甜度或果汁感。
- 不应使用 generic fog / soft / clean 比较卡片替代真正的 base-accent 分叉。

---

## 2. Case GD-B1-02

### 2.1 Raw Input
- `id`: `GD-B1-02`
- `inputText`: `下雨前五分钟的空气`
- `caseType`: `poetic-atmospheric`
- `whyThisCaseExists`: 这个 case 测试系统能否把极强的时间性、湿度临界感和边界将变未变的状态保留下来，而不是偷懒落成 `下雨/水滴/云朵`。

### 2.2 Preprocessing Expectation
- `normalizedText`: `下雨前五分钟的空气`
- `preservedPhrases`
  - expected: `下雨前五分钟`
  - expected: `空气`
- `duplicateFlags`
  - expected: none
- `pollutionFlags`
  - expected: none
- `languageHints`
  - expected: `zh`
  - acceptable: `zh-poetic`
- `whyDefinedThisWay`: `下雨前五分钟` 是关键时间性张力，不能被预处理成普通 `下雨前` 或直接约化成 `雨`。

### 2.3 Span Decomposition Expectation
- span-1
  - `spanText`: `下雨前五分钟`
  - `spanType`: `modifier-span`
  - `semanticFunction`: `base-source`
  - `whyPreserved`: 它描述的是临界状态和将落未落，不是天气事件本体。
- span-2
  - `spanText`: `空气`
  - `spanType`: `sensory-span`
  - `semanticFunction`: `base-source`
  - `whyPreserved`: 语义中心是空气，不是雨滴。

### 2.4 Query Routing Expectation
- `expected queryRoute`: `poetic-atmospheric`
- `acceptable alternative routes`
  - `mixed-compositional`
    - only if engine 把 `下雨前` 错当成 weather event 与 atmosphere 并置，但 planner 仍须保临界空气优先
- `forbidden routes`
  - `explicit-motif`
  - `vague-underspecified`
  - `constraint-negation`
- `rationale`: 这里没有稳定对象母题，只有强 atmospheric threshold。任何 object-first 路由都在误读。

### 2.5 Semantic Role Assignment Expectation
- role-1
  - `role`: `base-atmosphere`
  - `sourceSpanIds`: `span-1`, `span-2`
  - `confidenceBand`: `high`
  - `rationale`: 重点是湿度上升、压低、将落未落的空气状态。
- role-2
  - `role`: `sensory-modifier`
  - `sourceSpanIds`: `span-2`
  - `confidenceBand`: `high`
  - `rationale`: `空气` 强化为表面天气和湿度，不应被物化。
- role-3
  - `role`: `structure-hint`
  - `sourceSpanIds`: `span-1`
  - `confidenceBand`: `medium`
  - `rationale`: 临界感更适合低压、悬置、未完全扩散的结构。
- role-4
  - `role`: `rendering-bias`
  - `sourceSpanIds`: `span-1`, `span-2`
  - `confidenceBand`: `medium`
  - `rationale`: 应偏 atmospheric suspension，而非降雨图示。

### 2.6 Pattern-Semantic Slot Projection Expectation
- `Pattern Architecture`
  - `expectedHighConfidence`: `field`
  - `acceptableCandidates`: `scattered`
  - `forbiddenProjection`: `repeat_unit`, `medallion`
  - `projectionRationale`: 这是整体天气，不是对象单元。
- `Motif Family`
  - `expectedHighConfidence`: `mist_field`
  - `acceptableCandidates`: `grain_speckle`, `wave_fluid`
  - `forbiddenProjection`: `cloud icon`, `raindrop motif`
  - `projectionRationale`: 雨还没下，重点不在雨滴。
- `Abstraction Level`
  - `expectedHighConfidence`: `ambient`
  - `acceptableCandidates`: `suggestive`
  - `forbiddenProjection`: `recognizable`, `literal`
  - `projectionRationale`: 这是阈值感，不应做成识别物。
- `Structural Order`
  - `expectedHighConfidence`: `low_order`
  - `acceptableCandidates`: `hidden_grid`
  - `forbiddenProjection`: `high_order`
  - `projectionRationale`: 压低、将落未落比整齐秩序更关键。
- `Density & Breathing`
  - `expectedHighConfidence`: `breathing_gradient`
  - `acceptableCandidates`: `edge_fade`, `balanced`
  - `forbiddenProjection`: `dense`
  - `projectionRationale`: 需要空气厚度变化，不是均质满铺。
- `Flow Direction`
  - `expectedHighConfidence`: `still_field`
  - `acceptableCandidates`: `multi_directional_soft`
  - `forbiddenProjection`: `tidal_wave`, `upward_evaporation`
  - `projectionRationale`: 核心是悬着，不是明显流动。
- `Color Climate`
  - `expectedHighConfidence`: `misty blue-grey`
  - `acceptableCandidates`: `sea-salt white`, `washed depth`
  - `forbiddenProjection`: `bright blue rainy`, `storm-black high contrast`
  - `projectionRationale`: 应是低压灰蓝，不是戏剧暴雨。
- `Semantic Anchor Strength`
  - `expectedHighConfidence`: `mood_anchor:medium_high`
  - `acceptableCandidates`: `movement_anchor:low`
  - `forbiddenProjection`: `object_anchor:medium`
  - `projectionRationale`: 命中感来自空气阈值，而非对象。

### 2.7 Unresolved Split Expectation
- `expectedUnresolvedSplits`
  - `更偏湿度压低` vs `更偏空气发亮前的悬置`
- `whyHighValue`: 这道分叉决定它更像低压灰雾，还是更像清亮但带湿度的临界空气。
- `whatMisleadingPathItPrevents`
  - 防止落成雨滴/云层 motif
  - 防止 planner 只问冷暖色

### 2.8 Planner Comparison / Follow-up Expectation
- `expected comparison dimensions`
  - 空气厚度
  - 亮度是否被压低
  - 临界感是更闷还是更轻悬
- `expected comparison candidate themes`
  - `humid suspended threshold`
  - `pre-rain low-contrast hush`
  - `cleaner air-before-rain edge`
- `acceptable follow-up direction`
  - 问用户更偏闷压还是偏清悬
- `forbidden fallback style`
  - 问 `要不要雨滴元素`
  - 问 `想不想更像天空`

### 2.9 Forbidden Wrong Interpretations
- 不应把 `下雨前` 提取成显式 `雨` motif。
- 不应把 `空气` 漏掉，只剩 weather category。
- 不应将其导向高对比 storm drama。
- 不应让 comparison 退化成 generic `朦胧 vs 清晰`。

---

## 3. Case GD-B1-03

### 3.1 Raw Input
- `id`: `GD-B1-03`
- `inputText`: `烟雨里有一点竹影`
- `caseType`: `mixed-compositional`
- `whyThisCaseExists`: 这个 case 测试 `烟雨` 的 base atmosphere 与 `一点竹影` 的轻母题痕迹是否能同时成立，并保住 `一点` 的弱 presence。

### 3.2 Preprocessing Expectation
- `normalizedText`: `烟雨里有一点竹影`
- `preservedPhrases`
  - expected: `烟雨`
  - expected: `一点竹影`
  - acceptable: `竹影`
- `duplicateFlags`
  - expected: none
- `pollutionFlags`
  - expected: none
- `languageHints`
  - expected: `zh-poetic`
- `whyDefinedThisWay`: `一点竹影` 必须被锁成低强度 accent，不能预处理成 `竹` 的显式对象召回。

### 3.3 Span Decomposition Expectation
- span-1
  - `spanText`: `烟雨`
  - `spanType`: `phrase-span`
  - `semanticFunction`: `base-source`
  - `whyPreserved`: 提供潮湿、悬浮、低对比 atmosphere。
- span-2
  - `spanText`: `里有`
  - `spanType`: `composition-span`
  - `semanticFunction`: `modifier`
  - `whyPreserved`: 明确后半句是嵌在 base 里的轻点缀。
- span-3
  - `spanText`: `一点`
  - `spanType`: `modifier-span`
  - `semanticFunction`: `constraint`
  - `whyPreserved`: 决定竹影只能轻轻出现。
- span-4
  - `spanText`: `竹影`
  - `spanType`: `phrase-span`
  - `semanticFunction`: `accent-source`
  - `whyPreserved`: 保留线性植物影子的痕迹，不是竹林场景。

### 3.4 Query Routing Expectation
- `expected queryRoute`: `mixed-compositional`
- `acceptable alternative routes`
  - `poetic-atmospheric`
    - only if planner 仍把 `竹影保留强度` 作为 unresolved 分叉留下
- `forbidden routes`
  - `explicit-motif`
  - `vague-underspecified`
- `rationale`: 这里不是纯 atmosphere，因为 `竹影` 不是可删噪声；也不是 explicit motif，因为 `烟雨` 和 `一点` 都在压对象性。

### 3.5 Semantic Role Assignment Expectation
- role-1
  - `role`: `base-atmosphere`
  - `sourceSpanIds`: `span-1`
  - `confidenceBand`: `high`
  - `rationale`: `烟雨` 是全句底子。
- role-2
  - `role`: `accent-motif`
  - `sourceSpanIds`: `span-4`
  - `confidenceBand`: `medium`
  - `rationale`: 竹只应以影子痕迹存在。
- role-3
  - `role`: `structure-hint`
  - `sourceSpanIds`: `span-2`, `span-3`
  - `confidenceBand`: `high`
  - `rationale`: `里有一点` 明确要求 base-accent split 且 accent weight 很低。
- role-4
  - `role`: `color-cue`
  - `sourceSpanIds`: `span-1`, `span-4`
  - `confidenceBand`: `medium`
  - `rationale`: 可推浅灰蓝与洗淡青绿，但不应高饱和。
- role-5
  - `role`: `rendering-bias`
  - `sourceSpanIds`: `span-1`, `span-3`, `span-4`
  - `confidenceBand`: `high`
  - `rationale`: 重点是影，不是竹节对象。

### 3.6 Pattern-Semantic Slot Projection Expectation
- `Pattern Architecture`
  - `expectedHighConfidence`: `field`
  - `acceptableCandidates`: `scattered`
  - `forbiddenProjection`: `lattice_vine` as dominant
  - `projectionRationale`: 竹影只是点进去，不该长成藤格。
- `Motif Family`
  - `expectedHighConfidence`: `hybrid_botanical_fluid`
  - `acceptableCandidates`: `botanical_linear`, `mist_field`
  - `forbiddenProjection`: `botanical_mass`
  - `projectionRationale`: 应是湿雾中的线性影痕。
- `Abstraction Level`
  - `expectedHighConfidence`: `suggestive`
  - `acceptableCandidates`: `ambient`
  - `forbiddenProjection`: `recognizable`
  - `projectionRationale`: 竹只能被“认到一点点”。
- `Structural Order`
  - `expectedHighConfidence`: `hidden_grid`
  - `acceptableCandidates`: `organic_repeat`
  - `forbiddenProjection`: `high_order`
- `Density & Breathing`
  - `expectedHighConfidence`: `sparse`
  - `acceptableCandidates`: `clustered_sparse`, `breathing_gradient`
  - `forbiddenProjection`: `dense`
- `Flow Direction`
  - `expectedHighConfidence`: `vertical drift`
  - `acceptableCandidates`: `diagonal_breeze`, `multi_directional_soft`
  - `forbiddenProjection`: `tidal_wave`
  - `projectionRationale`: 竹影和烟雨都更像轻垂与轻飘。
- `Color Climate`
  - `expectedHighConfidence`: `misty blue-grey`
  - `acceptableCandidates`: `washed sage`, `pale aqua`
  - `forbiddenProjection`: `fresh bamboo green`
- `Semantic Anchor Strength`
  - `expectedHighConfidence`: `hybrid_anchor:medium`
  - `acceptableCandidates`: `mood_anchor:medium_high`
  - `forbiddenProjection`: `object_anchor:high`

### 3.7 Unresolved Split Expectation
- `expectedUnresolvedSplits`
  - `更保烟雨整体` vs `更保一点竹影`
  - `竹影更像影子` vs `竹影稍可辨认`
- `whyHighValue`: 这决定图样是湿雾主导还是竹影主导，也决定用户的“命中感”来自氛围还是对象痕迹。
- `whatMisleadingPathItPrevents`
  - 竹林插画
  - generic 雾感模糊卡

### 3.8 Planner Comparison / Follow-up Expectation
- `expected comparison dimensions`
  - 竹影保留强度
  - 烟雨厚度
  - 影子线条是否可读
- `expected comparison candidate themes`
  - `mist-first with faint bamboo trace`
  - `bamboo-shadow trace in soft rain`
- `acceptable follow-up direction`
  - 问用户更想保烟雨还是保一点竹影
- `forbidden fallback style`
  - 直接问 `要竹子吗`
  - 直接问 `想中式一点吗`

### 3.9 Forbidden Wrong Interpretations
- 不应把 `竹影` 拉成高存在感 motif。
- 不应把 `烟雨` 只当色彩滤镜，不参与 base atmosphere。
- 不应导向传统山水场景构图。
- 不应忽略 `一点` 这个关键约束。

---

## 4. Case GD-B1-04

### 4.1 Raw Input
- `id`: `GD-B1-04`
- `inputText`: `花叶意向，但不要太满`
- `caseType`: `constraint-negation`
- `whyThisCaseExists`: 这个 case 用来测试 constraint 是否能压住对象扩张冲动，尤其是 `花叶` 很容易把系统拉向 dense botanical mass。

### 4.2 Preprocessing Expectation
- `normalizedText`: `花叶意向，但不要太满`
- `preservedPhrases`
  - expected: `花叶意向`
  - expected: `不要太满`
- `duplicateFlags`
  - expected: none
- `pollutionFlags`
  - expected: none
- `languageHints`
  - expected: `zh`
- `whyDefinedThisWay`: `意向` 说明对象并不要求清楚，`不要太满` 是前台 planner 不能丢的强 constraint。

### 4.3 Span Decomposition Expectation
- span-1
  - `spanText`: `花叶意向`
  - `spanType`: `phrase-span`
  - `semanticFunction`: `accent-source`
  - `whyPreserved`: 提供 motif family 倾向，但不要求花叶全貌。
- span-2
  - `spanText`: `但`
  - `spanType`: `composition-span`
  - `semanticFunction`: `modifier`
  - `whyPreserved`: 明确后半句是约束性转折，不可忽略。
- span-3
  - `spanText`: `不要太满`
  - `spanType`: `constraint-span`
  - `semanticFunction`: `constraint`
  - `whyPreserved`: 直接限制密度、呼吸和视觉重量。

### 4.4 Query Routing Expectation
- `expected queryRoute`: `constraint-negation`
- `acceptable alternative routes`
  - `mixed-compositional`
    - only if engine 同时显式保留 `constraint-before-positive-anchor`
- `forbidden routes`
  - `explicit-motif`
  - `poetic-atmospheric`
  - `vague-underspecified`
- `rationale`: 这里最稳定的是约束，而不是 motif 本身。若先走 motif-first，后续常会补救式地再减满，风险很高。

### 4.5 Semantic Role Assignment Expectation
- role-1
  - `role`: `accent-motif`
  - `sourceSpanIds`: `span-1`
  - `confidenceBand`: `medium`
  - `rationale`: 花叶存在，但仅作为意向线索。
- role-2
  - `role`: `constraint`
  - `sourceSpanIds`: `span-3`
  - `confidenceBand`: `high`
  - `rationale`: 这是全句真正的主导条件。
- role-3
  - `role`: `structure-hint`
  - `sourceSpanIds`: `span-3`
  - `confidenceBand`: `high`
  - `rationale`: 应直接压到疏密与呼吸。
- role-4
  - `role`: `rendering-bias`
  - `sourceSpanIds`: `span-1`, `span-3`
  - `confidenceBand`: `medium`
  - `rationale`: 允许花叶痕迹，但拒绝装饰性满铺。

### 4.6 Pattern-Semantic Slot Projection Expectation
- `Pattern Architecture`
  - `expectedHighConfidence`: `scattered`
  - `acceptableCandidates`: `field`, `lattice_vine`
  - `forbiddenProjection`: `bordered_field` with dense fill
- `Motif Family`
  - `expectedHighConfidence`: `botanical_linear`
  - `acceptableCandidates`: `hybrid_botanical_fluid`
  - `forbiddenProjection`: `botanical_mass`
- `Abstraction Level`
  - `expectedHighConfidence`: `suggestive`
  - `acceptableCandidates`: `hybrid`
  - `forbiddenProjection`: `literal`
- `Structural Order`
  - `expectedHighConfidence`: `organic_repeat`
  - `acceptableCandidates`: `hidden_grid`
  - `forbiddenProjection`: `high_order`
- `Density & Breathing`
  - `expectedHighConfidence`: `sparse`
  - `acceptableCandidates`: `clustered_sparse`, `center_loose`
  - `forbiddenProjection`: `dense`, `balanced` if visually crowded
- `Flow Direction`
  - `expectedHighConfidence`: `multi_directional_soft`
  - `acceptableCandidates`: `diagonal_breeze`
  - `forbiddenProjection`: `still_field`
- `Color Climate`
  - `expectedHighConfidence`: open
  - `acceptableCandidates`: `washed sage`, `muted olive`, `sea-salt white`
  - `forbiddenProjection`: `high-saturation floral multicolor`
  - `projectionRationale`: 此句没有给稳定颜色锚，不应硬补色。
- `Semantic Anchor Strength`
  - `expectedHighConfidence`: `object_anchor:medium`
  - `acceptableCandidates`: `hybrid_anchor:medium`
  - `forbiddenProjection`: `object_anchor:high`

### 4.7 Unresolved Split Expectation
- `expectedUnresolvedSplits`
  - `更偏花叶线性痕迹` vs `更偏抽象植物气息`
  - `更疏` vs `局部有小簇但整体留白`
- `whyHighValue`: 一个控制 motif recognizability，一个控制密度落点，都是高信息增益。
- `whatMisleadingPathItPrevents`
  - 大片花团锦簇
  - planner 只问“喜欢花还是叶”

### 4.8 Planner Comparison / Follow-up Expectation
- `expected comparison dimensions`
  - 花叶是否仍可辨认
  - 留白比例
  - 局部簇状程度
- `expected comparison candidate themes`
  - `airy floral-leaf trace`
  - `sparser botanical contour`
  - `small clusters with breathing room`
- `acceptable follow-up direction`
  - 问用户更想保可辨认花叶，还是保抽象植物气息
- `forbidden fallback style`
  - `你想花多一点还是少一点`
  - `你想热闹一点还是简单一点`

### 4.9 Forbidden Wrong Interpretations
- 不应因 `花叶` 直接把密度补满。
- 不应把 `不要太满` 仅当文案语气词。
- 不应导向高饱和花布或欧式满铺花纹。
- 不应让 planner 忽略 constraint，先展示一堆密 floral comparisons。

---

## 5. Case GD-B1-05

### 5.1 Raw Input
- `id`: `GD-B1-05`
- `inputText`: `雪地与天空没有分界线`
- `caseType`: `poetic-atmospheric`
- `whyThisCaseExists`: 这个 case 检查系统能否把 `边界消失` 识别为核心结构语义，而不是把 `雪地` 和 `天空` 当成两个对象库入口。

### 5.2 Preprocessing Expectation
- `normalizedText`: `雪地与天空没有分界线`
- `preservedPhrases`
  - expected: `雪地与天空`
  - expected: `没有分界线`
- `duplicateFlags`
  - expected: none
- `pollutionFlags`
  - expected: none
- `languageHints`
  - expected: `zh-poetic`
- `whyDefinedThisWay`: `没有分界线` 是高价值 phrase，必须保住；否则会退化成雪景对象识别。

### 5.3 Span Decomposition Expectation
- span-1
  - `spanText`: `雪地`
  - `spanType`: `phrase-span`
  - `semanticFunction`: `base-source`
  - `whyPreserved`: 提供白、静、空场。
- span-2
  - `spanText`: `与`
  - `spanType`: `composition-span`
  - `semanticFunction`: `modifier`
  - `whyPreserved`: 表示两个区域在关系上被拉平。
- span-3
  - `spanText`: `天空`
  - `spanType`: `phrase-span`
  - `semanticFunction`: `base-source`
  - `whyPreserved`: 与 `雪地` 共同构成同一色气候与同一边界问题。
- span-4
  - `spanText`: `没有分界线`
  - `spanType`: `negation-span`
  - `semanticFunction`: `anti-literal-bias`
  - `whyPreserved`: 核心不是两个物体，而是边界消融。

### 5.4 Query Routing Expectation
- `expected queryRoute`: `poetic-atmospheric`
- `acceptable alternative routes`
  - `constraint-negation`
    - only if engine 明确把 `没有分界线` 当成主 constraint，并且仍避免对象化
- `forbidden routes`
  - `explicit-motif`
  - `mixed-compositional`
  - `vague-underspecified`
- `rationale`: 虽然有两个名词，但它们不是并置对象，而是共同服务于一个边界消融 atmosphere。

### 5.5 Semantic Role Assignment Expectation
- role-1
  - `role`: `base-atmosphere`
  - `sourceSpanIds`: `span-1`, `span-3`, `span-4`
  - `confidenceBand`: `high`
  - `rationale`: 白、静、边界消融是全句核心。
- role-2
  - `role`: `color-cue`
  - `sourceSpanIds`: `span-1`, `span-3`
  - `confidenceBand`: `high`
  - `rationale`: 应导向低对比冷白、灰白，而不是蓝天白雪 postcard。
- role-3
  - `role`: `structure-hint`
  - `sourceSpanIds`: `span-4`
  - `confidenceBand`: `high`
  - `rationale`: 边界消融直接决定结构应连续、弱界线。
- role-4
  - `role`: `rendering-bias`
  - `sourceSpanIds`: `span-4`
  - `confidenceBand`: `high`
  - `rationale`: 明确避免 horizon line。

### 5.6 Pattern-Semantic Slot Projection Expectation
- `Pattern Architecture`
  - `expectedHighConfidence`: `field`
  - `acceptableCandidates`: `panelled` only if seam is dissolved
  - `forbiddenProjection`: `bordered_field`, `stripe_band`
- `Motif Family`
  - `expectedHighConfidence`: `mist_field`
  - `acceptableCandidates`: `grain_speckle`
  - `forbiddenProjection`: `snowflake motif`, `cloud motif`
- `Abstraction Level`
  - `expectedHighConfidence`: `ambient`
  - `acceptableCandidates`: `suggestive`
  - `forbiddenProjection`: `recognizable`
- `Structural Order`
  - `expectedHighConfidence`: `low_order`
  - `acceptableCandidates`: `hidden_grid`
  - `forbiddenProjection`: `high_order`
- `Density & Breathing`
  - `expectedHighConfidence`: `edge_fade`
  - `acceptableCandidates`: `breathing_gradient`, `sparse`
  - `forbiddenProjection`: `dense`
- `Flow Direction`
  - `expectedHighConfidence`: `still_field`
  - `acceptableCandidates`: `multi_directional_soft`
  - `forbiddenProjection`: `horizontal_drift`
- `Color Climate`
  - `expectedHighConfidence`: `sea-salt white`
  - `acceptableCandidates`: `misty blue-grey`
  - `forbiddenProjection`: `bright sky blue`, `high-contrast black-white`
- `Semantic Anchor Strength`
  - `expectedHighConfidence`: `mood_anchor:medium_high`
  - `acceptableCandidates`: `palette_anchor:medium_high`
  - `forbiddenProjection`: `object_anchor:medium`

### 5.7 Unresolved Split Expectation
- `expectedUnresolvedSplits`
  - `更偏白到发空` vs `更偏灰白有一点天气层`
- `whyHighValue`: 这决定它更像无边界雪白场，还是更像有低压空气层的空场。
- `whatMisleadingPathItPrevents`
  - postcard 雪景
  - 地平线构图

### 5.8 Planner Comparison / Follow-up Expectation
- `expected comparison dimensions`
  - 边界消融程度
  - 白的冷暖与灰度
  - 是否保一点空气层
- `expected comparison candidate themes`
  - `boundaryless white field`
  - `snow-sky merged haze`
- `acceptable follow-up direction`
  - 问用户更偏纯白空场还是更偏灰白天气层
- `forbidden fallback style`
  - 问 `你喜欢雪花元素吗`
  - 问 `更喜欢天空还是雪地`

### 5.9 Forbidden Wrong Interpretations
- 不应把 `雪地` 和 `天空` 当成两个 motif 做拼贴。
- 不应把 `没有分界线` 忽略掉。
- 不应自动生成 horizon / skyline。
- 不应导向节庆雪花图案。

---

## 6. Case GD-B1-06

### 6.1 Raw Input
- `id`: `GD-B1-06`
- `inputText`: `薄纱后面的光`
- `caseType`: `poetic-atmospheric`
- `whyThisCaseExists`: 这个 case 测试系统是否能把 `遮挡后的发光` 识别为表面透光行为，而不是把 `薄纱` 做成布料对象 motif。

### 6.2 Preprocessing Expectation
- `normalizedText`: `薄纱后面的光`
- `preservedPhrases`
  - expected: `薄纱后面的光`
  - acceptable: `薄纱`
  - acceptable: `光`
- `duplicateFlags`
  - expected: none
- `pollutionFlags`
  - expected: none
- `languageHints`
  - expected: `zh-poetic`
- `whyDefinedThisWay`: 必须优先锁住整个关系短语，而不是把 `薄纱` 和 `光` 拆成两个无关对象。

### 6.3 Span Decomposition Expectation
- span-1
  - `spanText`: `薄纱`
  - `spanType`: `phrase-span`
  - `semanticFunction`: `modifier`
  - `whyPreserved`: 是过滤层，不是主 motif。
- span-2
  - `spanText`: `后面`
  - `spanType`: `composition-span`
  - `semanticFunction`: `modifier`
  - `whyPreserved`: 表明光不是直出，而是隔着出现。
- span-3
  - `spanText`: `光`
  - `spanType`: `sensory-span`
  - `semanticFunction`: `base-source`
  - `whyPreserved`: 这是全句真正主锚。

### 6.4 Query Routing Expectation
- `expected queryRoute`: `poetic-atmospheric`
- `acceptable alternative routes`
  - none preferred
- `forbidden routes`
  - `explicit-motif`
  - `mixed-compositional`
  - `vague-underspecified`
- `rationale`: 这里没有稳定对象并置，只有表面过滤后的光感。若掉 `explicit-motif`，说明系统被 `纱` 字牵走了。

### 6.5 Semantic Role Assignment Expectation
- role-1
  - `role`: `base-atmosphere`
  - `sourceSpanIds`: `span-3`
  - `confidenceBand`: `high`
  - `rationale`: 主体是柔化后的光。
- role-2
  - `role`: `sensory-modifier`
  - `sourceSpanIds`: `span-1`, `span-2`
  - `confidenceBand`: `high`
  - `rationale`: `薄纱后面` 指的是滤光与遮挡，而非物体本身。
- role-3
  - `role`: `structure-hint`
  - `sourceSpanIds`: `span-1`, `span-2`
  - `confidenceBand`: `medium`
  - `rationale`: 应有层叠、透过、弱边界的结构。
- role-4
  - `role`: `rendering-bias`
  - `sourceSpanIds`: `span-1`, `span-3`
  - `confidenceBand`: `high`
  - `rationale`: 不能做成窗帘图案。

### 6.6 Pattern-Semantic Slot Projection Expectation
- `Pattern Architecture`
  - `expectedHighConfidence`: `field`
  - `acceptableCandidates`: `panelled`
  - `forbiddenProjection`: `repeat_unit`
- `Motif Family`
  - `expectedHighConfidence`: `geometric_sunwash`
  - `acceptableCandidates`: `mist_field`, `organic_contour`
  - `forbiddenProjection`: `fabric motif`
- `Abstraction Level`
  - `expectedHighConfidence`: `ambient`
  - `acceptableCandidates`: `hybrid`
  - `forbiddenProjection`: `literal`
- `Structural Order`
  - `expectedHighConfidence`: `hidden_grid`
  - `acceptableCandidates`: `low_order`
  - `forbiddenProjection`: `high_order`
- `Density & Breathing`
  - `expectedHighConfidence`: `center_loose`
  - `acceptableCandidates`: `breathing_gradient`, `sparse`
  - `forbiddenProjection`: `dense`
- `Flow Direction`
  - `expectedHighConfidence`: `radial_diffusion`
  - `acceptableCandidates`: `upward_evaporation`
  - `forbiddenProjection`: `tidal_wave`
- `Color Climate`
  - `expectedHighConfidence`: `soft_layered_contrast`
  - `acceptableCandidates`: `sea-salt white`, `airy_pastel`
  - `forbiddenProjection`: `hard spotlight contrast`
- `Semantic Anchor Strength`
  - `expectedHighConfidence`: `mood_anchor:medium`
  - `acceptableCandidates`: `palette_anchor:medium`
  - `forbiddenProjection`: `object_anchor:medium`

### 6.7 Unresolved Split Expectation
- `expectedUnresolvedSplits`
  - `更偏发白散开` vs `更偏透过薄层的柔亮`
- `whyHighValue`: 这决定是更像空气化的光，还是更像带表层介质的光。
- `whatMisleadingPathItPrevents`
  - 窗帘 / 薄纱对象化
  - 强光束戏剧化

### 6.8 Planner Comparison / Follow-up Expectation
- `expected comparison dimensions`
  - 光的柔化程度
  - 薄层存在感
  - 边缘是否更散开
- `expected comparison candidate themes`
  - `veiled glow`
  - `diffused backlight field`
- `acceptable follow-up direction`
  - 问用户想更偏朦胧发白还是偏柔亮透出
- `forbidden fallback style`
  - 问 `要不要纱感纹理`
  - 问 `是窗帘的感觉吗`

### 6.9 Forbidden Wrong Interpretations
- 不应把 `薄纱` 变成具象纺织物图案。
- 不应把 `光` 做成直射 spotlight。
- 不应掉到室内场景叙事。
- 不应只问颜色，不问透光行为。

---

## 7. Case GD-B1-07

### 7.1 Raw Input
- `id`: `GD-B1-07`
- `inputText`: `一点孤帆远影`
- `caseType`: `explicit-motif`
- `whyThisCaseExists`: 这个 case 测试系统能否在对象存在时仍保持极低 presence、远距感和孤意，而不是把帆船 motif 画满。

### 7.2 Preprocessing Expectation
- `normalizedText`: `一点孤帆远影`
- `preservedPhrases`
  - expected: `孤帆远影`
  - expected: `一点`
- `duplicateFlags`
  - expected: none
- `pollutionFlags`
  - expected: none
- `languageHints`
  - expected: `zh-poetic`
- `whyDefinedThisWay`: `远影` 和 `一点` 是压存在感的关键，不得在预处理里丢失。

### 7.3 Span Decomposition Expectation
- span-1
  - `spanText`: `一点`
  - `spanType`: `modifier-span`
  - `semanticFunction`: `constraint`
  - `whyPreserved`: 限制 presence 强度。
- span-2
  - `spanText`: `孤帆`
  - `spanType`: `phrase-span`
  - `semanticFunction`: `accent-source`
  - `whyPreserved`: 提供可识别对象痕迹。
- span-3
  - `spanText`: `远影`
  - `spanType`: `modifier-span`
  - `semanticFunction`: `anti-literal-bias`
  - `whyPreserved`: 决定它必须远、淡、影子化。

### 7.4 Query Routing Expectation
- `expected queryRoute`: `explicit-motif`
- `acceptable alternative routes`
  - `mixed-compositional`
    - only if engine 增补出强 atmosphere base，但当前原句并未显式提供
- `forbidden routes`
  - `poetic-atmospheric`
  - `vague-underspecified`
  - `constraint-negation`
- `rationale`: 这里确实存在明确 motif，但必须是 trace-first，不是 object-full。它不是纯 atmosphere，因为 `孤帆` 提供了实际对象锚。

### 7.5 Semantic Role Assignment Expectation
- role-1
  - `role`: `accent-motif`
  - `sourceSpanIds`: `span-2`
  - `confidenceBand`: `high`
  - `rationale`: `孤帆` 是主锚，但应保持轻度存在。
- role-2
  - `role`: `constraint`
  - `sourceSpanIds`: `span-1`
  - `confidenceBand`: `high`
  - `rationale`: 决定对象绝不能高存在感。
- role-3
  - `role`: `rendering-bias`
  - `sourceSpanIds`: `span-3`
  - `confidenceBand`: `high`
  - `rationale`: `远影` 要求影化、远距、低对比。
- role-4
  - `role`: `structure-hint`
  - `sourceSpanIds`: `span-1`, `span-3`
  - `confidenceBand`: `medium`
  - `rationale`: 更适合空场中一处小锚点。

### 7.6 Pattern-Semantic Slot Projection Expectation
- `Pattern Architecture`
  - `expectedHighConfidence`: `field`
  - `acceptableCandidates`: `scattered`
  - `forbiddenProjection`: `repeat_unit`
- `Motif Family`
  - `expectedHighConfidence`: `wave_fluid`
  - `acceptableCandidates`: `organic_contour`
  - `forbiddenProjection`: `literal ship icon`
- `Abstraction Level`
  - `expectedHighConfidence`: `suggestive`
  - `acceptableCandidates`: `recognizable`
  - `forbiddenProjection`: `literal`
- `Structural Order`
  - `expectedHighConfidence`: `low_order`
  - `acceptableCandidates`: `hidden_grid`
  - `forbiddenProjection`: `high_order`
- `Density & Breathing`
  - `expectedHighConfidence`: `sparse`
  - `acceptableCandidates`: `center_loose`, `edge_fade`
  - `forbiddenProjection`: `dense`
- `Flow Direction`
  - `expectedHighConfidence`: `horizontal_drift`
  - `acceptableCandidates`: `still_field`
  - `forbiddenProjection`: `radial_diffusion`
- `Color Climate`
  - `expectedHighConfidence`: open
  - `acceptableCandidates`: `misty blue-grey`, `washed depth`
  - `forbiddenProjection`: `nautical red-blue-white`
- `Semantic Anchor Strength`
  - `expectedHighConfidence`: `object_anchor:medium`
  - `acceptableCandidates`: `hybrid_anchor:medium`
  - `forbiddenProjection`: `object_anchor:high`

### 7.7 Unresolved Split Expectation
- `expectedUnresolvedSplits`
  - `更像远处一点点帆影` vs `更像空场里一丝方向感`
- `whyHighValue`: 这道分叉决定对象 recognizability 和抽象程度。
- `whatMisleadingPathItPrevents`
  - 船图标
  - 海景插画

### 7.8 Planner Comparison / Follow-up Expectation
- `expected comparison dimensions`
  - 帆影可辨认度
  - 空场比例
  - 方向感是否明显
- `expected comparison candidate themes`
  - `faint distant sail trace`
  - `near-abstract shoreline direction`
- `acceptable follow-up direction`
  - 问用户是更要那一点“帆”，还是更要远与空
- `forbidden fallback style`
  - 问 `要不要海浪`
  - 问 `更古风还是现代`

### 7.9 Forbidden Wrong Interpretations
- 不应把 `孤帆` 画成完整船。
- 不应忽略 `一点` 和 `远影`。
- 不应自动补全大面积海面和天空叙事。
- 不应用 generic `图案复杂度` 提问替代 presence split。

---

## 8. Case GD-B1-08

### 8.1 Raw Input
- `id`: `GD-B1-08`
- `inputText`: `石头肌理但别太硬`
- `caseType`: `constraint-negation`
- `whyThisCaseExists`: 这个 case 用来验证 material / texture cues 与反向约束如何共同作用，避免系统把 `石头` 直接拉成高硬度、高几何、高对比。

### 8.2 Preprocessing Expectation
- `normalizedText`: `石头肌理但别太硬`
- `preservedPhrases`
  - expected: `石头肌理`
  - expected: `别太硬`
- `duplicateFlags`
  - expected: none
- `pollutionFlags`
  - expected: none
- `languageHints`
  - expected: `zh`
- `whyDefinedThisWay`: `肌理` 与 `别太硬` 都不能丢。前者是 material cue，后者是对质感解释方向的强限制。

### 8.3 Span Decomposition Expectation
- span-1
  - `spanText`: `石头肌理`
  - `spanType`: `phrase-span`
  - `semanticFunction`: `base-source`
  - `whyPreserved`: 这里要的是矿物/颗粒/纹理性，不一定要石块对象。
- span-2
  - `spanText`: `但`
  - `spanType`: `composition-span`
  - `semanticFunction`: `modifier`
  - `whyPreserved`: 表示后句修正前句解释。
- span-3
  - `spanText`: `别太硬`
  - `spanType`: `constraint-span`
  - `semanticFunction`: `constraint`
  - `whyPreserved`: 防止高对比、直线、冷硬切割。

### 8.4 Query Routing Expectation
- `expected queryRoute`: `constraint-negation`
- `acceptable alternative routes`
  - `explicit-motif`
    - only if engine 把 `石头肌理` 当 material motif，但必须仍由 constraint 主导 planner
- `forbidden routes`
  - `poetic-atmospheric`
  - `vague-underspecified`
- `rationale`: 这里的主问题不是有没有石头，而是石头感如何不变硬。

### 8.5 Semantic Role Assignment Expectation
- role-1
  - `role`: `base-atmosphere`
  - `sourceSpanIds`: `span-1`
  - `confidenceBand`: `medium`
  - `rationale`: `肌理` 可以先作为表面感而非对象。
- role-2
  - `role`: `structure-hint`
  - `sourceSpanIds`: `span-1`
  - `confidenceBand`: `high`
  - `rationale`: 它首先影响纹理、颗粒、边缘处理。
- role-3
  - `role`: `constraint`
  - `sourceSpanIds`: `span-3`
  - `confidenceBand`: `high`
  - `rationale`: 明确压制硬度和切割感。
- role-4
  - `role`: `rendering-bias`
  - `sourceSpanIds`: `span-1`, `span-3`
  - `confidenceBand`: `high`
  - `rationale`: 应偏 softened mineral texture，而非 stone slab illustration。

### 8.6 Pattern-Semantic Slot Projection Expectation
- `Pattern Architecture`
  - `expectedHighConfidence`: `field`
  - `acceptableCandidates`: `scattered`
  - `forbiddenProjection`: `panelled` as hard blocks
- `Motif Family`
  - `expectedHighConfidence`: `grain_speckle`
  - `acceptableCandidates`: `organic_contour`
  - `forbiddenProjection`: `geometric stone tiles`
- `Abstraction Level`
  - `expectedHighConfidence`: `hybrid`
  - `acceptableCandidates`: `suggestive`, `ambient`
  - `forbiddenProjection`: `literal`
- `Structural Order`
  - `expectedHighConfidence`: `organic_repeat`
  - `acceptableCandidates`: `hidden_grid`
  - `forbiddenProjection`: `high_order`
- `Density & Breathing`
  - `expectedHighConfidence`: `balanced`
  - `acceptableCandidates`: `clustered_sparse`
  - `forbiddenProjection`: `dense`
- `Flow Direction`
  - `expectedHighConfidence`: `still_field`
  - `acceptableCandidates`: `multi_directional_soft`
  - `forbiddenProjection`: `stripe_band`
- `Color Climate`
  - `expectedHighConfidence`: `muted olive`, `washed depth`
  - `acceptableCandidates`: `misty blue-grey`, `neutral clean`
  - `forbiddenProjection`: `charcoal-black high contrast`
- `Semantic Anchor Strength`
  - `expectedHighConfidence`: `movement_anchor:low`
  - `acceptableCandidates`: `mood_anchor:medium`, `palette_anchor:medium`
  - `forbiddenProjection`: `object_anchor:high`

### 8.7 Unresolved Split Expectation
- `expectedUnresolvedSplits`
  - `更偏颗粒矿物感` vs `更偏柔化纹理层`
- `whyHighValue`: 这决定石头感是来自颗粒组织还是来自柔化表层。
- `whatMisleadingPathItPrevents`
  - 水泥/岩板化
  - planner 只问冷暖或明暗

### 8.8 Planner Comparison / Follow-up Expectation
- `expected comparison dimensions`
  - 颗粒感强弱
  - 边缘软硬
  - 石感更多来自结构还是表面
- `expected comparison candidate themes`
  - `softened mineral grain`
  - `stone-derived but textile-soft texture`
- `acceptable follow-up direction`
  - 问用户更想保矿物颗粒，还是更想保柔化织物感
- `forbidden fallback style`
  - 问 `喜欢石头图案吗`
  - 问 `要不要更硬朗一点`

### 8.9 Forbidden Wrong Interpretations
- 不应把它做成砖、岩板、瓷砖拼法。
- 不应忽略 `别太硬`。
- 不应自动提高对比、直线或分割边界。
- 不应把 `石头` 当纯对象而不是 texture cue。

---

## 9. Case GD-B1-09

### 9.1 Raw Input
- `id`: `GD-B1-09`
- `inputText`: `荷花在风里摇曳`
- `caseType`: `mixed-compositional`
- `whyThisCaseExists`: 这个 case 检查系统是否会把 `荷花` 与 `风里摇曳` 同时纳入，形成对象痕迹与运动势能的耦合，而不是只抓花。

### 9.2 Preprocessing Expectation
- `normalizedText`: `荷花在风里摇曳`
- `preservedPhrases`
  - expected: `荷花`
  - expected: `风里摇曳`
- `duplicateFlags`
  - expected: none
- `pollutionFlags`
  - expected: none
- `languageHints`
  - expected: `zh-poetic`
- `whyDefinedThisWay`: `摇曳` 是 flow 核心，不能在预处理时只剩 `风` 或只剩 `花`。

### 9.3 Span Decomposition Expectation
- span-1
  - `spanText`: `荷花`
  - `spanType`: `phrase-span`
  - `semanticFunction`: `accent-source`
  - `whyPreserved`: 提供植物对象痕迹。
- span-2
  - `spanText`: `在`
  - `spanType`: `composition-span`
  - `semanticFunction`: `modifier`
  - `whyPreserved`: 连接对象与环境行为。
- span-3
  - `spanText`: `风里摇曳`
  - `spanType`: `modifier-span`
  - `semanticFunction`: `base-source`
  - `whyPreserved`: 提供 movement anchor 和流向，而不是背景描述。

### 9.4 Query Routing Expectation
- `expected queryRoute`: `mixed-compositional`
- `acceptable alternative routes`
  - `explicit-motif`
    - only if planner 仍将 `动势` 作为主比较维度保留下来
- `forbidden routes`
  - `poetic-atmospheric`
  - `vague-underspecified`
- `rationale`: `荷花` 给出 motif，`风里摇曳` 给出 movement base。只取一边都会损失主意图。

### 9.5 Semantic Role Assignment Expectation
- role-1
  - `role`: `accent-motif`
  - `sourceSpanIds`: `span-1`
  - `confidenceBand`: `high`
  - `rationale`: 荷花是主要对象线索。
- role-2
  - `role`: `base-atmosphere`
  - `sourceSpanIds`: `span-3`
  - `confidenceBand`: `medium`
  - `rationale`: `风里摇曳` 提供的是整体气动与轻摆，不只是动作词。
- role-3
  - `role`: `structure-hint`
  - `sourceSpanIds`: `span-2`, `span-3`
  - `confidenceBand`: `high`
  - `rationale`: 决定流向和节奏。
- role-4
  - `role`: `rendering-bias`
  - `sourceSpanIds`: `span-1`, `span-3`
  - `confidenceBand`: `medium`
  - `rationale`: 重点是摇曳态，不应画成静止写实荷花。

### 9.6 Pattern-Semantic Slot Projection Expectation
- `Pattern Architecture`
  - `expectedHighConfidence`: `field`
  - `acceptableCandidates`: `scattered`, `repeat_unit`
  - `forbiddenProjection`: `medallion`
- `Motif Family`
  - `expectedHighConfidence`: `botanical_linear`
  - `acceptableCandidates`: `hybrid_botanical_fluid`
  - `forbiddenProjection`: `botanical_mass`
- `Abstraction Level`
  - `expectedHighConfidence`: `hybrid`
  - `acceptableCandidates`: `suggestive`, `recognizable`
  - `forbiddenProjection`: `literal`
- `Structural Order`
  - `expectedHighConfidence`: `organic_repeat`
  - `acceptableCandidates`: `mid_order`
  - `forbiddenProjection`: `high_order`
- `Density & Breathing`
  - `expectedHighConfidence`: `balanced`
  - `acceptableCandidates`: `clustered_sparse`
  - `forbiddenProjection`: `dense`
- `Flow Direction`
  - `expectedHighConfidence`: `diagonal_breeze`
  - `acceptableCandidates`: `horizontal_drift`, `multi_directional_soft`
  - `forbiddenProjection`: `still_field`
- `Color Climate`
  - `expectedHighConfidence`: open
  - `acceptableCandidates`: `washed sage`, `misty blue-grey`, `muted olive`
  - `forbiddenProjection`: `high-saturation pink-green pond literalism`
- `Semantic Anchor Strength`
  - `expectedHighConfidence`: `hybrid_anchor:medium_high`
  - `acceptableCandidates`: `movement_anchor:medium_high`, `object_anchor:medium`
  - `forbiddenProjection`: `object_anchor:high`

### 9.7 Unresolved Split Expectation
- `expectedUnresolvedSplits`
  - `更保荷花轮廓` vs `更保风里摇曳的动势`
- `whyHighValue`: 这是对象性和运动性的主分叉，决定后续 motif recognizability 与 flow 强弱。
- `whatMisleadingPathItPrevents`
  - 静态荷花插画
  - 无对象的 generic 飘动感

### 9.8 Planner Comparison / Follow-up Expectation
- `expected comparison dimensions`
  - 荷花可辨认度
  - 摇曳方向感
  - 花与风谁更主导
- `expected comparison candidate themes`
  - `lotus-trace with breeze rhythm`
  - `breeze-first botanical sway`
- `acceptable follow-up direction`
  - 问用户更想保花形还是保风感
- `forbidden fallback style`
  - 直接问 `要不要荷叶`
  - 问 `更中式还是更现代`

### 9.9 Forbidden Wrong Interpretations
- 不应只抓 `荷花`，忽略 `摇曳`。
- 不应把它导向荷塘景观叙事。
- 不应把风感做成强波浪水纹主导。
- 不应使用 generic 花型 comparison 代替动势 comparison。

---

## 10. Case GD-B1-10

### 10.1 Raw Input
- `id`: `GD-B1-10`
- `inputText`: `还不确定，想高级一点`
- `caseType`: `vague-underspecified`
- `whyThisCaseExists`: 这个 case 用来检验系统在缺少稳定对象和 atmosphere 锚时，是否能保持 guided-disambiguation，而不是胡乱补 motif。

### 10.2 Preprocessing Expectation
- `normalizedText`: `还不确定，想高级一点`
- `preservedPhrases`
  - expected: `还不确定`
  - expected: `高级一点`
- `duplicateFlags`
  - expected: none
- `pollutionFlags`
  - expected: none
- `languageHints`
  - expected: `zh`
- `whyDefinedThisWay`: 这不是内容语义，而是偏好稳定度信号。不能把 `高级` 误转成单一视觉模板。

### 10.3 Span Decomposition Expectation
- span-1
  - `spanText`: `还不确定`
  - `spanType`: `modifier-span`
  - `semanticFunction`: `constraint`
  - `whyPreserved`: 表示当前主问题是未定向，不应假定稳定母题。
- span-2
  - `spanText`: `高级一点`
  - `spanType`: `modifier-span`
  - `semanticFunction`: `modifier`
  - `whyPreserved`: 仅是审美倾向，尚不足以单独落具体图样。

### 10.4 Query Routing Expectation
- `expected queryRoute`: `vague-underspecified`
- `acceptable alternative routes`
  - none preferred
- `forbidden routes`
  - `explicit-motif`
  - `poetic-atmospheric`
  - `mixed-compositional`
  - `constraint-negation`
- `rationale`: 这是典型 guided-disambiguation 起点。任何其它 route 都是在擅自补内容。

### 10.5 Semantic Role Assignment Expectation
- role-1
  - `role`: `constraint`
  - `sourceSpanIds`: `span-1`
  - `confidenceBand`: `high`
  - `rationale`: 首先表明当前信息不足。
- role-2
  - `role`: `rendering-bias`
  - `sourceSpanIds`: `span-2`
  - `confidenceBand`: `low`
  - `rationale`: `高级一点` 只能作为后续 comparison 选题偏置，不能直接锁 slot。

### 10.6 Pattern-Semantic Slot Projection Expectation
- `Pattern Architecture`
  - `expectedHighConfidence`: none
  - `acceptableCandidates`: `field`, `hidden-grid-led architectures` as low-confidence prompts only
  - `forbiddenProjection`: any locked value
  - `projectionRationale`: 当前不应伪装成系统已经知道图样怎么成立。
- `Motif Family`
  - `expectedHighConfidence`: none
  - `acceptableCandidates`: open
  - `forbiddenProjection`: `botanical_linear`, `geometric_sunwash`, or any locked family
- `Abstraction Level`
  - `expectedHighConfidence`: none
  - `acceptableCandidates`: `suggestive`, `hybrid` as exploratory candidates
  - `forbiddenProjection`: locked `literal` or locked `ambient`
- `Structural Order`
  - `expectedHighConfidence`: none
  - `acceptableCandidates`: open
  - `forbiddenProjection`: locked `high_order`
- `Density & Breathing`
  - `expectedHighConfidence`: none
  - `acceptableCandidates`: open
  - `forbiddenProjection`: locked `dense`
- `Flow Direction`
  - `expectedHighConfidence`: none
  - `acceptableCandidates`: open
  - `forbiddenProjection`: locked directional claim
- `Color Climate`
  - `expectedHighConfidence`: none
  - `acceptableCandidates`: restrained low-saturation options for comparison only
  - `forbiddenProjection`: fixed black-gold luxury palette
- `Semantic Anchor Strength`
  - `expectedHighConfidence`: none
  - `acceptableCandidates`: open
  - `forbiddenProjection`: any medium-high or high anchor

### 10.7 Unresolved Split Expectation
- `expectedUnresolvedSplits`
  - `更偏留白克制` vs `更偏有存在感但不俗`
  - `更偏抽象气质` vs `更偏轻对象痕迹`
- `whyHighValue`: 当前要先建立高信息增益的审美坐标，而不是去猜对象。
- `whatMisleadingPathItPrevents`
  - 任意“高级风”模板化
  - 一步跳到 motif patch

### 10.8 Planner Comparison / Follow-up Expectation
- `expected comparison dimensions`
  - 克制 vs 存在感
  - 抽象 vs 轻母题
  - 低饱和 clean vs layered depth
- `expected comparison candidate themes`
  - `restrained airy sophistication`
  - `layered but quiet refinement`
  - `minimal trace sophistication`
- `acceptable follow-up direction`
  - 问高级感更来自留白、层次还是一点点可辨认痕迹
- `forbidden fallback style`
  - `你喜欢什么花`
  - `你喜欢什么颜色`
  - `高级一点是法式还是中古`

### 10.9 Forbidden Wrong Interpretations
- 不应把 `高级一点` 硬映射成黑金、极简、欧式、轻奢等固定风格。
- 不应锁任何 motif family。
- 不应假装系统已经知道用户要海边、花叶或几何。
- 不应使用 generic `复杂还是简单` 作为唯一问题。

---

## 11. Case GD-B1-11

### 11.1 Raw Input
- `id`: `GD-B1-11`
- `inputText`: `加州海滩 加州海滩`
- `caseType`: `polluted-input / preprocessing-sensitive`
- `whyThisCaseExists`: 这个 case 测试重复污染能否被折叠，且不把重复误解为高强度 object commitment。

### 11.2 Preprocessing Expectation
- `normalizedText`: `加州海滩`
- `preservedPhrases`
  - expected: `加州海滩`
- `duplicateFlags`
  - expected: `exact-repeat`
  - acceptable: `duplicate-phrase-collapsed`
- `pollutionFlags`
  - expected: `repetition-noise`
- `languageHints`
  - expected: `zh`
- `whyDefinedThisWay`: 重复应在 preprocessing 层被折叠；前台 comparison 文案不应暴露“用户重复说了两次”。

### 11.3 Span Decomposition Expectation
- span-1
  - `spanText`: `加州海滩`
  - `spanType`: `phrase-span`
  - `semanticFunction`: `base-source`
  - `whyPreserved`: 重复折叠后只保留一个稳定语义单元。

### 11.4 Query Routing Expectation
- `expected queryRoute`: `poetic-atmospheric`
- `acceptable alternative routes`
  - `mixed-compositional`
    - forbidden unless retrieval 自己补出第二锚点；原句本身没有
- `forbidden routes`
  - `explicit-motif`
  - `vague-underspecified`
- `rationale`: `海滩` 这里更像 atmosphere base 的场景气质入口，不应因重复而被抬升为对象 motif。

### 11.5 Semantic Role Assignment Expectation
- role-1
  - `role`: `base-atmosphere`
  - `sourceSpanIds`: `span-1`
  - `confidenceBand`: `high`
  - `rationale`: 重复不应新增语义角色，只能轻微提高稳定度。
- role-2
  - `role`: `color-cue`
  - `sourceSpanIds`: `span-1`
  - `confidenceBand`: `medium`
  - `rationale`: 可导向 `sun-bleached sand`、`sea-salt white`。
- role-3
  - `role`: `rendering-bias`
  - `sourceSpanIds`: `span-1`
  - `confidenceBand`: `medium`
  - `rationale`: 防止写实海滩 postcard。

### 11.6 Pattern-Semantic Slot Projection Expectation
- `Pattern Architecture`
  - `expectedHighConfidence`: `field`
  - `acceptableCandidates`: `scattered`
  - `forbiddenProjection`: `literal scenic panel`
- `Motif Family`
  - `expectedHighConfidence`: `wave_fluid`
  - `acceptableCandidates`: `mist_field`
  - `forbiddenProjection`: `palm-tree/beach-chair iconography`
- `Abstraction Level`
  - `expectedHighConfidence`: `ambient`
  - `acceptableCandidates`: `suggestive`
  - `forbiddenProjection`: `literal`
- `Structural Order`
  - `expectedHighConfidence`: `hidden_grid`
  - `acceptableCandidates`: `organic_repeat`
  - `forbiddenProjection`: `high_order`
- `Density & Breathing`
  - `expectedHighConfidence`: `sparse`
  - `acceptableCandidates`: `breathing_gradient`
  - `forbiddenProjection`: `dense`
- `Flow Direction`
  - `expectedHighConfidence`: `horizontal_drift`
  - `acceptableCandidates`: `tidal_wave`
  - `forbiddenProjection`: `still_field`
- `Color Climate`
  - `expectedHighConfidence`: `sun-bleached sand`
  - `acceptableCandidates`: `sea-salt white`, `pale aqua`
  - `forbiddenProjection`: `saturated beach postcard palette`
- `Semantic Anchor Strength`
  - `expectedHighConfidence`: `mood_anchor:medium`
  - `acceptableCandidates`: `palette_anchor:medium`
  - `forbiddenProjection`: `object_anchor:high`

### 11.7 Unresolved Split Expectation
- `expectedUnresolvedSplits`
  - `更偏晒白沙感` vs `更偏海风空气感`
- `whyHighValue`: 折叠重复后，仍要提出真正有信息增益的分叉，而不是围绕重复本身发问。
- `whatMisleadingPathItPrevents`
  - 把重复当“非常确定”
  - 把重复当对象权重倍增

### 11.8 Planner Comparison / Follow-up Expectation
- `expected comparison dimensions`
  - 沙感 vs 风感
  - 明亮度
  - 留白比例
- `expected comparison candidate themes`
  - `sun-bleached coastal openness`
  - `airier seaside field`
- `acceptable follow-up direction`
  - 问更偏沙白还是偏海风通透
- `forbidden fallback style`
  - 问 `你是不是特别喜欢加州海滩`
  - 暴露重复污染给用户

### 11.9 Forbidden Wrong Interpretations
- 不应保留两个完全相同 span。
- 不应因为重复而提升为 `explicit-motif`。
- 不应在 comparison 文案里回显重复。
- 不应把重复视为强风格意向锁定。

---

## 12. Case GD-B1-12

### 12.1 Raw Input
- `id`: `GD-B1-12`
- `inputText`: `加州海滩`
- `caseType`: `poetic-atmospheric`
- `whyThisCaseExists`: 这个 case 与 GD-B1-11 组成最小对照组，用来验证“重复折叠后的语义”和“原始单次输入”的 route 与 role 是否保持一致。

### 12.2 Preprocessing Expectation
- `normalizedText`: `加州海滩`
- `preservedPhrases`
  - expected: `加州海滩`
- `duplicateFlags`
  - expected: none
- `pollutionFlags`
  - expected: none
- `languageHints`
  - expected: `zh`
- `whyDefinedThisWay`: 它应该和 GD-B1-11 在语义层高度一致，只在 preprocessing trace 上不同。

### 12.3 Span Decomposition Expectation
- span-1
  - `spanText`: `加州海滩`
  - `spanType`: `phrase-span`
  - `semanticFunction`: `base-source`
  - `whyPreserved`: 作为 atmosphere 场景锚，而非对象拼图入口。

### 12.4 Query Routing Expectation
- `expected queryRoute`: `poetic-atmospheric`
- `acceptable alternative routes`
  - none preferred
- `forbidden routes`
  - `explicit-motif`
  - `mixed-compositional`
  - `vague-underspecified`
- `rationale`: 这里没有第二锚点，没有显式 constraint，也没有稳定对象优先级。正确入口是 atmosphere-first。

### 12.5 Semantic Role Assignment Expectation
- role-1
  - `role`: `base-atmosphere`
  - `sourceSpanIds`: `span-1`
  - `confidenceBand`: `high`
  - `rationale`: 它先命中海边空气、明亮和留白。
- role-2
  - `role`: `color-cue`
  - `sourceSpanIds`: `span-1`
  - `confidenceBand`: `medium`
  - `rationale`: 可产生浅沙白、盐白、浅水蓝候选。
- role-3
  - `role`: `rendering-bias`
  - `sourceSpanIds`: `span-1`
  - `confidenceBand`: `medium`
  - `rationale`: 防止写实海景与旅游图像。

### 12.6 Pattern-Semantic Slot Projection Expectation
- `Pattern Architecture`
  - `expectedHighConfidence`: `field`
  - `acceptableCandidates`: `scattered`
  - `forbiddenProjection`: `panelled scenic composition`
- `Motif Family`
  - `expectedHighConfidence`: `wave_fluid`
  - `acceptableCandidates`: `hybrid_botanical_fluid` only if retrieval 增补轻 vegetation trace
  - `forbiddenProjection`: `beach icon set`
- `Abstraction Level`
  - `expectedHighConfidence`: `ambient`
  - `acceptableCandidates`: `suggestive`
  - `forbiddenProjection`: `literal`
- `Structural Order`
  - `expectedHighConfidence`: `hidden_grid`
  - `acceptableCandidates`: `mid_order`
  - `forbiddenProjection`: `high_order`
- `Density & Breathing`
  - `expectedHighConfidence`: `sparse`
  - `acceptableCandidates`: `breathing_gradient`
  - `forbiddenProjection`: `dense`
- `Flow Direction`
  - `expectedHighConfidence`: `horizontal_drift`
  - `acceptableCandidates`: `tidal_wave`
  - `forbiddenProjection`: `still_field`
- `Color Climate`
  - `expectedHighConfidence`: `sun-bleached sand`
  - `acceptableCandidates`: `sea-salt white`, `pale aqua`
  - `forbiddenProjection`: `candy beach palette`
- `Semantic Anchor Strength`
  - `expectedHighConfidence`: `mood_anchor:medium`
  - `acceptableCandidates`: `palette_anchor:medium`
  - `forbiddenProjection`: `object_anchor:high`

### 12.7 Unresolved Split Expectation
- `expectedUnresolvedSplits`
  - `更偏沙白晒感` vs `更偏海风空气感`
- `whyHighValue`: 单句 case 仍需提供一个真正能分流后续方案的高价值分叉。
- `whatMisleadingPathItPrevents`
  - generic `喜欢海浪还是沙滩`
  - 写实海景倾向

### 12.8 Planner Comparison / Follow-up Expectation
- `expected comparison dimensions`
  - 沙感 vs 风感
  - 通透 vs 稍湿润
  - 留白程度
- `expected comparison candidate themes`
  - `sun-bleached coast`
  - `airier coastal field`
- `acceptable follow-up direction`
  - 问用户更偏晒白沙感还是更偏海风通透
- `forbidden fallback style`
  - 问 `要不要贝壳/海浪/棕榈树`
  - 问 `你是不是想要加州风格`

### 12.9 Forbidden Wrong Interpretations
- 不应掉成旅游海报式海滩图案。
- 不应将 `加州` 解读成风格标签并直接锁视觉模板。
- 不应把 `海滩` 当作必须具象出现的对象。
- 不应与 GD-B1-11 在 route / role 层产生实质性差异。

---

## 13. Batch Notes

### 13.1 Coverage Summary

本批 12 条覆盖：
- `poetic-atmospheric`
  - GD-B1-02
  - GD-B1-05
  - GD-B1-06
  - GD-B1-12
- `explicit-motif`
  - GD-B1-07
- `mixed-compositional`
  - GD-B1-01
  - GD-B1-03
  - GD-B1-09
- `constraint-negation`
  - GD-B1-04
  - GD-B1-08
- `vague-underspecified`
  - GD-B1-10
- `polluted-input / preprocessing-sensitive`
  - GD-B1-11
  - GD-B1-12 as control pair

### 13.2 Immediate Schema Stress Points Exposed By This Batch

- spec 需要的 `spanType` 包含 `sensory-span` 与 `constraint-span`，但当前实现类型定义尚未完整对齐。
- `Flow Direction` 的推荐枚举与自然语言 case 需要之间仍有缝，例如 `vertical drift` 对竹影是自然表达，但当前 PRD 枚举未显式给出。
- `Color Climate` 在某些 vague / constraint-led case 中应允许明确 `open / not yet locked`，否则系统会被迫过早补色。
- `Semantic Anchor Strength` 当前常写成单值，但 gold cases 已经暴露出“anchor type”和“strength level”最好拆层表示。
- `constraint-negation` 与 `poetic-atmospheric` 的边界还需细化，像 `没有分界线` 既是 negation 又是 atmosphere structure，不宜只按字面否定处理。

