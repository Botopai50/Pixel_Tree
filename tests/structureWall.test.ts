import './treeCanvasFixture';import test from 'node:test';import assert from 'node:assert/strict';import * as THREE from 'three';
import {fixture} from './structureFixtures';import {buildStructurePlan} from '../src/structures/plan';import {validateStructurePlan} from '../src/structures/validation';import {createStructure} from '../src/structures/generator';
import {buildCurtainWallPiece} from '../src/structures/geometry/wall';

test('curtain wall has paired crenellations, buttresses and a stair meeting the paved walk',()=>{
 for(const height of [2,5,10])for(const width of [6,15,24]){
  const p=buildStructurePlan(fixture('wall',42,{width,height}));assert.deepEqual(validateStructurePlan(p),[]);
  assert.equal(new Set(p.pieces.map(x=>x.id)).size,p.pieces.length);
  const body=p.pieces.find(x=>x.role==='muralha')!,walk=p.pieces.filter(x=>x.role==='wall-paver'),stairs=p.pieces.filter(x=>x.role==='wall-stair-block'),merlons=p.pieces.filter(x=>x.role==='battlement');
  assert.ok(p.pieces.some(x=>x.role==='wall-buttress-block'));assert.ok(merlons.some(x=>x.position[2]>0)&&merlons.some(x=>x.position[2]<0));
  const top=walk[0].position[1]+walk[0].size[1]/2;
  assert.ok(Math.abs(p.accesses[0].to[1]-top)<1e-6);
  assert.ok(stairs.every(x=>Math.abs(x.position[1]-x.size[1]/2)<1e-6));
  assert.ok(Math.abs(Math.min(...stairs.map(x=>x.position[0]-x.size[0]/2))-body.size[0]/2)<1e-6);
  assert.ok(Math.abs(Math.max(...stairs.map(x=>x.position[1]+x.size[1]/2))-top)<1e-6);
  // Distinct treads must not stack coplanar side faces on top of one another.
  const lane=stairs.filter(x=>x.position[2]===stairs[0].position[2]).sort((a,b)=>a.position[0]-b.position[0]);
  for(let i=1;i<lane.length;i++)assert.ok(Math.abs(lane[i-1].position[0]+lane[i-1].size[0]/2-lane[i].position[0]+lane[i].size[0]/2)<1e-6);
 }
});

test('wall stair is one closed stepped solid with perfectly planar side faces',()=>{
 const p=buildStructurePlan(fixture('wall')),stairs=p.pieces.filter(x=>x.role==='wall-stair-block');assert.equal(stairs.length,1);
 const piece=stairs[0],g=buildCurtainWallPiece(piece)!,pos=g.getAttribute('position');
 const planes=new Set(Array.from({length:pos.count},(_,i)=>pos.getZ(i).toFixed(6)));
 assert.equal(planes.size,2,'every stair vertex must lie on one of its two flat side planes');
 g.computeBoundingBox();assert.ok(Math.abs(g.boundingBox!.max.y-p.accesses[0].to[1])<1e-5);g.dispose();
});

test('wall masonry and ivy create finite meshes and release their resources once',()=>{
 const a=createStructure(fixture('wall')),counts=new Map<object,number>();let ivy=false;
 a.group.traverse(o=>{if(o instanceof THREE.Mesh){const pos=o.geometry.getAttribute('position');for(let i=0;i<pos.count;i++)assert.ok(Number.isFinite(pos.getX(i)+pos.getY(i)+pos.getZ(i)));const mats=Array.isArray(o.material)?o.material:[o.material];ivy ||= mats.some(m=>m.name==='AncientIvy');for(const r of [o.geometry,...mats])if(!counts.has(r)){counts.set(r,0);r.addEventListener('dispose',()=>counts.set(r,counts.get(r)!+1));}}});
 assert.ok(ivy);a.dispose();a.dispose();assert.ok([...counts.values()].every(n=>n===1));
});

test('wall vines vary in length, width and placement without mirroring the opposite face',()=>{
 const input=fixture('wall',42),p=buildStructurePlan(input),ivy=p.pieces.filter(x=>x.role==='wall-ivy');
 assert.deepEqual(p,buildStructurePlan(input));assert.ok(ivy.length>1);
 assert.ok(new Set(ivy.map(x=>x.size[1].toFixed(4))).size>1);
 assert.ok(new Set(ivy.map(x=>x.size[0].toFixed(4))).size>1);
 const mirrored=ivy.filter(x=>ivy.some(y=>x!==y&&Math.abs(x.position[0]-y.position[0])<1e-6&&Math.abs(x.position[2]+y.position[2])<1e-6));
 assert.equal(mirrored.length,0);
});
