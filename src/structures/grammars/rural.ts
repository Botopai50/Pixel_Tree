import {projectTimber} from './houses';
import {Architect} from '../blueprint';import type {GrammarContext,V3} from '../types';
export function farm(c:GrammarContext){const a=new Architect(c),p=c.config,w=a.value(p.width),d=a.value(p.depth),roof=p.roof==='auto'?'thatch':p.roof;const home=a.building(-w*.26,d*.17,w*.35,d*.38,a.value(p.height),1,{roof});a.veranda(home);const woodenHome=a.building(w*.26,d*.22,w*.26,d*.30,p.height*.85,1,{material:'wood',roof,role:'shed'});projectTimber(a,woodenHome);a.fence(0,0,w*1.02,d*1.02);const zone={id:'cultivation',x:0,z:-d*.22,width:w*.65,depth:d*.34,y:.02,kind:'cultivation' as const};a.plan.propZones.push(zone);for(let i=0;i<5;i++)a.piece('box',[-zone.width/2+(i+.5)*zone.width/5,.07,zone.z],[zone.width/8,.14,zone.depth],'earth','crop-row');return a.finish();}
export {barn} from './barn';
export function stable(c:GrammarContext){const a=new Architect(c),p=c.config,w=a.value(p.width),d=a.value(p.depth),h=a.value(p.height);a.building(0,0,w,d,h,1,{open:true,roof:p.roof==='auto'?'gable':p.roof});const n=3+Math.floor(a.rnd()*3),bay=w/n;for(let i=0;i<=n;i++){const x=-w/2+i*bay;a.piece('box',[x,.8,d*.12],[.14,1.3,d*.55],'wood','stall');a.beam([x,0,-d/2],[x,h,-d/2],.18,'wood','stall-post');}a.piece('box',[0,1,d/2],[w,1.6,.15],'wood','stall-back');return a.finish();}
export {watchtower} from './watchtower';
import {watchtower} from './watchtower';
export function ruinedTower(c:GrammarContext){return watchtower(c);}
export {windmill} from './windmill';
