# Outrise 公司介绍

面向潜在客户自行阅读的 17 页中文公司介绍，按 2026 年 10 月 24 日确认的定位与服务体系制作。核心身份为专注北美市场的 AI-native 营销与增长团队。

## 文件

- `content.zh-CN.json`：结构化逐页文案，含独立的内部溯源信息。
- `content.zh-CN.md`：便于审阅的文案；内部制作附录不进入客户发送稿。
- `build.mjs`：使用 `@oai/artifact-tool` 生成原生文字、形状及连接线。
- `output/Outrise-Company-Introduction-zh-CN-v6.pptx`：17 页可编辑 PowerPoint，保留原生连接线，已清除内部演讲备注。
- `output/Outrise-Company-Introduction-zh-CN-v6.pdf`：本地渲染预览，页面为图片，不含可选中文字。
- `output/Outrise-Company-Introduction-Client.pdf`：从正式 Canva 设计导出的客户阅读稿。
- `output/Outrise-Company-Introduction-Canva.pptx`：从正式 Canva 设计导出的 PowerPoint；Canva 会转换字体和连接对象，原生结构以本地 v6 PPTX 为准。
- `build/<revision>/`：渲染图、草稿、验证报告等本地构建文件，不提交。

文案、PPTX 与 PDF 以不同用途保存。修改业务文案时同时更新 JSON 与 Markdown；客户版请使用 `output/` 中的成品，不发送内部制作附录。

用户已确认保存及导出，原 Canva 设计已更新为 17 页。固定名称的 `Client.pdf` 和 `Canva.pptx` 均为本轮最终导出；旧 v5 文件保留作版本记录。

## 重建

在仓库根目录运行（本机 Codex 内置运行时）：

```powershell
& 'C:/Users/zx/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node.exe' `
  'docs/presentations/outrise-company-introduction/build.mjs' --revision=v7
```

每次修改使用新的 revision，以保留已核验版本。依赖 `@oai/artifact-tool`、其 `skia-canvas` 依赖、Codex 演示文稿校验工具及 Python 运行时；中文字体为 Microsoft YaHei。其他设备可覆盖以下路径：

- `CODEX_PRESENTATION_NODE_MODULES`：包含 `@oai/artifact-tool` 的 node_modules 目录。
- `CODEX_PRESENTATION_SKILL_DIR`：包含 `container_tools/artifact_tool_utils.mjs` 的 presentations 技能目录。
- `CODEX_PRESENTATION_PYTHON`：Python 可执行文件路径。

生成后核对 `build/<revision>/validation.json`，并检查全部页面渲染。自动校验不替代 PowerPoint 或 Canva 的实际显示检查。

## 本次验证

- 本地 v6 PPTX：17 页，结构、布局、字体及导入检查通过，0 个错误、0 个警告；全部页面已目检。
- 客户版文案中的 CMO 恰好出现一次，仅位于合作形式正文；页码为 01–17，末四页为负责、合作、案例、联系。
- 正式 Canva PDF 共 17 页，逐页目检无重叠、截断或内容不完整；第 2、3 页依次为公司定位、参与方式，页码 01–17 连续。
- 最终 Canva PPTX 共 17 页，248 个可编辑文字框、342 个原生形状，无栅格化图片；页序及关键修改文案正确，CMO 仅在第 15 页正文出现一次，备注正文为空。
- Canva 导出将字体转换为 Arimo / Arimo Bold，连接线转换为普通形状。建议用本地 v6 PPTX 继续编辑以保留 Microsoft YaHei 和原生连接线，用 Client PDF 对外阅读。未使用桌面 PowerPoint 实际打开验证。

## 原稿与备份

- [正式 Canva 公司介绍（保留原设计链接）](https://www.canva.com/design/DAHJ3RS5Apo/8IDN8yFkOp6oCWBjg80G6w/edit)
- [2026 年 10 月 24 日修改前完整备份（16 页）](https://www.canva.com/d/-PBEJm9gV-YuT5q)
- [2026 年 8 月版完整备份（21 页）](https://www.canva.com/design/DAHYYxvNYtI/zvAdWzBT0ydfEfX9CZI-Zg/edit)

八月备份包含原正式页、归档分界及全部历史页；10 月 24 日备份保留本轮修改前的完整 16 页。新版只包含 17 页客户介绍。原始私密会议逐字稿和授权诊断数据不随此目录提交。
