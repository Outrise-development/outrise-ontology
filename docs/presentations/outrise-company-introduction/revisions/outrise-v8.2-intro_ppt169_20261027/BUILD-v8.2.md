# v8.2 制作源与重建

本目录以 v8.1 最新 `svg_output` 为保留页面源，将旧匿名第 14 页替换为四页具名案例。当前 Canva 的其余 16 页是正式交付权威；本地制作稿不覆盖其最新几何和字体例外。

## 文案与源文件

- `content.zh-CN.json` / `.md`：20 页文案；provenance 保留原始妙记未逐篇复读的说明，并指向本轮案例事实和图片来源。
- `tools/author_cases.py`：四页案例文案与版面生成器。从 `sources/baseline-svg/` 复制其他 16 页并更新页码；baseline 第 13 页已补齐当前 Canva 中用户既有的两处文字修改。禁止使用旧 `native_source/` 恢复页面。
- `images/cases/`：经过核验的安全裁切素材，原图不入库。`images/` 根下同名副本供 ppt-master 标准图片路径使用；生成器自动复制，不需分别维护。
- `sources/approved-case-facts.json`、`case-source-manifest.json`：事实和素材来源。Inner Brightness 月销售额和截图十日期间分开；ARTILUME 不使用预测目标；INUK 标明既有资产的应用和实际落地页状态。
- `svg_output/`：20 页主制作源。`svg_final/`：由 finalize 生成的自包含版本。

## 重建顺序

在项目根目录，以工作区 ppt-master 私有 Python 运行：

```powershell
$outriseSkill = 'C:/Users/zx/Documents/ChatGPT/Outrise Ontology/.agents/skills/ppt-master'
$outrisePython = Join-Path $outriseSkill '.venv/Scripts/python.exe'
$outriseDeck = (Resolve-Path 'docs/presentations/outrise-company-introduction/revisions/outrise-v8.2-intro_ppt169_20261027').Path
& $outrisePython "$outriseDeck/tools/author_cases.py"
& $outrisePython "$outriseSkill/scripts/svg_quality_checker.py" $outriseDeck --canonical-authoring --stage final --json
& $outrisePython "$outriseSkill/scripts/finalize_svg.py" $outriseDeck
```

`tools/render_previews.py` 使用只读本机 HTTP 服务，在 Chromium 确认六套品牌字体加载后渲染。当前主机需以 host 权限运行该本机渲染，否则沙箱 Chromium 可能无法启动。它输出 `exports/Outrise-Intro-Deck-v8.2-Source.pdf` 和逐页 PNG，均为制作校验材料。

## 四页 Canva 导入

`tools/prepare_canva_fragments.py` 只提取第 14—17 页，通过实际字体的字形位置测量得到 109 个单字体文本片段；线段转成原生细矩形，6 个箭头使用 Office 原生形状。它不会改写主 SVG 的文字和几何。

先在新的短路径项目准备，再完成该四页项目的质量检查、finalize 和原生 PPTX 导出。`--fragment-project` 在准备和 transport 时必须显式使用同一绝对路径，避免 Windows host 与 sandbox 的 TEMP 不同：

```powershell
& $outrisePython "$outriseDeck/tools/prepare_canva_fragments.py" --server '<本机服务URL>' --fragment-project '<四页短路径项目>' --skill-dir $outriseSkill
& $outrisePython "$outriseSkill/scripts/svg_quality_checker.py" '<四页短路径项目>' --canonical-authoring --stage final --json
& $outrisePython "$outriseSkill/scripts/finalize_svg.py" '<四页短路径项目>'
& $outrisePython "$outriseSkill/scripts/svg_to_pptx.py" '<四页短路径项目>' --no-notes --no-animations -o '<四页原生PPTX>'
& $outrisePython "$outriseDeck/tools/prepare_canva_fragments.py" --fragment-project '<四页短路径项目>' --transport '<四页原生PPTX>'
```

导入文件为 `build/Outrise-v8.2-Cases-Canva-Import.pptx`。字体占位映射：Arimo／Source Sans 3 Medium／Inter Bold → Instrument Sans 400／500／600；Noto Sans／Montserrat Medium／Roboto Bold → Noto Sans SC 400／500／600。以 Canva 实际导出核验替换效果，不把中间占位字体稿当成最终客户文件。

## 制作稿与实际交付的区别

`exports/Outrise-Intro-Deck-v8.2-Native-Source.pptx` 为 20 页本地可编辑制作稿，六套完整字体已经嵌入，并通过 Windows 字体解析与包级检查；未在桌面 PowerPoint 内打开验证。保留页使用已同步的 baseline，但离线第 5 页字体等差异仍存在，不能替代当前 Canva 原位拼接后的正式导出。

本轮源稿检查通过（20 页、CMO 仅第 19 页、20 页可见文字与保存后的 Canva 一致）。相对继承的旧本地源，15 页仅改页码，第 13 页另同步 Canva 中两处既有文字。正式 Canva 的原有 16 页均只改页码。四页导入门禁和原生导出 postflight 通过。辅助字号边界估计、正式品牌字体非系统安全字体、样式可压缩等警告为记录性提示；实际 Chromium 画面已逐页检查无文字碰撞和截断。

最终客户 PDF / PPTX 从保存后的当前 Canva 20 页正式稿导出，由发布记录和最终审计确认。`validation/authoring-review.json` 仅记录源稿审阅，不能代替 Canva 最终验收。
