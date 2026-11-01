---
format: outrise/1
id: readonly
kind: policy
name: 只读来源
actors:
  human:
    fields: false
    metadata: false
    blocks: false
    confirm: false
  agent:
    fields: false
    metadata: false
    blocks: false
    confirm: false
---

只读示例。修改页面模板或区域规则不能放宽此来源策略。
