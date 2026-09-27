import * as THREE from 'three';
import { TreeConfig } from '../types';
import { addStoneEdges, createPixelStoneMaterial, jitterCorners } from './rockSystem';

/**
 * Rock formations (the "Pedras" category), all in the pixel stone style the
 * dry tree's rocks use: flat facets, light in whole steps, one-texel lit
 * edges on the upper ridges, dark creases, lichen or moss on the tops.
 *
 *  - rock_boulder  (Rocha arredondada)  one big rounded boulder
 *  - rock_pebbles  (Pedregulhos)        a scatter of flattened stones
 *  - rock_slate    (Laje de ardósia)    flat slabs stacked a little askew
 *  - rock_spire    (Agulha de pedra)    tall six-sided columns
 *  - rock_mossy    (Rocha com musgo)    a boulder under a cushion of moss
 *  - rock_arctic   (Rocha ártica)       the boulder in cold blue-grey
 *  - rock_shore    (Rocha de praia)     dark, weathered shore rock
 *  - rock_river    (Seixo de rio)       smooth, flat river stones
 *
 * The colours follow the panel: barkColor is the stone, foliageColorTop the
 * moss or lichen, mossAmount how much of it; trunkHeight sets the size.
 */

type RockKind = 'boulder' | 'pebbles' | 'slate' | 'spire' | 'mossy' | 'arctic' | 'shore' | 'river';

export function rockKindOf(config: TreeConfig): RockKind {
  const k = (config.species as string).replace(/^rock_/, '');
  return (['boulder', 'pebbles', 'slate', 'spire', 'mossy', 'arctic', 'shore', 'river'] as RockKind[]).includes(k as RockKind)
    ? (k as RockKind)
    : 'boulder';
}

export interface RockFormationResult {
  group: THREE.Group;
  geometries: THREE.BufferGeometry[];
  materials: THREE.Material[];
  textures: THREE.Texture[];
  /** true where rock covers the ground (no grass tufts there) */
  occupies: (x: number, z: number) => boolean;
}

/** A rounded stone: an icosahedron, `detail` 0 (chunky) or 1 (rounder). */
function roundStone(detail: number, jitter: number, seed: number): THREE.BufferGeometry {
  const geo = new THREE.IcosahedronGeometry(1, detail);
  jitterCorners(geo, jitter, seed);
  const pos = geo.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < pos.count; i++) {
    if (pos.getY(i) < 0) pos.setY(i, pos.getY(i) * 0.55);   // settles on a flatter underside
  }
  return geo;
}

/** A slab: a box with its top corners lifted and dropped a little. */
function slabStone(w: number, h: number, d: number, rnd: () => number): THREE.BufferGeometry {
  const geo = new THREE.BoxGeometry(w, h, d, 2, 1, 2);
  const pos = geo.attributes.position as THREE.BufferAttribute;
  const seed = rnd() * 100;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);
    const hsh = Math.sin(x * 12.9898 + z * 37.719 + seed) * 43758.5453;
    const j = (hsh - Math.floor(hsh)) - 0.5;
    // a rough top, and edges that are not quite straight
    if (y > 0) pos.setY(i, y + j * h * 0.5);
    pos.setX(i, x * (1 + j * 0.08));
    pos.setZ(i, z * (1 - j * 0.08));
  }
  return geo;
}

/** A column: a six-sided prism, narrowing up to a broken, faceted top. */
function spireStone(radius: number, height: number, rnd: () => number): THREE.BufferGeometry {
  const geo = new THREE.CylinderGeometry(radius * 0.62, radius, height, 6, 4, false);
  geo.translate(0, height / 2, 0);
  const pos = geo.attributes.position as THREE.BufferAttribute;
  const seed = rnd() * 100;
  const topY = height;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);
    const hsh = Math.sin(x * 12.9898 + y * 78.233 + z * 37.719 + seed) * 43758.5453;
    const j = (hsh - Math.floor(hsh)) - 0.5;
    const k = 1 + j * 0.22;
    pos.setX(i, x * k);
    pos.setZ(i, z * k);
    // the top rises to a leaning point where it broke off
    if (y >= topY - 1e-4) {
      const r = Math.hypot(x, z);
      pos.setY(i, r < 1e-4 ? y + radius * 0.9 : y + j * radius * 0.6);
    }
  }
  return geo;
}

export function buildRockFormation(config: TreeConfig, rnd: () => number): RockFormationResult {
  const kind = rockKindOf(config);
  const group = new THREE.Group();
  group.name = 'RockFormation';
  const geometries: THREE.BufferGeometry[] = [];
  const materials: THREE.Material[] = [];
  const textures: THREE.Texture[] = [];
  const size = Math.max(0.3, config.trunkHeight);
  const footprint: { x: number; z: number; r: number }[] = [];

  const stone = createPixelStoneMaterial(config, {
    color: config.barkColor,
    mossColor: config.foliageColorTop,
    moss: config.mossAmount,
  });
  materials.push(stone.material);
  textures.push(stone.palette);
  const light = stone.lightDir;

  /** Scales, turns and sets a stone down, then gives it its lit edges. */
  const place = (geo: THREE.BufferGeometry, scale: THREE.Vector3, at: THREE.Vector3, sink: number) => {
    geo.scale(scale.x, scale.y, scale.z);
    geo.rotateY(rnd() * Math.PI * 2);
    geo.computeBoundingBox();
    const minY = geo.boundingBox!.min.y;
    const g = addStoneEdges(geo, light);
    geometries.push(g);
    const m = new THREE.Mesh(g, stone.material);
    // partly sunk into the soil
    m.position.set(at.x, -minY - sink, at.z);
    m.castShadow = true;
    m.receiveShadow = true;
    m.userData.ground = true;
    group.add(m);
    footprint.push({ x: at.x, z: at.z, r: Math.max(scale.x, scale.z) * 0.95 });
  };

  switch (kind) {
    case 'boulder':
    case 'mossy':
    case 'arctic':
    case 'shore': {
      // one big boulder, sometimes a smaller one leaning on it
      const r = size * 0.62;
      place(roundStone(1, kind === 'shore' ? 0.14 : 0.11, rnd() * 100),
        new THREE.Vector3(r * (1.1 + rnd() * 0.3), r * (0.75 + rnd() * 0.2), r * (0.95 + rnd() * 0.25)),
        new THREE.Vector3(), r * 0.18);
      if (rnd() < 0.55) {
        const r2 = r * (0.35 + rnd() * 0.15);
        const a = rnd() * Math.PI * 2;
        place(roundStone(0, 0.16, rnd() * 100), new THREE.Vector3(r2, r2 * 0.75, r2),
          new THREE.Vector3(Math.cos(a) * r * 1.25, 0, Math.sin(a) * r * 1.25), r2 * 0.15);
      }
      break;
    }
    case 'pebbles':
    case 'river': {
      // a scatter of flattened stones, the river's smoother and flatter
      const n = 4 + Math.floor(rnd() * 4);
      const smooth = kind === 'river';
      for (let i = 0; i < n; i++) {
        const r = size * (i === 0 ? 0.42 : 0.16 + rnd() * 0.2);
        const a = rnd() * Math.PI * 2;
        const d = i === 0 ? 0 : size * (0.45 + rnd() * 0.45);
        place(roundStone(smooth ? 1 : i === 0 ? 1 : 0, smooth ? 0.06 : 0.14, rnd() * 100),
          new THREE.Vector3(r * (1.1 + rnd() * 0.3), r * (smooth ? 0.42 : 0.6 + rnd() * 0.2), r * (0.9 + rnd() * 0.2)),
          new THREE.Vector3(Math.cos(a) * d, 0, Math.sin(a) * d), r * 0.08);
      }
      break;
    }
    case 'slate': {
      // two or three slabs, stacked and a little askew
      const n = 2 + Math.floor(rnd() * 2);
      let y = 0;
      for (let i = 0; i < n; i++) {
        const w = size * (1.7 - i * 0.35) * (0.9 + rnd() * 0.2);
        const d = size * (1.2 - i * 0.25) * (0.9 + rnd() * 0.2);
        const h = size * (0.16 + rnd() * 0.08);
        const geo = slabStone(w, h, d, rnd);
        geo.rotateZ((rnd() - 0.5) * 0.12);
        geo.rotateX((rnd() - 0.5) * 0.12);
        geo.scale(1, 1, 1);
        geo.rotateY(rnd() * Math.PI * 2);
        geo.computeBoundingBox();
        const minY = geo.boundingBox!.min.y;
        const g = addStoneEdges(geo, light);
        geometries.push(g);
        const m = new THREE.Mesh(g, stone.material);
        m.position.set((rnd() - 0.5) * size * 0.3 * i, y - minY - (i === 0 ? h * 0.35 : 0), (rnd() - 0.5) * size * 0.3 * i);
        m.castShadow = true;
        m.receiveShadow = true;
        m.userData.ground = true;
        group.add(m);
        y += h * 0.85;
        footprint.push({ x: 0, z: 0, r: Math.max(w, d) * 0.55 });
      }
      break;
    }
    case 'spire': {
      // a tall column with one or two shorter ones against it
      const main = spireStone(size * 0.2, size, rnd);
      main.rotateY(rnd() * Math.PI);
      const g = addStoneEdges(main, light);
      geometries.push(g);
      const m = new THREE.Mesh(g, stone.material);
      m.position.y = -0.1;
      m.castShadow = true;
      m.receiveShadow = true;
      m.userData.ground = true;
      group.add(m);
      footprint.push({ x: 0, z: 0, r: size * 0.22 });
      const extra = 1 + Math.floor(rnd() * 2);
      for (let i = 0; i < extra; i++) {
        const a = rnd() * Math.PI * 2;
        const h = size * (0.35 + rnd() * 0.3);
        const r = size * (0.12 + rnd() * 0.05);
        const s = spireStone(r, h, rnd);
        s.rotateY(rnd() * Math.PI);
        const gs = addStoneEdges(s, light);
        geometries.push(gs);
        const ms = new THREE.Mesh(gs, stone.material);
        const d = size * 0.2 + r * 0.9;
        ms.position.set(Math.cos(a) * d, -0.08, Math.sin(a) * d);
        ms.rotation.z = (rnd() - 0.5) * 0.12;
        ms.castShadow = true;
        ms.receiveShadow = true;
        ms.userData.ground = true;
        group.add(ms);
        footprint.push({ x: ms.position.x, z: ms.position.z, r: r * 1.1 });
      }
      break;
    }
  }

  const occupies = (x: number, z: number) => footprint.some((f) => Math.hypot(x - f.x, z - f.z) < f.r + 0.1);
  return { group, geometries, materials, textures, occupies };
}
