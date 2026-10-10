import './treeCanvasFixture';
import test from 'node:test';import assert from 'node:assert/strict';import * as THREE from 'three';
import {TREE_PRESETS} from '../src/constants/presets';import {buildProceduralLog} from '../src/services/logGenerator';import {structureStreams} from '../src/structures/random';

test('hollow logs have a continuous shell joining bark, end rims and inner lining',()=>{
 for(const seed of [1,42,2212,8319])for(const length of [2,4.2,8]){
  const config={...TREE_PRESETS.hollow_log,seed,trunkHeight:length,branchCount:0,showMushrooms:false,mushroomCount:0};
  const bark=new THREE.MeshBasicMaterial(),log=buildProceduralLog(config,bark,structureStreams(seed).streamFor('architecture','log'));
  const edges=new Map<string,number>();
  for(const name of ['BotW_LogWood','BotW_LogEndGrain','LogHollow']){
   const mesh=log.group.getObjectByName(name) as THREE.Mesh;assert.ok(mesh);const pos=mesh.geometry.getAttribute('position'),index=mesh.geometry.index!;
   const key=(i:number)=>[pos.getX(i),pos.getY(i),pos.getZ(i)].map(n=>Math.round(n*1e5)).join(',');
   for(let t=0;t<index.count;t+=3){const v=[index.getX(t),index.getX(t+1),index.getX(t+2)].map(key);for(let e=0;e<3;e++){if(v[e]===v[(e+1)%3])continue;const k=[v[e],v[(e+1)%3]].sort().join('|');edges.set(k,(edges.get(k)??0)+1);}}
  }
  assert.equal([...edges.values()].filter(count=>count!==2).length,0,`open shell at seed ${seed}, length ${length}`);
  for(const g of log.geometriesToDispose)g.dispose();for(const m of log.materialsToDispose)m.dispose();for(const t of log.texturesToDispose)t.dispose();bark.dispose();
 }
});
