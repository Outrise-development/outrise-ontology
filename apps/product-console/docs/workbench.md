# 通用产品工作台

## 页面与操作

所有品牌共用 MD 模板及组件，不存在 INUK 专属页面代码。品牌和产品线展示目录、定位和适用内容；SPU 使用总览、产品资料、卖点与定位、素材与制作、平台方案五个分区。SKU 位于所属 SPU 的产品资料中，矩阵用于比较有效事实，逐个 SKU 编辑与保存。

默认阅读态，点击“编辑本节”进入字段表单。正文仍按块使用 Milkdown 保存。点击字段或引用可打开来源抽屉，查阅不会清空当前编辑。共享值、专属值与覆盖值分别显示；恢复继承删除 SKU 覆盖键。

总览只根据结构化诊断、显式问题、确认状态、来源变化和待审候选显示事项，不从自由正文推测产品争议。确认仍作用于单份来源文档，不会因工作台聚合多份资料就批量确认。

平台工作区包含平台准备、商品文案、图片与详情、审核交付。文案字段、当前内容和依据相邻显示；内容候选先比较业务字段与媒体，完整 MD 可在高级信息查看。虚拟店铺、内部校验及导出边界不变。

## 模板继承与局部调整

模板 `extends` 只能指向一个父模板 ID。基础模板提供默认权限和区域；产品类型模板提供分区；叶子模板声明 `applies_to` 及其固定模块。实体的 `template` 指向叶子模板。

```yaml
extends: template_product
applies_to: [spu]
sections:
  - key: overview
    component: overview
    label_key: workbench.overview
layout_permissions:
  sections:
    overview: { can_hide: true, can_move: true }
  blocks:
    facts: { can_hide: false, can_move: false }
```

允许的组件由应用注册，MD 不执行 JavaScript。固定块及区域拥有稳定 ID，不能用在子模板中重复写同一个 ID 的方式隐式替换父块；使用显式覆盖：

```yaml
overrides:
  demo:
    attrs: { title_key: workbench.overview }
```

权限沿父链收紧，区域允许类型取交集，容量取更严格值；来源 Policy 继续约束人与 Agent。实例 `layout_overrides` 仅保存获准的隐藏与顺序差异，不复制父模板内容。新增、删除和移动正文块继续使用现有区域操作。

上游收紧后，曾合法但已不兼容的局部设置保留并显示诊断，停止应用；新提交的越权操作拒绝。区域消失、块类型不再允许或超过容量时，内容保留在未放置区域。固定模块移除也不删除其绑定事实。

公共模板维护是独立操作，校验继承链、覆盖、绑定及受影响页面后立即生效。界面保存前必须预览当前内容的影响范围；再次编辑会使该预览失效，保存时仍重新校验。Agent 通过专用接口提交不增加人工采用流程。模板修订与产品确认记录分开保存。恢复历史模板是一次新的版本写入。未经协作协议直接写坏模板时保留文件、报告诊断，并阻止相关业务写入。

## 业务模块与引用

不增加实体种类：FABE 和定位属于 Strategy；原始文件与交付成品属于 Asset；平台制作方案属于 Listing 的独立正文块。跨平台共享方案可保存在 Strategy。

```yaml
selling_points:
  - id: point-storage
    priority: 1
    blockId: benefit-storage
    feature: 隐藏收纳结构
    advantage: 小物分区收纳
    benefit: 移动时方便取用
    evidence: [ref-structure]
refs:
  - id: ref-structure
    documentId: spu_example
    field: features
    usedBy: benefit-storage
    note: 引用有效的产品结构事实
```

短标签、条目身份、业务优先级、关系在 frontmatter；长解释在 `blockId` 指向的正文。`documentId` 是引用目标，可选 `field` 或 `blockId` 精确定位；`usedBy` 指向当前文档的字段、块或卖点条目 ID。不要把照片编号或任意 Markdown URL 当成内部 ID。

```markdown
:::richtext{#image-plan region="notes" policy="local-edit" purpose="brief" status="draft" title="图片方案"}
## Headline
## Supporting copy
## 画面与动作
## 素材与制作
## 事实依据
## 执行边界
:::
```

素材 `asset_stage` 为 `source` 或 `final`，`source_assets` 关联来源 Asset。成品分类不等于平台发布审核通过。已有素材未知制作来源时保留空关系，不编造关联。

显式待处理问题使用 `issues: [{id, code, field?, blockId?, message, status}]`，状态为 `open` 或 `resolved`。`open` 问题阻止该文档确认；在产品资料中处理后可标记已解决，也可重新打开。来源冲突只记录尚未解决的差异，不代替产品事实。

引用和实际依赖纳入服务端校验、Agent 上下文及 Listing 输入版本。引用到字段或块用于精确阅读，确认与版本仍以其所属文档为单位。外部来源 URL 与原始 revision 保留其出处性质，不自动获得确认。

纯布局、页面排序及 UI 文案不进入业务摘要；卖点优先级、引用关系、正文、采用的素材与最终图片顺序进入业务摘要。

## API 与 Agent

现有读取、PATCH、候选、确认与导出接口继续使用。`resolved` 补充有效模板、应用实例调整前的 `baseTemplate`、`templateChain`、`templateDiagnostics`、`references` 和 `issues`。实例布局操作：

```json
{"expectedRevision":"<当前内容哈希>","operation":"layout","changes":{"sections":{"overview":{"order":0}},"blocks":{"demo":{"hidden":true}}}}
```

`changes` 整体替换 `layout_overrides`；删除某个覆盖键即恢复继承。切换页面子模板使用 `operation: "template"` 和 `template: "<后代模板ID>"`，必须保留当前模板的继承链。

公共模板接口：

| 接口 | 用途 |
| --- | --- |
| `POST /api/templates` | `{raw}`，创建通过校验的子模板 |
| `GET /api/templates/:id/source` | 实际磁盘 MD 及 revision，包括需要修复的无效文件 |
| `POST /api/templates/:id/preview` | `{raw, expectedRevision?}`，查看影响和诊断 |
| `PUT /api/templates/:id` | `{raw, expectedRevision}`，校验后直接生效 |
| `GET /api/templates/:id/history` | 模板修订历史 |
| `POST /api/templates/:id/restore` | `{historyId, expectedRevision}`，以新修订恢复 |

Agent 可以通过现有 `write` 写入模板，或通过 `patch` 修改允许的业务内容；与 API 共用写锁、CAS 和校验。Agent 仍不能确认、采用候选，不能用模板维护权限静默替换 Listing 内容。

CLI 提供 `template-source`、`template-preview`、`template-create`、`template-history`、`template-restore`。创建和预览通过 `--file` 读取 MD；恢复通过 JSON 文件提供 `historyId`，并携带 `--revision`。修复无效模板前使用 `template-source` 获取磁盘 revision；普通 `read` 可能返回最后有效投影，不能作为修复写入的版本依据。

## 升级现有工作区

新版首次初始化仍不覆盖已存在文件。已有工作区需显式运行升级：

```powershell
node scripts/upgrade-workbench.js
node scripts/upgrade-workbench.js --apply --expected-plan <预览返回的planRevision>
```

可附 `--workspace` 指定工作区。预览与执行共用三方差异算法：已知原始基线、新版配置、当前文件。自定义值和未知属性保留，冲突进入报告；新增内容块不得覆盖同 ID 的人工内容。未安装的 INUK 业务记录不会自动创建。

执行持有协作锁，校验最终组合图，备份将被修改的文件到 `.history/config-upgrades/` 后再原子写入。失败会尝试回滚本批仍未被外部改动的文件；任何保留项都会报告。重复执行不重复添加内容。原有确认快照和候选记录不修改，新增业务依据可能合理触发来源变化提示。

INUK 示例新增的 FABE 和图片提要来自既有产品资料的结构整理，保持草稿；CRUISER 与 WUUL3 的电脑适配争议继续待核实。界面可用于任何产品，不要求已有这些示例内容。
