// An optional forest remix. Added artwork never enters the game's memory.
// The renderer's backdrop mask preserves black artwork and every visible sprite pixel.
(function (root) {
'use strict';
// The forest's initial ledge cells, read from a fresh game on its original code.
// The same cells are retained in the stored forest on the way home, even once empty.
const BRIDGE_CELLS = [250,251,252,253,254,255,256,268,269,270,271,272,273,274];
function bridgeCell(cell, code) {
  return BRIDGE_CELLS.includes(cell) || (Math.floor(cell / 40) === 5 && code >= 0x1C && code <= 0x1E);
}
const ICONS = {
  0x54: ['..aaaa..','.aabbaaa','aabaaaab','aaaaaaaa','...cc...','...cc...','..cccc..','........'],
  0x55: ['..aaaa..','.abaaaab','aaaabaaa','aaaaaaaa','...cc...','...cc...','..cccc..','........'],
  0x56: ['...aa...','..abba..','.abbbba.','abbbbbba','.abbbba.','..abba..','...aa...','........'],
  0x57: ['...aa...','...aa...','.aaaaaa.','.aaaaaa.','...aa...','...aa...','...aa...','........']
};
const INKS = {
  0x54: {a:[255,194,67], b:[255,245,196], c:[255,239,184]},
  0x55: {a:[255,65,99], b:[255,249,238], c:[255,249,238]},
  0x56: {a:[255,204,50], b:[255,250,162]},
  0x57: {a:[115,243,255]}
};
// Draw on the logical pixel grid, above the framing ferns. Sprite pixels are excluded
// so the boy and enemies keep their priority when they overlap an item.
function paintItems(ctx, M, v, spritesVisible) {
  const scr = (v[0x18] >> 4) << 10, frame = ctx.getImageData(0, 0, 384, 272), d = frame.data;
  for (let cell = 80; cell < 1000; cell++) {
    const code = M[scr + cell], icon = ICONS[code]; if (!icon) continue;
    const x0 = 32 + (v[0x16] & 7) + cell % 40 * 8;
    const y0 = 32 + (v[0x11] & 7) + Math.floor(cell / 40) * 8;
    for (let dy = -1; dy <= 8; dy++) for (let dx = -1; dx <= 8; dx++) {
      const x = x0 + dx, y = y0 + dy;
      if (x < 32 || x >= 352 || y < 51 || y >= 235 || spritesVisible[y * 384 + x]) continue;
      const key = icon[dy] && icon[dy][dx], ink = INKS[code][key];
      let near = !!ink;
      if (!near) for (let yy = -1; yy <= 1; yy++) for (let xx = -1; xx <= 1; xx++) {
        if (icon[dy + yy] && INKS[code][icon[dy + yy][dx + xx]]) near = true;
      }
      if (!near) continue;
      const o = (y * 384 + x) * 4, rgb = ink || [12,8,28];
      d[o] = rgb[0]; d[o + 1] = rgb[1]; d[o + 2] = rgb[2]; d[o + 3] = 255;
    }
  }
  ctx.putImageData(frame, 0, 0);
}
function create() {
  const W = 384, H = 272;
  const canvas = () => { const v = document.createElement('canvas'); v.width = W; v.height = H; return v; };
  const scene = canvas(), s = scene.getContext('2d'), cut = canvas(), k = cut.getContext('2d');
  const mask = new Uint8Array(W * H), px = new Uint8Array(W * H), spritesVisible = new Uint8Array(W * H);
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
  const terrain = canvas(), terrainContext = terrain.getContext('2d'), terrainArt = new Image();
  let terrainReady = false, painted = false;
  terrainArt.onload = () => {
    terrainContext.imageSmoothingEnabled = false;
    terrainContext.drawImage(terrainArt, 32, 51, 320, 184);
    const plate = terrainContext.getImageData(0, 0, W, H);
    // The supplied painting has a navy backing. Open that space to the moving woodland.
    for (let i = 0; i < plate.data.length; i += 4) {
      if (plate.data[i] < 18 && plate.data[i + 1] < 32 && plate.data[i + 2] < 65) plate.data[i + 3] = 0;
    }
    terrainContext.putImageData(plate, 0, 0);
    // Remove the painted bridge and its railings. Their replacements below use live
    // character pixels, so every erosion stage and every hole comes from the game.
    terrainContext.clearRect(112, 69, 72, 22);
    terrainContext.clearRect(240, 69, 80, 22);
    terrainReady = true;
  };
  terrainArt.src = 'reference/parallax-terrain.png';
  let camera = 0, lastFrame = null, record = null;
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  function draw(c, rt, original) {
    const M = rt.M, v = rt.chips.vic, rec = M[0x11] | M[0x12] << 8;
    // These are the first and last records of the existing ten-screen table.
    const forest = rec === 0x7000 || rec === 0x7500;
    if (!ready || !forest || rt.busy || !(v[0x11] & 0x10) || (v[0x18] & 0x0E) !== 0x0C) {
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
    const reskin = painted && terrainReady && !(rt.over & 1);
    if (reskin) s.drawImage(terrain, 0, 0);
    ChillerScreen.draw(M, v, rt.chips.colour, px, mask, spritesVisible);
    const screenAddress = (v[0x18] >> 4) << 10;
    // Start with the actual displayed frame so ghost and path overlays are preserved too.
    k.clearRect(0, 0, W, H); k.drawImage(original, 0, 0);
    const pixels = k.getImageData(0, 0, W, H);
    for (let y = 51; y < 235; y++) for (let x = 32; x < 352; x++) {
      const i = y * W + x;
      const rgb = palette[px[i]], o = i * 4;
      const same = pixels.data[o] === rgb[0] && pixels.data[o + 1] === rgb[1] && pixels.data[o + 2] === rgb[2];
      if (!same) continue; // replay ghost and path overlays
      if (!reskin) { if (mask[i]) pixels.data[o + 3] = 0; continue; }
      if (spritesVisible[i]) continue;
      const tx = x - 32 - (v[0x16] & 7), ly = y + 16 - 0x30 - (v[0x11] & 7);
      const cell = (ly >> 3) * 40 + (tx >> 3), code = M[screenAddress + cell];
      const pickup = code >= 0x54 && code <= 0x57;
      if (bridgeCell(cell, code)) {
        if (mask[i]) pixels.data[o + 3] = 0;
        else { pixels.data[o] = 255; pixels.data[o + 1] = y % 2 ? 213 : 243; pixels.data[o + 2] = y % 2 ? 151 : 211; }
      } else if (!pickup || mask[i]) pixels.data[o + 3] = 0;
    }
    k.putImageData(pixels, 0, 0); s.drawImage(cut, 0, 0);
    // The complete foreground sits in front of the game, clipped only at the
    // playfield boundary. The HUD and border remain clear.
    s.save(); s.beginPath(); s.rect(32, 51, 320, 184); s.clip();
    s.drawImage(foreground, -shift(12), 0); s.restore();
    if (!(rt.over & 1)) paintItems(s, M, v, spritesVisible);
    c.imageSmoothingEnabled = false;
    c.drawImage(scene, 0, 0, c.canvas.width, c.canvas.height);
  }
  return { draw, setPainted(value) { painted = !!value; } };
}
root.ChillerParallax = { create, bridgeCell, paintItems, BRIDGE_CELLS };
})(typeof window !== 'undefined' ? window : globalThis);
