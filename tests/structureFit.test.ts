import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {buildStructurePlan} from '../src/structures/plan';
import {renderStructure} from '../src/structures/renderer';
import {fixture} from './structureFixtures';

const house = () => buildStructurePlan(fixture('house', 6539, {annexes: false, balconies: false}));

test('all four eave corners share complete faces with the sloping fascia', () => {
  const source = fixture('house', 6539, {annexes: false, balconies: false});
  const plan = buildStructurePlan(source), roof = plan.roofs[0];
  const result = renderStructure(plan, {...source.structure, type: 'underground'});
  const bounds = (id: string) => new THREE.Box3().setFromObject(result.assetGroup.getObjectByName(id)!);
  try {
    for (const eave of plan.pieces.filter(p => p.role === 'eave-fascia' && p.support === roof.id)) {
      const eb = bounds(eave.id), left = eave.position[0] < roof.x;
      const outerX = left ? eb.min.x : eb.max.x;
      for (const fascia of plan.pieces.filter(p => p.role === 'roof-fascia' && p.support === roof.id &&
        (left ? p.end![1] > p.position[1] : p.end![1] < p.position[1]))) {
        const fb = bounds(fascia.id), front = fascia.position[2] < roof.z;
        const contactZ = front ? eb.min.z : eb.max.z;
        assert.ok(Math.abs(contactZ - (front ? fb.max.z : fb.min.z)) < 1e-6, 'corner faces leave a gap or overlap');
        const edgeYs = (id: string) => {
          const pos = (result.assetGroup.getObjectByName(id) as THREE.Mesh).geometry.getAttribute('position');
          const ys: number[] = [];
          for (let i = 0; i < pos.count; i++) if (Math.abs(pos.getX(i) - outerX) < 1e-6 && Math.abs(pos.getZ(i) - contactZ) < 1e-6) ys.push(pos.getY(i));
          assert.ok(ys.length >= 2, 'corner is missing its shared outer edge');
          return [Math.min(...ys), Math.max(...ys)];
        };
        const a = edgeYs(eave.id), b = edgeYs(fascia.id);
        assert.ok(a.every((y, i) => Math.abs(y - b[i]) < 1e-6), 'corner profiles do not line up');
      }
    }
  } finally { result.dispose(); }
});

test('brace end faces fit the post and beam without protruding past either joint', () => {
  const source = fixture('house', 6539, {annexes: false, balconies: false});
  const plan = buildStructurePlan(source), roof = plan.roofs[0];
  const brace = plan.pieces.find(p => p.role === 'facade-brace')!;
  const frame = plan.pieces.find(p => p.role === 'wall-frame' && Math.abs(p.position[1] - roof.y) < .3)!;
  const postFace = -roof.width / 2 + .15, beamFace = frame.position[1] - frame.size[0] / 2;
  const result = renderStructure(plan, {...source.structure, type: 'underground'});
  try {
    const mesh = result.assetGroup.getObjectByName(brace.id) as THREE.Mesh;
    const pos = mesh.geometry.getAttribute('position');
    let postContacts = 0, beamContacts = 0;
    for (let i = 0; i < pos.count; i++) {
      assert.ok(pos.getX(i) >= postFace - 1e-6, 'diagonal end cuts through corner post');
      assert.ok(pos.getY(i) <= beamFace + 1e-6, 'diagonal end cuts through top beam');
      if (Math.abs(pos.getX(i) - postFace) < 1e-6) postContacts++;
      if (Math.abs(pos.getY(i) - beamFace) < 1e-6) beamContacts++;
    }
    assert.ok(postContacts >= 4 && beamContacts >= 4, 'brace has no complete contact faces');
  } finally { result.dispose(); }
});

test('ridge cap follows both roof slopes instead of ending in a rectangular block', () => {
  const source = fixture('house', 6539, {annexes: false, balconies: false});
  const plan = buildStructurePlan(source), roof = plan.roofs[0];
  const ridgeX = roof.x - roof.width / 2 + roof.width * roof.ridgeRatio!;
  const cap = plan.pieces.find(p => p.role === 'ridge-cap')!;
  const result = renderStructure(plan, {...source.structure, type: 'underground'});
  try {
    const mesh = result.assetGroup.getObjectByName(cap.id) as THREE.Mesh;
    const pos = mesh.geometry.getAttribute('position');
    const peak: number[] = [], edges: number[] = [];
    for (let i = 0; i < pos.count; i++) {
      (Math.abs(pos.getX(i) - ridgeX) < 1e-6 ? peak : edges).push(pos.getY(i));
    }
    assert.ok(peak.length > 0, 'cap has no pitched apex');
    assert.ok(Math.max(...peak) > Math.max(...edges) + .04, 'cap does not follow the roof pitch');
  } finally { result.dispose(); }
});

test('window trim and mullions meet without overlapping faces or gaps at the aperture', () => {
  const source = fixture('house', 6539, {annexes: false, balconies: false});
  const plan = buildStructurePlan(source), opening = plan.openings.find(o => o.kind === 'window')!;
  const result = renderStructure(plan, {...source.structure, type: 'underground'});
  try {
    const parts = result.assetGroup.children.filter(o => o.name.startsWith(opening.id + '_') && /_(frame|mullion|crossbar|sill)$/.test(o.name));
    for (let i = 0; i < parts.length; i++) for (let j = i + 1; j < parts.length; j++) {
      const overlap = new THREE.Box3().setFromObject(parts[i]).intersect(new THREE.Box3().setFromObject(parts[j]));
      const size = overlap.getSize(new THREE.Vector3());
      assert.ok(size.x * size.y * size.z < 1e-8, 'window members have overlapping faces');
    }
    const recess = result.assetGroup.getObjectByName(opening.id + '_recess') as THREE.Mesh;
    const bounds = new THREE.Box3().setFromObject(recess).getSize(new THREE.Vector3());
    assert.ok(Math.abs(Math.max(bounds.x, bounds.z) - opening.width) < 1e-6, 'pane leaves a light seam around opening');
    assert.ok(Math.abs(bounds.y - opening.height) < 1e-6, 'pane leaves a light seam below the sill');
  } finally { result.dispose(); }
});

test('top wall beams stay below the roof skin instead of crossing the tiles', () => {
  const plan = house();
  const roof = plan.roofs[0];
  const beams = plan.pieces.filter(p => p.role === 'wall-frame' && Math.abs(p.position[1] - roof.y) < .3);
  assert.ok(beams.length > 0);
  for (const beam of beams) {
    assert.ok(beam.position[1] + beam.size[0] / 2 < roof.y,
      `wall beam ${beam.id} protrudes above roof support height`);
  }
});

test('facade braces join the corner post and upper wall beam', () => {
  const plan = house();
  const roof = plan.roofs[0];
  const front = plan.pieces.filter(p => p.role === 'facade-brace' && p.position[2] < -2.9);
  const topFrame = plan.pieces.find(p => p.role === 'wall-frame' && p.position[2] < -roof.depth / 2 + .01 && Math.abs(p.position[1] - roof.y) < .3)!;
  assert.ok(front.length >= 2);
  for (const brace of front) {
    const cornerX = Math.sign(brace.position[0]) * roof.width / 2;
    assert.ok(Math.abs(brace.position[0] - cornerX) < Math.abs(brace.end![0] - cornerX),
      `brace ${brace.id} misses its corner post`);
    assert.ok(brace.end![1] + brace.size[0] / 2 >= topFrame.position[1] - topFrame.size[0] / 2,
      `brace ${brace.id} stops below upper wall beam`);
  }
});

test('ridge cap meets the inner gable fascia faces without passing through them', () => {
  const plan = house();
  const roof = plan.roofs[0];
  const cap = plan.pieces.find(p => p.role === 'ridge-cap')!;
  assert.ok(Math.abs(cap.position[2] - (roof.z - roof.depth / 2 - roof.eaves + .065)) < 1e-6);
  assert.ok(Math.abs(cap.end![2] - (roof.z + roof.depth / 2 + roof.eaves - .065)) < 1e-6);
});

test('window shutters do not intersect their frames', () => {
  const source = fixture('house', 6539, {annexes: false, balconies: false});
  const plan = buildStructurePlan(source);
  const result = renderStructure(plan, {...source.structure, type: 'underground'});
  try {
    const window = plan.openings.find(o => o.kind === 'window')!;
    assert.ok(window);
    const frames = result.assetGroup.children.filter(o => o.name === window.id + '_frame');
    const shutters = result.assetGroup.children.filter(o => o.name === window.id + '_shutter');
    assert.equal(shutters.length, 2);
    for (const shutter of shutters) for (const frame of frames) {
      const shutterBox = new THREE.Box3().setFromObject(shutter);
      const frameBox = new THREE.Box3().setFromObject(frame);
      assert.equal(shutterBox.intersectsBox(frameBox), false, 'shutter intersects window frame');
    }
  } finally {
    result.dispose();
  }
});

test('open shutters have half-window leaves, outward depth and visible hinges', () => {
  const source = fixture('house', 6539, {annexes: false, balconies: false});
  const plan = buildStructurePlan(source);
  const opening = plan.openings.find(o => o.kind === 'window')!;
  opening.shutterAngles = [155,155];
  const result = renderStructure(plan, {...source.structure, type: 'underground'});
  try {
    const opening = plan.openings.find(o => o.kind === 'window')!;
    opening.shutterAngles = [155,155];
    const wall = plan.walls.find(w => w.id === opening.wall)!;
    const along = new THREE.Vector3(...wall.end).sub(new THREE.Vector3(...wall.start)).normalize();
    const outward = new THREE.Vector3(along.z, 0, -along.x);
    const shutters = result.assetGroup.children.filter(o => o.name === opening.id + '_shutter') as THREE.Mesh[];
    assert.equal(shutters.length, 2);
    for (const shutter of shutters) {
      const pos = shutter.geometry.getAttribute('position'), widths: number[] = [], depths: number[] = [];
      for (let i = 0; i < pos.count; i++) {
        const point = new THREE.Vector3().fromBufferAttribute(pos, i);
        widths.push(point.dot(along)); depths.push(point.dot(outward));
      }
      assert.ok(Math.max(...widths) - Math.min(...widths) > opening.width * .40, 'leaf is too narrow to close half the window');
      assert.ok(Math.max(...depths) - Math.min(...depths) > opening.width * .15, 'open leaf lies flat against wall');
      const wallDepth = new THREE.Vector3(...wall.start).dot(outward) + wall.thickness / 2;
      assert.ok(Math.min(...depths) > wallDepth, 'leaf opens into the wall instead of outside');
    }
    assert.equal(result.assetGroup.children.filter(o => o.name === opening.id + '_shutter-hinge').length, 4);
    assert.ok(result.assetGroup.children.filter(o => o.name === opening.id + '_shutter-rail').length >= 4);
  } finally { result.dispose(); }
});
