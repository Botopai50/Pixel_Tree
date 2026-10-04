import {Architect} from '../blueprint';import type {GrammarContext,VolumeSpec} from '../types';

/** Weathered square-column sanctuary with a single continuous stone terrace. */
export function ancientTemple(c:GrammarContext){
 const a=new Architect(c),p=c.config,w=a.value(p.width,.05),d=a.value(p.depth,.05),h=a.value(p.height,.06)*.85,base=1.05;
 const platform=a.piece('box',[0,.175,0],[w+1.30,.35,d+1.10],'stone','temple-platform');
 a.piece('box',[0,.525,0],[w+.82,.35,d+.65],'stone','temple-platform',platform);
 a.piece('box',[0,.875,0],[w+.38,.35,d+.25],'stone','temple-platform',platform);
 const room=a.building(0,d*.07,w*.88,d*.74,h,1,{base,material:'stone',roof:'flat',role:'sanctuary'});
 const porch=a.building(0,-d*.37,w*.88,d*.14,h,1,{base,material:'stone',roof:'flat',open:true,door:false,role:'portico'});
 const foundation=(v:VolumeSpec)=>a.plan.pieces.find(p=>p.role==='foundation'&&p.position[0]===v.x&&p.position[2]===v.z)!;
 for(const v of [room,porch]){const f=foundation(v);f.position[1]=base-.08;f.size[1]=.12;a.depend(f.id,[platform]);}
 const porchRoof=porch.id+'_roof';a.plan.roofs=a.plan.roofs.filter(r=>r.id!==porchRoof);a.plan.supports=a.plan.supports.filter(s=>s.component!==porchRoof);
 const generated=new Set(a.plan.pieces.filter(p=>['corner-post','wall-frame','floor','stairs'].includes(p.role)).map(p=>p.id));
 a.plan.pieces=a.plan.pieces.filter(p=>!generated.has(p.id));a.plan.supports=a.plan.supports.filter(s=>!generated.has(s.component));a.plan.joints=[];
 a.plan.accesses=[];
 a.plan.openings=a.plan.openings.filter(o=>o.kind==='door');
 const entry=a.plan.openings[0];entry.offset=0;entry.width=Math.min(1.60,w*.20);entry.height=Math.min(3.40,h*.70);
 const roof=a.plan.roofs[0];roof.x=0;roof.z=0;roof.width=w;roof.depth=d*.93;roof.y=base+h+.64;roof.rise=0;roof.eaves=.38;roof.material='stone';roof.flatThickness=.28;roof.plainEdge=true;
 const terraceY=roof.y+.28,columnWidth=Math.min(.72,w*.058),front=-d*.44,columns=Math.max(4,Math.min(8,Math.round(4+p.complexity*3)));
 const columnIds:string[]=[];
 const glyph=(x:number,y:number,z:number,width:number,height:number,support:string,rotation=Math.PI)=>a.piece('box',[x,y,z],[width,height,.018],'stone','temple-glyph',support,[0,rotation,0]);
 const steppedPier=(x:number,z:number,support:string,role:string)=>{
  const foot=a.piece('box',[x,base+.10,z],[columnWidth*1.62,.20,columnWidth*1.62],'stone','column-base',support);
  a.piece('box',[x,base+.32,z],[columnWidth*1.34,.24,columnWidth*1.34],'stone','column-base',foot);
  const shaft=a.piece('box',[x,base+.54+(h-1.08)/2,z],[columnWidth,h-1.08,columnWidth],'stone',role,foot);
  // Shallow pilasters articulate the square shaft without a cylindrical silhouette.
  for(const side of [-1,1]){
   a.piece('box',[x+side*columnWidth*.31,base+h/2,z-columnWidth/2-.022],[.075,h-1.16,.045],'stone','temple-column-flute',shaft);
   a.piece('box',[x-columnWidth/2-.022,base+h/2,z+side*columnWidth*.31],[.045,h-1.16,.075],'stone','temple-column-flute',shaft);
  }
  for(const [level,width,height] of [[h-.43,columnWidth*1.16,.22],[h-.21,columnWidth*1.40,.22],[h-.04,columnWidth*1.62,.12]])a.piece('box',[x,base+level,z],[width,height,width],'stone','capital',shaft);
  return shaft;
 };
 for(let i=0;i<columns;i++)columnIds.push(steppedPier(-w*.44+i*w*.88/(columns-1),front,platform,'temple-column'));
 // Wall corner piers echo the portico columns and keep the cornice supported at the rear.
 for(const side of [-1,1])for(const z of [room.z-room.depth/2,room.z+room.depth/2])steppedPier(side*(room.width/2+.025),z,foundation(room).id,'temple-wall-pier');
 const frieze=(x:number,z:number,length:number,axis:0|2)=>{
  const beam=a.piece('box',[x,base+h+.27,z],axis===0?[length,.54,.62]:[.62,.54,length],'stone','entablature',platform);
  a.piece('box',[x,base+h+.59,z],axis===0?[length+.20,.10,.80]:[.80,.10,length+.20],'stone','temple-frieze-cap',beam);
  a.piece('box',[x,base+h-.055,z],axis===0?[length+.12,.11,.72]:[.72,.11,length+.12],'stone','temple-frieze-base',beam);
  const count=Math.max(3,Math.round(length/.87)),outside=Math.sign(axis===0?z:x);
  for(let i=0;i<count;i++)glyph(x+(axis===0?-length/2+(i+.5)*length/count:outside*.322),base+h+.27,z+(axis===2?-length/2+(i+.5)*length/count:outside*.322),Math.min(.66,length/count*.75),.40,beam,axis===0?(outside<0?Math.PI:0):(outside<0?-Math.PI/2:Math.PI/2));
  return beam;
 };
 const frontBeam=frieze(0,front,w*.96,0),backZ=room.z+room.depth/2;
 frieze(0,backZ,w*.96,0);for(const side of [-1,1])frieze(side*w*.44,(front+backZ)/2,backZ-front,2);
 a.depend(frontBeam,columnIds,Math.max(2,columns-2));a.depend(roof.id,[foundation(room).id,frontBeam],2);
 // Two carved blind panels on each side wall echo the recessed reliefs in the reference.
 for(const side of [-1,1])for(const z of [d*.02,d*.25]){
  const x=side*(room.width/2+.105),y=base+h*.48,support=foundation(room).id;
  glyph(x,y,z,.65,Math.min(1.25,h*.28),support,side<0?-Math.PI/2:Math.PI/2);
  for(const edge of [-1,1])a.piece('box',[x,y,z+edge*.42],[.20,Math.min(1.50,h*.34),.16],'stone','temple-relief-frame',support);
  for(const edge of [-1,1])a.piece('box',[x,y+edge*Math.min(.75,h*.17),z],[.20,.16,.98],'stone','temple-relief-frame',support);
 }
 // Large roof paving and low parapets along the back and sides match the reference terrace.
 for(const side of [-1,1])a.piece('box',[side*w*.44,terraceY+.22,d*.19],[.26,.44,d*.46],'stone','terrace-cornice',roof.id);
 a.piece('box',[0,terraceY+.22,d*.44],[w*.88,.44,.26],'stone','terrace-cornice',roof.id);
 const accessX=-w*.32,accessEnd=room.z+room.depth/2-.80;
 a.stairs([accessX,base,room.z-room.depth/2+.65],[accessX,terraceY,accessEnd],Math.min(1.2,w*.13));
 roof.accessHole={x:accessX,z:accessEnd-.50,width:Math.min(1.4,w*.15),depth:1.45};
 const beforeUpper=a.plan.pieces.length,accessesBeforeUpper=a.plan.accesses.length;
 const upper=a.building(0,d*.18,w*.43,d*.30,Math.max(1.85,h*.38),1,{base:terraceY,material:'stone',roof:'flat',role:'upper-shrine'});
 const f=foundation(upper);f.position[1]=terraceY-.08;f.size[1]=.12;a.depend(f.id,[roof.id]);
 const upperRoof=a.plan.roofs.find(r=>r.volume===upper.id)!;upperRoof.material='stone';upperRoof.flatThickness=.26;upperRoof.eaves=.34;upperRoof.rise=0;upperRoof.plainEdge=true;
 const upperPieces=a.plan.pieces.filter((p,i)=>(p.support===f.id&&['floor','corner-post','wall-frame'].includes(p.role))||(i>=beforeUpper&&p.kind==='stairs'));const removed=new Set(upperPieces.map(p=>p.id));
 a.plan.pieces=a.plan.pieces.filter(p=>!removed.has(p.id));a.plan.supports=a.plan.supports.filter(s=>!removed.has(s.component));
 a.plan.accesses.splice(accessesBeforeUpper);
 a.plan.openings=a.plan.openings.filter(o=>!o.wall.startsWith(upper.id)||o.kind==='door');
 const door=a.plan.openings.find(o=>o.wall===upper.id+'_wall_0')!;door.offset=0;door.width=Math.min(1.10,upper.width*.28);door.height=Math.min(2.15,upper.height-.20);
 for(let i=0;i<7;i++){
  const x=(a.rnd()-.5)*w*.74,z=-d*.33+a.rnd()*d*.38;
  if(Math.abs(x-accessX)<1&&Math.abs(z-accessEnd)<1)continue;
  a.piece('box',[x,terraceY+.04,z],[.18+a.rnd()*.16,.08,.16+a.rnd()*.18],'stone','temple-roof-chip',roof.id);
 }
 for(const side of [-1,1]){
  a.piece('box',[side*(upper.width/2-.10),terraceY+upper.height/2,upper.z-upper.depth/2-.08],[.34,upper.height,.28],'stone','temple-upper-pier',f.id);
  for(let row=0;row<3;row++)glyph(side*(upper.width/2-.10),terraceY+.42+row*(upper.height-.55)/3,upper.z-upper.depth/2-.23,.25,.35,f.id);
 }
 for(const z of [upper.z-upper.depth/2,upper.z+upper.depth/2])a.piece('box',[0,terraceY+upper.height-.18,z],[upper.width+.16,.22,.28],'stone','temple-upper-lintel',f.id);
 const stairFront=-d/2-.12,stairLength=Math.min(2.65,d*.20);
 a.stairs([0,0,stairFront-stairLength],[0,base,stairFront],w*.56);
 for(const side of [-1,1])a.piece('box',[side*(entry.width/2+.22),base+.28,room.z-room.depth/2-.08],[.32,.56,.30],'stone','temple-door-foot',platform);
 a.plan.propZones.push({id:'temple-garden',x:0,z:d*.57,width:w,depth:d*.12,y:0,kind:'garden'});
 return a.finish();
}
