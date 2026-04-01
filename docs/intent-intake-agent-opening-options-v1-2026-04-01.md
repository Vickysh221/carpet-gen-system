# Intent Intake Agent — Opening Options v1

Date: 2026-04-01

## 1. Purpose

这份文档是一个 **A + B 合并版**：

- **A. 产品文档版**
  - 定义 Intent Intake Agent 的主动开场策略
  - 说明为什么 agent 应该先主动问，而不是傻等用户自由输入
  - 定义三类开场问题、产品语气与使用原则

- **B. 工程配置版**
  - 给出一版可直接转成 TS/JSON registry 的 opening option 配置草案
  - 每个选项都带有参数注入向量（parameter deltas）
  - 后续 Codex 可以直接把它落成 `openingOptionRegistry.ts`

这份文档服务的目标不是最后的 UI 文案，而是：

> 让 Intent Intake Agent 能在对话刚开始时，用低负担、可选项式、有人味的方式，主动把用户偏好收进一组可更新的槽位参数中。

---

## 2. Product principle

### 2.1 Agent should not wait passively
agent 不应该只等用户先说一大段。
很多用户：
- 不知道从哪里说
- 不擅长抽象描述
- 容易给过于宽泛的词

所以 agent 应主动开场。

### 2.2 Opening should be lightweight, not interrogative
开场不是盘问，也不是表单。
应采用：
- 轻引导
- 单维度切入
- 给 4~8 个可选项
- 同时保留“都不是 / 我自己说”的出口

### 2.3 Opening should update state immediately
每个选项都必须有参数意义。
它不能只是 UI 标签，而必须映射到内部槽位参数变化。

### 2.4 One opening only needs one dominant dimension
第一轮不需要一次问完所有维度。
随机 / 策略性地从一个维度切入即可。
目标是：
- 迅速抓到一个主导方向
- 再在第二、三轮补缺失宏槽位

---

## 3. Three opening families

Intent Intake Agent 的主动开场，第一版建议固定为 3 类：

1. **氛围和意境**
2. **空间类型**
3. **图案风格偏好**

这三类分别对应不同的用户入口：

- 抽象表达型用户 → 氛围和意境
- 场景导向型用户 → 空间类型
- 视觉导向型用户 → 图案风格偏好

---

## 4. Internal target slots

这些 opening options 统一服务下列 macro slots：

- `impression`
- `color`
- `patternIntent`
- `arrangement`
- `space`
- `presence`

建议使用如下参数轴：

```ts
impression: {
  calm: 0~1,
  warmth: 0~1,
  softness: 0~1,
  energy: 0~1,
  luxury: 0~1
}

color: {
  warmth: 0~1,
  saturation: 0~1,
  contrast: 0~1,
  visibility: 0~1
}

patternIntent: {
  figurativeness: 0~1,
  abstraction: 0~1,
  organic: 0~1,
  geometry: 0~1,
  complexity: 0~1,
  motifPresence: 0~1
}

arrangement: {
  order: 0~1,
  openness: 0~1,
  density: 0~1,
  flow: 0~1
}

space: {
  domestic: 0~1,
  hospitality: 0~1,
  officeLike: 0~1,
  resting: 0~1,
  social: 0~1
}

presence: {
  blending: 0~1,
  focalness: 0~1,
  visualWeight: 0~1
}
```

---

## 5. Product-facing opening templates

## 5.1 氛围和意境开场

### Suggested prompt
> 我们可以先从感觉开始，不急着想太具体。\
> 如果先只抓一个大方向，你更希望这块地毯偏哪种气质？可以先选 1-2 个：

### Suggested options
- 宁静
- 温暖
- 自由
- 有活力
- 克制
- 自然
- 松弛
- 精致 / 奢雅
- 都不是，我自己说

---

## 5.2 空间类型开场

### Suggested prompt
> 我们也可以先从场景切入。\
> 这块地毯你更想把它放在哪种空间里？

### Suggested options
- 客厅 / 居家公共区域
- 卧室
- 书房
- 儿童房
- 办公室
- 酒店 / 大堂 / 民宿
- 还没确定
- 都不是，我自己说

---

## 5.3 图案风格偏好开场

### Suggested prompt
> 如果先从图案方向开始，你更容易被哪类感觉打动？

### Suggested options
- 柔和叶片 / 植物纹理
- 抽象山水 / 地貌流线
- 花卉点缀 / 花叶意向
- 几何拼块 / 线面构成
- 织物肌理 / 没有明显图案
- 波纹 / 云气 / 水意流动
- 还不确定
- 都不是，我自己说

---

## 6. Registry schema proposal

后续建议将 opening options 配成一个 registry，形式大致如下：

```ts
export interface OpeningOptionDefinition {
  id: string;
  family: "mood" | "space" | "pattern-style";
  label: string;
  aliases?: string[];
  description?: string;
  parameterDelta: OpeningParameterDelta;
  suggestedNextTargets?: string[];
}

export interface OpeningParameterDelta {
  impression?: Partial<Record<"calm" | "warmth" | "softness" | "energy" | "luxury", number>>;
  color?: Partial<Record<"warmth" | "saturation" | "contrast" | "visibility", number>>;
  patternIntent?: Partial<Record<"figurativeness" | "abstraction" | "organic" | "geometry" | "complexity" | "motifPresence", number>>;
  arrangement?: Partial<Record<"order" | "openness" | "density" | "flow", number>>;
  space?: Partial<Record<"domestic" | "hospitality" | "officeLike" | "resting" | "social", number>>;
  presence?: Partial<Record<"blending" | "focalness" | "visualWeight", number>>;
}
```

### Important note
`parameterDelta` 表示的是：
- 选中该选项后，给当前 agent state 注入的一组初始偏置
- 不是最终锁定值
- 也不是绝对真相

这些值之后仍会被：
- 文本 signal
- 图像选择 signal
- comparison signal
继续修正。

---

## 7. Opening option registry (v1)

以下是第一版建议 registry。数值是：
- **方向性示意值**
- 适合做初始 bias
- 不是最终训练标定值

---

## 7.1 Mood family

### 1) 宁静

```ts
{
  id: "mood-calm",
  family: "mood",
  label: "宁静",
  parameterDelta: {
    impression: { calm: 0.82, warmth: 0.48, softness: 0.66, energy: 0.22, luxury: 0.30 },
    color: { saturation: 0.28, contrast: 0.30, visibility: 0.34 },
    patternIntent: { complexity: 0.32 },
    arrangement: { openness: 0.62, density: 0.38, flow: 0.52, order: 0.50 },
    presence: { blending: 0.72, focalness: 0.24, visualWeight: 0.35 }
  },
  suggestedNextTargets: ["space", "patternIntent"]
}
```

### 2) 温暖

```ts
{
  id: "mood-warm",
  family: "mood",
  label: "温暖",
  parameterDelta: {
    impression: { calm: 0.58, warmth: 0.84, softness: 0.70, energy: 0.34, luxury: 0.36 },
    color: { warmth: 0.78, saturation: 0.44, contrast: 0.36, visibility: 0.42 },
    presence: { blending: 0.64, focalness: 0.30, visualWeight: 0.40 }
  },
  suggestedNextTargets: ["space", "color"]
}
```

### 3) 自由

```ts
{
  id: "mood-free",
  family: "mood",
  label: "自由",
  parameterDelta: {
    impression: { calm: 0.46, warmth: 0.46, softness: 0.50, energy: 0.54, luxury: 0.20 },
    arrangement: { openness: 0.78, density: 0.28, flow: 0.76, order: 0.24 },
    patternIntent: { organic: 0.70, geometry: 0.20, complexity: 0.46 },
    presence: { blending: 0.48, focalness: 0.42, visualWeight: 0.38 }
  },
  suggestedNextTargets: ["patternIntent", "presence"]
}
```

### 4) 有活力

```ts
{
  id: "mood-energetic",
  family: "mood",
  label: "有活力",
  parameterDelta: {
    impression: { calm: 0.18, warmth: 0.52, softness: 0.30, energy: 0.84, luxury: 0.28 },
    color: { saturation: 0.72, contrast: 0.68, visibility: 0.72 },
    patternIntent: { complexity: 0.58, motifPresence: 0.66 },
    presence: { blending: 0.28, focalness: 0.76, visualWeight: 0.70 }
  },
  suggestedNextTargets: ["presence", "patternIntent"]
}
```

### 5) 克制

```ts
{
  id: "mood-restrained",
  family: "mood",
  label: "克制",
  parameterDelta: {
    impression: { calm: 0.74, warmth: 0.42, softness: 0.48, energy: 0.20, luxury: 0.34 },
    color: { saturation: 0.20, contrast: 0.26, visibility: 0.22 },
    patternIntent: { complexity: 0.28, motifPresence: 0.24 },
    presence: { blending: 0.80, focalness: 0.18, visualWeight: 0.26 }
  },
  suggestedNextTargets: ["presence", "color"]
}
```

### 6) 自然

```ts
{
  id: "mood-natural",
  family: "mood",
  label: "自然",
  parameterDelta: {
    impression: { calm: 0.66, warmth: 0.56, softness: 0.60, energy: 0.34, luxury: 0.18 },
    patternIntent: { organic: 0.82, geometry: 0.18, abstraction: 0.56, complexity: 0.44 },
    color: { warmth: 0.58, saturation: 0.34, visibility: 0.40 },
    arrangement: { flow: 0.68, openness: 0.58 }
  },
  suggestedNextTargets: ["patternIntent", "space"]
}
```

### 7) 松弛

```ts
{
  id: "mood-relaxed",
  family: "mood",
  label: "松弛",
  parameterDelta: {
    impression: { calm: 0.78, warmth: 0.54, softness: 0.74, energy: 0.20, luxury: 0.18 },
    arrangement: { openness: 0.70, density: 0.26, flow: 0.58, order: 0.36 },
    presence: { blending: 0.72, focalness: 0.22, visualWeight: 0.30 }
  },
  suggestedNextTargets: ["space", "presence"]
}
```

### 8) 精致 / 奢雅

```ts
{
  id: "mood-luxury",
  family: "mood",
  label: "精致 / 奢雅",
  parameterDelta: {
    impression: { calm: 0.36, warmth: 0.58, softness: 0.52, energy: 0.48, luxury: 0.88 },
    color: { contrast: 0.62, saturation: 0.54, visibility: 0.66 },
    arrangement: { order: 0.72, density: 0.64 },
    presence: { blending: 0.24, focalness: 0.80, visualWeight: 0.78 }
  },
  suggestedNextTargets: ["space", "presence"]
}
```

---

## 7.2 Space family

### 1) 客厅 / 居家公共区域

```ts
{
  id: "space-living-room",
  family: "space",
  label: "客厅 / 居家公共区域",
  parameterDelta: {
    space: { domestic: 0.88, hospitality: 0.22, officeLike: 0.08, resting: 0.46, social: 0.72 },
    presence: { blending: 0.50, focalness: 0.52, visualWeight: 0.50 }
  },
  suggestedNextTargets: ["presence", "impression"]
}
```

### 2) 卧室

```ts
{
  id: "space-bedroom",
  family: "space",
  label: "卧室",
  parameterDelta: {
    space: { domestic: 0.90, hospitality: 0.10, officeLike: 0.06, resting: 0.88, social: 0.16 },
    impression: { calm: 0.82, softness: 0.74, warmth: 0.60 },
    patternIntent: { complexity: 0.24 },
    presence: { blending: 0.74, focalness: 0.20, visualWeight: 0.28 }
  },
  suggestedNextTargets: ["impression", "patternIntent"]
}
```

### 3) 书房

```ts
{
  id: "space-study",
  family: "space",
  label: "书房",
  parameterDelta: {
    space: { domestic: 0.72, hospitality: 0.12, officeLike: 0.42, resting: 0.52, social: 0.18 },
    impression: { calm: 0.74 },
    arrangement: { order: 0.66 },
    patternIntent: { complexity: 0.24, geometry: 0.42, organic: 0.40 }
  },
  suggestedNextTargets: ["patternIntent", "presence"]
}
```

### 4) 儿童房

```ts
{
  id: "space-kids-room",
  family: "space",
  label: "儿童房",
  parameterDelta: {
    space: { domestic: 0.88, hospitality: 0.10, officeLike: 0.04, resting: 0.64, social: 0.44 },
    color: { saturation: 0.62, visibility: 0.68 },
    patternIntent: { figurativeness: 0.56, complexity: 0.52, motifPresence: 0.70 },
    presence: { focalness: 0.58 }
  },
  suggestedNextTargets: ["patternIntent", "color"]
}
```

### 5) 办公室

```ts
{
  id: "space-office",
  family: "space",
  label: "办公室",
  parameterDelta: {
    space: { domestic: 0.10, hospitality: 0.18, officeLike: 0.92, resting: 0.18, social: 0.36 },
    arrangement: { order: 0.72, openness: 0.42, density: 0.48 },
    patternIntent: { complexity: 0.26, geometry: 0.56 },
    presence: { blending: 0.72, focalness: 0.20, visualWeight: 0.32 }
  },
  suggestedNextTargets: ["impression", "patternIntent"]
}
```

### 6) 酒店 / 大堂 / 民宿

```ts
{
  id: "space-hospitality",
  family: "space",
  label: "酒店 / 大堂 / 民宿",
  parameterDelta: {
    space: { domestic: 0.22, hospitality: 0.92, officeLike: 0.16, resting: 0.42, social: 0.80 },
    impression: { luxury: 0.72, calm: 0.42, energy: 0.48 },
    arrangement: { order: 0.68, density: 0.62 },
    presence: { blending: 0.30, focalness: 0.76, visualWeight: 0.74 }
  },
  suggestedNextTargets: ["presence", "patternIntent"]
}
```

### 7) 还没确定

```ts
{
  id: "space-undecided",
  family: "space",
  label: "还没确定",
  parameterDelta: {
    space: { domestic: 0.40, hospitality: 0.30, officeLike: 0.20, resting: 0.30, social: 0.30 }
  },
  suggestedNextTargets: ["impression", "patternIntent"]
}
```

---

## 7.3 Pattern-style family

### 1) 柔和叶片 / 植物纹理

```ts
{
  id: "pattern-botanical-soft",
  family: "pattern-style",
  label: "柔和叶片 / 植物纹理",
  parameterDelta: {
    patternIntent: {
      figurativeness: 0.42,
      abstraction: 0.62,
      organic: 0.84,
      geometry: 0.12,
      complexity: 0.34,
      motifPresence: 0.52
    },
    arrangement: { flow: 0.68, openness: 0.54 },
    impression: { softness: 0.66, calm: 0.60 }
  },
  suggestedNextTargets: ["impression", "presence"]
}
```

### 2) 抽象山水 / 地貌流线

```ts
{
  id: "pattern-landscape-abstract",
  family: "pattern-style",
  label: "抽象山水 / 地貌流线",
  parameterDelta: {
    patternIntent: {
      figurativeness: 0.20,
      abstraction: 0.82,
      organic: 0.70,
      geometry: 0.18,
      complexity: 0.46,
      motifPresence: 0.44
    },
    arrangement: { flow: 0.78, openness: 0.56, density: 0.44 },
    impression: { calm: 0.64, luxury: 0.24 }
  },
  suggestedNextTargets: ["impression", "space"]
}
```

### 3) 花卉点缀 / 花叶意向

```ts
{
  id: "pattern-floral-accent",
  family: "pattern-style",
  label: "花卉点缀 / 花叶意向",
  parameterDelta: {
    patternIntent: {
      figurativeness: 0.54,
      abstraction: 0.46,
      organic: 0.78,
      geometry: 0.10,
      complexity: 0.50,
      motifPresence: 0.70
    },
    presence: { focalness: 0.52 }
  },
  suggestedNextTargets: ["patternIntent", "presence"]
}
```

### 4) 几何拼块 / 线面构成

```ts
{
  id: "pattern-geometric-structured",
  family: "pattern-style",
  label: "几何拼块 / 线面构成",
  parameterDelta: {
    patternIntent: {
      figurativeness: 0.08,
      abstraction: 0.84,
      organic: 0.12,
      geometry: 0.88,
      complexity: 0.42,
      motifPresence: 0.58
    },
    arrangement: { order: 0.78, openness: 0.42 },
    impression: { softness: 0.18, luxury: 0.26 }
  },
  suggestedNextTargets: ["presence", "space"]
}
```

### 5) 织物肌理 / 没有明显图案

```ts
{
  id: "pattern-texture-only",
  family: "pattern-style",
  label: "织物肌理 / 没有明显图案",
  parameterDelta: {
    patternIntent: {
      figurativeness: 0.04,
      abstraction: 0.72,
      organic: 0.50,
      geometry: 0.30,
      complexity: 0.20,
      motifPresence: 0.16
    },
    presence: { blending: 0.80, focalness: 0.14, visualWeight: 0.24 }
  },
  suggestedNextTargets: ["presence", "impression"]
}
```

### 6) 波纹 / 云气 / 水意流动

```ts
{
  id: "pattern-fluid-wave-cloud",
  family: "pattern-style",
  label: "波纹 / 云气 / 水意流动",
  parameterDelta: {
    patternIntent: {
      figurativeness: 0.16,
      abstraction: 0.78,
      organic: 0.74,
      geometry: 0.14,
      complexity: 0.38,
      motifPresence: 0.46
    },
    arrangement: { flow: 0.88, openness: 0.60 },
    impression: { calm: 0.58, softness: 0.60 }
  },
  suggestedNextTargets: ["impression", "space"]
}
```

### 7) 还不确定

```ts
{
  id: "pattern-undecided",
  family: "pattern-style",
  label: "还不确定",
  parameterDelta: {
    patternIntent: {
      figurativeness: 0.30,
      abstraction: 0.40,
      organic: 0.40,
      geometry: 0.30,
      complexity: 0.30,
      motifPresence: 0.30
    }
  },
  suggestedNextTargets: ["impression", "space"]
}
```

---

## 8. Presence follow-up mini-option set

虽然第一轮三大开场先固定为：
- mood
- space
- pattern-style

但 `presence` 非常重要，建议尽快作为第二轮或补充题出现。

### Suggested prompt
> 最后再确认一小步：你更希望这块地毯是融进整体，还是稍微跳出来一点？

### Option registry

#### 与整体融合
```ts
{
  id: "presence-blended",
  family: "mood",
  label: "与整体融合",
  parameterDelta: {
    presence: { blending: 0.86, focalness: 0.10, visualWeight: 0.20 },
    color: { visibility: 0.24, contrast: 0.20, saturation: 0.26 },
    patternIntent: { motifPresence: 0.20 }
  },
  suggestedNextTargets: ["color", "patternIntent"]
}
```

#### 稍微跳出来
```ts
{
  id: "presence-soft-focal",
  family: "mood",
  label: "稍微跳出来",
  parameterDelta: {
    presence: { blending: 0.26, focalness: 0.74, visualWeight: 0.70 },
    color: { visibility: 0.68, contrast: 0.62, saturation: 0.56 },
    patternIntent: { motifPresence: 0.62 }
  },
  suggestedNextTargets: ["color", "patternIntent"]
}
```

#### 能被注意到，但不要太抢
```ts
{
  id: "presence-balanced",
  family: "mood",
  label: "能被注意到，但不要太抢",
  parameterDelta: {
    presence: { blending: 0.48, focalness: 0.52, visualWeight: 0.48 },
    color: { visibility: 0.46, contrast: 0.42, saturation: 0.38 },
    patternIntent: { motifPresence: 0.44 }
  },
  suggestedNextTargets: ["color", "patternIntent"]
}
```

---

## 9. Interaction rules

### 9.1 User should be allowed to choose multiple options
例如：
- 宁静 + 自然
- 卧室 + 与整体融合
- 抽象山水 + 稍微跳出来

此时参数可做：
- 平均
- 加权平均
- 或按第一个主选项高权重、第二个低权重

### 9.2 User should always have a free-text escape hatch
必须允许：
- “都不是，我自己说”

因为对高级审美用户而言，选项永远不够。

### 9.3 Options are priors, not verdicts
这些开场选项提供的是：
- 初始 bias
- 主导方向

不是锁定。
之后仍应继续被：
- 文本 signal
- 图片 preference signal
- comparison signal
修正。

---

## 10. Immediate engineering use

这份文档可以直接支持两个动作：

### A. 产品侧
- 用于设计 opening UI
- 用于设计第一轮主动开场逻辑
- 用于定义不同 family 的话术

### B. 工程侧
- 直接把 `7.x` 的选项整理成 `openingOptionRegistry.ts`
- 每次用户点击选项时，向 agent state 注入 `parameterDelta`
- 再由 agent 根据更新后的 slot 状态决定下一问

---

## 11. One-sentence summary

Opening Options v1 的核心不是“给用户几个好看的按钮”，而是：

> 让 Intent Intake Agent 能在开场阶段通过低负担选项，主动把用户偏好映射成一组可更新的槽位参数，从而更快拿到 base direction，并为后续文本追问、图片生成和图文双决策链打下状态基础。
