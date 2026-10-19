import * as THREE from 'three';
import type { AssetInstance } from '../assets/types';
import { STRUCTURE_PRESETS } from '../structures/catalog';
import { createStructure } from '../structures/generator';
import type { StructureAssetConfig, StructureKind } from '../structures/types';
import { createTree } from '../services/treeGenerator';
import { TREE_PRESETS } from '../constants/presets';
import { ROCK_BIOMES } from '../constants/rockBiomes';
import { DEFAULT_SETTLEMENT_SETTINGS, Footprint, Pad, PlannedBuilding, SettlementOptions, SettlementPlan, TerrainSampler, ValidationReport } from './types';
import { planSettlement, variantDims } from './planner';
import { terrainFor } from './terrain';
import { validatePlan } from './validation';
import { PointGrid, rectsOverlap, toWorld } from './geometry';
import { isSettlementType } from './kinds';

/**
 * Turns a SettlementPlan into a scene, using the existing structure and tree
 * generators for every piece. Each distinct piece (a kind, a size variant) is
 * generated once and cloned: the clones share geometry and materials, so a
 * town of 70 houses costs a handful of generated models, not 70.
 */

const hashSeed = (seed: number, text: string, n: number): number => {
  let h = 2166136261 ^ Math.floor(seed);
  for (const c of text + ':' + n) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return (h >>> 0) % 90000 + 1000;
};

interface Variant {
  inst: AssetInstance;
  /** the generated original goes in the scene once, every other use is a clone */
  used: boolean;
  /** measured footprint of the wood and stone, in the building's own frame */
  box: { x0: number; x1: number; z0: number; z1: number; top: number };
}

function stripGround(root: THREE.Object3D) {
  const dead: THREE.Object3D[] = [];
  root.traverse((o) => { if (o !== root && (o.userData.ground || o.userData.excludeFromSettlement)) dead.push(o); });
  for (const o of dead) o.parent?.remove(o);
}

function countTriangles(root: THREE.Object3D): { meshes: number; triangles: number } {
  let meshes = 0, triangles = 0;
  root.traverse((o) => {
    const m = o as THREE.Mesh;
    if (m.isMesh) { meshes++; const g = m.geometry; triangles += (g.index ? g.index.count : g.attributes.position.count) / 3; }
  });
  return { meshes, triangles: Math.round(triangles) };
}

/** Footprint of the building itself: plants, flowers and rocks scattered round it do not count. */
function measure(root: THREE.Object3D) {
  root.updateMatrixWorld(true);
  const box = new THREE.Box3();
  const part = new THREE.Box3();
  const inVegetation = (o: THREE.Object3D) => { for (let p: THREE.Object3D | null = o; p; p = p.parent) if (p.name === 'StructureVegetation') return true; return false; };
  root.traverse((o) => {
    const m = o as THREE.Mesh;
    if (!m.isMesh || inVegetation(o)) return;
    part.setFromObject(m, false);
    if (!part.isEmpty()) box.union(part);
  });
  return { x0: box.min.x, x1: box.max.x, z0: box.min.z, z1: box.max.z, top: box.max.y };
}

export function createSettlement(source: StructureAssetConfig): AssetInstance {
  const c = source.structure;
  if (!isSettlementType(c.type)) throw new Error('not a settlement type: ' + c.type);
  const settings = { ...DEFAULT_SETTLEMENT_SETTINGS, ...(c.settlement ?? {}) };
  const options: SettlementOptions = { ...settings, kind: c.type, seed: source.seed, biome: c.biome };
  const terrain = terrainFor(source.seed, settings);
  const t0 = performance.now();
  const plan = planSettlement(options, terrain);
  const tPlan = performance.now() - t0;

  const disposers: (() => void)[] = [];
  const updaters: ((t: number) => void)[] = [];
  const root = new THREE.Group();
  root.name = 'ProceduralSettlement';
  const assets = new THREE.Group();
  assets.name = 'SettlementAssets';
  root.add(assets);

  // ---- real footprints, then the final validation -----------------------------
  const structureVariants = new Map<string, Variant>();
  const breakdown: Record<string, { meshes: number; triangles: number; cx?: number; cz?: number; w?: number; d?: number }> = {};
  const variantFor = (kind: StructureKind, variant: number, dims?: { width?: number; depth?: number; bridgeStyle?: 'timber'; wallStairs?: boolean; wallStairSide?: 1 | -1 }): Variant => {
    const key = `${kind}:${variant}:${dims?.width ?? ''}:${dims?.depth ?? ''}:${dims?.wallStairs ?? ''}:${dims?.wallStairSide ?? ''}`;
    const found = structureVariants.get(key);
    if (found) return found;
    const preset = STRUCTURE_PRESETS[('structure_' + kind) as keyof typeof STRUCTURE_PRESETS];
    const base = variantDims(kind, variant);
    const config: StructureAssetConfig = {
      ...preset,
      seed: hashSeed(source.seed, kind, variant),
      structure: {
        ...preset.structure,
        palette: { ...preset.structure.palette },
        width: dims?.width ?? base.width,
        depth: dims?.depth ?? base.depth,
        biome: c.biome,
        snow: c.biome === 'hebra_snowy' ? 0.65 : preset.structure.snow,
        ruin: kind === 'castle' || kind === 'fortress' ? 0 : preset.structure.ruin,
        vegetation: preset.structure.vegetation * 0.7,
        // no random annexes: they swell a house by several metres and make its size unpredictable in a street
        annexes: false,
        ...(dims?.bridgeStyle ? { bridgeStyle: dims.bridgeStyle } : {}),
        ...(dims?.wallStairs !== undefined ? { wallStairs: dims.wallStairs } : {}),
        ...(dims?.wallStairSide ? { wallStairSide: dims.wallStairSide } : {}),
      },
    };
    const inst = createStructure(config);
    stripGround(inst.group);
    const v: Variant = { inst, used: false, box: measure(inst.group) };
    const cost = countTriangles(inst.group);
    breakdown[key] = { ...cost, cx: +((v.box.x0 + v.box.x1) / 2).toFixed(2), cz: +((v.box.z0 + v.box.z1) / 2).toFixed(2), w: +(v.box.x1 - v.box.x0).toFixed(2), d: +(v.box.z1 - v.box.z0).toFixed(2) };
    structureVariants.set(key, v);
    disposers.push(() => inst.dispose());
    updaters.push((t) => inst.update(t));
    return v;
  };
  const realRect = (b: PlannedBuilding): Footprint => {
    const v = variantFor(b.kind, b.variant);
    const [x, z] = toWorld({ x: b.px, z: b.pz, hw: 0, hd: 0, yaw: b.yaw }, (v.box.x0 + v.box.x1) / 2, (v.box.z0 + v.box.z1) / 2);
    return { x, z, hw: (v.box.x1 - v.box.x0) / 2 + 0.2, hd: (v.box.z1 - v.box.z0) / 2 + 0.2, yaw: b.yaw };
  };
  let report: ValidationReport = validatePlan(plan, terrain, realRect);
  let pruned = 0;
  for (let pass = 0; pass < 8 && report.overlaps.length; pass++) {
    const drop = new Set<string>();
    for (const [a, b] of report.overlaps) {
      const ba = plan.buildings.find((q) => q.id === a), bb = plan.buildings.find((q) => q.id === b);
      if (!ba && !bb) continue;
      if (!bb) { drop.add(a); continue; }
      if (!ba) { drop.add(b); continue; }
      // the more important or bigger building stays
      const rank = (q: PlannedBuilding) => (q.role === 'landmark' ? 1e6 : 0) + q.width * q.depth;
      drop.add(rank(ba) >= rank(bb) ? b : a);
    }
    plan.buildings = plan.buildings.filter((q) => !drop.has(q.id));
    plan.streets = plan.streets.filter((s) => !(s.to && drop.has(s.to)));
    pruned += drop.size;
    report = validatePlan(plan, terrain, realRect);
  }
  plan.pads = [
    ...plan.buildings.map((b): Pad => ({ x: b.x, z: b.z, hw: b.hw + 0.4, hd: b.hd + 0.4, yaw: b.yaw, y: b.baseY })),
    // the curtain wall stands on one level strip of ground
    ...plan.walls.map((w): Pad => ({ x: w.x, z: w.z, hw: w.hw + 0.3, hd: w.hd + (w.stairSide ? 2.4 : 0.6), yaw: w.yaw, y: w.baseY })),

  ];
  plan.stats.prunedByRealBounds = pruned;
  plan.stats.buildings = plan.buildings.length;

  // ---- ground: the terrain, levelled under the buildings ---------------------------
  // the slab reaches just past the outskirts, so the settlement fills the view
  const half = plan.radius * (c.type === 'fortifiedTown' ? 1.5 : 1.22) + 10;
  const heightAt = makeHeightAt(terrain, plan.pads);
  const ground = buildGround(plan, terrain, heightAt, half, c.biome);
  root.add(ground.group);
  disposers.push(ground.dispose);

  // ---- streets ------------------------------------------------------------------------
  const roads = buildRoads(plan, terrain, heightAt, c.type);
  assets.add(roads.group);
  disposers.push(roads.dispose);

  // ---- structures -----------------------------------------------------------------------
  const place = (v: Variant, x: number, y: number, z: number, yaw: number, scale = 1) => {
    const holder = new THREE.Group();
    holder.position.set(x, y, z);
    holder.rotation.y = yaw;
    if (scale !== 1) holder.scale.setScalar(scale);
    holder.add(v.used ? v.inst.group.clone(true) : v.inst.group);
    v.used = true;
    holder.updateMatrix();
    holder.matrixAutoUpdate = false;
    assets.add(holder);
    return holder;
  };
  for (const b of plan.buildings) place(variantFor(b.kind, b.variant), b.px, b.baseY, b.pz, b.yaw).name = b.id;
  for (const p of plan.props) place(variantFor(p.kind, p.variant), p.x, p.baseY, p.z, p.yaw).name = p.id;
  for (const w of plan.walls) {
    const len = Math.round(w.length * 2) / 2;
    const v = w.kind === 'wall'
      ? variantFor('wall', 0, w.stairSide ? { width: len, depth: 3.2, wallStairs: true, wallStairSide: w.stairSide } : { width: len, depth: 3.2, wallStairs: false })
      : variantFor(w.kind, 0);
    place(v, w.x, w.baseY - 0.35, w.z, w.yaw);
  }
  for (const br of plan.bridges) {
    const len = Math.max(6, Math.round(br.length));
    place(variantFor('bridge', 0, { width: len, depth: Math.max(3.2, br.hd * 2), bridgeStyle: 'timber' }), br.x, br.baseY, br.z, br.yaw);
  }

  // ---- trees ------------------------------------------------------------------------------
  const treeVariants = new Map<string, { inst: AssetInstance; used: boolean }>();
  for (const t of plan.trees.slice(0, 24)) {
    const key = `${t.species}:${t.variant}`;
    let v = treeVariants.get(key);
    if (!v) {
      const cfg = { ...TREE_PRESETS[t.species], seed: hashSeed(source.seed, t.species, t.variant) };
      const created = createTree(cfg);
      stripGround(created.group);
      const inst: AssetInstance = {
        group: created.group, assetGroup: created.group, bounds: new THREE.Box3().setFromObject(created.group),
        update: created.update, dispose: created.dispose, canFell: false,
      };
      v = { inst, used: false };
      treeVariants.set(key, v);
      breakdown['tree:' + key] = countTriangles(created.group);
      disposers.push(() => inst.dispose());
      updaters.push((time) => inst.update(time));
    }
    const holder = new THREE.Group();
    holder.position.set(t.x, t.baseY, t.z);
    holder.rotation.y = (t.x * 12.9898 + t.z * 78.233) % 6.28;
    holder.scale.setScalar(t.scale * 0.55);
    holder.add(v.used ? v.inst.group.clone(true) : v.inst.group);
    v.used = true;
    holder.updateMatrix();
    holder.matrixAutoUpdate = false;
    assets.add(holder);
  }

  // ---- result ---------------------------------------------------------------------------------
  let meshes = 0, triangles = 0;
  root.traverse((o) => {
    const m = o as THREE.Mesh;
    if (m.isMesh) { meshes++; const g = m.geometry; triangles += (g.index ? g.index.count : g.attributes.position.count) / 3; }
  });
  plan.stats.meshes = meshes;
  plan.stats.triangles = Math.round(triangles);
  plan.stats.planMs = Math.round(tPlan);
  plan.stats.totalMs = Math.round(performance.now() - t0);
  console.info('[settlement]', c.type, source.seed, JSON.stringify(plan.stats));
  const finalReport = validatePlan(plan, terrain, realRect);
  root.userData.settlementPlan = plan;
  root.userData.settlementValidation = finalReport;
  root.name = `Settlement_${c.type}_${source.seed}`;
  const bounds = new THREE.Box3(
    new THREE.Vector3(plan.centre[0] - half, -8, plan.centre[1] - half),
    new THREE.Vector3(plan.centre[0] + half, 30, plan.centre[1] + half)
  );
  return {
    group: root,
    assetGroup: assets,
    bounds,
    canFell: false,
    update: (t) => { for (const u of updaters) u(t); },
    dispose: () => { for (const d of disposers) d(); },
  };
}

// ---------------------------------------------------------------------------
// terrain mesh
// ---------------------------------------------------------------------------

/** Terrain height, blended flat under every pad so buildings never float or sink. */
function makeHeightAt(terrain: TerrainSampler, pads: Pad[]) {
  const blend = 6;
  const aabb = pads.map((p) => {
    const r = Math.hypot(p.hw, p.hd) + blend;
    return { p, minX: p.x - r, maxX: p.x + r, minZ: p.z - r, maxZ: p.z + r, c: Math.cos(p.yaw), s: Math.sin(p.yaw) };
  });
  return (x: number, z: number): number => {
    let h = terrain.height(x, z);
    for (const a of aabb) {
      if (x < a.minX || x > a.maxX || z < a.minZ || z > a.maxZ) continue;
      const dx = x - a.p.x, dz = z - a.p.z;
      const lx = Math.abs(dx * a.c - dz * a.s), lz = Math.abs(dx * a.s + dz * a.c);
      const ox = Math.max(0, lx - a.p.hw), oz = Math.max(0, lz - a.p.hd);
      const d = Math.hypot(ox, oz);
      if (d >= blend) continue;
      const t = d / blend;
      const w = 1 - t * t * (3 - 2 * t);
      h += (a.p.y - h) * w;
    }
    return h;
  };
}

function buildGround(plan: SettlementPlan, terrain: TerrainSampler, heightAt: (x: number, z: number) => number, half: number, biome: keyof typeof ROCK_BIOMES) {
  const step = Math.max(1.5, half / 110);
  const n = Math.floor((half * 2) / step) + 1;
  const [cx, cz] = plan.centre;
  const positions = new Float32Array(n * n * 3);
  const colors = new Float32Array(n * n * 3);
  const grass = new THREE.Color(biome === 'hebra_snowy' ? '#e4edf6' : ROCK_BIOMES[biome].ground);
  const mud = new THREE.Color('#6d5a3d');
  const rock = new THREE.Color('#7b786d');
  const tmp = new THREE.Color();
  let anyWater = false;
  for (let j = 0; j < n; j++) {
    for (let i = 0; i < n; i++) {
      const x = cx - half + i * step, z = cz - half + j * step;
      const h = heightAt(x, z);
      const k = (j * n + i) * 3;
      positions[k] = x; positions[k + 1] = h; positions[k + 2] = z;
      const slope = Math.hypot(heightAt(x + 1.5, z) - heightAt(x - 1.5, z), heightAt(x, z + 1.5) - heightAt(x, z - 1.5)) / 3;
      const noise = (Math.sin(x * 0.37 + z * 0.21) * Math.sin(z * 0.43 - x * 0.17)) * 0.022;
      tmp.copy(grass).offsetHSL(0, 0, noise - Math.min(0.14, slope * 0.2));
      if (slope > 0.5) tmp.lerp(rock, Math.min(1, (slope - 0.5) * 2));
      if (h < terrain.waterLevel + 0.15) { tmp.lerp(mud, h < terrain.waterLevel ? 0.85 : 0.5); }
      if (h < terrain.waterLevel) anyWater = true;
      colors[k] = tmp.r; colors[k + 1] = tmp.g; colors[k + 2] = tmp.b;
    }
  }
  const idx: number[] = [];
  for (let j = 0; j < n - 1; j++) for (let i = 0; i < n - 1; i++) {
    const a = j * n + i, b = a + 1, c = a + n, d = c + 1;
    idx.push(a, c, b, b, c, d);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geo.setIndex(idx);
  geo.computeVertexNormals();
  const mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1 });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.name = 'SettlementTerrain';
  mesh.receiveShadow = true;
  mesh.userData.excludeFromOBJ = false;
  const group = new THREE.Group();
  group.add(mesh);
  const disposables: { dispose: () => void }[] = [geo, mat];

  // a dark skirt closes the edge of the slab
  const edge: [number, number][] = [];
  for (let i = 0; i < n; i++) edge.push([i, 0]);
  for (let j = 1; j < n; j++) edge.push([n - 1, j]);
  for (let i = n - 2; i >= 0; i--) edge.push([i, n - 1]);
  for (let j = n - 2; j > 0; j--) edge.push([0, j]);
  const sp: number[] = [], si: number[] = [];
  edge.forEach(([i, j], e) => {
    const k = (j * n + i) * 3;
    sp.push(positions[k], positions[k + 1], positions[k + 2], positions[k], -8, positions[k + 2]);
    const a = e * 2, b = ((e + 1) % edge.length) * 2;
    si.push(a, a + 1, b, b, a + 1, b + 1);
  });
  const skirtGeo = new THREE.BufferGeometry();
  skirtGeo.setAttribute('position', new THREE.Float32BufferAttribute(sp, 3));
  skirtGeo.setIndex(si);
  skirtGeo.computeVertexNormals();
  const skirtMat = new THREE.MeshStandardMaterial({ color: '#4a3b2a', roughness: 1, side: THREE.DoubleSide });
  const skirt = new THREE.Mesh(skirtGeo, skirtMat);
  skirt.name = 'SettlementTerrainSkirt';
  group.add(skirt);
  disposables.push(skirtGeo, skirtMat);

  if (anyWater) {
    const wGeo = new THREE.PlaneGeometry(half * 2, half * 2);
    wGeo.rotateX(-Math.PI / 2);
    const wMat = new THREE.MeshStandardMaterial({ color: '#3d7f9d', transparent: true, opacity: 0.82, roughness: 0.25 });
    const water = new THREE.Mesh(wGeo, wMat);
    water.position.set(cx, terrain.waterLevel, cz);
    water.name = 'SettlementWater';
    water.userData.excludeFromOBJ = true;
    group.add(water);
    disposables.push(wGeo, wMat);
  }
  return { group, dispose: () => disposables.forEach((d) => d.dispose()) };
}

// ---------------------------------------------------------------------------
// streets and plaza as ribbons draped on the ground
// ---------------------------------------------------------------------------

function buildRoads(plan: SettlementPlan, terrain: TerrainSampler, heightAt: (x: number, z: number) => number, type: string) {
  const stoneMain = type === 'town' || type === 'fortifiedTown' || type === 'village';
  const col = {
    main: new THREE.Color(stoneMain ? '#8e8a80' : '#967348'),
    secondary: new THREE.Color('#8a6a40'),
    lane: new THREE.Color('#7b6039'),
    plaza: new THREE.Color('#9a968b'),
  };
  const pos: number[] = [], clr: number[] = [], idx: number[] = [];
  const lift = 0.07;
  const yAt = (x: number, z: number) => Math.max(heightAt(x, z), terrain.isWater(x, z) ? terrain.waterLevel + 0.25 : -99) + lift;
  const tmp = new THREE.Color();
  for (const s of plan.streets) {
    const base = pos.length / 3;
    const n = s.points.length;
    for (let i = 0; i < n; i++) {
      const p = s.points[i];
      const a = s.points[Math.max(0, i - 1)], b = s.points[Math.min(n - 1, i + 1)];
      let tx = b[0] - a[0], tz = b[1] - a[1];
      const l = Math.hypot(tx, tz) || 1;
      tx /= l; tz /= l;
      const w = s.width / 2 * (0.94 + 0.12 * Math.sin(i * 1.7));
      for (const side of [-1, 1]) {
        const x = p[0] - tz * w * side, z = p[1] + tx * w * side;
        pos.push(x, yAt(x, z), z);
        tmp.copy(col[s.cls]).offsetHSL(0, 0, (Math.sin(x * 0.9 + z * 1.3) * 0.02) - (Math.abs(side) > 0 && side === 1 ? 0 : 0));
        clr.push(tmp.r, tmp.g, tmp.b);
      }
    }
    for (let i = 0; i < n - 1; i++) {
      const a = base + i * 2;
      idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
    }
  }
  // the plaza: a paved disc
  {
    const base = pos.length / 3;
    const seg = 28;
    pos.push(plan.plaza.x, yAt(plan.plaza.x, plan.plaza.z), plan.plaza.z);
    clr.push(col.plaza.r, col.plaza.g, col.plaza.b);
    for (let i = 0; i < seg; i++) {
      const a = (i / seg) * Math.PI * 2;
      const r = plan.plaza.radius * (0.92 + 0.12 * Math.sin(a * 5 + 1));
      const x = plan.plaza.x + Math.cos(a) * r, z = plan.plaza.z + Math.sin(a) * r;
      pos.push(x, yAt(x, z), z);
      tmp.copy(col.plaza).offsetHSL(0, 0, Math.sin(a * 7) * 0.025);
      clr.push(tmp.r, tmp.g, tmp.b);
    }
    for (let i = 0; i < seg; i++) idx.push(base, base + 1 + ((i + 1) % seg), base + 1 + i);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('color', new THREE.Float32BufferAttribute(clr, 3));
  geo.setIndex(idx);
  geo.computeVertexNormals();
  const mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.name = 'SettlementStreets';
  mesh.receiveShadow = true;
  const group = new THREE.Group();
  group.add(mesh);
  return { group, dispose: () => { geo.dispose(); mat.dispose(); } };
}

// kept for tests and tooling
export { PointGrid, rectsOverlap };
