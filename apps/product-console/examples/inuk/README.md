# INUK 真实资料测试包

整理日期：2026-11-01。用于 Outrise Product Console 的本地演示和业务流程测试。与 `demo/` 的 ORBIT 合成夹具分开维护。

## 数据范围

| 对象 | 数量 | 内容 |
| --- | ---: | --- |
| 品牌 | 1 | INUK / COMMON NATURE |
| 产品线 | 2 | WATERSHED Collection、WUUL Collection（本地型号来源口径） |
| SPU | 3 | NAVI_WR、CRUISER_WR、WUUL3_WR |
| SKU | 8 | NAVI 1色、CRUISER 3色、WUUL3 4色；沿用真实SKU编码 |
| 策略 | 4 | 品牌表达与三款产品表达 |
| 素材 | 17 | 正式文字标志、品牌内容、产品实拍、功能特写和既有交付图 |
| Listing | 9 | 三款产品各有 Amazon / Shopify / TikTok Shop US 草稿 |
| 新编候选 | 1 | NAVI Shopify 正文、标题和SEO的渠道适配，独立候选文件 |

44份实体 MD、17份媒体文件。媒体按原字节复制，合计约44.3 MiB；包含高分辨率细节图，未为测试缩小或修改原图。媒体的 `sha256`、尺寸字节数与原文件名在对应 Asset MD 中。品牌资料和照片是已有 INUK 资产，不作为开源许可内容提供；不应因仓库访问权限推导额外品牌或图片使用授权。

## 通用工作台结构补充

本包现在提供 NAVI 的五项结构化 FABE、事实与实拍引用，以及一份 Amazon 隐藏收纳图片制作提要。短标签和关系在 frontmatter，长解释及制作要求在独立正文块；已有平台文案原样保留。制作提要是根据既有方向整理的本地草稿，不是已完成图片。已有复合交付图标记为成品，其余为来源素材；未掌握的制作来源关系不补造。

CRUISER 与 WUUL3 的电脑适配差异增加显式待核实记录，便于总览提示及人工处理；不因此选择某个数值或生成确认快照。已导入本包的工作区请使用 `node scripts/upgrade-workbench.js` 预览，再用 `--apply` 应用安全升级；重新运行导入器仍会保留已有身份，不充当重置工具。

## 安全导入

先启动一次 Console，使目标工作区包含基础 Schema、Template、Policy 和虚拟销售目标。再从应用目录运行：

```powershell
node scripts/import-workspace.js --source examples/inuk
node cli/index.js validate
```

也可用 `npm.cmd run import:workspace -- --source examples/inuk`。部分 PowerShell `npm.ps1` 启动方式会吞掉带 `--` 的参数，直接调用 Node 更明确。

导入只读取本包 `entities/` 与 `media/`，不把 README 或候选当作规范文档。默认目标 `.local/workspace/`，可以加 `--workspace C:/path/to/initialized-workspace`。对完整组合引用图、字段、块权限和媒体哈希做预校验；同ID的既有数据保留，不同字节的媒体路径碰撞会中止。新文件通过共享锁和原子新增发布；失败时只回滚本批仍未被外部改动的新文件。

重新导入不是重置：已有实体即使改变名称、内容或归档，也会保留。不要删掉用户文件来重置示例，另建工作区体验即可。

## 体验入口

1. 打开 `#entity=brand_inuk`，看品牌故事和产品素材总览。
2. 展开 WATERSHED → NAVI，查看规格、隐藏侧袋与安全扣带实拍。
3. 打开 `sku_inuk_ikb2260631`，比较 SKU 自有颜色/编码和从 SPU 继承的规格。
4. 看营销策略，区分来源事实与用户利益表达。
5. 打开 NAVI 的 Listing 页，切换三个平台；比较“采用依据”“变体”“媒体”和导出。
6. 进入 Shopify → Agent 建议，审核新编渠道改稿。候选不自动采用，不代替人工确认。

首次导入不伪造 `inputs` 或历史确认。可使用界面“记录当前依据”，或通过 CLI `patch` 的 `captureInputs` 操作记录当前版本。现有来源的 `verified-local` 是来源状态，不等于这个 Console 新生成了人工确认快照。

## 来源与取舍

| 资料 | 使用范围 | 版本及边界 |
| --- | --- | --- |
| 本地 `Shopify/knowledge/brand/brand-foundation.md` | COMMON NATURE、Nature Connector、INUKERS、摄影方向 | 2026-08-23整理；最终美国Message House未见负责人签批 |
| 本地 `cruiser-studio/src/domain/navi-revision-4463.mjs` | NAVI型号、SKU、基础规格和材料结构 | 被最新4712的对应事实覆盖；不把旧方向当成新增确认 |
| [产品文档](https://nw6b3rrwnjm.feishu.cn/docx/EiD7d0vRNotaB1xrQvHcfZt8neh)的本地已回读副本 | NAVI事实、策略、已有Amazon英文稿；CRUISER/WUUL既有平台稿 | revision4712；2026-11-01用户确认任务产物，NAVI `verification_report.json` 记录写后校验成功；本轮未重新调用飞书 |
| 本地 `cruiser-revision-4256.mjs` | CRUISER三色SKU、25L、尺寸重量和结构 | revision4256；电脑适配与4712旧稿存在15/16英寸差异 |
| [WUUL产品文档](https://nw6b3rrwnjm.feishu.cn/docx/MImhdc44QoHMUmxScrLcgYZZnXs)的 `wuul3-revision-520.mjs` | WUUL3四色SKU、21L、尺寸重量与结构 | revision520；保留21L取代历史19L的人类选择，电脑适配另有13/14英寸冲突 |
| [CRUISER官网产品页](https://www.inukbag.com/products/cruiser-watershed-backpack-recycled-fabrics) | 交叉验证25L、0.8kg及900D再生聚酯PU涂层主体 | 2026-11-01检索；网页结果可能来自缓存，不导入实时价格或库存 |
| [About INUK](https://www.inukbag.com/pages/about-us)及[美国回归文章](https://www.inukbag.com/blogs/with-inukbags/inuk-back-in-the-us) | 品牌来源交叉参考 | 官方自述，不代替单品性能/认证证据 |
| 本地 INUK 品牌及产品母资产、CRUISER图片工作台、NAVI Canva既有交付 | 17份图片 | 复制既有文件；没有本轮新生成图像，也不声称所有图片都是未合成摄影 |

### 明确保留的差异

- **CRUISER电脑仓：15 / 16英寸**。revision4256规格写16英寸，4712内的既有Listing写15英寸。共享事实只保留电脑仓结构；原稿原样保存，正文增加醒目的来源差异块。
- **WUUL3电脑仓：13 / 14英寸**。revision520写13英寸，4712旧稿暂写14英寸并要求大货实测。本包没有选择一个数值作为已确认规格。
- **WUUL3容量：21L**。原任务已选择21L；19L属于已记录的旧资料。官网新款WUUL集合不能据此自动合并WUUL4/WUUL5的SKU和颜色。
- **CRUISER材料**。旧库引用通用MOUSTER章节；主体900D再生聚酯/PU涂层采用官方单品页交叉依据，未把旧库的内衬比例自动带入。
- **NAVI最新安全结构**。隐藏侧袋和侧面安全扣带来自2026-11-01已确认产品文档与实拍图号。侧扣不是锁，不做防盗保证；38L不意味着航空公司普适登机认证。
- **旧稿其他声明**。产地、一年保修、WUUL反光/行李带等旧文案仍需逐项审核。保留原稿用于比较，不把旧稿中的每一句话升级为产品事实。
- **NAVI定价**。109美元标价、约99美元长期折扣仅放入内部策略来源说明，来自用户已确认口径；没有请求当前店铺售价，也没有修改后台价格。

三个销售目标沿用默认**虚拟店铺**。没有读取或导入店铺凭据，没有提交到真实Amazon、Shopify或TikTok。品牌/产品事实全部等待人工核实，策略和Listing保持草稿。

### Listing 与候选

NAVI Amazon采用2026-11-01既有英文稿；CRUISER/WUUL3 Amazon及TikTok来自原文对应章节。三个Shopify草稿和NAVI TikTok草稿暂复制已有Amazon文案作为测试起点，正文说明尚未适配。

新写的NAVI Shopify文案放在 `candidates/listing_inuk_navi_shopify.md`，不覆盖来源草稿。首次导入后，可以按以下方式提交：

```powershell
node cli/index.js context listing_inuk_navi_shopify > .local/inuk-shopify-context.json
node cli/index.js submit listing_inuk_navi_shopify --file examples/inuk/candidates/listing_inuk_navi_shopify.md --context-file .local/inuk-shopify-context.json
```

上下文必须紧邻生成/审阅过程获取。若期间人工已修改Listing，应重新比较新版本，不能用更新后的基础版本静默覆盖。包中候选本身不携带用户工作区的输入哈希和确认状态。
