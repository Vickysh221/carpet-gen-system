# Slot Parameter Audit v0.1

## 目标
对 Fuli Plus 当前槽位与内部细分参数做一次分层审计，重点解决两个问题：

1. **Physical Product Layer 和 Pattern Language Layer 不应控制同一对象**
2. **细分参数之间不应出现高概率打架或重复建模**

这份文档的任务不是立刻给出最终答案，而是先识别风险、明确冲突来源，并提出结构调整方向。

---

## 一、当前核心原则

### 原则 1：层级不要混对象
- Physical Product Layer 回答“这是什么样的地毯对象”
- Pattern Language Layer 回答“这个对象上的图案语言如何展开”

如果两个 layer 同时控制同一对象，就会导致：
- reducer 归因混乱
- 用户反馈难以解释
- 参数更新方向互相覆盖

### 原则 2：细分参数不要重复建模
即便在同一 layer 内，不同参数也不能控制高度相同的语义对象。

否则会导致：
- 系统看起来有更多维度，实则是重复旋钮
- 两个参数同时动时，输出结果不稳定
- 用户反馈无法知道该归因给谁

---

## 二、当前主要风险点

### 风险 1：Shape 与 Motif 曾存在对象层误判
当前已澄清：
- Shape 应属于 Physical Product Layer
- Motif 属于 Pattern Language Layer

### 风险说明
如果 Shape 继续使用 angularity / edgeSoftness / irregularity 这类描述，它仍然会和图案内部形态语言发生混淆。

### 调整建议
将 Shape 重定义为更明确的物理对象参数，例如：
- formType（rectangular / round / runner / wall-to-wall / irregular）
- contourComplexity
- cornerRoundness

也就是说，Shape 不再描述图案局部轮廓，而描述地毯外轮廓。

---

### 风险 2：Scale 是混层槽位
当前 Scale 包含：
- motifScale
- rhythm
- contrast

### 风险说明
- motifScale 更像图案尺度 / 产品尺寸感
- rhythm 更像 Pattern Language Layer 中的组织节奏
- contrast 更像视觉强调或氛围张力

三者不在同一对象层，放在一个槽位会导致 reducer 很难决定“Scale 被用户点踩”到底是哪个问题。

### 调整建议
拆分 Scale：
- motifScale → 保留在 Physical Product Layer 或 Pattern-Physical bridge
- rhythm → 移入 Arrangement 或新建 Rhythm 槽位
- contrast → 移入 Impression / Visual Emphasis 层

---

### 风险 3：Motif 与 Shape / Arrangement 可能重复控制“形”
当前 Motif 中的：
- geometryDegree
- organicDegree
- complexity

本质上是在控制图案内部形态逻辑。

若 Shape 继续描述 angular / rounded / irregular，或 Arrangement 再通过 directionality/density 影响相似感知，就会出现：
- Motif 决定“图形是几何还是有机”
- Shape 又决定“边缘是尖还是圆”
- Arrangement 再决定“整体组织是规整还是散开”

这三者都可能共同影响用户对“这图形到底柔不柔 / 几不几何”的感知。

### 调整建议
- Motif：只负责图案单元的语言类型与复杂度
- Arrangement：只负责单元之间的组织方式
- Shape：只负责地毯外轮廓，不碰内部图案形态

---

### 风险 4：Impression 与 Style 存在高层语义重叠
当前：
- Impression = calmness / energy / softness
- Style = graphicness / painterlyDegree / heritageSense

### 风险说明
在用户感知上，这两者都会影响“整体感觉”。
例如：
- graphicness 上升，常常也会让用户感到更冷、更克制
- painterlyDegree 上升，常常也会让用户感到更柔和、更有人味

也就是说，它们在用户主观反馈层可能是耦合的。

### 调整建议
- Impression 保持用户主观感受层
- Style 保持表达媒介/品牌语言层
- reducer 上规定：用户直接情绪反馈优先归因给 Impression，除非有强证据表明问题来自风格表达方式

换句话说，要通过归因优先级来解耦，而不是指望它们天然完全分开。

---

### 风险 5：Arrangement 与 rhythm / density / motifScale 之间边界不清
当前 Arrangement 包含：
- orderliness
- density
- directionality

而 Scale 又包含 rhythm，甚至 motifScale 也会影响用户对“疏密、节奏”的体感。

### 风险说明
这些变量很容易一起塑造：
- 画面是不是太满
- 是否太乱
- 节奏感强不强

也就是说，用户一句“太乱了”，可能同时对应：
- orderliness 低
- density 高
- rhythm 过强
- complexity 高

如果这些变量都开放探索，系统几乎无法清晰归因。

### 调整建议
- Arrangement 保留：orderliness / directional logic
- density 需要评估是否改名为 spacingDensity，以强调它是组织层密度
- rhythm 不放在 Scale，改为 Arrangement 的子轴，或单列节奏槽位
- motifScale 仅控制单元尺寸，不直接表达排列节奏

---

## 三、建议中的新分层草案

### A. Physical Product Layer
用于描述地毯作为物理产品本身。

候选参数：
- Shape / Form
  - formType
  - contourComplexity
  - cornerRoundness
- Product Scale
  - overallFormat / size class
  - motifScale（若定义为图案在物理对象上的尺寸感）

### B. Pattern Language Layer
用于描述地毯内部图案语言。

候选参数：
- Color Palette
  - hueBias
  - saturation
  - lightness
- Motif
  - geometryDegree
  - organicDegree
  - complexity
- Arrangement
  - orderliness
  - spacingDensity
  - directionality
- Impression
  - calmness
  - energy
  - softness
- Style
  - graphicness
  - painterlyDegree
  - heritageSense

### C. Optional Bridge / Finishing Layer
用于承接跨层或后期精修变量。

候选参数：
- Visual Emphasis
  - contrast
- Rhythm
  - repetition rhythm / cadence
- Texture / Finish（若未来恢复材质层）

---

## 四、当前最值得优先处理的参数调整

### 优先级 1：重写 Shape
不再使用容易混入 pattern 的局部形态词。

### 优先级 2：拆掉现有 Scale
尤其把 rhythm / contrast 移走。

### 优先级 3：重新定义 Arrangement 与 rhythm 的边界
否则“太乱 / 太满 / 太平”类反馈无法稳定归因。

### 优先级 4：给 Impression 与 Style 设置归因优先级
避免用户主观感受反馈被随意分配。

---

## 五、一个关键判断
系统最怕的不是参数少，而是：

> 两个参数看上去不同，实际却在争夺同一段控制权。

一旦发生这种事，用户每一轮反馈都会变得不干净，最终 reducer 无法判断该更新哪一个变量。

因此，参数设计的目标不是“尽量完整”，而是：
- 分层清楚
- 边界清楚
- 冲突最少
- 允许收敛

## 下一步
- 基于这份审计，产出一版修订后的参数结构草案
- 明确哪些参数是 early exploration，哪些是 late-lock，哪些应默认作为条件层
- 进一步设计 reducer 的归因优先级
