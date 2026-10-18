/**
 * Editable Outrise company introduction. All evidence diagrams are native
 * PowerPoint shapes, text and connectors. No raster slide backgrounds.
 *
 * Run with the bundled Node runtime. Optional overrides:
 * CODEX_PRESENTATION_NODE_MODULES, CODEX_PRESENTATION_SKILL_DIR,
 * CODEX_PRESENTATION_PYTHON. Build products remain inside this directory.
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';
import { spawnSync } from 'node:child_process';
process.on('uncaughtException',error=>{console.error(error.stack||error.message);process.exit(1);});

const workspaceDir = path.dirname(fileURLToPath(import.meta.url));
const runtimeRoot = 'C:/Users/zx/.cache/codex-runtimes/codex-primary-runtime/dependencies';
const nodeModules = process.env.CODEX_PRESENTATION_NODE_MODULES || `${runtimeRoot}/node/node_modules`;
const SKILL_DIR = process.env.CODEX_PRESENTATION_SKILL_DIR || 'C:/Users/zx/.codex/plugins/cache/openai-primary-runtime/presentations/26.1017.11052/skills/presentations';
const PYTHON = process.env.CODEX_PRESENTATION_PYTHON || `${runtimeRoot}/python/python.exe`;
const { Presentation, PresentationFile } = await import(pathToFileURL(path.join(nodeModules, '@oai/artifact-tool/dist/artifact_tool.mjs')).href);
const { finalizePresentation } = await import(pathToFileURL(path.join(SKILL_DIR, 'container_tools/artifact_tool_utils.mjs')).href);
process.env.RUNTIME_NODE_MODULES = nodeModules;
const require = createRequire(import.meta.url);
const { Canvas } = require(path.join(nodeModules,'@oai/artifact-tool/node_modules/skia-canvas'));
const measure = new Canvas(1,1).getContext('2d');
const content = JSON.parse(await fs.readFile(path.join(workspaceDir, 'content.zh-CN.json'), 'utf8'));
const rev = process.argv.find(a => a.startsWith('--revision='))?.split('=')[1] || 'v1';
const buildDir = path.join(workspaceDir, 'build', rev);
const outputDir = path.join(workspaceDir, 'output');
await fs.mkdir(buildDir, { recursive: true });
await fs.mkdir(outputDir, { recursive: true });

const W = 1600, H = 900;
const C = { paper: '#EEEDE5', ink: '#191A18', muted: '#666760', rule: '#B9BAB1', pale: '#D8D9CE', darkMute: '#B7B9AD', cream: '#F5F3E8' };
const FONT = 'Microsoft YaHei';
const presentation = Presentation.create({ slideSize: { width: W, height: H } });
let serial = 0;
const objects = [];

// Explicit Chinese line breaking keeps punctuation with the preceding text
// and protects Latin product names when the slide engine lays out mixed scripts.
function wrapCopy(text,width,size,bold) {
  measure.font=`${bold?'bold':'normal'} ${size}px "${FONT}"`;
  const lines=[];
  for(const paragraph of text.split('\n')) {
    const tokens=paragraph.match(/[A-Za-z0-9@._+\-/]+|\s+|./gu)||[''];
    let current='';
    for(const token of tokens) {
      // Canva substitutes Latin fonts plus a Chinese fallback and may restore
      // wrapping with added letter spacing. Keep 14% reserve in authored lines.
      if(current && measure.measureText(current+token).width>width*0.86-5) {
        if(/^[，。！？、；：）】》,.!?;:]/u.test(token)) {
          const chars=[...current];
          let last=chars.pop()||'';
          while(chars.length && /[A-Za-z0-9]/.test(last[0]) && /[A-Za-z0-9]/.test(chars.at(-1))) last=chars.pop()+last;
          lines.push(chars.join('').trimEnd());current=last+token;
        } else {lines.push(current.trimEnd());current=token.trimStart();}
      } else current+=token;
    }
    lines.push(current.trimEnd());
  }
  return lines.join('\n');
}

function rect(slide, x, y, w, h, fill='none', stroke='none', sw=0, name='rect') {
  return slide.shapes.add({ geometry:'rect', name:`${name}-${++serial}`, position:{left:x,top:y,width:w,height:h}, fill, line:{fill:stroke,width:sw,style:'solid'} });
}
function tx(slide, text, x, y, w, h, size=28, bold=false, color=C.ink, align='left', name='copy') {
  const s=slide.shapes.add({geometry:'textbox',name:`${name}-${++serial}`,position:{left:x,top:y,width:w,height:h},fill:'none',line:{fill:'none',width:0}});
  s.text=wrapCopy(text,w,size,bold);
  s.text.style={typeface:FONT,fontSize:size,bold,color,alignment:align,verticalAlignment:'top',wrap:'none',autoFit:'none',insets:0};
  objects.push({slide: presentation.slides.items.length, name:s.name, text, x,y,w,h,size});
  return s;
}
function line(slide, x1,y1,x2,y2,color=C.rule,width=1.2,arrow=false) {
  const reversed=x2<x1||y2<y1;
  return slide.shapes.add({geometry:'connector',kind:'straight',name:`line-${++serial}`,position:{left:Math.min(x1,x2),top:Math.min(y1,y2),width:Math.abs(x2-x1),height:Math.abs(y2-y1)},line:{fill:color,width,style:'solid'},...(arrow?{[reversed?'head':'tail']:{type:'triangle',width:'sm',length:'sm'}}:{})});
}
function connect(slide,a,b,from='right',to='left',color=C.ink,arrow=true) {
  return slide.shapes.connect(a,b,{kind:'straight',fromSide:from,toSide:to,line:{fill:color,width:1.5,style:'solid'},...(arrow?{tail:{type:'triangle',width:'sm',length:'sm'}}:{})});
}
function label(slide,text,x,y,w=400,color=C.muted,size=20) {return tx(slide,text,x,y,w,36,size,false,color);}
function header(slide,d,dark=false, titleOverride) {
  const ink=dark?C.paper:C.ink,muted=dark?C.darkMute:C.muted;
  label(slide,d.section,88,48,1100,muted,20);
  tx(slide,titleOverride||d.title,88,103,1424,92,58,true,ink,'left','title');
  tx(slide,d.subtitle,90,203,1400,86,28,false,muted);
}
function footer(slide,d,dark=false) {
  const ink=dark?C.darkMute:C.muted;
  line(slide,88,819,1512,819,dark?'#4D4F47':C.rule,1);
  tx(slide,d.footerNote,90,840,1260,35,18,false,ink);
  tx(slide,String(d.number).padStart(2,'0'),1434,837,78,37,20,false,ink,'right');
}
function block(slide,b,x,y,w,{heading=34,body=28,color=C.ink,muted=C.muted,headH=60,bodyY=70,bodyH=190}={}) {
  tx(slide,b.title,x,y,w,headH,heading,true,color);
  tx(slide,b.body,x,y+bodyY,w,bodyH,body,false,muted);
}
function make(d,{dark=false,standard=true}={}) {
  const slide=presentation.slides.add(); slide.background.fill=dark?C.ink:C.paper;
  if(standard) header(slide,d,dark);
  footer(slide,d,dark);
  return slide;
}
function notes(slide,d) {
  // Client deliverables contain no internal source or production notes.
  // Provenance stays in the separately maintained content source files.
  slide.speakerNotes.clear();
}

// 01: minimal cover, typographic statement and two actual customer groups.
{
  const d=content.slides[0],s=make(d,{dark:true,standard:false});
  label(s,'NORTH AMERICA FOCUSED',92,58,1000,C.darkMute,22);
  tx(s,'Outrise',82,166,1380,205,156,true,C.paper);
  tx(s,'专注北美市场\n外部营销负责人（CMO）与营销团队',92,374,1370,137,48,true,C.paper);
  line(s,92,523,1508,523,'#4D4F47',1.5);
  tx(s,'AI-native 营销与增长团队',92,564,620,55,30,true,C.paper);
  tx(s,d.blocks[0].body,850,560,658,162,30,false,C.darkMute);
  label(s,'消费品牌出海',92,686,300,C.paper,26);
  label(s,'科技创业公司 GTM',438,686,420,C.paper,26);
  notes(s,d);
}
// 02: clear role on the left; sequential responsibilities on the right.
{
  const d=content.slides[1],s=make(d);
  tx(s,'外部 CMO\n与营销团队',90,332,530,176,64,true);
  tx(s,'持续参与你的营销工作',94,565,475,55,30,false,C.muted);
  line(s,642,322,642,747,C.rule);
  d.blocks.forEach((b,i)=>{
    const y=315+i*148;
    tx(s,String(i+1).padStart(2,'0'),700,y,90,57,38,false,C.muted);
    tx(s,b.title,822,y,680,50,34,true);
    tx(s,b.body,822,y+61,680,69,27,false,C.muted);
    if(i<2)line(s,700,y+131,1512,y+131,C.rule);
  });
  notes(s,d);
}
// 03: equal customer columns, preserving sales and brand objectives.
{
  const d=content.slides[2],s=make(d);
  line(s,800,321,800,755,C.rule);
  d.blocks.forEach((b,i)=>{
    const x=i?872:90;
    label(s,i?'02 / TECH STARTUPS':'01 / CONSUMER BRANDS',x,324,620,C.muted,22);
    tx(s,b.title,x,387,640,65,40,true);
    tx(s,b.body,x,493,638,168,30,false,C.muted);
    line(s,x,702,x+620,702,C.ink,2);
    tx(s,b.label,x,728,620,50,28,true);
  }); notes(s,d);
}
// 04: native editable hierarchy; equal core modules, three direct channels.
{
  const d=content.slides[3],s=make(d);
  label(s,'核心能力',90,296,190,C.muted,22);
  const a=rect(s,288,292,594,166,C.ink),b=rect(s,918,292,594,166,C.ink);
  const coreCopy=['理解市场与用户，明确品牌定位。\n规划价值表达、GTM 与营销优先级。','规划渠道组合、运营路径和资源投入。\n建立复盘机制，推进关键增长工作。'];
  d.blocks.slice(0,2).forEach((v,i)=>{
    const x=i?946:316;tx(s,v.title,x,316,536,52,34,true,C.paper);tx(s,coreCopy[i],x,384,536,66,25,false,C.paper);
  });
  line(s,585,458,585,490,C.ink);line(s,1215,458,1215,490,C.ink);line(s,480,490,1320,490,C.ink);
  label(s,'直接执行',90,536,190,C.muted,22);
  ['内容营销','达人营销','广告与投放'].forEach((t,i)=>{const x=288+i*420;rect(s,x,528,384,91,'none',C.ink,1.5);tx(s,t,x+20,552,344,52,32,true,C.ink,'center');line(s,x+192,490,x+192,528,C.ink);});
  label(s,'专业伙伴',90,690,190,C.muted,22);
  rect(s,288,666,1224,104,C.pale);
  tx(s,'本地渠道拓展 / 落地执行 / 公共关系（PR）等',316,680,1168,47,30,true);
  tx(s,'按需触达、筛选和协调专业资源，由 Outrise 统一推进。',316,726,1168,39,25,false,C.muted);
  notes(s,d);
}
// 05: editorial three-stage strategy path.
{
  const d=content.slides[4],s=make(d),xs=[90,590,1090],bw=420;
  line(s,115,356,1500,356,C.rule,1.5);
  d.blocks.forEach((b,i)=>{
    const x=xs[i];rect(s,x,331,64,50,C.paper);tx(s,String(i+1).padStart(2,'0'),x,322,120,72,52,false);
    tx(s,b.title,x,424,bw,58,34,true);
    tx(s,b.body,x,508,bw,168,29,false,C.muted);
  });
  line(s,90,718,1512,718,C.rule);
  label(s,'帮助客户回答',90,745,200,C.muted,22);
  tx(s,'面向谁',350,739,230,50,30,true);tx(s,'表达什么价值',760,739,320,50,30,true);tx(s,'优先做什么',1220,739,292,50,30,true);
  notes(s,d);
}
// 06: comparable core capability weight; channel management as three rows.
{
  const d=content.slides[5],s=make(d);
  const mini=[['渠道角色','渠道组合'],['资源安排','执行分工'],['市场反馈','计划调整']];
  d.blocks.forEach((b,i)=>{
    const y=312+i*151;
    tx(s,String(i+1).padStart(2,'0'),90,y,90,61,44,false,C.muted);
    tx(s,b.title,207,y+1,390,55,35,true);
    tx(s,b.body,625,y,887,91,29,false,C.muted);
    tx(s,mini[i][0],207,y+64,172,38,24,false,C.muted);line(s,390,y+83,444,y+83,C.muted,1.2,true);tx(s,mini[i][1],463,y+64,160,38,24,false,C.muted);
    if(i<2)line(s,90,y+127,1512,y+127,C.rule);
  });notes(s,d);
}
// 07: three execution channels with their native labels and descriptions.
{
  const d=content.slides[6],s=make(d),xs=[90,590,1090];
  d.blocks.forEach((b,i)=>{
    const x=xs[i];if(i)line(s,x-42,320,x-42,760,C.rule);
    tx(s,String(i+1).padStart(2,'0'),x,315,140,85,64,false,C.muted);
    tx(s,b.title,x,430,418,61,40,true);
    tx(s,b.body,x,526,418,183,29,false,C.muted);
    line(s,x,727,x+414,727,C.ink,2);
    tx(s,b.label,x,750,418,40,24,true);
  });notes(s,d);
}
// 08: Outrise remains the entry point for partner capabilities.
{
  const d=content.slides[7],s=make(d);
  rect(s,565,302,470,96,C.ink);
  tx(s,'Outrise 统一组织',590,324,420,53,36,true,C.paper,'center');
  line(s,800,398,800,444,C.ink);line(s,300,444,1300,444,C.ink);
  d.blocks.forEach((b,i)=>{const x=90+i*500;line(s,x+210,444,x+210,480,C.ink);block(s,b,x,499,420,{heading:34,body:29,bodyY:82,bodyH:176});});
  notes(s,d);
}
// 09: six steps in a native, connected serpentine flow.
{
  const d=content.slides[8],s=make(d),coords=[[90,316],[590,316],[1090,316],[1090,568],[590,568],[90,568]],anchors=[];
  d.blocks.forEach((b,i)=>{
    const [x,y]=coords[i];anchors.push(rect(s,x,y,420,58));
    tx(s,b.title.slice(0,2),x,y,92,59,43,false,C.muted);tx(s,b.title.slice(3),x+109,y+4,312,55,34,true);
    tx(s,b.body,x,y+80,420,82,28,false,C.muted);
    if(b.participation)tx(s,b.participation,x,y+169,420,45,22,true);
  });
  connect(s,anchors[0],anchors[1]);connect(s,anchors[1],anchors[2]);
  line(s,1510,345,1540,345,C.ink,1.5);line(s,1540,345,1540,597,C.ink,1.5);line(s,1540,597,1510,597,C.ink,1.5,true);
  connect(s,anchors[3],anchors[4],'left','right');connect(s,anchors[4],anchors[5],'left','right');
  notes(s,d);
}
// 10: a simple deliverables ledger rather than decorative cards.
{
  const d=content.slides[9],s=make(d);
  d.blocks.forEach((b,i)=>{
    const y=312+i*117;
    tx(s,String(i+1).padStart(2,'0'),90,y,95,61,38,false,C.muted);
    tx(s,b.title,210,y+3,470,57,33,true);
    tx(s,b.body,740,y,772,84,28,false,C.muted);
    if(i<3)line(s,90,y+98,1512,y+98,C.rule);
  });notes(s,d);
}
// 11: internal AI workflow, with judgment and delivery accountability visible.
{
  const d=content.slides[10],s=make(d),xs=[90,465,840,1215],bw=298;
  label(s,'AI 支持营销工作的环节示意',90,273,1300,C.muted,20);
  d.blocks.forEach((b,i)=>{
    const x=xs[i];tx(s,String(i+1).padStart(2,'0'),x,318,88,59,40,false,C.muted);
    if(i<3)line(s,x+105,345,x+340,345,C.ink,1.5,true);
    tx(s,b.title,x,410,bw,97,31,true);
    tx(s,b.body,x,498,bw,173,27,false,C.muted);
  });
  line(s,1364,675,1364,702,C.muted,1.1);line(s,1364,702,239,702,C.muted,1.1);line(s,239,702,239,675,C.muted,1.1,true);
  rect(s,90,723,1422,67,C.ink);
  tx(s,'团队负责商业判断、方向与质量',114,738,1374,50,29,true,C.paper,'center');
  notes(s,d);
}
// 12: dark market perspective with a large subject and practical implications.
{
  const d=content.slides[11],s=make(d,{dark:true});
  tx(s,'技术理解\n市场判断\n快速适应',90,332,550,335,69,true,C.paper);
  line(s,657,329,657,752,'#4D4F47');
  d.blocks.forEach((b,i)=>{const y=324+i*150;tx(s,b.title,720,y,792,56,34,true,C.paper);tx(s,b.body,720,y+62,792,86,28,false,C.darkMute);});
  notes(s,d);
}
// 13: anonymous case as editable relationships plus three practice areas.
{
  const d=content.slides[12],s=make(d);
  tx(s,d.blocks[0].body,90,292,1422,68,28,false,C.muted);
  const a=rect(s,90,396,360,90,'none',C.ink,1.5),b=rect(s,557,396,420,90,C.ink),c=rect(s,1084,396,428,90,'none',C.ink,1.5);
  tx(s,'品牌与产品表达',109,418,322,50,32,true,C.ink,'center');tx(s,'内容与达人合作',578,418,378,50,32,true,C.paper,'center');tx(s,'Amazon / TikTok / 官网',1103,423,390,48,27,true,C.ink,'center');connect(s,a,b);connect(s,b,c);
  d.blocks.slice(1).forEach((b,i)=>{const x=90+i*500;block(s,b,x,530,420,{heading:33,body:28,bodyY:67,bodyH:184});});notes(s,d);
}
// 14: one responsible company with clear native role connections.
{
  const d=content.slides[13],s=make(d);
  const client=rect(s,90,315,275,99,'none',C.ink,1.5),owner=rect(s,565,315,745,99,C.ink);
  tx(s,'客户',112,339,231,56,36,true,C.ink,'center');tx(s,'Outrise 统一负责与背书',590,339,695,56,36,true,C.paper,'center');connect(s,client,owner);
  line(s,937,414,937,478,C.ink);line(s,260,478,1355,478,C.ink);
  d.blocks.forEach((b,i)=>{
    const x=90+i*365;line(s,x+170,478,x+170,526,C.ink);
    tx(s,b.title,x,548,327,55,34,true);tx(s,b.body,x,620,327,152,28,false,C.muted);
  });notes(s,d);
}
// 15: three scopes with visible distinctions, no fabricated prices or cadence.
{
  const d=content.slides[14],s=make(d);
  d.blocks.forEach((b,i)=>{
    const x=90+i*500;line(s,x,321,x+420,321,C.ink,2);
    const heading=i===2?'持续外部 CMO\n与营销团队支持':b.title;
    tx(s,heading,x,354,420,121,37,true);
    tx(s,b.label,x,498,420,64,25,false,C.muted);
    tx(s,b.body,x,595,420,179,29,false,C.ink);
  });notes(s,d);
}
// 16: direct contact and the three inputs needed for an initial discussion.
{
  const d=content.slides[15],s=make(d,{dark:true,standard:false});
  label(s,'OUTRISE',92,61,820,C.darkMute,22);
  tx(s,'从你的北美\n市场目标开始',90,175,880,212,82,true,C.paper);
  tx(s,d.subtitle,94,460,757,135,31,false,C.darkMute);
  tx(s,d.contact.email,94,688,900,72,47,true,C.paper);
  d.blocks.forEach((b,i)=>{
    const y=199+i*175;
    tx(s,String(i+1).padStart(2,'0'),1044,y,70,50,30,false,C.darkMute);
    tx(s,b.title,1140,y,372,53,29,true,C.paper);
    tx(s,b.body,1140,y+69,372,86,27,false,C.darkMute);
  });notes(s,d);
}

if(presentation.slides.items.length!==16)throw new Error('Expected exactly 16 slides');
await fs.writeFile(path.join(buildDir,'presentation.json'),JSON.stringify(presentation.toProto()));
await fs.writeFile(path.join(buildDir,'authored-objects.json'),JSON.stringify(objects,null,2));
const candidatePath=path.join(buildDir,'candidate.pptx');
await (await PresentationFile.exportPptx(presentation)).save(candidatePath);
console.log(`Exported editable candidate: ${candidatePath}`);
for(const [i,slide] of presentation.slides.items.entries()) {
  const stem=`slide-${String(i+1).padStart(2,'0')}`;
  const png=await presentation.export({slide,format:'png',scale:1});
  await fs.writeFile(path.join(buildDir,`${stem}.png`),new Uint8Array(await png.arrayBuffer()));
  const layout=await slide.export({format:'layout'});
  await fs.writeFile(path.join(buildDir,`${stem}.layout.json`),await layout.text());
  console.log(`Rendered ${stem}`);
}
const montage=await presentation.export({format:'webp',montage:true,scale:0.3});
await fs.writeFile(path.join(buildDir,'contact-sheet.webp'),new Uint8Array(await montage.arrayBuffer()));
const pdfPath=path.join(outputDir,`Outrise-Company-Introduction-zh-CN-${rev}.pdf`);
try {
  const pdf=await presentation.export({format:'pdf'});
  await fs.writeFile(pdfPath,new Uint8Array(await pdf.arrayBuffer()));
  console.log(`Exported PDF: ${pdfPath}`);
} catch(error) {
  console.warn(`Native PDF export unavailable; assembling exact slide renders: ${error.message}`);
  const pdfScript=`from reportlab.pdfgen import canvas\nfrom pathlib import Path\nimport sys\nbuild=Path(sys.argv[1]); out=sys.argv[2]\nc=canvas.Canvas(out,pagesize=(1200,675))\nc.setTitle('Outrise 公司介绍')\nc.setAuthor('Outrise')\nfor image in sorted(build.glob('slide-*.png')):\n c.drawImage(str(image),0,0,width=1200,height=675)\n c.showPage()\nc.save()\n`;
  const pdfResult=spawnSync(PYTHON,['-c',pdfScript,buildDir,pdfPath],{encoding:'utf8'});
  if(pdfResult.status!==0)throw new Error(`PDF preview assembly failed: ${pdfResult.stderr}`);
  console.log(`Exported rendered PDF preview: ${pdfPath}`);
}

const finalPath=path.join(outputDir,`Outrise-Company-Introduction-zh-CN-${rev}.pptx`);
const result=await finalizePresentation({
  workspaceDir,candidatePath,finalPath,pythonExecutable:PYTHON,
  integrityValidatorPath:path.join(SKILL_DIR,'container_tools/inspect_presentation_package_integrity.py'),
  layoutValidatorPath:path.join(SKILL_DIR,'container_tools/inspect_presentation_layout_geometry.py'),
  explicitTotalSlideCount:16,
  expectedSlideSizeEmu:'15240000,8572500',
  layoutArgs:['--expected-slide-size-emu','15240000,8572500','--validate-bullet-geometry','--validate-heading-fit'],
  requiredNativeTableOwnerSlides:[],requiredNativeChartOwnerSlides:[],
  fontPolicy:{basis:'design',families:[FONT]},verifyArtifactToolImport:true,
  receiptPath:path.join(buildDir,'validation.json'),
});
console.log(JSON.stringify({finalPath,pdfPath,buildDir,finalized:!!result}));
