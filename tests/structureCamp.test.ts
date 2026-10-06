import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {fixture} from './structureFixtures';
import {buildStructurePlan} from '../src/structures/plan';
import {createStructure} from '../src/structures/generator';
import {buildCampPiece} from '../src/structures/geometry/camp';
import {applyStructureDamage} from '../src/structures/damage';
import {structureStreams} from '../src/structures/random';
import {validateStructurePlan} from '../src/structures/validation';
import {geometryExportGroup} from '../src/services/exportService';
import {OBJExporter} from 'three/examples/jsm/exporters/OBJExporter.js';
import {buildBeam} from '../src/structures/geometry/beams';
import {box} from '../src/structures/geometry/common';

test('seeds produce all four tent counts, distinct layouts and varied prop inventories',()=>{
 const counts=new Set<number>(),layouts=new Set<string>(),inventories=new Set<string>(),directions=new Set<number>();
 for(let seed=1;seed<=64;seed++){
  const asset=fixture('camp',seed),plan=buildStructurePlan(asset);assert.deepEqual(plan,buildStructurePlan(asset));
  counts.add(plan.volumes.length);layouts.add(JSON.stringify(plan.volumes.map(t=>[t.x,t.z,t.width,t.depth])));
  inventories.add(JSON.stringify(['camp-crate','camp-barrel','camp-stump','camp-drying-cloth'].map(role=>plan.pieces.filter(p=>p.role===role).length)));
  plan.roofs.forEach(r=>directions.add(r.rotationY??0));
  for(const count of [1,2,3,4])assert.equal(buildStructurePlan(fixture('camp',seed,{campTentCount:count})).volumes.length,count);
  assert.deepEqual(plan.volumes,buildStructurePlan(fixture('camp',seed,{vegetation:1,snow:1})).volumes);
 }
 assert.deepEqual([...counts].sort(),[1,2,3,4]);assert.equal(layouts.size,64);assert.ok(inventories.size>8);assert.equal(directions.size,4);
});

test('seating remains near the hearth and supplies form groups beside the tents',()=>{
 for(let seed=1;seed<=128;seed++){
  const plan=buildStructurePlan(fixture('camp',seed));
  for(const seat of plan.pieces.filter(p=>p.role==='camp-stump'))assert.ok(Math.hypot(seat.position[0],seat.position[2])<4,`remote seat, seed ${seed}`);
  const goods=plan.pieces.filter(p=>['camp-crate','camp-barrel','camp-drying-cloth'].includes(p.role));
  const wood=plan.pieces.find(p=>p.role==='camp-firewood');if(wood)goods.push(wood);
  for(const item of goods){
   const nearTent=Math.min(...plan.volumes.map(t=>Math.hypot(Math.max(0,Math.abs(item.position[0]-t.x)-t.width/2),Math.max(0,Math.abs(item.position[2]-t.z)-t.depth/2))));
   const nearSupply=Math.min(...goods.filter(p=>p!==item).map(p=>Math.hypot(item.position[0]-p.position[0],item.position[2]-p.position[2])));
   assert.ok(Math.min(nearTent,nearSupply)<2.8,`isolated ${item.role}, seed ${seed}`);
  }
 }
});

test('seeded tent counts stay separate with a clear hearth at minimum and maximum camp sizes',()=>{
 for(const width of [3,12,30])for(const depth of [3,10,25])for(const seed of [1,42,7010]){
  const asset=fixture('camp',seed,{width,depth}),plan=buildStructurePlan(asset);
  assert.deepEqual(plan,buildStructurePlan(asset));assert.ok(plan.volumes.length>=1&&plan.volumes.length<=4);
  for(const tent of plan.volumes){
   const dx=Math.max(0,Math.abs(tent.x)-tent.width/2),dz=Math.max(0,Math.abs(tent.z)-tent.depth/2);
   assert.ok(Math.hypot(dx,dz)>1.5);
  }
  for(let i=0;i<plan.volumes.length;i++)for(let j=i+1;j<plan.volumes.length;j++){
   const a=plan.volumes[i],b=plan.volumes[j];
   assert.ok(Math.abs(a.x-b.x)>(a.width+b.width)/2||Math.abs(a.z-b.z)>(a.depth+b.depth)/2);
  }
  assert.equal(plan.pieces.filter(p=>p.role==='camp-entry-flaps').length,plan.volumes.length);
  assert.ok(plan.roofs.every(r=>r.y<.1&&r.eaves===0));
  assert.equal(plan.pieces.filter(p=>p.role==='fire-ring').length,16);
  const fire=plan.pieces.filter(p=>p.role==='camp-flame');assert.ok(fire.length>0);
  assert.ok(plan.pieces.some(p=>p.role==='camp-kettle'));
 }
});

test('external camp props clear tent canvas, guy ropes and entrance aprons across seeds and dimensions',()=>{
 const roles=new Set(['camp-stump','camp-stump-end','camp-crate','camp-crate-frame','camp-crate-brace','camp-barrel','camp-barrel-hoop','camp-barrel-lid','camp-firewood','camp-firewood-end','camp-fallen-log','camp-log-end','camp-drying-post','camp-drying-line','camp-drying-cloth']);
 for(const width of [10,12,30])for(const depth of [10,25])for(let seed=1;seed<=32;seed++){
  const plan=buildStructurePlan(fixture('camp',seed,{width,depth}));
  for(const p of plan.pieces.filter(p=>roles.has(p.role))){
   const g=p.kind==='beam'?buildBeam(p.position,p.end!,p.size[0]):buildCampPiece(p)??box(p.position,p.size,p.rotation);
   g.computeBoundingBox();const bounds=g.boundingBox!;g.dispose();
   for(const t of plan.roofs){
    const yaw=t.rotationY??0,points=[-t.width/2-.65,t.width/2+.65].flatMap(x=>[-t.depth/2-.9,t.depth/2+.4].map(z=>new THREE.Vector3(x,0,z).applyAxisAngle(new THREE.Vector3(0,1,0),yaw).add(new THREE.Vector3(t.x,0,t.z))));
    const left=Math.min(...points.map(p=>p.x)),right=Math.max(...points.map(p=>p.x));
    const front=Math.min(...points.map(p=>p.z)),back=Math.max(...points.map(p=>p.z));
    const gap=Math.max(left-bounds.max.x,bounds.min.x-right,front-bounds.max.z,bounds.min.z-back);
    assert.ok(gap>=.25,`${p.role} too close to ${t.id}, seed ${seed}, ${width}x${depth}: ${gap}`);
   }
  }
 }
});

test('tent entrances have a real empty gap through the canvas',()=>{
 const plan=buildStructurePlan(fixture('camp'));
 for(const p of plan.pieces.filter(p=>p.role==='camp-entry-flaps')){
  const geometry=buildCampPiece(p)!;
  const mesh=new THREE.Mesh(geometry,new THREE.MeshBasicMaterial({side:THREE.DoubleSide}));
  mesh.updateMatrixWorld();
  const normal=new THREE.Vector3(0,0,-1).applyAxisAngle(new THREE.Vector3(0,1,0),p.rotation?.[1]??0);
  const ray=new THREE.Raycaster(new THREE.Vector3(...p.position).add(new THREE.Vector3(0,p.size[1]*.25,0)).add(normal),normal.negate());
  assert.equal(ray.intersectObject(mesh).length,0);
  geometry.dispose();(mesh.material as THREE.Material).dispose();
 }
});

test('camp fire flickers and every added light, texture and material is owned by the asset',()=>{
 const asset=createStructure(fixture('camp'));
 const light=asset.assetGroup.children.find(x=>x instanceof THREE.PointLight) as THREE.PointLight;
 assert.ok(light);asset.update(0);const initial=light.intensity;asset.update(.15);assert.notEqual(light.intensity,initial);
 const materials=new Set<THREE.Material>(),textures=new Set<THREE.Texture>();
 asset.assetGroup.traverse(o=>{if(o instanceof THREE.Mesh){
  const m=o.material as THREE.MeshStandardMaterial;materials.add(m);if(m.map)textures.add(m.map);
  assert.ok(Array.from(o.geometry.getAttribute('position').array).every(Number.isFinite));
 }});
 let disposedMaterials=0,disposedTextures=0;
 materials.forEach(m=>m.addEventListener('dispose',()=>disposedMaterials++));textures.forEach(t=>t.addEventListener('dispose',()=>disposedTextures++));
 asset.dispose();asset.dispose();assert.equal(disposedMaterials,materials.size);assert.equal(disposedTextures,textures.size);
});

test('camp survives ruin processing and exports tent canvas and cooking props as finite OBJ geometry',()=>{
 for(const seed of [1,42,7032]){
  const plan=buildStructurePlan(fixture('camp',seed));let previous:string[]=[];
  for(const ruin of [0,.25,.5,.75,1]){
   const damaged=applyStructureDamage(plan,ruin,structureStreams(seed));
   assert.deepEqual(validateStructurePlan(damaged),[]);
   assert.ok(previous.every(id=>damaged.damage.includes(id)));previous=damaged.damage;
  }
 }
 const asset=createStructure(fixture('camp',7032,{vegetation:0}));
 const obj=new OBJExporter().parse(geometryExportGroup(asset.assetGroup));
 assert.ok(obj.includes('v ')&&obj.includes('f '));assert.ok(!/NaN|Infinity/.test(obj));
 assert.ok(obj.includes('o Architecture_cloth'));assert.ok(obj.includes('o Architecture_metal'));
 asset.dispose();
});
