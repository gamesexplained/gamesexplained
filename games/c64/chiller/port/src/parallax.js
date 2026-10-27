// An optional forest remix. All scenery here is new; it never enters the game's memory.
// The renderer's backdrop mask preserves black artwork and every visible sprite pixel.
(function (root) {
'use strict';
function create() {
  const W = 384, H = 272;
  const canvas = () => { const v = document.createElement('canvas'); v.width = W; v.height = H; return v; };
  const scene = canvas(), s = scene.getContext('2d'), cut = canvas(), k = cut.getContext('2d');
  const mask = new Uint8Array(W * H), px = new Uint8Array(W * H);
  const palette = C64.PAL.map(h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16)));
  const art = new Image();
  // Keep the artwork at the game's logical pixel size. No C64 palette conversion or
  // double-width multicolour pixels: each logical pixel can carry its own full RGB colour.
  const woodland = canvas(), wood = woodland.getContext('2d');
  const foreground = canvas(), front = foreground.getContext('2d');
  let ready = false;
  art.onload = () => {
    wood.imageSmoothingEnabled = false;
    wood.drawImage(art, 0, 0, art.naturalWidth, art.naturalHeight, 24, 47, 336, 192);
    ready = true;
  };
  art.src = 'reference/parallax-forest-art.png';
  const branches = new Image();
  branches.onload = () => {
    front.imageSmoothingEnabled = false;
    // Overscan keeps the roots offscreen while the whole layer moves. Keep each
    // silhouette intact instead of cutting a colour-keyed fragment into edge strips.
    front.drawImage(branches, 20, 49, 344, 190);
  };
  branches.src = 'reference/parallax-foreground.png';
  let camera = 0, lastFrame = null, record = null;
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  function draw(c, rt, original) {
    const M = rt.M, v = rt.chips.vic, rec = M[0x11] | M[0x12] << 8;
    // These are the first and last records of the existing ten-screen table.
    const forest = rec === 0x7000 || rec === 0x7500;
    if (!ready || !forest || rt.busy || !(v[0x11] & 0x10)) {
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
    s.drawImage(woodland, -shift(5), 0);
    // A separate, gently moving veil adds depth to the painted fog. It is rendered at
    // 384 x 272, so even its soft colour transitions keep the same visible pixel grid.
    const drift = reduced.matches ? 0 : Math.round(Math.sin(rt.frame / 170) * 7);
    const fog = s.createLinearGradient(0, 190, 0, 230);
    fog.addColorStop(0, 'rgba(132,147,226,0)');
    fog.addColorStop(0.45, 'rgba(151,164,242,0.18)');
    fog.addColorStop(1, 'rgba(91,113,204,0)');
    s.fillStyle = fog; s.fillRect(24 + drift - shift(9), 190, 336, 40);
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
    // The complete foreground sits in front of the game, clipped only at the
    // playfield boundary. The HUD and border remain clear.
    s.save(); s.beginPath(); s.rect(32, 51, 320, 184); s.clip();
    s.drawImage(foreground, -shift(12), 0); s.restore();
    c.imageSmoothingEnabled = false;
    c.drawImage(scene, 0, 0, c.canvas.width, c.canvas.height);
  }
  return { draw };
}
root.ChillerParallax = { create };
})(typeof window !== 'undefined' ? window : globalThis);
