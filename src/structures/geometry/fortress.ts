import * as THREE from 'three';
import {extrudePolygon,merge} from './common';
import type {PieceSpec} from '../types';

export function buildFortressBanner(p:PieceSpec){
 const grid:number[][]=[[0,0],[16,0],[16,24]];
 for(let i=1;i<=8;i++)grid.push([16-i,23+i],[16-i,24+i]);
 for(let i=1;i<=8;i++)grid.push([8-i,32-i],[8-i,31-i]);
 const points=grid.map(([x,y])=>[(x/16-.5)*p.size[0],(.5-y/32)*p.size[1]] as [number,number]);
 const g=extrudePolygon(points,p.size[2]);g.translate(...p.position);return g;
}

export function buildFortressBarrel(p:PieceSpec){
 const r=p.size[0]/2,h=p.size[1];
 const points=[new THREE.Vector2(r*.80,-h/2),new THREE.Vector2(r*.97,-h*.32),new THREE.Vector2(r,h*.05),new THREE.Vector2(r*.97,h*.32),new THREE.Vector2(r*.80,h/2)];
 const g=new THREE.LatheGeometry(points,12);g.translate(...p.position);return g;
}

export function buildFortressGateWall(p:PieceSpec){
 const r=p.size[0]/2,spring=Math.min(2.05,(p.size[1]-.7)*.57),points:[number,number][]=[[-r,p.size[1]],[r,p.size[1]],[r,spring]];
 for(let i=1;i<=10;i++)points.push([Math.cos(i*Math.PI/10)*r,spring+Math.sin(i*Math.PI/10)*r]);
 const g=extrudePolygon(points,p.size[2]);g.translate(...p.position);return g;
}
export function buildFortressParapet(p:PieceSpec){
 const r=p.size[0]/2,shape=new THREE.Shape(),hole=new THREE.Path();
 for(let i=0;i<=12;i++){const angle=i*Math.PI/6,x=Math.sin(angle)*r,z=Math.cos(angle)*r;i?shape.lineTo(x,z):shape.moveTo(x,z);}
 for(let i=12;i>=0;i--){const angle=i*Math.PI/6,x=Math.sin(angle)*(r-.34),z=Math.cos(angle)*(r-.34);i===12?hole.moveTo(x,z):hole.lineTo(x,z);}
 shape.holes.push(hole);const g=new THREE.ExtrudeGeometry(shape,{depth:p.size[1],bevelEnabled:false,steps:1});g.rotateX(Math.PI/2);g.translate(p.position[0],p.position[1]+p.size[1]/2,p.position[2]);return g;
}
export function buildFortressTower(p:PieceSpec,walkHeight:number){
 const parts:THREE.BufferGeometry[]=[],r=p.size[0]/2,h=p.size[1],bottom=p.position[1]-h/2,width=2*r*Math.sin(Math.PI/12),apothem=r*Math.cos(Math.PI/12);
 const repeats=Math.max(1,Math.round(12*width/2.8)),perimeter=repeats*2.8;
 for(let side=0;side<12;side++){
  const half=width/2,top=Math.min(h-.22,walkHeight+1.65);
  let cutLeft=half,cutRight=-half;
  for(const doorSide of [p.position[0]<0?3:9,p.position[2]<0?6:0]){
   const delta=((side-doorSide+18)%12-6)*Math.PI/6;
   if(Math.abs(delta)>Math.PI/6+.001)continue;
   const shift=apothem*Math.sin(delta),cos=Math.cos(delta);
   const left=Math.max(-half,(-.58-shift)/cos),right=Math.min(half,(.58-shift)/cos);
   if(right>left){cutLeft=left;cutRight=right;}
  }
  const walkDoor=cutRight>cutLeft,shapes:THREE.Shape[]=[];
  const polygon=(points:number[][])=>{const s=new THREE.Shape();points.forEach(([x,y],i)=>i?s.lineTo(x,y):s.moveTo(x,y));s.closePath();shapes.push(s);return s;};
  let shape:THREE.Shape;
  if(walkDoor&&cutLeft<=-half+.0001&&cutRight>=half-.0001){
   shape=polygon([[-half,0],[half,0],[half,walkHeight],[-half,walkHeight]]);
   polygon([[-half,top],[half,top],[half,h],[-half,h]]);
  }else if(walkDoor&&cutLeft<=-half+.0001){
   shape=polygon([[-half,0],[half,0],[half,h],[-half,h],[-half,top],[cutRight,top],[cutRight,walkHeight],[-half,walkHeight]]);
  }else if(walkDoor&&cutRight>=half-.0001){
   shape=polygon([[-half,0],[half,0],[half,walkHeight],[cutLeft,walkHeight],[cutLeft,top],[half,top],[half,h],[-half,h]]);
  }else{
   shape=polygon([[-half,0],[half,0],[half,h],[-half,h]]);
   if(walkDoor){const hole=new THREE.Path();hole.moveTo(cutLeft,walkHeight);hole.lineTo(cutLeft,top);hole.lineTo(cutRight,top);hole.lineTo(cutRight,walkHeight);hole.closePath();shape.holes.push(hole);}
  }
  if(side%3===0&&!walkDoor){for(const y of [h*.36,h*.72]){const hole=new THREE.Path();hole.moveTo(-.09,y-.38);hole.lineTo(-.09,y+.38);hole.lineTo(.09,y+.38);hole.lineTo(.09,y-.38);hole.closePath();shape.holes.push(hole);}}
  const g=new THREE.ExtrudeGeometry(shapes,{depth:.26,bevelEnabled:false,steps:1});g.translate(0,0,-.13);
  const pos=g.getAttribute('position'),uv=new Float32Array(pos.count*2),angle=side*Math.PI/6;
  for(let i=0;i<pos.count;i++){
   const originalX=pos.getX(i),y=pos.getY(i),offset=pos.getZ(i),x=originalX*(1-offset/apothem),z=offset-apothem;
   uv[i*2]=(side+.5+originalX/width)*perimeter/12;uv[i*2+1]=bottom+y;
   pos.setXYZ(i,p.position[0]+x*Math.cos(angle)-z*Math.sin(angle),bottom+y,p.position[2]+x*Math.sin(angle)+z*Math.cos(angle));
  }
  g.setAttribute('uv',new THREE.BufferAttribute(uv,2));g.computeVertexNormals();parts.push(g);
 }
 const g=merge(parts);g.userData.preservePaintUV=true;return g;
}
