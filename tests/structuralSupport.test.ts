import test from 'node:test';
import assert from 'node:assert/strict';
import {buildStructurePlan} from '../src/structures/plan';
import {collapseUnsupportedFraming} from '../src/structures/structuralSupport';
import {fixture} from './structureFixtures';

test('upper wall sections and framing fall when their actual lower support disappears',()=>{
 for(const missing of [false,true]){
  const p=buildStructurePlan(fixture('house',42));
  const volume=p.volumes[0];volume.bottom=.25;
  p.walls=[
   {id:'lower',volume:volume.id,start:[0,.25,0],end:[3,.25,0],bottom:.25,height:2,thickness:.18,material:'plaster',removed:missing},
   {id:'upper',volume:volume.id,start:[0,2.25,0],end:[3,2.25,0],bottom:2.25,height:2,thickness:.18,material:'plaster'},
  ];
  p.pieces=[{id:'rail',kind:'beam',position:[.2,4.1,.07],end:[2.8,4.1,.07],size:[.24,.24,.24],material:'wood',role:'wall-frame',support:'foundation'},
   {id:'brace',kind:'beam',position:[.2,3.3,.07],end:[.8,4.1,.07],size:[.13,.13,.13],material:'wood',role:'facade-brace',support:'foundation'}];
  const removed=new Set<string>(missing?['lower']:[]);
  collapseUnsupportedFraming(p,removed);
  assert.equal(!!p.walls[1].removed,missing);
  assert.equal(!!p.pieces[0].removed,missing);
  assert.equal(!!p.pieces[1].removed,missing);
 }
});

test('a rail needs surviving supports at both ends when its wall is gone',()=>{
 const p=buildStructurePlan(fixture('house',42));p.walls=[];
 p.pieces=[{id:'post',kind:'beam',position:[0,.25,0],end:[0,4,0],size:[.3,.3,.3],material:'wood',role:'corner-post',support:'foundation'},
 {id:'rail',kind:'beam',position:[.14,3.8,0],end:[3,3.8,0],size:[.24,.24,.24],material:'wood',role:'wall-frame',support:'foundation'},
 {id:'post2',kind:'beam',position:[3,.25,0],end:[3,4,0],size:[.3,.3,.3],material:'wood',role:'corner-post',support:'foundation'}];
 collapseUnsupportedFraming(p,new Set());assert.ok(!p.pieces[1].removed);
 p.pieces[0].removed=true;collapseUnsupportedFraming(p,new Set());assert.ok(p.pieces[1].removed);
});

test('unsupported upper floors collapse while the ground floor remains',()=>{
 const p=buildStructurePlan(fixture('house',42));p.walls=[];
 const v=p.volumes[0];
 p.pieces=[{id:'ground-floor',kind:'box',position:[v.x,v.bottom+.06,v.z],size:[v.width,.12,v.depth],material:'wood',role:'floor',support:'foundation'},
 {id:'upper-floor',kind:'box',position:[v.x,v.bottom+2,v.z],size:[v.width,.12,v.depth],material:'wood',role:'floor',support:'foundation'}];
 collapseUnsupportedFraming(p,new Set());
 assert.ok(!p.pieces[0].removed);assert.ok(p.pieces[1].removed);
});
