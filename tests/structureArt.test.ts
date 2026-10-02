import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {buildStructurePlan} from '../src/structures/plan';
import {buildRoof} from '../src/structures/geometry/roofs';
import {createStructureMaterials,StructureResources} from '../src/structures/materials';
import {fixture} from './structureFixtures';
import {paintUV} from '../src/structures/geometry/paintUV';

test('column painting preserves face area at the origin and after translation',()=>{
 for(const offset of [[0,0,0],[7,2,-4]]){
  const g=paintUV(new THREE.CylinderGeometry(.45,.55,3,8).translate(...offset as [number,number,number]));
  const expanded=g.index?g.toNonIndexed():g,p=expanded.getAttribute('position'),uv=expanded.getAttribute('uv');
  for(let i=0;i<p.count;i+=3){
   const a=new THREE.Vector3().fromBufferAttribute(p,i),b=new THREE.Vector3().fromBufferAttribute(p,i+1),c=new THREE.Vector3().fromBufferAttribute(p,i+2);
   const area=b.sub(a).cross(c.sub(a)).length();
   const painted=Math.abs((uv.getX(i+1)-uv.getX(i))*(uv.getY(i+2)-uv.getY(i))-(uv.getY(i+1)-uv.getY(i))*(uv.getX(i+2)-uv.getX(i)));
   assert.ok(painted>area*.99,'column compresses its circumferential painting');
  }
  if(expanded!==g)expanded.dispose();g.dispose();
 }
});

// A roof projected onto horizontal world coordinates stretches its tile rows;
// a zero-filled UV buffer loses the painting completely on OBJ consumers.
test('roof painting uses finite surface distances with no collapsed triangle UVs',()=>{
 for(const roof of ['gable','hip','shed','flat','thatch'] as const){
  const plan=buildStructurePlan(fixture('house',42,{roof,annexes:false,balconies:false}));
  const g=buildRoof(plan.roofs[0]);const p=g.getAttribute('position'),uv=g.getAttribute('uv');
  for(let i=0;i<p.count;i+=3){
   const a=new THREE.Vector3().fromBufferAttribute(p,i),b=new THREE.Vector3().fromBufferAttribute(p,i+1),c=new THREE.Vector3().fromBufferAttribute(p,i+2);
   const area=b.clone().sub(a).cross(c.clone().sub(a)).length();
   const painted=Math.abs((uv.getX(i+1)-uv.getX(i))*(uv.getY(i+2)-uv.getY(i))-(uv.getY(i+1)-uv.getY(i))*(uv.getX(i+2)-uv.getX(i)));
   assert.ok(Number.isFinite(painted)&&painted>area*.95,roof+' stretches or loses the roof painting');
  }g.dispose();
 }
});

test('painted materials retain seeded nearest-filter textures and release owned maps',()=>{
 const config=fixture('house').structure;
 const resources=new StructureResources(),other=new StructureResources();
 const first=createStructureMaterials(config,resources,42),second=createStructureMaterials(config,other,42);
 const counts:number[]=[];
 for(const name of ['wood','stone','plaster','roof','thatch'] as const){
  const map=first[name].map as THREE.DataTexture;
  assert.ok(map&&map.image.width>1&&map.image.height>1,name+' has no painted surface');
  assert.deepEqual(map.image.data,(second[name].map as THREE.DataTexture).image.data);
  assert.equal(map.magFilter,THREE.NearestFilter);
  const index=counts.length;counts.push(0);map.addEventListener('dispose',()=>counts[index]++);
 }
 resources.dispose();resources.dispose();assert.ok(counts.every(n=>n===1));
 other.dispose();
});

test('bridge walking surface consists of supported boards rather than a single solid block',()=>{
 const plan=buildStructurePlan(fixture('bridge',42));
 const boards=plan.pieces.filter(p=>p.role==='deck-plank');
 assert.ok(boards.length>=8);
 const deck=plan.pieces.find(p=>p.role==='deck')!;
 assert.ok(boards.every(p=>p.support===deck.id));
 const sorted=boards.sort((a,b)=>a.position[0]-b.position[0]);
 for(let i=1;i<sorted.length;i++){
  const gap=sorted[i].position[0]-sorted[i].size[0]/2-(sorted[i-1].position[0]+sorted[i-1].size[0]/2);
  assert.ok(gap>0&&gap<.06,'boards overlap or leave an unusable gap');
 }
 assert.ok(boards.every(p=>p.position[1]-p.size[1]/2>deck.position[1]+deck.size[1]/2),'coplanar board/deck faces');
});
