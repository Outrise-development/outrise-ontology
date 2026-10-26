"""Build a native, single-family Canva import derivative from exact SVG glyph positions.

Chromium measures the approved brand fonts in the canonical SVG. Splitting text
by its existing font runs keeps all visible glyph positions and all non-text
objects. The main SVGs and finished local PPTX are never changed.
"""
from __future__ import annotations
import argparse
import copy
import hashlib
import importlib.util
import json
import shutil
import tempfile
import subprocess
import sys
import zipfile
from pathlib import Path
from xml.dom import minidom
from xml.etree import ElementTree as ET
from playwright.sync_api import sync_playwright
from render_previews import css, ready
from restore_native_fonts import A, P, S, canonical, elements, text_content

ROOT=Path(__file__).resolve().parents[1]
TARGET=Path(tempfile.gettempdir())/'outrise-v8-canva_ppt169_20261026'
ET.register_namespace('', S)


def prepare(url,skill_dir):
    for folder in ['svg_output','images','validation','analysis','exports']:(TARGET/folder).mkdir(parents=True,exist_ok=True)
    for name in ['design_spec.md','spec_lock.md']:shutil.copy2(ROOT/name,TARGET/name)
    spec=(TARGET/'design_spec.md').read_text(encoding='utf-8').replace('| Feature | 32 |','| Feature | 32 |\n| Client title | 36 |')
    spec += '\nCanva compatibility derivative: client-title 36px is the unchanged equal client-heading treatment. Splitting its mixed-language text creates three fragments for two original headings; this names the existing treatment without changing any glyph or geometry.\n'
    (TARGET/'design_spec.md').write_text(spec,encoding='utf-8')
    lock=(TARGET/'spec_lock.md').read_text(encoding='utf-8').replace('- feature: 32','- feature: 32\n- client_title_family: Noto Sans SC Medium, Instrument Sans Medium\n- client_title: 36')
    (TARGET/'spec_lock.md').write_text(lock,encoding='utf-8')
    for f in (ROOT/'images').glob('wordmark-*.png'):shutil.copy2(f,TARGET/'images'/f.name)
    receipt=[]
    with sync_playwright() as p:
        browser=p.chromium.launch();page=browser.new_page(viewport={'width':1280,'height':720},device_scale_factor=1)
        try:
            page.goto(url+'/images/deck-gallery.html',wait_until='domcontentloaded')
            for source in sorted((ROOT/'svg_output').glob('*.svg')):
                markup='<!doctype html><html><head><base href="'+url+'/images/deck-gallery.html"><style>'+css(url)+'html,body{margin:0}svg{width:1280px;height:720px}</style></head><body>'+source.read_text(encoding='utf-8')+'</body></html>'
                page.set_content(markup,wait_until='load');proof=ready(page);assert all(r['check'] and r['count'] for r in proof)
                layout=page.evaluate('''()=>Array.from(document.querySelectorAll('svg text')).map(t=>{
                    const walker=document.createTreeWalker(t,NodeFilter.SHOW_TEXT);let n;const glyphs=[];let i=0;
                    while(n=walker.nextNode()){const style=getComputedStyle(n.parentElement);for(const char of n.textContent){const start=t.getStartPositionOfChar(i),end=t.getEndPositionOfChar(i);glyphs.push({char,x:start.x,y:start.y,endX:end.x,font:style.fontFamily.replaceAll('"',''),size:parseFloat(style.fontSize),fill:style.fill});i+=char.length;}}
                    return {text:t.textContent,glyphs};})''')
                tree=ET.parse(source);root=tree.getroot();texts=list(root.iter(f'{{{S}}}text'));assert len(texts)==len(layout)
                parent={child:el for el in root.iter() for child in el};count=0
                for el,record in zip(texts,layout):
                    assert ''.join(el.itertext())==record['text']
                    groups=[]
                    for item in record['glyphs']:
                        same=bool(groups) and item['font']==groups[-1][-1]['font'] and abs(item['y']-groups[-1][-1]['y'])<.01 and abs(item['x']-groups[-1][-1]['endX'])<.1
                        if same:groups[-1].append(item)
                        else:groups.append([item])
                    replacement=ET.Element(f'{{{S}}}g')
                    for fragment in groups:
                        value=''.join(g['char'] for g in fragment)
                        if not value.strip():continue
                        first=fragment[0];fill=first['fill']
                        if fill.startswith('rgb('):fill='#'+''.join(f'{int(v.strip()):02X}' for v in fill[4:-1].split(','))
                        node=ET.SubElement(replacement,f'{{{S}}}text',{'x':f"{first['x']:.5f}",'y':f"{first['y']:.5f}",'font-family':first['font'],'font-size':f"{first['size']:g}",'font-weight':'normal','fill':fill,'text-anchor':'start','{http://www.w3.org/XML/1998/namespace}space':'preserve'})
                        node.text=value;count+=1
                    owner=parent[el];index=list(owner).index(el);owner.remove(el);owner.insert(index,replacement)
                # Canva drops/reverses some zero-height/negative-direction line
                # frames. Preserve their visible path as thin native rectangles;
                # directed ends use exact editable Office arrow presets.
                heads=[];slots=[];line_count=0
                for edge in list(root.iter(f'{{{S}}}line')):
                    owner=parent[edge]
                    def inherited(key,default):
                        node=edge
                        while node is not None:
                            if node.get(key) is not None:return node.get(key)
                            node=parent.get(node)
                        return default
                    x1,y1,x2,y2=[float(edge.get(k,'0')) for k in ['x1','y1','x2','y2']]
                    color=inherited('stroke','#111111');weight=float(inherited('stroke-width','1'))
                    assert x1==x2 or y1==y2, 'Only the authored axis-aligned line set is supported'
                    carrier=ET.Element(f'{{{S}}}g')
                    if y1==y2:frame=[min(x1,x2),y1-weight/2,abs(x2-x1),weight]
                    else:frame=[x1-weight/2,min(y1,y2),weight,abs(y2-y1)]
                    ET.SubElement(carrier,f'{{{S}}}rect',dict(zip(['x','y','width','height'],[f'{v:g}' for v in frame])),fill=color)
                    if edge.get('marker-end'):
                        if x2>x1:preset='rightArrow';head=[x2-12,y2-5,12,10]
                        elif x2<x1:preset='leftArrow';head=[x2,y2-5,12,10]
                        elif y2>y1:preset='downArrow';head=[x2-5,y2-12,10,12]
                        else:preset='upArrow';head=[x2-5,y2,10,12]
                        heads.append({'preset':preset,'id':f'canva-arrowhead-{len(heads)+1}','frame':head,'fill':color,'stroke':'none'})
                        slots.append(carrier)
                    index=list(owner).index(edge);owner.remove(edge);owner.insert(index,carrier);line_count+=1
                if heads:
                    result=subprocess.run([sys.executable,str(skill_dir/'scripts/preset_shape_svg.py'),'render-batch','--input','-'],input=json.dumps(heads),capture_output=True,text=True,encoding='utf-8',check=True)
                    fragments=list(ET.fromstring(f'<svg xmlns="{S}">'+result.stdout+'</svg>'))
                    assert len(fragments)==len(slots)
                    for slot,fragment in zip(slots,fragments):slot.append(fragment)
                original=''.join(c for r in layout for c in r['text'] if not c.isspace())
                modified=''.join(c for el in root.iter(f'{{{S}}}text') for c in ''.join(el.itertext()) if not c.isspace())
                assert original==modified
                tree.write(TARGET/'svg_output'/source.name,encoding='unicode')
                receipt.append({'page':source.name,'sourceTextElements':len(texts),'singleFamilyFragments':count,'glyphPositionsFrom':'SVG getStartPositionOfChar with six loaded brand faces','copyIdenticalIgnoringWhitespace':True,'nativeLineCompatibilityRects':line_count,'nativeArrowHeads':len(heads)})
        finally:browser.close()
    (ROOT/'validation/canva-fragments.json').write_text(json.dumps({'pages':receipt,'sourceUnchanged':True,'purpose':'Canva import compatibility only; original local PPTX stays authoritative'},ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    print(json.dumps({'pages':len(receipt),'fragments':sum(r['singleFamilyFragments'] for r in receipt),'project':str(TARGET)},ensure_ascii=False))


def transport(source):
    with zipfile.ZipFile(source) as z:original={n:z.read(n) for n in z.namelist()}
    parts=dict(original);counts={};padding=[]
    canvas_width=int(minidom.parseString(parts['ppt/presentation.xml']).getElementsByTagNameNS(P,'sldSz')[0].getAttribute('cx'))
    files=sorted((TARGET/'svg_output').glob('*.svg'));assert len(files)==17, f'Missing canonical fragment SVGs: {TARGET}'
    for i,svg in enumerate(files,1):
        expected=[]
        def source_faces(el,family='Noto Sans SC'):
            family=el.get('font-family',family)
            if el.tag==f'{{{S}}}text':expected.extend((c,family) for c in ''.join(el.itertext()) if not c.isspace())
            for child in el:source_faces(child,family)
        source_faces(ET.parse(svg).getroot())
        name=f'ppt/slides/slide{i}.xml';doc=minidom.parseString(parts[name]);before=canonical(doc);cursor=0
        for para in doc.getElementsByTagNameNS(A,'p'):
            paragraph_families=[]
            for run in [n for n in elements(para) if n.namespaceURI==A and n.localName in {'r','fld'}]:
                value=''.join(c for c in text_content(run) if not c.isspace())
                if not value:continue
                chunk=expected[cursor:cursor+len(value)];assert ''.join(c for c,_ in chunk)==value
                families={f for _,f in chunk};assert len(families)==1
                family=families.pop();paragraph_families.append(family);cursor+=len(value)
                prop=run.getElementsByTagNameNS(A,'rPr')[0]
                apply_family(doc,prop,family);counts[family]=counts.get(family,0)+1
            if paragraph_families:
                assert len(set(paragraph_families))==1
                for prop in para.getElementsByTagNameNS(A,'defRPr')+para.getElementsByTagNameNS(A,'endParaRPr'):apply_family(doc,prop,paragraph_families[0])
        assert cursor==len(expected) and canonical(doc)==before
        # Canva ignores PowerPoint's wrap=none. Add transparent width headroom
        # without moving any glyph anchor, resizing any font or changing shapes.
        for shape in doc.getElementsByTagNameNS(P,'sp'):
            if not text_content(shape).strip():continue
            transform=shape.getElementsByTagNameNS(A,'xfrm')[0]
            offset=transform.getElementsByTagNameNS(A,'off')[0]
            extent=transform.getElementsByTagNameNS(A,'ext')[0]
            x=int(offset.getAttribute('x'));width=int(extent.getAttribute('cx'))
            font_size=max(int(p.getAttribute('sz') or '1200') for p in shape.getElementsByTagNameNS(A,'rPr'))
            font_emu=font_size/100*12700
            expanded=min(round(width*1.35+font_emu*2),canvas_width-x-76200)
            expanded=max(width,expanded)
            if expanded!=width:
                extent.setAttribute('cx',str(expanded));padding.append({'page':i,'text':text_content(shape),'before':width,'after':expanded,'anchorUnchanged':True})
        parts[name]=doc.toxml(encoding='utf-8')
    pinned=ROOT/'build/canva-single-family.pptx'
    with zipfile.ZipFile(pinned,'w',zipfile.ZIP_DEFLATED) as z:
        for name,data in parts.items():z.writestr(name,data)
    helper=ROOT.parents[1]/'tools/prepare-canva-import.py'
    spec=importlib.util.spec_from_file_location('canva_transport_helper',helper);module=importlib.util.module_from_spec(spec);spec.loader.exec_module(module)
    module.prepare(pinned,ROOT/'build/Outrise-v8-Canva-Import.pptx',ROOT/'validation/canva-font-transport.json')
    (ROOT/'validation/canva-width-padding.json').write_text(json.dumps({'reason':'Canva ignores wrap=none; transparent frame headroom prevents reflow after font replacement','fontSizesAndGlyphAnchorsUnchanged':True,'paddedTextFrames':len(padding),'changes':padding},ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    print(json.dumps({'sourceFaces':counts,'onlyFontAndTransparentTextFrameWidthsChanged':True,'paddedFrames':len(padding),'output':'build/Outrise-v8-Canva-Import.pptx'},ensure_ascii=False))


def apply_family(doc,prop,family):
    for tag in ['latin','ea','cs']:
        found=[n for n in elements(prop) if n.namespaceURI==A and n.localName==tag]
        if found:child=found[0]
        else:child=doc.createElementNS(A,'a:'+tag);prop.appendChild(child)
        child.setAttribute('typeface',family)
    prop.setAttribute('b','0')


if __name__=='__main__':
    ap=argparse.ArgumentParser();ap.add_argument('--server',default='http://127.0.0.1:6061');ap.add_argument('--transport',type=Path);ap.add_argument('--fragment-project',type=Path);ap.add_argument('--skill-dir',type=Path);args=ap.parse_args()
    if args.fragment_project:TARGET=args.fragment_project
    if args.transport:transport(args.transport)
    else:
        if args.skill_dir is None:ap.error('--skill-dir must be the absolute skill path supplied by the host')
        prepare(args.server,args.skill_dir)
