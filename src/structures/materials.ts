import * as THREE from 'three';
import type {StructureConfig,SurfaceMaterial} from './types';
import {pixelMossNoiseGLSL} from '../services/mossStyle';
import {paintSurface} from './surfacePainting';

export class StructureResources {
 geometries=new Set<THREE.BufferGeometry>();materials=new Set<THREE.Material>();
 textures=new Set<THREE.Texture>();instances=new Set<THREE.InstancedMesh>();private disposed=false;
 dispose=()=>{if(this.disposed)return;this.disposed=true;this.instances.forEach(mesh=>mesh.dispose());this.geometries.forEach(g=>g.dispose());this.materials.forEach(m=>m.dispose());this.textures.forEach(t=>t.dispose());};
}

export function createStructureMaterials(c:StructureConfig,resources:StructureResources,seed=0){
 const colors:Record<SurfaceMaterial,string>={wood:c.palette.wood,stone:c.palette.stone,plaster:c.palette.plaster,roof:c.palette.roof,thatch:'#ba873d',metal:'#687681',cloth:'#b97a58',dark:'#1f2830',earth:'#978568',water:'#3c858f'};
 const result={} as Record<SurfaceMaterial,THREE.MeshStandardMaterial>;
 for(const [name,color] of Object.entries(colors)){
  const kind=name as SurfaceMaterial,map=paintSurface(kind,color,c.texelsPerMetre,seed,c.finish);resources.textures.add(map);
  const material=new THREE.MeshStandardMaterial({color:'#ffffff',map,roughness:kind==='metal'?.65:1,metalness:kind==='metal'?.15:0,side:kind==='cloth'?THREE.DoubleSide:THREE.FrontSide});
  material.userData.pixelDensity=c.texelsPerMetre;
  material.onBeforeCompile=shader=>{
   shader.uniforms.uPixelDensity={value:c.texelsPerMetre};shader.uniforms.uStructureMoss={value:kind==='water'||kind==='dark'||kind==='metal'?0:c.vegetation*.45};
   shader.uniforms.uStructureSnow={value:kind==='water'?0:c.snow};shader.uniforms.uStructureSeed={value:seed};
   shader.vertexShader='varying vec3 vStructurePos;varying vec3 vStructureNormal;\n'+shader.vertexShader;
   shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvStructurePos=position;vStructureNormal=normal;');
   shader.fragmentShader='uniform float uPixelDensity,uStructureMoss,uStructureSnow,uStructureSeed;varying vec3 vStructurePos;varying vec3 vStructureNormal;\n'+pixelMossNoiseGLSL('uStructureSeed')+shader.fragmentShader;
   shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
    vec3 cell=floor(vStructurePos*uPixelDensity);float field=mossField(cell+13.);float weather=1.-smoothstep(.2,1.8,vStructurePos.y);
    if(uStructureMoss>0.){float moss=step(1.-uStructureMoss*weather,field);diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.13,.23,.065),moss*.65);}
    if(vStructureNormal.y>.35&&uStructureSnow>0.){float sn=step(1.-uStructureSnow,mossField(cell+73.));diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.76,.83,.9),sn);}
   `);
  };
  material.customProgramCacheKey=()=>kind+'_painted';resources.materials.add(material);result[kind]=material;
 }
 return result;
}
