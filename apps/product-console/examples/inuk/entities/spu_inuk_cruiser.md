---
format: outrise/1
id: spu_inuk_cruiser
kind: spu
name: CRUISER · 25L 通勤背包
schema: schema_product
template: template_spu
policy: policy_default
dataset: inuk-local-2026-11-01
imported_at: 2026-11-01
fields:
  brand: INUK
  model: CRUISER_WR
  material: 900D 再生聚酯纤维主体，PU 涂层（官网产品页自述）
  weight:
    value: 0.8
    unit: kg
  volume:
    value: 25
    unit: L
  dimensions: 460 × 290 × 150 mm（高 × 宽 × 深）
  water_resistant: true
  features:
    - Wide-opening main compartment
    - Padded laptop compartment
    - Quick-access front pocket
    - Rear safety pocket
    - Dual side bottle pockets
    - Padded adjustable shoulder straps
    - Whistle sternum strap
parent: line_inuk_watershed
sources:
  - type: versioned-local-product
    url: https://nw6b3rrwnjm.feishu.cn/docx/EiD7d0vRNotaB1xrQvHcfZt8neh?from=from_copylink
    revision: 4256
    imported: 2026-11-01
---

:::richtext{#conflicting-evidence region="notes" policy="local-edit" title="待核实：来源之间的电脑适配差异"}
- 既有 Amazon/TikTok 文案均写15英寸电脑；本地cruiser-revision-4256.mjs写16英寸。原样保留旧稿，不作为已核实规格。
- 旧稿含Made in China与1 year warranty，当前新Console确认前应核对对应产地与售后政策。

共享事实暂只保留电脑仓结构，未将13/14或15/16英寸中的任一个值当作已确认结论。旧版本参数仍见下方来源记录。
:::
:::gallery{#product-gallery region="notes" policy="local-edit" title="产品与功能素材"}
asset_inuk_cruiser_black
asset_inuk_cruiser_sage
asset_inuk_cruiser_purple
asset_inuk_cruiser_features
asset_inuk_cruiser_opening
asset_inuk_cruiser_outdoors
:::
:::richtext{#source-record region="notes" policy="local-edit" title="产品事实与版本依据"}
容量、重量、尺寸、三色SKU、16英寸电脑仓和结构来自本地 CRUISER revision 4256。原尺寸顺序为宽 × 高 × 深290 × 460 × 150 mm，此处已明确换算为高 × 宽 × 深。

[官网产品页](https://www.inukbag.com/products/cruiser-watershed-backpack-recycled-fabrics)交叉支持25L、0.8kg及900D再生聚酯PU涂层主体。旧本地材料字段引用通用MOUSTER章节，因此不自动采用其210D内衬回收比例。可拆腰带的图像表达仍需画面能看见拆卸机构。本次不写塑料瓶数量。

[原产品文档](https://nw6b3rrwnjm.feishu.cn/docx/EiD7d0vRNotaB1xrQvHcfZt8neh?from=from_copylink)。未取得GTIN、最新库存、认证适用范围的数据，不填默认值。
:::
:::richtext{#usage-note region="notes" policy="local-edit" title="本地测试说明"}
可在 SKU 上创建允许的字段覆盖并恢复继承；SPU 的更改会影响没有覆盖值的 SKU。营销判断在策略中维护；事实不随渠道复制。
:::
