# Carpet Pattern Generation System Architecture

## 1. 产品目标

该系统目标不是一次性输出“看起来不错”的地毯图案，而是通过用户连续选择，逐步建立可解释的设计偏好模型，并把这个模型映射为稳定的 Prompt 与图像生成控制参数。

这意味着系统必须同时满足四件事：

- 能从用户行为中持续学习偏好
- 能把偏好表达为结构化槽位状态
- 能把槽位状态稳定地翻译为 Prompt
- 能把生成结果再次回流到偏好学习系统

## 2. 建议的系统分层

### 2.1 Preference Intelligence Layer

职责：

- 接收 Like / Dislike / 停留 / 继续生成等行为事件
- 更新 `Preference State`
- 维护每个槽位轴向的 `confidence / lock / repulsion zone`

建议方法：

- 初期使用规则引擎 + 贝叶斯更新，不建议一开始直接上 RL
- 每张候选图必须保存“相对于 Anchor 改了哪个 axis”
- 对 Like 强化对应 axis 方向，对 Dislike 标记局部排斥区间

建议模型：

- 图像 embedding：`SigLIP` 或 `CLIP`
- rerank / ranking：轻量 `XGBoost`、`CatBoost` 或 MLP

### 2.2 Slot Semantic Layer

职责：

- 定义 7 个槽位与 21 个 internal axes
- 把外部语义锚点映射到 internal axes
- 管理哪些维度可以大步探索，哪些维度需要小步探索或后期锁定

核心原则：

- 系统只在 internal axes 上学习和收敛
- 外部语义只用于解释、Prompt 和交互入口
- Impression 用来影响其他槽位默认值，而不是直接生成形状

推荐槽位：

- Color Palette
- Motif
- Style
- Arrangement
- Impression
- Shape
- Scale

### 2.3 Prompt Composition Layer

职责：

- 从当前槽位状态中选取 top semantic anchors
- 依据固定模板生成 Prompt
- 生成负向 Prompt 与工艺约束

推荐实现：

- 模板引擎负责结构
- LLM 只做语言润色，不允许改动槽位顺序和语义约束
- 对每个槽位加显式规则，例如 Impression 最多 2 个词，Scale 只输出一个短语

Prompt 模板：

```text
[Impression] + abstract textile pattern featuring [Motif]
+ arranged in [Arrangement]
+ with [Scale]
+ using [Color Palette]
+ in a [Style]
+ with [Shape]
```

### 2.4 Image Generation Layer

职责：

- 基于 Prompt 生成地毯纹样
- 结合参考图与品牌风格做风格控制
- 为每次生成输出质量分和可追溯元数据

建议模型路线：

- MVP：`SDXL + LoRA + IP-Adapter`
- 强语义路线：`FLUX.1` 系列
- 局部控制：`ControlNet`

风格学习建议：

- 优先做品牌或设计师风格 LoRA
- 对应的训练集需要按槽位标签做结构化管理

## 3. 数据与服务设计

### 3.1 推荐服务拆分

- `web-app`: React 前端，承载上传、探索瀑布流、槽位面板和 Prompt 预览
- `api-service`: FastAPI，提供业务接口和任务编排
- `preference-service`: 偏好更新、排序、锁定策略
- `generation-worker`: 异步图像生成任务
- `asset-store`: 图像、Prompt、LoRA、参考图存储

### 3.2 推荐数据表

- `users`
- `sessions`
- `reference_images`
- `generated_images`
- `preference_events`
- `slot_states`
- `prompt_snapshots`
- `style_assets`

### 3.3 推荐基础设施

- `PostgreSQL`: 主业务数据
- `pgvector`: 早期 embedding 检索
- `Redis`: 任务状态和缓存
- `S3-compatible object storage`: 图像和训练资产

## 4. 模型选型建议

### 4.1 偏好识别

推荐：

- `SigLIP` 或 `CLIP ViT-L/14`
- 贝叶斯偏好更新
- pairwise ranking

理由：

- 可解释性强
- 工程门槛低
- 方便快速验证槽位体系是否成立

### 4.2 槽位映射

推荐：

- 规则引擎 + 多标签分类器
- 向量召回设计图库
- LLM 做语义归一化

理由：

- 槽位和语义映射不能完全交给大模型黑箱处理
- 需要保留可追溯设计规则

### 4.3 图像生成

推荐：

- 第一阶段：`SDXL`
- 第二阶段：`FLUX.1` 评估
- 风格迁移：`LoRA + IP-Adapter`

理由：

- SDXL 生态成熟，控制链路更完整
- FLUX 在语义遵循和构图上有潜力，但部署成本通常更高

## 5. 项目开发建议

### Phase 1

先做：

- 上传参考图
- 第一轮 4-5 图探索
- Like / Dislike
- 槽位状态面板
- Prompt 预览

不要一开始就做：

- 大规模模型训练平台
- 复杂 RL
- 过深的自动化风格学习

### Phase 2

补充：

- 真实图像生成
- 异步任务队列
- 质量评估和重排

### Phase 3

沉淀：

- 用户长期偏好画像
- 设计知识库
- 品牌风格资产和 LoRA 管理
