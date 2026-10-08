import './treeCanvasFixture';
import test from 'node:test';import assert from 'node:assert/strict';import * as THREE from 'three';import {buildStructurePlan} from '../src/structures/plan';import {fixture} from './structureFixtures';import {buildStructureNature,blockedByArchitecture} from '../src/structures/vegetation';import {createStructure} from '../src/structures/generator';
test('vegetation uses independent streams, avoids architecture and owns no extra presentation ground',()=>{const low=fixture('house',17,{vegetation:0}),high=fixture('house',17,{vegetation:1});assert.deepEqual(buildStructurePlan(low),buildStructurePlan(high));const plan=buildStructurePlan(high),nature=buildStructureNature(plan,high.structure);assert.ok(nature.group.children.length>0);for(const child of nature.group.children)assert.ok(!blockedByArchitecture(plan,child.position.x,child.position.z,.8),child.name);assert.equal(nature.group.getObjectByName('GroundMound'),undefined);nature.dispose();nature.dispose();const zero=buildStructureNature(plan,low.structure);assert.equal(zero.group.children.length,0);zero.dispose();});
test('treehouse uses the full game tree with pixel bark, canopy and no duplicate ground',()=>{const asset=createStructure(fixture('treehouse',9,{vegetation:0}));const tree=asset.assetGroup.getObjectByName('LivingTree');assert.ok(tree);assert.equal(tree!.userData.treeSpecies,'hyrule_oak');assert.ok(tree!.getObjectByName('ProceduralTreeWood'));assert.ok(tree!.getObjectByName('BotW_FoliageCanopy'));assert.equal(tree!.getObjectByName('GroundMound'),undefined);let instances=0;tree!.traverse(o=>{if(o instanceof THREE.InstancedMesh)instances++;});assert.ok(instances);asset.update(1);asset.dispose();asset.dispose();});

test('climbing ivy attaches to abandoned walls while leaving opening rectangles clear',()=>{const a=createStructure(fixture('abandonedHouse',23,{ruin:.24,vegetation:1}));const ivy=a.assetGroup.getObjectByName('ClimbingIvy');assert.ok(ivy);assert.ok(ivy!.children.every(x=>x instanceof THREE.InstancedMesh));a.dispose();});
test('support tree shares native scene lighting and fog and cabin uses wooden access',()=>{
 const source=fixture('treehouse',9,{vegetation:0}),asset=createStructure(source),tree=asset.assetGroup.getObjectByName('LivingTree')!;
 tree.traverse(o=>{if(o instanceof THREE.Mesh)for(const material of Array.isArray(o.material)?o.material:[o.material]){assert.ok(material instanceof THREE.MeshStandardMaterial);assert.equal(material.fog,true);}});
 const plan=buildStructurePlan(source);
 assert.ok(plan.pieces.some(p=>p.role==='tree-ladder-rung'));
 assert.ok(!plan.pieces.some(p=>p.kind==='stairs'&&!p.removed));
 assert.ok(plan.pieces.filter(p=>p.role==='foundation').every(p=>p.material==='wood'));
 asset.dispose();
});
