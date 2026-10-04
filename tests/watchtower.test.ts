import test from 'node:test';
import assert from 'node:assert/strict';
import {buildStructurePlan} from '../src/structures/plan';
import {fixture} from './structureFixtures';

test('watchtower has a braced timber frame, guarded open deck and clear ladder entrance',()=>{
 for(const seed of [1,42,2771]){
  const config=fixture('watchtower',seed),plan=buildStructurePlan(config);
  assert.equal(plan.pieces.filter(p=>p.role==='tower-post').length,4);
  assert.ok(plan.pieces.filter(p=>p.role==='tower-brace').length>=12);
  assert.ok(plan.pieces.filter(p=>p.role==='tower-joint-plate').length>=16);
  assert.ok(plan.pieces.filter(p=>p.role==='tower-guard-post').length>=8);
  const deck=plan.pieces.find(p=>p.role==='observation')!,top=deck.position[1]+deck.size[1]/2;
  const cornerJoists=plan.pieces.filter(p=>p.role==='tower-corner-joist');
  assert.equal(cornerJoists.length,4);
  for(const joist of cornerJoists){
   assert.ok(Math.abs(Math.abs(joist.end![0])-deck.size[0]/2)<1e-6);
   assert.ok(Math.abs(Math.abs(joist.end![2])-deck.size[2]/2)<1e-6);
   assert.ok(plan.pieces.some(p=>p.role==='tower-post'&&Math.abs(p.position[0]-joist.position[0])<1e-6&&Math.abs(p.position[2]-joist.position[2])<1e-6));
  }
  assert.equal(plan.pieces.filter(p=>p.role==='tower-corner-plate').length,8);
  assert.ok(plan.pieces.filter(p=>p.role==='tower-deck-fascia').every(p=>p.cuts),'corner fascia needs matching joint cuts');
  const ladder=plan.accesses.find(p=>p.role==='ladder')!;
  assert.ok(Math.abs(ladder.to[1]-top)<1e-6);
  for(const rail of plan.pieces.filter(p=>p.role==='tower-guard-rail'&&p.position[2]<0&&Math.abs(p.end![2]-p.position[2])<1e-6)){
   assert.ok(Math.min(rail.position[0],rail.end![0])>=.6||Math.max(rail.position[0],rail.end![0])<=-.6);
  }
  assert.ok(!plan.pieces.some(p=>p.role.startsWith('tower-lantern')));
  assert.ok(plan.pieces.some(p=>p.role==='tower-supply-crate'));
  assert.ok(plan.pieces.some(p=>p.role==='tower-barrel'));
  assert.equal(plan.roofs[0].kind,'gable');assert.equal(plan.walls.length,0);
  const headers=plan.pieces.filter(p=>p.role==='tower-canopy-header');
  const roof=plan.roofs[0];
  for(const post of plan.pieces.filter(p=>p.role==='roof-post')){
   const surface=roof.y+roof.rise*(1-Math.abs(post.end![0]-roof.x)/(roof.width/2));
   assert.ok(Math.abs(post.end![1]-(surface-.08))<1e-6,'roof posts must reach the sloped roof underside');
  }
  assert.equal(plan.pieces.filter(p=>p.role==='tower-roof-rafter').length,4);
  for(const brace of plan.pieces.filter(p=>p.role==='tower-roof-brace')){
   const end=brace.end!;
   assert.ok(headers.some(header=>end.every((value,axis)=>value>=Math.min(header.position[axis],header.end![axis])-.10&&value<=Math.max(header.position[axis],header.end![axis])+.10)),'roof brace end must touch a canopy header');
  }
  assert.deepEqual(plan,buildStructurePlan(config));
 }
});
