// An optional forest remix. All scenery here is new; it never enters the game's memory.
// The renderer's backdrop mask preserves black artwork and every visible sprite pixel.
(function (root) {
'use strict';
function create() {
  const W = 384, H = 272;
  const canvas = () => { const v = document.createElement('canvas'); v.width = W; v.height = H; return v; };
  const scene = canvas(), s = scene.getContext('2d'), cut = canvas(), k = cut.getContext('2d');
  const mask = new Uint8Array(W * H), px = new Uint8Array(W * H);
  const layers = [];
  const palette = C64.PAL.map(h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16)));
  // Cache the woodland once. Integer steps and solid colours retain the coarse pixel grid.
  for (let depth = 0; depth < 3; depth++) {
    const plane = canvas(), p = plane.getContext('2d');
    p.fillStyle = ['#171b40', '#27274f', '#080d20'][depth];
    let seed = 127 + depth * 97;
    const rnd = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
    for (let i = 0; i < (depth === 2 ? 8 : 19); i++) {
      const x = Math.floor(rnd() * W), base = depth === 2 ? 235 : 248;
      const height = depth === 2 ? 18 + rnd() * 18 : 90 + rnd() * 100;
      const top = Math.floor(base - height), width = depth === 2 ? 2 : 3 + depth;
      // Foreground shrubs stay on the floor; background trees have angular bare branches.
      p.fillRect(x, top, width, base - top);
      for (let b = 0; b < 6; b++) {
        const y = Math.floor(top + height * (0.12 + b * 0.12));
        const reach = Math.floor((depth === 2 ? 4 : 8) + rnd() * (depth === 2 ? 6 : 16));
        for (const side of [-1, 1]) {
          for (let j = 0; j < reach; j += 2) {
            const bx = x + side * j, by = y - Math.floor(j * 0.65);
            p.fillRect(bx, by, 3, 3);
            if (j % 6 === 0) p.fillRect(bx, by - 4, 2, 5);
          }
        }
      }
    }
    layers.push(plane);
  }
  let camera = 0, lastFrame = null, record = null;
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  function draw(c, rt, original) {
    const M = rt.M, v = rt.chips.vic, rec = M[0x11] | M[0x12] << 8;
    // These are the first and last records of the existing ten-screen table.
    const forest = rec === 0x7000 || rec === 0x7500;
    if (!forest || rt.busy || !(v[0x11] & 0x10)) {
      c.drawImage(original, 0, 0, c.canvas.width, c.canvas.height);
      record = null; return;
    }
    const x = v[0] | (v[0x10] & 1) << 8;
    const target = reduced.matches ? 0 : Math.max(-1, Math.min(1, (x - 168) / 144));
    if (record !== rec || lastFrame === null || rt.frame < lastFrame) camera = target;
    else if (rt.frame !== lastFrame) camera += (target - camera) * 0.08;
    record = rec; lastFrame = rt.frame;
    const shift = amount => Math.round(camera * amount);
    s.imageSmoothingEnabled = false;
    s.fillStyle = '#0c1029'; s.fillRect(0, 0, W, H);
    // A small dithered moon behind the game plane.
    const moonX = 141 - shift(2);
    for (let yy = -9; yy <= 9; yy++) for (let xx = -9; xx <= 9; xx++) {
      if (xx * xx + yy * yy > 81) continue;
      s.fillStyle = (xx + yy) % 3 ? '#797da8' : '#494c80';
      s.fillRect(moonX + xx, 68 + yy, 1, 1);
    }
    s.drawImage(layers[0], -shift(3), 0);
    s.drawImage(layers[1], -shift(7), 0);
    // Stepped translucent strips of mist: motion follows game time, so pausing freezes it.
    const drift = reduced.matches ? 0 : Math.round(Math.sin(rt.frame / 170) * 7);
    for (let band = 0; band < 3; band++) {
      s.fillStyle = ['#343858', '#3e4262', '#343858'][band];
      s.globalAlpha = 0.25;
      for (let j = 0; j < 8; j++) s.fillRect(15 + j * 48 + drift - shift(5), 198 + band * 4 + (j % 3) * 2, 62, 2);
    }
    s.globalAlpha = 1;
    ChillerScreen.draw(M, v, rt.chips.colour, px, mask);
    // Start with the actual displayed frame so ghost and path overlays are preserved too.
    k.clearRect(0, 0, W, H); k.drawImage(original, 0, 0);
    const pixels = k.getImageData(0, 0, W, H);
    for (let y = 51; y < 235; y++) for (let x = 32; x < 352; x++) {
      const i = y * W + x;
      const rgb = palette[px[i]], o = i * 4;
      if (mask[i] && pixels.data[o] === rgb[0] &&
          pixels.data[o + 1] === rgb[1] &&
          pixels.data[o + 2] === rgb[2]) pixels.data[o + 3] = 0;
    }
    k.putImageData(pixels, 0, 0); s.drawImage(cut, 0, 0);
    // Foreground is restricted to the edges: no cover over the playable floor or HUD.
    s.save(); s.beginPath(); s.rect(32, 211, 13, 24); s.rect(339, 211, 13, 24); s.clip();
    s.drawImage(layers[2], -shift(12), 0); s.restore();
    c.imageSmoothingEnabled = false;
    c.drawImage(scene, 0, 0, c.canvas.width, c.canvas.height);
  }
  return { draw };
}
root.ChillerParallax = { create };
})(typeof window !== 'undefined' ? window : globalThis);
