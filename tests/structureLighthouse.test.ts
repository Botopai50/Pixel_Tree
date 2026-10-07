import test from 'node:test';
import assert from 'node:assert/strict';
import {buildStructurePlan} from '../src/structures/plan';
import {renderStructure} from '../src/structures/renderer';
import {fixture} from './structureFixtures';
import {STONE_COURSE_HEIGHT} from '../src/structures/surfacePainting';

test('intact lighthouses retain at least one window across seeds and sparse settings',()=>{
 const counts=new Set<number>();
 for(const openingDensity of [0,.1,.6])for(let seed=0;seed<64;seed++){
  const asset=fixture('lighthouse',seed,{openingDensity});
  const plan=buildStructurePlan(asset),windows=plan.openings.filter(o=>o.kind==='window');
  assert.ok(windows.length>0,`seed ${seed}, density ${openingDensity}`);
  counts.add(windows.length);
  assert.deepEqual(plan,buildStructurePlan(asset));
 }
 assert.ok(counts.size>1);
 for(const height of [2,39])assert.ok(buildStructurePlan(fixture('lighthouse',1,{height,openingDensity:0})).openings.some(o=>o.kind==='window'));
});

test('lighthouse pavilion remains supported above its balcony across seeds and dimensions',()=>{
 for(const patch of [{},{width:6,depth:15,height:2},{width:15,depth:6,height:39}])for(const seed of [1,42,7010]){
  const asset=fixture('lighthouse',seed,patch),plan=buildStructurePlan(asset);
  assert.deepEqual(plan,buildStructurePlan(asset));
  const deck=plan.pieces.find(p=>p.role==='lantern-deck')!;
  const shaft=plan.volumes.find(v=>v.role==='lighthouse-tower')!;
  const foot=plan.pieces.find(p=>p.role==='lighthouse-foot')!;
  const step=plan.pieces.find(p=>p.role==='lighthouse-foot-step')!;
  assert.equal(foot.size[1],STONE_COURSE_HEIGHT);
  assert.equal(step.size[1],STONE_COURSE_HEIGHT);
  assert.ok(step.size[0]>shaft.width+.8&&step.size[2]>shaft.depth+.8);
  assert.ok(foot.size[0]>step.size[0]&&foot.size[2]>step.size[2]);
  assert.ok(Math.abs(foot.position[1]-foot.size[1]/2)<1e-9);
  assert.ok(Math.abs(step.position[1]-step.size[1]/2-(foot.position[1]+foot.size[1]/2))<1e-9);
  assert.ok(Math.abs(shaft.bottom-(step.position[1]+step.size[1]/2))<1e-9);
  assert.ok(deck.size[0]>shaft.width&&deck.size[2]>shaft.depth);
  assert.ok(deck.position[1]>shaft.bottom+shaft.height);
  const roof=plan.roofs.find(r=>r.id==='lighthouse-pavilion-roof')!;
  assert.equal(roof.kind,'hip');
  const posts=plan.pieces.filter(p=>p.role==='lighthouse-pavilion-post');
  assert.equal(posts.length,4);
  assert.ok(posts.every(p=>p.support===deck.id&&p.end![1]===roof.y));
  assert.equal(plan.pieces.filter(p=>p.role==='lighthouse-balcony-rail').length,8);
  const fascia=plan.pieces.find(p=>p.role==='lighthouse-deck-fascia')!;
  const lowerCollars=plan.pieces.filter(p=>p.role==='lighthouse-post-cap'&&p.position[1]<deck.position[1]+.5);
  assert.ok(lowerCollars.length>0);
  assert.ok(lowerCollars.every(p=>p.size[0]>fascia.size[0]+.02&&p.size[2]>fascia.size[0]+.02));
  const lantern=plan.pieces.find(p=>p.role==='lantern')!;
  assert.ok(lantern.position[1]-lantern.size[1]/2>deck.position[1]);
  assert.ok(lantern.position[1]+lantern.size[1]/2<roof.y);
 }
});

test('lighthouse beacon uses a warm emissive material and releases its resources',()=>{
 const asset=fixture('lighthouse'),render=renderStructure(buildStructurePlan(asset),asset.structure);
 assert.ok(render.materials.cloth.emissiveIntensity>0);
 assert.ok(render.materials.cloth.emissive.r>render.materials.cloth.emissive.b);
 assert.ok(!render.bounds.isEmpty());
 let disposed=0;render.materials.cloth.addEventListener('dispose',()=>disposed++);
 render.dispose();render.dispose();assert.equal(disposed,1);
});
