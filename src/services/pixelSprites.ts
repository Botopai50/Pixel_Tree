import * as THREE from 'three';

/**
 * Small pixel-art sprites for the things that hang on or grow from a tree:
 * apples, berries, coconuts, mushrooms, bracket fungi. They follow the same
 * rules as the flower sprites and the pixel bark and leaves: a few texels
 * across with nearest filtering, a dark outline, a light from the top left
 * falling off in hard steps to a shaded bottom right, and a highlight or two.
 * A smooth, lit sphere or cone drawn in among the pixel leaves read as a
 * plastic toy; these read as part of the same picture.
 *
 * They are shown as sprites (always turned to the camera), which is what
 * keeps a hand-drawn silhouette readable from every side.
 */

type Rgb = THREE.Color;

interface Ramp {
  hi: Rgb;
  light: Rgb;
  mid: Rgb;
  dark: Rgb;
  deep: Rgb;
  outline: Rgb;
}

function ramp(base: string | THREE.Color): Ramp {
  const c = new THREE.Color(base);
  return {
    hi: c.clone().offsetHSL(0, -0.1, 0.3),
    light: c.clone().offsetHSL(0, 0, 0.1),
    mid: c.clone(),
    dark: c.clone().offsetHSL(0, 0.04, -0.13),
    deep: c.clone().offsetHSL(0, 0.06, -0.24),
    outline: c.clone().offsetHSL(0, 0.1, -0.36),
  };
}

/** A tiny indexed canvas: draw into cells, outline the shape, make a texture. */
class Pix {
  cells: (Rgb | null)[];
  constructor(public w: number, public h: number) {
    this.cells = new Array(w * h).fill(null);
  }
  set(x: number, y: number, c: Rgb) {
    x = Math.round(x);
    y = Math.round(y);
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return;
    this.cells[y * this.w + x] = c;
  }
  filled(x: number, y: number) {
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return false;
    return this.cells[y * this.w + x] !== null;
  }
  /** a one-texel dark rim round everything drawn so far */
  outline(c: Rgb) {
    const add: [number, number][] = [];
    for (let y = 0; y < this.h; y++) {
      for (let x = 0; x < this.w; x++) {
        if (this.filled(x, y)) continue;
        if (this.filled(x - 1, y) || this.filled(x + 1, y) || this.filled(x, y - 1) || this.filled(x, y + 1)) add.push([x, y]);
      }
    }
    add.forEach(([x, y]) => this.set(x, y, c));
  }
  texture(): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = this.w;
    canvas.height = this.h;
    const ctx = canvas.getContext('2d')!;
    const img = ctx.createImageData(this.w, this.h);
    this.cells.forEach((c, i) => {
      if (!c) return;
      img.data[i * 4] = Math.round(THREE.MathUtils.clamp(c.r, 0, 1) * 255);
      img.data[i * 4 + 1] = Math.round(THREE.MathUtils.clamp(c.g, 0, 1) * 255);
      img.data[i * 4 + 2] = Math.round(THREE.MathUtils.clamp(c.b, 0, 1) * 255);
      img.data[i * 4 + 3] = 255;
    });
    ctx.putImageData(img, 0, 0);
    const tex = new THREE.CanvasTexture(canvas);
    tex.magFilter = THREE.NearestFilter;
    tex.minFilter = THREE.NearestFilter;
    tex.generateMipmaps = false;
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }
}

/**
 * A lit ellipse: light on the top-left, stepping down to a deep bottom-right
 * edge, with an optional highlight where the light hits.
 */
function ball(p: Pix, cx: number, cy: number, rx: number, ry: number, r: Ramp, highlight = true) {
  for (let y = 0; y < p.h; y++) {
    for (let x = 0; x < p.w; x++) {
      const dx = (x + 0.5 - cx) / rx;
      const dy = (y + 0.5 - cy) / ry;
      const d = dx * dx + dy * dy;
      if (d > 1) continue;
      const t = dx * 0.7 + dy * 0.75;          // toward the bottom right
      let c = r.mid;
      if (t < -0.45) c = r.light;
      else if (t > 0.75 || (d > 0.72 && t > 0.2)) c = r.deep;
      else if (t > 0.3) c = r.dark;
      p.set(x, y, c);
    }
  }
  if (highlight) {
    const hx = cx - rx * 0.45;
    const hy = cy - ry * 0.45;
    p.set(hx - 0.5, hy - 0.5, r.hi);
    if (rx >= 3) p.set(hx - 0.5, hy + 0.5, r.hi);
  }
}

const cache = new Map<string, THREE.CanvasTexture>();
function cached(key: string, draw: () => Pix): THREE.CanvasTexture {
  const hit = cache.get(key);
  if (hit) return hit;
  const tex = draw().texture();
  cache.set(key, tex);
  return tex;
}

const STALK = ramp('#6b4526');
const LEAF = ramp('#5fa83a');

/** Apple: a round, slightly lobed fruit with a dimple, stalk and one leaf. */
export function appleSprite(color = '#d8342b'): THREE.CanvasTexture {
  return cached(`apple:${color}`, () => {
    const p = new Pix(16, 16);
    const r = ramp(color);
    ball(p, 8, 10, 6.4, 5.6, r);
    // the shoulders either side of the dimple
    ball(p, 5.6, 8.2, 3.4, 3.2, r, false);
    ball(p, 10.4, 8.2, 3.4, 3.2, r, false);
    p.set(8, 5, r.deep);
    p.set(7, 5, r.dark);
    // highlight over the left shoulder
    p.set(4, 7, r.hi);
    p.set(4, 8, r.hi);
    p.set(5, 7, r.light);
    // stalk
    p.set(8, 4, STALK.dark);
    p.set(8, 3, STALK.mid);
    p.set(9, 2, STALK.mid);
    // leaf off the stalk
    for (const [x, y, c] of [
      [10, 3, LEAF.mid], [11, 3, LEAF.mid], [12, 3, LEAF.dark], [13, 2, LEAF.dark],
      [10, 2, LEAF.light], [11, 2, LEAF.light], [12, 2, LEAF.mid],
    ] as [number, number, Rgb][]) p.set(x, y, c);
    p.outline(r.outline);
    return p;
  });
}

/** A bunch of three berries on short stems. */
export function berrySprite(color = '#b0203a'): THREE.CanvasTexture {
  return cached(`berry:${color}`, () => {
    const p = new Pix(16, 16);
    const r = ramp(color);
    // stems first, so the berries sit over their ends
    for (const [x, y] of [[8, 1], [8, 2], [7, 3], [6, 4], [9, 3], [10, 4], [8, 3], [8, 4]]) p.set(x, y, LEAF.dark);
    ball(p, 8, 6.8, 3.2, 3.2, r);
    ball(p, 4.9, 10.6, 3.4, 3.4, r);
    ball(p, 11.1, 10.6, 3.4, 3.4, r);
    p.set(8, 1, LEAF.mid);
    p.set(9, 1, LEAF.light);
    p.outline(r.outline);
    return p;
  });
}

/** Three green-brown coconuts hanging together. */
export function coconutSprite(): THREE.CanvasTexture {
  return cached('coconut', () => {
    const p = new Pix(16, 16);
    const r = ramp('#8c7a3a');
    for (const [x, y] of [[8, 0], [8, 1], [7, 2], [9, 2]]) p.set(x, y, STALK.dark);
    ball(p, 8, 5.6, 3.3, 3.6, r);
    ball(p, 4.7, 10.8, 3.5, 3.9, r);
    ball(p, 11.3, 10.8, 3.5, 3.9, r);
    p.outline(r.outline);
    return p;
  });
}

/**
 * Mushrooms: one big cap and a small one beside it, on pale stems, with the
 * dark band of the gills under the rim. `spots` adds the pale flecks of a
 * toadstool.
 */
export function mushroomSprite(capColor = '#e0782a', spots = false): THREE.CanvasTexture {
  return cached(`mush:${capColor}:${spots}`, () => {
    const p = new Pix(16, 16);
    const cap = ramp(capColor);
    const stem = ramp('#eadcc0');
    const drawOne = (cx: number, base: number, rx: number, ry: number, stemW: number, stemH: number) => {
      const top = base - stemH;
      // stem: lit on the left, shaded on the right
      for (let y = top; y <= base; y++) {
        for (let x = Math.round(cx - stemW / 2); x < Math.round(cx + stemW / 2); x++) {
          const rel = (x + 0.5 - (cx - stemW / 2)) / stemW;
          p.set(x, y, rel < 0.34 ? stem.light : rel > 0.72 ? stem.dark : stem.mid);
        }
      }
      // cap: the upper half of a lit ellipse
      for (let y = 0; y < p.h; y++) {
        for (let x = 0; x < p.w; x++) {
          const dx = (x + 0.5 - cx) / rx;
          const dy = (y + 0.5 - top) / ry;
          if (dy > 0.05 || dx * dx + dy * dy > 1) continue;
          const t = dx * 0.8 + dy * 0.6;
          p.set(x, y, t < -0.5 ? cap.light : t > 0.55 ? cap.deep : t > 0.2 ? cap.dark : cap.mid);
        }
      }
      // gills under the rim
      for (let x = Math.round(cx - rx + 1); x < Math.round(cx + rx - 1); x++) p.set(x, top + 1, stem.deep);
      p.set(cx - rx * 0.5, top - ry * 0.6, cap.hi);
      if (spots) {
        p.set(cx - rx * 0.1, top - ry * 0.75, stem.hi);
        p.set(cx + rx * 0.45, top - ry * 0.35, stem.hi);
        p.set(cx - rx * 0.6, top - ry * 0.15, stem.light);
      }
    };
    drawOne(12, 14, 3.2, 3, 2, 3);   // the small one behind
    drawOne(6.5, 15, 5.6, 5.2, 3, 5);
    p.outline(cap.outline);
    return p;
  });
}

/**
 * Bracket fungus seen from the side: three shelves stepped one over another,
 * each lit along its upper edge with a pale pore band beneath.
 */
export function bracketSprite(color = '#e0923e', rim = '#f3dfb4'): THREE.CanvasTexture {
  return cached(`bracket:${color}:${rim}`, () => {
    const p = new Pix(16, 12);
    const r = ramp(color);
    const pore = ramp(rim);
    const shelf = (cx: number, cy: number, rx: number, ry: number) => {
      for (let y = 0; y < p.h; y++) {
        for (let x = 0; x < p.w; x++) {
          const dx = (x + 0.5 - cx) / rx;
          const dy = (y + 0.5 - cy) / ry;
          if (dx * dx + dy * dy > 1) continue;
          let c = dy < -0.35 ? r.light : dy > 0.45 ? pore.mid : r.mid;
          if (dy > 0.45 && dx > 0.3) c = pore.dark;
          if (dy <= 0.45 && dx > 0.55) c = r.dark;
          p.set(x, y, c);
        }
      }
      p.set(cx - rx * 0.4, cy - ry * 0.6, r.hi);
    };
    shelf(7.5, 9.2, 6.4, 2.3);
    shelf(9, 5.7, 5.8, 2.1);
    shelf(7, 2.6, 4.6, 1.8);
    p.outline(r.outline);
    return p;
  });
}

/** Unlit, cut-out sprite material, like the flowers. */
export function spriteMaterial(tex: THREE.Texture): THREE.SpriteMaterial {
  return new THREE.SpriteMaterial({ map: tex, alphaTest: 0.5, transparent: false });
}

/**
 * A sprite `width` metres wide (height from the texture's aspect), anchored
 * at `anchor` (0..1 across, 0 = bottom .. 1 = top).
 */
export function makeSprite(mat: THREE.SpriteMaterial, width: number, anchor = new THREE.Vector2(0.5, 0.5)): THREE.Sprite {
  const s = new THREE.Sprite(mat);
  const img = mat.map?.image as { width: number; height: number } | undefined;
  const aspect = img ? img.height / img.width : 1;
  s.scale.set(width, width * aspect, 1);
  s.center.copy(anchor);
  return s;
}
