# Package Sample Curator Checklist v0.1

Date: 2026-04-04

## Purpose

这份 checklist 不是定义新的产品对象，
也不是要求重写 `FrontstageSemanticPackage`。

它的作用只有一个：

## 给 Task 17 下一轮及之后的 package 样本扩充，设定一个明确的 gold 准入标准。

也就是说，今后新增 package sample 时，
不能只看：
- domain 写了没有
- handles 写了没有

而必须检查：

- 为什么是这个 domain
- 为什么是这些 handles
- 主联想是什么
- 次联想是什么
- 设计上什么做底
- 什么只留痕
- 什么不能站起来

如果这些问题答不出来，
这条样本就还不该进入 gold。

---

## Scope

本 checklist 适用于：
- `datasets/frontstage/package/gold-v0.1.jsonl` 的新增样本
- 后续 package gold / curated samples 的扩充
- Task 17 下一轮 intent-description expansion 的 package 标样

它不直接约束：
- response-plan 样本文案细节
- feedback-signals 的自然语言解析
- closed-loop 的多轮 planner 行为

但它会间接影响这些层，
因为 package 是上游 supervision 核心对象。

---

## The minimum question set

每条新增 package sample，在进入 gold 前，至少要能回答这 6 个问题：

1. 为什么是这个 `interpretationDomain`？
2. 为什么主 `interpretationHandle` 是这些？
3. 主联想是什么？
4. 次联想是什么？
5. 设计上什么做底、什么留痕？
6. 什么不能站起来，或什么误读必须被压住？

如果 6 个问题里有关键一项答不出来，
这条样本应继续返修，而不是直接进入 gold。

---

## Gold admission checklist

### A. Package object must remain intact
- [ ] `output.package` 保持现有主对象，不要擅自改写 `FrontstageSemanticPackage` 的核心结构
- [ ] 仍然包含：
  - [ ] `interpretationDomain`
  - [ ] `domainConfidence`
  - [ ] `interpretationHandles`
  - [ ] `compositionAxes`
  - [ ] `misleadingPaths`

### B. Domain judgement must be evidence-backed
- [ ] `output.supervision.evidenceCues.domain` 已填写
- [ ] `evidenceCues.domain` 至少有 **2 条 supporting cues**
- [ ] 每条 domain cue 都能解释“为什么这句话属于这个 domain”，而不只是机械摘词

#### Curator question
- [ ] 我能明确说出：为什么不是别的 domain，而是这个 domain？

### C. Main handles must be grounded in the input
- [ ] `output.supervision.evidenceCues.handles` 已填写
- [ ] 每个核心 `interpretationHandle` 至少有 **1 条 supporting cue**
- [ ] 至少覆盖这条样本里最关键的 **1 个主 handle**
- [ ] 如果有第二个对前台很关键的 handle，也应尽量补 grounding

#### Curator question
- [ ] 我能明确说出：这个 handle 是被输入里的哪部分触发的？

### D. Misleading paths must also have justification
- [ ] `misleadingPaths` 不是空泛写“不要 literal”
- [ ] 对主要 `misleadingPath`，已补 `output.supervision.evidenceCues.misleadingPaths`
- [ ] 每条主要误读路径至少有 **1 条 supporting cue**

#### Curator question
- [ ] 我能明确说出：为什么这条误读在这句里是高风险路径？

### E. Association structure must be explicit enough
- [ ] `output.supervision.associationReadings.primary` 至少有 **1 条**
- [ ] `output.supervision.associationReadings.secondary` 至少有 **1 条**
- [ ] 如果这句存在明显“近邻但不该真的长出来”的风险，补：
  - [ ] `nearbyButSuppressed`

#### Curator question
- [ ] 我能明确分清：什么是主联想，什么只是辅助联想？

### F. Design translation must be minimally structured
- [ ] `output.supervision.designTranslationHints.baseLayer` 至少有 **1 条**
- [ ] `output.supervision.designTranslationHints.traceLayer` 至少有 **1 条**
- [ ] `output.supervision.designTranslationHints.suppressedLiteralization` 至少有 **1 条**

#### Curator question
- [ ] 我能明确说出：什么做底？什么只留痕？什么不能站成对象？

### G. Evidence-to-output traceability must exist
- [ ] 至少能从 `evidenceCues` 追到：
  - [ ] `interpretationDomain`
  - [ ] 1 个主 `interpretationHandle`
  - [ ] 1 条主要 `misleadingPath`
- [ ] 不是只有结果字段，没有局部依据链

#### Curator question
- [ ] 如果我回头审这条样本，我能不能看见“cue -> judgement”的最小路径？

---

## Type-specific tightening rules

### 1. Pure scent / atmosphere-led samples
例如：
- `薰衣草的芳香`
- 其他 scent-led / atmosphere-led 输入

必须额外检查：
- [ ] `associationReadings.primary` 足够具体，不只是空泛“有气氛”
- [ ] `designTranslationHints.baseLayer` 足够明确，不只是“做空气感”

风险：
如果这两项太弱，模型很容易塌成 generic atmosphere language。

---

### 2. Mixed imagery samples
例如：
- `加州沙滩和柠檬叶的香气`
- `烟雨里有一点竹影`
- `花叶意向，但不要太满`

必须额外检查：
- [ ] `primary` / `secondary` 已明确分层
- [ ] 如存在明显误展开风险，补 `nearbyButSuppressed`
- [ ] 不要让样本退化成并列元素抽取

风险：
如果没有联想层级，模型会把 mixed imagery 学成“元素列表”。

---

### 3. Vague / under-specified preference samples
例如：
- `还不确定，想高级一点`

必须额外检查：
- [ ] `associationReadings.secondary` 已填写
- [ ] `designTranslationHints.suppressedLiteralization` 足够明确
- [ ] 明确写出“开放在哪里、暂不落地什么”

风险：
如果没有这层，模型很容易擅自补风格模板或具体物象。

---

### 4. Material / texture samples
例如：
- `石头肌理但别太硬`

必须额外检查：
- [ ] `traceLayer` 已明确
- [ ] `suppressedLiteralization` 已明确
- [ ] 不要只剩“材质名词 + 程度词”

风险：
如果设计翻译层太弱，模型会直接字面化成硬材质 rendering。

---

## Minimal required supervision package for each new sample

如果 Task 17 下一轮继续扩 package 样本，
每条新增样本至少满足：

- [ ] `output.package` 保持原样
- [ ] `output.supervision.evidenceCues.domain` 至少 2 条
- [ ] `output.supervision.evidenceCues.handles` 覆盖主 handle
- [ ] `output.supervision.associationReadings.primary` 至少 1 条
- [ ] `output.supervision.associationReadings.secondary` 至少 1 条
- [ ] `output.supervision.designTranslationHints.baseLayer` 至少 1 条
- [ ] `output.supervision.designTranslationHints.traceLayer` 至少 1 条
- [ ] `output.supervision.designTranslationHints.suppressedLiteralization` 至少 1 条
- [ ] 若存在明显误读风险，补 `nearbyButSuppressed` 或 `evidenceCues.misleadingPaths`

---

## Admission rule

### A sample should NOT enter gold if:
- [ ] 只有 domain / handles，没有 evidenceCues
- [ ] 有 handles，但说不清它们为什么成立
- [ ] 有联想词，但分不清 primary / secondary
- [ ] 有 design translation 的感觉，但没有明确 base / trace / suppressedLiteralization
- [ ] 有 misleading path，但没有说明为什么这条误读会在这句里发生
- [ ] vague sample 仍然只是“开放”这种抽象标签，没有说明开放在哪里

### A sample is ready for gold when:
- [ ] 它不只是“结果正确”
- [ ] 它已经有最小可解释骨架
- [ ] 它的 supervision 能帮助后续训练不把能力训扁

---

## One-sentence curator rule

今后每新增一条 package sample，
不要只问：

- domain 和 handles 写了吗？

而要继续问：

- 为什么是它？
- 主联想是什么？
- 次联想是什么？
- 设计上什么做底？
- 什么只留痕？
- 什么不能站起来？
