# v7 验证记录

日期：2026-10-25。范围：17 页公司介绍及制作资源。品牌依据：Outrise Brand Guidelines v1.0；业务文案以当前 Canva 原设计为准。

## 原设计与备份

- 原设计：`DAHJ3RS5Apo`。发布前再次读取的更新时间为 `1792966002`，与制作基准一致，仍为 17 页。
- 重排前完整备份：`DAHZD9OwBxE`，17 页。
- 已保存的独立品牌预览：[`DAHZEPqf5B0`](https://www.canva.com/design/DAHZEPqf5B0/TBoRYMpGPXMVAJnlb0PcIA/edit)，17 页。当前尚未替换原设计。

## 本地原生版本

- `output/Outrise-Company-Introduction-zh-CN-v7.pptx` SHA256：`d40fc5f749493be75071c1609c5f9c0df240ba7c8535ae59d53bbaf8fc5eda42`。
- 17 页，页码连续；CMO 仅在第 15 页正文出现一次，邮箱仅在第 17 页出现一次。
- Finalizer：0 个错误、0 个警告。17 页视觉检查通过。
- 所有文字、形状及 74 条连接线保持原生可编辑；17 个正式 Logo 图片保留比例。
- 六个完整静态字体以 EOT 嵌入；解码后的校验值与批准源文件相同。无系统字体安装。

## Canva 预览

- 独立传输版本将混排文字拆为 430 个单字体、单书写系统的原生文字对象；每页文字顺序与本地源一致，忽略排版空白后无差异。
- PDF 全 17 页逐字字体检查：0 个问题。中文使用 Noto Sans SC，英文与数字使用 Instrument Sans；400、500、600 六个 face 均存在，无 CJK 回退。
- 全 17 页与本地版本并排检查：无重新换行、重叠、裁切、混排错位或内容缺失。Canva 的字体基线存在统一轻微偏移，细线栅格显示略有差异，不影响阅读。
- 原始 Canva PPTX：17 页、430 个可编辑文本框，逐页文字顺序与分片源一致。Instrument Sans 的 400/500/600 文本对象数为 76/10/6；Noto Sans SC 为 222/91/25。
- Canva 会重算文本框高度和顶边，并把连接对象转换为可编辑线形状；不能仅用文本框边界差异判断字形漂移，已结合 PDF 渲染复核。
- PDF 的文字提取会使用部分字形等价的 Unicode 映射；可编辑 PPTX 中的原始文字检查通过。

## Canva PPTX 可移植字体处理

- 原始 Canva 导出 SHA256：`d95198385a154f5ad7b75c3096ee2f2f0eb1de0f5a00db73df0d5ba9eed02988`。
- `tools/normalize-canva-pptx-fonts.py` 将 `Semi-Bold` 规范为批准的 `SemiBold` face，并清除对应品牌文字的合成粗体，使用 `b=0` 配合静态字重。
- 规范化检查：17 页、430 个文字 run；字体之外的 XML 语义、全部文字和几何保持；89 个无关包部件逐字节一致。六种 face 的 run 数与上述原始导出统计一致。
- `embed-pptx-fonts.py` 替换 Canva 旧字体数据，嵌入六个批准的完整静态字体；`embedTrueTypeFonts=1`、`saveSubsetFonts=0`。17 页 XML 与规范化输入逐字节一致，106 个原有包部件保持。
- 可移植文件已复制到 `output/Outrise-Company-Introduction-Canva.pptx`，与 `build/v7-canva-fragments/canva-review/canva-portable.pptx` 逐字节一致，SHA256：`a6d494f6bdcac7e72f0185be483e4b152c74999f834760c4d15f6a1c7ec893fb`。
- 可移植文件 finalizer：0 个错误、1 条边界提示；六种正式 face、430 个文字对象的字体策略及 artifact-tool 重新导入通过。提示来自第 10 页 `AutoShape 41`：检查器使用近 90° 旋转线的未旋转边界框，实际旋转后边界为 `[1847.04, 400.54, 1848.96, 658.06]`，位于 `1920 × 1080` 画布内。
- 本地重新导入后全部 17 页渲染及视觉检查完成，无缺字、裁切、叠字或额外换行。相对 Canva PDF，artifact-tool 渲染存在轻微中英基线差：归一到 `1440 × 810` 时，中文通常下移约 3–4 px、英文接近原位，第 1、14 页较明显；第 15 页 `GTM` 另上移约 2 px。差异未影响可读性或占位；文件文字、字重与几何检查均通过。
- 本地收据位于 `build/v7-canva-fragments/canva-review/`：`font-normalization.json`（允许变更及保真）、`font-embedding.json`（完整字体校验）、`final-pptx-review.json`（原始导出文字、字体分配及可编辑性）、`font-audit.json`（PDF 实际字体）、`portable-finalization.json` 与 `portable-review.json`（可移植文件最终结构、字体及导入复验）。构建收据不提交；本文件保留关键结果与交付校验值。

复现命令见 [README 的字体规范化流程](README.md#canva-pptx-字体规范化)。规范化中间稿缺少字体嵌入，不能作为交付稿。

## 复核边界与发布状态

本轮进行了本地结构、字体嵌入、Canva 实际导入导出及 PDF 逐页视觉检查，未使用桌面 PowerPoint 打开。支持嵌入字体的编辑器可使用随文件包含的字重；忽略嵌入字体的编辑器仍需安装所附字体。

`output/Outrise-Company-Introduction-Client.pdf` 已从核验通过的独立品牌预览准备，SHA256 为 `8b9b6a73a6de9976b030fdaecd474bc9830788eb5745dfc7a7f66848c99fd508`。原设计的整页替换仍等待用户对具体操作的确认；上述本地文件准备不代表原设计已经更新。

Canva 可移植 PPTX 已完成字体规范化、嵌入和固定输出复制。上述处理保留文字与几何，但未通过桌面 PowerPoint 实际打开验证。导入日志的 legacy/typographic family 名称及 named static face 字重元数据提示不属于包或导入失败；渲染使用已注册的批准完整字体。几何提示与上述应用验证边界保留，不将检查结果表述为在所有编辑器中的显示保证。
