import './treeCanvasFixture';
import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {fixture} from './structureFixtures';
import {buildStructurePlan} from '../src/structures/plan';
import {createStructure} from '../src/structures/generator';
import {validateStructurePlan} from '../src/structures/validation';
import {snowySnowMaterial} from '../src/structures/geometry/snowy';
import {buildRoof} from '../src/structures/geometry/roofs';
import {StructureResources,createStructureMaterials} from '../src/structures/materials';
import {TREE_PRESETS} from '../src/constants/presets';
import {createPixelRockMaterial} from '../src/services/rockSystem';
import {ROCK_SNOW_PAINT_GLSL,ROCK_SNOW_COVERAGE_GLSL,ROCK_SNOW_RIM_GLSL} from '../src/services/rockSnowStyle';

test('alpine cabin has a supported stone entrance, clear attic windows and a recessed chimney flue',()=>{
 for(const width of [3,7,14])for(const seed of [1,9,42]){
  const source=fixture('snowy',seed,{width}),plan=buildStructurePlan(source),volume=plan.volumes[0],roof=plan.roofs[0];
  assert.deepEqual(validateStructurePlan(plan),[]);assert.deepEqual(plan,buildStructurePlan(source));
  assert.equal(roof.kind,'gable');assert.ok(roof.rise/roof.width>.4);
  assert.equal(plan.accesses.length,1);assert.equal(plan.accesses[0].to[1],volume.bottom+.12);
  const landing=plan.pieces.find(p=>p.role==='snowy-door-landing')!;
  assert.ok(Math.abs(landing.position[2]-landing.size[2]/2-plan.accesses[0].to[2])<1e-6);
  assert.ok(Math.abs(landing.position[1]+landing.size[1]/2-plan.accesses[0].to[1])<1e-6);
  assert.equal(plan.pieces.filter(p=>p.role==='snowy-stone-plinth').length,4);
  for(const window of plan.openings.filter(o=>o.kind==='window'))assert.deepEqual(window.shutterAngles,[0,0]);
  const attic=plan.openings.find(o=>o.id==='snowy-attic-window-0')!;
  assert.ok(attic.bottom>volume.height);
  const post=plan.pieces.find(p=>p.role==='snowy-gable-post');if(post)assert.ok(post.position[1]>volume.bottom+attic.bottom+attic.height);
  const flue=plan.pieces.find(p=>p.role==='snowy-flue')!,rim=plan.pieces.find(p=>p.role==='snowy-chimney-rim')!;
  assert.ok(flue.position[1]+flue.size[1]/2<rim.position[1]+rim.size[1]/2);
 }
});

test('structural snow shares the rock pigment shader, palette, texel scale and painted light',()=>{
 const config=fixture('snowy').structure,resources=new StructureResources(),snow=snowySnowMaterial(config,42,resources);
 const native=createPixelRockMaterial(TREE_PRESETS.hebra_snowy_rock,{snow:.8});
 const compile=(material:THREE.Material)=>{
  const shader={uniforms:{} as Record<string,THREE.IUniform>,vertexShader:'#include <begin_vertex>',fragmentShader:'#include <color_fragment>'};
  material.onBeforeCompile(shader as any,null as any);return shader;
 };
 const painted=compile(snow);
 assert.equal(snow.map,null,'snow must not use the plaster texture');
 assert.ok(painted.fragmentShader.includes(ROCK_SNOW_PAINT_GLSL));assert.ok(native.material.fragmentShader.includes(ROCK_SNOW_PAINT_GLSL));
 assert.ok(native.material.fragmentShader.includes(ROCK_SNOW_RIM_GLSL));
 assert.ok(native.material.fragmentShader.includes('color = rockSnowSurface(color,surfaceP'));
 assert.equal(painted.uniforms.uSnowDensity.value,native.material.uniforms.uTexelsPerMetre.value);
 assert.deepEqual(painted.uniforms.uSnowLightDir.value.toArray(),native.material.uniforms.uTexLightDir.value.toArray());
 for(let i=0;i<4;i++){
  const c=painted.uniforms.uSnowColors.value[i] as THREE.Vector3,actual=new THREE.Color(c.x,c.y,c.z).convertLinearToSRGB(),expected=native.material.uniforms.uSnowColors.value[i] as THREE.Vector3;
  assert.ok(Math.abs(actual.r-expected.x)<1e-6&&Math.abs(actual.g-expected.y)<1e-6&&Math.abs(actual.b-expected.z)<1e-6);
 }
 const structural=createStructureMaterials(config,resources,42);
 for(const material of [structural.wood,structural.stone])assert.ok(compile(material).fragmentShader.includes(ROCK_SNOW_PAINT_GLSL));
 resources.dispose();native.material.dispose();native.palette.dispose();
});

test('roof snow is painted on unchanged tiles and respects the snowfall control',()=>{
 const source=fixture('snowy',42,{vegetation:0}),plan=buildStructurePlan(source);
 const drySource=fixture('snowy',42,{vegetation:0,snow:0}),dry=buildStructurePlan(drySource);
 assert.ok(!plan.pieces.some(p=>p.role==='snowy-roof-snow'));
 assert.ok(!dry.pieces.some(p=>p.role==='snowy-roof-snow'||p.role==='snowy-icicle'));
 const geometry=buildRoof(plan.roofs[0]),dryGeometry=buildRoof(dry.roofs[0]);
 assert.deepEqual(geometry.attributes.position.array,dryGeometry.attributes.position.array);
 geometry.dispose();dryGeometry.dispose();
 const shaderResources=new StructureResources();
 for(const config of [source.structure,drySource.structure]){
  const roof=createStructureMaterials(config,shaderResources,42).roof;
  const shader={uniforms:{} as Record<string,THREE.IUniform>,vertexShader:'#include <begin_vertex>',fragmentShader:'#include <color_fragment>'};
  roof.onBeforeCompile(shader as any,null as any);
  assert.equal(shader.uniforms.uStructureSnow.value,config.snow);
  assert.ok(shader.fragmentShader.includes(ROCK_SNOW_COVERAGE_GLSL));
  assert.ok(shader.fragmentShader.includes(ROCK_SNOW_RIM_GLSL));
  assert.ok(shader.fragmentShader.includes('diffuseColor.rgb=rockSnowSurface(diffuseColor.rgb,'));
  assert.ok(shader.fragmentShader.includes('uSnowLightDir,uStructureSnow,1.)'));
 }
 shaderResources.dispose();
 const asset=createStructure(source),resources=new Map<any,number>();
 asset.group.traverse(o=>{if(!(o instanceof THREE.Mesh))return;
  for(const attribute of ['position','normal','uv'])assert.ok(Array.from(o.geometry.getAttribute(attribute).array).every(Number.isFinite));
  for(const resource of [o.geometry,...(Array.isArray(o.material)?o.material:[o.material])])if(!resources.has(resource))resources.set(resource,0);
 });
 for(const resource of resources.keys())resource.addEventListener('dispose',()=>resources.set(resource,resources.get(resource)!+1));
 asset.dispose();asset.dispose();assert.ok([...resources.values()].every(count=>count===1));
});
