// The widgets of Jumpman Junior's tabs. Every one draws from the game's own bytes, rebuilt from
// listing.json by the site's C64.load() (../../lib/c64.js).

/* drawScript */
function drawScript(ram, p, bmp, log) {
  // draw_script ($8A36) and draw_shape ($8A91), as the game runs them, writing into bmp, a copy
  // of the bitmap at $4000 (bmp[0] is $4000; 8,192 bytes, so a write past the bitmap's end
  // lands where the game's would, in the screen's first bytes, and is dropped).
  // A script is a list of runs: $FE lo hi sets the shape, $FD dx dy sets the step between
  // copies, $FF ends, and any other first byte starts a run of X, Y and a count. A shape is a
  // list of rows: a count, X and Y offsets from the run's position, then one colour (0-3) per
  // pixel; a count of 0 ends it. X is in double-width pixels, 0-159, and every sum wraps at 256
  // as the game's 8-bit adds do. Each pixel is two bits of the byte at row(Y) + (X >> 2) × 8,
  // where row(Y), the table the start-up code builds at $1000 and $1100 ($8049), is
  // $4000 + (Y >> 3) × 320 + (Y & 7).
  // log, when given, collects each run: { shape, x, y, n, dx, dy }.
  const KEEP = [0x3F, 0xCF, 0xF3, 0xFC], SH = [6, 4, 2, 0];
  let shape = 0, sx = 0, sy = 0;
  for (;;) {
    const b = ram[p];
    if (b === 0xFF) return p;
    if (b === 0xFE) { shape = ram[p + 1] | ram[p + 2] << 8; p += 3; continue; }
    if (b === 0xFD) { sx = ram[p + 1]; sy = ram[p + 2]; p += 3; continue; }
    let x = b, y = ram[p + 1];
    const n = ram[p + 2];
    if (log) log.push({ shape, x, y, n, dx: sx, dy: sy });
    for (let k = 0; k < n || (n === 0 && k < 256); k++) {
      for (let i = shape; ram[i]; ) {
        const cnt = ram[i], X0 = (x + ram[i + 1]) & 255, Y = (y + ram[i + 2]) & 255;
        let a = 0x4000 + (Y >> 3) * 320 + (Y & 7) + ((X0 >> 2) << 3);
        let px = X0 & 3;
        for (let j = 0; j < cnt; j++) {
          const c = ram[i + 3 + j] & 3, o = a - 0x4000;
          if (o >= 0 && o < 8192) bmp[o] = (bmp[o] & KEEP[px]) | (c << SH[px]);
          if (++px === 4) { px = 0; a = (a + 8) & 0xFFFF; }
        }
        i += 3 + cnt;
      }
      x = (x + sx) & 255; y = (y + sy) & 255;
      if (n && k === n - 1) break;
    }
    p += 3;
  }
}
// end of drawScript

const JJ = (function () {
  'use strict';
  let gameP = null;
  function load() { if (!gameP) gameP = C64.load('listing.json'); return gameP; }
  const w = (ram, a) => ram[a] | ram[a + 1] << 8;
  const hex = (v, n) => '$' + v.toString(16).toUpperCase().padStart(n || 4, '0');
  function el(tag, attrs, kids) {
    const e = document.createElement(tag);
    for (const k in attrs || {}) { if (k === 'text') e.textContent = attrs[k]; else if (k === 'html') e.innerHTML = attrs[k]; else e.setAttribute(k, attrs[k]); }
    for (const c of kids || []) e.append(c);
    return e;
  }
  function src(a) { return el('a', { href: 'source.html#' + a.toString(16).toUpperCase().padStart(4, '0') }, [el('code', { text: hex(a) })]); }

  // The shapes the draw scripts name ($8F3E-$90D7).
  const SHAPES = { 0x8F3E: 'girder', 0x8F69: 'girder eraser', 0x8F94: 'ladder', 0x8FE7: 'ladder eraser',
    0x903A: 'bomb', 0x905D: 'up rope', 0x9086: 'down rope', 0x90AF: 'rope eraser' };
  // Each level's colours (level_colours $8BD4): pixel value 1 is the screen's high nibble (8,
  // orange), 2 its low nibble (5, green), 3 the colour RAM (6, blue), 0 the background (black).
  const COLS = () => [C64.PAL[0], C64.PAL[8], C64.PAL[5], C64.PAL[6]];

  // A level's name: 20 bytes from $9D93, letters 1-26 and the rest as ASCII.
  function levelName(ram, n) {
    let s = '';
    for (let i = 0; i < 20; i++) { const c = ram[0x9D93 + 20 * n + i]; s += c >= 1 && c <= 26 ? String.fromCharCode(64 + c) : String.fromCharCode(c); }
    return s.trim().replace(/\.$/, '');
  }
  // A level's header, 64 bytes at $BC00 + 64 × n (copied to $0C00 for play).
  function header(ram, n) {
    const h = 0xBC00 + 64 * n;
    return { at: h, bombs: ram[h + 0x0A], bullets: ram[h + 0x0B], startX: w(ram, h + 0x0C), startY: ram[h + 0x0E],
      points: ram[h + 0x11], bonus: w(ram, h + 0x12), sprites: w(ram, h + 0x15), draw: w(ram, h + 0x17),
      bombPos: w(ram, h + 0x19), bombList: w(ram, h + 0x1B), changes: w(ram, h + 0x1D),
      perBomb: w(ram, h + 0x21), start: w(ram, h + 0x23), main: w(ram, h + 0x25), end: w(ram, h + 0x27), border: ram[h + 0x29] };
  }
  // Level 9 has no draw script in its header: its main routine ($B5B1) draws the level from $B4ED.
  const drawOf = (ram, n) => n === 8 ? 0xB4ED : header(ram, n).draw;

  // The bomb list: a cell code and an action for each bomb, $FF to end. Bomb i is drawn at
  // entry i of the bomb positions (header $19, X, Y and 1 each), as bomb_check ($A600) finds it.
  function bombs(ram, n) {
    const H = header(ram, n), out = [];
    for (let p = H.bombList, i = 0; ram[p] !== 0xFF; p += 2, i++) {
      const act = ram[p + 1], c = act >> 4;
      out.push({ i, cell: ram[p], act, x: ram[H.bombPos + 3 * i], y: ram[H.bombPos + 3 * i + 1],
        change: c && H.changes ? w(ram, H.changes + 2 * c) : 0 });
    }
    return out;
  }

  // Paint a copy of the bitmap: 160 × 200 double-width pixels on a 320 × 200 canvas.
  function paint(ctx, bmp, rows) {
    const cols = COLS().map(h => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)]);
    const img = ctx.createImageData(320, rows || 184);
    for (let y = 0; y < (rows || 184); y++) for (let x = 0; x < 160; x++) {
      const b = bmp[(y >> 3) * 320 + (y & 7) + (x >> 2) * 8], c = cols[(b >> (6 - 2 * (x & 3))) & 3];
      for (let d = 0; d < 2; d++) { const o = (y * 320 + 2 * x + d) * 4; img.data[o] = c[0]; img.data[o + 1] = c[1]; img.data[o + 2] = c[2]; img.data[o + 3] = 255; }
    }
    ctx.putImageData(img, 0, 0);
  }

  // The Maps tab: pick a level, see it drawn by the game's own scripts, and defuse its bombs.
  function mountMap(root) {
    const sel = el('div', { class: 'row', role: 'group', 'aria-label': 'Level' });
    const cv = el('canvas', { width: 320, height: 184, class: 'scr', role: 'img' });
    const over = el('canvas', { width: 640, height: 368, class: 'scr jj-over', 'aria-hidden': 'true' });
    const stage = el('div', { class: 'jj-stage' }, [cv, over]);
    const info = el('p', { class: 'kv' });
    const bar = el('div', { class: 'row' });
    const log = el('ol', { class: 'jj-log' });
    root.append(sel, stage, bar, info, log);
    load().then(L => {
      const ram = L.ram;
      let n = 0, bmp, done;
      for (let i = 0; i < 12; i++) {
        const b = el('button', { type: 'button', class: 'b', 'aria-pressed': 'false', title: levelName(ram, i), text: String(i + 1) });
        b.onclick = () => show(i);
        sel.append(b);
      }
      const reset = el('button', { type: 'button', class: 'b', text: 'Draw the level again' });
      const all = el('button', { type: 'button', class: 'b', text: 'Defuse every bomb in order' });
      bar.append(reset, all);
      reset.onclick = () => show(n);
      all.onclick = () => { for (const b of bombs(ram, n)) if (!done.has(b.i)) defuse(b); };
      over.addEventListener('click', e => {
        const r = over.getBoundingClientRect(), X = (e.clientX - r.left) / r.width * 160, Y = (e.clientY - r.top) / r.height * 184;
        let best = null, bd = 1e9;
        for (const b of bombs(ram, n)) { if (done.has(b.i)) continue; const d = (b.x + 3 - X) ** 2 + (b.y + 3 - Y) ** 2; if (d < bd) { bd = d; best = b; } }
        if (best && bd < 120) defuse(best);
      });
      function labels() {
        const g = over.getContext('2d'), s = 4;
        g.clearRect(0, 0, 640, 368);
        g.font = '600 15px "IBM Plex Mono", monospace'; g.textBaseline = 'middle'; g.textAlign = 'center';
        for (const b of bombs(ram, n)) {
          if (done.has(b.i)) continue;
          const x = (b.x + 3) * s, y = (b.y - 6) * 2;
          g.fillStyle = 'rgba(255,255,255,.92)'; g.fillRect(x - 11, y - 9, 22, 18);
          g.fillStyle = '#000'; g.fillText(String(b.i + 1), x, y);
        }
        // Ropes carry an arrow, so they read without their colour: up for green, down for blue.
        const runs = []; drawScript(ram, drawOf(ram, n), new Uint8Array(8192), runs);
        g.font = '700 13px "IBM Plex Mono", monospace';
        for (const r of runs) {
          if (r.shape !== 0x905D && r.shape !== 0x9086) continue;
          const t = r.shape === 0x905D ? '▲' : '▼', x = (r.x + 1) * s + 14, y = (r.y + 8) * 2;
          g.fillStyle = 'rgba(0,0,0,.75)'; g.fillRect(x - 8, y - 8, 16, 16);
          g.fillStyle = '#fff'; g.fillText(t, x, y);
        }
      }
      function defuse(b) {
        if (b.change) drawScript(ram, b.change, bmp);
        // bomb_check wipes the bomb with the girder eraser through the script it builds at $09CA.
        const wipe = new Uint8Array(ram); wipe.set([0xFE, 0x69, 0x8F, b.x, b.y, 1, 0xFF], 0x09CA);
        drawScript(wipe, 0x09CA, bmp);
        done.add(b.i);
        paint(cv.getContext('2d'), bmp);
        labels();
        const li = el('li');
        li.append('Bomb ' + (b.i + 1) + (b.change ? ': draws the change script at ' : ': no change to the level'));
        if (b.change) li.append(src(b.change));
        log.append(li);
        if (done.size === bombs(ram, n).length) log.append(el('li', { text: 'Every bomb is defused, and the level ends.' }));
      }
      function show(i) {
        n = i; bmp = new Uint8Array(8192); done = new Set(); log.textContent = '';
        for (const [k, b] of [...sel.children].entries()) b.setAttribute('aria-pressed', String(k === i));
        drawScript(ram, drawOf(ram, i), bmp);
        paint(cv.getContext('2d'), bmp);
        labels();
        const H = header(ram, i), B = bombs(ram, i);
        cv.setAttribute('aria-label', 'Level ' + (i + 1) + ', ' + levelName(ram, i) + ', drawn from its script, with ' + B.length + ' numbered bombs');
        info.textContent = '';
        info.append(el('b', { text: (i + 1) + ' ' + levelName(ram, i) }), ' · ' + B.length + ' bombs in the list' +
          (i === 8 ? ', eight wiped at random' : '') + ' · ' + H.bullets + (H.bullets === 1 ? ' bullet' : ' bullets') + ' at a time · bonus ' + H.bonus +
          ' · ' + B.filter(b => b.change).length + ' bombs change the level · draw script ', src(drawOf(ram, i)), ' · header ', src(H.at));
      }
      show(0);
    });
  }

  // The Graphics tab: the eight shapes the draw scripts use.
  function mountShapes(root) {
    load().then(L => {
      const ram = L.ram;
      for (const a of Object.keys(SHAPES).map(Number)) {
        const bmp = new Uint8Array(8192), probe = new Uint8Array(ram);
        probe.set([0xFE, a & 255, a >> 8, 4, 2, 1, 0xFF], 0x0200);
        drawScript(probe, 0x0200, bmp);
        let maxY = 0, maxX = 0;
        for (let i = a; ram[i]; i += 3 + ram[i]) { maxY = Math.max(maxY, ram[i + 2]); maxX = Math.max(maxX, ram[i + 1] + ram[i]); }
        const H = maxY + 5, W = maxX + 8;
        const big = el('canvas', { width: 320, height: Math.max(8, H), class: 'jj-shape', role: 'img', 'aria-label': SHAPES[a] });
        paint(big.getContext('2d'), bmp, H);
        big.style.width = (W * 2 * 4) + 'px'; big.style.maxWidth = '100%';
        const crop = el('canvas', { width: W * 2, height: H });
        crop.getContext('2d').drawImage(big, 0, 0);
        crop.className = 'jj-shape'; crop.setAttribute('role', 'img'); crop.setAttribute('aria-label', SHAPES[a]);
        const cap = el('figcaption'); cap.append(SHAPES[a] + ' ', src(a));
        root.append(el('figure', {}, [crop, cap]));
      }
    });
  }

  // The 45 sprite shapes, packed at $82B8: ten rows of two bytes, eight multicolour pixels a row.
  // Pixel value 1 is $D025 (1, white), 3 is $D026 (4, purple), both set at $81BD; 2 is the
  // sprite's own colour, which each set-up chooses: drawn here in red, Jumpman's (2, $9A8F).
  const SPRITES = { 0x90: 'blank: every sprite at the start of a level', 0x91: 'Jumpman hit', 0x92: 'sliding down a rope', 0x93: 'sliding down a rope',
    0x94: 'climbing, and the straight-up jump', 0x95: 'climbing', 0x96: 'climbing', 0x97: 'climbing', 0x98: 'jumping right, and the runner under a level’s name',
    0x99: 'jumping left', 0x9C: 'walking right', 0x9D: 'walking right', 0x9E: 'walking left', 0x9F: 'walking left',
    0xA0: 'tumbling', 0xA1: 'tumbling, and the title’s Jumpman', 0xA2: 'tumbling', 0xA3: 'tumbling', 0xA4: 'bullet, hellstone, and the ending’s Jumpman',
    0xA5: 'fire', 0xA6: 'fire', 0xA7: 'fire', 0xA8: 'fire', 0xA9: 'wall', 0xAA: 'transporter, and a fire before it is placed',
    0xAB: 'transporter', 0xAC: 'transporter', 0xAD: 'transporter', 0xAE: 'egg', 0xAF: 'egg', 0xB0: 'egg', 0xB1: 'egg hatching',
    0xB2: 'hatchling', 0xB3: 'hatchling', 0xB4: 'hatchling', 0xB5: 'hatchling', 0xB6: 'debris', 0xB7: 'debris', 0xB8: 'debris', 0xB9: 'debris',
    0xBA: 'the letter pointer', 0xBB: 'moving ladder' };
  function mountSprites(root) {
    load().then(L => {
      const ram = L.ram, cols = [null, C64.PAL[1], C64.PAL[2], C64.PAL[4]];
      for (let k = 0; k < 45; k++) {
        const ptr = 0x90 + k, a = 0x82B8 + 20 * k;
        const cv = el('canvas', { width: 16, height: 10, class: 'jj-sprite', role: 'img', 'aria-label': 'Sprite shape ' + hex(ptr, 2) + ': ' + (SPRITES[ptr] || 'not named here') });
        const g = cv.getContext('2d');
        g.fillStyle = '#000'; g.fillRect(0, 0, 16, 10);
        for (let y = 0; y < 10; y++) for (let x = 0; x < 8; x++) {
          const v = (ram[a + 2 * y + (x >> 2)] >> (6 - 2 * (x & 3))) & 3;
          if (v) { g.fillStyle = cols[v]; g.fillRect(2 * x, y, 2, 1); }
        }
        const cap = el('figcaption');
        cap.append(el('code', { text: hex(ptr, 2) }), ' ' + (SPRITES[ptr] || 'not set by any routine named here'));
        root.append(el('figure', {}, [cv, cap]));
      }
    });
  }

  return { load, levelName, header, bombs, drawOf, paint, mountMap, mountShapes, mountSprites, SHAPES, SPRITES, hex, src };
})();
