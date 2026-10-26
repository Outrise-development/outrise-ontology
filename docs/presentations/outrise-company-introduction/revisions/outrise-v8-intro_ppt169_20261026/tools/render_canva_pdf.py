"""Render the actual Canva PDF for final visual review at the canonical canvas."""
from pathlib import Path
import json
import pypdfium2 as pdfium
from PIL import Image, ImageDraw, ImageFont

ROOT=Path(__file__).resolve().parents[1]


def main():
    source=ROOT/'exports/Outrise-Intro-Deck-v8-Canva.pdf';doc=pdfium.PdfDocument(str(source));assert len(doc)==17
    dest=ROOT/'exports/canva-previews';dest.mkdir(exist_ok=True)
    pages=[]
    for i in range(len(doc)):
        page=doc[i];size=page.get_size();image=page.render(scale=1280/size[0]).to_pil().convert('RGB')
        assert image.width==1280 and abs(image.height-720)<=1
        image.save(dest/f'{i+1:02d}.png');pages.append({'page':i+1,'width':image.width,'height':image.height});page.close()
    doc.close()
    font=ImageFont.truetype(str(ROOT/'fonts/NotoSansSC-Medium.ttf'),20)
    for start,end in [(1,6),(7,12),(13,17)]:
        board=Image.new('RGB',(1320,1244),'#E9E7E1');draw=ImageDraw.Draw(board)
        for k,n in enumerate(range(start,end+1)):
            x=20+(k%2)*650;y=20+(k//2)*408;draw.text((x,y),f'{n:02d}',font=font,fill='#111111')
            im=Image.open(dest/f'{n:02d}.png').resize((640,360),Image.Resampling.LANCZOS);board.paste(im,(x,y+32))
        board.save(ROOT/f'exports/canva-preview-{start:02d}-{end:02d}.png')
    board=Image.new('RGB',(1988,1505),'#E9E7E1');draw=ImageDraw.Draw(board)
    for i in range(17):
        x=20+(i%4)*492;y=20+(i//4)*297
        draw.text((x,y),f'{i+1:02d}',font=font,fill='#111111')
        im=Image.open(dest/f'{i+1:02d}.png').resize((480,270),Image.Resampling.LANCZOS)
        board.paste(im,(x,y+27))
    board.save(ROOT/'exports/Outrise-Intro-Deck-v8-Final-preview.png')
    (ROOT/'validation/canva-pdf-render.json').write_text(json.dumps({'source':str(source),'pages':pages},indent=2)+'\n',encoding='utf-8')
    print('Rendered all 17 actual Canva PDF pages at 1280 × 720.')


if __name__=='__main__':main()
