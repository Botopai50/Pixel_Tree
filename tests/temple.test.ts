import test from 'node:test';import assert from 'node:assert/strict';import {buildStructurePlan} from '../src/structures/plan';import {fixture} from './structureFixtures';
test('ancient temple has square stone columns, carved friezes and a continuous roof terrace',()=>{
 const p=buildStructurePlan(fixture('temple'));
 const columns=p.pieces.filter(p=>p.role==='temple-column');assert.equal(columns.length,6);assert.ok(columns.every(p=>p.kind==='box'));
 assert.ok(p.pieces.some(p=>p.role==='temple-glyph'));
 assert.ok(p.volumes.some(v=>v.role==='upper-shrine'));
 assert.equal(p.roofs.filter(r=>r.volume===p.volumes.find(v=>v.role==='sanctuary')!.id).length,1);
 assert.ok(p.pieces.filter(p=>p.role==='capital').length>=12);
 assert.ok(p.pieces.every(p=>!p.role.includes('veranda')));
});

