import './treeCanvasFixture';
import assert from 'node:assert/strict';
import test from 'node:test';
import { STRUCTURE_PRESETS } from '../src/structures/catalog';
import { createSettlement } from '../src/settlements/builder';
import { planSettlement, wallStairRect } from '../src/settlements/planner';
import { createStandInTerrain } from '../src/settlements/terrain';
import { validatePlan } from '../src/settlements/validation';
import { PointGrid, pointInPolygon, rectsOverlap } from '../src/settlements/geometry';
import type { SettlementKind, SettlementOptions } from '../src/settlements/types';

const KINDS: SettlementKind[] = ['hamlet', 'village', 'town', 'fortifiedTown'];
const STYLES = ['river', 'hills', 'lake', 'flat'] as const;
const SEEDS = [11, 1234, 7040, 31337, 90001];

const optionsFor = (kind: SettlementKind, seed: number, style: (typeof STYLES)[number], extra: Partial<SettlementOptions> = {}): SettlementOptions => ({
  kind, seed, biome: 'hyrule', size: 1, density: 0.65, frequency: 0.5, trees: true, terrainStyle: style, ...extra,
});

/** Union-find over street samples closer than `join` metres: which streets touch each other. */
function connectedFraction(plan: ReturnType<typeof planSettlement>): number {
  const nodes: { x: number; z: number; s: number; i: number }[] = [];
  plan.streets.forEach((s, si) => s.points.forEach(([x, z], i) => nodes.push({ x, z, s: si, i })));
  const parent = plan.streets.map((_, i) => i);
  const find = (a: number): number => (parent[a] === a ? a : (parent[a] = find(parent[a])));
  const grid = new PointGrid<(typeof nodes)[number]>(6);
  nodes.forEach((n) => grid.add(n));
  for (const n of nodes) for (const m of grid.near(n.x, n.z, 3.2)) if (Math.hypot(m.x - n.x, m.z - n.z) < 3.2) parent[find(n.s)] = find(m.s);
  // a bridge joins the streets on its two banks
  for (const b of plan.bridges) {
    const r = Math.max(b.hw, b.hd) + 3;
    const all = grid.near(b.x, b.z, r + 6).filter((m) => Math.hypot(m.x - b.x, m.z - b.z) < r);
    for (const m of all) parent[find(m.s)] = find(all[0].s);
  }
  const root = find(0);
  return plan.streets.filter((_, i) => find(i) === root).length / plan.streets.length;
}

test('the same seed and options give exactly the same settlement', () => {
  for (const kind of KINDS) {
    const o = optionsFor(kind, 4242, 'river');
    const a = planSettlement(o, createStandInTerrain(o.seed, o.terrainStyle));
    const b = planSettlement(o, createStandInTerrain(o.seed, o.terrainStyle));
    assert.equal(JSON.stringify(a), JSON.stringify(b), kind);
  }
});

test('different seeds give different settlements', () => {
  const seen = new Set<string>();
  for (const seed of SEEDS) {
    const o = optionsFor('town', seed, 'hills');
    const p = planSettlement(o, createStandInTerrain(seed, 'hills'));
    seen.add(p.buildings.map((b) => `${b.kind}${Math.round(b.x)}${Math.round(b.z)}`).join('|'));
  }
  assert.equal(seen.size, SEEDS.length);
});

test('buildings never overlap, never stand in water or on steep ground, and every door reaches a street', () => {
  for (const kind of KINDS) for (const style of STYLES) for (const seed of SEEDS) {
    const o = optionsFor(kind, seed, style);
    const terrain = createStandInTerrain(seed, style);
    const plan = planSettlement(o, terrain);
    const report = validatePlan(plan, terrain);
    const label = `${kind}/${style}/${seed}`;
    assert.deepEqual(report.overlaps, [], label + ' overlaps');
    assert.deepEqual(report.inWater, [], label + ' water');
    assert.deepEqual(report.steep, [], label + ' steep');
    assert.deepEqual(report.noAccess, [], label + ' access');
    assert.ok(plan.buildings.length >= 3, label + ' too few buildings: ' + plan.buildings.length);
  }
});

test('streets form one connected network around the plaza and every lane leads to a building', () => {
  let worst = 1;
  for (const kind of KINDS) for (const seed of SEEDS) {
    const o = optionsFor(kind, seed, 'river');
    const plan = planSettlement(o, createStandInTerrain(seed, 'river'));
    const f = connectedFraction(plan);
    worst = Math.min(worst, f);
    const ids = new Set(plan.buildings.map((b) => b.id));
    for (const s of plan.streets) if (s.cls === 'lane') assert.ok(s.to && ids.has(s.to), `${kind}/${seed} lane ${s.id} leads nowhere`);
  }
  assert.ok(worst >= 0.9, 'worst connected fraction ' + worst);
});

test('buildings keep inside the settlement outline and clear of the streets', () => {
  for (const kind of KINDS) for (const seed of SEEDS) {
    const o = optionsFor(kind, seed, 'hills');
    const plan = planSettlement(o, createStandInTerrain(seed, 'hills'));
    const grid = new PointGrid<{ x: number; z: number; hw: number }>(8);
    for (const s of plan.streets) for (const [x, z] of s.points) grid.add({ x, z, hw: s.width / 2 });
    for (const b of plan.buildings) {
      if (!plan.options.kind.includes('fortified') && b.kind !== 'windmill' && b.kind !== 'watermill') {
        assert.ok(pointInPolygon(plan.boundary, b.x, b.z), `${kind}/${seed} ${b.id} outside the outline`);
      }
      for (const s of grid.near(b.x, b.z, Math.hypot(b.hw, b.hd) + 3)) {
        const c = Math.cos(b.yaw), sn = Math.sin(b.yaw);
        const dx = s.x - b.x, dz = s.z - b.z;
        const lx = Math.abs(dx * c - dz * sn), lz = Math.abs(dx * sn + dz * c);
        assert.ok(!(lx < b.hw && lz < b.hd), `${kind}/${seed} street runs through ${b.id}`);
      }
    }
  }
});

test('size, density and frequency change the settlement', () => {
  const terrain = createStandInTerrain(77, 'hills');
  const count = (extra: Partial<SettlementOptions>) => planSettlement(optionsFor('village', 77, 'hills', extra), terrain).buildings.length;
  assert.ok(count({ density: 1 }) > count({ density: 0.25 }));
  assert.ok(count({ size: 1.6 }) > count({ size: 0.7 }));
  const commerce = (f: number) => planSettlement(optionsFor('town', 77, 'hills', { frequency: f }), terrain).buildings.filter((b) => b.kind === 'blacksmith' || b.kind === 'market').length;
  assert.ok(commerce(1) >= commerce(0));
});

test('a fortified town has walls, gates on its main roads, towers and a castle', () => {
  let castles = 0;
  for (const seed of SEEDS) {
    const plan = planSettlement(optionsFor('fortifiedTown', seed, 'hills'), createStandInTerrain(seed, 'hills'));
    assert.ok(plan.walls.filter((w) => w.kind === 'wall').length > 10, 'walls ' + seed);
    assert.ok(plan.walls.some((w) => w.kind === 'gate'), 'gate ' + seed);
    assert.ok(plan.walls.some((w) => w.kind === 'stoneTower'), 'tower ' + seed);
    assert.ok(plan.buildings.some((b) => b.kind === 'castle' || b.kind === 'fortress'), 'stronghold ' + seed);
    if (plan.buildings.some((b) => b.kind === 'castle')) castles++;
  }
  assert.ok(castles >= 3, 'castles on rough ground: ' + castles + ' of ' + SEEDS.length);
});

test('fortified wall segments are stairless, except a few pieces with a flight along the inner face', () => {
  const town = createSettlement(STRUCTURE_PRESETS.structure_fortifiedTown);
  const walls: Array<{ pieces: Array<{ role: string; position: number[] }> }> = [];
  town.assetGroup.traverse((object) => {
    const plan = object.userData.structurePlan;
    if (plan?.type === 'wall') walls.push(plan);
  });
  assert.ok(walls.length > 10);
  let withStairs = 0;
  for (const wall of walls) {
    const flights = wall.pieces.filter((piece) => piece.role === 'wall-stair-block');
    if (!flights.length) continue;
    withStairs++;
    // a flight laid beside the wall, never the end stair that would run into the next piece
    for (const f of flights) assert.ok(Math.abs(f.position[2]) > 1, 'end stair in a settlement wall');
  }
  assert.ok(withStairs >= 1 && withStairs <= 10, 'wall pieces with a stair: ' + withStairs);
  town.dispose();
});

test('water mills stand on a river bank and bridges are only built over water', () => {
  let mills = 0;
  for (const seed of SEEDS) {
    const terrain = createStandInTerrain(seed, 'river');
    const plan = planSettlement(optionsFor('village', seed, 'river'), terrain);
    for (const m of plan.buildings.filter((b) => b.kind === 'watermill')) {
      mills++;
      let nearWater = false;
      for (let a = 0; a < 16 && !nearWater; a++) for (const d of [4, 6, 8, 10]) {
        if (terrain.isWater(m.x + Math.cos((a / 16) * 6.283) * d, m.z + Math.sin((a / 16) * 6.283) * d)) nearWater = true;
      }
      assert.ok(nearWater, 'mill ' + seed + ' is not by water');
    }
    for (const b of plan.bridges) {
      const wet = [0.3, 0.5, 0.7].some((t) => terrain.isWater(b.x + Math.cos(b.yaw) * b.length * (t - 0.5), b.z - Math.sin(b.yaw) * b.length * (t - 0.5)));
      assert.ok(wet, 'bridge ' + b.id + ' crosses no water');
    }
  }
  assert.ok(mills > 0, 'no watermill was placed on any river map');
});

test('wall towers are masonry and wooden watchtowers stand inside the town, never on the wall', () => {
  let wooden = 0;
  for (const seed of SEEDS) {
    const plan = planSettlement(optionsFor('fortifiedTown', seed, 'hills'), createStandInTerrain(seed, 'hills'));
    assert.ok(plan.walls.every((w) => w.kind === 'wall' || w.kind === 'gate' || w.kind === 'stoneTower'), 'wall pieces ' + seed);
    for (const t of plan.buildings.filter((b) => b.kind === 'watchtower')) {
      wooden++;
      assert.ok(pointInPolygon(plan.boundary, t.x, t.z), 'watchtower ' + t.id + ' outside the settlement ' + seed);
      assert.ok(plan.walls.every((w) => Math.hypot(w.x - t.x, w.z - t.z) > 6), 'watchtower ' + t.id + ' on the wall ' + seed);
    }
  }
  assert.ok(wooden > 0, 'no wooden watchtower was placed inside any fortified town');
});

test('the whole curtain wall stands on one level, so its crest is even all round', () => {
  for (const seed of SEEDS) for (const style of ['hills', 'river'] as const) {
    const plan = planSettlement(optionsFor('fortifiedTown', seed, style), createStandInTerrain(seed, style));
    const levels = new Set(plan.walls.map((w) => w.baseY.toFixed(4)));
    assert.equal(levels.size, 1, 'wall levels ' + [...levels].join(',') + ' (' + seed + '/' + style + ')');
  }
});

test('the two towers of a gate sit symmetrically on the wall line, level with the gate', () => {
  for (const seed of SEEDS) {
    const plan = planSettlement(optionsFor('fortifiedTown', seed, 'river'), createStandInTerrain(seed, 'river'));
    for (const g of plan.walls.filter((w) => w.kind === 'gate')) {
      const c = Math.cos(g.yaw), s = Math.sin(g.yaw);
      const towers = plan.walls.filter((w) => w.kind === 'stoneTower' && Math.hypot(w.x - g.x, w.z - g.z) < 9);
      for (const t of towers) {
        const dx = t.x - g.x, dz = t.z - g.z;
        const across = dx * s + dz * c;
        assert.ok(Math.abs(across) < 0.05, `tower off the wall line by ${across.toFixed(2)} m (${seed})`);
        assert.ok(Math.abs(t.yaw - g.yaw) < 1e-9, 'tower turned against the gate');
      }
      if (towers.length === 2) {
        const along = towers.map((t) => (t.x - g.x) * c - (t.z - g.z) * s).sort((a, b) => a - b);
        assert.ok(Math.abs(along[0] + along[1]) < 0.05, `towers not symmetric about the gate (${seed})`);
      }
    }
  }
});

test('no gate sits where the wall bends: everything within a few metres of a gate runs in the gate\'s direction', () => {
  let gates = 0, bent = 0;
  for (const seed of SEEDS.concat([5, 77, 4242, 808, 2024, 9999])) for (const style of ['river', 'hills', 'lake'] as const) {
    const plan = planSettlement(optionsFor('fortifiedTown', seed, style), createStandInTerrain(seed, style));
    for (const g of plan.walls.filter((w) => w.kind === 'gate')) {
      gates++;
      const near = plan.walls.filter((w) => w !== g && Math.hypot(w.x - g.x, w.z - g.z) < 13);
      if (near.some((w) => Math.abs(Math.atan2(Math.sin(w.yaw - g.yaw), Math.cos(w.yaw - g.yaw))) > 1e-6)) bent++;
    }
  }
  assert.ok(gates > 20, 'too few gates tested: ' + gates);
  assert.ok(bent / gates <= 0.05, `gates beside a bend in the wall: ${bent} of ${gates}`);
});

test('a few stairs climb the town side of the wall, with a short wall in front of their foot attached to the curtain wall', () => {
  let stairs = 0;
  for (const seed of SEEDS) for (const style of ['river', 'hills'] as const) {
    const plan = planSettlement(optionsFor('fortifiedTown', seed, style), createStandInTerrain(seed, style));
    const withStairs = plan.walls.filter((w) => w.kind === 'wall' && w.stairSide);
    stairs += withStairs.length;
    assert.ok(withStairs.length >= 1, 'no stair at all ' + seed + '/' + style);
    const curtain = plan.walls.filter((w) => w.kind === 'wall' && !w.id.startsWith('stairwall_'));
    for (const w of withStairs) {
      const r = wallStairRect(w)!;
      const zx = Math.sin(w.yaw), zz = Math.cos(w.yaw);
      assert.ok(((plan.plaza.x - w.x) * zx + (plan.plaza.z - w.z) * zz) * ((r.x - w.x) * zx + (r.z - w.z) * zz) > 0, 'stair on the outer side ' + w.id);
      // the short wall in front of the stair's foot
      const front = plan.walls.filter((q) => q.id.startsWith('stairwall_') && Math.hypot(q.x - r.x, q.z - r.z) < 12);
      assert.ok(front.length >= 1, 'no wall in front of the stair of ' + w.id);
      for (const q of front) {
        assert.ok(curtain.some((c) => rectsOverlap(q, c, 0.1)), q.id + ' does not touch the curtain wall');
        assert.ok(Math.abs(Math.sin(q.yaw - w.yaw)) > 0.99, q.id + ' not at right angles');
        assert.ok(!rectsOverlap(q, r, -0.05), q.id + ' overlaps the stair');
      }
      for (const b of plan.buildings) assert.ok(!rectsOverlap(r, b, 0.2) && !front.some((q) => rectsOverlap(q, b, 0.2)), 'building ' + b.id + ' on the stair of ' + w.id);
      for (const g of plan.walls.filter((q) => q.kind === 'gate' || q.kind === 'stoneTower')) assert.ok(!rectsOverlap(r, g, -0.05) && !front.some((q) => rectsOverlap(q, g, -0.05)), 'stair meets ' + g.id);
    }
  }
  assert.ok(stairs >= 10, 'too few stairs overall: ' + stairs);
});
