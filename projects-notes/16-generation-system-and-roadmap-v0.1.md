# Generation System and Roadmap v0.1

## 目标
回答 Fuli Plus 主作品线中一个关键问题：

> design state 最终如何进入生成系统，并产出目标图？

同时明确：
- MVP 阶段采用哪一种生成架构
- 为什么当前先不做更复杂的多阶段生成
- 未来可能如何从当前方案迭代到更强系统

---

## 一、当前判断
Fuli Plus 当前不应被定义为“一个用槽位控制 prompt 的系统”，而应被定义为：

> 一个以 design state 为核心，将槽位状态注入生成编排系统的 agentic design system。

也就是说，槽位控制的不是单一句 prompt，而是：
- prompt rendering
- 参考图保留 / 偏移逻辑
- 生成约束
- 变体实验设计
- 结果解释上下文

---

## 二、三种可能的生成架构

### A. State → Prompt → 直接出图
这是最轻的方案。

**特点：**
- 槽位主要被翻译成 prompt 片段
- 最终依赖单轮 text-to-image 或 image-to-image 生成

**问题：**
- 太接近 prompt builder
- 很难承载更复杂的参考图约束和实验编排
- 无法充分体现 Fuli Plus 的 design state 价值

### B. State → Prompt + Reference + Variant Strategy → 出图（当前 MVP）
这是当前最合适的 MVP 方案。

**特点：**
- 槽位不仅控制 prompt
- 还控制参考图保留/偏移策略
- 还控制每轮变体的实验设计
- 每张图都对应一个明确的设计假设

**为什么适合当前阶段：**
- 足够体现 design state 的作用
- 能支撑 reducer 与 feedback loop
- 不会过早掉入多阶段系统实现复杂度

### C. State → Multi-stage Generation System（未来方向）
这是未来可能发展的更复杂架构。

**可能形态：**
- 先生成高层结构方向
- 再生成图案细节/材质层
- 再做筛选、重排或局部精修
- 甚至可加入后处理与结果重评分层

**当前不先做的原因：**
- 当前 schema 与 reducer 还在 MVP 阶段
- 若过早引入多阶段生成，会让问题空间膨胀太快
- 先把 state / evidence / reducer 跑稳更关键

---

## 三、MVP 阶段：采用 B 型生成架构

### 定义
MVP 阶段，Fuli Plus 采用：

> **State → Prompt + Reference + Variant Strategy → Output Set**

即：
1. 系统先维护 design state
2. design state 决定 prompt rendering
3. 若有参考图，则决定参考图保留 / 偏移方式
4. design state 同时决定本轮变体实验如何设计
5. 系统最终输出一组可比较结果，而不是一张孤立图片

---

## 四、在 B 型架构中，槽位具体控制什么

### 1. Prompt rendering
槽位决定：
- 哪些设计词进入 prompt
- 哪些词被压掉
- impression 只保留哪些高权重词
- motif / arrangement / style 如何组织表达顺序

### 2. Reference handling
在参考图模式下，槽位决定：
- 哪些维度优先锚定参考图 identity
- 哪些维度允许向 Fuli 品牌方向偏移
- 偏移幅度多大

### 3. Variant orchestration
槽位决定：
- 本轮测哪些假设
- 每张图改哪些槽位
- 哪些图是 base / anchor / single-shift / linked-shift
- 每轮实验规模多大

### 4. Result interpretation context
槽位决定：
- 当前结果为什么更接近或偏离目标 state
- 用户反馈更可能落在哪些槽位
- 下一轮该收束、反向探索还是拓展

---

## 五、为什么“只控制 prompt”不够
如果 Fuli Plus 最终只落成“槽位控制 prompt”，会出现几个问题：

### 1. 会把系统说轻成高级 prompt builder
这不足以体现 agent 性。

### 2. 无法解释参考图模式下的 identity / brand 协商
参考图模式不仅是 prompt 问题，还是 reference-conditioned generation 问题。

### 3. 无法支撑变体实验设计
prompt 只能表达描述，不足以表达“这一轮在测什么设计假设”。

### 4. 无法充分承接 reducer 的 state update
reducer 更新的是 design state，而不只是一句 prompt 文本。

因此：
> prompt 只是 generation system 的一个子层，而不是全部。

---

## 六、未来迭代方向：从 B 走向 C

### 当前阶段：先把 B 做稳
优先做稳：
- state schema
- feedback → evidence
- reducer
- variant orchestration
- reference / no-reference 两种模式

### 未来阶段：再探索 C
未来可以逐步探索：

#### C1. 多阶段结构生成
- 第一阶段：先生成高层图案结构方向
- 第二阶段：再细化局部 motif / texture / emphasis

#### C2. 结果重评分与筛选层
- 对一轮结果做 reranking
- 结合当前 state 判断哪些更值得进入下一轮

#### C3. 局部精修与区域控制
- 不是整张图重生成，而是对局部结构做更细调节

#### C4. 更明确的 bridge logic
- 让 constraint layer 与 pattern layer 之间的投影关系更显式

### 一个重要原则
未来可以长成 C，
但前提不是“技术上能不能”，而是：

> B 阶段是否已经证明 design state 确实能稳定控制一轮生成、比较、反馈与更新闭环。

---

## 七、一句话总结
Fuli Plus 的 MVP 不应停留在“槽位控制 prompt”，而应采用：

> 以 design state 为核心，控制 prompt、reference handling 与 variant orchestration 的 B 型生成架构；
> 多阶段生成系统（C）作为未来迭代方向，在 state / evidence / reducer 跑稳后再进入。
