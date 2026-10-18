# Outrise 公司介绍

面向潜在客户自行阅读的 16 页中文公司介绍，按 2026 年 10 月确认的定位与服务体系制作。

## 文件

- `content.zh-CN.json`：结构化逐页文案，含独立的内部溯源信息。
- `content.zh-CN.md`：便于审阅的文案；内部制作附录不进入客户发送稿。
- `build.mjs`：使用 `@oai/artifact-tool` 生成原生文字、形状及连接线。
- `output/Outrise-Company-Introduction-zh-CN-v5.pptx`：16 页可编辑 PowerPoint，保留原生连接线，已清除内部演讲备注。
- `output/Outrise-Company-Introduction-zh-CN-v5.pdf`：本地渲染预览，页面为图片，不含可选中文字。
- `output/Outrise-Company-Introduction-Client.pdf`：从正式 Canva 设计导出的客户阅读稿。
- `output/Outrise-Company-Introduction-Canva.pptx`：从正式 Canva 设计导出的 PowerPoint；Canva 会转换字体和连接对象，原生结构以本地 v5 PPTX 为准。
- `build/<revision>/`：渲染图、草稿、验证报告等本地构建文件，不提交。

文案、PPTX 与 PDF 以不同用途保存。修改业务文案时同时更新 JSON 与 Markdown；客户版请使用 `output/` 中的成品，不发送内部制作附录。

## 重建

在仓库根目录运行（本机 Codex 内置运行时）：

```powershell
& 'C:/Users/zx/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node.exe' `
  'docs/presentations/outrise-company-introduction/build.mjs' --revision=v6
```

每次修改使用新的 revision，以保留已核验版本。依赖 `@oai/artifact-tool`、其 `skia-canvas` 依赖、Codex 演示文稿校验工具及 Python 运行时；中文字体为 Microsoft YaHei。其他设备可覆盖以下路径：

- `CODEX_PRESENTATION_NODE_MODULES`：包含 `@oai/artifact-tool` 的 node_modules 目录。
- `CODEX_PRESENTATION_SKILL_DIR`：包含 `container_tools/artifact_tool_utils.mjs` 的 presentations 技能目录。
- `CODEX_PRESENTATION_PYTHON`：Python 可执行文件路径。

生成后核对 `build/<revision>/validation.json`，并检查全部页面渲染。自动校验不替代 PowerPoint 或 Canva 的实际显示检查。

## 本次验证

- 本地 v5 PPTX：16 页，结构、布局、字体及导入检查通过，0 个错误、0 个警告。
- 正式 Canva PDF：16 页，逐页检查无正文重叠或截断，中文文字可选择复制。
- Canva 导入会转换字体并恢复自动折行；已为中文行宽预留空间，并以最终 Canva PDF 复核。未使用桌面 PowerPoint 实际打开验证。

## 原稿与备份

- [正式 Canva 公司介绍（保留原设计链接）](https://www.canva.com/design/DAHJ3RS5Apo/8IDN8yFkOp6oCWBjg80G6w/edit)
- [2026 年 8 月版完整备份（21 页）](https://www.canva.com/design/DAHYYxvNYtI/zvAdWzBT0ydfEfX9CZI-Zg/edit)

备份包含原正式页、归档分界及全部历史页。新版只包含 16 页客户介绍。原始私密会议逐字稿和授权诊断数据不随此目录提交。
