import test from 'node:test';
import assert from 'node:assert/strict';
import {buildStructurePlan} from '../src/structures/plan';
import {fixture} from './structureFixtures';
import {buildMillCap,buildMillBody,buildMillDoor} from '../src/structures/geometry/windmill';
test('mill door fills the semicircular arch down to its spring line',()=>{
 const piece=buildStructurePlan(fixture('windmill',42)).pieces.find(p=>p.role==='mill-door')!;
 const g=buildMillDoor(piece);g.computeBoundingBox();
 assert.ok(Math.abs(g.boundingBox!.max.y-(piece.position[1]+piece.size[1]/2+piece.size[0]/2))<1e-5);
 assert.ok(Math.abs(g.boundingBox!.min.y-(piece.position[1]-piece.size[1]/2))<1e-5);
 g.dispose();
});
import {paintUV} from '../src/structures/geometry/paintUV';
test('windmill taper varies by seed while body levels and roof stay joined',()=>{
 const ratios=new Set<string>();
 for(const seed of [1,42,777,2590,7015]){
  const plan=buildStructurePlan(fixture('windmill',seed)),body=plan.pieces.filter(p=>p.role==='mill-body');
  const ratio=body[2].size[2]/body[0].size[0];ratios.add(ratio.toFixed(4));
  assert.ok(ratio>=.82&&ratio<=.90);
  for(let i=1;i<body.length;i++)assert.ok(Math.abs(body[i].size[0]-body[i-1].size[2])<1e-8);
  assert.ok(Math.abs(plan.pieces.find(p=>p.role==='mill-cap')!.size[0]-(body[2].size[2]+.95))<1e-8);
  assert.deepEqual(plan,buildStructurePlan(fixture('windmill',seed)));
 }
 assert.ok(ratios.size>=4,'seeds should produce visibly different tapers');
});
test('masonry UVs continue through facet corners and keep courses horizontal',()=>{
 const piece=buildStructurePlan(fixture('windmill',42)).pieces.filter(p=>p.role==='mill-body')[1];
 const g=paintUV(buildMillBody(piece,1)),pos=g.getAttribute('position'),uv=g.getAttribute('uv');
 const corners=new Map<string,number>();
 for(let i=0;i<pos.count;i++){
  assert.ok(Math.abs(uv.getY(i)-pos.getY(i))<1e-5,'courses use the same world height');
  const key=[pos.getX(i),pos.getY(i),pos.getZ(i)].map(n=>n.toFixed(4)).join(':');
  const u=((uv.getX(i)%2.8)+2.8)%2.8,previous=corners.get(key);
  if(previous!==undefined){const delta=Math.abs(u-previous);assert.ok(Math.min(delta,2.8-delta)<1e-4,'texture joins across shared corners');}
  corners.set(key,u);
 }
 g.dispose();
});
test('masonry thickness meets at the same outer corner on every facet',()=>{
 const piece=buildStructurePlan(fixture('windmill',42)).pieces.filter(p=>p.role==='mill-body')[1],g=buildMillBody(piece,1),pos=g.getAttribute('position');
 const radius=piece.size[0]/2+.09/Math.cos(Math.PI/12),bottom=piece.position[1]-piece.size[1]/2;
 for(let side=0;side<12;side++){
  const angle=(side-.5)*Math.PI/6,x=Math.sin(angle)*radius,z=-Math.cos(angle)*radius;
  let count=0;for(let i=0;i<pos.count;i++)if(Math.abs(pos.getX(i)-x)<1e-5&&Math.abs(pos.getY(i)-bottom)<1e-5&&Math.abs(pos.getZ(i)-z)<1e-5)count++;
  assert.ok(count>=2,'both facets must meet at corner '+side);
 }
 g.dispose();
});
test('mill cap is one connected surface with no detached courses',()=>{
 const p=buildStructurePlan(fixture('windmill',42)).pieces.find(x=>x.role==='mill-cap')!;
 const g=buildMillCap(p),flat=g.index?g.toNonIndexed():g,positions=flat.getAttribute('position');
 const graph=new Map<string,Set<string>>(),key=(i:number)=>[positions.getX(i),positions.getY(i),positions.getZ(i)].map(n=>n.toFixed(5)).join(':');
 for(let i=0;i<positions.count;i+=3){const keys=[key(i),key(i+1),key(i+2)];for(const a of keys){if(!graph.has(a))graph.set(a,new Set());for(const b of keys)graph.get(a)!.add(b);}}
 const seen=new Set<string>(),queue=[graph.keys().next().value!];while(queue.length){const k=queue.pop()!;if(seen.has(k))continue;seen.add(k);queue.push(...graph.get(k)!);}
 assert.equal(seen.size,graph.size);
 if(flat!==g)flat.dispose();g.dispose();
});
test('windmill has a tapered masonry tower and four framed canvas sails clear of the ground',()=>{
 for(const seed of [1,42,7015]){
  const p=buildStructurePlan(fixture('windmill',seed));
  assert.equal(p.pieces.filter(x=>x.role==='mill-body').length,3);
  assert.ok(p.pieces.some(x=>x.role==='mill-cap'));
  const spars=p.pieces.filter(x=>x.role==='mill-spar');assert.equal(spars.length,4);
  assert.equal(p.pieces.filter(x=>x.role==='mill-canvas').length,24);
  for(const spar of spars)assert.ok(spar.end![1]>.25);
  assert.ok(!p.roofs.length);
 }
});


test('mill timber belts clear the gallery and entry canopy clears the arch',()=>{
 for(const seed of [42,2590,7732]){
  const plan=buildStructurePlan(fixture('windmill',seed));
  const gallery=plan.pieces.find(p=>p.role==='mill-gallery')!,belts=plan.pieces.filter(p=>p.role==='mill-belt');
  assert.ok(gallery.position[1]-Math.max(...belts.map(p=>p.position[1]+p.size[1]/2))>1);
  const arch=plan.pieces.find(p=>p.role==='mill-door-arch')!,archTop=arch.position[1]+arch.size[0]/2+arch.size[2];
  for(const cover of plan.pieces.filter(p=>p.role==='mill-entry-canopy')){
   const angle=Math.abs(cover.rotation![2]),low=cover.position[1]-cover.size[0]/2*Math.sin(angle)-cover.size[1]/2*Math.cos(angle);
   assert.ok(low>archTop+.08,'roof underside must stay above the complete stone arch');
   assert.ok(cover.size[2]<.7);
  }
 }
});


test('mill galleries have walking space without rails crossing the entry route',()=>{
 const plan=buildStructurePlan(fixture('windmill',42));
 for(const role of ['mill-gallery','mill-entry-gallery']){
  const deck=plan.pieces.find(p=>p.role===role)!;
  assert.ok((deck.size[0]-deck.size[2])/2*Math.cos(Math.PI/12)>.95);
 }
 assert.ok(!plan.pieces.some(p=>p.role==='mill-entry-rail'||p.role==='mill-entry-post'||p.role==='mill-entry-deck'));
 assert.equal(plan.pieces.filter(p=>p.role==='mill-belt-brace').length,24);
 const entry=plan.pieces.find(p=>p.role==='mill-entry-gallery')!;
 for(const rail of plan.pieces.filter(p=>p.role==='mill-entry-gallery-rail')){
  assert.ok(!(rail.position[2]<-entry.size[0]/2*.9&&rail.end![2]<-entry.size[0]/2*.9&&rail.position[0]*rail.end![0]<0),'stair approach must stay open');
 }
});


test('entry deck top stays above the stone plinth without coplanar overlap',()=>{
 for(const seed of [42,2590,7732]){
  const plan=buildStructurePlan(fixture('windmill',seed)),deck=plan.pieces.find(p=>p.role==='mill-entry-gallery')!,plinth=plan.pieces.find(p=>p.role==='mill-plinth')!;
  assert.ok(deck.position[1]+deck.size[1]/2-(plinth.position[1]+plinth.size[1]/2)>.03);
  assert.equal(plinth.position[1]-plinth.size[1]/2,0);
 }
});


test('rotor axle retains its height with no window behind it',()=>{
 for(const height of [8,10,12,14])for(const seed of [42,2590,4529]){
  const plan=buildStructurePlan(fixture('windmill',seed,{height})),axis=plan.pieces.find(p=>p.role==='mill-axis')!;
  const body=plan.pieces.filter(p=>p.role==='mill-body'),upperBody=body[2];
  assert.ok(Math.abs(axis.position[1]-(.32+body[0].size[1]*3*.93))<1e-6);
  assert.ok(!plan.pieces.some(p=>p.role==='mill-window'&&p.support===upperBody.id&&Math.abs(p.position[0])<1e-6));
  const frontWindows=plan.pieces.filter(p=>p.role==='mill-window'&&Math.abs(p.position[0])<1e-6);
  const upper=frontWindows.sort((a,b)=>b.position[1]-a.position[1])[0];
  assert.ok(axis.position[1]-axis.size[0]/2>upper.position[1]+.47+.05,'axle must stay above the complete window frame');
 }
});
