---
format: "outrise/1"
id: "strategy_commuter_demo"
kind: "strategy"
name: "Commuter 16 产品营销策略"
schema: "schema_strategy"
template: "template_strategy"
policy: "policy_default"
demo: true
scopes:
  - "spu_commuter_demo"
fields:
  objective: "Prepare a consistent channel draft for the fictional Commuter 16."
  audience: "Weekday commuters carrying a laptop and daily essentials."
  positioning: "Organized carry for the weekday routine."
  key_messages:
    - "Lead with organization and laptop storage."
    - "Show the chosen color accurately."
    - "Keep shared features consistent across variants."
  channels:
    - "Amazon"
    - "Shopify"
    - "TikTok Shop"
selling_points:
  - id: point-organization
    priority: 1
    blockId: product-angle
    feature: Shared product organization
    advantage: Keep channel descriptions consistent across colors.
    benefit: Understand the weekday carry use case.
    evidence:
      - ref-commuter-facts
refs:
  - id: ref-commuter-facts
    documentId: spu_commuter_demo
    field: features
    usedBy: product-angle
---

:::richtext{#product-angle region="content" policy="local-edit" title="渠道表达决策"}
## Channel adaptation

- Amazon: describe specific features in separate bullets.
- Shopify: explain the daily use story and product details.
- TikTok Shop: keep the main title descriptive and group color choices as variations.

These are local content directions, not marketplace eligibility or publication approval.
:::
