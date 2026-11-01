---
format: "outrise/1"
id: "schema_listing"
kind: "schema"
name: "平台草稿字段"
fields:
  title:
    type: "string"
    label_key: "fields.title"
    platforms: ["amazon", "shopify", "tiktok"]
    required: true
    scope: "shared"
    overridable: true
    nullable: false
  bullet_points:
    type: "array"
    label_key: "fields.bullet_points"
    platforms: ["amazon"]
    required: false
    scope: "shared"
    overridable: true
    nullable: false
  search_terms:
    type: "array"
    label_key: "fields.search_terms"
    platforms: ["amazon"]
    required: false
    scope: "shared"
    overridable: true
    nullable: false
  tags:
    type: "array"
    label_key: "fields.tags"
    platforms: ["shopify"]
    required: false
    scope: "shared"
    overridable: true
    nullable: false
  seo_title:
    type: "string"
    label_key: "fields.seo_title"
    platforms: ["shopify"]
    required: false
    scope: "shared"
    overridable: true
    nullable: false
  seo_description:
    type: "string"
    label_key: "fields.seo_description"
    platforms: ["shopify"]
    required: false
    scope: "shared"
    overridable: true
    nullable: false
  vendor:
    type: "string"
    label_key: "fields.vendor"
    platforms: ["shopify"]
    required: false
    scope: shared
    overridable: true
    nullable: false
  product_type:
    type: "string"
    label_key: "fields.product_type"
    platforms: ["shopify"]
    required: false
    scope: shared
    overridable: true
    nullable: false
  brand:
    type: "string"
    label_key: "fields.brand"
    platforms: ["tiktok"]
    required: false
    scope: shared
    overridable: true
    nullable: false
  category:
    type: "string"
    label_key: "fields.category"
    platforms: ["tiktok"]
    required: false
    scope: shared
    overridable: true
    nullable: false
---

# Listing 草稿字段

本模板为内部内容草稿，不代表官方平台发布校验。
