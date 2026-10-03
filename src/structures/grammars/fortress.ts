import {Architect} from '../blueprint';
import type {GrammarContext,V3} from '../types';

/** Small garrison: an open court enclosed by accessible stone defences. */
export function compactFortress(c:GrammarContext){
 const a=new Architect(c),p=c.config,w=a.value(p.width,.07),d=a.value(p.depth,.07),h=a.value(p.height,.07);
 const r=Math.min(w,d)*.115,tx=w/2-r,tz=d/2-r,wallH=h*.55,thickness=1.05;
 const court=a.piece('box',[0,.12,0],[w-r*2,.24,d-r*2],'stone','fortress-courtyard');
 const pixelBanner=(x:number,y:number,z:number,width:number,height:number,support:string,role:string)=>{
  const banner=a.piece('cloth',[x,y,z],[width,height,.025],'cloth',role,support);
  const crest=['0000110000','0011111100','0110110110','1100110011','1001111001','0011111100','0001111000','0010110100','0110110110','0100110010','0001111000','0000110000'];
  const pixel=width/16;
  for(let row=0;row<crest.length;row++)for(let col=0;col<10;col++)if(crest[row][col]==='1'){
   a.piece('box',[x+(col-4.5)*pixel,y+height*.09+(5.5-row)*pixel,z-.021],[pixel,pixel,.016],'plaster','fortress-banner-pixel',banner);
  }
  for(const side of [-1,1])a.piece('box',[x+side*width*7/16,y+height*.09,z-.021],[pixel,height*.72,.016],'plaster','fortress-banner-pixel-border',banner);
 };
 const towers:string[]=[];
 for(const sx of [-1,1])for(const sz of [-1,1]){
  const height=h*(sz===1?1.02:.83)*(1+(a.rnd()-.5)*.13),x=sx*tx,z=sz*tz;
  const tower=a.piece('column',[x,.24+height/2,z],[r*2,height,r*2],'stone','fortress-tower',court);towers.push(tower);
  a.piece('column',[x,.26,z],[r*2+.24,.52,r*2+.24],'stone','fortress-tower-foot',tower);
  a.piece('column',[x,height+.18,z],[r*2+.22,.28,r*2+.22],'stone','fortress-tower-cornice',tower);
  a.piece('column',[x,.24+height*.48,z],[r*2+.12,.14,r*2+.12],'stone','fortress-tower-band',tower);
  if(sz===-1){
   const bannerZ=z-r*Math.cos(Math.PI/12)-.17,y=height*.62;
   const hanger=a.beam([x-.48,y+.92,bannerZ],[x+.48,y+.92,bannerZ],.065,'wood','fortress-banner-hanger',tower);
   for(const side of [-1,1])a.beam([x+side*.42,y+.92,bannerZ+.19],[x+side*.42,y+.92,bannerZ],.045,'metal','fortress-banner-mount',tower);
   pixelBanner(x,y,bannerZ,.70,1.8,hanger,'fortress-tower-standard');
  }
  for(let i=0;i<12;i++){
   const angle=(i+.5)*Math.PI/6;
   a.piece('box',[x+Math.sin(angle)*r,height-.12,z+Math.cos(angle)*r],[.22,.40,.28],'stone','fortress-corbel',tower,[0,angle,0]);
  }
  if(sx===-1&&sz===1){
   const loft=a.piece('column',[x,height+.83,z],[r*2+.06,1.15,r*2+.06],'wood','fortress-watch-loft',tower);
   const roof=a.piece('column',[x,height+2.25,z],[r*2+.70,1.7,.08],'roof','fortress-watch-roof',loft);
   a.piece('column',[x,height+.30,z],[r*2+.26,.12,r*2+.26],'wood','fortress-watch-loft',tower);
   for(let i=0;i<8;i++){
    const angle=i*Math.PI/4,rr=(r+.03)*Math.cos(Math.PI/8)+.02;
    a.piece('box',[x+Math.sin(angle)*rr,height+.84,z-Math.cos(angle)*rr],[.44,.60,.035],'dark','fortress-watch-window',loft,[0,-angle,0]);
    const face=(u:number,y:number):V3=>[x+Math.sin(angle)*(rr+.035)+Math.cos(angle)*u,y,z-Math.cos(angle)*(rr+.035)+Math.sin(angle)*u];
    for(const u of [-.27,.27])a.beam(face(u,height+.47),face(u,height+1.20),.085,'wood','fortress-watch-window-frame',loft);
    for(const y of [height+.47,height+1.20])a.beam(face(-.31,y),face(.31,y),.10,'wood','fortress-watch-window-frame',loft);
    a.beam(face(0,height+.53),face(0,height+1.14),.045,'wood','fortress-watch-window-mullion',loft);
    const corner=angle+Math.PI/8,nextCorner=corner+Math.PI/4,cornerRadius=r+.055;
    const vertex=(t:number,y:number):V3=>[x+Math.sin(t)*cornerRadius,y,z-Math.cos(t)*cornerRadius];
    a.beam(vertex(corner,height+.30),vertex(corner,height+1.40),.13,'wood','fortress-watch-post',loft);
    for(const y of [height+.34,height+1.37])a.beam(vertex(corner,y),vertex(nextCorner,y),.13,'wood','fortress-watch-belt',loft);
    const radial=(r*2+.70)/2;
    a.piece('box',[x+Math.sin(angle)*(rr-.08),height+.10,z-Math.cos(angle)*(rr-.08)],[.14,.30,.22],'wood','fortress-watch-corbel',loft,[0,-angle,0]);
    a.beam([x+Math.sin(angle+Math.PI/8)*radial,height+1.4,z+Math.cos(angle+Math.PI/8)*radial],[x,height+3.12,z],.09,'wood','fortress-roof-rib',roof);
   }
   a.piece('column',[x,height+3.1,z],[.22,.14,.12],'wood','fortress-roof-peak',roof);
   continue;
  }
  a.piece('column',[x,height+.40,z],[r*2+.15,.28,r*2+.15],'stone','fortress-parapet',tower);
  for(let i=0;i<12;i++){
   const angle=(i+.5)*Math.PI/6;
   a.piece('box',[x+Math.sin(angle)*(r-.03),height+.77,z+Math.cos(angle)*(r-.03)],[r*.37,.62,.38],'stone','fortress-merlon',tower,[0,angle,0]);
  }
 }
 const curtain=(x:number,z:number,length:number,alongX:boolean,normal:number)=>{
  const size:V3=alongX?[length,wallH,thickness]:[thickness,wallH,length];
  const wall=a.piece('box',[x,.24+wallH/2,z],size,'stone','fortress-curtain',court);
  a.piece('box',[x,.12,z],alongX?[length,.24,thickness]:[thickness,.24,length],'stone','fortress-curtain-foot',wall);
  a.piece('box',[x,.24+wallH,z],alongX?[length,.22,1.45]:[1.45,.22,length],'stone','fortress-wall-walk',wall);
  if(!alongX){
   const deckLength=Math.max(.4,length-2*(r+.22)),deckY=.24+wallH+.15;
   const deck=a.piece('box',[x-normal*.23,deckY,z],[1.16,.08,deckLength],'wood','fortress-timber-walk',wall);
   const innerX=x-normal*.78,railLength=deckLength-.50;
   for(const y of [deckY+.32,deckY+.85])a.beam([innerX,y,z-railLength/2],[innerX,y,z+railLength/2],.10,'wood','fortress-walk-rail',deck);
   const posts=Math.max(2,Math.ceil(railLength/1.15));
   for(let i=0;i<=posts;i++){
    const zz=z-railLength/2+i*railLength/posts;
    a.beam([innerX,deckY-.04,zz],[innerX,deckY+.95,zz],.12,'wood','fortress-walk-post',deck);
    a.beam([x-normal*.47,deckY-.75,zz],[innerX,deckY-.05,zz],.13,'wood','fortress-walk-brace',wall);
    a.beam([x-normal*.43,deckY-.09,zz],[innerX,deckY-.09,zz],.14,'wood','fortress-walk-joist',deck);
   }
  }
  const edge=normal*.55;
  a.piece('box',[x+(alongX?0:edge),.24+wallH+.26,z+(alongX?edge:0)],alongX?[length,.42,.32]:[.32,.42,length],'stone','fortress-parapet-wall',wall);
  const count=Math.max(2,Math.round(length/.95));
  for(let i=1;i<Math.floor(length/2.4);i++){
   const offset=-length/2+i*length/Math.floor(length/2.4),xx=x+(alongX?offset:normal*.65),zz=z+(alongX?normal*.65:offset);
   const buttress=a.piece('box',[xx,.24+wallH*.35,zz],alongX?[.50,wallH*.70,.85]:[.85,wallH*.70,.50],'stone','fortress-buttress',wall);
   a.piece('box',[xx,.18,zz],alongX?[.70,.36,1.08]:[1.08,.36,.70],'stone','fortress-buttress-foot',buttress);
   a.piece('box',[xx,.24+wallH*.70,zz],alongX?[.57,.16,.94]:[.94,.16,.57],'stone','fortress-buttress-cap',buttress);
  }
  for(let i=0;i<count;i++)a.piece('box',[x+(alongX?-length/2+(i+.5)*length/count:edge),.24+wallH+.73,z+(alongX?edge:-length/2+(i+.5)*length/count)],alongX?[length/count*.52,.55,.38]:[.38,.55,length/count*.52],'stone','fortress-merlon',wall);
  return wall;
 };
 curtain(0,tz,tx*2,true,1);
 for(const side of [-1,1])curtain(side*tx,0,tz*2,false,side);
 const gap=Math.min(2.5,w*.19),spring=Math.min(2.05,wallH*.57),gateH=Math.max(wallH+.7,spring+gap/2+.4);
 const wings=(tx*2-gap)/2;
 for(const side of [-1,1])curtain(side*(gap/2+wings/2),-tz,wings,true,-1);
 const gate=a.piece('box',[0,.24,-tz],[gap,gateH,thickness],'stone','fortress-gate-wall',court);
 a.piece('box',[0,.24+spring/2,-tz+.12],[gap,spring,.16],'wood','fortress-gate',gate);
 a.piece('arch',[0,.24+spring,-tz-.55],[gap,1,.22],'stone','fortress-gate-arch',gate);
 for(const side of [-1,1]){
  a.piece('box',[side*(gap/2+.11),(spring+.24)/2,-tz-.54],[.22,spring+.24,.28],'stone','fortress-gate-jamb',gate);
  for(const y of [.65,1.55])a.piece('box',[side*gap*.25,.24+y,-tz+.01],[gap*.46,.10,.05],'metal','fortress-gate-strap',gate);
  for(const y of [.65,1.55])for(const offset of [-.18,.18])a.piece('box',[side*gap*.25+offset,.24+y,-tz-.025],[.045,.045,.035],'metal','fortress-gate-rivet',gate);
  a.piece('wheel',[side*.19,1.18,-tz-.025],[.14,.14,.035],'metal','fortress-door-knocker',gate);
  const pole=a.beam([side*(gap/2+.7),.24+gateH-.1,-tz-.65],[side*(gap/2+.7),.24+gateH+1.6,-tz-.65],.06,'wood','fortress-flagpole',gate);
  pixelBanner(side*(gap/2+.94),.24+gateH+.8,-tz-.65,.48,1.1,pole,'fortress-banner');
 }
 const seamHeight=spring+gap/2-.006;
 a.piece('box',[0,.24+seamHeight/2,-tz+.02],[.055,seamHeight,.06],'metal','fortress-gate-seam',gate);
 a.piece('box',[0,.24+gateH,-tz],[gap+.55,.18,thickness+.28],'stone','fortress-gate-cornice',gate);
 a.piece('box',[0,.24+spring+gap/2+.12,-tz-.60],[.28,.38,.30],'stone','fortress-arch-keystone',gate);
 for(let i=0;i<4;i++)a.piece('box',[-gap/2+(i+.5)*gap/4,.24+gateH+.38,-tz-.42],[gap*.14,.58,.38],'stone','fortress-gate-merlon',gate);
 for(const side of [-1,1]){
  const bracket=a.beam([side*(gap/2+.35),1.7,-tz-.55],[side*(gap/2+.35),1.7,-tz-.94],.07,'metal','fortress-lamp-bracket',gate);
  a.piece('box',[side*(gap/2+.35),1.85,-tz-.94],[.22,.34,.22],'wood','fortress-lantern',bracket);
  a.piece('box',[side*(gap/2+.35),2.04,-tz-.94],[.29,.08,.29],'metal','fortress-lantern-cap',bracket);
 }
 a.piece('box',[0,.12,-tz-.3],[gap+.35,.24,.8],'stone','fortress-entry-threshold',court);
 a.stairs([0,0,-tz-1.2],[0,.24,-tz-.65],gap+.35);
 a.stairs([-tx+.9,.24,-tz+r+.3],[-tx+.9,.24+wallH,tz-r-.3],1.25);
 a.piece('box',[-tx+.9,.24+wallH-.12,tz-r+.2],[1.4,.24,1.35],'stone','fortress-stair-landing',court);
 const hallDepth=d*.19,hallZ=tz-.70-Math.min(p.eaves,.45)-hallDepth/2;
 const hall=a.building(w*.10,hallZ,w*.28,hallDepth,h*.66,1,{base:.24,material:'stone',roof:p.roof==='auto'?'gable':p.roof,role:'barracks'});
 a.plan.roofs.find(roof=>roof.volume===hall.id)!.eaves=Math.min(p.eaves,.45);
 const galleryZ=hall.z-hall.depth/2-.55,galleryY=.24+hall.height*.58;
 const gallery=a.piece('box',[hall.x,galleryY,galleryZ],[hall.width+.22,.16,1.1],'wood','fortress-gallery',court);
 const hallDoor=a.plan.openings.find(o=>o.wall===hall.id+'_wall_0'&&o.kind==='door')!;
 const doorX=hall.x+hallDoor.offset,doorClearance=hallDoor.width/2+.24;
 for(let i=0;i<5;i++){
  const x=hall.x-hall.width/2+.15+i*(hall.width-.30)/4;
  if(Math.abs(x-doorX)<doorClearance)continue;
  a.beam([x,.24,galleryZ-.38],[x,galleryY+.86,galleryZ-.38],.11,'wood','fortress-gallery-post',gallery);
  a.beam([x,galleryY-.70,galleryZ+.40],[x,galleryY-.08,galleryZ-.38],.10,'wood','fortress-gallery-brace',gallery);
 }
 for(const y of [galleryY+.20,galleryY+.73])a.beam([hall.x-hall.width/2,y,galleryZ-.38],[hall.x+hall.width/2,y,galleryZ-.38],.085,'wood','fortress-gallery-rail',gallery);
 // The gallery wraps the right corner; the outboard stair climbs toward its side landing.
 const hallRight=hall.x+hall.width/2,sideSpace=tx-thickness/2-hallRight-.12;
 const sideWidth=Math.min(1.1,sideSpace*.52),stairWidth=Math.min(.9,sideSpace-sideWidth-.06);
 const sideX=hallRight+sideWidth/2,stairX=hallRight+sideWidth+stairWidth/2,sideEnd=hall.z+.15,sideStart=galleryZ-.55;
 const sideGallery=a.piece('box',[sideX,galleryY,(sideStart+sideEnd)/2],[sideWidth,.16,sideEnd-sideStart],'wood','fortress-gallery-side',gallery);
 a.stairs([stairX,.24,galleryZ+.10],[stairX,galleryY,sideEnd-.45],stairWidth);
 a.piece('box',[hallRight+(sideWidth+stairWidth)/2,galleryY,sideEnd-.22],[sideWidth+stairWidth,.16,.5],'wood','fortress-gallery-landing',sideGallery);
 for(const z of [sideStart+.15,sideEnd-.75]){
  a.beam([sideX+sideWidth/2-.08,.24,z],[sideX+sideWidth/2-.08,galleryY+.86,z],.11,'wood','fortress-gallery-side-post',sideGallery);
  a.beam([hallRight+.05,galleryY-.65,z],[sideX+sideWidth/2-.08,galleryY-.08,z],.10,'wood','fortress-gallery-brace',sideGallery);
 }
 for(const y of [galleryY+.20,galleryY+.73]){
  a.beam([hall.x+hall.width/2,y,galleryZ-.38],[sideX+sideWidth/2-.08,y,galleryZ-.38],.085,'wood','fortress-gallery-rail',sideGallery);
  a.beam([sideX+sideWidth/2-.08,y,sideStart+.15],[sideX+sideWidth/2-.08,y,sideEnd-.75],.085,'wood','fortress-gallery-rail',sideGallery);
 }
 // Put the store beside the hall, opposite the gallery stair, clear of the wall stair.
 const storeEaves=Math.min(.25,p.eaves),storeRight=hall.x-hall.width/2-1.3;
 const storeLeftLimit=-tx+.9+1.25/2+.22;
 const storeWidth=Math.min(w*.15,Math.max(.8,storeRight-storeLeftLimit-storeEaves));
 const storeDepth=d*.16,storeZ=hall.z;
 const store=a.building(storeRight-storeWidth/2,storeZ,storeWidth,storeDepth,wallH*.60,1,{base:.24,material:'wood',roof:p.roof==='auto'?'shed':p.roof,role:'fortress-store'});
 a.plan.roofs.find(roof=>roof.volume===store.id)!.eaves=storeEaves;
 for(let i=0;i<4;i++){
  const x=storeRight+.40,z=store.z-store.depth/2+.25+(i%2)*.65,base=.24+Math.floor(i/2)*.5;
  const crate=a.piece('box',[x,base+.25,z],[.52,.5,.52],'wood','fortress-supply-crate',court);
  for(const yy of [base+.07,base+.40])a.piece('box',[x,yy,z],[.56,.065,.56],'metal','fortress-crate-band',crate);
 }
 // Supplies sit on the court or beside the entry, clear of the main passage.
 for(const [x,z] of [[storeRight+.90,store.z-store.depth/2-.65],[storeRight+.90,store.z-store.depth/2-1.40],[gap/2+1.15,-tz-1.25]]){
  const outside=z<-tz,baseY=outside?0:.24;
  const barrel=a.piece('column',[x,baseY+.40,z],[.68,.80,.68],'wood','fortress-barrel',outside?'ground':court);
  for(const y of [-.27,.27])a.piece('column',[x,baseY+.40+y,z],[.66,.055,.66],'metal','fortress-barrel-hoop',barrel);
  a.piece('column',[x,baseY+.80,z],[.54,.035,.54],'wood','fortress-barrel-lid',barrel);
 }
 const wellX=-w*.16,wellZ=-d*.16;
 const well=a.piece('column',[wellX,.57,wellZ],[1.45,.66,1.45],'stone','fortress-well',court);
 a.piece('column',[wellX,.93,wellZ],[1.60,.12,1.60],'stone','fortress-well-rim',well);
 a.piece('column',[wellX,.29,wellZ],[1,.05,1],'dark','fortress-well-depth',well);
 for(const side of [-1,1])a.beam([wellX+side*.68,.24,wellZ],[wellX+side*.68,2.18,wellZ],.10,'wood','fortress-well-post',well);
 a.beam([wellX-.78,2.18,wellZ],[wellX+.78,2.18,wellZ],.13,'wood','fortress-well-crossbeam',well);
 a.beam([wellX-.78,1.65,wellZ],[wellX+.78,1.65,wellZ],.10,'wood','fortress-well-winch',well);
 a.beam([wellX,1.65,wellZ],[wellX,.45,wellZ],.025,'metal','fortress-well-rope',well);
 const benchX=-gap/2-.2-1.65/2,benchZ=-tz+thickness/2+.33;
 const bench=a.piece('box',[benchX,.70,benchZ],[1.65,.12,.43],'wood','fortress-bench',court);
 for(const side of [-1,1])a.piece('box',[benchX+side*.58,.44,benchZ],[.12,.40,.32],'wood','fortress-bench-leg',bench);
 for(const side of [-1,1]){
  a.beam([benchX+side*.66,.66,benchZ-.20],[benchX+side*.66,1.20,benchZ-.20],.07,'wood','fortress-bench-back-post',bench);
 }
 a.piece('box',[benchX,1.10,benchZ-.20],[1.65,.18,.08],'wood','fortress-bench-back',bench);
 return a.finish();
}
