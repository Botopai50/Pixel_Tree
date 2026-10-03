import test from 'node:test';
import assert from 'node:assert/strict';
import {buildStructurePlan} from '../src/structures/plan';
import {selectAutomaticRoof} from '../src/structures/roofSelection';
import {fixture} from './structureFixtures';

test('automatic houses produce four roof families without rural straw across seeds',()=>{
 const kinds=new Set<string>();
 for(let seed=1;seed<=80;seed++){
  const input=fixture('house',seed,{roof:'auto',annexes:false});
  const a=buildStructurePlan(input),b=buildStructurePlan(input);
  assert.deepEqual(a.roofs,b.roofs);kinds.add(a.roofs[0].kind);
 }
 assert.deepEqual([...kinds].sort(),['flat','gable','hip','shed']);
});

test('explicit roof settings and rural straw defaults remain respected',()=>{
 for(const kind of ['gable','hip','shed','flat','thatch'] as const){
  const p=buildStructurePlan(fixture('largeHouse',12,{roof:kind}));
  assert.ok(p.roofs.every(r=>r.kind===kind));
 }
 for(const type of ['cabin','farm','barn'] as const)assert.ok(buildStructurePlan(fixture(type,12,{roof:'auto'})).roofs.every(r=>r.kind==='thatch'));
});

test('climate and annex role affect the automatic choices',()=>{
 const c=fixture('house',1).structure;
 assert.equal(selectAutomaticRoof({...c,biome:'gerudo'},'building',.1),'flat');
 assert.equal(selectAutomaticRoof(c,'annex',.6),'shed');
 for(let i=0;i<100;i++)assert.ok(!['flat','thatch'].includes(selectAutomaticRoof({...c,biome:'hebra'},'building',i/100)));
});

test('shed roofs alternate direction and lateral annexes drain outward',()=>{
 const directions=new Set<number>();
 for(let seed=1;seed<=30;seed++){
  const p=buildStructurePlan(fixture('largeHouse',seed,{roof:'shed'}));
  const main=p.volumes[0];directions.add(p.roofs[0].shedDirection!);
  for(const roof of p.roofs.slice(1))if(Math.abs(roof.x-main.x)>.25)assert.equal(roof.shedDirection,roof.x>main.x?-1:1);
 }
 assert.equal(directions.size,2);
});

test('partitioned sloping walls never exceed their own shed roof plane',()=>{
 let split=0;
 for(let seed=1;seed<=30;seed++){
  const p=buildStructurePlan(fixture('largeHouse',seed,{roof:'shed'}));
  for(const wall of p.walls){
   const roof=p.roofs.find(r=>r.volume===wall.volume)!;
   for(const [point,height] of [[wall.start,wall.topLeft??wall.height],[wall.end,wall.topRight??wall.height]] as const){
    const top=roof.y+roof.rise*(.5+(roof.shedDirection??1)*(point[0]-roof.x)/roof.width);
    assert.ok(wall.bottom+height<=top+1e-5,'wall projects through its roof: '+wall.id);
   }
   if(wall.id.includes('_section_'))split++;
  }
 }
 assert.ok(split>0);
});
