import './treeCanvasFixture';
import test from 'node:test';import assert from 'node:assert/strict';import * as THREE from 'three';
import {TREE_PRESETS} from '../src/constants/presets';import {createAsset} from '../src/assets/generator';import {classifyAsset} from '../src/assets/catalog';import {plantKindOf} from '../src/services/groundPlantGenerator';
for(const id of ['lilyPads','duckweed'] as const)test(`${id} is a visible aquatic ground plant with leaves above the water`,()=>{
 const config=TREE_PRESETS[id];assert.equal(classifyAsset(config),'plant');assert.equal(plantKindOf(config),id);
 const asset=createAsset(config),water=asset.group.getObjectByName('ShallowMangroveWater')!;
 assert.ok(water);const waterY=water.getWorldPosition(new THREE.Vector3()).y;
 let leaves=0,flowers=0;
 asset.group.traverse(o=>{if(o.name==='WaterLilyFlower')flowers++;if(o.name==='LilyPad'||o.name==='DuckweedLeaf'){leaves++;const box=new THREE.Box3().setFromObject(o);assert.ok(box.min.y>waterY,`${o.name} intersects water`);assert.ok(Number.isFinite(box.max.x));}});
 assert.ok(leaves>=(id==='lilyPads'?8:250));if(id==='lilyPads')assert.ok(flowers>=3);asset.dispose();
});
