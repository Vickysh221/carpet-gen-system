# Feedback to Evidence Mapping v0.1

## 目标
把 Fuli Plus 中“用户反馈如何进入 reducer”这件事再往前推进一层：

> 用户反馈不是直接改参数，而是先转成 evidence。

这份文档回答：
- 用户有哪些反馈形式
- 这些反馈如何转成证据
- 证据如何服务于 reducer operator
- optional comment 如何参与归因

---

## 一、为什么需要 evidence layer
如果系统直接把“喜欢 / 不喜欢”映射成参数变化：
- 反馈会过早数值化
- 多槽位联动时归因会失真
- 用户 comment 很难被利用

因此，系统需要一个中间层：

> feedback → evidence → reducer operator → state update

也就是说，evidence layer 的作用是把原始反馈压成可解释、可累积、可用于状态更新的信号。

---

## 二、用户反馈的基本形式

### 1. 显式偏好反馈
- 喜欢
- 不喜欢
- 最喜欢
- 最不喜欢

### 2. 排序式反馈（可选）
- A 比 B 更接近
- 这一组里最接近的是 C

### 3. 附加语言说明（optional comment）
例如：
- 太乱了
- 更柔和一点
- 喜欢这个颜色，但图案不对
- 这个更接近我要的感觉

MVP 阶段可以先以：
- like / dislike
- optional comment

作为核心输入。

---

## 三、evidence 的基本类型

### 1. Positive evidence
表示某个槽位方向获得支持。

### 2. Negative evidence
表示某个槽位方向获得反对。

### 3. Unresolved evidence
表示系统知道这里有问题，但当前无法清楚归因。

### 4. Cross-slot evidence
表示用户 comment 中显式提到两个以上槽位，例如：
- 颜色对了，但图案不对
- 氛围对，但布局太满

这种证据不能粗暴压成单槽位，需要拆分记录。

---

## 四、从反馈到 evidence 的映射逻辑

### Step 1：先绑定变体记录
每条反馈必须绑定到对应结果的变体说明：
- 改了哪些槽位
- 改了哪些轴向
- 相对于 base 改动方向是什么

### Step 2：区分反馈是“纯偏好”还是“带说明偏好”

#### 情况 A：只有 like / dislike
系统只能基于变体差分做弱归因。

#### 情况 B：like / dislike + comment
系统可结合 comment 关键词与当前变体做更强归因。

### Step 3：生成 evidence item
一个 evidence item 至少包含：
- source round
- variant id
- feedback type
- target layer
- candidate slot(s)
- candidate axis(es)
- evidence polarity（positive / negative / unresolved）
- evidence strength（low / medium / high）
- note / user comment summary

---

## 五、MVP 阶段的 evidence strength 规则

### low
- 只有 like / dislike
- 变体同时改了多个槽位
- 无法清楚确定主因

### medium
- 变体只改了 1 个主槽位
- 或用户 comment 指向较明确的槽位

### high
- 变体设计非常干净
- 用户 comment 与槽位高度对齐
- 同一方向在多轮中重复出现一致反馈

这意味着：
> evidence strength 既取决于用户说了什么，也取决于系统这一轮实验设计得干不干净。

---

## 六、optional comment 如何参与归因

### 1. comment 优先用于高层槽位归因
例如：
- “太乱了” → Arrangement / Motif（待判）
- “更柔和一点” → Impression / Color（待判）
- “颜色对了，但图案不对” → Cross-slot evidence

### 2. comment 不直接决定轴向数值
comment 先帮助系统判断：
- 主因槽位是谁
- 是否需要 cross-slot split
- 当前 evidence 是否应提升强度

### 3. comment 与变体记录必须一起解释
例如“太乱了”这句，如果当前变体主要改的是 Arrangement，就更可能指向 Arrangement；
如果当前变体主要改的是 complexity，则也可能落到 Motif。

也就是说：
> comment 不是脱离当前实验上下文独立解释的。

---

## 七、evidence 如何喂给 reducer

### keep
当 evidence 弱、冲突大或主因不清时触发。

### narrow
当同一槽位方向获得稳定 positive evidence 时触发。

### reverse
当同一槽位方向获得稳定 negative evidence，但槽位本身仍是正确控制对象时触发。

### expand
当 evidence 长期聚集在某个槽位，但现有轴向总解释不了时触发。

---

## 八、一个最小 evidence 结构（MVP）

```ts
{
  roundId: string,
  variantId: string,
  feedback: 'like' | 'dislike' | 'favorite' | 'least_favorite',
  layer: 'pattern' | 'finishing' | 'product?',
  candidateSlots: string[],
  candidateAxes?: string[],
  polarity: 'positive' | 'negative' | 'unresolved',
  strength: 'low' | 'medium' | 'high',
  commentSummary?: string
}
```

说明：
- MVP 阶段不要求一步到位精准落到某个单轴
- 先允许 candidateSlots 是一个候选集合
- reducer 再根据历史 evidence 做进一步判断

---

## 九、当前推荐策略

### 1. MVP 先重槽位级 evidence，轻轴向级 evidence
先回答“问题在哪个大方向”，再回答“具体哪个轴”。

### 2. optional comment 是加分项，不是前提
用户不写 comment，系统也应能工作；
写了 comment，系统才有机会提升 evidence 强度。

### 3. Cross-slot evidence 要保留，不要强行压成单因
因为用户真实反馈经常是组合式的。

### 4. evidence 是 reducer 的原料，不是最终判断
同一条 evidence 不必决定更新；
多条 evidence 的累积才决定 keep / narrow / reverse / expand。

---

## 十、一句话总结
Fuli Plus 不应把用户反馈直接变成参数变化，而应先把反馈沉淀为带有层级、候选槽位、强度与极性的 evidence，再由 reducer 根据 evidence 累积做状态更新。
