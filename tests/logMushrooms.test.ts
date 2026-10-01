import assert from 'node:assert/strict';
import { test } from 'node:test';
import * as THREE from 'three';
import { TREE_PRESETS } from '../src/constants/presets';
import { buildProceduralLog } from '../src/services/logGenerator';

test('all log variants attach pitch collision to their existing mushroom pixels', () => {
  // Pixel sprites only need a canvas buffer here; rendering is checked in the browser.
  const original = globalThis.document;
  globalThis.document = { createElement: () => ({ width: 0, height: 0, getContext: () => ({
    createImageData: (w: number, h: number) => ({ data: new Uint8ClampedArray(w * h * 4) }),
    putImageData: () => {},
  }) }) } as any;
  try {
    for (const species of ['fallen_log', 'hollow_log', 'rooted_log', 'tree_stump'] as const) {
      let seed = 123;
      const rnd = () => { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; };
      const bark = new THREE.MeshBasicMaterial();
      const result = buildProceduralLog({ ...TREE_PRESETS[species], showMushrooms: true, mushroomCount: 6 }, bark, rnd);
      const cards: THREE.Mesh[] = [];
      result.group.traverse(obj => { if (obj.userData.collisionPoints) cards.push(obj as THREE.Mesh); });
      assert.ok(cards.length > 0, `${species} mushrooms must have collision control`);
      result.group.updateMatrixWorld(true);
      const camera = new THREE.PerspectiveCamera();
      for (const card of cards) {
        assert.equal(card.userData.contactTolerance, 0);
        assert.ok(card.userData.collisionPoints.length > 0);
        const map = (card.material as THREE.MeshBasicMaterial).map!;
        assert.equal((map.image as { width: number }).width, 16, 'preserve original pixel budget');
        for (const yaw of [-1, 0, 1]) {
          camera.quaternion.setFromEuler(new THREE.Euler(-0.8, yaw, 0, 'YXZ'));
          camera.updateMatrixWorld(true);
          card.onBeforeRender(null as any, new THREE.Scene(), camera, card.geometry, card.material as THREE.Material, null as any);
          const q = card.getWorldQuaternion(new THREE.Quaternion());
          assert.ok(Math.abs(new THREE.Euler().setFromQuaternion(q, 'YXZ').y - yaw) < 1e-5);
          const normal = card.userData.collisionNormal as THREE.Vector3;
          const baseline = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, yaw, 0, 'YXZ'));
          for (const p of card.userData.collisionPoints as THREE.Vector3[]) {
            const distance = p.clone().multiplyScalar(card.scale.x).applyQuaternion(q).dot(normal) + card.userData.collisionClearance;
            const initial = p.clone().multiplyScalar(card.scale.x).applyQuaternion(baseline).dot(normal) + card.userData.collisionClearance;
            assert.ok(distance >= Math.min(0, initial) - 1e-5, 'pitch cannot push the cap deeper into wood');
          }
        }
      }
      result.materialsToDispose.forEach(m => m.dispose());
      result.geometriesToDispose.forEach(g => g.dispose());
      result.texturesToDispose.forEach(t => t.dispose());
      bark.dispose();
    }
  } finally { globalThis.document = original; }
});
