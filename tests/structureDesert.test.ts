import './treeCanvasFixture';
import test from 'node:test';import assert from 'node:assert/strict';import * as THREE from 'three';
import {buildDesertPiece} from '../src/structures/geometry/desert';
import {buildStructurePlan} from '../src/structures/plan';import {createStructure} from '../src/structures/generator';import {fixture} from './structureFixtures';import {validateStructurePlan} from '../src/structures/validation';

test('desert house has two usable terraces, front shade and an exterior stair reaching the lower terrace',()=>{
 for(const width of [6,10,14])for(const seed of [1,9,42]){
  const source=fixture('desert',seed,{width,depth:8}),plan=buildStructurePlan(source);
  assert.deepEqual(validateStructurePlan(plan),[]);assert.equal(plan.volumes.length,2);assert.ok(plan.roofs.every(r=>r.kind==='flat'&&r.material==='stone'));
  const lower=plan.volumes[0],upper=plan.volumes[1];assert.ok(upper.width<lower.width&&upper.depth<lower.depth);assert.ok(upper.bottom>=lower.bottom+lower.height);
  const stairs=plan.accesses.find(a=>a.from[0]>lower.width/2)!;assert.ok(stairs);assert.ok(Math.abs(stairs.to[1]-upper.bottom)<.01);
  assert.equal(plan.accesses.filter(a=>a.to[1]>.5).length,1);
  const stair=plan.pieces.find(p=>p.role==='desert-access-stairs')!;
  assert.equal(stair.material,'plaster');assert.ok(plan.pieces.some(p=>p.role==='desert-stair-tread'&&p.material==='stone'));
  const outerX=stairs.to[0]+stairs.width/2,rear=plan.walls.find(w=>w.id===lower.id+'_wall_2')!;
  assert.ok(Math.abs(rear.start[0]-lower.width/2)<1e-6,'house wall stays at its original corner');
  const side=plan.walls.find(w=>w.id===lower.id+'_wall_1')!;
  assert.equal(side.start[0],lower.width/2);assert.equal(side.end[0],lower.width/2);
  const returnWall=plan.pieces.find(p=>p.role==='desert-stair-rear-wall')!;
  assert.ok(Math.abs(returnWall.position[2]-lower.depth/2)<1e-6);
  assert.ok(Math.abs(returnWall.position[0]+returnWall.size[0]/2-outerX)<1e-6);
  assert.ok(plan.pieces.some(p=>p.role==='corner-post'&&Math.abs(p.position[0]-outerX)<1e-6&&Math.abs(p.position[2]-lower.depth/2)<1e-6));
  assert.equal(plan.pieces.filter(p=>p.role==='desert-stair-side-wall').length,1);
  assert.ok(!plan.pieces.some(p=>p.role==='desert-stair-parapet'));
  const endPost=plan.pieces.find(p=>p.role==='desert-stair-parapet-end-post')!,rearRail=plan.pieces.find(p=>p.kind==='beam'&&p.material==='wood'&&p.end&&Math.abs(p.position[2]-lower.depth/2)<1e-6&&Math.abs(p.position[1]-(upper.bottom+.49))<1e-6&&Math.max(p.position[0],p.end[0])>=outerX-.175-1e-6)!;
  assert.ok(Math.abs(endPost.position[0]+endPost.size[0]/2-outerX)<1e-6);assert.ok(Math.abs(endPost.position[2]-lower.depth/2)<1e-6);
  assert.ok(rearRail?.end&&Math.abs(Math.max(rearRail.position[0],rearRail.end[0])-endPost.position[0])<1e-6);
  const infill=plan.pieces.find(p=>p.role==='desert-stair-landing-wall')!;
  assert.equal(infill.position[1]-infill.size[1]/2,0);
  assert.ok(Math.abs(infill.position[2]-infill.size[2]/2-stairs.to[2])<1e-6);
  assert.ok(Math.abs(infill.position[2]+infill.size[2]/2-lower.depth/2)<1e-6);
  const rearBase=plan.pieces.find(p=>p.role==='desert-wall-base'&&Math.abs(p.position[2]-lower.depth/2)<1e-6&&Math.abs(p.position[1]-(lower.bottom+.22))<1e-6)!;
  assert.ok(Math.abs(rearBase.position[0]+rearBase.size[0]/2-outerX)<1e-6);
  assert.ok(plan.pieces.some(p=>p.role==='desert-stair-wall-base'&&p.material==='stone'&&p.position[0]===outerX));
  assert.equal(plan.pieces.filter(p=>p.role==='desert-rug').length,2);assert.ok(plan.pieces.some(p=>p.role==='desert-awning'));assert.ok(plan.pieces.some(p=>p.role==='desert-pot'));
  assert.equal(new Set(plan.pieces.map(p=>p.id)).size,plan.pieces.length);
 }
});
test('desert pottery and cloth retain finite, matched UV buffers after rendering',()=>{
 const asset=createStructure(fixture('desert',9,{vegetation:0}));const plan=asset.group.userData.structurePlan;
 for(const p of plan.pieces.filter((p:any)=>['desert-awning','desert-pot','desert-rug','desert-banner','desert-access-stairs','desert-stair-side-wall','desert-stair-rear-wall','desert-stair-landing-wall'].includes(p.role))){
  const mesh=asset.assetGroup.getObjectByName(p.id) as THREE.Mesh;assert.ok(mesh);
  assert.equal(mesh.geometry.attributes.uv.count,mesh.geometry.attributes.position.count);
  assert.ok(Array.from(mesh.geometry.attributes.uv.array).every(Number.isFinite));
 }
 const colors=(mesh:THREE.Mesh)=>{
  const map=(mesh.material as THREE.MeshStandardMaterial).map as THREE.DataTexture;
  assert.equal(map.magFilter,THREE.NearestFilter);
  const data=map.image.data,result=new Set<string>();
  for(let i=0;i<data.length;i+=4)result.add(Array.from(data.slice(i,i+3)).join(','));
  return result;
 };
 const facade=colors(asset.assetGroup.getObjectByName(plan.walls.find((w:any)=>w.material==='plaster').id) as THREE.Mesh);
 for(const p of plan.pieces.filter((p:any)=>['desert-access-stairs','desert-stair-side-wall','desert-stair-rear-wall','desert-stair-landing-wall'].includes(p.role))){
  const surface=colors(asset.assetGroup.getObjectByName(p.id) as THREE.Mesh);
  assert.ok([...surface].every(color=>facade.has(color)),'stair walls use the house plaster palette');
 }
 asset.dispose();
});

test('stair floors stop at the parapet and discard internal coplanar faces',()=>{
 const plan=buildStructurePlan(fixture('desert',9)),wall=plan.pieces.find(p=>p.role==='desert-stair-side-wall')!,inner=wall.position[0]-wall.size[0]/2;
 for(const piece of plan.pieces.filter(p=>['desert-access-stairs','desert-stair-landing-wall'].includes(p.role))){
  assert.ok(Math.abs(piece.position[0]+piece.size[0]/2-inner)<1e-6);
  const g=buildDesertPiece(piece)!,positions=g.getAttribute('position');
  for(let i=0;i<positions.count;i+=3)assert.ok(![i,i+1,i+2].every(j=>Math.abs(positions.getX(j)-inner)<1e-5),'no second face at the wall interface');
  g.dispose();
 }
});

test('landing and final tread meet the terrace without overlapping its top face',()=>{
 const plan=buildStructurePlan(fixture('desert',9297)),roof=plan.roofs.find(r=>r.volume===plan.volumes[0].id)!,landing=plan.pieces.find(p=>p.role==='desert-stair-landing')!;
 const last=plan.pieces.filter(p=>p.role==='desert-stair-tread').sort((a,b)=>b.position[1]-a.position[1])[0];
 for(const p of [landing,last])assert.ok(Math.abs(p.position[0]-p.size[0]/2-(roof.x+roof.width/2+roof.eaves))<1e-6);
 assert.ok(Math.abs(landing.position[2]+landing.size[2]/2-(roof.z+roof.depth/2+roof.eaves))<1e-6);
 assert.ok(!plan.pieces.some(p=>!p.removed&&['wall-frame','desert-stair-rear-frame'].includes(p.role)&&Math.abs(p.position[1]-plan.volumes[0].bottom)<.01));
});

test('window covers stay above the frames and shutters',()=>{
 const plan=buildStructurePlan(fixture('desert',9297)),lower=plan.volumes[0];
 const windowTop=lower.bottom+1.02+.96+.16;
 for(const hood of plan.pieces.filter(p=>p.role==='desert-window-hood'&&p.position[1]<lower.bottom+lower.height)){
  const lowest=hood.position[1]-Math.abs(Math.sin(hood.rotation![0]))*hood.size[2]/2-Math.abs(Math.cos(hood.rotation![0]))*hood.size[1]/2;
  assert.ok(lowest>windowTop);
 }
 const awning=plan.pieces.find(p=>p.role==='desert-side-awning')!;
 assert.ok(awning.position[1]-.28-.15>windowTop);
 assert.equal(awning.position[2],lower.z);
});

test('stair parapet end caps exclude surfaces already closed by the plinth and rear wall',()=>{
 const plan=buildStructurePlan(fixture('desert',9297)),wall=plan.pieces.find(p=>p.role==='desert-stair-side-wall')!,g=buildDesertPiece(wall)!,pos=g.getAttribute('position');
 for(let i=0;i<pos.count;i+=3){
  if([i,i+1,i+2].every(j=>Math.abs(pos.getZ(j)-wall.position[2])<1e-5))assert.ok([i,i+1,i+2].every(j=>pos.getY(j)>=.74-1e-5));
  if([i,i+1,i+2].every(j=>Math.abs(pos.getZ(j)-wall.end![2])<1e-5))assert.ok([i,i+1,i+2].every(j=>pos.getY(j)>=wall.end![1]-1e-5));
 }
 g.dispose();
});
