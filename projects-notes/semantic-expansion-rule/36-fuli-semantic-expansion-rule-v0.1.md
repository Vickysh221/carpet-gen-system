# Fuli Semantic Expansion Rule v0.1

## 1. Why this document exists

当前 Fuli 已经逐步建立了：
- direct interpretation
- prototype registry
- retrieval-based prototype matching
- deterministic merge
- semantic understanding
- semantic gap planning
- question planning

但在实际输入中已经暴露出一个新的瓶颈：

系统不是完全没有语义逻辑，
而是：

**semantic coverage 太窄，multi-signal decomposition 不足，导致复杂输入会被过早压成一个过粗、过早的主解释。**

例如：
- `草色遥看近却无`
- `张扬快乐`
- `咖啡时光`

这类输入的问题，不只是“词没收录”，
而是：
- 它们所属的语义类型不同；
- 它们不应该在进入系统时被当成同一类 cue；
- 它们需要不同的 expansion 路径；
- 它们在最终 narrative 中也不应拥有相同权重。

因此，这份文档的目标不是“继续扩词”，
而是先建立一套：

**semantic expansion rule**

用来决定：
- 输入应该如何先被拆成语义单元；
- 每种语义单元应该走哪条链路；
- 哪些需要 direct expansion；
- 哪些需要 prototype expansion；
- 哪些只能先作为弱信号保留；
- 哪些可以成为 narrative 主解释，哪些不能。

---

## 2. Core conclusion

semantic expansion 的目标不是“理解更多词”，
而是：

**把用户输入拆成可进入当前主链的语义单元，
并明确这些语义单元应该分别进入：**
- direct hit
- prototype interpretation
- retrieval expansion
- fallback
- ambiguity / weak signal retention

也就是说，系统不应该把整句输入先压成一个总 mood，
而应先做：

```text
raw input
-> cue decomposition
-> semantic unit typing
-> route decision
-> weighted merge
-> semantic understanding / question planning
```

因此，semantic expansion 不是一个“加词”动作，
而是一个：

**输入分解 + 语义路由 + 权重约束**

机制。

---

## 3. Cue decomposition first, not whole-sentence compression first

当前系统最大的风险之一，是过早把整句压成一个单一主方向。

因此，semantic expansion 的第一原则是：

**先拆 cue，再解释，不要整句先压成一个主解释。**

例如：

`草色遥看近却无 张扬快乐 咖啡时光`

不应直接变成：
- “安静日常感”

而应先拆成至少三个 cue：
- `草色遥看近却无`
- `张扬快乐`
- `咖啡时光`

然后分别解释它们的：
- cue type
- target field
- target slot
- candidate readings
- confidence
- route decision

---

## 4. Cue types

当前建议把语义 cue 至少分成以下五类：

### 4.1 direct cue

特点：
- 可以较稳定映到 field / slot；
- 不需要先经过 prototype 压缩；
- 往往是高频、明确、可枚举表达。

示例：
- 安静
- 柔和
- 不要太花
- 有秩序
- 暖一点

### 4.2 prototype cue

特点：
- 不能稳定直译成单轴；
- 但可以稳定进入原型层；
- 通常是生活方式 / 情境 / 意象型表达。

示例：
- 咖啡
- 好天气
- 黄昏
- 生活感
- 咖啡时光

### 4.3 poetic / subtle cue

特点：
- 带明确审美方向；
- 但不能直接落到参数层；
- 适合先做 retrieval expansion 或弱信号保留。

示例：
- 草色遥看近却无
- 若有若无
- 雾感
- 轻存在感

### 4.4 impression-energy cue

特点：
- 主要指向存在感 / 活力 / 张力 / 克制；
- 往往服务于 `overallImpression`；
- 可能需要 direct expansion 或 impression prototype expansion。

示例：
- 张扬
- 快乐
- 有存在感
- 低调
- 克制
- 别太抢

### 4.5 unsupported cue

特点：
- 当前既不在 direct，也不在 prototype，也没有稳定 retrieval 邻居；
- 暂不应强行进入主解释。

这类 cue 可先：
- 保留为弱信号
- 进入 ambiguity
- 或进入 fallback candidate generation

但不应强行直接主导 narrative。

---

## 5. SemanticUnit

为了避免 cue 在进入系统后再次被压扁，
建议引入一个中间对象：

```ts
type SemanticUnit = {
  cue: string;
  cueType: "direct" | "prototype" | "poetic" | "impression-energy" | "unsupported";
  targetField?: HighValueField;
  targetSlot?: EntryAgentSlotKey;
  candidateReadings: string[];
  axisHints?: EntryAgentAxisHints;
  confidence: number;
  weight: number;
  needsExpansion: boolean;
};
```

这个对象的作用是：
- 把句子先拆成多个语义单元；
- 让后续 merge 面对的是“多个对象”，而不是“一个已经被压扁的总印象”。

---

## 6. Which routes need expansion

semantic expansion 不应在所有 cue 上同时进行。

当前应优先发生 expansion 的，是以下三类 cue：

### 6.1 prototype cue

走：
- prototype registry
- retrieval entry expansion

### 6.2 poetic / subtle cue

走：
- retrieval expansion
- retrieval 弱时，再进入 fallback

### 6.3 impression-energy cue

优先走：
- direct expansion
- 其次可走 prototype / retrieval expansion

这一设计的目的，是让系统：
- 先补高价值语义 coverage；
- 再补更长尾的表达。

---

## 7. Direct expansion rule

### When to use
如果一个 cue：
- 高频出现；
- 主指向较稳定；
- 可以较可靠地映到 field / slot；
- 不需要先经过原型压缩；

则应优先扩进：

**`directHitInterpretation`**

### First-batch recommendation

#### overallImpression
- 张扬
- 快乐
- 有存在感
- 低调
- 克制
- 抢眼
- 别太抢

#### colorMood
- 草色
- 雾感
- 朦胧
- 收一点
- 淡一点

#### arrangementTendency
- 留白
- 透气
- 松弛一点

这里的原则不是“看起来像一个词就加进去”，
而是：
- 高频
- 高价值
- 主指向稳定

---

## 8. Prototype expansion rule

### When to use
如果一个 cue：
- 同时影响多个 field；
- 很自然地出现在用户语言里；
- 不适合直接映成单轴；
- 需要通过原型层压缩再映射；

则应优先扩进：

**`prototypeRegistry`**

### First-batch recommendation

#### lifestyle / daily ritual
- 咖啡时光
- 安静日常感
- 轻陪伴感
- 低刺激日常感

#### expressive / presence
- 张扬快乐
- 明亮存在感
- 轻快张力

#### subtle-poetic
- 草色遥看近却无
- 若有若无
- 轻存在感
- 雾里有色

prototype expansion 的关键不是把词换个名字存起来，
而是：
- 让它们有 semanticSummary；
- 有 slotSummary；
- 有 retrieval entry；
- 有 reading 映射。

---

## 9. Retrieval entry expansion rule

只加 prototype registry 还不够。

每个 prototype 至少应有两类 retrieval entry：

### 9.1 canonical entry
包含：
- label
- aliases
- rationale

### 9.2 semantic paraphrase entry
包含：
- 更接近用户自然表达的语义改写；
- 更利于召回长尾表达；
- 带主/次槽位的语义描述。

### Example: coffee-time
不应只 embed：
- 咖啡时光

还应 embed：
- 偏暖、低刺激、陪伴感、日常放松
- 不一定复古，但有生活仪式感

### Example: subtle-green-presence
不应只 embed：
- 草色遥看近却无

还应 embed：
- 颜色若有若无
- 近看淡、远看有一点存在
- 低对比、轻存在感、朦胧自然

retrieval expansion 的目标不是“让检索更花哨”，
而是让 semantic retrieval 真能承接长尾自然表达。

---

## 10. Multi-cue merge rule

不同 cue 不能简单相加。

每个 `SemanticUnit` 至少应带：
- confidence
- weight
- targetField
- targetSlot

### Merge principles

#### If targetSlot differs
允许并存。

#### If targetSlot is the same and direction is similar
做 reinforcement。

#### If targetSlot is the same and direction conflicts
做 conflict / ambiguity。

#### If poetic cue conflicts with direct cue
默认：
- direct cue 优先；
- poetic cue 保留为弱信号；

除非 poetic cue 有更高 retrieval support。

这个规则的目的不是压制 poetic cue，
而是防止弱 poetic 表达过早篡位。

---

## 11. Which cues should not directly drive narrative

以下 cue 默认不应直接成为 narrative 主解释：

- unsupported cue
- retrieval 很弱的 poetic cue
- 只有 fallback 支撑、没有 direct/prototype corroboration 的 cue
- 语义过宽、只像 mood residue 的 cue

这些 cue 可以：
- 进入 ambiguity
- 进入 secondary reading
- 进入 question planning

但不应直接变成：
- “当前主要在往……”

这条规则的目的，是防止 narrative 被弱信号伪装成稳定理解。

---

## 12. Expansion priority

semantic expansion 不应一次铺太大。

### Priority 1
高频 + 高价值 + 直接影响主解释：
- 张扬
- 存在感
- 快乐
- 克制
- 低调

### Priority 2
prototype / lifestyle：
- 咖啡时光
- 安静日常感
- 陪伴感

### Priority 3
poetic / subtle：
- 草色遥看近却无
- 若有若无
- 雾感
- 轻存在感

也就是说，第一轮不要先扩所有诗性表达，
而要先补：
- impression-energy
- high-frequency lifestyle
- 最能影响主解释的 subtle cue

---

## 13. Five questions for every new semantic cue

后续每补一个新语义，不应只问“要不要支持这个词”，
而应依次回答：

1. 它是 direct、prototype、poetic，还是 unsupported？
2. 它主指向哪个 field / slot？
3. 它需要 direct expansion 还是 prototype expansion？
4. 它要不要新增 retrieval entry？
5. 它进入 narrative 时是主解释、次解释，还是只保留为 ambiguity？

只有这五个问题都回答了，
一个新语义才算真正被“接进系统”，
而不是只被临时塞进词表。

---

## 14. Current design conclusion

semantic expansion 的核心不是“扩词”，
而是：

**先把输入拆成语义单元，
再决定这些语义单元分别进入 direct、prototype、retrieval、fallback，以及它们能在主解释里占多大权重。**

也就是说，Fuli 下一步真正要建的，
不是更大的关键词表，
而是一层：

**cue decomposition + semantic routing + weighted merge constraints**

这层如果站住，复杂输入才不会再被过早压成一个过粗、过早的主解释。
