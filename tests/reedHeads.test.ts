import assert from 'node:assert/strict';
import { test } from 'node:test';
import * as THREE from 'three';
import { createReedHeadResources, faceCameraHorizontally } from '../src/services/reedHeadSprite';

test('reed heads retain sharp transparent pixels and follow only camera yaw', () => {
  const { geometry, texture } = createReedHeadResources(1);
  assert.equal(texture.magFilter, THREE.NearestFilter);
  assert.equal(texture.generateMipmaps, false);
  const pixels = texture.image.data as Uint8Array;
  assert.ok(pixels.some((v, i) => i % 4 === 3 && v === 0));
  assert.ok(pixels.some((v, i) => i % 4 === 3 && v === 255));
  const card = new THREE.Mesh(geometry);
  const parent = new THREE.Group(); parent.rotation.y = .6; parent.add(card); parent.updateMatrixWorld(true);
  const camera = new THREE.PerspectiveCamera();
  const up = new THREE.Vector3(0, 1, 0), forward = new THREE.Vector3(0, 0, 1);
  let previous: THREE.Quaternion | undefined;
  for (const pitch of [-1, 0, 1]) {
    camera.rotation.set(pitch, 1.2, .3, 'YXZ'); camera.updateMatrixWorld(true);
    faceCameraHorizontally(card, camera);
    const q = card.getWorldQuaternion(new THREE.Quaternion());
    assert.ok(up.clone().applyQuaternion(q).distanceTo(up) < 1e-6);
    assert.ok(forward.clone().applyQuaternion(q).distanceTo(new THREE.Vector3(Math.sin(1.2),0,Math.cos(1.2))) < 1e-6);
    if (previous) assert.ok(previous.angleTo(q) < 1e-6);
    previous = q;
  }
  camera.rotation.set(0,-.8,0); camera.updateMatrixWorld(true); faceCameraHorizontally(card,camera);
  assert.ok(previous!.angleTo(card.getWorldQuaternion(new THREE.Quaternion())) > 1);
  geometry.dispose(); texture.dispose();
});

test('a tilted reed head follows its stem axis while ignoring camera pitch', () => {
  const card = new THREE.Mesh(); const parent = new THREE.Group();
  parent.rotation.y = .7; parent.add(card); parent.updateMatrixWorld(true);
  const axis = new THREE.Vector3(.25, 1, -.18).normalize();
  const worldAxis = axis.clone().applyQuaternion(parent.quaternion);
  const camera = new THREE.PerspectiveCamera();
  for (const yaw of [-1.5, 0, 1.5]) {
    let previous: THREE.Quaternion | undefined;
    for (const pitch of [-1, 0, 1]) {
      camera.rotation.set(pitch, yaw, .2, 'YXZ'); camera.updateMatrixWorld(true);
      faceCameraHorizontally(card, camera, axis);
      const q = card.getWorldQuaternion(new THREE.Quaternion());
      assert.ok(new THREE.Vector3(0,1,0).applyQuaternion(q).distanceTo(worldAxis) < 1e-6, 'head length aligns with stem');
      const expectedNormal = new THREE.Vector3(Math.sin(yaw),0,Math.cos(yaw));
      expectedNormal.addScaledVector(worldAxis, -expectedNormal.dot(worldAxis)).normalize();
      assert.ok(new THREE.Vector3(0,0,1).applyQuaternion(q).distanceTo(expectedNormal) < 1e-6);
      if (previous) assert.ok(previous.angleTo(q) < 1e-6, 'camera pitch does not alter authored tilt');
      previous = q;
    }
  }
});
