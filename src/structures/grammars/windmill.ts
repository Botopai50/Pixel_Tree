import {Architect} from '../blueprint';
import type {GrammarContext,V3} from '../types';

export function windmill(c:GrammarContext){
 const a=new Architect(c),p=c.config,h=a.value(p.height,.08),diameter=Math.min(p.width,p.depth)*.78;
 const topRatio=.50+c.streams.streamFor('architecture','mill-taper')()*.26,taper=(1-topRatio)/3;
 const base=a.piece('column',[0,.16,0],[diameter+.4,.32,diameter+.4],'stone','mill-plinth');
 let support=base;
 for(let level=0;level<3;level++){
  const bottom=.32+level*h/3,db=diameter*(1-level*taper),dt=diameter*(1-(level+1)*taper);
  support=a.piece('column',[0,bottom+h/6,0],[db,h/3,dt],'stone','mill-body',support);
  a.piece('column',[0,bottom+.08,0],[db+.44,.22,db+.44],'wood','mill-belt',support);
  const windowY=bottom+h*.20,windowR=(db+(dt-db)*.60)/2;
  for(const angle of (level===0?[-Math.PI/2]:[0,Math.PI/2])){
   const r=windowR*Math.cos(Math.PI/12),slope=(db-dt)*Math.cos(Math.PI/12)/(2*h/3);
   const face=r+.09+slope*.38,back=r-.12-slope*.38;
   const point=(u:number,y:number,radius:number):V3=>[Math.sin(angle)*radius+Math.cos(angle)*u,y,-Math.cos(angle)*radius+Math.sin(angle)*u];
   a.piece('box',point(0,windowY,back),[.42,.76,.04],'dark','mill-window',support,[0,-angle,0]);
   const depth=face-back+.06,frameR=(face+back)/2;
   for(const side of [-1,1])a.piece('box',point(side*.25,windowY,frameR),[.08,.84,depth],'wood','mill-window-frame',support,[0,-angle,0]);
   for(const side of [-1,1])a.piece('box',point(0,windowY+side*.42,frameR),[.58,.10,depth],'wood','mill-window-frame',support,[0,-angle,0]);
   a.piece('box',point(0,windowY-.48,frameR+.035),[.66,.10,depth+.14],'stone','mill-window-sill',support,[0,-angle,0]);
   a.piece('box',point(0,windowY,back+.045),[.035,.76,.045],'wood','mill-window-bar',support,[0,-angle,0]);
   a.piece('box',point(0,windowY+.08,back+.045),[.42,.035,.045],'wood','mill-window-bar',support,[0,-angle,0]);
  }
 }
 const front=-diameter/2*Math.cos(Math.PI/12),doorWidth=Math.min(1.1,diameter*.3),doorY=.32;
 a.piece('box',[0,doorY+.75,front+.46],[doorWidth,1.5,.10],'wood','mill-door',base);
 a.piece('arch',[0,doorY+1.5,front+.20],[doorWidth,1,.18],'stone','mill-door-arch',base);
 for(const side of [-1,1])a.piece('box',[side*(doorWidth/2+.09),doorY+.75,front+.20],[.18,1.5,.64],'stone','mill-door-jamb',base);
 for(const y of [.6,1.35])a.piece('box',[0,y,front+.39],[doorWidth,.08,.04],'metal','mill-door-strap',base);
 a.stairs([0,0,front-1.1],[0,.32,front],doorWidth+.4);
 const neck=diameter*topRatio,capBottom=h+.32;
 const collar=a.piece('column',[0,capBottom+.12,0],[neck+.5,.30,neck+.5],'wood','mill-collar',support);
 const cap=a.piece('column',[0,capBottom+.70,0],[neck+.65,.88,.12],'roof','mill-cap',collar);
 const edge=neck+.65;
 a.piece('column',[0,capBottom+.20,0],[edge+.06,.24,edge+.06],'wood','mill-eave',collar);
 for(let side=0;side<8;side++){
  const angle=Math.PI/8+side*Math.PI/4,r=(neck+.65)/2;
  a.beam([Math.sin(angle)*r,capBottom+.28,Math.cos(angle)*r],[Math.sin(angle)*.06,capBottom+1.16,Math.cos(angle)*.06],.11,'wood','mill-cap-seam',cap,{start:[Math.sin(angle),0,Math.cos(angle)],end:[0,1,0]});
 }
 a.piece('column',[0,capBottom+1.13,0],[.46,.18,.30],'wood','mill-peak',cap);
 const origin:V3=[0,capBottom+.18,-(neck/2+.70)],shaft=a.beam([0,origin[1],0],origin,.28,'wood','mill-axis',collar);
 a.piece('wheel',origin,[.55,.55,.22],'wood','mill-hub',shaft);
 const radius=Math.min(h*.94,diameter*1.75),turn=.62+(a.rnd()-.5)*.12;
 for(let i=0;i<4;i++){
  const angle=turn+i*Math.PI/2,ux=Math.sin(angle),uy=Math.cos(angle),vx=Math.cos(angle),vy=-Math.sin(angle),width=radius*.29;
  const point=(r:number,s=0,z=0):V3=>[ux*r+vx*s,origin[1]+uy*r+vy*s,origin[2]+z];
  const spar=a.beam(point(0),point(radius),.13,'wood','mill-spar',shaft);
  const start=radius*.24,end=radius*.96;
  a.beam(point(start,width),point(end,width),.09,'wood','mill-sail-edge',spar);
  for(let panel=0;panel<6;panel++){
   const lo=start+(end-start)*panel/6,hi=start+(end-start)*(panel+1)/6;
   a.piece('cloth',point((lo+hi)/2,width/2,.035),[width-.035,hi-lo-.025,.025],'cloth','mill-canvas',spar,[0,0,-angle]);
   a.beam(point(lo,0),point(lo,width),.065,'wood','mill-sail-rib',spar);
  }
  a.beam(point(end,0),point(end,width),.065,'wood','mill-sail-rib',spar);
 }
 return a.finish();
}
