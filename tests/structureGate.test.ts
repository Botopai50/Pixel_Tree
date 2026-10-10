import './treeCanvasFixture';
import test from 'node:test';
import assert from 'node:assert/strict';
import {fixture} from './structureFixtures';
import {buildStructurePlan} from '../src/structures/plan';
import {createStructure} from '../src/structures/generator';
import {buildGatePiece} from '../src/structures/geometry/gate';

test('gateway has two roofless towers and doors inside the same arch',()=>{
 for(const seed of [42,6849])for(const height of [3,6,12]){
  const input=fixture('gate',seed,{height}),p=buildStructurePlan(input);
  assert.deepEqual(p,buildStructurePlan(input));
  assert.equal(p.volumes.length,2);assert.ok(p.roofs.every(r=>r.kind==='flat'&&r.material==='stone'));
  const wall=p.pieces.find(p=>p.role==='gate-arched-wall')!,spring=wall.end![0],radius=wall.end![1];
  assert.ok(wall.size[1]>spring+radius);
  assert.equal(p.pieces.filter(p=>p.role==='gate-arch-stone').length,26);
  assert.equal(p.pieces.filter(p=>p.role==='gate-door-ring').length,2);
  for(const plank of p.pieces.filter(p=>p.role==='gate-door-plank')){
   const g=buildGatePiece(plank)!,pos=g.getAttribute('position');
   for(let i=0;i<pos.count;i++){
    const x=pos.getX(i),y=pos.getY(i);
    assert.ok(Math.abs(x)<radius);assert.ok(y>=0&&y<spring+Math.sqrt(radius*radius-x*x));
   }g.dispose();
  }
 }
});

test('gateway renders finite masonry, arch and ironwork',()=>{
 const asset=createStructure(fixture('gate'));let meshes=0;
 asset.group.traverse(o=>{if('geometry' in o){const pos=(o as any).geometry.getAttribute('position');meshes++;for(let i=0;i<pos.count;i++)assert.ok(Number.isFinite(pos.getX(i)+pos.getY(i)+pos.getZ(i)));}});
 assert.ok(meshes>0);assert.ok(asset.bounds.max.y>5);asset.dispose();asset.dispose();
});
