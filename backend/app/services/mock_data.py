from app.schemas import (
    CandidateCard,
    ExplorationSessionResponse,
    InternalAxis,
    PromptTrace,
    SlotState,
)


def build_slot_states() -> list[SlotState]:
    return [
        SlotState(
            key="colorPalette",
            label="Color Palette",
            role="控制冷暖、饱和度与明度。",
            prompt_rule="颜色语言优先抽象描述，不点具体色名。",
            recommended_status="open",
            confidence=0.54,
            status="open",
            axes=[
                InternalAxis(key="hueBias", label="Hue Bias", value=0.58, range=[0, 1], exploration="wide", semantic_anchors=["warm", "earthy"]),
                InternalAxis(key="saturation", label="Saturation", value=0.46, range=[0, 1], exploration="wide", semantic_anchors=["muted", "dusty"]),
                InternalAxis(key="lightness", label="Lightness", value=0.55, range=[0, 1], exploration="narrow", semantic_anchors=["airy", "sun-faded"]),
            ],
        ),
        SlotState(
            key="motif",
            label="Motif",
            role="定义几何、有机与抽象程度。",
            prompt_rule="不使用具象名词。",
            recommended_status="open",
            confidence=0.48,
            status="open",
            axes=[
                InternalAxis(key="geometryDegree", label="Geometry Degree", value=0.52, range=[0, 1], exploration="wide", semantic_anchors=["geometric", "linear"]),
                InternalAxis(key="organicDegree", label="Organic Degree", value=0.44, range=[0, 1], exploration="wide", semantic_anchors=["organic", "biomorphic"]),
                InternalAxis(key="complexity", label="Complexity", value=0.40, range=[0, 1], exploration="wide", semantic_anchors=["minimal", "reduced"]),
            ],
        ),
        SlotState(
            key="style",
            label="Style",
            role="承载图案的整体视觉语言。",
            prompt_rule="Style 适合后期锁定。",
            recommended_status="locked",
            confidence=0.83,
            status="locked",
            axes=[
                InternalAxis(key="graphicness", label="Graphicness", value=0.48, range=[0, 1], exploration="narrow", semantic_anchors=["graphic", "flat"]),
                InternalAxis(key="painterlyDegree", label="Painterly Degree", value=0.28, range=[0, 1], exploration="narrow", semantic_anchors=["hand-drawn", "brushed"]),
                InternalAxis(key="heritageSense", label="Heritage Sense", value=0.38, range=[0, 1], exploration="narrow", semantic_anchors=["traditional", "classic"]),
            ],
        ),
        SlotState(
            key="arrangement",
            label="Arrangement",
            role="控制排列秩序、密度和方向性。",
            prompt_rule="使用 arranged in / with 结构描述。",
            recommended_status="open",
            confidence=0.51,
            status="open",
            axes=[
                InternalAxis(key="orderliness", label="Orderliness", value=0.57, range=[0, 1], exploration="wide", semantic_anchors=["ordered", "structured"]),
                InternalAxis(key="density", label="Density", value=0.45, range=[0, 1], exploration="wide", semantic_anchors=["airy", "dense"]),
                InternalAxis(key="directionality", label="Directionality", value=0.52, range=[0, 1], exploration="wide", semantic_anchors=["radial", "striped"]),
            ],
        ),
        SlotState(
            key="impression",
            label="Impression",
            role="调节氛围和其他槽位的默认值。",
            prompt_rule="只选最高权重的 1-2 个词。",
            recommended_status="open",
            confidence=0.66,
            status="open",
            axes=[
                InternalAxis(key="calmness", label="Calmness", value=0.67, range=[0, 1], exploration="wide", semantic_anchors=["cozy", "serene"]),
                InternalAxis(key="energy", label="Energy", value=0.24, range=[0, 1], exploration="wide", semantic_anchors=["energetic", "bold"]),
                InternalAxis(key="softness", label="Softness", value=0.61, range=[0, 1], exploration="narrow", semantic_anchors=["soft", "gentle"]),
            ],
        ),
        SlotState(
            key="shape",
            label="Shape",
            role="控制边界锐度和曲线感。",
            prompt_rule="放在 Prompt 尾段。",
            recommended_status="open",
            confidence=0.58,
            status="open",
            axes=[
                InternalAxis(key="angularity", label="Angularity", value=0.31, range=[0, 1], exploration="narrow", semantic_anchors=["rounded", "flowing"]),
                InternalAxis(key="edgeSoftness", label="Edge Softness", value=0.71, range=[0, 1], exploration="narrow", semantic_anchors=["soft-edged", "blurred"]),
                InternalAxis(key="irregularity", label="Irregularity", value=0.36, range=[0, 1], exploration="narrow", semantic_anchors=["irregular", "fragmented"]),
            ],
        ),
        SlotState(
            key="scale",
            label="Scale",
            role="控制纹样尺度与对比。",
            prompt_rule="Scale 通常只保留一个短语。",
            recommended_status="locked",
            confidence=0.78,
            status="locked",
            axes=[
                InternalAxis(key="motifScale", label="Motif Scale", value=0.43, range=[0, 1], exploration="late-lock", semantic_anchors=["micro-pattern", "medium-scale"]),
                InternalAxis(key="rhythm", label="Rhythm", value=0.62, range=[0, 1], exploration="late-lock", semantic_anchors=["repetitive", "rhythmic"]),
                InternalAxis(key="contrast", label="Contrast", value=0.35, range=[0, 1], exploration="late-lock", semantic_anchors=["subtle", "low-contrast"]),
            ],
        ),
    ]


def build_candidates(round_number: int) -> list[CandidateCard]:
    suffix = f"R{round_number}"
    return [
        CandidateCard(
            id=f"{suffix}-base",
            title="Base Anchor",
            rationale="保持风格库推导出的初始先验，作为本轮对照。",
            prompt_excerpt="warm muted palette, balanced scatter",
            delta_summary="No axis shift",
            palette=["#c56a3d", "#f0ddc0", "#5e3d2c"],
            pattern="scatter",
        ),
        CandidateCard(
            id=f"{suffix}-color",
            title="Color Shift",
            rationale="提升 Color.saturation，测试更丰富的色感是否更贴合。",
            prompt_excerpt="warmer, slightly richer palette",
            delta_summary="Color.saturation +0.08",
            palette=["#a44b2d", "#deb08f", "#3c2418"],
            pattern="organic",
        ),
        CandidateCard(
            id=f"{suffix}-arrangement",
            title="Ordered Layout",
            rationale="提高 Arrangement.orderliness，验证空间秩序偏好。",
            prompt_excerpt="ordered tiled composition",
            delta_summary="Arrangement.orderliness +0.12",
            palette=["#ba7e4f", "#e9caa1", "#74482f"],
            pattern="grid",
        ),
        CandidateCard(
            id=f"{suffix}-shape",
            title="Soft Shape",
            rationale="增强 Shape.edgeSoftness，测试更柔和轮廓。",
            prompt_excerpt="rounded, soft-edged shapes",
            delta_summary="Shape.edgeSoftness +0.10",
            palette=["#8f5b3d", "#ecd7be", "#c69a6c"],
            pattern="radial",
        ),
        CandidateCard(
            id=f"{suffix}-scale",
            title="Micro Rhythm",
            rationale="缩小 Scale.motifScale，测试更细密的织物节奏。",
            prompt_excerpt="subtle micro-pattern, rhythmic repetition",
            delta_summary="Scale.motifScale -0.11",
            palette=["#6a4a35", "#c69f79", "#efe2ce"],
            pattern="stripes",
        ),
    ]


def build_prompt_trace() -> PromptTrace:
    return PromptTrace(
        impression=["cozy", "serene"],
        motif=["organic", "flowing"],
        arrangement=["balanced", "scattered"],
        scale=["medium-scale motifs"],
        color_palette=["warm", "muted"],
        style=["hand-crafted", "minimalist"],
        shape=["rounded", "soft-edged"],
    )


def build_session(round_number: int = 1, phase: str = "initial") -> ExplorationSessionResponse:
    return ExplorationSessionResponse(
        session_id=f"sess_demo_round_{round_number:02d}",
        round=round_number,
        phase=phase,
        strategy="Round 1 使用 1 张 base + 4 张单槽位偏移图；后续轮次围绕 liked anchor 做局部微调。",
        prompt=(
            "A cozy and serene abstract textile pattern featuring organic, flowing forms, "
            "arranged in a balanced scattered composition with medium-scale motifs, using "
            "a warm, muted color palette, in a hand-crafted minimalist style with rounded, soft-edged shapes."
        ),
        negative_prompt="photorealistic, figurative objects, text, logo, extreme contrast, perspective scene",
        locked_slots=["style", "scale"],
        slot_states=build_slot_states(),
        candidates=build_candidates(round_number),
        prompt_trace=build_prompt_trace(),
    )
