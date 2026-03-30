# Slot Schema v0.2 Proposal

## 本版目标
基于前一轮参数审计，直接接受一个核心调整：

> **拆掉原有的 Scale 槽位**

原因不是它不重要，而是它内部混入了不同对象层的变量（motifScale / rhythm / contrast），继续保留为单一槽位会持续伤害 reducer、反馈归因与状态收敛。

本版目标是：
- 让 Physical Product Layer 与 Pattern Language Layer 更彻底分开
- 让每个参数尽量只控制一个对象
- 降低参数打架风险
- 为后续 reducer 设计准备更清晰的更新对象

---

## 一、修订后的总体结构

### A. Physical Product Layer
描述地毯作为产品对象本身。

#### 1. Form
**作用：** 描述地毯的物理外轮廓 / 裁剪样式

建议参数：
- `formType`：rectangular / round / runner / wall-to-wall / irregular
- `contourComplexity`：规则轮廓到复杂裁剪
- `cornerRoundness`：角部偏直 / 偏圆

**说明：**
- 取代原 Shape 的旧定义
- 不再使用会混入 pattern 的 angularity / irregularity / edgeSoftness 语言
- 这一层更适合作为上游条件层，而不是每轮高频审美归因对象

#### 2. Product Scale
**作用：** 描述地毯整体尺寸感，或图案在产品对象上的尺寸级别

建议参数：
- `sizeClass`：small / medium / large / wall-scale
- `motifScale`：micro / medium / bold（或映射为 [0,1]）
- `coverageMode`：central / border-led / all-over

**说明：**
- 从原 Scale 中只保留真正与尺度/铺陈相关的部分
- 不再混入 rhythm 和 contrast
- 可根据产品目标决定它是早期条件层，还是中后期确认层

---

### B. Pattern Language Layer
描述地毯内部图案语言，是多轮反馈闭环的主舞台。

#### 3. Color Palette
参数：
- `hueBias`
- `saturation`
- `lightness`

**保留原因：**
- 对用户最直观
- 易于早期反馈
- 与品牌调性高度相关

#### 4. Motif
参数：
- `geometryDegree`
- `organicDegree`
- `complexity`

**职责收紧：**
- 只描述图案单元本身的语言类型
- 不再承担外轮廓 / 排列节奏 / 产品物理属性

#### 5. Arrangement
参数：
- `orderliness`
- `spacingDensity`
- `directionality`

**修订点：**
- `density` 改为 `spacingDensity`，强调这是组织层密度，而不是图案单元复杂度
- 只负责单元如何被组织起来

#### 6. Impression
参数：
- `calmness`
- `energy`
- `softness`

**职责：**
- 用户主观感受层
- 用户的直觉反馈优先归因到这里

#### 7. Style
参数：
- `graphicness`
- `painterlyDegree`
- `heritageSense`

**职责：**
- 媒介/表达方式/品牌语言层
- 不与 Impression 争夺第一归因权
- 在参考图模式下具有双重来源：参考图信号 + Fuli 品牌基底

---

### C. Optional Finishing / Emphasis Layer
放置那些不适合早期高频探索、但又真实影响最终结果的参数。

#### 8. Rhythm（候选独立层）
参数建议：
- `repetitionCadence`
- `variationInterval`
- `pulseStrength`

**为什么单列：**
- 它确实影响“节奏感”
- 但又不等于尺度，也不完全等于 Arrangement
- 若直接放在早期主槽位里，容易和 spacingDensity / complexity 打架

**当前建议：**
- 不进入第一轮高频探索
- 在图案结构已初步稳定后引入

#### 9. Visual Emphasis
参数建议：
- `contrast`
- `focalStrength`
- `accentDistribution`

**为什么单列：**
- 它更像视觉强调与 finishing
- 若太早引入，会干扰用户对高层图案语言的判断

**当前建议：**
- 作为 late-lock / late-tune 层处理

---

## 二、修订后的层级关系

### 1. Physical Product Layer
回答：这是什么样的地毯对象？

### 2. Pattern Language Layer
回答：这个对象上的图案语言如何被组织与感知？

### 3. Finishing / Emphasis Layer
回答：在大方向确定后，如何进一步精修节奏感与视觉强调？

这三层关系不是竞争，而是：
- Product layer 作为承载对象
- Pattern layer 作为主设计语言
- Finishing layer 作为后期修饰与强化

---

## 三、参考图模式下的建议初始化

### 优先锚定
- Motif
- Arrangement
- Product Scale（条件性）
- Form（若参考图清晰体现产品形态）

### 双重来源
- Style = 参考图 style signal + Fuli brand prior

### 优先可偏移
- Color Palette
- Impression
- Visual Emphasis（若后期引入）

---

## 四、无参考图模式下的建议探索顺序

### 第一阶段：高层主方向形成
优先探索：
- Impression
- Color Palette
- Motif

### 第二阶段：结构组织收敛
引入：
- Arrangement
- Style

### 第三阶段：对象与细节确认
视情况确认或精修：
- Form
- Product Scale
- Rhythm
- Visual Emphasis

---

## 五、相比 v0.1 的核心改进
1. Shape 被改写为 Form，彻底归入 Physical Product Layer。
2. 原有 Scale 被拆除，不再作为单一槽位保留。
3. rhythm 与 contrast 不再和 motifScale 混在一起。
4. Arrangement 的 density 被收紧为 spacingDensity。
5. 系统开始形成三层结构：产品对象层 / 图案语言层 / finishing 层。

## 六、接下来对 reducer 的直接启发
1. reducer 应先判断反馈落在哪一层。
2. 大多数早期审美反馈优先落在 Pattern Language Layer。
3. Physical Product Layer 更适合显式确认或低频更新。
4. Finishing Layer 适合在高层方向稳定后再进入。

## 七、仍需继续确认的问题
1. Product Scale 是否应完全前置为条件层？
2. Rhythm 应独立存在，还是最终并回 Arrangement 的高级模式？
3. Visual Emphasis 是否值得单列成层，还是晚期只做 prompt rendering 控制？
4. Style 的“双重来源”在参考图模式下如何具体分配权重？
