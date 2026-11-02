---
format: outrise/1
id: template_base
kind: template
name: 通用页面基础
applies_to:
  - brand
  - product_line
  - spu
  - sku
  - strategy
  - asset
  - listing
regions:
  notes:
    label_key: blocks.notes
    allowed_types:
      - richtext
      - gallery
    can_add: true
    can_delete: true
    can_move: true
layout_permissions:
  sections:
    overview:
      can_hide: true
      can_move: true
    facts:
      can_hide: false
      can_move: true
    strategies:
      can_hide: true
      can_move: true
    assets:
      can_hide: true
      can_move: true
    listings:
      can_hide: true
      can_move: true
  blocks:
    facts:
      can_hide: false
      can_move: false
    demo:
      can_hide: true
      can_move: true
    draft:
      can_hide: true
      can_move: true
    channel:
      can_hide: true
      can_move: true
    media:
      can_hide: true
      can_move: true
---
