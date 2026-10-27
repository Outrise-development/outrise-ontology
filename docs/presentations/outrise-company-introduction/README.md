# Outrise 公司介绍

## 最新更新：v8.2（2026-10-27）

当前正式稿为 **20 页**，已按用户确认的完整预览保存到原 Canva 链接。第 14—17 页分别展示 Inner Brightness、ARTILUME、INUK 品牌基础、INUK 整合执行；其他 16 页保留原文字、图片及位置，仅更新页码。此前第 5、9 页专业协作与用户的其他修改继续保留。

- [Canva 正式稿](https://www.canva.com/design/DAHZJb1YZpA/Yay0Ln747v8xpgpBw7MDGw/edit)
- [可编辑 PPTX](revisions/outrise-v8.2-intro_ppt169_20261027/exports/Outrise-Intro-Deck-v8.2.pptx)
- [客户阅读 PDF](revisions/outrise-v8.2-intro_ppt169_20261027/exports/Outrise-Intro-Deck-v8.2.pdf)
- [本版来源、制作源与验收](revisions/outrise-v8.2-intro_ppt169_20261027/README.md)

后续修改以 v8.2 文案、生成器、保存后的 Canva 及最终导出为准。下方 v8.1、v8、v7 均为历史记录，不用于恢复当前稿的文案或页序。

## 历史更新：v8.1（2026-10-27）

已在当前 Canva 原位更新第 5、9 页，并保留用户在其他页面的修改。专业协作明确为开放的能力示例，突出需求判断与资源连接，技术搭建取代旧 PR 示例。见 [本次交付与验证](revisions/outrise-v8-intro_ppt169_20261026/updates/20261027-professional-collaboration/README.md)。`latest.json` 已指向本次实际 Canva 导出的 PPTX 和 PDF；下方 v8 文件保留为 2026-10-26 的历史交付。

## 完整版基准：v8

2026-10-26 已完成 **C｜品牌展示式的 17 页完整版**，采用批准的 Outrise Brand Guidelines v2.0 暖色系统，并重整逻辑、语言与版面。后续修改请以 [v8 项目](revisions/outrise-v8-intro_ppt169_20261026/README.md) 的文案、品牌资源和生成器为准，避免旧稿恢复。

- [独立 Canva 完整稿](https://www.canva.com/design/DAHZJb1YZpA/Yay0Ln747v8xpgpBw7MDGw/edit)
- [原生可编辑 PPTX](revisions/outrise-v8-intro_ppt169_20261026/exports/Outrise-Intro-Deck-v8.pptx)
- [客户 PDF](revisions/outrise-v8-intro_ppt169_20261026/exports/Outrise-Intro-Deck-v8-Canva.pdf)
- [Canva 对应 PPTX](revisions/outrise-v8-intro_ppt169_20261026/exports/Outrise-Intro-Deck-v8-Canva.pptx)
- [审阅与验证](revisions/outrise-v8-intro_ppt169_20261026/REVIEW-v8.md)

`latest.json` 指向当前交付。以下 v7 说明为历史制作记录，原设计替换的等待状态属于当时记录，不适用于已经独立交付的 v8。v7 文案、生成器和文件保留用于追溯。

## 历史版本：v7

面向潜在客户自行阅读的 17 页中文公司介绍。公司定位为“专注北美市场的 AI-native 营销与增长团队”。2026 年 10 月 25 日的本地 v7 已应用批准的 Outrise VI 1.0，保留现有业务文案与客户介绍结构。

## 当前状态

本地 v7 PPTX 与 PDF 已生成，本地结构、布局、字体策略和导入校验通过。Canva 的 17 页品牌预览也已完成，PDF 字体及逐页视觉检查通过；**仍在等待用户确认整页替换原设计，尚未发布到原链接。**

`output/Outrise-Company-Introduction-Client.pdf` 与 `output/Outrise-Company-Introduction-Canva.pptx` 已准备为 v7，均来自核验后的独立品牌预览；PPTX 另完成字体名称规范化及完整字体嵌入。文件准备与原 Canva 设计的替换是两项独立操作；当前原设计仍保留修改前内容。

## 文件

- `content.zh-CN.json`：结构化逐页文案，含独立的内部溯源信息。
- `content.zh-CN.md`：便于审阅的文案；内部制作附录不进入客户发送稿。
- `build.mjs`：使用 `@oai/artifact-tool` 生成原生文字、形状及连接线，并调用字体注册、嵌入与最终校验。
- `brand-assets/outrise-vi-v1/`：批准的黑白 Logo、颜色与排版 tokens、原始变量字体、六个完整静态字体、OFL 许可及 SHA256 清单。
- `output/Outrise-Company-Introduction-zh-CN-v7.pptx`：本地 17 页可编辑版本，使用批准字体并嵌入全部六个静态字重；保留原生文字、形状及连接线。
- `output/Outrise-Company-Introduction-zh-CN-v7.pdf`：本地渲染预览，页面为图片，不含可选中文字。
- `output/Outrise-Company-Introduction-Client.pdf`：来自已核验 Canva 品牌预览的 v7 客户阅读稿，包含可选中文字。
- `output/Outrise-Company-Introduction-Canva.pptx`：来自同一品牌预览的 v7 可编辑 PowerPoint，已规范化六种正式字体名称、移除合成粗体并嵌入完整静态字体。
- `VALIDATION-v7.md`：本地原生版、Canva 预览和交付文件的验证记录及发布边界。
- `output/` 中带 v2–v6 的文件：历史版本记录。
- `build/<revision>/`：渲染图、草稿、字体嵌入收据和验证报告等本地构建文件，不提交。

修改业务文案时同时更新 JSON 与 Markdown。对外发送时核对文件版本，不发送内部制作附录或构建目录。

## 品牌与字体

品牌来源为 `Design/output/outrise-logo/manual-v1`，批准版本日期为 2026 年 10 月 24 日。主色为墨黑 `#111111`、米白 `#F4F1E9` 与钴蓝 `#2454FF`，另配白色、灰色与分隔线色；具体值以品牌包 `tokens.json` 为准。Logo 使用批准的原始 PNG，保持比例与安全区。

英文和数字使用 Instrument Sans，中文使用 Noto Sans SC。正文为 400，标题与标签为 500，展示文字为 600。构建使用六个正式静态 face 名选择准确字重，不通过 `bold: true` 模拟 500 或 600。字体保留完整字符集，没有裁剪中文；原始变量字体及 OFL 许可同时保留。

- `tools/register-fonts.mjs`：在当前 Node/Skia 进程中注册字体，用于测量和渲染，不安装系统字体。
- `tools/embed-pptx-fonts.py`：在 artifact-tool 导出后、最终校验前，使用 Windows 官方接口生成完整 EOT 字体部件并加入 PPTX。设置 `embedTrueTypeFonts=1`、`saveSubsetFonts=0`，保留原有幻灯片及其他非字体部件的字节内容。
- `tools/prepare-static-fonts.py`：按官方 named instances 从原始变量字体重新生成 400/500/600；仅重新生成时需要项目私有的 fontTools 依赖。

上述工具均位于 `brand-assets/outrise-vi-v1/`。来源、准确字体名称、嵌入实现、Windows 同名字体提示与兼容性说明见 [FONT-USAGE.md](brand-assets/outrise-vi-v1/FONT-USAGE.md)。字体嵌入面向支持该功能的应用；Canva 导入或再导出可能改变字体处理，必须单独复核。

## 重建

在仓库根目录运行（当前构建包含 Windows 字体嵌入步骤）：

```powershell
& 'C:/Users/zx/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node.exe' `
  'docs/presentations/outrise-company-introduction/build.mjs' --revision=v7
```

加上 `--samples` 可仅输出第 1、2、5 页样张至构建目录，样张同样嵌入字体。每次修改使用新的 revision，以保留已核验版本。

依赖 `@oai/artifact-tool`、其 `skia-canvas` 依赖、Codex 演示文稿校验工具、Python 运行时及 Windows 字体嵌入 API。通过 `load_workspace_dependencies` 获取当前主机的内置运行时路径；其他设备可覆盖以下配置：

- `CODEX_PRESENTATION_NODE_MODULES`：包含 `@oai/artifact-tool` 的 node_modules 目录。
- `CODEX_PRESENTATION_SKILL_DIR`：包含 `container_tools/artifact_tool_utils.mjs` 的 presentations 技能目录。
- `CODEX_PRESENTATION_PYTHON`：Python 可执行文件路径。

构建先生成 `candidate.raw.pptx`，再嵌入字体生成 `candidate.pptx`，随后执行最终校验。核对 `build/<revision>/embedded-fonts.json`、`validation.json` 和全部页面渲染。字体嵌入工具当前需要 Windows；不在其他系统静默跳过。

## 本地 v7 验证

- 17 页，结构、布局、字体策略与导入校验通过；最终收据中 0 个错误、0 个警告，全部页面已目检。
- 页码为 01–17；第 2、3 页依次为公司介绍、参与方式，末四页为负责、合作、案例、联系。客户文案中的 CMO 恰好一次，仅位于第 15 页合作正文。
- 字体策略检出 Instrument Sans 与 Noto Sans SC 的 Regular、Medium、SemiBold 六个 face，430 处文字字体使用检查通过。
- 六个 EOT 部件包含完整静态字体，解码后 SHA256 与批准资源一致；嵌入步骤保留全部 17 个幻灯片 XML 的字节内容。未进行系统字体安装。
- 本地 PDF 是渲染预览。自动检查及本地渲染不代表桌面 PowerPoint 或 Canva 已完成实际显示验证；本轮未使用桌面 PowerPoint 打开。

## Canva 导入与导出

本次 Canva 的 PPTX 导入未直接保留这两套自定义字体，混合中英文的文字框在批量换字体时也丢失了分段字体。为保留视觉和编辑能力，单独生成每个对象只包含一种书写系统和一个字体的导入版本：

```powershell
& 'C:/Users/zx/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node.exe' `
  'docs/presentations/outrise-company-introduction/build.mjs' --canva-fragments --revision=v7-canva-fragments

& 'C:/Users/zx/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/python.exe' `
  'docs/presentations/outrise-company-introduction/tools/prepare-canva-import.py'
```

该模式只写入 `build/v7-canva-fragments/`，不覆盖正式本地 v7。430 个原生文字对象保留逐页文字顺序、视觉位置与原有断行；透明文字框预留导入宽度，字形位置不变。`tools/prepare-canva-import.py` 仅接受这种单字体对象，并以六种互不冲突的 Canva 字体作为传输映射。字体上传与导入后，在 Canva 中按下表选中目标**字体家族**并应用全稿；不要将混排文字框整段替换，也不要重新选用自动生成的字重。

| 导入字体 | 上传的目标家族 | 目标字重 |
| --- | --- | --- |
| Arimo | Instrument Sans | 400 |
| Source Sans 3 Medium | Instrument Sans | 500 |
| Inter Bold | Instrument Sans | 600 |
| Noto Sans | Noto Sans SC | 400 |
| Montserrat Medium | Noto Sans SC | 500 |
| Roboto Bold | Noto Sans SC | 600 |

上传 `build/v7-canva-fragments/canva-import.pptx`；它是字体传输中间稿，不作为客户 PowerPoint 交付。导出后，用 `tools/review-pptx-export.py <导出.pptx> --reference build/v7-canva-fragments/candidate.pptx --strict-copy --summary` 对照分片源；用 `tools/review-pdf-fonts.py --source <导出.pdf> --report <报告.json>` 检查实际 PDF 字体。以上相对路径从本演示文稿目录运行。两个检查均不能代替 17 页的视觉复核。

`tools/review-pdf-fonts.py` 逐字检查 PDF 的中文和英文实际字体，忽略标点与空白。当前 17 页预览检查为 0 个字体问题，六个正式 face 均存在；全页对照本地 v7 未发现重新换行、重叠、裁切或混排错位。Canva 的文字有轻微统一基线偏移及细线栅格差异，未影响阅读。PDF 文字提取可能采用字形等价的 Unicode 映射，文案保真以可编辑 PPTX 的逐页文字顺序检查为准。

当前 [Canva 品牌预览](https://www.canva.com/design/DAHZEPqf5B0/TBoRYMpGPXMVAJnlb0PcIA/edit)（`DAHZEPqf5B0`）仍为独立设计。客户 PDF 已从该预览准备；原设计的整页替换仍待用户确认。

## Canva PPTX 字体规范化

Canva 原始导出包含 `Semi-Bold` 别名，并在 Medium、SemiBold 上设置 `b=true`。本地批准字体使用 `SemiBold` 正式 face 名，准确字重已包含在字体文件中。`tools/normalize-canva-pptx-fonts.py` 将已识别的品牌字体别名规范化、为对应文字显式设置 `b=0`，移除 Canva 原有嵌入字体，再由独立嵌入工具加入六个完整静态字体。这样处理保留 Canva 的页面、文字、位置与形状。

以下命令从本演示文稿目录运行；在其他设备上替换内置 Python 路径。输入为保留的 Canva 原始导出，输出必须另存：

```powershell
$outrisePython = 'C:/Users/zx/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/python.exe'
& $outrisePython tools/normalize-canva-pptx-fonts.py `
  --source '<Canva 原始导出.pptx>' `
  --output build/v7-canva-fragments/canva-review/canva-normalized.pptx `
  --report build/v7-canva-fragments/canva-review/font-normalization.json

& $outrisePython brand-assets/outrise-vi-v1/tools/embed-pptx-fonts.py `
  --input build/v7-canva-fragments/canva-review/canva-normalized.pptx `
  --output build/v7-canva-fragments/canva-review/canva-portable.pptx `
  --receipt build/v7-canva-fragments/canva-review/font-embedding.json `
  --require-windows-parser

& $outrisePython tools/review-pptx-export.py build/v7-canva-fragments/canva-review/canva-portable.pptx `
  --reference build/v7-canva-fragments/candidate.pptx --strict-copy --summary
```

规范化工具仅允许字体别名、对应粗体属性和旧字体包元数据变化，校验全部文字与几何不变；它不重新生成幻灯片。当前收据确认 17 页、430 个文字 run 和 89 个无关包部件保留；嵌入收据确认六个完整字体及 17 页 XML 保持。可移植文件的 finalizer 为 0 个错误、1 条已复核的旋转线边界提示，字体策略与重新导入通过；17 页导入渲染未发现缺字、裁切、叠字或额外换行。该渲染器相对 Canva PDF 有轻微中英基线差，不影响可读性。`canva-normalized.pptx` 尚未嵌入字体，不作为交付稿。最终文件、校验值和应用验证边界见 [VALIDATION-v7.md](VALIDATION-v7.md)。

## 原稿与备份

- [正式 Canva 公司介绍（保留原设计链接）](https://www.canva.com/design/DAHJ3RS5Apo/8IDN8yFkOp6oCWBjg80G6w/edit)
- [2026 年 10 月 25 日 VI 重排前备份（17 页）](https://www.canva.com/d/AQ3MUOSkLoQ-2tZ)，设计 ID：`DAHZD9OwBxE`。
- [2026 年 10 月 24 日修改前完整备份（16 页）](https://www.canva.com/d/-PBEJm9gV-YuT5q)
- [2026 年 8 月版完整备份（21 页）](https://www.canva.com/design/DAHYYxvNYtI/zvAdWzBT0ydfEfX9CZI-Zg/edit)

八月备份包含原正式页、归档分界及全部历史页；10 月 24 日备份保留当时修改前的 16 页；10 月 25 日备份保留 VI 重排前的 17 页版本。原始私密会议逐字稿和授权诊断数据不随此目录提交。
