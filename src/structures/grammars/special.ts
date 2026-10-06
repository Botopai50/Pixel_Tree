import {Architect} from '../blueprint';
import type {GrammarContext, V3} from '../types';

export {camp} from './camp';
export function village(c:GrammarContext) {
 const a=new Architect(c),p=c.config,w=a.value(p.width),d=a.value(p.depth),n=3+Math.round(p.complexity*4);
 for(let i=0;i<n;i++) {
  const side=i%2?-1:1,row=Math.floor(i/2),rows=Math.ceil(n/2);
  const x=side*w*.29,z=-d*.3+row*d*.62/Math.max(1,rows-1);
  const home=a.building(x,z,a.value(w*.23),a.value(d*.15),a.value(p.height),p.floors,{role:'village-home'});
  const door=a.plan.openings.find(o=>o.wall===home.id+'_wall_0'&&o.kind==='door')!;a.plan.accesses.push({id:'village-path_'+i,from:[home.x+door.offset,0,home.z-home.depth/2],to:[0,0,home.z-home.depth/2],width:1.5,role:'path'});
  if(a.rnd()>.5)a.chimney(home);
 }
 const well=a.piece('column',[0,.5,0],[1.4,1,1.4],'stone','well');
 for(const side of [-1,1])a.beam([side*.65,1,0],[side*.65,2.7,0],.12,'wood','well-post',well);
 a.beam([-.65,2.7,0],[.65,2.7,0],.17,'wood','well-crossbar',well);
 a.plan.propZones.push({id:'village-garden',x:0,z:d*.4,width:3,depth:3,y:0,kind:'garden'});
 return a.finish();
}
export function outpost(c:GrammarContext) {
 const a=new Architect(c),p=c.config,w=a.value(p.width),d=a.value(p.depth);
 a.building(0,d*.14,w*.42,d*.35,p.height*.65,1,{material:'wood',role:'guardhouse'});
 const corners:V3[]=[[-w/2,0,-d/2],[w/2,0,-d/2],[w/2,0,d/2],[-w/2,0,d/2]];
 for(let s=0;s<4;s++) {
  const start=corners[s],end=corners[(s+1)%4],n=Math.ceil(Math.hypot(end[0]-start[0],end[2]-start[2])/.65);
  for(let i=0;i<=n;i++){const x=start[0]+(end[0]-start[0])*i/n,z=start[2]+(end[2]-start[2])*i/n;if(s===0&&Math.abs(x)<1.5)continue;const h=a.value(p.height*.5,.06);a.piece('column',[x,h/2,z],[.55,h,.55],'wood','palisade');}
 }
 a.piece('arch',[0,2.4,-d/2],[3,1,.4],'wood','outpost-entry');
 return a.finish();
}
export function treehouse(c:GrammarContext) {
 const a=new Architect(c),p=c.config,w=a.value(p.width),d=a.value(p.depth),y=a.value(p.height*.65);
 const tree=a.piece('tree',[0,0,d*.05],[w*.8,y+8,d*.8],'wood','living-tree');
 const deck=a.piece('box',[0,y,0],[w,.3,d],'wood','tree-platform',tree);
 // The cabin stands to one side of the trunk rather than swallowing it.
 const home=a.building(w*.32,-d*.12,w*.4,d*.56,2.5,1,{base:y+.15,material:'wood',roof:p.roof==='auto'?'thatch':p.roof,role:'tree-cabin'});
 for(const item of a.plan.pieces.filter(x=>x.role==='foundation'&&x.position[1]>1)) {
  item.size[1]=.16;item.position[1]=y+.07;item.support=deck;
  a.plan.supports.find(x=>x.component===item.id)!.on=deck;
 }
 for(const side of [-1,1])a.beam([0,y*.4,0],[side*w*.42,y-.15,0],.28,'wood','tree-strut',tree);
 a.stairs([-w/2-2,0,-d/2],[ -w/2,y,-d/2],1.3);
 for(const z of [-d/2,d/2])a.beam([-w/2,y+1,z],[w/2,y+1,z],.12,'wood','tree-rail',deck);
 return a.finish();
}
export function desert(c:GrammarContext) {
 const a=new Architect(c),p=c.config,w=a.value(p.width),d=a.value(p.depth),h=a.value(p.height);
 const lower=a.building(0,0,w,d,h*.6,1,{material:'plaster',roof:p.roof==='auto'?'flat':p.roof,role:'terrace'});
 const upper=a.building(w*.15,d*.1,w*.53,d*.55,h*.55,1,{base:lower.bottom+lower.height+.16,material:'plaster',roof:p.roof==='auto'?'flat':p.roof,role:'upper-terrace'});
 const foundation=a.plan.pieces.find(x=>x.role==='foundation'&&x.position[0]===upper.x&&x.position[2]===upper.z)!;
 foundation.size[1]=.16;foundation.position[1]=upper.bottom-.08;
 const lowerRoof=a.plan.roofs.find(x=>x.volume===lower.id)!;
 foundation.support=lowerRoof.id;a.plan.supports.find(x=>x.component===foundation.id)!.on=lowerRoof.id;
 for(const v of [lower,upper])for(const side of [-1,1])a.piece('box',[v.x+side*(v.width/2-.12),v.bottom+v.height+.42,v.z],[.24,.6,v.depth],'plaster','parapet',v.id+'_roof');
 const stairX=-w/2-p.eaves-.8,stairZ=-d/2+Math.min(4,d*.65),level=lowerRoof.y+.12;const pier=a.piece('column',[stairX,level/2,stairZ],[.4,level,.4],'stone','terrace-pier');a.piece('box',[stairX,level-.1,stairZ],[1.6,.2,1.6],'stone','outside-landing',pier);a.stairs([stairX,0,stairZ-Math.max(3,level*1.3)],[stairX,level,stairZ],1.6);
 a.piece('cloth',[-w*.15,2.7,-d/2-1],[w*.43,.12,2.2],'cloth','shade-awning');
 for(const side of [-1,1])a.beam([-w*.15+side*w*.21,0,-d/2-2],[-w*.15+side*w*.21,2.7,-d/2-2],.15,'wood','awning-post');
 return a.finish();
}
export function swamp(c:GrammarContext) {
 const a=new Architect(c),p=c.config,w=a.value(p.width),d=a.value(p.depth),base=a.value(2.2);
 const v=a.building(0,0,w*.78,d*.75,a.value(p.height),1,{base,material:'wood',roof:p.roof==='auto'?'thatch':p.roof,role:'stilt-house'});
 const f=a.plan.pieces.find(x=>x.role==='foundation')!;f.size[1]=.22;f.position[1]=base-.11;f.material='wood';
 for(const side of [-1,1])for(const end of [-1,1])a.piece('column',[side*v.width*.43,base/2,end*v.depth*.43],[.35,base,.35],'wood','stilt');
 a.depend(f.id,a.plan.pieces.filter(p=>p.role==='stilt').map(p=>p.id),2);const boardwalk=a.piece('box',[0,base-.05,-d*.48],[w,.2,1.9],'wood','boardwalk',f.id);
 a.plan.propZones.push({id:'swamp-water',x:0,z:0,width:w+3,depth:d+3,y:-.05,kind:'water'});
 return a.finish();
}
export function snowy(c:GrammarContext) {
 const a=new Architect(c),p=c.config,w=a.value(p.width),d=a.value(p.depth),h=a.value(p.height);
 const v=a.building(0,0,w,d,h,p.floors,{base:.7,material:'wood',roof:p.roof==='auto'?'gable':p.roof,role:'alpine-home'});
 const roof=a.plan.roofs[0];
 if(roof.kind==='gable'||roof.kind==='thatch'){roof.rise=w*(.4+p.roofPitch*.35);for(const wall of a.plan.walls)if(wall.gable)wall.gable.peak=roof.rise;for(const z of [-d/2-.03,d/2+.03])for(const side of [-1,1])a.beam([side*(w/2-.11),roof.y,z],[ -w/2+w*(roof.ridgeRatio??.5),roof.y+roof.rise,z],.22,'wood','snow-brace',roof.id);}
 else for(const z of [-d/2-.03,d/2+.03])a.beam([-w/2,roof.y+(roof.kind==='shed'&&roof.shedDirection===-1?roof.rise:0),z],[w/2,roof.y+(roof.kind==='shed'&&roof.shedDirection!==-1?roof.rise:0),z],.22,'wood','snow-brace',roof.id);
 a.chimney(v);return a.finish();
}
export function mine(c:GrammarContext) {
 const a=new Architect(c),p=c.config,w=a.value(p.width),d=a.value(p.depth),h=a.value(p.height),mouth=Math.min(w*.42,4);
 // Leave a real empty throat surrounded by separate outcrops.
 for(const side of [-1,1])a.piece('rock',[side*(mouth/2+w*.17),h*.36,d*.1],[w*.28,h*.4,d*.5],'stone','outcrop');
 a.piece('rock',[0,h*.77,d*.12],[w*.5,h*.21,d*.45],'stone','mine-crown');
 a.piece('arch',[0,mouth*.48,-d*.27],[mouth,2,.42],'wood','mine-mouth');
 for(let i=0;i<3;i++)for(const side of [-1,1])a.beam([side*mouth*.45,0,-d*.25+i*d*.22],[side*mouth*.45,mouth*.48,-d*.25+i*d*.22],.25,'wood','tunnel-support');
 for(const side of [-1,1])a.beam([side*.46,.08,-d*.55],[side*.46,.08,d*.45],.09,'metal','rail');
 a.plan.accesses.push({id:'mine-path',from:[0,0,-d],to:[0,0,d*.4],width:mouth*.8,role:'tunnel'});
 return a.finish();
}
export function dock(c:GrammarContext) {
 const a=new Architect(c),p=c.config,w=a.value(p.width),d=a.value(p.depth),base=a.value(1.1);
 const deck=a.piece('box',[0,base,0],[w*.3,.22,d],'wood','dock-deck');
 const head=a.piece('box',[0,base,d*.31],[w,.22,d*.22],'wood','dock-head',deck);
 for(const side of [-1,1])for(let i=0;i<4;i++)a.piece('column',[side*w*.14,base*.7,-d*.4+i*d*.27],[.3,base*1.4,.3],'wood','mooring');
 a.depend(deck,a.plan.pieces.filter(p=>p.role==='mooring').map(p=>p.id),2);const headPiers=[-1,1].map(side=>a.piece('column',[side*w*.43,base/2,d*.31],[.35,base,.35],'wood','head-pier'));a.depend(head,[deck,...headPiers],2);a.stairs([0,0,-d/2-2],[0,base,-d/2],w*.3);
 a.plan.propZones.push({id:'dock-water',x:0,z:1,width:w+4,depth:d+4,y:-.08,kind:'water'});return a.finish();
}
export {lighthouse} from './lighthouse';
export function underground(c:GrammarContext) {
 const a=new Architect(c),p=c.config,w=a.value(p.width),d=a.value(p.depth),h=a.value(p.height);
 a.building(-w*.22,0,w*.42,d*.68,h,1,{material:'stone',roof:p.roof==='auto'?'flat':p.roof,role:'chamber'});
 a.building(w*.22,d*.1,w*.42,d*.45,h*.85,1,{material:'stone',roof:p.roof==='auto'?'flat':p.roof,role:'chamber'});
 for(const [index,side] of [[0,1],[1,3]]){const volume=a.plan.volumes[index],wall=a.plan.walls.find(w=>w.id===volume.id+'_wall_'+side)!;const offset=side===1?-volume.z:volume.z;a.plan.openings.push({id:wall.id+'_passage',wall:wall.id,kind:'door',offset,width:Math.min(1.4,volume.depth*.4),bottom:0,height:Math.min(2.2,volume.height*.85)});}
 a.piece('box',[0,.12,0],[w,.24,d*.18],'stone','passage');
 a.piece('arch',[0,h*.4,0],[w*.12,2,.4],'stone','passage-arch');
 a.stairs([-w*.22,0,-d*.75],[-w*.22,.25,-d*.34],2);
 return a.finish();
}
