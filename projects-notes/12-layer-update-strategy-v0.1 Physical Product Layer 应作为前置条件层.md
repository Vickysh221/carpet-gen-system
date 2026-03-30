# Layer Update Strategy v0.1

## 一个关键修正
当前对 Fuli Plus 分层机制有了进一步判断：

> **Physical Product Layer 应作为前置条件层，而不是实际参数-生图搜索环节的一部分。**

也就是说，这一层的变量（如尺寸、形状、铺设方式等）应当在较早阶段根据用户房间特性、产品需求与使用场景被确定下来；之后它们不再作为多轮生图反馈闭环中的主要搜索参数，而是作为约束条件影响图案设计结果。

## 为什么这样更合理

### 1. 这些变量通常来自客观场景约束
例如：
- 房间大小
- 铺设区域
- 家具关系
- 动线
- 地毯功能定位

这些并不是用户在浏览几张图后再通过“喜欢/不喜欢”逐步收敛出来的主观审美变量，而更像设计任务的基础条件。

### 2. 它们决定的是“承载对象”，不是主要审美搜索空间
图案生成真正需要多轮收敛的，更多是：
- 色彩
- 纹样
- 布局
- 氛围
- 风格表达

而 Physical Product Layer 决定的是：
- 图案最终落在什么形状/尺寸/铺陈方式的对象上

因此这层更像约束容器，而不是高频探索维度。

### 3. 让它进入生图参数搜索会污染反馈归因
如果形状、尺寸、图案语言一起被频繁改变，用户对“这个不对”的反馈就很难判断究竟是在说：
- 图案不对
- 还是对象形态不对

把 Physical Product Layer 前置并固定，可以让 Pattern Language Layer 的反馈更干净。

## 当前建议

### A. Physical Product Layer 的角色
改定义为：
- constraint layer
- condition layer
- task initialization layer

它回答的是：
- 这个设计任务针对什么样的地毯对象？
- 最终图案需要适配怎样的物理形态与空间条件？

### B. 它如何影响后续系统
虽然不进入生图参数搜索，但它应当影响：
- Prompt rendering
- 图案构图策略
- motif coverage / placement logic
- arrangement 适配方式
- 最终展示 mockup

也就是说：
> Physical Product Layer 不参与高频搜索，但参与约束后续图案如何成立。

## 对 reducer 的直接影响
### 1. reducer 主体应集中在 Pattern Language Layer
即：
- Color Palette
- Motif
- Arrangement
- Impression
- Style

### 2. Physical Product Layer 只在少数情况下被重新确认
例如：
- 用户明确修改产品形态需求
- 参考图模式下发现当前 shape/coverage 约束与图案语言严重冲突
- 房间条件变化导致对象约束变化

### 3. 生图反馈默认不更新 Physical Product Layer
默认规则应是：
- 喜欢/不喜欢只先作用于 Pattern Language Layer
- Physical Product Layer 只有在用户明确指出产品对象问题时才改动

## 这带来的一个重要结构变化
系统不再是“三层都参与同一种反馈闭环”，而是：

### 层 1：Physical Product Layer
前置确定 / 低频确认 / 约束图案成立条件

### 层 2：Pattern Language Layer
多轮反馈闭环的主舞台

### 层 3：Finishing / Emphasis Layer
在 Pattern Language Layer 初步收敛后再介入的精修层

## 当前判断
这是一个重要收缩：
- Physical Product Layer 不再被理解为“另一组要一起调的参数”
- 而是被理解为“图案生成的任务条件”

这样一来，系统会更像：
> 在既定对象条件下，对图案语言进行多轮收敛。

而不是：
> 同时在对象形态与图案语言上做混杂搜索。
