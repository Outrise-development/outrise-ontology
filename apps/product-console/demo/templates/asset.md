---
format: "outrise/1"
id: "template_asset"
kind: "template"
name: "素材模板"
regions:
  notes:
    label_key: "blocks.notes"
    allowed_types:
      - "richtext"
      - "gallery"
    can_add: true
    can_delete: true
    can_move: true
extends: template_base
applies_to:
  - asset
entity_kind: asset
sections:
  - key: assets
    component: assets
    label_key: workbench.assets
panels:
  - preview
  - fields
  - usage
  - references
  - document
  - scope
  - technical
---

::notice{#demo}

::gallery{#media}

::fields{#facts}

::region{#notes}
