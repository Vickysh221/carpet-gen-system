# Semantic Retrieval Evaluation Review

Date: 2026-04-03

## 1. Positioning

这份文档不是原始测试报告，而是对
`docs/semantic-retrieval-evaluation-2026-04-03.md`
的评审与解释。

结论先说：

> 这份评估报告是一份**可信的 baseline diagnosis report**，
> 但还不是最终 retrieval-era quality report。

也就是说：
- 它很适合告诉我们当前 shipping TS intake path 的真实能力边界
- 但它还不能代表“dense retrieval + bridge + compiler fully integrated”之后的最终能力

---

## 2. Headline judgment

如果用一句话概括当前系统状态，我会写成：

> **系统已经很会接诗性语言，但还不会稳定接对象语言，也还不会正确处理否定和未注册意象。**

这比单纯看 `Strong: 25 / 32` 更接近真实情况。

因为这 25 个 strong 里，混了两类：
1. 真正 strong：命中准，且 downstream state 也合理
2. 名义 strong：命中了，但仍有 pattern drift / over-generic routing / polarity handling 问题

所以，这份报告最有价值的不是强样本总数，而是它压出了系统的真实能力画像。

---

## 3. What the report got right

## 3.1 Poetic atmospheric language is already strong

报告显示：
- Poetic atmospheric: 8 / 8 strong
- Mixed: 8 / 8 strong

这个结果可信，并且非常重要。

它说明：
- poeticMappings
- semanticCanvas integration
- visualIntentCompiler 对 poetic side 的吸收
- 诗性语言到 atmosphere / color / pattern behavior 的投影

这些方向已经立住。

换句话说：

> **不要怀疑 poetic semantic layer 这条大方向，它是系统当前最成熟的部分。**

---

## 3.2 The biggest weakness is explicit motif bridging

报告里最关键的一句话是：

> The current TS intake path is strong when the user says a registered poetic atom. It is weak when the user says a literal object / motif and expects the system to infer the nearby poetic family.

这几乎就是当前系统的核心矛盾。

现在的状态是：
- 用户说“烟雨 / 月白 / 竹影 / 清辉” -> 系统很稳
- 用户说“荷花 / 孤帆 / 花叶 / 石头肌理” -> 系统明显不稳

这说明下一阶段主战场已经从“poetic mapping 本身”转向：

> **explicit motif → abstract pattern trace**

---

## 3.3 Negation handling is not a side issue; it is a dangerous bug

报告将 negation 提到很高优先级，这个判断是对的。

典型 case：
- `想要高级，但不是金尊也不是锦`

当前却仍然会正向激活：
- `金尊`
- `锦`

这不是“理解不够细”，而是：

> **系统可能把用户明确排斥的方向当成正向偏好。**

在产品体验上，这类错误比“没听懂”更糟糕。

所以：

> **先修 negation polarity，再扩词表**

这个优先级是对的。

---

## 3.4 Fallback loses imagery too quickly

报告对 fallback 的批评也很准确：

> Once no direct poetic mapping fires, the system drops too much of the original image language.

这句话的真实含义是：
- 当前系统虽然 poetic layer 很强
- 但一旦没有命中注册原子
- 很快就塌回 generic clarification / patternTendency 问法
- 用户原始 imagery 丢失严重

例如：
- `下雨前五分钟的空气`

这种 vivid metaphor 现在还没有被“保 imagery 地继续追问”。

这意味着下一轮不仅要补词，还要补：

> **imagery-preserving fallback**

---

## 4. What the report does NOT fully capture

## 4.1 It evaluates the shipping TS intake path, not the fully integrated retrieval pipeline

报告自己也说明了：
- scored evaluation uses the shipping TypeScript intake path
- dense retrieval helper 在该环境下未完整跑通

所以这份报告当前回答的是：

### 它能回答
- 现在 shipping semantic intake 的强弱边界是什么

### 它不能完全回答
- dense retrieval fully integrated 之后会提升多少
- BGE-M3 bridge 能否补掉 lotus / sail / floral intent / stone texture 这些 explicit motif case
- retrieval-to-slot-delta 之后 mixed / edge case 的质量会怎么变化

因此，这份报告的正确定位是：

> **pre-retrieval-integration baseline**

而不是最终 verdict。

---

## 4.2 The rubric is still too coarse

当前 rubric：
- strong
- medium
- weak
- miss

但对这个系统来说，实际上还需要区分：
- hit but drifted
- hit but over-generic
- hit but wrong polarity
- hit but poor follow-up
- hit but pattern route is too coarse

例如：
- `暮色里的灯火` 被判 strong
- 但 pattern 却 drift 到 `cloud-mist` 而不是 `light-trace`

这在产品里并不是小问题。

所以：

> **当前报告适合看“大轮廓”，不适合看“命中质量精度”。**

---

## 4.3 Explicit motif failures still need finer decomposition

报告里 explicit motif miss 已经被看见了，这很好。

但目前还没有继续拆：
- 是对象表缺失？
- 是 object → poetic bridge 缺失？
- 是 compiler 保真失败？
- 还是 prompt adapter 不会保对象？

例如：
- `荷花`
- `孤帆`
- `花叶意向`
- `石头肌理`

这些 fail 虽然都可归入“literal motif does not bridge into poetic space”，
但真正的工程修法不一定一样。

因此：

> explicit motif miss 已经被看见，但还没被拆到足够指导下一轮 patch 的粒度。

---

## 5. Reframed capability portrait

如果不用报告原话，而是重新用产品语言描述当前系统，我会这样写：

> 当前系统是一个：
> **诗性语言强、对象语言弱、否定处理差、fallback 太快变 generic** 的 semantic intake baseline。

这个画像比“25 / 32 strong”更真实，也更能指导下一轮迭代。

---

## 6. What should be prioritized next

我不完全照原报告顺序，而是做一点重排。

## P1 — Fix negation polarity

原因：
- 这是方向性错误
- 用户明确说不要，系统却往那边去
- 这是最危险的产品级 bug

代表 case：
- `不是金尊也不是锦`
- `别太花`
- `不要做成儿童房那种花花草草`

---

## P2 — Add a minimal explicit motif bridge

建议优先补：
- lotus / 荷花 / 莲
- sail / 孤帆 / 帆影
- floral / 花叶 / 花朵点缀
- stone texture / 石纹 / 石头肌理
- pre-rain air / 下雨前的空气

这里的目标不是先做完整开放词表，
而是：

> 先建立“literal motif / vivid image -> abstract pattern trace”桥接模式。

---

## P3 — Build imagery-preserving fallback

当前 fallback 一旦没命中注册原子，就太快退回：
- generic patternTendency
- generic style clarification

应该改成：
- 保住 imagery
- 围绕 imagery 问更窄的问题

例如：
- `下雨前五分钟的空气`
不应只问“图案复杂一点还是简单一点”，
而应继续问：
- 更偏潮气悬着的空气，还是更偏压低的边界感？
- 更像空气被压住，还是更像水汽在飘？

---

## P4 — Tighten downstream pattern routing

这一项也重要，但我会放在前 3 个之后。

主要要修的 drift：
- `灯火` 不应总掉向 `cloud-mist`
- `水波` 不应被 generic atmosphere 吞掉
- `旧木头晒过` 不应轻易 drift 到 `stone-texture`

也就是说：

> hit 了还不够，hit 之后落到哪个 pattern family 也要更准。

---

## 7. How to use this report correctly

这份报告最适合做的，不是总结项目“已经很好了”，
而是：

> **作为下一轮改造的 baseline benchmark**

也就是说：
- 修完 negation
- 修完 explicit motif bridge
- 修完 imagery-preserving fallback

之后，应该用同样 32-case 再跑一遍，观察：
- miss 数是否下降
- explicit motif 组是否从 4 / 8 提升
- edge/noisy miss 是否下降
- strong-but-drifted 是否减少

换句话说：

> 这份报告最适合做 before / after 对照，而不是最终成绩单。

---

## 8. Recommended next review improvements

如果下一轮继续做 retrieval / intake 评估，我建议补 3 个维度：

### 8.1 Add a “strong but drifted” label
区分：
- strong-exact
- strong-drifted
- medium
- weak
- miss

### 8.2 Separate motif miss root causes
例如：
- missing-core-motif
- missing-bridge
- compiler-flattened
- prompt-layer-loss

### 8.3 Add query-type-specific scoring
至少分：
- poetic atmospheric query
- explicit motif query
- mixed query
- edge/noisy query

因为不同类型 query 的成功标准本来就不一样。

---

## 9. Final judgment

这份报告总体质量是：

> **高于“有参考价值”，低于“足够指导最终架构”。**

更准确地说：

> 它是一份很好的 baseline diagnosis report，
> 能可信地告诉我们当前 shipping TS intake path 的真实强弱边界；
> 但它还不是一份 retrieval-era final quality report。

真正应从中提取的结论是：

1. poetic semantic layer 已经立住，不要怀疑这条方向
2. 下一阶段主战场是 explicit motif bridge
3. negation polarity 是最高优先级 bug
4. fallback 需要从 generic clarification 升级成 imagery-preserving clarification
5. 这份报告最适合做下一轮 before / after benchmark
