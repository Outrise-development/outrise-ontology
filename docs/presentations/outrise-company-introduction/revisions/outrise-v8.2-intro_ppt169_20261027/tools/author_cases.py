"""Author the four approved case pages; retain all other baseline SVG objects.

Current Canva is the display authority for the sixteen retained pages. Their
offline source is copied from v8.1 and only the footer numbering is changed.
"""
from __future__ import annotations
import html,json,re,shutil
from pathlib import Path
from PIL import Image

ROOT=Path(__file__).resolve().parents[1]
RED,GOLD,INK,IVORY,WHITE,MUTED,RULE='#C9381E','#9B5E00','#111111','#F4F1E9','#FFFFFF','#62625D','#D6D4CB'
FACES={'body':('Noto Sans SC','Instrument Sans'),'medium':('Noto Sans SC Medium','Instrument Sans Medium'),'title':('Noto Sans SC SemiBold','Instrument Sans SemiBold')}
def esc(v):return html.escape(str(v),quote=True)
def inline(value,face):
    parts=re.split(r"([A-Za-z0-9$][A-Za-z0-9$@._/ +\-’',]*)",value)
    return ''.join(f'<tspan font-family="{FACES[face][1]}">{esc(x)}</tspan>' if re.match('[A-Za-z0-9$]',x) else esc(x) for x in parts if x)
def txt(value,x,y,size=26,color=INK,face='body',leading=36,anchor='start'):
    spans=''.join(f'<tspan x="{x}" y="{y+i*leading}">{inline(s,face)}</tspan>' for i,s in enumerate(value.split('\n')))
    return f'<text x="{x}" y="{y}" font-family="{FACES[face][0]}" font-size="{size}" fill="{color}" text-anchor="{anchor}">{spans}</text>'
def rect(x,y,w,h,fill,stroke=None):return f'<rect x="{x}" y="{y}" width="{w}" height="{h}" fill="{fill}"'+(f' stroke="{stroke}" stroke-width="1"' if stroke else '')+'/>'
def line(x,y,x2,y2,color=RULE,w=1):return f'<line x1="{x}" y1="{y}" x2="{x2}" y2="{y2}" stroke="{color}" stroke-width="{w}"/>'
def arrow(x,y,x2,y2,color=RED):return line(x,y,x2,y2,color,2).replace('/>',' marker-end="url(#arrow-red)"/>')
def image(name,x,y,w,h):return f'<image href="../images/{name}" x="{x}" y="{y}" width="{w}" height="{h}" preserveAspectRatio="xMidYMid meet"/>'
def logo(x,y,w,variant='warm'):return f'<image href="../images/wordmark-{variant}.png" x="{x}" y="{y}" width="{w}" height="{w*635/2400:.5f}" preserveAspectRatio="xMidYMid meet"/>'
def g(ident,bounds,*items):return f'<g id="{ident}" data-pptx-bounds="{bounds}">\n'+'\n'.join(items)+'\n</g>'
def footer(n,dark=False):
    color=WHITE if dark else MUTED
    return g('footer','64 650 1152 62',line(64,650,1216,650,MUTED if dark else RULE),logo(64,661,180,'white' if dark else 'warm'),txt('项目经验',1216,666,16,color,anchor='end'),txt(f'{n:02d} / 20',1216,694,16,color,anchor='end'))
def head(n,brand,title,lead,dark=False,band=False):
    color=WHITE if dark else INK
    a=[]
    if band:a.append(rect(0,0,1280,214,RED))
    a.extend([g('opening','64 28 1152 104',txt(f'项目经验 / {brand}',64,52,18,color if dark else MUTED,'medium'),txt(title,64,116,44,color,'title')),g('lead','64 138 1152 76',txt(lead,64,161,26,color,leading=36))])
    return a

CASES=[
{'number':14,'section':'项目经验','title':'两个月推进北美渠道冷启动','brand':'Inner Brightness','subtitle':'团队参与北美 TikTok 渠道冷启动，以达人合作与 AI 辅助素材测试，\n快速验证内容方向、获取流量并推动销售。','metrics':[{'value':'2 个月','label':'完成项目落地'},{'value':'$10K+','label':'月销售额超过 1 万美元'}],'blocks':[{'title':'选择切入方向','body':'明确卖点、受众与达人合作重点。'},{'title':'组织达人与素材','body':'推进达人合作，以 AI 辅助测试脚本。'},{'title':'根据反馈迭代','body':'结合内容与投放反馈，持续迭代。'}],'footerNote':'截图为独立期间数据，不代表整月统计。','audienceMove':'理解北美渠道冷启动中判断、内容测试与执行的衔接','relationships':'三项工作依次推进，项目阶段成果和截图期间数据分别标注','composition':'左侧工作与成果，右侧后台数据与官方账号实证','images':['ib-analytics.png','ib-profile.png']},
{'number':15,'section':'项目经验','title':'重新规划 GTM，推动第二阶段增长','brand':'ARTILUME','subtitle':'面对销量增长放缓与达人渠道依赖，团队参与调整 GTM，\n拓展品牌表达、自有内容矩阵与 TikTok 之外的曝光。','blocks':[{'title':'销售高度依赖达人渠道','body':'建立自有内容，丰富品牌流量来源'},{'title':'技术参数多，理解门槛高','body':'围绕场景、创作价值与操作体验表达产品'},{'title':'渠道动作相对分散','body':'统筹内容、达人、投放与站外曝光节奏'}],'footerNote':'支持科技硬件产品在美国市场的二次增长。','audienceMove':'理解增长瓶颈时Outrise如何调整市场进入与渠道策略','relationships':'三项原有问题逐一对应调整方向','composition':'上方问题到方向的三条对应关系，下方教程与场景内容实证','images':['artilume-tutorials.png','artilume-scenarios.png']},
{'number':16,'section':'项目经验','title':'从品牌定位到北美市场表达','brand':'INUK','subtitle':'参与 INUK 的北美品牌冷启动，将品牌理念、产品特点与用户需求连接，\n形成可持续用于内容、店铺与渠道传播的营销基础。','blocks':[{'title':'市场与产品判断','body':'明确目标用户、使用场景、\n主推产品与阶段优先级。'},{'title':'品牌与价值表达','body':'围绕 Common Nature，梳理\n适合北美用户的品牌叙事。'},{'title':'可复用的内容资产','body':'将定位落实到产品卖点、\n视觉素材与渠道文案。'}],'footerNote':'基于品牌既有理念与素材，进行表达梳理和渠道应用。','audienceMove':'理解定位如何转化为品牌和产品内容资产','relationships':'市场判断、品牌表达、内容资产为递进关系，右侧展示对应成果','composition':'左侧策略到内容说明，右侧两组品牌和产品作品展示','images':['inuk-brand-story.png','inuk-cruiser-feature.png']},
{'number':17,'section':'项目经验','title':'让内容、达人和渠道协同运行','brand':'INUK','subtitle':'将统一的品牌与产品表达落实到内容、达人、广告和渠道承接，\n通过持续复盘调整工作重点。','blocks':[{'title':'内容与产品素材','body':'产品图、场景内容、品牌文章与短视频。'},{'title':'达人及广告触达','body':'达人筛选、建联、寄样与发布跟进。'},{'title':'官网与电商承接','body':'衔接 TikTok、Amazon 与官网购买路径。'},{'title':'表现复盘与调整','body':'测试素材，调整关键词与预算，持续复盘。'}],'footerNote':'已上线品牌文章与广告落地页，展示内容到购买路径的衔接。','audienceMove':'看到品牌策略如何连接营销执行和真实购买承接','relationships':'内容、触达、承接、反馈形成工作链，右侧上线成果与之对应','composition':'深色工作链与明亮的真实官网截图对照','images':['inuk-landing-mobile.jpg','inuk-blog.png','inuk-landing-products.jpg']}
]

def p14(d):
    a=head(14,d['brand'],d['title'],d['subtitle'])
    a.append(g('case-outcomes','64 226 520 114',txt('2 个月',64,284,64,RED,'title'),txt('完成项目落地',64,326,22,MUTED),txt('$10K+',310,284,64,RED,'title'),txt('月销售额超过 1 万美元',310,326,22,MUTED)))
    for i,c in enumerate(d['blocks']):
        y=367+i*90
        a.append(g(f'work-{i+1}',f'64 {y-20} 520 90',rect(64,y-15,5,26,RED),txt(c['title'],84,y+7,28,INK,'medium'),txt(c['body'],84,y+44,26,INK,leading=32)))
    a.append(g('analytics','624 228 592 310',image('ib-analytics.png',624,228,592,281),txt('2026/03/25—04/03｜GMV $12,595.73',624,535,18,MUTED)))
    a.append(g('account-proof','624 540 592 107',image('ib-profile.png',624,540,180,107),txt('@innerbrightness.official',828,567,18,INK,'medium'),txt('官方账号与内容发布阵地',828,600,18,MUTED),txt('截图为独立期间数据，非整月统计',828,631,16,MUTED)))
    return IVORY,a+[footer(14)]

def p15(d):
    a=head(15,d['brand'],d['title'],d['subtitle'],True,True)
    a.extend([g('comparison-heads','64 230 1152 44',txt('原有增长方式',64,258,22,MUTED,'medium'),txt('调整后的 GTM',668,258,22,RED,'medium'))])
    for i,c in enumerate(d['blocks']):
        y=298+i*57
        a.append(g(f'gtm-shift-{i+1}',f'64 {y-25} 1152 53',txt(c['title'],64,y,26,INK),arrow(580,y-9,628,y-9),txt(c['body'],668,y,26,INK),line(64,y+18,1216,y+18)))
    a.append(g('content-proof','64 449 608 191',image('artilume-tutorials.png',64,449,280,186),image('artilume-scenarios.png',368,449,304,168),txt('操作教程与产品使用场景',368,640,16,MUTED)))
    a.append(g('growth-takeaway','724 460 492 174',rect(724,460,4,150,RED),txt('从达人出单，拓展为\n品牌与内容共同驱动',748,493,32,INK,'medium',44),txt('支持科技硬件产品\n在美国市场的二次增长。',748,586,26,INK,leading=36)))
    return IVORY,a+[footer(15)]

def p16(d):
    a=head(16,d['brand'],d['title'],d['subtitle'])
    for i,c in enumerate(d['blocks']):
        y=242+i*132
        a.append(g(f'brand-work-{i+1}',f'64 {y} 420 116',txt(c['title'],64,y+25,28,INK,'medium'),txt(c['body'],64,y+69,26,INK,leading=36)))
    a.append(g('brand-asset','520 236 240 384',image('inuk-brand-story.png',520,236,240,300.4),txt('品牌故事内容资产',520,571,22,INK,'medium'),txt('基于既有 Common Nature 理念',520,602,16,MUTED)))
    a.append(g('product-asset','800 236 416 384',image('inuk-cruiser-feature.png',800,236,416,352),txt('CRUISER 产品卖点与视觉表达',800,621,18,MUTED)))
    a.append(g('asset-attribution','64 625 700 23',txt(d['footerNote'],64,640,16,MUTED)))
    return IVORY,a+[footer(16)]

def p17(d):
    a=head(17,d['brand'],d['title'],d['subtitle'],True)
    for i,c in enumerate(d['blocks']):
        y=246+i*96
        a.append(g(f'integrated-work-{i+1}',f'64 {y-16} 552 96',rect(64,y-13,6,28,RED),txt(c['title'],88,y+10,28,WHITE,'medium'),txt(c['body'],88,y+48,26,WHITE,leading=32),arrow(67,y+64,67,y+81) if i<3 else ''))
    a.extend([g('live-landing','624 220 194 420',image('inuk-landing-mobile.jpg',624,220,194,420)),g('live-blog','842 220 374 216',image('inuk-blog.png',842,220,374,216)),g('live-products','842 460 374 180',image('inuk-landing-products.jpg',842,460,374,180)),g('live-captions','842 437 374 22',txt('已上线品牌文章与广告落地页',842,452,16,WHITE))])
    return INK,a+[footer(17,True)]

def make_content():
    content=json.loads((ROOT/'content.zh-CN.json').read_text(encoding='utf-8'))
    if len(content['slides'])==17:
        slides=content['slides'][:13]+CASES+content['slides'][14:]
    else:
        slides=content['slides'];slides[13:17]=CASES
    for i,s in enumerate(slides,1):s['number']=i
    content['slides']=slides;content['version']='2026-10-27-v8.2-C-cases'
    (ROOT/'content.zh-CN.json').write_text(json.dumps(content,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    parts=['# Outrise 公司介绍 v8.2','\n20 页客户自读稿；保留 v8.1 用户修改，扩充三项目四页案例。']
    def render(obj):
        if isinstance(obj,str):return obj
        if isinstance(obj,list):return '\n'.join(render(x) for x in obj)
        if isinstance(obj,dict):return '\n'.join(str(v) if not isinstance(v,(dict,list)) else render(v) for k,v in obj.items() if k not in {'number','audienceMove','relationships','composition','sourceV7Slide','images'})
        return str(obj)
    for s in slides:parts += [f"\n## {s['number']:02d}｜{s['title']}\n",render({k:v for k,v in s.items() if k!='title'})]
    (ROOT/'content.zh-CN.md').write_text('\n'.join(parts)+'\n',encoding='utf-8')

def main():
    make_content()
    for d in CASES:
        for name in d['images']:shutil.copy2(ROOT/'images/cases'/name,ROOT/'images'/name)
    for src in sorted((ROOT/'sources/baseline-svg').glob('*.svg')):
        old=int(src.name[:2])
        if old==14:continue
        new=old if old<14 else old+3
        value=src.read_text(encoding='utf-8').replace(f'{old:02d} / 17',f'{new:02d} / 20')
        (ROOT/'svg_output'/f'{new:02d}{src.name[2:]}').write_text(value,encoding='utf-8')
    for n,fn,name in [(14,p14,'inner-brightness'),(15,p15,'artilume'),(16,p16,'inuk-brand'),(17,p17,'inuk-execution')]:
        bg,items=fn(CASES[n-14])
        defs='<defs><marker id="arrow-red" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto" markerUnits="strokeWidth"><path d="M0,0 L8,4 L0,8 Z" fill="#C9381E"/></marker></defs>'
        value='\n'.join([f'<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="720" viewBox="0 0 1280 720" font-family="Noto Sans SC" font-size="26" font-weight="normal" data-pptx-page-role="content">',defs,f'<rect id="background" data-pptx-role="background" width="1280" height="720" fill="{bg}"/>',*items,'</svg>'])
        (ROOT/'svg_output'/f'{n:02d}_{name}.svg').write_text(value+'\n',encoding='utf-8')
    print('Authored four case pages; preserved sixteen baseline pages except numbering.')
if __name__=='__main__':main()
