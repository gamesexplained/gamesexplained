/* Checkpoint illustrations from a live, saved-state route. */
(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const select = $('bridges-step'), canvas = $('bridges-canvas');
  WZ_BRIDGES_ROUTE.forEach((step, i) => {
    const option = document.createElement('option');
    option.value = i; option.textContent = (i + 1) + '. ' + step.title;
    select.append(option);
  });
  function draw() {
    const i = +select.value, step = WZ_BRIDGES_ROUTE[i];
    const cells = [...MAPS[17].map], colors = [...MAPS[17].colors], glyphs = Uint8Array.from(font);
    step.map.forEach(([n, v]) => { cells[n] = v; });
    step.colors.forEach(([n, v]) => { colors[n] = v; });
    step.glyphs.forEach(([n, v]) => glyphs.set(v, n * 8));
    const c = canvas.getContext('2d');
    c.imageSmoothingEnabled = false; c.fillStyle = '#000'; c.fillRect(0, 0, 640, 352);
    for (let n = 0; n < 880; n++) {
      c.fillStyle = palette[colors[n]];
      for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) {
        if (glyphs[cells[n] * 8 + y] & (128 >> x)) c.fillRect((n % 40 * 8 + x) * 2, (Math.floor(n / 40) * 8 + y) * 2, 2, 2);
      }
    }
    for (const s of [...step.sprites].reverse()) {
      const pixels = Uint8Array.from(atob(s.pixels), c => c.charCodeAt(0));
      const colors = [null, palette[14], palette[s.color], palette[1]];
      const sx = s.xexpand ? 2 : 1, sy = s.yexpand ? 2 : 1;
      for (let y = 0; y < 21; y++) for (let x = 0; x < (s.multi ? 12 : 24); x++) {
        const pixel = s.multi ? (pixels[y * 3 + (x >> 2)] >> (6 - 2 * (x % 4))) & 3
          : (pixels[y * 3 + (x >> 3)] >> (7 - x % 8)) & 1;
        if (!pixel) continue;
        c.fillStyle = s.multi ? colors[pixel] : palette[s.color];
        c.fillRect((s.x - 24 + x * (s.multi ? 2 : 1) * sx) * 2,
          (s.y - 50 + y * sy) * 2, (s.multi ? 4 : 2) * sx, 2 * sy);
      }
    }
    c.strokeStyle = '#fff'; c.lineWidth = 2; c.beginPath();
    c.arc((step.x - 12) * 2, (step.y - 40) * 2, 22, 0, Math.PI * 2); c.stroke();
    $('bridges-title').textContent = step.title;
    $('bridges-note').textContent = step.note;
    $('bridges-count').textContent = (i + 1) + ' / ' + WZ_BRIDGES_ROUTE.length;
    const key = step.key ? 'Key held' : 'Key on the ' + (step.cells[0] === 27 ? 'left' : 'right');
    $('bridges-status').textContent = key + ' · Exit on the ' + (step.cells[0] === 64 ? 'left' : 'right')
      + (i === WZ_BRIDGES_ROUTE.length - 1 ? ' · Room completed' : '');
    canvas.setAttribute('aria-label', 'Burning Bridges checkpoint ' + (i + 1) + ': ' + step.title + '. ' + key + '.');
    $('bridges-previous').disabled = i === 0;
    $('bridges-next').disabled = i === WZ_BRIDGES_ROUTE.length - 1;
  }
  select.onchange = draw;
  $('bridges-previous').onclick = () => { select.value = +select.value - 1; draw(); };
  $('bridges-next').onclick = () => { select.value = +select.value + 1; draw(); };
  draw();
})();
