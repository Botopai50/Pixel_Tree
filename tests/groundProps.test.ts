import assert from 'node:assert/strict';
import { test } from 'node:test';
import * as THREE from 'three';
import { TREE_PRESETS } from '../src/constants/presets';
import { createTree } from '../src/services/treeGenerator';
import { ROCK_BIOMES } from '../src/constants/rockBiomes';
import { geometryExportGroup } from '../src/services/exportService';
import { OBJExporter } from 'three/examples/jsm/exporters/OBJExporter.js';
import { buildPixelSaplingLeafPixels } from '../src/services/pixelArtTextureSystem';

test('standalone props have twelve biome presets per category and deterministic 3D assets', () => {
  for (const kind of ['flowers', 'crystals', 'leaves']) for (const biome of Object.keys(ROCK_BIOMES)) {
    const preset = (TREE_PRESETS as any)[`${biome}_${kind}`];
    assert.ok(preset, `${biome}_${kind} preset`);
    const first = createTree(preset), second = createTree(preset);
    const asset = first.group.getObjectByName('RockAsset')!;
    assert.equal(asset.children.length, preset.prop.count);
    assert.deepEqual(asset.toJSON().object.children?.map((o: any) => o.matrix), second.group.getObjectByName('RockAsset')!.toJSON().object.children?.map((o: any) => o.matrix));
    const meshPositions = (group: THREE.Object3D) => {
      const result: number[][] = [];
      group.traverse(o => { if (o instanceof THREE.Mesh) result.push(Array.from(o.geometry.attributes.position.array)); });
      return result;
    };
    assert.deepEqual(meshPositions(asset), meshPositions(second.group.getObjectByName('RockAsset')!));
    assert.ok(meshPositions(asset).length > 0);
    if (kind === 'leaves') assert.ok(new THREE.Box3().setFromObject(asset).min.y >= -1e-6, 'folded leaves stay above the soil');
    assert.ok(new OBJExporter().parse(geometryExportGroup(asset as THREE.Group)).includes('\nv '));
    first.dispose(); second.dispose();
  }
});

test('empty props and maximum controls keep finite framing and dispose asset resources', () => {
  for (const kind of ['flowers', 'crystals', 'leaves']) {
    const preset = (TREE_PRESETS as any)[`hyrule_${kind}`];
    assert.ok(preset);
    const empty = createTree({ ...preset, prop: { ...preset.prop, count: 0 } });
    assert.equal(empty.group.getObjectByName('RockAsset')!.children.length, 0);
    assert.ok(Number.isFinite(new THREE.Box3().setFromObject(empty.group).getSize(new THREE.Vector3()).length()));
    empty.dispose();
    const full = createTree({ ...preset, prop: { ...preset.prop, count: 16, size: 1.2, spread: 2.5 } });
    const asset = full.group.getObjectByName('RockAsset')!;
    const ground = full.group.getObjectByName('GroundMound') as THREE.Mesh;
    const radius = (ground.geometry as THREE.CylinderGeometry).parameters.radiusTop;
    const box = new THREE.Box3().setFromObject(asset);
    assert.ok(Math.hypot(Math.max(Math.abs(box.min.x), Math.abs(box.max.x)), Math.max(Math.abs(box.min.z), Math.abs(box.max.z))) < radius);
    let disposed = 0;
    const geometries = new Set<THREE.BufferGeometry>();
    asset.traverse(o => { if (o instanceof THREE.Mesh) geometries.add(o.geometry); });
    geometries.forEach(g => g.addEventListener('dispose', () => disposed++));
    full.dispose();
    assert.equal(disposed, geometries.size);
  }
});

test('dry leaf piles vary the curl while retaining their biome silhouette and painted veins', () => {
  const instance = createTree(TREE_PRESETS.hyrule_leaves);
  const shapes = new Set<string>();
  const geometries = new Set<THREE.BufferGeometry>();
  instance.group.traverse(object => {
    if (!(object instanceof THREE.Mesh) || object.name !== 'DryLeaf') return;
    const material = object.material as THREE.ShaderMaterial;
    const texture = material.uniforms.uLeafMap?.value as THREE.DataTexture;
    assert.ok(texture, 'dry leaves need authored leaf painting instead of the generic petal material');
    assert.equal(texture.image.width, 16);
    assert.equal(texture.magFilter, THREE.NearestFilter);
    assert.ok(object.geometry.userData.hasPetiole, 'each shape includes a narrow stalk');
    shapes.add(object.geometry.userData.leafShape);
    geometries.add(object.geometry);
    const positions = object.geometry.attributes.position;
    const heights = Array.from({length:positions.count}, (_,i)=>positions.getY(i));
    assert.ok(Math.max(...heights) - Math.min(...heights) > .02, 'leaf curls retain 3D volume');
  });
  assert.deepEqual([...shapes], ['oak'], 'Hyrule piles retain lobed oak leaves');
  assert.equal(new Set([...geometries].map(g => Array.from(g.attributes.position.array).join(','))).size, 3, 'three different curls preserve variety');
  instance.dispose();
});

test('every dry leaf in a pile belongs to its biome leaf family', () => {
  const expected = {
    hyrule: 'oak', satori: 'ovate', akkala: 'serrated', hebra: 'needles',
    hebra_snowy: 'needles', faron: 'lance', korok: 'round', swamp: 'ellipse',
    gerudo: 'pinnate', savanna: 'pinnate', withered: 'oak', tundra: 'ovate',
  };
  for (const [biome, shape] of Object.entries(expected)) {
    const instance = createTree((TREE_PRESETS as any)[`${biome}_leaves`]);
    let count = 0;
    instance.group.traverse(object => {
      if (!(object instanceof THREE.Mesh) || object.name !== 'DryLeaf') return;
      assert.equal(object.geometry.userData.leafShape, shape, `${biome} leaf ${count++}`);
    });
    assert.ok(count > 0);
    instance.dispose();
  }
});

test('dry leaves reuse the sapling silhouette and authored vein pixels', () => {
  const instance = createTree(TREE_PRESETS.akkala_leaves);
  const leaf = instance.group.getObjectByName('DryLeaf') as THREE.Mesh;
  const material = leaf.material as THREE.ShaderMaterial;
  const source = buildPixelSaplingLeafPixels({ ...TREE_PRESETS.akkala_leaves, species: 'akkala_birch_sapling' });
  const texture = material.uniforms.uLeafMap.value as THREE.DataTexture;
  assert.equal(texture.image.height, source.height);
  for (let y = 0; y < source.height; y++) for (let x = 0; x < source.width; x++) {
    const original = ((source.height - 1 - y) * source.width + x) * 4;
    const dry = (y * source.width + x) * 4;
    assert.equal(texture.image.data[dry], source.pixels[original], 'same painted tone, including veins');
    assert.equal(texture.image.data[dry + 3], source.pixels[original + 3], 'same silhouette');
  }
  instance.dispose();
});
