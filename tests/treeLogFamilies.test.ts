import './treeCanvasFixture';
import assert from 'node:assert/strict';
import test from 'node:test';
import * as THREE from 'three';
import { TREE_PRESETS } from '../src/constants/presets';
import { buildProceduralLog, logKindOf } from '../src/services/logGenerator';
import { structureStreams } from '../src/structures/random';

test('every woody tree has four renderable deadwood forms with its own bark', () => {
  const trees = Object.values(TREE_PRESETS).filter(p =>
    p.id !== 'gerudo_cactus' && (p.growthStage === 'adult' || p.growthStage === undefined));
  const forms = ['fallen_log', 'hollow_log', 'rooted_log', 'tree_stump'] as const;
  assert.equal(trees.length, 13);
  for (const form of forms) assert.equal(TREE_PRESETS[`${form}_gerudo_cactus`], undefined);
  for (const tree of trees) {
    for (const form of forms) {
      const id = `${form}_${tree.id}`;
      const preset = TREE_PRESETS[id];
      assert.ok(preset, id);
      assert.equal(preset.growthStage, 'log');
      assert.equal(preset.barkColor, tree.barkColor);
      assert.equal(preset.barkStyle, tree.barkStyle);
      if (tree.id === 'faron_palm') {
        assert.ok(preset.trunkRadiusTop >= preset.trunkRadiusBase * 0.92);
        assert.equal(preset.branchCount, 0);
      }
      if (tree.id.startsWith('hebra_pine')) {
        assert.ok(preset.trunkRadiusTop >= preset.trunkRadiusBase * 0.7);
      }
      assert.equal(logKindOf(preset), form === 'tree_stump' ? 'stump' : form.replace('_log', ''));
      const bark = new THREE.MeshBasicMaterial();
      const result = buildProceduralLog(
        { ...preset, showMushrooms: false, mushroomCount: 0 },
        bark,
        structureStreams(preset.seed).streamFor('architecture', 'log')
      );
      const wood = result.group.getObjectByName('BotW_LogWood') as THREE.Mesh;
      const grain = result.group.getObjectByName('BotW_LogEndGrain') as THREE.Mesh;
      assert.ok(wood?.geometry.getAttribute('position').count > 0, id);
      assert.ok(grain?.geometry.getAttribute('position').count > 0, id);
      if (form === 'rooted_log' && ['faron_palm', 'swamp_mangrove'].includes(tree.id)) {
        assert.equal(result.group.getObjectByName('RootPlateSoil'), undefined, id);
      }
      result.geometriesToDispose.forEach(g => g.dispose());
      result.materialsToDispose.forEach(m => m.dispose());
      result.texturesToDispose.forEach(t => t.dispose());
      bark.dispose();
    }
  }
});
