// The Fist II world map on the Maps and solution tab: every room's scenery drawn from the
// game's own tables, laid out by solver/maplayout.py, with its exits, scrolls and encounters.
// Needs ../../lib/c64.js and the game's memory from FIST.load().
const FISTMAP = (function () {
  const PITCH = 40;          // world units (columns) from one row of rooms to the next; a strip is 20 tall

  function world(d) {
    const w16 = a => d[a] | d[a + 1] << 8;
    const ex = []; let a = 0x4AEC;
    for (let r = 0; r < 123; r++) { const L = []; while (d[a]) { L.push([d[a], d[a + 1], d[a + 2], d[a + 3]]); a += 4; } a++; ex.push(L); }
    const area = r => d[0x4A71 + r];
    const ptr = i => d[0x501E + 2 * i] | d[0x501F + 2 * i] << 8;
    function items(r) {
      const i = r < 0x3C ? r : area(r) + d[0x501D], out = []; let p = ptr(i); const e = ptr(i + 1);
      while (p < e) { if (d[p] & 0x40) { out.push({ wall: true, t: d[p] & 0x0F, col: d[p + 1] }); p += 2; } else { out.push({ t: d[p] & 0x1F, bar: !!(d[p] & 0x80), col: d[p + 1], par: d[p + 2] }); p += 3; } }
      return out;
    }
    // The columns the screen can show: a wall stops the scroll at its column less or plus
    // barrier_width_l (find_room_barriers, $087A); with no wall beyond the exits, 21 past the last.
    function bounds(r) {
      const cols = ex[r].map(e => e[1]); if (!cols.length) cols.push(20);
      const mn = Math.min(...cols), mx = Math.max(...cols); let lo = 0, hi = null;
      for (const it of items(r)) {
        if (!(it.wall || it.bar)) continue; const w = d[0xABD + (it.t & 15)];
        if (it.col <= mn) lo = Math.max(lo, it.col - w);
        if (it.col >= mx) hi = hi == null ? it.col + w : Math.min(hi, it.col + w);
      }
      return [Math.max(lo, 0), hi == null ? mx + 21 : hi];
    }
    // Zone tables: words at $0F32 + offset + 2 * zone (load_zone_tables, $124A).
    const T = {}; [['clo', 0], ['chi', 6], ['glo', 12], ['ghi', 18], ['wid', 24], ['hei', 30], ['gb', 42], ['cb', 48]].forEach(([k, o]) => T[k] = [0, 1, 2].map(z => w16(0x0F32 + o + 2 * z)));
    const zone = ar => ar < d[0xE44] ? 0 : ar < d[0xE45] ? 1 : 2;
    // The 20 rows of screen codes the room's objects draw (setup_room_data $0FEC, draw_room $1556).
    function cells(r) {
      const ar = area(r), z = zone(ar), n = d[0xF68 + ar]; let base, i;
      if (z === 0) { base = 0x5BD7; i = 2 * ar; } else if (z === 1) { base = 0x68D8; i = 2 * (ar - d[0xE44]); } else { base = 0x78E2; i = 2 * (ar - d[0xE45]); }
      const tab = [[0x5BA7, 0x5BB7, 0x5BC7], [0x6854, 0x6880, 0x68AC], [0x7876, 0x789A, 0x78BE]][z];
      const X = base + w16(tab[0] + i), Y = base + w16(tab[1] + i), S = base + w16(tab[2] + i);
      const W = 296, C = new Uint8Array(W * 20);
      function shape(s, col, row) {
        const p = (d[T.glo[z] + s] | d[T.ghi[z] + s] << 8) + T.gb[z], w = d[T.wid[z] + s], h = d[T.hei[z] + s];
        for (let y = 0; y < h && row + y < 20; y++) for (let x = 0; x < w; x++) if (col + x >= 0 && col + x < W) C[(row + y) * W + col + x] = d[(p + y * w + x) & 0xFFFF];
      }
      for (let k = 0; k < n; k++) {
        const s = d[S + k]; if (s === 0xFF) continue;
        if (s < 0x80) { shape(s, d[X + k], d[Y + k]); continue; }
        let p = (d[T.clo[z] + (s & 0x7F)] | d[T.chi[z] + (s & 0x7F)] << 8) + T.cb[z];
        while (d[p] < 0x80) { shape(d[p], d[X + k] + d[p + 1], d[Y + k] + d[p + 2]); p += 3; }
      }
      return { z, W, C };
    }
    // Colours (setup_room_data, set_room_colours $11DA, paint_colour_ram $16B8). Scheme 8 is dark
    // until scroll 7 is delivered ($10D7-$10EA); the map draws it lit, as scheme 2.
    function colours(r) {
      const ar = area(r), z = zone(ar); let list, b8, c1, c2;
      if (z === 0) {
        let sch = { 4: 6, 5: 9, 7: 7, 6: 1 }[ar];
        if (sch == null) { const v = d[0xE52 + (r >> 1)]; sch = r & 1 ? v & 15 : v >> 4; if (sch === 8) sch = 2; }
        list = w16(0xE98 + 2 * d[0xE70 + sch]); b8 = d[0xE7A + sch]; c1 = d[0xE84 + sch]; c2 = d[0xE8E + sch];
      } else if (z === 1) { list = w16(0xED9 + 2 * d[0xEAD + ar - 8]); b8 = d[0xEC3 + ar - 8]; c1 = d[0xE4A]; c2 = d[0xE4D]; }
      else { list = w16(0xEEC + 2 * (r - 100)); b8 = d[0xE51]; c1 = d[0xE4B]; c2 = d[0xE4E]; }
      const cram = new Uint8Array(20 * 40), row = [];
      for (let p = list; row.length < 20; p++) for (let k = d[p] >> 3; k--;) row.push((d[p] & 7) | 8);
      for (let y = 0; y < 20; y++) cram.fill(row[y], y * 40, y * 40 + 40);
      if (ar === 6) {   // the chambers: paint_colour_ram patches colour memory ($1703-$173C)
        for (let y = 0; y <= 0x12; y++) { cram[246 + y] = cram[366 + y] = 15; cram[286 + y] = cram[326 + y] = cram[406 + y] = cram[446 + y] = 9; }
        for (let y = 0; y <= 4; y++) for (const o of [452, 612, 652, 692, 732, 739]) cram[o + y] = 10;
      }
      return { cram, bg: [b8 & 15, c1 & 15, c2 & 15] };
    }
    const enc = []; for (let i = 0; i < 54; i++) enc.push({ f: d[0xE609 + 3 * i], room: d[0xE60A + 3 * i], pos: d[0xE60B + 3 * i] });
    return { ex, area, items, bounds, cells, colours, zone, enc };
  }

  const RGB = C64.PAL.map(h => [1, 3, 5].map(i => parseInt(h.substr(i, 2), 16)));
  // One room as a canvas, 4 pixels to a column (a multicolour pixel each) and 8 to a row.
  function strip(Wd, d, r) {
    const [lo, hi] = Wd.bounds(r), { z, W, C } = Wd.cells(r), { cram, bg } = Wd.colours(r);
    const cs = [0xD800, 0xD000, 0xE000][z], w = (hi - lo) * 4;
    const cv = document.createElement('canvas'); cv.width = w; cv.height = 160;
    const ctx = cv.getContext('2d'), im = ctx.createImageData(w, 160), px = im.data;
    for (let y = 0; y < 20; y++) for (let c = lo; c < hi && c < W; c++) {
      // colour memory belongs to the screen, not the room; only the chambers, one screen wide, are patched by column
      const g = cs + C[y * W + c] * 8, k11 = cram[y * 40 + (Wd.area(r) === 6 ? c - lo : 0)] & 7;
      for (let yy = 0; yy < 8; yy++) { const b = d[g + yy];
        for (let x = 0; x < 4; x++) { const v = (b >> (6 - 2 * x)) & 3, rgb = RGB[v === 3 ? k11 : bg[v]], o = ((y * 8 + yy) * w + (c - lo) * 4 + x) * 4;
          px[o] = rgb[0]; px[o + 1] = rgb[1]; px[o + 2] = rgb[2]; px[o + 3] = 255; } }
    }
    ctx.putImageData(im, 0, 0);
    return cv;
  }

  function create(G, { canvas, layout, label, onSelect }) {
    const d = G.ram, Wd = world(d), B = [], full = new Map(), thumb = [];
    const rooms = Object.keys(layout).map(Number);
    rooms.forEach(r => B[r] = Wd.bounds(r));
    const X0 = r => layout[r][0], Y0 = r => layout[r][1] * PITCH;
    const SCROLL = {}; Wd.enc.forEach(e => { if ((e.f & 0x60) === 0x60) SCROLL[e.room] = { n: (e.f & 7) + 1, pos: e.pos }; });
    const UP = [2, 4, 10, 14, 20, 3, 5], EDGE = [18, 19, 12];
    // links, one per pair of rooms and columns
    const links = [], seen = new Set();
    rooms.forEach(r => Wd.ex[r].forEach(([t, c, v, dc]) => {
      if (!(v in layout)) return; const k1 = r + ':' + c + ':' + v, k2 = v + ':' + dc + ':' + r;
      if (seen.has(k2)) { links.find(l => l.k === k2).both = true; return; }
      seen.add(k1); links.push({ k: k1, r, t, c, v, dc, both: false });
    }));
    function getThumb(r) {
      if (!thumb[r]) { const s = getFull(r), t = document.createElement('canvas'); t.width = Math.max(1, s.width / 4); t.height = 40;
        const c = t.getContext('2d'); c.imageSmoothingEnabled = true; c.drawImage(s, 0, 0, t.width, 40); thumb[r] = t; }
      return thumb[r];
    }
    function getFull(r) {
      if (full.has(r)) { const s = full.get(r); full.delete(r); full.set(r, s); return s; }
      const s = strip(Wd, d, r); full.set(r, s);
      if (full.size > 40) full.delete(full.keys().next().value);
      return s;
    }
    const ctx = canvas.getContext('2d');
    let s = 1, ox = 0, oy = 0, sel = null, route = null, hover = null, cw = 0, ch = 0;
    const minx = Math.min(...rooms.map(r => X0(r) + B[r][0])), maxx = Math.max(...rooms.map(r => X0(r) + B[r][1]));
    const miny = Math.min(...rooms.map(Y0)) - 10, maxy = Math.max(...rooms.map(Y0)) + 30;
    function size() {
      const dpr = window.devicePixelRatio || 1, w = canvas.clientWidth, h = canvas.clientHeight;
      if (w !== cw || h !== ch) { cw = w; ch = h; canvas.width = w * dpr; canvas.height = h * dpr; }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    function fit(x0, y0, x1, y1) {
      size(); s = Math.min(cw / (x1 - x0), ch / (y1 - y0)) * 0.95; s = Math.min(Math.max(s, 0.15), 24);
      ox = cw / 2 - s * (x0 + x1) / 2; oy = ch / 2 - s * (y0 + y1) / 2; draw();
    }
    const fitAll = () => fit(minx, miny, maxx, maxy);
    function focus(r, col) {
      sel = r; const x0 = X0(r) + B[r][0], x1 = X0(r) + B[r][1], y = Y0(r);
      if (col != null) { size(); s = Math.max(s, 3); ox = cw / 2 - s * (X0(r) + col); oy = ch / 2 - s * (y + 10); draw(); }
      else fit(x0 - 30, y - 30, x1 + 30, y + 50);
      onSelect && onSelect(r);
    }
    // where a link leaves and arrives: the exit's column, on the side of the strip facing the other room
    function ends(l) {
      const ya = Y0(l.r), yb = Y0(l.v), xa = X0(l.r) + l.c, xb = X0(l.v) + l.dc;
      if (EDGE.includes(l.t) && ya === yb) return null;
      const down = yb > ya || (yb === ya && !UP.includes(l.t));
      return [xa, down ? ya + 20 : ya, xb, down ? yb : yb + 20, down];
    }
    function path(l) {
      const e = ends(l); if (!e) return null; const [xa, ya, xb, yb, down] = e;
      const mid = Math.abs(yb - ya) <= PITCH ? (ya + yb) / 2 : ya + (down ? 1 : -1) * (PITCH - 20) / 2;
      const mid2 = yb + (down ? -1 : 1) * (PITCH - 20) / 2;
      return Math.abs(yb - ya) <= PITCH ? [[xa, ya], [xa, mid], [xb, mid], [xb, yb]] : [[xa, ya], [xa, mid], [xb, mid], [xb, mid2], [xb, yb]];
    }
    const P = (x, y) => [ox + s * x, oy + s * y];
    function line(pts, col, w) {
      ctx.strokeStyle = col; ctx.lineWidth = w; ctx.beginPath();
      pts.forEach(([x, y], i) => { const [a, b] = P(x, y); i ? ctx.lineTo(a, b) : ctx.moveTo(a, b); }); ctx.stroke();
    }
    function tag(x, y, text, bg, fg) {
      ctx.font = '600 12px IBM Plex Mono, monospace'; const w = ctx.measureText(text).width + 10;
      ctx.fillStyle = bg; ctx.fillRect(x - w / 2, y - 9, w, 18); ctx.fillStyle = fg; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(text, x, y + 1); ctx.textAlign = 'left';
    }
    function draw() {
      size(); ctx.fillStyle = '#1b1e24'; ctx.fillRect(0, 0, cw, ch);
      const on = r => { const [a] = P(X0(r) + B[r][0], 0), [b] = P(X0(r) + B[r][1], 0), [, y] = P(0, Y0(r)); return b > 0 && a < cw && y + 20 * s > 0 && y < ch; };
      // rooms
      for (const r of rooms) {
        if (!on(r)) continue; const [x, y] = P(X0(r) + B[r][0], Y0(r)), w = (B[r][1] - B[r][0]) * s, h = 20 * s;
        const img = w > (B[r][1] - B[r][0]) * 1.1 ? getFull(r) : getThumb(r);
        ctx.imageSmoothingEnabled = w < img.width; ctx.drawImage(img, x, y, w, h);
        ctx.strokeStyle = r === sel ? '#ffffff' : route && route.rooms.has(r) ? '#ffd75e' : 'rgba(255,255,255,.18)'; ctx.lineWidth = r === sel || (route && route.rooms.has(r)) ? 2 : 1; ctx.strokeRect(x, y, w, h);
      }
      // links
      const faint = sel != null || route;
      for (const l of links) {
        const p = path(l); if (!p) continue; const hot = l.r === sel || l.v === sel;
        if (hot) continue;
        line(p, faint ? 'rgba(255,215,94,.2)' : 'rgba(255,215,94,.6)', 1);
      }
      for (const l of links) if (l.r === sel || l.v === sel) { const p = path(l); if (p) line(p, '#ffd75e', 2.5); }
      // the route
      if (route) route.hops.forEach(([r, c, t, v], i) => {
        const e = Wd.ex[r].find(x => x[1] === c && x[2] === v); if (!e || !(v in layout)) return;
        const p = path({ r, t, c, v, dc: e[3] }); const [hx, hy] = P(X0(r) + c, Y0(r) + 10);
        if (p) line(p, '#59d3ff', 3.5);
        if (s > 0.6) { ctx.fillStyle = '#59d3ff'; ctx.beginPath(); ctx.arc(hx, hy, 9, 0, 7); ctx.fill(); ctx.fillStyle = '#0b2530'; ctx.font = '700 11px IBM Plex Mono, monospace'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(i + 1, hx, hy + 1); ctx.textAlign = 'left'; }
      });
      // marks
      for (const r of rooms) {
        if (!on(r)) continue; const [x, y] = P(X0(r) + B[r][0], Y0(r));
        if (s > 1.2) { ctx.font = '600 11px IBM Plex Mono, monospace'; ctx.fillStyle = 'rgba(0,0,0,.6)'; ctx.fillRect(x + 1, y + 1, 30, 14); ctx.fillStyle = '#fff'; ctx.textBaseline = 'top'; ctx.fillText(r, x + 4, y + 2); }
        if (s > 0.9) Wd.enc.filter(e => e.room === r && (e.f & 0x60) !== 0x60).forEach(e => { const [ex_, ey] = P(X0(r) + e.pos, Y0(r) + 20); ctx.fillStyle = '#ff5b4a'; ctx.beginPath(); ctx.arc(ex_, ey - 4, 4, 0, 7); ctx.fill(); });
        const cx = P(X0(r) + (B[r][0] + B[r][1]) / 2, 0)[0];
        // zoomed out, the marks shrink to a number or a letter
        const big = s > 0.6, ty = y - (big ? 10 : 8);
        if (SCROLL[r]) { const [sx] = P(X0(r) + SCROLL[r].pos, 0); tag(sx, ty, (big ? 'scroll ' : '') + SCROLL[r].n, '#f2c230', '#2a1e00'); }
        if (r >= 68 && r <= 75) tag(cx, ty, (big ? 'chamber ' : 'C') + (r - 67), '#a98bff', '#160b35');
        if (r === 94) tag(cx, ty, big ? 'start' : 'S', '#7bd88f', '#062b10');
        if (r === 122) tag(cx, ty, big ? 'the end' : 'E', '#ff8c6b', '#2b0b03');
      }
      if (hover != null && hover !== sel) { const [x, y] = P(X0(hover) + B[hover][0], Y0(hover)); tag(x + 60, y + 20 * s + 12, label(hover), 'rgba(0,0,0,.8)', '#fff'); }
    }
    function at(px, py) {
      const x = (px - ox) / s, y = (py - oy) / s;
      return rooms.find(r => x >= X0(r) + B[r][0] && x <= X0(r) + B[r][1] && y >= Y0(r) && y <= Y0(r) + 20);
    }
    // pointer: drag to pan, wheel or pinch to zoom, click a room to choose it
    const pts = new Map(); let moved = 0, pinch = null;
    function zoom(f, px, py) { const ns = Math.min(Math.max(s * f, 0.15), 24); ox = px - (px - ox) * ns / s; oy = py - (py - oy) * ns / s; s = ns; draw(); }
    canvas.addEventListener('pointerdown', e => { canvas.setPointerCapture(e.pointerId); pts.set(e.pointerId, [e.offsetX, e.offsetY]); moved = 0; if (pts.size === 2) { const [a, b] = [...pts.values()]; pinch = Math.hypot(a[0] - b[0], a[1] - b[1]); } });
    canvas.addEventListener('pointermove', e => {
      if (!pts.has(e.pointerId)) { const r = at(e.offsetX, e.offsetY); if (r !== hover) { hover = r; canvas.style.cursor = r == null ? 'grab' : 'pointer'; draw(); } return; }
      const [px, py] = pts.get(e.pointerId); pts.set(e.pointerId, [e.offsetX, e.offsetY]);
      if (pts.size === 2 && pinch) { const [a, b] = [...pts.values()], dd = Math.hypot(a[0] - b[0], a[1] - b[1]); zoom(dd / pinch, (a[0] + b[0]) / 2, (a[1] + b[1]) / 2); pinch = dd; moved = 99; return; }
      ox += e.offsetX - px; oy += e.offsetY - py; moved += Math.abs(e.offsetX - px) + Math.abs(e.offsetY - py); draw();
    });
    const up = e => { if (pts.size === 1 && moved < 5) { const r = at(e.offsetX, e.offsetY); if (r != null) { sel = r; draw(); onSelect && onSelect(r); } } pts.delete(e.pointerId); if (pts.size < 2) pinch = null; };
    canvas.addEventListener('pointerup', up); canvas.addEventListener('pointercancel', e => pts.delete(e.pointerId));
    canvas.addEventListener('pointerleave', () => { if (hover != null) { hover = null; draw(); } });
    canvas.addEventListener('wheel', e => { e.preventDefault(); zoom(Math.exp(-e.deltaY * 0.0015), e.offsetX, e.offsetY); }, { passive: false });
    canvas.addEventListener('dblclick', e => zoom(2, e.offsetX, e.offsetY));
    window.addEventListener('resize', draw);
    function showRoute(hops) {
      if (!hops) { route = null; draw(); return; }
      const rs = new Set(); hops.forEach(([r, , , v]) => { rs.add(r); rs.add(v); }); route = { hops, rooms: rs };
      const L = [...rs].filter(r => r in layout);
      fit(Math.min(...L.map(r => X0(r) + B[r][0])) - 20, Math.min(...L.map(Y0)) - 30, Math.max(...L.map(r => X0(r) + B[r][1])) + 20, Math.max(...L.map(Y0)) + 50);
    }
    return { world: Wd, fitAll, focus, showRoute, zoom: f => { size(); zoom(f, cw / 2, ch / 2); }, draw, select: r => { sel = r; draw(); } };
  }
  return { create, world, strip };
})();
