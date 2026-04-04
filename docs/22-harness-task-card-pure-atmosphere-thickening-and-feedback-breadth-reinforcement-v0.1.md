# Harness Task Card v0.1

## Status

Status: completed

Completed on: 2026-04-05

### Execution summary

This task is no longer pending. The main deliverables have been completed and written back into the repo:

- package gold expanded from `20` to `26`: `datasets/frontstage/package/gold-v0.1.jsonl`
- feedback-signals gold expanded from `16` to `22`: `datasets/frontstage/feedback-signals/gold-v0.1.jsonl`
- pure atmosphere package coverage reached `moistThresholdAtmosphere: 4` and `coastalAiryBrightness: 4`
- `blendedProposalIds` coverage reached `7` and `correctedDomain` coverage reached `5`
- pilot snapshot refreshed: `datasets/frontstage/pilot-v0.1/manifest-v0.1.json`
- coverage and readiness docs refreshed: `datasets/frontstage/ANCHOR-COVERAGE-NOTES-v0.1.md`, `docs/training-readiness-checkpoint-after-task-22-v0.1.md`

### Validation and pilot readout

Validation after Task 22:

- `package: 26`
- `response-plan: 6`
- `feedback-signals: 22`
- `closed-loop: 8`
- `corrected-domain closed-loop: 1`
- `validation: OK`

Current pilot baseline snapshots:

- package baseline: `experiments/frontstage-pilot/results/package-baseline-v0.1.json`
- feedback baseline: `experiments/frontstage-pilot/results/feedback-baseline-v0.1.json`

Headline metrics:

- package: `domainAccuracy = 0.6538`, `averageHandleF1 = 0.6731`, `averageAxisF1 = 0.5359`, `averageMisleadingPathF1 = 0.6269`
- feedback: `selectedProposalAccuracy = 0.4091`, `blendedProposalAccuracy = 0.4091`, `boostedHandlesAccuracy = 0.4091`, `reducedHandlesAccuracy = 0.4091`, `correctedDomainAccuracy = 0.6818`

### Readiness decision

Task 22 solved the raw coverage problem for pure atmosphere and thin feedback types.
It did not yet solve discriminability.

The new main gap is:

- pure atmosphere still collides with nearby mixed-imagery and vague-preference phrasing
- corrected-domain feedback is still often confused with blend / nudge language

Recommended next pass:

- continue anchor-serving expansion
- make the next expansion discriminative rather than purely additive
- do not yet promote formal training or response-plan generation into the main track

## Task
This task must follow the `frontstage-semantic-anchor-guardrails` skill.

进入 **Task 22: Pure-Atmosphere Thickening and Feedback Breadth Reinforcement v0.1**。

Task 21 已经把系统从“barely pilotable”推进到“pilotable with real signal”。

但结论也已经很清楚：

- 还不适合把下一轮主任务切成正式训练
- 也不适合把 `response-plan generation` 拉进主训练线
- 当前最薄的，不是 pipeline 是否存在，而是 anchor thickness 仍不均衡

因此，下一轮必须继续沿着同一条 frontstage semantic mainline 前进，
而不是换中心。

---

## 1. Core objective

本轮只有两个主目标。

### Objective A — Thicken the thinnest pure package domains

继续扩 `package`，
但这次不要再把主要增量放在 mixed imagery。

必须优先补厚：

- `moistThresholdAtmosphere`
- `coastalAiryBrightness`

要求是把它们从“单例或近单例 domain”
拉到开始具有重复可学性的厚度。

### Objective B — Reinforce the thinnest feedback re-entry types

继续扩 `feedback-signals`，
但只补当前最薄、最影响训练判断的两类：

- `blend-proposals`
- `corrected-domain`

而且必须继续保持：

- `previousPackage`
- `previousResponsePlan`

也就是说，
feedback supervision 仍然必须是 **feedback-over-context**，
不能退化成只看 `feedbackText` 的标签任务。

---

## 2. Non-negotiable semantic anchors

本轮仍然只围绕以下 anchors 推进：

1. `interpretationDomain` is still the first semantic object
2. `interpretationHandles` remain the main user-facing semantic object
3. `composition by weighted blending` remains the continuation logic
4. `ProposalFeedbackSignal` remains feedback-over-context
5. `misleadingPaths` remain part of the intended ability surface

如果某个新增样本、字段或 supervision 不能明确服务这 5 个点，
就不应该进入这轮主线。

---

## 3. What this round is NOT

### 不要做

- 不要把本轮主增量继续堆到 `mixedImageryComposition`
- 不要把 `response-plan generation` 升级为下一轮 headline task
- 不要继续扩新的 schema 中心
- 不要把 auxiliary supervision 做成独立训练目标
- 不要为了 baseline 数字更好看而改写 gold 的 anchor 重心
- 不要把 corrected-domain 做成脱离 previous context 的分类集

### 本轮要做

- 补厚 pure atmosphere domains 的 package supervision
- 补厚 `blend-proposals` 与 `corrected-domain` 的 feedback supervision
- 重跑 pilot / baseline
- 再判断是否接近 formal-training preparation

---

## 4. Required source materials to revisit

请至少回读并对照：

### 4.1 Anchor and guardrail docs

- `docs/task-chain-12-20-semantic-anchor-map-v0.1.md`
- `docs/future-task-guardrails-from-task-chain-12-20-v0.1.md`
- `docs/minimal-supervision-layer-design-v0.1.md`
- `datasets/frontstage/PACKAGE-SAMPLE-CURATOR-CHECKLIST-v0.1.md`

### 4.2 Current result and coverage docs

- `datasets/frontstage/ANCHOR-COVERAGE-NOTES-v0.1.md`
- `docs/training-readiness-checkpoint-after-task-21-v0.1.md`

### 4.3 Current data assets

- `datasets/frontstage/package/gold-v0.1.jsonl`
- `datasets/frontstage/feedback-signals/gold-v0.1.jsonl`
- `datasets/frontstage/closed-loop/gold-v0.1.jsonl`
- `datasets/frontstage/schema-v0.2.json`

### 4.4 Current pilot outputs

- `datasets/frontstage/pilot-v0.1/manifest-v0.1.json`
- `experiments/frontstage-pilot/results/package-baseline-v0.1.json`
- `experiments/frontstage-pilot/results/feedback-baseline-v0.1.json`

---

## 5. Core question for this round

本轮必须明确回答：

## 在不换 semantic anchors 的前提下，
## pure atmosphere package 和最薄 feedback re-entry 类型，
## 还能补到什么程度，才接近更正式训练准备？

这轮不要再问：

- schema 还缺不缺字段
- response-plan wording 能不能先做生成训练

这轮只问：

- pure `moistThresholdAtmosphere` 是否仍接近不可学
- pure `coastalAiryBrightness` 是否仍接近不可学
- `blend-proposals` 是否仍然太薄而只能给 warning signal
- `corrected-domain` 是否已开始跨 domain pair 出现可重复模式

---

## 6. Required workstreams

### 6.1 Workstream A — Pure-atmosphere package thickening

请继续扩 `package` 样本，
但新增样本必须以纯 atmosphere 域为主，
不能继续主要依赖 mixed imagery 来“借厚度”。

#### 优先 domain

- `moistThresholdAtmosphere`
- `coastalAiryBrightness`

#### 样本要求

每条新增 package sample 都必须先回答：

1. 为什么这是 pure atmosphere domain，而不是 mixed imagery
2. 为什么这些 `interpretationHandles` 仍然是主语义中心
3. 它支持哪些 `compositionAxes`
4. 它在压住哪些 `misleadingPaths`
5. 它如何帮助 pure atmosphere 这条主线更可学

#### 最低要求

- `moistThresholdAtmosphere` 从 `1` 扩到至少 `4`
- `coastalAiryBrightness` 从 `1` 扩到至少 `4`
- package 总样本数扩到至少 `26`

#### 推荐输入簇

- 下雨前、潮意未落满、空气被压低但未成雾墙
- 晒白空气、通透海边亮感、轻盐感但不写实海景
- 只想要空气，不要对象
- 更偏阈值气候，不要叶、不要花、不要竹影

#### 每条新增 package sample 至少要包含

- `output.package`
- `output.supervision.evidenceCues`
- `output.supervision.associationReadings`
- `output.supervision.designTranslationHints`

并且必须通过：

- `datasets/frontstage/PACKAGE-SAMPLE-CURATOR-CHECKLIST-v0.1.md`

### 6.2 Workstream B — Feedback breadth reinforcement on thin types

请继续扩 `feedback-signals`，
但主增量只放在以下两类：

- `blend-proposals`
- `corrected-domain`

#### 最低要求

- `blendedProposalIds` 样本数提升到至少 `7`
- `correctedDomain` 样本数提升到至少 `5`
- feedback 总样本数扩到至少 `22`

#### 必须覆盖

- pure atmosphere 内部 blend
- mixed -> pure atmosphere corrected-domain
- pure coastal -> pure moist corrected-domain
- pure moist -> pure coastal corrected-domain
- blend + emphasis adjustment
- corrected-domain + reduce old trace

#### feedback 文本要求

仍然使用自然反馈表达，例如：

- `我想要的是那层空气本身，不要再带叶子了。`
- `海边那边还是亮了点，我更想要下雨前压着的空气。`
- `两种空气我都想留，但别变成具体海景或雨景。`
- `还是更想往晒白通透那边走，潮意先收一点。`

不要写成 parser-friendly 操作句。

### 6.3 Workstream C — Closed-loop support only if it serves the thin anchors

closed-loop 仍不是主战场。

只有在明确服务本轮最薄 anchors 时，才允许补少量样本。

#### 若补，优先补

- corrected-domain continuation into pure atmosphere
- blend continuation inside pure atmosphere proposals

要求仍然是：

- `nextPackage`
- `nextResponsePlan`

必须清楚显示：

- 旧 package 中哪些对象被保留
- 哪些对象被压低或移除
- feedback 如何重新组织同一 semantic chain

### 6.4 Workstream D — Pilot refresh and anchor-based evaluation

本轮完成扩样后，请至少重跑：

- package baseline
- feedback baseline

并继续按 anchor 汇报，不要只给总分。

#### Package baseline 至少汇报

- pure atmosphere domains 的识别稳定度
- handles 是否仍被 mixed imagery 邻居污染
- 哪些 misleading-path 仍最容易塌回 literal scene

#### Feedback baseline 至少汇报

- `blend-proposals` 稳定度
- `corrected-domain` across domain pairs 的稳定度
- old trace / old motif 是否还能被正确压低
- 哪些错误是样本不足，哪些错误说明 anchor 仍偏薄

---

## 7. Required validation against the core cases

本轮仍必须反查以下 core lanes：

1. `薰衣草的芳香`
2. `加州沙滩和柠檬叶的香气`
3. `烟雨里有一点竹影`
4. `还不确定，想高级一点`
5. `花叶意向，但不要太满`
6. `石头肌理但别太硬`
7. 新增 pure `moistThresholdAtmosphere` case cluster
8. 新增 pure `coastalAiryBrightness` case cluster

针对每条 lane，至少检查：

1. 是否仍然首先服务 `interpretationDomain`
2. 是否仍然最终服务 `interpretationHandles`
3. feedback / re-entry 是否仍然回到同一 semantic chain
4. pure atmosphere 新样本是否没有重新滑回 mixed imagery 借义

---

## 8. What counts as success in this round

这轮成功，不是因为：

- 样本数又变多了
- baseline 数字又涨了一点
- 文档看起来更完整了

而是因为：

### 你能更有把握地说：

- pure `moistThresholdAtmosphere` 已不再是近单例 domain
- pure `coastalAiryBrightness` 已不再是近单例 domain
- `blend-proposals` 已不再只是稀薄 warning signal
- `corrected-domain` 已开始跨多组 domain pair 出现可学模式
- pilot 结果开始说明 pure atmosphere 这条链本身可学，而不是只能依附 mixed imagery

---

## 9. Required outputs

### 9.1 Updated package gold

- `datasets/frontstage/package/gold-v0.1.jsonl`

### 9.2 Updated feedback gold

- `datasets/frontstage/feedback-signals/gold-v0.1.jsonl`

### 9.3 Optional closed-loop updates

- `datasets/frontstage/closed-loop/gold-v0.1.jsonl`

### 9.4 Updated coverage note

更新：

- `datasets/frontstage/ANCHOR-COVERAGE-NOTES-v0.1.md`

至少写清：

- pure atmosphere domain counts
- handle cluster thickness changes
- `blend-proposals` 与 `corrected-domain` 覆盖变化
- 仍最薄的 anchors

### 9.5 Pilot refresh

必要时更新：

- `datasets/frontstage/pilot-v0.1/`
- `experiments/frontstage-pilot/results/*`

### 9.6 Result summary

建议新增：

- `docs/training-readiness-checkpoint-after-task-22-v0.1.md`

至少明确：

- 现在是否接近开始更正式训练准备
- 如果还没达到，最薄的是 pure atmosphere 还是 feedback breadth
- 下一轮是否仍需继续 anchor-serving 扩样

---

## 10. Decision threshold for “closer to formal-training preparation”

本轮结束后，请明确按下面门槛判断。

### 可以说“更接近正式训练准备”，至少需要看到：

1. `moistThresholdAtmosphere` 与 `coastalAiryBrightness` 都不再接近单例
2. pure atmosphere handles 不再只绑定单一 phrasing
3. `blend-proposals` 已形成多条可比较样本，而不是零散个例
4. `corrected-domain` 已跨不止一组 domain pair 出现
5. pilot 结果开始把 pure atmosphere 从 mixed imagery 邻近域中分出来
6. 所有新增 supervision 仍然明确 subordinate to anchors

如果这些条件仍明显不满足，
就不要写成“已接近正式训练”。

---

## 11. Completion criteria

这轮只有在以下条件都满足时才算完成：

1. 已补厚 pure atmosphere package 样本
2. 已补厚 `blend-proposals` 与 `corrected-domain` feedback 样本
3. 新样本没有偏离 `interpretationDomain / handles / proposal / re-entry / misleadingPaths`
4. 已重跑 pilot / baseline
5. 已明确判断是否更接近正式训练准备
6. 已明确指出若未达标，最薄缺口还在哪个 anchor 上

---

## 12. Work mode

和 Task 21 一样：

## 不要中途停下来等 review。

请直接一路推进到这轮真正完成。

只有在：

- 你发现 pure atmosphere 很难在当前 anchor 体系下与 mixed imagery 清晰分开
- 或你发现 corrected-domain 的 supervision 必须重新切目标
- 或你发现现有 anchors 之间出现明显冲突

才停下来问我。

否则请直接做完。

---

## 13. Final reminder

这轮最重要的，不是把 atmosphere 样本再堆几条。

而是确保：

## pure atmosphere 这条语义主线本身开始变得可学，
## 而不是继续依附 mixed imagery 借出一点可学性。
