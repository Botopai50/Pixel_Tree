import test from 'node:test';import assert from 'node:assert/strict';
import {collapseFloatingPieces} from '../src/structures/structuralSupport';
import {buildStructurePlan} from '../src/structures/plan';import {fixture} from './structureFixtures';
test('a wide platform cannot survive on one post or an ownership link',()=>{
 const p=buildStructurePlan(fixture('castle',42));p.walls=[];p.pieces=[
 {id:'post',kind:'beam',position:[0,0,0],end:[0,3,0],size:[.15,.15,.15],material:'wood',support:'ground',role:'post'},
 {id:'floor',kind:'box',position:[0,3.1,0],size:[4,.2,4],material:'stone',support:'post',role:'floor'},
 {id:'floating',kind:'box',position:[6,3,0],size:[1,.3,1],material:'stone',support:'ground',role:'crown'}];
 const removed=new Set<string>();collapseFloatingPieces(p,removed);
 assert.ok(removed.has('floor'));assert.ok(removed.has('floating'));assert.ok(!removed.has('post'));
});
test('a platform survives four physically grounded posts',()=>{
 const p=buildStructurePlan(fixture('castle',42));p.walls=[];p.pieces=[];
 for(const x of [-1.84,1.84])for(const z of [-1.84,1.84])p.pieces.push({id:`post${x}${z}`,kind:'beam',position:[x,0,z],end:[x,3,z],size:[.2,.2,.2],material:'wood',support:'ground',role:'post'});
 p.pieces.push({id:'floor',kind:'box',position:[0,3.1,0],size:[4,.2,4],material:'stone',support:'ground',role:'floor'});
 const removed=new Set<string>();collapseFloatingPieces(p,removed);assert.ok(!removed.has('floor'));
});
