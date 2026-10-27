"""Brand-font PNGs, readable gallery and selectable-text PDF from canonical SVGs."""
from __future__ import annotations
import argparse
import json
import shutil
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont
from playwright.sync_api import sync_playwright

ROOT=Path(__file__).resolve().parents[1]
FONT_NAMES=[('Noto Sans SC','NotoSansSC-Regular.ttf'),('Noto Sans SC Medium','NotoSansSC-Medium.ttf'),('Noto Sans SC SemiBold','NotoSansSC-SemiBold.ttf'),('Instrument Sans','InstrumentSans-Regular.ttf'),('Instrument Sans Medium','InstrumentSans-Medium.ttf'),('Instrument Sans SemiBold','InstrumentSans-SemiBold.ttf')]


def css(url):return '\n'.join('@font-face{font-family:"'+n+'";src:url("'+url+'/images/fonts/'+f+'");font-style:normal;font-weight:400;font-display:block;}' for n,f in FONT_NAMES)


def ready(page):
    return page.evaluate('''async(names)=>{let rows=[];for(const name of names){const f=await document.fonts.load('26px "'+name+'"','北美 Outrise');rows.push({name,count:f.length,check:document.fonts.check('26px "'+name+'"','北美 Outrise')})}await document.fonts.ready;await Promise.all(Array.from(document.querySelectorAll('svg image')).map(el=>{const im=new Image();im.src=new URL(el.getAttribute('href'),document.baseURI).href;return im.decode()}));return rows;}''',[n for n,_ in FONT_NAMES])


def main():
    ap=argparse.ArgumentParser();ap.add_argument('--server',default='http://127.0.0.1:6061');args=ap.parse_args();url=args.server
    files=sorted((ROOT/'svg_output').glob('*.svg'));assert len(files)==20
    dest=ROOT/'exports/previews';dest.mkdir(parents=True,exist_ok=True)
    for _,name in FONT_NAMES:shutil.copy2(ROOT/'fonts'/name,ROOT/'images/fonts'/name)
    title='Outrise v8.2｜公司介绍'
    cards=''.join('<article><div class="label">'+f.stem+'</div><button onclick="zoom(this)">'+f.read_text(encoding='utf-8')+'</button></article>' for f in files)
    gallery='<!doctype html><html lang="zh-CN"><meta charset="utf-8"><title>'+title+'</title><style>'+css(url)+'''*{box-sizing:border-box}body{margin:0;padding:32px;background:#E9E7E1;font-family:"Noto Sans SC";color:#111111}h1{font:32px "Noto Sans SC SemiBold"}p{color:#62625D;line-height:1.7}.grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:24px}.label{font-size:14px;margin:0 0 8px}button{display:block;border:0;padding:0;width:100%;cursor:zoom-in}button svg{display:block;width:100%;height:auto}dialog{width:96vw;max-width:1400px;border:0;padding:0}dialog svg{display:block;width:100%;height:auto}dialog::backdrop{background:#111111CC}#close{position:fixed;right:24px;top:12px;width:auto;background:#111111;color:#FFFFFF;border:1px solid #FFFFFF;padding:12px;cursor:pointer}@media(max-width:900px){.grid{grid-template-columns:1fr}}</style><h1>'''+title+'''</h1><p>C｜品牌展示式 · 20页完整版。点击页面放大；按Esc关闭。字体、Logo与图示使用批准的v2品牌系统。</p><main class="grid">'''+cards+'''</main><dialog id="viewer"><button id="close" onclick="document.getElementById('viewer').close()">关闭</button><div id="zoom"></div></dialog><script>function zoom(b){document.getElementById('zoom').innerHTML=b.innerHTML;document.getElementById('viewer').showModal()}</script></html>'''
    (ROOT/'images/deck-gallery.html').write_text(gallery,encoding='utf-8')
    records=[]
    with sync_playwright() as p:
        browser=p.chromium.launch();page=browser.new_page(viewport={'width':1280,'height':720},device_scale_factor=1)
        try:
            page.goto(url+'/images/deck-gallery.html',wait_until='domcontentloaded')
            for f in files:
                markup='<!doctype html><html><head><base href="'+url+'/images/deck-gallery.html"><style>'+css(url)+'html,body{margin:0;padding:0;overflow:hidden}svg{display:block;width:1280px;height:720px}</style></head><body>'+f.read_text(encoding='utf-8')+'</body></html>'
                page.set_content(markup,wait_until='load');proof=ready(page)
                assert all(x['check'] and x['count'] for x in proof)
                page.screenshot(path=str(dest/(f.stem+'.png')))
                records.append({'page':f.name,'width':1280,'height':720,'fontProof':proof,'ok':True})
            sections=''.join('<section>'+f.read_text(encoding='utf-8')+'</section>' for f in files)
            print_html='<!doctype html><html><head><base href="'+url+'/images/deck-gallery.html"><style>'+css(url)+'@page{size:1280px 720px;margin:0}html,body{margin:0;padding:0}section{width:1280px;height:720px;break-after:page;overflow:hidden}section:last-child{break-after:auto}svg{display:block;width:1280px;height:720px}</style></head><body>'+sections+'</body></html>'
            page.set_content(print_html,wait_until='load');proof=ready(page);assert all(x['check'] and x['count'] for x in proof)
            page.pdf(path=str(ROOT/'exports/Outrise-Intro-Deck-v8.2-Source.pdf'),print_background=True,prefer_css_page_size=True)
        finally:browser.close()
    (ROOT/'validation/brand-render.json').write_text(json.dumps({'renderer':'Chromium, six explicit project FontFace resources','records':records},ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    font=ImageFont.truetype(str(ROOT/'fonts/NotoSansSC-Medium.ttf'),20)
    for start,end in [(1,6),(7,12),(13,18),(19,20)]:
        board=Image.new('RGB',(1320,3*408+20),'#E9E7E1');draw=ImageDraw.Draw(board)
        for i,n in enumerate(range(start,end+1)):
            x=20+(i%2)*650;y=20+(i//2)*408;f=files[n-1]
            draw.text((x,y),f'{n:02d}',font=font,fill='#111111')
            im=Image.open(dest/(f.stem+'.png')).convert('RGB').resize((640,360),Image.Resampling.LANCZOS);board.paste(im,(x,y+32))
        board.save(ROOT/f'exports/preview-{start:02d}-{end:02d}.png')
    thumbs=Image.new('RGB',(4*492+20,5*297+20),'#E9E7E1');draw=ImageDraw.Draw(thumbs)
    for i,f in enumerate(files):
        x=20+(i%4)*492;y=20+(i//4)*297;draw.text((x,y),f'{i+1:02d}',font=font,fill='#111111');im=Image.open(dest/(f.stem+'.png')).convert('RGB').resize((480,270),Image.Resampling.LANCZOS);thumbs.paste(im,(x,y+27))
    thumbs.save(ROOT/'exports/Outrise-Intro-Deck-v8.2-source-preview.png')
    print(json.dumps({'pages':20,'fonts':'6/6 per page','gallery':url+'/images/deck-gallery.html','pdf':'exports/Outrise-Intro-Deck-v8.2-Source.pdf'}))


if __name__=='__main__':main()
