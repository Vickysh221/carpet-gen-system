# Carpet Pattern Semantic Slots PRD

Date: 2026-04-04
Project: carpet-gen-system
Status: product / semantic-compiler PRD

---

## 1. Problem Statement

当前系统在处理开放语义输入时，已经不只是“识别几个词，再映射 prompt”。
真正的问题是：

> **模糊语义进入“地毯图案处理”之后，应该先被压成什么样的中间表征。**

如果这一层没有定义清楚，系统就会反复掉进以下问题：
- 过度依赖 object similarity
- 被单个 cue 拉偏（例如 `叶` -> explicit motif）
- atmosphere / scent / air / material cues 丢失
- planner 只能从现成 comparison seeds 里近似取
- compiler 只能消费粗糙、不稳定的语义输入

因此，本 PRD 目标不是增加更多 case patch，
而是正式定义：

> **开放语义如何进入地毯图案编译器的中间语义层。**

---

## 2. Core Product Principle

当语义进入“地毯图案处理”时，真正高权重的，不再是：

- 物体像不像
- 场景是不是被写实复现

而是以下四类问题：

1. **图案如何成立**
2. **语义通过什么母题进入图样**
3. **自由感被多少秩序托住**
4. **意图识别靠哪些锚点维持**

换句话说：

> 地毯图案不是自由绘画，也不是叙事插画。
> 模糊语义必须先被翻译成“织物图样可成立的中间语义”，再进入生成控制。

---

## 3. Why object similarity is not enough

对于地毯图样，单纯识别“这句话像什么物体”是不够的。

例如：
- `海边、加州、柠檬叶、香气`

如果系统只做 object similarity，容易得到：
- 海浪
- 叶子
- 柠檬

但这并不等于“适合地毯”的图案语义。

真正需要的是：
- 空气性
- 明亮通透感
- 清绿苦感
- 悬浮/挥发/轻漂移
- 织物上的秩序与留白
- 对象痕迹保留强度

因此，系统必须先把语义压入一个**pattern-semantic intermediate representation**，
而不是直接把词映射成具象元素。

---

## 4. Three-layer intermediate representation

建议将地毯图样中间语义层分成 3 层。

### 4.1 Formative Structure Layer
回答：
> 图案作为织物，是如何成立的？

这一层关注：
- pattern architecture
- structural order
- density & breathing
- flow direction

它决定图案有没有织物逻辑、节奏逻辑、呼吸逻辑。

---

### 4.2 Semantic Material Layer
回答：
> 语义通过什么视觉材料进入图样？保留到什么程度？

这一层关注：
- motif family
- abstraction level
- semantic anchor strength

它决定对象/气氛/意象最终如何留下痕迹。

---

### 4.3 Atmospheric Surface Layer
回答：
> 整张图样处在怎样的色彩天气与观看气氛中？

这一层关注：
- color climate
- （后续可并入 presence mode / atmospheric behavior）

它决定最终感受到的是怎样的空气、光感与表面状态。

---

## 5. Eight core slots

以下 8 个核心槽位，足以支撑大部分“模糊语义 -> 织物图样”的生成控制。

---

### 5.1 Pattern Architecture
**图案架构槽位**

回答：
> 这张图案在织物上以什么组织方式存在？

建议参数：
- `field`
- `repeat_unit`
- `medallion`
- `bordered_field`
- `stripe_band`
- `scattered`
- `lattice_vine`
- `panelled`

说明：
这是最重要的槽位之一。先决定图案如何成立，再谈颜色和元素。

---

### 5.2 Motif Family
**母题家族槽位**

回答：
> 图案的主要视觉语言属于哪一类？

建议参数：
- `botanical_linear`
- `botanical_mass`
- `wave_fluid`
- `mist_field`
- `grain_speckle`
- `geometric_sunwash`
- `organic_contour`
- `hybrid_botanical_fluid`

说明：
不要直接让系统从词自由联想到任意物体，
而要限制在适合地毯图样的母题家族中。

---

### 5.3 Abstraction Level
**抽象层级槽位**

回答：
> 语义锚点究竟保留到什么程度？

建议参数：
- `literal`
- `recognizable`
- `suggestive`
- `ambient`
- `hybrid`

说明：
这是控制“aha 感”与“不过度具象”的关键槽位。

---

### 5.4 Structural Order
**结构秩序槽位**

回答：
> 自由联想在多大程度上被图案秩序约束？

建议参数：
- `high_order`
- `mid_order`
- `low_order`
- `hidden_grid`
- `organic_repeat`

说明：
这决定图样更像“艺术画”还是“织物纹样”。

---

### 5.5 Density & Breathing
**疏密与呼吸槽位**

回答：
> 图样是如何呼吸的？

建议参数：
- `dense`
- `balanced`
- `sparse`
- `clustered_sparse`
- `edge_fade`
- `center_loose`
- `banded_density`
- `breathing_gradient`

说明：
空气性很多时候不是靠颜色，而是靠疏密和留白的设计。

---

### 5.6 Flow Direction
**流向槽位**

回答：
> 图案内部的势能往哪儿走？

建议参数：
- `horizontal_drift`
- `diagonal_breeze`
- `radial_diffusion`
- `upward_evaporation`
- `still_field`
- `tidal_wave`
- `multi_directional_soft`

说明：
这是把“风 / 水汽 / 挥发 / 漂移”真正落到地毯图样上的重要手段。

---

### 5.7 Color Climate
**色彩气候槽位**

回答：
> 这张图案处在怎样的色彩环境里？

建议拆成子参数：

#### dominant_palette
- `sea-salt white`
- `pale aqua`
- `washed sage`
- `lemon-leaf green`
- `sun-bleached sand`
- `muted olive`
- `misty blue-grey`

#### temperature_balance
- `cool_air_warm_light`
- `warm_dry`
- `neutral_clean`
- `cool_mist`

#### saturation_mode
- `low_saturation_field`
- `muted_with_bright_accents`
- `sun-bleached`
- `airy_pastel`

#### contrast_mode
- `low_contrast`
- `soft_layered_contrast`
- `highlight_spark`
- `washed_depth`

说明：
这里不是在说单一颜色，而是在说整张图样的“色彩天气”。

---

### 5.8 Semantic Anchor Strength
**语义锚点强度槽位**

回答：
> 系统靠什么让用户觉得“对，就是这个意象”？

建议参数：
- `object_anchor`
- `mood_anchor`
- `movement_anchor`
- `palette_anchor`
- `hybrid_anchor`

强度：
- `low`
- `medium`
- `high`
- `medium_high`（可保留中间档）

说明：
该槽位专门控制：
- 靠什么命中
- 命中强度多高
- 哪些锚点必须保
- 哪些部分可以交给自由位释放

---

## 6. Anchor / Variant / Constraint split

为了同时保证“语义准确性”和“输出多样性”，
建议将槽位分成三类。

---

### 6.1 Anchor Slots
这些槽位要相对稳定，否则意图会散掉。

建议包括：
- motif family
- abstraction level
- flow direction
- color climate
- semantic anchor strength

它们决定：
> 生成结果还是不是这组意向。

---

### 6.2 Variant Slots
这些槽位允许更大范围变化，用来制造多样性。

建议包括：
- pattern architecture
- structural order
- density & breathing
- secondary motif ratio
- local rhythm / clustering
- accent proportion

它们决定：
> 同一意向下能分化出多少方案。

---

### 6.3 Constraint Slots
这些槽位不负责“生成什么”，而负责“防止跑偏”。

例如：
- 不允许高对比硬几何主导
- 不允许热带厚重叶团
- 不允许甜腻果汁感黄橙主导
- 不允许古典欧式 medallion 成为主结构
- 不允许高密度满铺无留白
- 不允许完整写实海景符号

它们决定：
> 什么必须被排除，才能保护意图。

---

## 7. Example: “加州沙滩和柠檬叶的香气”

这个例子非常适合说明：
为什么 object similarity 不够，
为什么系统需要 pattern-semantic intermediate representation。

---

### 7.1 What the system should NOT do

不应直接落成：
- 海浪图标
- 完整柠檬叶
- 柠檬果实
- 写实海边景观

也不应因为 `叶` 就被拉成纯 explicit motif path。

---

### 7.2 Semantic role split

建议先做角色判定：

- **base atmosphere**：海边空气 / 日照 / 通透 / 留白 / 干净
- **accent semantic trace**：柠檬叶的清绿、轻苦、植物线性
- **sensory modifier**：香气（说明是扩散、挥发、悬浮，不是对象具象）
- **anti-literal bias**：不要直接海滩插画，不要完整叶片点题

---

### 7.3 Formative Structure Layer

建议命中：

- `pattern_architecture`:
  - `field`
  - `scattered`
  - `lattice_vine`（弱骨架版，可作为变体）

- `structural_order`:
  - `hidden_grid`
  - `organic_repeat`
  - `mid_order`

- `density_breathing`:
  - `sparse`
  - `clustered_sparse`
  - `breathing_gradient`

- `flow_direction`:
  - `horizontal_drift`
  - `upward_evaporation`
  - `diagonal_breeze`（弱）

说明：
主体不是中心母题，而是通风、流动、轻散。

---

### 7.4 Semantic Material Layer

建议命中：

- `motif_family`:
  - 主：`hybrid_botanical_fluid`
  - 副：`grain_speckle`
  - 副：`mist_field`

- `abstraction_level`:
  - `suggestive`
  - `hybrid`

- `semantic_anchor_strength`:
  - `hybrid_anchor`
  - 强度：`medium_high`

必须保留的锚点：
- 柠檬叶式青绿
- 空气流向的轻漂移
- 海边式留白和水平扩展
- 香气感的轻颗粒 / 雾化 / 挥发轨迹

不必强保留的锚点：
- 海浪具象轮廓
- 叶子完整形状
- 柠檬果实
- 太阳图标

---

### 7.5 Atmospheric Surface Layer

建议命中：

- `dominant_palette`:
  - `sea-salt white`
  - `pale aqua`
  - `lemon-leaf green`
  - `washed sage`

- `temperature_balance`:
  - `cool_air_warm_light`

- `saturation_mode`:
  - `sun-bleached`
  - `airy_pastel`

- `contrast_mode`:
  - `soft_layered_contrast`

一句话：
> 光是暖的，空气偏凉，颜色像被太阳晒浅过。

---

### 7.6 Recommended planning split

高质量 comparison 不应围绕“有没有叶子图案”展开，
而应围绕以下 split：

- 更偏海风洗过的亮和干净
- 更偏带一点柠檬叶的清绿苦感
- 更偏香气融进空气，不立成对象
- 更偏局部留一点叶感痕迹

follow-up 的方向应是：
> 你更想保海边空气，还是保柠檬叶那一点清绿苦香？

---

## 8. Relationship with existing system layers

该 PRD 中定义的 semantic slots，
不应直接替代现有系统分层，
而应作为：

> **Interpretation Layer 与 Compiler Layer 之间的中间语义压缩空间。**

也就是说：
- Retrieval 提供候选近邻
- Interpretation 判定角色与路径
- 然后写入这套 pattern-semantic slots
- Planner 从中提取 comparison axes
- Compiler 最终消费这些槽位，产出 semanticSpec / generation control

---

## 9. Important implementation principle

这些槽位不是要让每轮都被显式填满。

系统不应退化成新的表单。

更合理的做法是：
- 高置信槽位先锚定
- 低置信槽位保持 range / unresolved
- planner 决定当前最值得确认的 split
- 用户通过 comparison / reject / prefer 来逐步收窄

原则：

> 槽位是中间压缩空间，不是用户问卷字段。

---

## 10. Product-level consequences

一旦该中间语义层成立，系统将获得以下收益：

1. **减少 object cue 误导**
   - 不会因为 `叶` 就过度落向 motif-only

2. **让 atmosphere / scent / air 进入结构化系统**
   - 不再只停留在 poetic impression 文案层

3. **让 planner 的 comparison 更贴近真正值钱的差异**
   - 不再只是 nearest available fallback card

4. **让 compiler 接收到更适合地毯图样的控制变量**
   - 不是松散文本印象，而是 pattern-capable semantic structure

5. **让多样性与意图识别可以同时被控制**
   - 通过 anchor / variant / constraint 三分法来实现

---

## 11. Next Step Recommendation

下一阶段建议：

1. 将该 PRD 中的三层结构和 8 个槽位映射到现有 `Interpretation Layer` 数据结构中
2. 为每个槽位定义：
   - detection source
   - confidence
   - planner usage
   - compiler usage
3. 先选 5-10 条代表性输入建立 mapping cases，例如：
   - 加州沙滩和柠檬叶的香气
   - 下雨前五分钟的空气
   - 烟雨里有一点竹影
   - 花叶意向，但不要太满
   - 雪地与天空没有分界线
4. 将 comparison library 从“现成 seed 列表”升级为“从 pattern-semantic slots 派生的展示差异”

---

## 12. Final Decision

下一阶段不应继续围绕单个 cue / 单个 retrieval hit 修修补补。

应正式承认：

> **系统缺的不是更多词，而是“模糊语义进入地毯图案系统时”的正确中间表征。**

本 PRD 定义的：
- 三层中间语义结构
- 八个核心槽位
- anchor / variant / constraint 三分法

将作为后续 interpretation / planning / compiler 对齐的基础。