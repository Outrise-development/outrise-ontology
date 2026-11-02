---
format: outrise/1
id: listing_inuk_navi_amazon
kind: listing
name: NAVI / Amazon US / 来源文案草稿
schema: schema_listing
template: template_listing_amazon
policy: policy_default
dataset: inuk-local-2026-11-01
imported_at: 2026-11-01
fields:
  title: INUK NAVI 38L Carry On Travel Backpack, Water-Resistant, Black Forest
  bullet_points:
    - "Leave the wheels behind: Pack for a short getaway in a 38L travel backpack. Padded shoulder straps and a cushioned back panel add comfort on stairs and transfers; grab handles make it easy to lift when boarding."
    - "Keep essentials tucked away: A concealed side zip pocket keeps your phone out of sight. Side buckle straps add another fastening across the main compartment; unclip them when you want to open it fully."
    - "See what you packed: The clamshell opening lets you lay out clothes and essentials like a suitcase. Internal straps, mesh pockets and smaller pockets help keep items organized, so you can find what you need."
    - "Keep going through light rain: The 900D coated recycled polyester body helps protect belongings from light rain and everyday splashes as you move between stations, streets and outdoor stops."
    - "Go from commute to day out: Keep keys and small essentials organized, with room for a jacket and day-trip gear. A padded sleeve provides space for a laptop up to 16 inches when your plans call for one."
  search_terms:
    - weekender rucksack holiday vacation unisex trolley sightseeing excursions
platform: amazon
target: target_amazon_us
spu: spu_inuk_navi
skus:
  - sku_inuk_ikb2260631
strategies:
  - strategy_inuk_brand
  - strategy_inuk_navi
assets:
  - asset_inuk_navi_main
  - asset_inuk_navi_hidden
  - asset_inuk_navi_buckle
  - asset_inuk_navi_lifestyle
  - asset_inuk_navi_specs
source_copy:
  type: existing-local-listing
  source_platform: amazon
  url: https://nw6b3rrwnjm.feishu.cn/docx/EiD7d0vRNotaB1xrQvHcfZt8neh
  revision: 4712
  region: NAVI_WR / Amazon
  cross_channel_adaptation: source-copy
refs:
  - id: title-capacity
    documentId: spu_inuk_navi
    field: volume
    usedBy: title
    note: 容量来自共享产品事实。
  - id: bullets-positioning
    documentId: strategy_inuk_navi
    field: positioning
    usedBy: bullet_points
    note: 五项核心利益按策略顺序表达。
  - id: bullet-storage
    documentId: strategy_inuk_navi
    blockId: benefit-storage
    usedBy: bullet_points
    note: 隐藏收纳与扣带，不作防盗保证。
  - id: description-boundaries
    documentId: spu_inuk_navi
    blockId: source-record
    usedBy: description
  - id: brief-hidden-photo
    documentId: asset_inuk_navi_hidden
    usedBy: brief-storage
  - id: brief-buckle-photo
    documentId: asset_inuk_navi_buckle
    usedBy: brief-storage
---

:::richtext{#description region="content" policy="local-edit" title="Product description"}
A short escape should leave you free to explore. Pack clothes and everyday essentials in NAVI's 38L main compartment, then carry your trip on your back when your packing needs allow you to leave the rolling suitcase at home. Padded shoulder straps and a cushioned back panel make the walk more comfortable, while grab handles help when boarding or setting the bag down.

Keep your phone out of sight in the concealed side zip pocket. Side buckle straps add another fastening across the main compartment; unclip them to open the bag fully. At your destination, the clamshell opening lays out your packing like a suitcase. Internal straps and mesh pockets help keep clothes and small items in place.

For daily commutes and day trips, keep familiar essentials in their own pockets and switch the main compartment to suit your plans. A padded sleeve provides space for a laptop up to 16 inches. The water-resistant, 900D coated recycled polyester body helps protect belongings from light rain and everyday splashes on the way from city streets to outdoor stops. A luggage pass-through is there for journeys when you bring a suitcase too.

Capacity: 38L. Dimensions: 19.1 H x 12.6 W x 7.9 D inches (485 H x 320 W x 200 D mm). Weight: approximately 2.6 lb (1.2 kg). Laptop fit depends on device dimensions. Check your airline's current carry-on size and weight limits before travel. Not intended for immersion or prolonged heavy rain. Includes one backpack; packing props and other items shown are not included.
:::
:::richtext{#import-note region="notes" policy="local-edit" title="文案来源与渠道状态"}
本草稿复制既有 amazon 文案作为测试起点；保留原文字供审核。 来源产品文档 revision 4712。三种销售目标都是演示虚拟店铺，不连接任何真实账号，不读取实时价格/库存。

尚未完成人工确认与官方发布校验。新生成的渠道改稿应提交候选，再由你比较、采用和确认。

原稿 Item Highlights：Hands-free travel, concealed storage and suitcase-style packing for short getaways, day trips and daily commutes.
:::

:::richtext{region="notes" policy="local-edit" purpose="brief" status="draft" title="图片方案 · 隐藏收纳与侧扣" id="brief-storage"}
## Headline

Keep essentials tucked away

## Supporting copy

A concealed side zip pocket and side buckle straps help keep your carry organized.

## 画面与动作

组合隐藏侧袋细节和侧面扣带细节，让结构与操作位置可见。

## 素材与制作

使用已登记的细节图11与14；本记录是制作提要，尚未指定交付成品。

## 事实依据

引用 NAVI 产品结构、隐藏侧袋实拍与侧扣实拍。根据已读取产品文档的套图方向整理为本地制作草稿；不是新增性能确认。

## 执行边界

侧扣不是锁。不能表达防盗保证，不增加实际产品没有的结构。
:::
