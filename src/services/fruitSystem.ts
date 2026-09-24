import * as THREE from 'three';
import { TreeConfig } from '../types';
import type { SCANode, SCATreeData } from './spaceColonization';
import { createPixelPropMaterial } from './pixelArtTextureSystem';

export interface FruitOptions {
  /** Radius of one fruit, metres. */
  radius: number;
  /** Fruit colour (the pixel material builds its ramp from it). */
  color: string;
  /** Fruits hung from each chosen twig: 1 for apples, 2-3 for berries. */
  perCluster?: number;
  /** 'flower': five-petal blossoms opening outward on the foliage's skin,
   *  with no stalk, instead of hanging fruit. */
  kind?: 'fruit' | 'flower';
}

export interface FruitResult {
  group: THREE.Group;
  geometries: THREE.BufferGeometry[];
  materials: THREE.Material[];
}

/**
 * Twigs a fruit can hang from. A fruit reads when it hangs from real wood at
 * the SKIN of the crown - just under the leaves on the lower and outer part,
 * where it is seen against them - not deep inside the foliage where it is
 * hidden, nor on the upper surface where nothing would hold it up. So the
 * candidates are the fine, non-trunk nodes in a shell of the crown's rounded
 * mass, below its upper third.
 */
function fruitAnchors(data: SCATreeData, anywhere = false): SCANode[] {
  const cy = data.crownCenter.y;
  const rx = Math.max(0.5, data.crownRadiusX);
  const ry = Math.max(0.5, data.crownRadiusY);
  const rz = Math.max(0.5, data.crownRadiusZ);
  const pick = (dMin: number, dMax: number, yMax: number) =>
    data.allNodes.filter((n) => {
      if (n.isTrunk || !n.parent || n.radius > 0.16) return false;
      const qx = n.position.x / rx;
      const qy = (n.position.y - cy) / ry;
      const qz = n.position.z / rz;
      const d = Math.sqrt(qx * qx + qy * qy + qz * qz);
      return d >= dMin && d <= dMax && qy <= yMax;
    });
  // (flowers open all over the crown, the top included)
  let anchors = pick(0.55, 1.2, anywhere ? 1.5 : 0.35);
  if (anchors.length < 8) anchors = pick(0.35, 1.4, 0.7);       // small or odd crowns
  if (anchors.length < 4) anchors = data.allNodes.filter((n) => !n.isTrunk && n.parent);
  return anchors;
}

/**
 * Picks `count` anchors spread over the whole crown: a seeded shuffle, then a
 * greedy pass that only accepts an anchor far enough from every one already
 * taken, relaxing the spacing until enough are found. Taking the first twigs
 * in graph order put every fruit in the same corner of the tree.
 */
function spreadAnchors(anchors: SCANode[], count: number, spacing: number, rnd: () => number): SCANode[] {
  const pool = [...anchors];
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  const chosen: SCANode[] = [];
  let minDist = spacing;
  while (chosen.length < count && minDist > 0.05) {
    for (const a of pool) {
      if (chosen.length >= count) break;
      if (chosen.includes(a)) continue;
      if (chosen.every((c) => c.position.distanceTo(a.position) >= minDist)) chosen.push(a);
    }
    minDist *= 0.7;
  }
  return chosen;
}

const flowerSpriteCache = new Map<string, THREE.CanvasTexture>();

/**
 * A five-petal blossom drawn as pixel art, 12 x 12 texels with nearest
 * filtering: a dark outline, petals lit from the top left and shaded to the
 * bottom right, a darker ring where they meet, and a yellow heart with its
 * own shade - the same hard-stepped look as the rest of the tree, where a
 * smooth petal shape read as a vector sticker.
 */
function flowerSprite(color: string): THREE.CanvasTexture {
  const hit = flowerSpriteCache.get(color);
  if (hit) return hit;
  const N = 12;
  const canvas = document.createElement('canvas');
  canvas.width = N;
  canvas.height = N;
  const ctx = canvas.getContext('2d')!;
  const base = new THREE.Color(color);
  const hex = (c: THREE.Color) => `#${c.getHexString()}`;
  const light = hex(base.clone().offsetHSL(0, 0, 0.12));
  const mid = hex(base);
  const dark = hex(base.clone().offsetHSL(0, 0.05, -0.17));
  const outline = hex(base.clone().offsetHSL(0, 0.1, -0.34));
  const c = (N - 1) / 2;
  for (let y = 0; y < N; y++) {
    for (let x = 0; x < N; x++) {
      const dx = x - c;
      const dy = y - c;
      const d = Math.hypot(dx, dy);
      const a = Math.atan2(dy, dx) - Math.PI / 2;
      const petalR = 5.9 * (0.52 + 0.48 * Math.abs(Math.cos(a * 2.5)));
      if (d > petalR) continue;
      let fill: string;
      if (d <= 1.6) fill = dx + dy > 0.5 ? '#c78a1a' : '#f2c230';   // heart
      else if (d > petalR - 1.0) fill = outline;                      // outline
      else if (d < 2.6) fill = dark;                                  // ring round the heart
      else if (dx + dy < -1.2) fill = light;                          // lit side
      else if (dx + dy > 2.2) fill = dark;                            // shaded side
      else fill = mid;
      ctx.fillStyle = fill;
      ctx.fillRect(x, y, 1, 1);
    }
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.magFilter = THREE.NearestFilter;
  tex.minFilter = THREE.NearestFilter;
  tex.generateMipmaps = false;
  tex.colorSpace = THREE.SRGBColorSpace;
  flowerSpriteCache.set(color, tex);
  return tex;
}

/**
 * Fruit on the tree, spread over the lower and outer part of the crown.
 *
 * Hung straight from its twig, a fruit sits INSIDE the foliage - the leaf
 * tufts reach a metre or more past the wood - and almost none of them show.
 * So when the foliage is handed in, each fruit is set where a ray from
 * outside the tree toward its twig first meets the leaves: on the crown's
 * skin, nestled into it, with its stalk and leaf running back into the
 * foliage. Without foliage (or if the ray misses) it hangs from the twig on
 * its stalk. Drawn in the pixel-art prop style when the pixel textures are on.
 */
export function buildHangingFruit(
  config: TreeConfig,
  data: SCATreeData,
  sharedUniforms: Record<string, THREE.IUniform>,
  count: number,
  rnd: () => number,
  options: FruitOptions,
  foliage?: THREE.Object3D
): FruitResult {
  const group = new THREE.Group();
  group.name = 'BotW_Fruit';
  const geometries: THREE.BufferGeometry[] = [];
  const materials: THREE.Material[] = [];
  const usePixel = config.pixelTextureEnabled !== false;

  const r = options.radius;
  const perCluster = Math.max(1, options.perCluster ?? 1);

  const fruitGeo = new THREE.SphereGeometry(r, 10, 8);
  fruitGeo.scale(1, 0.92, 1);
  const stalkGeo = new THREE.CylinderGeometry(r * 0.07, r * 0.09, 1, 5);
  stalkGeo.translate(0, -0.5, 0);                               // hangs down from its top
  const leafShape = new THREE.Shape();
  leafShape.moveTo(0, 0);
  leafShape.quadraticCurveTo(r * 0.55, r * 0.5, 0, r * 1.5);
  leafShape.quadraticCurveTo(-r * 0.55, r * 0.5, 0, 0);
  const leafGeo = new THREE.ShapeGeometry(leafShape);
  geometries.push(fruitGeo, stalkGeo, leafGeo);

  const fruitMat = usePixel
    ? createPixelPropMaterial(config, sharedUniforms, options.color, 'smooth')
    : new THREE.MeshToonMaterial({ color: options.color });
  const stalkMat = usePixel
    ? createPixelPropMaterial(config, sharedUniforms, '#5a3a22', 'smooth')
    : new THREE.MeshToonMaterial({ color: 0x5a3a22 });
  const leafMat = new THREE.MeshToonMaterial({ color: config.foliageColorTop, side: THREE.DoubleSide });
  materials.push(fruitMat, stalkMat, leafMat);

  // Flowers: a pixel sprite on a small quad (facing +Z).
  let flowerGeo: THREE.BufferGeometry | null = null;
  let flowerMat: THREE.Material | null = null;
  if (options.kind === 'flower') {
    flowerGeo = new THREE.PlaneGeometry(r * 2.4, r * 2.4);
    flowerMat = usePixel
      ? new THREE.MeshBasicMaterial({
          map: flowerSprite(options.color),
          alphaTest: 0.5,
          side: THREE.DoubleSide,
        })
      : new THREE.MeshToonMaterial({
          map: flowerSprite(options.color),
          alphaTest: 0.5,
          side: THREE.DoubleSide,
        });
    geometries.push(flowerGeo);
    materials.push(flowerMat);
  }

  const crownR = Math.max(1, (data.crownRadiusX + data.crownRadiusZ) * 0.5);
  const spacing = (crownR * 2.2) / Math.sqrt(Math.max(1, count / perCluster));
  const anchors = spreadAnchors(
    fruitAnchors(data, options.kind === 'flower'),
    Math.ceil(count / perCluster),
    spacing,
    rnd
  );

  let placed = 0;
  const down = new THREE.Vector3(0, -1, 0);
  const raycaster = new THREE.Raycaster();
  if (foliage) foliage.updateMatrixWorld(true);
  const center = data.crownCenter;
  for (const anchor of anchors) {
    // out of the crown a little, so the fruit shows against the leaves
    const outward = new THREE.Vector3(
      anchor.position.x,
      0,
      anchor.position.z
    );
    if (outward.lengthSq() < 1e-4) outward.set(1, 0, 0);
    outward.normalize();

    // Where the leaves are, seen from outside along the line to this twig.
    let skin: THREE.Vector3 | null = null;
    let skinDir: THREE.Vector3 | null = null;
    if (foliage) {
      const dir = anchor.position.clone().sub(center);
      if (dir.lengthSq() < 1e-4) dir.copy(outward);
      dir.normalize();
      raycaster.set(anchor.position.clone().addScaledVector(dir, crownR * 3), dir.clone().negate());
      raycaster.far = crownR * 3.2;
      const hit = raycaster.intersectObject(foliage, true)[0];
      if (hit) {
        // A leaf card is a quad: the ray can land on its transparent corner,
        // well out from any leaf, and the fruit hung in the air there. So the
        // skin is never taken further from the twig than a tuft reaches.
        const maxOut = (config.clusterRadius ?? 1) * 0.8;
        const out = Math.min(hit.point.distanceTo(anchor.position), maxOut);
        skin = anchor.position.clone().addScaledVector(dir, out);
        skinDir = dir;
      }
    }

    if (options.kind === 'flower') {
      // blossoms open on the skin (or, failing a hit, at the twig), facing out
      const at = skin ?? anchor.position;
      const facing = skinDir ?? outward;
      for (let k = 0; k < perCluster && placed < count; k++, placed++) {
        const side = new THREE.Vector3().crossVectors(facing, new THREE.Vector3(0, 1, 0));
        if (side.lengthSq() < 1e-4) side.set(1, 0, 0);
        side.normalize();
        const up = new THREE.Vector3().crossVectors(side, facing).normalize();
        const a = (k / perCluster) * Math.PI * 2 + rnd();
        const pos = at.clone()
          .addScaledVector(facing, r * 0.2)
          .addScaledVector(side, perCluster > 1 ? Math.cos(a) * r * 2.4 : 0)
          .addScaledVector(up, perCluster > 1 ? Math.sin(a) * r * 2.4 : 0);
        const face = facing.clone().addScaledVector(up, 0.35).normalize();   // turned a little to the sky
        const flower = new THREE.Mesh(flowerGeo!, flowerMat!);
        flower.position.copy(pos);
        flower.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), face);
        flower.rotateZ((rnd() - 0.5) * 0.8);          // (the sprite is lit from its top left)
        flower.scale.setScalar(0.85 + rnd() * 0.3);
        group.add(flower);
      }
      continue;
    }

    if (skin && skinDir) {
      // a small bunch on the skin: the first fruit where the ray landed, the
      // rest of a cluster beside it
      for (let k = 0; k < perCluster && placed < count; k++, placed++) {
        const side = new THREE.Vector3().crossVectors(skinDir, new THREE.Vector3(0, 1, 0));
        if (side.lengthSq() < 1e-4) side.set(1, 0, 0);
        side.normalize();
        const pos = skin.clone()
          // sunk into the leaves, only part of it showing (depth varies)
          .addScaledVector(skinDir, -r * (0.5 + rnd() * 0.6))
          .addScaledVector(side, perCluster > 1 ? (k - (perCluster - 1) / 2) * r * 1.7 : 0)
          .add(new THREE.Vector3(0, k % 2 === 1 ? -r * 0.6 : 0, 0));
        const fruit = new THREE.Mesh(fruitGeo, fruitMat);
        fruit.position.copy(pos);
        fruit.rotation.set((rnd() - 0.5) * 0.4, rnd() * Math.PI * 2, (rnd() - 0.5) * 0.4);
        fruit.scale.setScalar(0.9 + rnd() * 0.2);
        fruit.castShadow = true;
        group.add(fruit);

        // stalk from the top of the fruit up and back into the leaves
        const stalkLen = r * 0.9;
        const stalkDir = new THREE.Vector3(0, 1, 0).addScaledVector(skinDir, -0.5).normalize();
        const stalk = new THREE.Mesh(stalkGeo, stalkMat);
        stalk.position.copy(pos).addScaledVector(stalkDir, r * 0.8 + stalkLen);
        stalk.quaternion.setFromUnitVectors(new THREE.Vector3(0, -1, 0), stalkDir.clone().negate());
        stalk.scale.set(1, stalkLen, 1);
        group.add(stalk);
        if (k === 0) {
          const leaf = new THREE.Mesh(leafGeo, leafMat);
          leaf.position.copy(pos).addScaledVector(stalkDir, r * 0.85);
          leaf.rotation.set(-0.7 + rnd() * 0.3, Math.atan2(skinDir.x, skinDir.z) + 0.6, 0.3);
          group.add(leaf);
        }
      }
      continue;
    }

    for (let k = 0; k < perCluster && placed < count; k++, placed++) {
      const stalkLen = r * (0.9 + rnd() * 0.8);
      // cluster members fan out from the same twig
      const spreadAngle = perCluster > 1 ? (k / perCluster) * Math.PI * 2 + rnd() : rnd() * Math.PI * 2;
      const lean = new THREE.Vector3(Math.cos(spreadAngle), 0, Math.sin(spreadAngle))
        .multiplyScalar(perCluster > 1 ? 0.45 : 0.15)
        .addScaledVector(outward, 0.25);
      const hangDir = down.clone().add(lean).normalize();

      const top = anchor.position.clone();
      const stalk = new THREE.Mesh(stalkGeo, stalkMat);
      stalk.position.copy(top);
      stalk.quaternion.setFromUnitVectors(new THREE.Vector3(0, -1, 0), hangDir);
      stalk.scale.set(1, stalkLen, 1);
      group.add(stalk);

      const fruit = new THREE.Mesh(fruitGeo, fruitMat);
      fruit.position.copy(top).addScaledVector(hangDir, stalkLen + r * 0.85);
      fruit.rotation.set((rnd() - 0.5) * 0.4, rnd() * Math.PI * 2, (rnd() - 0.5) * 0.4);
      fruit.scale.setScalar(0.9 + rnd() * 0.2);
      fruit.castShadow = true;
      group.add(fruit);

      if (k === 0) {
        const leaf = new THREE.Mesh(leafGeo, leafMat);
        leaf.position.copy(top);
        leaf.rotation.set(-0.9 + rnd() * 0.3, spreadAngle + Math.PI * 0.5, 0.4);
        group.add(leaf);
      }
    }
  }

  return { group, geometries, materials };
}
