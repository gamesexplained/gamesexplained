// The widgets of The Goonies' tabs. Every one draws from the game's own bytes, rebuilt from
// listing.json by the site's C64.load() (../../lib/c64.js).
const GOON = (function () {
  'use strict';
  // The eight scenes in play order, with the scene index the game keeps in $12B9.
  const SCENES = [
    { n: 1, idx: 0, name: 'The Fratellis’ hideout', img: 'reference/scene1-hideout.png' },
    { n: 2, idx: 2, name: 'The cavern lake', img: 'reference/scene2-lake.png' },
    { n: 3, idx: 1, name: 'The pipes', img: 'reference/scene3-pipes.png' },
    { n: 4, idx: 3, name: 'The rolling rocks', img: 'reference/scene4-rocks.png' },
    { n: 5, idx: 4, name: 'The bird, the eggs and the lava', img: 'reference/scene5-skull.png' },
    { n: 6, idx: 5, name: 'The cage', img: 'reference/scene6-cage.png' },
    { n: 7, idx: 6, name: 'The octopus', img: 'reference/scene7-octopus.png' },
    { n: 8, idx: 7, name: 'The pirate ship', img: 'reference/scene8-ship.png' },
  ];
  // Every cell of every scene shows black and the same three colours (fill_screens $691E,
  // fill_colour_ram $6905): bit pair 01 is the screen's high nibble (2, red), 10 its low nibble
  // (6, blue), 11 the colour RAM (1, white).
  const COLS = () => [null, C64.PAL[2], C64.PAL[6], C64.PAL[1]];
  const KINDS = [
    { k: 0, name: 'wall on the left', col: '#ff5a4f' },
    { k: 1, name: 'wall on the right', col: '#ff9f1c' },
    { k: 2, name: 'ceiling', col: '#ffe14d' },
    { k: 3, name: 'floor', col: '#5cff6b' },
    { k: 4, name: 'floor over a ladder', col: '#3fe0ff' },
    { k: 5, name: 'ladder', col: '#5b8cff' },
    { k: 6, name: 'water', col: '#d36bff' },
    { k: 7, name: 'bar to hang from', col: '#ffffff' },
  ];

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
  function code(a) { const c = document.createElement('code'); c.textContent = hex(a); return c; }

  // A shape as draw_shape ($6D4E) reads it: width in bytes, height in lines, then the bytes, row
  // by row. Draws onto ctx at pixel (px, py), each C64 pixel s screen pixels.
  function drawShape(ctx, ram, a, px, py, s) {
    const wd = ram[a], ht = ram[a + 1], cols = COLS();
    for (let y = 0; y < ht; y++) for (let x = 0; x < wd; x++) {
      const b = ram[a + 2 + y * wd + x];
      for (let p = 0; p < 4; p++) {
        const v = (b >> (6 - 2 * p)) & 3;
        if (!v) continue;
        ctx.fillStyle = cols[v];
        ctx.fillRect(px + (x * 8 + p * 2) * s, py + y * s, 2 * s, s);
      }
    }
  }

  // The shape table at $70BE for one scene: shapes 0-15 come from the scene's two blocks of
  // pointers (scene_shape_blocks $7049), shapes 16-57 are shared ($713E). Each shape has four
  // pointers, one for each value of x AND 3.
  function shapeTable(ram, idx) {
    const t = [];
    for (let h = 0; h < 2; h++) {
      const blk = w(ram, 0x7049 + 4 * idx + 2 * h);
      for (let i = 0; i < 8; i++) t.push([0, 1, 2, 3].map(k => w(ram, blk + 8 * i + 2 * k)));
    }
    for (let i = 16; i < 58; i++) t.push([0, 1, 2, 3].map(k => w(ram, 0x70BE + 8 * i + 2 * k)));
    return t;
  }

  // The rectangles of a scene, as load_scene_tables ($1189) points the collision tests at them.
  function rects(ram, idx) {
    const n = ram[0x11F7 + idx], P = [0, 1, 2, 3, 4].map(k => w(ram, 0x1201 + 20 * k + 2 * idx));
    const r = [];
    for (let j = 0; j < n; j++) r.push({ j, kind: ram[P[0] + j], l: ram[P[1] + j], t: ram[P[2] + j], r: ram[P[3] + j], b: ram[P[4] + j], at: P[0] + j });
    return { n, ptrs: P, list: r };
  }

  // The step control the site uses for things of one kind: before, a list, after.
  function picker(root, items, onPick, start) {
    const box = el('div', { class: 'pick' });
    const prev = el('button', { class: 'step', type: 'button', 'aria-label': 'Previous', text: '‹' });
    const next = el('button', { class: 'step', type: 'button', 'aria-label': 'Next', text: '›' });
    const sel = el('select', { 'aria-label': 'Choose' });
    items.forEach((t, i) => sel.append(el('option', { value: i, text: t })));
    box.append(prev, sel, next); root.append(box);
    const go = i => { i = (i + items.length) % items.length; sel.value = i; onPick(i); };
    prev.onclick = () => go(+sel.value - 1); next.onclick = () => go(+sel.value + 1);
    sel.onchange = () => go(+sel.value);
    go(start || 0);
    return go;
  }

  // Maps: each scene's screenshot with its collision rectangles over it. A rectangle's edges are
  // in the object's own coordinates: x in units of two pixels, lines from the top of the bitmap's
  // second character row (row_addr_lo $694E starts at $2140).
  async function mountMap(root) {
    let G; try { G = await load(); } catch (e) { root.textContent = 'The map needs listing.json: ' + e.message; return; }
    const ram = G.ram, S = 2, OX = 32, OY = 43;
    const show = new Set([0, 1, 2, 3, 4, 5, 6, 7]);
    const pickRow = el('div'); root.append(pickRow);
    const keys = el('div', { class: 'row' }); root.append(keys);
    const cv = el('canvas', { class: 'scr', width: 384 * S, height: 272 * S }); root.append(cv);
    const info = el('p', { class: 'kv' }); root.append(info);
    const tbl = el('div', { class: 'tablewrap' }); root.append(tbl);
    const ctx = cv.getContext('2d'); ctx.imageSmoothingEnabled = false;
    let cur = null, img = null, hover = -1;
    for (const K of KINDS) {
      const b = el('button', { class: 'b', type: 'button', 'aria-pressed': 'true' });
      b.append(el('span', { class: 'sw', style: 'background:' + K.col }), document.createTextNode(K.k + ' ' + K.name));
      b.onclick = () => { if (show.has(K.k)) show.delete(K.k); else show.add(K.k); b.setAttribute('aria-pressed', show.has(K.k)); draw(); };
      keys.append(b);
    }
    function draw() {
      ctx.fillStyle = '#000'; ctx.fillRect(0, 0, cv.width, cv.height);
      if (img && img.complete) ctx.drawImage(img, 0, 0, 384 * S, 272 * S);
      ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.fillRect(0, 0, cv.width, cv.height);
      for (const q of cur.list) {
        const off = q.kind & 0x80, K = KINDS[q.kind & 7];
        if (!show.has(q.kind & 7)) continue;
        const x0 = (OX + 2 * q.l) * S, y0 = (OY + q.t) * S, x1 = (OX + 2 * q.r + 2) * S, y1 = (OY + q.b + 1) * S;
        ctx.strokeStyle = K.col; ctx.lineWidth = q.j === hover ? 4 : 2;
        ctx.setLineDash(off ? [6, 5] : []);
        ctx.strokeRect(x0 + 1, y0 + 1, Math.max(2, x1 - x0 - 2), Math.max(2, y1 - y0 - 2));
      }
      ctx.setLineDash([]);
    }
    function table(sc) {
      const t = el('table', { class: 't' });
      t.append(el('tr', {}, ['#', 'Kind', 'Left', 'Top', 'Right', 'Bottom'].map(h => el('th', { text: h }))));
      for (const q of cur.list) {
        const tr = el('tr', {}, [
          el('td', { text: q.j }),
          el('td', {}, [el('span', { class: 'sw', style: 'background:' + KINDS[q.kind & 7].col }), document.createTextNode((q.kind & 7) + ' ' + KINDS[q.kind & 7].name + (q.kind & 0x80 ? ', out of use' : ''))]),
          el('td', { class: 'n', text: q.l }), el('td', { class: 'n', text: q.t }), el('td', { class: 'n', text: q.r }), el('td', { class: 'n', text: q.b })]);
        tr.onmouseenter = () => { hover = q.j; draw(); }; tr.onmouseleave = () => { hover = -1; draw(); };
        t.append(tr);
      }
      tbl.replaceChildren(t);
    }
    picker(pickRow, SCENES.map(s => 'Scene ' + s.n + ': ' + s.name), i => {
      const sc = SCENES[i];
      cur = rects(ram, sc.idx);
      img = new Image(); img.onload = draw; img.src = sc.img;
      info.replaceChildren(document.createTextNode('Scene index ' + sc.idx + ' · ' + cur.n + ' rectangles · kinds at '), code(cur.ptrs[0]),
        document.createTextNode(', edges at '), code(cur.ptrs[1]), document.createTextNode(', '), code(cur.ptrs[2]),
        document.createTextNode(', '), code(cur.ptrs[3]), document.createTextNode(', '), code(cur.ptrs[4]));
      table(sc); draw();
    });
  }

  // Graphics: the shape table of a chosen scene, every shape at its size, with its copies.
  async function mountShapes(root) {
    let G; try { G = await load(); } catch (e) { root.textContent = 'The shapes need listing.json: ' + e.message; return; }
    const ram = G.ram;
    const pickRow = el('div'); root.append(pickRow);
    const opts = el('div', { class: 'row' }); root.append(opts);
    const btn = el('button', { class: 'b', type: 'button', 'aria-pressed': 'false', text: 'Show all four copies' });
    opts.append(btn);
    const gal = el('div', { class: 'gal' }); root.append(gal);
    let idx = 0, all = false;
    btn.onclick = () => { all = !all; btn.setAttribute('aria-pressed', all); render(); };
    function render() {
      gal.replaceChildren();
      const t = shapeTable(ram, idx);
      t.forEach((ptrs, n) => {
        const uniq = [...new Set(ptrs)];
        const list = all ? ptrs : [ptrs[0]];
        const wmax = Math.max(...list.map(a => ram[a])), hmax = Math.max(...list.map(a => ram[a + 1]));
        const s = 3, gap = 6;
        const cv = el('canvas', { width: list.length * (wmax * 8 * s + gap), height: hmax * s });
        const ctx = cv.getContext('2d');
        ctx.fillStyle = '#000'; ctx.fillRect(0, 0, cv.width, cv.height);
        list.forEach((a, i) => drawShape(ctx, ram, a, i * (wmax * 8 * s + gap), 0, s));
        cv.style.background = '#000';
        const cap = el('figcaption');
        cap.append(document.createTextNode('Shape ' + n + ' · ' + ram[ptrs[0]] * 4 + '×' + ram[ptrs[0] + 1] + ' · '));
        cap.append(code(ptrs[0]));
        cap.append(document.createTextNode(uniq.length === 1 ? ' · one copy' : ' · ' + uniq.length + ' copies'));
        gal.append(el('figure', { class: 'gal-cell' }, [cv, cap]));
      });
    }
    picker(pickRow, SCENES.map(s => 'Scene ' + s.n + ': ' + s.name), i => { idx = SCENES[i].idx; render(); });
  }

  // Graphics: a walking Goonie, drawn the way draw_object ($0C8A) and goonie_frame ($0C36) draw it,
  // pass by pass: x moves two units a pass, the column is x / 4, and bit 1 of x picks the frame.
  async function mountWalk(root) {
    let G; try { G = await load(); } catch (e) { root.textContent = 'The walk needs listing.json: ' + e.message; return; }
    const ram = G.ram, t = shapeTable(ram, 0), s = 4;
    const cv = el('canvas', { class: 'scr', width: 112 * s, height: 30 * s }); root.append(cv);
    const row = el('div', { class: 'row' }); root.append(row);
    const step = el('button', { class: 'b', type: 'button', text: 'Next pass' });
    const play = el('button', { class: 'b', type: 'button', 'aria-pressed': 'false', text: 'Walk' });
    row.append(step, play);
    const out = el('p', { class: 'kv' }); root.append(out);
    const ctx = cv.getContext('2d');
    let x = 8, timer = null;
    function draw() {
      ctx.fillStyle = '#000'; ctx.fillRect(0, 0, cv.width, cv.height);
      ctx.strokeStyle = 'rgba(255,255,255,.18)';
      for (let c = 0; c <= 56; c++) { ctx.beginPath(); ctx.moveTo(c * 8 * s + .5, 0); ctx.lineTo(c * 8 * s + .5, cv.height); ctx.stroke(); }
      const frame = (x & 2) ? 2 : 0, a = t[frame][x & 3];
      drawShape(ctx, ram, a, (x >> 2) * 8 * s, 6 * s, s);
      ctx.fillStyle = '#ffe14d'; ctx.fillRect(2 * x * s, 0, 2, 5 * s);
      out.replaceChildren(document.createTextNode('x = ' + x + ' (' + 2 * x + ' pixels) · column ' + (x >> 2) + ' · frame ' + frame + ' · '), code(a));
    }
    function adv() { x += 2; if (x > 100) x = 8; draw(); }
    step.onclick = adv;
    play.onclick = () => {
      if (timer) { clearInterval(timer); timer = null; play.setAttribute('aria-pressed', 'false'); return; }
      timer = setInterval(adv, 80); play.setAttribute('aria-pressed', 'true');   // a pass is four frames, 80 ms
    };
    draw();
  }

  // Music: the four tunes through the port of the Pearl Music Player.
  async function mountMusic(root) {
    if (!window.C64Sid) { root.textContent = 'This player needs the site’s shared script, lib/sid.js.'; return; }
    if (!window.GOONMUSIC) { root.textContent = 'This player needs reference/goonies-music.js.'; return; }
    let G; try { G = await load(); } catch (e) { root.textContent = e.message; return; }
    C64Sid.mount(root, {
      driver: GOONMUSIC.createDriver,
      data: Array.from(G.ram.slice(0xBA00, 0xD000)),
      tunes: ['Tune 0: the title and the ending', 'Tune 1: scenes 1, 5, 7, and 8', 'Tune 2: scenes 3 and 4', 'Tune 3: scene 2'],
      rows: [
        { k: 'Reading', f: (v) => v.on ? v.data : 'not used' },
        { k: 'Waveform', f: (v) => ({ 0x11: 'triangle', 0x21: 'sawtooth', 0x41: 'pulse', 0x81: 'noise', 0x51: 'triangle + pulse' })[v.waveform & 0xFB] || hex(v.waveform, 2) },
      ],
    });
  }

  return { SCENES, KINDS, load, drawShape, shapeTable, rects, picker, mountMap, mountShapes, mountWalk, mountMusic, hex, el };
})();
if (typeof module !== 'undefined') module.exports = GOON;
