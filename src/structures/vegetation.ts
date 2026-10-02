import {TREE_PRESETS} from '../constants/presets';
import {createWildflowerKit} from '../services/wildflowerSystem';
import * as THREE from 'three';
import type {StructurePlan,StructureConfig} from './types';
import {structureStreams} from './random';
import {natureAsset} from './natureAdapters';

export function blockedByArchitecture(p:StructurePlan,x:number,z:number,padding=.8) {
 if(p.volumes.some(v=>Math.abs(x-v.x)<v.width/2+padding&&Math.abs(z-v.z)<v.depth/2+padding))return true;
 if(p.pieces.some(piece=>!piece.removed&&piece.kind!=='tree'&&Math.abs(x-piece.position[0])<piece.size[0]/2+padding&&Math.abs(z-piece.position[2])<piece.size[2]/2+padding))return true;
 return p.accesses.some(access=>{const a=new THREE.Vector2(access.from[0],access.from[2]),b=new THREE.Vector2(access.to[0],access.to[2]),at=new THREE.Vector2(x,z),delta=b.clone().sub(a);const t=THREE.MathUtils.clamp(at.clone().sub(a).dot(delta)/Math.max(.001,delta.lengthSq()),0,1);return at.distanceTo(a.addScaledVector(delta,t))<access.width/2+padding;});
}
export function buildStructureNature(p:StructurePlan,c:StructureConfig) {
 const group=new THREE.Group();group.name='StructureVegetation';const attachments:ReturnType<typeof natureAsset>[]=[];
 if(c.vegetation>0) {
  const rnd=structureStreams(p.seed).streamFor('vegetation','placement');
  const bounds=new THREE.Box3();p.volumes.forEach(v=>{bounds.expandByPoint(new THREE.Vector3(v.x-v.width/2,0,v.z-v.depth/2));bounds.expandByPoint(new THREE.Vector3(v.x+v.width/2,0,v.z+v.depth/2));});
  if(bounds.isEmpty())bounds.set(new THREE.Vector3(-c.width/2,0,-c.depth/2),new THREE.Vector3(c.width/2,0,c.depth/2));
  const count=Math.round(c.vegetation*10),zones=p.propZones.filter(z=>z.kind==='garden'||z.kind==='cultivation');
  for(let i=0;i<count;i++)for(let trial=0;trial<20;trial++) {
   const zone=zones[i%Math.max(1,zones.length)];let x:number,z:number;
   if(zone&&trial<8){x=zone.x+(rnd()-.5)*zone.width;z=zone.z+(rnd()-.5)*zone.depth;}else {x=bounds.min.x-2+rnd()*(bounds.max.x-bounds.min.x+4);z=bounds.min.z-2+rnd()*(bounds.max.z-bounds.min.z+4);}
   if(blockedByArchitecture(p,x,z,.8))continue;
   if(attachments.some(o=>Math.hypot(o.group.position.x-x,o.group.position.z-z)<1.1))continue;
   const kind=i%4===0?'rock':c.ruin>.15&&i%3===0?'leaves':'flowers',asset=natureAsset(kind,c,p.seed+i*71);asset.group.position.set(x,0,z);asset.group.name='StructureNature_'+kind;attachments.push(asset);group.add(asset.group);break;
  }
 }
 if(c.vegetation>.15&&c.ruin>.1){
  const source=Object.values(TREE_PRESETS).find(p=>p.prop?.kind==='flowers'&&p.prop.biome===c.biome)!;
  const kit=createWildflowerKit({...source,seed:p.seed},new THREE.Vector3(-.4,1,.3));
  const leaves:THREE.Matrix4[]=[],stems:THREE.Matrix4[]=[],dummy=new THREE.Object3D(),up=new THREE.Vector3(0,1,0),rnd=structureStreams(p.seed).streamFor('vegetation','ivy');
  for(const wall of p.walls.filter(w=>!w.removed).slice(0,8)){
   const dx=wall.end[0]-wall.start[0],dz=wall.end[2]-wall.start[2],length=Math.hypot(dx,dz),ux=dx/length,uz=dz/length,nx=uz,nz=-ux;
   const offset=(rnd()>.5?1:-1)*length*.34,reach=Math.min(wall.height*.75,2.8)*c.vegetation,segments=Math.max(2,Math.ceil(reach/.28));let previous:THREE.Vector3|null=null;
   for(let i=0;i<=segments;i++){const y=wall.bottom+i*reach/segments,o=offset+Math.sin(i*.65)*.12;
    if(p.openings.some(opening=>opening.wall===wall.id&&Math.abs(o-opening.offset)<opening.width/2+.3&&y-wall.bottom>opening.bottom-.3&&y-wall.bottom<opening.bottom+opening.height+.3)){previous=null;continue;}
    const at=new THREE.Vector3((wall.start[0]+wall.end[0])/2+ux*o+nx*(wall.thickness/2+.06),y,(wall.start[2]+wall.end[2])/2+uz*o+nz*(wall.thickness/2+.06));
    if(previous){const delta=at.clone().sub(previous);dummy.position.copy(at).add(previous).multiplyScalar(.5);dummy.quaternion.setFromUnitVectors(up,delta.clone().normalize());dummy.scale.set(.7,delta.length(),.7);dummy.updateMatrix();stems.push(dummy.matrix.clone());}
    dummy.position.copy(at);dummy.rotation.set(Math.PI/2,-Math.atan2(dz,dx)+(i%2?-.5:.5),0);dummy.scale.setScalar(.25+rnd()*.12);dummy.updateMatrix();leaves.push(dummy.matrix.clone());previous=at;
   }
  }
  const ivy=new THREE.Group();ivy.name='ClimbingIvy';ivy.userData.wallVegetation=true;
  for(const [geometry,matrices] of [[kit.geometries[0],leaves],[kit.geometries[2],stems]] as const){if(!matrices.length)continue;const mesh=new THREE.InstancedMesh(geometry,kit.materials[1],matrices.length);matrices.forEach((m,i)=>mesh.setMatrixAt(i,m));mesh.castShadow=mesh.receiveShadow=true;ivy.add(mesh);}
  if(ivy.children.length)group.add(ivy);
  attachments.push({group:new THREE.Group(),update:()=>{},dispose:()=>{ivy.children.forEach(o=>{if(o instanceof THREE.InstancedMesh)o.dispose();});kit.geometries.forEach(g=>g.dispose());kit.materials.forEach(m=>m.dispose());kit.textures.forEach(t=>t.dispose());}});
 }
 let disposed=false;return {group,update:(time:number)=>attachments.forEach(a=>a.update(time)),dispose:()=>{if(disposed)return;disposed=true;attachments.forEach(a=>a.dispose());}};
}
