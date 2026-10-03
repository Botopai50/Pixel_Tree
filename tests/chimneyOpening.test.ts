import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {buildStructurePlan} from '../src/structures/plan';
import {renderStructure} from '../src/structures/renderer';
import {fixture} from './structureFixtures';

test('chimney crown and shaft leave a continuous flue with a recessed dark interior',()=>{
 const source=fixture('largeHouse',2),plan=buildStructurePlan(source);
 const asset=renderStructure(plan,{...source.structure,type:'underground',scale:1});
 try{
  const cap=plan.pieces.find(p=>p.role==='chimney-cap')!;
  const recess=plan.pieces.find(p=>p.role==='chimney-recess')!;
  const top=cap.position[1]+cap.size[1]/2;
  const ray=new THREE.Raycaster();
  for(const offset of [-.12,0,.12]){
   ray.set(new THREE.Vector3(cap.position[0]+offset,top+1,cap.position[2]),new THREE.Vector3(0,-1,0));
   const hit=ray.intersectObject(asset.assetGroup,true)[0];
   assert.equal(hit.object.name,recess.id,'flue is blocked by a solid chimney face');
   assert.ok(top-hit.point.y>.6,'interior must sit visibly below the rim');
  }
  ray.set(new THREE.Vector3(cap.position[0]+.3,top+1,cap.position[2]),new THREE.Vector3(0,-1,0));
  const rim=ray.intersectObject(asset.assetGroup,true)[0];
  assert.equal(rim.object.name,cap.id);
  assert.ok(Math.abs(rim.point.y-top)<1e-5);
 }finally{asset.dispose();}
});
