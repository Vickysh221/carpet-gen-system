# Slot Boundaries v0.1

## 目标
澄清 Fuli Plus 各槽位之间的边界，避免 reducer 在后续更新中把不同层级的对象混为一谈。

## 一个关键修正：Shape 不属于图案内部语言层
当前最重要的边界澄清是：

> Shape 考虑的是地毯本身的裁剪样式 / 物理外形，
> 而不是地毯内部的 pattern 语言。

也就是说，Shape 回答的问题更像是：
- 这块地毯是方形、圆形、异形，还是满铺？
- 外轮廓是规则还是特殊裁剪？

而不是：
- 图案内部更几何还是更有机？
- 图案更复杂还是更简约？

因此，Shape 不应与 Motif 放在同一分析层级里。

## 两大层级开始浮现

### A. 图案设计语言层（Pattern Language Layer）
这一层描述的是地毯“内部图案如何被组织和感知”。

当前更适合归入这层的槽位：
- Color Palette
- Motif
- Style
- Arrangement
- Impression

这些槽位主要影响的是：
- 图案语言
- 视觉气质
- 组织关系
- 品牌风格感

### B. 地毯物理属性层（Physical Product Layer）
这一层描述的是地毯作为物理对象本身的属性。

当前更适合归入这层的槽位：
- Shape
- Scale

其中：
- Shape 决定地毯外轮廓 / 裁剪方式
- Scale 决定图案尺度、铺陈节奏、视觉尺寸感

## 两层之间的关系
这两层不是互相替代关系，而更像叠加关系。

一个 Pattern Language Layer 可以叠加在不同 Physical Product Layer 上：
- 同样的 motif / color / arrangement，
- 可以落在方形地毯、圆形地毯、异形地毯或满铺方案上。

因此：
> Physical Product Layer 更像承载对象，
> Pattern Language Layer 更像落在对象之上的设计语言。

这类似于：
- 横向镜头与纵向镜头是叠加关系，而非互斥关系
- 不同控制轴服务于不同对象层

## 对 reducer 的直接影响
### 1. 不应把 Shape 和 Motif 放在同一轮高频对照中随意替换
因为用户对“图案不对”的反馈，未必是在说地毯外轮廓不对；
反过来，用户对“我想要圆形/异形”的需求，也不是在说 motif 有问题。

### 2. Shape 和 Scale 更适合作为较上游或较独立的产品条件层
它们可以：
- 在初始化阶段被显式确认
- 或在某些模式下作为条件输入固定
- 而不是每一轮都参与图案语言层的细粒度收敛

### 3. Pattern Language Layer 才是多轮反馈闭环的主舞台
用户对喜欢 / 不喜欢的大部分审美反馈，优先应解释到：
- Color Palette
- Motif
- Arrangement
- Impression
- Style

而不是直接落到 Shape。

## 当前修正后的判断
### 参考图模式下更应优先锚定的图案语言层槽位
- Motif
- Arrangement
- （条件性）Style

### 物理属性层中可能需要单独初始化或单独确认的槽位
- Shape
- Scale

## 仍需继续澄清的问题
1. Scale 内部是否仍混入了 Pattern Language Layer 的变量（如 rhythm / contrast）？
2. Shape 是否应该作为单独入口条件，而不是常规收敛槽位？
3. 参考图模式下，如果用户上传的是空间效果图而不是单张地毯图，Shape 的初始化逻辑是否不同？
