import {createCampFire} from './geometry/campFire';
import {buildCampPiece,campCanvasTexture,campCutWoodMaterial,campKettleTexture,campHearthTexture} from './geometry/camp';
import {buildTempleGlyph,createTempleGlyphTexture,createTemplePavingTexture} from './geometry/temple';
import {trimAtWall} from './geometry/abutment';
import {paintSurface,paintForgedIron} from './surfacePainting';
import {createCastleBannerTexture,buildFortressWindow,createFortressWindowTexture,createFortressBannerTexture,buildFortressBanner,buildFortressBarrel,buildFortressTower,buildFortressParapet,buildFortressGateWall} from './geometry/fortress';
import {buildMillGallery,buildMillDoor,buildMillBody,buildMillCap,buildMillPeak,buildMillSeam,buildMillEave} from './geometry/windmill';
import {buildChimney} from './geometry/chimneys';
import {buildThatchRoof} from './geometry/thatch';
import {livingTree} from './natureAdapters';
import {paintUV} from './geometry/paintUV';
import {buildOpenShutter} from './geometry/shutters';
import {paintWallSurface} from './wallPainting';

import * as THREE from 'three';import type {StructurePlan,StructureConfig,PieceSpec} from './types';import {StructureResources,createStructureMaterials} from './materials';import {buildWall} from './geometry/walls';import {buildRoof,buildRidgeCap,buildEaveFascia,buildHipCover,buildHipFascia} from './geometry/roofs';import {buildBeam} from './geometry/beams';import {buildArch} from './geometry/arches';import {buildStairs} from './geometry/stairs';import {box,merge} from './geometry/common';
function pieceGeometry(p:PieceSpec,plan:StructurePlan){if(plan.type==='camp'){if(p.role==='camp-barrel')return buildFortressBarrel(p);const geometry=buildCampPiece(p);if(geometry)return geometry;}if(p.role==='lighthouse-finial'){const g=new THREE.ConeGeometry(p.size[0]/2,p.size[1],8);g.translate(...p.position);return g;}if(p.role==='lantern'&&plan.type==='lighthouse'){const g=new THREE.CylinderGeometry(p.size[0]/2,p.size[0]/2,p.size[1],8);g.rotateY(Math.PI/8);g.translate(...p.position);return g;}if(p.role==='temple-glyph')return buildTempleGlyph(p);if(p.role==='fortress-window-glow')return buildFortressWindow(p);if(['fortress-banner','fortress-tower-standard','castle-banner','castle-standard'].includes(p.role))return buildFortressBanner(p);if((p.role==='fortress-barrel'||p.role==='tower-barrel'||p.role==='barn-barrel'))return buildFortressBarrel(p);if(p.role==='fortress-well'||p.role==='fortress-well-rim')return buildFortressParapet(p);if(['fortress-barrel-hoop','fortress-barrel-lid','fortress-well-depth','tower-barrel-hoop','tower-barrel-lid','barn-barrel-hoop','barn-barrel-lid'].includes(p.role)){const g=new THREE.CylinderGeometry(p.size[0]/2,p.size[0]/2,p.size[1],12);g.translate(...p.position);return g;}if(p.role==='fortress-watch-roof')return buildMillCap(p);if(p.role==='fortress-tower')return buildFortressTower(p,plan.pieces.find(x=>x.role==='fortress-curtain')!.size[1]);if(p.role==='fortress-parapet'||p.role==='fortress-tower-timber-ring')return buildFortressParapet(p);if(p.role==='fortress-gate-wall')return buildFortressGateWall(p);if(p.role==='fortress-gate')return buildMillDoor(p);if(['fortress-tower-foot','fortress-tower-cornice','fortress-tower-band','fortress-watch-loft'].includes(p.role)){const sides=p.role==='fortress-watch-loft'?8:12;const g=new THREE.CylinderGeometry(p.size[0]/2,p.size[0]/2,p.size[1],sides);g.rotateY(Math.PI/sides);g.translate(...p.position);return g;}if(p.role==='mill-gallery'||p.role==='mill-entry-gallery')return buildMillGallery(p);if(p.role==='mill-door')return buildMillDoor(p);if(p.role==='mill-door-arch'){const g=buildArch(p.size[0],p.size[2],.64);g.translate(...p.position);return g;}if(p.role==='mill-cap-seam')return buildMillSeam(p,plan.pieces.find(x=>x.id===p.support)!);if(p.role==='mill-cap')return buildMillCap(p);if(p.role==='mill-eave')return buildMillEave(p,plan.pieces.find(x=>x.role==='mill-cap')!);if(p.role==='mill-peak')return buildMillPeak(p);if(p.role==='mill-body')return buildMillBody(p,plan.pieces.filter(x=>x.role==='mill-body').findIndex(x=>x.id===p.id));if(['mill-cap','mill-belt','mill-collar','mill-plinth'].includes(p.role)){const g=new THREE.CylinderGeometry(p.size[2]/2,p.size[0]/2,p.size[1],12);g.rotateY(Math.PI/12);g.translate(...p.position);return g;}if(p.role==='porch-cover'&&p.material==='thatch'){const g=buildThatchRoof({id:p.id,volume:p.support??'',x:0,z:0,y:.065,width:p.size[2]*2,depth:p.size[0],rise:0,eaves:0,kind:'thatch',material:'thatch'},true,.55);g.rotateY(-Math.PI/2);g.translate(0,0,p.size[2]/2);g.applyMatrix4(new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(...p.rotation??[0,0,0])));g.translate(...p.position);return g;}if(p.role==='roof-fascia'||p.role==='eave-fascia'){const hip=plan.roofs.find(r=>r.id===p.support&&r.kind==='hip');if(hip)return buildHipFascia(hip,p.role==='roof-fascia'?(p.position[2]<hip.z?'front':'back'):(p.position[0]<hip.x?'left':'right'));}if(p.role==='hip-cap'||p.role==='hip-ridge-cap')return buildHipCover(plan.roofs.find(r=>r.id===p.support)!,p.position,p.end!);if(p.role==='chimney'||p.role==='chimney-cap')return buildChimney(p.position,p.size);const roof=(p.role==='ridge-cap'||p.role==='eave-fascia')?plan.roofs.find(r=>r.id===p.support&&(r.kind==='gable'||r.kind==='thatch')):undefined;if(roof)return p.role==='ridge-cap'?buildRidgeCap(roof):buildEaveFascia(roof,p.position[0]<roof.x);if(p.kind==='beam')return buildBeam(p.position,p.end!,p.size[0],0,p.cuts,(p.role==='bridge-stair-stringer'||p.role==='bridge-stair-handrail')?p.size[1]:p.size[0]);if(p.kind==='stairs')return buildStairs({id:p.id,from:p.position,to:p.end!,width:p.size[0],role:p.role});let g:THREE.BufferGeometry;
 if(p.kind==='column'){g=new THREE.CylinderGeometry(p.size[0]*.45,p.size[0]*.55,p.size[1],8);g.translate(...p.position);}else if(p.kind==='arch'){g=buildArch(p.size[0],p.size[2]);g.applyMatrix4(new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(...p.rotation??[0,0,0])));g.translate(...p.position);}else if(p.kind==='wheel'){g=new THREE.CylinderGeometry(p.size[0]/2,p.size[0]/2,p.size[2],12);g.rotateX(Math.PI/2);g.translate(...p.position);}else if(p.kind==='rock'){g=new THREE.IcosahedronGeometry(1,0);g.scale(...p.size);g.translate(...p.position);}else g=box(p.position,p.size,p.rotation);return g;}
export function renderStructure(plan:StructurePlan,c:StructureConfig){const resources=new StructureResources(),materials=createStructureMaterials(c,resources,plan.seed),assetGroup=new THREE.Group();assetGroup.name='StructureAsset';const attach=(g:THREE.BufferGeometry,material: keyof typeof materials,name:string,grain?:THREE.Vector3):THREE.Mesh<THREE.BufferGeometry,THREE.Material>=>{g=paintUV(g,grain,material==='roof');if(material==='stone'&&(c.type==='castle'||c.type==='ruinedCastle')){const uv=g.getAttribute('uv');for(let i=0;i<uv.count;i++)uv.setXY(i,uv.getX(i)*.75,uv.getY(i)*.75);}if(material==='thatch'&&!g.getAttribute('thatchLayer'))g.setAttribute('thatchLayer',new THREE.Float32BufferAttribute(new Float32Array(g.getAttribute('position').count),1));resources.geometries.add(g);const mesh=new THREE.Mesh(g,materials[material]);mesh.name=name;mesh.castShadow=material!=='water';mesh.receiveShadow=true;assetGroup.add(mesh);return mesh;};
 const campMaterials=new Map<string,THREE.Material>();
 if(c.type==='camp'){
  const canvas=campCanvasTexture(c.texelsPerMetre,plan.seed);resources.textures.add(canvas);materials.cloth.map=canvas;
  const material=(role:string,base:THREE.MeshStandardMaterial,color:string,emissive?:string)=>{
   const m=base.clone();m.onBeforeCompile=base.onBeforeCompile;m.customProgramCacheKey=base.customProgramCacheKey;m.color.set(color);
   if(emissive){m.map=null;m.emissive.set(emissive);m.emissiveIntensity=2;}
   resources.materials.add(m);campMaterials.set(role,m);return m;
  };
  material('camp-bedroll-blue',materials.cloth,'#577789');material('camp-bedroll-red',materials.cloth,'#8e4935');
  const hearth=plan.pieces.find(p=>p.role==='camp-hearth-ground');
  if(hearth){
   const dirt=material('camp-hearth-ground',materials.earth,'#ffffff');
   dirt.map=campHearthTexture(hearth.size[0],hearth.size[2],c.texelsPerMetre,plan.seed);
   dirt.alphaTest=.5;dirt.polygonOffset=true;dirt.polygonOffsetFactor=-1;dirt.polygonOffsetUnits=-1;
   resources.textures.add(dirt.map);
  }
  const kettleIron=campKettleTexture(c.texelsPerMetre,plan.seed);
  resources.textures.add(kettleIron);
  for(const role of ['camp-kettle','camp-kettle-handle','camp-pot-chain']){
   const iron=material(role,materials.metal,'#ffffff');iron.map=kettleIron;iron.roughness=.95;iron.metalness=0;iron.flatShading=true;
   iron.emissiveMap=kettleIron;iron.emissive.set('#ffffff');iron.emissiveIntensity=.08;
   if(role==='camp-kettle'){
    const baseCompile=iron.onBeforeCompile;
    iron.onBeforeCompile=(shader,renderer)=>{
     baseCompile.call(iron,shader,renderer);
     shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
      if(vStructurePos.y>1.215){
       diffuseColor.rgb*=1.25;
      }`);
    };
    iron.customProgramCacheKey=()=> 'camp_kettle_cast_iron';
   }
  }
   const treeWood=campCutWoodMaterial(c.texelsPerMetre,plan.seed,c.palette.wood);
   treeWood.textures.forEach(texture=>resources.textures.add(texture));
   resources.materials.add(treeWood.bark);resources.materials.add(treeWood.end);
   for(const role of ['camp-stump','camp-firewood','camp-fallen-log'])campMaterials.set(role,treeWood.bark);
   const burntLogs=new THREE.ShaderMaterial({
    fog:true,
    uniforms:{...treeWood.bark.uniforms},vertexShader:treeWood.bark.vertexShader,
    fragmentShader:treeWood.bark.fragmentShader.replace('gl_FragColor = vec4(col, 1.0);',`
     vec2 burnCell=floor(vec2(vWood.y,vAngleU*6.2831853*vWood.z)*uTexelsPerMetre);
     float burnNoise=bhash2(floor(burnCell/2.0)+uTextureSeed);
     float burnDistance=abs((burnCell.x+.5)/uTexelsPerMetre-.425);
     float burnEdge=.305+(burnNoise-.5)*.055;
     if(burnDistance<burnEdge){
      float burnLevel=burnDistance<burnEdge-.055?.95:.72;
      float crack=bhash2(burnCell+17.0);
      vec3 charcoal=vec3(.09,.082,.074)+col*.06;
      if(crack<.18)charcoal*=.55;
      else if(crack>.94)charcoal+=vec3(.04,.038,.035);
      col=mix(col,charcoal,burnLevel);
     }
     gl_FragColor=vec4(col,1.0);
    `),
   });
   burntLogs.name='CampFirewoodCharredTexture';resources.materials.add(burntLogs);
   campMaterials.set('camp-burning-log',burntLogs);
   for(const role of ['camp-stump-end','camp-firewood-end','camp-log-end','camp-burning-log-end'])campMaterials.set(role,treeWood.end);
 }
 const timber=materials.wood.clone();timber.name='SolidTimber';timber.onBeforeCompile=materials.wood.onBeforeCompile;timber.customProgramCacheKey=materials.wood.customProgramCacheKey;const timberColor=(c.type==='lighthouse'||c.type==='bridge')?new THREE.Color(c.palette.wood).multiplyScalar(1.35).getStyle():c.palette.wood;timber.map=paintSurface('wood',timberColor,c.texelsPerMetre,plan.seed,c.finish,true);resources.textures.add(timber.map);resources.materials.add(timber);
 for(const w of plan.walls){if(w.removed)continue;const openings=plan.openings.filter(o=>o.wall===w.id);
 const barnSide=c.type==='barn'&&w.material==='wood'&&Math.abs(w.end[2]-w.start[2])>Math.abs(w.end[0]-w.start[0]);
 let wallGeometry:THREE.BufferGeometry;
 if(barnSide){
  const dx=w.end[0]-w.start[0],dz=w.end[2]-w.start[2],length=Math.hypot(dx,dz),cx=(w.start[0]+w.end[0])/2,cz=(w.start[2]+w.end[2])/2;
  wallGeometry=merge([-1,1].map(side=>{
   const start: [number,number,number]=side<0?[...w.start]:[cx+dx/length*.17,w.bottom,cz+dz/length*.17];
   const end: [number,number,number]=side<0?[cx-dx/length*.17,w.bottom,cz-dz/length*.17]:[...w.end];
   const center=side*(length/4+.085),left=w.topLeft??w.height,right=w.topRight??w.height;
   const top=(t:number)=>left+(right-left)*t;
   return buildWall({...w,start,end,topLeft:top(side<0?0:.5+.17/length),topRight:top(side<0?.5-.17/length:1)},openings.filter(o=>Math.sign(o.offset)===side).map(o=>({...o,offset:o.offset-center})));
  }));
 }else wallGeometry=buildWall(w,openings);
 const wallMesh=attach(wallGeometry,w.material,w.id);
 // Fit whole boards into the clear span on either side of the barn's middle post.
 // World-space repetition otherwise leaves narrow board fragments at the timber edges.
 if(barnSide){
  const length=Math.hypot(w.end[0]-w.start[0],w.end[2]-w.start[2]),ux=(w.end[0]-w.start[0])/length,uz=(w.end[2]-w.start[2])/length;
  const cx=(w.start[0]+w.end[0])/2,cz=(w.start[2]+w.end[2])/2;
  const positions=wallMesh.geometry.getAttribute('position'),uv=wallMesh.geometry.getAttribute('uv');
  const bayLength=length/2-.24,boards=Math.max(1,Math.round(bayLength/.28));
  for(let i=0;i<positions.count;i++){
   const along=(positions.getX(i)-cx)*ux+(positions.getZ(i)-cz)*uz;
   const start=along<0?-length/2+.07:.17;
   uv.setXY(i,(along-start)/bayLength*boards*.28,positions.getY(i));
  }
  uv.needsUpdate=true;
 }else if(w.material==='wood'){
  // Other timber buildings have one clear bay between their corner posts.
  const length=Math.hypot(w.end[0]-w.start[0],w.end[2]-w.start[2]),ux=(w.end[0]-w.start[0])/length,uz=(w.end[2]-w.start[2])/length;
  const posts=plan.pieces.filter(piece=>!piece.removed&&piece.role==='corner-post'&&piece.material==='wood'&&Math.hypot(piece.position[0]-w.start[0],piece.position[2]-w.start[2])<.4);
  const inset=(posts[0]?.size[0]??.30)/2,bayLength=Math.max(.28,length-inset*2),boards=Math.max(1,Math.round(bayLength/.28));
  const positions=wallMesh.geometry.getAttribute('position'),uv=wallMesh.geometry.getAttribute('uv');
  for(let i=0;i<positions.count;i++){
   const along=(positions.getX(i)-w.start[0])*ux+(positions.getZ(i)-w.start[2])*uz;
   uv.setXY(i,(along-inset)/bayLength*boards*.28,positions.getY(i));
  }
  uv.needsUpdate=true;
 }
 if(w.material==='plaster'){
  const material=materials.plaster.clone();material.onBeforeCompile=materials.plaster.onBeforeCompile;material.customProgramCacheKey=materials.plaster.customProgramCacheKey;
  material.map=paintWallSurface(wallMesh.geometry,w,openings,plan,c);resources.textures.add(material.map);resources.materials.add(material);wallMesh.material=material;
 }
 const dx=w.end[0]-w.start[0],dz=w.end[2]-w.start[2],len=Math.hypot(dx,dz),ux=dx/len,uz=dz/len,nx=uz,nz=-ux;
 for(const o of plan.openings.filter(o=>o.wall===w.id)){const x=(w.start[0]+w.end[0])/2+ux*o.offset,z=(w.start[2]+w.end[2])/2+uz*o.offset,y=w.bottom+o.bottom;const front=w.thickness/2+.065;
 const detail=(a:number,b:number,ww:number,hh:number,depth:number,offset:number,material:keyof typeof materials,name:string)=>{const g=box([0,0,0],[ww,hh,depth]);g.rotateY(-Math.atan2(dz,dx));g.translate(x+ux*a+nx*offset,y+b,z+uz*a+nz*offset);const mesh=attach(g,material,o.id+'_'+name,ww>hh?new THREE.Vector3(ux,0,uz):new THREE.Vector3(0,1,0));if(material==='wood'&&['frame','sill','mullion','crossbar','door-crossrail'].includes(name))mesh.material=timber;return mesh;};
 const royal=(c.type==='castle'||c.type==='ruinedCastle')&&w.material==='stone';const frameMaterial=c.type==='temple'||royal?'stone':'wood';
 const frame=(a:number,b:number,ww:number,hh:number)=>detail(a,b,ww,hh,.16,front,frameMaterial,'frame');
 const frameHeight=o.arched?o.height-o.width/2:o.height;
 for(const side of [-1,1])frame(side*(o.width/2+.07),frameHeight/2,.14,frameHeight);
 if(o.arched){const arch=buildArch(o.width,.14,.18);arch.rotateY(-Math.atan2(dz,dx));arch.translate(x+nx*front,y+frameHeight,z+nz*front);attach(arch,frameMaterial,o.id+'_arch');}
 else frame(0,o.height+.08,o.width+.28,.16);
 if(o.kind==='window'){
  detail(0,-.07,o.width+.38,.14,.30,front+.03,frameMaterial,'sill');
  if(!o.broken){
   detail(0,o.height/2,o.width,o.height,.04,-.025,'dark','recess');
   if(c.type==='temple'){
    detail(0,o.height*.36,o.width*.25,o.height*.43,.12,front-.02,'stone','relief-body');
    detail(0,o.height*.67,o.width*.22,o.width*.22,.13,front-.015,'stone','relief-head');
    detail(0,o.height*.12,o.width*.50,.09,.16,front,'stone','relief-base');
   }else if(!royal){
    detail(0,o.height/2,.07,o.height,.08,w.thickness/2,'wood','mullion');
    for(const side of [-1,1])detail(side*(o.width+.07)/4,o.height/2,(o.width-.07)/2,.07,.08,w.thickness/2,'wood','crossbar');
    if(c.complexity>.3)for(const side of [-1,1]){
     const hingeX=side*(o.width/2+.025),hingeDepth=w.thickness/2+.175;
     for(const part of buildOpenShutter(o.width,o.height,side,o.shutterAngles?.[side<0?0:1]??155)){
      part.geometry.translate(hingeX,o.height/2,-hingeDepth);
      part.geometry.rotateY(-Math.atan2(dz,dx));part.geometry.translate(x,y,z);
      attach(part.geometry,part.material,o.id+'_'+part.role,part.role==='shutter'?new THREE.Vector3(0,1,0):undefined);
     }
    }
   }
  }
 }else if(c.type!=='barn') {
  const door=box([0,0,0],[o.width-.14,o.height-.12,.08]);if(o.broken)door.rotateZ(.14);door.rotateY(-Math.atan2(dz,dx));door.translate(x-nx*.015,y+o.height/2,z-nz*.015);attach(door,'wood',o.id+'_door',new THREE.Vector3(0,1,0));
  if(!o.broken){
   detail(0,o.height/2,o.width,o.height,.025,-.07,'dark','door-recess');
   for(const level of [.25,.74]){detail(0,o.height*level,o.width-.20,.13,.045,.043,'wood','door-crossrail');detail(0,o.height*level,o.width-.22,.065,.018,.076,'metal','strap');for(const side of [-1,1])detail(side*(o.width/2-.16),o.height*level,.04,.04,.028,.094,'metal','rivet');}
   detail(o.width*.28,o.height*.48,.13,.18,.025,.06,'dark','handle-plate');
   const ring=new THREE.TorusGeometry(.065,.018,4,8);ring.rotateY(-Math.atan2(dz,dx));ring.translate(x+ux*o.width*.28+nx*.11,y+o.height*.48,z+uz*o.width*.28+nz*.11);attach(ring,'metal',o.id+'_door-handle');
  }
 }
 }
 }
 let templePaving:THREE.MeshStandardMaterial|undefined;if(c.type==='temple'){templePaving=materials.stone.clone();templePaving.onBeforeCompile=materials.stone.onBeforeCompile;templePaving.customProgramCacheKey=materials.stone.customProgramCacheKey;templePaving.map=createTemplePavingTexture(c.palette.stone,c.texelsPerMetre,plan.seed);resources.textures.add(templePaving.map);resources.materials.add(templePaving);}
 for(const roof of plan.roofs)if(!roof.removed){const mesh=attach(roof.abutment?trimAtWall(buildRoof(roof),roof.abutment):buildRoof(roof),roof.material,roof.id);if(templePaving&&roof.material==='stone')mesh.material=templePaving;}
 const templeGlyphs=c.type==='temple'?Array.from({length:4},(_,i)=>{const map=createTempleGlyphTexture(c.palette.stone,i);resources.textures.add(map);const material=new THREE.MeshStandardMaterial({map,roughness:1,side:THREE.DoubleSide});resources.materials.add(material);return material;}):[];
 let castlePlinth:THREE.MeshStandardMaterial|undefined;
 if(c.type==='castle'||c.type==='ruinedCastle'){castlePlinth=materials.stone.clone();castlePlinth.color.setRGB(.64,.69,.74);castlePlinth.onBeforeCompile=materials.stone.onBeforeCompile;castlePlinth.customProgramCacheKey=materials.stone.customProgramCacheKey;resources.materials.add(castlePlinth);}
 let castleBanner:THREE.MeshStandardMaterial|undefined,castleFlag:THREE.MeshStandardMaterial|undefined;
 if(c.type==='castle'||c.type==='ruinedCastle'){const maps=[createCastleBannerTexture(),createCastleBannerTexture(true)];const mats=maps.map(map=>{resources.textures.add(map);const material=new THREE.MeshStandardMaterial({map,roughness:1,side:THREE.DoubleSide,alphaTest:.5});resources.materials.add(material);return material;});[castleBanner,castleFlag]=mats;}
 let barnIron:THREE.MeshStandardMaterial|undefined;
 if(c.type==='barn'){barnIron=materials.metal.clone();barnIron.map=paintForgedIron(c.texelsPerMetre,plan.seed);barnIron.roughness=.8;barnIron.metalness=.35;resources.textures.add(barnIron.map);resources.materials.add(barnIron);}

 let windowMaterial:THREE.MeshBasicMaterial|undefined;
 if(c.type==='fortress'){const map=createFortressWindowTexture();resources.textures.add(map);windowMaterial=new THREE.MeshBasicMaterial({map,side:THREE.DoubleSide});resources.materials.add(windowMaterial);}
 let bannerMaterial:THREE.MeshStandardMaterial|undefined;
 if(c.type==='fortress'){const texture=createFortressBannerTexture();resources.textures.add(texture);bannerMaterial=new THREE.MeshStandardMaterial({map:texture,roughness:1,side:THREE.DoubleSide,alphaTest:.5});resources.materials.add(bannerMaterial);}
 const chimneyLining=['#a29c9e','#777177','#504a51'].map(color=>{const material=materials.stone.clone();material.color.set(color);material.onBeforeCompile=materials.stone.onBeforeCompile;material.customProgramCacheKey=materials.stone.customProgramCacheKey;resources.materials.add(material);return material;});
 for(const p of [...plan.pieces,...plan.debris])if(!p.removed){if(p.kind==='tree')assetGroup.add(livingTree(p,c,plan.seed,resources,materials.wood));else {let grain:THREE.Vector3|undefined;if(p.material==='wood'){if(p.end)grain=new THREE.Vector3(...p.end).sub(new THREE.Vector3(...p.position)).normalize();else {const axis=p.size.indexOf(Math.max(...p.size));grain=new THREE.Vector3(axis===0?1:0,axis===1?1:0,axis===2?1:0);if(p.rotation)grain.applyEuler(new THREE.Euler(...p.rotation));}}if(p.role==='fortress-gate')grain=new THREE.Vector3(0,1,0);const hipCover=p.role==='hip-cap'||p.role==='hip-ridge-cap';if(hipCover)grain=new THREE.Vector3(...p.end!).sub(new THREE.Vector3(...p.position)).normalize();let geometry=pieceGeometry(p,plan);const hostRoof=plan.roofs.find(roof=>roof.id===p.support);if(hostRoof?.abutment)geometry=trimAtWall(geometry,hostRoof.abutment);if(c.type==='bridge'&&p.material==='metal'){const positions=geometry.getAttribute('position'),local=new Float32Array(positions.count*3),half=new Float32Array(positions.count*3);for(let i=0;i<positions.count;i++){local.set([positions.getX(i)-p.position[0],positions.getY(i)-p.position[1],positions.getZ(i)-p.position[2]],i*3);half.set(p.size.map(v=>v/2),i*3);}geometry.setAttribute('ironLocalPosition',new THREE.BufferAttribute(local,3));geometry.setAttribute('ironHalfSize',new THREE.BufferAttribute(half,3));}const mesh=attach(geometry,p.material,p.id,grain);if(campMaterials.has(p.role)){mesh.material=campMaterials.get(p.role)!;if(p.role==="camp-flame")mesh.castShadow=false;}if(p.role==='temple-glyph')mesh.material=templeGlyphs[Number(p.id.split('_').at(-1))%4];if(castlePlinth&&p.role.startsWith('castle-stone-plinth'))mesh.material=castlePlinth;if(castleBanner&&p.role==='castle-banner')mesh.material=castleBanner;if(castleFlag&&p.role==='castle-standard')mesh.material=castleFlag;if(barnIron&&p.role.startsWith('barn-door-')&&p.material==='metal')mesh.material=barnIron;if(p.material==='wood'&&(p.kind==='beam'||(c.type==='bridge'&&p.role!=='deck-plank'&&p.role!=='bridge-stair-tread')||p.role==='lighthouse-timber-belt'||/(?:^|-)(post|pillar|brace|joist|rafter|frame|sill|bar|fascia|cap|joint|ridge)(?:-|$)/.test(p.role)))mesh.material=timber;if(bannerMaterial&&(p.role==='fortress-banner'||p.role==='fortress-tower-standard'))mesh.material=bannerMaterial;if(windowMaterial&&p.role==='fortress-window-glow')mesh.material=windowMaterial;if(p.role.startsWith('chimney-lining-'))mesh.material=chimneyLining[Number(p.role.slice(-1))];}}
 // Static architecture is batched by material. Underground walls stay separate for the reversible cutaway.
 if(c.type!=='underground'){
  const batches=new Map<THREE.Material,THREE.Mesh[]>();
  for(const child of [...assetGroup.children])if(child instanceof THREE.Mesh&&!(child instanceof THREE.InstancedMesh)){const mat=child.material as THREE.Material;const list=batches.get(mat)??[];list.push(child);batches.set(mat,list);}
  for(const [mat,meshes] of batches){if(meshes.length<2)continue;const geometries=meshes.map(m=>m.geometry);geometries.forEach(g=>resources.geometries.delete(g));const geo=merge(geometries);resources.geometries.add(geo);meshes.forEach(m=>m.removeFromParent());const mesh=new THREE.Mesh(geo,mat);mesh.name='Architecture_'+Object.keys(materials).find(key=>materials[key as keyof typeof materials]===mat);mesh.castShadow=mesh.receiveShadow=true;assetGroup.add(mesh);}
 }
 const fire=c.type==='camp'&&plan.pieces.filter(p=>p.role==='camp-burning-log'&&!p.removed).length>=3?createCampFire(c.texelsPerMetre):undefined;
 if(fire){resources.geometries.add(fire.geometry);resources.materials.add(fire.material);resources.textures.add(fire.texture);assetGroup.add(fire.mesh);}
 assetGroup.scale.setScalar(c.scale);assetGroup.updateMatrixWorld(true);return {assetGroup,bounds:new THREE.Box3().setFromObject(assetGroup),resources,materials,update:(time:number)=>{fire?.update(time);},dispose:resources.dispose};}




