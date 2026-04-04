# Harness Task Card v0.1

## Status

Status: completed

Completed on: 2026-04-04

### Execution summary

This task is no longer pending. The main deliverables have been completed and written back into the repo:

- package gold expanded from `6` to `20`: `datasets/frontstage/package/gold-v0.1.jsonl`
- feedback-signals gold expanded from `7` to `16`: `datasets/frontstage/feedback-signals/gold-v0.1.jsonl`
- pilot snapshot and schema entry refreshed: `scripts/prepare-frontstage-pilot.mjs`, `datasets/frontstage/pilot-v0.1/manifest-v0.1.json`
- anchor coverage note and readiness checkpoint added: `datasets/frontstage/ANCHOR-COVERAGE-NOTES-v0.1.md`, `docs/training-readiness-checkpoint-after-task-21-v0.1.md`

### Validation and pilot readout

Validation has been rerun against the current workspace state:

- `package: 20`
- `response-plan: 6`
- `feedback-signals: 16`
- `closed-loop: 8`
- `corrected-domain closed-loop: 1`
- `validation: OK`

Current pilot baseline snapshots:

- package baseline: `experiments/frontstage-pilot/results/package-baseline-v0.1.json`
- feedback baseline: `experiments/frontstage-pilot/results/feedback-baseline-v0.1.json`

Headline metrics:

- package: `domainAccuracy = 0.85`, `averageHandleF1 = 0.68`, `averageAxisF1 = 0.6467`, `averageMisleadingPathF1 = 0.74`
- feedback: `correctedDomainAccuracy = 0.8125`, `boostedHandlesAccuracy = 0.375`, `reducedHandlesAccuracy = 0.5`, `blendedProposalAccuracy = 0.5`

### Readiness decision

The current state has crossed from “barely pilotable” into “pilotable with real signal”, but it is still not ready to make formal training the next main task.

The remaining thin anchors are still:

- pure `moistThresholdAtmosphere` and `coastalAiryBrightness` package coverage
- `blend-proposals` and `corrected-domain` feedback breadth

Recommended next pass:

- continue one more anchor-serving expansion round
- do not yet promote `response-plan generation` into the main training track

## Task
This task must follow the `frontstage-semantic-anchor-guardrails` skill.

进入 **Task 21: Anchor-Guarded Package Expansion and Feedback Reinforcement v0.1**。

当前阶段判断已经比较清楚：

- `FrontstageSemanticPackage -> FrontstageResponsePlan -> ProposalFeedbackSignal -> re-entry` 这条主链已经建立
- dataset / supervision / pilot / minimal supervision layer 已经具备
- 但当前还没达到“正式开始模型训练”的标准
- 问题不在 pipeline 能不能跑，而在：
  - `package` 这层还不够可学
  - `feedback` 虽然比 package 更接近可学，但还不够稳
  - 如果现在直接扩大训练，只会放大当前 anchor coverage 的稀薄与样本噪声

因此，下一步不是继续扩 schema，也不是直接开 full training。

这轮要做的是：

## 沿着既有 semantic anchors，补厚最关键的 package / feedback supervision，
## 让系统更接近第一版正式训练门槛。

---

## 1. Core objective

本轮有两个主目标：

### Objective A — Expand package supervision against existing anchors
围绕既有 package anchors 扩样本，而不是围绕新字段另起中心：

- `interpretationDomain`
- `domainConfidence`
- `interpretationHandles`
- `compositionAxes`
- `misleadingPaths`

同时继续保留 Task 19 新增的最小辅助监督，但必须明确：

## auxiliary supervision 只能解释 anchors，不能替代 anchors。

也就是：
- `evidenceCues`
- `associationReadings`
- `designTranslationHints`

都必须继续服务于：
- 为什么是这个 domain
- 为什么是这些 handles
- 为什么这些语义最后应这样进入 proposal / design translation

### Objective B — Reinforce feedback supervision over previous context
继续扩 `feedback-signals`，但不把它做成孤立标签任务。

必须继续以：

- `previousPackage`
- `previousResponsePlan`

为前提，
让 feedback supervision 仍然服务于：

- 选择已有 proposal
- blend proposal
- boost / reduce handles
- corrected-domain
- next-turn re-entry

---

## 2. Non-negotiable semantic anchors

本轮及之后所有动作，都必须继续围绕这些 semantic anchors：

1. `interpretationDomain` is not optional metadata
2. `interpretationHandles` remain the main user-facing semantic object
3. `composition by weighted blending` remains the frontstage continuation logic
4. `ProposalFeedbackSignal` remains feedback-over-context
5. `misleadingPaths` remain part of intended ability surface

如新增内容无法明确服务这 5 个点，则不应进入这轮主线。

---

## 3. What this round is NOT

### 不要做
- 不要继续扩一轮新 schema 中心
- 不要把 `evidenceCues / associationReadings / designTranslationHints` 本身做成主要训练目标
- 不要直接开始 `response-plan generation training`
- 不要直接开始 full training
- 不要为了 baseline 好看而粗暴改 gold sample
- 不要把 feedback 扩成不带前序上下文的孤立分类集

### 本轮要做
- 扩 `package` 主 supervision
- 扩 `feedback-signals` 主 supervision
- 重跑 anchor-based pilot / baseline
- 用结果判断是否达到“开始正式训练”的前置门槛

---

## 4. Required source materials to revisit

请至少回读并对照：

### 4.1 Anchor and guardrail docs
- `docs/task-chain-12-20-semantic-anchor-map-v0.1.md`
- `docs/future-task-guardrails-from-task-chain-12-20-v0.1.md`
- `docs/minimal-supervision-layer-design-v0.1.md`
- `datasets/frontstage/PACKAGE-SAMPLE-CURATOR-CHECKLIST-v0.1.md`

### 4.2 Current data assets
- `datasets/frontstage/package/gold-v0.1.jsonl`
- `datasets/frontstage/feedback-signals/gold-v0.1.jsonl`
- `datasets/frontstage/closed-loop/gold-v0.1.jsonl`
- `datasets/frontstage/README.md`
- `datasets/frontstage/schema-v0.2.json`

### 4.3 Current experiment assets
- `datasets/frontstage/pilot-v0.1/manifest-v0.1.json`
- `experiments/frontstage-pilot/README.md`
- `experiments/frontstage-pilot/results/package-baseline-v0.1.json`
- `experiments/frontstage-pilot/results/feedback-baseline-v0.1.json`

---

## 5. Core question for this round

本轮必须明确回答：

## 在不换 semantic anchors 的前提下，
## 我们还差多少 package / feedback coverage，才达到开始正式训练的门槛？

也就是说，这轮不是问：
- 字段还能不能更完整
- 文档还能不能更漂亮

而是问：
- `interpretationDomain` 够不够稳
- `interpretationHandles` 够不够厚
- `ProposalFeedbackSignal` 够不够依附前序语义对象
- `misleadingPaths` 是否仍被当作能力表面的一部分
- pilot 结果是否开始呈现“可训信号”

---

## 6. Required workstreams

### 6.1 Workstream A — Package expansion against anchors

请继续扩 `package` 样本，但每条新增样本都必须先回答：

1. 为什么是这个 `interpretationDomain`
2. 为什么这些 `interpretationHandles` 是主语义中心
3. 它支持哪种 `compositionAxes`
4. 它在压住哪些 `misleadingPaths`
5. 这条样本是否帮助某个 frontstage behavior 更可学

#### 最低要求
- package 总样本数扩到 **18–24 条**
- 不要只堆 mixed imagery
- 每个主 domain 尽量不再接近单例

#### 优先补的 domain / target
- `floralHerbalScent`
- `mixedImageryComposition`
- `vagueRefinementPreference`
- `softMineralTexture`

#### 优先补的意向描述簇
- scent-led descriptions
- atmosphere-led descriptions
- trace-led descriptions
- vague / under-specified preference
- mixed-intention descriptions
- constraint / negation descriptions

#### 每条新增 package sample 至少要包含
- 原有 `output.package`
- `output.supervision.evidenceCues`
- `output.supervision.associationReadings`
- `output.supervision.designTranslationHints`

并且必须通过：
- `datasets/frontstage/PACKAGE-SAMPLE-CURATOR-CHECKLIST-v0.1.md`

### 6.2 Workstream B — Feedback reinforcement over previous context

请继续扩 `feedback-signals`，
但必须继续保留：

- `previousPackage`
- `previousResponsePlan`

不要把 feedback signal 退化成：
- 只看 `feedbackText`
- 只输出孤立标签

#### 最低要求
- feedback-signals 总样本数扩到 **14–18 条**

#### 必须覆盖
- `select`
- `blend`
- `boost`
- `reduce`
- `corrected-domain`
- `boost + reduce`
- `select + boost`
- `blend + emphasis adjustment`

#### feedback 文本要求
继续使用真人自然反馈表达，例如：
- `我更偏第二种，不过空气还想再多一点。`
- `植物那层可以再退一点，我更想留香气。`
- `海边那个感觉有点偏了，我更想往草本花香这边靠。`
- `烟雨那层我还想多留一点，竹影再轻一点就对了。`

不要回退成 parser-friendly 指令句。

### 6.3 Workstream C — Closed-loop coverage only where it supports anchors

本轮 closed-loop 不是主战场，但可以按 anchor 补少量关键样本。

#### 若补，优先补
- corrected-domain continuation
- mixed imagery continuation
- vague continuation
- mineral / texture continuation

要求仍然是：
- `nextPackage`
- `nextResponsePlan`

必须清楚地显示：
- 旧 package 如何被保留 / 重排 / 压低
- feedback 如何作用于同一组 semantic objects

### 6.4 Workstream D — Pilot refresh and anchor-based evaluation

这轮完成扩样后，请至少重跑：

- package baseline
- feedback baseline

并按 anchor 汇报，不要只给总分。

#### Package baseline 至少汇报
- domain prediction stability
- handle stability
- composition axis stability
- misleading-path consistency
- 哪些 domain 仍接近不可学

#### Feedback baseline 至少汇报
- corrected-domain
- boost / reduce conflict
- blend stability
- 是否仍然依附 previous context
- 哪些错误是样本不足，哪些错误是 supervision 仍偏弱

---

## 7. Required validation against the six core cases

本轮仍必须用这 6 条 core case 反查主线是否还在：

1. `薰衣草的芳香`
2. `加州沙滩和柠檬叶的香气`
3. `烟雨里有一点竹影`
4. `还不确定，想高级一点`
5. `花叶意向，但不要太满`
6. `石头肌理但别太硬`

针对每条 case，至少检查：

1. 是否仍然首先服务 `interpretationDomain`
2. 是否仍然最终服务 `interpretationHandles`
3. proposal / feedback / re-entry 是否仍然回到同一 semantic chain
4. 新扩样本或新 supervision 是否在支撑 anchors，而不是替代 anchors

---

## 8. What counts as success in this round

这轮成功，不是因为：
- 样本数变多了
- 新字段更全了
- schema 更好看了

而是因为：

### 你能更有把握地说：
- `package` 不再只是单例 domain + 单一 phrasing
- `interpretationHandles` 不再只是少量 demo 句型
- `feedback-signals` 更像围绕前序 package / proposal 的真实 re-entry
- pilot 结果开始出现“主链可学”的信号

---

## 9. Required outputs

### 9.1 Coverage note
建议新增：
- `datasets/frontstage/ANCHOR-COVERAGE-NOTES-v0.1.md`

至少写清：
- 当前各 domain 样本数
- 各主 handle cluster 的样本厚度
- feedback signal 各类型覆盖
- 哪些 anchors 仍最薄

### 9.2 Expanded package gold
- `datasets/frontstage/package/gold-v0.1.jsonl`

### 9.3 Expanded feedback gold
- `datasets/frontstage/feedback-signals/gold-v0.1.jsonl`

### 9.4 Optional closed-loop updates
- `datasets/frontstage/closed-loop/gold-v0.1.jsonl`

### 9.5 Pilot refresh
必要时更新：
- `datasets/frontstage/pilot-v0.1/`
- `experiments/frontstage-pilot/results/*`

### 9.6 Result summary
建议新增：
- `docs/training-readiness-checkpoint-after-task-21-v0.1.md`

至少明确：
- 现在是否达到开始正式训练的标准
- 如果还没达到，最主要缺口是哪层 anchor
- 下一轮是继续补 package、补 feedback，还是可以进入更正式训练准备

---

## 10. Decision threshold for “ready to start training”

本轮结束后，请明确按下面门槛判断。

### 可以开始更正式训练准备，至少需要看到：
1. package 样本规模显著高于当前，且主 domain 不再近单例
2. 高价值 handles 不再只绑定单一 phrasing
3. feedback-signals 已覆盖主要 re-entry 类型
4. package baseline 不再接近“domain 全错”
5. feedback baseline 开始清楚分化出：
   - 哪些 signal 已可学
   - 哪些 signal 仍需更多样本
6. 所有新增 supervision 仍明确 subordinate to anchors

如果这些条件仍明显不满足，
就不要写成“已经可以正式训练”，
而应诚实给出下一轮数据建设优先级。

---

## 11. Completion criteria

这轮只有在以下条件都满足时才算完成：

1. 已按 anchor 扩充 package 样本
2. 已按 previous-context 原则扩充 feedback 样本
3. 新样本没有偏离 `interpretationDomain / handles / proposal / re-entry / misleadingPaths`
4. 已重跑 pilot / baseline
5. 已明确判断：是否达到开始更正式训练的标准
6. 已明确指出：若未达标，缺口主要在哪个 anchor 上

---

## 12. Work mode

和前几轮一样：

## 不要中途停下来等 review。

请你自己一路推进到这轮真正完成。

只有在：
- 你发现某个新增 supervision 层已经明显开始替代 `interpretationHandles`
- 或你发现 package / feedback 的训练目标必须重新切分
- 或你发现现有 anchor 定义本身已出现明显冲突

才停下来问我。

否则请直接做完。

---

## 13. Final reminder

这轮最重要的，不是把数据再堆厚一点。

而是确保：

## 我们扩的仍然是同一条 frontstage semantic mainline 的 learnability，
## 而不是继续把 schema 补得更完整、但主对象越来越模糊。
