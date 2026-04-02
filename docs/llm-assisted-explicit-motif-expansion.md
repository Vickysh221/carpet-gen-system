# LLM-Assisted Explicit Motif Expansion

Date: 2026-04-02

## 1. Problem this solves

当前系统已经开始具备一部分“明确物像保真”能力：
- 花 / 花叶 / lotus / light-trace / water-wave 等对象开始能进入 pattern spec 与 prompt

但这个能力目前主要依赖：
- 手工 KEY_ELEMENT_MAP
- 手工 prompt-facing motif phrases
- 手工 structuralPattern 映射

这会产生两个问题：

### 问题 A：纯手工对象表扩展太慢
如果每个新对象都要人工逐个接：
- 虾
- 葡萄
- 贝壳
- 柳絮
- 松果
- 鹭鸟
- 渔火

那系统会：
- 扩展速度很慢
- 维护成本很高
- 总在“没支持这个词”上卡住

### 问题 B：完全依赖 LLM 自由理解又不稳
如果不做显式对象支持，而直接让 LLM 自由发挥：
- 可解释性差
- 回归困难
- 容易 literalize
- 输出不稳定
- 难以保证 anti-literal / anti-bias

所以需要一个中间方案。

---

## 2. Core principle

这个方案的核心不是二选一：

- 不是“全手工对象表”
- 也不是“全靠 LLM 临场发挥”

而是：

> **核心对象显式建模 + LLM 辅助扩展 + 测试后再沉淀回核心对象层**

用一句话压缩：

> **LLM 负责 open-world 理解，compiler 负责 closed-world 保真。**

---

## 3. Three-layer architecture

## Layer 1 — Core explicit motifs

这是系统的“稳定支持对象集”。

这些对象：
- 高频
- 重要
- 容易被误生成
- 一旦错就很影响体验

需要显式手工建模。

### Examples
- floral
- lotus
- leaf
- branch
- wave
- light
- sail
- stone
- reed
- bamboo shadow

对这些对象，系统应具备：
- `keyElement`
- `motifSubject`
- `structuralPattern`
- `explicitMotifs`
- `antiLiteralRules`
- `prompt adapter phrases`

---

## Layer 2 — LLM-assisted temporary motifs

这是系统的“开放词表适配层”。

当用户输入一个当前对象表里没有的明确物像词时，
可以由 LLM 先生成一组**临时抽象对象模板**。

例如：
- 葡萄
- 虾
- 贝壳
- 柳絮
- 珊瑚
- 羽毛

LLM 不直接决定最终 prompt，而是先输出：
- 对象抽象特征
- 可用于 pattern 的结构表达
- anti-literal 风险
- 初步 prompt-facing motifs

这一层的输出应该被标记为：
- temporary
- low-to-medium confidence
- needs review / needs test

---

## Layer 3 — Promotion back to core motifs

如果一个 temporary motif 满足：
- 出现频率高
- 测试效果稳定
- prompt 行为可解释
- anti-literal 风险可控

那么可以把它升级为正式核心对象。

例如：
- grape cluster motif
- shrimp silhouette rhythm
- shell spiral trace

一旦升级，就进入 Layer 1，成为显式支持对象的一部分。

---

## 4. What LLM should and should not do

## 4.1 LLM should do

LLM 适合做：
- 识别明确对象词
- 提取感知特征
- 生成抽象 pattern 候选表达
- 生成 anti-literal 风险说明
- 生成 temporary motif templates

例如输入：
> 葡萄

LLM 可以输出：
- clustered rounded accents
- hanging grouped rhythm
- bead-like punctuation
- avoid literal fruit illustration
- avoid vineyard decorative motif

---

## 4.2 LLM should NOT directly do

LLM 不应该直接决定：
- 最终 canonical state
- 最终 committed prompt
- 最终 negative prompt
- source-of-truth object mapping

也就是说，它不应该绕过 compiler。

LLM 的位置是：
> **proposal generator**

而不是：
> **final authority**

---

## 5. Temporary motif template schema

建议新增一个中间结构：

```ts
export interface TemporaryMotifTemplate {
  rawText: string;
  normalizedSubject: string;
  confidence: number;
  visualTraits: string[];
  structuralPatternCandidates: string[];
  explicitMotifPhrases: string[];
  antiLiteralWarnings: string[];
  recommendedRenderingMode: "suggestive" | "silhouette" | "structural";
  recommendedAbstraction: "abstract" | "semi-abstract";
  provisionalNegativeHints: string[];
  reviewStatus: "temporary" | "accepted" | "rejected";
}
```

---

## 6. Example: grape

### User input
`葡萄`

### LLM-assisted temporary motif output
```json
{
  "rawText": "葡萄",
  "normalizedSubject": "grape",
  "confidence": 0.72,
  "visualTraits": [
    "clustered rounded forms",
    "hanging grouped rhythm",
    "dense-but-organized punctuation"
  ],
  "structuralPatternCandidates": [
    "cluster rhythm",
    "bead-like grouping",
    "hanging punctuation"
  ],
  "explicitMotifPhrases": [
    "grape-like clustered accents",
    "rounded clustered punctuation"
  ],
  "antiLiteralWarnings": [
    "avoid literal fruit illustration",
    "avoid vineyard decorative motif"
  ],
  "recommendedRenderingMode": "suggestive",
  "recommendedAbstraction": "semi-abstract",
  "provisionalNegativeHints": [
    "no realistic grapes",
    "no vineyard scene",
    "no fruit basket illustration"
  ],
  "reviewStatus": "temporary"
}
```

这时系统可以把它用于：
- preview bundle
- exploratory prompt

但不应直接把它当成 committed core motif。

---

## 7. Example: shrimp

### User input
`虾`

### LLM-assisted temporary motif output
```json
{
  "rawText": "虾",
  "normalizedSubject": "shrimp",
  "confidence": 0.61,
  "visualTraits": [
    "curved segmented silhouette",
    "shell-like arc rhythm",
    "lightly articulated body curvature"
  ],
  "structuralPatternCandidates": [
    "segmented arc rhythm",
    "curved shell trace",
    "repeated crescent-like structure"
  ],
  "explicitMotifPhrases": [
    "shrimp-like curved silhouette",
    "segmented arc accent"
  ],
  "antiLiteralWarnings": [
    "avoid seafood illustration",
    "avoid realistic shrimp body depiction"
  ],
  "recommendedRenderingMode": "silhouette",
  "recommendedAbstraction": "abstract",
  "provisionalNegativeHints": [
    "no realistic shrimp",
    "no seafood poster style",
    "no food illustration"
  ],
  "reviewStatus": "temporary"
}
```

这里就能看到：
- LLM 可能能“理解虾”
- 但要让它进入 pattern 语言，仍然需要 compiler 和 anti-literal 限制

---

## 8. Promotion rules

一个 temporary motif 什么时候可以升级成 core explicit motif？

建议同时满足以下条件：

### 8.1 Frequency
- 在真实输入中多次出现
- 不是一次性偶发词

### 8.2 Visual stability
- 多次测试生成都能保持大体方向
- 不会频繁跑成 literal 插画

### 8.3 Semantic stability
- compiler 能稳定输出：
  - `explicitMotifs`
  - `structuralPattern`
  - `antiLiteralRules`

### 8.4 Risk controllability
- negative hints 足够清楚
- 常见跑偏路径能被抑制

### 8.5 Product value
- 该对象对目标用户场景真的有价值
- 不是为了“能支持更多名词”而机械扩充

---

## 9. Recommended product behavior

## 9.1 For stable core motifs
直接进入：
- canonical state
- semanticSpec
- prompt adapter
- committed bundle

## 9.2 For temporary LLM-assisted motifs
只建议进入：
- exploratory / preview bundle
- prompt candidates
- debug / review panel

并明确标记：
- temporary motif
- lower confidence

不要假装它已经和 floral / lotus 同等级稳定。

---

## 10. UI / simulator implications

在 simulator 页面里，可以把 motif 分成两类显示：

### Core motifs
- floral accent
- lotus petal rhythm
- distant sail silhouette

### Temporary motifs
- grape-like clustered accents (temporary)
- shrimp-like curved silhouette (temporary)

这样测试时一眼就能知道：
- 哪些是正式支持对象
- 哪些只是 LLM 临时扩展

---

## 11. Suggested pipeline

```text
user input
  -> explicit motif matcher
     -> if hit core motif: use core mapping
     -> else ask LLM motif expander for temporary motif template
  -> canonical state builder
  -> semantic spec
  -> test bundle
  -> prompt adapters
```

也就是说：
- 先尝试命中 core motif
- 命不中，再走 LLM-assisted temporary motif path

---

## 12. Guardrails

为了避免 temporary motif 乱跑，建议加这些限制：

### 12.1 Never skip abstraction guard
即使是 temporary motif，也默认：
- `renderingMode = suggestive / silhouette / structural`
- 不默认 literal

### 12.2 Never bypass anti-literal layer
任何对象词，只要进入 prompt，必须同时产出：
- antiLiteralWarnings
- provisionalNegativeHints

### 12.3 Never let temporary motifs overwrite stable core motifs
如果输入里同时有：
- 荷花
- 葡萄

那么：
- 荷花走 core motif
- 葡萄走 temporary motif
- 不能让 temporary motif 抢主导

---

## 13. Minimal implementation suggestion

如果下一轮要实现最小版，建议分两步：

### Step 1 — Type and hook
新增：
- `TemporaryMotifTemplate`
- `motifExpander.ts`

提供一个函数：

```ts
async function expandTemporaryMotif(rawText: string): Promise<TemporaryMotifTemplate | undefined>
```

### Step 2 — Compiler integration
当：
- 没命中 core motif
- 但检测到明确物像词

则：
- 调用 `expandTemporaryMotif(...)`
- 将其作为 temporary motif 附加到 test bundle
- 在 prompt adapter 中作为 exploratory prompt 的附加对象表达

本轮不要直接让它进入 committed state。

---

## 14. Final standard

一个健康的 explicit motif system 不该是：
- 全手工，扩不动
- 或全 LLM，稳不住

而应该是：

> **核心对象显式建模，长尾对象由 LLM 提供临时抽象模板，再通过测试决定是否升级。**

这能同时获得：
- 核心对象的产品可靠性
- 长尾对象的泛化能力
- 可调试性
- 可回归性
- 可演进性
