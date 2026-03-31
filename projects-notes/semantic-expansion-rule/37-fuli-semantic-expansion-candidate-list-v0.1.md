# Fuli Semantic Expansion Candidate List v0.1

## 1. Why this document exists

`36-fuli-semantic-expansion-rule-v0.1.md` 已经定义了 semantic expansion 的规则：

- 先做 cue decomposition
- 再做 semantic routing
- 再决定 direct / prototype / retrieval entry / fallback
- 并限制哪些 cue 能主导 narrative，哪些只能保留为弱信号

但规则本身还不够落地。

接下来真正要进入实现时，需要一份更具体的：

**第一批要补哪些语义簇，以及它们分别应该走哪条 expansion 路径。**

这份文档的作用就是：
- 给后续 direct expansion 提供候选词簇
- 给 prototype registry expansion 提供第一批 prototype 候选
- 给 retrieval entry expansion 提供补充语义文本方向
- 给 Codex / 实现任务一个可操作的最小范围

这不是最终完整词库，
而是第一批 semantic expansion implementation 的候选清单。

---

## 2. Classification legend

当前语义扩展按这三条实现路径分：

### A. Direct expansion
适合：
- 高频
- 高价值
- 主指向稳定
- 不必先经过 prototype 压缩

### B. Prototype expansion
适合：
- 同时影响多个 field
- 不能稳定直译成单轴
- 需要原型层先压缩

### C. Retrieval entry expansion
适合：
- 已有 prototype，但长尾表达无法被稳定召回
- 需要 semantic paraphrase / retrieval text 补充

同一个语义簇可能同时进入：
- prototype expansion
- retrieval entry expansion

但不应在第一轮同时走太多路径，
需要先指定主路径。

---

## 3. Priority 1: impression / presence cluster

这批语义簇优先级最高，
因为它们直接影响：
- `overallImpression`
- `Current understanding`
- `Next question`
- semantic conflict / ambiguity 的主解释方向

### 3.1 张扬
- main route: **direct expansion**
- field: `overallImpression`
- target slot: `impression`
- likely axes:
  - `energy ↑`
  - `calm ↓`
- notes:
  - 常与“存在感”“抢眼”“外放”形成近义簇
  - 第一轮应作为 direct high-value impression cue 处理

### 3.2 存在感
- main route: **direct expansion**
- field: `overallImpression`
- target slot: `impression`
- likely axes:
  - `energy ↑`
  - `calm ↓`
- notes:
  - 比“张扬”更中性，未必一定高刺激
  - 问题生成时应优先用于 contrast-calm-vs-presence

### 3.3 快乐
- main route: **direct expansion**
- field: `overallImpression`
- target slot: `impression`
- likely axes:
  - `energy ↑`
  - `softness` 视上下文而定
- notes:
  - 容易和“明亮”“轻快”联动
  - 第一轮可先视作整体活力 / 明快印象 cue

### 3.4 低调
- main route: **direct expansion**
- field: `overallImpression`
- target slot: `impression`
- likely axes:
  - `energy ↓`
  - `calm ↑`
- notes:
  - 与“克制”“别太抢”组成同簇

### 3.5 克制
- main route: **direct expansion**
- field: `overallImpression` / `colorMood`
- target slot:
  - primary: `impression`
  - secondary: `color`
- notes:
  - 是典型 dual-signal 候选
  - 第一轮先按 direct expansion 进入 impression / color restraint 线

### 3.6 别太抢 / 抢眼
- main route: **direct expansion**
- field: `overallImpression`
- target slot: `impression`
- notes:
  - 用于 presence 强度控制
  - 与“张扬 / 存在感 / 低调”一起形成 impression-energy cluster

---

## 4. Priority 2: lifestyle / daily ritual cluster

这批语义簇优先级第二，
因为它们是 prototype layer 最自然、最能体现入口语言价值的一类表达。

### 4.1 咖啡时光
- main route: **prototype expansion**
- related existing prototype:
  - `coffee`
- suggested new prototype strategy:
  - 可作为 `coffee` 的扩展 prototype
  - 或独立为 `coffee-time`
- likely fields:
  - `overallImpression`
  - `colorMood`
- likely slots:
  - primary: `color`
  - secondary: `impression`
- notes:
  - 比单纯“咖啡”更偏生活方式 / 时间感
  - 应补 retrieval paraphrases：
    - 日常放松
    - 陪伴感
    - 仪式感但不重

### 4.2 安静日常感
- main route: **prototype expansion**
- likely fields:
  - `overallImpression`
  - `patternTendency`
- likely slots:
  - primary: `impression`
  - secondary: `motif`
- notes:
  - 当前 narrative 已经会落到这个方向，但系统还没有把它当明确 prototype 资产
  - 应进入 registry，而不是只让 LLM fallback 临时生成

### 4.3 轻陪伴感
- main route: **prototype expansion**
- likely fields:
  - `overallImpression`
- likely slots:
  - primary: `impression`
- notes:
  - 偏 warmth / softness / calm
  - 容易与“温暖”“陪伴感”“不冷”形成 prototype 簇

### 4.4 低刺激日常感
- main route: **prototype expansion**
- likely fields:
  - `overallImpression`
- likely slots:
  - primary: `impression`
- notes:
  - 可作为安静日常感簇的 retrieval paraphrase
  - 不一定要单独做 prototype，可先做 retrieval entry expansion

---

## 5. Priority 3: poetic / subtle presence cluster

这批语义簇价值很高，
但第一轮不宜铺太多。

它们的特点是：
- 审美方向明确
- 直译成参数会很粗暴
- retrieval / prototype expansion 比 direct expansion 更适合

### 5.1 草色遥看近却无
- main route: **prototype expansion**
- secondary route: **retrieval entry expansion**
- likely fields:
  - `colorMood`
  - `patternTendency`
- likely slots:
  - primary: `color`
  - secondary: `motif`
- semantic intent:
  - subtle color presence
  - low-contrast visibility
  - near-invisible but not absent
- notes:
  - 不建议第一轮直接当 direct cue
  - 更适合作为一个 subtle-presence prototype

### 5.2 若有若无
- main route: **prototype expansion**
- likely fields:
  - `colorMood`
  - `overallImpression`
- likely slots:
  - primary: `color`
  - secondary: `impression`
- notes:
  - 可作为“草色遥看近却无”簇的更通用 paraphrase

### 5.3 雾感
- main route: **retrieval entry expansion**
- possible future route: direct or prototype, depending on usage
- likely fields:
  - `colorMood`
  - `overallImpression`
- likely slots:
  - color / impression
- notes:
  - 第一轮更适合补 retrieval entry，不急着升格为 direct / prototype

### 5.4 轻存在感
- main route: **prototype expansion**
- likely fields:
  - `overallImpression`
- likely slots:
  - primary: `impression`
- notes:
  - 是 impression-energy cluster 和 subtle cluster 的桥接点
  - 后续可能很值钱

---

## 6. Priority 4: subtle color / restraint cluster

这批表达和 `colorMood` 很相关，
适合逐步补 direct + retrieval 两层。

### 6.1 草色
- main route: **direct expansion**
- likely field: `colorMood`
- target slot: `color`
- notes:
  - 作为“草色遥看近却无”的简化 direct cue 版本
  - 第一轮可先低权重 direct 进入 muted / earthy green 方向

### 6.2 淡一点 / 收一点
- main route: **direct expansion**
- likely field: `colorMood`
- target slot: `color`
- notes:
  - 高频、主指向稳定，适合作为 direct expansion

### 6.3 朦胧 / 雾里有色
- main route: **retrieval entry expansion**
- notes:
  - 先不要直接结构化成参数
  - 先帮助 subtle-presence prototype 被召回

---

## 7. First implementation recommendation

如果当前只选最小第一批，我建议不要铺得太大。

### Phase 1A: direct expansion first
优先补：
- 张扬
- 存在感
- 快乐
- 低调
- 克制
- 别太抢

### Phase 1B: prototype expansion next
优先补：
- 咖啡时光
- 安静日常感
- 轻陪伴感

### Phase 1C: retrieval entry expansion for subtle cluster
优先补：
- 草色遥看近却无
- 若有若无
- 雾感
- 轻存在感

这个顺序的理由是：
- 先补最影响 `overallImpression` 的高频语义；
- 再补最自然的 lifestyle prototype；
- 最后补 poetic / subtle 的长尾语义。

---

## 8. What not to do in first batch

### 8.1 不要把所有 poetic 表达都直接塞进 direct rules
那会让 direct layer 失真。

### 8.2 不要把 retrieval 当作“替代原型设计”
retrieval 只能增强召回，不能替代 prototype ontology。

### 8.3 不要让所有新语义都直接主导 narrative
尤其是：
- retrieval 很弱的 subtle cue
- 只有 fallback 支撑的弱候选

这些更适合先作为：
- ambiguity
- secondary reading
- question planning evidence

---

## 9. Candidate list summary table

| Semantic cluster | Main route | Target field | Target slot | Priority |
|---|---|---|---|---|
| 张扬 | direct | overallImpression | impression | P1 |
| 存在感 | direct | overallImpression | impression | P1 |
| 快乐 | direct | overallImpression | impression | P1 |
| 低调 | direct | overallImpression | impression | P1 |
| 克制 | direct | overallImpression / colorMood | impression / color | P1 |
| 别太抢 | direct | overallImpression | impression | P1 |
| 咖啡时光 | prototype | overallImpression / colorMood | color / impression | P2 |
| 安静日常感 | prototype | overallImpression / patternTendency | impression / motif | P2 |
| 轻陪伴感 | prototype | overallImpression | impression | P2 |
| 草色遥看近却无 | prototype + retrieval entry | colorMood / patternTendency | color / motif | P3 |
| 若有若无 | prototype | colorMood / overallImpression | color / impression | P3 |
| 雾感 | retrieval entry | colorMood / overallImpression | color / impression | P3 |
| 轻存在感 | prototype | overallImpression | impression | P3 |
| 草色 | direct | colorMood | color | P4 |
| 淡一点 / 收一点 | direct | colorMood | color | P4 |
| 朦胧 / 雾里有色 | retrieval entry | colorMood | color | P4 |

---

## 10. Current design conclusion

semantic expansion 的第一批实现，不应从“更多词”开始，
而应从：

- impression-energy cluster
- lifestyle/daily cluster
- subtle poetic cluster

这三组高价值语义簇开始，
并明确它们各自应该走：
- direct expansion
- prototype expansion
- retrieval entry expansion

这份 candidate list 的意义，是把 `36` 里的规则进一步压成：

**下一步可以真正进入实现的最小语义扩展清单。**
