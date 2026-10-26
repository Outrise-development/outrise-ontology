"""Render project SVGs with explicit approved web fonts, not host fallback.

The skill's local preview server serves these project-local assets. SVGs stay
unchanged; CSS is confined to the review HTML. The PNGs are review derivatives.
"""
from __future__ import annotations
import argparse
import json
import shutil
import urllib.request
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont
from playwright.sync_api import sync_playwright

ROOT=Path(__file__).resolve().parents[1]
FONT_NAMES=[('Noto Sans SC','NotoSansSC-Regular.ttf'),('Noto Sans SC Medium','NotoSansSC-Medium.ttf'),('Noto Sans SC SemiBold','NotoSansSC-SemiBold.ttf'),
            ('Instrument Sans','InstrumentSans-Regular.ttf'),('Instrument Sans Medium','InstrumentSans-Medium.ttf'),('Instrument Sans SemiBold','InstrumentSans-SemiBold.ttf')]
TITLES=['A｜暖色编辑式','B｜营销工作地图式','C｜品牌展示式']


def fonts_css(url):
    return '\n'.join('@font-face{font-family:"'+name+'";src:url("'+url+'/images/fonts/'+file+'");font-style:normal;font-weight:400;font-display:block;}' for name,file in FONT_NAMES)


def make_gallery(url, files):
    cards=[]
    # Rows compare like-for-like page jobs; columns preserve A/B/C.
    for job,label in enumerate(['封面','公司介绍','服务体系']):
        for direction in range(3):
            f=files[direction*3+job];svg=f.read_text(encoding='utf-8')
            cards.append(f'<article><div class="label">{TITLES[direction]} · {label}</div><button class="slide" aria-label="放大{TITLES[direction]}{label}" onclick="zoom(this)">{svg}</button></article>')
    text='''<!doctype html><html lang="zh-CN"><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Outrise v8｜三方向对比</title><style>'''+fonts_css(url)+'''
*{box-sizing:border-box}body{margin:0;background:#E9E7E1;color:#111111;font-family:"Noto Sans SC";padding:32px}h1{font:32px "Noto Sans SC SemiBold";margin:0 0 12px}p{font-size:16px;line-height:1.7;margin:0 0 28px;color:#62625D}.grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:28px 22px}.label{font:18px "Noto Sans SC Medium";margin:0 0 10px}.slide{display:block;width:100%;border:0;padding:0;background:none;cursor:zoom-in;box-shadow:0 1px 8px #11111112}.slide>svg{display:block;width:100%;height:auto}dialog{padding:0;border:0;background:#F4F1E9;width:min(1400px,96vw);max-width:96vw}dialog::backdrop{background:#111111CC}dialog svg{display:block;width:100%;height:auto}.close{position:fixed;right:30px;top:18px;border:1px solid white;background:#111111;color:white;padding:10px 18px;cursor:pointer;font:16px "Noto Sans SC"}@media(max-width:900px){.grid{grid-template-columns:1fr}body{padding:20px}}
</style><h1>Outrise v8｜三方向对比</h1><p>每列为一种方向，每行比较同一页面。文案相同；点击任意页面可放大查看。选定后，将该方向应用至完整17页。</p><main class="grid">'''+''.join(cards)+'''</main><dialog id="viewer"><button class="close" onclick="document.getElementById('viewer').close()">关闭</button><div id="zoom"></div></dialog><script>function zoom(b){document.getElementById('zoom').innerHTML=b.innerHTML;document.getElementById('viewer').showModal()}document.getElementById('viewer').addEventListener('click',function(e){if(e.target===this)this.close()});document.fonts.ready.then(()=>document.body.dataset.ready='true');</script></html>'''
    (ROOT/'images/demo-gallery.html').write_text(text,encoding='utf-8')


def render(url, files):
    folder=ROOT/'exports/previews';folder.mkdir(parents=True,exist_ok=True)
    records=[]
    with sync_playwright() as p:
        browser=p.chromium.launch()
        page=browser.new_page(viewport={'width':1280,'height':720},device_scale_factor=1)
        try:
            page.goto(url+'/images/demo-gallery.html',wait_until='domcontentloaded')
            for f in files:
                raw=f.read_text(encoding='utf-8')
                html='<!doctype html><html><head><base href="'+url+'/images/demo-gallery.html"><style>'+fonts_css(url)+'html,body{margin:0;padding:0;overflow:hidden;background:#F4F1E9}svg{display:block;width:1280px;height:720px}</style></head><body>'+raw+'</body></html>'
                page.set_content(html,wait_until='load')
                proof=page.evaluate('''async (names)=>{let loaded=[];for(const name of names){const faces=await document.fonts.load('26px "'+name+'"','北美 Outrise');loaded.push({name,count:faces.length,check:document.fonts.check('26px "'+name+'"','北美 Outrise')})}await document.fonts.ready;await Promise.all(Array.from(document.querySelectorAll('svg image')).map(el=>{const im=new Image();im.src=new URL(el.getAttribute('href'),document.baseURI).href;return im.decode()}));return loaded;}''',[n for n,_ in FONT_NAMES])
                if any(not x['check'] or not x['count'] for x in proof):raise RuntimeError('Missing approved face: '+str(proof))
                page.screenshot(path=str(folder/(f.stem+'.png')))
                records.append({'page':f.name,'width':1280,'height':720,'fontProof':proof,'ok':True})
        finally:browser.close()
    (ROOT/'validation/brand-render.json').write_text(json.dumps({'renderer':'Playwright Chromium, explicit project FontFace resources','records':records},ensure_ascii=False,indent=2)+'\n',encoding='utf-8')


def boards(files):
    label=ImageFont.truetype(str(ROOT/'fonts/NotoSansSC-Medium.ttf'),30)
    small=ImageFont.truetype(str(ROOT/'fonts/NotoSansSC-Regular.ttf'),22)
    gap=24;w=1280;h=720;top=64
    canvas=Image.new('RGB',(w*3+gap*4,(h+top)*3+gap*4),'#E9E7E1');d=ImageDraw.Draw(canvas)
    for job in range(3):
        strip=Image.new('RGB',(w*3+gap*4,h+top+gap*2),'#E9E7E1');sd=ImageDraw.Draw(strip)
        for direction in range(3):
            f=files[direction*3+job];im=Image.open(ROOT/'exports/previews'/(f.stem+'.png')).convert('RGB')
            x=gap+direction*(w+gap);y=gap+job*(h+top+gap)
            d.text((x,y+8),TITLES[direction],font=label,fill='#111111');canvas.paste(im,(x,y+top))
            sd.text((x,gap+8),TITLES[direction],font=label,fill='#111111');strip.paste(im,(x,gap+top))
        strip.save(ROOT/'exports'/['01-covers.png','02-company.png','03-services.png'][job])
    canvas.save(ROOT/'exports/Outrise-v8-Demo-Comparison.png')


def main():
    ap=argparse.ArgumentParser();ap.add_argument('--server',default='http://127.0.0.1:6060');args=ap.parse_args()
    dest=ROOT/'images/fonts';dest.mkdir(exist_ok=True)
    for _,name in FONT_NAMES:shutil.copy2(ROOT/'fonts'/name,dest/name)
    files=sorted((ROOT/'svg_output').glob('*.svg'))
    if len(files)!=9:raise RuntimeError('Expected all nine authored pages')
    make_gallery(args.server,files);render(args.server,files);boards(files)
    print(json.dumps({'pages':len(files),'gallery':args.server+'/images/demo-gallery.html','comparison':'exports/Outrise-v8-Demo-Comparison.png','fonts':'6/6 loaded per page'}))


if __name__=='__main__':main()
