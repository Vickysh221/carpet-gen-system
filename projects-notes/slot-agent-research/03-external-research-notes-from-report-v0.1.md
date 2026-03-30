# 外部研究材料笔记 v0.1

来源：用户提供的《Slot-Based Intermediate Representations in Agent Products》研究报告。

## 这份报告对当前研究最有价值的补充

### 1. 槽位作为 intermediate representation 的定义更稳了
报告明确把 slot/field/attribute/schema/profile dimension 等都归到一个更高层概念：

> 槽位是一种位于原始用户输入与系统后续决策/生成/执行之间的结构化中间表示层。

这强化了当前研究中的核心判断：
- 槽位不只是 UI 字段
- 也不只是参数控制项
- 它是系统把模糊语言转成可计算状态的关键层

### 2. 为什么 agent 需要槽位：不是偏好，而是工程现实
报告从对话系统、tool calling、推荐、memory system 中给出一个共同理由：
- 人类表达是模糊的
- 软件执行需要结构化边界
- 多轮收敛需要可持续更新的状态
- 长期资产需要 schema 稳定性

这与当前研究中的四个矛盾高度一致：
- 模糊输入 vs 稳定执行
- 自然语言灵活 vs 产品可控
- 单轮结果 vs 多轮收敛
- 结果直觉化 vs 过程可解释

### 3. “参数工具”和“slot-based agent”的区分更清楚了
报告给出几个很强的诊断维度：
- Persistence：状态是否跨轮保留
- Update semantics：是否有显式更新规则
- Feedback attribution：是否能把用户反馈映射到维度更新
- Schema durability：schema 是否被当作长期资产

这四条非常适合直接拿来做应用矩阵。

### 4. Reducer / validator / critique interpreter 是重要关键词
报告里有三个很值得引入到当前 Fuli Plus 机制讨论的概念：
- validator：槽位边界处的验证逻辑
- reducer：新证据如何修改已有状态
- critique interpreter：把用户反馈解释为维度更新的规则层

这说明 Fuli Plus 后续如果要讲得更专业，不能只讲“有槽位”和“有反馈闭环”，还要讲：
- 槽位 schema 如何定义
- 证据如何更新状态
- 冲突证据如何处理

### 5. 长期 design state 意味着 schema stability 是基础设施问题
报告里关于 memory schema 的提醒非常重要：
一旦 design state 变成长期资产，schema 变更就不是随手重构，而是迁移问题。

这对 Fuli Plus 的直接启发是：
- 核心槽位命名不能过于随意
- 槽位值要考虑可扩展但稳定的枚举/层级结构
- 后续如果有子槽位，最好建立版本化思路

## 对 Fuli Plus 的直接启发

### 1. Fuli Plus 要补的不只是槽位列表，而是 slot schema
包括：
- 槽位名
- 槽位类型
- 值域/候选值
- unknown / needs confirmation 状态
- 校验与归一化规则

### 2. 点赞 / 点踩之后不能直接平均，必须有 update semantics
用户反馈应先进入：
- positive evidence
- negative evidence
- unresolved uncertainty

再由 reducer 决定：
- 保持
- 收束
- 反向探索
- 拓展子槽位

### 3. 每轮变体要像“受控实验”
如果没有明确的变动记录，就无法做 feedback attribution。

### 4. 参考图模式与无参考图模式，本质上是两种不同的 state initialization 方式
- 参考图模式：slot prefill from image
- 无参考图模式：slot elicitation from dialogue

但后续都要进入相同的状态更新闭环。

## 建议新增到后续文档中的关键词
- intermediate representation
- persistence horizon
- update semantics
- feedback attribution
- schema durability
- validator
- reducer
- critique interpreter

## 下一步
- 在 Fuli Plus 主线中补一份 slot schema 文档
- 在应用矩阵里加入 persistence / update semantics / feedback attribution / schema durability 四列
- 在机制文档中明确 reducer 逻辑，而不是停留在口头“根据反馈调整”
