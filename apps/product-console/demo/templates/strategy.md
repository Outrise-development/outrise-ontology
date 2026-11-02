---
format: "outrise/1"
id: "template_strategy"
kind: "template"
name: "营销策略模板"
regions:
  content:
    label_key: "blocks.content"
    allowed_types:
      - "richtext"
    can_add: true
    can_delete: true
    can_move: true
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
  - strategy
entity_kind: strategy
sections:
  - key: strategies
    component: strategies
    label_key: workbench.strategies
panels:
  - selling_points
  - document
  - references
  - briefs
  - scope
---

::notice{#demo}

::fields{#facts}

::region{#content}

::region{#notes}
