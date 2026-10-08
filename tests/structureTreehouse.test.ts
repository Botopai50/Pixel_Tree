import test from 'node:test';
import assert from 'node:assert/strict';
import {buildStructurePlan} from '../src/structures/plan';
import {fixture} from './structureFixtures';

test('treehouse has a plaster cottage, clear deck access and timber piers across sizes and seeds',()=>{
 for(const width of [6,8,12])for(const depth of [6,8,10])for(const seed of [1,9,42]){
  const plan=buildStructurePlan(fixture('treehouse',seed,{width,depth}));
  assert.ok(plan.walls.every(wall=>wall.material==='plaster'));
  assert.ok(plan.openings.some(o=>o.id.endsWith('attic-window')));
  assert.ok(plan.openings.some(o=>o.kind==='door'&&o.arched));
  assert.equal(plan.pieces.filter(p=>p.role==='tree-pier-post').length,4);
  assert.equal(plan.pieces.filter(p=>p.role==='tree-planter').length,3);
  assert.ok(!plan.pieces.some(p=>p.role.startsWith('tree-lamp')));
  assert.ok(!plan.pieces.some(p=>p.kind==='stairs'&&!p.removed));
  const access=plan.accesses.find(a=>a.id==='tree-ladder-access')!;
  assert.ok(access.width>=1.2);
  const deck=plan.pieces.find(p=>p.role==='tree-platform')!;
  for(const rail of plan.pieces.filter(p=>p.role==='tree-rail'&&p.position[2]===-deck.size[2]/2)){
   const min=Math.min(rail.position[0],rail.end![0]),max=Math.max(rail.position[0],rail.end![0]);
   assert.ok(max<access.to[0]-access.width/2||min>access.to[0]+access.width/2);
  }
 }
});
