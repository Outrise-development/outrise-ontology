---
format: "outrise/1"
id: "schema_product"
kind: "schema"
name: "产品事实字段"
fields:
  brand:
    type: "string"
    label_key: "fields.brand"
    required: false
    scope: "shared"
    overridable: false
    nullable: false
  model:
    type: "string"
    label_key: "fields.model"
    required: false
    scope: "shared"
    overridable: false
    nullable: false
  material:
    type: "string"
    label_key: "fields.material"
    required: false
    scope: "shared"
    overridable: false
    nullable: false
  weight:
    type: "quantity"
    label_key: "fields.weight"
    required: false
    scope: "shared"
    overridable: true
    nullable: false
  volume:
    type: "quantity"
    label_key: "fields.volume"
    required: false
    scope: "shared"
    overridable: true
    nullable: false
  dimensions:
    type: "string"
    label_key: "fields.dimensions"
    required: false
    scope: "shared"
    overridable: true
    nullable: false
  water_resistant:
    type: "boolean"
    label_key: "fields.water_resistant"
    required: false
    scope: "shared"
    overridable: true
    nullable: false
  features:
    type: "array"
    label_key: "fields.features"
    required: false
    scope: "shared"
    overridable: true
    nullable: false
  sku_code:
    type: "string"
    label_key: "fields.sku_code"
    required: true
    scope: "sku"
    overridable: true
    nullable: false
  color:
    type: "string"
    label_key: "fields.color"
    required: true
    scope: "sku"
    overridable: true
    nullable: false
---

# 产品事实

品牌、产品线、SPU 和 SKU 共用字段定义；SKU 只保存自己的事实或允许覆盖的属性。
