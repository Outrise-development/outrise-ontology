"""Read-only audit of the 20-page Canva release and its preserved page objects."""
from collections import Counter
from pathlib import Path
from xml.etree import ElementTree as ET
import hashlib
import json
import re
import unicodedata
import zipfile
import pdfplumber

ROOT = Path(__file__).resolve().parents[1]
NS = {'a': 'http://schemas.openxmlformats.org/drawingml/2006/main',
      'p': 'http://schemas.openxmlformats.org/presentationml/2006/main'}
MAPPING = {**{i: i for i in range(1, 14)}, 15: 18, 16: 19, 17: 20}


def normal(text):
    return ''.join(unicodedata.normalize('NFKC', text).split())


def copy_of(item):
    return ''.join(r.get('text', '') for r in item['regions'])


def signature(item, text=True):
    geometry = item.get('containerElement', {})
    numeric = lambda d: tuple((k, round(v, 4) if isinstance(v, (int, float)) else v)
                              for k, v in sorted(d.items()))
    content = normal(copy_of(item)) if text else (item.get('type'), item.get('asset_id'))
    return (content, geometry.get('type'), numeric(geometry.get('position', {})),
            numeric(geometry.get('dimension', {})))


def main():
    before = json.loads((ROOT/'validation/before-canva-elements.json').read_text(encoding='utf-8'))
    after = json.loads((ROOT/'validation/after-canva-elements.json').read_text(encoding='utf-8'))
    assert len(before['pages']) == 17 and len(after['pages']) == 20
    for old, new in MAPPING.items():
        old_text = [r for r in before['richtexts'] if r['page_index'] == old
                    and not re.fullmatch(r'\d+\s*/\s*17', copy_of(r))]
        new_text = [r for r in after['richtexts'] if r['page_index'] == new
                    and not re.fullmatch(r'\d+\s*/\s*20', copy_of(r))]
        assert Counter(map(signature, old_text)) == Counter(map(signature, new_text)), ('preservation', old, new)
        old_fills = [signature(r, False) for r in before['fills'] if r['page_index'] == old]
        new_fills = [signature(r, False) for r in after['fills'] if r['page_index'] == new]
        assert Counter(old_fills) == Counter(new_fills), ('images', old, new)
    files = [ROOT/'exports/Outrise-Intro-Deck-v8.2.pptx', ROOT/'exports/Outrise-Intro-Deck-v8.2.pdf']
    texts, frame_counts, pictures, svg_components = [], [], [], []
    with zipfile.ZipFile(files[0]) as z:
        assert z.testzip() is None
        slides = sorted((n for n in z.namelist() if re.fullmatch(r'ppt/slides/slide\d+\.xml', n)),
                        key=lambda n: int(re.search(r'(\d+)\.xml', n)[1]))
        assert len(slides) == 20
        for number, name in enumerate(slides, 1):
            page = ET.fromstring(z.read(name))
            frames = [normal(''.join(t.text or '' for t in s.findall('.//a:t', NS)))
                      for s in page.findall('.//p:sp', NS)]
            frames = [t for t in frames if t]
            expected = [normal(copy_of(r)) for r in after['richtexts'] if r['page_index'] == number]
            assert Counter(frames) == Counter(expected), ('pptx copy', number)
            assert f'{number:02d}/20' in frames, ('footer', number)
            texts.append(''.join(frames)); frame_counts.append(len(frames))
            # Canva exports screenshots as p:sp shapes with a:blipFill, as well
            # as conventional p:pic objects. Count separate image-bearing
            # objects, not only the latter representation.
            image_shapes = page.findall('.//p:pic', NS) + [
                s for s in page.findall('.//p:sp', NS)
                if s.find('./p:spPr/a:blipFill/a:blip', NS) is not None]
            pictures.append(len(image_shapes))
            svg_components.append(sum(
                any(e.tag.rsplit('}', 1)[-1] == 'svgBlip' for e in s.iter())
                for s in image_shapes))
        embedded = [f.get('typeface') for f in ET.fromstring(z.read('ppt/presentation.xml'))
                    .findall('.//p:embeddedFont/p:font', NS)]
        assert '字由经典黑 Bold' in embedded
    all_text = ''.join(texts)
    assert [i+1 for i, t in enumerate(texts) if 'CMO' in t] == [19]
    assert all_text.count('CMO') == 1 and 'hello@outrisetech.com' in texts[19]
    for excluded in ['NORTHAMERICAFOCUSED', 'LET’STALKNORTHAMERICA', '内部执行体系的功能关系示意',
                     '5.4x', '402%', '$5,851', '500+']:
        assert normal(excluded) not in all_text, ('excluded', excluded)
    assert normal('能力示例：渠道拓展·落地执行·技术搭建等') in texts[4]
    assert normal('专业协作包括但不限于以上示例') in texts[8]
    assert 'PR' not in texts[8] and '本地' not in texts[8]
    assert 'InnerBrightness' in texts[13] and 'ARTILUME' in texts[14]
    assert 'INUK' in texts[15] and 'INUK' in texts[16]
    assert all(frame_counts[i] >= 10 and pictures[i] >= 2 for i in range(13, 17))
    source_checks = []
    for svg in sorted((ROOT/'svg_output').glob('*.svg')):
        number = int(svg.name[:2])
        copy = ''.join(''.join(t.itertext()) for t in ET.parse(svg).getroot()
                       .iter('{http://www.w3.org/2000/svg}text'))
        assert Counter(normal(copy)) == Counter(texts[number-1]), ('source copy', number)
        source_checks.append(number)
    assert len(source_checks) == 20
    with pdfplumber.open(files[1]) as doc:
        assert len(doc.pages) == 20
        pdf_texts = [normal(p.extract_text(x_tolerance=2) or '') for p in doc.pages]
        assert all(len(t) > 20 for t in pdf_texts)
        for p, label in [(14, 'InnerBrightness'), (15, 'ARTILUME'), (16, 'INUK'), (17, 'INUK')]:
            assert label in pdf_texts[p-1], ('pdf copy', p)
    font_review = json.loads((ROOT/'validation/canva-pdf-fonts.json').read_text(encoding='utf-8'))
    expected_font_exceptions = {
        '核心能力｜明确营销方向与增长路径',
        '直接执行｜推进关键工作，交付约定成果'}
    findings = font_review['findings']
    assert len(findings) == 2
    assert {f['text'] for f in findings} == expected_font_exceptions
    assert all(f['page'] == 5 and f['font'] == 'IdeaFonts-JingDianHei-80'
               and f['code'] == 'unexpected_chinese_font' for f in findings)
    report = {'status': 'passed', 'date': '2026-10-27', 'version': 'v8.2', 'pages': 20,
              'casePages': [14, 15, 16, 17], 'preservedPageMapping': MAPPING,
              'remaining16PagesCopyAndGeometryPreservedExceptPageNumbers': True,
              'pptxCopyMatchesSavedCanva': True, 'sourceCopyMatchesSavedCanva': True,
              'editableTextFramesPerPage': frame_counts, 'imageObjectsPerPage': pictures,
              'independentSvgImageComponentsPerPage': svg_components,
              'canvaArrowRepresentation': 'Independent SVG graphic components; native editable arrow geometry is retained in the local Native-Source PPTX.',
              'embeddedCanvaFontFaces': embedded, 'cmoPages': [19],
              'userFontException': 'Page 5: 字由经典黑 Bold preserved from user edits',
              'fontAudit': {'unexpectedFindingsAfterDocumentedUserException': 0,
                            'preservedUserFontLabels': sorted(expected_font_exceptions)},
              'powerPointApplicationTested': False,
              'files': [{'file': f.relative_to(ROOT).as_posix(), 'bytes': f.stat().st_size,
                         'sha256': hashlib.sha256(f.read_bytes()).hexdigest()} for f in files]}
    print(json.dumps(report, ensure_ascii=False, indent=2))


if __name__ == '__main__':
    main()
