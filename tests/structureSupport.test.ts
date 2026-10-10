import test from 'node:test';
import assert from 'node:assert/strict';
import {enforceRuinSupports} from '../src/structures/structuralSupport';
import type {StructurePlan,PieceSpec,V3} from '../src/structures/types';
import {STRUCTURE_PRESETS} from '../src/structures/catalog';
import {buildStructurePlan} from '../src/structures/plan';
import {applyStructureDamage} from '../src/structures/damage';
import {structureStreams} from '../src/structures/random';

const piece=(id:string,position:V3,size:V3,role:string,end?:V3):PieceSpec=>({id,position,size,role,end,kind:end?'beam':'box',material:'wood',support:'ground'});
const plan=(pieces:PieceSpec[]):StructurePlan=>({schemaVersion:1,type:'house',seed:42,pieces,volumes:[],walls:[],roofs:[],openings:[],joints:[],accesses:[],damage:[],debris:[],propZones:[],supports:pieces.map(p=>({component:p.id,on:p.support}))});

test('ground ownership cannot keep a floating beam or elevated foundation standing',()=>{
 const p=plan([piece('rail',[-1,3,0],[.2,.2,.2],'roof-rafter',[1,3,0]),piece('base',[0,4,0],[3,.3,3],'foundation')]);
 enforceRuinSupports(p,new Set());assert.ok(p.pieces.every(p=>p.removed));
});

test('one timber bearing collapses a platform; two separated bearings retain it',()=>{
 for(const count of [1,2]){
  const supports=Array.from({length:count},(_,i)=>piece('post'+i,[i?1:-1,0,0],[.3,.3,.3],'corner-post',[i?1:-1,2,0]));
  const deck=piece('deck',[0,2.1,0],[2.2,.2,.35],'observation'),p=plan([...supports,deck]);
  enforceRuinSupports(p,new Set());assert.equal(!!deck.removed,count===1);assert.ok(supports.every(p=>!p.removed));
 }
});

test('a lost roof removes dependent details in the same collapse pass',()=>{
 const post=piece('post',[1,0,1],[.2,.2,.2],'corner-post',[1,3,1]),detail=piece('detail',[0,3.3,0],[2,.2,2],'roof-fascia');
 const p=plan([post,detail]);p.roofs.push({id:'roof',volume:'tower',x:0,z:0,y:3,width:2,depth:2,rise:1,eaves:0,kind:'hip',material:'roof'});
 p.supports.push({component:'roof',on:'ground'},{component:'detail',on:'roof'});
 const removed=new Set<string>();enforceRuinSupports(p,removed);assert.ok(removed.has('roof')&&removed.has('detail'));
});

test('every ruin family reaches a stable support state over multiple seeds and damage levels',()=>{
 for(const source of Object.values(STRUCTURE_PRESETS))for(const seed of [3,42,91]){
  const intact=buildStructurePlan({...source,seed});
  for(const ruin of [.25,.55,.85]){
   const p=applyStructureDamage(intact,ruin,structureStreams(seed)),removed=new Set(p.damage),before=[...removed].sort();
   enforceRuinSupports(p,removed);
   assert.deepEqual([...removed].sort(),before,source.id+' seed '+seed+' ruin '+ruin+' retained unstable pieces');
  }
 }
});
