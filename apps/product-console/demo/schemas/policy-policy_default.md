---
format: outrise/1
id: policy_default
kind: policy
name: 人工编辑与 Agent 协作
actors:
  human:
    fields: true
    metadata: true
    blocks: true
    confirm: true
  agent:
    fields: true
    metadata: true
    blocks: true
    confirm: false
---

人工可编辑与确认；Agent 可通过受控操作维护内容与提交建议，不能确认。
