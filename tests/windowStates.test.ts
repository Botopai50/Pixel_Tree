import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {buildStructurePlan} from '../src/structures/plan';
import {renderStructure} from '../src/structures/renderer';
import {fixture} from './structureFixtures';

test('window poses are seeded, varied and independent of weather controls', () => {
 const states=new Set<string>();
 for(let seed=1;seed<=12;seed++){
  const source=fixture('largeHouse',seed),plan=buildStructurePlan(source);
  const repeat=buildStructurePlan(fixture('largeHouse',seed,{vegetation:.9,snow:1}));
  assert.deepEqual(plan.openings,repeat.openings);
  for(const o of plan.openings.filter(o=>o.kind==='window')){
   const angles=o.shutterAngles!;
   assert.ok(angles?.length===2,'window has no leaf pose');
   assert.ok(angles.every(a=>Number.isFinite(a)&&a>=0&&a<=170));
   states.add(angles.every(a=>a===0)?'closed':angles.every(a=>a>=140)?'open':'partial');
  }
 }
 assert.deepEqual([...states].sort(),['closed','open','partial']);
});

test('closed leaves meet at the center and partial leaves swing outside the wall', () => {
 const source=fixture('house',6539,{annexes:false,balconies:false});
 for(const angle of [0,60,155]){
  const plan=buildStructurePlan(source),o=plan.openings.find(o=>o.kind==='window')!;
  o.shutterAngles=[angle,angle];
  const w=plan.walls.find(w=>w.id===o.wall)!;
  const along=new THREE.Vector3(...w.end).sub(new THREE.Vector3(...w.start)).normalize();
  const outward=new THREE.Vector3(along.z,0,-along.x);
  const center=new THREE.Vector3(...w.start).add(new THREE.Vector3(...w.end)).multiplyScalar(.5).addScaledVector(along,o.offset);
  const result=renderStructure(plan,{...source.structure,type:'underground'});
  try{
   const leaves=result.assetGroup.children.filter(p=>p.name===o.id+'_shutter') as THREE.Mesh[];
   assert.equal(leaves.length,2);
   leaves.forEach(leaf=>{
    const pos=leaf.geometry.getAttribute('position'),xs:number[]=[],depths:number[]=[];
    for(let k=0;k<pos.count;k++){
     const v=new THREE.Vector3().fromBufferAttribute(pos,k).sub(center);
     xs.push(v.dot(along));depths.push(v.dot(outward));
    }
    assert.ok(Math.min(...depths)>w.thickness/2,'leaf penetrates wall');
    if(angle===0)assert.ok(Math.min(...xs.map(Math.abs))<.025,'closed leaves leave a central gap');
    if(angle===60)assert.ok(Math.max(...depths)-Math.min(...depths)>o.width*.4,'partial pose remains flat');
   });
  }finally{result.dispose();}
 }
});
