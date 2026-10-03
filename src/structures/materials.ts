import * as THREE from 'three';
import type {StructureConfig,SurfaceMaterial} from './types';
import {pixelMossNoiseGLSL} from '../services/mossStyle';
import {buildPixelMossRamp} from '../services/pixelArtTextureSystem';
import {paintSurface} from './surfacePainting';

export class StructureResources {
 geometries=new Set<THREE.BufferGeometry>();materials=new Set<THREE.Material>();
 textures=new Set<THREE.Texture>();instances=new Set<THREE.InstancedMesh>();private disposed=false;
 dispose=()=>{if(this.disposed)return;this.disposed=true;this.instances.forEach(mesh=>mesh.dispose());this.geometries.forEach(g=>g.dispose());this.materials.forEach(m=>m.dispose());this.textures.forEach(t=>t.dispose());};
}

export function createStructureMaterials(c:StructureConfig,resources:StructureResources,seed=0){
 const mossSteps=6,mossData=new Uint8Array(mossSteps*4);
 buildPixelMossRamp(mossSteps).forEach((rgb,i)=>mossData.set([...rgb,255],i*4));
 const mossPalette=new THREE.DataTexture(mossData,mossSteps,1);
 mossPalette.colorSpace=THREE.SRGBColorSpace;
 mossPalette.magFilter=mossPalette.minFilter=THREE.NearestFilter;
 mossPalette.generateMipmaps=false;mossPalette.needsUpdate=true;resources.textures.add(mossPalette);
 const colors:Record<SurfaceMaterial,string>={wood:c.palette.wood,stone:c.palette.stone,plaster:c.palette.plaster,roof:c.palette.roof,thatch:'#c59138',metal:'#687681',cloth:c.type==='windmill'?'#ead3a0':c.type==='fortress'?'#a93840':'#b97a58',dark:'#1f2830',earth:'#978568',water:'#3c858f'};
 const result={} as Record<SurfaceMaterial,THREE.MeshStandardMaterial>;
 for(const [name,color] of Object.entries(colors)){
  const kind=name as SurfaceMaterial,map=paintSurface(kind,color,c.texelsPerMetre,seed,c.finish);resources.textures.add(map);
  const mossAffinity=kind==='stone'?1:kind==='wood'?.45:kind==='plaster'?.16:0;
  const mossHeight=kind==='stone'?1.8:kind==='wood'?1.1:.65;
  const material=new THREE.MeshStandardMaterial({color:'#ffffff',map,roughness:kind==='metal'?.65:1,metalness:kind==='metal'?.15:0,side:kind==='cloth'?THREE.DoubleSide:THREE.FrontSide});
  material.userData.pixelDensity=c.texelsPerMetre;
  material.onBeforeCompile=shader=>{
   shader.uniforms.uPixelDensity={value:c.texelsPerMetre};shader.uniforms.uStructureMoss={value:c.vegetation*mossAffinity};
   shader.uniforms.uStructureMossHeight={value:mossHeight};
   shader.uniforms.uStructureMossPalette={value:mossPalette};
   shader.uniforms.uStructureSnow={value:kind==='water'?0:c.snow};shader.uniforms.uStructureSeed={value:seed};
   shader.vertexShader='varying vec3 vStructurePos;varying vec3 vStructureNormal;\n'+shader.vertexShader;
   shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvStructurePos=position;vStructureNormal=normal;');
   shader.fragmentShader='uniform float uPixelDensity,uStructureMoss,uStructureMossHeight,uStructureSnow,uStructureSeed;uniform sampler2D uStructureMossPalette;varying vec3 vStructurePos;varying vec3 vStructureNormal;\n'+pixelMossNoiseGLSL('uStructureSeed')+shader.fragmentShader;
   if(kind==='thatch'){
    shader.vertexShader='attribute float thatchLayer;varying float vThatchLayer;\n'+shader.vertexShader;
    shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvThatchLayer=thatchLayer;');
    shader.fragmentShader='varying float vThatchLayer;\n'+shader.fragmentShader;
   }
   shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
    vec3 cell=floor(vStructurePos*uPixelDensity)+.5;
    ${kind==='thatch'?`if(vThatchLayer>.92+(mhash3(cell)-.5)*.035)diffuseColor.rgb*=.72;`:''}
    vec3 mossN=normalize(vStructureNormal);
    float damp=clamp(dot(mossN,vec3(0.,.25,-.95)),0.,1.);
    float up=clamp(mossN.y,0.,1.);
    float weather=1.-smoothstep(.15,uStructureMossHeight,vStructurePos.y);
    float groove=1.-smoothstep(.015,.12,abs(mnoise3(cell/8.+57.)-.5));
    float mossGroove=.35+groove*.65;
    float mossWant=min(.5,((.1+damp*.45+up*.3)*1.6+groove*.15)*uStructureMoss*weather)
      *(.55+mossGroove*.9);
    if(mossWant>.04&&mossField(cell)<mossWant){
     float N1=5.,qs=N1/5.;
     float ndl=dot(mossN,normalize(vec3(-.5,.8,-.6)));
     float mi=N1*.35+(ndl>.15?qs*.8:-qs*.6)
       +(mnoise3(cell/3.+41.)-.5)*qs*1.6+(.5-mossGroove)*qs*2.4;
     if(mossField(cell+vec3(0.,1.,0.))>=mossWant)mi+=qs;
     if(mossField(cell-vec3(0.,1.,0.))>=mossWant)mi-=qs*1.2;
     float idx=clamp(floor(mi+.5),0.,N1);
     diffuseColor.rgb=texture2D(uStructureMossPalette,vec2((idx+.5)/6.,.5)).rgb;
    }
    if(vStructureNormal.y>.35&&uStructureSnow>0.){float sn=step(1.-uStructureSnow,mossField(cell+73.));diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.76,.83,.9),sn);}
   `);
  };
  material.customProgramCacheKey=()=>kind+'_painted';resources.materials.add(material);result[kind]=material;
 }
 return result;
}
