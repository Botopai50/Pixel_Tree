import assert from 'node:assert/strict';
import { test } from 'node:test';
import * as THREE from 'three';
import { OBJExporter } from 'three/examples/jsm/exporters/OBJExporter.js';
import { TREE_PRESETS } from '../src/constants/presets';
import { createTree } from '../src/services/treeGenerator';
import { rockBiomeForSpecies } from '../src/constants/rockBiomes';
import { mushroomDataTexture, rockMushroomTexture, MUSHROOM_FOOT } from '../src/services/pixelSprites';
import { geometryExportGroup } from '../src/services/exportService';

test('rock mushrooms retain the pixel budget with three distinct silhouettes', () => {
  const original = mushroomDataTexture();
  const alpha = (texture: THREE.DataTexture) => Array.from(texture.image.data).filter((_, i) => i % 4 === 3);
  const silhouettes: number[][] = [];
  for (let variant = 0; variant < 3; variant++) {
    const texture = rockMushroomTexture(variant);
    assert.equal(texture.image.width, 16);
    assert.equal(texture.image.height, 16);
    silhouettes.push(alpha(texture));
    assert.notDeepEqual(alpha(texture), alpha(original), 'stone mushrooms need their own shape');
    assert.equal(texture.magFilter, THREE.NearestFilter);
    const capMask = texture.userData.capMask as Uint8Array;
    assert.ok(capMask?.some(value => value === 1), 'cap needs its own collision mask');
    assert.equal(capMask[6], 0, 'the foot must not stop rotation');
    for (let i = 0; i < capMask.length; i++) if (capMask[i]) assert.equal(texture.image.data[i * 4 + 3], 255);
    texture.dispose();
  }
  assert.equal(MUSHROOM_FOOT.x, 6.5 / 16);
  original.dispose();
  assert.equal(new Set(silhouettes.map(a => a.join(','))).size, 3);
});

test('wet-biome mushrooms are seeded, anchored on stone and independently switchable', () => {
  const preset = TREE_PRESETS.swamp_rock;
  const enabled = { ...preset, rock: { ...preset.rock!, mushrooms: true, mushroomCount: 6, mushroomSize: 0.35 } };
  const first = createTree(enabled);
  const second = createTree(enabled);
  const bare = createTree({ ...enabled, rock: { ...enabled.rock, mushrooms: false } });
  const fungi = (instance: typeof first) => {
    const out: THREE.Mesh<THREE.BufferGeometry, THREE.MeshBasicMaterial>[] = [];
    instance.group.traverse(o => { if (o instanceof THREE.Mesh && o.name.startsWith('RockMushroom')) out.push(o as THREE.Mesh<THREE.BufferGeometry, THREE.MeshBasicMaterial>); });
    return out;
  };
  const mushrooms = fungi(first);
  assert.equal(mushrooms.length, 6);
  assert.equal(fungi(bare).length, 0);
  assert.deepEqual(mushrooms.map(m => m.position.toArray()), fungi(second).map(m => m.position.toArray()));
  const stone = first.group.getObjectByName('Rock_1') as THREE.Mesh;
  const bareStone = bare.group.getObjectByName('Rock_1') as THREE.Mesh;
  assert.deepEqual(Array.from(stone.geometry.attributes.position.array), Array.from(bareStone.geometry.attributes.position.array));
  for (const mushroom of mushrooms) {
    const anchor = mushroom.parent!;
    assert.ok(anchor.userData.surfacePoint && anchor.userData.surfaceNormal);
    assert.ok(anchor.userData.surfaceNormal.y > 0.25);
    const point = anchor.userData.surfacePoint as THREE.Vector3;
    const hits = new THREE.Raycaster(point.clone().add(new THREE.Vector3(0, 1, 0)), new THREE.Vector3(0, -1, 0)).intersectObject(stone, false);
    assert.ok(hits.length && hits[0].point.distanceTo(point) < 0.001, 'foot must touch the actual rock surface');
    const normal = anchor.userData.surfaceNormal as THREE.Vector3;
    const contactTolerance = 0;
    const stoneVertices = stone.geometry.attributes.position;
    for (let v = 0; v < stoneVertices.count; v++) {
      const vertex = stone.localToWorld(new THREE.Vector3().fromBufferAttribute(stoneVertices, v));
      assert.ok(vertex.sub(point).dot(normal) <= 0.0001, 'the stone must remain behind the growth plane');
    }
    const camera = new THREE.PerspectiveCamera();
    for (let angle = 0; angle < Math.PI * 2; angle += Math.PI / 6) {
      camera.position.set(Math.cos(angle) * 8, 6, Math.sin(angle) * 8);
      camera.lookAt(point);
      camera.updateMatrixWorld();
      mushroom.onBeforeRender(null as any, new THREE.Scene(), camera, mushroom.geometry, mushroom.material, null as any);
      first.group.updateMatrixWorld(true);
      const desired = new THREE.Euler().setFromQuaternion(camera.quaternion, 'YXZ');
      const actual = new THREE.Euler().setFromQuaternion(mushroom.getWorldQuaternion(new THREE.Quaternion()), 'YXZ');
      assert.ok(Math.abs(actual.y - desired.y) < 0.00001, 'yaw must remain free on rocks');
      const baseline = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, desired.y, desired.z, 'YXZ'));
      const cardVertices = mushroom.userData.collisionPoints as THREE.Vector3[];
      for (const corner of cardVertices) {
        const vertex = mushroom.localToWorld(corner.clone());
        const sidewaysGap = corner.clone().multiplyScalar(mushroom.scale.x).applyQuaternion(baseline).dot(normal) + mushroom.position.length();
        assert.ok(vertex.sub(point).dot(normal) >= Math.min(-contactTolerance, sidewaysGap) - 0.0001, 'pitch must respect tolerance without constraining yaw');
      }
    }
  }
  const textures = new Set(mushrooms.map(m => m.material.map!));
  const snapshot = geometryExportGroup(first.group.getObjectByName('RockAsset') as THREE.Group);
  assert.ok(!snapshot.getObjectByName(mushrooms[0].name), 'pixel cards remain excluded from geometry-only OBJ');
  assert.ok(first.group.getObjectByName(mushrooms[0].name), 'export must not remove live mushrooms');
  let disposed = 0;
  textures.forEach(t => t.addEventListener('dispose', () => disposed++));
  first.dispose();
  assert.equal(disposed, textures.size);
  second.dispose(); bare.dispose();
});

test('snow uses a restrained four-tone cold palette', () => {
  const instance = createTree(TREE_PRESETS.hebra_snowy_rock);
  const colors = instance.barkMaterial.uniforms.uSnowColors?.value as THREE.Vector3[];
  assert.ok(colors && colors.length === 4, 'snow needs separate rim, shadow, body and light tones');
  for (const color of colors) assert.ok(color.toArray().every(n => Number.isFinite(n) && n >= 0 && n <= 1));
  assert.ok(colors[0].z > colors[0].x, 'rim should be a cold blue grey');
  assert.ok(colors[0].x < 0.3 && colors[0].y < 0.4, 'underside must be dark enough to show snow thickness');
  assert.ok(colors[2].x > 0.75 && colors[2].z > 0.75, 'large snow masses should stay pale');
  assert.ok(colors[3].x - colors[0].x > 0.25, 'snow edges need readable contrast');
  instance.dispose();
});

test('moss coverage normals stay continuous across rock facets', () => {
  const instance = createTree(TREE_PRESETS.swamp_rock);
  const main = instance.group.getObjectByName('RockAsset')!.children[0] as THREE.Mesh;
  const { position, normal, aMossNormal } = main.geometry.attributes;
  assert.ok(aMossNormal, 'moss needs continuous normals independent of flat stone shading');
  const seen = new Map<string, number[]>();
  let differsFromFlat = false;
  for (let i = 0; i < position.count; i++) {
    const key = [position.getX(i), position.getY(i), position.getZ(i)].map(n => n.toFixed(5)).join(',');
    const n = new THREE.Vector3().fromBufferAttribute(aMossNormal, i);
    assert.ok(Math.abs(n.length() - 1) < 0.00001);
    if (n.distanceTo(new THREE.Vector3().fromBufferAttribute(normal, i)) > 0.01) differsFromFlat = true;
    const previous = seen.get(key);
    if (previous) {
      assert.deepEqual(n.toArray(), previous, 'shared corners must have identical moss normals');
    } else seen.set(key, n.toArray());
  }
  assert.ok(differsFromFlat, 'coverage must not inherit flat facet cutoffs');
  instance.dispose();
});

test('rock moss uses the same authored colour ramp as tree bark', () => {
  const preset = TREE_PRESETS.hyrule_rock;
  const instance = createTree({ ...preset, paletteSteps: 6, rock: { ...preset.rock!, mossColor: '#7ba33a' } });
  const palette = instance.barkMaterial.uniforms.uPalette.value as THREE.DataTexture;
  const pixels = Array.from(palette.image.data);
  // Literal fixture from the existing tree-bark moss palette, six steps.
  const expected = [[13,32,10],[33,65,22],[63,104,40],[102,148,57],[145,191,70],[176,207,99]];
  for (let i = 0; i < 6; i++) assert.deepEqual(pixels.slice(i * 4, i * 4 + 3), expected[i]);
  instance.dispose();
});

test('tree and sapling families select compatible rock biomes', () => {
  const fixtures = {
    hyrule_oak: 'hyrule', satori_sakura_sapling: 'satori', akkala_shrub: 'akkala',
    maple_red: 'akkala', hebra_pine: 'hebra', hebra_pine_snowy_sapling: 'hebra_snowy',
    hebra_shrub_snowy: 'hebra_snowy', faron_palm: 'faron', korok_ancient: 'korok',
    swamp_mangrove_sapling: 'swamp', reed_clump: 'swamp', gerudo_cactus: 'gerudo',
    desert_shrub: 'gerudo', savanna_acacia: 'savanna', dry_withered: 'withered', arctic_willow: 'tundra',
  } as const;
  for (const [species, biome] of Object.entries(fixtures)) assert.equal(rockBiomeForSpecies(species as keyof typeof fixtures), biome, species);
});

test('dimensions, face detail, count and coverage settings affect the generated asset', () => {
  const preset = TREE_PRESETS.hyrule_rock;
  for (const shape of ['boulder', 'slab', 'spire', 'cluster'] as const) {
    const instance = createTree({ ...preset, rock: { ...preset.rock!, width: 5, height: 3, depth: 2, shape, detail: 2, count: 4, moss: 0.7, snow: 0.8, cracks: 0.9 } });
    const asset = instance.group.getObjectByName('RockAsset')!;
    assert.equal(asset.children.length, 4);
    const main = asset.children[0] as THREE.Mesh<THREE.BufferGeometry, THREE.ShaderMaterial>;
    const size = new THREE.Box3().setFromObject(main).getSize(new THREE.Vector3());
    assert.ok(Math.abs(size.x - 5) < 0.001);
    assert.ok(Math.abs(size.y - 3) < 0.001);
    assert.ok(Math.abs(size.z - 2) < 0.001);
    assert.ok(main.geometry.attributes.position.count > 60);
    assert.equal(main.material.uniforms.uMoss.value, 0.7);
    assert.equal(main.material.uniforms.uSnow.value, 0.8);
    assert.equal(main.material.uniforms.uCracks.value, 0.9);
    instance.dispose();
  }
});

// A rock preset must produce an independent, seeded, exportable asset.
test('biome rocks are reproducible, sit on the ground and cannot be felled', () => {
  const preset = Object.values(TREE_PRESETS).find(p => p.id === 'hyrule_rock');
  assert.ok(preset, 'Hyrule needs an independent rock preset');
  const first = createTree(preset);
  const second = createTree(preset);
  const asset = first.group.getObjectByName('RockAsset');
  assert.ok(asset, 'rock geometry must be separate from scenery');
  assert.equal(first.canFell, false);
  assert.equal(first.fell?.() ?? null, null);
  const positions = (group: THREE.Object3D) => {
    const out: number[] = [];
    group.traverse(o => { if (o instanceof THREE.Mesh) out.push(...o.geometry.attributes.position.array); });
    return out;
  };
  assert.deepEqual(positions(asset), positions(second.group.getObjectByName('RockAsset')!));
  const bounds = new THREE.Box3().setFromObject(asset);
  assert.ok(Math.abs(bounds.min.y) < 0.001, 'rocks should rest on the surface');
  const main = asset.children[0] as THREE.Mesh;
  const position = main.geometry.attributes.position;
  const contacts: THREE.Vector3[] = [];
  for (let i = 0; i < position.count; i++) if (Math.abs(position.getY(i)) < 0.001) contacts.push(new THREE.Vector3().fromBufferAttribute(position, i));
  const footprint = new THREE.Box3().setFromPoints(contacts).getSize(new THREE.Vector3());
  assert.ok(footprint.x > preset.rock!.width * 0.3 && footprint.z > preset.rock!.depth * 0.3, 'a natural rock needs a broad resting base, not a bottom point');
  const obj = new OBJExporter().parse(asset);
  assert.match(obj, /^v /m);
  assert.match(obj, /^f /m);
  const changed = createTree({ ...preset, seed: preset.seed + 1 });
  assert.notDeepEqual(positions(asset), positions(changed.group.getObjectByName('RockAsset')!));
  first.dispose(); second.dispose(); changed.dispose();
});

test('every biome produces finite geometry and releases its GPU resources', () => {
  const presets = Object.values(TREE_PRESETS).filter(p => (p.growthStage as string) === 'rock');
  assert.ok(presets.length >= 10, 'rocks should cover the tree biomes');
  for (const preset of presets) {
    const instance = createTree(preset);
    const asset = instance.group.getObjectByName('RockAsset');
    assert.ok(asset, preset.name);
    const resources = new Set<THREE.BufferGeometry | THREE.Material | THREE.Texture>();
    instance.group.traverse(o => {
      if (!(o instanceof THREE.Mesh)) return;
      assert.ok(Array.from(o.geometry.attributes.position.array).every(Number.isFinite), preset.name);
      resources.add(o.geometry);
      for (const material of Array.isArray(o.material) ? o.material : [o.material]) {
        resources.add(material);
        if (material instanceof THREE.ShaderMaterial) {
          assert.ok(Number.isFinite(material.uniforms.uSteps.value), 'stone shading needs a finite palette size');
          for (const uniform of Object.values(material.uniforms)) {
            if (uniform.value instanceof THREE.Texture) resources.add(uniform.value);
          }
        }
      }
    });
    let disposed = 0;
    for (const resource of resources) resource.addEventListener('dispose', () => disposed++);
    instance.dispose();
    assert.equal(disposed, resources.size, preset.name);
  }
});
