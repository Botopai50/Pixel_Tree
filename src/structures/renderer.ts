import {trimAtWall} from './geometry/abutment';
import {paintSurface,paintForgedIron} from './surfacePainting';
import {buildFortressWindow,createFortressWindowTexture,createFortressBannerTexture,buildFortressBanner,buildFortressBarrel,buildFortressTower,buildFortressParapet,buildFortressGateWall} from './geometry/fortress';
import {buildMillGallery,buildMillDoor,buildMillBody,buildMillCap,buildMillPeak,buildMillSeam,buildMillEave} from './geometry/windmill';
import {buildChimney} from './geometry/chimneys';
import {buildThatchRoof} from './geometry/thatch';
import {livingTree} from './natureAdapters';
import {paintUV} from './geometry/paintUV';
import {buildOpenShutter} from './geometry/shutters';
import {paintWallSurface} from './wallPainting';

import * as THREE from 'three';import type {StructurePlan,StructureConfig,PieceSpec} from './types';import {StructureResources,createStructureMaterials} from './materials';import {buildWall} from './geometry/walls';import {buildRoof,buildRidgeCap,buildEaveFascia,buildHipCover,buildHipFascia} from './geometry/roofs';import {buildBeam} from './geometry/beams';import {buildArch} from './geometry/arches';import {buildStairs} from './geometry/stairs';import {box,merge} from './geometry/common';
function pieceGeometry(p:PieceSpec,plan:StructurePlan){if(p.role==='fortress-window-glow')return buildFortressWindow(p);if(p.role==='fortress-banner'||p.role==='fortress-tower-standard')return buildFortressBanner(p);if((p.role==='fortress-barrel'||p.role==='tower-barrel'||p.role==='barn-barrel'))return buildFortressBarrel(p);if(p.role==='fortress-well'||p.role==='fortress-well-rim')return buildFortressParapet(p);if(['fortress-barrel-hoop','fortress-barrel-lid','fortress-well-depth','tower-barrel-hoop','tower-barrel-lid','barn-barrel-hoop','barn-barrel-lid'].includes(p.role)){const g=new THREE.CylinderGeometry(p.size[0]/2,p.size[0]/2,p.size[1],12);g.translate(...p.position);return g;}if(p.role==='fortress-watch-roof')return buildMillCap(p);if(p.role==='fortress-tower')return buildFortressTower(p,plan.pieces.find(x=>x.role==='fortress-curtain')!.size[1]);if(p.role==='fortress-parapet'||p.role==='fortress-tower-timber-ring')return buildFortressParapet(p);if(p.role==='fortress-gate-wall')return buildFortressGateWall(p);if(p.role==='fortress-gate')return buildMillDoor(p);if(['fortress-tower-foot','fortress-tower-cornice','fortress-tower-band','fortress-watch-loft'].includes(p.role)){const sides=p.role==='fortress-watch-loft'?8:12;const g=new THREE.CylinderGeometry(p.size[0]/2,p.size[0]/2,p.size[1],sides);g.rotateY(Math.PI/sides);g.translate(...p.position);return g;}if(p.role==='mill-gallery'||p.role==='mill-entry-gallery')return buildMillGallery(p);if(p.role==='mill-door')return buildMillDoor(p);if(p.role==='mill-door-arch'){const g=buildArch(p.size[0],p.size[2],.64);g.translate(...p.position);return g;}if(p.role==='mill-cap-seam')return buildMillSeam(p,plan.pieces.find(x=>x.id===p.support)!);if(p.role==='mill-cap')return buildMillCap(p);if(p.role==='mill-eave')return buildMillEave(p,plan.pieces.find(x=>x.role==='mill-cap')!);if(p.role==='mill-peak')return buildMillPeak(p);if(p.role==='mill-body')return buildMillBody(p,plan.pieces.filter(x=>x.role==='mill-body').findIndex(x=>x.id===p.id));if(['mill-cap','mill-belt','mill-collar','mill-plinth'].includes(p.role)){const g=new THREE.CylinderGeometry(p.size[2]/2,p.size[0]/2,p.size[1],12);g.rotateY(Math.PI/12);g.translate(...p.position);return g;}if(p.role==='porch-cover'&&p.material==='thatch'){const g=buildThatchRoof({id:p.id,volume:p.support??'',x:0,z:0,y:.065,width:p.size[2]*2,depth:p.size[0],rise:0,eaves:0,kind:'thatch',material:'thatch'},true,.55);g.rotateY(-Math.PI/2);g.translate(0,0,p.size[2]/2);g.applyMatrix4(new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(...p.rotation??[0,0,0])));g.translate(...p.position);return g;}if(p.role==='roof-fascia'||p.role==='eave-fascia'){const hip=plan.roofs.find(r=>r.id===p.support&&r.kind==='hip');if(hip)return buildHipFascia(hip,p.role==='roof-fascia'?(p.position[2]<hip.z?'front':'back'):(p.position[0]<hip.x?'left':'right'));}if(p.role==='hip-cap'||p.role==='hip-ridge-cap')return buildHipCover(plan.roofs.find(r=>r.id===p.support)!,p.position,p.end!);if(p.role==='chimney'||p.role==='chimney-cap')return buildChimney(p.position,p.size);const roof=(p.role==='ridge-cap'||p.role==='eave-fascia')?plan.roofs.find(r=>r.id===p.support&&(r.kind==='gable'||r.kind==='thatch')):undefined;if(roof)return p.role==='ridge-cap'?buildRidgeCap(roof):buildEaveFascia(roof,p.position[0]<roof.x);if(p.kind==='beam')return buildBeam(p.position,p.end!,p.size[0],0,p.cuts);if(p.kind==='stairs')return buildStairs({id:p.id,from:p.position,to:p.end!,width:p.size[0],role:p.role});let g:THREE.BufferGeometry;
 if(p.kind==='column'){g=new THREE.CylinderGeometry(p.size[0]*.45,p.size[0]*.55,p.size[1],8);g.translate(...p.position);}else if(p.kind==='arch'){g=buildArch(p.size[0],p.size[2]);g.applyMatrix4(new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(...p.rotation??[0,0,0])));g.translate(...p.position);}else if(p.kind==='wheel'){g=new THREE.CylinderGeometry(p.size[0]/2,p.size[0]/2,p.size[2],12);g.rotateX(Math.PI/2);g.translate(...p.position);}else if(p.kind==='rock'){g=new THREE.IcosahedronGeometry(1,0);g.scale(...p.size);g.translate(...p.position);}else g=box(p.position,p.size,p.rotation);return g;}
export function renderStructure(plan:StructurePlan,c:StructureConfig){const resources=new StructureResources(),materials=createStructureMaterials(c,resources,plan.seed),assetGroup=new THREE.Group();assetGroup.name='StructureAsset';const attach=(g:THREE.BufferGeometry,material: keyof typeof materials,name:string,grain?:THREE.Vector3):THREE.Mesh<THREE.BufferGeometry,THREE.Material>=>{g=paintUV(g,grain,material==='roof');if(material==='thatch'&&!g.getAttribute('thatchLayer'))g.setAttribute('thatchLayer',new THREE.Float32BufferAttribute(new Float32Array(g.getAttribute('position').count),1));resources.geometries.add(g);const mesh=new THREE.Mesh(g,materials[material]);mesh.name=name;mesh.castShadow=material!=='water';mesh.receiveShadow=true;assetGroup.add(mesh);return mesh;};
 const timber=materials.wood.clone();timber.name='SolidTimber';timber.onBeforeCompile=materials.wood.onBeforeCompile;timber.customProgramCacheKey=materials.wood.customProgramCacheKey;timber.map=paintSurface('wood',c.palette.wood,c.texelsPerMetre,plan.seed,c.finish,true);resources.textures.add(timber.map);resources.materials.add(timber);
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
 const frameMaterial=c.type==='temple'?'stone':'wood';
 const frame=(a:number,b:number,ww:number,hh:number)=>detail(a,b,ww,hh,.16,front,frameMaterial,'frame');
 for(const side of [-1,1])frame(side*(o.width/2+.07),o.height/2,.14,o.height);
 frame(0,o.height+.08,o.width+.28,.16);
 if(o.kind==='window'){
  detail(0,-.07,o.width+.38,.14,.30,front+.03,frameMaterial,'sill');
  if(!o.broken){
   detail(0,o.height/2,o.width,o.height,.04,-.025,'dark','recess');
   if(c.type==='temple'){
    detail(0,o.height*.36,o.width*.25,o.height*.43,.12,front-.02,'stone','relief-body');
    detail(0,o.height*.67,o.width*.22,o.width*.22,.13,front-.015,'stone','relief-head');
    detail(0,o.height*.12,o.width*.50,.09,.16,front,'stone','relief-base');
   }else{
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
 for(const roof of plan.roofs)if(!roof.removed)attach(roof.abutment?trimAtWall(buildRoof(roof),roof.abutment):buildRoof(roof),roof.material,roof.id);
 let barnIron:THREE.MeshStandardMaterial|undefined;
 if(c.type==='barn'){barnIron=materials.metal.clone();barnIron.map=paintForgedIron(c.texelsPerMetre,plan.seed);barnIron.roughness=.8;barnIron.metalness=.35;resources.textures.add(barnIron.map);resources.materials.add(barnIron);}

 let windowMaterial:THREE.MeshBasicMaterial|undefined;
 if(c.type==='fortress'){const map=createFortressWindowTexture();resources.textures.add(map);windowMaterial=new THREE.MeshBasicMaterial({map,side:THREE.DoubleSide});resources.materials.add(windowMaterial);}
 let bannerMaterial:THREE.MeshStandardMaterial|undefined;
 if(c.type==='fortress'){const texture=createFortressBannerTexture();resources.textures.add(texture);bannerMaterial=new THREE.MeshStandardMaterial({map:texture,roughness:1,side:THREE.DoubleSide,alphaTest:.5});resources.materials.add(bannerMaterial);}
 const chimneyLining=['#a29c9e','#777177','#504a51'].map(color=>{const material=materials.stone.clone();material.color.set(color);material.onBeforeCompile=materials.stone.onBeforeCompile;material.customProgramCacheKey=materials.stone.customProgramCacheKey;resources.materials.add(material);return material;});
 for(const p of [...plan.pieces,...plan.debris])if(!p.removed){if(p.kind==='tree')assetGroup.add(livingTree(p,c,plan.seed,resources,materials.wood));else {let grain:THREE.Vector3|undefined;if(p.material==='wood'){if(p.end)grain=new THREE.Vector3(...p.end).sub(new THREE.Vector3(...p.position)).normalize();else {const axis=p.size.indexOf(Math.max(...p.size));grain=new THREE.Vector3(axis===0?1:0,axis===1?1:0,axis===2?1:0);if(p.rotation)grain.applyEuler(new THREE.Euler(...p.rotation));}}if(p.role==='fortress-gate')grain=new THREE.Vector3(0,1,0);const hipCover=p.role==='hip-cap'||p.role==='hip-ridge-cap';if(hipCover)grain=new THREE.Vector3(...p.end!).sub(new THREE.Vector3(...p.position)).normalize();let geometry=pieceGeometry(p,plan);const hostRoof=plan.roofs.find(roof=>roof.id===p.support);if(hostRoof?.abutment)geometry=trimAtWall(geometry,hostRoof.abutment);const mesh=attach(geometry,p.material,p.id,grain);if(barnIron&&p.role.startsWith('barn-door-')&&p.material==='metal')mesh.material=barnIron;if(p.material==='wood'&&(p.kind==='beam'||/(?:^|-)(post|pillar|brace|joist|rafter|frame|sill|bar|fascia|cap|joint|ridge)(?:-|$)/.test(p.role)))mesh.material=timber;if(bannerMaterial&&(p.role==='fortress-banner'||p.role==='fortress-tower-standard'))mesh.material=bannerMaterial;if(windowMaterial&&p.role==='fortress-window-glow')mesh.material=windowMaterial;if(p.role.startsWith('chimney-lining-'))mesh.material=chimneyLining[Number(p.role.slice(-1))];}}
 // Static architecture is batched by material. Underground walls stay separate for the reversible cutaway.
 if(c.type!=='underground'){
  const batches=new Map<THREE.Material,THREE.Mesh[]>();
  for(const child of [...assetGroup.children])if(child instanceof THREE.Mesh&&!(child instanceof THREE.InstancedMesh)){const mat=child.material as THREE.Material;const list=batches.get(mat)??[];list.push(child);batches.set(mat,list);}
  for(const [mat,meshes] of batches){if(meshes.length<2)continue;const geometries=meshes.map(m=>m.geometry);geometries.forEach(g=>resources.geometries.delete(g));const geo=merge(geometries);resources.geometries.add(geo);meshes.forEach(m=>m.removeFromParent());const mesh=new THREE.Mesh(geo,mat);mesh.name='Architecture_'+Object.keys(materials).find(key=>materials[key as keyof typeof materials]===mat);mesh.castShadow=mesh.receiveShadow=true;assetGroup.add(mesh);}
 }
 assetGroup.scale.setScalar(c.scale);assetGroup.updateMatrixWorld(true);return {assetGroup,bounds:new THREE.Box3().setFromObject(assetGroup),resources,materials,update:(_time:number)=>{},dispose:resources.dispose};}
