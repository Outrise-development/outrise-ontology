# v8.2｜三大案例扩充

2026-10-27，用户查看完整 20 页及四页案例实际预览后，明确确认“保存、导出并同步”。本版已保存到原 Canva 正式链接，并导出完整 PDF 与可编辑 PPTX。

- [正式可编辑 PPTX](exports/Outrise-Intro-Deck-v8.2.pptx)
- [客户阅读 PDF](exports/Outrise-Intro-Deck-v8.2.pdf)
- [逐页实际导出预览](exports/final-previews/)

本版以用户最新的 v8.1 Canva 17 页为准，用四页具名案例替换匿名案例，形成 20 页。保留其他 16 页的文案、图片和位置，仅更新页码。第 5、9 页专业协作表达以及用户删除的英文辅助句、内部示意图注继续保留。

## 页面与事实边界

| 页码 | 案例 | 重点 |
| --- | --- | --- |
| 14 | Inner Brightness | 两个月推进北美渠道冷启动；月销售额超过 1 万美元由用户确认。后台截图独立标明 2026/03/25—04/03、GMV $12,595.73，不作为整月统计。 |
| 15 | ARTILUME | 从达人渠道依赖转向品牌表达、自有内容和站外曝光；使用定性策略变化，不把未来目标当成已实现成果。 |
| 16 | INUK | 市场判断、既有 Common Nature 理念的应用与品牌内容资产。既有 Logo、摄影、理念不全部归为 Outrise 原创。 |
| 17 | INUK | 内容、达人、广告与渠道承接的协同；配图使用已上线品牌文章与 Meta 广告落地页。 |

原第 15—17 页顺延为第 18—20 页。CMO 仅在第 19 页正文一次。旧稿 5.4x、402%、$5,851、500+ 不用于本轮案例。

## Canva 与来源

- [当前正式设计](https://www.canva.com/design/DAHZJb1YZpA/Yay0Ln747v8xpgpBw7MDGw/edit)
- [修改前完整备份](https://www.canva.com/design/DAHZPEybcCw/edit)
- [工作预览副本](https://www.canva.com/design/DAHZPCfiU-E/oYhAQQWBtM6dWh2gq1z0dw/edit)
- `sources/approved-case-facts.json`：用户确认事实、范围与排除项。
- `sources/case-source-manifest.json`：图片来源、日期、裁切范围、哈希与上线状态。
- `validation/before-canva-elements.json`：修改前文字及图片元素快照，已去除临时授权链接。

完整截图原件只保留本地，`images/cases/originals/` 不入库；仓库仅保存用于演示的干净裁切图，避免混入浏览器工具栏及无关内部信息。

## 制作与验证

暖色 v2 品牌规范、Noto Sans SC 与 Instrument Sans 沿用。文本、关系图和连接线保持可编辑；真实截图作为图片。第 5 页用户使用的“字由经典黑 Bold”不替换，正式输出以 Canva 实际导出为准。

`svg_output/` 与 `svg_final/` 保留 20 页制作源；`content.zh-CN.json`、Markdown 与生成器同步。制作源生成的预览、PDF 或 PPTX 不等同于已经保存的 Canva 正式导出，尤其第 5 页离线字体替代不能作为像素一致的证明。

最终验收使用 `validation/audit_release.py`，核对页数、页码、原有 16 页文字与图片位置、CMO 出现次数、案例品牌、PPTX 可编辑文字与图片对象、PDF 可读文字以及源文案一致性。视觉验收另检查中文断行、重叠、截断和截图清晰度。未实际在桌面 PowerPoint 应用内打开，不声称通过应用内测试。

正式 PPTX 包含 468 个可编辑文字对象；四页案例共有 109 个。Canva 将截图导出为独立的图片填充形状，将部分箭头导出为独立 SVG 图形组件，可单独移动和缩放；本地 `Native-Source.pptx` 保留原生箭头几何。没有将页面整体栅格化。Canva 原始导出字体包予以保留，不以只支持六个品牌 face 的旧规范化脚本重写第 5 页用户字体。

PDF 字体审计中的两条提示仅对应第 5 页用户保留的“字由经典黑 Bold”标签，其余页面没有非预期字体。最终审计明确记录这一例外，不将其表述为“全稿仅六个字体”。

第 13 页的本地旧源曾保留较长的“技术公司”表述；本次以 Canva 中用户最新的“产品逻辑”“产品力”文字同步源文件。正式稿第 13 页没有改动，仅纠正本地来源的滞后。
