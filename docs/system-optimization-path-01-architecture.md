# Carpet Gen System · System Optimization Path 01
## 目标重构、现状诊断与目标架构（交给 Codex / Claude 的实现说明）

> 这份文档不是泛泛而谈的产品建议，而是给 coding agent 的系统优化说明。
> 核心目标：把当前项目从“参考图检索 + 参数探索原型”推进为“基于参考图、成品图库偏好学习、并能生成新地毯图的 Agent 化设计系统”。

---

## 1. 最终目标（必须先统一）

系统的目标不是简单的“根据参考图找相似图”，也不是“根据槽位拼一个 prompt”。

### 最终目标
系统需要支持以下完整链路：

1. 用户上传参考图（reference image）
2. 系统从库中的成品地毯里找到若干高价值 anchor candidates
3. 用户对这些成品地毯做 like / dislike / lock / skip 等反馈
4. 系统据此学习一个逐渐收敛的 **Preference State / Parameter Space**
5. 当 Preference State 足够稳定后，系统将：
   - 参考图信号
   - 用户偏好参数空间
   - 锁定槽位
   - 排斥区域（repulsion zone）
   共同转译为生成条件
6. 系统基于这些条件生成 **新的地毯图**，而不是仅返回库中已有成品
7. 用户继续在新生成图上做 refinement，直到得到可交付方案

### 关键产品定义
这应该是一个：

**Design Co-pilot / Preference-learning Agent System**

而不是：
- 纯图库检索器
- 纯 prompt 生图工具
- 只有参数面板的设计实验原型

---

## 2. 当前实现到底做到哪一步了

结合当前 repo，可判断系统当前已实现和未实现的部分如下。

### 已实现 / 雏形较清晰
- React + TypeScript + Vite 前端骨架
- 上传参考图 → 搜索参考图库的主链路
- 本地 fallback：基于颜色粗分析和 21 维欧式距离做近邻匹配
- 7 槽位 / 21 internal axes 的领域模型
- 第一轮 exploration 机制（base + fixed single-axis exploration）
- like / dislike / lock / history profile 等界面级交互
- prompt trace / slot state / debug 面板等解释性雏形
- FastAPI 风格的后端 API 协议占位

### 尚未真正打通
- 参考图 → 完整参数空间理解
- 偏好反馈 → 维度级、带不确定性的 preference learning
- exploration axis 的动态选择
- phase transition（何时从检索进入生成）
- 槽位参数 + 参考图 → 真实生成控制
- 生成失败 / 偏好冲突 / 不收敛时的 recovery 机制

---

## 3. 当前系统的核心逻辑漏洞（这是优化重点）

### 漏洞 A：把“检索 / 偏好学习 / 生成”叙事上连在了一起，但实现并未打通
当前体验很容易让人误以为系统已经在做：

> 参考图理解 → 参数学习 → 新图生成

但实际上当前主路径更接近：

> 上传图 → 检索参考图库 → 展示候选 → 记录偏好反馈 → 轻量参数修正

这会导致产品承诺大于系统真实能力。

### 漏洞 B：本地 analyzeUploadedImage 只提取颜色，不足以支撑“参考图参数空间理解”
当前 `src/lib/slotMatcher.ts` 中：
- 真正从图像提取的只有 hue / saturation / lightness
- motif / style / arrangement / shape / scale / impression 全部默认 0.5

这意味着系统并没有真正理解参考图的结构性设计特征。

### 漏洞 C：exploration 是固定脚本，不是基于当前不确定性的主动学习
当前 `parameterManager.ts` 中：
- 第一轮探索固定围绕 saturation / orderliness / edgeSoftness / complexity
- 不根据用户上传内容、历史偏好、当前信心或冲突动态选轴

这不是真正的 agent-like exploration policy。

### 漏洞 D：like / dislike 反馈是整图级推进，不是维度级偏好学习
当前反馈修正逻辑：
- liked → 朝 liked slots 整体靠近
- disliked → 整体远离

问题：
- 用户可能只喜欢一张图的某个局部维度
- 不同维度的置信度不同
- 冲突反馈没有被显式建模
- 没有 repulsion zone / uncertainty map / confidence-driven action selection

### 漏洞 E：prompt 目前承担了过多的“生成控制”期望
`composePromptFromSlots()` 可以很好地作为：
- 槽位解释
- trace
- 生成条件语言层

但对于地毯纹样生成，prompt 本身不应被视为唯一主控制。
真正的生成还需要：
- reference conditioning
- style adapter / LoRA
- 可能的 layout prior / repeat prior
- 局部结构与纹样节奏控制

---

## 4. 目标架构：应该重构成怎样的系统

系统应被重构为 4 层，而不是继续堆功能。

---

## Layer 1 · Reference Understanding Layer
### 目标
从上传参考图中提取比颜色更完整的设计先验。

### 应支持的输出
至少包括：
- colorPalette（hueBias / saturation / lightness）
- motif（geometry / organic / complexity）
- arrangement（orderliness / density / directionality）
- style（graphicness / painterly / heritage）
- shape（angularity / softness / irregularity）
- scale（motifScale / rhythm / contrast）
- impression（calmness / energy / softness）

### 注意
当前阶段不要求一次性做到完全端到端高精度模型，但不能再停留在“颜色之外全是 0.5”。

### 可接受的阶段性实现
1. retrieval-neighbor slot averaging
2. rule-based image features + lightweight classifier
3. CLIP/SigLIP embedding + slot regressors/classifiers
4. 后续替换为更稳定的视觉理解模型

---

## Layer 2 · Preference Learning Layer
### 目标
将用户对成品地毯 / 生成图的反馈转成“可收敛的偏好参数空间”。

### 输出不应只是一组 slot values
还应包括：
- axis-level confidence
- locked slots
- repulsion zone
- conflict markers
- exploration priorities
- positive anchors / negative anchors

### 关键原则
系统要知道的不是“当前平均偏好值”，而是：
- 哪些维度已经比较确定
- 哪些维度仍需继续测试
- 哪些方向是明确排斥的
- 哪些维度存在冲突反馈

---

## Layer 3 · Task Controller / Agent Policy Layer
### 目标
决定下一步系统动作，而不是机械执行固定流程。

### 它需要回答的问题
- 当前处于哪个阶段？
- 该继续展示图库 anchor，还是进入生成？
- 当前最不确定的是哪个维度？
- 该出单轴 exploration 还是对照冲突图？
- 是否该向用户提出一个澄清问题？
- 是否已经满足 generation-ready 条件？
- 如果结果失败，应该回退到哪一层？

### 这是整个系统最像 Agent 的部分
如果没有这一层，系统仍然只是“能力模块串联”。

---

## Layer 4 · Generation Assembly Layer
### 目标
把参考图信号、Preference State 和生成控制组装成真实新图生成条件。

### 输入
- reference image
- preference state
- locked slots
- repulsion zone
- prompt trace
- optional selected anchors

### 输出
- structured generation spec
- positive prompt
- negative prompt
- reference conditioning config
- optional adapter / LoRA choices

### 注意
生成层不应只依赖 prompt。建议明确区分：
- human-readable explanation layer
- machine-usable generation control layer

---

## 5. 必须新增的系统状态（建议用显式状态机）

建议引入一个显式状态机，而不是隐式靠 round / phase 字段混合表示。

### 推荐状态
1. `reference_calibration`
   - 初次上传参考图，建立 anchor baseline
2. `preference_exploration`
   - 通过 anchor candidates 和 exploration 图学习偏好
3. `conflict_resolution`
   - 用户反馈冲突，需要专门拆冲突
4. `preference_stabilization`
   - 偏好开始稳定，适合 lock 关键槽位
5. `generation_ready`
   - 已满足进入真实生成的条件
6. `generation_refinement`
   - 基于新生成图继续 refinement
7. `recovery`
   - 生成失败或结果偏移，需要回退

### 每个状态至少需要定义
- entry conditions
- allowed user actions
- system actions
- exit conditions
- fallback behavior

---

## 6. 生成阶段的准入条件（必须新增）

当前系统最大的缺失之一，是没有定义什么时候可以“从探索进入生成”。

建议定义 generation-ready 条件，例如：
- 至少 3 个核心槽位 confidence > threshold
- 至少存在 1~2 个 locked slots
- 明确 positive anchors 和 negative anchors
- 用户已完成至少 N 次有效反馈
- 当前 preference conflict 低于阈值

若未达到条件，系统不应贸然进入真实生成。

---

## 7. 对 coding agent 的约束要求

在后续实现中，不要只做 UI 补丁；优先按系统层重构。

### 明确要求
1. 不要把“生成”继续写成纯 mock 文案，若未实现需在状态机中明确区分
2. 不要再把固定 exploration spec 当作长期最终方案
3. 不要把 prompt 视为唯一控制主桥
4. 不要只在 debug panel 中展示系统状态，未来需要面向用户产品化解释
5. 所有新增状态和策略逻辑应尽量独立成可测试模块，而不是继续堆在 `App.tsx`

---

## 8. 本文档之后的实现顺序

请继续阅读：
- `docs/system-optimization-path-02-roadmap.md`

下一份文档将给出分阶段实施路径、建议目录结构、模块拆分与每阶段交付标准。
