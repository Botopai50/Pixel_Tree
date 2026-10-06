import * as THREE from 'three';
import type {PieceSpec} from '../types';
import {extrudePolygon,merge} from './common';

export function buildCampPiece(p:PieceSpec):THREE.BufferGeometry|undefined{
 const [w,h]=p.size;
 let g:THREE.BufferGeometry;
 if(p.role==='camp-entry-flaps'){
  // Two folded wings leave a triangular, physically open entrance.
  g=merge([-1,1].map(side=>extrudePolygon([[side*w/2,0],[0,h],[side*w*.23,h*.20],[side*w*.31,0]],p.size[2])));
 }else if(p.role==='camp-back-canvas')g=extrudePolygon([[-w/2,0],[w/2,0],[0,h]],p.size[2]);
 else if(p.role==='camp-kettle'){
  const r=w/2;
  g=new THREE.LatheGeometry([new THREE.Vector2(0,-h/2),new THREE.Vector2(r*.65,-h/2),new THREE.Vector2(r*.98,-h*.15),new THREE.Vector2(r,h*.38),new THREE.Vector2(r*.90,h/2),new THREE.Vector2(r*.80,h/2),new THREE.Vector2(r*.80,-h*.10),new THREE.Vector2(0,-h*.20)],12);
 }else if(p.role==='camp-kettle-handle'){
  g=new THREE.TorusGeometry(w/2,.035,4,12,Math.PI);g.translate(0,-h/2,0);
 }else if(p.role==='camp-barrel-hoop'){
  const r=w/2;
  g=new THREE.LatheGeometry([new THREE.Vector2(r*.96,-h/2),new THREE.Vector2(r,-h/2),new THREE.Vector2(r,h/2),new THREE.Vector2(r*.96,h/2),new THREE.Vector2(r*.96,-h/2)],12);
 }else if(p.role==='camp-flame')g=new THREE.ConeGeometry(w/2,h,5);
 else if(p.role.startsWith('camp-bedroll')){
  g=new THREE.CylinderGeometry(p.size[1]/2,p.size[1]/2,w,10);g.rotateZ(Math.PI/2);
  if(p.rotation?.[1])g.rotateY(p.rotation[1]);
 }else if(p.kind==='column'&&p.role.startsWith('camp-')){
  const horizontal=p.rotation!==undefined;
  g=new THREE.CylinderGeometry(w*.48,w*.53,h,10);
  if(horizontal)g.applyMatrix4(new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(...p.rotation!)));
 }else return;
 if(['camp-entry-flaps','camp-back-canvas'].includes(p.role)&&p.rotation?.[1])g.rotateY(p.rotation[1]);
 if(['camp-stump-end','camp-firewood-end','camp-log-end'].includes(p.role))g.userData.preservePaintUV=true;
 g.translate(...p.position);return g;
}

export function campCanvasTexture(density:number,seed:number){
 const size=Math.round(density*2.4),data=new Uint8Array(size*size*4);
 for(let y=0;y<size;y++)for(let x=0;x<size;x++){
  const noise=Math.sin(Math.floor(x/3)*127.1+Math.floor(y/4)*311.7+seed)*43758.5453;
  const n=noise-Math.floor(noise),fold=(x+Math.floor(Math.sin(y/size*5)*1.4)+size)%Math.max(6,Math.round(size/7));
  let color=fold<2?[167,148,105]:fold===2?[212,194,151]:n<.16?[183,163,120]:[199,180,137];
  const seam=y===Math.floor(size*.52)||y===Math.floor(size*.85)||x===2;
  if(seam)color=[139,121,85];
  if(y===Math.floor(size*.52)+1&&x%4===0)color=[230,213,169];
  data.set([...color,255],(y*size+x)*4);
 }
 const map=new THREE.DataTexture(data,size,size);map.colorSpace=THREE.SRGBColorSpace;map.magFilter=map.minFilter=THREE.NearestFilter;map.wrapS=map.wrapT=THREE.RepeatWrapping;map.repeat.set(1/2.4,1/2.4);map.needsUpdate=true;return map;
}

export function campEndgrainTexture(){
 const size=32,data=new Uint8Array(size*size*4);
 for(let y=0;y<size;y++)for(let x=0;x<size;x++){
  const r=Math.hypot(x-15.5,y-15.5),ring=Math.floor(r+Math.sin(x*.5)*.5)%4===0;
  data.set([...(ring?[139,98,54]:[199,159,96]),255],(y*size+x)*4);
 }
 const map=new THREE.DataTexture(data,size,size);map.colorSpace=THREE.SRGBColorSpace;map.magFilter=map.minFilter=THREE.NearestFilter;map.needsUpdate=true;return map;
}

export function campBarkTexture(seed:number){
 const size=48,data=new Uint8Array(size*size*4);
 for(let y=0;y<size;y++)for(let x=0;x<size;x++){
  const line=(x+Math.floor(Math.sin(y*.15+x*.3)*1.5)+size)%8;
  const grain=Math.sin(Math.floor(y/3)*17+x*51+seed)>0;
  const color=line<2?[83,54,31]:line===2?[165,113,62]:grain?[124,82,44]:[137,91,49];
  data.set([...color,255],(y*size+x)*4);
 }
 const map=new THREE.DataTexture(data,size,size);map.colorSpace=THREE.SRGBColorSpace;map.magFilter=map.minFilter=THREE.NearestFilter;map.wrapS=map.wrapT=THREE.RepeatWrapping;map.repeat.set(1/.8,1/1.6);map.needsUpdate=true;return map;
}
