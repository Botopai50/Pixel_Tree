import test from 'node:test';
import assert from 'node:assert/strict';
import {buildStructurePlan} from '../src/structures/plan';
import {fixture} from './structureFixtures';
test('barn has centered double braced doors, straw ridge bindings and supplies clear of the entrance',()=>{
 for(const seed of [1,42,2771]){
  const plan=buildStructurePlan(fixture('barn',seed)),volume=plan.volumes.find(p=>p.role==='barn')!;
  const door=plan.openings.find(p=>p.kind==='door')!;
  assert.equal(door.offset,0);assert.equal(plan.roofs[0].kind,'thatch');
  assert.equal(plan.pieces.filter(p=>p.role==='barn-door-leaf').length,2);
  assert.equal(plan.pieces.filter(p=>p.role==='barn-door-diagonal').length,2);
  assert.ok(plan.pieces.some(p=>p.role==='barn-door-track'));
  assert.ok(plan.pieces.filter(p=>p.role==='barn-ridge-binding').length>=8);
  assert.ok(plan.pieces.some(p=>p.role==='barn-hay-bale'));
  assert.ok(plan.pieces.some(p=>p.role==='barn-barrel'));
  for(const prop of plan.pieces.filter(p=>['barn-hay-bale','barn-barrel','barn-supply-crate'].includes(p.role))){
   if(prop.position[2]<volume.z-volume.depth/2)assert.ok(Math.abs(prop.position[0])-prop.size[0]/2>door.width/2+.3);
  }
  assert.deepEqual(plan,buildStructurePlan(fixture('barn',seed)));
 }
});
