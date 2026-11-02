# Outrise 首页视觉探索

当前版本：**2026-11-02 / Brand Guidelines v2.0 / 最新公司 Deck v8.2**。

本轮交付完整八区块文案，以及三组上半页概念稿（含手机首屏）。**等待选择 A、B 或 C；完整 HTML 尚未制作。** 图片用于判断构图，发布文案以 [完整英文内容](revisions/2026-11-02/content.en.json) 为准。

## 三组视觉稿

| 方向 | 交付文件 | 阅读体验与后续延伸 |
| --- | --- | --- |
| **A｜编辑式品牌顾问** | [桌面＋手机首屏](revisions/2026-11-02/concepts/A-editorial-brand-advisor.png) | 米白、左侧大标题、红色切面、细线；服务区转主红。后续 AI 区保持两栏阅读，流程用横向阶段线，合作与 FAQ 使用轻量分隔。 |
| **B｜作品先行** | [桌面＋手机首屏](revisions/2026-11-02/concepts/B-work-first.png) | 居中标题、宽幅工作素材、主红案例区；先看到工作再读能力。后续以具体产出示例连接 AI 与流程，合作区回到米白，邮件邀请用红色收尾。 |
| **C｜大胆品牌表达** | [桌面＋手机首屏](revisions/2026-11-02/concepts/C-bold-brand-expression.png) | 红底白字、大标题、斜切过渡和编号；品牌识别最强。后续内容采用红/米白交替、细线及编号，密集段落保持浅底，结尾延续红色品牌面。 |

三稿共用 AI-native 营销与增长团队的定位、两类等权客户、同一组匿名案例，以及两项核心能力 → 三类执行 → 按需伙伴的层级。CMO 只在持续合作正文解释。

构图目标是 1440px 桌面与 390px 手机；ImageGen 会按工具原生尺寸输出，实测像素见 [manifest.json](revisions/2026-11-02/manifest.json)。图片不是像素级施工文件；HTML 阶段将使用正式 PNG Logo、Instrument Sans 字体、规范色值和集中维护的文案重新落地。

## 内容与评审资料

- [中文内容、板块、素材与验收说明](revisions/2026-11-02/content-guide.zh-CN.md)
- [首页需求源文件](../homepage-requirements.xml) ／ [飞书需求文档](https://nw6b3rrwnjm.feishu.cn/wiki/RPW0wuRlNilGA2kjKB4c0l1znHc)
- [飞书同步结果](revisions/2026-11-02/feishu-sync.md)
- [素材与参考来源](revisions/2026-11-02/sources.md)
- [检查记录](revisions/2026-11-02/review.md)
- [原始生成提示词](revisions/2026-11-02/generation-prompts.md) ／ [案例配图修订提示词](revisions/2026-11-02/generation-corrections.md)

## 素材与真实性

用户选择匿名案例：画面与公开文案不出现客户名称、Logo、店铺名、网址、销售数字或引语。第二阶段 GTM 的无品牌 craft 内容只用于该项目的画面参考。其他营销文档为示意重组，均标注 **Anonymized work · illustrative layout** 或 **Illustrative layout**，不是原始客户交付物。

两份外站截图仅供内部设计参考，不是 Outrise 作品。Outrise 标识的生产文件是 [暖色 PNG](revisions/2026-11-02/references/wordmark-warm.png) 与 [白色 PNG](revisions/2026-11-02/references/wordmark-white.png)。生成图的 Logo 与文字不应裁切后当作生产资产。

## 下一阶段

选定方向后，在独立的 `apps/outrise-homepage` 制作 React + Vite + TypeScript 页面，展开全部八区块，并验证导航、手机菜单、FAQ、邮箱、键盘和减少动态效果偏好，以及 320/390/768/1440px 响应式表现。本期无表单、API、CRM、数据库、子页面或正式域名上线。

## 历史参考

[2026-10 视觉说明存档](revisions/2026-11-02/homepage-design.2026-10.md) 与 [旧需求存档](revisions/2026-11-02/homepage-requirements.2026-10.xml) 保留原状。此前 [编辑式品牌顾问](concepts/01-editorial-brand-advisor.png)、[AI-native 工作现场](concepts/02-ai-native-working-studio.png)、[策略与市场连接](concepts/03-strategy-to-market.png) 已过时，不作为新稿目标。
