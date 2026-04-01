# LLM 架构批判性分析与 DeepSeek 接入条件

**日期：** 2026-04-01
**分析基础：** 当前代码实际结构，非假设

---

## 一、当前架构的核心问题

### 1.1 本质：一个闭合词汇表系统

整个语义理解管道的入口是两张静态规则表。

**`fieldHitDetection.ts` — 字符串子串匹配**

```ts
FIELD_RULES = {
  colorMood:   [{ pattern: "绿意盎然", weight: 1.4 }, { pattern: "草色", weight: 1.1 }, ...],
  overallImpression: [{ pattern: "安静", weight: 1.2 }, { pattern: "低调", weight: 1.1 }, ...],
  patternTendency: [{ pattern: "不要太花", weight: 1.3 }, ...],
  ...
}
```

匹配方式是 `text.includes(pattern)`。用户输入的词不在这张表里，该字段就不会被命中。

**`semanticCueDecomposition.ts` — 约 30 条硬编码 cue rules**

```ts
{ cue: "草色遥看近却无", confidence: 0.64, axes: ["color.saturation", "impression.energy"] },
{ cue: "雾里有色",        confidence: 0.62, axes: ["color.saturation"] },
{ cue: "咖啡时光",        confidence: 0.82, axes: ["color.warmth", "impression.softness"] },
```

只有这 30 条 cue 能进入「被结构化理解」的通道，其余所有输入都跌入 fallback 分支，置信度强制降到 0.4，axes 为空。

**后果：** 用户说"像是下午三点的光"、"有点外婆家的感觉"、"想要一种刚洗完澡卫生间的感觉"——命中零条规则，系统对这些表达毫无结构性理解。

---

### 1.2 语义空间本身也是封闭的

即使 LLM 路径存在，它的输出也必须被量化进 12 个预定义轴：

```
color.warmth    / color.saturation   / color.lightness
motif.geometry  / motif.organic      / motif.complexity
impression.calm / impression.energy  / impression.softness
arrangement.order / arrangement.spacing / arrangement.direction
```

这 12 个轴定义了系统能「听懂」的最大语义容量。LLM 是在这个 12 维笼子里帮你填格子，而不是在真正理解表达背后的感知世界。

---

### 1.3 LLM 只是边缘角色

```
detectHighValueFieldHits     ← 规则
  ↓
decomposeSemanticCues        ← 规则
  ↓
buildSemanticCanvas          ← LLM（第一个也是最重要的 LLM 入口）
  ↓
resolvePrototypeCandidates   ← LLM
  ↓
buildSemanticToAxisBridge    ← 规则
  ↓
deriveUpdatedSlotStates      ← 规则状态机
```

LLM 在 `semanticCanvas` 和 `prototypeMatching` 环节发挥作用，但输入已经被前面的规则层**预处理和过滤**过了，输出也立即被 bridge 层映射回固定轴。LLM 理解了什么，都被规则约束住了。

---

### 1.4 这个架构的合理性与边界

| 维度 | 优势 | 边界 |
|------|------|------|
| 可预测性 | 规则命中路径完全可追踪 | 只对库内表达有效 |
| 本地运行 | 不依赖外部 API | Qwen2.5:3b 语义能力有限 |
| 速度 | 规则层极快 | LLM 层 20s 超时仍不够 |
| 成本 | 零 API 费用 | 精度上限被本地模型锁死 |

**这个架构是在本地模型限制下的合理妥协，不是设计错误。** 问题在于：一旦取消本地限制，这个架构就不再是最优解。

---

### 1.5 真正的语义优先架构是什么

不是：
```
文字 → 关键词命中 → 预设 slot 填槽 → 固定轴数值
```

而是：
```
文字 + 对话历史 + 当前轴状态 → LLM 直接推理 → 轴更新 + 置信度 + 歧义描述
```

区别在于：
- 任意自然表达都能被理解，不依赖词汇表
- LLM 本身承担语义推理，而不是做规则管道的润滑剂
- 轴更新的根据是理解，而不是模式命中

---

## 二、模型选型分析

### 2.1 这个案例的语言特征

地毯设计意图理解有极高的语言复杂度要求：

1. **中文诗意/隐喻表达**：用户会说"草色遥看近却无"、"若有若无"、"外婆家的气息"——这不是普通指令语言
2. **审美感知推理**：需要把模糊的情绪感知（"像是春天的下午"）映射到具体的设计参数（`color.saturation ↓, impression.energy ↑`）
3. **歧义识别与分解**：同一个词（"自然一点"）可能指向图案或颜色，需要主动识别并提问
4. **多轮上下文累积**：每轮回答不是独立的，需要跨轮次修正槽位方向

---

### 2.2 第一推荐：Claude Sonnet（claude-sonnet-4-6）

**核心优势：**

- **中文诗意表达理解深度最强**：能把"下午三点的光打在旧木地板上"直接理解为 `color.warmth↑, impression.softness↑, motif.organic↑`，无需关键词命中
- **审美域推理能力**：能区分"calm"和"still"的微妙差异，能理解"不要太日式但也别太北欧"这类对立约束
- **结构化 JSON 输出稳定**：在系统提示指定 JSON schema 后，输出格式一致性高
- **多轮语义一致性**：能跨轮次保持对同一表达的解释稳定，不会每轮重新解读

**效果示例：**

输入 `"外婆家厨房的感觉，有点旧但是很温暖，不想太花"` 可以直接返回：
```json
{
  "slotUpdates": {
    "color":      { "warmth": 0.72, "saturation": 0.38 },
    "motif":      { "complexity": 0.28, "organic": 0.61 },
    "impression": { "softness": 0.67, "calm": 0.71 }
  },
  "confidence": { "color": 0.82, "impression": 0.79, "motif": 0.65 },
  "ambiguities": ["'旧'是在说颜色偏旧黄还是图案更传统风格？"],
  "followUpQuestion": "你说的温暖更偏向颜色暖一点，还是整体氛围像家一样放松？"
}
```

---

### 2.3 第二推荐：DeepSeek-V3 / R1

**对中文审美词汇有原生优势：**

- 中文语料密度远高于 Claude/GPT，对"外婆家"、"茶馆午后"、"北方草原黄昏"这类**高文化负载表达**的理解非常直觉
- V3 的 API 成本约是 Claude Sonnet 的 1/8，适合高频调用
- **R1 的推理链**（`reasoning_content` 字段）是特有优势：会写出"用户说的'自然'可能指图案别太几何，也可能指颜色偏大地色，综合上下文我倾向于..."——这正是你的 ambiguity detection 需要的

**V3 vs R1 分工建议：**

| 场景 | 模型 | 理由 |
|------|------|------|
| semanticCanvas 生成 | R1 | 复杂隐喻需要推理链 |
| answerAlignment 判断 | V3 | 简单分类任务，无需 chain-of-thought |
| fallback 候选生成 | V3 | 格式化输出，不需要深度推理 |

---

### 2.4 第三推荐：GPT-4o（作为参照）

- 中文理解好，审美推理可以，但**中文诗意隐喻**不如 Claude 和 DeepSeek 细腻
- "草色遥看近却无"交给 GPT-4o 可能被理解为字面草地绿色，而不是「颜色存在感若有若无」的设计感知
- 工程接入最成熟（OpenAI SDK，有原生 structured output 支持）

---

## 三、接入 DeepSeek 的项目条件

### 3.1 当前技术架构回顾

你的项目是**纯浏览器 Vite 前端**。LLM 调用链路如下：

```
浏览器
  → /ollama/*（Vite dev proxy）
  → http://127.0.0.1:11434（本地 Ollama）
  → Qwen2.5:3b
```

三个 LLM 调用入口：

| 文件 | 功能 | 当前 provider |
|------|------|-------------|
| `semanticCanvasAdapter.ts` | 语义画布生成 | hardcoded → `directOllamaSemanticCanvasProvider` |
| `answerAlignmentAdapter.ts` | 多轮回答对齐判断 | hardcoded → `directOllamaAnswerAlignmentProvider` |
| `llmFallbackAdapter.ts` | fallback 候选生成 | 可切换，有 `backendLlmFallbackProvider` |

后端接入基础设施：
- `lib/api.ts` 里有 `VITE_API_BASE_URL` 配置
- `backendLlmFallbackProvider` 已经有调用 `fetchLlmFallbackCandidates` 的路径
- 这两个是部分完成的后端接入骨架

---

### 3.2 条件一（硬性）：必须有后端代理服务

**为什么不可绕过：**

`VITE_*` 环境变量会被打包进 JS bundle，任何人都能在浏览器 Network 面板里看到 API key。DeepSeek API（`api.deepseek.com`）也不支持跨域直接调用，设计上是服务端 → 服务端。

**最小后端实现（Express / FastAPI 均可）：**

```
POST /api/v1/llm/semantic-canvas       ← 对应 semanticCanvasAdapter
POST /api/v1/llm/answer-alignment      ← 对应 answerAlignmentAdapter
POST /api/v1/llm/fallback-candidates   ← 已有前端调用路径（lib/api.ts）
```

后端只做三件事：
1. 持有 `DEEPSEEK_API_KEY`（环境变量，不对前端暴露）
2. 接收前端的 prompt 请求
3. 转发给 DeepSeek API，返回结果

---

### 3.3 条件二（硬性）：请求/响应格式适配

**当前 Ollama 格式：**

```ts
// 请求
POST /api/generate
{
  model: "qwen2.5:3b",
  prompt: "你是 Fuli 的 semantic canvas 解释器...\n用户输入：...",
  stream: false,
  format: "json",
  options: { temperature: 0.2 }
}

// 响应
{ response: "{\"rawCues\":[...], ...}" }
```

**DeepSeek 格式（OpenAI chat completions 兼容）：**

```ts
// 请求
POST /chat/completions
{
  model: "deepseek-chat",   // V3
  // 或
  model: "deepseek-reasoner", // R1
  messages: [
    { role: "system", content: "你是 Fuli 的 semantic canvas 解释器..." },
    { role: "user",   content: "用户输入：...\n已命中字段：..." }
  ],
  response_format: { type: "json_object" }  // 仅 V3 支持，R1 不稳定
}

// 响应
{
  choices: [{
    message: {
      content: "{\"rawCues\":[...], ...}",
      reasoning_content: "这个用户输入包含了...(推理链)"  // 仅 R1
    }
  }]
}
```

影响范围：三个 `localOllama*.ts` 文件里的 `buildPrompt` 函数和 `fetchJson` 调用逻辑，以及 JSON 提取方式。

**R1 的 JSON 提取特殊处理：**

R1 不支持 `response_format: json_object`，输出格式是：

```
<think>
分析这个输入..."草色"可能指颜色偏草木绿，也可能只是自然意境...
综合上下文，倾向于...
</think>
{"rawCues": ["草色"], "conceptualAxes": [...], ...}
```

需要从输出文本中提取 JSON 块：
```ts
const jsonMatch = content.match(/\{[\s\S]*\}/);
const parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : {};
```

---

### 3.4 条件三（硬性）：三个 active provider 都要能切换

目前只有 `llmFallbackAdapter.ts` 可切换：

```ts
// ✅ 已支持
export const activeLlmFallbackProvider =
  VITE_LLM_FALLBACK_PROVIDER === "backend"
    ? backendLlmFallbackProvider
    : directOllamaFallbackProvider;
```

另外两个是硬编码的：

```ts
// ❌ semanticCanvasAdapter.ts（需要改）
export const activeSemanticCanvasProvider = directOllamaSemanticCanvasProvider;

// ❌ answerAlignmentAdapter.ts（需要改）
export const activeAnswerAlignmentProvider = directOllamaAnswerAlignmentProvider;
```

如果不改这两个，DeepSeek 只能作用于 fallback 分支，semanticCanvas 和 answerAlignment（最重要的两个调用）仍然走 Ollama。

---

### 3.5 条件四（软性）：Prompt 格式微调

当前是 Ollama generate 风格的单段文字块。DeepSeek 推荐 system/user 分离：

```ts
// 当前
`你是 Fuli 的 semantic canvas 解释器。
任务不是直接生成参数...
用户输入：${text}
返回严格 JSON...`

// DeepSeek 推荐（R1 特别受益于明确的 system 角色设定）
messages: [
  {
    role: "system",
    content: "你是 Fuli 的 semantic canvas 解释器。任务不是直接生成参数，而是把用户输入先翻译成高层语义 canvas..."
  },
  {
    role: "user",
    content: `用户输入：${text}\n已命中字段：${hitFields.join(", ")}\n...`
  }
]
```

不改也能运行，但 R1 在有 system role 时推理质量更好。

---

### 3.6 条件五（软性）：超时调整

```ts
// 当前所有调用共用 20s
const OLLAMA_TIMEOUT_MS = Number(import.meta.env.VITE_OLLAMA_TIMEOUT_MS ?? "20000");
```

| 模型 | 场景 | 典型延迟 | 建议超时 |
|------|------|--------|--------|
| DeepSeek V3 | 任意调用 | 2–8s | 15s |
| DeepSeek R1 | semanticCanvas | 10–30s | 60s |
| DeepSeek R1 | answerAlignment | 5–15s | 30s |

R1 处理复杂隐喻输入时，20s 超时会频繁触发。

---

### 3.7 条件六：CORS 与代理配置

**开发环境：** `vite.config.ts` 加一条 `/api` → 后端的代理即可，与现有 `/ollama` 代理同级：

```ts
server: {
  proxy: {
    "/ollama": { target: "http://127.0.0.1:11434", ... },
    "/api":    { target: "http://127.0.0.1:3001", changeOrigin: true },  // 新增
  },
},
```

**生产环境：** 后端与前端同域部署（最简方案），或后端设置 CORS 白名单。

---

## 四、最小接入路径

```
步骤 1：建后端（Express / FastAPI）
   ├── 实现 POST /api/v1/llm/semantic-canvas
   ├── 实现 POST /api/v1/llm/answer-alignment
   ├── 实现 POST /api/v1/llm/fallback-candidates（前端调用已存在）
   └── 后端注入 DEEPSEEK_API_KEY（环境变量，不对前端暴露）

步骤 2：vite.config.ts 加 /api 代理（开发环境）

步骤 3：lib/api.ts 补充两个前端调用函数
   ├── fetchSemanticCanvas(input) → canvas
   └── fetchAnswerAlignment(input) → alignment

步骤 4：修改两个 hardcoded adapter
   ├── semanticCanvasAdapter.ts：加 VITE_SEMANTIC_CANVAS_PROVIDER 开关
   └── answerAlignmentAdapter.ts：加 VITE_ANSWER_ALIGNMENT_PROVIDER 开关

步骤 5：环境变量配置
   VITE_SEMANTIC_CANVAS_PROVIDER=backend
   VITE_ANSWER_ALIGNMENT_PROVIDER=backend
   VITE_LLM_FALLBACK_PROVIDER=backend
   DEEPSEEK_API_KEY=sk-...（只在后端）
```

---

## 五、不需要改的部分

| 文件 / 模块 | 说明 |
|------------|------|
| `normalizeCanvas(raw)` | JSON 结构校验与兜底，与模型无关，直接复用 |
| `normalizeAlignment(raw)` | 同上 |
| 所有 Prompt 内容（中文指令） | DeepSeek 中文理解比 Qwen 强，prompt 不需要改 |
| `VITE_API_BASE_URL` 机制 | 后端地址已可配置 |
| `backendLlmFallbackProvider` | 后端调用骨架已存在 |
| 整个 slot/axis 状态管理层 | 与 LLM 选型完全无关 |
| `questionPlanning`、`intakeGoalState` | 与 LLM 选型完全无关 |

---

## 六、R1 推理链的额外价值

R1 的 `reasoning_content` 字段在这个项目里有特殊意义。

当前 `SimulatorPage.tsx` 已经有详细的 debug inspect panel（`ConversationStateInspectCard`），展示了 question planning、gap ranking、slot progress 等内部状态。

如果把 R1 的推理链透传并显示在这个 panel 里，就能直观看到：

> "模型把'若有若无'理解为 `color.saturation ↓` 的原因是：这个词在中文诗歌里通常描述颜色存在感极低、若隐若现的状态，结合上文提到的'春意'，倾向于春日浅绿色系的微弱显现，而不是完全无色。"

这对调试 prompt 效果、验证语义映射质量、向产品展示 AI 决策过程都有实际价值，而其他任何模型都没有这个能力。

---

*文档生成自代码分析，基于 `chatbot-semantic` 分支当前实际结构。*
