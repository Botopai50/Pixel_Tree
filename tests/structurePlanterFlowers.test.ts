import './treeCanvasFixture';
import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {natureAsset} from '../src/structures/natureAdapters';
import {fixture} from './structureFixtures';

test('planter blossoms share scene pixel size without enlarging the plant',()=>{
 const c=fixture('treehouse',9).structure!,coarse=natureAsset('flowers',c,9,32),native=natureAsset('flowers',c,9);
 let blooms=0;
 coarse.group.traverse(object=>{if(object.name==='PixelWildflowerBloom'){
  const mesh=object as THREE.Mesh,grid=mesh.geometry.userData.pixelGrid;
  assert.ok(grid<16);assert.ok(Math.abs(2*mesh.scale.x/grid-1/32)<1e-8);blooms++;
 }});
 assert.ok(blooms>0);
 const coarseBounds=new THREE.Box3().setFromObject(coarse.group),nativeBounds=new THREE.Box3().setFromObject(native.group);
 assert.ok(Math.abs(coarseBounds.max.y-nativeBounds.max.y)<.04);
 coarse.dispose();native.dispose();
});
