---
format: outrise/1
id: spu_inuk_wuul3
kind: spu
name: WUUL3 · 21L 日常背包
schema: schema_product
template: template_spu
policy: policy_default
dataset: inuk-local-2026-11-01
imported_at: 2026-11-01
fields:
  brand: INUK
  model: WUUL3_WR
  material: 900D 再生涤纶主体，PU 涂层
  weight:
    value: 0.61
    unit: kg
  volume:
    value: 21
    unit: L
  dimensions: 420 × 280 × 125 mm（高 × 宽 × 深）
  water_resistant: true
  features:
    - Dedicated padded laptop compartment
    - Pockets for smaller essentials
    - Water-resistant coated body
    - Campus, work and city-commute use
parent: line_inuk_wuul
sources:
  - type: versioned-local-product
    url: https://nw6b3rrwnjm.feishu.cn/docx/MImhdc44QoHMUmxScrLcgYZZnXs?from=from_copylink
    revision: 520
    imported: 2026-11-01
issues:
  - id: laptop-fit-conflict
    code: SOURCE_CONFLICT
    blockId: source-record
    message: 电脑适配存在13 / 14英寸来源差异，需按实际产品核实。
    status: open
---

:::richtext{#conflicting-evidence region="notes" policy="local-edit" title="待核实：来源之间的电脑适配差异"}
- 现有Amazon稿明确13英寸与14英寸来源冲突，并暂用14英寸、要求量产实测；本地wuul3-revision-520.mjs按13英寸。保留旧稿与待核实说明。
- TikTok旧稿lightweight、1 year warranty等不是新的确认事实。
- 既有后台词包含personal item friendly，原文也提醒核对航司限制；未执行官方发布校验。

共享事实暂只保留电脑仓结构，未将13/14或15/16英寸中的任一个值当作已确认结论。旧版本参数仍见下方来源记录。
:::
:::gallery{#product-gallery region="notes" policy="local-edit" title="产品与功能素材"}
asset_inuk_wuul3_black
asset_inuk_wuul3_moka
asset_inuk_wuul3_orange
asset_inuk_wuul3_brandy
:::
:::richtext{#source-record region="notes" policy="local-edit" title="产品事实与版本依据"}
采用 WUUL3_WR revision 520：容量21L、重量610g、至多13英寸电脑。原尺寸28 × 42 × 12.5 cm按高 × 宽 × 深展示为420 × 280 × 125 mm。

历史 DETAILPAGE_032 中的19L已被原任务明确记录的人类选择21L取代。旧值仅作为来源差异保留，不改回19L。四个颜色和SKU来自该型号快照，未将官网新款WUUL集合中的灰色或其他代际替换进来。

[原产品文档](https://nw6b3rrwnjm.feishu.cn/docx/MImhdc44QoHMUmxScrLcgYZZnXs?from=from_copylink)。未取得GTIN、最新库存、认证适用范围的数据，不填默认值。
:::
:::richtext{#usage-note region="notes" policy="local-edit" title="本地测试说明"}
可在 SKU 上创建允许的字段覆盖并恢复继承；SPU 的更改会影响没有覆盖值的 SKU。营销判断在策略中维护；事实不随渠道复制。
:::
