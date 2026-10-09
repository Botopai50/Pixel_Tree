import './treeCanvasFixture';
import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {STRUCTURE_DESCRIPTORS} from '../src/structures/catalog';
import {normalizeStructureConfig} from '../src/structures/config';
import {createStructureMaterials,StructureResources} from '../src/structures/materials';
import {buildStructurePlan} from '../src/structures/plan';
import {renderStructure} from '../src/structures/renderer';
import type {StructureKind} from '../src/structures/types';
import {fixture} from './structureFixtures';

test('every structure uses the outpost iron texture and provides complete wear attributes',()=>{
 const referenceResources=new StructureResources(),reference=createStructureMaterials(normalizeStructureConfig(fixture('outpost',42).structure),referenceResources,42).metal;
 const referenceMap=reference.map as THREE.DataTexture;
 let ironStructures=0;
 for(const type of Object.keys(STRUCTURE_DESCRIPTORS) as StructureKind[]){
  const source=fixture(type,42,{vegetation:0,ruin:0}),config=normalizeStructureConfig(source.structure),result=renderStructure(buildStructurePlan(source),config);
  let count=0;
  result.assetGroup.traverse(o=>{
   if(!(o instanceof THREE.Mesh))return;
   const material=o.material as THREE.MeshStandardMaterial;
   if(material.metalness!==.15)return;
   count++;assert.equal(material.roughness,.65,type);
   const map=material.map as THREE.DataTexture;
   assert.equal(map.magFilter,THREE.NearestFilter,type);
   assert.deepEqual(map.image.data,referenceMap.image.data,type+' iron texture differs from outpost');
   assert.deepEqual(map.repeat.toArray(),referenceMap.repeat.toArray(),type);
   assert.equal(material.customProgramCacheKey(),reference.customProgramCacheKey(),type);
   for(const name of ['ironLocalPosition','ironHalfSize']){
    const attribute=o.geometry.getAttribute(name);
    assert.ok(attribute,type+' missing '+name);
    assert.equal(attribute.count,o.geometry.getAttribute('position').count,type);
    assert.ok(Array.from(attribute.array).every(Number.isFinite),type);
   }
  });
  if(count)ironStructures++;
  result.dispose();
 }
 assert.ok(ironStructures>=25,'audit covers doors, shutters, structural fittings and cooking props');
 referenceResources.dispose();
});

test('nails and rivets are iron rather than recess materials',()=>{
 for(const type of ['outpost','bridge','dock','lighthouse'] as const){
  const plan=buildStructurePlan(fixture(type,42));
  for(const piece of plan.pieces.filter(p=>/(rivet|nail)/.test(p.role)))assert.equal(piece.material,'metal',piece.role);
 }
});
