/* Chiller: the page's widgets. Pictures are drawn from listing.json (the bytes the Source tab
   shows) with ../../lib/c64.js. createDriver() is the music driver ($60A0-$61F1), checked
   write for write against the game's own code in kit/c64/cpu6502.js (work/test_music.js). */
(function () {
  'use strict';
  const NAMES = ['The forest', 'The cinema', 'The ghetto', 'The graveyard', 'The haunted house',
    'The house, back', 'The graveyard, back', 'The ghetto, back', 'The cinema, back', 'The forest, back'];
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const hex = (n, w) => '$' + n.toString(16).toUpperCase().padStart(w || 4, '0');
  function press(group, btn) { $$(group).forEach(b => b.setAttribute('aria-pressed', b === btn ? 'true' : 'false')); }
  function need(el) {
    if (!el) return false;
    if (globalThis.C64) return true;
    el.insertAdjacentHTML('afterend', '<p class="note">This picture needs the site’s shared script, ../../lib/c64.js: open the page from the built site.</p>');
    return false;
  }

  globalThis.ChillerPage = {};

  // ---- small drawing helpers on the game's own glyphs and sprites ----
  const FONT = G => G.ram.subarray(0x3000, 0x3800);   // the play set as loaded: text glyphs $80-$BF
  function textRow(G, cv, addr, n, rows, colour) {
    const s = 2, ctx = C64.canvas(cv, n * 8 * s, rows * 8 * s), f = FONT(G);
    ctx.fillStyle = '#000'; ctx.fillRect(0, 0, cv.width, cv.height);
    for (let r = 0; r < rows; r++) for (let i = 0; i < n; i++)
      C64.drawGlyph(ctx, f, G.ram[addr[r] + i], i * 8 * s, r * 8 * s, s, C64.PAL[colour[r]]);
  }
  function spriteMC(ctx, G, ptr, px, py, s, cols) {       // cols: [sprite colour, $D025, $D026]
    const d = G.ram.subarray(ptr * 64, ptr * 64 + 63);
    for (let y = 0; y < 21; y++) for (let x = 0; x < 12; x++) {
      const b = d[y * 3 + (x >> 2)], v = (b >> (6 - 2 * (x & 3))) & 3;
      if (!v) continue;
      ctx.fillStyle = C64.PAL[v === 1 ? cols[1] : v === 2 ? cols[0] : cols[2]];
      ctx.fillRect(px + x * 2 * s, py + y * s, 2 * s, s);
    }
  }

  // ---- 04: crosses ----
  function crosses(G) {
    const cv = $('#xc'); if (!need(cv)) return;
    let who = 0, col = 14;
    function draw() {
      const s = 2, ctx = C64.canvas(cv, 192 * s, 60 * s), f = G.ram.subarray(0x3000, 0x3800);
      ctx.fillStyle = '#000'; ctx.fillRect(0, 0, cv.width, cv.height);
      // standing frames: the boy's $E2, the girl's $F2 (player_swap adds $10); sprite colours as
      // the game sets them ($D027 = 10, $D025 = 9, $D026 = 1)
      spriteMC(ctx, G, who ? 0xF2 : 0xE2, 40, 10, s, [10, 9, 1]);
      const taken = ((col >> 2) & 1) === who;
      // the cross, tile $57, drawn in multicolour as the screen shows it
      if (!taken) C64.drawGlyphMC(ctx, G.ram.subarray(0x8000, 0x8400), 0x57, 110 * s, 22 * s, s * 2,
        [null, C64.PAL[1], C64.PAL[7], C64.PAL[col & 7]]);
      ctx.strokeStyle = C64.PAL[who ? 10 : 6]; ctx.lineWidth = 6; ctx.strokeRect(3, 3, cv.width - 6, cv.height - 6);
      $('#xc-kv').innerHTML = `colour <b>${col}</b> = <b>%${col.toString(2).padStart(4, '0')}</b>, bit 2 is <b>${(col >> 2) & 1}</b>; ` +
        `player <b>$5A08 = ${who}</b> → ` + (taken ? '<b>taken</b>: a space goes in its place and the counter steps' : '<b>left alone</b>');
    }
    $$('[data-who]').forEach(b => b.addEventListener('click', () => { who = +b.dataset.who; press('[data-who]', b); draw(); }));
    $$('[data-col]').forEach(b => b.addEventListener('click', () => { col = +b.dataset.col; press('[data-col]', b); draw(); }));
    draw();
  }

  // ---- 05: the energy bar, 33 cells of 8 steps ($042E on, glyphs $A1-$A9) ----
  function energy(G) {
    const cv = $('#eb'); if (!need(cv)) return;
    let steps = 33 * 8, poison = 0, gain = 0, log = 'A full bar: 264 steps.';
    function draw() {
      const s = 2, n = 35, ctx = C64.canvas(cv, n * 8 * s, 16 * s), f = FONT(G);
      ctx.fillStyle = '#000'; ctx.fillRect(0, 0, cv.width, cv.height);
      for (let i = 0; i < 33; i++) {
        const v = Math.max(0, Math.min(8, steps - i * 8)), g = v === 8 ? 0xA9 : 0xA1 + v;
        const cell = 46 + i, cb = G.ram[0x8800 + (cell >> 1)];   // the forest's colour map, row 1
        const c = cell & 1 ? cb >> 4 : cb & 15, code = v ? g : 0xA0;
        // colour 8 and up is a multicolour cell in colour & 7 (one bar cell is 13: green, not light green)
        if (c & 8) C64.drawGlyphMC(ctx, f, code, (i + 1) * 8 * s, 4 * s, s,
          [null, C64.PAL[G.ram[0x700E] & 15], C64.PAL[G.ram[0x700F] & 15], C64.PAL[c & 7]]);
        else C64.drawGlyph(ctx, f, code, (i + 1) * 8 * s, 4 * s, s, C64.PAL[c]);
      }
      $('#eb-kv').innerHTML = `<b>${steps}</b> of 264 steps · ${log}` + (steps <= 0 ? ' <b>GAME OVER.</b>' : '');
    }
    const act = {
      walk: () => { const k = Math.floor(1000 / 765); steps -= k; log = `1,000 passes of walking: ${k} step off (one per 765).`; },
      touch: () => { steps -= 2; log = 'An enemy runs into you: two steps of poison, again on every pass it stays.'; },
      toad: () => { steps -= 24; log = 'A toadstool: 24 steps of poison, taken one at a time with a border flash.'; },
      mush: () => { const room = 264 - steps, g = Math.min(23, room); steps += g;
        log = `A mushroom: ${g} steps back` + (23 - g ? `, and ${(23 - g) * 10} points for the ${23 - g} that did not fit.` : '.'); },
      reset: () => { steps = 264; log = 'A full bar: 264 steps.'; },
    };
    $$('[data-e]').forEach(b => b.addEventListener('click', () => { act[b.dataset.e](); steps = Math.max(0, steps); draw(); }));
    draw();
  }

  // ---- the cast: the boy's frames $D8-$E7 at $3600, the girl's 16 on ($E8-$F7) ----
  function players(G) {
    const cv = $('#pl'); if (!need(cv)) return;
    const ctx = C64.canvas(cv, 720, 140);
    ctx.fillStyle = '#000'; ctx.fillRect(0, 0, cv.width, cv.height);
    // walking left $D8-$DB, right $DC-$DF, jumping $E0 $E1, standing $E2 $E6 (facts.md)
    const F = [0xD8, 0xD9, 0xDA, 0xDB, 0xDC, 0xDD, 0xDE, 0xDF, 0xE0, 0xE1, 0xE2, 0xE6];
    for (let who = 0; who < 2; who++) F.forEach((p, j) =>
      spriteMC(ctx, G, p + 16 * who, 12 + j * 58 + (j >> 2) * 8, 6 + who * 68, 2, [10, 9, 1]));
  }

  // ---- the enemies of each screen, animated ----
  // Each slot steps from its first frame (record +$1D) to its last (+$22) and back to the first, as
  // enemy_move ($CCAB) does. Colours are the ones the game sets on arrival ($D029-$D02D);
  // multicolour sprites share $D025 and $D026.
  const LIVE_COL = [[2,3,4,5,6],[6,7,7,5,7],[11,11,11,5,12],[2,3,4,5,9],[0,3,4,5,6],
                    [0,11,1,5,11],[2,3,14,5,9],[11,11,11,5,1],[11,7,7,5,7],[2,3,4,5,0]];
  const still = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
  const movers = [];
  let ticking = false;
  function animate(m) {
    movers.push(m);
    if (ticking || still) return;
    ticking = true; let t = 0;
    setInterval(() => { t++; for (const x of movers) x(t); }, 160);
  }
  function slotFrames(G, R, k) {
    const first = G.ram[R + 0x1D + k], last = G.ram[R + 0x22 + k], f = [first];
    for (let p = first; p !== last && f.length < 256; ) { p = (p + 1) & 255; f.push(p); }
    return { first, last, f };
  }
  const rec = (G, n) => G.ram[0x7290 + 2 * n] | G.ram[0x7291 + 2 * n] << 8;
  function enemies(G) {
    const cv = $('#en'), pick = $('#en-pick'); if (!need(cv)) return;
    let cur = 0, slots = [];
    NAMES.forEach((nm, i) => pick.insertAdjacentHTML('beforeend',
      `<button class="b" type="button" data-n="${i}" aria-pressed="${i === 0}">${nm}</button>`));
    const ctx = C64.canvas(cv, 720, 90);
    function frame(t) {
      ctx.fillStyle = '#000'; ctx.fillRect(0, 0, cv.width, cv.height);
      slots.forEach((sl, k) => spriteMC(ctx, G, sl.f[t % sl.f.length], 36 + k * 144, 12, 3, [LIVE_COL[cur][k], 9, 1]));
    }
    function pickScreen() {
      const R = rec(G, cur);
      slots = [0, 1, 2, 3, 4].map(k => slotFrames(G, R, k));
      $('#en-kv').innerHTML = `Settings at <b>${hex(R)}</b> · ` + slots.map((sl, k) =>
        `slot ${k}: <b>${hex(sl.first, 2)}</b>-<b>${hex(sl.last, 2)}</b>, ${sl.f.length} frame${sl.f.length > 1 ? 's' : ''}`).join(' · ');
      frame(0);
    }
    let t0 = 0;
    animate(t => { t0 = t; frame(t); });
    pick.addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; cur = +b.dataset.n; press('#en-pick button', b); pickScreen(); frame(t0); });
    pickScreen();
  }

  // ---- every enemy animation in the game, once each, with the screens that use it ----
  function gallery(G) {
    const root = $('#gal'); if (!need(root)) return;
    const seen = new Map();
    for (let n = 0; n < 10; n++) {
      const R = rec(G, n);
      for (let k = 0; k < 5; k++) {
        const sl = slotFrames(G, R, k), key = sl.first + '-' + sl.last;
        if (!seen.has(key)) seen.set(key, { ...sl, col: LIVE_COL[n][k], where: [] });
        const w = seen.get(key).where, nm = NAMES[n].replace(/^The /, w.length ? 'the ' : 'The ');
        if (!w.some(x => x.toLowerCase() === nm.toLowerCase())) w.push(nm);
      }
    }
    for (const a of seen.values()) {
      const cell = document.createElement('figure'); cell.className = 'gal-cell';
      const cv = document.createElement('canvas');
      cv.setAttribute('role', 'img');
      cv.setAttribute('aria-label', `Enemy frames ${hex(a.first, 2)} to ${hex(a.last, 2)}`);
      const cap = document.createElement('figcaption');
      cap.innerHTML = `<code>${hex(a.first * 64)}</code> · ${a.f.length} frame${a.f.length > 1 ? 's' : ''}<br>${a.where.join('; ')}`;
      cell.append(cv, cap); root.append(cell);
      const ctx = C64.canvas(cv, 24 * 3, 21 * 3);
      const draw = t => { ctx.fillStyle = '#000'; ctx.fillRect(0, 0, cv.width, cv.height); spriteMC(ctx, G, a.f[t % a.f.length], 0, 0, 3, [a.col, 9, 1]); };
      draw(0);
      if (a.f.length > 1) animate(draw);
    }
  }

  // ---- the way-home forest's slot 1: frames $88 to $F2, through whatever memory they point at ----
  function shifter(G) {
    const cv = $('#shift'); if (!need(cv)) return;
    const sl = slotFrames(G, rec(G, 9), 1), kv = $('#shift-kv');
    const what = p => p < 0xA8 ? 'an enemy shape' : p < 0xC0 ? 'program code' : p < 0xD8 ? 'the character set' : p < 0xE8 ? "one of the boy's frames" : "one of the girl's frames";
    const ctx = C64.canvas(cv, 24 * 4, 21 * 4);
    const draw = t => {
      const p = sl.f[t % sl.f.length];
      ctx.fillStyle = '#000'; ctx.fillRect(0, 0, cv.width, cv.height);
      spriteMC(ctx, G, p, 0, 0, 4, [LIVE_COL[9][1], 9, 1]);
      kv.innerHTML = `frame <b>${hex(p, 2)}</b>, read from <b>${hex(p * 64)}</b>: ${what(p)} · ${t % sl.f.length + 1} of ${sl.f.length}`;
    };
    draw(0); animate(draw);
  }

  // ---- links that open the Maps tab on a screen show a map pin ----
  (function pins() {
    const PIN = '<svg viewBox="0 0 16 20" width="14" height="18" aria-hidden="true"><path fill="currentColor" fill-rule="evenodd" d="M8 1a6 6 0 0 0-6 6c0 4.5 6 12 6 12s6-7.5 6-12a6 6 0 0 0-6-6zm0 3.8a2.2 2.2 0 1 1 0 4.4a2.2 2.2 0 1 1 0-4.4z"/></svg>';
    const go = () => $$('a[href*="levels.html?screen="]:not(.pin)').forEach(el => {
      el.classList.add('pin');
      if (!el.textContent.trim()) { el.innerHTML = PIN; if (!el.getAttribute('aria-label')) el.setAttribute('aria-label', 'Show on the map'); }
      else el.insertAdjacentHTML('afterbegin', PIN);
    });
    if (typeof document === 'undefined') return;
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', go); else go();
  })();

  // ---- 03: the music driver ($60A0-$61F1), ported; see work/music_port.js and test_music.js ----
  function createDriver(M) {
    // Tune 0 is this copy's in-play tune (the first release), 1 the re-release's in-play tune, from
    // reference/music-v2.json; its level-start and game-over tunes are the same bytes as this copy's,
    // and its player differs only in the gate-off compare at $60B6 (1 where this copy has 3). 2 and 3 are
    // level start and game over, the same in both.
    const mems = [M, M.v2].map(d => { const x = new Uint8Array(0x10000); if (d) x.set(d.bytes, d.base); return x; });
    let m = mems[0], gate = 3;
    const sid = new Uint8Array(25);
    let writes = [], pos = 0, loop = 0, timer = 0, tempo = 0, count = 0, w1 = 0, w2 = 0, on = false, cur = 0, acc = 0;
    const last = [null, null, null];
    const W = (r, v) => { sid[r] = v & 255; writes.push(r, v & 255); };
    const fetch = () => { pos = (pos + 1) & 0xFFFF; return m[pos]; };          // $61E9 music_fetch
    const START = [0x61F8, 0x6A18, 0x6B10];
    function init(t) {
      for (let r = 0; r < 25; r++) sid[r] = 0;
      writes = []; for (let r = 1; r < 25; r++) writes.push(r, 0);
      timer = 0; count = 0; acc = 0;
      const v2 = t === 1 && M.v2;
      m = mems[v2 ? 1 : 0]; gate = v2 ? M.v2.gate : 3; cur = M.v2 ? [0, 0, 1, 2][t || 0] : t || 0;
      pos = loop = START[cur];
      W(0x15, 0x05); W(0x16, 0x45); W(0x17, 0xF1); W(0x18, 0x3F);               // $60A0 music_init_filter
      on = true;
    }
    function stop() { on = false; for (let r = 0; r < 25; r++) sid[r] = 0; writes = []; }
    function irq() {                                                           // $60F5 music_irq
      writes = [];
      if (!on) return;
      if (timer !== 0) { timer = (timer - 1) & 255; if (timer === gate) { W(0x04, (w1 - 1) & 255); W(0x0B, 0x50); } return; }
      for (let guard = 0; guard < 4096; guard++) {                             // $6100
        const c = fetch(), a = pos;
        switch (c) {
          case 0x0E: { const hi = fetch(), lo = fetch(); W(1, hi); W(0, lo); W(4, 0); W(4, w1); last[0] = { addr: a, c, f: hi << 8 | lo }; break; }
          case 0x26: { const hi = fetch(), lo = fetch(); W(8, hi); W(7, lo); W(0x0B, 0); W(0x0B, w2); last[1] = { addr: a, c, f: hi << 8 | lo }; break; }
          case 0x3E: { const h1 = fetch(), l1 = fetch(), h2 = fetch(), l2 = fetch();
            W(1, h1); W(0, l1); W(8, h2); W(7, l2);
            last[0] = { addr: a, c, f: h1 << 8 | l1 }; last[1] = { addr: a, c, f: h2 << 8 | l2 }; }
          // falls through, as $613E runs on into $6156
          case 0x56: W(4, 0); W(0x0B, 0); W(4, w1); W(0x0B, w2); break;
          case 0x6B: tempo = fetch(); return;
          case 0x74: timer = tempo; return;
          case 0x7C: count = (count + 1) & 255; if (cur !== 0) on = false; return;   // the game stops waiting here
          case 0x82: w1 = fetch(); w2 = fetch(); break;
          case 0x91: W(5, fetch()); W(0x0C, fetch()); W(6, fetch()); W(0x0D, fetch()); break;
          case 0xAC: W(2, fetch()); W(3, fetch()); W(9, fetch()); W(0x0A, fetch()); break;
          case 0xC7: pos = loop; return;
          case 0x00: break;
          default: on = false; return;
        }
      }
    }
    // The player calls play() once a PAL frame (19,656 cycles); the game's interrupt is the KERNAL's
    // CIA timer, every 16,421 cycles, so a frame runs it once or twice.
    function play() {
      const all = []; acc += 19656;
      while (acc >= 16421) { acc -= 16421; irq(); for (const x of writes) all.push(x); }
      writes = all;
    }
    return { init, stop, play, sid, get writes() { return writes; }, playing: () => on,
      voice: x => ({ read: last[x] }) };
  }
  function music(G) {
    const root = $('#sid');
    if (!root) return;
    if (!globalThis.C64Sid) { root.textContent = 'The player needs the site’s shared sound script, ../../lib/sid.js: open this page from the built site.'; return; }
    const M = { base: 0x61F8, bytes: Array.from(G.ram.subarray(0x61F8, 0x6BCD)) };
    const S = C64Sid;
    fetch('reference/music-v2.json').then(r => r.json()).then(v2 => { M.v2 = v2; }).catch(() => {}).then(() => S.mount(root, {
      driver: createDriver, data: M, tunes: M.v2 ? ['In play', 'In play', 'Level start', 'Game over'] : ['In play', 'Level start', 'Game over'],
      filter: '6581',                                                          // the game's filter, $60A0
      rows: [
        { k: 'Command', f: v => v.read && `${S.hex(v.read.addr, 4)}: ${S.hex(v.read.c, 2)}` },
        { in: true, f: v => v.read && ({ 0x0E: 'note, voice 1', 0x26: 'note, voice 2', 0x3E: 'note, both voices' })[v.read.c] },
      ],
      mark: (v, p) => !!(v.read && (!p || !p.read || p.read.addr !== v.read.addr)),
    })).then(() => {
      // One In play button and a release toggle: the toggle points the button at tune 0 or 1, and
      // restarts it if it is playing. The level-start and game-over tunes are the same in both.
      const ver = $('#sid-ver'), inplay = root.querySelector('[data-tune="0"]'), other = root.querySelector('[data-tune="1"]');
      if (!M.v2 || !ver || !inplay || !other) return;
      other.remove();
      ver.hidden = false;
      $$('[data-ver]', ver).forEach(b => b.addEventListener('click', () => {
        press('#sid-ver [data-ver]', b);
        const was = inplay.getAttribute('aria-pressed') === 'true';
        inplay.dataset.tune = b.dataset.ver;
        if (was) inplay.click();
      }));
    });
  }

  // ---- 09, 10: text from the game's bytes ----
  function texts(G) {
    const s = $('#silver'), c = $('#ctrl');
    if (need(s)) textRow(G, s, [0x8E00, 0x8400], 40, 2, [7, 7]);
    if (need(c)) textRow(G, c, [0x574A], 19, 1, [1]);
  }

  // ---- start: the game image from listing.json ----
  if (!globalThis.C64) {                                   // opened from disk: say so beside each picture
    ['#pl', '#xc', '#eb', '#en', '#gal', '#silver', '#ctrl', '#shift'].forEach(id => need($(id)));
    if ($('#sid')) $('#sid').textContent = 'The player needs the site’s shared sound script, ../../lib/sid.js: open this page from the built site.';
    return;
  }
  C64.load('listing.json').then(G => {
    for (const f of [music, crosses, energy, players, enemies, gallery, shifter, texts]) {
      try { f(G); } catch (e) { console.error(f.name, e); }
    }
  }).catch(e => {
    console.error(e);
    const anchor = $('#xc') || $('#sid') || $('#silver');
    if (anchor) anchor.insertAdjacentHTML('afterend', '<p class="note">The game’s bytes (listing.json) could not be loaded: open the page from the built site.</p>');
  });
  globalThis.ChillerPage.createDriver = createDriver;
})();
