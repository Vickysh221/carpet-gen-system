# Agent Workflow

## 总体流程
用户输入（自然语言 / 选择 / 参考图）
→ Intent Parser（意图解析）
→ Slot State Builder（槽位状态构建）
→ Variant Orchestrator（变体调度）
→ 瀑布流候选结果
→ Feedback Interpreter（反馈解释）
→ State Updater / Convergence Agent（状态更新 / 收敛代理）
→ 下一轮推荐 + 设计状态沉淀

## 1. Intent Parser
### 任务
把用户原始表达中的模糊感受、偏好、参考线索解析为可进入系统的候选设计语义。

### 输入
- 文本描述
- 选择项
- 参考图
- 历史偏好（可选）

### 输出
- 初步设计方向
- 候选语义标签
- 不确定性标记

## 2. Slot State Builder
### 任务
将候选语义映射到一组地毯设计槽位，形成初始 design state。

### 槽位意义
槽位不是简单 UI 控件，而是系统内部的设计语义中间表示层。

## 3. Variant Orchestrator
### 任务
基于当前槽位状态生成多组可比较变体，使每张图代表一个明确的设计假设。

### 目标
把用户的判断负担从“准确描述”转化为“相对比较”。

## 4. Feedback Interpreter
### 任务
将用户的喜欢 / 不喜欢等轻反馈转化为可解释的设计维度信号。

### 输出
- 当前更可能正确的方向
- 当前主要问题槽位
- 是否需要锁定 / 继续探索

## 5. State Updater / Convergence Agent
### 任务
根据反馈结果更新槽位状态，决定下一轮探索策略。

### 核心状态
- Open：仍需探索
- Locked：方向初步确认

## 最终沉淀
系统沉淀的不是单次 prompt，而是包含槽位值、锁定路径、偏好结构和探索轨迹的 design state。
