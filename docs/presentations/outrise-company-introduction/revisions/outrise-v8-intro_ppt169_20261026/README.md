# Outrise Intro Deck v8

**当前版本为 2026-10-27 的 v8.1 更新。** 第 5、9 页已按批准文案在 Canva 原位调整，并保留第 1、12、17 页删除项及其余页面的用户修改。当前正式文件、备份与验证见 [本次更新](updates/20261027-professional-collaboration/README.md)。下面的原生 v8 导出及其验证记录保留为 2026-10-26 快照；`native_source/` 同样属于该历史导出，不是当前源稿的最终兼容源。后续应从当前 `svg_output/` 重新生成兼容源，不能直接使用旧坐标重建。

2026-10-26 完成的 17 页中文公司介绍，面向潜在客户独立阅读。用户比较三套 Demo 后选择 **C｜品牌展示式**；内容以最新 v7 和已确认业务边界为依据，视觉采用批准的 Outrise Brand Guidelines v2.0。旧 Canva 设计及 v7 文件均保留。

## 正式交付

- [独立 Canva 完整稿](https://www.canva.com/design/DAHZJb1YZpA/Yay0Ln747v8xpgpBw7MDGw/edit)：17 页，可编辑，没有更改访问权限。
- [原生可编辑 PPTX](exports/Outrise-Intro-Deck-v8.pptx)：推荐继续编辑的 PowerPoint 主文件；文字、形状、线段和 17 个箭头均为原生对象，正式 Logo 使用批准图片。
- [客户阅读 PDF](exports/Outrise-Intro-Deck-v8-Canva.pdf)：从最终 Canva 设计实际导出，文字可选取。
- [Canva 对应 PPTX](exports/Outrise-Intro-Deck-v8-Canva.pptx)：保留 Canva 版面，已规范化并嵌入完整字体。部分箭头在 Canva 导出中成为独立 SVG 图形组件；需要原生 Office 箭头时使用主文件。
- [全稿预览](exports/Outrise-Intro-Deck-v8-Final-preview.png)：最终 Canva PDF 的 17 页缩略总览。`canva-previews/` 是逐页实际导出预览。

`Outrise-Intro-Deck-v8-Client.pdf` 和 `previews/` 是从源 SVG 渲染的制作校验材料；客户发送以最终 Canva PDF 为准。

## 内容与品牌

前四页依次说明定位、公司特点、客户需求及参与方式。随后展开服务体系、核心能力、直接执行、专业协作、实际成果、流程、AI-native 体系、市场理解、匿名案例、统一责任、合作形式和联系入口。

公司定位为“专注北美市场的 AI-native 营销与增长团队”。两项核心能力等权；三类直接执行与专业伙伴支持区分清楚。CMO 仅在第 16 页合作形式正文说明一次。没有加入新结果数字、客户 Logo、个人履历、全面托管或营收保证。

主红 #C9381E、赭金 #9B5E00、米白 #F4F1E9 与墨黑 #111111 来自批准的 v2 tokens。中文为 Noto Sans SC，英文与数字为 Instrument Sans，分别使用 400／500／600。常规正文为 26 SVG px，对应 19.5pt；图注和页脚采用另行定义的辅助字号。官方 Logo 保持比例与安全区。

`brand/asset-manifest.json` 记录来源版本和 SHA256；`fonts/` 保留六个完整静态 face 与 OFL 许可。批准的字体与 v1 包一致，未裁剪字符集或安装系统字体。

## 来源与制作文件

- `content.zh-CN.json`、`.md`：当前 v8 文案；修改文案需同步生成器和版面。
- `sources/`：v7 输入及规范化资料。没有提交原始私密会议逐字稿、OAuth 诊断或下载授权链接。
- `direction-selection.json`：用户选择 C 的记录；聊天确认，没有伪造 Confirm UI 收据。
- `design_spec.md`、`spec_lock.md`：17 页任务、视觉约束和字号体系。
- `svg_output/`、`svg_final/`：主设计源及自包含预览。
- `native_source/`：最终原生 PPTX 使用的兼容源，保留精确字形坐标。390 个单字体片段、细矩形线段及 Office 预设箭头避免 Canva 换字体重排和丢失连线；文案、字号与可见位置不变。
- `tools/`：文案准备、页面生成、字体恢复、Canva 传输、PDF 渲染和最终审计。
- `validation/`：实际字体、文案、逐页视觉、嵌入和导出收据；详见 [REVIEW-v8.md](REVIEW-v8.md)。

## 重建与复核

使用工作区启用的 ppt-master v6.7.3 私有 venv，遵守技能路由、完整性检查和质量门。以下变量均使用当前主机明确提供的绝对路径：

```powershell
$outriseSkill = 'C:/Users/zx/Documents/ChatGPT/Outrise Ontology/.agents/skills/ppt-master'
$outrisePython = Join-Path $outriseSkill '.venv/Scripts/python.exe'
$outriseDeck = (Resolve-Path 'docs/presentations/outrise-company-introduction/revisions/outrise-v8-intro_ppt169_20261026').Path
& $outrisePython "$outriseDeck/tools/prepare_project.py"
& $outrisePython "$outriseDeck/tools/author_deck.py"
& $outrisePython "$outriseSkill/scripts/svg_quality_checker.py" $outriseDeck
& $outrisePython "$outriseSkill/scripts/finalize_svg.py" $outriseDeck
```

品牌字体预览需要 Playwright Chromium，以及在项目目录启动的只读本地 HTTP 服务（本次端口 6061）。运行 `tools/render_previews.py --server http://127.0.0.1:6061`；六个字体加载成功后才测量和渲染。

最终兼容源已保存于 `native_source/`。Windows 下复制到新的短路径项目再转换，避免 MAX_PATH：

```powershell
$outriseShort = Join-Path $env:TEMP 'outrise-v8-release_ppt169_20261026'
if (Test-Path -LiteralPath $outriseShort) { throw '请使用新的短路径，保留已有构建。' }
Copy-Item -LiteralPath "$outriseDeck/native_source" -Destination $outriseShort -Recurse
& $outrisePython "$outriseSkill/scripts/svg_quality_checker.py" $outriseShort
& $outrisePython "$outriseSkill/scripts/finalize_svg.py" $outriseShort
& $outrisePython "$outriseSkill/scripts/svg_to_pptx.py" $outriseShort --no-notes --no-animations
```

取新生成的原生 PPTX 路径，继续以下步骤；显式传入同一个短路径：

```powershell
& $outrisePython "$outriseDeck/tools/prepare_canva_fragments.py" --fragment-project $outriseShort --transport '<新生成的原生PPTX路径>'
& $outrisePython "$outriseDeck/tools/restore_native_fonts.py" --input "$outriseDeck/build/canva-single-family.pptx" --output "$outriseDeck/build/native-final-unembedded.pptx" --single-family
& $outrisePython 'docs/presentations/outrise-company-introduction/brand-assets/outrise-vi-v1/tools/embed-pptx-fonts.py' --input "$outriseDeck/build/native-final-unembedded.pptx" --output "$outriseDeck/exports/Outrise-Intro-Deck-v8.pptx" --receipt "$outriseDeck/validation/font-embedding.json" --require-windows-parser
```

如果文案或图形改变，先重建主设计、检查和逐页审阅，再运行 `prepare_canva_fragments.py --skill-dir $outriseSkill --fragment-project <新短路径>` 重新测量。不要复用旧兼容源的字形坐标。

Canva 上传使用 `build/Outrise-v8-Canva-Import.pptx`。六种占位字体映射为：Arimo／Source Sans 3 Medium／Inter Bold → Instrument Sans 400／500／600；Noto Sans／Montserrat Medium／Roboto Bold → Noto Sans SC 400／500／600。按目标家族替换全稿后，实际导出 PDF 和 PPTX 复核；中间稿不交付。

Canva PPTX 使用主目录 `tools/normalize-canva-pptx-fonts.py` 规范化，再以同一工具嵌入完整字体。实际 PDF 用主目录 `tools/review-pdf-fonts.py` 检查，用本项目 `tools/render_canva_pdf.py` 渲染（需要 pdfplumber、pypdfium2、Pillow）。`tools/audit_delivery.py` 可从已提交交付与收据重新审计，不依赖忽略的构建目录。

上述 2026-10-26 Canva／PDF 的全部 17 页和六个实际字重已检查。2026-10-27 的实际导出与用户字体例外由本次更新的 `tools/validate_release.py` 和收据验证；旧 `tools/audit_delivery.py` 仅属于原发布流程，不用于将已更新源稿与旧导出混合验证。未在桌面 PowerPoint 内打开，不能将包级验证表述为该应用的实际显示测试。
