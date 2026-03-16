# Carpet Gen System

基于项目文档整理出的前端骨架与系统分析，目标是把“用户偏好驱动的地毯纹样生成系统”先做成一个可解释、可扩展的产品与工程底座。

## 当前包含

- `React + TypeScript + Vite + Tailwind` 前端工程
- `shadcn` 风格基础组件
- 基于文档整理的 `7 个槽位 / 21 个 internal axes` 领域模型
- 产品流程页：上传参考图、4-5 图探索瀑布流、反馈操作、槽位状态、Prompt 面板
- 已固化的模型选型与配置
- `FastAPI` 后端骨架与接口协议
- 架构说明文档 `docs/architecture.md`

## 业务理解

项目的核心不是“让模型画一张图”，而是构建一个有记忆的偏好学习系统：

1. 用户上传参考图，系统给出第一轮 4-5 张可解释探索图。
2. 用户对图片进行喜欢 / 不喜欢选择，系统把反馈更新成 `Preference State`。
3. 系统通过 `槽位系统` 维护内部参数轴、置信度、锁定状态与冲突状态。
4. 系统依据当前槽位权重生成可追溯的 Prompt 和负向约束。
5. 图像生成模块结合 Prompt、风格学习和参考图控制生成新纹样，再继续回流偏好状态。

## 推荐技术路线

- 前端：`React + TypeScript + Tailwind + shadcn`
- API：`FastAPI`
- 数据：`PostgreSQL + pgvector`，后续可迁移 `Qdrant`
- 视觉理解：`SigLIP / CLIP`
- 偏好更新：`Bayesian update + pairwise ranking + rule engine`
- 图像生成：`SDXL / FLUX + LoRA + IP-Adapter + ControlNet`

## 启动

```bash
npm install
npm run dev
```

后端：

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```
