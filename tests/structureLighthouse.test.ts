import test from 'node:test';
import assert from 'node:assert/strict';
import {buildStructurePlan} from '../src/structures/plan';
import {renderStructure} from '../src/structures/renderer';
import {fixture} from './structureFixtures';

test('lighthouse pavilion remains supported above its balcony across seeds and dimensions',()=>{
 for(const patch of [{},{width:6,depth:15,height:2},{width:15,depth:6,height:39}])for(const seed of [1,42,7010]){
  const asset=fixture('lighthouse',seed,patch),plan=buildStructurePlan(asset);
  assert.deepEqual(plan,buildStructurePlan(asset));
  const deck=plan.pieces.find(p=>p.role==='lantern-deck')!;
  const shaft=plan.volumes.find(v=>v.role==='lighthouse-tower')!;
  assert.ok(deck.size[0]>shaft.width&&deck.size[2]>shaft.depth);
  assert.ok(deck.position[1]>shaft.bottom+shaft.height);
  const roof=plan.roofs.find(r=>r.id==='lighthouse-pavilion-roof')!;
  assert.equal(roof.kind,'hip');
  const posts=plan.pieces.filter(p=>p.role==='lighthouse-pavilion-post');
  assert.equal(posts.length,4);
  assert.ok(posts.every(p=>p.support===deck.id&&p.end![1]===roof.y));
  assert.equal(plan.pieces.filter(p=>p.role==='lighthouse-balcony-rail').length,8);
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
