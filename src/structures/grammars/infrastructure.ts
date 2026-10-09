import {Architect} from '../blueprint';import type {GrammarContext} from '../types';
export {bridge} from './bridge';
export {wall} from './wall';
export function gate(c:GrammarContext){const a=new Architect(c),p=c.config,w=a.value(p.width),d=a.value(p.depth),h=a.value(p.height);const span=w*.42;for(const side of [-1,1])a.building(side*(span/2+w*.16),0,w*.32,d,h,2,{material:'stone',roof:'hip',door:false,role:'gatehouse'});a.piece('arch',[0,h*.42,-d*.25],[span,h*.4,.42],'stone','gate-arch');for(const side of [-1,1])a.piece('box',[side*span*.24,h*.22,-d*.25],[span*.45,h*.44,.16],'wood','gate-door','ground',[0,side*.6,0]);return a.finish();}
