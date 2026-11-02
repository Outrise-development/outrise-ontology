---
format: "outrise/1"
id: "template_sku"
kind: "template"
name: "sku 视图模板"
regions:
  notes:
    label_key: "blocks.notes"
    allowed_types:
      - "richtext"
      - "gallery"
    can_add: true
    can_delete: true
    can_move: true
extends: template_product
applies_to:
  - sku
entity_kind: sku
overview_fields:
  - brand
  - model
  - material
  - volume
  - weight
  - dimensions
---

::notice{#demo}

::issues{#business-issues}

::fields{#facts}

::region{#notes}
