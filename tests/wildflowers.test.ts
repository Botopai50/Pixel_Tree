import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { TREE_PRESETS } from '../src/constants/presets';
import { createTree } from '../src/services/treeGenerator';

test('wildflower biomes have distinct botanical silhouettes and authored pixel painting', () => {
  const structures=new Set<string>();
  for(const biome of ['hyrule','satori','akkala','hebra','hebra_snowy','faron','korok','swamp','gerudo','savanna','withered','tundra']) {
    const instance=createTree({...((TREE_PRESETS as any)[`${biome}_flowers`]),seed:4142});
    const plant=instance.group.getObjectByName('Wildflower')!;
    assert.ok(plant.userData.flowerFamily, `${biome}: explicit botanical family`);
    const sizes:number[][]=[];
    plant.traverse(o=>{if(o instanceof THREE.Mesh){o.geometry.computeBoundingBox();sizes.push(o.geometry.boundingBox!.getSize(new THREE.Vector3()).multiply(o.scale).toArray());}});
    structures.add(JSON.stringify(sizes));
    const head=plant.getObjectByName('PixelWildflowerBloom') as THREE.Mesh;
    assert.ok(head,`${biome}: a painted blossom rather than repeated generic leaves`);
    assert.ok(head.geometry.attributes.ink,'petal folds and pollen painted on a single grid');
    assert.ok((head.material as THREE.ShaderMaterial).uniforms.uFlowerPalette);
    instance.dispose();
  }
  assert.equal(structures.size,12,'biome variety includes silhouette, size, foliage and flower arrangement');
});
