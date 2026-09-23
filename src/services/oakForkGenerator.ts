import * as THREE from 'three';
import { ConvexGeometry } from 'three/examples/jsm/geometries/ConvexGeometry.js';

import { TreeConfig } from '../types';
import {
  SCANode,
  SCATreeData,
  TreeChain,
  computeChainFrames,
  extractTreeChains,
  chainRepresentativeRadius,
  chainRenderedRadii,
} from './spaceColonization';

const BASE_RING_SEGMENTS = 10;
const BRANCH_RING_SEGMENTS = 8;
const MAX_STRUCTURAL_CHILDREN = 4;

function appendRing(
  points: THREE.Vector3[],
  center: THREE.Vector3,
  direction: THREE.Vector3,
  radius: number,
  segments: number,
  ovalScale = 1
) {
  const tangent = direction.clone().normalize();
  const reference = Math.abs(tangent.y) > 0.9
    ? new THREE.Vector3(1, 0, 0)
    : new THREE.Vector3(0, 1, 0);
  const axisU = new THREE.Vector3().crossVectors(tangent, reference).normalize();
  const axisV = new THREE.Vector3().crossVectors(tangent, axisU).normalize();

  for (let index = 0; index < segments; index++) {
    const angle = (index / segments) * Math.PI * 2;
    points.push(
      center.clone()
        .addScaledVector(axisU, Math.cos(angle) * radius)
        .addScaledVector(axisV, Math.sin(angle) * radius * ovalScale)
    );
  }
}

function followStructuralBranch(start: SCANode, steps: number): SCANode {
  let current = start;
  for (let step = 0; step < steps && current.children.length > 0; step++) {
    current = [...current.children].sort((a, b) =>
      b.radius - a.radius || a.id - b.id
    )[0];
  }
  return current;
}

function findPrimaryFork(config: TreeConfig, data: SCATreeData): SCANode | null {
  const minimumForkY = config.trunkHeight * (config.branchStartHeight ?? 0.4) * 0.85;
  return data.allNodes
    .filter((node) => node.isTrunk && node.children.length >= 2 && node.position.y >= minimumForkY)
    .sort((a, b) => a.position.y - b.position.y || a.id - b.id)[0] ?? null;
}

/**
 * Parameterises the junction blob exactly like the trunk it sits on.
 *
 * A flat box projection (which is all a convex hull gets by default) leaves the
 * bark shader with no radius, no arc length and no azimuth, so it falls back to
 * a UV-space mapping: the junction ends up with its own pixel scale and its own
 * ridge phase, and reads as a patch of a different tree stuck onto the fork.
 *
 * So every vertex is projected onto the trunk's own centre line, and the angle
 * is measured in the trunk's own parallel-transported frame - the same frame
 * buildFullTreeGeometry used - which is what makes the ridges line up and carry
 * straight through the junction.
 */
function applyTrunkParameterisation(
  geometry: THREE.BufferGeometry,
  trunkChain: TreeChain
) {
  const trunkNodes = trunkChain.nodes;
  const position = geometry.getAttribute('position');
  const count = position.count;
  const uvs = new Float32Array(count * 2);
  const wood = new Float32Array(count * 3);
  const angle = new Float32Array(count * 2);

  const { frames } = computeChainFrames(trunkNodes);

  // arc length at each trunk node, and the chain's mean radius: the bark shader
  // derives the ridge count from the latter, and it must be the trunk's value
  const accumulated: number[] = [0];
  for (let i = 1; i < trunkNodes.length; i++) {
    accumulated.push(
      accumulated[i - 1] + trunkNodes[i].position.distanceTo(trunkNodes[i - 1].position)
    );
  }
  // Exactly the trunk's own figure - shared helpers, same inputs, not a second
  // copy of the formula. If these two disagree the junction gets a different
  // ridge count from the trunk it is welded onto, and the ridges stop meeting.
  // The oak is never a swamp tree, so the trunk was built with taper smoothing.
  const meanRadius = chainRepresentativeRadius(trunkNodes, chainRenderedRadii(trunkChain, false));

  const p = new THREE.Vector3();
  const delta = new THREE.Vector3();

  for (let index = 0; index < count; index++) {
    p.set(position.getX(index), position.getY(index), position.getZ(index));

    // nearest trunk node to this vertex
    let best = 0;
    let bestDist = Infinity;
    for (let i = 0; i < trunkNodes.length; i++) {
      const d = p.distanceToSquared(trunkNodes[i].position);
      if (d < bestDist) {
        bestDist = d;
        best = i;
      }
    }

    const frame = frames[best];
    delta.subVectors(p, trunkNodes[best].position);
    const du = delta.dot(frame.u);
    const dv = delta.dot(frame.v);
    const radial = Math.hypot(du, dv);
    const theta = Math.atan2(dv, du);

    uvs[index * 2] = (theta / (Math.PI * 2) + 1) % 1;
    uvs[index * 2 + 1] = accumulated[best] * 0.4;

    wood[index * 3] = Math.max(0.03, radial > 0.01 ? radial : trunkNodes[best].radius);
    wood[index * 3 + 1] = accumulated[best];
    wood[index * 3 + 2] = meanRadius;

    // (cos, sin) rather than the raw angle: the hull's triangles straddle the
    // 0/1 wrap, and an interpolated angle would sweep backwards through the
    // whole pattern there
    angle[index * 2] = radial > 1e-5 ? du / radial : 1;
    angle[index * 2 + 1] = radial > 1e-5 ? dv / radial : 0;
  }

  geometry.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
  geometry.setAttribute('aWood', new THREE.BufferAttribute(wood, 3));
  geometry.setAttribute('aBarkAngle', new THREE.BufferAttribute(angle, 2));
}

export function buildOakForkJunctionGeometry(
  config: TreeConfig,
  data: SCATreeData
): THREE.BufferGeometry | null {
  if (config.species !== 'hyrule_oak') return null;

  const fork = findPrimaryFork(config, data);
  if (!fork) return null;

  const structuralChildren = [...fork.children]
    .sort((a, b) => b.radius - a.radius || a.id - b.id)
    .slice(0, MAX_STRUCTURAL_CHILDREN);
  if (structuralChildren.length < 2) return null;

  let base = fork;
  for (let step = 0; step < 2 && base.parent; step++) base = base.parent;

  const points: THREE.Vector3[] = [];
  appendRing(
    points,
    base.position,
    base.dir,
    Math.max(base.radius, fork.radius * 1.02),
    BASE_RING_SEGMENTS,
    1.04
  );
  appendRing(
    points,
    fork.position,
    fork.dir,
    fork.radius * 1.10,
    BASE_RING_SEGMENTS,
    1.06
  );

  structuralChildren.forEach((child) => {
    const endpoint = followStructuralBranch(child, 2);
    const outward = endpoint.position.clone().sub(fork.position).normalize();

    appendRing(
      points,
      child.position,
      child.dir,
      Math.max(child.radius * 1.18, fork.radius * 0.48),
      BRANCH_RING_SEGMENTS,
      0.92
    );
    appendRing(
      points,
      endpoint.position,
      outward,
      Math.max(endpoint.radius * 1.10, child.radius * 0.88),
      BRANCH_RING_SEGMENTS,
      0.90
    );
  });

  if (points.length < 4) return null;

  // the trunk chain this junction sits on, so the bark can be laid out in the
  // trunk's own frame rather than in the hull's arbitrary one
  const trunkChain = extractTreeChains(data.rootNode).find((c) => c.isTrunk);

  try {
    const geometry = new ConvexGeometry(points);
    geometry.name = 'BotW_OakForkJunctionGeometry';
    geometry.computeVertexNormals();
    if (trunkChain && trunkChain.nodes.length >= 2) {
      applyTrunkParameterisation(geometry, trunkChain);
    }
    geometry.computeBoundingBox();
    geometry.computeBoundingSphere();
    return geometry;
  } catch (err) {
    console.warn('Oak fork junction convex geometry generation fallback:', err);
    return null;
  }
}
