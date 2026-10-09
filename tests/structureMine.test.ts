import './treeCanvasFixture';
import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {fixture} from './structureFixtures';
import {buildStructurePlan} from '../src/structures/plan';
import {createStructure} from '../src/structures/generator';
import {validateStructurePlan} from '../src/structures/validation';

test('mine has a clear framed throat and continuous rails supported by sleepers',()=>{
 for(const width of [4,10,18])for(const seed of [1,42,91]){
  const plan=buildStructurePlan(fixture('mine',seed,{width}));
  assert.deepEqual(validateStructurePlan(plan),[]);
  assert.deepEqual(plan,buildStructurePlan(fixture('mine',seed,{width})));
  const mouth=plan.pieces.find(p=>p.role==='mine-mouth')!,rails=plan.pieces.filter(p=>p.role==='rail');
  assert.equal(plan.pieces.find(p=>p.role==='mine-tunnel-lining')!.material,'stone');
  assert.equal(plan.pieces.find(p=>p.role==='mine-tunnel-darkness')!.material,'dark');
  assert.equal(plan.pieces.filter(p=>p.role==='mine-rock-shell').length,1);
  assert.ok(!plan.pieces.some(p=>p.role==='mine-native-rock'),'the hill must not be a pile of round boulders');
  assert.equal(rails.length,2);assert.ok(plan.pieces.filter(p=>p.role==='mine-sleeper').length>8);
  assert.ok(rails.every(p=>p.position[2]-p.size[2]/2<mouth.position[2]-2));
  const centre=plan.pieces.filter(p=>['mine-native-rock','mine-portal-rock'].includes(p.role)&&Math.abs(p.position[0])<p.size[0]/2);
  assert.ok(centre.filter(p=>p.position[2]<rails[0].position[2]+rails[0].size[2]/2).every(p=>p.position[1]-p.size[1]/2>2.5));
 }
});

test('native mine rocks leave an open entrance, use native pixels, and dispose exactly once',()=>{
 const asset=createStructure(fixture('mine',42,{vegetation:.4}));
 asset.group.updateMatrixWorld(true);
 const rocks:THREE.Mesh[]=[];
 asset.group.traverse(o=>{if(o instanceof THREE.Mesh&&o.name==='Rock_1')rocks.push(o);});
 assert.ok(rocks.length>30);
 assert.ok(rocks.every(o=>(o.material as THREE.ShaderMaterial).uniforms.uTexelsPerMetre));
 const ray=new THREE.Raycaster(new THREE.Vector3(0,1.2,-15),new THREE.Vector3(0,0,1));
 const hits=ray.intersectObjects(asset.group.children,true);
 assert.ok(hits.length>0);
 const throat=asset.group.userData.structurePlan.pieces.find((p:any)=>p.role==='mine-tunnel-darkness');
 const lining=asset.group.getObjectByName('mine-tunnel-lining')!.getObjectByName('Rock_1') as THREE.Mesh<THREE.BufferGeometry,THREE.ShaderMaterial>;
 assert.ok(lining.material.uniforms.uPalette,'inner walls must use the native rock shader');
 const end=asset.group.getObjectByName(throat.id) as THREE.Mesh<THREE.BufferGeometry,THREE.MeshBasicMaterial>;
 assert.ok(end.material.isMeshBasicMaterial);assert.equal(end.material.color.getHex(),0x070908);
 assert.ok(hits[0].point.z>throat.position[2]-.1,'no rock or frame may seal the throat');
 const backRay=new THREE.Raycaster(new THREE.Vector3(0,1.2,15),new THREE.Vector3(0,0,-1));
 assert.equal(backRay.intersectObjects(asset.group.children,true)[0].object.parent?.name,'mine-rock-shell','the rear cliff must close the tunnel');
 assert.ok(asset.group.getObjectsByProperty('name','MineNativeFern').length>0);
 const shell=asset.group.getObjectByName('mine-rock-shell')!,piece=asset.group.userData.structurePlan.pieces.find((p:any)=>p.role==='mine-rock-shell');
 for(const side of [-1,1])for(let y=.2;y<2.0;y+=.06){
  const scan=new THREE.Raycaster(new THREE.Vector3(side*piece.size[0]*.275,y,-15),new THREE.Vector3(0,0,1));
  assert.ok(scan.intersectObject(shell,true).length>0,'fractured beds must have solid rock behind their seams');
 }
 const mouthRadius=Math.max(2.1,Math.min(3.6,piece.size[0]*.36))/2+.12;
 for(const side of [-1,1])for(const offset of [.025,.08,.16]){
  const scan=new THREE.Raycaster(new THREE.Vector3(side*(mouthRadius+offset),1.3,-15),new THREE.Vector3(0,0,1));
  const hit=scan.intersectObject(shell,true)[0];
  assert.ok(hit&&hit.point.z<piece.position[2]-piece.size[2]/2+.1,'arch clipping must preserve the stone shoulder beside the tunnel');
 }
 // Oblique views catch gaps that a straight front-facing scan can miss.
 for(const side of [-1,1])for(const y of [.35,.8,1.25,1.7]){
  const target=new THREE.Vector3(side*piece.size[0]*.275,y,piece.position[2]-piece.size[2]/2+.10);
  for(const offset of [new THREE.Vector3(side*12,4,-12),new THREE.Vector3(side*12,-.1,-4),new THREE.Vector3(0,12,-8)]){
   const origin=target.clone().add(offset),scan=new THREE.Raycaster(origin,offset.clone().negate().normalize());
   const hit=scan.intersectObject(shell,true)[0];
   assert.ok(hit&&hit.distance<=offset.length()+.01,'the solid shoulder must remain closed from oblique views');
  }
 }
 const counts=new Map<any,number>();
 asset.group.traverse(o=>{if(o instanceof THREE.Mesh){
  assert.ok(Array.from(o.geometry.attributes.position.array).every(Number.isFinite));
  for(const r of [o.geometry,...(Array.isArray(o.material)?o.material:[o.material])])if(!counts.has(r)){counts.set(r,0);r.addEventListener('dispose',()=>counts.set(r,counts.get(r)!+1));}
 }});
 asset.dispose();asset.dispose();assert.ok([...counts.values()].every(n=>n===1));
});
