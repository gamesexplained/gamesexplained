// Widgets for Fire Trap's pages. They draw the game's own data (fire-trap-data.js, from the listing).
const FTP = (function () {
  const D = window.FT;
  const un = (s) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
  const maps = D.maps.map(un), blocks = D.blocks.map(un), chars = D.chars.map(un), sprites = un(D.sprites);
  const PAL = ['#000000', '#ffffff', '#883932', '#67b6bd', '#8b3f96', '#55a049', '#40318d', '#bfce72', '#8b5429', '#574200', '#b86962', '#505050', '#787878', '#94e089', '#7869c4', '#9f9f9f'];
  const NAMES = ['black', 'white', 'red', 'cyan', 'purple', 'green', 'blue', 'yellow', 'orange', 'brown', 'light red', 'dark grey', 'grey', 'light green', 'light blue', 'light grey'];
  const hex = (v, n) => '$' + v.toString(16).toUpperCase().padStart(n, '0');
  const el = (tag, attrs, ...kids) => {
    const e = document.createElement(tag);
    for (const k in attrs || {}) { if (k === 'text') e.textContent = attrs[k]; else e.setAttribute(k, attrs[k]); }
    kids.forEach((x) => e.append(x));
    return e;
  };
  // stage 1 to 16: the map, the tile set and the building's colour, as load_stage_map and the code at $14FD pick them
  function stage(n) {
    const s = n - 1;
    return { map: s & 3, set: (s >> 1) & 1, colour: D.colours[(((s & 12) >> 2) + s) & 3] & 15 };
  }
  function rgb(c) { const h = PAL[c]; return [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)]; }
  // draw the whole building, 10 columns by 80 rows of 4 by 4 characters, into a 320 by 2560 canvas
  function drawMap(cv, n) {
    const st = stage(n), m = maps[st.map], bl = blocks[st.set], ch = chars[st.set];
    const bg = [0, 12, st.colour];
    const ctx = cv.getContext('2d'), img = ctx.createImageData(320, 2560), px = img.data;
    for (let r = 0; r < 80; r++) for (let c = 0; c < 10; c++) {
      const v = m[r * 10 + c] % 73;
      for (let k = 0; k < 16; k++) {
        const code = bl[v * 32 + k], col = bl[v * 32 + 16 + k] & 15;
        for (let y = 0; y < 8; y++) {
          const byte = ch[code * 8 + y];
          for (let x = 0; x < 8; x++) {
            let ci;
            if (col & 8) ci = [bg[0], bg[1], bg[2], col & 7][(byte >> (6 - (x & 6))) & 3];
            else ci = (byte >> (7 - x)) & 1 ? col & 7 : bg[0];
            const [R, G, B] = rgb(ci);
            const X = (c * 4 + (k & 3)) * 8 + x, Y = (r * 4 + (k >> 2)) * 8 + y, o = (Y * 320 + X) * 4;
            px[o] = R; px[o + 1] = G; px[o + 2] = B; px[o + 3] = 255;
          }
        }
      }
    }
    ctx.putImageData(img, 0, 0);
    return st;
  }
  function mountMaps(root) {
    const bar = el('div', { class: 'row' });
    const info = el('p', { class: 'kv' });
    const wrap = el('div', { style: 'max-height:640px;overflow:auto;background:#000;border-radius:4px;text-align:center' });
    const cv = el('canvas', { width: 320, height: 2560, class: 'scr', style: 'max-width:640px;width:640px;margin:0 auto' });
    wrap.append(cv);
    let cur = 1;
    const btns = [];
    for (let n = 1; n <= 16; n++) {
      const b = el('button', { type: 'button', class: 'b', text: String(n), 'aria-pressed': n === 1 ? 'true' : 'false', 'aria-label': 'Stage ' + n });
      b.onclick = () => show(n);
      btns.push(b); bar.append(b);
    }
    function show(n) {
      cur = n;
      btns.forEach((b, i) => b.setAttribute('aria-pressed', i + 1 === n ? 'true' : 'false'));
      const st = drawMap(cv, n);
      info.innerHTML = '<b>Stage ' + n + '</b> · map ' + (st.map + 1) + ' of 4 (' + hex(0x8E00 + st.map * 0x320, 4) + ') · tile set ' + (st.set + 1) + ' of 2 · building colour ' + NAMES[st.colour] + ' (' + hex(st.colour, 2) + ')';
      wrap.scrollTop = 2560 * (640 / 320) - 640;
    }
    root.append(bar, info, wrap);
    show(1);
  }
  // the 128 sprite blocks at $6000-$7FFF
  const SPAL = { colour: ['#000000', '#e8a0a0', '#ffffff', '#f0d000'], grey: ['#000000', '#555555', '#aaaaaa', '#ffffff'] };
  function mountSprites(root) {
    const grid = el('div', { class: 'gal' });
    const bar = el('div', { class: 'row' });
    const tg = el('button', { type: 'button', class: 'b', text: 'Show the four values as greys', 'aria-pressed': 'false' });
    bar.append(tg);
    let pal = SPAL.colour;
    const cvs = [];
    for (let b = 0; b < 128; b++) {
      const cv = el('canvas', { width: 48, height: 42, title: 'block ' + hex(0x80 + b, 2) + ' at ' + hex(0x6000 + b * 64, 4) });
      cv.style.width = '96px'; cv.style.height = '84px'; cv.style.background = '#000'; cv.style.borderRadius = '4px'; cv.style.imageRendering = 'pixelated';
      const fig = el('figure', { class: 'gal-cell', style: 'width:110px' }, cv, el('figcaption', { text: hex(0x80 + b, 2) }));
      grid.append(fig); cvs.push(cv);
    }
    function draw() {
      cvs.forEach((cv, b) => {
        const ctx = cv.getContext('2d'); ctx.clearRect(0, 0, 48, 42);
        for (let y = 0; y < 21; y++) for (let xb = 0; xb < 3; xb++) {
          const byte = sprites[b * 64 + y * 3 + xb];
          for (let k = 0; k < 4; k++) {
            const v = (byte >> (6 - 2 * k)) & 3;
            if (v) { ctx.fillStyle = pal[v]; ctx.fillRect((xb * 4 + k) * 4, y * 2, 4, 2); }
          }
        }
      });
    }
    tg.onclick = () => { const g = tg.getAttribute('aria-pressed') !== 'true'; tg.setAttribute('aria-pressed', String(g)); pal = g ? SPAL.grey : SPAL.colour; draw(); };
    root.append(bar, grid);
    draw();
  }
  function mountMusic(root) {
    if (!window.C64Sid) { root.textContent = 'This player needs the site’s shared script, lib/sid.js.'; return; }
    C64Sid.mount(root, {
      driver: FTMUSIC.createDriver,
      data: { bytes: Array.from(un(D.music)) },
      tunes: FTMUSIC.sounds.map((s) => s[0]),
      filter: '6581',
      rows: [
        { k: 'Sound', f: (v) => v.effect ? 'an effect on the second voice' : 'tune ' + v.tune },
      ],
    });
  }
  return { stage, drawMap, mountMaps, mountSprites, mountMusic, hex, el };
})();
if (typeof module !== 'undefined') module.exports = FTP;
