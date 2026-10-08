import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {fixture} from './structureFixtures';
import {buildStructurePlan} from '../src/structures/plan';
import {createStructure} from '../src/structures/generator';
import {buildOutpostPiece} from '../src/structures/geometry/outpost';
test('uncovered side varies between one offset window and two spaced windows',()=>{
 const counts=new Set<number>(),sides=new Set<number>(),layouts=new Set<string>();
 for(let seed=1;seed<=30;seed++){
  const plan=buildStructurePlan(fixture('outpost',seed)),home=plan.volumes[0],windows=plan.openings.filter(o=>o.kind==='window'&&o.wall===home.id+'_wall_3').sort((a,b)=>a.offset-b.offset);
  counts.add(windows.length);layouts.add(windows.map(o=>o.offset.toFixed(3)).join(','));
  if(windows.length===1)sides.add(Math.sign(windows[0].offset));
  for(const o of windows)assert.ok(Math.abs(o.offset)+o.width+.30<home.depth/2,'open shutter must clear corner posts');
  if(windows.length===2)assert.ok(windows[1].offset-windows[0].offset>windows[0].width+windows[1].width+.20,'window leaves must not overlap');
 }
 assert.deepEqual([...counts].sort(),[1,2]);assert.deepEqual([...sides].sort(),[-1,1]);assert.ok(layouts.size>20);
});
test('chipped stake tips retain a central pyramid apex and four sloping faces',()=>{
 const plan=buildStructurePlan(fixture('outpost',42));
 for(const tip of plan.pieces.filter(p=>p.role==='outpost-stake-tip').slice(0,8)){
  const geometry=buildOutpostPiece({...tip,rotation:undefined})!,positions=geometry.getAttribute('position');
  const top=tip.position[1]+tip.size[1]/2;
  let apexCount=0;
  for(let i=0;i<positions.count;i++)if(Math.abs(positions.getY(i)-top)<1e-5){
   assert.ok(Math.abs(positions.getX(i)-tip.position[0])<1e-5);
   assert.ok(Math.abs(positions.getZ(i)-tip.position[2])<1e-5);apexCount++;
  }
  assert.ok(apexCount>=4);
  const normals=geometry.getAttribute('normal');
  assert.ok(Array.from({length:normals.count},(_,i)=>normals.getY(i)).some(y=>y>.05&&y<.95));
  geometry.dispose();
 }
});
test('supplies clear the guardhouse walls and stacked logs reuse camp firewood',()=>{
 for(const patch of [{},{width:6,depth:6,height:3},{width:26,depth:20,height:8}])for(const seed of [1,42,777]){
  const plan=buildStructurePlan(fixture('outpost',seed,patch)),home=plan.volumes[0];
  const logs=plan.pieces.filter(p=>p.role==='camp-firewood');
  assert.equal(logs.length,5);
  assert.equal(plan.pieces.filter(p=>p.role==='camp-firewood-end').length,10);
  for(const p of plan.pieces.filter(p=>['fortress-barrel','outpost-crate','camp-firewood'].includes(p.role))){
   const halfX=p.role==='camp-firewood'?p.size[0]*.53:p.size[0]/2;
   const halfZ=p.role==='camp-firewood'?p.size[1]/2:p.size[2]/2;
   assert.ok(p.position[0]-halfX>home.x+home.width/2+.15||p.position[2]+halfZ<home.z-home.depth/2-.15,'supplies must clear exterior wall cladding');
  }
 }
});
test('outpost has pointed palisades, two gate leaves and a clad guardhouse with clear openings',()=>{
 for(const patch of [{},{width:6,depth:6,height:3},{width:26,depth:20,height:8}]){
  const source=fixture('outpost',42,patch),plan=buildStructurePlan(source);
  assert.deepEqual(plan,buildStructurePlan(source));
  assert.equal(new Set(plan.pieces.map(p=>p.id)).size,plan.pieces.length);
  assert.ok(plan.pieces.filter(p=>p.role==='outpost-stake-tip').length>20);
  assert.ok(plan.pieces.some(p=>p.role==='outpost-gate-arch'));
  const gate=plan.pieces.filter(p=>p.role==='outpost-gate-plank');assert.ok(gate.some(p=>p.position[0]<0)&&gate.some(p=>p.position[0]>0));
  assert.equal(plan.pieces.filter(p=>p.role==='fortress-banner').length,2);
  for(const banner of plan.pieces.filter(p=>p.role==='fortress-banner')){
   const post=plan.pieces.find(p=>p.id===banner.support)!;
   assert.equal(post.role,'outpost-fence-post');
   assert.ok(Math.abs(banner.position[0]-post.position[0])<1e-6);
   assert.ok(banner.position[2]<post.position[2]-.285);
  }
  assert.ok(!plan.pieces.some(p=>p.role.startsWith('outpost-lantern')));
  assert.equal(plan.volumes.length,1);assert.equal(plan.roofs[0].kind,'gable');
  assert.ok(plan.pieces.some(p=>p.role==='outpost-side-awning'));
  const sourceWall=plan.walls.find(w=>w.id===plan.openings.find(o=>o.kind==='door')!.wall)!;
  const opening=plan.openings.find(o=>o.wall===sourceWall.id&&o.kind==='door')!;
  const centre=(sourceWall.start[0]+sourceWall.end[0])/2+opening.offset;
  for(const board of plan.pieces.filter(p=>p.role==='outpost-wall-plank'&&Math.abs(p.position[2]-sourceWall.start[2])<.15)){
   if(Math.abs(board.position[0]-centre)<opening.width/2)assert.ok(board.position[1]-board.size[1]/2>=sourceWall.bottom+opening.height-.01);
  }
  const asset=createStructure(source);asset.group.traverse(o=>{if(o instanceof THREE.Mesh)assert.ok(Array.from(o.geometry.getAttribute('position').array).every(Number.isFinite));});asset.dispose();
 }
});
test('side windows and shutters remain in front of the recessed awning across seeds',()=>{
 for(const depth of [6,12,20])for(const seed of [1,42,777,991]){
  const plan=buildStructurePlan(fixture('outpost',seed,{depth,openingDensity:1}));
  const awning=plan.pieces.find(p=>p.role==='outpost-side-awning')!;
  const fascia=plan.pieces.find(p=>p.role==='outpost-roof-fascia-0'&&Math.abs(p.position[0]-awning.position[0])<.001)!;
  const front=fascia.position[2]-fascia.size[2]/2;
  const wall=plan.walls.find(w=>w.id===plan.volumes[0].id+'_wall_1')!;
  for(const opening of plan.openings.filter(o=>o.kind==='window'&&o.wall===wall.id)){
   const centre=(wall.start[2]+wall.end[2])/2+opening.offset;
   assert.ok(centre+opening.width/2+.275<front,'window shutter must clear the awning fascia');
   assert.ok(centre-opening.width/2>wall.start[2],'window must remain inside its wall');
  }
 }
});
test('outpost uses the shared window leaves with seeded closed, partial and open poses',()=>{
 const poses=new Set<string>();
 for(let seed=1;seed<=30;seed++){
  const source=fixture('outpost',seed,{openingDensity:1}),plan=buildStructurePlan(source);
  assert.ok(!plan.pieces.some(p=>p.role==='outpost-window-shutter'||p.role==='fortress-window-glow'));
  const windows=plan.openings.filter(o=>o.kind==='window');
  assert.deepEqual(windows,buildStructurePlan(source).openings.filter(o=>o.kind==='window'));
  for(const opening of windows)for(const angle of opening.shutterAngles!)poses.add(angle===0?'closed':angle<100?'partial':'open');
 }
 assert.deepEqual([...poses].sort(),['closed','open','partial']);
});
