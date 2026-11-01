---
format: outrise/1
id: schema_basic
kind: schema
name: 品牌与产品线字段
fields:
  description:
    type: string
    label_key: fields.description
    required: false
    scope: shared
    overridable: true
    nullable: false
---

# 基础记录

品牌和产品线使用独立的基础字段；产品规格位于 SPU 与 SKU。
