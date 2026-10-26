/** Outrise client deck: native editable text, shapes and connectors. Approved PNG logo only. */
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {spawnSync} from 'node:child_process';
process.on('uncaughtException',e=>{console.error(e.stack||e.message);process.exit(1);});
const workspaceDir=path.dirname(fileURLToPath(import.meta.url));
const runtimeRoot='C:/Users/zx/.cache/codex-runtimes/codex-primary-runtime/dependencies';
const nodeModules=process.env.CODEX_PRESENTATION_NODE_MODULES||`${runtimeRoot}/node/node_modules`;
const SKILL_DIR=process.env.CODEX_PRESENTATION_SKILL_DIR||'C:/Users/zx/.codex/plugins/cache/openai-primary-runtime/presentations/26.1020.11348/skills/presentations';
const PYTHON=process.env.CODEX_PRESENTATION_PYTHON||`${runtimeRoot}/python/python.exe`;
process.env.RUNTIME_NODE_MODULES=nodeModules;
const {registerOutriseFonts,fontFace}=await import('./brand-assets/outrise-vi-v1/tools/register-fonts.mjs');
const {Canvas,FontLibrary}=registerOutriseFonts(nodeModules);
const assets=path.join(workspaceDir,'brand-assets/outrise-vi-v1');
const {Presentation,PresentationFile}=await import(pathToFileURL(path.join(nodeModules,'@oai/artifact-tool/dist/artifact_tool.mjs')).href);
const {finalizePresentation}=await import(pathToFileURL(path.join(SKILL_DIR,'container_tools/artifact_tool_utils.mjs')).href);
const content=JSON.parse(await fs.readFile(path.join(workspaceDir,'content.zh-CN.json'),'utf8'));
const canvaFragments=process.argv.includes('--canva-fragments');
const rev=process.argv.find(a=>a.startsWith('--revision='))?.split('=')[1]||(canvaFragments?'v7-canva-fragments':'v7');
const samples=process.argv.includes('--samples');
const buildDir=path.join(workspaceDir,'build',rev),outputDir=canvaFragments?path.join(buildDir,'export'):path.join(workspaceDir,'output');
await fs.mkdir(buildDir,{recursive:true});await fs.mkdir(outputDir,{recursive:true});
const W=1600,H=900,M=88,R=1512;
const C={ink:'#111111',paper:'#F4F1E9',blue:'#2454FF',muted:'#62625D',rule:'#D6D4CB',white:'#FFFFFF'};
const FONT='Noto Sans SC',LATIN='Instrument Sans';
const presentation=Presentation.create({slideSize:{width:W,height:H}});
const ctx=new Canvas(1,1).getContext('2d');
const objects=[];let serial=0;
const fragments=[];
const logos={black:new Uint8Array(await fs.readFile(path.join(assets,'logos/wordmark-black.png'))),white:new Uint8Array(await fs.readFile(path.join(assets,'logos/wordmark-white.png')))};
function embedFonts(input,output,receipt){
 const r=spawnSync(PYTHON,[path.join(assets,'tools/embed-pptx-fonts.py'),'--input',input,'--output',output,'--receipt',receipt,'--require-windows-parser'],{encoding:'utf8',maxBuffer:10*1024*1024});
 if(r.status!==0)throw new Error(`Font embedding failed: ${r.stderr||r.stdout}`);
 const audit=JSON.parse(r.stdout.trim());console.log(`Embedded ${audit.embeddedFaceCount} approved complete font faces: ${path.basename(output)}`);
}
const weightFor=(size,bold)=>bold?(size>=43?600:500):400;
function runs(text,size,bold,color){return (text.match(/[\x00-\x7F]+|[^\x00-\x7F]+/gu)||[]).map(run=>({run,style:{typeface:fontFace(/^[\x00-\x7F]+$/.test(run)?'latin':'chinese',weightFor(size,bold)),fontSize:`${size}px`,bold:false,color}}));}
function widthOf(text,size,bold){let width=0;for(const r of runs(text,size,bold,C.ink)){ctx.font=`normal ${size}px "${r.style.typeface}"`;width+=ctx.measureText(r.run).width;}return width;}
function wrapCopy(text,width,size,bold,reserve=.86){
 const lines=[],limit=width*reserve-3;
 for(const para of String(text).split('\n')){
  const first=lines.length,tokens=para.match(/[A-Za-z0-9@._+\-/]+|\s+|./gu)||[''];let current='';
  for(const t of tokens){if(current&&widthOf(current+t,size,bold)>limit){
   if(/^[，。！？、；：）】》,.!?;:]/u.test(t)){const cs=[...current];let last=cs.pop()||'';while(cs.length&&/[A-Za-z0-9]/.test(last[0])&&/[A-Za-z0-9]/.test(cs.at(-1)))last=cs.pop()+last;lines.push(cs.join('').trimEnd());current=last+t;}
   else{lines.push(current.trimEnd());current=t.trimStart();}
  }else current+=t;}lines.push(current.trimEnd());
  const letters=s=>(s.match(/[\p{L}\p{N}]/gu)||[]).length;
  if(lines.length-first>1&&letters(lines.at(-1))<=2){let tail=lines.at(-1),previous=lines.at(-2).match(/[A-Za-z0-9@._+\-/]+|\s+|./gu)||[];while(previous.length>4&&letters(tail)<4){const moved=previous.pop();if(widthOf(moved+tail,size,bold)>limit){previous.push(moved);break;}tail=moved+tail;}lines[lines.length-2]=previous.join('').trimEnd();lines[lines.length-1]=tail.trimStart();}
 }return lines;
}
function rect(s,x,y,w,h,fill='none',stroke='none',sw=0,name='panel'){return s.shapes.add({geometry:'rect',name:`${name}-${++serial}`,position:{left:x,top:y,width:w,height:h},fill,line:{fill:stroke,width:sw,style:'solid'}});}
function tx(s,text,x,y,w,h,size=28,bold=false,color=C.ink,opts={}){
 if(!text)return null;const lines=wrapCopy(text,w,size,bold,opts.reserve??.86);
 if(canvaFragments)return fragmentText(s,text,lines,x,y,w,h,size,bold,color,opts);
 const shape=rect(s,x,y,w,h,'none','none',0,opts.name||'text');
 shape.text=lines.map(t=>({runs:runs(t,size,bold,color),spaceBefore:0,spaceAfter:0}));
 // Keep typeface/size/color on each run: setting them again on the whole text
 // would replace Instrument Sans with the Chinese face in mixed-script copy.
 shape.text.style={alignment:opts.align||'left',verticalAlignment:'top',lineSpacing:opts.leading||1.2,wrap:'none',autoFit:'none',insets:0};
 objects.push({slide:presentation.slides.items.length,name:shape.name,text,lines,x,y,w,h,size,bold,estimatedHeight:lines.length*size*(opts.leading||1.2)});return shape;
}
// Canva flattens mixed-font paragraphs when importing a PPTX. This private
// transport keeps the approved layout but emits one single-face object per
// visible script fragment. Native output mode above remains unchanged.
function fragmentText(s,text,lines,x,y,w,h,size,bold,color,opts){
 const leading=opts.leading||1.2,align=opts.align||'left';
 // Artifact Tool's authored presentation line model is 1.2em. For leading>1
 // it puts the baseline at size + (lineHeight - 1.2*size). Reusing the same
 // single-line style, rather than shifting by glyph ink bounds, preserves the
 // common baseline for both font families and the original paragraph rhythm.
 const lineHeight=1.2*size*leading,baselineOffset=size+(lineHeight-1.2*size);
 const parentName=`${opts.name||'text'}-${++serial}`,parentFragments=[];
 let first=null;
 lines.forEach((lineText,lineIndex)=>{
  const lineWidth=widthOf(lineText,size,bold);
  let cursor=x+(align==='center'?(w-lineWidth)/2:align==='right'?w-lineWidth:0);
  for(const source of runs(lineText,size,bold,color)){
   ctx.font=`normal ${size}px "${source.style.typeface}"`;
   const fullWidth=ctx.measureText(source.run).width;
   const prefix=source.run.match(/^\s*/u)?.[0]||'';
   const visible=source.run.trim();
   const prefixWidth=ctx.measureText(prefix).width;
   if(visible){
    const metrics=ctx.measureText(visible),left=cursor+prefixWidth;
    const top=y+lineIndex*lineHeight;
    // Canva restores wrapping and may add tracking during import. Reserve 14%
    // inside the transparent frame; frames may overlap, but glyphs do not.
    // This allowance never participates in positioning or centering.
    const frameWidth=metrics.width*1.14+Math.max(4,size*.1);
    const shape=rect(s,left,top,frameWidth,lineHeight+size*.25,'none','none',0,`${parentName}-line${lineIndex+1}-fragment`);
    shape.text=[{runs:[{run:visible,style:source.style}],spaceBefore:0,spaceAfter:0}];
    shape.text.style={alignment:'left',verticalAlignment:'top',lineSpacing:leading,wrap:'none',autoFit:'none',insets:0};
    first??=shape;
    const record={slide:presentation.slides.items.length,parentName,name:shape.name,lineIndex,text:visible,typeface:source.style.typeface,weight:weightFor(size,bold),x:left,y:top,w:frameWidth,h:lineHeight+size*.25,advance:metrics.width,size,leading,baseline:top+baselineOffset,fontAscent:metrics.fontBoundingBoxAscent,fontDescent:metrics.fontBoundingBoxDescent};
    fragments.push(record);parentFragments.push(record.name);
   }
   cursor+=fullWidth;
  }
 });
 objects.push({slide:presentation.slides.items.length,name:parentName,text,lines,x,y,w,h,size,bold,align,leading,estimatedHeight:lines.length*lineHeight,fragments:parentFragments});
 return first;
}
function line(s,x1,y1,x2,y2,color=C.rule,sw=1.3,arrow=false){const reverse=x2<x1||y2<y1;return s.shapes.add({geometry:'connector',kind:'straight',name:`connector-${++serial}`,position:{left:Math.min(x1,x2),top:Math.min(y1,y2),width:Math.abs(x2-x1),height:Math.abs(y2-y1)},line:{fill:color,width:sw,style:'solid'},...(arrow?{[reverse?'head':'tail']:{type:'triangle',width:'sm',length:'sm'}}:{})});}
function logo(s,x,y,w,dark=false){const h=w*635/2400;s.images.add({blob:dark?logos.white:logos.black,contentType:'image/png',alt:'Outrise approved wordmark',fit:'contain',position:{left:x,top:y,width:w,height:h}});return h;}
function accent(s,x,y,w=54){rect(s,x,y,w,5,C.blue);}
function cutPlane(s,x,y,w,h,color){const rise=w*Math.tan(24*Math.PI/180);return s.shapes.add({geometry:'custom',name:`brand-cut-24deg-${++serial}`,position:{left:x,top:y,width:w,height:h},fill:color,line:{fill:'none',width:0},customPaths:[{width:w,height:h,commands:[{moveTo:{x:0,y:rise}},{lineTo:{x:w,y:0}},{lineTo:{x:w,y:h}},{lineTo:{x:0,y:h}},{close:{}}]}]});}
function footer(s,d,dark=false,{brand=true}={}){
 line(s,M,815,R,815,dark?C.muted:C.rule,1);if(brand)logo(s,M,838,180,dark);
 if(d.footerNote)tx(s,d.footerNote,brand?308:M,841,brand?1080:1310,42,17,false,dark?C.rule:C.muted,{reserve:.98,leading:1.15});
 tx(s,String(d.number).padStart(2,'0'),1448,839,64,40,22,false,dark?C.rule:C.muted,{align:'right',reserve:1});
}
function header(s,d,dark=false,{subtitle=true}={}){
 accent(s,M,56,38);tx(s,d.section,M+58,42,1200,40,20,false,dark?C.rule:C.muted,{reserve:1});
 tx(s,d.title,M,105,1424,105,54,true,dark?C.paper:C.ink,{reserve:.97,leading:1.12,name:'title'});
 if(subtitle)tx(s,d.subtitle,M,205,1424,86,27,false,dark?C.rule:C.muted,{reserve:.94,leading:1.25});
}
function make(d,{dark=false,standard=true,brand=true}={}){const s=presentation.slides.add();s.background.fill=dark?C.ink:C.paper;if(standard)header(s,d,dark);footer(s,d,dark,{brand});s.speakerNotes.clear();return s;}
function number(s,n,x,y,size=28,color=C.blue){tx(s,String(n).padStart(2,'0'),x,y,60,size*1.5,size,false,color,{reserve:1});}
function module(s,b,x,y,w,{titleSize=33,bodySize=28,titleH=90,bodyY=112,bodyH=190,dark=false}={}){tx(s,b.title,x,y,w,titleH,titleSize,true,dark?C.paper:C.ink,{reserve:.93,leading:1.18});tx(s,b.body,x,y+bodyY,w,bodyH,bodySize,false,dark?C.rule:C.ink,{leading:1.3});}
// 01 — official identity, deliberately no deleted introduction paragraph.
{
 const d=content.slides[0],s=make(d,{dark:true,standard:false,brand:false});
 cutPlane(s,1260,193,340,600,C.paper);accent(s,1300,402,72);
 tx(s,d.kicker,96,61,1100,42,23,false,C.rule,{reserve:1});logo(s,96,176,1000,true);accent(s,98,515,192);
 tx(s,d.subtitle,96,555,1390,125,54,true,C.paper,{reserve:.96,leading:1.2});tx(s,d.blocks[0].title,98,713,1300,58,31,false,C.rule,{reserve:.96});
}
// 02 — company identity: readable introduction and three equal pillars.
{
 const d=content.slides[1],s=make(d,{standard:false});header(s,d,false,{subtitle:false});tx(s,d.subtitle,M,222,1424,130,28,false,C.ink,{reserve:.94,leading:1.3});
 const cols=[88,574,1060],cw=452;d.blocks.forEach((b,i)=>{const x=cols[i];accent(s,x,406,54);number(s,i+1,x+cw-58,391,27,C.muted);module(s,b,x,444,cw,{titleSize:32,titleH:90,bodyY:120,bodyH:192,bodySize:28});});
}
// 03 — related collaboration responsibilities, not another project-process diagram.
{
 const d=content.slides[2],s=make(d),xs=[88,574,1060],cw=452;d.blocks.forEach((b,i)=>{const x=xs[i];number(s,i+1,x,325,35);if(i<2)line(s,x+76,350,x+452,350,C.blue,2,true);module(s,b,x,407,cw,{titleSize:32,titleH:84,bodyY:104,bodyH:240,bodySize:28});});
}
// 04 — equal customer profiles with shared comparison baselines.
{
 const d=content.slides[3],s=make(d),xs=[88,834],cw=678;d.blocks.forEach((b,i)=>{const x=xs[i];line(s,x,323,x+cw,323,C.blue,4);tx(s,b.eyebrow,x,348,cw,40,22,false,C.muted,{reserve:1});module(s,b,x,406,cw,{titleSize:35,titleH:100,bodyY:126,bodyH:180,bodySize:28});tx(s,b.label,x,734,cw,46,26,true,C.blue,{reserve:.96});});
}
// 05 — two equal core abilities, three direct channels and a separate partner layer.
{
 const d=content.slides[4],s=make(d),start=282,cw=598,gap=34;tx(s,d.diagram.levels[0].label,M,324,170,50,23,false,C.muted);
 d.blocks.slice(0,2).forEach((b,i)=>{const x=start+i*(cw+gap);rect(s,x,305,cw,190,C.paper,C.ink,1.5);rect(s,x,305,cw,5,C.blue);tx(s,b.title,x+28,329,cw-56,60,33,true,C.ink,{reserve:.96});tx(s,b.body,x+28,401,cw-56,80,26,false,C.ink,{reserve:.93,leading:1.25});});
 line(s,581,495,581,527,C.muted);line(s,1213,495,1213,527,C.muted);line(s,475,527,1319,527,C.muted);tx(s,d.diagram.levels[1].label,M,574,170,50,23,false,C.muted);
 d.diagram.levels[1].nodes.forEach((t,i)=>{const x=start+i*422;line(s,x+193,527,x+193,559,C.muted);rect(s,x,559,386,86,'none',C.muted,1);tx(s,t,x+22,581,342,55,30,true,C.ink,{align:'center',reserve:1});});
 tx(s,d.diagram.levels[2].label,M,706,170,50,23,false,C.muted);line(s,start,685,R,685,C.rule);tx(s,d.blocks[3].scope,start,704,1230,44,28,true,C.ink,{reserve:.98});tx(s,d.blocks[3].body,start,751,1230,43,24,false,C.muted,{reserve:.96});
}
// 06 — strategy questions anchor a three-column working structure.
{
 const d=content.slides[5],s=make(d),xs=[88,574,1060],cw=452;d.blocks.forEach((b,i)=>{const x=xs[i];number(s,i+1,x,322);line(s,x+66,345,x+cw,345,C.rule);module(s,b,x,389,cw,{titleSize:32,titleH:88,bodyY:108,bodyH:177,bodySize:28});line(s,x,700,x+cw,700,C.rule);tx(s,d.diagram.nodes[i],x,728,cw,56,31,true,C.blue,{reserve:.98});});tx(s,d.diagram.label,M,271,900,35,20,false,C.muted,{reserve:1});
}
// 07 — channel orchestration as a ledger with a local relationship per row.
{
 const d=content.slides[6],s=make(d);d.blocks.forEach((b,i)=>{const y=317+i*151;number(s,i+1,M,y,30);tx(s,b.title,180,y-2,425,60,33,true,C.ink,{reserve:.95});tx(s,b.body,652,y,860,99,28,false,C.ink,{reserve:.94,leading:1.3});tx(s,d.diagram.rows[i][0],180,y+67,173,38,22,false,C.muted,{reserve:1});line(s,363,y+86,409,y+86,C.blue,1.8,true);tx(s,d.diagram.rows[i][1],430,y+67,174,38,22,false,C.muted,{reserve:1});if(i<2)line(s,M,y+132,R,y+132,C.rule);});
}
// 08 — parallel execution areas with their output labels anchored below.
{
 const d=content.slides[7],s=make(d),xs=[88,574,1060],cw=452;d.blocks.forEach((b,i)=>{const x=xs[i];number(s,i+1,x,321,28);tx(s,b.title,x,384,cw,70,38,true,C.ink,{reserve:1});tx(s,b.body,x,489,cw,193,28,false,C.ink,{leading:1.3});line(s,x,719,x+cw,719,C.rule);tx(s,b.label,x,743,cw,46,26,true,C.blue,{reserve:.98});});
}
// 09 — resource expansion from one coordinator, distinct from the responsibility tree.
{
 const d=content.slides[8],s=make(d);rect(s,M,350,360,325,C.ink);accent(s,M+30,382,54);tx(s,d.diagram.owner,M+30,430,300,140,35,true,C.paper,{reserve:.98});line(s,448,511,512,511,C.blue,2);line(s,512,359,512,680,C.blue,2);
 d.blocks.forEach((b,i)=>{const y=319+i*150;line(s,512,y+40,558,y+40,C.blue,2,true);tx(s,b.title,588,y,924,55,32,true,C.ink,{reserve:1});tx(s,b.body,588,y+58,924,88,28,false,C.ink,{reserve:.95,leading:1.3});});
}
// 10 — two left-to-right rows; the outside carry connector links 03 to 04.
{
 const d=content.slides[9],s=make(d),xs=[88,574,1060],ys=[307,574];d.blocks.forEach((b,i)=>{const col=i%3,row=Math.floor(i/3),x=xs[col],y=ys[row];number(s,i+1,x,y,32);tx(s,b.title.slice(3),x+76,y-2,300,56,34,true,C.ink,{reserve:.98});tx(s,b.body,x,y+78,452,95,28,false,C.ink,{reserve:.93,leading:1.3});if(b.participation)tx(s,b.participation,x,y+181,452,40,23,true,C.blue,{reserve:.98});if(col<2)line(s,x+403,y+28,x+476,y+28,C.blue,2,true);});line(s,1512,335,1540,335,C.rule,1.6);line(s,1540,335,1540,548,C.rule,1.6);line(s,1540,548,60,548,C.rule,1.6);line(s,60,548,60,603,C.rule,1.6);line(s,60,603,79,603,C.blue,2,true);
}
// 11 — four-item delivery ledger: titles and explanations share one reading row.
{
 const d=content.slides[10],s=make(d);d.blocks.forEach((b,i)=>{const y=314+i*118;number(s,i+1,M,y+2,27);tx(s,b.title,170,y,460,59,32,true,C.ink,{reserve:.96});tx(s,b.body,682,y,830,89,28,false,C.ink,{reserve:.94,leading:1.25});if(i<3)line(s,M,y+100,R,y+100,C.rule);});
}
// 12 — editable four-node AI chain with feedback and a team-responsibility bar.
{
 const d=content.slides[11],s=make(d),xs=[88,454,820,1186],cw=326;tx(s,d.diagram.caption,M,272,1300,40,20,false,C.muted,{reserve:1});d.blocks.forEach((b,i)=>{const x=xs[i];number(s,i+1,x,328,31);if(i<3)line(s,x+68,353,x+cw+12,353,C.blue,2,true);tx(s,b.title,x,405,cw,79,29,true,C.ink,{reserve:.98});tx(s,b.body,x,499,cw,181,26,false,C.ink,{reserve:.91,leading:1.3});});line(s,1349,685,1349,710,C.blue,1.5);line(s,1349,710,251,710,C.blue,1.5);line(s,251,710,251,685,C.blue,1.5,true);rect(s,M,738,1424,54,C.ink);tx(s,d.diagram.center,M+22,746,1380,43,26,true,C.paper,{align:'center',reserve:.98});
}
// 13 — dark market perspective; each keyword aligns to its explanation.
{
 const d=content.slides[12],s=make(d,{dark:true});d.blocks.forEach((b,i)=>{const y=315+i*157;tx(s,d.diagram.nodes[i],M,y+1,405,68,43,true,C.paper,{reserve:.98});accent(s,M,y+94,54);tx(s,b.title,567,y,945,54,32,true,C.paper,{reserve:.98});tx(s,b.body,567,y+62,945,91,28,false,C.rule,{reserve:.94,leading:1.3});});
}
// 14 — centered responsibility tree with a single customer entry.
{
 const d=content.slides[13],s=make(d),cx=800;tx(s,d.diagram.entry,655,303,290,48,30,true,C.ink,{align:'center',reserve:1});line(s,cx,354,cx,385,C.blue,2,true);rect(s,430,393,740,78,C.ink);tx(s,d.diagram.owner,454,409,692,55,33,true,C.paper,{align:'center',reserve:.98});line(s,cx,471,cx,513,C.blue,2);line(s,251,513,1349,513,C.rule,1.5);const xs=[88,454,820,1186];d.blocks.forEach((b,i)=>{const x=xs[i];line(s,x+163,513,x+163,552,C.rule,1.5);tx(s,b.title,x,570,326,57,31,true,C.ink,{reserve:.98});tx(s,b.body,x,641,326,141,27,false,C.ink,{reserve:.92,leading:1.3});});
}
// 15 — equal comparison columns, without a preferred package or invented promises.
{
 const d=content.slides[14],s=make(d),xs=[88,574,1060],cw=452;d.blocks.forEach((b,i)=>{const x=xs[i];accent(s,x,324,cw);tx(s,b.title,x,360,cw,115,35,true,C.ink,{reserve:.95,leading:1.2});tx(s,b.label,x,505,cw,66,25,false,C.muted,{reserve:.95});tx(s,b.body,x,589,cw,208,27,false,C.ink,{reserve:.92,leading:1.3});});
}
// 16 — aligned channel relationships and equally weighted practice columns.
{
 const d=content.slides[15],s=make(d),xs=[88,574,1060],cw=452;tx(s,d.blocks[0].body,M,282,1424,84,27,false,C.muted,{reserve:.95,leading:1.25});d.diagram.nodes.forEach((t,i)=>{const x=xs[i];rect(s,x,397,cw,87,'none',C.ink,1.5);accent(s,x,397,cw);tx(s,t,x+20,420,cw-40,50,i===2?27:30,true,C.ink,{align:'center',reserve:.98});if(i<2)line(s,x+cw,441,x+cw+29,441,C.blue,2,true);});d.blocks.slice(1).forEach((b,i)=>module(s,b,xs[i],537,cw,{titleSize:32,titleH:59,bodyY:78,bodyH:177,bodySize:27}));
}
// 17 — contact area opposite the three initial discussion inputs.
{
 const d=content.slides[16],s=make(d,{dark:true,standard:false,brand:false});logo(s,M,57,220,true);tx(s,d.title.replace('北美','北美\n'),M,190,815,167,58,true,C.paper,{reserve:.88,leading:1.2});tx(s,d.subtitle,M,382,800,145,29,false,C.rule,{reserve:.93,leading:1.3});tx(s,d.contact.email,M,570,850,70,43,true,C.paper,{reserve:1});accent(s,M,656,620);d.blocks.forEach((b,i)=>{const y=202+i*184;number(s,i+1,1042,y,28,C.rule);tx(s,b.title,1120,y,392,67,29,true,C.paper,{reserve:.97});tx(s,b.body,1120,y+78,392,93,27,false,C.rule,{reserve:.96,leading:1.3});});
}
if(presentation.slides.items.length!==17)throw new Error('Expected exactly 17 slides');
await fs.writeFile(path.join(buildDir,'presentation.json'),JSON.stringify(presentation.toProto()));await fs.writeFile(path.join(buildDir,'authored-objects.json'),JSON.stringify(objects,null,2));
if(canvaFragments)await fs.writeFile(path.join(buildDir,'text-fragments.json'),JSON.stringify(fragments,null,2));
const sampleIndexes=canvaFragments?[0,1,4,11,16]:[0,1,4];
const renderIndexes=samples?sampleIndexes:presentation.slides.items.map((_,i)=>i);
for(const i of renderIndexes){const slide=presentation.slides.items[i],stem=`slide-${String(i+1).padStart(2,'0')}`;const png=await presentation.export({slide,format:'png',scale:1});await fs.writeFile(path.join(buildDir,`${stem}.png`),new Uint8Array(await png.arrayBuffer()));const layout=await slide.export({format:'layout'});await fs.writeFile(path.join(buildDir,`${stem}.layout.json`),await layout.text());console.log(`Rendered ${stem}`);}
if(samples){const sample=Presentation.load(presentation.toProto());sample.slides.keep(sampleIndexes);const sampleStem=canvaFragments?'samples-01-02-05-12-17':'samples-01-02-05';const rawSample=path.join(buildDir,`${sampleStem}.raw.pptx`),samplePath=path.join(buildDir,`${sampleStem}.pptx`);await(await PresentationFile.exportPptx(sample)).save(rawSample);embedFonts(rawSample,samplePath,path.join(buildDir,'samples.fonts.json'));console.log(`Samples ready: ${buildDir}`);process.exit(0);}
const montage=await presentation.export({format:'webp',montage:true,scale:.35});await fs.writeFile(path.join(buildDir,'contact-sheet.webp'),new Uint8Array(await montage.arrayBuffer()));
const rawCandidatePath=path.join(buildDir,'candidate.raw.pptx'),candidatePath=path.join(buildDir,'candidate.pptx');await(await PresentationFile.exportPptx(presentation)).save(rawCandidatePath);embedFonts(rawCandidatePath,candidatePath,path.join(buildDir,'embedded-fonts.json'));
const pdfPath=path.join(outputDir,`Outrise-Company-Introduction-zh-CN-${rev}.pdf`);
try{const pdf=await presentation.export({format:'pdf'});await fs.writeFile(pdfPath,new Uint8Array(await pdf.arrayBuffer()));}
catch(error){console.warn(`Native PDF unavailable; writing rendered preview: ${error.message}`);const script=`from reportlab.pdfgen import canvas\nfrom pathlib import Path\nimport sys\nb=Path(sys.argv[1]);c=canvas.Canvas(sys.argv[2],pagesize=(1200,675))\nc.setTitle('Outrise 公司介绍');c.setAuthor('Outrise')\nfor f in sorted(b.glob('slide-*.png')):\n c.drawImage(str(f),0,0,width=1200,height=675);c.showPage()\nc.save()\n`;const r=spawnSync(PYTHON,['-c',script,buildDir,pdfPath],{encoding:'utf8'});if(r.status!==0)throw new Error(r.stderr);}
const finalPath=path.join(outputDir,`Outrise-Company-Introduction-zh-CN-${rev}.pptx`);
if(process.argv.includes('--draft-only')){console.log(JSON.stringify({candidatePath,pdfPath,buildDir,draftOnly:true}));process.exit(0);}
const result=await finalizePresentation({workspaceDir,candidatePath,finalPath,pythonExecutable:PYTHON,integrityValidatorPath:path.join(SKILL_DIR,'container_tools/inspect_presentation_package_integrity.py'),layoutValidatorPath:path.join(SKILL_DIR,'container_tools/inspect_presentation_layout_geometry.py'),explicitTotalSlideCount:17,expectedSlideSizeEmu:'15240000,8572500',layoutArgs:['--expected-slide-size-emu','15240000,8572500','--validate-bullet-geometry','--validate-heading-fit'],requiredNativeTableOwnerSlides:[],requiredNativeChartOwnerSlides:[],fontPolicy:{basis:'user_request',families:[FONT,`${FONT} Medium`,`${FONT} SemiBold`,LATIN,`${LATIN} Medium`,`${LATIN} SemiBold`]},verifyArtifactToolImport:true,receiptPath:path.join(buildDir,'validation.json')});console.log(JSON.stringify({finalPath,pdfPath,buildDir,finalized:!!result}));
