# Carpet Gen System · System Optimization Path 03
## Probing Carrier 优化：Hypothesis-Aware Carrier Selection

> 本文档记录 inspiration-mode 分支中对 simulator probing 机制的核心优化。
> 覆盖范围：`src/core/assets/matching.ts` + `src/features/simulator/SimulatorPage.tsx`

---

## 1. 问题背景

### 原有设计的根本误区

当前系统早期轮次（Round 1–3）的 probing cards 使用 `assignDiverseNearestAnnotatedAssets` 来为每张卡选择 carrier（FULI 参考图）。这个函数的逻辑是：

1. 计算每张 variant card 的 `firstOrder` 状态
2. 在 asset 池中找"整体最近邻"
3. 加一个 diversity penalty 防止 4 张卡选同一张图

这样做的**核心问题**：

- Round 1 的 4 张卡全都在探索同一个槽（如 color），彼此 state 差异很小（delta = ±0.14 在某一 axis 上）
- 对整体 state 做 nearest 检索，4 张卡极易聚集到相邻的 asset 区域
- diversity penalty 是事后补救，力度不足
- **更本质的问题**：carrier 选择完全没有感知"这张卡是在探索哪个维度"

### 应有的语义

| 早期轮次卡牌 | 应该是… | 不是… |
|---|---|---|
| Round 1 Card A | 色调偏暖方向的假设载体 | base state 整体最近邻 |
| Round 1 Card B | 色调偏冷方向的假设载体 | 与 Card A 只差 0.02 的近邻 |
| Round 1 Card C | 饱和度高方向的假设载体 | 第三近邻 |
| Round 1 Card D | 饱和度低方向的假设载体 | 第四近邻 |

---

## 2. 核心设计：Hypothesis-Aware Scoring

### 直觉

每张 probing card 有一个明确的假设：**"保持 keep slots 不变，探索 vary slot 的某个方向"**。

Carrier 选择应反映这个假设：
- vary slot 的 axes → 加大权重，确保 carrier 真正代表该方向
- keep slots 的 axes → 降低权重，不让 keep 维度的细微偏差干扰选择

### `scoreCarrierForHypothesis` 函数

文件：`src/core/assets/matching.ts`

```typescript
function scoreCarrierForHypothesis(
  variantValues: FirstOrderSlotValues,
  asset: AnnotatedAssetRecord,
  changedSlots: ReadonlyArray<"color" | "motif" | "arrangement">,
  varySlotBoost = 2.0,    // vary slot axes 的权重乘数
  keepSlotScale = 0.6     // keep slots axes 的权重缩放
): number
```

**评分逻辑**（按 9 个 firstOrder axes 循环）：

```
flattenFirstOrder 映射：
  index 0–2  → color slot   (warmth, saturation, lightness)
  index 3–5  → motif slot   (geometry, organic, complexity)
  index 6–8  → arrangement  (order, spacing, direction)

对每个 axis i：
  multiplier = changedSlots.has(slot_of_i) ? varySlotBoost : keepSlotScale
  sum += FIRST_ORDER_WEIGHTS[i] * multiplier * (variant[i] - asset[i])²

score = sqrt(sum)
```

**效果**：
- vary slot 的 axes 贡献 2× 权重 → carrier 在假设方向上与 variant 高度匹配
- keep slots 贡献 0.6× 权重 → 允许 carrier 在非探索维度有较大差异

---

## 3. 核心设计：Round-Level Carrier Assignment

### `assignProbingCarriers` 函数

文件：`src/core/assets/matching.ts`

```typescript
export function assignProbingCarriers(
  hypotheses: Array<{
    key: string;
    variantValues: FirstOrderSlotValues;
    changedSlots: ReadonlyArray<"color" | "motif" | "arrangement">;
  }>,
  assets: AnnotatedAssetRecord[],
  options?: {
    hardExcludeIds?: string[];   // disliked refs → 永不选取
    seenIds?: string[];           // seen refs → soft penalty
    seenPenalty?: number;         // 默认 0.10
    varySlotBoost?: number;       // 默认 2.0
    keepSlotScale?: number;       // 默认 0.6
  }
): Record<string, Array<AnnotatedAssetRecord & { distance: number }>>
```

**分配策略（贪心，严格唯一）**：

```
candidates = assets − hardExcludeIds

for each hypothesis in hypotheses:
  ranked = candidates
    .filter(not already selected this round)
    .map(asset → scoreCarrierForHypothesis + seenCount × seenPenalty)
    .sort(ascending)

  chosen = ranked[0]
  if chosen:
    result[hypothesis.key] = chosen
    selectedIds.add(chosen.imageId)
  else:
    fallback = candidates  // 允许重复，加 repeatPenalty=0.08
    ...
```

**与旧 `assignDiverseNearestAnnotatedAssets` 的对比**：

| 维度 | 旧函数 | 新函数 |
|---|---|---|
| 评分基础 | 全维度加权距离 | 假设感知分槽权重 |
| 唯一性机制 | nearDuplicatePenalty（软） | Set 过滤（严格唯一） |
| vary/keep 语义 | 无 | 核心机制 |
| 轮次级别分配 | 是（已有） | 是（继承） |
| changedSlots 感知 | 无 | 必须传入 |

---

## 4. SimulatorPage 调用变更

文件：`src/features/simulator/SimulatorPage.tsx`

### 新增常量

```typescript
const PROBING_ROUND_LIMIT = 3;
```

### variantNearestRefsMap 分支

```typescript
const variantNearestRefsMap = useMemo(() => {
  if (round <= PROBING_ROUND_LIMIT) {
    // 使用 hypothesis-aware carrier 分配
    return assignProbingCarriers(
      variants.map((variant) => ({
        key: variant.id,
        variantValues: firstOrderFromState(variant.state),
        changedSlots: variant.changedSlots.filter(
          (s): s is "color" | "motif" | "arrangement" =>
            s === "color" || s === "motif" || s === "arrangement"
        ),
      })),
      referenceAssets,
      { hardExcludeIds: blockedRefIds, seenIds: seenRefIds }
    );
  }
  // Round 4+ 继续使用原有 diverse nearest 策略
  return assignDiverseNearestAnnotatedAssets(...);
}, [variants, referenceAssets, seenRefIds, effectiveMatchMode, blockedRefIds, round]);
```

---

## 5. 保留的不变行为

以下行为逻辑**完全未改动**：

| 行为 | 实现位置 | 状态 |
|---|---|---|
| liked cards 沉入历史区 | `handleContinue` → `setLikedHistory` | 保留 |
| disliked cards 消失 | 不放入 `likedHistory` | 保留 |
| disliked 对应 carpet 不再推送 | `rejectedRefIds` → `blockedRefIds` → `hardExcludeIds` | 保留 |
| 已推送卡不再出现 | `seenRefIds` → `blockedRefIds` → `hardExcludeIds` | 保留 |
| 素材池穷尽检测 | `setAssetPoolExhausted` | 保留 |
| Round 4+ 匹配逻辑 | `assignDiverseNearestAnnotatedAssets` | 保留 |

---

## 6. 设计参数说明

| 参数 | 默认值 | 含义 |
|---|---|---|
| `varySlotBoost` | 2.0 | vary slot axes 的权重放大倍数。越大 → carrier 在假设方向越精准，但 keep slot 差异容忍度越高 |
| `keepSlotScale` | 0.6 | keep slots axes 的权重缩放。越小 → 越宽松，carrier 不必在 keep 维度上贴近 variant |
| `seenPenalty` | 0.10 | 每次 seen 叠加的距离惩罚 |
| `PROBING_ROUND_LIMIT` | 3 | 第几轮前使用 probing carrier 策略 |

---

## 7. 文件变更一览

```
src/core/assets/matching.ts
  + type FirstOrderSlotName = "color" | "motif" | "arrangement"
  + function scoreCarrierForHypothesis(...)       [私有]
  + export function assignProbingCarriers(...)     [导出]

src/features/simulator/SimulatorPage.tsx
  + import { ..., assignProbingCarriers } from "@/core/assets/matching"
  + const PROBING_ROUND_LIMIT = 3
  ~ variantNearestRefsMap: round <= 3 时切换到 assignProbingCarriers
```

---

## 8. 成功标准

- [x] 同一轮 4 张 probing cards 不会使用相同的 carpet
- [x] 4 张卡的 carrier 反映不同的假设方向而非局部近邻
- [x] liked cards 继续保留在历史区
- [x] disliked cards 消失，对应 carpet 不再出现
- [x] `npm run build` 通过，无 TypeScript 错误
