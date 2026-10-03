import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {fixture} from './structureFixtures';
import {buildStructurePlan} from '../src/structures/plan';
import {renderStructure} from '../src/structures/renderer';
import {buildRoof} from '../src/structures/geometry/roofs';

test('windows, frames and open leaves avoid annex roof triangles', () => {
 for(const seed of [2,3,5,8]){
  const source=fixture('largeHouse',seed),plan=buildStructurePlan(source);
  const result=renderStructure(plan,{...source.structure,type:'underground'});
  const roofs=plan.roofs.map(r=>({spec:r,geometry:buildRoof(r)}));
  try{
   assert.ok(plan.openings.some(o=>o.kind==='window'),'all windows were removed');
   for(const opening of plan.openings.filter(o=>o.kind==='window')){
    const wall=plan.walls.find(w=>w.id===opening.wall)!;
    const parts=result.assetGroup.children.filter(p=>p.name.startsWith(opening.id+'_'));
    for(const part of parts)for(const roof of roofs.filter(r=>r.spec.volume!==wall.volume)){
     const bounds=new THREE.Box3().setFromObject(part),pos=roof.geometry.getAttribute('position');
     for(let i=0;i<pos.count;i+=3){
      const triangle=new THREE.Triangle(...[i,i+1,i+2].map(j=>new THREE.Vector3().fromBufferAttribute(pos,j)) as [THREE.Vector3,THREE.Vector3,THREE.Vector3]);
      assert.equal(bounds.intersectsTriangle(triangle),false,`${opening.id} intersects an annex roof (seed ${seed})`);
     }
    }
   }
  }finally{result.dispose();roofs.forEach(r=>r.geometry.dispose());}
 }
});
