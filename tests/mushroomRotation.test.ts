import assert from 'node:assert/strict';
import { test } from 'node:test';
import * as THREE from 'three';
import { limitMushroomPitch, treeMushroomCard } from '../src/services/mushroomRotation';
import { mushroomDataTexture, MUSHROOM_FOOT } from '../src/services/pixelSprites';

test('tree cards preserve the existing pixel silhouette and exclude stalks from collision', () => {
  const texture = mushroomDataTexture();
  const mask = texture.userData.capMask as Uint8Array;
  assert.equal(mask[6], 0, 'stalk foot is excluded');
  assert.ok(mask.some(value => value === 1));
  const fungus = treeMushroomCard(texture, 0.4, MUSHROOM_FOOT, new THREE.Vector3(1, 0, 0), new THREE.Vector3(1, 0, 0));
  const card = fungus.holder.children[0] as THREE.Mesh;
  assert.equal((card.material as THREE.MeshBasicMaterial).map, texture);
  assert.equal(texture.image.width, 16);
  assert.equal(card.userData.contactTolerance, 0);
  assert.ok(card.userData.collisionPoints.every((p: THREE.Vector3) => p.y > 0), 'stem pixels never constrain rotation');
  assert.ok(card.userData.excludeFromOBJ);
  fungus.geometry.dispose(); fungus.material.dispose(); texture.dispose();
});

test('mushroom collision limits pitch, leaves yaw free and resumes at clear views', () => {
  const card = new THREE.Mesh(new THREE.PlaneGeometry(), new THREE.MeshBasicMaterial());
  const parent = new THREE.Group(); parent.add(card);
  card.position.z = 0.008;
  const points = [new THREE.Vector3(-0.3, 0.6, 0), new THREE.Vector3(0.3, 0.6, 0)];
  limitMushroomPitch(card, new THREE.Vector3(0, 0, 1), 0.4, points, 0.008, 16);
  const camera = new THREE.PerspectiveCamera();
  const render = (pitch: number, yaw: number) => {
    camera.quaternion.setFromEuler(new THREE.Euler(pitch, yaw, 0, 'YXZ'));
    camera.updateMatrixWorld();
    card.onBeforeRender(null as any, new THREE.Scene(), camera, card.geometry, card.material, null as any);
    return new THREE.Euler().setFromQuaternion(card.getWorldQuaternion(new THREE.Quaternion()), 'YXZ');
  };
  const tilted = render(-0.9, 0.6);
  assert.ok(Math.abs(tilted.y - 0.6) < 0.00001, 'horizontal turn must follow the camera even at collision');
  assert.ok(tilted.x > -0.9, 'downward pitch must stop at the cap');
  const tolerance = 0;
  const baseline = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0.6, 0, 'YXZ'));
  for (const point of points) {
    const distance = point.clone().multiplyScalar(0.4).applyQuaternion(card.quaternion).z + 0.008;
    const initial = point.clone().multiplyScalar(0.4).applyQuaternion(baseline).z + 0.008;
    assert.ok(distance >= Math.min(-tolerance, initial) - 0.0001);
  }
  for (const yaw of [-2, -1, 0, 1, 2]) {
    const side = render(0, yaw);
    assert.ok(Math.abs(side.y - yaw) < 0.00001, 'lateral rotation must never freeze');
  }
  const resumed = render(0.2, 0);
  assert.ok(Math.abs(resumed.x - 0.2) < 0.00001);
  card.geometry.dispose(); card.material.dispose();
});
