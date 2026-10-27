<!-- ppt-master-schema: design-spec/v1 -->
# Outrise v8 Intro Deck - Design Spec

## I. Project Information

| Item | Value |
| --- | --- |
| Project Name | Outrise v8 Intro Deck |
| Canvas Format | PPT 16:9, 1280 × 720 |
| Page Count | 17 |
| Primary Language | zh-CN |
| Target Audience | 进入或拓展北美市场的消费品牌与科技创业公司潜在客户 |
| Communication Intent | 解释Outrise是谁、服务谁、提供什么、如何协作及为何值得合作，并引导业务沟通 |
| Desired Audience Outcome | 短时间内理解定位、服务、协作深度与责任，判断合作切入点 |
| Core Message / Ask / Action | Outrise是专注北美市场的AI-native营销与增长团队；从客户的业务目标开始沟通 |
| Delivery Context | 中文客户自读为主；可编辑PPTX与独立Canva，页面内保留完整解释 |
| Artifact Afterlife | 客户发送、内部复用、后续内容更新，v7和三方向Demo保留 |
| Reading Mode | balanced |
| Content Strategy | 保留已确认业务事实与八板块，重排17页、去重并具体化成果；不增加经营承诺 |
| Design Style | 已选C品牌展示式，Outrise Brand Guidelines v2.0 |
| AI Image Acquisition Path | not applicable |
| Generation Mode | continuous |
| Spec Refinement | disabled |
| Speaker Notes | disabled — 客户可独立阅读，解释全部在页面 |
| Custom Animations | disabled — 静态客户发送稿 |
| Narration Audio | disabled |
| Created Date | 2026-10-26 |

用户批准17页制作计划并选择C品牌展示式，余下制作判断已委托。采用聊天确认，不生成Confirm UI收据，不再增加逐页审批。17页为正式页序，CMO仅第16页正文一次。独立Canva设计，不替换旧链接。

## II. Canvas Specification

| Property | Value |
| --- | --- |
| Format | PPT 16:9 |
| Dimensions | 1280 × 720 |
| viewBox | `0 0 1280 720` |
| Margins | 64px；完整品牌图形保留0.20H安全区 |
| Content Area | x=64..1216，y=40..640；页脚另占底部区域 |

## III. Visual Theme

### Theme Style

- **Mode**: custom
- **Mode Behavior**: 前四页回答身份、客户、参与方式，随后解释服务、成果、流程、优势、案例、责任与合作。每页回答一个问题，最后引导业务沟通。
- **Visual style**: custom
- **Visual Style Behavior**: 已选C品牌展示式：大红色场、正式反白字标、展示型标题形成品牌重心。正文通过开放分区、细线、成果条目及必要关系图组织；按页面任务改变红色场比例和阅读节奏，保留约19.5pt正文，不连续机械复制三栏。
- **Theme**: 直接、清楚、暖色。24度上扬切面只在适合的身份与收束页面作为跨页品牌线索。
- **Tone**: 具体说明工作与职责，以约定关键执行为边界，不增加量化承诺。

### Color Scheme

| Role | HEX | Purpose |
| --- | --- | --- |
| Background | #F4F1E9 | 阅读背景 |
| Secondary background | #FFFFFF | 局部中性承载 |
| Primary | #C9381E | 主红色面和重点 |
| Accent | #9B5E00 | 赭金辅助 |
| Secondary accent | #111111 | 深色区域 |
| Body text | #111111 | 浅底正文 |
| Secondary text | #62625D | 注释、辅助层级 |
| Divider | #D6D4CB | 分隔线 |

## IV. Typography System

### Font Plan

| Role | Character (Reference) | Primary | English if non-English | Fallback tail |
| --- | --- | --- | --- | --- |
| Title | 无衬线600，品牌标题 | Noto Sans SC SemiBold | Instrument Sans SemiBold | none |
| Body | 无衬线400，完整短句 | Noto Sans SC | Instrument Sans | none |
| Subheading | 无衬线500，模块标题 | Noto Sans SC Medium | Instrument Sans Medium | none |
| Feature | 无衬线500，展示型模块 | Noto Sans SC Medium | Instrument Sans Medium | none |
| Label | 无衬线500，分类标签 | Noto Sans SC Medium | Instrument Sans Medium | none |
| Annotation | 无衬线400，辅助说明 | Noto Sans SC | Instrument Sans | none |
| Footnote | 无衬线400，样张标签 | Noto Sans SC | Instrument Sans | none |

- **Title stack**: Noto Sans SC SemiBold, Instrument Sans SemiBold
- **Body stack**: Noto Sans SC, Instrument Sans
- **Subheading stack**: Noto Sans SC Medium, Instrument Sans Medium
- **Feature stack**: Noto Sans SC Medium, Instrument Sans Medium
- **Label stack**: Noto Sans SC Medium, Instrument Sans Medium
- **Annotation stack**: Noto Sans SC, Instrument Sans
- **Footnote stack**: Noto Sans SC, Instrument Sans

### Font Size Hierarchy

| Purpose | Anchor Size (px) |
| --- | ---: |
| Body | 26 |
| Title | 44 |
| Display | 64 |
| Subtitle | 26 |
| Subheading | 28 |
| Feature | 32 |
| Label | 18 |
| Annotation | 22 |
| Footnote | 16 |

第5页服务层级标签为用户批准的页面级27px特例，其余页面字体级别保持不变。

离线重建与实际交付区分：第5页“核心能力”和“直接执行”两标签在最新Canva中保留用户设置的字由经典黑 Bold（IdeaFonts-JingDianHei-80）。本地SVG使用Noto Sans SC Medium作为可重建替代；实际字体与排版以最新Canva导出及after元素快照为准，不声明本地SVG与Canva像素一致。

完整静态face自身包含400/500/600字重，SVG使用其真实family名称与normal，PowerPoint不叠加合成粗体。英文片段保留独立Instrument Sans的内联run。嵌入六个完整字体，复用已批准且与v2变量源一致的静态资源。

## V. Layout Principles

### Deck-wide Direction

- **Hierarchy direction**: 每页一个结论，完整解释与必要关系共同支持客户自读。
- **Composition tendency**: 延续C的品牌色场与展示型排版，服务、流程、责任按各自语义组织。
- **Cross-page continuity**: 品牌字标、色值、字体、细线与页脚统一；核心能力与客群等权。
- **Spacing posture**: 正文26px、行距38px为起点，以改写和重新组织解决拥挤。
- **Spacing anchors**: page margin=64px；block gap=32px；column gutter=32px；corner radius=0px；body leading=38px。

## VI. Icon Usage Specification

- **Primary bundled library**: none

| Icon Path | Suitable Scenarios |
| --- | --- |

用必要的方向箭头、细线与工作关系表达含义；无需额外图标资产。

## VIII. Image Resource List

| Filename | Dimensions | Ratio | Purpose | Type | Image pattern | Crop Policy | Acquire Via | Status | Reference | text_policy | page_role |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| wordmark-warm.png | 2400 × 635 | 3.7795 | 浅底品牌识别 | Logo | 完整字标与内容保留安全空间 | no-crop | user | Existing | 批准manual-v2暖色PNG；不重绘不调色 | none | local |
| wordmark-white.png | 2400 × 635 | 3.7795 | 深底与红底品牌识别 | Logo | 完整字标作为页面身份锚点 | no-crop | user | Existing | 批准manual-v2纯白PNG；不重绘不调色 | none | local |

## IX. Content Outline

#### Slide 01 - 专注北美市场的 AI-native 营销与增长团队
- **Audience move**: 识别Outrise、北美聚焦与AI-native定位。
- **Relationships**: 品牌与定位相联；三项工作范围并列。
- **Composition**: 大红色场、白色字标、展示型定位与上扬切面。
- **Title**: 专注北美市场的 AI-native 营销与增长团队
- **Core message**: 专注北美市场的 AI-native 营销与增长团队
- **Content**: content.zh-CN.json第1页全部客户可见字段；保留范围与限定语，表达可以优化。
- **Images**: wordmark-white.png；完整呈现。
- **Cover impact**: 专注北美的AI-native营销与增长团队是绑定身份；大红主色、反白Logo与定位为主要焦点。
- **Approved revision**: 第1页保留用户的删除操作：不再显示英文顶部标语。

#### Slide 02 - 专注北美，以策略判断连接行动
- **Audience move**: 理解公司特点及工作方式。
- **Relationships**: 公司介绍统摄北美聚焦、策略判断、AI-native三个特点。
- **Composition**: 延续已选C公司介绍样张，标题色带与三个特点分区。
- **Title**: 专注北美，以策略判断连接行动
- **Core message**: Outrise 为消费品牌与科技创业公司提供北美市场的营销支持。我们从业务目标和用户需求出发，明确市场方向、建立品牌表达，规划渠道与资源投入，并推进约定的关键营销工作。
- **Content**: content.zh-CN.json第2页全部客户可见字段；保留范围与限定语，表达可以优化。
- **Images**: wordmark-warm.png；完整呈现。

#### Slide 03 - 服务消费品牌与科技创业公司
- **Audience move**: 判断自己属于哪类服务对象。
- **Relationships**: 消费品牌与科技创业公司为等权客群，分别对应需求。
- **Composition**: 两个等权大区域，标题、说明、需求标签对齐。
- **Title**: 服务消费品牌与科技创业公司
- **Core message**: 同样聚焦北美，回应不同的业务需求。
- **Content**: content.zh-CN.json第3页全部客户可见字段；保留范围与限定语，表达可以优化。
- **Images**: wordmark-warm.png；完整呈现。

#### Slide 04 - 深入业务讨论，统筹关键工作
- **Audience move**: 理解Outrise参与的深度与分工。
- **Relationships**: 共同判断、营销统筹、约定执行为合作中的三类职责。
- **Composition**: 品牌入口与三条参与职责形成关联。
- **Title**: 深入业务讨论，统筹关键工作
- **Core message**: 围绕业务目标参与关键营销工作，让客户团队、Outrise 与专业伙伴按同一计划协作。
- **Content**: content.zh-CN.json第4页全部客户可见字段；保留范围与限定语，表达可以优化。
- **Images**: wordmark-warm.png；完整呈现。

#### Slide 05 - 两项核心能力，连接策略与执行
- **Audience move**: 理解整体服务层级。
- **Relationships**: 两项核心能力等权，共同支撑三项直接执行；专业协作为补充。
- **Composition**: 延续已选C服务样张，大红核心能力区域与次级执行层。第5页三层标签按用户调整使用27px，完整呈现方向、约定成果与非穷尽专业能力示例。
- **Title**: 两项核心能力，连接策略与执行
- **Core message**: 以营销判断和渠道规划统筹工作，按目标组合执行能力。
- **Content**: content.zh-CN.json第5页全部客户可见字段；保留范围与限定语，表达可以优化。
- **Images**: wordmark-warm.png；完整呈现。

#### Slide 06 - 营销策略与品牌基础
- **Audience move**: 知道策略工作回答什么、形成什么。
- **Relationships**: 三类策略问题与相应工作成果逐项对应。
- **Composition**: 问题、工作说明与成果名称逐列对齐。
- **Title**: 营销策略与品牌基础
- **Core message**: 把业务信息转化为市场判断，让品牌表达与阶段行动有共同依据。
- **Content**: content.zh-CN.json第6页全部客户可见字段；保留范围与限定语，表达可以优化。
- **Images**: wordmark-warm.png；完整呈现。

#### Slide 07 - 渠道运营与增长
- **Audience move**: 理解渠道规划、资源与调整的衔接。
- **Relationships**: 渠道角色、资源行动、反馈调整依次相联。
- **Composition**: 三条横向工作区域，成果在共同基线上。
- **Title**: 渠道运营与增长
- **Core message**: 把渠道选择、资源投入和关键行动放在同一条增长路径上。
- **Content**: content.zh-CN.json第7页全部客户可见字段；保留范围与限定语，表达可以优化。
- **Images**: wordmark-warm.png；完整呈现。

#### Slide 08 - 三类执行能力，承接关键任务
- **Audience move**: 知道三类直接执行的范围。
- **Relationships**: 内容、达人、广告三项直接执行并列。
- **Composition**: 三项平等能力，以作用、工作说明和成果标签组织。
- **Title**: 三类执行能力，承接关键任务
- **Core message**: 根据策略选择工作模块，由 Outrise 直接推进约定的关键执行。
- **Content**: content.zh-CN.json第8页全部客户可见字段；保留范围与限定语，表达可以优化。
- **Images**: wordmark-warm.png；完整呈现。

#### Slide 09 - 判断专业需求，连接合适资源
- **Audience move**: 理解超出直接执行范围时，Outrise如何判断专业需求并连接资源。
- **Relationships**: Outrise协助判断专业需求，联系、筛选并协调合适资源；渠道拓展、落地执行、技术搭建为非穷尽示例。
- **Composition**: 单一判断与资源连接入口，展开三个专业能力示例，图下明确项目约定范围。
- **Title**: 判断专业需求，连接合适资源
- **Core message**: 当项目需要我们直接执行范围之外的专业能力，Outrise 会协助判断需要什么支持，再联系、筛选并协调合适的资源。
- **Content**: content.zh-CN.json第9页全部客户可见字段；保留范围与限定语，表达可以优化。
- **Images**: wordmark-warm.png；完整呈现。

#### Slide 10 - 让营销工作有依据、有计划、有成果
- **Audience move**: 知道实际可以获得的工作成果。
- **Relationships**: 策略表达、行动计划、执行成果、复盘建议四类并列。
- **Composition**: 大红主色承载四条清楚可查的成果说明。
- **Title**: 让营销工作有依据、有计划、有成果
- **Core message**: 把策略、规划、执行和反馈转化为团队能够使用的工作成果。
- **Content**: content.zh-CN.json第10页全部客户可见字段；保留范围与限定语，表达可以优化。
- **Images**: wordmark-white.png；完整呈现。

#### Slide 11 - 从业务理解到复盘，六步推进项目
- **Audience move**: 理解推进顺序及客户参与节点。
- **Relationships**: 六步顺序相联，客户参与业务、关键选择、计划与复盘。
- **Composition**: 两行各三步，均从左向右阅读，参与节点清楚标记。
- **Title**: 从业务理解到复盘，六步推进项目
- **Core message**: 在关键选择与计划上形成共识，再推进执行、反馈和调整。
- **Content**: content.zh-CN.json第11页全部客户可见字段；保留范围与限定语，表达可以优化。
- **Images**: wordmark-warm.png；完整呈现。

#### Slide 12 - AI 已融入我们的内部执行体系
- **Audience move**: 理解AI内部体系及团队责任。
- **Relationships**: 知识、任务、内容、反馈构成工作链并形成回流；团队判断横跨体系。
- **Composition**: 四个工作环节和反馈线，团队责任独立强调。
- **Title**: AI 已融入我们的内部执行体系
- **Core message**: Outrise 已建立高度自动化、智能化、以 AI 为驱动的执行体系。
- **Content**: content.zh-CN.json第12页全部客户可见字段；保留范围与限定语，表达可以优化。
- **Images**: wordmark-white.png；完整呈现。
- **Approved revision**: 第12页保留用户的删除操作：不再显示功能关系图注，四环节与团队责任保持。

#### Slide 13 - 理解技术，也理解市场
- **Audience move**: 理解技术与市场两方面的判断能力。
- **Relationships**: 产品价值、市场变化、快速适应共同支持营销工作。
- **Composition**: 黑底，三个暖色关键词与完整解释相对应。
- **Title**: 理解技术，也理解市场
- **Core message**: 把技术公司的产品逻辑，转化为用户能够理解的价值与营销行动。
- **Content**: content.zh-CN.json第13页全部客户可见字段；保留范围与限定语，表达可以优化。
- **Images**: wordmark-white.png；完整呈现。

#### Slide 14 - 箱包品牌的北美多渠道实践
- **Audience move**: 理解真实项目范围与协同方式。
- **Relationships**: 背景统摄三类已确认工作；品牌、内容、渠道任务需要衔接。
- **Composition**: 背景置前，工作范围与协同方式各自组织。
- **Title**: 箱包品牌的北美多渠道实践
- **Core message**: 匿名项目经验｜以已确认的工作范围，呈现品牌、内容与渠道的协同。
- **Content**: content.zh-CN.json第14页全部客户可见字段；保留范围与限定语，表达可以优化。
- **Images**: wordmark-warm.png；完整呈现。

#### Slide 15 - 一个入口，由 Outrise 统一负责
- **Audience move**: 识别统一责任入口与角色分工。
- **Relationships**: 客户对接Outrise，Outrise统筹四类角色并承担交付责任。
- **Composition**: 客户到Outrise，再展开四类职责，不出现人员信息。
- **Title**: 一个入口，由 Outrise 统一负责
- **Core message**: 在约定合作范围内，统筹策略、进度、质量与专业伙伴，对整体合作交付负责并背书。
- **Content**: content.zh-CN.json第15页全部客户可见字段；保留范围与限定语，表达可以优化。
- **Images**: wordmark-warm.png；完整呈现。

#### Slide 16 - 按业务阶段，选择合适的合作深度
- **Audience move**: 选择适合当前需求的合作形式。
- **Relationships**: 三种合作形式等权比较，需求与重点逐项对应。
- **Composition**: 三种形式同宽，标题区与正文起点一致。
- **Title**: 按业务阶段，选择合适的合作深度
- **Core message**: 以策略咨询为核心，结合业务目标约定工作范围与执行支持。
- **Content**: content.zh-CN.json第16页全部客户可见字段；保留范围与限定语，表达可以优化。
- **Images**: wordmark-warm.png；完整呈现。

#### Slide 17 - 从你的北美市场目标开始
- **Audience move**: 知道下一步沟通入口与准备信息。
- **Relationships**: 产品、北美目标、营销难题共同支持合作切入点。
- **Composition**: 大红结束页，白色正式字标、沟通邀请与邮箱为焦点。
- **Title**: 从你的北美市场目标开始
- **Core message**: 告诉我们你的产品、目标与当前营销难题，一起确定合适的合作切入点。
- **Content**: content.zh-CN.json第17页全部客户可见字段；保留范围与限定语，表达可以优化。
- **Images**: wordmark-white.png；完整呈现。
- **Closing impact**: 以产品、北美目标与营销难题启动业务沟通，突出已确认邮箱。

- **Approved revision**: 第17页保留用户的删除操作：不再显示英文顶部标语，邀请、邮箱与其他正文保持。

## X. Speaker Notes Requirements

- **Generation**: disabled
