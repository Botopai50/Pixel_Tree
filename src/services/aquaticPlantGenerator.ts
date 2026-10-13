import {createPaintedPlantGrid,createPlantPaletteMaterial,createFlowerBloom} from './wildflowerSystem';
import {FLOWER_PROFILES} from '../constants/wildflowers';
import {pixelTextureLightDir,resolvePixelTextureParams} from './pixelArtTextureSystem';
import * as THREE from 'three';
import type {TreeConfig} from '../types';
import type {GroundPlantResult} from './groundPlantGenerator';

function pixelTexture(size:number,paint:(x:number,y:number)=>number[]){
 const data=new Uint8Array(size*size*4);
 for(let y=0;y<size;y++)for(let x=0;x<size;x++)data.set([...paint(x,y),255],(y*size+x)*4);
 const texture=new THREE.DataTexture(data,size,size,THREE.RGBAFormat);
 texture.colorSpace=THREE.SRGBColorSpace;texture.magFilter=texture.minFilter=THREE.NearestFilter;
 texture.generateMipmaps=false;texture.needsUpdate=true;return texture;
}

export function buildAquaticPatch(config:TreeConfig,rnd:()=>number):GroundPlantResult{
 const group=new THREE.Group();group.name='GroundPlant';
 const geometries:THREE.BufferGeometry[]=[],materials:THREE.Material[]=[],textures:THREE.Texture[]=[];
 const duckweed=config.species==='duckweed';
 const light=pixelTextureLightDir(resolvePixelTextureParams(config));
 const scale=THREE.MathUtils.clamp(config.trunkHeight/.6,.45,2);
 const waterRadius=1.95*scale;
 const hash=(x:number,y:number)=>{const n=Math.sin(x*127.1+y*311.7+config.seed*.71)*43758.5453;return n-Math.floor(n);};
 const waterMap=pixelTexture(64,(x,y)=>{
  const wave=hash(Math.floor(x/7),Math.floor(y/3));
  return wave>.87?[75,112,103]:wave<.14?[45,76,70]:[57,94,85];
 });textures.push(waterMap);
 const waterMaterial=new THREE.MeshStandardMaterial({map:waterMap,roughness:.95,metalness:0});materials.push(waterMaterial);
 const waterGeometry=new THREE.CircleGeometry(waterRadius,40);waterGeometry.rotateX(-Math.PI/2);geometries.push(waterGeometry);
 const water=new THREE.Mesh(waterGeometry,waterMaterial);water.name='ShallowMangroveWater';water.position.y=.008;water.receiveShadow=true;group.add(water);

 if(duckweed){
  const palette=['#6b9443','#7ea74e','#568337','#8faf59'].map(color=>{
   const painted=createPlantPaletteMaterial(color,color,light);materials.push(painted.material);textures.push(painted.texture);return painted.material;
  });
  const geo=createPaintedPlantGrid(8,8,(x,y)=>{
   const dx=(x+.5)/4-1,dz=(y+.5)/4-1,r=Math.hypot(dx,dz);
   if(r>.9)return null;
   const edge=r>.64;
   return [edge?1:Math.abs(dx)<.18?4:dx<0?3:2,0];
  },(x,y)=>[(x/4-1),0,(y/4-1)]);
  geo.userData.pixelGrid=8;geometries.push(geo);
  const centres=Array.from({length:8},()=>{const angle=rnd()*Math.PI*2,radius=Math.sqrt(rnd())*waterRadius*.76;return new THREE.Vector2(Math.cos(angle)*radius,Math.sin(angle)*radius);});
  const count=480;
  for(let i=0;i<count;i++){
   const centre=centres[i%centres.length],angle=rnd()*Math.PI*2,radius=Math.sqrt(rnd())*waterRadius*.36;
   const x=centre.x+Math.cos(angle)*radius,z=centre.y+Math.sin(angle)*radius;
   if(Math.hypot(x,z)>waterRadius*.95)continue;
   const leaf=new THREE.Mesh(geo,palette[Math.floor(rnd()*palette.length)]);leaf.name='DuckweedLeaf';
   const r=(.03+rnd()*.028)*scale;leaf.scale.set(r,1,r*(.75+rnd()*.4));
   leaf.position.set(x,.023+rnd()*.004,z);leaf.rotation.y=rnd()*Math.PI*2;leaf.receiveShadow=true;group.add(leaf);
   if(i%3===0){const daughter=leaf.clone();daughter.name='DuckweedDaughter';daughter.scale.multiplyScalar(.65);daughter.position.x+=r*1.3;daughter.position.z+=r*.2;group.add(daughter);}
  }
 }else{
  const painted=createPlantPaletteMaterial('#83a04c','#83a04c',light);
  materials.push(painted.material);textures.push(painted.texture);
  const padMat=painted.material;
  // Each visible leaf cell is geometry, just like the existing wildflowers.
  // The silhouette, radial slit, rim and veins all follow the same pixel grid.
  const N=24;
  const padGeo=createPaintedPlantGrid(N,N,(x,y)=>{
   const dx=(x+.5)/N*2-1,dz=(y+.5)/N*2-1,r=Math.hypot(dx,dz);
   if(r>.95||(dx>.06&&Math.abs(dz)<dx*.16))return null;
   const angle=Math.atan2(dz,dx),vein=Math.abs(Math.sin(angle*7))*Math.max(1,r*10);
   const tone=r>.83?1:vein<.35&&r>.16?4:hash(Math.floor(x/3),Math.floor(y/3))>.75?3:2;
   return [tone,0];
  },(x,y)=>{
   const xx=x/N*2-1,zz=y/N*2-1;
   return [xx,Math.pow(Math.hypot(xx,zz),5)*.045,zz];
  });
  padGeo.userData.pixelGrid=N;geometries.push(padGeo);
  const flower=createFlowerBloom({...FLOWER_PROFILES.savanna,family:'vitória-régia',petals:10,core:.28,cup:.48,pollen:'#d6b353'},'#e3a5c3',light);
  geometries.push(flower.geometry);materials.push(flower.material);textures.push(flower.texture);
  const anchors:THREE.Vector2[]=[];
  for(let i=0;i<8;i++){
   const radius=(.28+rnd()*.19)*scale;let anchor=new THREE.Vector2();
   for(let attempt=0;attempt<70;attempt++){const angle=rnd()*Math.PI*2,distance=Math.sqrt(rnd())*(waterRadius-radius-.08);anchor.set(Math.cos(angle)*distance,Math.sin(angle)*distance);if(anchors.every(p=>p.distanceTo(anchor)>radius+.30*scale))break;}
   anchors.push(anchor.clone());
   const pad=new THREE.Mesh(padGeo,padMat);pad.name='LilyPad';pad.scale.set(radius,1,radius);pad.position.set(anchor.x,.018,anchor.y);pad.rotation.y=rnd()*Math.PI*2;pad.castShadow=pad.receiveShadow=true;group.add(pad);
   if(i%3===0){
    const bloom=new THREE.Group();bloom.name='WaterLilyFlower';bloom.position.set(anchor.x+radius*.12,.021,anchor.y+radius*.1);bloom.scale.setScalar(scale*(.85+rnd()*.25));
    for(let tier=0;tier<2;tier++){
     const blossom=new THREE.Mesh(flower.geometry,flower.material);
     blossom.scale.setScalar(tier===0?.20:.13);blossom.position.y=tier*.025;
     blossom.rotation.y=tier*.32;blossom.castShadow=blossom.receiveShadow=true;bloom.add(blossom);
    }
    group.add(bloom);
   }
  }
 }
 return {group,geometries,materials,textures,occupies:(x,z)=>Math.hypot(x,z)<waterRadius+.05};
}
