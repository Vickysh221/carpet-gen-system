# Parameter to Visual Effects Mapping v0.1

## 目标
回答 Fuli Plus 中一个关键问题：

> 当参数变化时，图本身应该如何变化？

这份文档的作用是建立一套**可解释的参数 → 视觉后果映射模型**，避免系统只在数值层变化，却无法稳定地体现在图像结果上。

它同时服务于两件事：
1. 指导 simulator 中的 mock visual preview
2. 约束未来 generation system 中 design state 如何进入真正的出图逻辑

---

## 一、一个核心判断
不是每个参数都应该以同样方式直接控制图像。

当前更合理的区分是：

### A. 一阶参数（direct visual parameters）
这类参数变化时，图像中应出现相对直接、可感知的视觉后果。

### B. 二阶参数（meta / modulation parameters）
这类参数不一定直接改某一个图像局部，而更像控制其他参数的默认方向、约束关系或组合倾向。

因此，Fuli Plus 的参数系统不应被理解为“每个参数都直接对应一个像素效果”，而应被理解为：

> 一阶参数控制可见设计变化；二阶参数调制这些变化如何被组织成整体气质。

---

## 二、当前建议的一阶参数

### 1. Color
#### warmth
**预期视觉后果：**
- 整体色相往暖土、琥珀、红棕方向偏移
- 冷暖基调变化明显

**作用方式：** 直接

**风险：**
- 可能与 softness / heritage 在主观感知上耦合

#### saturation
**预期视觉后果：**
- 色彩纯度上升 / 下降
- 画面刺激度、跳跃度变化

**作用方式：** 直接

**风险：**
- 可能与 energy 一起共同影响“活力感”

#### lightness
**预期视觉后果：**
- 画面轻重、空气感、晒褪感变化
- 更亮 / 更沉 / 更轻盈

**作用方式：** 直接

**风险：**
- 可能与 calm / softness 一起共同影响“温柔感”

---

### 2. Motif
#### geometry
**预期视觉后果：**
- 图案单元更线性、规则、硬边
- 重复时更有结构秩序感

**作用方式：** 直接

#### organic
**预期视觉后果：**
- 图案单元更流动、更自然、更植物性
- 走势与轮廓更柔和

**作用方式：** 直接

#### complexity
**预期视觉后果：**
- 单元内部信息量增减
- 纹样更繁复或更简约

**作用方式：** 直接

**风险：**
- 与 arrangement.spacing / arrangement.order 一起影响“太满 / 太乱”

---

### 3. Arrangement
#### order
**预期视觉后果：**
- 图案组织更规整 / 更松散
- 整体更容易被读懂或更自由

**作用方式：** 直接

#### spacing
**预期视觉后果：**
- 单元之间更疏 / 更密
- 留白感、呼吸感变化

**作用方式：** 直接

#### direction
**预期视觉后果：**
- 构图流向更明确
- 横向 / 斜向 / 放射 / 中心性倾向更强

**作用方式：** 直接

---

## 三、当前建议的二阶参数

### 4. Impression
Impression 更适合作为**目标气质调制层**，而不是直接像一阶参数那样单独渲染。

#### calm
**预期后果：**
- 更稳定、松弛、安静的整体气质

**更合理的实现方式：**
通过调制其他参数组合，例如：
- spacing ↑
- saturation ↓
- order ↑
- energy ↓

#### energy
**预期后果：**
- 更有活力、张力、刺激感

**更合理的实现方式：**
通过调制：
- saturation ↑
- direction 强化
- contrast（未来）↑
- spacing 可能 ↓

#### softness
**预期后果：**
- 更柔和、轻软、温润

**更合理的实现方式：**
通过调制：
- warmth / lightness 的某些方向
- complexity ↓
- 边界更柔（若未来有 rendering control）
- graphicness ↓

---

### 5. Style
Style 更适合作为**表达方式 / 媒介模式调制层**。

#### graphic
**预期后果：**
- 图形边界更清晰
- 平面感更强
- 结构更干净、更设计化

**更合理的实现方式：**
作用于：
- motif 的呈现方式
- 边界清晰度
- prompt rendering 的风格短语

#### painterly
**预期后果：**
- 更像手工、刷痕、过渡柔和
- 更少平面硬边感

**更合理的实现方式：**
作用于：
- 表达方式
- 纹理/质感倾向
- prompt rendering 中的媒介词

#### heritage
**预期后果：**
- 更有传统装饰语言感
- 更沉稳、更带文化型式感

**更合理的实现方式：**
作用于：
- motif 的类型倾向
- color 的稳重程度
- style prior 的选取

---

## 四、为什么这个区分重要
如果把所有参数都当成“一阶直接控制参数”，会出现几个问题：
- 参数互相打架
- 图像变化不可解释
- 用户反馈无法稳定归因
- simulator 只能变成“数值游戏”，而不是设计系统模拟器

因此：
> 系统必须区分哪些参数直接负责可见变化，哪些参数负责调制这些变化如何被组织成整体气质。

---

## 五、对 simulator 的直接启发

### 1. simulator preview 里应优先可视化一阶参数
当前更适合直接反映在 mock visual preview 中的是：
- warmth
- saturation
- lightness
- geometry
- organic
- complexity
- order
- spacing
- direction

### 2. 二阶参数不一定直接画出来
Impression / Style 更适合作为：
- 解释层文案
- 上层趋势约束
- 对一阶参数更新方向的调制器

也就是说，simulator 不必强行让 calm / graphic 直接变成一种孤立视觉效果，而应让它们更多地体现在一阶参数组合偏移的趋势上。

---

## 六、对 generation system 的直接启发
未来真正出图时，参数进入生成系统至少应分两步：

### Step 1：参数 → 中间图案描述结构
包括：
- 色彩基调
- 纹样单元特征
- 排列策略
- 表达气质

### Step 2：图案描述结构 → 生成编排系统
包括：
- prompt rendering
- reference handling
- variant orchestration
- result interpretation context

这说明：
> design state 不应直接等同于 prompt，而应先转成更可控的图案描述结构，再进入真正的生成层。

---

## 七、当前一句话总结
Fuli Plus 的参数系统不应被理解为“每个参数都直接生成一种视觉效果”，而应被理解为：

> 一阶参数负责可见设计变化，二阶参数负责调制这些变化如何被组织为整体气质；
> 两者共同构成从 design state 到图像结果的可解释中间映射。
