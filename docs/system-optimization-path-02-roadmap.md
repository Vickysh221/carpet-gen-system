# Carpet Gen System · System Optimization Path 02
## 分阶段实施路线图（交给 Codex / Claude 的落地 roadmap）

> 这份文档承接 `system-optimization-path-01-architecture.md`。
> 目标：把抽象重构建议转成可执行的工程路线。

---

## 0. 总原则

这次优化不要直接追求“一步到位生成漂亮结果”。
优先顺序应是：

1. **把系统状态和任务模型理清**
2. **让 Preference Learning 成为真实可用的系统层**
3. **再接真实生成能力**
4. **最后再打磨交互包装**

换句话说：

> 先做对，再做强，再做美。

---

# Phase 0 · 代码和职责拆分（先减技术债）

## 目标
先把当前集中在 `src/App.tsx` 的逻辑拆开，给后续状态机和策略层腾出结构空间。

## 问题
当前 `App.tsx` 同时承担了：
- 页面状态管理
- 上传流程
- 检索回退逻辑
- exploration 构建
- feedback 更新
- history/profile 加载
- debug 目标选择

这会让后续系统级优化越来越难。

## 建议拆分目录

建议增加如下结构：

```txt
src/
  core/
    state-machine/
      explorationStateMachine.ts
      phaseTypes.ts
    policy/
      nextActionPolicy.ts
      generationReadiness.ts
      explorationAxisSelector.ts
    preference/
      preferenceReducer.ts
      confidenceModel.ts
      conflictDetector.ts
      repulsionZone.ts
    generation/
      generationSpecBuilder.ts
      promptAssembler.ts
  services/
    reference/
      referenceUnderstanding.ts
      libraryRetrieval.ts
    exploration/
      roundBuilder.ts
      candidateAttribution.ts
    api/
      ...
```

## 交付标准
- `App.tsx` 不再承担核心算法和策略逻辑
- phase / feedback / candidate generation 逻辑进入独立模块

---

# Phase 1 · 明确产品阶段与状态机

## 目标
给系统加入显式状态机，停止依赖“隐式 round + scattered boolean state”。

## 实现要求
新增：
- phase type 定义
- state transitions
- 每个 phase 的 allowed actions
- fallback / recovery transitions

## 推荐状态定义

```ts
export type ExplorationPhase =
  | 'reference_calibration'
  | 'preference_exploration'
  | 'conflict_resolution'
  | 'preference_stabilization'
  | 'generation_ready'
  | 'generation_refinement'
  | 'recovery';
```

## 关键任务
1. 重构当前 session 结构，加入 phase metadata
2. 加入 transition guards
3. UI 上能显示当前 phase（先 debug-visible，后产品化）

## 交付标准
- 系统可以明确判断自己处于哪个阶段
- 不是所有上传和反馈都默认继续走同一套路径

---

# Phase 2 · Reference Understanding 升级

## 目标
不再只做颜色提取，要开始构建“参考图 → 槽位先验”的真实理解层。

## 当前问题
`analyzeUploadedImage()` 只提取：
- hueBias
- saturation
- lightness

其余维度全部 0.5。

## 实现路径（建议按低风险递进）

### 2.1 先做 retrieval-neighbor slot bootstrap
当上传图经过后端检索得到 top-K 参考成品后：
- 不只是拿 top1 当 base
- 而是计算 top-K 邻域的 slot prior
- 例如：按分数加权平均 motif / arrangement / style 等维度

### 2.2 引入 feature summary → slot prior 的映射
利用后端返回的 `feature_summary` 和 `slot_values`，构建更稳定的先验初始化。

### 2.3 本地 fallback 升级
如果后端不可用，至少加入：
- contrast estimate
- edge density / angularity heuristic
- simple texture complexity
- orientation histogram → directionality approximation

> 不要求一次做到真正 CV 模型，但至少把“除了颜色全是 0.5”升级掉。

## 交付标准
- 上传图后生成的 base slot prior 不再只有颜色有效
- 初始 baseSlots 能对 motif / arrangement / shape 等产生非中性初始化

---

# Phase 3 · Preference Learning 重构

## 目标
把当前“整图推进”升级成“维度级学习系统”。

## 当前问题
`correctBaseFromFeedback()` 现在相当于：
- liked 全维靠近
- disliked 全维远离

这不够真实，也不够稳。

## 建议新增模块

### 3.1 preferenceReducer
输入：
- current preference state
- new feedback event
- candidate slot values

输出：
- updated slot means
- updated confidence
- updated repulsion zone
- updated locked slot suggestions

### 3.2 confidenceModel
每个 axis 应维护：
- current estimate
- confidence score
- feedback count
- conflict score

### 3.3 conflictDetector
检测：
- 同一维度是否出现明显相反偏好
- 当前反馈是否在推翻已有稳定结论

### 3.4 repulsionZone
对 disliked images，不要只简单“远离”；应记录：
- 哪些维度显著触发负反馈
- 在什么范围内要避免

## 重要策略
不要假设用户喜欢一张图的全部维度。
建议保留“candidate attribution”能力：
- 本轮这张图主要在哪几个轴和 base 不同
- 用户点赞时优先把学习增量归到这些差异轴上

## 交付标准
- 系统能回答：
  - 哪些维度更确定了
  - 哪些维度仍不确定
  - 哪些维度存在冲突
  - 哪些方向是明确排斥的

---

# Phase 4 · Exploration Policy 动态化

## 目标
让 exploration 不再是固定的四根轴脚本，而是根据当前状态主动选下一轮测试内容。

## 当前问题
当前 `EXPLORATION_SPECS` 是写死的：
- saturation
- orderliness
- edgeSoftness
- complexity

## 新策略要求
新增 `explorationAxisSelector.ts`：
- 输入当前 Preference State
- 输出下一轮最值得测的 axis candidates

### 选择原则建议
优先级从高到低：
1. 低 confidence 维度
2. 高 conflict 维度
3. 与 locked slots 高耦合的关键维度
4. 对 generation 影响大的主轴

### exploration 模式建议
支持三类：
- single-axis test
- conflict resolution pair
- local refinement around locked style

## 交付标准
- 不同用户上传同样数量反馈后，下一轮 exploration 不一定相同
- exploration 能反映“当前最需要知道什么”

---

# Phase 5 · Generation Readiness Gate

## 目标
定义“什么时候不该继续看图库，而该进入生成”。

## 需要新增模块
`generationReadiness.ts`

### 输入
- preference confidence map
- locked slots
- conflict score
- feedback count
- anchor coverage

### 输出
- ready: boolean
- reason list
- remaining unknowns

### 示例规则
- 至少 3 个主槽位 confidence > 0.7
- 冲突 score 低于阈值
- 至少 1 个 style-like slot 被锁定
- 用户有效反馈次数 >= N

## UI 层建议
当 ready 为 true 时，明确提示：
- “我已经基本理解你的方向，可以开始生成新的方案了。”

## 交付标准
- 系统存在清晰 phase transition：exploration → generation_ready

---

# Phase 6 · Generation Spec Builder

## 目标
不要直接“把 slots 拼成 prompt 然后结束”，而是生成一个结构化 generation spec。

## 新增模块
`generationSpecBuilder.ts`

### 输出结构建议

```ts
interface GenerationSpec {
  referenceImage?: string;
  slotTargets: ImageSlotValues;
  lockedSlots: string[];
  repulsionZones: Record<string, unknown>;
  prompt: string;
  negativePrompt: string;
  adapters?: string[];
  rationale: string[];
}
```

### 作用
这层是：
- prompt assembler 的上层
- 模型调用的下层
- 人类可读解释的桥接层

## 注意
此阶段即使真实生图模型还未接入，也应先把 generation spec 结构定义清楚。

## 交付标准
- 系统能输出“为什么要这样生成”的结构化 spec
- 生成控制不再只是一串 prompt 文本

---

# Phase 7 · 接入真实生成（可分支实施）

## 目标
真正生成新地毯图，而不是继续只展示已有库图。

## 推荐最小落地路线

### 7.1 先做 mock generation service 接口
定义：
- `/generate/start`
- `/generate/status/:id`
- `/generate/result/:id`

### 7.2 再接真实模型
建议路线：
- 先用 SDXL + reference conditioning / IP-Adapter
- 再引入 style LoRA
- 必要时补 layout prior / ControlNet / pattern-specific constraints

### 7.3 结果回流
生成结果要重新回到 preference learning 环中：
- 用户对新生成图继续 like/dislike
- 系统进入 refinement 阶段

## 交付标准
- 系统至少能展示“生成出来的不是图库已有图”的结果链路

---

# Phase 8 · Recovery / Conflict Resolution

## 目标
让系统具备异常恢复，而不是一条线走到底。

## 必须覆盖的异常

### A. 用户反馈冲突
例如：
- 之前喜欢高 orderliness
- 后来又频繁喜欢低 orderliness 图

### B. 偏好长期不收敛
用户点了很多轮，confidence 还是低

### C. 生成偏离偏好
生成图和已学 Preference State 差异很大

## 建议实现
- `conflict_resolution` phase
- `recovery` phase
- conflict-specific candidate builder
- recovery reason logging

## 交付标准
- 系统不只是“失败了”，而是知道失败在哪一层、怎么回退

---

# 9. 每阶段交付建议（适合 coding agent 分任务）

## Milestone A
- 拆分 `App.tsx`
- 引入 phase state
- 定义核心 types

## Milestone B
- 升级 reference understanding
- 实现 weighted slot bootstrap

## Milestone C
- 重构 preference learning
- 引入 confidence / conflict / repulsion

## Milestone D
- 实现 exploration policy
- 替换固定 exploration specs

## Milestone E
- 实现 generation readiness gate
- 新增 generation spec builder

## Milestone F
- 接 mock generation API
- 跑通 generation-ready → generation-refinement

## Milestone G
- 加 recovery / conflict resolution
- 打磨 user-visible explanations

---

# 10. 给 Codex / Claude 的执行原则

如果把这份文档交给 coding agent，请明确要求：

1. **先重构架构，再加功能**
2. **不要把所有逻辑继续堆到 `App.tsx`**
3. **所有策略逻辑尽量模块化并可测试**
4. **先打通状态和数据结构，再做漂亮 UI**
5. **没有真实生成前，不要在产品文案里伪装已经能生成新图**
6. **所有 phase transition 都应有明确条件和理由**
7. **Preference learning 的目标是可解释收敛，不只是数值变化**

---

# 11. 建议的下一步动作（最现实的起点）

如果只做第一轮真实优化，建议 coding agent 先完成以下 3 件事：

### Step 1
拆 `App.tsx`，建立 phase state machine

### Step 2
做 weighted slot bootstrap（基于 top-K retrieved references 初始化更完整 baseSlots）

### Step 3
重构 preference reducer，引入 confidence / conflict / repulsion 三个概念

只完成这三步，整个系统就会从“展示型原型”变成“开始像一个真正的 Agent 系统”。
