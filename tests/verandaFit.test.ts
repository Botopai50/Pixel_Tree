import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {buildStructurePlan} from '../src/structures/plan';
import {renderStructure} from '../src/structures/renderer';
import {fixture} from './structureFixtures';

test('front entrance annex never occupies the veranda footprint across seeds', () => {
 let annexes=0,withoutAnnex=0;
 for(let seed=1;seed<=32;seed++){
  const plan=buildStructurePlan(fixture('largeHouse',seed));
  const entrance=plan.volumes.find(v=>v.role==='entrance');
  entrance?annexes++:withoutAnnex++;
  const deck=plan.pieces.find(p=>p.role==='veranda')!;
  const anchor=entrance??plan.volumes[0];
  assert.ok(Math.abs(deck.position[2]+deck.size[2]/2-(anchor.z-anchor.depth/2))<1e-6,'veranda is not attached to the entrance facade');
  for(const v of plan.volumes){
   const overlapX=Math.min(deck.position[0]+deck.size[0]/2,v.x+v.width/2)-Math.max(deck.position[0]-deck.size[0]/2,v.x-v.width/2);
   const overlapZ=Math.min(deck.position[2]+deck.size[2]/2,v.z+v.depth/2)-Math.max(deck.position[2]-deck.size[2]/2,v.z-v.depth/2);
   assert.ok(overlapX<=1e-6||overlapZ<=1e-6,'house occupies the veranda');
  }
 }
 assert.ok(annexes>0&&withoutAnnex>0);
});

test('porch has a masonry base reaching from ground to the deck underside', () => {
 const plan=buildStructurePlan(fixture('largeHouse',6923));
 const deck=plan.pieces.find(p=>p.role==='veranda')!;
 const base=plan.pieces.find(p=>p.id===deck.support);
 assert.equal(base?.role,'veranda-base','porch deck floats above the ground');
 assert.equal(base.material,'stone');
 assert.ok(Math.abs(base.position[1]-base.size[1]/2)<1e-6,'base does not reach ground');
 assert.ok(Math.abs(base.position[1]+base.size[1]/2-(deck.position[1]-deck.size[1]/2))<1e-6,'gap below deck');
 assert.ok(base.size[0]>=deck.size[0]-.15&&base.size[2]>=deck.size[2]-.1,'base leaves an empty span');
});

test('veranda rafters and posts remain below the underside of their pitched cover', () => {
 const source=fixture('largeHouse',6923),plan=buildStructurePlan(source);
 const roof=plan.pieces.find(p=>p.role==='porch-cover')!;
 const inverse=new THREE.Matrix4().compose(new THREE.Vector3(...roof.position),
  new THREE.Quaternion().setFromEuler(new THREE.Euler(...roof.rotation!)),new THREE.Vector3(1,1,1)).invert();
 const result=renderStructure(plan,{...source.structure,type:'underground'});
 try{
  const supports=plan.pieces.filter(p=>p.role==='veranda-rafter'||p.role==='veranda-post');
  assert.equal(supports.length,4);
  for(const p of supports){
   const mesh=result.assetGroup.getObjectByName(p.id) as THREE.Mesh,pos=mesh.geometry.getAttribute('position');
   for(let i=0;i<pos.count;i++){
    const local=new THREE.Vector3().fromBufferAttribute(pos,i).applyMatrix4(inverse);
    assert.ok(local.y<=-roof.size[1]/2+1e-6,`${p.role} passes into the porch roof`);
   }
  }
 }finally{result.dispose();}
});

test('veranda has joined wooden roof borders, a front beam and corner braces', () => {
 const source=fixture('largeHouse',6923),plan=buildStructurePlan(source);
 const cover=plan.pieces.find(p=>p.role==='porch-cover')!;
 const inverse=new THREE.Matrix4().compose(new THREE.Vector3(...cover.position),
  new THREE.Quaternion().setFromEuler(new THREE.Euler(...cover.rotation!)),new THREE.Vector3(1,1,1)).invert();
 const trims=plan.pieces.filter(p=>p.role==='veranda-fascia');
 assert.equal(trims.length,3,'porch is missing its front and side borders');
 assert.equal(plan.pieces.filter(p=>p.role==='veranda-header').length,1);
 assert.equal(plan.pieces.filter(p=>p.role==='veranda-brace').length,2);
 const result=renderStructure(plan,{...source.structure,type:'underground'});
 try{
  for(const p of trims){
   const positions=(result.assetGroup.getObjectByName(p.id) as THREE.Mesh).geometry.getAttribute('position');
   const local=new THREE.Box3();
   for(let i=0;i<positions.count;i++)local.expandByPoint(new THREE.Vector3().fromBufferAttribute(positions,i).applyMatrix4(inverse));
   const roofBox=new THREE.Box3(new THREE.Vector3(...cover.size).multiplyScalar(-.5),new THREE.Vector3(...cover.size).multiplyScalar(.5));
   const overlap=local.clone().intersect(roofBox).getSize(new THREE.Vector3());
   assert.ok(overlap.x*overlap.y*overlap.z<1e-7,'border intersects roof tiles');
   const touchingEdge=Math.min(Math.abs(local.min.x-cover.size[0]/2),Math.abs(local.max.x+cover.size[0]/2),Math.abs(local.max.z+cover.size[2]/2));
   assert.ok(touchingEdge<1e-6,'border leaves a gap at the roof edge');
  }
 }finally{result.dispose();}
});
