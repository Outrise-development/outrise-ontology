---
format: "outrise/1"
id: "template_listing_shopify"
kind: "template"
name: "shopify Listing 模板"
platform: "shopify"
regions:
  content:
    label_key: "blocks.description"
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
---

::notice{#draft}

::listing{#channel}

::fields{#facts}

::region{#content}

::gallery{#media}

::region{#notes}
