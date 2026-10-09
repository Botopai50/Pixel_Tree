import './treeCanvasFixture';
import test from 'node:test';import assert from 'node:assert/strict';import * as THREE from 'three';
import {fixture} from './structureFixtures';import {buildStructurePlan} from '../src/structures/plan';
import {createStructure} from '../src/structures/generator';import {applyStructureDamage} from '../src/structures/damage';
import {structureStreams} from '../src/structures/random';import {validateStructurePlan} from '../src/structures/validation';
import {buildAncientPiece} from '../src/structures/geometry/ancientRuins';

test('ancient ruins keep a paved open hall, supported colonnades and a complete rear stone arch',()=>{
 for(const size of [6,12,20])for(const seed of [1,42,91]){
  const plan=buildStructurePlan(fixture('ancientRuins',seed,{width:size,depth:size*.75,ruin:.55}));
  assert.deepEqual(validateStructurePlan(plan),[]);assert.equal(plan.roofs.length,0);
  assert.ok(plan.pieces.filter(p=>p.role==='ancient-paving').length>=25);
  assert.equal(plan.pieces.filter(p=>p.role==='ancient-keystone').length,1);
  assert.equal(plan.pieces.filter(p=>p.role==='ancient-arch-wedge').length,12);
  assert.ok(plan.pieces.some(p=>p.role==='ancient-broken-column'));
  const stair=plan.accesses[0];assert.equal(stair.to[1],.64*fixture('ancientRuins',seed).structure.height/4);
  assert.ok(plan.pieces.filter(p=>p.role==='ancient-step').every(p=>p.position[1]+p.size[1]/2<=stair.to[1]));
  for(const p of plan.pieces.filter(p=>p.role==='ancient-lintel'))assert.equal(plan.supports.filter(s=>s.component===p.id).length,2);
  const weathered=applyStructureDamage(plan,.55,structureStreams(seed));
  assert.ok(weathered.pieces.filter(p=>p.role==='ancient-keystone'||p.role==='ancient-arch-wedge').every(p=>!p.removed),'designed ruins must retain the complete arch');
 }
});

test('ancient masonry and hanging ivy render finite meshes and dispose once',()=>{
 const source=fixture('ancientRuins',42),plan=buildStructurePlan(source);
 for(const p of plan.pieces){const g=buildAncientPiece(p);if(!g)continue;const pos=g.getAttribute('position');for(let i=0;i<pos.count;i++)assert.ok(Number.isFinite(pos.getX(i)+pos.getY(i)+pos.getZ(i)));g.dispose();}
 const asset=createStructure(source),disposed=new Map<object,number>();let ivy=false;
 asset.group.traverse(o=>{if(o instanceof THREE.Mesh){
  const materials=Array.isArray(o.material)?o.material:[o.material];ivy ||= materials.some(m=>m.name==='AncientIvy');
  for(const r of [o.geometry,...materials])if(!disposed.has(r)){disposed.set(r,0);r.addEventListener('dispose',()=>disposed.set(r,disposed.get(r)!+1));}
 }});
 assert.ok(ivy);asset.dispose();asset.dispose();assert.ok([...disposed.values()].every(n=>n===1));
});
