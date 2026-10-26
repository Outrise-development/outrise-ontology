"""Authored, page-specific SVG compositions for the approved nine-page comparison.

The SVGs are the visible design authority. This script retains the shared copy
and reproducible geometry; it does not use a stock page/layout generator.
"""
from __future__ import annotations

import argparse
import html
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
COPY = json.loads((ROOT / 'content.demo.json').read_text(encoding='utf-8'))
RED, GOLD, INK, IVORY, WHITE, MUTED, LINE = '#C9381E', '#9B5E00', '#111111', '#F4F1E9', '#FFFFFF', '#62625D', '#D6D4CB'
FACES = {
    'body': ('Noto Sans SC', 'Instrument Sans'),
    'medium': ('Noto Sans SC Medium', 'Instrument Sans Medium'),
    'title': ('Noto Sans SC SemiBold', 'Instrument Sans SemiBold'),
}
NAMES = {'A': '暖色编辑式', 'B': '营销工作地图式', 'C': '品牌展示式'}


def esc(value):
    return html.escape(str(value), quote=True)


def advance(text, size):
    # Calibration table with wrapping headroom; no per-object font probe.
    return sum(size * (1.10 if ord(c) > 255 else .56 if c.isupper() else .51 if c != ' ' else .28) for c in text)


def wrap(value, size, width):
    result = []
    for source in value.split('\n'):
        tokens = re.findall(r'[A-Za-z0-9@._/+-]+|[^A-Za-z0-9@._/+-]', source)
        line = ''
        for token in tokens:
            if line and advance(line + token, size) > width:
                if token in '，。、；：！？）】》·':
                    result.append(line[:-1].rstrip())
                    line = line[-1:] + token
                else:
                    result.append(line.rstrip())
                    line = token.lstrip()
            else:
                line += token
        result.append(line.rstrip())
    return result


def inline(value, face):
    cn, en = FACES[face]
    parts = re.split(r'([A-Za-z0-9][A-Za-z0-9@._/ +\-]*)', value)
    return ''.join(f'<tspan font-family="{en}">{esc(x)}</tspan>' if re.match('[A-Za-z0-9]', x) else esc(x) for x in parts if x)


def txt(value, x, y, *, size=26, color=INK, face='body', width=None, leading=38, anchor='start', ident=None):
    lines = wrap(value, size, width) if width else value.split('\n')
    attr = f' id="{ident}"' if ident else ''
    spans = ''.join(f'<tspan x="{x}" y="{y + i * leading}">{inline(line, face)}</tspan>' for i, line in enumerate(lines))
    return f'<text{attr} x="{x}" y="{y}" font-family="{FACES[face][0]}" font-size="{size}" fill="{color}" text-anchor="{anchor}">{spans}</text>'


def rect(x, y, w, h, fill, *, stroke=None, sw=1, rotate=None):
    extra = f' stroke="{stroke}" stroke-width="{sw}"' if stroke else ''
    if rotate is not None:
        extra += f' transform="rotate({rotate} {x+w/2} {y+h/2})"'
    return f'<rect x="{x}" y="{y}" width="{w}" height="{h}" fill="{fill}"{extra}/>'


def line(x1, y1, x2, y2, color=LINE, width=1):
    return f'<line x1="{x1}" y1="{y1}" x2="{x2}" y2="{y2}" stroke="{color}" stroke-width="{width}"/>'


def circle(x, y, r, color):
    return f'<circle cx="{x}" cy="{y}" r="{r}" fill="{color}"/>'


def logo(x, y, width, variant='warm'):
    return f'<image href="../images/wordmark-{variant}.png" x="{x}" y="{y}" width="{width}" height="{width*635/2400:.5f}" preserveAspectRatio="xMidYMid meet"/>'


def group(ident, bounds, *children, role=None):
    attr = f' data-pptx-role="{role}"' if role else ''
    return f'<g id="{ident}" data-pptx-bounds="{bounds}"{attr}>\n' + '\n'.join(children) + '\n</g>'


def footer(direction, page, *, dark=False, show_logo=True):
    color = WHITE if dark else MUTED
    pieces = []
    if show_logo:
        pieces.append(logo(64, 661, 180, 'white' if dark else 'warm'))
    pieces.append(txt(f'{direction}｜{NAMES[direction]}', 1216, 694, size=16, color=color, anchor='end'))
    pieces.append(txt(f'{page:02d} / 09', 1216, 666, size=16, color=color, anchor='end'))
    if not dark:
        pieces.insert(0, line(64, 650, 1216, 650))
    return group('footer', '64 650 1152 62', *pieces, role='footer')


def header(data, *, dark=False):
    color = WHITE if dark else INK
    return group('opening', '64 28 1152 116',
                 txt(data['eyebrow'], 64, 52, size=18, color=WHITE if dark else MUTED, face='medium'),
                 txt(data['title'], 64, 124, size=44, color=color, face='title'))


def page_a_cover():
    d = COPY['cover']
    return [
        group('page-fields','0 0 1280 720',rect(0, 0, 840, 720, RED), rect(840, 0, 440, 720, IVORY),role='background'),
        group('brand', '64 50 570 225',
              txt(d['eyebrow'], 64, 70, size=18, color=WHITE, face='medium'), logo(64, 111, 570, 'white')),
        group('positioning', '64 292 712 338',
              txt('专注北美市场的\nAI-native\n营销与增长团队', 64, 354, size=64, color=WHITE, face='title', leading=78),
              txt(d['tagline'], 64, 615, size=26, color=WHITE)),
        group('upward-field', '875 180 365 390',
              rect(902, 355, 320, 108, INK, rotate=-24),
              rect(975, 222, 142, 18, GOLD, rotate=-24),
              rect(963, 540, 200, 2, RED)),
        footer('A', 1, show_logo=False),
    ]


def page_a_company():
    d = COPY['company']; a,b,c = d['features']
    return [header(d),
        group('company-intro', '64 174 720 190', txt(d['intro'], 64, 205, width=720)),
        group('north-america', '856 188 360 440', rect(856,188,360,440,RED),
              txt(a['title'],888,254,size=32,color=WHITE,face='medium'),
              txt(a['body'],888,326,width=296,color=WHITE),
              rect(962,524,174,16,WHITE,rotate=-24), rect(1018,566,110,10,GOLD,rotate=-24)),
        group('strategy', '64 412 344 205', line(64,414,408,414,RED,2),
              txt(b['title'],64,462,size=28,face='medium'), txt(b['body'],64,514,width=344)),
        group('ai-working', '448 412 344 205', line(448,414,792,414,RED,2),
              txt(c['title'],448,462,size=28,face='medium'), txt(c['body'],448,514,width=344)),
        footer('A',2),
    ]


def service_partner(style):
    d=COPY['services']
    if style=='C':
        return group('partners', '64 568 1152 68', rect(64,568,1152,68,RED),
             txt(d['partnerLabel'],84,596,size=18,color=WHITE,face='medium'),
             txt(d['partnerScope'],226,596,size=22,color=WHITE), txt(d['partnerBody'],226,625,size=22,color=WHITE))
    return group('partners','64 568 1152 66',line(64,568,1216,568,RED if style=='A' else LINE),
             txt(d['partnerLabel'],64,596,size=18,color=RED,face='medium'),
             txt(d['partnerScope'],224,596,size=22),txt(d['partnerBody'],224,625,size=22,color=MUTED))


def page_a_services():
    d=COPY['services']; rows=[header(d),group('service-intro','64 146 1152 44',txt(d['intro'],64,177))]
    rows.append(group('core-label','64 194 300 28',txt(d['coreLabel'],64,216,size=18,color=RED,face='medium')))
    for i,c in enumerate(d['cores']):
        x=64+i*592
        rows.append(group(f'core-{i+1}',f'{x} 232 560 170',rect(x,232,560,170,RED),
                    txt(c['title'],x+28,277,size=28,color=WHITE,face='medium'),
                    txt(c['body'],x+28,329,width=504,color=WHITE)))
    rows.append(group('execution-label','64 412 300 36',txt(d['executionLabel'],64,437,size=18,color=RED,face='medium')))
    for i,c in enumerate(d['execution']):
        x=64+i*400
        rows.append(group(f'execution-{i+1}',f'{x} 456 352 88',rect(x,456,352,88,WHITE,stroke=LINE),
                    txt(c['title'],x+20,492,size=28,face='medium'),txt(c['body'],x+20,525,size=22,color=MUTED)))
    return rows+[service_partner('A'),footer('A',3)]


def page_b_cover():
    d=COPY['cover']; terms=['策略判断','营销规划','关键执行']
    rows=[group('brand','64 64 1152 120',logo(64,64,360),txt(d['eyebrow'],1216,88,size=18,color=RED,face='medium',anchor='end')),
          group('positioning','64 234 1152 183',txt(d['title'],64,296,size=64,face='title',leading=84))]
    nodes=[line(248,554,1032,554,RED,2)]
    for i,term in enumerate(terms):
        x=64+i*400
        nodes.append(group(f'work-{i+1}',f'{x} 500 352 110',rect(x,500,352,110,RED),
                    txt(term,x+176,566,size=26,color=WHITE,anchor='middle')))
        if i<2:nodes.append(txt('·',440+i*400,566,size=26,color=RED,anchor='middle'))
    rows.append(group('work-path','64 490 1152 132',*nodes))
    return rows+[footer('B',4,show_logo=False)]


def page_b_company():
    d=COPY['company']
    rows=[header(d),group('company-intro','64 152 1152 88',txt(d['intro'],64,183,width=1152))]
    nodes=[group('company-map-spine','64 260 314 378',logo(64,446,180),
                line(254,470,312,470,RED,2),line(312,276,312,540,RED,2),
                line(312,276,376,276,RED,2),line(312,408,376,408,RED,2),line(312,540,376,540,RED,2),
                circle(312,276,5,GOLD),circle(312,408,5,GOLD),circle(312,540,5,GOLD))]
    for i,c in enumerate(d['features']):
        y=286+i*132
        nodes.append(group(f'feature-{i+1}',f'400 {y-30} 816 126',
                    txt(c['title'],400,y,size=28,color=RED,face='medium'),txt(c['body'],400,y+42,width=816)))
    return rows+[group('company-map','64 250 1152 394',*nodes),footer('B',5)]


def page_b_services():
    d=COPY['services'];rows=[header(d),group('service-intro','64 146 1152 44',txt(d['intro'],64,177)),
          group('core-label','64 190 300 34',txt(d['coreLabel'],64,215,size=18,color=RED,face='medium'))]
    for i,c in enumerate(d['cores']):
        x=64+i*592
        rows.append(group(f'core-{i+1}',f'{x} 234 560 162',rect(x,234,560,162,'none',stroke=RED,sw=2),
              txt(c['title'],x+28,278,size=28,color=RED,face='medium'),txt(c['body'],x+28,329,width=504)))
    rows.append(group('shared-execution-links','240 396 800 66',
         line(344,396,344,418,RED,2),line(936,396,936,418,RED,2),line(344,418,936,418,RED,2),
         line(640,418,640,442,RED,2),line(240,442,1040,442,RED,2),
         line(240,442,240,462,RED,2),line(640,442,640,462,RED,2),line(1040,442,1040,462,RED,2),circle(640,418,5,GOLD)))
    rows.append(group('execution-label','64 410 160 36',txt(d['executionLabel'],64,439,size=18,color=RED,face='medium')))
    for i,c in enumerate(d['execution']):
        x=64+i*400
        rows.append(group(f'execution-{i+1}',f'{x} 462 352 84',rect(x,462,352,84,WHITE),
               txt(c['title'],x+176,499,size=28,face='medium',anchor='middle'),
               txt(c['body'],x+176,533,size=22,color=MUTED,anchor='middle')))
    return rows+[service_partner('B'),footer('B',6)]


def page_c_cover():
    d=COPY['cover']
    return [group('page-fields','0 0 1280 720',rect(0,0,1280,720,RED),role='background'),
          group('brand','64 46 1152 275',txt(d['eyebrow'],1216,67,size=18,color=WHITE,face='medium',anchor='end'),logo(64,103,800,'white'),
                group('upward-field','956 150 260 162',rect(982,200,190,24,WHITE,rotate=-24),rect(1040,266,122,12,GOLD,rotate=-24))),
          group('positioning','64 364 1152 266',txt(d['title'],64,431,size=64,color=WHITE,face='title',leading=83),
                txt(d['tagline'],64,615,size=26,color=WHITE)),footer('C',7,dark=True,show_logo=False)]


def page_c_company():
    d=COPY['company'];rows=[group('page-fields','0 0 1280 210',rect(0,0,1280,210,RED),role='background'),header(d,dark=True),
        group('company-intro','64 240 1152 125',txt(d['intro'],64,273,width=1152))]
    for i,c in enumerate(d['features']):
        x=64+i*400
        rows.append(group(f'feature-{i+1}',f'{x} 410 352 217',
              rect(x,412,44,4,RED),txt(c['title'],x,465,size=32,face='medium'),txt(c['body'],x,518,width=352)))
    return rows+[footer('C',8)]


def page_c_services():
    d=COPY['services'];rows=[header(d),group('service-intro','64 146 1152 44',txt(d['intro'],64,177)),
        group('core-label','64 192 300 32',txt(d['coreLabel'],64,215,size=18,color=RED,face='medium')),
        ]
    core_parts=[rect(0,234,1280,170,RED),line(640,258,640,380,WHITE,1)]
    for i,c in enumerate(d['cores']):
        x=64+i*640
        core_parts.append(group(f'core-{i+1}',f'{x} 252 512 144',txt(c['title'],x,279,size=32,color=WHITE,face='medium'),
               txt(c['body'],x,333,width=512,color=WHITE)))
    rows.append(group('core-field','0 234 1280 170',*core_parts))
    rows.append(group('execution-label','64 410 300 34',txt(d['executionLabel'],64,438,size=18,color=RED,face='medium')))
    for i,c in enumerate(d['execution']):
        x=64+i*400
        parts=[txt(c['title'],x,488,size=32,face='medium'),txt(c['body'],x,529,size=22,color=MUTED)]
        if i<2: parts.append(line(x+368,464,x+368,540))
        rows.append(group(f'execution-{i+1}',f'{x} 456 369 88',*parts))
    return rows+[service_partner('C'),footer('C',9)]


PAGES=[('a_cover',page_a_cover),('a_company',page_a_company),('a_services',page_a_services),
       ('b_cover',page_b_cover),('b_company',page_b_company),('b_services',page_b_services),
       ('c_cover',page_c_cover),('c_company',page_c_company),('c_services',page_c_services)]


def main():
    ap=argparse.ArgumentParser();ap.add_argument('--pages',default='1-9');args=ap.parse_args()
    lo,hi=map(int,args.pages.split('-'))
    for n,(name,fn) in enumerate(PAGES,1):
        if lo<=n<=hi:
            body=fn();page_role='cover' if n in (1,4,7) else 'content'
            bg='' if n in (1,7) else f'<rect id="background" data-pptx-role="background" width="1280" height="720" fill="{IVORY}"/>'
            text='\n'.join([f'<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="720" viewBox="0 0 1280 720" font-family="Noto Sans SC" font-size="26" font-weight="normal" data-pptx-page-role="{page_role}">',bg,*body,'</svg>'])
            path=ROOT/'svg_output'/f'{n:02d}_{name}.svg';path.write_text(text+'\n',encoding='utf-8');print(path.name)


if __name__=='__main__':main()
