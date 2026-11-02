# Outrise 首页内容与设计说明 · 2026-11-02

状态：新版需求与英文文案已整理，供本轮 A、B、C 三组视觉稿使用；尚未选定视觉方向，完整 HTML 在选定后制作。英文正文以 [content.en.json](content.en.json) 为单一维护源；生成图中的文字不是发布稿。

## 定位与内容优先级

Outrise 是专注北美市场的 AI-native 营销与增长团队：帮助消费品牌与科技创业公司判断方向、选择渠道、制定规划，并推进约定的关键执行。

- 首屏使用 **Your AI-native marketing and growth team for North America.**，完整副文案沿用用户已确认版本。外部 CMO 只在持续合作正文解释，不作为 Hero 或套餐标题。
- 两类客户等权：消费品牌兼顾品牌建设与电商增长；科技创业公司围绕 GTM、产品价值与渠道选择。科技客户不退回 Consumer Tech 窄范围；是否承接按具体营销目标判断。
- 两项核心能力等权：Marketing Strategy & Brand Foundations、Channel Operations & Growth；共同连接 Content Marketing、Influencer Marketing、Paid Media。
- 专业协作按需组织，举例为渠道拓展、落地执行、技术搭建；Outrise 判断需求、联系和筛选资源、统筹交付。GEO、SEO 留在具体需求沟通中。
- 不承诺传统 B2B 销售线索系统、产品内激活与留存、产品改造、完整 PLG、全面日常代运营，亦不作销量或回报保证。内部边界不用负面清单搬上首页。

## 八个区块

| 顺序 / 锚点 | 目的与主要内容 | 布局与素材要求 |
| --- | --- | --- |
| Hero / `hero` | 身份、北美市场、AI-native、两类客户。Let’s talk 到真实邮箱；Explore our work 到案例。 | 首屏文字可独立成立，媒体不遮挡标题；手机首先显示标题、简述、操作。 |
| Who We Help / `who-we-help` | 两类客户各写当前任务、Outrise 如何参与及关注点。 | 同等面积与字号；手机按原顺序单列。 |
| Selected Experience / `selected-work` | 真实匿名经验：品牌与渠道整合、新渠道启动、第二阶段 GTM。 | 品牌与渠道整合作为首个主案例；渠道启动、第二阶段 GTM 为两项紧凑案例。区分背景、判断、工作范围，可视化表现与客户事实分开。 |
| Capabilities / `capabilities` | 两项核心能力各带工作产出示例；下接三项执行与伙伴说明。 | 两核心等权；三执行为下一层，伙伴段落更轻。不得做成五张同权服务卡。 |
| Why Outrise / `why-outrise` | 已建立 AI 工作体系；团队承担商业判断、方向和质量；产品逻辑如何转为用户价值与营销行动。 | 四项工作关系及三段价值转化示意，避免仿真软件界面、工具墙、未经证实的效率数字。 |
| How We Work / `how-we-work` | 理解与判断、选择与规划、执行与调整；每阶段说明产出和客户共同确认事项。 | 三阶段流程，保持可循环调整；交付物是可能示例，不是固定套餐。 |
| Working Together / `working-together` | 策略咨询、阶段 GTM/品牌项目、持续营销统筹与团队支持；统一责任、客户分工、四项 FAQ。 | 合作深度清楚；FAQ 回答适配、已有团队、执行范围、专业伙伴。 |
| Closing / `contact` | 邀请介绍产品、北美目标和营销问题。 | 主红与白色 Logo 收尾，邮箱及回到顶部；不收集访客信息。 |

导航固定为 Who We Help / Selected Work / Capabilities / How We Work；联系入口使用 `mailto:hello@outrisetech.com`。Footer 复用同一组导航。

## 匿名经验与素材边界

用户本次选择匿名展示。网页正文、视觉稿、素材替代文本和公开文件名均不出现客户名称、客户 Logo、店铺名、客户网址或商业结果数字。内部来源仅用于核验，不进入网页。

| 匿名案例 ID | 可写事实 | 必须保留的归因边界 | 内部核验位置 |
| --- | --- | --- | --- |
| `brand-channel-integration` | 基于既有品牌理念及素材梳理北美表达、内容资产、达人与广告工作，衔接 TikTok、Amazon、官网；已上线品牌文章和广告落地页。 | 不把既有理念、Logo、摄影全部归因 Outrise；不声称 A+ 已上线 Amazon；不用暂停的公益内容或经营目标。 | 最新 Deck 第 16—17 页、approved-case-facts.json 第三个案例。 |
| `channel-launch` | 参与北美 TikTok 冷启动，选择卖点、受众与达人方向；推进达人合作、AI 辅助脚本/素材测试，结合内容与投放反馈迭代。 | 只称团队参与；不宣称创立品牌、全部成交来自 AI，亦不挪用其他渠道既有业绩。 | 最新 Deck 第 14 页、approved-case-facts.json 第一个案例。 |
| `second-stage-gtm` | 增长放缓后参与调整 GTM，以场景和创作价值解释技术产品，拓展自有内容与 TikTok 之外的曝光。 | 描述调整方向与工作范围，不把增长目标写成已实现结果；不披露预算、利润、退款等。 | 最新 Deck 第 15 页、approved-case-facts.json 第二个案例。 |

选素材先检查是否能可靠匿名，再决定采用。不得只隐藏标题却保留包装、界面或 URL 中的品牌信息。无法可靠匿名的素材不用。第二阶段 GTM 案例采用已核验、无品牌字样的现有 craft 内容作为画面参考；其他案例工作图按真实工作关系进行示意重组。共用图注为 **Anonymized work · illustrative layout**。参考画面及生成重组不冒充客户原始交付物，亦不能冒充真实团队成员或新增项目成果。

## 三组视觉与统一品牌规范

三组使用相同事实和核心文案，目标为 1440px 桌面纵向构图（Hero、客户、案例、服务体系），每组另配 390px 手机首屏。生成图实际像素尺寸需如实记录，不把构图目标写成实测尺寸。

- **A｜编辑式品牌顾问**：米白主底、左侧大标题、右侧主红 24° 切面与工作素材窗口；细线分区。
- **B｜作品先行**：米白标题区、宽幅素材组合，主红用于案例标题带和行动区域。
- **C｜大胆品牌表达**：主红首屏、白色大标题，切入米白案例区；编号与水平对齐组织服务关系。

共同使用 Brand Guidelines v2.0：主红 `#C9381E`、米白 `#F4F1E9`、墨黑 `#111111`、赭金 `#9B5E00`；次正文 `#62625D`、分隔线 `#D6D4CB`。暖色约 40%、中性色约 60% 是整体方向，密集阅读区优先中性底与对比度。

英文和数字用 Instrument Sans 400/500/600，中文说明用 Noto Sans SC。桌面 12 列，内容宽不超过 1320px，边距通常 64px；手机 4 列，边距约 20—24px。标题桌面 48—88px、手机 36—48px，正文 16—18px。按钮和主要面板直角，小部件最多 4px 圆角；细线 1px；间距使用 4/8/12/16/24/32/48/64/96。

直接使用批准的 A2 PNG，不重画、不重输入为文字。浅底用暖色字标，红底及深底用纯白字标；横向字标建议至少 180 CSS px，安全区为导出画布高度的 20%。24° 切面为独立辅助图形，不拆用 Logo 笔画。动效以 160/240ms 的轻微淡入和不超过 8px 上移为限；减少动态偏好下禁用变换、入场及顺滑滚动。

## 交付顺序与验收

1. 当前交付：更新需求与完整英文文案，制作三组桌面及手机视觉供选择。保留旧需求及旧概念为历史参考。
2. 用户选定构图后：以 `apps/outrise-homepage` 独立 React + Vite + TypeScript 项目展开八区块；不改内部 product-console。复用本次 JSON 的稳定区块 ID 和文案。
3. 交互：页内锚点、手机菜单、FAQ、邮箱、回到顶部；菜单支持键盘开关与焦点回归，展开状态可被辅助技术识别；FAQ 用原生或等效可访问控件。
4. 检查 320、390、768、1440px，无横向溢出、媒体变形、标题遮挡或操作丢失；支持键盘及减少动态效果，图片有合适 alt；构建通过，无失效资源。
5. 复核相关变更后提交并推送指定仓库；只有远端验证通过才标记已同步。本期不含表单、业务 API、CRM、数据库、其他子页或正式域名上线。

## 版本与来源

- 业务事实：[最新公司 Deck](https://canva.link/ft162cu3ru3e411)，本地正式版 `docs/presentations/outrise-company-introduction/revisions/outrise-v8.2-intro_ppt169_20261027/content.zh-CN.md`（v8.2，2026-10-27，20 页）。
- 案例核验：`docs/presentations/outrise-company-introduction/revisions/outrise-v8.2-intro_ppt169_20261027/sources/approved-case-facts.json`。
- 品牌依据：`C:/Users/zx/Documents/ChatGPT/Design/output/outrise-logo/manual-v2/` 中 README.md、approval-record.json、tokens.json、content.json、assets/logo/；v2.0，2026-10-26，A2＋大胆暖色。仅使用已核验源文件，不以无法完整读取的聊天记录代替规范。
- 参考站：[SimplyWorks](https://www.simplyworks.marketing/#get) 借鉴具体交付说明；[BoostEngine](https://www.boostengine.ai/home) 借鉴项目提前和媒体节奏。参考站的客户、数据、价格、认证、图片与软件产品均不沿用。
- 需求同步目标：[原飞书文档](https://nw6b3rrwnjm.feishu.cn/wiki/RPW0wuRlNilGA2kjKB4c0l1znHc)；远端历史、图片、评论继续保留。本文不代表已完成飞书同步。

本次替换旧版以 CMO 为 Hero 的定位、案例后置、单一匿名箱包案例、PR 作为默认伙伴示例、普通 OUTRISE 字标及黑白/浅绿概念基底。保留双客户、双核心、三执行、邮箱联系与阶段评审。2026-10 原需求另存 [homepage-requirements.2026-10.xml](homepage-requirements.2026-10.xml)。
