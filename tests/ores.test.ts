import assert from 'node:assert/strict';
import { test } from 'node:test';
import * as THREE from 'three';
import { OBJExporter } from 'three/examples/jsm/exporters/OBJExporter.js';
import { TREE_PRESETS } from '../src/constants/presets';
import { ROCK_BIOMES, rockBiomeForSpecies } from '../src/constants/rockBiomes';
import { createTree } from '../src/services/treeGenerator';
import { ORE_STYLES } from '../src/services/oreSystem';
import { OreKind } from '../src/types';

const kinds = ['iron', 'copper', 'quartz', 'gold', 'diamond', 'mithril', 'orichalcum', 'lead', 'coal', 'tin', 'silver', 'amethyst', 'ruby', 'emerald', 'sapphire'] as OreKind[];

test('each fragment has its own seeded surface patch, including all 24 groups', () => {
  const preset = TREE_PRESETS.hyrule_rock;
  const config = { ...preset, rock: { ...preset.rock!, ore: 'iron' as OreKind, oreCount: 24 } };
  const first = createTree(config), second = createTree(config);
  const chips: THREE.Mesh[] = [];
  first.group.getObjectByName('OreDeposits')!.traverse(o => { if (o instanceof THREE.Mesh) chips.push(o); });
  const uniforms = first.barkMaterial.uniforms;
  assert.equal(uniforms.uOrePatchCount?.value, chips.length);
  const patches = uniforms.uOrePatches.value as THREE.Vector4[];
  assert.deepEqual(patches, second.barkMaterial.uniforms.uOrePatches.value);
  chips.forEach((chip, i) => {
    const patch = patches[i];
    assert.ok(new THREE.Vector3(patch.x, patch.y, patch.z).distanceTo(chip.position) < 0.05);
    assert.ok(patch.w > 0 && patch.w < chip.scale.x, 'the halo must stay close to its individual fragment');
  });
  assert.ok(new Set(patches.slice(0, chips.length).map(p => p.w)).size > 1);
  first.dispose(); second.dispose();
});

test('pixel sparkles are sparse, depth tested, absent on coal and fully disposed', () => {
  for (const kind of ['diamond', 'gold', 'coal'] as OreKind[]) {
    const preset = TREE_PRESETS.hyrule_rock;
    const instance = createTree({ ...preset, rock: { ...preset.rock!, ore: kind, oreCount: 24 } });
    const sprites: THREE.Sprite[] = [];
    instance.group.traverse(o => { if (o.name === 'OrePixelSparkle') sprites.push(o as THREE.Sprite); });
    assert.equal(sprites.length, kind === 'coal' ? 0 : 3);
    const resources = new Set<THREE.Material | THREE.Texture>();
    for (const sprite of sprites) {
      assert.ok(sprite.userData.excludeFromOBJ);
      assert.equal(sprite.material.depthTest, true);
      assert.equal(sprite.material.depthWrite, false);
      const map = sprite.material.map!;
      assert.equal((map.image as { width: number }).width, 9);
      assert.equal(map.magFilter, THREE.NearestFilter);
      const pixels = (map.image as { data: Uint8Array }).data;
      assert.equal(pixels[3], 0, 'corners must remain transparent');
      assert.equal(pixels[(4 * 9 + 4) * 4 + 3], 255, 'cross centre must remain crisp');
      resources.add(sprite.material); resources.add(map);
    }
    let released = 0;
    resources.forEach(resource => resource.addEventListener('dispose', () => released++));
    instance.dispose();
    assert.equal(released, resources.size);
  }
});

test('all fifteen ores have distinct authored palettes and readable names', () => {
  const palettes = new Set<string>();
  for (const kind of kinds) {
    const style = ORE_STYLES[kind];
    assert.ok(style, `${kind} must be available in the ore selector`);
    assert.ok(style.name && style.description);
    assert.equal(style.colors.length, 6);
    assert.equal(new Set(style.colors).size, 6);
    palettes.add(style.colors.join(','));
  }
  assert.equal(palettes.size, 15, 'each ore needs its own color ramp');
});

test('ore presets form a separate category for every existing rock biome', () => {
  for (const biome of Object.keys(ROCK_BIOMES)) {
    const plain = TREE_PRESETS[`${biome}_rock`], ore = TREE_PRESETS[`${biome}_ore`];
    assert.ok(ore, `${biome} needs an ore preset`);
    assert.equal(plain.rock!.ore, undefined);
    assert.ok(ore.rock!.ore);
    assert.equal(ore.rock!.biome, plain.rock!.biome);
    assert.equal(ore.growthStage, 'rock');
    assert.equal(rockBiomeForSpecies(ore.species), biome);
  }
});

test('deposits are seeded, anchored to real stone and independent of the base geometry', () => {
  for (const kind of kinds) {
    const preset = TREE_PRESETS.hyrule_rock;
    const config = { ...preset, rock: { ...preset.rock!, ore: kind, oreCount: 6, oreSize: 0.3 } };
    const first = createTree(config), second = createTree(config), plain = createTree(preset);
    const stone = first.group.getObjectByName('Rock_1') as THREE.Mesh;
    assert.deepEqual(Array.from(stone.geometry.attributes.position.array), Array.from((plain.group.getObjectByName('Rock_1') as THREE.Mesh).geometry.attributes.position.array));
    const deposits = first.group.getObjectByName('OreDeposits')!;
    assert.ok(deposits, 'ore must create real geometry');
    assert.equal(deposits.children.length, 6);
    const snapshot = (object: THREE.Object3D) => {
      const vertices: number[][] = [];
      object.traverse(o => { if (o instanceof THREE.Mesh) vertices.push(Array.from(o.geometry.attributes.position.array), o.position.toArray(), o.quaternion.toArray()); });
      return vertices;
    };
    assert.deepEqual(snapshot(deposits), snapshot(second.group.getObjectByName('OreDeposits')!));
    for (const deposit of deposits.children) {
      const point = deposit.userData.surfacePoint as THREE.Vector3;
      const normal = deposit.userData.surfaceNormal as THREE.Vector3;
      const ray = new THREE.Raycaster(point.clone().addScaledVector(normal, 0.1), normal.clone().negate());
      assert.ok(ray.intersectObject(stone, false).some(hit => hit.point.distanceTo(point) < 0.001), 'deposit must touch the real rock');
      assert.ok(point.y > 0.03, 'ore cannot grow under the ground');
    }
    const asset = first.group.getObjectByName('RockAsset') as THREE.Group;
    assert.match(new OBJExporter().parse(asset), /o Ore_/);
    assert.equal(first.barkMaterial.uniforms.uOreCount.value, 6);
    const oreResources = new Set<THREE.BufferGeometry | THREE.Material | THREE.Texture>();
    deposits.traverse(o => {
      if (!(o instanceof THREE.Mesh)) return;
      assert.ok(Array.from(o.geometry.attributes.position.array).every(Number.isFinite));
      oreResources.add(o.geometry);
      const m = o.material as THREE.ShaderMaterial;
      oreResources.add(m); oreResources.add(m.uniforms.uOrePalette.value);
    });
    let released = 0;
    oreResources.forEach(r => r.addEventListener('dispose', () => released++));
    first.dispose(); second.dispose(); plain.dispose();
    assert.equal(released, oreResources.size, `${kind} must release all its GPU resources`);
  }
});

test('ore count and size controls work and all added GPU resources are released', () => {
  const preset = TREE_PRESETS.hyrule_rock;
  const make = (oreCount: number, oreSize: number) => createTree({ ...preset, rock: { ...preset.rock!, ore: 'quartz', oreCount, oreSize } });
  const small = make(3, 0.2), large = make(3, 0.6), more = make(9, 0.2), none = make(0, 0.2);
  assert.equal(more.group.getObjectByName('OreDeposits')!.children.length, 9);
  assert.ok(!none.group.getObjectByName('OreDeposits'));
  const size = (instance: typeof small) => new THREE.Box3().setFromObject(instance.group.getObjectByName('OreDeposits')!.children[0]).getSize(new THREE.Vector3()).length();
  assert.ok(size(large) > size(small) * 1.8);
  const resources = new Set<THREE.BufferGeometry | THREE.Material | THREE.Texture>();
  small.group.traverse(o => {
    if (!(o instanceof THREE.Mesh)) return;
    assert.ok(Array.from(o.geometry.attributes.position.array).every(Number.isFinite));
    resources.add(o.geometry);
    for (const m of Array.isArray(o.material) ? o.material : [o.material]) {
      resources.add(m);
      if (m instanceof THREE.ShaderMaterial) for (const u of Object.values(m.uniforms)) if (u.value instanceof THREE.Texture) resources.add(u.value);
    }
  });
  let disposed = 0;
  resources.forEach(r => r.addEventListener('dispose', () => disposed++));
  small.dispose(); assert.equal(disposed, resources.size);
  large.dispose(); more.dispose(); none.dispose();
});
