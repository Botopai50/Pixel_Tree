import test from 'node:test';import assert from 'node:assert/strict';
import * as THREE from 'three';
import {campCanvasTexture,campCutWoodMaterial,campHearthTexture,buildCampPiece} from '../src/structures/geometry/camp';
import {fixture} from './structureFixtures';
import {buildStructurePlan} from '../src/structures/plan';
import {renderStructure} from '../src/structures/renderer';
import {normalizeStructureConfig} from '../src/structures/config';
test('camp textures share the configured world pixel density',()=>{
 for(const density of [8,20,40]){
  const wood=campCutWoodMaterial(density,42),canvas=campCanvasTexture(density,42);
  assert.ok(Math.abs(canvas.image.width*canvas.repeat.x-density)<1);
  assert.ok(Math.abs(canvas.image.height*canvas.repeat.y-density)<1);
  assert.equal(wood.end.uniforms.uTexelsPerMetre.value,density);
  assert.equal(wood.bark.uniforms.uTexelsPerMetre.value,density);
  wood.bark.dispose();wood.end.dispose();wood.textures.forEach(t=>t.dispose());canvas.dispose();
 }
});

test('hearth dirt uses world-sized pixels and an irregular cutout on a flat surface',()=>{
 const p=buildStructurePlan(fixture('camp')).pieces.find(p=>p.role==='camp-hearth-ground')!;
 for(const density of [8,20,40]){
  const map=campHearthTexture(p.size[0],p.size[2],density,42);
  assert.ok(Math.abs(map.image.width/p.size[0]-density)<.5);
  assert.ok(Math.abs(map.image.height/p.size[2]-density)<.5);
  const alpha=Array.from(map.image.data).filter((_,i)=>i%4===3);
  assert.ok(alpha.includes(0)&&alpha.includes(255));
  assert.equal(map.magFilter,THREE.NearestFilter);map.dispose();
 }
 const geometry=buildCampPiece(p)!;
 assert.ok(geometry.userData.preservePaintUV);
 const positions=geometry.getAttribute('position');
 for(let i=0;i<positions.count;i++)assert.ok(Math.abs(positions.getY(i)-p.position[1]-p.size[1]/2)<1e-6);
 geometry.dispose();
});

test('camp bark retains branch metrics and cut faces retain their owned grain shader',()=>{
 const source=fixture('camp',9753),asset=renderStructure(buildStructurePlan(source),normalizeStructureConfig(source.structure));
 let barkFound=false,endFound=false;
 asset.assetGroup.traverse(object=>{
  if(!(object instanceof THREE.Mesh))return;
  const material=object.material,geometry=object.geometry;
  if(!(material instanceof THREE.ShaderMaterial))return;
  assert.equal(material.fog,true);
  assert.ok(material.uniforms.fogColor&&material.uniforms.fogDensity);
  assert.match(material.vertexShader,/fog_pars_vertex/);
  assert.match(material.vertexShader,/vFogDepth = -/);
  assert.match(material.fragmentShader,/fog_fragment/);
  if(material.uniforms.uLobedMode){
   barkFound=true;
   for(const name of ['aWood','aBarkAngle']){
    assert.equal(geometry.getAttribute(name).count,geometry.getAttribute('position').count);
    assert.ok(Array.from(geometry.getAttribute(name).array).every(Number.isFinite));
   }
  }
  if(material.uniforms.uRingsPerMetre){endFound=true;assert.ok(geometry.getAttribute('aGrainR'));}
  assert.ok(asset.resources.materials.has(material));
  for(const uniform of Object.values(material.uniforms))if(uniform.value instanceof THREE.Texture)assert.ok(asset.resources.textures.has(uniform.value));
 });
 assert.ok(barkFound&&endFound);asset.dispose();
});

test('every stacked and fallen log has cut wood on both ends',()=>{
 for(const seed of [1,42,9753]){
  const plan=buildStructurePlan(fixture('camp',seed));
  for(const log of plan.pieces.filter(p=>['camp-firewood','camp-fallen-log','camp-burning-log'].includes(p.role))){
   const ends=plan.pieces.filter(p=>p.support===log.id&&['camp-firewood-end','camp-log-end','camp-burning-log-end'].includes(p.role));
   assert.equal(ends.length,2);
   const axis=new THREE.Vector3(0,1,0).applyEuler(new THREE.Euler(...log.rotation!));
   const offsets=ends.map(p=>new THREE.Vector3(...p.position).sub(new THREE.Vector3(...log.position)).dot(axis));
   assert.ok(offsets.some(offset=>offset<0));assert.ok(offsets.some(offset=>offset>0));
  }
 }
});
