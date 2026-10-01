import assert from 'node:assert/strict';
import { test } from 'node:test';
import * as THREE from 'three';
import { OBJExporter } from 'three/examples/jsm/exporters/OBJExporter.js';
import { TREE_PRESETS } from '../src/constants/presets';
import { createTree } from '../src/services/treeGenerator';

test('standalone gravel is seeded, grounded, exported and fully disposed', () => {
  const preset = TREE_PRESETS.hyrule_gravel;
  const config = { ...preset, rock: { ...preset.rock!, gravel: true, gravelCount: 6 } };
  const first = createTree(config), second = createTree(config);
  const bare = createTree(TREE_PRESETS.hyrule_rock);
  const gravel = first.group.getObjectByName('RockGravel')!;
  assert.ok(gravel && gravel.children.length >= 18);
  assert.ok(!bare.group.getObjectByName('RockGravel'));
  const snapshot = (group: THREE.Object3D) => group.children.map(o => [o.position.toArray(), Array.from((o as THREE.Mesh).geometry.attributes.position.array)]);
  assert.deepEqual(snapshot(gravel), snapshot(second.group.getObjectByName('RockGravel')!));
  assert.ok(!first.group.getObjectByName('Rock_1'), 'the gravel category must not contain a large rock');
  const island = first.group.getObjectByName('GroundMound') as THREE.Mesh<THREE.CylinderGeometry>;
  for (const pebble of gravel.children) {
    const box = new THREE.Box3().setFromObject(pebble);
    assert.ok(Math.abs(box.min.y) < 0.00001);
    assert.ok(box.max.y < 0.4);
    assert.ok(Math.hypot(pebble.position.x, pebble.position.z) < island.geometry.parameters.radiusTop);
  }
  assert.match(new OBJExporter().parse(first.group.getObjectByName('RockAsset')!), /o Pebble_/);
  const resources = new Set<THREE.BufferGeometry | THREE.Material | THREE.Texture>();
  gravel.traverse(o => {
    if (!(o instanceof THREE.Mesh)) return;
    resources.add(o.geometry); resources.add(o.material);
    for (const uniform of Object.values((o.material as THREE.ShaderMaterial).uniforms)) if (uniform.value instanceof THREE.Texture) resources.add(uniform.value);
  });
  let disposed = 0;
  resources.forEach(resource => resource.addEventListener('dispose', () => disposed++));
  first.dispose(); assert.equal(disposed, resources.size);
  second.dispose(); bare.dispose();
});

test('all biomes share the stone palette and gravel controls alter the scatter', () => {
  const presets = Object.values(TREE_PRESETS).filter(p => p.species.endsWith('_gravel'));
  assert.equal(presets.length, 12);
  for (const preset of presets) {
    const first = createTree({ ...preset, rock: { ...preset.rock!, gravel: true, gravelCount: 2, gravelSize: 0.12 } });
    const second = createTree({ ...preset, rock: { ...preset.rock!, gravel: true, gravelCount: 8, gravelSize: 0.28, gravelSpread: 1.5 } });
    const a = first.group.getObjectByName('RockGravel')!, b = second.group.getObjectByName('RockGravel')!;
    assert.ok(b.children.length > a.children.length);
    const mat = (a.children[0] as THREE.Mesh).material as THREE.ShaderMaterial;
    assert.deepEqual(mat.uniforms.uPalette.value.image.data, first.barkMaterial.uniforms.uPalette.value.image.data);
    first.dispose(); second.dispose();
  }
});

test('zero gravel groups leave a finite empty presentation island', () => {
  const preset = TREE_PRESETS.hyrule_gravel;
  const instance = createTree({ ...preset, rock: { ...preset.rock!, gravelCount: 0 } });
  assert.ok(!instance.group.getObjectByName('RockGravel'));
  const bounds = new THREE.Box3().setFromObject(instance.group);
  assert.ok([...bounds.min.toArray(), ...bounds.max.toArray()].every(Number.isFinite));
  instance.dispose();
});
