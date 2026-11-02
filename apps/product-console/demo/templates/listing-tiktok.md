---
format: "outrise/1"
id: "template_listing_tiktok"
kind: "template"
name: "tiktok Listing 模板"
platform: "tiktok"
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
extends: template_base
applies_to:
  - listing
entity_kind: listing
sections:
  - key: listings
    component: listings
    label_key: workbench.listings
listing_sections:
  - key: preparation
    label_key: listing.stage_preparation
  - key: content
    label_key: listing.stage_content
  - key: creative
    label_key: listing.stage_creative
  - key: review
    label_key: listing.stage_review
---

::notice{#draft}

::listing{#channel}

::fields{#facts}

::region{#content}

::gallery{#media}

::region{#notes}
