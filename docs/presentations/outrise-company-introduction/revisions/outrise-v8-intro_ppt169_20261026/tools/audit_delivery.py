"""Read-only release audit of native PPTX, Canva PPTX, source copy and font receipts."""
from __future__ import annotations
from collections import Counter
import hashlib
import json
import re
import zipfile
from pathlib import Path
from xml.etree import ElementTree as ET
from restore_native_fonts import A, P, FACES, S, source_glyphs

ROOT=Path(__file__).resolve().parents[1]
NS={'a':A,'p':P}
def normal(v):return ''.join(c for c in v if not c.isspace())
def digest(v):return hashlib.sha256(v).hexdigest()


def slides_from(path):
    with zipfile.ZipFile(path) as z:
        assert z.testzip() is None
        names=sorted([n for n in z.namelist() if re.fullmatch(r'ppt/slides/slide\d+\.xml',n)],key=lambda n:int(re.search(r'(\d+)\.xml',n)[1]))
        assert len(names)==17
        return [ET.fromstring(z.read(n)) for n in names]


def frame_counter(page):
    rows=Counter()
    for shape in page.findall('.//p:sp',NS):
        value=normal(''.join(t.text or '' for t in shape.findall('.//a:t',NS)))
        if not value:continue
        faces={n.get('typeface') for n in shape.iter() if n.get('typeface')}
        assert len(faces)==1, faces
        rows[(value,faces.pop())]+=1
    return rows


def verify_embedding(path, receipt_name):
    receipt=json.loads((ROOT/'validation'/receipt_name).read_text(encoding='utf-8'))
    assert digest(path.read_bytes())==receipt['outputSha256']
    with zipfile.ZipFile(path) as z:
        assert receipt['embeddedFaceCount']==6
        for font in receipt['fonts']:
            assert digest(z.read(font['part']))==font['payloadSha256']
            assert font['windowsWriter']['sourceFontByteIdentical'] and not font['subset']
    return {'sha256':receipt['outputSha256'],'fullFontFaces':6,'geometryPreservedDuringEmbedding':receipt['unchangedSlideXmlCount']==17}


def main():
    native=ROOT/'exports/Outrise-Intro-Deck-v8.pptx';canva=ROOT/'exports/Outrise-Intro-Deck-v8-Canva.pptx'
    pages=slides_from(native);source=json.loads((ROOT/'content.zh-CN.json').read_text(encoding='utf-8'))
    cmo=[];records=[]
    for number,(page,svg,copy) in enumerate(zip(pages,sorted((ROOT/'svg_output').glob('*.svg')),source['slides']),1):
        expected=source_glyphs(svg);cursor=0;runs=0
        for run in page.findall('.//a:r',NS):
            value=normal(''.join(t.text or '' for t in run.findall('a:t',NS)))
            if not value:continue
            chunk=expected[cursor:cursor+len(value)];assert value==''.join(c for c,_ in chunk)
            weight={w for _,w in chunk};assert len(weight)==1;weight=weight.pop()
            props=run.find('a:rPr',NS)
            family=props.find('a:latin',NS).get('typeface')
            assert family in FACES[weight]
            assert props.find('a:ea',NS).get('typeface')==family
            if any(c.isascii() and c.isalnum() for c in value):assert family==FACES[weight][0]
            if any('\u4e00'<=c<='\u9fff' for c in value):assert family==FACES[weight][1]
            assert props.get('b')=='0'
            cursor+=len(value);runs+=1
        assert cursor==len(expected)
        text=''.join(c for c,_ in expected)
        if 'CMO' in text:cmo.append(number)
        for key in ['title','subtitle','background']:
            if copy.get(key):assert normal(copy[key]) in text, (number,key)
        for block in copy['blocks']:
            for key in ['title','body','question','output','label','participation']:
                if block.get(key):assert normal(block[key]) in text,(number,key,block[key])
        if number==17:assert 'hello@outrisetech.com' in text
        records.append({'page':number,'nativeTextRuns':runs,'nativeShapes':len(page.findall('.//p:sp',NS)),'nativeConnectors':len(page.findall('.//p:cxnSp',NS)),'pictures':len(page.findall('.//p:pic',NS)),'copyAndWeightsMatchSvg':True,'modelCopyPresent':True})
    assert cmo==[16]
    reference=pages;exported=slides_from(canva)
    canva_pages=[]
    for number,(ref,page) in enumerate(zip(reference,exported),1):
        before,after=frame_counter(ref),frame_counter(page)
        assert before==after, {'page':number,'missing':list((before-after).items())[:8],'unexpected':list((after-before).items())[:8]}
        canva_pages.append({'page':number,'singleFamilyTextFrames':sum(after.values()),'textAndIntendedWeightMultisetIdentical':True,'nativeShapes':len(page.findall('.//p:sp',NS)),'nativeConnectors':len(page.findall('.//p:cxnSp',NS)),'pictures':len(page.findall('.//p:pic',NS))})
    saved_reviews={r['page']:r for r in json.loads((ROOT/'validation/visual-review-source.json').read_text(encoding='utf-8'))}
    reviews=[]
    for svg in sorted((ROOT/'svg_output').glob('*.svg')):
        review_path=ROOT/'.review'/f'{svg.stem}.json'
        r=json.loads(review_path.read_text(encoding='utf-8')) if review_path.exists() else saved_reviews[svg.name]
        assert r['status'] in {'ok','fixed'} and not r['needs_human_items']
        assert r['design_intent_check']['render_delivers']
        if r['status']=='fixed':assert all(f.get('verified_in_iter') for f in r['findings'])
        reviews.append(r)
    fonts=json.loads((ROOT/'validation/canva-pdf-fonts.json').read_text(encoding='utf-8'))
    assert fonts['status']=='pass' and fonts['pageCount']==17 and fonts['findingCount']==0
    assets=json.loads((ROOT/'brand/asset-manifest.json').read_text(encoding='utf-8'))
    for item in assets['files']:assert digest((ROOT/item['file']).read_bytes())==item['sha256']
    arrow_count=sum(1 for page in pages for node in page.findall('.//a:prstGeom',NS) if node.get('prst') in {'rightArrow','leftArrow','upArrow','downArrow'})
    assert arrow_count==17
    report={'status':'passed','slideCount':17,'cmoPages':cmo,'cmoOccurrences':1,'native':verify_embedding(native,'font-embedding.json'),'nativeEditableArrowPresets':arrow_count,'canva':verify_embedding(canva,'canva-font-embedding.json'),'canvaDesignId':'DAHZJb1YZpA','canvaUrl':'https://www.canva.com/design/DAHZJb1YZpA/Yay0Ln747v8xpgpBw7MDGw/edit','nativePages':records,'canvaPages':canva_pages,'visualReview':reviews,'canvaPdfActualFonts':'17 pages, six faces, zero findings','powerPointApplicationTested':False}
    (ROOT/'validation/delivery-audit.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    print(json.dumps({'status':'passed','pages':17,'canvaFrames':sum(x['singleFamilyTextFrames'] for x in canva_pages),'copyAndIntendedFontWeights':'identical','cmoPages':cmo,'fullEmbeddedFontsPerPptx':6},ensure_ascii=False))


if __name__=='__main__':main()
