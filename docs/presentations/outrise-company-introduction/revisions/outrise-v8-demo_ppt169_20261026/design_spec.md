<!-- ppt-master-schema: design-spec/v1 -->
# Outrise v8 Design Comparison - Design Spec

## I. Project Information

| Item | Value |
| --- | --- |
| Project Name | Outrise v8 Design Comparison |
| Canvas Format | PPT 16:9, 1280 × 720 |
| Page Count | 9 |
| Primary Language | zh-CN |
| Target Audience | Outrise 品牌方选择设计方向；正式成稿面向潜在客户独立阅读 |
| Communication Intent | 用同一组内容比较三种品牌化视觉表达，选定后完整制作17页公司介绍 |
| Desired Audience Outcome | 能比较封面、正文与服务图在三种方向中的阅读体验，选择A、B或C |
| Core Message / Ask / Action | Outrise 是专注北美市场的 AI-native 营销与增长团队；本次选择视觉方向 |
| Delivery Context | 本地可编辑PPTX与并排图进行设计评选，正式17页之后同步独立Canva设计 |
| Artifact Afterlife | 作为v8完整版视觉选择记录，v7保留作历史基准 |
| Reading Mode | balanced |
| Content Strategy | 以已确认v7事实重写去重；三组封面、公司介绍和服务体系文案逐字一致，业务语义不因构图改变 |
| Design Style | 同一暖色品牌系统内，A暖色编辑式、B营销工作地图式、C品牌展示式三个明确分组 |
| AI Image Acquisition Path | not applicable |
| Generation Mode | continuous |
| Spec Refinement | disabled |
| Speaker Notes | disabled — delegated production decision for visual comparison |
| Custom Animations | disabled — delegated production decision; static self-reading |
| Narration Audio | disabled — delegated production decision |
| Created Date | 2026-10-26 |

确认依据：用户于本对话批准《Outrise 完整版 Intro Deck｜审阅、Demo 与 v8 制作方案》，明确先制作三种方向各三页、使用相同文案。用户已授权其余制作判断。该9页比较稿不代表17页完整版已完成；仅视觉方向选择仍由用户作出。free_design，直接应用手册参数，不选模板库，不虚构UI确认收据。

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
- **Mode Behavior**: 每组三页按身份、公司特点、服务关系递进。三组内容相同，设计差异可比较，不增添说明性商业事实。
- **Visual style**: custom
- **Visual Style Behavior**: A以不对称分区、细线和清楚的文字层级组织阅读；B以同一组节点和必要连接呈现工作关系；C以大暖色色面和展示型排版突出品牌。三组均保持批准字体、图标线宽、Logo与24度上扬边缘语言，差异限定在组织与视觉重心。用户明确要求三方向并排比较，因此局部分组风格是本Demo的内容而非身份漂移。
- **Theme**: 敏锐、直接、暖色；正式Logo作为身份锚点，文字与图示可编辑。
- **Tone**: 具体、清楚，不新增案例数字、营收保证或个人信息。

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

完整静态face自身包含400/500/600字重，SVG使用其真实family名称与normal，PowerPoint不叠加合成粗体。英文片段保留独立Instrument Sans的内联run。嵌入六个完整字体，复用已批准且与v2变量源一致的静态资源。

## V. Layout Principles

### Deck-wide Direction

- **Hierarchy direction**: 每页先看到主要结论，再看到解释和服务关系。
- **Composition tendency**: 三组各自形成可辨识的组织逻辑；不是把同一组卡片换颜色。
- **Cross-page continuity**: 每组三页共享处理语言，跨组共享文字、Logo、色值、正文尺度与安全区。
- **Spacing posture**: 封面有焦点，正文可扫读，服务图承担层级。
- **Spacing anchors**: page margin=64px；block gap=32px；column gutter=32px；corner radius=0px；body leading=38px。

## VI. Icon Usage Specification

- **Primary bundled library**: none

| Icon Path | Suitable Scenarios |
| --- | --- |

本轮样张通过文字与关系几何表达，不新增装饰图标；正式17页如需图标使用统一线性系统。

## VIII. Image Resource List

| Filename | Dimensions | Ratio | Purpose | Type | Image pattern | Crop Policy | Acquire Via | Status | Reference | text_policy | page_role |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| wordmark-warm.png | 2400 × 635 | 3.7795 | 浅底品牌识别 | Logo | 完整字标与内容保留安全空间 | no-crop | user | Existing | 批准manual-v2暖色PNG；不重绘不调色 | none | local |
| wordmark-white.png | 2400 × 635 | 3.7795 | 深底与红底品牌识别 | Logo | 完整字标作为页面身份锚点 | no-crop | user | Existing | 批准manual-v2纯白PNG；不重绘不调色 | none | local |

## IX. Content Outline

### Part 1: A 暖色编辑式

#### Slide 01 - A 封面
- **Audience move**: 尚未建立身份 → 识别Outrise、北美聚焦及工作定位。
- **Relationships**: 品牌与定位相联；策略判断、营销规划、关键执行构成工作范围。
- **Composition**: 主红与米白分区，以正式字标和定位为重心，上扬切面形成方向。
- **Title**: 专注北美市场的 AI-native 营销与增长团队
- **Core message**: Outrise聚焦北美营销与增长。
- **Content**: content.demo.json cover的顶栏、定位与辅助短句，文字完整保留。
- **Images**: wordmark-white.png；完整呈现。
- **Cover impact**: 北美聚焦为绑定信息；构图为暖色分区参考。

#### Slide 02 - A 公司介绍
- **Audience move**: 只知道定位 → 理解服务对象、工作方式与三个公司特点。
- **Relationships**: 公司介绍统摄北美聚焦、策略判断和AI-native三项特点；三者并列。
- **Composition**: 介绍与特点错落分区，细线组织阅读。
- **Title**: 专注北美，以策略判断连接行动
- **Core message**: 从业务目标到约定关键工作的营销支持。
- **Content**: content.demo.json company的完整介绍及三项特点，词句与另外两组一致。
- **Images**: wordmark-warm.png；页脚完整呈现。

#### Slide 03 - A 服务体系
- **Audience move**: 知道团队角色 → 理解两项核心能力、三项直接执行和专业协作。
- **Relationships**: 两项核心能力等权，并共同支持三项直接执行；专业协作为按需补充。
- **Composition**: 上层等权核心区域，中层执行，下层补充支持。
- **Title**: 两项核心能力，连接策略与执行
- **Core message**: 策略与渠道规划统筹约定执行。
- **Content**: content.demo.json services全字段，不把专业协作画成全包承诺。
- **Images**: wordmark-warm.png；页脚完整呈现。

### Part 2: B 营销工作地图式

#### Slide 04 - B 封面
- **Audience move**: 尚未建立身份 → 识别Outrise、北美聚焦及工作定位。
- **Relationships**: 策略判断、营销规划、关键执行属于一组工作范围，并有推进联系。
- **Composition**: 品牌与定位占据主要区域，辅助短句作为同一条工作路径。
- **Title**: 专注北美市场的 AI-native 营销与增长团队
- **Core message**: Outrise聚焦北美营销与增长。
- **Content**: 与Slide01相同的cover全部文字。
- **Images**: wordmark-warm.png；完整呈现。
- **Cover impact**: 北美聚焦为绑定信息；工作关系作为构图参考。

#### Slide 05 - B 公司介绍
- **Audience move**: 只知道定位 → 理解三个特点如何归属于同一团队。
- **Relationships**: Outrise拥有北美聚焦、策略判断和AI-native三项并列特点。
- **Composition**: 完整介绍在前，以公司为入口展开三项特点关系。
- **Title**: 专注北美，以策略判断连接行动
- **Core message**: 从业务目标到约定关键工作的营销支持。
- **Content**: 与Slide02相同的company全部文字。
- **Images**: wordmark-warm.png；完整呈现。

#### Slide 06 - B 服务体系
- **Audience move**: 知道团队角色 → 理解核心能力到执行的共同支持关系。
- **Relationships**: 两项核心能力等权，共同关联三项执行；专业协作按需补充。
- **Composition**: 清楚的工作地图与连接，核心能力保持并列等权。
- **Title**: 两项核心能力，连接策略与执行
- **Core message**: 策略与渠道规划统筹约定执行。
- **Content**: 与Slide03相同的services全部文字。
- **Images**: wordmark-warm.png；完整呈现。

### Part 3: C 品牌展示式

#### Slide 07 - C 封面
- **Audience move**: 尚未建立身份 → 形成鲜明品牌印象并识别北美定位。
- **Relationships**: 品牌与定位相联，工作范围由同一辅助短句说明。
- **Composition**: 大面积主红、纯白字标和展示型定位排版。
- **Title**: 专注北美市场的 AI-native 营销与增长团队
- **Core message**: Outrise聚焦北美营销与增长。
- **Content**: 与Slide01相同的cover全部文字。
- **Images**: wordmark-white.png；完整呈现。
- **Cover impact**: 北美聚焦为绑定信息；大胆色面作为构图参考。

#### Slide 08 - C 公司介绍
- **Audience move**: 只知道定位 → 获得清楚、易记的公司特点。
- **Relationships**: 完整介绍与三项并列特点一致。
- **Composition**: 展示型标题与色面形成焦点，短段落和三项特点保持可读。
- **Title**: 专注北美，以策略判断连接行动
- **Core message**: 从业务目标到约定关键工作的营销支持。
- **Content**: 与Slide02相同的company全部文字。
- **Images**: wordmark-warm.png；页脚完整呈现。

#### Slide 09 - C 服务体系
- **Audience move**: 知道团队角色 → 记住两项核心能力与三项执行。
- **Relationships**: 两项核心能力等权，共同支持执行；专业协作是补充能力。
- **Composition**: 更有力度的等权能力模块，执行与协作用清楚的次级层级承接。
- **Title**: 两项核心能力，连接策略与执行
- **Core message**: 策略与渠道规划统筹约定执行。
- **Content**: 与Slide03相同的services全部文字。
- **Images**: wordmark-warm.png；页脚完整呈现。

## X. Speaker Notes Requirements

- **Generation**: disabled
