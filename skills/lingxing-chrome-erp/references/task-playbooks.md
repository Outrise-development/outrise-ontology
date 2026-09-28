# Task playbooks

按当前任务读取对应章节。快捷导出不需要阅读全部业务流程；具体入口与恢复方法见 [导出操作手册](export-workflows.md)。

## 导出与周报素材

遵循 [技能入口](../SKILL.md) 的快捷导出流程：筛选 → 原生导出 → 下载完成 → 返回文件位置。下载文件取得后即完成取数；不打开文件检查表头、工作表、行数、金额、日期或产品覆盖，不计算 SHA256，也不制作筛选副本、清洗 CSV、索引、截图证据、审计报告或 ZIP。

只能整店导出时原样交付整店文件，说明范围，不在本地筛选产品。不为完整性核对额外切换父 ASIN、MSKU、周/月等视图或重复导出日报与汇总。批量修改的一条记录试行规则不适用于导出。

“准备周报素材”优先复用用户提供或上下文中范围已明确适用的原表，只补缺失项；不为复用而开表核验。素材取得后不自动撰写周报、复算指标或补采跨周期资料。用户还要求操作记录 MD 等其他明确交付时完成该交付，不扩展为全套审计包。导出故障继续按具体原因恢复，不能因不做数据验证就跳过尚未下载的文件。

## 周报、总结与分析

优先使用用户提供或本次上下文中已有、范围适用的原始文件。只补取报告实际需要的缺失资料，不默认重下全部数据；“像上次一样”复用报表范围和文风，不自动继承旧任务的审计和打包步骤。

先完成取数，再进入所请求的计算与撰写。此阶段可以读取文件、筛选产品、聚合指标和解释口径；不自动追加逐文件验证、哈希、跨报表对账或重复采集。输入解析失败或计算遇到具体阻碍时，仅处理该阻碍，不启动无关全面核验。

按请求保留店铺、期间、币种、粒度及来源口径；不要把不可取得的数据补零，也不要把当前库存或当前广告配置称为历史快照。仅在用户要环比、月累计或对应模板明确需要时获取额外周期。发布周报与导出分开：外部写入按授权执行，回读目标段落和写入结果，不把发布检查倒置为导出前置条件。

## Initialization

Follow this order unless the user requests a narrower task: authorize store → authorize advertising (if needed) → bind service mailbox (if needed) → configure departments/roles/users → create local products/SKUs → pair online MSKUs to SKUs → set owners → create warehouses and, if needed, import initial inventory → configure exchange rates and optional purchasing entities/templates.

The official guide notes that store authorization is under Settings → Store Authorization, that advertising authorization requires the store's primary mailbox, and that sync completion can take time. Verify authorization status rather than assuming access is ready. Changes to roles, authorizations, or exchange rates require the scope authorization described in SKILL.md.

## Product and listing

Use **SKU** for Lingxing's local product code and **MSKU** for Amazon's online product code. Check the requested store/marketplace and the pairing before editing stock, costs, or listing-related fields. For a bulk pairing or owner assignment, review the template rules and preview row errors before importing. Publishing and bulk listing changes require scope authorization.

## Purchasing, FBA, warehouse, and logistics

Start from the requested business document and trace upstream/downstream links: product → plan/order → receiving/inventory → FBA/first-leg shipment. Confirm warehouse, supplier, SKU, quantities, units, destination, and dates. A warehouse location-management setting can be irreversible once enabled. Creating, submitting, approving, voiding, or syncing a supply-chain document is consequential; use the authorization rules in SKILL.md.

## Advertising

For exports, use only the requested report type, store, marketplace, period, ad types, source and available product filters; do not inspect campaign metrics or live settings as a prerequisite. Follow the export reference for native report creation and download.

For analysis, use the reports or dashboard needed to answer the question. For bid, budget, status, target, rule, or bulk changes, identify the campaign/ad group/target and current setting, then summarize the proposed scope and delta. Apply the authorization rules in SKILL.md and confirm the resulting setting. Never infer an ad-account authorization or campaign status from another store.

## Customer service

Verify order and buyer context, marketplace, language, case status, and message history before a customer-service action. Draft a reply first when possible. Sending a message, review request, after-sales email, or RMA outcome requires scope authorization. Do not expose buyer personal data in summaries beyond what is necessary.

## Finance and reporting

Set the requested marketplace/store, report type, currency, date range, and filters once before export; do not interpret or reconcile downloaded figures merely to complete the export. For profit, resolve whether the requested report is order profit, settlement profit, or another financial report only when the request and context do not already identify it.

Interpretation belongs to the analysis phase above. Treat exchange-rate, cost, invoicing, settlement, payment, and inventory-accounting changes as high impact. Exporting a report is read-only; sending or uploading it elsewhere is a separate action governed by the user's requested destination and authorization.

## Troubleshooting

For export failures, use the specific recovery paths in [export-workflows.md](export-workflows.md), preserving the requested scope and existing tasks. A successful server generation is not proof of a completed download; file delivery does not require opening or auditing the workbook.

For business-operation failures, check selected store/platform, record status, required upstream data, role/field permission, and data-sync time as relevant to the failed action. Search the official Help Center with the exact visible label when needed. Escalate only the concrete missing authority or user-only action; never circumvent permissions or alter security settings to work around a failure.
