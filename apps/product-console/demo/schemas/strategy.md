---
format: "outrise/1"
id: "schema_strategy"
kind: "schema"
name: "营销策略字段"
fields:
  objective:
    type: "string"
    label_key: "fields.objective"
    required: false
    scope: "shared"
    overridable: true
    nullable: false
  audience:
    type: "string"
    label_key: "fields.audience"
    required: false
    scope: "shared"
    overridable: true
    nullable: false
  positioning:
    type: "string"
    label_key: "fields.positioning"
    required: false
    scope: "shared"
    overridable: true
    nullable: false
  key_messages:
    type: "array"
    label_key: "fields.key_messages"
    required: false
    scope: "shared"
    overridable: true
    nullable: false
  channels:
    type: "array"
    label_key: "fields.channels"
    required: false
    scope: "shared"
    overridable: true
    nullable: false
---

# 策略字段

策略表达人工判断，与产品事实分开存放。
