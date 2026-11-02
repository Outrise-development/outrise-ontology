# INUK 导入与界面检查

执行日期：2026-11-01（America/New_York）。

- 当前工作区新增44份实体、17份媒体；保留34份原有MD及3份ORBIT素材。总计78份有效规范文档，CLI校验无诊断。
- 全部INUK实体保持待核实或草稿；没有生成任何INUK人工确认快照。
- 九份Listing已在实际本地工作区记录当前输入依据；派生JSON导出均成功，`publicationValidated`均为false。
- NAVI Shopify渠道候选单独提交，携带实际基础Listing版本和输入清单；原草稿未被覆盖，候选未被采用。
- 实际HTTP读取17份素材，逐一核对响应字节的SHA-256与素材MD一致。
- 实际Edge检查：品牌图集完整加载、NAVI产品图集完整加载、SKU容量显示继承来源、三平台编辑页可切换、Shopify候选差异弹窗展示新正文；无浏览器运行异常。
- 修复默认`.local/workspace`目录图片被`sendFile`误判为隐藏文件的403。新增真实HTTP回归覆盖隐藏父目录可读、工作区内隐藏素材仍拒绝、未登记素材拒绝、路径穿越拒绝。
- 自动回归：32项协议/数据导入/服务端测试通过；生产构建通过。Vite仍报告既有大chunk建议，不阻碍本地运行。

浏览器截图位于本机被Git忽略的`output/playwright/inuk-brand.png`、`inuk-navi.png`和`inuk-proposal.png`。真实工作区、候选提交时间、运行时输入哈希和确认历史不提交到Git；版本库保存可再次导入的来源数据包和独立候选内容。

数据质量差异见README：CRUISER电脑适配15/16英寸、WUUL3电脑适配13/14英寸未解决；Shopify草稿及NAVI TikTok仍是跨渠道复制的起点。它们未通过真实发布校验。
