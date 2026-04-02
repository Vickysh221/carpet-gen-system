# Poetic Semantic Layer Test Plan

Date: 2026-04-02

## Goal

这份测试计划用于验证 `poeticMappings.ts` 接入主语义链路后，是否已经从“静态词表”变成“真实可消费的语义输入源”。

测试重点不是：
- 是否命中了某个词
- 是否打印了 debug 日志

而是：
- poetic 命中后，是否真实影响 `color / impression / patternIntent / presence`
- 是否进入 `semanticCanvas / semanticMapping / updatedSlotStates / intakeGoalState`
- 是否能与普通约束、否定词、组合表达、张力表达共存
- 是否避免过度自信乱猜

---

## Scope

本轮测试主要覆盖：
- `src/features/entryAgent/poeticMappings.ts`
- `src/features/entryAgent/poeticSemanticLayer.ts`
- `src/features/entryAgent/semanticCanvas.ts`
- `src/features/entryAgent/index.ts`
- `src/features/entryAgent/intakeGoalState.ts`
- `src/features/entryAgent/agentRuntime.ts`

---

## What to inspect for each case

对每个测试输入，至少检查以下输出层：

1. detected poetic mappings
2. `semanticCanvas.poeticSignal`
3. `semanticMapping.slotHypotheses`
4. `updatedSlotStates`
5. `intakeGoalState`
6. `confidenceSummary.macroSlotCoverage`

如果有日志 / dump，请优先记录：
- 命中了哪些 poetic mappings
- `color` 是否真的变化
- `impression` 是否真的变化
- `patternIntent` 是否真的变化
- `presence` 是否进入系统可消费状态
- 是否出现合理 key elements（如 botanical / cloud-mist / water-wave / stone-texture / light-trace）
- follow-up 是否围绕更高维的诗性差异，而不是退回到低维“你喜欢什么颜色”

---

## Pass Levels

### P0 — Fail
- 未命中，或命中了但没有任何真实状态变化

### P1 — Detected only
- 识别到了 poetic term
- 但只体现在 debug / label / inspect 层
- 没有进入 semantic state

### P2 — Weak integration
- 至少 1-2 个槽位发生变化
- 但影响较弱，或没有进入 goal state / downstream merge

### P3 — Real integration
- `color / impression / patternIntent / presence` 至少 3 个发生可解释变化
- 变化可在 semantic canvas / mapping / slot state / goal state 中追踪
- follow-up 不再退回纯低维问法

目标：
- A / B / C 组核心 case 应尽量达到 P3
- D 组张力 case 至少达到 P2，最好 P3
- F 组边界 case 要求“稳健不乱猜”

---

## Required Result Format

请按以下结构输出每个 case 的测试结果：

```md
### Case A1
- Input:
- Matched mappings:
- Semantic canvas changes:
- Slot changes:
  - color:
  - impression:
  - patternIntent:
  - presence:
- Goal state impact:
- Follow-up/question impact:
- Pass level:
- Notes / failure signs:
```

最后输出一个总结：
- 哪些 case 达到 P3
- 哪些只到 P1 / P2
- 哪些 case 暴露出当前主链路缺口
- 下一轮最值得修的 3 个问题

---

## Test Cases

## A. Single poetic mapping activation

### Case A1 — 天青
**Input**
`天青`

**Expected mappings**
- 天青

**Expected slot movement**
- color → cool / muted / slightly hazy
- impression → calm / restrained
- patternIntent → abstract > figurative
- presence → blended / low focalness

**Failure signs**
- 只输出 blue / 青色
- patternIntent 仍接近空
- presence 没进入 semantic mapping

---

### Case A2 — 烟雨感
**Input**
`烟雨感`

**Expected mappings**
- 烟雨

**Expected slot movement**
- color → hazy / desaturated / soft contrast
- impression → misty / quiet
- patternIntent → flowing / blurred / suggestive
- presence → blended / low visual weight

**Failure signs**
- 被理解成具象下雨图案
- 只改 impression，不改 pattern/presence

---

### Case A3 — 月白风清
**Input**
`像月白风清那种`

**Expected mappings**
- 月白（通过 alias / phrase 命中）

**Expected slot movement**
- color → low saturation / cool white / light
- impression → calm / restrained / delicate
- patternIntent → sparse / abstract / suggestive
- presence → blended / light

**Failure signs**
- alias 没命中
- presence 仍接近 0

---

### Case A4 — 竹影
**Input**
`像竹影`

**Expected mappings**
- 竹影

**Expected slot movement**
- color → muted green-gray tendency
- impression → calm / disciplined
- patternIntent → sparse / linear / rhythmic / botanical
- presence → blended but articulate

**Failure signs**
- 只出现“植物”而缺乏 linear/rhythmic
- 被错误具象化成竹子图案

---

### Case A5 — 灯火
**Input**
`有点灯火感`

**Expected mappings**
- 灯火

**Expected slot movement**
- color → warm / amber / gentle glow
- impression → intimate / warm / lived-in
- patternIntent → clustered accents / light-trace
- presence → medium or medium-high focalness

**Failure signs**
- 只变暖，没有 presence / pattern 变化
- 自动走酒店大堂式金色夸张方向

---

### Case A6 — 冬天太阳照在冷石头上
**Input**
`像冬天太阳照在冷石头上`

**Expected mappings**
- 冬天太阳照在冷石头上

**Expected slot movement**
- color → cool base + slight warm light
- impression → restrained / austere / quiet warmth
- patternIntent → abstract / stone-texture / stable
- presence → low overall + slight local focalness

**Failure signs**
- 只抓到“冬天”或“太阳”其中一个
- 变成写实风景语义

---

## B. Composition / aggregation cases

### Case B1 — 天青色等烟雨
**Input**
`天青色等烟雨`

**Expected mappings**
- 天青 + 烟雨

**Expected slot movement**
- color → cool + muted + hazy
- impression → calm + restrained + misty
- patternIntent → abstract + flowing + blurred
- presence → blended / low focalness

**Failure signs**
- 只留下一个 mapping
- 聚合后只剩 color，没有 pattern/presence

---

### Case B2 — 月白里带一点清辉
**Input**
`月白里带一点清辉`

**Expected mappings**
- 月白 + 清辉

**Expected slot movement**
- color → pale cool light, luminosity 上升
- impression → delicate + elegant + serene
- patternIntent → sparse / abstract / subtle radiance
- presence → subtle but perceptible

**Failure signs**
- 清辉没有增加任何微光感
- 只重复月白，不形成增量

---

### Case B3 — 暮色里的灯火
**Input**
`暮色里的灯火`

**Expected mappings**
- 暮色 + 灯火

**Expected slot movement**
- color → muted dusk base + warm amber accent
- impression → reflective + intimate
- patternIntent → low-edge base + clustered light points
- presence → medium, not too low and not exploding

**Failure signs**
- 只剩暖色
- 暮色作为 base 消失

---

### Case B4 — 竹影和松风那种
**Input**
`竹影和松风那种`

**Expected mappings**
- 竹影 + 松风

**Expected slot movement**
- color → muted green-dark neutral
- impression → calm + steady + disciplined
- patternIntent → linear / rhythmic / elongated / sparse
- presence → blended, slightly structured

**Failure signs**
- 退化成 generic botanical
- 没有“骨架感 / 方向感”增量

---

## C. Poetic + ordinary constraint coexistence

### Case C1 — 不要太花，像竹影
**Input**
`不要太花，像竹影`

**Expected mappings**
- 竹影
- 同时保留 existing anti-floral / low-complexity constraint

**Expected slot movement**
- patternIntent → sparse / linear / abstract / botanical
- impression → calm / restrained
- color → muted
- presence → blended / light

**Failure signs**
- 原有“不要太花”边界被 poetic 覆盖掉
- 只剩“简洁”而没有更具体 pattern structure

---

### Case C2 — 安静一点，有点烟雨感
**Input**
`想要安静一点，有点烟雨感`

**Expected mappings**
- 烟雨
- 同时保留 calm / quiet 普通信号

**Expected slot movement**
- impression → calm + misty
- patternIntent → blurred / flowing
- presence → blended
- color → soft-contrast / hazy

**Failure signs**
- poetic 只增强情绪，不增强图案和 presence

---

### Case C3 — 灯火但不要太亮
**Input**
`温暖一点，但不要太亮，像灯火不是金色`

**Expected mappings**
- 灯火
- 同时保留约束：不要太亮 / 不是金色

**Expected slot movement**
- color → warm but not overly luminous / not too metallic
- impression → intimate / warm
- patternIntent → light-trace / clustered accents
- presence → medium, not luxury-heavy

**Failure signs**
- poetic 命中后把 negation 冲没
- 被拉成金色/豪华感过强

---

### Case C4 — 月白但别太冷
**Input**
`整体清一点，像月白，但别太冷`

**Expected mappings**
- 月白
- 同时保留 correction：别太冷

**Expected slot movement**
- color → light / low saturation / cleaner neutral
- impression → calm / gentle / restrained
- 避免过强 distance / sterile coldness

**Failure signs**
- 仍然被压成过冷、过远
- correction 对 poetic 输出没有调节作用

---

## D. Tension / contrast cases

### Case D1 — 月白里带一点灯火
**Input**
`月白里带一点灯火`

**Expected mappings**
- 月白 + 灯火

**Expected slot movement**
- color → pale cool base + warm accent
- impression → restrained + intimate
- patternIntent → sparse base + light-trace accents
- presence → higher than pure 月白, lower than pure 灯火

**Failure signs**
- 被平均成普通米黄色
- 丢失 base/accent 关系

---

### Case D2 — 烟雨里有一点融掉的金色
**Input**
`烟雨里有一点快要融掉的金色`

**Expected mappings**
- 烟雨 + 快要融掉的金色

**Expected slot movement**
- color → hazy muted base + softened warm luminous accent
- impression → restrained + slightly decadent
- patternIntent → flowing / blurred base + local melt-like softness
- presence → mostly blended with local focal lift

**Failure signs**
- 变成高饱和金色
- 烟雨的 base 被暖色完全吃掉

---

### Case D3 — 克制里带一点危险
**Input**
`克制里带一点危险`

**Expected mappings**
- 克制里带一点危险

**Expected slot movement**
- impression → restraint + tension
- patternIntent → abstract / slightly sharp or structured
- presence → subtle but perceptible
- color → 可小幅变化，但不能完全不动

**Failure signs**
- 退化成 generic 高级极简
- tension 没进入 impression

---

### Case D4 — 凌晨四点街灯下的雪
**Input**
`凌晨四点街灯下的雪`

**Expected mappings**
- 凌晨四点街灯下的雪

**Expected slot movement**
- color → cool white base + slight warm streetlight accent
- impression → lonely / quiet / restrained
- patternIntent → sparse / abstract
- presence → low visual weight but emotionally strong

**Failure signs**
- 被做成节庆雪景
- presence 低直接导致整条语义看起来像“没命中”

---

## E. Alias / colloquial variants

### Case E1 — 月光白一点
**Input**
`我想要月光白一点`

**Expected mappings**
- 月白（alias）

**Expected slot movement**
- color → cool light white / low saturation
- impression → clean / delicate

**Failure signs**
- alias miss

---

### Case E2 — 空濛细雨
**Input**
`有点空濛细雨的感觉`

**Expected mappings**
- 烟雨（alias）

**Expected slot movement**
- color → hazy / desaturated
- patternIntent → blurred / flowing
- presence → blended

**Failure signs**
- alias miss
- 只改 impression

---

### Case E3 — 青瓷那种青
**Input**
`像青瓷那种青`

**Expected mappings**
- 天青（alias）

**Expected slot movement**
- color → cool muted cyan-gray tendency
- impression → restrained / calm

**Failure signs**
- 被简化成 green/blue 类普通颜色词

---

### Case E4 — 夜里灯火的感觉
**Input**
`我喜欢一点夜里灯火的感觉`

**Expected mappings**
- 灯火（phrase variant）

**Expected slot movement**
- warmth / intimacy / light-trace / medium focalness

**Failure signs**
- 只命中“夜色”，漏掉灯火

---

## F. Boundary / anti-overclaim cases

### Case F1 — 好看一点
**Input**
`我喜欢好看一点`

**Expected behavior**
- 不应强行命中 poetic mapping
- 可以触发 follow-up，但不应伪造具体诗性语义

**Failure signs**
- 凭空命中烟雨 / 月白 / 灯火等

---

### Case F2 — 蓝色就行
**Input**
`蓝色就行`

**Expected behavior**
- 应走普通 color cue
- 不应强行附会到天青

**Failure signs**
- 普通蓝色输入被误映射到 poetic blue-gray semantics

---

### Case F3 — 很贵很高级
**Input**
`我要一个很贵很高级的感觉`

**Expected behavior**
- 可以命中普通 luxury / premium impression
- 不应自动命中金尊 / 琉璃 / 锦，除非当前系统有明确证据链

**Failure signs**
- 一看到 luxury 就直接 poetic overclaim

---

### Case F4 — 像诗一样
**Input**
`像诗一样`

**Expected behavior**
- 可以触发更高质量 follow-up
- 不应假装已经知道是烟雨 / 月白 / 竹影 / 灯火中的哪一种

**Failure signs**
- 系统过度自信选定具体 poetic mapping

---

## Smoke Test Subset (high priority)

如果时间有限，优先跑这 12 条：

1. `天青`
2. `烟雨感`
3. `像月白风清那种`
4. `像竹影`
5. `有点灯火感`
6. `像冬天太阳照在冷石头上`
7. `天青色等烟雨`
8. `暮色里的灯火`
9. `不要太花，像竹影`
10. `想要安静一点，有点烟雨感`
11. `月白里带一点灯火`
12. `凌晨四点街灯下的雪`

---

## Codex Execution Task

你可以把下面这段直接发给 Codex：

```text
请根据 docs/poetic-semantic-layer-test-plan.md 执行 poetic semantic layer 测试。

要求：
1. 逐条跑测试 case，至少先跑 Smoke Test Subset 的 12 条。
2. 对每条 case 记录：
   - Input
   - Matched mappings
   - semanticCanvas.poeticSignal 的变化
   - semanticMapping.slotHypotheses 的变化
   - updatedSlotStates / intakeGoalState 的变化
   - color / impression / patternIntent / presence 四个槽位分别是否被真实影响
   - follow-up / question 是否变得更贴近诗性维度
   - Pass level（P0 / P1 / P2 / P3）
3. 不要只说“结果合理”或“看起来正常”，要指出具体变化与缺失。
4. 最后汇总：
   - 哪些 case 达到 P3
   - 哪些只到 P1 / P2
   - 当前最明显的 3 个语义链路缺口
   - 下一轮最值得修的 3 个点
5. 如果缺少现成脚本，你可以临时加最小测试 harness / debug runner，但不要大改主业务逻辑。
6. build / test 不能被破坏；如新增脚本请说明如何运行。
```

---

## Success Criteria for this round

如果这一轮测试结果成立，应该能看到：
- poetic mappings 不再只是“命中标签”
- 至少一批 case 会真实影响 color / impression / patternIntent / presence
- 组合表达开始形成 base/accent / additive effects
- 普通约束和 poetic enrichment 可以共存
- 边界 case 不会乱猜

如果做不到，说明 poetic layer 仍然部分停留在“识别层”，还没完全变成“主链路语义层”。
