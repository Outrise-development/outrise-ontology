"""Freeze the approved C direction, business copy and reusable brand resources."""
from __future__ import annotations
import copy
import json
import shutil
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DECK = ROOT.parents[1]
DEMO = ROOT.parent / 'outrise-v8-demo_ppt169_20261026'


def block(title, body, **extras):
    return {'title': title, 'body': body, **extras}


def main():
    original = json.loads((DECK / 'content.zh-CN.json').read_text(encoding='utf-8'))
    order = [1, 2, 4, 3, 5, 6, 7, 8, 9, 11, 10, 12, 13, 16, 14, 15, 17]
    pages = [copy.deepcopy(original['slides'][i-1]) for i in order]
    for n, page in enumerate(pages, 1):
        page['number'] = n
        page['sourceV7Slide'] = order[n-1]
        page.pop('diagram', None)
    demo = json.loads((DEMO / 'content.demo.json').read_text(encoding='utf-8'))
    pages[0].update(title='专注北美市场的 AI-native 营销与增长团队', subtitle='', kicker='NORTH AMERICA FOCUSED', blocks=[block('策略判断 · 营销规划 · 关键执行','')])
    pages[1].update(title=demo['company']['title'], subtitle=demo['company']['intro'], blocks=copy.deepcopy(demo['company']['features']))
    pages[2].update(title='服务消费品牌与科技创业公司', subtitle='同样聚焦北美，回应不同的业务需求。', blocks=[
        block('消费品牌出海','面向希望进入或拓展北美市场的 To C 品牌，兼顾电商销售增长，以及品牌认知、定位与持续传播。', eyebrow='CONSUMER BRANDS', label='品牌建设／电商增长'),
        block('科技创业公司 GTM','面向不同类型的科技创业公司，围绕市场进入与增长（GTM），讲清产品价值、明确目标用户，并确定当前阶段的营销重点。', eyebrow='TECH STARTUPS', label='市场进入／增长规划')])
    pages[3].update(title='深入业务讨论，统筹关键工作', subtitle='围绕业务目标参与关键营销工作，让客户团队、Outrise 与专业伙伴按同一计划协作。', blocks=[
        block('共同判断','把产品与业务信息放进市场和用户视角中讨论，比较方向，确定营销重点。'),
        block('营销统筹','将目标转化为阶段计划，协调各方分工，让内容、渠道和资源安排相互衔接。'),
        block('约定执行','推进双方确认的关键任务，跟进进展，并把市场反馈带回后续讨论。')], footerNote='从关键选择到后续推进，持续提供营销判断与协作支持。')
    pages[4].update(title=demo['services']['title'], subtitle=demo['services']['intro'], blocks=copy.deepcopy(demo['services']['cores']), service=copy.deepcopy(demo['services']))
    pages[5].update(title='营销策略与品牌基础', subtitle='把业务信息转化为市场判断，让品牌表达与阶段行动有共同依据。', blocks=[
        block('市场与用户判断','梳理产品、业务目标与目标人群，理解需求、使用场景和购买考虑。', question='面向谁', output='用户与需求梳理'),
        block('定位与价值表达','明确为谁创造什么价值，形成适合北美市场的定位、叙事和沟通重点。', question='表达什么价值', output='定位与价值表达'),
        block('GTM 与营销路线','确定阶段重点、渠道优先级与资源安排，形成可以推进的行动计划。', question='优先做什么', output='阶段营销路线图')])
    pages[6].update(title='渠道运营与增长', subtitle='把渠道选择、资源投入和关键行动放在同一条增长路径上。', blocks=[
        block('确定渠道组合','结合用户路径与业务阶段，判断社交媒体、电商平台、品牌官网及其他渠道各自的作用。', output='渠道角色与组合'),
        block('安排资源与行动','明确投入顺序、预算重点、内容需求和团队分工，让关键工作能够衔接推进。', output='资源安排与执行分工'),
        block('根据反馈持续调整','结合渠道表现和用户反馈，判断哪些方向值得继续投入，调整下一步计划。', output='表现复盘与调整建议')])
    pages[7].update(title='三类执行能力，承接关键任务', subtitle='根据策略选择工作模块，由 Outrise 直接推进约定的关键执行。', blocks=[
        block('内容营销','围绕品牌与产品价值，制定内容方向、创意和传播计划，制作约定的图文、视频及社媒素材。', label='内容方向／创意方案／传播素材'),
        block('达人营销','筛选与触达适配达人，策划合作方式，沟通内容要求，推进发布并复盘合作表现。', label='达人筛选／合作沟通／发布跟进'),
        block('广告与投放','制定投放计划，协同广告素材，执行约定渠道的广告工作，并根据反馈优化。', label='投放计划／广告执行／优化建议')], footerNote='具体渠道、素材与推进职责根据项目目标约定。')
    pages[8].update(title='按需组织专业资源，拓展项目能力', subtitle='当项目需要本地或专项能力，Outrise 负责触达、筛选与协调。', blocks=[
        block('本地渠道拓展','识别适合接触的渠道与资源，推进沟通，并协调后续合作机会。'),
        block('落地执行支持','对接相应的本地专业团队，协调任务要求、执行节奏与交付衔接。'),
        block('公共关系（PR）','按传播或业务需求引入专业伙伴，共同明确工作内容与推进方式。')], footerNote='伙伴参与方式与工作范围在方案中明确。')
    pages[9].update(title='让营销工作有依据、有计划、有成果', subtitle='把策略、规划、执行和反馈转化为团队能够使用的工作成果。', blocks=[
        block('定位与价值表达','说明目标用户、核心价值与沟通重点，以及重要选择背后的判断依据。'),
        block('渠道组合与行动计划','明确阶段重点、投入顺序、资源安排与责任分工。'),
        block('约定的执行成果','按合作范围交付内容素材、达人合作、广告工作等关键成果。'),
        block('复盘记录与后续建议','整理渠道表现与用户反馈，提出下一轮行动与调整建议。')], footerNote='交付项、深度与形式根据合作目标共同明确。')
    pages[10].update(title='从业务理解到复盘，六步推进项目', subtitle='在关键选择与计划上形成共识，再推进执行、反馈和调整。', blocks=[
        block('理解业务','明确产品、目标、现有基础与资源约束。', participation='共同梳理业务与目标'),
        block('建立判断','研究市场与用户，识别核心营销问题。'),
        block('确定选择','比较方向与优先级，确认当前重点。', participation='共同确认关键选择'),
        block('制定规划','形成阶段计划、任务分工与资源安排。', participation='共同确认计划与分工'),
        block('推进执行','推进约定任务，协调客户团队与专业伙伴。'),
        block('复盘调整','结合市场反馈，确定下一步行动。', participation='共同讨论后续行动')], footerNote='客户参与关键选择与计划确认；Outrise 组织推进约定工作。')
    pages[11].update(title='AI 已融入我们的内部执行体系', subtitle='Outrise 已建立高度自动化、智能化、以 AI 为驱动的执行体系。', blocks=[
        block('研究与知识','整理资料与信息\n积累项目经验\n形成知识基础'),
        block('规划与任务','衔接信息与计划\n协调任务与进度\n跟进工作反馈'),
        block('内容与创意','支持创意探索\n协同素材生产\n推进内容迭代'),
        block('反馈与改进','整理项目反馈\n更新知识与流程\n支持下一轮工作')], footerNote='团队负责商业判断、方向与质量。', caption='内部执行体系的功能关系示意')
    pages[12].update(title='理解技术，也理解市场', subtitle='把技术公司的产品逻辑，转化为用户能够理解的价值与营销行动。', blocks=[
        block('产品价值','理解科技公司的产品、目标与需求，把技术能力转化为具体价值与使用场景。'),
        block('市场变化','关注 AI 对信息发现、内容传播和用户决策的影响，持续调整策略与渠道选择。'),
        block('快速适应','衔接研究、创意与市场反馈，更灵活地组织尝试，并调整下一轮行动。')])
    pages[13].update(title='箱包品牌的北美多渠道实践', subtitle='匿名项目经验｜以已确认的工作范围，呈现品牌、内容与渠道的协同。', background='服务面向北美市场的消费箱包品牌，相关工作涉及品牌表达、内容、达人及多个线上渠道。', blocks=[
        block('品牌与产品表达','品牌表达、产品与店铺优化。'),
        block('内容与达人合作','达人筛选与建联、内容任务协同。'),
        block('线上渠道安排','Amazon 广告调整；TikTok、Amazon 与官网渠道规划。')], collaboration=['围绕品牌与产品信息统一沟通重点','协调内容、达人与渠道任务的衔接','结合渠道表现与内容反馈讨论后续选择'], footerNote='匿名过程型案例｜展示工作范围与协同方式。')
    pages[14].update(title='一个入口，由 Outrise 统一负责', subtitle='在约定合作范围内，统筹策略、进度、质量与专业伙伴，对整体合作交付负责并背书。', blocks=[
        block('策略与决策','理解业务，提出判断，制定方向与阶段规划。'),
        block('项目统筹','协调任务、进度与沟通，跟进交付、处理协作问题。'),
        block('直接执行','承担约定的内容、达人、广告与投放等关键工作。'),
        block('专业协作','组织专项伙伴，明确要求与分工，衔接整体交付。')], footerNote='伙伴参与执行时，客户仍由 Outrise 统一承接。')
    pages[15].update(title='按业务阶段，选择合适的合作深度', subtitle='以策略咨询为核心，结合业务目标约定工作范围与执行支持。', blocks=[
        block('策略咨询','围绕市场、定位或渠道等明确问题，形成判断、建议与行动方向。', label='需要厘清问题与方向'),
        block('阶段性 GTM／品牌项目','围绕明确的阶段目标，共同制定方案，完成规划与选定的关键执行。', label='需要推进阶段性目标'),
        block('持续营销统筹与团队支持','持续参与重点讨论、资源协调与工作复盘。在持续合作中，我们承担类似外部 CMO 的营销统筹职责，并按约定推进关键工作。', label='需要持续判断与推进')], footerNote='每次合作共同明确：目标、交付、分工与评估方式。')
    pages[16].update(title='从你的北美市场目标开始', subtitle='告诉我们你的产品、目标与当前营销难题，一起确定合适的合作切入点。', blocks=[
        block('产品与业务','你为谁提供什么价值？'), block('北美市场目标','当前最希望推进什么？'), block('营销难题','哪些营销工作需要支持？')], footerNote='专注北美市场的 AI-native 营销与增长团队')
    jobs = [
        ('识别Outrise、北美聚焦与AI-native定位','品牌与定位相联；三项工作范围并列','大红色场、白色字标、展示型定位与上扬切面'),
        ('理解公司特点及工作方式','公司介绍统摄北美聚焦、策略判断、AI-native三个特点','延续已选C公司介绍样张，标题色带与三个特点分区'),
        ('判断自己属于哪类服务对象','消费品牌与科技创业公司为等权客群，分别对应需求','两个等权大区域，标题、说明、需求标签对齐'),
        ('理解Outrise参与的深度与分工','共同判断、营销统筹、约定执行为合作中的三类职责','品牌入口与三条参与职责形成关联'),
        ('理解整体服务层级','两项核心能力等权，共同支撑三项直接执行；专业协作为补充','延续已选C服务样张，大红核心能力区域与次级执行层'),
        ('知道策略工作回答什么、形成什么','三类策略问题与相应工作成果逐项对应','问题、工作说明与成果名称逐列对齐'),
        ('理解渠道规划、资源与调整的衔接','渠道角色、资源行动、反馈调整依次相联','三条横向工作区域，成果在共同基线上'),
        ('知道三类直接执行的范围','内容、达人、广告三项直接执行并列','三项平等能力，以作用、工作说明和成果标签组织'),
        ('理解何时需要专项资源及组织关系','Outrise组织三类专业资源；按需引入','单一组织入口连接三个专业资源分支'),
        ('知道实际可以获得的工作成果','策略表达、行动计划、执行成果、复盘建议四类并列','大红主色承载四条清楚可查的成果说明'),
        ('理解推进顺序及客户参与节点','六步顺序相联，客户参与业务、关键选择、计划与复盘','两行各三步，均从左向右阅读，参与节点清楚标记'),
        ('理解AI内部体系及团队责任','知识、任务、内容、反馈构成工作链并形成回流；团队判断横跨体系','四个工作环节和反馈线，团队责任独立强调'),
        ('理解技术与市场两方面的判断能力','产品价值、市场变化、快速适应共同支持营销工作','黑底，三个暖色关键词与完整解释相对应'),
        ('理解真实项目范围与协同方式','背景统摄三类已确认工作；品牌、内容、渠道任务需要衔接','背景置前，工作范围与协同方式各自组织'),
        ('识别统一责任入口与角色分工','客户对接Outrise，Outrise统筹四类角色并承担交付责任','客户到Outrise，再展开四类职责，不出现人员信息'),
        ('选择适合当前需求的合作形式','三种合作形式等权比较，需求与重点逐项对应','三种形式同宽，标题区与正文起点一致'),
        ('知道下一步沟通入口与准备信息','产品、北美目标、营销难题共同支持合作切入点','大红结束页，白色正式字标、沟通邀请与邮箱为焦点')]
    for page, (move, rel, comp) in zip(pages, jobs):
        page['audienceMove'] = move
        page['relationships'] = rel
        page['composition'] = comp
    payload = {'title': 'Outrise 公司介绍', 'version': '2026-10-26-v8-C', 'language': 'zh-CN', 'audience': original['audience'], 'slides': pages, 'provenance': original['provenance'], 'selectedDirection': 'C｜品牌展示式'}
    payload['provenance']['caseBoundary'] = '第14页采用已确认的匿名箱包品牌工作范围；不新增量化成效或客户背书。'
    payload['provenance']['sourcePolicy'] += ' v8于2026-10-26重新只读读取Canva v7全文，与本地源核对；原始妙记未重新核验。'
    (ROOT / 'content.zh-CN.json').write_text(json.dumps(payload, ensure_ascii=False, indent=2)+'\n', encoding='utf-8')
    copy_md = ['# Outrise 公司介绍 v8','', '方向：C｜品牌展示式。以下为客户可见文案；内部溯源仅保存在JSON。','']
    for page in pages:
        copy_md += [f"## {page['number']:02d}｜{page['title']}", '', page['subtitle'], '']
        if page.get('background'):copy_md += [page['background'], '']
        if page.get('service'):
            for entry in page['service']['execution']:copy_md += [f"- **{entry['title']}**：{entry['body']}"]
        for b in page['blocks']:
            copy_md += [f"**{b['title']}**", b.get('body','')]
            copy_md += [f"{key}：{b[key]}" for key in ['question','output','label','participation'] if b.get(key)]
            copy_md += ['']
        if page.get('collaboration'):copy_md += page['collaboration']+['']
        if page.get('footerNote'):copy_md += [page['footerNote'], '']
        if page.get('contact'):copy_md += [page['contact']['email'],'']
    (ROOT / 'content.zh-CN.md').write_text('\n'.join(copy_md), encoding='utf-8')
    for folder in ['brand','fonts','images/fonts']:
        shutil.copytree(DEMO/folder, ROOT/folder, dirs_exist_ok=True)
    for logo in ['warm','white','black']:
        shutil.copy2(DEMO/f'images/wordmark-{logo}.png', ROOT/f'images/wordmark-{logo}.png')
    shutil.copy2(DEMO/'.gitattributes', ROOT/'.gitattributes')
    shutil.copy2(DEMO/'.gitignore', ROOT/'.gitignore')
    (ROOT / 'direction-selection.json').write_text(json.dumps({'source':'User answer in this chat on 2026-10-26','answer':'C｜品牌展示式（突出品牌个性）','scope':'17页完整版及独立Canva稿，其他制作判断已授权；不再逐页审批','demoProject':DEMO.name},ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    # Complete planning artifacts; custom style comes directly from the approved C samples.
    prior=(DEMO/'design_spec.md').read_text(encoding='utf-8').split('## IX. Content Outline')[0]
    prior=prior.replace('Outrise v8 Design Comparison','Outrise v8 Intro Deck').replace('| Page Count | 9 |','| Page Count | 17 |')
    start=prior.index('| Target Audience |');end=prior.index('## II. Canvas Specification')
    prior=prior[:start]+'''| Target Audience | 进入或拓展北美市场的消费品牌与科技创业公司潜在客户 |
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

'''+prior[end:]
    a=prior.index('- **Mode Behavior**:');b=prior.index('### Color Scheme')
    prior=prior[:a]+'''- **Mode Behavior**: 前四页回答身份、客户、参与方式，随后解释服务、成果、流程、优势、案例、责任与合作。每页回答一个问题，最后引导业务沟通。
- **Visual style**: custom
- **Visual Style Behavior**: 已选C品牌展示式：大红色场、正式反白字标、展示型标题形成品牌重心。正文通过开放分区、细线、成果条目及必要关系图组织；按页面任务改变红色场比例和阅读节奏，保留约19.5pt正文，不连续机械复制三栏。
- **Theme**: 直接、清楚、暖色。24度上扬切面只在适合的身份与收束页面作为跨页品牌线索。
- **Tone**: 具体说明工作与职责，以约定关键执行为边界，不增加量化承诺。

'''+prior[b:]
    a=prior.index('### Deck-wide Direction');b=prior.index('## VI. Icon Usage Specification')
    prior=prior[:a]+'''### Deck-wide Direction

- **Hierarchy direction**: 每页一个结论，完整解释与必要关系共同支持客户自读。
- **Composition tendency**: 延续C的品牌色场与展示型排版，服务、流程、责任按各自语义组织。
- **Cross-page continuity**: 品牌字标、色值、字体、细线与页脚统一；核心能力与客群等权。
- **Spacing posture**: 正文26px、行距38px为起点，以改写和重新组织解决拥挤。
- **Spacing anchors**: page margin=64px；block gap=32px；column gutter=32px；corner radius=0px；body leading=38px。

'''+prior[b:]
    prior=prior.replace('本轮样张通过文字与关系几何表达，不新增装饰图标；正式17页如需图标使用统一线性系统。','用必要的方向箭头、细线与工作关系表达含义；无需额外图标资产。')
    roster=['## IX. Content Outline','']
    for page in pages:
        roster += [f"#### Slide {page['number']:02d} - {page['title']}",f"- **Audience move**: {page['audienceMove']}。", f"- **Relationships**: {page['relationships']}。",f"- **Composition**: {page['composition']}。",f"- **Title**: {page['title']}",f"- **Core message**: {page['subtitle'] or page['title']}",f"- **Content**: content.zh-CN.json第{page['number']}页全部客户可见字段；保留范围与限定语，表达可以优化。",f"- **Images**: {'wordmark-white.png' if page['number'] in [1,10,12,13,17] else 'wordmark-warm.png'}；完整呈现。"]
        if page['number']==1:roster += ['- **Cover impact**: 专注北美的AI-native营销与增长团队是绑定身份；大红主色、反白Logo与定位为主要焦点。']
        if page['number']==17:roster += ['- **Closing impact**: 以产品、北美目标与营销难题启动业务沟通，突出已确认邮箱。']
        roster += ['']
    (ROOT/'design_spec.md').write_text(prior+'\n'.join(roster)+'\n## X. Speaker Notes Requirements\n\n- **Generation**: disabled\n',encoding='utf-8')
    lock=(DEMO/'spec_lock.md').read_text(encoding='utf-8')
    lock=lock.replace('Outrise品牌方比较三种视觉方向；完整介绍面向潜在客户独立阅读','进入或拓展北美的消费品牌与科技创业公司潜在客户').replace('用相同内容比较三种设计方向，选定后完成17页intro deck','清楚介绍Outrise定位、服务、工作方式、优势与责任，引导业务沟通')
    a=lock.index('- mode_behavior:');b=lock.index('## colors')
    lock=lock[:a]+'''- mode_behavior: 前四页回答身份、客户与参与方式，随后服务、成果、流程、优势、案例、责任、合作，结尾引导沟通。

## visual_style
- visual_style: custom
- visual_style_behavior: 已选C品牌展示式，大红色场、正式反白字标和展示型标题；开放分区、细线与必要关系图按页面含义组织，字体、品牌图形和页脚统一。

'''+lock[b:]
    a=lock.index('## page_rhythm');b=lock.index('## pptx_structure')
    lock=lock[:a]+'## page_rhythm\n'+''.join(f"- P{n:02d}: {'anchor' if n in [1,5,12,15,17] else 'dense'}\n" for n in range(1,18))+'\n'+lock[b:]
    if '--include-lock' in sys.argv:
        (ROOT/'spec_lock.md').write_text(lock,encoding='utf-8')
    print('Prepared 17-slide C direction; copy, sources, brand assets and design spec written. Lock included: '+str('--include-lock' in sys.argv))


if __name__ == '__main__':
    main()
