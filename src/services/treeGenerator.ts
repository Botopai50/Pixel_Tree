import * as THREE from 'three';
import { TreeConfig } from '../types';
import { runSpaceColonization, buildFullTreeGeometry, SCANode } from './spaceColonization';
import { buildProceduralFoliage, CrownBounds } from './foliageSystem';
import { buildProceduralPalm } from './palmGenerator';
import { buildProceduralConifer, varyConiferConfig } from './coniferGenerator';
import { buildProceduralCactus } from './cactusGenerator';
import { buildSwampRootsAndAccessories } from './swampGenerator';
import { buildStylizedMangroveCanopy } from './stylizedRosetteCanopy';
import { buildProceduralSapling } from './saplingGenerator';
import { buildProceduralDeadwood } from './deadwoodGenerator';
import { createPixelBarkMaterial } from './pixelArtTextureSystem';
import { buildHangingFruit } from './fruitSystem';

export interface TreeInstance {
  group: THREE.Group;
  foliageMaterials: THREE.ShaderMaterial[];
  barkMaterial: THREE.ShaderMaterial;
  pinwheelBlades: THREE.Mesh | null;
  update: (time: number) => void;
  dispose: () => void;
}

// The ground, grass and stones a biome's bush stands on: the same as that
// biome's tree.
const SHRUB_BIOME: Record<string, string> = {
  satori_shrub: 'satori_sakura',
  akkala_shrub: 'akkala_birch',
  hebra_shrub: 'hebra_pine',
  hebra_shrub_snowy: 'hebra_pine',
  faron_shrub: 'faron_palm',
  korok_shrub: 'korok_ancient',
  swamp_shrub: 'swamp_mangrove',
  savanna_shrub: 'savanna_acacia',
  withered_shrub: 'dry_withered',
};

/**
 * Creates a 100% procedural Zelda: Breath of the Wild style tree.
 * When useSpaceColonization is true (default), both the trunk and canopy are
 * grown entirely through the 3D Space Colonization Algorithm with Leonardo Da Vinci's
 * area-conserving pipe model, flared buttress roots, and Ghibli/BotW NPR cel-shading.
 */
export function createTree(config: TreeConfig): TreeInstance {
  const group = new THREE.Group();
  group.name = 'BotW_ProceduralTree';

  const geometriesToDispose: THREE.BufferGeometry[] = [];
  const materialsToDispose: THREE.Material[] = [];
  const foliageMaterials: THREE.ShaderMaterial[] = [];
  let foliageUpdater: ((time: number) => void) | null = null;

  // Seeded PRNG
  let seed = config.seed;
  const rnd = () => {
    seed = (seed * 9301 + 49297) % 233280;
    return seed / 233280;
  };

  // -------------------------------------------------------------
  // 1. LIGHTING & SHADER UNIFORMS (BOTW CEL-SHADING & RIM LIGHT)
  // -------------------------------------------------------------
  const sharedUniforms = {
    uTime: { value: 0 },
    uWindStrength: { value: config.windStrength },
    uWindSpeed: { value: config.windSpeed },
    uLightDir: { value: new THREE.Vector3(0.5, 0.8, 0.4).normalize() },
  };

  // -------------------------------------------------------------
  // SAPLINGS & SPROUTS (MUDAS / BROTOS DELICADOS & AUTÊNTICOS)
  // Mudas são compactas, simples, sem redes volumosas de galhos adultos
  // -------------------------------------------------------------
  if (config.growthStage === 'sapling' || config.species.endsWith('_sapling')) {
    const saplingResult = buildProceduralSapling(config, sharedUniforms);
    group.add(saplingResult.group);

    return {
      group,
      foliageMaterials: [],
      barkMaterial: new THREE.ShaderMaterial(),
      pinwheelBlades: saplingResult.pinwheelBlades,
      update: (time: number) => {
        saplingResult.update(time);
      },
      dispose: () => {
        saplingResult.geometriesToDispose.forEach((g) => g.dispose());
        saplingResult.materialsToDispose.forEach((m) => {
          if (Array.isArray(m)) m.forEach((mat) => mat.dispose());
          else m.dispose();
        });
      },
    };
  }

  // -------------------------------------------------------------
  // 2. BARK MATERIAL (NPR CEL-SHADED BARK)
  // -------------------------------------------------------------
  const barkColor = new THREE.Color(config.barkColor);
  const barkDark = barkColor.clone().multiplyScalar(0.45);
  const mossColor = new THREE.Color(0x52793b);

  // Default path: procedural pixel art bark, shared by every wood mesh in the
  // tree (trunk, branches, buttress roots, stilt roots, deadwood, palm trunk),
  // so the transition between them stays coherent by construction.
  // Legacy path (pixelTextureEnabled: false): the original cel-shaded bark.
  const usePixelTextures = config.pixelTextureEnabled !== false;

  const barkMaterial = usePixelTextures
    ? createPixelBarkMaterial(config, sharedUniforms)
    : new THREE.ShaderMaterial({
    uniforms: {
      ...sharedUniforms,
      uBarkColor: { value: barkColor },
      uBarkDark: { value: barkDark },
      uMossColor: { value: mossColor },
      uMossAmount: { value: config.mossAmount },
      uRoughness: { value: config.barkRoughness },
      uTreeHeight: { value: config.trunkHeight },
      uRimIntensity: { value: config.rimLightIntensity },
    },
    vertexShader: `
      uniform float uTime;
      uniform float uWindStrength;
      uniform float uWindSpeed;
      varying vec3 vNormal;
      varying vec3 vWorldPos;
      varying vec2 vUv;

      void main() {
        vUv = uv;
        vNormal = normalize((modelMatrix * vec4(normal, 0.0)).xyz);
        vec3 pos = position;

        // Subtle trunk sway in strong wind, increasing with height
        float heightFactor = clamp(pos.y / 12.0, 0.0, 1.0);
        float trunkSway = sin(uTime * uWindSpeed * 1.2 + pos.y * 0.15) * 0.08 * uWindStrength * heightFactor;
        pos.x += trunkSway;
        pos.z += cos(uTime * uWindSpeed * 0.9 + pos.y * 0.15) * 0.05 * uWindStrength * heightFactor;

        vec4 worldPos = modelMatrix * vec4(pos, 1.0);
        vWorldPos = worldPos.xyz;
        gl_Position = projectionMatrix * viewMatrix * worldPos;
      }
    `,
    fragmentShader: `
      uniform vec3 uLightDir;
      uniform vec3 uBarkColor;
      uniform vec3 uBarkDark;
      uniform vec3 uMossColor;
      uniform float uMossAmount;
      uniform float uRimIntensity;
      varying vec3 vNormal;
      varying vec3 vWorldPos;
      varying vec2 vUv;

      void main() {
        vec3 N = normalize(vNormal);
        vec3 L = normalize(uLightDir);
        float NdotL = dot(N, L);

        // Cel Shading step bands (BotW aesthetic)
        float lightStep;
        if (NdotL > 0.25) {
          lightStep = 1.0;
        } else if (NdotL > -0.15) {
          lightStep = 0.65;
        } else {
          lightStep = 0.38;
        }

        // Procedural bark ring and grain texture
        float barkGrain = sin(vUv.y * 70.0) * 0.08 + sin(vUv.x * 24.0) * 0.05;
        vec3 baseBark = mix(uBarkDark, uBarkColor, clamp(lightStep + barkGrain, 0.0, 1.0));

        // BotW Base Moss gradient (heavier at roots and damp north-facing side)
        float heightFactor = clamp(1.0 - (vWorldPos.y / 4.0), 0.0, 1.0);
        float northFacing = clamp(dot(N, vec3(0.0, 0.2, -0.9)), 0.0, 1.0);
        float mossFactor = heightFactor * (0.6 + northFacing * 0.4) * uMossAmount;
        vec3 colorWithMoss = mix(baseBark, uMossColor, clamp(mossFactor, 0.0, 0.85));

        // Subtle Rim Lighting (Fresnel glow)
        vec3 V = normalize(cameraPosition - vWorldPos);
        float rim = 1.0 - max(dot(V, N), 0.0);
        rim = pow(rim, 3.0) * uRimIntensity * 0.35;
        vec3 finalColor = colorWithMoss + vec3(0.9, 0.85, 0.7) * rim;

        gl_FragColor = vec4(finalColor, 1.0);
      }
    `,
  });
  materialsToDispose.push(barkMaterial);

  // -------------------------------------------------------------
  // 3. FOLIAGE MATERIAL (BOTW NPR ANIME SHADER)
  // -------------------------------------------------------------
  const foliageColorTop = new THREE.Color(config.foliageColorTop);
  const foliageColorBottom = new THREE.Color(config.foliageColorBottom);

  const foliageMaterial = new THREE.ShaderMaterial({
    uniforms: {
      ...sharedUniforms,
      uColorTop: { value: foliageColorTop },
      uColorBottom: { value: foliageColorBottom },
      uTreeHeight: { value: config.trunkHeight },
      uRimIntensity: { value: config.rimLightIntensity },
      uCelSteps: { value: config.celSteps },
    },
    vertexShader: `
      uniform float uTime;
      uniform float uWindStrength;
      uniform float uWindSpeed;
      varying vec3 vNormal;
      varying vec3 vWorldPos;
      varying vec3 vLocalPos;

      void main() {
        vNormal = normalize((modelMatrix * vec4(normal, 0.0)).xyz);
        vLocalPos = position;

        vec3 pos = position;

        // BotW Wind flutter on leaf puffs
        float windWave = sin(uTime * uWindSpeed * 2.8 + pos.x * 1.5 + pos.y * 2.0) 
                       * cos(uTime * uWindSpeed * 1.7 + pos.z * 1.2);
        vec3 windOffset = normal * windWave * 0.12 * uWindStrength;
        
        // General tree sway
        float heightFactor = clamp(pos.y / 10.0, 0.0, 1.0);
        pos.x += sin(uTime * uWindSpeed * 1.5) * 0.2 * uWindStrength * heightFactor;
        pos.z += cos(uTime * uWindSpeed * 1.2) * 0.1 * uWindStrength * heightFactor;
        pos += windOffset;

        vec4 worldPos = modelMatrix * vec4(pos, 1.0);
        vWorldPos = worldPos.xyz;
        gl_Position = projectionMatrix * viewMatrix * worldPos;
      }
    `,
    fragmentShader: `
      uniform vec3 uLightDir;
      uniform vec3 uColorTop;
      uniform vec3 uColorBottom;
      uniform float uTreeHeight;
      uniform float uRimIntensity;
      uniform float uCelSteps;
      varying vec3 vNormal;
      varying vec3 vWorldPos;
      varying vec3 vLocalPos;

      void main() {
        vec3 N = normalize(vNormal);
        vec3 L = normalize(uLightDir);
        float NdotL = dot(N, L);

        // Discrete stepped cel-shading (BotW / Ghibli NPR tone curve)
        float stepVal;
        if (uCelSteps > 3.5) {
          // 4 steps
          if (NdotL > 0.5) stepVal = 1.0;
          else if (NdotL > 0.15) stepVal = 0.75;
          else if (NdotL > -0.2) stepVal = 0.5;
          else stepVal = 0.3;
        } else if (uCelSteps > 2.5) {
          // 3 steps
          if (NdotL > 0.35) stepVal = 1.0;
          else if (NdotL > -0.15) stepVal = 0.65;
          else stepVal = 0.35;
        } else {
          // 2 steps
          if (NdotL > 0.1) stepVal = 1.0;
          else stepVal = 0.45;
        }

        // Vertical gradient: Sunlit canopy top vs deeper underbrush
        float heightGrad = clamp((vWorldPos.y - (uTreeHeight * 0.45)) / (uTreeHeight * 0.65), 0.0, 1.0);
        vec3 leafColor = mix(uColorBottom, uColorTop, heightGrad);

        // Internal clump curvature highlight
        float internalShade = clamp(vLocalPos.y * 0.25 + 0.5, 0.15, 1.0);
        leafColor *= (0.85 + internalShade * 0.2);

        // BotW Stylized painterly leaf clump dapple texture (micro-detail of leaves)
        float dapple1 = sin(vWorldPos.x * 5.0) * cos(vWorldPos.y * 5.0) * sin(vWorldPos.z * 5.0);
        float dapple2 = sin(vWorldPos.x * 12.0 + vWorldPos.z * 8.0) * 0.5;
        float leafDapple = (dapple1 * 0.7 + dapple2 * 0.3) * 0.08;
        leafColor += leafDapple;

        // Apply Cel Shading
        vec3 finalColor = leafColor * (stepVal * 0.85 + 0.2);

        // BotW Sky/Atmosphere Rim Lighting (Fresnel)
        vec3 V = normalize(cameraPosition - vWorldPos);
        float rim = 1.0 - max(dot(V, N), 0.0);
        rim = pow(rim, 2.5) * uRimIntensity;
        
        // Soft golden/cyan sunlit rim glow
        vec3 rimColor = mix(vec3(1.0, 0.96, 0.75), vec3(0.75, 0.95, 1.0), heightGrad);
        finalColor += rimColor * rim * 0.65;

        gl_FragColor = vec4(finalColor, 1.0);
      }
    `,
  });
  foliageMaterials.push(foliageMaterial);
  materialsToDispose.push(foliageMaterial);

  // -------------------------------------------------------------
  // 4. GENERATE FULL STRUCTURE (TRUNK, BRANCHES & FOLIAGE)
  // -------------------------------------------------------------
  const branchTips: { position: THREE.Vector3; normal: THREE.Vector3; scale: number }[] = [];
  let scaData: ReturnType<typeof runSpaceColonization> | null = null;
  // the broadleaf foliage, for the fruit to be set on (see buildHangingFruit)
  let fruitFoliage: THREE.Object3D | undefined;

  const isPalm = config.species.startsWith('faron_palm') || config.foliageType === 'palm_frond';
  const isPine = config.species.startsWith('hebra_pine') || config.foliageType === 'pine_cone';
  const isCactus = config.species.startsWith('gerudo_cactus') || config.foliageType === 'cactus_bloom';
  const isSwamp = config.species.startsWith('swamp_mangrove') || config.foliageType === 'swamp_weeping' || config.barkStyle === 'swamp';
  // (a bare bush grows like any other bush, just without leaves)
  const isDeadwood = config.growthStage !== 'shrub' &&
    (config.species.startsWith('dry_withered') || config.foliageType === 'none' || config.barkStyle === 'deadwood');

  if (isPalm) {
    if (config.useSpaceColonization) {
      scaData = runSpaceColonization(config);
    }
    const palmResult = buildProceduralPalm(config, barkMaterial, sharedUniforms, rnd, scaData);
    group.add(palmResult.woodMesh);
    group.add(palmResult.foliageGroup);
    palmResult.materialsToDispose.forEach((m) => {
      if (Array.isArray(m)) m.forEach((mat) => materialsToDispose.push(mat));
      else materialsToDispose.push(m);
    });
    geometriesToDispose.push(...palmResult.geometriesToDispose);
    branchTips.push(...palmResult.branchTips);
    foliageUpdater = (time: number) => palmResult.update(time, config.windStrength, config.windSpeed);

    // 3D Visualizer for Space Colonization Attraction Points (Golden Orbs) when enabled for palm
    if (scaData && config.showAttractors && scaData.attractorPositions.length > 0) {
      const attractorGeo = new THREE.BufferGeometry();
      const posArray = new Float32Array(scaData.attractorPositions.length * 3);
      for (let i = 0; i < scaData.attractorPositions.length; i++) {
        const p = scaData.attractorPositions[i];
        posArray[i * 3] = p.x;
        posArray[i * 3 + 1] = p.y;
        posArray[i * 3 + 2] = p.z;
      }
      attractorGeo.setAttribute('position', new THREE.BufferAttribute(posArray, 3));
      const attractorMat = new THREE.PointsMaterial({
        color: 0xffd54f,
        size: 0.24,
        transparent: true,
        opacity: 0.88,
        blending: THREE.AdditiveBlending,
      });
      const attractorPointsMesh = new THREE.Points(attractorGeo, attractorMat);
      attractorPointsMesh.name = 'SCA_AttractorPoints';
      group.add(attractorPointsMesh);
      geometriesToDispose.push(attractorGeo);
      materialsToDispose.push(attractorMat);
    }
  } else if (isPine) {
    // each seed gets its own height, spread, tier count and (sometimes) lean
    const pineConfig = varyConiferConfig(config);
    if (config.useSpaceColonization) {
      scaData = runSpaceColonization(pineConfig);
    }

    const coniferResult = buildProceduralConifer(
      pineConfig,
      barkMaterial,
      sharedUniforms,
      rnd,
      scaData
    );

    group.add(coniferResult.woodMesh);
    group.add(coniferResult.foliageGroup);
    coniferResult.materialsToDispose.forEach((material) => {
      if (Array.isArray(material)) {
        material.forEach((entry) => materialsToDispose.push(entry));
      } else {
        materialsToDispose.push(material);
      }
    });
    coniferResult.geometriesToDispose.forEach((geometry) => geometriesToDispose.push(geometry));
    coniferResult.branchTips.forEach((tip) => branchTips.push(tip));
    foliageUpdater = (time: number) =>
      coniferResult.update(time, config.windStrength, config.windSpeed);

    if (scaData && config.showAttractors && scaData.attractorPositions.length > 0) {
      const attractorGeo = new THREE.BufferGeometry();
      const posArray = new Float32Array(scaData.attractorPositions.length * 3);
      for (let i = 0; i < scaData.attractorPositions.length; i++) {
        const p = scaData.attractorPositions[i];
        posArray[i * 3] = p.x;
        posArray[i * 3 + 1] = p.y;
        posArray[i * 3 + 2] = p.z;
      }
      attractorGeo.setAttribute('position', new THREE.BufferAttribute(posArray, 3));
      const attractorMat = new THREE.PointsMaterial({
        color: 0xffd54f,
        size: 0.24,
        transparent: true,
        opacity: 0.88,
        blending: THREE.AdditiveBlending,
      });
      const attractorPointsMesh = new THREE.Points(attractorGeo, attractorMat);
      attractorPointsMesh.name = 'SCA_AttractorPoints';
      group.add(attractorPointsMesh);
      geometriesToDispose.push(attractorGeo);
      materialsToDispose.push(attractorMat);
    }
  } else if (isCactus) {
    if (config.useSpaceColonization) {
      scaData = runSpaceColonization(config);
    }

    const cactusResult = buildProceduralCactus(
      config,
      barkMaterial,
      sharedUniforms,
      rnd,
      scaData
    );

    group.add(cactusResult.woodMesh);
    group.add(cactusResult.foliageGroup);
    cactusResult.materialsToDispose.forEach((material) => {
      if (Array.isArray(material)) {
        material.forEach((entry) => materialsToDispose.push(entry));
      } else {
        materialsToDispose.push(material);
      }
    });
    cactusResult.geometriesToDispose.forEach((geometry) => geometriesToDispose.push(geometry));
    cactusResult.branchTips.forEach((tip) => branchTips.push(tip));
    foliageUpdater = (time: number) =>
      cactusResult.update(time, config.windStrength, config.windSpeed);

    if (scaData && config.showAttractors && scaData.attractorPositions.length > 0) {
      const attractorGeo = new THREE.BufferGeometry();
      const posArray = new Float32Array(scaData.attractorPositions.length * 3);
      for (let i = 0; i < scaData.attractorPositions.length; i++) {
        const p = scaData.attractorPositions[i];
        posArray[i * 3] = p.x;
        posArray[i * 3 + 1] = p.y;
        posArray[i * 3 + 2] = p.z;
      }
      attractorGeo.setAttribute('position', new THREE.BufferAttribute(posArray, 3));
      const attractorMat = new THREE.PointsMaterial({
        color: 0xffd54f,
        size: 0.24,
        transparent: true,
        opacity: 0.88,
        blending: THREE.AdditiveBlending,
      });
      const attractorPointsMesh = new THREE.Points(attractorGeo, attractorMat);
      attractorPointsMesh.name = 'SCA_AttractorPoints';
      group.add(attractorPointsMesh);
      geometriesToDispose.push(attractorGeo);
      materialsToDispose.push(attractorMat);
    }
  } else if (isDeadwood) {
    if (config.useSpaceColonization) {
      scaData = runSpaceColonization(config);
    }

    const deadwoodResult = buildProceduralDeadwood(
      config,
      barkMaterial,
      sharedUniforms,
      rnd,
      scaData
    );

    group.add(deadwoodResult.woodMesh);
    group.add(deadwoodResult.foliageGroup);
    deadwoodResult.materialsToDispose.forEach((material) => {
      if (Array.isArray(material)) {
        material.forEach((entry) => materialsToDispose.push(entry));
      } else {
        materialsToDispose.push(material);
      }
    });
    deadwoodResult.geometriesToDispose.forEach((geometry) => geometriesToDispose.push(geometry));
    deadwoodResult.branchTips.forEach((tip) => branchTips.push(tip));
    foliageUpdater = (time: number) =>
      deadwoodResult.update(time, config.windStrength, config.windSpeed);

    if (scaData && config.showAttractors && scaData.attractorPositions.length > 0) {
      const attractorGeo = new THREE.BufferGeometry();
      const posArray = new Float32Array(scaData.attractorPositions.length * 3);
      for (let i = 0; i < scaData.attractorPositions.length; i++) {
        const p = scaData.attractorPositions[i];
        posArray[i * 3] = p.x;
        posArray[i * 3 + 1] = p.y;
        posArray[i * 3 + 2] = p.z;
      }
      attractorGeo.setAttribute('position', new THREE.BufferAttribute(posArray, 3));
      const attractorMat = new THREE.PointsMaterial({
        color: 0xffd54f,
        size: 0.24,
        transparent: true,
        opacity: 0.88,
        blending: THREE.AdditiveBlending,
      });
      const attractorPointsMesh = new THREE.Points(attractorGeo, attractorMat);
      attractorPointsMesh.name = 'SCA_AttractorPoints';
      group.add(attractorPointsMesh);
      geometriesToDispose.push(attractorGeo);
      materialsToDispose.push(attractorMat);
    }
  } else {
    // -------------------------------------------------------------
    // PURE 3D SPACE COLONIZATION (TRUNK + BRANCHES + CANOPY)
    // Used for Oak, Sakura, Birch, Korok, and Swamp Mangrove!
    // -------------------------------------------------------------
    scaData = runSpaceColonization(config);

    // Build unified continuous trunk + branch mesh (seamless welded chains)
    const treeGeo = buildFullTreeGeometry(
      scaData.rootNode,
      config.growthStage === 'shrub' ? 8 : 12,
      config.rootSpread,
      config.trunkTwist,
      isSwamp,
      true,
      // a bush's twigs are drawn much finer than a tree's
      config.growthStage === 'shrub' ? 0.006 : 0.025
    );

    // The full broadleaf crowns (oak, sakura, birch, Korok) wrap their limbs
    // in foliage, so the wood inside is in shade, as the pine's is: turn on
    // the bark shader's crown shade with this tree's own crown, as a rounded
    // mass. Not for the open crowns - the mangrove's rosettes and the
    // acacia's thin plates hide little of their wood.
    const barkUniforms = (barkMaterial as THREE.ShaderMaterial).uniforms;
    const openCrown = isSwamp || config.scaCrownShape === 'flat_top';
    if (barkUniforms?.uCrownShade && !openCrown) {
      // (a bush is thin inside: light gets in among its stems)
      barkUniforms.uCrownShade.value = config.growthStage === 'shrub' ? 0.45 : 0.8;
      barkUniforms.uCrownEllipsoid.value = 1;
      barkUniforms.uCrownCenterY.value = scaData.crownCenter.y;
      barkUniforms.uCrownRadius.value = (scaData.crownRadiusX + scaData.crownRadiusZ) * 0.5;
      barkUniforms.uCrownRadiusY.value = scaData.crownRadiusY;
    }

    const fullTreeMesh = new THREE.Mesh(treeGeo, barkMaterial);
    fullTreeMesh.name = 'ProceduralTreeWood';
    fullTreeMesh.castShadow = true;
    fullTreeMesh.receiveShadow = true;
    group.add(fullTreeMesh);
    geometriesToDispose.push(treeGeo);

    // Collect branch tips from leaf nodes for apples and accessories
    scaData.leafNodes.forEach((leaf) => {
      branchTips.push({
        position: leaf.position,
        normal: leaf.dir,
        scale: 1.0,
      });
    });

    // If Swamp Mangrove species: add proportional stilt roots, bracket fungi, and swamp pool
    if (isSwamp) {
      const swampAcc = buildSwampRootsAndAccessories(
        config,
        scaData,
        barkMaterial,
        sharedUniforms,
        branchTips,
        rnd
      );
      group.add(swampAcc.group);
      swampAcc.materialsToDispose.forEach((m) => {
        if (Array.isArray(m)) m.forEach((mat) => materialsToDispose.push(mat));
        else materialsToDispose.push(m);
      });
      geometriesToDispose.push(...swampAcc.geometriesToDispose);
      const prevUpdater = foliageUpdater;
      foliageUpdater = (time: number) => {
        if (prevUpdater) prevUpdater(time);
        swampAcc.update(time, config.windStrength, config.windSpeed);
      };
    }

    // 3D Visualizer for Space Colonization Attraction Points (Golden Orbs)
    if (config.showAttractors && scaData.attractorPositions.length > 0) {
      const attractorGeo = new THREE.BufferGeometry();
      const posArray = new Float32Array(scaData.attractorPositions.length * 3);
      for (let i = 0; i < scaData.attractorPositions.length; i++) {
        const p = scaData.attractorPositions[i];
        posArray[i * 3] = p.x;
        posArray[i * 3 + 1] = p.y;
        posArray[i * 3 + 2] = p.z;
      }
      attractorGeo.setAttribute('position', new THREE.BufferAttribute(posArray, 3));
      const attractorMat = new THREE.PointsMaterial({
        color: 0xffd54f,
        size: 0.24,
        transparent: true,
        opacity: 0.88,
        blending: THREE.AdditiveBlending,
      });
      const attractorPointsMesh = new THREE.Points(attractorGeo, attractorMat);
      attractorPointsMesh.name = 'SCA_AttractorPoints';
      group.add(attractorPointsMesh);
      geometriesToDispose.push(attractorGeo);
      materialsToDispose.push(attractorMat);
    }

  // -------------------------------------------------------------
  // 5. GENERATE FOLIAGE (BOTW VOLUMETRIC CLOUDS & STYLIZED CANOPY)
  // -------------------------------------------------------------
  const foliageGroup = new THREE.Group();
  foliageGroup.name = 'BotW_FoliageCanopy';

  if (!isPalm && (config.foliageType === 'cloud' || config.foliageType === 'pine_cone' || config.foliageType === 'swamp_weeping')) {
    const crownCenter = scaData?.crownCenter ?? new THREE.Vector3(0, config.trunkHeight * 0.85, 0);
    const isPineSpecies = config.species.startsWith('hebra_pine') || config.foliageType === 'pine_cone';
    const minBranchH = isPineSpecies ? 0.20 : 0.48;
    const branchStartRatio = Math.max(minBranchH, config.branchStartHeight ?? minBranchH);
    const crownBottomY = scaData ? scaData.crownBottomY : config.trunkHeight * branchStartRatio;
    const crownBounds: CrownBounds = {
      bottomY: crownBottomY,
      topY: scaData ? scaData.crownTopY : config.trunkHeight + (config.crownHeight ?? 4.5),
      centerY: crownCenter.y,
      radiusX: scaData ? scaData.crownRadiusX : ((config.branchLength ?? 4.0) * 0.95 + 1.2) * (config.canopySpread ?? 1.15),
      radiusZ: scaData ? scaData.crownRadiusZ : ((config.branchLength ?? 4.0) * 0.95 + 1.2) * (config.canopySpread ?? 1.15),
      radiusY: scaData ? scaData.crownRadiusY : (config.crownHeight ?? 4.5),
      shape: config.scaCrownShape ?? (isPineSpecies ? 'conical' : 'dome'),
    };

    const foliageNodes: SCANode[] = scaData ? [...scaData.allNodes] : [];
    if (foliageNodes.length === 0) {
      branchTips.forEach((tip, idx) => {
        foliageNodes.push({
          id: idx,
          position: tip.position.clone(),
          parent: null,
          children: [],
          dir: tip.normal.clone(),
          radius: config.trunkRadiusTop,
          depth: 1,
          isLeaf: true,
          isTrunk: false,
        });
      });
    }

    if (isSwamp && scaData) {
      const rosetteResult = buildStylizedMangroveCanopy(config, scaData, sharedUniforms, rnd);
      foliageGroup.add(rosetteResult.mesh);
      foliageMaterials.push(rosetteResult.material);
      materialsToDispose.push(rosetteResult.material);
      geometriesToDispose.push(...rosetteResult.geometriesToDispose);

      const swampFoliageUpdater = (time: number) => {
        rosetteResult.update(time, config.windStrength, config.windSpeed);
      };
      if (foliageUpdater) {
        const prev = foliageUpdater;
        foliageUpdater = (time: number) => {
          prev(time);
          swampFoliageUpdater(time);
        };
      } else {
        foliageUpdater = swampFoliageUpdater;
      }
    } else {
      const foliageResult = buildProceduralFoliage(config, foliageNodes, crownBounds);
      foliageGroup.add(foliageResult.instancedMesh);
      foliageMaterials.push(foliageResult.foliageMaterial);
      const baseFoliageUpdater = foliageResult.update;
      if (foliageUpdater) {
        const prev = foliageUpdater;
        foliageUpdater = (time: number) => {
          prev(time);
          baseFoliageUpdater(time);
        };
      } else {
        foliageUpdater = baseFoliageUpdater;
      }
      materialsToDispose.push(foliageResult.foliageMaterial);
      geometriesToDispose.push(foliageResult.instancedMesh.geometry);
    }
  }

  group.add(foliageGroup);
  fruitFoliage = foliageGroup;
  }

  // -------------------------------------------------------------
  // 6. BOTW ACCENTS (Apples, Mushrooms, Korok Pinwheel)
  // -------------------------------------------------------------
  let pinwheelBladesMesh: THREE.Mesh | null = null;

  // Fruit (not on the palm: it grows its own coconuts)
  if (config.showApples && config.appleCount > 0 && !isCactus && !isSwamp && !isPalm) {
    if (scaData) {
      // Bushes carry clusters of berries or flowers instead (the count on the
      // panel is then the number of clusters of three).
      const accent = config.growthStage === 'shrub' ? config.bushAccent : undefined;
      const fruit = buildHangingFruit(
        config,
        scaData,
        sharedUniforms,
        accent ? config.appleCount * 3 : config.appleCount,
        rnd,
        accent === 'berries'
          ? { radius: 0.055, color: config.accentColor ?? '#b0203a', perCluster: 3 }
          : accent === 'flowers'
          ? { radius: 0.09, color: config.accentColor ?? '#f28ab8', perCluster: 3, kind: 'flower' }
          : {
              // sized to the crown, so the apples still read on a big tree
              radius: THREE.MathUtils.clamp(scaData.crownRadiusX * 0.045, 0.18, 0.3),
              color: '#d8342b',
            },
        fruitFoliage
      );
      group.add(fruit.group);
      geometriesToDispose.push(...fruit.geometries);
      materialsToDispose.push(...fruit.materials);
    }
  }

  // BotW Mushrooms around the trunk (placed naturally on the upper bark above roots)
  if (config.showMushrooms && config.mushroomCount > 0 && !isSwamp) {
    const shroomCapGeo = new THREE.ConeGeometry(0.22, 0.16, 8);
    const shroomStemGeo = new THREE.CylinderGeometry(0.035, 0.05, 0.18, 6);

    const shroomCapMat = new THREE.MeshToonMaterial({
      color: config.species.startsWith('satori_sakura') ? 0x29b6f6 : 0xffa726,
    });
    const shroomStemMat = new THREE.MeshToonMaterial({ color: 0xf5f5dc });
    materialsToDispose.push(shroomCapMat, shroomStemMat);
    geometriesToDispose.push(shroomCapGeo, shroomStemGeo);

    const trunkUpperNodes = scaData
      ? scaData.allNodes.filter((n) => n.isTrunk && n.position.y >= 0.8 && n.position.y <= config.trunkHeight * 0.45)
      : [];

    // Mushrooms sit on the bark that is actually RENDERED. The node radius is
    // not that surface - the mesh is tapered, flared at the foot and, on some
    // species, rebuilt with its own radii - so a mushroom placed from it ends
    // up half buried. A ray cast in toward the trunk finds the real surface
    // and its normal instead.
    const woodMeshes = group.children.filter(
      (o) => (o as THREE.Mesh).isMesh && /Wood|Trunk|Fork/i.test(o.name)
    ) as THREE.Mesh[];
    group.updateMatrixWorld(true);
    const raycaster = new THREE.Raycaster();
    const worldUp = new THREE.Vector3(0, 1, 0);
    const outwardTilt = THREE.MathUtils.degToRad(50); // from vertical: shows the cap from the side and above

    for (let m = 0; m < config.mushroomCount; m++) {
      const angle = (m * 2.39996) % (Math.PI * 2);
      const around = new THREE.Vector3(Math.cos(angle), 0, Math.sin(angle));

      let axisPoint: THREE.Vector3;
      let guessRadius: number;
      if (trunkUpperNodes.length > 0) {
        const node = trunkUpperNodes[m % trunkUpperNodes.length];
        axisPoint = node.position.clone();
        guessRadius = node.radius;
      } else {
        axisPoint = new THREE.Vector3(0, 0.9 + (m / config.mushroomCount) * 1.6, 0);
        guessRadius = config.trunkRadiusBase * 0.82;
      }

      let surface = axisPoint.clone().addScaledVector(around, guessRadius);
      let outward = around.clone();
      if (woodMeshes.length > 0) {
        raycaster.set(axisPoint.clone().addScaledVector(around, 8), around.clone().negate());
        raycaster.far = 8.5;
        const hit = raycaster.intersectObjects(woodMeshes, false)[0];
        if (hit) {
          surface = hit.point.clone();
          if (hit.face) {
            const n = hit.face.normal.clone().transformDirection(hit.object.matrixWorld);
            n.y *= 0.3; // mostly horizontal: bark normals near a flare tip up and down
            if (n.lengthSq() > 1e-6 && n.normalize().dot(around) > 0.2) outward = n;
          }
        }
      }

      // Growing out of the bark and tipped up, never into the trunk. (The old
      // Euler pair - yaw by -angle, then roll by ~81 degrees - applied the roll
      // first in three's XYZ order, which laid every mushroom pointing inward.)
      const growDir = outward.clone().multiplyScalar(Math.sin(outwardTilt))
        .addScaledVector(worldUp, Math.cos(outwardTilt))
        .normalize();

      const shroomGroup = new THREE.Group();
      shroomGroup.position.copy(surface).addScaledVector(outward, -0.03);
      shroomGroup.quaternion.setFromUnitVectors(worldUp, growDir);

      const capMesh = new THREE.Mesh(shroomCapGeo, shroomCapMat);
      capMesh.position.set(0, 0.19, 0);
      const stemMesh = new THREE.Mesh(shroomStemGeo, shroomStemMat);
      stemMesh.position.set(0, 0.07, 0); // stem base just inside the bark

      shroomGroup.add(stemMesh);
      shroomGroup.add(capMesh);
      group.add(shroomGroup);
    }
  }

  // Korok Pinwheel! (Placed on prominent branch tip)
  if (config.showKorokPinwheel) {
    const pinwheelGroup = new THREE.Group();
    pinwheelGroup.name = 'KorokPinwheel';

    const stickGeo = new THREE.CylinderGeometry(0.03, 0.03, 0.8, 6);
    const stickMat = new THREE.MeshToonMaterial({ color: 0x8d6e63 });
    const stick = new THREE.Mesh(stickGeo, stickMat);
    stick.position.set(0, 0.4, 0);
    pinwheelGroup.add(stick);
    geometriesToDispose.push(stickGeo);
    materialsToDispose.push(stickMat);

    const bladeGeo = new THREE.BufferGeometry();
    const bladeVerts: number[] = [];
    const bladeColors: number[] = [];

    const bladePalette = [
      new THREE.Color(0xf44336),
      new THREE.Color(0xffeb3b),
      new THREE.Color(0x2196f3),
      new THREE.Color(0x4caf50),
    ];

    for (let b = 0; b < 4; b++) {
      const angle = (b * Math.PI) / 2;
      const nextAngle = angle + Math.PI / 4;
      const rBlade = 0.28;

      bladeVerts.push(0, 0, 0);
      bladeVerts.push(Math.cos(angle) * rBlade, Math.sin(angle) * rBlade, 0.02);
      bladeVerts.push(Math.cos(nextAngle) * (rBlade * 0.7), Math.sin(nextAngle) * (rBlade * 0.7), -0.02);

      const col = bladePalette[b];
      for (let k = 0; k < 3; k++) {
        bladeColors.push(col.r, col.g, col.b);
      }
    }

    bladeGeo.setAttribute('position', new THREE.Float32BufferAttribute(bladeVerts, 3));
    bladeGeo.setAttribute('color', new THREE.Float32BufferAttribute(bladeColors, 3));
    bladeGeo.computeVertexNormals();

    const bladeMat = new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.DoubleSide });
    const blades = new THREE.Mesh(bladeGeo, bladeMat);
    blades.position.set(0, 0.8, 0.04);
    pinwheelGroup.add(blades);

    pinwheelBladesMesh = blades;
    geometriesToDispose.push(bladeGeo);
    materialsToDispose.push(bladeMat);

    // Place on highest or first branch tip
    const anchorTip = branchTips[0] || { position: new THREE.Vector3(1, config.trunkHeight * 0.6, 0) };
    pinwheelGroup.position.copy(anchorTip.position);
    pinwheelGroup.position.y += 0.2;
    pinwheelGroup.rotation.y = rnd() * Math.PI;

    group.add(pinwheelGroup);
  }

  // -------------------------------------------------------------
  // 7. PEDESTAL & HYRULE GROUND ISLAND (ILHA DE TERRA E RAÍZES BOTW)
  // -------------------------------------------------------------
  // a bush stands on a small island of its own size
  const isShrubGround = config.growthStage === 'shrub';
  // A biome's bush stands on the same ground as that biome's tree.
  const biome = SHRUB_BIOME[config.species] ?? config.species;
  const moundRadius = isShrubGround
    ? 2.6
    : Math.max(config.rootSpread * 3.8 + config.trunkRadiusBase + 2.5, 5.0);
  const moundDepth = isShrubGround ? 0.6 : 1.2;
  const moundGeo = new THREE.CylinderGeometry(moundRadius, moundRadius * 1.15, moundDepth, 32);
  
  // Snow cover (the snowy pine) whitens the whole island.
  const isSnowyGround = (config.snowCover ?? 0) > 0.05;
  const moundColor = isSnowyGround
    ? 0xe4edf6 // Hebra snowfield
    : biome.startsWith('desert_shrub')
    ? 0xd4a359 // Gerudo sand
    : biome.startsWith('savanna_acacia')
    ? 0xc09a58 // Savanna red-gold earth
    : biome.startsWith('hebra_pine')
    ? 0x5a4838 // Alpine cold earth
    : biome.startsWith('satori_sakura')
    ? 0x4e8555 // Satori Mountain sacred grove green
    : biome.startsWith('gerudo_cactus')
    ? 0xd4a359 // Gerudo Desert dunes
    : biome.startsWith('faron_palm')
    ? 0xc2a66e // Coastal sand
    : biome.startsWith('swamp_mangrove')
    ? 0x2e271f // Swamp marsh mud
    : biome.startsWith('dry_withered')
    ? 0x6e5c49 // Arid scorched steppe soil
    : 0x588e36; // Lush Hyrule field green

  const moundMat = new THREE.MeshToonMaterial({
    color: moundColor,
  });
  const mound = new THREE.Mesh(moundGeo, moundMat);
  mound.position.set(0, -moundDepth / 2, 0);
  mound.receiveShadow = true;
  group.add(mound);
  geometriesToDispose.push(moundGeo);
  materialsToDispose.push(moundMat);

  // Stylized 3D Tapered Grass Tufts around the base (curved BotW grass blades)
  const isCactusOrPalm = biome.startsWith('gerudo_cactus') || biome.startsWith('faron_palm');
  if (!isCactusOrPalm && !isSnowyGround) {
    const tuftShape = new THREE.Shape();
    tuftShape.moveTo(-0.06, 0);
    tuftShape.lineTo(0.06, 0);
    tuftShape.quadraticCurveTo(0.05, 0.25, 0.0, 0.42);
    tuftShape.quadraticCurveTo(-0.05, 0.25, -0.06, 0);
    const grassBladeGeo = new THREE.ShapeGeometry(tuftShape);
    
    const grassBladeMat = new THREE.MeshToonMaterial({
      color: biome.startsWith('satori_sakura')
        ? 0x81c784
        : biome.startsWith('savanna_acacia')
        ? 0xd8bd62 // Tall golden savanna grass
        : biome.startsWith('dry_withered') || biome.startsWith('desert_shrub')
        ? 0xa89368 // Dry golden savannah grass
        : biome.startsWith('hebra_pine')
        ? 0x6e9970
        : 0x7cb342, // Vibrant Hyrule green
      side: THREE.DoubleSide,
    });
    materialsToDispose.push(grassBladeMat);
    geometriesToDispose.push(grassBladeGeo);

    const grassTuftCount = biome.startsWith('dry_withered')
      ? 10
      : biome.startsWith('savanna_acacia') ? 30 : 18; // savanna: grassland all round
    for (let g = 0; g < grassTuftCount; g++) {
      const grAngle = rnd() * Math.PI * 2;
      const grDist = isShrubGround
        ? 0.9 + rnd() * (moundRadius * 0.6)                         // round the bush, not under it
        : config.trunkRadiusBase * 1.2 + 0.4 + rnd() * (moundRadius * 0.7);
      const tuft = new THREE.Group();
      tuft.position.set(Math.cos(grAngle) * grDist, 0.0, Math.sin(grAngle) * grDist);

      // 3 blades per cluster
      for (let b = 0; b < 3; b++) {
        const blade = new THREE.Mesh(grassBladeGeo, grassBladeMat);
        blade.rotation.y = (b / 3) * Math.PI + (rnd() - 0.5) * 0.4;
        blade.rotation.x = 0.12 + (rnd() - 0.5) * 0.15;
        const bladeScale = isShrubGround ? 0.55 : 1;
        blade.scale.set((0.8 + rnd() * 0.5) * bladeScale, (0.8 + rnd() * 0.5) * bladeScale, (0.8 + rnd() * 0.5) * bladeScale);
        blade.castShadow = true;
        tuft.add(blade);
      }
      tuft.rotation.y = rnd() * Math.PI * 2;
      group.add(tuft);
    }

    // Weathered low-poly stones nestled by the roots for dry withered trees
    if (biome.startsWith('dry_withered')) {
      const stoneMat = new THREE.MeshToonMaterial({ color: 0x786e65 });
      materialsToDispose.push(stoneMat);

      for (let s = 0; s < 5; s++) {
        const stoneR = (0.22 + rnd() * 0.25) * (isShrubGround ? 0.5 : 1);
        const stoneGeo = new THREE.DodecahedronGeometry(stoneR, 0);
        geometriesToDispose.push(stoneGeo);
        const stoneMesh = new THREE.Mesh(stoneGeo, stoneMat);
        const sAngle = (s / 5) * Math.PI * 2 + rnd() * 0.5;
        const sDist = isShrubGround ? 0.8 + rnd() * 0.7 : config.trunkRadiusBase * 1.3 + 0.3 + rnd() * 0.8;
        stoneMesh.position.set(Math.cos(sAngle) * sDist, stoneR * 0.4 - 0.05, Math.sin(sAngle) * sDist);
        stoneMesh.rotation.set(rnd() * Math.PI, rnd() * Math.PI, rnd() * Math.PI);
        stoneMesh.scale.set(1.2, 0.7, 1.0);
        stoneMesh.castShadow = true;
        stoneMesh.receiveShadow = true;
        group.add(stoneMesh);
      }
    }
  }

  // Snowy ground: a few dark stones break up the white, each wearing a cap of
  // the same snow.
  if (isSnowyGround) {
    const stoneMat = new THREE.MeshToonMaterial({ color: 0x5f6670 });
    const capMat = new THREE.MeshToonMaterial({ color: 0xf2f7fc });
    materialsToDispose.push(stoneMat, capMat);
    for (let s = 0; s < 6; s++) {
      const stoneR = (0.25 + rnd() * 0.3) * (isShrubGround ? 0.45 : 1);
      const stoneGeo = new THREE.DodecahedronGeometry(stoneR, 0);
      geometriesToDispose.push(stoneGeo);
      const stone = new THREE.Mesh(stoneGeo, stoneMat);
      const sAngle = (s / 6) * Math.PI * 2 + rnd() * 0.6;
      const sDist = isShrubGround
        ? 1.0 + rnd() * 0.9
        : config.trunkRadiusBase * 1.4 + 0.6 + rnd() * (moundRadius * 0.55);
      stone.position.set(Math.cos(sAngle) * sDist, stoneR * 0.3 - 0.05, Math.sin(sAngle) * sDist);
      stone.rotation.set(rnd() * Math.PI, rnd() * Math.PI, rnd() * Math.PI);
      stone.scale.set(1.25, 0.7, 1.0);
      stone.castShadow = true;
      stone.receiveShadow = true;
      group.add(stone);

      const cap = new THREE.Mesh(stoneGeo, capMat);
      cap.position.copy(stone.position);
      cap.position.y += stoneR * 0.42;
      cap.rotation.y = rnd() * Math.PI;
      cap.scale.set(1.05, 0.28, 0.85);
      cap.receiveShadow = true;
      group.add(cap);
    }
  }

  // -------------------------------------------------------------
  // ANIMATION LOOP & DISPOSAL
  // -------------------------------------------------------------
  const update = (time: number) => {
    sharedUniforms.uTime.value = time;
    sharedUniforms.uWindStrength.value = config.windStrength;
    sharedUniforms.uWindSpeed.value = config.windSpeed;

    if (foliageUpdater) {
      foliageUpdater(time);
    }

    if (pinwheelBladesMesh) {
      pinwheelBladesMesh.rotation.z += 0.08 * (config.windSpeed * 1.5 + 0.2);
    }
  };

  const dispose = () => {
    geometriesToDispose.forEach((g) => g.dispose());
    materialsToDispose.forEach((m) => m.dispose());
    foliageMaterials.forEach((m) => m.dispose());
  };

  return {
    group,
    foliageMaterials,
    barkMaterial,
    pinwheelBlades: pinwheelBladesMesh,
    update,
    dispose,
  };
}
