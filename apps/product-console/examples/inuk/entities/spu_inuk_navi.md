---
format: outrise/1
id: spu_inuk_navi
kind: spu
name: NAVI · 38L 旅行背包
schema: schema_product
template: template_spu
policy: policy_default
dataset: inuk-local-2026-11-01
imported_at: 2026-11-01
fields:
  brand: INUK
  model: NAVI_WR
  material: 900D 涂层再生涤纶主体
  weight:
    value: 1.2
    unit: kg
  volume:
    value: 38
    unit: L
  dimensions: 485 × 320 × 200 mm（高 × 宽 × 深）
  water_resistant: true
  features:
    - 38L main compartment
    - Suitcase-style clamshell opening
    - Internal clothing straps and mesh pockets
    - Concealed side zip pocket
    - Side buckle straps across the main compartment
    - Padded shoulder straps and cushioned back panel
    - Backpack carry, grab handles and luggage pass-through
    - Padded sleeve for laptops up to 16 inches
parent: line_inuk_watershed
sources:
  - type: versioned-local-product
    url: https://nw6b3rrwnjm.feishu.cn/docx/EiD7d0vRNotaB1xrQvHcfZt8neh?from=from_copylink
    revision: 4712
    imported: 2026-11-01
---

:::gallery{#product-gallery region="notes" policy="local-edit" title="产品与功能素材"}
asset_inuk_navi_main
asset_inuk_navi_hidden
asset_inuk_navi_buckle
asset_inuk_navi_lifestyle
asset_inuk_navi_specs
:::
:::richtext{#source-record region="notes" policy="local-edit" title="产品事实与版本依据"}
NAVI 最新产品文档从 revision 4702 更新到 4712（2026-11-01）；规格、隐藏侧袋与侧面安全扣带已有用户确认及实拍图11/14等依据。原始来源状态保留，当前 Console 仍等待人工确认。

尺寸统一为高 × 宽 × 深；最大16英寸电脑仍取决于机身尺寸。侧扣只描述为跨主仓固定的安全扣带，不是拉链锁，不作防盗保证。小雨防护不等于防水或浸水保护。旧版4463仅补充型号、颜色、材质和基础结构，最新4712优先。

[原产品文档](https://nw6b3rrwnjm.feishu.cn/docx/EiD7d0vRNotaB1xrQvHcfZt8neh?from=from_copylink)。未取得GTIN、最新库存、认证适用范围的数据，不填默认值。
:::
:::richtext{#usage-note region="notes" policy="local-edit" title="本地测试说明"}
可在 SKU 上创建允许的字段覆盖并恢复继承；SPU 的更改会影响没有覆盖值的 SKU。营销判断在策略中维护；事实不随渠道复制。
:::
