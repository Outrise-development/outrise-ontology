"""Page-specific native SVG authoring for the selected C brand direction."""
from __future__ import annotations
import argparse
import html
import json
import re
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
PAGES=json.loads((ROOT/'content.zh-CN.json').read_text(encoding='utf-8'))['slides']
RED,GOLD,INK,IVORY,WHITE,MUTED,RULE='#C9381E','#9B5E00','#111111','#F4F1E9','#FFFFFF','#62625D','#D6D4CB'
FACES={'body':('Noto Sans SC','Instrument Sans'),'medium':('Noto Sans SC Medium','Instrument Sans Medium'),'title':('Noto Sans SC SemiBold','Instrument Sans SemiBold')}


def esc(v):return html.escape(str(v),quote=True)
def advance(t,size):return sum(size*(1.10 if ord(c)>255 else .56 if c.isupper() else .51 if c!=' ' else .28) for c in t)
def wrap(value,size,width):
    out=[]
    for source in value.split('\n'):
        line=''
        for token in re.findall(r'[A-Za-z0-9@._/+-]+|[^A-Za-z0-9@._/+-]',source):
            if line and advance(line+token,size)>width:
                if token in '，。、；：！？）】》·':out.append(line[:-1].rstrip());line=line[-1:]+token
                else:out.append(line.rstrip());line=token.lstrip()
            else:line+=token
        out.append(line.rstrip())
    return out
def inline(value,face):
    parts=re.split(r"([A-Za-z0-9][A-Za-z0-9@._/ +\-’']*)",value)
    return ''.join(f'<tspan font-family="{FACES[face][1]}">{esc(x)}</tspan>' if re.match('[A-Za-z0-9]',x) else esc(x) for x in parts if x)
def txt(value,x,y,*,size=26,color=INK,face='body',width=None,leading=38,anchor='start'):
    lines=wrap(value,size,width) if width else value.split('\n')
    spans=''.join(f'<tspan x="{x}" y="{y+i*leading}">{inline(s,face)}</tspan>' for i,s in enumerate(lines))
    return f'<text x="{x}" y="{y}" font-family="{FACES[face][0]}" font-size="{size}" fill="{color}" text-anchor="{anchor}">{spans}</text>'
def rect(x,y,w,h,fill,stroke=None,sw=1,rotate=None):
    a=f' stroke="{stroke}" stroke-width="{sw}"' if stroke else ''
    if rotate is not None:a+=f' transform="rotate({rotate} {x+w/2} {y+h/2})"'
    return f'<rect x="{x}" y="{y}" width="{w}" height="{h}" fill="{fill}"{a}/>'
def line(x1,y1,x2,y2,color=RULE,width=1):return f'<line x1="{x1}" y1="{y1}" x2="{x2}" y2="{y2}" stroke="{color}" stroke-width="{width}"/>'
def dot(x,y,r=4,color=RED):return f'<circle cx="{x}" cy="{y}" r="{r}" fill="{color}"/>'
def arrow(x1,y1,x2,y2,color=RED,width=2):
    mark='white' if color==WHITE else 'red'
    return f'<line x1="{x1}" y1="{y1}" x2="{x2}" y2="{y2}" stroke="{color}" stroke-width="{width}" marker-end="url(#arrow-{mark})"/>'
def logo(x,y,w,variant='warm'):return f'<image href="../images/wordmark-{variant}.png" x="{x}" y="{y}" width="{w}" height="{w*635/2400:.5f}" preserveAspectRatio="xMidYMid meet"/>'
def g(ident,bounds,*items,role=None):return f'<g id="{ident}" data-pptx-bounds="{bounds}"'+(f' data-pptx-role="{role}"' if role else '')+'>\n'+'\n'.join(items)+'\n</g>'
def footer(n,dark=False,brand=True):
    d=PAGES[n-1];color=WHITE if dark else MUTED
    a=[] if dark else [line(64,650,1216,650)]
    if brand:a.append(logo(64,661,180,'white' if dark else 'warm'))
    else:a.append(txt(d['footerNote'] if n==17 else 'OUTRISE / COMPANY INTRODUCTION',64,694,size=16,color=color))
    a.extend([txt(d['section'],1216,666,size=16,color=color,anchor='end'),txt(f'{n:02d} / 17',1216,694,size=16,color=color,anchor='end')])
    return g('footer','64 650 1152 62',*a,role='footer')
def header(n,dark=False,band=False,intro=True):
    d=PAGES[n-1];color=WHITE if dark else INK
    a=[]
    if band:a.append(g('title-field','0 0 1280 210',rect(0,0,1280,210,RED),role='background'))
    a.append(g('opening','64 28 1152 116',txt(d['section'],64,52,size=18,color=WHITE if dark else MUTED,face='medium'),txt(d['title'],64,124,size=44,color=color,face='title')))
    if intro and d['subtitle']:
        height=44+(len(wrap(d['subtitle'],26,1152))-1)*38
        a.append(g('lead',f'64 148 1152 {height}',txt(d['subtitle'],64,180,width=1152,color=color)))
    return a
def note(n,y=624,dark=False):return g('scope-note',f'64 {y-28} 1152 40',txt(PAGES[n-1]['footerNote'],64,y,size=22,color=WHITE if dark else MUTED))


def p01():
    d=PAGES[0]
    return RED,[g('brand','64 46 1152 275',*([txt(d['kicker'],1216,67,size=18,color=WHITE,face='medium',anchor='end')] if d.get('kicker') else []),logo(64,103,800,'white'),g('upward-field','956 150 260 162',rect(982,200,190,24,WHITE,rotate=-24),rect(1040,266,122,12,GOLD,rotate=-24))),g('positioning','64 364 1152 266',txt('专注北美市场的\nAI-native 营销与增长团队',64,431,size=64,color=WHITE,face='title',leading=83),txt(d['blocks'][0]['title'],64,615,color=WHITE)),footer(1,True,False)]


def p02():
    d=PAGES[1];a=header(2,True,True,False)
    a.append(g('company-intro','64 240 1152 125',txt(d['subtitle'],64,273,width=1152)))
    for i,c in enumerate(d['blocks']):
        x=64+i*400
        a.append(g(f'feature-{i+1}',f'{x} 410 352 217',rect(x,412,44,4,RED),txt(c['title'],x,465,size=32,face='medium'),txt(c['body'],x,518,width=352)))
    return IVORY,a+[footer(2)]


def p03():
    d=PAGES[2];a=header(3)
    for i,c in enumerate(d['blocks']):
        x=64+i*592
        a.append(g(f'client-{i+1}',f'{x} 246 560 370',rect(x,246,560,370,RED),txt(c['eyebrow'],x+32,286,size=18,color=WHITE,face='medium'),txt(c['title'],x+32,348,size=36,color=WHITE,face='medium'),txt(c['body'],x+32,407,width=496,color=WHITE),line(x+32,548,x+528,548,WHITE),txt(c['label'],x+32,590,color=WHITE,face='medium')))
    return IVORY,a+[footer(3)]


def p04():
    d=PAGES[3];a=header(4)
    a.append(g('participation-entry','64 248 280 340',rect(64,248,280,340,RED),logo(88,294,232,'white'),txt('持续参与\n关键营销工作',88,430,size=32,color=WHITE,face='medium',leading=48)))
    for i,c in enumerate(d['blocks']):
        y=270+i*110
        a.append(g(f'participation-{i+1}',f'400 {y-22} 816 108',line(400,y-22,1216,y-22,RED,1),txt(c['title'],400,y+14,size=28,face='medium'),txt(c['body'],652,y+10,width=564)))
    return IVORY,a+[note(4),footer(4)]


def p05():
    # Offline Noto labels are rebuild substitutes; the latest Canva export retains the user's IdeaFonts bold face.
    d=PAGES[4];s=d['service'];a=header(5)
    a.append(g('core-label','64 192 1152 40',txt(s['coreLabel'],64,217,size=27,color=RED,face='medium')))
    cores=[rect(0,234,1280,170,RED),line(640,258,640,380,WHITE)]
    for i,c in enumerate(s['cores']):
        x=64+i*640
        cores.append(g(f'core-{i+1}',f'{x} 252 512 144',txt(c['title'],x,279,size=32,color=WHITE,face='medium'),txt(c['body'],x,333,width=512,color=WHITE)))
    a.append(g('core-field','0 234 1280 170',*cores))
    a.append(g('execution-label','64 410 1152 40',txt(s['executionLabel'],64,440,size=27,color=RED,face='medium')))
    for i,c in enumerate(s['execution']):
        x=64+i*400
        a.append(g(f'execution-{i+1}',f'{x} 456 369 88',txt(c['title'],x,488,size=32,face='medium'),txt(c['body'],x,529,size=22,color=MUTED),*([] if i==2 else [line(x+368,464,x+368,540)])))
    a.append(g('partners','64 568 1152 68',rect(64,568,1152,68,RED),txt(s['partnerLabel'],84,600,size=27,color=WHITE,face='medium'),txt(s['partnerScope'],226,600,size=22,color=WHITE),txt(s['partnerBody'],226,629,size=22,color=WHITE)))
    return IVORY,a+[footer(5)]


BUILDERS={1:p01,2:p02,3:p03,4:p04,5:p05}
NAMES={1:'cover',2:'company',3:'clients',4:'participation',5:'services'}


def p06():
    d=PAGES[5];a=header(6)
    for i,c in enumerate(d['blocks']):
        x=64+i*400
        a.append(g(f'strategy-{i+1}',f'{x} 240 352 400',txt(c['question'],x,283,size=32,color=RED,face='medium'),line(x,312,x+352,312,RED),txt(c['title'],x,359,size=28,face='medium'),txt(c['body'],x,411,width=352),line(x,565,x+352,565),txt('形成的工作成果',x,593,size=18,color=MUTED,face='medium'),txt(c['output'],x,627,size=26,color=RED,face='medium')))
    return IVORY,a+[footer(6)]


def p07():
    d=PAGES[6];a=header(7)
    a.append(g('channel-field','64 236 280 388',rect(64,236,280,388,RED),txt('从渠道到行动',88,282,size=22,color=WHITE),txt('渠道角色\n\n资源投入\n\n市场反馈',88,354,size=32,color=WHITE,face='medium',leading=44)))
    for i,c in enumerate(d['blocks']):
        y=236+i*136
        a.append(g(f'channel-work-{i+1}',f'400 {y} 816 132',line(400,y,1216,y,RED),txt(c['title'],400,y+40,size=28,face='medium'),txt(c['output'],1216,y+40,size=22,color=RED,anchor='end'),txt(c['body'],400,y+84,width=816)))
    return IVORY,a+[footer(7)]


def p08():
    d=PAGES[7];a=header(8,True,True)
    for i,c in enumerate(d['blocks']):
        x=64+i*400
        parts=[rect(x,255,48,4,RED),txt(c['title'],x,313,size=32,face='medium'),txt(c['body'],x,371,width=352),txt(c['label'],x,572,size=22,color=RED,width=352,leading=30)]
        if i<2:parts.append(line(x+376,255,x+376,600))
        a.append(g(f'execution-{i+1}',f'{x} 248 378 360',*parts))
    return IVORY,a+[note(8,638),footer(8)]


def p09():
    d=PAGES[8];a=header(9,intro=False)
    a.append(g('lead','64 148 1152 82',txt(d['subtitle'].replace('，Outrise ','，\nOutrise ',1),64,180,width=1152)))
    parts=[g('resource-entry','64 270 300 330',rect(64,270,300,330,RED),logo(94,306,240,'white'),txt(d['entryLabel'].replace('／','\n'),94,459,size=32,color=WHITE,face='medium',leading=48)),g('resource-links','364 270 56 280',line(364,435,400,435,RED,2),line(400,278,400,510,RED,2),arrow(400,278,420,278),arrow(400,394,420,394),arrow(400,510,420,510))]
    for i,c in enumerate(d['blocks']):
        y=254+i*116
        body=c['body'].replace('，','，\n',1)
        parts.append(g(f'professional-resource-{i+1}',f'448 {y} 768 122',txt(c['title'],448,y+32,size=28,face='medium'),txt(body,448,y+74,width=768)))
    a.append(g('resource-map','64 250 1152 358',*parts))
    return IVORY,a+[note(9,638),footer(9)]


def p10():
    d=PAGES[9];a=header(10,True)
    for i,c in enumerate(d['blocks']):
        x=64+(i%2)*608;y=236+(i//2)*188
        a.append(g(f'deliverable-{i+1}',f'{x} {y} 544 174',line(x,y,x+544,y,WHITE),txt(c['title'],x,y+46,size=32,color=WHITE,face='medium'),txt(c['body'],x,y+94,width=528,color=WHITE)))
    return RED,a+[note(10,632,True),footer(10,True)]


BUILDERS.update({6:p06,7:p07,8:p08,9:p09,10:p10})
NAMES.update({6:'strategy',7:'channels',8:'execution',9:'partners',10:'deliverables'})


def p11():
    d=PAGES[10];a=header(11)
    nodes=[]
    edges=[arrow(424,314,456,314),arrow(824,314,856,314),arrow(424,514,456,514),arrow(824,514,856,514),line(1040,398,1040,414,RED,2),line(1040,414,240,414,RED,2),arrow(240,414,240,430)]
    for i,c in enumerate(d['blocks']):
        x=64+(i%3)*400;y=230+(i//3)*200
        parts=[rect(x,y,352,168,WHITE,stroke=RULE),txt(f'{i+1:02d}',x+20,y+30,size=18,color=RED,face='medium'),txt(c['title'],x+20,y+72,size=28,face='medium'),txt(c['body'],x+20,y+116,width=312)]
        if c.get('participation'):parts.append(txt(c['participation'],x+332,y+30,size=16,color=RED,anchor='end'))
        nodes.append(g(f'process-step-{i+1}',f'{x} {y} 352 168',*parts))
    a.append(g('six-step-process','64 228 1152 372',*edges,*nodes))
    return IVORY,a+[note(11,632),footer(11)]


def p12():
    d=PAGES[11];a=header(12,True)
    if d.get('caption'):a.append(g('system-caption','64 214 1152 34',txt(d['caption'],64,239,size=22,color=WHITE)))
    chain=[]
    for i,c in enumerate(d['blocks']):
        x=64+i*296
        body=c['body']
        chain.append(g(f'ai-stage-{i+1}',f'{x} 270 264 254',rect(x,270,264,254,'none',stroke=WHITE),txt(c['title'],x+20,316,size=28,color=WHITE,face='medium'),txt(body,x+20,372,width=224,color=WHITE)))
        if i<3:chain.append(arrow(x+272,398,x+288,398,WHITE))
    chain.extend([line(1084,524,1084,554,WHITE,2),line(1084,554,196,554,WHITE,2),arrow(196,554,196,524,WHITE)])
    a.append(g('ai-work-chain','64 268 1152 302',*chain))
    a.append(g('team-judgment','64 590 1152 46',rect(64,590,1152,46,WHITE),txt(d['footerNote'],640,622,color=RED,face='medium',anchor='middle')))
    return RED,a+[footer(12,True)]


def p13():
    d=PAGES[12];a=header(13,True)
    for i,c in enumerate(d['blocks']):
        y=240+i*130
        a.append(g(f'market-understanding-{i+1}',f'64 {y} 1152 116',txt(c['title'],64,y+47,size=44,color=RED,face='medium'),txt(c['body'],400,y+34,width=816,color=WHITE),line(400,y+112,1216,y+112,MUTED)))
    return INK,a+[footer(13,True)]


def p14():
    d=PAGES[13];a=header(14,True,True)
    a.append(g('case-background','64 238 1152 82',txt(d['background'],64,273,width=1152)))
    for i,c in enumerate(d['blocks']):
        y=334+i*94
        body=c['body']
        a.append(g(f'case-scope-{i+1}',f'64 {y} {632 if i==2 else 584} {120 if i==2 else 92}',txt(c['title'],64,y+32,size=28,face='medium'),txt(body,64,y+(68 if i==2 else 74),width=584)))
    panel=[rect(720,328,496,310,RED),txt('协同方式',752,370,size=32,color=WHITE,face='medium')]
    for i,step in enumerate(d['collaboration']):panel.extend([txt(step,752,414+i*82,width=432,color=WHITE)])
    a.append(g('case-collaboration','720 328 496 310',*panel))
    a.append(footer(14))
    a.append(g('case-context-note','300 672 670 30',txt(d['footerNote'],300,694,size=16,color=MUTED),role='footer'))
    return IVORY,a


def p15():
    d=PAGES[14];a=header(15)
    structure=[g('client','64 244 184 104',rect(64,244,184,104,'none',stroke=RED,sw=2),txt('客户',156,306,size=32,face='medium',anchor='middle')),
        g('unified-owner','340 244 600 104',rect(340,244,600,104,RED),logo(368,272,180,'white'),txt('统一负责与背书',600,306,color=WHITE,face='medium')),
        g('responsibility-links','196 292 888 132',arrow(272,296,320,296),line(640,348,640,400,RED,2),line(196,400,1084,400,RED,2),*[arrow(x,400,x,424) for x in [196,492,788,1084]])]
    for i,c in enumerate(d['blocks']):
        x=64+i*296
        structure.append(g(f'responsibility-{i+1}',f'{x} 432 264 174',txt(c['title'],x,474,size=28,face='medium'),txt(c['body'],x,522,width=264)))
    a.append(g('accountability-map','64 242 1152 366',*structure))
    return IVORY,a+[note(15,638),footer(15)]


BUILDERS.update({11:p11,12:p12,13:p13,14:p14,15:p15})
NAMES.update({11:'process',12:'ai-system',13:'market',14:'case',15:'accountability'})


def p16():
    d=PAGES[15];a=header(16,True,True)
    titles=['策略咨询','阶段性 GTM／\n品牌项目','持续营销统筹\n与团队支持']
    for i,c in enumerate(d['blocks']):
        x=64+i*400
        parts=[rect(x,246,48,4,RED),txt(titles[i],x,296,size=32,face='medium',leading=44),txt(c['label'],x,382,size=22,color=RED),txt(c['body'],x,430,width=352)]
        if i<2:parts.append(line(x+376,246,x+376,600))
        a.append(g(f'cooperation-{i+1}',f'{x} 242 378 364',*parts))
    return IVORY,a+[note(16,638),footer(16)]


def p17():
    d=PAGES[16];a=[g('closing-brand','64 50 1152 212',logo(64,81,640,'white')),
        g('closing-invitation','64 296 784 258',txt('从你的北美市场\n目标开始',64,354,size=64,color=WHITE,face='title',leading=83),txt(d['subtitle'],64,499,width=784,color=WHITE)),
        g('contact-email','64 570 784 68',txt(d['contact']['email'],64,618,size=44,color=WHITE,face='medium'))]
    inputs=[line(896,326,896,630,WHITE)]
    for i,c in enumerate(d['blocks']):
        y=354+i*98
        inputs.append(g(f'conversation-input-{i+1}',f'928 {y-28} 288 108',txt(c['title'],928,y,size=28,color=WHITE,face='medium'),txt(c['body'],928,y+42,width=288,size=22,color=WHITE,leading=30)))
    a.append(g('conversation-inputs','896 324 320 316',*inputs))
    return RED,a+[footer(17,True,False)]


BUILDERS.update({16:p16,17:p17})
NAMES.update({16:'cooperation',17:'contact'})


def main():
    parser=argparse.ArgumentParser();parser.add_argument('--pages',required=True);args=parser.parse_args()
    lo,hi=map(int,args.pages.split('-'))
    for n in range(lo,hi+1):
        bg,items=BUILDERS[n]()
        role='cover' if n==1 else 'ending' if n==17 else 'content'
        defs='<defs><marker id="arrow-red" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto" markerUnits="strokeWidth"><path d="M0,0 L8,4 L0,8 Z" fill="#C9381E"/></marker><marker id="arrow-white" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto" markerUnits="strokeWidth"><path d="M0,0 L8,4 L0,8 Z" fill="#FFFFFF"/></marker></defs>'
        contents='\n'.join([f'<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="720" viewBox="0 0 1280 720" font-family="Noto Sans SC" font-size="26" font-weight="normal" data-pptx-page-role="{role}">',defs,f'<rect id="background" data-pptx-role="background" width="1280" height="720" fill="{bg}"/>',*items,'</svg>'])
        path=ROOT/'svg_output'/f'{n:02d}_{NAMES[n]}.svg';path.write_text(contents+'\n',encoding='utf-8');print(path.name)


if __name__=='__main__':main()
