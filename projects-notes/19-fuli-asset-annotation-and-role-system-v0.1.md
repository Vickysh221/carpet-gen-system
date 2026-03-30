# FULI Asset Annotation and Role System v0.1

## 目标
把现有 FULI 地毯图片从“可展示素材”升级为“可被系统使用的设计资产”，使它们能够进入：
- 检索
- 偏好学习
- sandbox 参考显示
- 生成 prior
- 结果评估

这意味着每张图不应只是一张图片文件，而应被理解为：

> 一个带参数标注（slot annotations）与角色定义（asset roles）的设计语义资产。

---

## 一、为什么必须做参数标注
如果现有图片没有参数标注，它们在系统里的作用会被限制在：
- 展示
- embedding 相似检索

而如果它们有参数标注，它们就可以成为：
- 参数空间中的锚点
- reducer 的参考证据
- sandbox 中“相似参数 ref”显示对象
- generation system 的 style / motif / arrangement prior
- 结果 reranking 与品牌一致性评估参考

---

## 二、为什么还需要角色系统
同一张图不只对应一个参数点，它还可能承担不同系统角色。

建议角色包括：
- `retrieval_anchor`：用于用户上传图后的初始相似检索
- `motif_prior`：可作为纹样语言先验
- `arrangement_prior`：可作为布局组织先验
- `style_prior`：可作为品牌表达方式先验
- `evaluation_reference`：可用于判断新图是否仍在 FULI 品牌空间内

因此，FULI 资产系统不只是一个图库，而是一个：

> 可被检索、可被组合、可被条件化、可被评估的品牌纹案语义资产库。

---

## 三、建议的标注优先级

### Phase 1：先做一阶参数标注（优先）
优先标注：
- Color：warmth / saturation / lightness
- Motif：geometry / organic / complexity
- Arrangement：order / spacing / direction

理由：
- 一阶参数最适合做 sandbox 相似参数 ref
- 最适合支持 early-stage reducer 与检索
- 最适合建立参数空间中的真实锚点

### Phase 2：再做二阶参数解释标签
补充：
- Impression：calm / energy / softness
- Style：graphic / painterly / heritage

理由：
- 二阶参数更主观
- 更适合作为在一阶参数基础上的解释层，而非最先做硬数值标注

### Phase 3：补角色标注
给每张图补：
- retrieval / prior / evaluation 角色
- 哪些槽位特别适合作为该图的强 prior 来源

---

## 四、推荐的数据结构

### 1. AssetSlotAnnotation
建议字段：
- `imageId`
- `slotValues`
- `confidence`
- `annotationSource`（manual / assisted / inferred）
- `notes`

### 2. AssetRoleMap
建议字段：
- `imageId`
- `roles`
- `strongSlots`
- `weakSlots`
- `brandRepresentativeness`

---

## 五、sandbox 如何使用这些资产

### 1. Base state 最近邻参考
根据当前 base state 显示 top-K 最近的 FULI 参考图。

### 2. Variant card 参考邻居
每张变体卡下显示：
- 当前参数组合更接近哪些 FULI 样本
- 这些样本在哪些槽位上接近

### 3. 参数节点附近的真实素材簇
在主测槽位附近显示：
- 当前参数区间的代表性 FULI 图片
- 让抽象参数空间获得真实设计语义落点

---

## 六、generation system 如何使用这些资产

### 1. 作为 style / motif / arrangement prior
系统可从与当前 state 接近的 FULI 图中挑选：
- 风格 prior
- 纹样 prior
- 排列 prior

### 2. 作为 reference-conditioned generation 的辅助条件
除了用户上传参考图，还可加入 FULI 资产作为品牌校正参考。

### 3. 作为结果评估基准
新图生成后，可与 FULI 资产做：
- embedding 相似度比较
- 参数空间邻近性比较
- 品牌一致性 reranking

---

## 七、一个重要原则
标注的目标不是“把所有图都标满”，而是：

> 先让这些图成为参数空间里的可用证据点。

因此，MVP 阶段应优先保证：
- 一阶参数标注相对稳定
- 不追求一开始覆盖所有参数
- 允许 annotationSource 标明来源与置信度

---

## 八、一句话总结
FULI 图片资产的真正升级，不在于“收集更多图片”，而在于：

> 把现有图片从图片文件升级为带参数标注与角色定义的设计语义资产，
> 从而让它们真正进入检索、sandbox、生成与评估闭环。
