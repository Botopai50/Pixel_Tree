import test from 'node:test';import assert from 'node:assert/strict';import {buildStructurePlan} from '../src/structures/plan';import {fixture} from './structureFixtures';
import './treeCanvasFixture';import * as THREE from 'three';import {createStructure} from '../src/structures/generator';import {validateStructurePlan} from '../src/structures/validation';
import {buildTemplePiece} from '../src/structures/geometry/temple';
test('ancient temple has square stone columns, carved friezes and a continuous roof terrace',()=>{
 const p=buildStructurePlan(fixture('temple'));
 const columns=p.pieces.filter(p=>p.role==='temple-column');assert.equal(columns.length,6);assert.ok(columns.every(p=>p.kind==='box'));
 assert.ok(p.pieces.some(p=>p.role==='temple-glyph'));
 assert.ok(p.volumes.some(v=>v.role==='upper-shrine'));
 assert.equal(p.roofs.filter(r=>r.volume===p.volumes.find(v=>v.role==='sanctuary')!.id).length,1);
 assert.ok(p.pieces.filter(p=>p.role==='capital').length>=12);
 assert.ok(p.pieces.every(p=>!p.role.includes('veranda')));
});

test('temple slabs sit on closed decks and the shrine rests on the terrace paving',()=>{
 for(const seed of [1,42,91])for(const height of [2,7,12]){
  const p=buildStructurePlan(fixture('temple',seed,{height}));assert.deepEqual(validateStructurePlan(p),[]);
  assert.equal(new Set(p.pieces.map(x=>x.id)).size,p.pieces.length);
  assert.equal(p.roofs.length,2);assert.ok(p.roofs.every(r=>r.kind==='flat'&&r.material==='stone'&&!r.accessHole));
  const roof=p.roofs.find(r=>r.id==='temple-terrace')!,deckTop=roof.y+roof.flatThickness!;
  const paving=p.pieces.filter(x=>x.role==='temple-terrace-paver');
  assert.ok(paving.length>20);assert.ok(paving.every(x=>Math.abs(x.position[1]-x.size[1]/2-deckTop)<1e-6));
  const upper=p.volumes.find(v=>v.role==='upper-shrine')!;
  assert.ok(Math.abs(upper.bottom-paving[0].position[1]-paving[0].size[1]/2)<1e-6);
  const access=p.accesses.find(x=>x.id==='temple-entry')!;
  assert.ok(p.pieces.filter(x=>x.role==='temple-entry-step').every(x=>x.position[1]+x.size[1]/2<=access.to[1]+1e-6));
 }
});

test('temple masonry, carved friezes and ivy release their render resources once',()=>{
 const a=createStructure(fixture('temple')),counts=new Map<object,number>();let ivy=false;
 a.group.traverse(o=>{if(o instanceof THREE.Mesh){const mats=Array.isArray(o.material)?o.material:[o.material];ivy ||= mats.some(m=>m.name==='AncientIvy');const pos=o.geometry.getAttribute('position');for(let i=0;i<pos.count;i++)assert.ok(Number.isFinite(pos.getX(i)+pos.getY(i)+pos.getZ(i)));for(const r of [o.geometry,...mats])if(!counts.has(r)){counts.set(r,0);r.addEventListener('dispose',()=>counts.set(r,counts.get(r)!+1));}}});
 assert.ok(ivy);a.dispose();a.dispose();assert.ok([...counts.values()].every(n=>n===1));
});

test('temple ivy follows the wall plane instead of showing the edge of the leaves',()=>{
 const p=buildStructurePlan(fixture('temple'));
 for(const piece of p.pieces.filter(x=>x.role==='temple-ivy')){
  const g=buildTemplePiece(piece)!;g.computeBoundingBox();const size=g.boundingBox!.getSize(new THREE.Vector3());
  if(Math.abs(piece.rotation![1])===Math.PI/2)assert.ok(size.z>size.x*1.4,'side-wall foliage must spread along Z');
  else assert.ok(size.x>size.z*1.4,'front-wall foliage must spread along X');
  g.dispose();
 }
});
