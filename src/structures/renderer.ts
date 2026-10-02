import {livingTree} from './natureAdapters';
import {paintUV} from './geometry/paintUV';
import * as THREE from 'three';import type {StructurePlan,StructureConfig,PieceSpec} from './types';import {StructureResources,createStructureMaterials} from './materials';import {buildWall} from './geometry/walls';import {buildRoof} from './geometry/roofs';import {buildBeam} from './geometry/beams';import {buildArch} from './geometry/arches';import {buildStairs} from './geometry/stairs';import {box,merge} from './geometry/common';
function pieceGeometry(p:PieceSpec){if(p.kind==='beam')return buildBeam(p.position,p.end!,p.size[0]);if(p.kind==='stairs')return buildStairs({id:p.id,from:p.position,to:p.end!,width:p.size[0],role:p.role});let g:THREE.BufferGeometry;
 if(p.kind==='column'){g=new THREE.CylinderGeometry(p.size[0]*.45,p.size[0]*.55,p.size[1],8);g.translate(...p.position);}else if(p.kind==='arch'){g=buildArch(p.size[0],p.size[2]);g.applyMatrix4(new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(...p.rotation??[0,0,0])));g.translate(...p.position);}else if(p.kind==='wheel'){g=new THREE.CylinderGeometry(p.size[0]/2,p.size[0]/2,p.size[2],12);g.rotateX(Math.PI/2);g.translate(...p.position);}else if(p.kind==='rock'){g=new THREE.IcosahedronGeometry(1,0);g.scale(...p.size);g.translate(...p.position);}else g=box(p.position,p.size,p.rotation);return g;}
export function renderStructure(plan:StructurePlan,c:StructureConfig){const resources=new StructureResources(),materials=createStructureMaterials(c,resources,plan.seed),assetGroup=new THREE.Group();assetGroup.name='StructureAsset';const attach=(g:THREE.BufferGeometry,material: keyof typeof materials,name:string,grain?:THREE.Vector3)=>{g=paintUV(g,grain);resources.geometries.add(g);const mesh=new THREE.Mesh(g,materials[material]);mesh.name=name;mesh.castShadow=material!=='water';mesh.receiveShadow=true;assetGroup.add(mesh);return mesh;};
 for(const w of plan.walls){if(w.removed)continue;attach(buildWall(w,plan.openings.filter(o=>o.wall===w.id)),w.material,w.id);
 const dx=w.end[0]-w.start[0],dz=w.end[2]-w.start[2],len=Math.hypot(dx,dz),ux=dx/len,uz=dz/len,nx=uz,nz=-ux;
 for(const o of plan.openings.filter(o=>o.wall===w.id)){const x=(w.start[0]+w.end[0])/2+ux*o.offset,z=(w.start[2]+w.end[2])/2+uz*o.offset,y=w.bottom+o.bottom;const front=w.thickness/2+.065;
 const detail=(a:number,b:number,ww:number,hh:number,depth:number,offset:number,material:keyof typeof materials,name:string)=>{const g=box([0,0,0],[ww,hh,depth]);g.rotateY(-Math.atan2(dz,dx));g.translate(x+ux*a+nx*offset,y+b,z+uz*a+nz*offset);attach(g,material,o.id+'_'+name,ww>hh?new THREE.Vector3(ux,0,uz):new THREE.Vector3(0,1,0));};
 const frameMaterial=c.type==='temple'?'stone':'wood';
 const frame=(a:number,b:number,ww:number,hh:number)=>detail(a,b,ww,hh,.16,front,frameMaterial,'frame');
 for(const side of [-1,1])frame(side*(o.width/2+.07),o.height/2,.14,o.height+.02);
 frame(0,o.height+.08,o.width+.28,.16);
 if(o.kind==='window'){
  detail(0,-.07,o.width+.38,.14,.30,front+.03,frameMaterial,'sill');
  if(!o.broken){
   detail(0,o.height/2,o.width-.025,o.height-.025,.04,-.025,'dark','recess');
   if(c.type==='temple'){
    detail(0,o.height*.36,o.width*.25,o.height*.43,.12,front-.02,'stone','relief-body');
    detail(0,o.height*.67,o.width*.22,o.width*.22,.13,front-.015,'stone','relief-head');
    detail(0,o.height*.12,o.width*.50,.09,.16,front,'stone','relief-base');
   }else{
    frame(0,o.height/2,.07,o.height-.02);frame(0,o.height/2,o.width-.02,.07);
    if(c.complexity>.3)for(const side of [-1,1])detail(side*(o.width/2+.22),o.height/2,.20,o.height,.07,front+.035,'wood','shutter');
   }
  }
 }else {
  const door=box([0,0,0],[o.width-.04,o.height-.04,.08]);if(o.broken)door.rotateZ(.14);door.rotateY(-Math.atan2(dz,dx));door.translate(x-nx*.015,y+o.height/2,z-nz*.015);attach(door,'wood',o.id+'_door');
  if(!o.broken){for(const level of [.25,.74])detail(0,o.height*level,o.width-.10,.065,.035,.045,'metal','strap');detail(o.width*.29,o.height*.48,.06,.13,.065,.07,'metal','handle');}
 }
 }
 }
 for(const roof of plan.roofs)if(!roof.removed)attach(buildRoof(roof),roof.material,roof.id);
 for(const p of [...plan.pieces,...plan.debris])if(!p.removed){if(p.kind==='tree')assetGroup.add(livingTree(p,c,plan.seed,resources,materials.wood));else {let grain:THREE.Vector3|undefined;if(p.material==='wood'){if(p.end)grain=new THREE.Vector3(...p.end).sub(new THREE.Vector3(...p.position)).normalize();else {const axis=p.size.indexOf(Math.max(...p.size));grain=new THREE.Vector3(axis===0?1:0,axis===1?1:0,axis===2?1:0);if(p.rotation)grain.applyEuler(new THREE.Euler(...p.rotation));}}attach(pieceGeometry(p),p.material,p.id,grain);}}
 // Static architecture is batched by material. Underground walls stay separate for the reversible cutaway.
 if(c.type!=='underground'){
  const batches=new Map<THREE.Material,THREE.Mesh[]>();
  for(const child of [...assetGroup.children])if(child instanceof THREE.Mesh&&!(child instanceof THREE.InstancedMesh)){const mat=child.material as THREE.Material;const list=batches.get(mat)??[];list.push(child);batches.set(mat,list);}
  for(const [mat,meshes] of batches){if(meshes.length<2)continue;const geometries=meshes.map(m=>m.geometry);geometries.forEach(g=>resources.geometries.delete(g));const geo=merge(geometries);resources.geometries.add(geo);meshes.forEach(m=>m.removeFromParent());const mesh=new THREE.Mesh(geo,mat);mesh.name='Architecture_'+Object.keys(materials).find(key=>materials[key as keyof typeof materials]===mat);mesh.castShadow=mesh.receiveShadow=true;assetGroup.add(mesh);}
 }
 assetGroup.scale.setScalar(c.scale);assetGroup.updateMatrixWorld(true);return {assetGroup,bounds:new THREE.Box3().setFromObject(assetGroup),resources,materials,update:(_time:number)=>{},dispose:resources.dispose};}
