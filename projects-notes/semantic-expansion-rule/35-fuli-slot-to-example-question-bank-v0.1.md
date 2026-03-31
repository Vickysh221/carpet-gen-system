# Fuli Slot to Example Question Bank v0.1

## 1. Why this document exists

这份文件不是最终问题库，
而是一个速查表：

- 当前高价值 field 分别该怎么问
- 它们主要服务哪个 slot / axes
- 什么问法切中信息缺口
- 什么问法虽然像问题，但其实不补有效信息

它的作用是帮助：
- 快速 review 问题质量
- 对齐 question planning 输出
- 判断某句问题到底是不是“对味”

---

## 2. overallImpression

### Target slot / axes
- slot: `impression`
- axes:
  - `calm`
  - `energy`
  - `softness`

### This field usually needs
- 主氛围方向
- 安静 vs 存在感
- 柔和是主目标还是次级修饰

### Good question patterns
- 你更希望它先安静下来，还是更有一点存在感？
- 你说的柔和，更像是更松弛，还是只是不要太硬？
- 你想避免的是太刺激，还是明确想往更安静那边走？
- 如果先只定一个主方向，你更在意低刺激，还是更有表现力？

### Bad question patterns
- 你喜欢 calm 还是 energy？
- softness 要不要更高？
- overall impression 你想怎么调？

### Review cue
好的 `overallImpression` 问题应该让人回答：
- 氛围方向
- 强度方向
- 气质取向

而不是让用户直接回答内部参数词。

---

## 3. colorMood

### Target slot / axes
- slot: `color`
- axes:
  - `warmth`
  - `saturation`

### This field usually needs
- 暖 / 冷方向
- 色彩克制程度
- 色彩存在感优先级

### Good question patterns
- 颜色上你更想往温一点、自然一点走，还是先把颜色收得更克制？
- 你更在意颜色别太跳，还是整体暖一点更重要？
- 如果先只补颜色方向，你更希望它温和一点，还是少一点存在感？
- 你想避免的是太冷，还是太显眼？

### Bad question patterns
- warmth 要不要提高？
- saturation 要不要降低？
- 颜色参数你更想调哪个？

### Review cue
好的 `colorMood` 问题应该让用户自然回答：
- 偏暖/偏冷
- 收一点/跳一点
- 克制/显眼

---

## 4. patternTendency

### Target slot / axes
- slot: `motif`
- axes:
  - `complexity`
  - `geometry`
  - `organic`

### This field usually needs
- 图案碎不碎
- 几何感强不强
- organic 是否是“自然”的核心含义

### Good question patterns
- 你更想先避免图案太碎，还是先少一点硬几何感？
- 你说的自然一点，更像是图案更 organic，还是只是别太规整？
- 如果先只补图案方向，你更在意图案别太花，还是别太硬？
- 你想回避的是“碎”，还是“硬”？

### Bad question patterns
- complexity 要不要降？
- geometry 要不要减？
- organic 要不要高一点？

### Review cue
好的 `patternTendency` 问题应该帮助系统区分：
- complexity
- geometry
- organic

而不是把这三者混成一个模糊“图案感”。

---

## 5. arrangementTendency

### Target slot / axes
- slot: `arrangement`
- axes:
  - `order`
  - `spacing`

### This field usually needs
- 更整齐还是更松
- 呼吸感是主目标还是次级感受
- 规整感和开放感哪个优先

### Good question patterns
- 排布上你更想更松一点、有呼吸感，还是更整齐一点？
- 你更在意透气感，还是规整感？
- 如果先补排布方向，你更想它松一点，还是稳一点？
- 你说的呼吸感，更像留白感，还是只是不要太满？

### Bad question patterns
- spacing 要不要加？
- order 要不要更高？
- arrangement 你想调哪里？

### Review cue
好的 `arrangementTendency` 问题，应该让用户自然回答：
- 松 / 紧
- 透气 / 规整
- 呼吸感 / 秩序感

---

## 6. spaceContext

### Target slot / axes
- target: `context`
- not mainly direct patch
- serves weak bias / scenario framing

### This field usually needs
- 场景
- 使用目标
- 稳定气氛还是提存在感

### Good question patterns
- 这块地毯现在主要还是想服务哪个空间场景？
- 这个空间里，你更希望它安定气氛，还是提一点存在感？
- 这是更偏卧室、客厅，还是一个更公共的空间？
- 这个空间里最想先解决的是太空、太乱，还是太冷？

### Bad question patterns
- roomType 是什么？
- spaceContext 你选哪个？

### Review cue
好的 `spaceContext` 问题不是让用户填字段，
而是让系统获得：
- context prior
- usage frame
- weak bias anchor

---

## 7. Contrast / Clarify / Anchor / Strength quick map

### Contrast question
适合：
- `prototype-conflict`
- 明确二选一裁决

典型样子：
- 你更希望 A，还是 B？

### Clarify question
适合：
- `unresolved-ambiguity`
- 一个词有多重可能含义

典型样子：
- 你说的 X，更像 A，还是 B？

### Anchor question
适合：
- `missing-slot`
- 某个高价值方向还没建立 anchor

典型样子：
- 如果先只确认一个方向，你更在意 A，还是 B？

### Strength question
适合：
- `weak-anchor`
- 方向已有，但强度不稳

典型样子：
- 你是明确想往 A 那边走，还是只是不要太 B？

---

## 8. Quick review standard

当你看到一条问题时，可以快速问自己 4 个问题：

1. 它绑定了哪个 field？
2. 它实际上在补哪个 slot / axes？
3. 它补的是 conflict、ambiguity、missing slot，还是 weak anchor？
4. 用户回答这句后，系统到底会少掉哪种不确定性？

如果这四个问题答不出来，
那这句问题大概率只是“像问题”，而不是“补信息的问题”。

---

## 9. Current recommendation

第一版 question planning review 时，优先检查这三类：
- `overallImpression`
- `patternTendency`
- `colorMood`

因为它们最直接决定：
- 主氛围方向
- 视觉 anchor
- 首轮探索质量

等这三类问法站稳后，再系统扩到：
- `arrangementTendency`
- `spaceContext`
