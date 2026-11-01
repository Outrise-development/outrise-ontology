---
format: "outrise/1"
id: "schema_asset"
kind: "schema"
name: "素材字段"
fields:
  alt:
    type: "string"
    label_key: "fields.alt"
    required: false
    scope: "shared"
    overridable: true
    nullable: false
  role:
    type: "string"
    label_key: "fields.role"
    required: false
    scope: "shared"
    overridable: true
    nullable: false
  rights:
    type: "string"
    label_key: "fields.rights"
    required: false
    scope: "shared"
    overridable: true
    nullable: false
  synthetic:
    type: "boolean"
    label_key: "fields.synthetic"
    required: false
    scope: "shared"
    overridable: true
    nullable: false
---

# 素材字段

二进制文件不写进 Markdown；以受限相对 key 引用。
