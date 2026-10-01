import * as THREE from 'three';
import { TreeConfig } from '../types';
import type { TreeInstance } from './treeGenerator';
import { ROCK_BIOMES } from '../constants/rockBiomes';
import { mineralGeometry, orePalette, oreVertex, oreFragment, sparkleTexture } from './oreSystem';
import { resolvePixelTextureParams, pixelTextureLightDir } from './pixelArtTextureSystem';

/** Stepped silhouette with a bent middle: leaves and petals remain real 3D meshes. */
function foldedLeaf(bend = 0.12) {
  const outline = new THREE.Shape();
  const points = [[0,0],[-0.12,0.12],[-0.12,0.25],[-0.25,0.25],[-0.25,0.62],[-0.12,0.62],[-0.12,0.87],[0,1],[0.12,0.87],[0.12,0.62],[0.25,0.62],[0.25,0.25],[0.12,0.25],[0.12,0.12]];
  points.forEach(([x,y], i) => i === 0 ? outline.moveTo(x,y) : outline.lineTo(x,y)); outline.closePath();
  const geo = new THREE.ShapeGeometry(outline);
  const p = geo.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), along = p.getY(i);
    p.setXYZ(i, x, Math.sin(along * Math.PI) * bend + Math.abs(x) * bend, along);
  }
  geo.computeVertexNormals();
  return geo;
}

export function createGroundProps(config: TreeConfig): TreeInstance {
  const settings = config.prop!;
  const biome = ROCK_BIOMES[settings.biome];
  const group = new THREE.Group(); group.name = `BotW_${settings.kind}`;
  const asset = new THREE.Group(); asset.name = 'RockAsset'; group.add(asset);
  const geometries = new Set<THREE.BufferGeometry>(), materials = new Set<THREE.Material>(), textures = new Set<THREE.Texture>();
  let state = ((Math.floor(config.seed) * 71 + 1847) % 233280 + 233280) % 233280;
  const rnd = () => { state = (state * 9301 + 49297) % 233280; return state / 233280; };
  const params = resolvePixelTextureParams(config), light = pixelTextureLightDir(params);
  const density = params.barkTexelsPerMetre * 2.8;
  const size = THREE.MathUtils.clamp(settings.size, 0.15, 1.2);
  const spread = THREE.MathUtils.clamp(settings.spread, 0.1, 2.5);
  const count = THREE.MathUtils.clamp(Math.round(settings.count), 0, 16);
  const detail = THREE.MathUtils.clamp(settings.density, 0, 1);
  const painted = (color: string, vein = false) => {
    const base = new THREE.Color(color);
    const hsl = base.getHSL({ h: 0, s: 0, l: 0 }, THREE.SRGBColorSpace);
    const palette = [-0.22,-0.11,0,0.1,0.2].map(l => new THREE.Color().setHSL(hsl.h, hsl.s, THREE.MathUtils.clamp(hsl.l + l, 0, 1), THREE.SRGBColorSpace).convertLinearToSRGB());
    const mat = new THREE.ShaderMaterial({ side: THREE.DoubleSide,
      uniforms: { uColors: {value: palette}, uDensity: {value: density}, uLight: {value: light}, uVein: {value: vein ? 1 : 0} },
      vertexShader: `varying vec3 vLocal; varying vec3 vN; varying vec2 vUv; void main(){ vLocal=(modelMatrix*vec4(position,1.)).xyz; vN=normalize(mat3(modelMatrix)*normal); vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }`,
      fragmentShader: `uniform vec3 uColors[5]; uniform float uDensity; uniform vec3 uLight; uniform float uVein; varying vec3 vLocal; varying vec3 vN; varying vec2 vUv;
        void main(){ vec3 p=floor(vLocal*uDensity); float h=fract(sin(dot(p,vec3(12.7,39.1,74.3)))*43758.5453); vec3 N=normalize(vN); if(!gl_FrontFacing)N=-N; float lit=dot(N,normalize(uLight)); float tone=clamp(floor(2.+lit*1.5+(h>.87?1.:0.)-(h<.13?1.:0.)),0.,4.);
        vec2 cell=floor(vUv*16.)/16.; if(uVein>.5 && abs(cell.x)<.03 && cell.y>.12 && cell.y<.86) tone=min(4.,tone+1.); vec3 c=uColors[0]; for(int i=1;i<5;i++) if(tone>=float(i)) c=uColors[i]; gl_FragColor=vec4(c,1.); }`,
    }); materials.add(mat); return mat;
  };
  const petal = painted(settings.color), foliage = painted(biome.grass, true), dry = painted(settings.color, true), pollen = painted('#e9bd48');
  const leafGeo = foldedLeaf(0.17); geometries.add(leafGeo);
  const petalGeo = foldedLeaf(settings.flowerShape === 'bell' ? -0.4 : settings.flowerShape === 'poppy' ? 0.45 : 0.15); geometries.add(petalGeo);
  const stemGeo = new THREE.CylinderGeometry(0.014,0.022,1,5); geometries.add(stemGeo);
  const centreGeo = new THREE.IcosahedronGeometry(0.07,0); geometries.add(centreGeo);
  const mesh = (geo: THREE.BufferGeometry, mat: THREE.Material, parent: THREE.Object3D) => {
    const o = new THREE.Mesh(geo,mat); o.castShadow = o.receiveShadow = true; parent.add(o); return o;
  };
  const crystalPalette = orePalette(settings.crystal,true); textures.add(crystalPalette);
  const crystalMat = new THREE.ShaderMaterial({vertexShader:oreVertex,fragmentShader:oreFragment, uniforms: {
    uOrePalette:{value:crystalPalette},uLight:{value:light},uCrystalPaint:{value:1},uDensity:{value:density},uCopper:{value:0},uSteps:{value:6},uShine:{value:new THREE.Vector3(.95,24,.65)},
  }}); materials.add(crystalMat);
  const sparkMap = sparkleTexture(); textures.add(sparkMap);
  for (let i=0;i<count;i++) {
    const cluster = new THREE.Group(); cluster.name = `${settings.kind}_${i+1}`;
    const angle = i*2.39996+rnd()*.6, radius = i===0?0:spread*Math.sqrt(i/Math.max(1,count-1))*(.8+rnd()*.2);
    cluster.position.set(Math.cos(angle)*radius,0,Math.sin(angle)*radius); asset.add(cluster);
    if(settings.kind==='flowers') {
      const flowers=2+Math.round(detail*3);
      for(let f=0;f<flowers;f++) {
        const plant = new THREE.Group(); plant.name='Wildflower'; cluster.add(plant);
        const a=rnd()*Math.PI*2,r=rnd()*size*.45;
        plant.position.set(Math.cos(a)*r,0,Math.sin(a)*r); plant.rotation.y=rnd()*Math.PI*2;
        const height=size*(.5+rnd()*.5);
        const stem=mesh(stemGeo,foliage,plant); stem.position.y=height/2; stem.scale.set(size,height,size);
        for(let l=0;l<2;l++) {
          const leaf=mesh(leafGeo,foliage,plant); leaf.position.y=height*(.22+l*.23);
          leaf.scale.setScalar(size*.45); leaf.rotation.set(-.25,l*Math.PI+.6,0);
        }
        const head=new THREE.Group(); head.position.y=height; head.rotation.set((rnd()-.5)*.35,0,(rnd()-.5)*.3); plant.add(head);
        const petals=settings.flowerShape==='poppy'?4:settings.flowerShape==='bell'?5:settings.flowerShape==='star'?6:8;
        for(let p=0;p<petals;p++) {
          const piece=mesh(petalGeo,petal,head); piece.rotation.y=p*Math.PI*2/petals;
          piece.scale.set(size*(settings.flowerShape==='poppy'?.65:.45),size*.3,size*.32);
          if(settings.flowerShape==='bell') piece.rotation.x=.7;
        }
        const centre=mesh(centreGeo,pollen,head); centre.scale.setScalar(size); centre.position.y=.014*size;
      }
    } else if(settings.kind==='leaves') {
      const leaves=10+Math.round(detail*26);
      for(let l=0;l<leaves;l++) {
        const leaf=mesh(leafGeo,dry,cluster); leaf.name='DryLeaf';
        const a=rnd()*Math.PI*2,r=Math.sqrt(rnd())*size*.5;
        leaf.position.set(Math.cos(a)*r,.015+size*.13*(1-r/(size*.55))+rnd()*.04,Math.sin(a)*r);
        leaf.rotation.set((rnd()-.5)*.4,rnd()*Math.PI*2,(rnd()-.5)*.25);
        leaf.scale.set(size*(.6+rnd()*.5),size*.5,size*(.3+rnd()*.35));
        leaf.updateWorldMatrix(true, false);
        const low = new THREE.Box3().setFromObject(leaf).min.y;
        if (low < 0.005) leaf.position.y += 0.005 - low;
      }
    } else {
      const shards=3+Math.round(detail*5);
      for(let c=0;c<shards;c++) {
        const geo=mineralGeometry(settings.crystal,rnd); geometries.add(geo);
        const shard=mesh(geo,crystalMat,cluster); shard.name='IndependentCrystal';
        const a=c*2.39996,r=c===0?0:size*(.2+rnd()*.2);
        shard.position.set(Math.cos(a)*r,0,Math.sin(a)*r); shard.rotation.set((rnd()-.5)*.55,rnd()*Math.PI*2,(rnd()-.5)*.55);
        shard.scale.set(size*(.45+rnd()*.3),size*(c===0?1.35:.6+rnd()*.5),size*(.45+rnd()*.3));
        shard.updateMatrix();
        const box=new THREE.Box3().setFromObject(shard); shard.position.y-=box.min.y; shard.updateMatrix();
        if(c===0 && i<3) {
          const mat=new THREE.SpriteMaterial({map:sparkMap,transparent:true,depthTest:true,depthWrite:false}); materials.add(mat);
          const spark=new THREE.Sprite(mat); spark.name='CrystalPixelSparkle'; spark.userData.excludeFromOBJ=true;
          spark.scale.setScalar(.45); shard.add(spark);
          const pos=geo.attributes.position,norm=geo.attributes.normal;
          const candidates=Array.from({length:pos.count/3},(_,j)=>({point:new THREE.Vector3().fromBufferAttribute(pos,j*3).add(new THREE.Vector3().fromBufferAttribute(pos,j*3+1)).add(new THREE.Vector3().fromBufferAttribute(pos,j*3+2)).divideScalar(3), normal:new THREE.Vector3().fromBufferAttribute(norm,j*3).normalize()}));
          spark.onBeforeRender=(_r,_s,camera)=>{
            const view=camera.getWorldPosition(new THREE.Vector3()).sub(shard.getWorldPosition(new THREE.Vector3())).normalize();
            let best=-Infinity;
            for(const candidate of candidates){const score=candidate.normal.clone().transformDirection(shard.matrixWorld).dot(view);if(score>best){best=score;spark.position.copy(candidate.point).addScaledVector(candidate.normal,.06);}}
            spark.updateMatrixWorld(true); mat.opacity=Math.pow(Math.max(0,Math.sin(performance.now()*.0016+i*1.7+config.seed*.013)),4);
          };
        }
      }
    }
  }
  asset.updateMatrixWorld(true);
  const bounds=new THREE.Box3().setFromObject(asset);
  const radius=bounds.isEmpty()?1.2:Math.hypot(Math.max(Math.abs(bounds.min.x),Math.abs(bounds.max.x)),Math.max(Math.abs(bounds.min.z),Math.abs(bounds.max.z)))+.4;
  const groundGeo=new THREE.CylinderGeometry(radius,radius*1.06,.25,40); geometries.add(groundGeo);
  const groundMat=new THREE.MeshToonMaterial({color:biome.config.snow>.45?'#e4edf6':biome.ground}); materials.add(groundMat);
  const ground=mesh(groundGeo,groundMat,group); ground.position.y=-.125; ground.name='GroundMound'; ground.userData.ground=true;
  return {group,foliageMaterials:[],barkMaterial:petal,canFell:false,fell:()=>null,update:()=>{},dispose:()=>{geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());textures.forEach(t=>t.dispose());}};
}
