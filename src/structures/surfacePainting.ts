import * as THREE from 'three';
import type {SurfaceMaterial} from './types';

const periods:Record<SurfaceMaterial,[number,number]>={wood:[.84,2.8],stone:[2.8,1.6],plaster:[3.2,3.2],roof:[2.8,2],thatch:[2.4,2.4],metal:[1.2,1.2],cloth:[2.4,2.4],dark:[1,1],earth:[3.2,3.2],water:[3.2,3.2]};
const fract=(n:number)=>n-Math.floor(n);
const hash=(x:number,y:number,seed:number)=>fract(Math.sin(x*127.1+y*311.7+seed*.37)*43758.5453);

/** Variation belongs to a board, block or tile, rather than unrelated noise
 * at every pixel. Cool shadows and warm edges share the selected palette.
 */
export function paintSurface(kind:SurfaceMaterial,color:string,density:number,seed:number,finish:number){
 const period=periods[kind],width=Math.max(8,Math.round(period[0]*density)),height=Math.max(8,Math.round(period[1]*density));
 const base=new THREE.Color(color).convertLinearToSRGB(),rgb=[base.r,base.g,base.b];
 const ramp=Array.from({length:7},(_,i)=>{
  const strength=[.36,.51,.67,.83,1,1.13,1.28][i],warm=Math.max(0,i-3)*.017;
  return rgb.map((c,k)=>Math.round(Math.min(1,c*strength+warm*(k===0?1:k===1?.75:.25)+(i<3&&k===2?.035:0))*255));
 });
 const data=new Uint8Array(width*height*4);
 for(let y=0;y<height;y++)for(let x=0;x<width;x++){
  let tone=4;const cluster=hash(Math.floor(x/4),Math.floor(y/5),seed);
  if(kind==='wood'){
   const plank=width/3,board=Math.floor(x/plank),px=x-board*plank,b=hash(board,0,seed);
   tone=b<.3?3:4;
   if(px<1)tone=1;else if(px<2)tone=2;else if(px>plank-2)tone=5;
   const line=plank*(.35+Math.sin(y*.10+b*8)*.16);
   if(Math.abs(px-line)<.8&&fract(y/17+b)>.25)tone-=1;
   const knotY=height*(.2+b*.6),knot=(px-plank*.63)**2/(plank*.17)**2+(y-knotY)**2/25;
   if(knot<1.5&&knot>.5)tone=2;
   if(cluster>.9&&px>2&&px<plank-2)tone=Math.min(5,tone+1);
  }else if(kind==='stone'){
   const rowHeight=height/4,row=Math.floor(y/rowHeight),py=y-row*rowHeight;
   const brickWidth=width/4,shift=(row%2)*brickWidth*.5;
   const bx=Math.floor((x+shift)/brickWidth),px=(x+shift)-bx*brickWidth,b=hash(bx,row,seed);
   const pixel=hash(x,y,seed+11);
   const chip=hash(Math.floor(px),row,seed+23)>.82?1:0;
   tone=b<.16?3:4;
   if(py<1||px<1)tone=1;
   else if(py<1+chip||px+py<2.5+hash(bx,row,seed+31)*2)tone=2;
   else if(py<1.8||px<1.8)tone=5;
   else if(py>rowHeight-1.3-chip||px>brickWidth-1.2)tone=3;
   else if(pixel>.975)tone=3;
  }else if(kind==='roof'){
   const rowHeight=height/5,row=Math.floor(y/rowHeight),py=y-row*rowHeight;
   const tileWidth=width/7,shift=(row%2)*tileWidth*.5;
   const tile=Math.floor((x+shift)/tileWidth),px=(x+shift)-tile*tileWidth,b=hash(tile,row,seed);
   tone=b<.25?3:4;
   // Keep the original broad light facet, with small pixel steps at its edges.
   const lightEdge=tileWidth*.46+Math.floor(hash(Math.floor(py/2),tile+row*7,seed+41)*3)-1;
   const lightStart=rowHeight*.4+Math.floor(hash(Math.floor(px/2),row,seed+53)*3)-1;
   const lip=hash(Math.floor(px/2),row,seed+29)>.8?.5:0;
   if(py<1||px<1)tone=1;
   else if(py<2||px<2)tone=2;
   else if(py>rowHeight-1.5-lip)tone=6;
   else if(px>tileWidth-1.5)tone=5;
   else if(px<lightEdge&&py>lightStart)tone+=1;
  }else if(kind==='thatch'){
   const tuft=Math.floor(x/5),band=Math.floor(y/9),clump=hash(tuft,band,seed+7);
   tone=clump<.18?3:4;
   const bend=Math.floor(hash(tuft,Math.floor(y/12),seed+17)*3)-1;
   const fiber=(x+bend+width)%5;
   const tip=hash(tuft,band,seed+31),length=3+Math.floor(tip*6);
   const py=(y+Math.floor(hash(tuft,0,seed)*7))%9;
   if(fiber===0&&py<length)tone=tip>.88?6:5;
   else if(fiber===1&&py<length-3)tone=5;
   else if(fiber===4&&py<length&&clump<.4)tone=3;
  }else if(kind==='plaster'){
   tone=4;const field=hash(Math.floor(x/10),Math.floor(y/9),seed);
   if(field<.12&&cluster<.65)tone=3;if(field>.92&&cluster>.4)tone=5;
   if(finish<.45&&field<.1&&cluster<.3)tone=2;
  }else if(kind==='cloth'){
   tone=4;const fold=x%Math.max(4,Math.round(width/7));if(fold<2)tone=3;else if(fold===2)tone=5;
  }else if(kind==='water'){
   tone=3;if(y%12<2&&cluster>.4)tone=5;else if(cluster<.15)tone=2;
  }else if(kind==='earth')tone=cluster>.78?5:cluster<.22?3:4;
  else if(kind==='metal')tone=x<width*.25?3:x<width*.42?6:4;
  else tone=1;
  const paint=ramp[Math.max(0,Math.min(6,Math.round(tone)))];data.set([...paint,255],(y*width+x)*4);
 }
 const map=new THREE.DataTexture(data,width,height);map.colorSpace=THREE.SRGBColorSpace;
 map.magFilter=THREE.NearestFilter;
 map.minFilter=kind==='roof'?THREE.NearestMipmapLinearFilter:THREE.NearestFilter;
 map.generateMipmaps=kind==='roof';
 map.wrapS=map.wrapT=THREE.RepeatWrapping;map.repeat.set(1/period[0],1/period[1]);map.needsUpdate=true;
 return map;
}
