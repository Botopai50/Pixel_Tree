import {Architect} from '../blueprint';import type {GrammarContext} from '../types';
function curtain(a:Architect,x:number,z:number,w:number,h:number,d:number){
 const alongX=w>=d,ww=alongX?w:1.6,dd=alongX?1.6:d,support=a.piece('box',[x,h/2,z],[ww,h,dd],'stone','curtain');
 a.piece('box',[x,h-.1,z],[ww,.2,dd],'stone','wall-walk',support);
 const length=alongX?w:d,count=Math.max(2,Math.floor(length/(1.7-a.context.config.complexity*.5)));
 for(let i=0;i<count;i++)for(const side of [-1,1])a.piece('box',[x+(alongX? -w/2+(i+.5)*w/count:side*.65),h+.35,z+(alongX?side*.65:-d/2+(i+.5)*d/count)],[alongX?w/count*.6:.3,.7,alongX?.3:d/count*.6],'stone','crenel',support);
 return support;
}
function courtyard(c:GrammarContext,royal:boolean){const a=new Architect(c),p=c.config,w=a.value(p.width),d=a.value(p.depth),h=a.value(p.height),tw=Math.max(3,w*.15),td=Math.max(3,d*.17),wallH=h*.56;
 for(const sx of [-1,1])for(const sz of [-1,1]){
  const tower=a.building(sx*(w-tw)/2,sz*(d-td)/2,tw,td,h*a.value(1,.08),2,{material:'stone',roof:p.roof==='auto'?(royal?'hip':'flat'):p.roof,door:false,role:'corner-tower'});
  const innerWall=a.plan.walls.find(w=>w.id===tower.id+'_wall_'+(sz===-1?2:0))!,walkWall=a.plan.walls.find(w=>w.id===tower.id+'_wall_'+(sx===-1?1:3))!;
  a.plan.openings.push({id:innerWall.id+'_courtyard-door',wall:innerWall.id,kind:'door',offset:0,width:Math.min(1.25,tw*.5),bottom:0,height:Math.min(2.1,tower.height*.7)});
  const floor=a.plan.pieces.filter(p=>p.role==='floor'&&Math.abs(p.position[0]-tower.x)<tw/2&&Math.abs(p.position[2]-tower.z)<td/2&&p.position[1]>tower.bottom+1)[0];
  if(floor){floor.position[1]=wallH-.06;floor.size[0]=tw;floor.size[2]=td;}
  for(const landing of a.plan.pieces.filter(p=>p.role==='floor-landing'&&Math.abs(p.position[0]-tower.x)<tw/2&&Math.abs(p.position[2]-tower.z)<td/2))landing.position[1]=wallH-.06;
  for(const access of a.plan.accesses.filter(a=>a.from[0]>tower.x-tw/2&&a.from[0]<tower.x+tw/2&&a.from[2]>tower.z-td/2&&a.from[2]<tower.z+td/2&&a.to[1]>1)){const original=access.to[1];access.to[1]=wallH;const stair=a.plan.pieces.find(p=>p.kind==='stairs'&&p.end?.[0]===access.to[0]&&p.end?.[2]===access.to[2]&&Math.abs(p.end[1]-original)<.001);if(stair){stair.end![1]=wallH;stair.size[1]=Math.abs(wallH-stair.position[1]);}}
  a.plan.openings.push({id:walkWall.id+'_wall-walk-door',wall:walkWall.id,kind:'door',offset:0,width:Math.min(1.1,td*.48),bottom:wallH-tower.bottom,height:Math.min(2,tower.bottom+tower.height-wallH-.12)});
  a.plan.accesses.push({id:tower.id+'_walk-link',from:[tower.x,wallH,tower.z],to:[tower.x-sx*tw/2,wallH,tower.z],width:1.1,role:'wall-walk'});
 }
 curtain(a,0,d/2-td/2,w-2*tw,wallH,.7);for(const side of [-1,1])curtain(a,side*(w/2-tw/2),0,.7,wallH,d-2*td);
 const gap=Math.min(3.5,w*.22),wing=(w-2*tw-gap)/2;for(const side of [-1,1])curtain(a,side*(gap/2+wing/2),-d/2+td/2,wing,wallH,.7);
 a.piece('arch',[0,wallH*.53,-d/2+td/2],[gap,2,.72],'stone','entrance-arch');a.stairs([0,0,-d/2-2],[0,.25,-d/2+td/2],gap);
 if(royal){const keep=a.building(w*.04,d*.13,w*.38,d*.36,h*1.22,p.floors,{material:'stone',roof:p.roof==='auto'?'hip':p.roof,role:'keep'});a.veranda(keep);for(const sx of [-1,1]){const turret=a.building(keep.x+sx*keep.width*.30,keep.z+keep.depth*.18,tw*.65,td*.65,h*.62,1,{base:keep.bottom+keep.height,material:'stone',roof:p.roof==='auto'?'hip':p.roof,door:false,role:'keep-turret'});const foundation=a.plan.pieces.find(x=>x.role==='foundation'&&x.position[0]===turret.x&&x.position[2]===turret.z)!;foundation.size[1]=.16;foundation.position[1]=turret.bottom-.08;foundation.support=keep.id+'_roof';a.plan.supports.find(x=>x.component===foundation.id)!.on=foundation.support;}}
 else a.building(0,d*.16,w*.35,d*.3,h*.65,1,{material:'stone',roof:p.roof==='auto'?'gable':p.roof,role:'barracks'});
 a.plan.propZones.push({id:'courtyard',x:0,z:-d*.09,width:w*.35,depth:d*.25,y:0,kind:'garden'});return a.finish();}
export function fortress(c:GrammarContext){return courtyard(c,false);}export function castle(c:GrammarContext){return courtyard(c,true);}export function ruinedCastle(c:GrammarContext){return courtyard(c,true);}
export function ancientRuins(c:GrammarContext){const a=new Architect(c),p=c.config,w=a.value(p.width),d=a.value(p.depth),h=a.value(p.height),base=a.piece('box',[0,.2,0],[w,.4,d],'stone','ancient-plinth');const rows=Math.max(3,Math.round(3+p.complexity*3));for(const side of [-1,1])for(let i=0;i<rows;i++){const z=-d*.36+i*d*.72/(rows-1),id=a.piece('column',[side*w*.35,.4+h/2,z],[.65,h,.65],'stone','colonnade',base);a.piece('box',[side*w*.35,.4+h,z],[.9,.28,.9],'stone','capital',id);if(i>0)a.beam([side*w*.35,.4+h,z-d*.72/(rows-1)],[side*w*.35,.4+h,z],.5,'stone','lintel',id);}
 a.piece('arch',[0,h*.45,d*.3],[w*.48,2,.55],'stone','ruined-arch',base);a.stairs([0,0,-d/2-2],[0,.4,-d/2],w*.55);return a.finish();}
export function temple(c:GrammarContext){
 const a=new Architect(c),p=c.config,w=a.value(p.width),d=a.value(p.depth),h=a.value(p.height),base=.9;
 const platform=a.piece('box',[0,.14,0],[w+.9,.28,d+.9],'stone','temple-platform');
 a.piece('box',[0,.43,0],[w+.45,.30,d+.45],'stone','temple-platform',platform);
 a.piece('box',[0,.74,0],[w,.32,d],'stone','temple-platform',platform);
 const sanctuary=a.building(0,d*.08,w*.78,d*.67,h,1,{base,material:'stone',roof:p.roof==='auto'?'flat':p.roof,role:'sanctuary'});
 const portico=a.building(0,-d*.37,w,d*.23,h,1,{base,open:true,roof:p.roof==='auto'?'flat':p.roof,door:false,role:'portico'});
 for(const foundation of a.plan.pieces.filter(piece=>piece.role==='foundation')){foundation.size[1]=.12;foundation.position[1]=base-.08;a.depend(foundation.id,[platform]);}
 if(p.roof==='auto'||p.roof==='flat'){
  a.plan.roofs.forEach(roof=>roof.material='stone');
  const upperBase=base+h+.12;
  const before=a.plan.pieces.length,accessCount=a.plan.accesses.length;
  const shrine=a.building(0,d*.18,w*.42,d*.30,h*.38,1,{base:upperBase,material:'stone',roof:'flat',role:'upper-shrine'});
  // Its doorway already opens onto the sanctuary roof terrace, not ground.
  const accessIds=new Set(a.plan.pieces.slice(before).filter(piece=>piece.kind==='stairs').map(piece=>piece.id));
  a.plan.pieces=a.plan.pieces.filter(piece=>!accessIds.has(piece.id));
  a.plan.supports=a.plan.supports.filter(link=>!accessIds.has(link.component));
  a.plan.accesses.splice(accessCount);
  const f=a.plan.pieces.find(piece=>piece.role==='foundation'&&piece.position[0]===shrine.x&&piece.position[2]===shrine.z)!;
  f.size[1]=.12;f.position[1]=upperBase-.08;a.depend(f.id,[sanctuary.id+'_roof']);
  a.plan.roofs.find(roof=>roof.volume===shrine.id)!.material='stone';
  // The terrace lip has a pronounced masonry silhouette rather than timber.
  for(const side of [-1,1])a.piece('box',[side*w*.4,upperBase+.20,d*.08],[.26,.4,d*.68],'stone','terrace-cornice',sanctuary.id+'_roof');
 }
 const roof=a.plan.roofs.find(r=>r.volume===portico.id)!;
 const columns=Math.max(4,Math.round(4+p.complexity*3)),front=-d*.485;
 for(let i=0;i<columns;i++){const x=-w*.43+i*w*.86/(columns-1),col=a.piece('column',[x,base+h/2,front],[.70,h,.70],'stone','temple-column',platform);a.piece('box',[x,base+.14,front],[.92,.28,.92],'stone','column-base',col);a.piece('box',[x,base+h-.16,front],[.96,.32,.96],'stone','capital',col);}
 a.beam([-w*.46,base+h-.12,front],[w*.46,base+h-.12,front],.42,'stone','entablature',platform);
 const pediment={id:'temple-pediment',volume:portico.id,start:[-w/2,base+h,front] as [number,number,number],end:[w/2,base+h,front] as [number,number,number],bottom:base+h,height:.01,thickness:.16,material:'stone' as const,gable:{peak:roof.rise,ratio:roof.ridgeRatio??.5}};
 if(roof.kind==='gable'||roof.kind==='thatch'){a.plan.walls.push(pediment);a.plan.supports.push({component:pediment.id,on:portico.id+'_roof'});}
 for(const floor of a.plan.pieces.filter(piece=>piece.role==='floor'||piece.role==='floor-landing'))floor.material='stone';
 a.stairs([0,0,-d*.6-2],[0,base,-d*.49],w*.58);
 a.plan.propZones.push({id:'temple-garden',x:0,z:d*.6,width:w,depth:d*.25,y:0,kind:'garden'});return a.finish();}
