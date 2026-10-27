"""Verify the actual Canva update against approved element snapshots; never rewrite files."""
from collections import Counter
from pathlib import Path
from xml.etree import ElementTree as ET
import hashlib
import json
import re
import zipfile
import unicodedata
import pdfplumber

ROOT = Path(__file__).resolve().parents[1]
A = 'http://schemas.openxmlformats.org/drawingml/2006/main'
P = 'http://schemas.openxmlformats.org/presentationml/2006/main'
NS = {'a': A, 'p': P}


def normal(text):
    return ''.join(unicodedata.normalize('NFKC', text).split())


def main():
    before = json.loads((ROOT/'before-canva-elements.json').read_text(encoding='utf-8'))
    after = json.loads((ROOT/'after-canva-elements.json').read_text(encoding='utf-8'))
    assert len(before['pages']) == len(after['pages']) == 17
    assert before['fills'] == after['fills']
    changed = [i for i in range(1, 18) if [r for r in before['richtexts'] if r['page_index']==i] != [r for r in after['richtexts'] if r['page_index']==i]]
    assert changed == [5, 9]
    files = [ROOT/'exports/Outrise-Intro-Deck-v8.1.pptx', ROOT/'exports/Outrise-Intro-Deck-v8.1.pdf']
    texts = []
    with zipfile.ZipFile(files[0]) as z:
        assert z.testzip() is None
        slides = sorted([n for n in z.namelist() if re.fullmatch(r'ppt/slides/slide\d+\.xml', n)], key=lambda n:int(re.search(r'(\d+)\.xml', n)[1]))
        assert len(slides) == 17
        for number, name in enumerate(slides, 1):
            page = ET.fromstring(z.read(name))
            frames = [normal(''.join(t.text or '' for t in s.findall('.//a:t', NS))) for s in page.findall('.//p:sp', NS)]
            frames = [t for t in frames if t]
            expected = [normal(''.join(r['text'] for r in item['regions'])) for item in after['richtexts'] if item['page_index']==number]
            assert Counter(frames) == Counter(expected), number
            texts.append(''.join(frames))
        embedded = [f.get('typeface') for f in ET.fromstring(z.read('ppt/presentation.xml')).findall('.//p:embeddedFont/p:font', NS)]
        assert len(embedded) == 7 and '字由经典黑 Bold' in embedded
    assert sum(t.count('CMO') for t in texts) == 1 and 'CMO' in texts[15]
    assert 'hello@outrisetech.com' in texts[16]
    assert all(s not in ''.join(texts) for s in ['NORTHAMERICAFOCUSED', 'LET’STALKNORTHAMERICA', '内部执行体系的功能关系示意'])
    assert 'PR' not in texts[8] and '本地' not in texts[8]
    assert normal('能力示例：渠道拓展·落地执行·技术搭建等') in texts[4]
    assert normal('专业协作包括但不限于以上示例') in texts[8]
    for svg in sorted((ROOT.parents[1]/'svg_output').glob('*.svg')):
        number=int(svg.name[:2])
        source=''.join(''.join(t.itertext()) for t in ET.parse(svg).getroot().iter('{http://www.w3.org/2000/svg}text'))
        assert Counter(normal(source)) == Counter(texts[number-1]), ('source copy', number)
    with pdfplumber.open(files[1]) as doc:
        assert len(doc.pages) == 17
        for page in [5, 9]:
            content=normal(doc.pages[page-1].extract_text(x_tolerance=2) or '')
            for phrase in (['核心能力｜明确营销方向与增长路径', '直接执行｜推进关键工作，交付约定成果', '能力示例：渠道拓展'] if page==5 else ['判断专业需求，连接合适资源', '技术搭建', '专业协作包括但不限于以上示例']):
                assert normal(phrase) in content, (page, phrase)
    font_report = json.loads((ROOT/'validation/canva-pdf-fonts.json').read_text(encoding='utf-8'))
    allowed = {'核心能力｜明确营销方向与增长路径', '直接执行｜推进关键工作，交付约定成果'}
    assert font_report['findingCount'] == 2
    assert {r['text'] for r in font_report['findings']} == allowed
    assert all(r['page']==5 and r['font']=='IdeaFonts-JingDianHei-80' for r in font_report['findings'])
    report = {'status':'passed', 'date':'2026-10-27', 'pages':17, 'changedPages':changed, 'other15PagesAndAllImageObjectsPreserved':True, 'editableTextFrames':sum(len([r for r in after['richtexts'] if r['page_index']==i]) for i in range(1,18)), 'editableCopyMatchesSavedCanva':True, 'cmoPages':[16], 'embeddedCanvaFontFaces':embedded, 'userFontException':{'page':5, 'labels':sorted(allowed), 'font':'字由经典黑 Bold', 'preservedFromUser':True, 'otherUnexpectedPdfFonts':0}, 'canvaUrl':'https://www.canva.com/design/DAHZJb1YZpA/Yay0Ln747v8xpgpBw7MDGw/edit', 'files':[{'file':f.relative_to(ROOT).as_posix(), 'sha256':hashlib.sha256(f.read_bytes()).hexdigest(), 'bytes':f.stat().st_size} for f in files], 'powerPointApplicationTested':False}
    print(json.dumps(report, ensure_ascii=False, indent=2))


if __name__ == '__main__':
    main()
