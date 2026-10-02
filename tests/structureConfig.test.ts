import test from 'node:test';
import assert from 'node:assert/strict';
import { STRUCTURE_PRESETS, STRUCTURE_DESCRIPTORS } from '../src/structures/catalog';
import { normalizeStructureConfig } from '../src/structures/config';
import { structureStreams } from '../src/structures/random';
test('31 structure types have normalized parameters and independent seeded streams',()=>{
 assert.equal(Object.keys(STRUCTURE_DESCRIPTORS).length,31);
 const c=normalizeStructureConfig({...STRUCTURE_PRESETS.structure_house.structure,width:0,ruin:2,floors:99});
 assert.ok(c.width>=3); assert.equal(c.ruin,1); assert.ok(c.floors<=4);
 const a=structureStreams(42),b=structureStreams(42), ar=a.streamFor('roof','main'),br=b.streamFor('roof','main');
 const plant=b.streamFor('vegetation','main');for(let i=0;i<20;i++)plant();
 assert.deepEqual(Array.from({length:20},ar),Array.from({length:20},br));
 assert.ok(Number.isFinite(structureStreams(-42).streamFor('plan','main')()));
});