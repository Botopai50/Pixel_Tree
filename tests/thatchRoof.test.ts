import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {buildStructurePlan} from '../src/structures/plan';
import {buildRoof} from '../src/structures/geometry/roofs';
import {fixture} from './structureFixtures';

test('farm uses straw for both buildings and the porch by default',()=>{
 const p=buildStructurePlan(fixture('farm',42,{roof:'auto'}));
 assert.equal(p.roofs.length,2);
 assert.ok(p.roofs.every(r=>r.kind==='thatch'&&r.material==='thatch'));
 assert.equal(p.pieces.find(p=>p.role==='porch-cover')?.material,'thatch');
 const tiled=buildStructurePlan(fixture('farm',42,{roof:'gable'}));
 assert.ok(tiled.roofs.every(r=>r.kind==='gable'&&r.material==='roof'));
});

test('thatch has deterministic overlapping layers and an irregular projecting straw edge',()=>{
 const plan=buildStructurePlan(fixture('cabin',6923,{roof:'thatch',ruin:0}));
 const roof=plan.roofs[0],a=buildRoof(roof),b=buildRoof(roof);
 const material=new THREE.MeshBasicMaterial(),mesh=new THREE.Mesh(a,material);
 try{
  assert.deepEqual(a.attributes.position.array,b.attributes.position.array);
  assert.ok(Array.from(a.attributes.position.array).every(Number.isFinite));
  const ratio=roof.ridgeRatio??.5,span=roof.width*ratio,slope=roof.rise/span;
  const ridge=roof.x-roof.width/2+roof.width*ratio,left=roof.x-roof.width/2-roof.eaves;
  const low=roof.y-slope*roof.eaves;
  for(let row=0;row<4;row++){
   const t=(row+.5)/4,x=ridge+(left-ridge)*t,y=roof.y+roof.rise+(low-roof.y-roof.rise)*t;
   const ray=new THREE.Raycaster(new THREE.Vector3(x,y+2,roof.z),new THREE.Vector3(0,-1,0));
   const hit=ray.intersectObject(mesh)[0];
   assert.ok(hit);
   const expected=(.28+(3-row)*.045)*Math.sqrt(1+slope*slope);
   if(row===0)assert.ok(hit.point.y-y>=expected-1e-4,'first course reaches the shared raised ridge');
   else assert.ok(Math.abs(hit.point.y-y-expected)<1e-4,'layer should have its own raised surface');
  }
  const p=a.getAttribute('position'),ends=new Set<string>();
  for(let i=0;i<p.count;i++)if(p.getX(i)<left-.05)ends.add(p.getX(i).toFixed(3));
  assert.ok(ends.size>10,'straw fringe must not be a straight slab edge');
 }finally{a.dispose();b.dispose();material.dispose();}
});

test('straw ridge closes the end of the roof and porch inherits its material',()=>{
 const plan=buildStructurePlan(fixture('cabin',6923,{roof:'thatch',ruin:0}));
 assert.equal(plan.pieces.find(p=>p.role==='porch-cover')?.material,'thatch');
 assert.equal(plan.pieces.find(p=>p.role==='ridge-cap'),undefined);
 const roof=plan.roofs[0],g=buildRoof(roof),mat=new THREE.MeshBasicMaterial();
 try{
  const ridge=roof.x-roof.width/2+roof.width*(roof.ridgeRatio??.5);
  const z=roof.z-roof.depth/2-roof.eaves+.005;
  const hit=new THREE.Raycaster(new THREE.Vector3(ridge,roof.y+roof.rise+2,z),new THREE.Vector3(0,-1,0)).intersectObject(new THREE.Mesh(g,mat))[0];
  assert.ok(hit,'ridge must cover the exposed front end');
  assert.ok(hit.point.y>roof.y+roof.rise+.415,'roof slopes must meet at the raised ridge');
  const p=g.getAttribute('position'),heights=new Set<string>();
  for(let i=0;i<p.count;i++)if(Math.abs(p.getX(i)-ridge)<1e-5&&p.getY(i)>roof.y+roof.rise+.2)heights.add(p.getY(i).toFixed(5));
  assert.equal(heights.size,1,'both slopes must share exactly one ridge height');
 }finally{g.dispose();mat.dispose();}
});
