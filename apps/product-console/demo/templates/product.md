---
format: outrise/1
id: template_product
kind: template
name: 通用产品页面标准
extends: template_base
applies_to:
  - brand
  - product_line
  - spu
  - sku
sections:
  - key: overview
    component: overview
    label_key: workbench.overview
  - key: facts
    component: facts
    label_key: workbench.facts
  - key: strategies
    component: strategies
    label_key: workbench.strategies
  - key: assets
    component: assets
    label_key: workbench.assets
  - key: listings
    component: listings
    label_key: workbench.listings
overview_panels:
  - hero
  - issues
  - children
  - selling_points
  - channels
sku_columns:
  - sku_code
  - color
  - weight
  - volume
hero_roles:
  - product-reference
  - product
  - main
---
