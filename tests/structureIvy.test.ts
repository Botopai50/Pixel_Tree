import './treeCanvasFixture';
import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createIvyLeafSurface} from '../src/structures/ivySurface';
import {createStructure} from '../src/structures/generator';
import {fixture} from './structureFixtures';

test('ivy silhouette follows its texel grid while retaining a folded leaf blade',()=>{
 const leaf=createIvyLeafSurface(),points=leaf.geometry.getAttribute('position'),grid=leaf.geometry.userData.pixelGrid;
 for(let i=0;i<points.count;i++){
  assert.ok(Math.abs((points.getX(i)+.5)*grid-Math.round((points.getX(i)+.5)*grid))<1e-5);
  assert.ok(Math.abs(points.getY(i)*grid-Math.round(points.getY(i)*grid))<1e-5);
 }
 assert.ok(Array.from({length:points.count},(_,i)=>points.getZ(i)).some(z=>z>.08));
 assert.equal(leaf.texture.magFilter,THREE.NearestFilter);
 leaf.geometry.dispose();leaf.material.dispose();leaf.texture.dispose();
});

test('tree ivy is attached to the actual bark surface at different asset scales',()=>{
 for(const scale of [.7,1.8]){
  const asset=createStructure(fixture('treehouse',9,{scale,vegetation:.5})),ivy=asset.assetGroup.getObjectByName('TreehouseIvy') as THREE.InstancedMesh,wood=asset.assetGroup.getObjectByName('ProceduralTreeWood')!;
  asset.group.updateMatrixWorld(true);
  const sizes=new Set<number>();
  for(const name of ['TreehouseIvySmall','TreehouseIvy','TreehouseIvyLarge']){
   const leaves=asset.assetGroup.getObjectByName(name) as THREE.InstancedMesh,instance=new THREE.Matrix4(),size=new THREE.Vector3(),q=new THREE.Quaternion(),at=new THREE.Vector3();
   const grid=leaves.geometry.userData.pixelGrid;
   for(let i=0;i<leaves.count;i++){
    leaves.getMatrixAt(i,instance);instance.decompose(at,q,size);
    assert.ok(Math.abs(size.x/grid-1/leaves.userData.pixelDensity)<1e-6,'different leaf sizes preserve the same world texel size');
   }
   sizes.add(grid);
  }
  assert.equal(sizes.size,3);
  const matrix=new THREE.Matrix4(),position=new THREE.Vector3(),direction=new THREE.Vector3(),ray=new THREE.Raycaster();let checked=0;
  for(let i=0;i<ivy.userData.trunkLeafCount;i+=Math.max(1,Math.floor(ivy.userData.trunkLeafCount/16))){
   ivy.getMatrixAt(i,matrix);position.setFromMatrixPosition(matrix).applyMatrix4(ivy.matrixWorld);
   direction.set(0,0,1).transformDirection(matrix).transformDirection(ivy.matrixWorld);
   ray.set(position.clone().addScaledVector(direction,.12*scale),direction.clone().negate());
   const hit=ray.intersectObject(wood,false)[0];
   assert.ok(hit&&hit.distance<.23*scale,'leaf root must stay against the curved bark');checked++;
  }
  assert.ok(checked>10);
  const leafHeights:number[]=[];
  for(let i=0;i<ivy.userData.trunkLeafCount;i++){ivy.getMatrixAt(i,matrix);leafHeights.push(new THREE.Vector3().setFromMatrixPosition(matrix).applyMatrix4(ivy.matrixWorld).y);}
  const woodTop=new THREE.Box3().setFromObject(wood).max.y;
  assert.ok(Math.max(...leafHeights)>woodTop*.85,'vines continue into the upper branches');
  const bins=new Set(leafHeights.map(y=>Math.floor(y/scale*4)));
  const total=Math.ceil(Math.max(...leafHeights)/scale*4);
  assert.ok(bins.size<total*.85,'leaf groups leave irregular bare runs');
  asset.dispose();
 }
});
