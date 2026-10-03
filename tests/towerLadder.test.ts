import test from 'node:test';
import assert from 'node:assert/strict';
import {buildStructurePlan} from '../src/structures/plan';
import {fixture} from './structureFixtures';

test('tower has an open wooden ladder whose rungs meet both stringers',()=>{
 for(const height of [5,9,13]){
  const p=buildStructurePlan(fixture('watchtower',42,{height}));
  assert.ok(!p.pieces.some(p=>p.kind==='stairs'));
  const rails=p.pieces.filter(p=>p.role==='tower-ladder-rail'),rungs=p.pieces.filter(p=>p.role==='tower-ladder-rung');
  assert.equal(rails.length,2);assert.ok(rungs.length>10);
  assert.ok([...rails,...rungs].every(p=>p.material==='wood'));
  for(const rung of rungs){
   const links=p.supports.filter(s=>s.component===rung.id);
   assert.equal(links.length,2);assert.ok(links.every(s=>s.minimum===2));
   for(const point of [rung.position,rung.end!]){
    const rail=rails.find(r=>Math.abs(r.position[0]-point[0])<1e-6)!;
    const t=(point[1]-rail.position[1])/(rail.end![1]-rail.position[1]);
    const z=rail.position[2]+(rail.end![2]-rail.position[2])*t;
    assert.ok(Math.abs(z-point[2])<1e-5);
   }
  }
 }
});
