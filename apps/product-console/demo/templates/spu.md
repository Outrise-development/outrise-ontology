---
format: "outrise/1"
id: "template_spu"
kind: "template"
name: "spu 视图模板"
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
  - spu
entity_kind: spu
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
