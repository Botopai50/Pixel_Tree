import test from 'node:test';
import assert from 'node:assert/strict';
import {buildStructurePlan} from '../src/structures/plan';
import {fixture} from './structureFixtures';
test('tower crown supports do not hang through the wall-walk doorways',()=>{
 for(const seed of [1,42,2771,7732]){
  const plan=buildStructurePlan(fixture('fortress',seed)),wallHeight=plan.pieces.find(p=>p.role==='fortress-curtain')!.size[1];
  for(const tower of plan.pieces.filter(p=>p.role==='fortress-tower')){
   const radius=tower.size[0]/2,top=Math.min(tower.size[1]+.02,.24+wallHeight+1.65);
   for(const beam of plan.pieces.filter(p=>p.support===tower.id&&p.material==='wood'&&p.kind==='beam'&&p.role.startsWith('fortress-tower-'))){
    for(let i=0;i<=20;i++){
     const t=i/20,x=beam.position[0]+(beam.end![0]-beam.position[0])*t-tower.position[0],z=beam.position[2]+(beam.end![2]-beam.position[2])*t-tower.position[2],y=beam.position[1]+(beam.end![1]-beam.position[1])*t;
     if(y<.24+wallHeight-.06||y>top+.06)continue;
     const crossesX=Math.abs(z)<.68&&x*-Math.sign(tower.position[0])>radius*Math.cos(Math.PI/12)-.30;
     const crossesZ=Math.abs(x)<.68&&z*-Math.sign(tower.position[2])>radius*Math.cos(Math.PI/12)-.30;
     assert.ok(!crossesX&&!crossesZ,`${beam.role} crosses a tower doorway`);
    }
   }
  }
 }
});
test('perimeter timber floors do not share a plane with the stone cap',()=>{
 const plan=buildStructurePlan(fixture('fortress',2771));
 for(const deck of plan.pieces.filter(p=>p.role==='fortress-timber-walk')){
  const stone=plan.pieces.find(p=>p.role==='fortress-wall-walk'&&p.support===deck.support)!;
  assert.ok(deck.position[1]-deck.size[1]/2>stone.position[1]+stone.size[1]/2+.01,'deck underside must clear the stone cap');
 }
});
test('wall stairs meet the perimeter gallery through an open guardrail gap',()=>{
 for(const seed of [1,42,7732]){
  const plan=buildStructurePlan(fixture('fortress',seed));
  const landing=plan.pieces.find(p=>p.role==='fortress-stair-landing')!;
  const deck=plan.pieces.filter(p=>p.role==='fortress-timber-walk').sort((a,b)=>a.position[0]-b.position[0])[0];
  const top=landing.position[1]+landing.size[1]/2;
  assert.ok(Math.abs(top-deck.position[1]-deck.size[1]/2)<1e-6);
  assert.ok(Math.abs(landing.position[0]-landing.size[0]/2-deck.position[0]-deck.size[0]/2)<1e-6);
  const minZ=landing.position[2]-landing.size[2]/2,maxZ=landing.position[2]+landing.size[2]/2;
  const stairs=plan.pieces.find(p=>p.kind==='stairs'&&Math.abs(p.end![1]-top)<1e-6)!;
  assert.ok(stairs);assert.ok(Math.abs(stairs.end![2]-minZ)<1e-6);
  const wall=plan.pieces.find(p=>p.id===deck.support)!;
  assert.ok(stairs.position[0]-stairs.size[0]/2>wall.position[0]+wall.size[0]/2+.05,'stone steps must not penetrate the curtain');
  for(const rail of plan.pieces.filter(p=>p.role==='fortress-walk-rail'&&p.support===deck.id))assert.ok(rail.end![2]<=minZ+1e-6||rail.position[2]>=maxZ-1e-6,'rail must leave the stair exit open');
 }
});
test('gallery landing has a full guarded platform without overlapping deck faces',()=>{
 for(const seed of [1,42,2590,7732]){
  const plan=buildStructurePlan(fixture('fortress',seed));
  const side=plan.pieces.find(p=>p.role==='fortress-gallery-side')!,landing=plan.pieces.find(p=>p.role==='fortress-gallery-landing')!;
  assert.ok(landing.size[2]>=.9,'landing needs turning space');
  assert.ok(side.position[2]+side.size[2]/2<=landing.position[2]-landing.size[2]/2+1e-6,'coplanar decks must only meet at their edges');
  assert.equal(plan.pieces.filter(p=>p.role==='fortress-gallery-end-rail').length,2);
  assert.ok(plan.pieces.filter(p=>p.role==='fortress-gallery-landing-rail').length>=4);
 }
});
test('lower tower braces leave the inward courtyard quadrant clear',()=>{
 const plan=buildStructurePlan(fixture('fortress',42));
 for(const tower of plan.pieces.filter(p=>p.role==='fortress-tower')){
  const belt=plan.pieces.find(p=>p.support===tower.id&&p.role==='fortress-tower-connection-belt')!;
  for(const brace of plan.pieces.filter(p=>p.support===tower.id&&p.role==='fortress-tower-crown-brace'&&p.position[1]<belt.position[1])){
   const dx=brace.position[0]-tower.position[0],dz=brace.position[2]-tower.position[2];
   assert.ok(!(dx*Math.sign(tower.position[0])<=1e-6&&dz*Math.sign(tower.position[2])<=1e-6),'inward tower supports obstruct the passage');
  }
 }
});
test('fortress seeds vary watchtower count, corners and tower height order',()=>{
 const counts=new Set<number>(),corners=new Set<string>(),heightOrders=new Set<string>();
 for(let seed=1;seed<=24;seed++){
  const config=fixture('fortress',seed),plan=buildStructurePlan(config);
  const towers=plan.pieces.filter(p=>p.role==='fortress-tower');
  const roofs=plan.pieces.filter(p=>p.role==='fortress-watch-roof');
  assert.ok(roofs.length===1||roofs.length===2);counts.add(roofs.length);
  const selected=new Set<string>();
  for(const roof of roofs){
   const loft=plan.pieces.find(p=>p.id===roof.support)!;
   const tower=towers.find(p=>p.id===loft.support)!;
   selected.add(tower.id);corners.add(`${Math.sign(tower.position[0])},${Math.sign(tower.position[2])}`);
   assert.equal(roof.position[0],tower.position[0]);assert.equal(roof.position[2],tower.position[2]);
   assert.ok(!plan.pieces.some(p=>p.role==='fortress-merlon'&&p.support===tower.id));
  }
  assert.equal(selected.size,roofs.length);
  heightOrders.add(towers.map((p,i)=>({i,h:p.size[1]})).sort((a,b)=>a.h-b.h).map(p=>p.i).join(','));
  assert.deepEqual(plan,buildStructurePlan(config));
 }
 assert.deepEqual([...counts].sort(),[1,2]);assert.equal(corners.size,4);
 assert.ok(heightOrders.size>=4,'tower heights must not follow a fixed front/rear pattern');
});
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
