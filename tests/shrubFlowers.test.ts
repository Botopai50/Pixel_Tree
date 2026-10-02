import assert from 'node:assert/strict';
import { test } from 'node:test';
import * as THREE from 'three';
import { TREE_PRESETS } from '../src/constants/presets';
import { buildHangingFruit } from '../src/services/fruitSystem';

test('shrub blossoms share wildflower pixel painting and have biome-specific petal geometry', () => {
  const shapes = new Set<string>();
  for (const species of ['flowering_shrub', 'faron_shrub']) {
    const config = TREE_PRESETS[species as keyof typeof TREE_PRESETS];
    assert.ok(config);
    const parent = { position: new THREE.Vector3(0,.2,0) };
    const data = { crownCenter:new THREE.Vector3(0,.5,0), crownRadiusX:1,crownRadiusY:1,crownRadiusZ:1,
      allNodes:[{position:new THREE.Vector3(.5,.5,0),parent,radius:.02,isTrunk:false}] } as any;
    const result = buildHangingFruit(config,data,{},3,()=>.5,{radius:.09,color:config.accentColor!,perCluster:3,kind:'flower'});
    assert.equal(result.group.children.length,3);
    const head = result.group.children[0] as THREE.Mesh;
    assert.equal(head.name,'PixelShrubBloom');
    assert.equal(head.geometry.userData.pixelGrid,16);
    assert.ok(head.geometry.attributes.ink);
    head.geometry.computeBoundingBox();
    assert.ok(head.geometry.boundingBox!.getSize(new THREE.Vector3()).z > 0,'petals have cup volume');
    const palette = (head.material as THREE.ShaderMaterial).uniforms.uFlowerPalette.value as THREE.Texture;
    assert.equal(palette.magFilter,THREE.NearestFilter);
    shapes.add(JSON.stringify(Array.from(head.geometry.attributes.position.array)));
    assert.ok(result.textures.includes(palette),'owned flower palettes are registered for disposal');
    result.geometries.forEach(g=>g.dispose()); result.materials.forEach(m=>m.dispose()); result.textures.forEach(t=>t.dispose());
  }
  assert.equal(shapes.size,2,'temperate and tropical petals differ in shape');
});
