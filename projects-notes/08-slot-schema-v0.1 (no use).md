# Slot Schema v0.1

## 目标
将 Fuli Plus 的 7 个核心槽位从概念层推进到可计算的 schema 层。当前方案采用：

> 7 个槽位 × 每个槽位 3 个内部轴向 = 21 维参数空间

这意味着系统不再只是拥有抽象命名，而是拥有一组可初始化、可更新、可约束、可用于生成 Prompt 的设计状态变量。

## 总体结构
每个槽位包含：
- slot_name
- 3 个内部轴向
- 每个轴向的默认值
- 数值范围（当前统一为 [0,1]）
- 探索策略（wide / narrow / late-lock）
- 语义锚点
- 推荐状态（open / locked）
- Prompt 书写规则

## 七个槽位

### 1. Color Palette
轴向：
- hueBias = 0.58
- saturation = 0.46
- lightness = 0.55

语义锚点：warm, earthy, reddish / muted, dusty / airy, sun-faded

特点：
- 颜色语言保持抽象，不直接点具体色名
- 当前为 open
- hueBias 与 saturation 适合 wide 探索，lightness 更适合 narrow 微调

---

### 2. Motif
轴向：
- geometryDegree = 0.52
- organicDegree = 0.44
- complexity = 0.40

语义锚点：geometric, linear / organic, floral / minimal, reduced

特点：
- 描述形态逻辑，不描述具象物体
- 当前为 open
- 在参考图模式下，Motif 很可能属于优先锚定槽位

---

### 3. Style
轴向：
- graphicness = 0.48
- painterlyDegree = 0.28
- heritageSense = 0.38

语义锚点：graphic, flat, clean / hand-drawn, brushed / classic, tribal, traditional

特点：
- 更接近 Fuli 品牌调性约束层
- 当前设为 locked
- 更适合作为系统风格基底，而不是高频测试对象

---

### 4. Arrangement
轴向：
- orderliness = 0.57
- density = 0.45
- directionality = 0.52

语义锚点：ordered, structured / airy, dense / directional, radial, striped

特点：
- 承接图案组织关系
- 当前为 open
- 在参考图模式下，可能也是优先锚定槽位候选

---

### 5. Impression
轴向：
- calmness = 0.67
- energy = 0.24
- softness = 0.61

语义锚点：cozy, calm, serene / bold, playful, energetic / soft, gentle

特点：
- 承接用户最容易表达的总体感受
- 当前为 open
- Prompt 中应只取最高权重的 1–2 个词，避免情绪词堆叠

---

### 6. Shape
轴向：
- angularity = 0.31
- edgeSoftness = 0.71
- irregularity = 0.36

语义锚点：rounded, flowing / soft-edged, blurred / irregular, fragmented

特点：
- 需要重新定义为地毯物理外形 / 裁剪样式层，而不是图案内部 pattern 语言层
- 回答的问题更接近：方形、圆形、异形、满铺等产品外轮廓属性
- 因此它不应与 Motif 放在同一分析层级里
- 更适合作为 Physical Product Layer 的一部分

---

### 7. Scale
轴向：
- motifScale = 0.43
- rhythm = 0.62
- contrast = 0.35

语义锚点：micro-pattern, bold-scale / repetitive, rhythmic / subtle, low-contrast

特点：
- 当前设为 locked / late-lock
- 更适合在后期精修中发挥作用，而不是前期主要探索对象

## 参考图模式下的初步锚定判断
当前基于 Vicky 直觉，优先考虑以下槽位作为参考图模式中的锚定槽位候选：
- Motif
- Style
- Arrangement（Vicky 认为较为确定）

其中：
- Motif 和 Arrangement 很可能决定“为什么它像这张参考图”
- Style 的角色更复杂：它既可能属于参考图 identity，也可能承担 Fuli 品牌基底约束，需要进一步区分“参考风格”与“品牌风格”之间的关系

## 这个 schema 的重要意义
这套方案意味着 Fuli Plus 的 design state 已经不再只是“几个词”，而是一组：
- 可计算的连续参数
- 可映射的设计语义锚点
- 可控制的探索策略
- 可进入 reducer 更新的状态变量

## 当前阶段的关键判断
### 1. 这是一个混合结构
虽然底层参数是连续值，但高层仍然依赖语义锚点和 Prompt 规则，因此它不是纯参数系统，而是：

> 高层语义槽位 + 底层连续轴向 的混合 schema

### 2. 这比纯离散枚举更灵活，但也更危险
优点：
- 能承接更细粒度变化
- 更适合渐进式收敛

风险：
- 参数之间可能产生耦合
- 用户反馈很难直接映射到 21 个数值
- 若缺少 reducer，系统会退化成“看起来精密的调参器”

### 3. reducer 将成为下一步核心
因为系统现在不是缺参数，而是缺：
- 哪些参数在什么时候允许被更新
- 喜欢/不喜欢如何转换为对不同轴向的证据更新
- 什么情况下保持高层槽位不动，只调整内部轴向
- 什么情况下说明高层槽位本身需要重新解释

## 当前需要继续澄清的问题
1. Motif 与 Shape 的边界如何划分？
2. Impression 与 Style 是否存在角色重叠？
3. Scale 中 rhythm / contrast 是否应独立出去，避免语义混杂？
4. 参考图模式下，Style 到底应优先锚定参考图，还是优先服从品牌基底？
5. 哪些槽位适合前期探索，哪些应默认 late-lock？
