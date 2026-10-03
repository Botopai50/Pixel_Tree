import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {buildStructurePlan} from '../src/structures/plan';
import {buildRoof,buildHipFascia,buildHipCover} from '../src/structures/geometry/roofs';
import {fixture} from './structureFixtures';

test('hip roof skins meet without recessed cracks and all four hips receive wooden covers',()=>{
 for(const [width,depth] of [[6,12],[12,6],[8,8]]){
  const plan=buildStructurePlan(fixture('largeHouse',6923,{roof:'hip',width,depth,ruin:0}));
  for(const roof of plan.roofs){
   if(roof.kind!=='hip')continue;
   const covers=plan.pieces.filter(p=>p.support===roof.id&&p.role==='hip-cap');
   assert.equal(covers.length,4);
   assert.ok(covers.every(p=>p.material==='wood'));
   const geometry=buildRoof(roof),material=new THREE.MeshBasicMaterial(),mesh=new THREE.Mesh(geometry,material);
   const lift=.12*Math.sqrt(1+(roof.rise/Math.min(roof.width/2,roof.depth/2))**2);
   try{
    for(const cover of covers){
     const point=new THREE.Vector3(...cover.position).lerp(new THREE.Vector3(...cover.end!),.55);
     const ray=new THREE.Raycaster(point.clone().add(new THREE.Vector3(0,2,0)),new THREE.Vector3(0,-1,0));
     const hit=ray.intersectObject(mesh)[0];
     assert.ok(hit,'roof skin has an open crack along the hip');
     assert.ok(Math.abs(hit.point.y-point.y-lift)<1e-4,'hip reveals a recessed slab edge');
    }
   }finally{geometry.dispose();material.dispose();}
  }
 }
});

test('hip fascia mitres share four corner vertices and hip cover ends seat on their inner faces',()=>{
 const plan=buildStructurePlan(fixture('largeHouse',6923,{roof:'hip',ruin:0}));
 const keys=(g:THREE.BufferGeometry)=>{
  const p=g.getAttribute('position'),out=new Set<string>();
  for(let i=0;i<p.count;i++)out.add([p.getX(i),p.getY(i),p.getZ(i)].map(v=>v.toFixed(4)).join(','));
  return out;
 };
 for(const roof of plan.roofs.filter(r=>r.kind==='hip'))for(const cover of plan.pieces.filter(p=>p.support===roof.id&&p.role==='hip-cap')){
  const left=cover.position[0]<roof.x,front=cover.position[2]<roof.z;
  const a=buildHipFascia(roof,left?'left':'right'),b=buildHipFascia(roof,front?'front':'back');
  const cap=buildHipCover(roof,cover.position,cover.end!);
  try{
   const ak=keys(a),bk=keys(b);
   assert.equal([...ak].filter(k=>bk.has(k)).length,4,'fascia mitre leaves a gap or overlapping end');
   const innerX=cover.position[0]+(left?.12:-.12),innerZ=cover.position[2]+(front?.12:-.12);
   const p=cap.getAttribute('position');let seated=0;
   for(let i=0;i<p.count;i++){
    const point=new THREE.Vector3().fromBufferAttribute(p,i);
    if(Math.hypot(point.x-cover.position[0],point.z-cover.position[2])>.5)continue;
    assert.ok(Math.abs(point.x-innerX)<1e-5||Math.abs(point.z-innerZ)<1e-5,'cover end must meet one fascia inner face');
    seated++;
   }
   assert.ok(seated>0);
  }finally{a.dispose();b.dispose();cap.dispose();}
 }
});
