import test from 'node:test';import assert from 'node:assert/strict';
import {buildStructurePlan} from '../src/structures/plan';
import {buildRoof} from '../src/structures/geometry/roofs';
import {trimAtWall} from '../src/structures/geometry/abutment';
import {fixture} from './structureFixtures';
test('attached house roofs end at the host wall and below its eaves',()=>{
 for(const type of ['house','largeHouse','mansion'] as const)for(const seed of [1,42,2771]){
  const plan=buildStructurePlan(fixture(type,seed)),main=plan.volumes[0];
  for(const roof of plan.roofs.filter(roof=>roof.abutment)){
   assert.ok(roof.y+roof.rise<=main.bottom+main.height-.15);
   const plane=roof.abutment!,geometry=trimAtWall(buildRoof(roof),plane),positions=geometry.getAttribute('position');
   assert.ok(positions.count>0);
   for(let i=0;i<positions.count;i++)assert.ok(plane.keep*(positions.array[i*3+plane.axis]-plane.value)>-1e-5);
   geometry.dispose();
  }
 }
});
test('crowded annexes slope outward while spacious annexes retain roof variety',()=>{
 const kinds=new Set<string>();
 for(const type of ['house','largeHouse','mansion'] as const){
  let found=false;
  for(let seed=1;seed<=12;seed++){
   const plan=buildStructurePlan(fixture(type,seed));
   for(const roof of plan.roofs.filter(r=>r.abutment)){
    kinds.add(roof.kind);
    if(roof.shedAxis===undefined)continue;
    found=true;assert.equal(roof.kind,'shed');assert.equal(roof.shedAxis,roof.abutment!.axis);assert.equal(roof.shedDirection,-roof.abutment!.keep);
    const v=plan.volumes.find(v=>v.id===roof.volume)!;
    for(const wall of plan.walls.filter(w=>w.volume===v.id))assert.equal(wall.gable,undefined);
    assert.equal(plan.pieces.some(p=>p.role==='terrace-rail'),false);
   }
  }
  assert.ok(found,type);
 }
 assert.ok(kinds.size>1,'unconstrained annexes still use other roof styles');
});
