import type { DeliveryStage, ExplorationSession, ModelConfig, SlotDefinition, TechnicalModule } from "@/types/domain";

export const slotDefinitions: SlotDefinition[] = [
  {
    key: "colorPalette",
    label: "Color Palette",
    role: "控制冷暖、饱和度与明度，作为整体氛围和空间适配的基础。",
    promptRule: "颜色语言保持抽象，优先使用 warm muted / cool airy 这类设计词，不直接点具体彩名。",
    recommendedStatus: "open",
    axes: [
      { key: "hueBias", label: "Hue Bias", value: 0.58, range: [0, 1], exploration: "wide", semanticAnchors: ["warm", "earthy", "reddish"] },
      { key: "saturation", label: "Saturation", value: 0.46, range: [0, 1], exploration: "wide", semanticAnchors: ["muted", "dusty"] },
      { key: "lightness", label: "Lightness", value: 0.55, range: [0, 1], exploration: "narrow", semanticAnchors: ["airy", "sun-faded"] },
    ],
  },
  {
    key: "motif",
    label: "Motif",
    role: "定义纹样主体的几何/有机/抽象逻辑，不直接使用具象物体名词。",
    promptRule: "Motif 只描述形态逻辑，如 geometric, organic, symbolic，不写 flower 或 cat。",
    recommendedStatus: "open",
    axes: [
      { key: "geometryDegree", label: "Geometry Degree", value: 0.52, range: [0, 1], exploration: "wide", semanticAnchors: ["geometric", "linear"] },
      { key: "organicDegree", label: "Organic Degree", value: 0.44, range: [0, 1], exploration: "wide", semanticAnchors: ["organic", "floral"] },
      { key: "complexity", label: "Complexity", value: 0.4, range: [0, 1], exploration: "wide", semanticAnchors: ["minimal", "reduced"] },
    ],
  },
  {
    key: "style",
    label: "Style",
    role: "承载视觉语言与工艺感觉，是稳定感最强、最适合锁定的槽位。",
    promptRule: "Style 放在 Prompt 后段，表达为 hand-crafted minimalist / design-led contemporary 等风格短语。",
    recommendedStatus: "locked",
    axes: [
      { key: "graphicness", label: "Graphicness", value: 0.48, range: [0, 1], exploration: "narrow", semanticAnchors: ["graphic", "flat", "clean"] },
      { key: "painterlyDegree", label: "Painterly Degree", value: 0.28, range: [0, 1], exploration: "narrow", semanticAnchors: ["hand-drawn", "brushed"] },
      { key: "heritageSense", label: "Heritage Sense", value: 0.38, range: [0, 1], exploration: "narrow", semanticAnchors: ["classic", "tribal", "traditional"] },
    ],
  },
  {
    key: "arrangement",
    label: "Arrangement",
    role: "控制重复、散布和方向性，是空间适配感的关键参数。",
    promptRule: "Arrangement 使用 arranged in / with 介词结构表达布局关系。",
    recommendedStatus: "open",
    axes: [
      { key: "orderliness", label: "Orderliness", value: 0.57, range: [0, 1], exploration: "wide", semanticAnchors: ["ordered", "structured"] },
      { key: "density", label: "Density", value: 0.45, range: [0, 1], exploration: "wide", semanticAnchors: ["airy", "dense"] },
      { key: "directionality", label: "Directionality", value: 0.52, range: [0, 1], exploration: "wide", semanticAnchors: ["directional", "radial", "striped"] },
    ],
  },
  {
    key: "impression",
    label: "Impression",
    role: "不直接生成形状，而是影响其他槽位默认值与 Prompt 的情绪前缀。",
    promptRule: "只取最高权重的 1-2 个 Impression 词，避免情绪词堆叠。",
    recommendedStatus: "open",
    axes: [
      { key: "calmness", label: "Calmness", value: 0.67, range: [0, 1], exploration: "wide", semanticAnchors: ["cozy", "calm", "serene"] },
      { key: "energy", label: "Energy", value: 0.24, range: [0, 1], exploration: "wide", semanticAnchors: ["bold", "playful", "energetic"] },
      { key: "softness", label: "Softness", value: 0.61, range: [0, 1], exploration: "narrow", semanticAnchors: ["soft", "gentle"] },
    ],
  },
  {
    key: "shape",
    label: "Shape",
    role: "控制边界锐度与曲线程度，对织物感和可生产性影响较大。",
    promptRule: "Shape 放在 Prompt 尾部，限定为 rounded / angular / fragmented 这类形态修饰。",
    recommendedStatus: "open",
    axes: [
      { key: "angularity", label: "Angularity", value: 0.31, range: [0, 1], exploration: "narrow", semanticAnchors: ["rounded", "flowing"] },
      { key: "edgeSoftness", label: "Edge Softness", value: 0.71, range: [0, 1], exploration: "narrow", semanticAnchors: ["soft-edged", "blurred"] },
      { key: "irregularity", label: "Irregularity", value: 0.36, range: [0, 1], exploration: "narrow", semanticAnchors: ["irregular", "fragmented"] },
    ],
  },
  {
    key: "scale",
    label: "Scale",
    role: "控制纹样尺寸和对比强度，建议后期锁定以稳定空间适配。",
    promptRule: "Scale 通常仅保留一个短语，如 medium-scale motifs 或 subtle micro-pattern。",
    recommendedStatus: "locked",
    axes: [
      { key: "motifScale", label: "Motif Scale", value: 0.43, range: [0, 1], exploration: "late-lock", semanticAnchors: ["micro-pattern", "bold-scale"] },
      { key: "rhythm", label: "Rhythm", value: 0.62, range: [0, 1], exploration: "late-lock", semanticAnchors: ["repetitive", "rhythmic"] },
      { key: "contrast", label: "Contrast", value: 0.35, range: [0, 1], exploration: "late-lock", semanticAnchors: ["subtle", "low-contrast"] },
    ],
  },
];

export const technicalModules: TechnicalModule[] = [
  {
    id: "preference-intent",
    title: "偏好意图识别",
    summary: "从用户在瀑布流中的喜欢/不喜欢、停留、局部放大等行为信号中抽取偏好状态，并持续更新各槽位轴向权重。",
    inputs: ["上传参考图", "候选图 Like / Dislike", "停留时长", "继续生成记录"],
    outputs: ["Preference State", "Anchor 集合", "Repulsion Zone", "锁定建议"],
    models: ["SigLIP / CLIP embedding", "轻量排序模型", "Bayesian preference update", "多臂赌博式探索策略"],
  },
  {
    id: "slot-mapping",
    title: "槽位语义映射",
    summary: "把视觉 embedding、参考图库检索结果和设计规则映射到 7 个槽位与 21 个 internal axes 上，建立可解释语义空间。",
    inputs: ["参考图 embedding", "风格库元数据", "设计词典", "历史用户偏好"],
    outputs: ["Slot baseline", "Semantic anchors", "可探索/锁定状态"],
    models: ["Qdrant / pgvector 检索", "规则引擎", "小型多标签分类器", "LLM 辅助语义归一化"],
  },
  {
    id: "prompt-composer",
    title: "Prompt 编排器",
    summary: "依据槽位权重和 Prompt 规则表，自动生成稳定且可解释的地毯纹样 Prompt。",
    inputs: ["Top-K semantic anchors", "Prompt 模板", "负向约束", "工艺限制"],
    outputs: ["生成 Prompt", "负向 Prompt", "可追溯槽位解释"],
    models: ["模板引擎", "约束解算器", "LLM 做语言润色但不改结构"],
  },
  {
    id: "image-generation",
    title: "图像生成与风格学习",
    summary: "结合 Prompt、参考图和品牌风格学习生成可用图案，并对结果做一致性打分与回流。",
    inputs: ["Prompt", "参考图", "风格 LoRA / IP-Adapter", "生产约束"],
    outputs: ["候选纹样图", "一致性评分", "下一轮探索候选"],
    models: ["Stable Diffusion XL / FLUX.1 Kontext", "ControlNet / IP-Adapter", "LoRA 风格微调", "图像质量与相似度评估器"],
  },
];

export const deliveryStages: DeliveryStage[] = [
  {
    id: "mvp",
    title: "Phase 1 · 可解释探索 MVP",
    goal: "先跑通从参考图、偏好反馈到槽位更新和 Prompt 生成的闭环。",
    deliverables: ["上传参考图 + 4-5 图探索瀑布流", "槽位状态面板", "Prompt 预览", "Mock 生成结果"],
  },
  {
    id: "gen",
    title: "Phase 2 · 接入真实生成",
    goal: "把 Prompt 系统与图像生成模型接通，并支持风格控制与质量回流。",
    deliverables: ["异步生成队列", "真实图像结果", "风格适配评分", "继续生成迭代机制"],
  },
  {
    id: "ops",
    title: "Phase 3 · 生产化与知识沉淀",
    goal: "把偏好数据沉淀为用户画像、品牌风格库和可复用设计资产。",
    deliverables: ["向量库", "策略监控", "设计资产管理", "A/B 实验和参数分析"],
  },
];

export const samplePrompt =
  "A cozy and serene abstract textile pattern featuring organic, flowing forms, arranged in a balanced scattered composition with medium-scale motifs, using a warm, muted color palette, in a hand-crafted minimalist style with rounded, soft-edged shapes.";

export const recommendedModelConfig: ModelConfig = {
  ingestion: {
    label: "参考图理解",
    selected: "SigLIP so400m",
    reason: "检索和相似度体验稳定，适合把参考图先映射到风格库与槽位先验。",
    alternatives: ["CLIP ViT-L/14", "DINOv2"],
  },
  preference: {
    label: "偏好更新",
    selected: "Bayesian update + pairwise ranking",
    reason: "能明确描述 Like / Dislike 对 axis 权重、confidence 和 repulsion zone 的影响。",
    alternatives: ["Contextual bandit", "LightGBM ranker"],
  },
  semanticMapping: {
    label: "槽位语义映射",
    selected: "规则引擎 + pgvector retrieval + small classifier",
    reason: "保留 7 槽位 21 轴的可解释性，避免完全黑箱化。",
    alternatives: ["Qdrant retrieval", "LLM-only labeling"],
  },
  promptAssembly: {
    label: "Prompt 编排",
    selected: "Template engine + constrained LLM rewrite",
    reason: "模板负责结构，LLM 只润色语言，不允许改槽位顺序。",
    alternatives: ["Pure template", "Function calling LLM"],
  },
  generation: {
    label: "纹样生成",
    selected: "SDXL + LoRA + IP-Adapter",
    reason: "生态成熟，适合先验证风格学习与可控性；后续再评估 FLUX。",
    alternatives: ["FLUX.1-dev", "SD3.5 + ControlNet"],
  },
  storage: {
    label: "数据与检索",
    selected: "PostgreSQL + pgvector + Redis",
    reason: "起步成本低，能覆盖业务状态、embedding 检索和任务缓存。",
    alternatives: ["Qdrant", "Weaviate"],
  },
};

export const mockExplorationSession: ExplorationSession = {
  sessionId: "sess_demo_round_01",
  round: 1,
  phase: "initial",
  lockedSlots: ["style"],
  prompt: samplePrompt,
  negativePrompt: "photorealistic, figurative objects, text, logo, extreme contrast, plush fibers, perspective scene",
  strategy: "Round 1 以 base 图为 anchor，对单一槽位做有限幅度偏移，确保用户反馈可归因。",
  slotStates: slotDefinitions.map((slot) => ({
    key: slot.key,
    label: slot.label,
    role: slot.role,
    promptRule: slot.promptRule,
    recommendedStatus: slot.recommendedStatus,
    confidence: slot.recommendedStatus === "locked" ? 0.82 : 0.56,
    status: slot.recommendedStatus === "locked" ? "locked" : "open",
    axes: slot.axes,
  })),
  promptTrace: {
    impression: ["cozy", "serene"],
    motif: ["organic", "flowing"],
    arrangement: ["balanced", "scattered"],
    scale: ["medium-scale motifs"],
    colorPalette: ["warm", "muted"],
    style: ["hand-crafted", "minimalist"],
    shape: ["rounded", "soft-edged"],
  },
  candidates: [
    {
      id: "cand-base",
      title: "Base Anchor",
      rationale: "参考图与风格库匹配得到的初始先验，用作第一轮对照。",
      promptExcerpt: "warm muted palette, balanced scattered composition",
      deltaSummary: "无偏移，保持基准参数。",
      palette: ["#c56a3d", "#f0ddc0", "#5e3d2c"],
      pattern: "scatter",
    },
    {
      id: "cand-color",
      title: "Color Shift",
      rationale: "只提升 Color / saturation，验证用户是否更接受偏丰富的色感。",
      promptExcerpt: "warmer, slightly richer palette",
      deltaSummary: "Color.saturation +0.08",
      palette: ["#a44b2d", "#deb08f", "#3c2418"],
      pattern: "organic",
    },
    {
      id: "cand-arrangement",
      title: "Ordered Layout",
      rationale: "只提高 Arrangement / orderliness，测试空间秩序感偏好。",
      promptExcerpt: "ordered tiled composition",
      deltaSummary: "Arrangement.orderliness +0.12",
      palette: ["#ba7e4f", "#e9caa1", "#74482f"],
      pattern: "grid",
    },
    {
      id: "cand-shape",
      title: "Soft Shape",
      rationale: "增强 Shape / edge softness，测试更柔和织物边界是否更匹配。",
      promptExcerpt: "rounded, soft-edged shapes",
      deltaSummary: "Shape.edgeSoftness +0.10",
      palette: ["#8f5b3d", "#ecd7be", "#c69a6c"],
      pattern: "radial",
    },
    {
      id: "cand-scale",
      title: "Micro Rhythm",
      rationale: "减小 Scale / motifScale，验证更细密重复的纹样是否更接近目标。",
      promptExcerpt: "subtle micro-pattern, rhythmic repetition",
      deltaSummary: "Scale.motifScale -0.11",
      palette: ["#6a4a35", "#c69f79", "#efe2ce"],
      pattern: "stripes",
    },
  ],
};
