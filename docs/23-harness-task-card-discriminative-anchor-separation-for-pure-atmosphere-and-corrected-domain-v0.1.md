# Harness Task Card v0.1

## Task
This task must follow the `frontstage-semantic-anchor-guardrails` skill.

进入 **Task 23: Discriminative Anchor Separation for Pure Atmosphere and Corrected-Domain v0.1**。

Task 22 已经把 pure atmosphere 和 thin feedback types 的 raw coverage 补起来。

但新的主问题已经很明确：

- pure atmosphere 不再是单例，但还不够可分
- `corrected-domain` 不再稀薄，但还不够可辨
- 这轮如果继续只做 additive expansion，只会继续堆厚碰撞面

因此，Task 23 不再以“多加几条样本”为目标。
这轮必须以 **discriminative separation** 为目标。

---

## 1. Core objective

本轮只有两个主目标。

### Objective A — Separate pure atmosphere from nearby domains

必须专门补一组对照样本，
让以下边界变得更清楚：

- pure `moistThresholdAtmosphere` vs atmosphere-first `mixedImageryComposition`
- pure `coastalAiryBrightness` vs coastal-trace `mixedImageryComposition`
- pure atmosphere vs `vagueRefinementPreference`

目标不是让 domain 数再变大，
而是让 domain **更不容易互相借义**。

### Objective B — Separate corrected-domain from blend / nudge

必须专门补一组 feedback 对照样本，
让以下几类话语更可区分：

- 用户仍在同 domain 内调主次 / 比例
- 用户在 blend 两个 proposal
- 用户明确离开当前 domain，切到另一个 domain

也就是说，
这轮要补的是 **decision boundary supervision**，
不是更多同型样本。

---

## 2. Non-negotiable semantic anchors

本轮仍然只围绕以下 anchors 推进：

1. `interpretationDomain` remains the first semantic object
2. `interpretationHandles` remain the main user-facing semantic object
3. `composition by weighted blending` remains the continuation logic
4. `ProposalFeedbackSignal` remains feedback-over-context
5. `misleadingPaths` remain part of the intended ability surface

所有新增对照样本都必须服务这些 anchors，
不能为了“可分”而发明新的 schema 中心。

---

## 3. What this round is NOT

### 不要做

- 不要继续纯粹按最薄 domain 机械加样
- 不要把 package 目标改成 generic classifier task
- 不要把 corrected-domain 简化成孤立 label
- 不要把 response-plan generation 拉成主训练目标
- 不要靠修改 baseline 脚本来掩盖当前碰撞

### 本轮要做

- 做 package 对照扩样
- 做 feedback decision-boundary 对照扩样
- 重跑 pilot / baseline
- 用碰撞是否下降来判断这轮是否成功

---

## 4. Required evidence from Task 22

这轮必须回看并对准以下失败面：

### 4.1 Package collisions

- `pkg-021` / `pkg-023` 被 `pkg-012` 吸到 mixed imagery
- `pkg-019` / `pkg-022` 被 `pkg-020` / `pkg-024` 吸到 coastal
- `pkg-016` 被 pure moist phrasing 吸走
- `pkg-026` 被 coastal-trace mixed imagery 吸走

### 4.2 Feedback collisions

- `fb-019` / `fb-020` 被 pure-atmosphere blend sample 吸走
- `fb-021` 被 in-domain nudge sample 吸走
- pure-atmosphere blend samples之间也互相高度混淆

---

## 5. Required workstreams

### 5.1 Workstream A — Package contrast-set expansion

请新增一组 package contrast pairs。

#### Contrast lane 1

- pure moist threshold atmosphere
- mixed imagery with atmosphere-first phrasing but still containing explicit trace object

#### Contrast lane 2

- pure coastal airy brightness
- mixed imagery with coastal air plus retained trace motif

#### Contrast lane 3

- pure atmosphere wording
- vague refinement wording that sounds airy / soft but should not become atmosphere domain

#### 每组对照至少要明确写出

1. 为什么左边仍是 pure domain
2. 为什么右边仍不是 pure domain
3. 哪个 cue 决定了 domain boundary
4. 哪条 `misleadingPath` 最容易让它们互相塌陷

### 5.2 Workstream B — Feedback boundary-set expansion

请新增一组 feedback contrast sets，
每组至少包含 3 种相邻说法：

1. same-domain nudge
2. blend proposals
3. corrected-domain

要求它们共享相近的 lexical surface，
但 gold supervision 必须不同。

优先 domain lanes：

- pure coastal
- pure moist
- mixed -> pure atmosphere correction

### 5.3 Workstream C — Pilot refresh and collision reporting

本轮完成后，必须重跑：

- package baseline
- feedback baseline

并至少汇报：

- pure atmosphere 相关 domain collision 是否减少
- corrected-domain vs blend confusion 是否减少
- 哪些错误还属于 lexical overlap unavoidable
- 哪些错误说明样本边界定义仍不清楚

---

## 6. Success condition

这轮成功，不是因为样本数又增加了。

而是因为：

- pure moist 不再轻易被 atmosphere-first mixed imagery 吸走
- pure coastal 不再轻易被 coastal-trace mixed imagery 吸走
- vague refinement 不再轻易掉进 pure atmosphere
- corrected-domain 不再经常被 blend / nudge 样本吸走

---

## 7. Required outputs

- `datasets/frontstage/package/gold-v0.1.jsonl`
- `datasets/frontstage/feedback-signals/gold-v0.1.jsonl`
- `datasets/frontstage/ANCHOR-COVERAGE-NOTES-v0.1.md`
- `datasets/frontstage/pilot-v0.1/manifest-v0.1.json`
- `experiments/frontstage-pilot/results/package-baseline-v0.1.json`
- `experiments/frontstage-pilot/results/feedback-baseline-v0.1.json`
- `docs/training-readiness-checkpoint-after-task-23-v0.1.md`

---

## 8. Work mode

和前几轮一样：

## 不要中途停下来等 review。

只有在你发现：

- pure atmosphere 与 mixed imagery 的边界在现有 anchor 体系下无法表述
- 或 corrected-domain 与 blend 的 supervision 目标必须重切

才停下来问我。

否则请直接做完。
