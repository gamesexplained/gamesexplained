// The widgets of Bruce Lee's tabs. Every one draws from the game's own bytes, rebuilt from
// listing.json by the site's C64.load() (../../lib/c64.js).
const BRUCE = (function () {
  'use strict';
  const NAMES = ['black', 'white', 'red', 'cyan', 'purple', 'green', 'blue', 'yellow', 'orange', 'brown',
    'light red', 'dark grey', 'grey', 'light green', 'light blue', 'light grey'];
  // The three kinds of actor: where their frames start in frame_rows (frame_offsets, $59A5), how
  // many there are, and whether each shows two frames at once (Bruce and Yamo: frame n and n + 1,
  // build_sprites $2584) or one (the Ninja, always drawn black: frame_address $2719).
  const ACTORS = [
    { name: 'Bruce Lee', first: 0x00, count: 70, pair: true },
    { name: 'Yamo', first: 0x46, count: 70, pair: true },
    { name: 'The Ninja', first: 0x8C, count: 70, pair: false, black: true },
  ];
  let gameP = null;
  function load() { if (!gameP) gameP = C64.load('listing.json'); return gameP; }
  const hex = (v, n) => '$' + v.toString(16).toUpperCase().padStart(n || 4, '0');
  function el(tag, attrs, kids) {
    const e = document.createElement(tag);
    for (const k in attrs || {}) { if (k === 'text') e.textContent = attrs[k]; else e.setAttribute(k, attrs[k]); }
    for (const c of kids || []) e.append(c);
    return e;
  }
  // One frame as copy_shape ($26A0) puts it in a sprite: its address ($59BD/$5A8F), height ($5B61),
  // one or two bytes a row ($5CBF), bit 7 the leftmost pixel. A narrow frame lands one sprite row
  // lower than a wide one.
  function frame(ram, f) {
    return { a: ram[0x59BD + f] | ram[0x5A8F + f] << 8, h: ram[0x5B61 + f], w: ram[0x5CBF + f] ? 2 : 1, col: ram[0x5C33 + f] & 15 };
  }
  function drawFrame(ctx, ram, f, x0, y0, s, col) {
    const F = frame(ram, f), top = F.w === 2 ? 0 : 1;
    ctx.fillStyle = C64.PAL[col];
    for (let y = 0; y < F.h; y++) for (let b = 0; b < F.w; b++) {
      const v = ram[F.a + y * F.w + b];
      for (let i = 0; i < 8; i++) if (v & 0x80 >> i) ctx.fillRect(x0 + (b * 8 + i) * s, y0 + (y + top) * s, s, s);
    }
  }

  // Graphics: every frame each actor is drawn with, as the game shows it, on the room's grey.
  async function mountFrames(root) {
    let G; try { G = await load(); } catch (e) { root.textContent = 'The frames need listing.json: ' + e.message; return; }
    const ram = G.ram;
    const bar = el('div', { class: 'row', role: 'group', 'aria-label': 'Which actor' }); root.append(bar);
    const note = el('p', { class: 'kv' }); root.append(note);
    const gal = el('div', { class: 'gal' }); root.append(gal);
    const btns = ACTORS.map((A, i) => {
      const b = el('button', { class: 'b', type: 'button', 'aria-pressed': 'false', text: A.name });
      b.onclick = () => show(i); bar.append(b); return b;
    });
    function show(i) {
      const A = ACTORS[i];
      btns.forEach((b, k) => b.setAttribute('aria-pressed', k === i));
      gal.replaceChildren();
      const step = A.pair ? 2 : 1, s = 4;
      if (A.pair) {
        const c1 = frame(ram, A.first).col, c2 = frame(ram, A.first + 1).col;
        note.textContent = `${A.count / 2} poses from frames ${hex(A.first, 2)}-${hex(A.first + A.count - 1, 2)}: each pose is two sprites, one ${NAMES[c1 || c2]} and one ${NAMES[0]}, laid one over the other.`;
      } else note.textContent = `${A.count} poses from frames ${hex(A.first, 2)}-${hex(A.first + A.count - 1, 2)}, one sprite each, always drawn ${NAMES[0]}.`;
      for (let f = A.first; f < A.first + A.count; f += step) {
        const cv = el('canvas', { width: 24 * s, height: 22 * s, role: 'img' });
        const ctx = cv.getContext('2d');
        ctx.fillStyle = C64.PAL[12]; ctx.fillRect(0, 0, cv.width, cv.height);
        const fs = A.pair ? [f + 1, f] : [f];
        for (const g of fs) drawFrame(ctx, ram, g, 0, 0, s, A.black ? 0 : frame(ram, g).col);
        const parts = fs.slice().reverse().map(g => { const F = frame(ram, g); return `frame ${hex(g, 2)} ${F.w * 8}×${F.h}${A.black ? '' : ', ' + NAMES[F.col]}`; });
        cv.setAttribute('aria-label', A.name + ', ' + parts.join(' with '));
        const cap = el('figcaption', { text: parts.join(' + ') });
        gal.append(el('figure', { class: 'gal-cell' }, [cv, cap]));
      }
    }
    show(0);
  }
  return { load, mountFrames, frame, ACTORS };
})();
