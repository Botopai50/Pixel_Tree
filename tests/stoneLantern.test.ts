import './treeCanvasFixture';
import test from 'node:test';import assert from 'node:assert/strict';import * as THREE from 'three';
import {STRUCTURE_PRESETS} from '../src/structures/catalog';import {buildStructurePlan} from '../src/structures/plan';import {validateStructurePlan} from '../src/structures/validation';import {createAsset} from '../src/assets/generator';
test('stone lantern has a grounded column, four glazed openings, supported roof and real light',()=>{
 const source=STRUCTURE_PRESETS.structure_stoneLantern;
 for(const seed of [1,42,91]){
  const plan=buildStructurePlan({...source,seed});assert.deepEqual(validateStructurePlan(plan),[]);
  assert.equal(plan.pieces.filter(p=>p.role==='stone-lantern-corner').length,4);assert.equal(plan.pieces.filter(p=>p.role==='stone-lantern-glass').length,4);
  assert.equal(plan.pieces.filter(p=>p.role==='stone-lantern-pillar').length,4);
  const cap=plan.pieces.find(p=>p.role==='stone-lantern-cap')!;assert.equal(plan.supports.filter(s=>s.component===cap.id).length,4);
  const instance=createAsset({...source,seed});assert.ok(!instance.bounds.isEmpty());assert.ok(instance.group.getObjectByName('StoneLanternLight') instanceof THREE.PointLight);instance.update(1);instance.dispose();
 }
});
