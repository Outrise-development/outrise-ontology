# Agent 协作、CLI 与本地 API

## 工作约定

Agent 读取 Markdown、字段来源和 Listing 上下文，通过 CLI 执行合作写入；生成的 Listing 先进入建议区。人工审阅差异并采纳后仍是草稿，再由人工确认当前内容。Agent 不生成有效确认、不伪造事实、不把缺失的价格或库存填成零。

所有命令在 `apps/product-console/` 运行。`--workspace <目录>` 可指定本地数据目录；默认 `.local/workspace/`。CLI 使用与服务器相同的文件服务和协作锁，不要求浏览器页面打开。

## 常用命令

```powershell
npm run agent -- validate
npm run agent -- read spu_commuter_demo
npm run agent -- context listing_amazon_demo
```

`read` 返回原始 Markdown、解析元数据、块和源 revision。`context` 返回 `markdown`、`inputs`、`baseRevision`；它们是交接给 Codex 或 Claude 的生成上下文，不是第二份业务维护源。

PowerShell 7 中保存 UTF-8 JSON 上下文：

```powershell
npm run --silent agent -- context listing_amazon_demo |
  Set-Content -Encoding utf8NoBOM context.json
```

使用 `--silent` 避免 npm 的命令提示混入 JSON。其他 shell 也应保存 UTF-8 文本。Agent 阅读 `context.json` 的 `markdown` 与 `inputs`，生成 `proposal.md`，保持 Listing ID、格式、所选引用和输入 manifest。

```powershell
npm run agent -- submit listing_amazon_demo --file proposal.md --context-file context.json
```

可用 `--base <sha256>` 明确候选基准；它是 `--revision` 的别名。基准来自刚读取的源文档，不猜测、不使用业务 hash 替代。提交后在浏览器查看建议与差异，人工采纳。

编辑产品事实时，准备操作文件，例如 `operation.json`：

```json
{
  "operation": "fields",
  "changes": {
    "weight": { "value": 0.76, "unit": "kg" }
  }
}
```

```powershell
npm run agent -- patch sku_commuter_olive --revision <刚读取的revision> --file operation.json
```

JSON 操作文件是传输请求，不作业务数据维护源。恢复继承使用 `"unset": ["weight"]`，而不是传 `null`。冲突后重新读取、审阅新内容，再明确执行下一次操作。

## 安全写入原始 MD

编辑已有产品、模板、Schema 或界面文案文件后，通过 `write` 运行相同的协作锁和版本检查：

```powershell
npm run agent -- write template_sku --file edited-template.md --revision <刚读取的revision>
```

身份 ID 和 kind 必须保持一致。业务文档仍执行字段及来源策略检查；Schema、Policy 和界面配置通过 CLI 写入，公共模板另有专用 HTTP 维护接口，均执行结构校验。模板接口和修复方式见 [通用工作台](workbench.md)。文件监听负责检测外部变更，不代替写入前的版本检查。直接绕过协作锁写文件无法保证没有并发丢写。

下载的上下文 MD 自带 `inputs` 与 `base_listing_revision`。候选应保留二者；缺失时提交会被拒绝。JSON 导出和 MD 导出均明确标记 `publicationValidated: false`，不改变原始工作稿。

## 本地 HTTP API

请求与响应为 JSON；上传使用 multipart，MD 导出返回 `text/markdown`，事件流为 SSE。HTTP 业务编辑代表本机人工操作，CLI 代表合作 Agent。服务仅在 loopback 上提供，不构成上线认证授权。

| 方法与路径 | 用途 |
| --- | --- |
| `GET /api/health` | 本地服务状态 |
| `GET /api/bootstrap` | 动态 UI 文案、视图、schema、template、policy、销售目标和诊断 |
| `GET /api/catalog` | 业务目录；支持 kind、parent、q、archived 过滤 |
| `GET /api/documents/:id` | 原始文档、解析内容、revision |
| `GET /api/entities/:id/resolved` | 有效属性、来源、模板组成、关联、确认和失效状态 |
| `POST /api/entities` | 创建业务记录；请求 `meta` 保存 frontmatter 数据 |
| `PATCH /api/documents/:id` | 受控操作；必须提供 expectedRevision |
| `POST /api/documents/:id/confirm` | 人工确认；请求 expectedRevision |
| `GET /api/documents/:id/history` | 确认快照与来源版本 |
| `POST /api/assets` | 单文件上传；file、name、scopes，scopes 为 ID 数组的 JSON 字符串 |
| `GET /api/media/:key` | 访问已登记素材；key 可包含目录分隔 |
| `GET /api/listings/:id/context` | Agent 上下文、输入 manifest、基准 revision |
| `POST /api/listings/:id/proposals` | 提交 raw、baseRevision、inputs 候选建议 |
| `GET /api/proposals/:id` | 建议内容、当前内容与基准匹配状态 |
| `POST /api/proposals/:id/adopt` | 人工采纳；请求 expectedRevision |
| `GET /api/listings/:id/export?format=md\|json` | 本地内容导出 |
| `GET /api/events` | 文件变更与诊断事件 |

PATCH 操作名为 `fields`、`metadata`、`archive`、`captureInputs`、`updateBlock`、`addBlock`、`removeBlock`、`moveBlock`、`layout`、`template`。字段使用 `changes` 与 `unset`；块操作使用稳定 `blockId`，添加块提供 `block`。`metadata` 只允许受控的名称、父级、范围、Listing 引用及 SKU 内容等字段，不接受伪造 review、schema、policy 或任意路径。`layout.changes` 整体替换局部布局差异；`template` 操作只能采用保留当前继承链的后代模板。

错误结构为 `{ "error": { "code": "...", "details": {} } }`。revision 冲突返回 409；来源策略和固定块限制通常返回 403；格式与引用问题返回相应校验错误。客户端显示动态消息及必要诊断，不自动覆盖或自动修复源文件。

## Listing 本地导出与未来连接器

MD 导出为规范源；JSON 导出为派生交接快照。两者均是内部内容草稿，未调用 Amazon、Shopify 或 TikTok Shop 的发布接口。使用自制示意图的演示数据尤其不能当作平台合规素材。

未来连接器分开处理：

1. 从目标账号、市场、语言和类目获取当前要求。
2. 验证内部草稿并列出缺失事实或合规资料。
3. 把已确认内容编译为平台版本化 payload，上传实际媒体。
4. 经过授权后执行外部提交，处理异步审核和同步状态。

Amazon SPU 不能直接等同 ASIN；支持变体的类目可能需要不可购买父项与多个子项。Shopify `productSet` 的完整列表语义不能直接套用“选中的部分 SKU”进行覆盖。TikTok 的类目规则、授权品牌与认证要求需要按具体店铺和市场读取。本期不实现这些外部操作。

- [Amazon Listing 工作流](https://developer-docs.amazon/sp-api/docs/building-listings-management-workflows-guide)
- [Shopify productSet](https://shopify.dev/docs/api/admin-graphql/latest/mutations/productSet)
- [TikTok Shop 美国 Listing 政策](https://seller-us.tiktok.com/university/essay?knowledge_id=3196690250417921&role=1)
