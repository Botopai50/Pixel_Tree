import test from 'node:test';import assert from 'node:assert/strict';import * as THREE from 'three';
import './treeCanvasFixture';
import {enableAssetEnvironment} from '../src/services/assetEnvironment';
import {createAsset} from '../src/assets/generator';import {TREE_PRESETS} from '../src/constants/presets';

test('native tree and props receives scene shadows and atmosphere without replacing palette uniforms',()=>{
 const asset=createAsset(TREE_PRESETS.hyrule_oak);let shaders=0;
 asset.group.traverse(o=>{if(!(o instanceof THREE.Mesh||o instanceof THREE.Sprite))return;for(const m of Array.isArray(o.material)?o.material:[o.material]){assert.ok(m.fog);assert.ok(o.receiveShadow);if(m instanceof THREE.ShaderMaterial){shaders++;assert.ok(m.lights&&m.uniforms.directionalShadowMatrix&&m.uniforms.fogColor);assert.ok(m.fragmentShader.includes('getShadowMask()'));assert.ok(m.vertexShader.includes('shadowmap_vertex'));assert.ok(m.userData.assetEnvironment);}}});
 assert.ok(shaders>=2);asset.update(1);asset.dispose();
});

test('custom materials follow changing scene light and retain wind uniform references',()=>{
 const time={value:0},m=new THREE.ShaderMaterial({uniforms:{uTime:time},vertexShader:'void main(){gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',fragmentShader:'void main(){gl_FragColor=vec4(1.);if(gl_FragCoord.x<1.)return;}'});
 const mesh=new THREE.Mesh(new THREE.BoxGeometry(),m);enableAssetEnvironment(mesh);const hook=mesh.onBeforeRender;enableAssetEnvironment(mesh);assert.equal(hook,mesh.onBeforeRender);assert.equal(m.uniforms.uTime,time);
 const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(),sun=new THREE.DirectionalLight('#ffffff',1.45),sky=new THREE.HemisphereLight('#ffffff','#334422',.75);scene.add(sun,sky,mesh);scene.updateMatrixWorld(true);
 const renderer={info:{render:{frame:1}}} as THREE.WebGLRenderer;
 hook.call(mesh,renderer,scene,camera,mesh.geometry,m,null!);const day=m.uniforms.uAssetSun.value.r;
 sun.intensity=.2;sky.intensity=.1;renderer.info.render.frame++;
 hook.call(mesh,renderer,scene,camera,mesh.geometry,m,null!);assert.ok(m.uniforms.uAssetSun.value.r<day/2);assert.ok(m.uniforms.uAssetAmbient.value.r<.1);
 assert.equal((m.fragmentShader.match(/getShadowMask\(\)/g)??[]).length,2);m.dispose();mesh.geometry.dispose();
});

test('unlit physical props become lit, share replacements and dispose with their generator',()=>{
 const basic=new THREE.MeshBasicMaterial({color:'#aa8855'}),a=new THREE.Mesh(new THREE.BoxGeometry(),basic),b=new THREE.Mesh(a.geometry,basic),root=new THREE.Group();root.add(a,b);enableAssetEnvironment(root);assert.ok(a.material instanceof THREE.MeshStandardMaterial);assert.equal(a.material,b.material);let disposed=false;a.material.addEventListener('dispose',()=>disposed=true);basic.dispose();assert.ok(disposed);a.geometry.dispose();
});


test('fruit sprites preserve billboard anchors while receiving shadows and fog',()=>{
 const original=new THREE.SpriteMaterial({alphaTest:.5}),sprite=new THREE.Sprite(original);sprite.center.set(.4,.1);enableAssetEnvironment(sprite);
 const material=sprite.material as unknown as THREE.ShaderMaterial;assert.ok(material instanceof THREE.ShaderMaterial);assert.ok(material.lights&&material.fog);assert.ok(material.uniforms.center.value.equals(sprite.center));assert.ok(material.vertexShader.includes('shadowmap_vertex'));assert.ok(material.fragmentShader.includes('getShadowMask()'));let disposed=false;material.addEventListener('dispose',()=>disposed=true);original.dispose();assert.ok(disposed);
});


test('cut wood shader declarations do not collide with Three lighting macros',()=>{
 const macros=new Set([...THREE.ShaderChunk.common.matchAll(/^\s*#define\s+(\w+)/gm)].map(m=>m[1]));
 const asset=createAsset(TREE_PRESETS.hollow_log);let checked=0;
 asset.group.traverse(o=>{if(!(o instanceof THREE.Mesh))return;for(const m of Array.isArray(o.material)?o.material:[o.material]){if(!(m instanceof THREE.ShaderMaterial))continue;for(const source of [m.vertexShader,m.fragmentShader])for(const declaration of source.matchAll(/\b(?:float|vec[234]|int|bool)\s+(\w+)\s*[=;]/g))assert.ok(!macros.has(declaration[1]),`shader declaration collides with ${declaration[1]}`);checked++;}});
 assert.ok(checked>=2);asset.dispose();
});
