import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {fixture} from './structureFixtures';
import {buildStructurePlan} from '../src/structures/plan';
import {renderStructure} from '../src/structures/renderer';
import {normalizeStructureConfig} from '../src/structures/config';
import {createStructure} from '../src/structures/generator';
import type {BridgeStyle} from '../src/structures/types';

test('bridge styles produce distinct supported, deterministic geometry at small and large dimensions',()=>{
 for(const style of ['stoneArch','covered','suspension','stepped'] as BridgeStyle[])for(const patch of [{},{width:3,depth:2,height:2},{width:30,depth:8,height:9}]){
  const source=fixture('bridge',42,{...patch,bridgeStyle:style}),plan=buildStructurePlan(source);
  assert.deepEqual(plan,buildStructurePlan(source));
  const role=style==='stoneArch'?'bridge-stone-arch':style==='covered'?'bridge-covered-roof':style==='suspension'?'bridge-rope-hanger':'bridge-deck-girder';
  assert.ok(plan.pieces.some(p=>p.role===role));
  const render=renderStructure(plan,normalizeStructureConfig(source.structure));
  assert.ok(!render.bounds.isEmpty());
  render.assetGroup.traverse(o=>{if(o instanceof THREE.Mesh)assert.ok(Array.from(o.geometry.getAttribute('position').array).every(Number.isFinite));});
  render.dispose();
 }
 const suspended=buildStructurePlan(fixture('bridge',42,{bridgeStyle:'suspension'}));
 const boards=suspended.pieces.filter(p=>p.role==='deck-plank');
 assert.ok(boards[Math.floor(boards.length/2)].position[1]<boards[0].position[1]);
 assert.ok(!suspended.pieces.some(p=>p.role==='bridge-pier'));
});

test('covered bridge has clear timber side panels without diagonal overlay',()=>{
 const plan=buildStructurePlan(fixture('bridge',42,{bridgeStyle:'covered'}));
 const panels=plan.pieces.filter(p=>p.role==='bridge-covered-side-board');
 assert.ok(panels.length>0);
 assert.ok(!plan.pieces.some(p=>p.role==='bridge-rail-brace'));
 assert.ok(plan.pieces.some(p=>p.role==='bridge-covered-brace'));
});

test('suspension ropes tie into treads and four wrapped towers on solid bank landings',()=>{
 const plan=buildStructurePlan(fixture('bridge',42,{bridgeStyle:'suspension'}));
 const towers=plan.pieces.filter(p=>p.role==='bridge-rope-tower');
 assert.equal(towers.length,4);
 for(const tower of towers){
  const wraps=plan.pieces.filter(p=>p.role==='bridge-rope-wrap'&&p.support===tower.id);
  assert.equal(wraps.length,4);
  assert.ok(wraps.every(p=>p.size[0]>tower.size[0]+p.size[1]&&p.size[2]>tower.size[2]+p.size[1]));
 }
 const hangers=plan.pieces.filter(p=>p.role==='bridge-rope-hanger');
 assert.ok(hangers.length>=6);
 for(const hanger of hangers){
  const board=plan.pieces.find(p=>p.id===hanger.support)!;
  assert.equal(board.role,'deck-plank');
  assert.equal(board.position[0],hanger.position[0]);
  assert.ok(hanger.end![1]>hanger.position[1]+1);
  assert.ok(plan.pieces.some(p=>p.role==='bridge-rope-tread-lashing'&&p.support===board.id));
 }
 assert.ok(!plan.pieces.some(p=>p.role==='bridge-pier'));
 const landings=plan.pieces.filter(p=>p.role==='bridge-rope-landing'),landingY=landings[0].position[1]+landings[0].size[1]/2;
 for(const bar of plan.pieces.filter(p=>p.role==='bridge-rope-end-crossbar'))assert.ok(bar.position[1]-bar.size[0]/2-landingY>=2.25,'portal must leave walking headroom');
 const stairs=plan.accesses.filter(p=>p.role==='stairs');assert.equal(stairs.length,2);
 for(const access of stairs){
  assert.equal(access.from[1],0);assert.equal(access.to[1],landingY);
  const treads=plan.pieces.filter(p=>p.role==='bridge-stair-tread'&&Math.sign(p.position[0])===Math.sign(access.to[0]));
  assert.ok(treads.length>2);
  assert.ok(Math.abs(Math.max(...treads.map(p=>p.position[1]+p.size[1]/2))-landingY)<1e-8);
 }
 assert.equal(plan.pieces.filter(p=>p.role==='bridge-variant-bank').length,2);
 assert.ok(plan.pieces.some(p=>p.role==='bridge-rope-anchor-brace'));
});

test('stepped bridge has a raised stone bank and a lower horizontal river span',()=>{
 const plan=buildStructurePlan(fixture('bridge',42,{bridgeStyle:'stepped'}));
 const water=plan.propZones.find(z=>z.kind==='water')!;
 const riverBoards=plan.pieces.filter(p=>p.role==='deck-plank'&&Math.abs(p.position[0]-water.x)<water.width/2);
 assert.ok(riverBoards.length>4);
 assert.ok(riverBoards.every(p=>p.position[1]===riverBoards[0].position[1]));
 const landings=plan.pieces.filter(p=>p.role==='deck-plank');
 assert.ok(Math.max(...landings.map(p=>p.position[1]))>riverBoards[0].position[1]+.7);
 assert.ok(plan.accesses.some(s=>s.to[1]>s.from[1])&&plan.accesses.filter(s=>s.to[1]<s.from[1]).length===2);
 for(const tread of plan.pieces.filter(p=>p.role==='bridge-stair-tread')){
  const stone=plan.pieces.find(p=>p.id===tread.support)!;
  assert.equal(stone.material,'stone');
  assert.ok(Math.abs(stone.position[1]+stone.size[1]/2-(tread.position[1]-.07))<1e-8);
 }
 assert.ok(!plan.pieces.some(p=>p.material==='stone'&&p.size[2]>1&&Math.abs(p.position[0]-water.x)<water.width/2));
});

test('timber bridge has supported piers, braced rail bays and stairs meeting both landings',()=>{
 for(const patch of [{},{width:3,depth:2,height:2},{width:30,depth:8,height:9}])for(const seed of [1,42,7010]){
  const source=fixture('bridge',seed,patch),plan=buildStructurePlan(source);
  assert.deepEqual(plan,buildStructurePlan(source));
  const deck=plan.pieces.find(p=>p.role==='deck')!,boards=plan.pieces.filter(p=>p.role==='deck-plank');
  assert.ok(boards.length>=8&&boards.every(p=>p.support===deck.id));
  const piers=plan.pieces.filter(p=>p.role==='bridge-pier');
  assert.ok(piers.length>=6);
  assert.ok(piers.every(p=>plan.pieces.find(foot=>foot.id===p.support)?.material==='stone'));
  const masonry=plan.pieces.filter(p=>p.role==='bridge-abutment'||p.role==='bridge-stair-retaining-wall');
  for(const bank of plan.pieces.filter(p=>p.role==='bridge-abutment')){
   const side=Math.sign(bank.position[0]);
   const endPier=piers.filter(p=>Math.sign(p.position[0])===side).sort((a,b)=>Math.abs(b.position[0])-Math.abs(a.position[0]))[0];
   assert.ok(Math.abs(Math.abs(bank.position[0])-bank.size[0]/2-Math.abs(endPier.position[0]))<1e-8,'river-facing stone edge must align with the middle of the landing pier');
  }
  for(const pier of piers)for(const stone of masonry){
   const xOverlap=Math.abs(pier.position[0]-stone.position[0])<(pier.size[0]+stone.size[0])/2;
   if(xOverlap)assert.ok(Math.abs(Math.abs(pier.position[2])-(Math.abs(stone.position[2])+stone.size[2]/2))<1e-8,'side of bank masonry must align with the middle of the timber pier');
  }
  assert.ok(plan.pieces.some(p=>p.role==='bridge-pier-brace'));
  assert.ok(plan.pieces.some(p=>p.role==='bridge-rail-brace'));
  for(const rail of plan.pieces.filter(p=>p.role==='bridge-stair-handrail')){
   for(const post of plan.pieces.filter(p=>p.role==='bridge-stair-post'&&Math.abs(p.position[2]-rail.position[2])<1e-8)){
    const left=Math.max(Math.min(rail.position[0],rail.end![0]),post.position[0]-post.size[0]/2);
    const right=Math.min(Math.max(rail.position[0],rail.end![0]),post.position[0]+post.size[0]/2);
    assert.ok(right-left<1e-8,'stair handrails must terminate at post faces rather than pass through the posts');
   }
  }
  assert.equal(plan.accesses.length,2);
  const walkingY=boards[0].position[1]+boards[0].size[1]/2;
  for(const access of plan.accesses){
   assert.ok(Math.abs(access.to[1]-walkingY)<1e-8);
   const sign=Math.sign(access.from[0]),treads=plan.pieces.filter(p=>p.role==='bridge-stair-tread'&&Math.sign(p.position[0])===sign);
   assert.ok(treads.length>1);
   assert.ok(Math.abs(Math.max(...treads.map(p=>p.position[1]+p.size[1]/2))-walkingY)<1e-8);
   assert.ok(treads.every(p=>p.size[1]===.14));
   {
    const stones=plan.pieces.filter(p=>p.role==='bridge-stair-retaining-wall'&&Math.sign(p.position[0])===sign).sort((a,b)=>Math.abs(a.position[0])-Math.abs(b.position[0]));
    assert.equal(stones.length,treads.length);
    assert.ok(stones.every(p=>p.position[2]===0&&p.size[2]>access.width-.2),'stone must fill the centre underneath the stairs');
    assert.ok(Math.abs(Math.abs(stones[0].position[0])-stones[0].size[0]/2-Math.abs(access.to[0]))<1e-8);
    assert.ok(Math.abs(Math.abs(stones.at(-1)!.position[0])+stones.at(-1)!.size[0]/2-Math.abs(access.from[0]))<1e-8,'masonry must reach the stair foot');
    for(let i=1;i<stones.length;i++)assert.ok(Math.abs(Math.abs(stones[i].position[0])-stones[i].size[0]/2-(Math.abs(stones[i-1].position[0])+stones[i-1].size[0]/2))<1e-8,'stair masonry must have no gaps');
   }
  }
  const water=plan.propZones.find(z=>z.kind==='water')!;
  assert.ok(water.width<deck.size[0]&&water.depth>deck.size[2]);
 }
});

test('bridge renders finite timber and iron geometry with owned resources',()=>{
 const source=fixture('bridge'),render=renderStructure(buildStructurePlan(source),normalizeStructureConfig(source.structure));
 render.assetGroup.traverse(object=>{
  if(!(object instanceof THREE.Mesh))return;
  const positions=object.geometry.getAttribute('position');
  assert.ok(Array.from(positions.array).every(Number.isFinite));
  assert.ok(render.resources.geometries.has(object.geometry));
  assert.ok(render.resources.materials.has(object.material as THREE.Material));
 });
 assert.ok(!render.bounds.isEmpty());render.dispose();render.dispose();
});

test('river water keeps metre UVs and bank decoration stays out of the stream',()=>{
 const asset=createStructure(fixture('bridge',42,{scale:1.5,vegetation:.8}));
 const water=asset.group.getObjectByName('PresentationWater') as THREE.Mesh;
 const position=water.geometry.getAttribute('position'),uv=water.geometry.getAttribute('uv');
 for(let i=0;i<uv.count;i++){
  assert.ok(Math.abs(uv.getX(i)-position.getX(i)/1.5)<1e-5);
  assert.ok(Math.abs(uv.getY(i)-position.getZ(i)/1.5)<1e-5);
 }
 const plan=asset.group.userData.structurePlan;
 const zone=plan.propZones.find((z:{kind:string})=>z.kind==='water');
 const nature=asset.group.getObjectByName('StructureVegetation')!;
 for(const child of nature.children)assert.ok(Math.abs(child.position.x-zone.x)>=zone.width/2||Math.abs(child.position.z-zone.z)>=zone.depth/2);
 asset.dispose();
});
