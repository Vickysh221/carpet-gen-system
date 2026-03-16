from app.schemas import ModelChoice, ModelConfigResponse


RECOMMENDED_MODEL_CONFIG = ModelConfigResponse(
    ingestion=ModelChoice(
        label="参考图理解",
        selected="SigLIP so400m",
        reason="兼顾参考图检索质量和工程稳定性，适合把参考图映射为风格库相似样本与槽位先验。",
        alternatives=["CLIP ViT-L/14", "DINOv2"],
    ),
    preference=ModelChoice(
        label="偏好更新",
        selected="Bayesian update + pairwise ranking",
        reason="能够显式更新 axis 权重、confidence、lock 状态和 repulsion zone，适合文档里的可解释流程。",
        alternatives=["Contextual bandit", "LightGBM ranker"],
    ),
    semantic_mapping=ModelChoice(
        label="槽位语义映射",
        selected="Rule engine + pgvector retrieval + small classifier",
        reason="语义锚点和 internal axes 不能完全黑箱化，需要规则系统兜底。",
        alternatives=["Qdrant retrieval", "LLM-only labeling"],
    ),
    prompt_assembly=ModelChoice(
        label="Prompt 编排",
        selected="Template engine + constrained LLM rewrite",
        reason="Prompt 顺序和词汇约束必须固定，LLM 只负责语言润色。",
        alternatives=["Pure template", "Function-calling LLM"],
    ),
    generation=ModelChoice(
        label="纹样生成",
        selected="SDXL + LoRA + IP-Adapter",
        reason="更适合 MVP 阶段先验证风格控制和品牌一致性，后续再评估 FLUX。",
        alternatives=["FLUX.1-dev", "SD3.5 + ControlNet"],
    ),
    storage=ModelChoice(
        label="数据与检索",
        selected="PostgreSQL + pgvector + Redis",
        reason="业务数据、embedding 检索和生成任务状态都能先覆盖，迁移成本也更低。",
        alternatives=["Qdrant", "Weaviate"],
    ),
)
