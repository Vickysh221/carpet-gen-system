# Parameter Ontology v0.1

## 目标
为 Fuli Plus 当前参数系统建立一个可操作的 ontology 骨架，回答以下问题：

- 参数分别在控制什么对象？
- 参数属于哪个层级？
- 哪些参数是直接控制，哪些参数是调制关系？
- 哪些参数之间存在影响、依赖或冲突？
- reducer、simulator 与 generation system 应如何沿着这套关系结构工作？

这份 ontology 不是抽象摆设，而是整个系统的地下骨架。

---

## 一、核心原则
Fuli Plus 当前最需要的不是“更多参数”，而是：

> 让每个参数知道自己在控制什么对象，并让系统知道这些参数彼此是什么关系。

如果没有 ontology，会出现：
- 参数打架
- 反馈归因混乱
- generation system 无法知道参数如何进入出图逻辑
- simulator 无法判断哪些变化该直接可见，哪些变化是趋势调制

---

## 二、对象层（Object Layers）

### Layer 1 · Constraint / Product Object Layer
回答：这是什么样的地毯对象？

当前包含：
- Form
- Size / room-fit / usage context

**角色：**
- 任务条件
- 对象约束
- 不进入主反馈闭环的高频搜索

---

### Layer 2 · Pattern Language Layer
回答：这个地毯对象上的图案语言如何被组织与感知？

当前包含：
- Color
- Motif
- Arrangement

**角色：**
- 一阶视觉变化主层
- reducer 的主要更新对象
- simulator 中最应该直接可视化的层

---

### Layer 3 · Expressive Modulation Layer
回答：这些图案语言如何被组织成整体气质与表达方式？

当前包含：
- Impression
- Style

**角色：**
- 二阶调制层
- 通过影响 Pattern Language Layer 的参数组合来体现整体气质
- 不宜与一阶视觉参数等权理解为直接控制滑杆

---

### Layer 4 · Finishing / Emphasis Layer
回答：在高层方向稳定后，如何进一步精修节奏感、强调感与收尾表达？

当前候选包含：
- Rhythm
- Visual Emphasis
- Texture / Finish（未来）

**角色：**
- 后期精修层
- 不应在早期高频 feedback loop 中过早打开

---

## 三、参数角色（Parameter Roles）

### A. Direct Visual Parameters（一阶参数）
这些参数变化时，图像中应该出现相对直接、可感知的视觉后果。

#### Color
- warmth
- saturation
- lightness

#### Motif
- geometry
- organic
- complexity

#### Arrangement
- order
- spacing
- direction

**特点：**
- 更适合直接可视化
- 更适合成为早期 round 的主测对象
- reducer 更容易将反馈归因到这些参数

---

### B. Modulation Parameters（二阶参数）
这些参数更适合作为趋势调制器，而不是直接控制单一视觉局部。

#### Impression
- calm
- energy
- softness

#### Style
- graphic
- painterly
- heritage

**特点：**
- 更像“如何组织一阶变化”的上层参数
- 更适合作为规则、倾向和默认方向的调制器
- 在 simulator 中不一定直接对应一个孤立视觉效果

---

## 四、关键关系类型

### 1. `part-of`
表示组成关系。

例如：
- Color part-of Pattern Language Layer
- Impression part-of Expressive Modulation Layer
- Form part-of Constraint Layer

---

### 2. `influences`
表示一个参数会影响另一个参数的变化方向或默认倾向。

当前建议的核心 influences：

#### Impression influences Pattern Language
- calm → spacing, order, saturation
- energy → saturation, complexity, direction
- softness → lightness, complexity（以及未来边界柔化）

#### Style influences Pattern Language
- graphic → geometry, order, boundary clarity（未来）
- painterly → organic, texture softness（未来）
- heritage → warmth, saturation restraint, motif prior

---

### 3. `overlaps-with` / `conflicts-with`
表示两个参数容易争夺同一段控制权，或在用户感知上高度耦合。

当前高风险区：
- complexity ↔ spacing（都可能影响“太满 / 太乱”）
- complexity ↔ order
- graphic ↔ order（都可能影响“更干净、更清楚”）
- softness ↔ lightness
- heritage ↔ warmth
- direction ↔ rhythm（未来）

这些关系意味着：
- reducer 不能轻率把这些参数同时作为主测对象
- 需要优先级和分层归因逻辑

---

### 4. `depends-on`
表示某个参数或某层的有效更新，需要建立在另一层相对稳定的前提上。

例如：
- Finishing Layer depends-on Pattern Language Layer stabilization
- Visual Emphasis depends-on higher-level pattern clarity
- generation-ready depends-on stable state in core slots

---

## 五、ontology 对系统模块的直接意义

### 1. 对 slot schema 的意义
ontology 决定：
- 参数该放在哪一层
- 哪些是主槽位，哪些是子槽位
- 哪些参数不能并列摆放

### 2. 对 reducer 的意义
ontology 决定：
- 反馈先归到哪个层
- 哪些是主因槽位候选
- 哪些负向反馈更像 reverse，哪些更像 expand
- 哪些参数不能同时高频更新

### 3. 对 simulator 的意义
ontology 决定：
- 哪些参数要直接体现在 mock preview 中
- 哪些参数应通过一阶参数趋势来体现
- 每轮主测对象该怎么安排

### 4. 对 generation system 的意义
ontology 决定：
- 哪些参数直接进入 prompt rendering
- 哪些参数进入 reference handling / style prior
- 哪些参数进入 variant orchestration
- 哪些参数属于 generation constraint，而非描述文本本身

---

## 六、当前 operational ontology（MVP 版）

### Constraint Layer
- Form
- Size / usage context

### Pattern Language Layer
- Color: warmth / saturation / lightness
- Motif: geometry / organic / complexity
- Arrangement: order / spacing / direction

### Expressive Modulation Layer
- Impression: calm / energy / softness
- Style: graphic / painterly / heritage

### Finishing Layer（未来）
- Rhythm
- Visual Emphasis
- Texture / Finish

### 关键 operational 规则
1. 早期 reducer 优先作用于 Pattern Language Layer。
2. Expressive Modulation Layer 先作为趋势调制器使用，而不是直接视觉滑杆。
3. Finishing Layer 后期再开放。
4. Constraint Layer 默认不进入主 feedback loop。

---

## 七、一句话总结
Fuli Plus 的参数系统不应被理解为一组平铺的滑杆，而应被理解为：

> 一个由对象层、图案语言层、表达调制层与后期精修层构成的关系结构；
> reducer、simulator 与 generation system 都应沿着这套 ontology 去归因、更新、可视化与出图。
