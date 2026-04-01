# Intent Intake Agent — Multi-Phase Architecture Implementation

**Date:** 2026-04-01
**Branch:** `chatbot-semantic`

---

## 背景

本次实现目标是把原来单一的文字输入管道升级为「signal-first 多阶段 Agent」架构，支持：

1. 文字轮次问答（3–7 轮软/硬上限）
2. `patternIntent` 维度（关键意向元素 + 抽象化偏好）
3. 问题覆盖均衡（跨轮次避免重复提问同一槽位）
4. 槽位确认对话流（lock-candidate 触发用户确认）
5. 图像信号槽位更新（like/dislike → confidence delta）
6. SimulatorPage 监控 UI（槽位进度 pills + 确认卡片）

---

## Phase 1：Signal-First 骨架 + 目标驱动生成触发

### 新增文件

**`src/features/entryAgent/signalProcessor.ts`**

统一入口，接受任意 `IntakeSignal`，路由到对应处理管道。

```ts
export async function processIntakeSignal(
  signal: IntakeSignal,
  context: IntakeSignalContext = {},
): Promise<EntryAgentResult>
```

- `"text"` → `analyzeEntryText(...)` 并透传 `previousGoalState` + `questionHistory`
- `"image-preference"` / `"image-compare"` / `"confirm-direction"` / `"phase-control"` → 预留 TODO

> **重要：** `signalProcessor.ts` 不从 `entryAgent/index.ts` barrel 再导出，避免循环依赖。调用方直接 `import from "@/features/entryAgent/signalProcessor"`。

### 类型变更（`types.ts`）

新增信号类型：
```ts
type TextIntakeSignal      = { type: "text"; text: string; turnIndex: number; source: "user" | "system" }
type ImagePreferenceSignal = { type: "image-preference"; action: "like"|"dislike"|"neutral-save"; imageId: string; annotationHints?: {...} }
type ImageComparisonSignal = { type: "image-compare"; ... }
type ConfirmationSignal    = { type: "confirm-direction"; slot: IntakeMacroSlot; choice: "confirm"|"defer" }
type IntakeSignal          = TextIntakeSignal | ImagePreferenceSignal | ImageComparisonSignal | ConfirmationSignal
```

新增槽位生命周期类型：
```ts
type IntakeSlotPhase = "empty" | "hinted" | "base-captured" | "lock-candidate"
```

扩展 `IntentIntakeGoalState`：
- `readyForFirstGeneration: boolean` — 是否满足首轮生图条件
- `firstGenerationReason?: string` — 触发原因
- `pendingConfirmations: IntakeSlotConfirmation[]` — 待用户确认的槽位

扩展 `EntryAgentInput` 和 `IntakeSignalContext`：
- `questionHistory?: QuestionTrace[]`
- `previousGoalState?: IntentIntakeGoalState`

### `intentStabilization.ts` 更新

- **软/硬上限**：`SOFT_TURN_CAP = 5`, `HARD_TURN_CAP = 7`（取代原来的硬编码 `MAX_INTENT_TURNS = 3`）
- **`shouldGenerateNow`** 逻辑（目标驱动优先，轮次上限兜底）：
  ```ts
  if (turnCount >= HARD_TURN_CAP) return true;
  if (analysis.intakeGoalState?.readyForFirstGeneration) return true;
  if (turnCount >= SOFT_TURN_CAP) return slots.some(s => s.isBaseCaptured);
  return false;
  ```
- **`processIntakeSignal` context** 透传 `previousGoalState` + `questionHistory`
- **`IntentConversationState`** 新增 `lockedSlots: Partial<Record<IntakeMacroSlot, string>>`（用户确认后写入）

---

## Phase 2：patternIntent 维度

**`src/features/entryAgent/intakeGoalState.ts`**（完全重写）

核心逻辑：

```ts
// 3-condition 阈值判断
function computePhase(topScore: number, supportingSignals: string[]): IntakeSlotPhase
// topScore >= 0.68 + signals >= 2 → lock-candidate
// topScore >= 0.5  + signals >= 2 → base-captured
// topScore > 0                    → hinted
// topScore === 0                  → empty
```

```ts
// 从 rawCues 提取图案意向
function extractPatternIntent(rawCues: string[]): PatternIntentState | undefined
// 荷花/莲 → lotus; 草叶/竹 → botanical; 波纹/水波 → water-wave ...
// abstractionPreference: 默认 abstract（产品原则）
// motionFeeling: wind-like / flowing / layered ...
```

首轮生图条件：
- **Condition A**: impression + (pattern OR color) 均 base-captured
- **Condition B**: 任意 3 个 critical slots 均 base-captured

---

## Phase 3：问题覆盖均衡

**`src/features/entryAgent/questionPlanning.ts`**

- 新增 `COVERAGE_BOOST = 18`：对尚未被提问的关键字段（overallImpression, patternTendency, spaceContext）加分
- 新增 `REPEAT_PENALTY = 20`：同一 question family 被问 ≥ 2 次后扣分
- `buildQuestionPlan` 接受 `questionHistory?: QuestionTrace[]`

**`src/features/entryAgent/semanticGapPlanner.ts`**

- 由原来最多生成 1 个 missing-slot gap → 生成 2 个（priority 40 和 28），给 planner 更多选择

---

## Phase 4：槽位确认对话流

**`src/features/entryAgent/slotConfirmationRenderer.ts`**（新建）

为每个 macro slot 提供多版本 persona 口吻的确认语：

```ts
export function buildSlotConfirmationPrompt(
  slot: IntakeMacroSlot,
  direction: string,
  confirmationType: ConfirmationType,
  patternIntent?: PatternIntentState,
): string
```

- 5 个 slot × 2–3 个变体 = 15 条中文确认语
- pattern slot 特殊处理：有 `keyElement` 时使用"意向"语（e.g. "我抓到的是你想要"lotus"意向的感觉，默认会往更抽象的表达走"）

在 `buildPendingConfirmations` 中：通过比较 `previousGoalState` 检测新进入 lock-candidate 的槽位，只生成首次到达时的确认提示。

---

## Phase 5：图像信号槽位更新

**`src/features/entryAgent/intakeGoalState.ts`**

```ts
export function applyImageSignalToGoalState(
  action: "like" | "dislike" | "neutral-save",
  annotationHints: ImagePreferenceSignal["annotationHints"],
  currentGoalState: IntentIntakeGoalState,
  previousGoalState?: IntentIntakeGoalState,
): IntentIntakeGoalState
```

- like → `+0.12` confidence delta
- dislike → `-0.10` delta
- neutral-save → `+0.04` delta
- 从 `annotationHints.{impression, color, motif, arrangement}` 推导对应槽位方向
- 图像信号计入 `supportingSignals`（加 `img:like` 等标记），影响 phase 计算

---

## Phase 6：SimulatorPage 监控 UI

**`src/features/simulator/SimulatorPage.tsx`**

新增组件 `SlotPhasePill`：
- 显示 5 个槽位（氛围/颜色/图案/排布/空间）的当前 phase 和 score
- 颜色区分：空=灰、有线索=石色、初步确认=绿、待锁定=琥珀

新增 UI 区域（在 "Next question" 卡片后）：
- **槽位进度 pills**：实时显示各槽位状态
- **待确认方向卡片**：当 `pendingConfirmations.length > 0` 时展示琥珀色确认区
  - 两个按钮："确认方向" → 写入 `lockedSlots` + 关闭；"先看其他" → 仅关闭

`handleConfirmDirection(slot, choice)` handler：
- 纯本地更新，直接修改 `intentSnapshot.conversationState.lockedSlots`
- 用 `dismissedConfirmationSlots` 本地 state 控制卡片显隐

其他文案更新：
- 轮次提示：`0/3` → `0/5`（软上限）
- 说明文字：`最多 3 轮` → `最多 7 轮，方向够稳后即可进入探索`

---

## 关键架构决策

| 决策 | 选择 | 理由 |
|------|------|------|
| 生图触发条件 | 目标驱动（goalState.readyForFirstGeneration）+ 轮次兜底 | 避免单轮高置信度文字过早触发 |
| 阈值 | base-capture: score>0.5 AND signals≥2 | 防止单一词语 push score |
| lock-candidate | score≥0.68 AND signals≥2 | 形成双重保障 |
| 循环依赖 | signalProcessor 不从 index.ts 导出 | 避免 signalProcessor→index→signalProcessor |
| 用户确认更新 | 纯本地修改 snapshot | confirm-direction signal 还未完全打通时的 pragmatic 方案 |
| abstractionPreference 默认 | "abstract" | 产品设计原则：优先模糊意境感而非写实 |

---

## 待完成（下一阶段）

- [ ] `signalProcessor.ts` 中 `"confirm-direction"` case 完整实现（接入 `applyImageSignalToGoalState` + re-analyze）
- [ ] `signalProcessor.ts` 中 `"image-preference"` case 实现（接入 `applyImageSignalToGoalState`）
- [ ] SimulatorPage 图片 like/dislike 按钮触发 `ImagePreferenceSignal`（Phase 5 完整闭环）
- [ ] `annotationHints` 真实数据接入（目前 AnnotatedAssetRecord 的 annotation 字段已有部分数值）
