import assert from 'node:assert/strict';
import { test } from 'node:test';
import * as THREE from 'three';
import { TREE_PRESETS } from '../src/constants/presets';
import { createTree } from '../src/services/treeGenerator';
import { ROCK_BIOMES } from '../src/constants/rockBiomes';
import { geometryExportGroup } from '../src/services/exportService';
import { OBJExporter } from 'three/examples/jsm/exporters/OBJExporter.js';

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
