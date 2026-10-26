"""Restore exact brand faces after the converter's system-safe font substitution.

Visible SVG glyph order is the authority for weight. Text, sizes, transforms,
spacing, geometry and image bytes must remain unchanged. This produces a
font-unembedded intermediate for the verified EOT embedding helper.
"""
from __future__ import annotations
import argparse
import hashlib
import json
import re
import zipfile
from pathlib import Path
from xml.dom import Node, minidom
from xml.etree import ElementTree as ET

ROOT=Path(__file__).resolve().parents[1]
A='http://schemas.openxmlformats.org/drawingml/2006/main'
P='http://schemas.openxmlformats.org/presentationml/2006/main'
S='http://www.w3.org/2000/svg'
FACES={400:('Instrument Sans','Noto Sans SC'),500:('Instrument Sans Medium','Noto Sans SC Medium'),600:('Instrument Sans SemiBold','Noto Sans SC SemiBold')}
FONT_PROPS={'latin','ea','cs'}
PROPS={'rPr','defRPr','endParaRPr'}


def sha(v):return hashlib.sha256(v).hexdigest()


def source_glyphs(path):
    result=[]
    def chars(value,family):
        weight=600 if 'SemiBold' in family else 500 if 'Medium' in family else 400
        result.extend((c,weight) for c in value if not c.isspace())
    def walk(el,family,inside=False):
        family=el.get('font-family',family)
        inside=inside or el.tag==f'{{{S}}}text'
        if inside and el.text:chars(el.text,family)
        for child in el:
            walk(child,family,inside)
            if inside and child.tail:chars(child.tail,family)
    walk(ET.parse(path).getroot(),'Noto Sans SC')
    return result


def elements(el):return [x for x in el.childNodes if x.nodeType==Node.ELEMENT_NODE]


def canonical(node):
    if node.nodeType==Node.DOCUMENT_NODE:return tuple(canonical(c) for c in node.childNodes)
    if node.nodeType!=Node.ELEMENT_NODE:return (node.nodeType,node.nodeName,node.nodeValue)
    if node.namespaceURI==A and node.localName in FONT_PROPS:return ('font-slot',node.localName)
    attrs=[]
    for k,v in node.attributes.items():
        if node.namespaceURI==A and node.localName in PROPS and k=='b':continue
        attrs.append((k,v))
    children=tuple(canonical(c) for c in node.childNodes if not(c.nodeType==Node.ELEMENT_NODE and c.namespaceURI==A and c.localName in FONT_PROPS))
    return (node.tagName,tuple(sorted(attrs)),children)


def font_props(doc,el,weight,family=None):
    latin,ea=(family,family) if family else FACES[weight]
    for tag,name in [('latin',latin),('ea',ea),('cs',latin)]:
        nodes=[n for n in elements(el) if n.namespaceURI==A and n.localName==tag]
        if nodes: n=nodes[0]
        else:n=doc.createElementNS(A,'a:'+tag);el.appendChild(n)
        n.setAttribute('typeface',name)
    el.setAttribute('b','0')


def text_content(el):
    return ''.join(n.firstChild.nodeValue if n.firstChild else '' for n in el.getElementsByTagNameNS(A,'t'))


def main():
    ap=argparse.ArgumentParser();ap.add_argument('--input',type=Path,required=True);ap.add_argument('--output',type=Path,required=True);ap.add_argument('--single-family',action='store_true');args=ap.parse_args()
    with zipfile.ZipFile(args.input) as z:items={n:z.read(n) for n in z.namelist()}
    original=dict(items);reports=[]
    for i,svg in enumerate(sorted((ROOT/'svg_output').glob('*.svg')),1):
        name=f'ppt/slides/slide{i}.xml';doc=minidom.parseString(items[name]);before=canonical(doc);expected=source_glyphs(svg);cursor=0;run_count=0;weights={400:0,500:0,600:0}
        for para in doc.getElementsByTagNameNS(A,'p'):
            paragraph_weights=[];paragraph_families=[]
            for run in [n for n in elements(para) if n.namespaceURI==A and n.localName in {'r','fld'}]:
                text=text_content(run);meaningful=[c for c in text if not c.isspace()]
                if not meaningful:continue
                chunk=expected[cursor:cursor+len(meaningful)]
                if ''.join(c for c,_ in chunk)!=''.join(meaningful):raise ValueError(f'Glyph order mismatch {name} at {cursor}: {text!r}')
                w={v for _,v in chunk}
                if len(w)!=1:raise ValueError(f'Mixed source weights in one exported run {name}: {text!r}')
                weight=w.pop();cursor+=len(meaningful);paragraph_weights.append(weight);weights[weight]+=1;run_count+=1
                props=[n for n in elements(run) if n.namespaceURI==A and n.localName=='rPr']
                if props:prop=props[0]
                else:prop=doc.createElementNS(A,'a:rPr');run.insertBefore(prop,run.firstChild)
                family=None
                if args.single_family:
                    names={n.getAttribute('typeface') for n in elements(prop) if n.namespaceURI==A and n.localName in FONT_PROPS}
                    if len(names)!=1 or not names.issubset(FACES[weight]):raise ValueError('Single-family source does not match source weight')
                    family=names.pop();paragraph_families.append(family)
                font_props(doc,prop,weight,family)
            if paragraph_weights:
                if len(set(paragraph_weights))!=1:raise ValueError('Mixed-weight paragraph needs explicit default policy')
                if paragraph_families and len(set(paragraph_families))!=1:raise ValueError('Mixed families in single-family paragraph')
                for prop in para.getElementsByTagNameNS(A,'defRPr')+para.getElementsByTagNameNS(A,'endParaRPr'):font_props(doc,prop,paragraph_weights[0],paragraph_families[0] if paragraph_families else None)
        if cursor!=len(expected):raise ValueError(f'Unconsumed source glyphs: {name}')
        if canonical(doc)!=before:raise ValueError(f'Non-font XML changed: {name}')
        items[name]=doc.toxml(encoding='utf-8')
        reports.append({'page':i,'runs':run_count,'glyphs':cursor,'weightRunCounts':weights,'textAndGeometryUnchanged':True})
    # Keep theme aliases useful when a user inserts new text in PowerPoint.
    for name in list(items):
        if re.fullmatch(r'ppt/theme/theme\d+.xml',name):
            doc=minidom.parseString(items[name]);before=canonical(doc)
            for tag,weight in [('majorFont',600),('minorFont',400)]:
                for entry in doc.getElementsByTagNameNS(A,tag):
                    for child in elements(entry):
                        if child.namespaceURI==A and child.localName in FONT_PROPS:
                            child.setAttribute('typeface',FACES[weight][1 if child.localName=='ea' else 0])
            if canonical(doc)!=before:raise ValueError(f'Non-font theme change: {name}')
            items[name]=doc.toxml(encoding='utf-8')
    args.output.parent.mkdir(exist_ok=True,parents=True)
    with zipfile.ZipFile(args.output,'w',compression=zipfile.ZIP_DEFLATED,compresslevel=9) as z:
        for name,data in items.items():z.writestr(name,data)
    changed=[n for n in items if items[n]!=original[n]]
    report={'source':str(args.input),'sourceSha256':sha(args.input.read_bytes()),'output':str(args.output),'outputSha256':sha(args.output.read_bytes()),'slideCount':len(reports),'sourceGlyphOrderVerified':True,'textAndGeometryUnchanged':True,'singleFamilyPreserved':args.single_family,'changedParts':changed,'unrelatedPartsByteIdentical':len(items)-len(changed),'pages':reports,'fontEmbeddingStillRequired':True}
    (ROOT/'validation/native-font-restoration.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    print(json.dumps({k:v for k,v in report.items() if k not in {'pages','changedParts'}},ensure_ascii=False))


if __name__=='__main__':main()
