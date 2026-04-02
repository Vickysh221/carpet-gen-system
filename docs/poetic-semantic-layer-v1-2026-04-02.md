# Poetic Semantic Layer v1

Date: 2026-04-02

## 1. Purpose

这份文档定义 `Poetic Semantic Layer` 的第一版。

它不是：
- 古诗词识别器
- 文学赏析器
- 风格标签生成器

它是：

> 一个把**任意诗性语言 / 感官隐喻表达**压缩成**可生成、可追问、可迭代更新**中间语义状态的层。

这层的职责是：
- 吸收用户的诗性表达
- 识别其中的意象原子、感官来源与关系结构
- 映射到 latent semantic dimensions
- 再投影到产品槽位：
  - `color`
  - `impression`
  - `patternIntent`
  - `presence`
- 同时输出：
  - `antiBias`
  - `followupHints`
  - `compatibleWith`
  - `conflictWith`

---

## 2. Core principle

### 2.1 不按字面映射，要按感知结果映射

例如：
- “天青色等烟雨” 不该只落到 `blue`
- 它更像：
  - `color`: muted cool blue-gray
  - `impression`: calm / misty / restrained / waiting
  - `patternIntent`: flowing / blurred / low-contrast
  - `presence`: blended / low focalness

所以系统不该只问：
- 是不是蓝色？

而应该问：
- 是更偏雾感还是更偏清透？
- 是更想融进去，还是想留一点存在感？

### 2.2 映射单位优先是“诗性原子”，不是整句

用户更多会说：
- 有点烟雨感
- 像月白风清那种
- 不要太花，像竹影
- 有点灯火夜色的感觉

所以第一版优先建设：
- 意象原子库
- 组合规则
- 槽位投影规则

不是只认完整诗句。

### 2.3 每个词条都要分三层

每个意象原子至少要包含：

1. **主推槽位**：最稳定、最该写入的
2. **次推槽位**：常见但不绝对
3. **风险偏置**：最容易被系统误判的方向

---

## 3. Internal target slots and latent dimensions

## 3.1 Product slots

Poetic Semantic Layer 最终投影到：
- `color`
- `impression`
- `patternIntent`
- `presence`

## 3.2 Recommended latent semantic dimensions (v1 core)

为了不把诗性表达过早压扁，先过一层 latent dimensions。

### Color
- `temperature`
- `saturation`
- `haze`
- `luminosity`

### Impression
- `calmness`
- `softness`
- `restraint`
- `distance`

### PatternIntent
- `flow`
- `abstraction`
- `density`
- `geometry`

### Presence
- `blending`
- `focalness`

---

## 4. Suggested TS shape

```ts
export type PoeticMapping = {
  key: string;
  aliases: string[];
  weight: number;
  perceptualEffects?: {
    color?: string[];
    impression?: string[];
    patternIntent?: string[];
    presence?: string[];
  };
  slotDelta: {
    color?: {
      temperature?: number;
      saturation?: number;
      haze?: number;
      luminosity?: number;
      muted?: number;
      contrastSoftness?: number;
    };
    impression?: Record<string, number>;
    patternIntent?: Record<string, number>;
    presence?: {
      blending?: number;
      focalness?: number;
      visualWeight?: number;
    };
  };
  antiBias?: string[];
  followupHints?: string[];
  compatibleWith?: string[];
  conflictWith?: string[];
};
```

---

## 5. Registry — full initial vocabulary

下面不是“精选 12 个”，而是把你前面列举的词条尽量**全量纳入第一版**。后续可以再按频率裁剪。

---

## A. 冷静 / 雾感 / 东方含蓄系

### 天青
```ts
{
  key: "天青",
  aliases: ["天青色", "青瓷色", "青灰天色"],
  weight: 0.84,
  perceptualEffects: {
    color: ["cool-blue-gray", "low saturation", "softly airy"],
    impression: ["calm", "restrained", "clear-soft"],
    patternIntent: ["smooth", "low-contrast", "lightly organic"],
    presence: ["blended", "low focalness"]
  },
  slotDelta: {
    color: { temperature: -0.22, saturation: -0.30, haze: 0.34, luminosity: 0.22, muted: 0.72, contrastSoftness: 0.58 },
    impression: { calm: 0.74, restrained: 0.66, softness: 0.42, distance: 0.36 },
    patternIntent: { abstraction: 0.48, flow: 0.28, geometry: 0.18, density: -0.16 },
    presence: { blending: 0.72, focalness: 0.18, visualWeight: 0.26 }
  },
  antiBias: ["不要直接等同为蓝色", "不要做成高饱和青蓝", "不要误成科技感冷蓝"],
  followupHints: ["你更在意这种颜色的雾感，还是更清透一点的净感？", "这种天青更希望是整体气息，还是希望被隐约看见？"],
  compatibleWith: ["烟雨", "月白", "山岚", "清辉"],
  conflictWith: ["繁花", "金尊"]
}
```

### 烟雨
```ts
{
  key: "烟雨",
  aliases: ["烟雨感", "如烟细雨", "雾雨", "空濛细雨"],
  weight: 0.86,
  perceptualEffects: {
    color: ["gray-blue mist", "softened contrast"],
    impression: ["misty", "quiet", "poetic", "waiting"],
    patternIntent: ["flowing", "blurred", "diffuse edges"],
    presence: ["blended", "low visual weight"]
  },
  slotDelta: {
    color: { temperature: -0.12, saturation: -0.28, haze: 0.82, luminosity: 0.12, muted: 0.72, contrastSoftness: 0.74 },
    impression: { calm: 0.72, misty: 0.86, restrained: 0.58, poetic: 0.62 },
    patternIntent: { flow: 0.66, blurred: 0.78, abstraction: 0.74, density: -0.18, geometry: -0.22 },
    presence: { blending: 0.80, focalness: 0.18, visualWeight: 0.24 }
  },
  antiBias: ["不要直接理解成灰暗、脏旧", "不要自动压成极简冷淡风", "不要做成具象下雨图案"],
  followupHints: ["你更想要雾感，还是更想要水汽流动感？", "这种感觉是希望它安静融进去，还是留一点微弱亮点？"],
  compatibleWith: ["天青", "月白", "山岚", "清辉"],
  conflictWith: ["繁花", "金尊"]
}
```

### 月白
```ts
{
  key: "月白",
  aliases: ["月白风清", "月白色", "月光白"],
  weight: 0.82,
  perceptualEffects: {
    color: ["off-white", "cold white", "pale blue-white"],
    impression: ["clean", "still", "delicate"],
    patternIntent: ["sparse", "minimal", "fine rhythm"],
    presence: ["low presence", "refined"]
  },
  slotDelta: {
    color: { temperature: -0.18, saturation: -0.38, haze: 0.24, luminosity: 0.54, muted: 0.70, contrastSoftness: 0.48 },
    impression: { calm: 0.74, restrained: 0.68, softness: 0.34, distance: 0.42, delicate: 0.64 },
    patternIntent: { abstraction: 0.62, density: -0.38, flow: 0.22, geometry: 0.12 },
    presence: { blending: 0.74, focalness: 0.12, visualWeight: 0.18 }
  },
  antiBias: ["不要误成空白无内容", "不要做成医院白", "不要只理解成冷"],
  followupHints: ["你想要的是这种净、薄、轻，还是带一点月光微亮的感觉？"],
  compatibleWith: ["清辉", "竹影", "霜", "雪"],
  conflictWith: ["繁花", "锦"]
}
```

### 霜
```ts
{
  key: "霜",
  aliases: ["霜色", "清霜", "霜意"],
  weight: 0.76,
  perceptualEffects: {
    color: ["silver-white", "desaturated cool tone"],
    impression: ["crisp", "distant", "quiet", "cool"],
    patternIntent: ["fine-grained", "sharp-light", "restrained"],
    presence: ["thin but perceptible"]
  },
  slotDelta: {
    color: { temperature: -0.28, saturation: -0.34, haze: 0.12, luminosity: 0.36, muted: 0.62, contrastSoftness: 0.24 },
    impression: { calm: 0.58, restraint: 0.70, distance: 0.72, crisp: 0.62 },
    patternIntent: { density: -0.28, geometry: 0.26, abstraction: 0.56, flow: 0.12 },
    presence: { blending: 0.56, focalness: 0.22, visualWeight: 0.24 }
  },
  antiBias: ["不要做得太硬太冷", "不要自动等同于北欧冷淡", "不要缺少柔化层"],
  followupHints: ["你更想要这种清冷感，还是只是要一点霜白的干净边界？"],
  compatibleWith: ["月白", "雪", "清辉"],
  conflictWith: ["灯火", "桃夭"]
}
```

### 雪
```ts
{
  key: "雪",
  aliases: ["雪意", "雪色", "初雪"],
  weight: 0.8,
  perceptualEffects: {
    color: ["white", "muted cool neutral"],
    impression: ["pure", "silent", "open", "gentle"],
    patternIntent: ["sparse", "large blank", "low density"],
    presence: ["low visual weight but not invisible"]
  },
  slotDelta: {
    color: { temperature: -0.18, saturation: -0.42, haze: 0.30, luminosity: 0.62, muted: 0.76, contrastSoftness: 0.40 },
    impression: { calm: 0.78, softness: 0.52, restraint: 0.64, distance: 0.34, purity: 0.68 },
    patternIntent: { density: -0.44, abstraction: 0.62, flow: 0.20, geometry: 0.14 },
    presence: { blending: 0.70, focalness: 0.10, visualWeight: 0.16 }
  },
  antiBias: ["关键是留白，不是空", "不要只做成纯白无层次"],
  followupHints: ["你更想要的是雪的安静留白，还是一点被光照亮的冷白感？"],
  compatibleWith: ["月白", "霜", "清辉"],
  conflictWith: ["繁花", "华灯"]
}
```

### 山岚
```ts
{
  key: "山岚",
  aliases: ["岚气", "山雾", "山间雾气"],
  weight: 0.82,
  perceptualEffects: {
    color: ["gray-green", "gray-blue", "soft haze"],
    impression: ["remote", "layered", "tranquil"],
    patternIntent: ["layered", "blurred depth", "organic"],
    presence: ["blended", "medium-low focalness"]
  },
  slotDelta: {
    color: { temperature: -0.10, saturation: -0.22, haze: 0.74, luminosity: 0.18, muted: 0.62, contrastSoftness: 0.70 },
    impression: { calm: 0.76, distance: 0.68, poetic: 0.54, softness: 0.46 },
    patternIntent: { flow: 0.54, abstraction: 0.72, density: 0.34, geometry: -0.14 },
    presence: { blending: 0.76, focalness: 0.20, visualWeight: 0.28 }
  },
  antiBias: ["不要误做成风景画", "不要把层次做得太实"],
  followupHints: ["你更想要的是层次感，还是那种被雾气柔掉边界的感觉？"],
  compatibleWith: ["烟雨", "天青", "水墨"],
  conflictWith: ["金尊"]
}
```

### 水墨
```ts
{
  key: "水墨",
  aliases: ["墨色", "泼墨", "淡墨"],
  weight: 0.84,
  perceptualEffects: {
    color: ["black-gray", "ink wash", "soft transitions"],
    impression: ["restrained", "contemplative", "timeless"],
    patternIntent: ["flowing", "bleeding", "gradient-like"],
    presence: ["blended"]
  },
  slotDelta: {
    color: { temperature: -0.06, saturation: -0.48, haze: 0.60, luminosity: -0.16, muted: 0.84, contrastSoftness: 0.78 },
    impression: { calm: 0.78, restraint: 0.82, poetic: 0.72, distance: 0.42 },
    patternIntent: { flow: 0.70, abstraction: 0.80, density: 0.30, geometry: -0.20 },
    presence: { blending: 0.74, focalness: 0.18, visualWeight: 0.34 }
  },
  antiBias: ["不要直接堆中式元素", "不要做成书法贴图", "不要只有黑白没有层次"],
  followupHints: ["你更想要墨的流动晕开，还是更干净克制的淡墨层次？"],
  compatibleWith: ["山岚", "烟雨", "竹影"],
  conflictWith: ["繁花", "琉璃"]
}
```

### 清辉
```ts
{
  key: "清辉",
  aliases: ["清冷微光", "月下清辉", "微微发亮"],
  weight: 0.74,
  perceptualEffects: {
    color: ["pale silver", "cool luminosity"],
    impression: ["serene", "elegant", "night-quiet"],
    patternIntent: ["minimal", "light radiance"],
    presence: ["subtle presence"]
  },
  slotDelta: {
    color: { temperature: -0.16, saturation: -0.30, haze: 0.26, luminosity: 0.58, muted: 0.60, contrastSoftness: 0.42 },
    impression: { calm: 0.72, restraint: 0.64, distance: 0.36, elegant: 0.60 },
    patternIntent: { abstraction: 0.64, flow: 0.18, density: -0.30, geometry: 0.10 },
    presence: { blending: 0.64, focalness: 0.24, visualWeight: 0.26 }
  },
  antiBias: ["不要理解成闪亮高光", "不是珠宝感亮"],
  followupHints: ["你更喜欢这种微光被感到，还是被明确看见？"],
  compatibleWith: ["月白", "霜", "天青"],
  conflictWith: ["锦"]
}
```

---

## B. 温润 / 暖意 / 柔和居住系

### 春风
```ts
{
  key: "春风",
  aliases: ["春风感", "春天气息", "风里有春意"],
  weight: 0.78,
  perceptualEffects: {
    color: ["warm light green", "soft yellow", "airy neutrals"],
    impression: ["gentle", "fresh", "relaxed"],
    patternIntent: ["light organic", "open rhythm"],
    presence: ["medium-low presence"]
  },
  slotDelta: {
    color: { temperature: 0.12, saturation: -0.08, haze: 0.34, luminosity: 0.26, muted: 0.36, contrastSoftness: 0.52 },
    impression: { calm: 0.58, warmth: 0.62, softness: 0.54, fresh: 0.70 },
    patternIntent: { flow: 0.58, abstraction: 0.48, density: -0.18, geometry: -0.12 },
    presence: { blending: 0.62, focalness: 0.26, visualWeight: 0.30 }
  },
  antiBias: ["不要误成浅绿田园风", "不要太甜太轻浮"],
  followupHints: ["你要的是春风的轻和松，还是一点更明确的春天气息？"],
  compatibleWith: ["天青", "杏花", "烟雨"],
  conflictWith: ["金尊"]
}
```

### 杏花
```ts
{
  key: "杏花",
  aliases: ["杏花感", "杏花微雨"],
  weight: 0.7,
  perceptualEffects: {
    color: ["pale pink", "creamy white", "light warm tone"],
    impression: ["tender", "soft", "youthful"],
    patternIntent: ["small organic motifs", "scattered light rhythm"],
    presence: ["slightly focal"]
  },
  slotDelta: {
    color: { temperature: 0.22, saturation: 0.10, haze: 0.20, luminosity: 0.34, muted: 0.30, contrastSoftness: 0.46 },
    impression: { warmth: 0.56, softness: 0.70, tender: 0.68, calm: 0.46 },
    patternIntent: { figurativeness: 0.34, abstraction: 0.42, density: -0.06, flow: 0.26 },
    presence: { blending: 0.48, focalness: 0.40, visualWeight: 0.30 }
  },
  antiBias: ["容易变甜腻", "不要直接婚庆粉", "不要全都做成具象花朵"],
  followupHints: ["你更在意杏花那种轻柔暖意，还是一点点花影的存在感？"],
  compatibleWith: ["春风", "晨曦"],
  conflictWith: ["霜"]
}
```

### 桃夭 / 桃花
```ts
{
  key: "桃花",
  aliases: ["桃夭", "桃花感", "桃色"],
  weight: 0.72,
  perceptualEffects: {
    color: ["blush pink", "warm coral-pink"],
    impression: ["lively", "warm", "romantic"],
    patternIntent: ["petal-like", "organic", "slightly decorative"],
    presence: ["medium presence"]
  },
  slotDelta: {
    color: { temperature: 0.30, saturation: 0.18, haze: 0.16, luminosity: 0.32, muted: 0.18, contrastSoftness: 0.42 },
    impression: { warmth: 0.70, softness: 0.62, lively: 0.52, romantic: 0.60 },
    patternIntent: { figurativeness: 0.42, abstraction: 0.34, density: 0.12, flow: 0.28 },
    presence: { blending: 0.40, focalness: 0.46, visualWeight: 0.36 }
  },
  antiBias: ["风险是过甜、过婚庆", "不要自动高饱和"],
  followupHints: ["你更喜欢桃花的暖和生气，还是一点被看见的花意？"],
  compatibleWith: ["春风", "灯火"],
  conflictWith: ["霜", "寒江"]
}
```

### 晨曦
```ts
{
  key: "晨曦",
  aliases: ["晨光", "清晨的光", "日初微光"],
  weight: 0.78,
  perceptualEffects: {
    color: ["warm pale gold", "dusty peach", "soft light"],
    impression: ["hopeful", "soft", "opening"],
    patternIntent: ["gradual expansion", "light radiance"],
    presence: ["gentle focalness"]
  },
  slotDelta: {
    color: { temperature: 0.24, saturation: 0.08, haze: 0.18, luminosity: 0.58, muted: 0.22, contrastSoftness: 0.40 },
    impression: { warmth: 0.68, softness: 0.58, calm: 0.46, opening: 0.74 },
    patternIntent: { flow: 0.32, abstraction: 0.40, density: -0.14, geometry: 0.08 },
    presence: { blending: 0.46, focalness: 0.42, visualWeight: 0.34 }
  },
  antiBias: ["不要做成日出风景图", "不要太金灿灿"],
  followupHints: ["你更喜欢晨曦的暖光，还是那种一天刚刚开始的轻松感？"],
  compatibleWith: ["春风", "杏花"],
  conflictWith: ["水墨"]
}
```

### 灯火
```ts
{
  key: "灯火",
  aliases: ["灯火感", "夜里灯火", "一点灯光"],
  weight: 0.82,
  perceptualEffects: {
    color: ["amber", "warm gold", "brown-red undertone"],
    impression: ["intimate", "warm", "lived-in"],
    patternIntent: ["clustered accents", "glowing pockets"],
    presence: ["medium-high focalness"]
  },
  slotDelta: {
    color: { temperature: 0.42, saturation: 0.18, haze: 0.10, luminosity: 0.46, muted: 0.10, contrastSoftness: 0.28 },
    impression: { warmth: 0.82, intimacy: 0.78, calm: 0.36, restraint: 0.34 },
    patternIntent: { density: 0.18, abstraction: 0.46, flow: 0.20, geometry: 0.10 },
    presence: { blending: 0.32, focalness: 0.64, visualWeight: 0.56 }
  },
  antiBias: ["不一定等于高饱和金黄", "不要自动酒店大堂化"],
  followupHints: ["你更想要的是夜里的温度感，还是一点点被看见的亮感？"],
  compatibleWith: ["暮色", "夜色", "桃花"],
  conflictWith: ["霜", "雪"]
}
```

### 炉火
```ts
{
  key: "炉火",
  aliases: ["火光", "炭火", "炉边"],
  weight: 0.74,
  perceptualEffects: {
    color: ["burnt orange", "ember red", "dark warm base"],
    impression: ["grounded", "warm", "enveloping"],
    patternIntent: ["dense center", "gathered rhythm"],
    presence: ["medium-high visual weight"]
  },
  slotDelta: {
    color: { temperature: 0.50, saturation: 0.20, haze: 0.08, luminosity: 0.28, muted: 0.04, contrastSoftness: 0.26 },
    impression: { warmth: 0.88, grounded: 0.72, calm: 0.28, heaviness: 0.46 },
    patternIntent: { density: 0.26, abstraction: 0.32, flow: 0.18 },
    presence: { blending: 0.28, focalness: 0.66, visualWeight: 0.68 }
  },
  antiBias: ["容易太重", "不适合全局都高温高饱和"],
  followupHints: ["你要的是包裹感，还是一点局部被点亮的火光感？"],
  compatibleWith: ["灯火", "暮色"],
  conflictWith: ["月白"]
}
```

### 暮色
```ts
{
  key: "暮色",
  aliases: ["傍晚色", "暮霭", "黄昏刚落下"],
  weight: 0.82,
  perceptualEffects: {
    color: ["muted plum", "dusty brown", "warm gray-violet"],
    impression: ["reflective", "quiet", "softened", "evening-like"],
    patternIntent: ["soft transitions", "low-edge definition"],
    presence: ["medium-low presence"]
  },
  slotDelta: {
    color: { temperature: 0.08, saturation: -0.12, haze: 0.42, luminosity: -0.10, muted: 0.58, contrastSoftness: 0.68 },
    impression: { calm: 0.64, warmth: 0.38, restraint: 0.56, reflective: 0.66, distance: 0.34 },
    patternIntent: { abstraction: 0.62, flow: 0.34, density: 0.12, geometry: 0.06 },
    presence: { blending: 0.60, focalness: 0.28, visualWeight: 0.38 }
  },
  antiBias: ["不要一味做暗", "不是脏紫灰"],
  followupHints: ["你更喜欢暮色的沉静，还是一点点暖下来的空气感？"],
  compatibleWith: ["灯火", "流霞", "夜色"],
  conflictWith: ["雪"]
}
```

---

## C. 清朗 / 风骨 / 偏理性系

### 竹影
```ts
{
  key: "竹影",
  aliases: ["竹影感", "竹间疏影", "风里竹影"],
  weight: 0.82,
  perceptualEffects: {
    color: ["green-gray", "ink-green", "muted contrast"],
    impression: ["calm", "upright", "airy", "disciplined"],
    patternIntent: ["linear", "rhythmic", "vertical", "sparse"],
    presence: ["blended but articulate"]
  },
  slotDelta: {
    color: { temperature: -0.06, saturation: -0.12, haze: 0.20, luminosity: 0.10, muted: 0.34, contrastSoftness: 0.30 },
    impression: { calm: 0.68, airy: 0.44, disciplined: 0.58, elegant: 0.46 },
    patternIntent: { flow: 0.42, abstraction: 0.62, density: -0.22, geometry: 0.28, linear: 0.74, rhythm: 0.66 },
    presence: { blending: 0.64, focalness: 0.26, visualWeight: 0.30 }
  },
  antiBias: ["不要直接做成中式符号贴图", "不要强行具象化成竹叶图案"],
  followupHints: ["你喜欢更疏、更轻，还是更有节奏感一点？"],
  compatibleWith: ["月白", "松风", "清辉"],
  conflictWith: ["繁花"]
}
```

### 松风
```ts
{
  key: "松风",
  aliases: ["松风感", "松间风", "松林气息"],
  weight: 0.76,
  perceptualEffects: {
    color: ["deep green", "cool dark neutral"],
    impression: ["steady", "spacious", "resilient"],
    patternIntent: ["elongated", "directional", "layered rhythm"],
    presence: ["medium-low presence"]
  },
  slotDelta: {
    color: { temperature: -0.08, saturation: -0.06, haze: 0.18, luminosity: -0.08, muted: 0.22, contrastSoftness: 0.24 },
    impression: { calm: 0.58, restraint: 0.52, strength: 0.62, distance: 0.30 },
    patternIntent: { flow: 0.38, abstraction: 0.52, density: 0.10, geometry: 0.18, rhythm: 0.60 },
    presence: { blending: 0.56, focalness: 0.30, visualWeight: 0.36 }
  },
  antiBias: ["不要做成厚重中式园林感", "不要太装饰性"],
  followupHints: ["你更在意松风的稳，还是风穿过的方向感？"],
  compatibleWith: ["竹影", "山岚"],
  conflictWith: ["桃花"]
}
```

### 寒江
```ts
{
  key: "寒江",
  aliases: ["寒江感", "冷江水", "江寒"],
  weight: 0.72,
  perceptualEffects: {
    color: ["cool gray-blue", "steel-blue"],
    impression: ["distant", "clean", "solitary"],
    patternIntent: ["horizontal flow", "open composition"],
    presence: ["low presence"]
  },
  slotDelta: {
    color: { temperature: -0.30, saturation: -0.20, haze: 0.30, luminosity: -0.06, muted: 0.48, contrastSoftness: 0.36 },
    impression: { calm: 0.62, distance: 0.76, restraint: 0.64, crisp: 0.34 },
    patternIntent: { flow: 0.50, abstraction: 0.64, density: -0.24, geometry: 0.10 },
    presence: { blending: 0.72, focalness: 0.14, visualWeight: 0.20 }
  },
  antiBias: ["容易过冷，需要 softness 补偿", "不要做成工业蓝灰"],
  followupHints: ["你更想要寒江的冷静距离感，还是只是更清一点、更开一点？"],
  compatibleWith: ["月白", "霜"],
  conflictWith: ["灯火", "炉火"]
}
```

### 云帆
```ts
{
  key: "云帆",
  aliases: ["远帆", "帆影", "云中白帆"],
  weight: 0.66,
  perceptualEffects: {
    color: ["off-white", "light gray-blue"],
    impression: ["free", "open", "expansive"],
    patternIntent: ["large-scale", "directional", "low-density"],
    presence: ["medium-low presence"]
  },
  slotDelta: {
    color: { temperature: -0.10, saturation: -0.28, haze: 0.22, luminosity: 0.32, muted: 0.46, contrastSoftness: 0.30 },
    impression: { calm: 0.46, distance: 0.42, freedom: 0.68, openness: 0.66 },
    patternIntent: { flow: 0.54, abstraction: 0.58, density: -0.32, geometry: 0.18 },
    presence: { blending: 0.54, focalness: 0.24, visualWeight: 0.22 }
  },
  antiBias: ["不要做成具体航海图案"],
  followupHints: ["你更喜欢这种开阔感，还是一点远处被看见的方向性？"],
  compatibleWith: ["长风", "月白"],
  conflictWith: ["繁花"]
}
```

### 长风
```ts
{
  key: "长风",
  aliases: ["大风感", "长风过境", "风很长"],
  weight: 0.74,
  perceptualEffects: {
    color: ["cool neutral with contrast option"],
    impression: ["clear", "forceful", "open"],
    patternIntent: ["directional", "stretched", "simplified geometry"],
    presence: ["medium presence"]
  },
  slotDelta: {
    color: { temperature: -0.10, saturation: -0.10, haze: 0.18, luminosity: 0.10, muted: 0.24, contrastSoftness: 0.18 },
    impression: { calm: 0.34, distance: 0.46, restraint: 0.40, energy: 0.46, clarity: 0.72 },
    patternIntent: { flow: 0.72, abstraction: 0.52, density: -0.18, geometry: 0.34 },
    presence: { blending: 0.42, focalness: 0.42, visualWeight: 0.34 }
  },
  antiBias: ["不要误成激烈动势图案", "不是狂风暴烈"],
  followupHints: ["你更在意长风的开阔，还是它带出的清劲和方向感？"],
  compatibleWith: ["云帆", "竹影"],
  conflictWith: ["烟雨"]
}
```

### 星河
```ts
{
  key: "星河",
  aliases: ["银河", "星光点点", "夜空星河"],
  weight: 0.7,
  perceptualEffects: {
    color: ["dark base", "scattered cold light"],
    impression: ["wonder", "quiet grandeur", "night clarity"],
    patternIntent: ["dotted rhythm", "sparse constellation"],
    presence: ["selective focalness"]
  },
  slotDelta: {
    color: { temperature: -0.14, saturation: -0.06, haze: 0.12, luminosity: 0.34, muted: 0.24, contrastSoftness: 0.20 },
    impression: { calm: 0.46, distance: 0.62, grandeur: 0.58, wonder: 0.72 },
    patternIntent: { abstraction: 0.68, density: -0.20, geometry: 0.20, dotted: 0.74 },
    presence: { blending: 0.34, focalness: 0.54, visualWeight: 0.38 }
  },
  antiBias: ["不要直接做成星星图案", "不适合全屋泛用的高显性"],
  followupHints: ["你更想保留夜空里的安静，还是一点点被点亮的细节点？"],
  compatibleWith: ["清辉", "夜色"],
  conflictWith: ["繁花"]
}
```

---

## D. 华丽 / 显性 / 宴会感 / 酒店感

### 金尊
```ts
{
  key: "金尊",
  aliases: ["金器感", "金盏", "金色器物"],
  weight: 0.76,
  perceptualEffects: {
    color: ["rich gold", "warm metallic", "deep neutral base"],
    impression: ["luxury", "ceremony", "confidence"],
    patternIntent: ["structured accents", "dense focal zones"],
    presence: ["high focalness", "high visualWeight"]
  },
  slotDelta: {
    color: { temperature: 0.52, saturation: 0.26, haze: 0.06, luminosity: 0.48, muted: -0.02, contrastSoftness: 0.12 },
    impression: { luxury: 0.88, confidence: 0.72, warmth: 0.44, restraint: 0.10 },
    patternIntent: { density: 0.42, geometry: 0.36, abstraction: 0.28, flow: 0.14 },
    presence: { blending: 0.14, focalness: 0.82, visualWeight: 0.82 }
  },
  antiBias: ["容易俗气", "不要大面积金", "不要自动高饱和高对比"],
  followupHints: ["你更想要尊贵感，还是只是想要一点被光点到的精致感？"],
  compatibleWith: ["琉璃", "流霞"],
  conflictWith: ["烟雨", "月白"]
}
```

### 流霞
```ts
{
  key: "流霞",
  aliases: ["霞光", "流动的霞色", "霞意"],
  weight: 0.72,
  perceptualEffects: {
    color: ["coral-gold", "warm gradient", "dusk richness"],
    impression: ["vivid", "elegant", "glowing"],
    patternIntent: ["flowing gradient", "decorative movement"],
    presence: ["medium-high presence"]
  },
  slotDelta: {
    color: { temperature: 0.34, saturation: 0.22, haze: 0.20, luminosity: 0.42, muted: 0.02, contrastSoftness: 0.38 },
    impression: { warmth: 0.58, elegance: 0.62, energy: 0.46, calm: 0.22 },
    patternIntent: { flow: 0.68, abstraction: 0.56, density: 0.12, geometry: 0.10 },
    presence: { blending: 0.28, focalness: 0.62, visualWeight: 0.54 }
  },
  antiBias: ["不要误成日落风景画", "不要高饱和糖色"],
  followupHints: ["你更喜欢流霞的流动暖光，还是更喜欢一点暮色里的华美感？"],
  compatibleWith: ["暮色", "灯火", "琉璃"],
  conflictWith: ["霜"]
}
```

### 锦
```ts
{
  key: "锦",
  aliases: ["锦色", "锦缎感", "锦绣"],
  weight: 0.74,
  perceptualEffects: {
    color: ["saturated jewel tones", "contrast-rich palette"],
    impression: ["ornate", "abundant", "expressive"],
    patternIntent: ["layered", "dense", "repeating motifs"],
    presence: ["high presence"]
  },
  slotDelta: {
    color: { temperature: 0.20, saturation: 0.42, haze: 0.04, luminosity: 0.18, muted: -0.14, contrastSoftness: 0.10 },
    impression: { luxury: 0.72, energy: 0.52, restraint: 0.08, abundance: 0.78 },
    patternIntent: { density: 0.62, abstraction: 0.26, geometry: 0.28, flow: 0.22 },
    presence: { blending: 0.12, focalness: 0.78, visualWeight: 0.80 }
  },
  antiBias: ["容易太花、太满、太碎", "不要默认全局都高复杂度"],
  followupHints: ["你想要的是锦的繁与华，还是一种被提炼过的丰富层次？"],
  compatibleWith: ["琉璃", "金尊"],
  conflictWith: ["烟雨", "雪"]
}
```

### 琉璃
```ts
{
  key: "琉璃",
  aliases: ["琉璃感", "釉光", "通透宝石感"],
  weight: 0.76,
  perceptualEffects: {
    color: ["translucent jewel tone", "luminous blue-green"],
    impression: ["refined", "precious", "luminous"],
    patternIntent: ["polished", "reflective", "clear-edged"],
    presence: ["medium-high focalness"]
  },
  slotDelta: {
    color: { temperature: -0.04, saturation: 0.30, haze: 0.08, luminosity: 0.62, muted: -0.06, contrastSoftness: 0.18 },
    impression: { luxury: 0.70, clarity: 0.62, restraint: 0.20, calm: 0.22 },
    patternIntent: { abstraction: 0.36, geometry: 0.24, flow: 0.14, density: 0.10 },
    presence: { blending: 0.24, focalness: 0.70, visualWeight: 0.60 }
  },
  antiBias: ["不要过度珠宝化", "不要只做 shiny effect"],
  followupHints: ["你更想要琉璃的通透微光，还是它那种精致、被看见的存在感？"],
  compatibleWith: ["金尊", "流霞"],
  conflictWith: ["水墨"]
}
```

### 繁花
```ts
{
  key: "繁花",
  aliases: ["花团锦簇", "花很多", "满眼花意"],
  weight: 0.68,
  perceptualEffects: {
    color: ["multi-color", "brighter palette"],
    impression: ["lively", "celebratory", "expressive"],
    patternIntent: ["figurative", "dense", "scattered motifs"],
    presence: ["high focalness"]
  },
  slotDelta: {
    color: { temperature: 0.18, saturation: 0.34, haze: 0.04, luminosity: 0.24, muted: -0.18, contrastSoftness: 0.12 },
    impression: { energy: 0.70, warmth: 0.42, restraint: 0.02, lively: 0.82 },
    patternIntent: { figurativeness: 0.62, abstraction: 0.14, density: 0.70, flow: 0.24, geometry: 0.06 },
    presence: { blending: 0.08, focalness: 0.84, visualWeight: 0.76 }
  },
  antiBias: ["高频风险：碎、杂、儿童感", "不要自动理解成高级"],
  followupHints: ["你要的是热闹丰盛，还是只想保留一点花意被看见？"],
  compatibleWith: ["锦", "流霞"],
  conflictWith: ["烟雨", "月白", "竹影"]
}
```

### 华灯
```ts
{
  key: "华灯",
  aliases: ["华灯初上", "夜里华灯", "都会灯火"],
  weight: 0.74,
  perceptualEffects: {
    color: ["amber", "ruby", "dark warm backdrop"],
    impression: ["urban", "festive", "glamorous"],
    patternIntent: ["clustered highlights", "dense nodes"],
    presence: ["high presence"]
  },
  slotDelta: {
    color: { temperature: 0.38, saturation: 0.26, haze: 0.10, luminosity: 0.46, muted: -0.02, contrastSoftness: 0.16 },
    impression: { energy: 0.62, luxury: 0.56, warmth: 0.50, calm: 0.12 },
    patternIntent: { density: 0.44, abstraction: 0.40, flow: 0.22, geometry: 0.14 },
    presence: { blending: 0.16, focalness: 0.82, visualWeight: 0.74 }
  },
  antiBias: ["酒店/商业更适合", "不要默认居家场景适配"],
  followupHints: ["你更喜欢华灯的都市亮点，还是夜色里那种被层层点亮的气氛？"],
  compatibleWith: ["暮色", "金尊", "灯火"],
  conflictWith: ["雪", "月白"]
}
```

---

## E. 扩展词条：你前面提到但尚未在四象限主表里展开的词

### 残阳
- 主推：warm fading light / softened gold-red / reflective
- 次推：patternIntent 轻流动、presence 中等
- 风险：不要做成夕阳风景画

### 水波
- 主推：patternIntent.flow / low geometry / medium abstraction
- 次推：color cool-soft / impression calm
- 风险：不要直接做成海浪图案

### 云雾
- 主推：impression misty / patternIntent blurred / presence blending
- 次推：color muted cool-neutral
- 风险：不要灰脏化

### 春水初生
- 主推：color fresh soft-green-blue / impression opening / patternIntent light flow
- 风险：不要太直白春日插画

### 夜色
- 主推：impression quiet / intimate or distant depending pairings
- 次推：color dark neutral / presence low or selective focalness
- 风险：不是单纯做深色

### 旧木头被太阳晒过
- 主推：color warm dry patina / impression lived-in / grounded
- 次推：patternIntent coarse subtle texture
- 风险：不要 rustic 过头

### 雨落在旧玻璃上
- 主推：patternIntent blurred / flowing / fine-grained
- 次推：color cool translucent / impression quiet-distant
- 风险：不要做出具象玻璃和雨滴

### 冬天太阳照在冷石头上
- 主推：color cool base + warm light / impression austere but warmed / presence low overall + local slight focalness
- 风险：不能只取“冬天”或只取“太阳”

### 快要融掉的金色
- 主推：color warm luminous softened / impression decadent-soft / patternIntent low-edge melting flow
- 风险：不要高饱和金属质感过强

### 克制里带一点危险
- 主推：impression restrained + tension / presence subtle but perceptible / color contrast hidden not loud
- 风险：不要直接走暗黑/哥特

### 凌晨四点街灯下的雪
- 主推：color cool white + sodium warm accent / impression lonely quiet / patternIntent sparse / presence low but emotionally strong
- 风险：presence 低 ≠ 情绪弱

---

## 6. Composition rule: sentence as weighted combination

完整诗句或自由表达，不应直接作为独立条目硬编码，而应视为：

> 多个意象原子的加权组合

### Example: 天青色等烟雨
拆成：
- 天青
- 烟雨
- 等（等待感，弱情绪）

合成后大致：
- color: coolBlueGray + muted + softContrast
- impression: calm + misty + restrained + poetic waiting
- patternIntent: flowing + blurred + lowComplexity + lowGeometry
- presence: blending + low focalness + low visualWeight

### Example: 月落乌啼霜满天
拆成：
- 月落
- 霜
- 夜天

合成后更偏：
- color: dark cool neutral + silver-white highlight
- impression: lonely / cold / quiet / crisp
- patternIntent: sparse / fine / high negative space
- presence: low presence but emotionally strong

### Example: 小楼一夜听春雨
拆成：
- 春雨
- 夜
- 小楼

合成后更偏：
- color: muted warm-gray + green hint
- impression: gentle / intimate / moist / lived-in
- patternIntent: fine flowing / soft repetitive rhythm
- presence: blended / medium-low

---

## 7. Product rule: follow-up should refine poetic dimensions, not collapse them

命中这些诗性表达后，系统不该退回低维问法，例如：
- 你是不是喜欢蓝色？
- 你是不是喜欢灰色？

而应该沿槽位细化，例如：
- 你更想要的是雾感，还是更清透一点的净感？
- 这种感觉是想融进去，还是想留一点被看见的存在感？
- 你更在意这个意象本身，还是它带出来的流动和边界？

---

## 8. Immediate implementation recommendation

### Phase 1
先把这些词条落成：
- `poeticMappings.ts`

### Phase 2
先接入：
- text signal 解析
- semantic mapping builder
- intake goal state / patternIntent / presence 的增强输入

### Phase 3
再补：
- phrase composition rules
- compatible / conflict interaction
- image feedback 回写

---

## 9. One-sentence summary

Poetic Semantic Layer v1 的核心不是“识别古诗词”，而是：

> 把任意诗性语言中的颜色气息、情绪张力、图案运动和存在方式，压缩成一组可生成、可追问、可迭代更新的中间语义状态。
