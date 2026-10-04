import {royalCastle} from './castle';
import {compactFortress} from './fortress';
import {Architect} from '../blueprint';import type {GrammarContext} from '../types';
export function fortress(c:GrammarContext){return compactFortress(c);}export function castle(c:GrammarContext){return royalCastle(c);}export function ruinedCastle(c:GrammarContext){return royalCastle(c);}
export function ancientRuins(c:GrammarContext){const a=new Architect(c),p=c.config,w=a.value(p.width),d=a.value(p.depth),h=a.value(p.height),base=a.piece('box',[0,.2,0],[w,.4,d],'stone','ancient-plinth');const rows=Math.max(3,Math.round(3+p.complexity*3));for(const side of [-1,1])for(let i=0;i<rows;i++){const z=-d*.36+i*d*.72/(rows-1),id=a.piece('column',[side*w*.35,.4+h/2,z],[.65,h,.65],'stone','colonnade',base);a.piece('box',[side*w*.35,.4+h,z],[.9,.28,.9],'stone','capital',id);if(i>0)a.beam([side*w*.35,.4+h,z-d*.72/(rows-1)],[side*w*.35,.4+h,z],.5,'stone','lintel',id);}
 a.piece('arch',[0,h*.45,d*.3],[w*.48,2,.55],'stone','ruined-arch',base);a.stairs([0,0,-d/2-2],[0,.4,-d/2],w*.55);return a.finish();}
export {ancientTemple as temple} from './temple';

