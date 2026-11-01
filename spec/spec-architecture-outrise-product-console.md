---
title: Outrise 本地产品管理 Agentic Console MVP
version: "1.0"
date_created: 2026-11-01
last_updated: 2026-11-01
owner: Outrise
tags: [architecture, product-management, agentic-system, markdown, local-mvp]
---

# Introduction

本规范定义 Outrise 以产品管理为第一个业务场景的本地 Agentic Console。人和 Agent 共同读取并维护同一套 Markdown 产品事实、策略、素材记录和平台 Listing 草稿。规范面向开发者、业务负责人和合作 Agent；实施细节见应用内协议与验收文档。

## 1. Purpose & Scope

通过 ERP 风格工作台管理品牌、产品线、SPU、SKU、营销策略、媒体素材，以及 Amazon、Shopify、TikTok Shop 的内部 Listing。先实现本机小规模、低频协作，不接数据库或云服务。一个业务闭环为：维护并确认事实与策略 → 选择 SKU、策略与素材 → 生成或编辑平台草稿 → 人工审阅和确认 → 本地导出。

页面文本、标签、字段和块定义运行时从 Markdown 读取。前端组件实现保留在 JavaScript，MD 负责声明数据与页面组成，不执行任意代码。所有示例数据必须明确为合成，不能冒充真实客户资料。

## 2. Definitions

| 名词 | 定义 |
| --- | --- |
| SPU | 共享产品事实的产品单位，作为 SKU 的直接父级。 |
| SKU | 可区分的产品变体，保存编码、颜色及允许覆盖的个体属性。 |
| Fact | 产品事实，与营销判断分开，记录有类型的字段值。 |
| Strategy | 人工或 Agent 提出的营销判断，显式关联适用产品范围。 |
| Asset | 媒体记录和实际文件；记录含相对 key、MIME、字节大小、内容 hash 和关联范围。 |
| Listing | 针对一个平台销售目标、一个 SPU 及所选 SKU 的内部内容草稿。 |
| Block / Region | 稳定 ID 的内容块／模板中允许容纳实体块的区域。 |
| Revision | 原始文件的 SHA-256，用于并发写入检查。 |
| Business hash | 忽略纯布局与工作状态信息的内容 hash，用于确认与下游失效判断。 |
| Confirmation | 人工审阅当前内容后产生的不可变应用快照，不等同平台发布批准。 |
| Proposal | Agent 候选修改；采纳前不覆盖当前 Listing。 |

## 3. Requirements, Constraints & Guidelines

- **REQ-001**：Markdown 是业务文本、结构字段、关系、模板、来源策略及 UI 文案的唯一维护源；JSON/HTML/索引是派生投影。
- **REQ-002**：产品层级为品牌→产品线→SPU→SKU；只实现 SKU 对直接父 SPU 的共享字段继承、显式覆盖和恢复继承。
- **REQ-003**：schema 定义类型、标签、作用层级、必填、可覆盖和可空性；类型始终校验，必填在确认时校验。
- **REQ-004**：模板通过固定模块和区域构成页面，区域控制允许类型、增删与排序；富文本块保存标准 Markdown 正文。
- **REQ-005**：来源文档/块策略与模板限制取交集；模板不能放宽来源只读。服务端与前端执行一致规则。
- **REQ-006**：实时模板不复制进实体。未知块、失配区域和超出布局的内容可见且保留，不能静默删除。
- **REQ-007**：素材支持上传、关联、元数据、预览/下载及 Listing 有序引用；保持二进制文件与 MD 记录分离。
- **REQ-008**：Listing 包含平台目标、SPU、SKU 集合、显式策略、排序素材、共享文案、SKU 内容覆盖与输入版本。
- **REQ-009**：事实和策略经人工确认；Listing 生成依据变化后提示复核，不自动覆盖已编辑文案。布局变化不触发内容失效。
- **REQ-010**：Agent 通过 CLI 读取上下文、执行受控维护、提交 Listing 候选；人工比较差异、采纳并独立确认。
- **REQ-011**：外部文件变更可更新工作台；已有未保存内容时提示冲突。解析失败显示诊断，不破坏源文件。
- **REQ-012**：本地导出规范 MD 与派生 JSON；清楚标记尚未执行官方发布校验和店铺同步。
- **SEC-001**：写入校验 revision、获取协作锁、原子替换；拒绝路径穿越、符号链接和未登记媒体读取。
- **SEC-002**：Agent 不能通过受控操作创建有效人工确认或自行采纳建议；手填 review 状态不能冒充确认快照。
- **CON-001**：V1 只运行在可信本机环境，低数据量、低访问频率；不实现登录、团队权限、多租户、生产 SLA。
- **CON-002**：不实现云对象存储、MongoDB、内置模型调用、平台授权、真实发布、库存/订单同步、OCR 或自动视频生成。
- **GUD-001**：持续检验 Agent 可读性、Agent 可访问性、人的可读性和操作易用性，不以一项优化牺牲其他三项。

## 4. Interfaces & Data Contracts

所有规范文档 frontmatter 包含 `format: outrise/1`、`id`、`kind`，业务记录包含 `name`，并通过 ID 引用 `schema`、`template` 和 `policy`。产品使用 `parent`；策略与素材使用 `scopes`；Listing 使用 `platform`、`target`、`spu`、`skus`、`strategies`、`assets`、`fields`、`variant_fields`，输入 manifest 由服务端产生。Listing 字段定义通过 `platforms` 区分 Amazon 的卖点与搜索词、Shopify 的 vendor/商品类型/标签/SEO、TikTok Shop 的品牌/类目意向；标题与正文描述为共同内容。

销售目标是 MD 配置，记录平台、账号占位、market 与 locale；演示目标不关联真实账号。同一平台、账号、市场、语言和 SPU 对应一份活动草稿，目标别名不能绕开该唯一性。

协议使用 `::fields{#facts}` 等固定叶块，以及 `:::richtext{#id region="notes" policy="local-edit"}` 容器块。业务块为顶层，块 ID 文件内唯一。完整格式、继承和权限规则见 [Markdown 协议](../apps/product-console/docs/markdown-protocol.md)。

本地 Express API 提供 bootstrap、目录、原始文档、解析视图、创建、字段/块操作、素材、确认历史、生成上下文、建议、采纳、导出和 SSE。所有修改携带 `expectedRevision`；生成建议保留 `baseRevision` 与 `inputs`。完整路径与请求约定见 [Agent/API 文档](../apps/product-console/docs/agent-workflow.md)。

CLI 公开 `read`、`validate`、`context`、`patch`、`submit`，通过同一文件服务与锁操作数据。前端使用运行时投影，不直接执行文件系统写入。未来对象存储、索引数据库与平台连接器位于服务适配边界，不改变业务 MD 为维护源的原则。

## 5. Acceptance Criteria

- **AC-001**：给定合成目录，用户可从品牌进入产品线、SPU 与 SKU，查看并维护关联事实、策略、素材和三种平台草稿。
- **AC-002**：给定 SKU 未覆盖容量，更改 SPU 容量后 SKU 跟随更新；显式覆盖后独立；恢复继承删除本地键。
- **AC-003**：给定只读来源块或固定模块，前端不能改写其结构，直接受控 API 同样拒绝越权操作。
- **AC-004**：模板移除某区域后，已有块进入未放置区，原始内容、未知属性和块 ID 保留。
- **AC-005**：输入事实、策略、所选范围或媒体内容变化后，Listing 提示复核；模板排版变化不造成业务失效。
- **AC-006**：Agent 提交候选后当前 Listing 不变；人工审阅与采纳才更新草稿；确认只能由人工完成。
- **AC-007**：两个操作使用同一旧 revision 时，后者得到冲突，不覆盖新内容；非法文件不能自动覆盖原文。
- **AC-008**：修改工作区 UI MD 可动态更新标签；重启后已有工作区内容保留，演示初始化不覆盖文件。
- **AC-009**：MD/JSON 导出可本地交接，界面不出现伪造的真实平台发布或同步状态。

具体手工步骤见 [验收清单](../apps/product-console/docs/acceptance.md)。

## 6. Test Automation Strategy

- **Test Levels**：协议单元测试、文件服务/API 集成测试、前端构建和主要流程浏览器检查。
- **Frameworks**：Node.js 内置测试运行器；HTTP 集成工具；按项目配置使用 Playwright。
- **Test Data Management**：使用可复制的合成 MD 与自制媒体；测试写入隔离临时目录，不修改演示维护源。
- **CI/CD Integration**：以 `npm test`、`npm run build` 和规范数据校验作为本地交付检查；本期不要求新增部署流水线。
- **Coverage Requirements**：覆盖关键不变量：继承、来源策略、未知内容保留、revision 冲突、路径限制、确认、输入失效和建议采纳；不设无业务依据的百分比门槛。
- **Performance Testing**：检查本地低频交互与文件监听可用；不做生产负载或多用户吞吐承诺。

## 7. Rationale & Context

用户选择产品管理验证完整 Agentic 业务链路，希望人通过 ERP 工作台操作、Agent 通过开放文件与接口协作。Markdown 适合小规模文本知识、可读变更与对象存储迁移；结构数据放入 frontmatter 使字段类型、关系和输入版本可校验。

React/Refine/Ant Design 负责管理界面；Milkdown 负责受控正文编辑，不能作为整份业务文档的私有存储格式。Express 从第一版承担文件写入与校验，避免把文件权限、并发和未来连接器塞进浏览器。当前不提前引入 MongoDB 或云服务。

## 8. Dependencies & External Integrations

### External Systems

- **EXT-001**：Codex/Claude 等外部合作 Agent，通过 MD、CLI 和本地 API 交接，不要求某一家模型 API。
- **EXT-002**：Amazon、Shopify、TikTok Shop 仅提供本期内容模板参考；本期没有远端调用。

### Third-Party Services

- **SVC-001**：运行 MVP 不依赖第三方在线服务或云账号；安装依赖需要软件包来源可访问。

### Infrastructure Dependencies

- **INF-001**：本机文件系统及可信用户权限；运行目录可写，API 绑定 loopback。
- **INF-002**：未来对象存储保存 MD 与媒体；索引数据库可保存可重建投影，不成为平行维护源。

### Data Dependencies

- **DAT-001**：合成 demo 初始化文件、实际工作区 MD、媒体文件、应用生成的历史与建议 MD。
- **DAT-002**：未来发布前读取对应平台、账号、市场和类目的当前规则，不把演示模板当作官方有效 payload。

### Technology Platform Dependencies

- **PLT-001**：JavaScript/Node.js 本地运行环境；React 管理界面、Express 本地服务、YAML/Markdown 解析与文件监听能力。

### Compliance Dependencies

- **COM-001**：真实业务内容的事实核实、素材权利与平台规则由未来接入时按业务补齐。合成数据不得冒充真实商品或认证。

## 9. Examples & Edge Cases

数量字段为 `{ value: 0.74, unit: kg }`；`weight` 缺省时继承，`weight: null` 只有 schema 允许可空时合法，恢复继承必须删除键。

模板改变区域布局无需迁移实体；无法放置的块保留。未知元数据和块不能在普通编辑中丢失。归档记录保留历史，新的活动引用不能指向无效或已归档记录。

Amazon 草稿的一组 SPU/SKU 不等同已存在的父子 ASIN；Shopify 部分 SKU 草稿不能直接作为完整列表覆盖远端；TikTok Shop 规则随市场、店铺及类目变化。上述差异由未来连接器获取规则并编译，不能在本地 MVP 中猜测。

## 10. Validation Criteria

交付需通过规范演示数据的引用、动态标签与媒体 hash 检查，相关协议/后端测试和前端构建。浏览器核验目录、继承、编辑、模板限制、媒体、确认、Agent 建议与导出流程。记录实际执行结果与限制，不能仅以文档中的检查命令作为通过证据。

提交应包含应用源码、合成维护源、需求文档和非秘密配置；本机工作区、依赖目录、缓存、凭据和个人环境数据不进入 Git。推送后验证远端提交一致。

## 11. Related Specifications / Further Reading

- [应用 README](../apps/product-console/README.md)
- [Markdown 协议](../apps/product-console/docs/markdown-protocol.md)
- [Agent/API 文档](../apps/product-console/docs/agent-workflow.md)
- [四维验收清单](../apps/product-console/docs/acceptance.md)
- [Amazon 官方 Listing 工作流](https://developer-docs.amazon/sp-api/docs/building-listings-management-workflows-guide)
- [Shopify 官方 productSet](https://shopify.dev/docs/api/admin-graphql/latest/mutations/productSet)
- [TikTok Shop 美国 Listing 政策](https://seller-us.tiktok.com/university/essay?knowledge_id=3196690250417921&role=1)
