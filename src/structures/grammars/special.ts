import {Architect} from '../blueprint';
import type {GrammarContext, V3} from '../types';

export {camp} from './camp';
export function village(c:GrammarContext) {
 const a=new Architect(c),p=c.config,w=a.value(p.width),d=a.value(p.depth),n=3+Math.round(p.complexity*4);
 for(let i=0;i<n;i++) {
  const side=i%2?-1:1,row=Math.floor(i/2),rows=Math.ceil(n/2);
  const x=side*w*.29,z=-d*.3+row*d*.62/Math.max(1,rows-1);
  const home=a.building(x,z,a.value(w*.23),a.value(d*.15),a.value(p.height),p.floors,{role:'village-home'});
  const door=a.plan.openings.find(o=>o.wall===home.id+'_wall_0'&&o.kind==='door')!;a.plan.accesses.push({id:'village-path_'+i,from:[home.x+door.offset,0,home.z-home.depth/2],to:[0,0,home.z-home.depth/2],width:1.5,role:'path'});
  if(a.rnd()>.5)a.chimney(home);
 }
 const well=a.piece('column',[0,.5,0],[1.4,1,1.4],'stone','well');
 for(const side of [-1,1])a.beam([side*.65,1,0],[side*.65,2.7,0],.12,'wood','well-post',well);
 a.beam([-.65,2.7,0],[.65,2.7,0],.17,'wood','well-crossbar',well);
 a.plan.propZones.push({id:'village-garden',x:0,z:d*.4,width:3,depth:3,y:0,kind:'garden'});
 return a.finish();
}
export {outpost} from './outpost';
export {treehouse} from './treehouse';
export {desert} from './desert';
export {swamp} from './swamp';
export {snowy} from './snowy';
export {mine} from './mine';
export {dock} from './dock';
export {lighthouse} from './lighthouse';
export function underground(c:GrammarContext) {
 const a=new Architect(c),p=c.config,w=a.value(p.width),d=a.value(p.depth),h=a.value(p.height);
 a.building(-w*.22,0,w*.42,d*.68,h,1,{material:'stone',roof:p.roof==='auto'?'flat':p.roof,role:'chamber'});
 a.building(w*.22,d*.1,w*.42,d*.45,h*.85,1,{material:'stone',roof:p.roof==='auto'?'flat':p.roof,role:'chamber'});
 for(const [index,side] of [[0,1],[1,3]]){const volume=a.plan.volumes[index],wall=a.plan.walls.find(w=>w.id===volume.id+'_wall_'+side)!;const offset=side===1?-volume.z:volume.z;a.plan.openings.push({id:wall.id+'_passage',wall:wall.id,kind:'door',offset,width:Math.min(1.4,volume.depth*.4),bottom:0,height:Math.min(2.2,volume.height*.85)});}
 a.piece('box',[0,.12,0],[w,.24,d*.18],'stone','passage');
 a.piece('arch',[0,h*.4,0],[w*.12,2,.4],'stone','passage-arch');
 a.stairs([-w*.22,0,-d*.75],[-w*.22,.25,-d*.34],2);
 return a.finish();
}
