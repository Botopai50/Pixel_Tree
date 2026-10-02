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
   tone=b<.24?3:4;
   if(py<1||px<1)tone=1;else if(py<2||px<2)tone=2;
   else if(py>rowHeight-2||px>brickWidth-2)tone=5;
   else if(cluster>.84)tone=5;else if(cluster<.10)tone=3;
   if(b>.68&&px<4&&py<4)tone=2;
  }else if(kind==='roof'){
   const rowHeight=height/5,row=Math.floor(y/rowHeight),py=y-row*rowHeight;
   const tileWidth=width/7,shift=(row%2)*tileWidth*.5;
   const tile=Math.floor((x+shift)/tileWidth),px=(x+shift)-tile*tileWidth,b=hash(tile,row,seed);
   tone=b<.25?3:4;
   if(py<1||px<1)tone=1;else if(py<2||px<2)tone=2;
   else if(py>rowHeight-2)tone=6;else if(px>tileWidth-2)tone=5;
   else if(px<tileWidth*.46&&py>rowHeight*.4)tone+=1;
   if(cluster<.07&&py>3)tone-=1;
  }else if(kind==='thatch'){
   const rowHeight=height/4,row=Math.floor(y/rowHeight),py=y-row*rowHeight;
   const bx=Math.floor(x/3),bend=Math.round(Math.sin(row*3+bx*.7)*1.5);
   tone=py<2+Math.abs(bend)?2:4;
   if((x+bend)%4===0&&py>3)tone=5;
   if(hash(bx,row,seed)>.75&&py>rowHeight*.65)tone=6;
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
 map.magFilter=map.minFilter=THREE.NearestFilter;map.generateMipmaps=false;
 map.wrapS=map.wrapT=THREE.RepeatWrapping;map.repeat.set(1/period[0],1/period[1]);map.needsUpdate=true;
 return map;
}
