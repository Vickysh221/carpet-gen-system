# Frontstage Semantic Curation Closed Loop v0.1

## 1. Why this document exists

到目前为止，Fuli Plus Agent 在后端已经逐步长出了：
- route / mode 判断
- semantic cue decomposition
- role / slot projection
- semantic canvas / design translation 的方向
- planner / confirmation / comparison 的雏形

但现在暴露出的核心问题已经不是“有没有语义理解”，
而是：

**系统理解出的东西，能不能以对用户真正有帮助的方式回到前台。**

也就是说，我们真正要优化的，不是 backend 自己看起来更复杂，
而是这条完整闭环：

```text
user input
-> intent recognition / association / mapping
-> semantic intermediate layer
-> frontstage reply / curated comparisons / refinement prompt
-> user feedback re-entry
```

这份文档就是为了把这个闭环正式立起来，
避免后续继续把系统优化理解成：
- 多补一点 route
- 多补一点 slot
- 多补一点 confirmation 文案

真正的目标应该是：

**把正确的 interpretation，反推成高质量的前台产物。**

---

## 2. Core design conclusion

以后判断一轮优化是否有效，
不应主要看：
- route accuracy
- slot coverage
- planner 是否问出一句 follow-up

而应主要看：

### 2.1 Did the system identify the right interpretation domain?
例如：
- `薰衣草的芳香` 不应被拉成 generic moist atmosphere
- `石头肌理但别太硬` 不应只剩 material preset
- `还不确定，想高级一点` 不应被偷偷补成某个默认 atmosphere

### 2.2 Did the system turn interpretation into user-usable semantic handles?
例如应该长出：
- 柔紫灰香气
- 草本花香
- 香气融进空气
- 清绿苦感
- 叶感痕迹
- 边界慢慢退掉

而不是直接长出：
- clarity-and-air
- flow-direction
- washed sage
- 某个内部 slot label

### 2.3 Did the frontstage use those handles to help the user continue?
前台必须真正把这些语义变成：
1. 设计顾问的下一轮回答
2. curated comparisons
3. refinement prompt

如果一轮改动不能改善这三样东西，
那它就不算真正有效优化。

---

## 3. The key correction: the system should not force binary choice

一个非常关键的修正是：

我们不是要让用户在 A / B 之间二选一，
而是要让系统先把已识别出的几个意向，
编排成几种**可融合的成立方式**，
再邀请用户去调：
- 主次
- 比例
- 进入方式
- 哪一层做底
- 哪一层只留痕迹
- 哪一层退进空气里

也就是说，交互不应主要是：

```text
disambiguation by exclusion
```

而应更接近：

```text
composition by weighted blending
```

这点尤其适合地毯图样设计，
因为地毯中的语义成立方式本来就往往不是：
- 单一对象命中
- 单一 mood 命中

而更像：
- base atmosphere
- motif trace
- sensory modifier
- structure logic

一起被编织出来。

---

## 4. The real frontstage goal

前台真正要长出的，不是“确认问题”，
而是三类产物：

### 4.1 Interpretation-led reply snapshot
先回显系统抓到的是哪一域、哪几层东西。

例如：
- 我看到了几层正在同时成立的诠释：一层是草本花香轻轻浮在空气里，一层是柔紫灰的香气气候，一层是几乎不长成花形、只停在表面的扩散感。
- 我仿佛已经看到几个联想同时被拉出来：海边空气的亮和留白、柠檬叶那一点清绿苦感、还有叶子的痕迹只是轻轻浮着、没有立起来。

作用：
- 先让用户知道系统抓的是不是同一类东西
- 如果域错了，用户可以立即纠偏
- 避免系统在错域上继续生成后续逻辑

### 4.2 Curated comparisons
不是展示内部参数轴，
而是展示 2–4 种**可成立的融合方案**。

例如对 `薰衣草的芳香`：
- 香气融进一层柔紫灰空气里，几乎不留下花形
- 气味还是主角，但局部留一点细细的植物痕迹
- 整体更干净、更晒浅，香气像被轻轻摊开，不走湿雾

例如对 `加州沙滩和柠檬叶的香气`：
- 海边空气是底，柠檬叶只作为一层清绿苦感浮在上面
- 叶感更明确一点，但仍然被晒白空气和留白托住
- 香气主导，叶和海边都退到痕迹层，只留下被空气带开的色气候

### 4.3 Refinement prompt
最后不是逼用户二选一，
而是邀请用户继续调：
- 哪种更像你
- 哪两种想混在一起
- 哪一层再多一点
- 哪一层退掉一点
- 你更想保住的是空气、痕迹，还是进入方式

例如：
- 这三种里哪一种更像你？或者你想把哪两种混在一起。
- 你更想保住的是香气的扩散感，还是那一点植物痕迹？
- 如果按这个方向走，你是想让它更轻、更干净，还是更柔、更浮一点？

---

## 5. The system must be designed backwards from frontstage needs

以前隐含逻辑更像：

```text
user input
-> route
-> role
-> slot
-> planner 顺手生成一个问题
```

这个顺序会导致：
- 前台只是 backend 的附带产物
- comparison 退化成 slot-derived cards
- follow-up 退化成 gap question
- agent reply 退化成系统状态汇报

现在应该改成：

```text
define desired frontstage outputs
-> infer what semantic intermediate objects are required
-> constrain interpretation / routing / planner around those objects
```

也就是：

**先定义前台要长出什么，再反推中间层必须提供什么。**

---

## 6. Required semantic intermediate layer

为了真正长出高质量前台，系统中间层至少需要以下对象。

### 6.1 interpretationDomain
当前输入属于哪类语义域。

例如：
- `floralHerbalScent`
- `coastalAiryBrightness`
- `moistThresholdAtmosphere`
- `softMineralTexture`
- `vagueRefinementPreference`
- `mixedImageryComposition`

这个对象的意义：
- 防止系统把不同感官 / 意向混成 generic atmosphere
- 让 planner 先知道自己在处理什么

### 6.2 domainConfidence
系统对 interpretation domain 的稳定度判断。

例如：
- `high`
- `medium`
- `low`

其作用不是做学术置信评分，
而是决定前台动作：
- `high` -> 可以直接生成 composition proposals
- `medium` -> 可以回显当前理解，但要保留温和纠偏
- `low` -> 先做 domain alignment，不要直接进入图样 split 或融合提案

### 6.3 interpretationHandles
系统当前最值钱、最值得抬给用户继续使用的 user-facing semantic handles。

例如：
- 柔紫灰香气
- 草本花香
- 香气融进空气
- 清绿苦感
- 晒白空气
- 边界慢慢退掉
- 只留一点叶感痕迹

注意：
- 这些必须是用户能接住并继续说的词
- 不能只是 internal labels 换层皮

### 6.4 compositionAxes
系统识别到的、可用于生成融合方案的构图维度。

这里不要只把它理解成二选一 tension，
而要把它理解成：

**几个可以调权重、调进入方式的设计维度。**

例如：
- 空气主导 ↔ 痕迹主导
- 完全融开 ↔ 留一点可辨认性
- 干净晒浅 ↔ 柔软漂浮
- 色气候主导 ↔ 轻微植物痕迹主导
- 更像场 ↔ 更像局部对象残留

它们的用途不是直接问用户 A 还是 B，
而是生成：
- 几种融合提案
- 用户可调的 refinement 方向

### 6.5 misleadingPaths
系统当前最容易误走的错误解释路径。

例如对 `薰衣草的芳香`：
- 不要掉进 generic moist atmosphere
- 不要自动走 pale aqua / washed sage
- 不要自动变成 bouquet / 明确花形
- 不要把 scent 过早转成 weather

这个对象的作用：
- 约束 interpretation
- 约束 planner
- 约束 frontstage 文案
- 避免系统把“似是而非的默认合理路径”当前台主解释

---

## 7. Frontstage planner must become a semantic curator

planner 不应再主要被理解成：
- question planner
- gap filler
- follow-up selector

它应该被重新定义为：

**frontstage semantic curator**

### 7.1 Inputs
它至少需要：
- interpretationDomain
- domainConfidence
- interpretationHandles
- compositionAxes
- misleadingPaths
- role / slot / motif relevance summary
- unresolved but planner-usable design tensions

### 7.2 Outputs
它不应主要输出一句问题，
而应输出：
- `replySnapshot`
- `compositionProposals`
- `refinementPrompt`
- `optionalDomainCheck`
- `structuredFeedbackTargets`

### 7.3 New planner success criterion
planner 成功，不是因为它“问出一句问题”，
而是因为它能：
1. 把正确 interpretation 抬到前台
2. 生成几种像样的成立方式
3. 邀请用户继续调，而不是只做答题

---

## 8. Domain alignment before refinement

系统不应该无条件强绑定 interpretation 到前台。

更准确地说：

**应该有一个 interpretation confidence gate。**

### 8.1 If domain confidence is high
可以直接：
- 回显 interpretation snapshot
- 生成 composition proposals
- 给 refinement prompt

### 8.2 If domain confidence is medium
可以：
- 先回显当前理解
- 保留轻量 domain alignment
- 再给 1–2 个更保守的融合方案

### 8.3 If domain confidence is low
不应直接：
- 出 slot-derived comparison
- 出过强的 composition proposal
- 拿错误 interpretation 去问 follow-up

而应先做：
- domain alignment
- 语义域纠偏
- 让用户确认自己要的是哪一类感官 / 意象

也就是说：

```text
frontstage strength must depend on interpretation stability
```

---

## 8.1 Frontstage language layering

为了避免前台重新滑回：
- domain classification narration
- slot summary narration
- workflow progress narration

需要把前台语言明确分层。

### Layer A — Interpretation surfacing
这一层不是说“系统把它分类成什么”，
而是把已经长出来的诠释直接抬到前台。

前台更应像：
- 我看到了几层正在同时成立的诠释……
- 我已经抓到这里有几种不同的成立方向……

而不应像：
- 我先把它听成……
- 我将它识别为某种 domain……

### Layer B — Association surfacing
这一层把 interpretation 继续往用户能接住的联想层推进。

前台更应像：
- 我仿佛已经看到几个联想同时被拉出来……
- 这里已经浮出几种很不一样的图样联想……

这一层的作用是：
- 让用户感到被接住
- 让 semantic handles 不只是系统词条
- 让 comparison proposal 有更自然的来源

### Layer C — Composition proposal
这一层才进入：
- 这些诠释 / 联想可以如何一起成立
- 哪几种是当前最值得给用户看的融合方式

### Layer D — Refinement invitation
最后再邀请用户：
- 调主次
- 调比例
- 调进入方式
- 调哪一层更靠前

也就是说，前台语言顺序应更像：

```text
interpretation surfacing
-> association surfacing
-> composition proposal
-> refinement invitation
```

而不是：

```text
domain check
-> slot split
-> follow-up question
```

## 9. Confirmation should be replaced by composition refinement

“confirmation” 这个名字天然带着：
- 我猜一个，你确认对不对
- 你在 A / B 中选一个

但更符合产品方向的，其实是：
- composition refinement
- 意向融合
- 方向编排
- 图样成立方式 refinement

因此，前台不应主要长成：
- 一个问题
- 两个抽象比较卡

而应更接近三段：

### Stage 1 — interpretation snapshot
我现在已经抓到什么。

### Stage 2 — composition proposals
这些东西可能如何一起成立。

### Stage 3 — refinement invitation
你想让哪一层多一点、少一点、退进去一点、浮出来一点。

这时用户不是在“答题”，
而是在和系统一起共同构图。

---

## 10. Feedback must re-enter as structured signals

前台如果只是“更好看地说了一遍”，但用户反馈回不去，
那仍然不是闭环。

用户以下这类输入都必须能结构化回流：
- 我更偏第二种，不过空气还想再多一点。
- 我可能会想把第一种和第三种揉在一起。
- 植物那层可以再退一点，我更想留香气。
- 叶感可以有，但别让它一下站起来。

这些反馈进入系统后，应被写回为正式信号，例如：
- boost / reduce 某个 interpretation handle
- strengthen / suppress 某个 composition axis
- proposal blending preference
- motif trace suppression
- atmosphere dominance raise
- recognizability cap

没有这一层，前台就只是漂亮的假互动。

---

## 11. The four-phase roadmap

### Phase A — Stabilize interpretation domains
优先补最容易错域的输入类型：
- scent-led floral / herbal
- vague refinement preference
- constraint-led material cue
- mixed compositional imagery

因为域错了，前台全错。

### Phase B — Add frontstage-usable semantic layer
明确新增：
- interpretationDomain
- domainConfidence
- interpretationHandles
- compositionAxes
- misleadingPaths

这是前台重构的燃料层。

### Phase C — Rewrite planner into composition-proposal planner
让 planner 输出：
- reply snapshot
- 2–4 个 composition proposals
- refinement prompt
- optional domain check
- structured feedback target

而不是只输出一条 follow-up question。

### Phase D — Build feedback re-entry
把用户对 proposal 的选择、混合、微调重新写回 interpretation / planner 主链。

---

## 12. Benchmark implications

后续判断这条闭环是否成立，
不能只看 route / slot 过不过，
而应看以下 benchmark 是否真正前台化：

- `薰衣草的芳香`
  - 是否被识别成 floral/herbal scent，而不是湿雾 atmosphere
  - 是否长出正确的紫灰 / 草本 / 扩散 handles
  - 是否能生成不走花形也不走湿雾的融合方案

- `加州沙滩和柠檬叶的香气`
  - 是否能把空气、叶感、香气编排成不同配比的成立方式
  - 是否支持“空气做底、叶感做痕迹、香气做色气候”这种融合表达

- `烟雨里有一点竹影`
  - 是否能把 threshold atmosphere 与 motif trace 的关系讲清
  - 是否能避免 planner 退回默认 comparison

- `花叶意向，但不要太满`
  - 是否能让 constraint 真正影响 proposal，而不是只影响 slot 值

- `还不确定，想高级一点`
  - 是否能在域不稳时先做 guided alignment，而不是偷偷补一套默认意向

---

## 13. One-sentence north star

今后所有优化的核心目标，不是单独提升 route / role / slot 的局部正确率，
而是提升这条闭环的质量：

```text
intent recognition
-> semantic handles / composition axes / misleading paths
-> design-consultant reply / composition proposals / refinement prompts
-> structured feedback re-entry
```

如果某次改动不能改善这三个前台产物：
- 设计顾问回答
- curated comparisons / composition proposals
- refinement prompt

那它就不算真正有效优化。

---

## 14. Final conclusion

系统不是为了“理解得更像内部系统”，
而是为了：

**把理解过的东西，以更好的方式还给用户。**

对 Fuli 来说，backend 的价值不在于它内部多复杂，
而在于它是否真的让前台更像一个：
- 能接住意向
- 能组织联想
- 能编排成立方式
- 能陪用户一起把图样慢慢拉出来的地毯设计顾问
