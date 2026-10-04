import test from 'node:test';
import assert from 'node:assert/strict';
import {buildStructurePlan} from '../src/structures/plan';
import {fixture} from './structureFixtures';
test('gallery supports leave the hall doorway clear and stairs run beside the house',()=>{
 for(const seed of [42,7732,2590]){
  const plan=buildStructurePlan(fixture('fortress',seed)),hall=plan.volumes.find(v=>v.role==='barracks')!;
  const door=plan.openings.find(o=>o.wall===hall.id+'_wall_0'&&o.kind==='door')!,doorX=hall.x+door.offset;
  for(const post of plan.pieces.filter(p=>p.role==='fortress-gallery-post'))assert.ok(Math.abs(post.position[0]-doorX)>door.width/2+.18);
  const gallery=plan.pieces.find(p=>p.role==='fortress-gallery')!,stairs=plan.pieces.find(p=>p.kind==='stairs'&&Math.abs(p.end![1]-gallery.position[1])<1e-5)!;
  assert.ok(stairs.position[0]>hall.x+hall.width/2,'stairs move to the other side of the hall');
  assert.ok(stairs.end![2]>stairs.position[2],'stairs climb toward the side gallery');
  assert.ok(plan.pieces.some(p=>p.role==='fortress-gallery-side'));
 }
});
test('fortress leaves its central court free of buildings and gallery stairs',()=>{
 for(const seed of [42,7732,2590]){
  const plan=buildStructurePlan(fixture('fortress',seed)),gallery=plan.pieces.find(p=>p.role==='fortress-gallery')!;
  for(const volume of plan.volumes){
   const outsideCenter=volume.x-volume.width/2>1.2||volume.x+volume.width/2<-.6||volume.z-volume.depth/2>1;
   assert.ok(outsideCenter,'buildings must leave a central passage');
  }
  const stairs=plan.pieces.find(p=>p.kind==='stairs'&&Math.abs(p.end![1]-gallery.position[1])<1e-5)!;
  const hall=plan.volumes.find(v=>v.role==='barracks')!;
  assert.ok(stairs.position[0]-stairs.size[0]/2>hall.x+hall.width/2,'gallery stairs stay outside the court center');
 }
});
test('store roof clears the gallery including its eaves across sizes and seeds',()=>{
 for(const [width,depth] of [[12,10],[16,14],[22,19]])for(const seed of [42,7732,2590]){
  const plan=buildStructurePlan(fixture('fortress',seed,{width,depth}));
  const store=plan.volumes.find(v=>v.role==='fortress-store')!,roof=plan.roofs.find(r=>r.volume===store.id)!;
  const gallery=plan.pieces.find(p=>p.role==='fortress-gallery')!;
  assert.ok(roof.x+roof.width/2+roof.eaves<=gallery.position[0]-gallery.size[0]/2-.20,'store roof stays beside the gallery');
 }
});
test('compact fortress has round corner towers, courtyard, arched gate and connected walks',()=>{
 for(const seed of [1,42,2590]){
  const plan=buildStructurePlan(fixture('fortress',seed));
  const towers=plan.pieces.filter(p=>p.role==='fortress-tower');
  assert.equal(towers.length,4);
  assert.ok(new Set(towers.map(p=>p.size[1].toFixed(2))).size>1);
  assert.ok(plan.pieces.some(p=>p.role==='fortress-gate-wall'));
  assert.equal(plan.pieces.filter(p=>p.role==='fortress-banner').length,2);
  assert.ok(plan.pieces.some(p=>p.role==='fortress-courtyard'));
  assert.ok(plan.accesses.some(p=>p.role==='stairs'&&p.to[1]>2));
  assert.ok(plan.volumes.some(v=>v.role==='barracks'));
  const ids=new Set([...plan.pieces.map(p=>p.id),...plan.walls.map(p=>p.id),...plan.roofs.map(p=>p.id)]);
  for(const p of plan.pieces)assert.ok(p.support==='ground'||ids.has(p.support),p.role);
  assert.deepEqual(plan,buildStructurePlan(fixture('fortress',seed)));
 }
});

test('supplies leave the store-to-gallery corridor and store door clear',()=>{
 for(const seed of [42,7732,2590]){
  const plan=buildStructurePlan(fixture('fortress',seed)),store=plan.volumes.find(v=>v.role==='fortress-store')!;
  for(const crate of plan.pieces.filter(p=>p.role==='fortress-supply-crate')){
   assert.ok(crate.position[0]-crate.size[0]/2>store.x+store.width/2,'crates remain in the side supply bay');
   assert.ok(crate.position[2]+crate.size[2]/2<store.z+store.depth/2+.25,'crates do not spill into the rear walk');
  }
 }
});

test('side gallery and stairs fit inside the curtain at different fortress sizes',()=>{
 for(const [width,depth] of [[12,10],[16,14],[22,19]])for(const seed of [42,7732,2590]){
  const plan=buildStructurePlan(fixture('fortress',seed,{width,depth})),side=plan.pieces.find(p=>p.role==='fortress-gallery-side')!;
  const stair=plan.pieces.find(p=>p.kind==='stairs'&&Math.abs(p.end![1]-side.position[1])<1e-5)!;
  const curtain=plan.pieces.filter(p=>p.role==='fortress-curtain').sort((a,b)=>b.position[0]-a.position[0])[0];
  assert.ok(stair.size[0]>.4);
  assert.ok(stair.position[0]+stair.size[0]/2<curtain.position[0]-curtain.size[0]/2);
  const landing=plan.pieces.find(p=>p.role==='fortress-gallery-landing')!;
  assert.ok(Math.abs(stair.end![2]-landing.position[2])<=landing.size[2]/2);
 }
});

test('store and its eaves leave a clear approach to the gallery staircase',()=>{
 for(const [width,depth] of [[12,10],[16,14],[22,19]])for(const seed of [42,7732,2590]){
  const plan=buildStructurePlan(fixture('fortress',seed,{width,depth}));
  const store=plan.volumes.find(v=>v.role==='fortress-store')!,roof=plan.roofs.find(r=>r.volume===store.id)!;
  const gallery=plan.pieces.find(p=>p.role==='fortress-gallery')!;
  const stair=plan.pieces.find(p=>p.kind==='stairs'&&Math.abs(p.end![1]-gallery.position[1])<1e-5)!;
  const hall=plan.volumes.find(v=>v.role==='barracks')!;
  assert.equal(store.z,hall.z,'store aligns alongside the house');
  assert.ok(stair.position[0]-stair.size[0]/2-(roof.x+roof.width/2+roof.eaves)>=1.5,'store stays on the opposite side of the house');
 }
});


test('stone entrance meets the gate without a bridge or chains',()=>{
 for(const seed of [42,7732,2590]){
  const plan=buildStructurePlan(fixture('fortress',seed));
  const deck=plan.pieces.find(p=>p.role==='fortress-entry-threshold')!,gate=plan.pieces.find(p=>p.role==='fortress-gate')!;
  assert.ok(deck.position[2]+deck.size[2]/2>=gate.position[2]-gate.size[2]/2);
  assert.ok(Math.abs(deck.position[1]+deck.size[1]/2-.24)<1e-5);
  assert.equal(deck.material,'stone');
  assert.ok(!plan.pieces.some(p=>p.role.includes('bridge')));
 }
});


test('gate center strip reaches the arched crown',()=>{
 const plan=buildStructurePlan(fixture('fortress',7732));
 const gate=plan.pieces.find(p=>p.role==='fortress-gate')!,seam=plan.pieces.find(p=>p.role==='fortress-gate-seam')!;
 const crown=gate.position[1]+gate.size[1]/2+gate.size[0]/2;
 assert.ok(Math.abs(seam.position[1]+seam.size[1]/2-crown)<.01);
 assert.ok(Math.abs(seam.position[1]-seam.size[1]/2-(gate.position[1]-gate.size[1]/2))<1e-5);
});

test('outer tower and curtain bases reach the ground',()=>{
 const plan=buildStructurePlan(fixture('fortress',7732));
 for(const foot of plan.pieces.filter(p=>['fortress-tower-foot','fortress-buttress-foot','fortress-curtain-foot'].includes(p.role)))assert.ok(Math.abs(foot.position[1]-foot.size[1]/2)<1e-6,foot.role);
 for(const wall of plan.pieces.filter(p=>p.role==='fortress-curtain')){
  assert.ok(plan.pieces.some(p=>p.role==='fortress-curtain-foot'&&p.support===wall.id),'each outer wall has a ground foundation');
 }
});

test('tower passages stay open across narrow facets',async()=>{
 const THREE=await import('three'),{buildFortressTower}=await import('../src/structures/geometry/fortress');
 for(const [width,depth] of [[12,10],[16,14],[22,19]]){
  const plan=buildStructurePlan(fixture('fortress',7732,{width,depth})),walk=plan.pieces.find(p=>p.role==='fortress-curtain')!.size[1];
  for(const tower of plan.pieces.filter(p=>p.role==='fortress-tower')){
   const geometry=buildFortressTower(tower,walk),material=new THREE.MeshBasicMaterial({side:THREE.DoubleSide}),mesh=new THREE.Mesh(geometry,material);
   for(const [nx,nz] of [[tower.position[0]<0?1:-1,0],[0,tower.position[2]<0?1:-1]])for(const lateral of [-.45,0,.45]){
    const origin=new THREE.Vector3(tower.position[0]+nx*(tower.size[0]/2+1)-nz*lateral,.24+walk+.6,tower.position[2]+nz*(tower.size[0]/2+1)+nx*lateral);
    const ray=new THREE.Raycaster(origin,new THREE.Vector3(-nx,0,-nz),0,1.6);
    assert.equal(ray.intersectObject(mesh).length,0,'full passage width must be open');
   }
   geometry.dispose();material.dispose();
  }
 }
});

test('pixel banners are single flat planes with an alpha texture',async()=>{
 const {buildFortressBanner,createFortressBannerTexture}=await import('../src/structures/geometry/fortress');
 const plan=buildStructurePlan(fixture('fortress',7732));
 assert.ok(!plan.pieces.some(p=>p.role.startsWith('fortress-banner-pixel')));
 for(const banner of plan.pieces.filter(p=>p.role==='fortress-banner'||p.role==='fortress-tower-standard')){
  const geometry=buildFortressBanner(banner);geometry.computeBoundingBox();
  assert.equal(geometry.getAttribute('position').count,4);
  assert.equal(geometry.boundingBox!.min.z,geometry.boundingBox!.max.z);geometry.dispose();
 }
 const texture=createFortressBannerTexture();assert.equal(texture.image.width,16);assert.equal(texture.image.height,32);
 assert.ok(Array.from(texture.image.data).filter((_,i)=>i%4===3).includes(0));texture.dispose();
});


test('gallery braces join a post at the lower end and the deck at the upper end',()=>{
 for(const seed of [42,2590,7732]){
  const plan=buildStructurePlan(fixture('fortress',seed));
  for(const brace of plan.pieces.filter(p=>p.role==='fortress-gallery-brace')){
   const post=plan.pieces.find(p=>p.support===brace.support&&p.role.endsWith('post')&&Math.hypot(p.position[0]-brace.position[0],p.position[2]-brace.position[2])<1e-6);
   assert.ok(post,'lower brace end must touch a gallery post');
   const deck=plan.pieces.find(p=>p.id===brace.support)!;
   assert.ok(Math.abs(brace.end![1]-(deck.position[1]-deck.size[1]/2))<1e-6);
   assert.ok(Math.abs(brace.end![0]-deck.position[0])<=deck.size[0]/2);
   assert.ok(Math.abs(brace.end![2]-deck.position[2])<=deck.size[2]/2);
  }
 }
});


test('hall keeps one upper window clear of the gallery as its footprint grows',()=>{
 for(const [width,depth] of [[12,10],[16,14],[22,19],[30,26]])for(const seed of [42,2590,7732]){
  const plan=buildStructurePlan(fixture('fortress',seed,{width,depth}));
  const hall=plan.volumes.find(v=>v.role==='barracks')!,gallery=plan.pieces.find(p=>p.role==='fortress-gallery')!;
  const windows=plan.openings.filter(o=>o.wall.startsWith(hall.id+'_wall_')&&o.kind==='window');
  assert.equal(windows.length,1);
  assert.ok(windows[0].id.endsWith('_gable_window'));
  assert.ok(hall.bottom+windows[0].bottom-.14>gallery.position[1]+.73+.085/2);
  assert.ok(windows[0].bottom<hall.height);
 }
});
