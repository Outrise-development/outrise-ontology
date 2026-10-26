"""Read-only release checks for the nine-slide comparison and review receipts."""
from __future__ import annotations
import hashlib
import json
import re
import zipfile
from pathlib import Path
from xml.etree import ElementTree as ET
from restore_native_fonts import A, P, FACES, source_glyphs

ROOT = Path(__file__).resolve().parents[1]
NS = {'a': A, 'p': P, 'r': 'http://schemas.openxmlformats.org/officeDocument/2006/relationships'}


def main():
    target = ROOT / 'exports/Outrise-v8-Demo-Comparison.pptx'
    embedded = json.loads((ROOT / 'validation/font-embedding.json').read_text(encoding='utf-8'))
    assert hashlib.sha256(target.read_bytes()).hexdigest() == embedded['outputSha256']
    slides = []
    with zipfile.ZipFile(target) as z:
        assert z.testzip() is None
        names = sorted((n for n in z.namelist() if re.fullmatch(r'ppt/slides/slide\d+\.xml', n)), key=lambda n: int(re.search(r'(\d+)\.xml', n)[1]))
        assert len(names) == 9
        presentation = ET.fromstring(z.read('ppt/presentation.xml'))
        size = presentation.find('p:sldSz', NS)
        width, height = int(size.get('cx')), int(size.get('cy'))
        assert abs(width / height - 16 / 9) < 0.001
        families = set()
        for i, (part, svg) in enumerate(zip(names, sorted((ROOT / 'svg_output').glob('*.svg'))), 1):
            page = ET.fromstring(z.read(part))
            expected = source_glyphs(svg)
            cursor = 0
            runs = 0
            text = []
            for run in page.findall('.//a:r', NS):
                value = ''.join(t.text or '' for t in run.findall('a:t', NS))
                text.append(value)
                glyphs = [c for c in value if not c.isspace()]
                if not glyphs:
                    continue
                chunk = expected[cursor:cursor + len(glyphs)]
                assert glyphs == [c for c, _ in chunk], (part, value)
                weights = {w for _, w in chunk}
                assert len(weights) == 1
                weight = weights.pop()
                props = run.find('a:rPr', NS)
                latin, cjk = FACES[weight]
                assert props.find('a:latin', NS).get('typeface') == latin
                assert props.find('a:ea', NS).get('typeface') == cjk
                assert props.find('a:cs', NS).get('typeface') == latin
                assert props.get('b') == '0'
                families.update((latin, cjk))
                cursor += len(glyphs)
                runs += 1
            assert cursor == len(expected)
            assert 'CMO' not in ''.join(text)
            assert page.find('.//a:t', NS) is not None
            pictures = page.findall('.//p:pic', NS)
            for picture in pictures:
                extent = picture.find('p:spPr/a:xfrm/a:ext', NS)
                assert extent is not None
                assert not (int(extent.get('cx')) >= width * .9 and int(extent.get('cy')) >= height * .9), 'Whole-slide image detected'
            slides.append({'page': i, 'source': svg.name, 'nativeTextRuns': runs, 'nativeShapes': len(page.findall('.//p:sp', NS)), 'nativeConnectors': len(page.findall('.//p:cxnSp', NS)), 'logoPictures': len(pictures), 'copyAndWeightsMatchSvg': True, 'wholeSlideRaster': False})
        font_parts = [n for n in z.namelist() if n.startswith('ppt/fonts/')]
        assert len(font_parts) == 6 == embedded['embeddedFaceCount']
        for face in embedded['fonts']:
            assert hashlib.sha256(z.read(face['part'])).hexdigest() == face['payloadSha256']
            assert face['windowsWriter']['sourceFontByteIdentical']
            assert not face['subset']
        assert families == {n for pair in FACES.values() for n in pair}
    review = []
    for svg in sorted((ROOT / 'svg_output').glob('*.svg')):
        receipt = json.loads((ROOT / '.review' / (svg.stem + '.json')).read_text(encoding='utf-8'))
        assert receipt['status'] == 'ok' and not receipt['findings']
        review.append({'page': svg.name, 'status': receipt['status'], 'findings': receipt['findings'], 'designIntentCheck': receipt['design_intent_check']})
    report = {'status': 'passed', 'file': str(target), 'sha256': embedded['outputSha256'], 'slideCount': 9, 'aspectRatio': '16:9', 'brandFontFaces': sorted(families), 'embeddedFullFaces': 6, 'cmoOccurrences': 0, 'pages': slides, 'visualReview': review, 'powerPointApplicationTested': False, 'canvaImported': False, 'nextGate': 'User chooses A/B/C; full 17-slide version and independent Canva follow.'}
    (ROOT / 'validation/delivery-audit.json').write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print(json.dumps({k: report[k] for k in ['status', 'slideCount', 'embeddedFullFaces', 'cmoOccurrences', 'sha256']}, ensure_ascii=False))


if __name__ == '__main__':
    main()
