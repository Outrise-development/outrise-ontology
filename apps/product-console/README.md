# Outrise Product Console

本地产品管理 MVP。一个工作台管理品牌、产品线、SPU、SKU、产品事实、营销策略、媒体素材，以及 Amazon、Shopify、TikTok Shop 的内部 Listing 草稿。所有业务文本、字段、界面文案和页面块定义以 Markdown 为维护源；运行时 JSON 是派生结果。

## 启动

需要 Node.js 22.12 或更新版本。从仓库根目录运行：

```powershell
cd apps/product-console
npm ci
npm run dev
```

打开 <http://127.0.0.1:4317>。浏览器访问前端开发服务，由它代理本地 API。API 监听 `127.0.0.1:4318`。

首次运行把 `demo/` 复制到 `.local/workspace/`，只补充缺少的文件，**不会覆盖已有文件**。更改、上传文件、确认快照和 Agent 建议存放在该工作区；`.local/` 不进入 Git。演示数据全部为虚构，SVG 为仓库自制图，不代表真实产品或可用于平台发布的摄影。

```powershell
npm run build
npm start
```

构建后也可直接打开 <http://127.0.0.1:4318>。使用其他本地工作区时：

```powershell
node server/index.js --workspace C:/path/to/product-workspace
```

自定义工作区同样采用非覆盖式演示初始化。不要把生产账号、密钥或真实平台凭据放入工作区。

## 体验顺序

1. 展开 **ORBIT DEMO → Everyday Carry → Commuter 16**，查看三个颜色 SKU。
2. 打开 Olive SKU，比较继承自 SPU 的材质、容量与 SKU 自有重量；修改可覆盖字段，再恢复继承。
3. 在 SPU 补充内容区编辑文本、添加内容块、调整顺序，查看只读来源块的限制。
4. 查看品牌级及 SPU 级营销策略、三份 SVG 素材及其关联范围。
5. 打开三种平台草稿，检查所选 SKU、采用的策略、媒体排序和 SKU 内容覆盖。
6. 人工审阅并确认产品事实与策略，记录 Listing 输入版本，再确认 Listing。后续更改输入事实或媒体，会提示重新复核。
7. 准备 Agent 上下文、导入候选 Markdown、比较差异并人工采纳。导出 Markdown 或 JSON 快照供本地交接。

确认的是当前内部内容版本。它不代表平台发布审核、真实产品认证或已经同步到店铺。

## INUK 真实资料测试

已提供独立的 [INUK 数据包](examples/inuk/README.md)：品牌、2 条来源产品线、NAVI/CRUISER/WUUL3 三个 SPU、8 个真实 SKU、4 份策略、17 份本地原有图片及9份平台草稿。ORBIT 虚构夹具继续保留。

运行一次应用初始化默认工作区后，在应用目录执行：

```powershell
node scripts/import-workspace.js --source examples/inuk
```

导入器使用共享写锁，先校验引用和媒体字节，再新增文件；重复运行跳过已有 ID，不覆盖人工修改。可通过 `--workspace` 指定已初始化的其他工作区。系统 Schema/模板不由业务数据包替换。

打开 <http://127.0.0.1:4318/#entity=brand_inuk> 或直接进入 [NAVI](http://127.0.0.1:4318/#entity=spu_inuk_navi)。全部保留待核实/草稿状态。CRUISER 与 WUUL3 的电脑适配存在来源差异，页面已说明；Shopify 草稿及 NAVI TikTok 草稿暂借用既有 Amazon 文案，不代表完成渠道适配。NAVI Shopify 的新编候选在数据包内单独保存，可经 Agent 候选流程审核。

## 文件与文档

| 目录 | 用途 |
| --- | --- |
| `demo/ui/` | 界面文案、合成销售目标配置 |
| `demo/schemas/` | 字段定义及来源策略 |
| `demo/templates/` | 实时页面模板、固定块和可编辑区域 |
| `demo/views/` | 导航与视图定义 |
| `demo/entities/` | 合成业务记录 |
| `demo/media/` | 自制 SVG 演示素材 |
| `.local/workspace/` | 本机实际工作数据；不提交 Git |
| `docs/markdown-protocol.md` | Markdown、继承、来源策略、模板和安全写入约定 |
| `docs/agent-workflow.md` | Agent CLI、建议审阅与本地 API |
| `docs/acceptance.md` | 人工验收场景与四个评估维度 |

完整需求见仓库根目录 [`spec/spec-architecture-outrise-product-console.md`](../../spec/spec-architecture-outrise-product-console.md)。

## 检查

```powershell
npm run validate
npm test
npm run build
```

`validate` 默认检查 `.local/workspace/`。检查指定目录：

```powershell
npm run agent -- validate --workspace C:/path/to/product-workspace
```

浏览器验收先运行 `npm run build`，再运行 `npm run test:e2e`。默认使用本机 Microsoft Edge，并在独立临时工作区验证，不修改实际业务资料。其他系统可安装 Playwright Chromium 后设置 `PLAYWRIGHT_CHANNEL=chromium`。测试使用本机 4318 端口，运行前停止正在使用该端口的 Console 实例。

## 边界与扩展

本期为本机可信用户使用，不包含登录、团队权限隔离、云部署、MongoDB、对象存储接入、内置模型 API、平台授权、真实发布和库存同步。HTTP 服务有 loopback、Host 和 Origin 限制；`human`/`agent` 是协作身份，不构成抵御同机恶意进程的认证系统。

前端采用 React、Refine、Ant Design；富文本编辑采用 Milkdown，保留 Markdown 源。Express 提供本地文件访问、校验、并发保护和事件更新。未来可替换存储适配器接入对象存储，以 MongoDB 保存检索投影，并增加平台连接器；Markdown 协议及业务服务边界继续保留。
