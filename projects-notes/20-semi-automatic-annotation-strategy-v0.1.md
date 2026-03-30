# Semi-Automatic Annotation Strategy v0.1

## 目标
解决一个现实问题：

> 如果每张 FULI 图都要完整人工标注参数，这会变成体力活。

因此，本策略的目标不是追求“全人工精细标满”，而是建立一条：

> **种子人工标注 → 自动初标 → 人工校正 → 持续变聪明**

的半自动标注流水线。

---

## 一、核心原则

### 原则 1：不要一开始就标满 21 个数
MVP 阶段应优先保证：
- 一阶参数可用
- 标注一致性高于覆盖完整性
- 标注能直接服务 sandbox / reducer / retrieval

### 原则 2：先做“可用标注”，再做“完整标注”
如果系统已经能利用一阶参数完成：
- 最近邻参考显示
- 初始 state bootstrap
- 变体解释

那标注系统就已经开始创造价值。

### 原则 3：标注必须带来源与置信度
任何自动或半自动标注都不应假装与人工同样可靠。

建议每条标注至少带：
- `annotationSource`：manual / assisted / inferred / inherited
- `confidence`：low / medium / high

---

## 二、推荐的三段式流程

### Stage 1：种子人工标注（small but high-quality）
先选出 10–15 张最有代表性的 FULI 样本，进行较认真人工标注。

### 为什么先做小样本
- 这批图会成为参数空间的种子锚点
- 后续很多自动映射都要依赖它们
- 先少量做稳，比一口气标 50 张更有价值

### 种子图选择原则
优先覆盖：
- 色彩差异明显的样本
- motif 语言差异明显的样本
- arrangement 组织差异明显的样本
- 品牌里最有代表性的 style 倾向样本

---

### Stage 2：自动初标（machine-assisted bootstrapping）
对未标图，系统先给出一个“初始参数猜测”。

建议的初标来源有三类：

#### A. 最近邻继承（nearest labeled neighbors）
流程：
1. 对新图做 embedding 检索
2. 找最近的 3–5 张已标种子图
3. 按距离加权平均，得到初始参数猜测

**优点：**
- 工程最简单
- 很适合当前 50 张规模
- 与现有项目结构兼容性高

#### B. 槽位分开初标
不要一次性输出 21 维完整参数。

建议：
- Color：由图像统计特征自动提
- Motif / Arrangement：由近邻继承 + 轻规则初猜
- Impression / Style：由一阶参数推导一个解释性初值

#### C. Cluster prior
先对图片做聚类，每个 cluster 有一个共同 prior。

流程：
1. embedding 聚类
2. 给 cluster 命名与设定大致参数中心
3. 新图先继承所在 cluster prior
4. 再做局部微调

**价值：**
- 减少单图从零标注压力
- 让素材库逐渐形成语义区域

---

### Stage 3：人工校正（human correction, not full manual annotation）
人工不再从零填写，而是在初标基础上：
- 快速确认大致合理项
- 只修改明显错误项
- 暂时跳过不确定项

这一步的目标是：
- 降低劳动量
- 提高一致性
- 逐步积累更好的种子数据

---

## 三、推荐的标注顺序

### Pass 1：一阶参数
优先标：
- Color：warmth / saturation / lightness
- Motif：geometry / organic / complexity
- Arrangement：order / spacing / direction

### 为什么先标一阶参数
- 最适合进入 sandbox 最近邻 ref
- 最适合支持 preference learning
- 最适合建立参数空间中的真实锚点

---

### Pass 2：二阶解释参数
再补：
- Impression：calm / energy / softness
- Style：graphic / painterly / heritage

### 注意
二阶参数更适合作为：
- 一阶参数的上层解释
- 半自动推导结果 + 人工确认

而不是最早期硬打绝对数值。

---

### Pass 3：角色标注
最后补：
- retrieval_anchor
- motif_prior
- arrangement_prior
- style_prior
- evaluation_reference

这一步会让素材真正进入 generation system。

---

## 四、比绝对打分更省力的方法

### 1. 相对标注（pairwise / relative annotation）
与其问：
- geometry = 0.63 吗？

不如问：
- 图 A 比图 B 更 geometric 吗？
- 图 A 比图 C 更 calm 吗？
- 图 A 在 spacing 上比图 D 更疏吗？

### 为什么值得考虑
- 更符合人类直觉
- 一致性更高
- 后续可以再拟合成连续参数空间

### 推荐使用场景
- Motif / Arrangement 这类较主观但又很关键的维度
- 二阶参数的辅助校正

---

### 2. 语义标签先行，再映射参数
可以让视觉模型/规则系统先输出：
- warm
- muted
- geometric
- orderly
- calm

然后再映射成参数初值。

### 为什么比直接输出连续值更稳
- 模型通常更擅长先做语义判断
- 连续值拟合可以放在下一步做

所以更好的自动链路是：

> 图像 → 语义标签 → 参数映射

而不是：

> 图像 → 21 个连续值

---

## 五、推荐的数据字段
每张素材图建议包含：

### AssetSlotAnnotation
- `imageId`
- `slotValues`
- `annotationSource`
- `confidence`
- `notes`

### AssetRoleMap
- `imageId`
- `roles`
- `strongSlots`
- `weakSlots`
- `brandRepresentativeness`

### Optional
- `clusterId`
- `nearestSeedIds`
- `lastReviewedAt`

---

## 六、sandbox 如何直接复用这些半自动标注结果

### 1. Base state 最近邻参考
当前 base state 可显示最接近的 FULI 已标素材。

### 2. Variant 邻居图
每张变体卡显示：
- 哪些真实素材在参数上更接近它
- 为什么接近（Color / Motif / Arrangement）

### 3. 参数区间附近的素材簇
当用户处于某个参数节点时，显示对应 cluster 的代表图。

这会让 sandbox 从抽象数值空间变成“有真实品牌样本落点”的空间。

---

## 七、MVP 阶段最推荐的组合路线
当前最推荐的不是单一方法，而是：

### `种子人工标注 + 最近邻继承 + cluster prior + 人工校正`

也就是：
1. 先精标小批代表图
2. 用最近邻和 cluster 做自动初标
3. 人工只做快速纠偏
4. 逐步扩大可用标注集

这是当前最省力、也最可持续的路线。

---

## 八、一句话总结
FULI 素材标注不应被做成“全人工重体力填表”，而应被做成：

> 一个由种子人工标注、自动初标、人工校正和持续反哺组成的半自动标注系统，
> 让素材逐步从图片集合升级为真正可被 sandbox、reducer、generation system 使用的设计资产库。
