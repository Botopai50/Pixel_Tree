import test from 'node:test';import assert from 'node:assert/strict';
import {buildStructurePlan} from '../src/structures/plan';import {fixture} from './structureFixtures';
import * as THREE from 'three';import {buildRoof} from '../src/structures/geometry/roofs';
test('royal castle has square gate towers, a stepped keep, pointed roofs and connected defences',()=>{
 for(const seed of [1,42,777]){
  const p=buildStructurePlan(fixture('castle',seed));
  assert.equal(p.volumes.filter(v=>v.role==='corner-tower').length,4);
  assert.equal(p.volumes.filter(v=>v.role==='gate-tower').length,2);
  assert.ok(p.volumes.some(v=>v.role==='high-keep'));
  assert.ok(p.pieces.some(v=>v.role==='castle-banner'));
  assert.ok(p.pieces.some(v=>v.role==='castle-bridge-deck'));
  assert.ok(p.pieces.some(v=>v.role==='castle-gallery-rail'));
  assert.ok(p.accesses.some(v=>v.role==='keep-stair'));
  assert.ok(p.accesses.some(v=>v.role==='gallery-stair'));
  assert.ok(!p.roofs.some(r=>r.id==='castle-hall-roof'));
  assert.ok(p.roofs.filter(r=>r.kind==='hip').length>=3);

  const merlons=p.pieces.filter(piece=>piece.role==='castle-crenel');
  for(let i=0;i<merlons.length;i++)for(let j=i+1;j<merlons.length;j++){
   const first=merlons[i],second=merlons[j];
   if(first.support!==second.support)continue;
   assert.ok([0,1,2].some(axis=>Math.abs(first.position[axis]-second.position[axis])>=(first.size[axis]+second.size[axis])/2-.000001));
  }
  for(const tower of p.volumes.filter(v=>['corner-tower','keep-turret','gate-tower','high-keep'].includes(v.role))){
   const roof=p.roofs.find(r=>r.volume===tower.id)!;
   assert.ok(['gate-tower','high-keep'].includes(tower.role)?roof.width>tower.width+.2:roof.width>tower.width+.8);
   const foundation=p.pieces.find(piece=>piece.role==='foundation'&&piece.position[0]===tower.x&&piece.position[2]===tower.z)!;
   const braces=p.pieces.filter(piece=>piece.role==='castle-tower-crown-brace'&&piece.support===foundation.id);
   assert.ok(roof.kind==='flat'||['gate-tower','high-keep'].includes(tower.role)?braces.length===0:braces.length>=8);
   for(const brace of braces){assert.ok(Math.abs(brace.position[0]-tower.x)<tower.width/2);assert.ok(Math.abs(brace.position[2]-tower.z)<tower.depth/2);}
  }
 }
});
test('courtyard stairs meet a clear gallery entrance and the keep door landing',()=>{
 const p=buildStructurePlan(fixture('castle',42)),gallery=p.accesses.find(a=>a.role==='gallery-stair')!,keep=p.accesses.find(a=>a.role==='keep-stair')!;
 assert.equal(gallery.from[0],gallery.to[0]);
 const landing=p.pieces.find(piece=>piece.role==='floor-landing'&&Math.abs(piece.position[1]+piece.size[1]/2-gallery.to[1])<.001&&Math.abs(piece.position[0]-gallery.to[0])<=piece.size[0]/2&&Math.abs(piece.position[2]-gallery.to[2])<=piece.size[2]/2)!;
 assert.ok(landing);
 const deck=p.pieces.find(piece=>piece.role==='castle-gallery'&&Math.abs(piece.position[1]+piece.size[1]/2-gallery.to[1])<.001&&Math.abs(piece.position[0]-landing.position[0]-piece.size[0]/2-landing.size[0]/2)<.001)!;
 assert.ok(deck);
 assert.ok(!p.pieces.some(piece=>piece.role==='castle-gallery-rail'&&piece.end&&Math.abs(piece.position[0]-(deck.position[0]-.31))<.1&&Math.min(piece.position[2],piece.end[2])<landing.position[2]&&Math.max(piece.position[2],piece.end[2])>landing.position[2]));
 assert.ok(p.pieces.some(piece=>piece.role==='floor-landing'&&Math.abs(piece.position[1]+piece.size[1]/2-keep.to[1])<.001&&Math.abs(piece.position[0]-keep.to[0])<=piece.size[0]/2+.000001&&Math.abs(piece.position[2]-keep.to[2])<=piece.size[2]/2+.000001));
 const tower=p.volumes.find(v=>v.role==='keep')!,door=p.openings.find(o=>o.wall===tower.id+'_wall_3'&&o.kind==='door'&&o.bottom>1)!;
 assert.ok(p.pieces.some(piece=>piece.role==='floor-landing'&&Math.abs(piece.position[1]+piece.size[1]/2-keep.to[1])<.001&&piece.position[2]-piece.size[2]/2<tower.z-door.width/2-.24&&piece.position[2]+piece.size[2]/2>tower.z+door.width/2+.24));
});
test('crowned tower roofs fit inside their merlons and the keep stairs have a real roof opening',()=>{
 const p=buildStructurePlan(fixture('castle',42,{roofPitch:1}));
 for(const v of p.volumes.filter(v=>['high-keep','gate-tower'].includes(v.role))){
  const r=p.roofs.find(r=>r.volume===v.id)!;
  const crown=p.pieces.find(piece=>piece.role==='castle-tower-crown-base'&&piece.position[0]===v.x&&piece.position[2]===v.z)!;
  assert.ok(crown.size[0]>v.width+1&&crown.size[2]>v.depth+1);
  assert.ok(crown.size[1]>.6);
  const foundation=p.pieces.find(piece=>piece.role==='foundation'&&piece.position[0]===v.x&&piece.position[2]===v.z)!;
  const supports=p.pieces.filter(piece=>piece.role==='castle-stone-corbel'&&piece.support===foundation.id);
  assert.ok(supports.length>=12);
  assert.ok(supports.every(piece=>piece.position[1]+piece.size[1]/2<=crown.position[1]-crown.size[1]/2+.000001));
  if(r.kind==='flat'){assert.equal(r.eaves,0);assert.ok(r.y<=crown.position[1]+crown.size[1]/2);continue;}
  assert.ok(crown.size[0]>r.width+2*r.eaves&&crown.size[2]>r.depth+2*r.eaves);
  for(const m of p.pieces.filter(m=>m.support===r.id&&m.role==='castle-crenel')){
   const outsideX=Math.abs(m.position[0]-r.x)-m.size[0]/2>r.width/2+r.eaves;
   const outsideZ=Math.abs(m.position[2]-r.z)-m.size[2]/2>r.depth/2+r.eaves;
   assert.ok(outsideX||outsideZ);
  }
 }
 const r=p.roofs.find(r=>r.accessHole)!,hole=r.accessHole!,geometry=buildRoof(r),material=new THREE.MeshBasicMaterial({side:THREE.DoubleSide}),mesh=new THREE.Mesh(geometry,material);
 assert.ok(r.plainEdge&&r.flatThickness===.40);
 assert.ok(!p.pieces.some(piece=>piece.support===r.id&&['roof-fascia','eave-fascia'].includes(piece.role)));
 mesh.updateMatrixWorld();const ray=new THREE.Raycaster(new THREE.Vector3(hole.x,r.y+2,hole.z),new THREE.Vector3(0,-1,0));
 assert.equal(ray.intersectObject(mesh).length,0);ray.set(new THREE.Vector3(r.x,r.y+2,r.z),new THREE.Vector3(0,-1,0));assert.ok(ray.intersectObject(mesh).length>0);
 geometry.dispose();material.dispose();
});


test('castle banners and turrets have clear walls and the new gallery stays between the gate towers',()=>{
 for(const seed of [1,42,777]){
  const p=buildStructurePlan(fixture('castle',seed));
  for(const v of p.volumes.filter(v=>v.role==='keep-turret'))assert.ok(!p.openings.some(o=>o.kind==='window'&&o.wall.startsWith(v.id+'_')));
  const keep=p.volumes.find(v=>v.role==='keep')!;
  assert.ok(!p.openings.some(o=>o.kind==='window'&&o.wall===keep.id+'_wall_3'));
  assert.ok(p.openings.filter(o=>o.kind==='window'&&o.wall===keep.id+'_wall_0').every(o=>Math.abs(o.offset)<.001));
  for(const v of p.volumes.filter(v=>v.role==='gate-tower'))assert.ok(!p.openings.some(o=>o.kind==='window'&&o.wall===v.id+'_wall_0'));
  for(const v of p.volumes.filter(v=>v.role==='gate-tower'||v.role==='corner-tower')){
   assert.equal(p.openings.filter(o=>o.kind==='door'&&o.wall===v.id+'_wall_'+(v.z<0?2:0)&&o.bottom>.1).length,v.role==='corner-tower'?1:0);
  }
  const gallery=p.pieces.filter(piece=>piece.role==='castle-door-gallery');assert.equal(gallery.length,1);
  const gates=p.volumes.filter(v=>v.role==='gate-tower').sort((a,b)=>a.x-b.x);
  assert.ok(Math.abs(gallery[0].position[0]-gallery[0].size[0]/2-(gates[0].x+gates[0].width/2))<.001);
  assert.ok(Math.abs(gallery[0].position[0]+gallery[0].size[0]/2-(gates[1].x-gates[1].width/2))<.001);
 }
});

test('wall tower crown choices vary with seed and keep the central towers covered',()=>{
 const variants=new Set<string>(),open=new Set<string>();
 for(const seed of [1,2,3,4,5,42,777]){
  const p=buildStructurePlan(fixture('castle',seed));
  const towers=p.volumes.filter(v=>['corner-tower','gate-tower'].includes(v.role));
  const choices=towers.map(v=>p.roofs.find(r=>r.volume===v.id)!.kind);
  variants.add(choices.join(','));
  towers.forEach((v,i)=>{if(choices[i]==='flat')open.add(String(i));});
  for(const v of p.volumes.filter(v=>['high-keep','keep-turret'].includes(v.role)))assert.equal(p.roofs.find(r=>r.volume===v.id)!.kind,'hip');
  assert.deepEqual(buildStructurePlan(fixture('castle',seed)),p);
 }
 assert.ok(variants.size>1);
 assert.equal(open.size,6);
});