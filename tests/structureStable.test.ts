import './treeCanvasFixture';
import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {fixture} from './structureFixtures';
import {buildStructurePlan} from '../src/structures/plan';
import {createStructure} from '../src/structures/generator';
import {validateStructurePlan} from '../src/structures/validation';
import {paintSurface} from '../src/structures/surfacePainting';
import {looseHayMaterial} from '../src/structures/geometry/stable';
import {normalizeStructureConfig} from '../src/structures/config';

test('stable has open stalls, a covered tack room and gates beyond the roof',()=>{
 for(const seed of [1,42,91])for(const width of [7,11,16]){
  const input=fixture('stable',seed,{width}),plan=buildStructurePlan(input),pieces=plan.pieces.filter(p=>!p.removed);
  assert.deepEqual(validateStructurePlan(plan),[]);
  assert.deepEqual(plan,buildStructurePlan(input));
  assert.equal(plan.roofs.length,1);assert.equal(plan.roofs[0].kind,'gable');
  assert.equal(plan.walls.length,0,'the open stalls must not be wrapped by automatic walls');
  assert.equal(pieces.filter(p=>p.role==='stable-gate-diagonal').length,4);
  assert.ok(pieces.some(p=>p.role==='stable-gate-top'&&p.position[2]<-plan.roofs[0].depth/2-1));
  const bedding=pieces.filter(p=>p.role==='stable-straw-bed');assert.equal(bedding.length,1,'one continuous layer must span the stall partitions');
  const bed=bedding[0],right=bed.position[0]+bed.size[0]/2,front=bed.position[2]-bed.size[2]/2;
  const fences=pieces.filter(p=>p.role==='stable-fence-post');
  const sideSpill=right-Math.max(...fences.map(p=>p.position[0])),frontSpill=Math.min(...fences.map(p=>p.position[2]))-front;
  assert.ok(sideSpill>.1&&sideSpill<.2,'hay should spill only a little past the side fence');
  assert.ok(frontSpill>.1&&frontSpill<.2,'hay should spill only a little past the front fence');
  assert.equal(pieces.filter(p=>p.role==='stable-feed-trough-bottom').length,3);
  assert.equal(pieces.filter(p=>p.role==='stable-king-post').length,2);
  assert.ok(!pieces.some(p=>p.role.startsWith('stable-horse-')));
  assert.ok(!pieces.some(p=>p.role.startsWith('stable-lamp-')));
  assert.ok(pieces.filter(p=>p.role==='stable-post').every(p=>plan.pieces.find(s=>s.id===p.support)?.material==='stone'));
 }
});

test('hay amount supports empty to full coverage without changing the stable',()=>{
 const baseline=buildStructurePlan(fixture('stable',42));
 for(const amount of [0,.25,.6,1]){
  const input=fixture('stable',42,{hayAmount:amount});
  assert.deepEqual(buildStructurePlan(input),baseline);
  const asset=createStructure(input);let checked=false;
  asset.group.traverse(o=>{if(o instanceof THREE.Mesh&&(o.material as THREE.Material).name==='LooseHayBedding'){
   const shader:any={uniforms:{},vertexShader:'#include <begin_vertex>',fragmentShader:'#include <map_fragment>'};
   (o.material as THREE.Material).onBeforeCompile(shader,{} as any);assert.equal(shader.uniforms.uHayAmount.value,amount);checked=true;
  }});assert.ok(checked);asset.dispose();
 }
 assert.equal(normalizeStructureConfig(fixture('stable').structure).hayAmount,.7);
 assert.equal(normalizeStructureConfig(fixture('stable',42,{hayAmount:-2}).structure).hayAmount,0);
 assert.equal(normalizeStructureConfig(fixture('stable',42,{hayAmount:3}).structure).hayAmount,1);
});

test('stable renders finite geometry, keeps the aisle open and owns its resources',()=>{
 const asset=createStructure(fixture('stable',42,{vegetation:0})),plan=asset.group.userData.structurePlan;
 asset.group.updateMatrixWorld(true);
 const gate=plan.pieces.find((p:any)=>p.role==='stable-gate-top'),x=gate.position[0];
 const ray=new THREE.Raycaster(new THREE.Vector3(x,1.55,-20),new THREE.Vector3(0,0,1));
 const hits=ray.intersectObjects(asset.group.children,true);
 assert.ok(hits.length>0);assert.ok(hits[0].point.z>gate.position[2]+.3,'no solid stall panel may close the space above the gate');
 const disposed=new Map<object,number>();
 asset.group.traverse(o=>{if(o instanceof THREE.Mesh){
  const pos=o.geometry.getAttribute('position');for(let i=0;i<pos.count;i++)assert.ok(Number.isFinite(pos.getX(i)+pos.getY(i)+pos.getZ(i)));
  for(const resource of [o.geometry,...(Array.isArray(o.material)?o.material:[o.material])])if(!disposed.has(resource)){disposed.set(resource,0);resource.addEventListener('dispose',()=>disposed.set(resource,disposed.get(resource)!+1));}
 }});
 asset.dispose();asset.dispose();assert.ok([...disposed.values()].every(n=>n===1));
});

test('ground hay reuses the exact thatched-roof texture and pixel scale',()=>{
 const texture=paintSurface('thatch','#c59138',32,42,.6),material=looseHayMaterial(32,42,texture);
 assert.equal(material.map,texture);assert.equal(material.map!.magFilter,THREE.NearestFilter);
 const asset=createStructure(fixture('stable',42,{vegetation:0}));let hay:THREE.MeshStandardMaterial|undefined,bale:THREE.MeshStandardMaterial|undefined;
 asset.group.traverse(o=>{if(o instanceof THREE.Mesh){const m=o.material as THREE.MeshStandardMaterial;
  if(m.name==='LooseHayBedding')hay=m;
  if(o.geometry.getAttribute('thatchLayer')&&m.name!=='LooseHayBedding')bale=m;
 }});
 assert.ok(hay&&bale);assert.equal(hay.map,bale.map,'floor bedding and thatch must share the same texture resource');
 asset.dispose();texture.dispose();material.dispose();
});

test('hay edges use per-piece coordinates and whole texel cuts after batching',()=>{
 const asset=createStructure(fixture('stable',42,{vegetation:0}));let found=false;
 asset.group.traverse(o=>{if(o instanceof THREE.Mesh&&(o.material as THREE.Material).name==='LooseHayBedding'){
  found=true;assert.equal(o.geometry.getAttribute('hayLocalPosition').count,o.geometry.getAttribute('position').count);
  assert.equal(o.geometry.getAttribute('hayHalfSize').count,o.geometry.getAttribute('position').count);
 }});assert.ok(found);asset.dispose();
 const mat=looseHayMaterial(32,42,paintSurface('thatch','#c59138',32,42,.6)),shader={uniforms:{},vertexShader:'#include <begin_vertex>',fragmentShader:'#include <map_fragment>'};
 mat.onBeforeCompile(shader as any,{} as any);
 assert.ok(shader.fragmentShader.includes('floor(vHayLocal*32.0)'));assert.ok(shader.fragmentShader.includes('if(hayCoverage(hayCell)<=0.)discard;'));
 assert.ok(shader.fragmentShader.includes('float rockSnowCoverage('),'hay must use the actual shared snow coverage algorithm');
 mat.map!.dispose();mat.dispose();
});
