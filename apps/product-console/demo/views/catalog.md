---
format: "outrise/1"
id: "view_catalog"
kind: "view"
name: "产品工作台"
title_key: "navigation.catalog"
navigation:
  - key: "catalog"
    label_key: "navigation.catalog"
    kinds:
      - "brand"
      - "product_line"
      - "spu"
      - "sku"
  - key: "strategies"
    label_key: "navigation.strategies"
    kinds:
      - "strategy"
  - key: "assets"
    label_key: "navigation.assets"
    kinds:
      - "asset"
  - key: "listings"
    label_key: "navigation.listings"
    kinds:
      - "listing"
tabs:
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
---

::notice{#workspace}
