import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {fixture} from './structureFixtures';
import {buildStructurePlan} from '../src/structures/plan';
import {renderStructure} from '../src/structures/renderer';

test('plaster painting follows wall contacts with seeded irregular pixel shadows', () => {
 const source=fixture('house',6539,{annexes:false,balconies:false,vegetation:0});
 const plan=buildStructurePlan(source);plan.openings=[];
 const result=renderStructure(plan,{...source.structure,type:'underground'});
 try{
  const w=plan.walls.find(w=>w.material==='plaster'&&!w.gable)!;
  const mesh=result.assetGroup.getObjectByName(w.id) as THREE.Mesh;
  const map=(mesh.material as THREE.MeshStandardMaterial).map as THREE.DataTexture;
  assert.equal(map.wrapS,THREE.ClampToEdgeWrapping,'wall still uses unrelated repeating patches');
  const {width,height,data}=map.image;
  const colors=new Set<string>();
  for(let i=0;i<data.length;i+=4)colors.add(`${data[i]},${data[i+1]},${data[i+2]}`);
  assert.equal(colors.size,3,'plaster must use exactly three hard palette tones');
  const brightness=(x:number,y:number)=>{const i=(Math.floor(y*height)*width+Math.floor(x*width))*4;return (data[i]+data[i+1]+data[i+2])/3;};
  assert.ok(brightness(.5,.98)<brightness(.5,.55)-15,'no contact shadow beneath the upper beam');
  const edge=Array.from({length:16},(_,i)=>{
   for(let row=Math.floor(height*.75);row<height;row++)if(brightness(.2+i*.035,row/height)<brightness(.5,.55)-15)return row;
  });
  assert.ok(new Set(edge).size>=2,'contact shadow has no irregular silhouette');
  assert.equal(map.magFilter,THREE.NearestFilter);
 }finally{result.dispose();}
});
