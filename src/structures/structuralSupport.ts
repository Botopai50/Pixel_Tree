import type {StructurePlan,V3,WallSpec,PieceSpec} from './types';

function wallContact(w:WallSpec,p:V3){
 const dx=w.end[0]-w.start[0],dz=w.end[2]-w.start[2],length2=dx*dx+dz*dz;
 const t=Math.max(0,Math.min(1,((p[0]-w.start[0])*dx+(p[2]-w.start[2])*dz)/length2));
 const distance=Math.hypot(p[0]-w.start[0]-dx*t,p[2]-w.start[2]-dz*t);
 let top=(w.topLeft??w.height)*(1-t)+(w.topRight??w.height)*t;
 if(w.gable)top+=w.gable.peak*(t<=w.gable.ratio?t/w.gable.ratio:(1-t)/(1-w.gable.ratio));
 return distance<=w.thickness/2+.22&&p[1]>=w.bottom-.15&&p[1]<=w.bottom+top+.15;
}

/** Foundation ownership alone cannot hold up an elevated fragment. */
export function collapseUnsupportedFraming(plan:StructurePlan,removed:Set<string>){
 const standing=plan.walls.filter(w=>!w.removed);
 const connected=new Set(standing.filter(w=>w.bottom<=.55).map(w=>w.id));
 let changed=true;
 while(changed){changed=false;for(const w of standing){
  if(connected.has(w.id))continue;
  const points:V3[]=[w.start,w.end,[(w.start[0]+w.end[0])/2,w.bottom,(w.start[2]+w.end[2])/2]].map(p=>[p[0],w.bottom,p[2]]);
  if(standing.some(s=>connected.has(s.id)&&s.bottom<w.bottom-.05&&points.some(p=>wallContact(s,p)))){connected.add(w.id);changed=true;}
 }}
 for(const w of standing)if(!connected.has(w.id)){w.removed=true;removed.add(w.id);}
 const walls=standing.filter(w=>!w.removed);
 const posts=plan.pieces.filter(p=>!p.removed&&p.role==='corner-post'&&p.end);
 for(const floor of plan.pieces.filter(p=>!p.removed&&['floor','floor-landing'].includes(p.role))){
  const volume=plan.volumes.find(v=>Math.abs(floor.position[0]-v.x)<=v.width/2+.1&&Math.abs(floor.position[2]-v.z)<=v.depth/2+.1&&floor.position[1]>=v.bottom);
  if(!volume||floor.position[1]<=volume.bottom+.2)continue;
  const corners:V3[]=[];
  for(const x of [-1,1])for(const z of [-1,1])corners.push([floor.position[0]+x*floor.size[0]/2,floor.position[1],floor.position[2]+z*floor.size[2]/2]);
  if(corners.filter(p=>walls.some(w=>wallContact(w,p))||posts.some(post=>Math.hypot(p[0]-post.position[0],p[2]-post.position[2])<.35&&post.end![1]>=p[1]-.15)).length<3){floor.removed=true;removed.add(floor.id);}
 }
 const framing=plan.pieces.filter(p=>['wall-frame','facade-brace'].includes(p.role)).sort((a,b)=>Number(a.role==='facade-brace')-Number(b.role==='facade-brace'));
 for(const piece of framing){
  if(piece.removed||!piece.end||!['wall-frame','facade-brace'].includes(piece.role))continue;
  const points=[piece.position,piece.end];
  // Ground-level rails may rest directly on the foundation.
  if(points.every(p=>p[1]<=(plan.volumes.find(v=>Math.abs(p[0]-v.x)<=v.width/2+.3&&Math.abs(p[2]-v.z)<=v.depth/2+.3)?.bottom??.25)+.2))continue;
  const supported=points.every(p=>walls.some(w=>wallContact(w,p))||posts.some(post=>{
   const low=Math.min(post.position[1],post.end![1]),high=Math.max(post.position[1],post.end![1]);
   return p[1]>=low-.15&&p[1]<=high+.15&&Math.hypot(p[0]-post.position[0],p[2]-post.position[2])<=post.size[0]/2+piece.size[0]/2+.2;
  })||(piece.role==='facade-brace'&&framing.some(rail=>{
   if(rail.role!=='wall-frame'||rail.removed||!rail.end)return false;
   const d=rail.end.map((v,i)=>v-rail.position[i]),length2=d.reduce((s,v)=>s+v*v,0);
   const t=Math.max(0,Math.min(1,d.reduce((s,v,i)=>s+v*(p[i]-rail.position[i]),0)/length2));
   return Math.hypot(...d.map((v,i)=>p[i]-rail.position[i]-v*t))<rail.size[0]/2+piece.size[0]/2+.08;
  })));
  if(!supported){piece.removed=true;removed.add(piece.id);}
 }
}

/** Trace actual contact back to the ground; ownership is not a physical support. */
export function collapseFloatingPieces(plan:StructurePlan,removed:Set<string>){
 const pieces=plan.pieces.filter(p=>!p.removed);
 const bounds=(p:PieceSpec)=>{
  if(p.end)return {lo:p.position.map((v,i)=>Math.min(v,p.end![i])-p.size[0]/2) as V3,hi:p.position.map((v,i)=>Math.max(v,p.end![i])+p.size[0]/2) as V3};
  return {lo:p.position.map((v,i)=>v-p.size[i]/2) as V3,hi:p.position.map((v,i)=>v+p.size[i]/2) as V3};
 };
 const grounded=new Set(pieces.filter(p=>bounds(p).lo[1]<=.35).map(p=>p.id));
 const contact=(point:V3,p:PieceSpec)=>{
  if(p.kind==='beam'&&p.end){
   const d=p.end.map((v,i)=>v-p.position[i]),l=d.reduce((s,v)=>s+v*v,0);
   const t=Math.max(0,Math.min(1,d.reduce((s,v,i)=>s+v*(point[i]-p.position[i]),0)/Math.max(l,.0001)));
   return Math.hypot(...d.map((v,i)=>point[i]-p.position[i]-v*t))<=p.size[0]/2+.12;
  }
  const b=bounds(p);
  return point.every((v,i)=>v>=b.lo[i]-.12&&v<=b.hi[i]+.12);
 };
 const samples=(p:PieceSpec):V3[]=>{
  if(p.end){const lower=p.position[1]<p.end[1]?p.position:p.end;return Math.abs(p.end[1]-p.position[1])>Math.hypot(p.end[0]-p.position[0],p.end[2]-p.position[2])?[lower]:[p.position,p.end];}
  const b=bounds(p),y=b.lo[1];
  if(p.size[0]>.9||p.size[2]>.9)return [-1,1].flatMap(x=>[-1,1].map(z=>[p.position[0]+x*Math.max(0,p.size[0]/2-.16),y,p.position[2]+z*Math.max(0,p.size[2]/2-.16)] as V3));
  return [[p.position[0],y,p.position[2]]];
 };
 let changed=true;
 while(changed){changed=false;for(const p of pieces){
  if(grounded.has(p.id))continue;
  const points=samples(p),hits=points.filter(point=>plan.walls.some(w=>!w.removed&&wallContact(w,point))||pieces.some(s=>s.id!==p.id&&grounded.has(s.id)&&contact(point,s))).length;
  if(hits>=Math.min(points.length,3)){grounded.add(p.id);changed=true;}
 }}
 for(const p of pieces)if(!grounded.has(p.id)){p.removed=true;removed.add(p.id);}
}
