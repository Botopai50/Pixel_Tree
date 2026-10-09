import './treeCanvasFixture';
import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {buildStructurePlan} from '../src/structures/plan';
import {createStructure} from '../src/structures/generator';
import {validateStructurePlan} from '../src/structures/validation';
import {fixture} from './structureFixtures';

test('swamp hut has a supported deck and an unobstructed stone stair landing',()=>{
 for(const width of [6,10,14])for(const depth of [6,10])for(const seed of [1,9,42]){
  const source=fixture('swamp',seed,{width,depth}),plan=buildStructurePlan(source);
  assert.deepEqual(validateStructurePlan(plan),[]);
  assert.deepEqual(plan,buildStructurePlan(source));
  const hut=plan.volumes[0],roof=plan.roofs[0],stairs=plan.accesses[0];
  assert.ok(hut.bottom>=2);assert.equal(roof.material,'thatch');assert.equal(roof.rotationY,Math.PI/2);
  assert.equal(plan.accesses.length,1);assert.ok(Math.abs(stairs.to[1]-(hut.bottom+.12))<1e-6);
  const door=plan.openings.find(o=>o.kind==='door')!;assert.equal(stairs.to[0],door.offset);
  assert.ok(stairs.to[2]<-hut.depth/2);
  assert.ok(plan.pieces.filter(p=>p.role==='stilt'&&!p.removed).length>=8);
  const floor=plan.pieces.find(p=>p.role==='foundation')!;
  assert.ok(floor.position[1]-floor.size[1]/2>1.5,'deck does not become a solid ground-level plinth');
  for(const rail of plan.pieces.filter(p=>p.role==='swamp-rail-bar'&&!p.removed)){
   if(Math.abs(rail.position[2]-rail.end![2])<1e-6){
    const min=Math.min(rail.position[0],rail.end![0]),max=Math.max(rail.position[0],rail.end![0]);
    assert.ok(max<=door.offset-stairs.width/2||min>=door.offset+stairs.width/2,'railing leaves the stair entrance open');
   }
  }
  for(const role of ['swamp-rope-wrap','swamp-net','swamp-reed-clump','swamp-lily-pad','swamp-cloth'])assert.ok(plan.pieces.some(p=>p.role===role),role);
 }
});

test('swamp fishing gear and foliage render with finite buffers, crisp textures and disposable resources',()=>{
 const asset=createStructure(fixture('swamp',42,{vegetation:1,ruin:0})),counts=new Map<any,number>();let meshes=0;
 asset.group.traverse(o=>{
  if(!(o instanceof THREE.Mesh))return;
  meshes++;
  for(const name of ['position','normal','uv']){
   const attr=o.geometry.getAttribute(name);assert.ok(attr,name);
   assert.ok(Array.from(attr.array).every(Number.isFinite),name);
  }
  const mats=Array.isArray(o.material)?o.material:[o.material];
  for(const mat of mats){
   const map=(mat as THREE.MeshStandardMaterial).map;
   if(map){assert.equal(map.magFilter,THREE.NearestFilter);if(!counts.has(map))counts.set(map,0);}
   if(!counts.has(mat))counts.set(mat,0);
  }
  if(!counts.has(o.geometry))counts.set(o.geometry,0);
 });
 assert.ok(meshes>0);
 const reeds=asset.assetGroup.children.filter(o=>o.name==='SwampNativeReeds');
 assert.equal(reeds.length,4);
 for(const clump of reeds){
  assert.ok(clump.children.some(o=>o.name==='ReedHeadSprite'));
  assert.ok(!clump.children.some(o=>o.userData.ground),'native pool does not overlap the structure water');
 }
 asset.update(2);
 const head=reeds[0].getObjectByName('ReedHeadSprite') as THREE.Mesh;
 assert.equal((head.material as THREE.ShaderMaterial).uniforms.uTime.value,2);
 for(const resource of counts.keys())resource.addEventListener('dispose',()=>counts.set(resource,counts.get(resource)!+1));
 asset.dispose();asset.dispose();assert.ok([...counts.values()].every(n=>n===1));
});
