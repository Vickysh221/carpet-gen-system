# Intent Intake Agent — Dialogue State Machine v1

Date: 2026-04-01

## 1. Purpose

这份文档定义 `Intent Intake Agent` 的第一版对话阶段状态机。

目标是解决三个问题：

1. 对话不再由固定轮数硬控（例如 3 轮）
2. agent 必须知道什么时候继续问、什么时候出图、什么时候确认
3. 后续图文双决策链要能在同一个状态机里接上

---

## 2. Core shift

旧逻辑更像：
- 用户输入一句话
- 系统问一个问题
- 到固定轮数就结束

新逻辑应变成：
- agent 持续接收 signal
- 更新内部 preference / slot / resolution / goal state
- 决定下一步是：
  - 继续追问
  - 生成第一批图
  - 请求用户确认
  - 切换探索策略

也就是说：

> **goal-driven** replaces **turn-driven**.

---

## 3. Primary stages

建议将 agent 的主流程定义为 4 个阶段：

### Stage 0 — Pre-visual intent intake
尚未生成图片。
依靠文字对话收集 base semantic profile。

### Stage 1 — First visual grounding
生成第一批图后，开始结合图片反馈和用户文字继续更新理解。

### Stage 2 — Direction confirmation / branch control
当某些槽位足够稳定时，agent 需要和用户确认：
- 是否沿这个方向继续探索
- 是否先不要锁，看看别的可能

### Stage 3 — Soft lock + local refinement
部分槽位进入软锁定，
其余槽位继续开放探索与微调。

---

## 4. Stage 0 — Pre-visual intent intake

## 4.1 Goal
在尚未有图片的情况下，收集出一个可用于首批探索图生成的 base preference profile。

## 4.2 What the agent should do
- 识别用户最自然进入的主导入口
- 顺着主导入口先收窄一层
- 再补关键宏槽位的缺口
- 避免像表单一样平均撒网

## 4.3 What counts as sufficient for first generation
满足以下任一条件即可考虑进入出图：

### Condition A
核心宏槽位中的至少 3 个已达到 `base-captured`：
- 整体氛围
- 图案意向
- 颜色 / 融合方式 / 空间 中的至少一个

### Condition B
虽然宏槽位未全满，但用户已给出强而清晰的单主轴描述，足以生成一组有辨识度差异的首批图。

### Condition C
达到 soft turn cap，但已有一个可生成的 base semantic profile。

### Important note
出图标准不应是“轮数到了”，
而应是：

> 是否已经足够生成一个有辨识度的探索集。

---

## 5. Stage 1 — First visual grounding

## 5.1 Goal
让首批图承担“校正 / 放大 / 推翻”文字意图的作用。

## 5.2 Input signals
这一阶段开始，agent 不再只接收 text。
它接收：
- 文字表达
- 图片 like/dislike
- 图片比较偏好
- 用户对图片的补充说明

## 5.3 What changes here
- 文字不再是唯一真相来源
- 图片反馈会反向改写 slot confidence
- 某些文字上模糊的方向，会因为选图偏好迅速稳定

### Example
用户嘴上说“别太抢”，
但始终选择更有存在感的图。
agent 必须把这个当成高价值矛盾信号，而不是忽略。

---

## 6. Stage 2 — Direction confirmation / branch control

这是本次设计中非常关键的一层。

### Why this stage exists
系统不能悄悄锁槽位。
当某个方向已经明显收缩时，agent 需要与用户确认：
- 要不要以后优先沿这条线继续
- 还是你只是暂时喜欢，现在还想看看别的可能

---

## 6.1 Confirmation types

建议至少定义 4 类确认时机。

### Type A — direction confirmation
当某个 macro slot 首次稳定成 `base-captured`：

用户侧话术大意：
- 听起来你现在更偏 xxx，我后面先沿这边多试一点，可以吗？

用途：
- 不是锁
- 只是确认当前主方向是不是系统理解对了

---

### Type B — lock-candidate confirmation
当某个方向已经满足 lock-candidate 条件：

用户侧话术大意：
- 看起来你对 xxx 这条线已经挺明确了。我们后面都优先往这边探索，还是你还想故意看看别的可能？

用途：
- 决定 soft lock
- 决定继续 exploitation 还是保持 exploration

---

### Type C — cross-modal conflict confirmation
当文字偏好与选图偏好明显冲突：

用户侧话术大意：
- 我发现你嘴上说想收一点，但实际选图会更偏有存在感那边。我们要不要相信你现在的选图反应，把方向稍微往那边调？

用途：
- 解决图文冲突
- 避免系统只听文本或只听图片

---

### Type D — phase transition confirmation
当系统准备从大步探索切换到局部微调：

用户侧话术大意：
- 现在大的方向我已经摸得差不多了，接下来你想继续看跨度更大的变化，还是开始沿着这个方向做更细一点的微调？

用途：
- 切换探索模式
- 让用户参与 agent 的策略选择

---

## 6.2 Additional confirmation triggers

### E — negative boundary clarification
如果用户连续否定，但不给替代方向：
- “我先确认一下，你不喜欢的更像是哪种——太花、太硬、太跳，还是太没存在感？”

### F — metaphor unpacking
如果用户说出高价值意象词：
- “风中荷花”
- “晨雾”
- “像旧织物”

agent 应确认：
- 用户更在意 key element 本身
- 还是在意它带出的感觉 / 动势 / 抽象关系

---

## 7. Stage 3 — Soft lock + local refinement

## 7.1 Goal
在部分方向已稳定时：
- 不再反复重问大方向
- 改为局部 refinement
- 保持少量开放维度继续探索

## 7.2 Why soft lock, not hard lock
地毯偏好探索常常会：
- 前面偏好 A
- 看了图后转向 A' 或 B

因此锁定应默认是 soft lock：
- 可回退
- 可解锁
- 可被更强的新图文信号推翻

---

## 8. Turn policy

正式 agent 不应再把轮数作为主结束条件。

### New principle
- **goal state** 决定是否已足够
- **turn count** 只作为 safety cap

### Suggested turn controls
- soft cap: 5
- hard cap: 7

### Why
- 3 轮太死
- 有些用户 2 轮就足够
- 有些用户 5 轮才刚把主轴说清

所以：

> 产品规则由收敛目标驱动；轮数只负责防止发散和疲劳。

---

## 9. Suggested decision function

建议新增一个明确函数：

```ts
shouldCompleteIntake({
  intakeGoalState,
  resolutionState,
  turnCount,
  informationGain,
  multimodalAgreement,
})
```

返回：
- `shouldStop`
- `reason`

### Possible reasons
- `goal-complete`
- `enough-for-first-generation`
- `low-information-gain`
- `hard-turn-cap`

---

## 10. What the agent should optimize for

不是“把每个 gap 都补完”，而是：

1. 先拿到关键 macro slots 的 base direction
2. 再决定是否值得继续收窄
3. 避免某个 slot 因为 gap 复活而霸占对话
4. 在图文双信号之间保持可解释一致性

---

## 11. Future compatibility with image-text dual decision chain

这个状态机必须从一开始就假定未来输入是 signal-based，而不是 text-only。

建议后续统一成：

```ts
type IntakeSignal =
  | { type: "text"; text: string }
  | { type: "image-like"; imageId: string; reasons?: string[] }
  | { type: "image-dislike"; imageId: string; reasons?: string[] }
  | { type: "image-compare"; preferredImageId: string; rejectedImageId: string; note?: string }
  | { type: "confirm-direction"; slot: string; choice: "continue" | "explore-other" | "lock-soft" };
```

这样当前状态机就能直接扩展，不需要重写整个 agent 逻辑。

---

## 12. One-sentence summary

Dialogue State Machine v1 的核心是：

> 让 Intent Intake Agent 从“固定轮数问几句”升级为“根据收敛目标、图文反馈和确认时机，自主决定继续问、出图、确认还是切换探索策略”的 agent。
