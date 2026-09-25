import * as THREE from 'three';

/**
 * Felling a generated tree: splits the tree that is already on screen into the
 * stump and the part above it, along a level cut.
 *
 * Nothing is regenerated or swapped for a stock model. Every wood mesh that
 * crosses the cut is sliced: the triangles that straddle the plane are split
 * where they cross it, with every vertex attribute (bark UVs, the wood metrics
 * the pixel bark shader lays its texels out by, normals) interpolated at the
 * crossing. Both halves therefore end on the very same ring of points and the
 * bark runs on across the cut unbroken. The open ends are closed with the
 * growth-ring end grain, built from that same ring.
 *
 * Whole objects (leaves, fruit, mushrooms, the ground) go to the side they lie
 * on; the leaf cards of a crown that reaches below the cut are sorted card by
 * card.
 */

export interface CutResult {
  /** holds everything above the cut; rotate about its origin (the hinge) to fell it */
  pivot: THREE.Group;
  /** height of the cut */
  cutY: number;
  /** where the hinge sits: the edge of the cut face on the side the tree falls */
  hingeX: number;
  /** radius of the trunk at the cut */
  radius: number;
  /** how far the felled part reaches from the cut to its top */
  topLength: number;
  geometries: THREE.BufferGeometry[];
}

interface Segment {
  a: THREE.Vector3;
  b: THREE.Vector3;
}

interface Loop {
  points: THREE.Vector3[];
  centre: THREE.Vector3;
  radius: number;
}

// -----------------------------------------------------------------------------
// Slicing one geometry
// -----------------------------------------------------------------------------

interface SliceOutput {
  below: THREE.BufferGeometry | null;
  above: THREE.BufferGeometry | null;
  /** the cut's trace across the surface, in the geometry's own space */
  segments: Segment[];
}

function sliceGeometry(geo: THREE.BufferGeometry, plane: THREE.Plane): SliceOutput {
  const names = Object.keys(geo.attributes);
  const attrs = names.map((n) => geo.attributes[n] as THREE.BufferAttribute);
  const sizes = attrs.map((a) => a.itemSize);
  const stride = sizes.reduce((s, x) => s + x, 0);
  const posAttr = geo.attributes.position as THREE.BufferAttribute;
  const index = geo.index;
  const triCount = index ? index.count : posAttr.count;

  // every vertex as one flat record of all its attributes
  const readVertex = (i: number): number[] => {
    const out: number[] = new Array(stride);
    let o = 0;
    for (let k = 0; k < attrs.length; k++) {
      const a = attrs[k];
      for (let c = 0; c < sizes[k]; c++) out[o++] = a.getComponent(i, c);
    }
    return out;
  };
  let posOffset = 0;
  for (let k = 0; k < names.length; k++) {
    if (names[k] === 'position') break;
    posOffset += sizes[k];
  }
  const posOf = (v: number[]) => new THREE.Vector3(v[posOffset], v[posOffset + 1], v[posOffset + 2]);

  const below: number[] = [];
  const above: number[] = [];
  const belowGroups: { start: number; count: number; materialIndex: number }[] = [];
  const aboveGroups: { start: number; count: number; materialIndex: number }[] = [];
  const segments: Segment[] = [];

  const ranges = geo.groups.length > 0
    ? geo.groups.map((g) => ({ start: g.start, count: g.count, materialIndex: g.materialIndex ?? 0 }))
    : [{ start: 0, count: triCount, materialIndex: 0 }];

  // the crossing of an edge, always computed from its lower end to its upper
  // end, so the two triangles sharing an edge get the identical point
  const cross = (v0: number[], d0: number, v1: number[], d1: number): number[] => {
    if (d0 > d1) return cross(v1, d1, v0, d0);
    const t = d0 / (d0 - d1);
    const out = new Array(stride);
    for (let c = 0; c < stride; c++) out[c] = v0[c] + (v1[c] - v0[c]) * t;
    return out;
  };

  const emit = (target: number[], poly: number[][]) => {
    for (let i = 1; i + 1 < poly.length; i++) {
      target.push(...poly[0], ...poly[i], ...poly[i + 1]);
    }
  };

  for (const range of ranges) {
    const belowStart = below.length / stride;
    const aboveStart = above.length / stride;
    const end = Math.min(triCount, range.start + range.count);
    for (let t = range.start; t + 2 < end; t += 3) {
      const ids = index ? [index.getX(t), index.getX(t + 1), index.getX(t + 2)] : [t, t + 1, t + 2];
      const vs = ids.map(readVertex);
      const ds = vs.map((v) => plane.distanceToPoint(posOf(v)));
      const neg = ds.map((d) => d < 0);
      if (neg[0] && neg[1] && neg[2]) {
        emit(below, vs);
        continue;
      }
      if (!neg[0] && !neg[1] && !neg[2]) {
        emit(above, vs);
        continue;
      }
      // split: walk the triangle's edges, handing each corner to its side and
      // adding the crossing point to both
      const polyBelow: number[][] = [];
      const polyAbove: number[][] = [];
      const hits: number[][] = [];
      for (let i = 0; i < 3; i++) {
        const j = (i + 1) % 3;
        (neg[i] ? polyBelow : polyAbove).push(vs[i]);
        if (neg[i] !== neg[j]) {
          const x = cross(vs[i], ds[i], vs[j], ds[j]);
          polyBelow.push(x);
          polyAbove.push(x);
          hits.push(x);
        }
      }
      emit(below, polyBelow);
      emit(above, polyAbove);
      if (hits.length === 2) segments.push({ a: posOf(hits[0]), b: posOf(hits[1]) });
    }
    belowGroups.push({ start: belowStart, count: below.length / stride - belowStart, materialIndex: range.materialIndex });
    aboveGroups.push({ start: aboveStart, count: above.length / stride - aboveStart, materialIndex: range.materialIndex });
  }

  const build = (data: number[], groups: typeof belowGroups): THREE.BufferGeometry | null => {
    const n = data.length / stride;
    if (n === 0) return null;
    const g = new THREE.BufferGeometry();
    let o = 0;
    for (let k = 0; k < names.length; k++) {
      const size = sizes[k];
      const src = attrs[k];
      const arr = new Float32Array(n * size);
      for (let v = 0; v < n; v++) {
        for (let c = 0; c < size; c++) arr[v * size + c] = data[v * stride + o + c];
      }
      g.setAttribute(names[k], new THREE.BufferAttribute(arr, size, src.normalized));
      o += size;
    }
    if (geo.groups.length > 0) groups.forEach((gr) => gr.count > 0 && g.addGroup(gr.start, gr.count, gr.materialIndex));
    g.computeBoundingBox();
    g.computeBoundingSphere();
    return g;
  };

  return { below: build(below, belowGroups), above: build(above, aboveGroups), segments };
}

// -----------------------------------------------------------------------------
// Rebuilding the cut outline and closing it
// -----------------------------------------------------------------------------

function chainLoops(segments: Segment[]): Loop[] {
  const key = (p: THREE.Vector3) => `${Math.round(p.x * 2000)},${Math.round(p.y * 2000)},${Math.round(p.z * 2000)}`;
  const adj = new Map<string, { p: THREE.Vector3; next: string[] }>();
  const node = (p: THREE.Vector3) => {
    const k = key(p);
    let n = adj.get(k);
    if (!n) {
      n = { p, next: [] };
      adj.set(k, n);
    }
    return k;
  };
  for (const s of segments) {
    const ka = node(s.a);
    const kb = node(s.b);
    if (ka === kb) continue;
    adj.get(ka)!.next.push(kb);
    adj.get(kb)!.next.push(ka);
  }
  const used = new Set<string>();
  const loops: Loop[] = [];
  for (const start of adj.keys()) {
    if (used.has(start)) continue;
    const pts: THREE.Vector3[] = [];
    let prev = '';
    let cur = start;
    while (cur && !used.has(cur)) {
      used.add(cur);
      const n = adj.get(cur)!;
      pts.push(n.p);
      const nxt = n.next.find((k) => k !== prev && !used.has(k));
      prev = cur;
      cur = nxt ?? '';
    }
    if (pts.length < 3) continue;
    const centre = new THREE.Vector3();
    pts.forEach((p) => centre.add(p));
    centre.multiplyScalar(1 / pts.length);
    let radius = 0;
    pts.forEach((p) => (radius = Math.max(radius, Math.hypot(p.x - centre.x, p.z - centre.z))));
    loops.push({ points: pts, centre, radius });
  }
  return loops;
}

/** Closes each loop with a fan from its middle, facing up or down. */
function buildCap(loops: Loop[], cutY: number, facingUp: boolean): THREE.BufferGeometry {
  const pos: number[] = [];
  const uv: number[] = [];
  const nrm: number[] = [];
  const ny = facingUp ? 1 : -1;
  for (const loop of loops) {
    const r = Math.max(loop.radius, 1e-3);
    const c = loop.centre;
    const n = loop.points.length;
    for (let i = 0; i < n; i++) {
      const a = loop.points[i];
      const b = loop.points[(i + 1) % n];
      // wind each triangle so it faces the right way
      const cross = (a.x - c.x) * (b.z - c.z) - (a.z - c.z) * (b.x - c.x);
      const [p, q] = (cross < 0) === facingUp ? [a, b] : [b, a];
      for (const v of [c, p, q]) {
        pos.push(v.x, cutY, v.z);
        uv.push(0.5 + 0.5 * (v.x - c.x) / r, 0.5 + 0.5 * (v.z - c.z) / r);
        nrm.push(0, ny, 0);
      }
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nrm, 3));
  return g;
}

// -----------------------------------------------------------------------------
// Sorting the tree's objects
// -----------------------------------------------------------------------------

function isLeafLike(material: THREE.Material | THREE.Material[]): boolean {
  const list = Array.isArray(material) ? material : [material];
  return list.some((m) => {
    const sm = m as THREE.ShaderMaterial;
    return m.side === THREE.DoubleSide || m.transparent || m.alphaTest > 0 || !!sm.uniforms?.uAlphaTest;
  });
}

/** Splits a crowd of leaf cards card by card. */
function splitInstanced(
  mesh: THREE.InstancedMesh,
  cutY: number,
  geometries: THREE.BufferGeometry[]
): { below: THREE.InstancedMesh | null; above: THREE.InstancedMesh | null } {
  const m = new THREE.Matrix4();
  const w = new THREE.Matrix4();
  const p = new THREE.Vector3();
  const lowIds: number[] = [];
  const highIds: number[] = [];
  for (let i = 0; i < mesh.count; i++) {
    mesh.getMatrixAt(i, m);
    w.multiplyMatrices(mesh.matrixWorld, m);
    p.setFromMatrixPosition(w);
    (p.y < cutY ? lowIds : highIds).push(i);
  }
  const make = (ids: number[]): THREE.InstancedMesh | null => {
    if (ids.length === 0) return null;
    const geo = mesh.geometry.clone();
    for (const name of Object.keys(geo.attributes)) {
      const a = geo.attributes[name];
      if (!(a instanceof THREE.InstancedBufferAttribute)) continue;
      const arr = new Float32Array(ids.length * a.itemSize);
      ids.forEach((id, k) => {
        for (let c = 0; c < a.itemSize; c++) arr[k * a.itemSize + c] = a.getComponent(id, c);
      });
      geo.setAttribute(name, new THREE.InstancedBufferAttribute(arr, a.itemSize, a.normalized, a.meshPerAttribute));
    }
    geometries.push(geo);
    const out = new THREE.InstancedMesh(geo, mesh.material, ids.length);
    ids.forEach((id, k) => {
      mesh.getMatrixAt(id, m);
      out.setMatrixAt(k, m);
      if (mesh.instanceColor) {
        const col = new THREE.Color();
        mesh.getColorAt(id, col);
        out.setColorAt(k, col);
      }
    });
    out.name = mesh.name;
    out.castShadow = mesh.castShadow;
    out.receiveShadow = mesh.receiveShadow;
    out.frustumCulled = mesh.frustumCulled;
    out.renderOrder = mesh.renderOrder;
    return out;
  };
  return { below: make(lowIds), above: make(highIds) };
}

// -----------------------------------------------------------------------------
// The cut
// -----------------------------------------------------------------------------

/**
 * Splits `root` (a generated tree, standing at the origin) at height `cutY`.
 * Everything below stays in `root`; everything above is moved into the
 * returned pivot, which sits on the hinge at the edge of the cut on the +X
 * side. The pivot starts unrotated: the tree still looks whole until it is
 * turned.
 */
export function cutTree(root: THREE.Object3D, cutY: number, endGrain: THREE.Material): CutResult {
  root.updateMatrixWorld(true);
  const geometries: THREE.BufferGeometry[] = [];

  const below = new THREE.Group();
  below.name = 'Cut_Stump';
  const above = new THREE.Group();
  above.name = 'Cut_Top';
  root.add(below, above);
  root.updateMatrixWorld(true);

  const worldPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -cutY);
  const allSegments: Segment[] = [];
  const box = new THREE.Box3();
  const size = new THREE.Vector3();
  const centre = new THREE.Vector3();

  const place = (o: THREE.Object3D, group: THREE.Group) => group.attach(o);

  const cloneMeshWith = (src: THREE.Mesh, geo: THREE.BufferGeometry) => {
    const m = new THREE.Mesh(geo, src.material);
    m.name = src.name;
    m.castShadow = src.castShadow;
    m.receiveShadow = src.receiveShadow;
    m.renderOrder = src.renderOrder;
    m.frustumCulled = src.frustumCulled;
    src.matrixWorld.decompose(m.position, m.quaternion, m.scale);
    return m;
  };

  const sort = (o: THREE.Object3D) => {
    if (o === below || o === above) return;
    if (o.userData.ground) {
      place(o, below);
      return;
    }
    box.setFromObject(o);
    if (box.isEmpty()) {
      place(o, below);
      return;
    }
    if (box.max.y <= cutY + 1e-4) {
      place(o, below);
      return;
    }
    if (box.min.y >= cutY - 1e-4) {
      place(o, above);
      return;
    }
    // crossing the cut
    const isMesh = (o as THREE.Mesh).isMesh;
    if (!isMesh) {
      if (o.children.length > 0) {
        [...o.children].forEach(sort);
        return;
      }
      box.getCenter(centre);
      place(o, centre.y < cutY ? below : above);
      return;
    }
    // Small things (a mushroom, a grass tuft, a flower) are not cut in two:
    // what grows from the ground stays with the stump, the rest goes by where
    // its middle is.
    box.getSize(size);
    if (Math.max(size.x, size.y, size.z) < 0.5 && !(o as THREE.InstancedMesh).isInstancedMesh) {
      box.getCenter(centre);
      place(o, box.min.y < 0.05 || centre.y < cutY ? below : above);
      return;
    }
    // children first (they would go along with the mesh otherwise)
    [...o.children].forEach(sort);

    if ((o as THREE.InstancedMesh).isInstancedMesh) {
      const inst = o as THREE.InstancedMesh;
      const parts = splitInstanced(inst, cutY, geometries);
      if (parts.below) {
        inst.matrixWorld.decompose(parts.below.position, parts.below.quaternion, parts.below.scale);
        below.add(parts.below);
      }
      if (parts.above) {
        inst.matrixWorld.decompose(parts.above.position, parts.above.quaternion, parts.above.scale);
        above.add(parts.above);
      }
      inst.removeFromParent();
      return;
    }

    const mesh = o as THREE.Mesh;
    const inv = new THREE.Matrix4().copy(mesh.matrixWorld).invert();
    const localPlane = worldPlane.clone().applyMatrix4(inv);
    const out = sliceGeometry(mesh.geometry, localPlane);
    if (out.below) {
      geometries.push(out.below);
      below.add(cloneMeshWith(mesh, out.below));
    }
    if (out.above) {
      geometries.push(out.above);
      above.add(cloneMeshWith(mesh, out.above));
    }
    // leaf cards and grass are open sheets: only solid wood gets a cut face
    if (!isLeafLike(mesh.material)) {
      out.segments.forEach((s) =>
        allSegments.push({ a: s.a.clone().applyMatrix4(mesh.matrixWorld), b: s.b.clone().applyMatrix4(mesh.matrixWorld) })
      );
    }
    mesh.removeFromParent();
  };

  [...root.children].forEach(sort);

  // The outline of the cut, and the faces that close it. Overlapping pieces of
  // wood (a root flare over the trunk) cut into rings inside one another:
  // only the outermost ring of each gets a face, so no two faces fight.
  const loops = chainLoops(allSegments)
    .filter((l) => l.radius > 0.01)
    .sort((a, b) => b.radius - a.radius);
  const kept: Loop[] = [];
  for (const l of loops) {
    const inside = kept.some((k) => Math.hypot(l.centre.x - k.centre.x, l.centre.z - k.centre.z) < k.radius * 0.9);
    if (!inside) kept.push(l);
  }
  if (kept.length > 0) {
    const capBelow = buildCap(kept, cutY + 0.002, true);
    const capAbove = buildCap(kept, cutY - 0.002, false);
    geometries.push(capBelow, capAbove);
    const stumpFace = new THREE.Mesh(capBelow, endGrain);
    stumpFace.name = 'Cut_StumpFace';
    stumpFace.receiveShadow = true;
    below.add(stumpFace);
    const topFace = new THREE.Mesh(capAbove, endGrain);
    topFace.name = 'Cut_TopFace';
    topFace.castShadow = true;
    above.add(topFace);
  }

  // the hinge: the edge of the main cut face on the side the tree falls
  const main = kept[0];
  const radius = main ? main.radius : 0.3;
  let hingeX = radius;
  if (main) main.points.forEach((p) => (hingeX = Math.max(hingeX, p.x)));

  const pivot = new THREE.Group();
  pivot.name = 'Cut_FallPivot';
  pivot.position.set(hingeX, cutY, 0);
  root.add(pivot);
  root.updateMatrixWorld(true);
  pivot.attach(above);

  box.setFromObject(above);
  const topLength = box.isEmpty() ? 1 : Math.max(0.5, box.max.y - cutY);

  return { pivot, cutY, hingeX, radius, topLength, geometries };
}
