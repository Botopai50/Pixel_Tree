import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {fixture} from './structureFixtures';
import {buildStructurePlan} from '../src/structures/plan';
import {createStructure} from '../src/structures/generator';

test('dock has two accessible fingers, supported plank decks and full-height shore steps',()=>{
 for(const patch of [{},{width:4,depth:3,height:2},{width:24,depth:15,height:6}]){
  const source=fixture('dock',42,patch),plan=buildStructurePlan(source);
  assert.deepEqual(plan,buildStructurePlan(source));
  assert.equal(plan.pieces.filter(p=>p.role==='dock-finger').length,2);
  assert.ok(plan.pieces.filter(p=>p.role==='dock-pier-brace').length>4);
  for(const brace of plan.pieces.filter(p=>p.role==='dock-pier-brace')){
   assert.deepEqual(brace.cuts?.end,[0,1,0]);
   const girder=plan.pieces.find(p=>p.role==='dock-edge-girder'&&Math.abs(p.position[1]-p.size[0]/2-brace.end![1])<1e-8);
   assert.ok(girder,'diagonal must meet the underside of the edge girder');
  }
  for(const deck of plan.pieces.filter(p=>p.role==='dock-finger'||p.role==='dock-main-platform'))assert.ok(plan.supports.filter(s=>s.component===deck.id).length>=2);
  const access=plan.accesses.find(s=>s.role==='stairs')!,steps=plan.pieces.filter(p=>p.role==='dock-stone-step');
  assert.ok(Math.abs(Math.max(...steps.map(p=>p.position[1]+p.size[1]/2))-access.to[1])<1e-8);
  assert.ok(steps.every(p=>p.size[2]>=access.width));
  const asset=createStructure(source);
  asset.group.traverse(object=>{if(object instanceof THREE.Mesh)assert.ok(Array.from(object.geometry.getAttribute('position').array).every(Number.isFinite));});
  const water=asset.group.getObjectByName('PresentationWater') as THREE.Mesh;
  const pos=water.geometry.getAttribute('position'),uv=water.geometry.getAttribute('uv');
  for(let i=0;i<uv.count;i++)assert.ok(Math.abs(uv.getX(i)-pos.getX(i)/source.structure.scale)<1e-5);
  asset.dispose();
 }
});
