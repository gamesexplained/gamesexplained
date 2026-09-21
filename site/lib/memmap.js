// The footprint widget: a game's use of the 64 KB address space, one pixel per byte,
// 512 bytes per row, drawn from memmap.json (written by kit/scripts/build.py).
window.C64Map = (function () {
  const COLOURS = { code: '#e8a33d', graphics: '#6fc7d4', levels: '#8fd17a', sound: '#d97f6e', text: '#edf171',
                    tables: '#8f7fe0', variables: '#c46c71', runtime: '#3a3d6a', rom: '#2a2c4a', unused: '#12142c' };
  const LABELS = { code: 'code', graphics: 'graphics', levels: 'level data', sound: 'sound', text: 'text',
                   tables: 'tables', variables: 'variables', runtime: 'screen, bitmap, colour, stack, I/O', rom: 'ROM the game runs under', unused: 'unused' };
  const hex = a => '$' + a.toString(16).toUpperCase().padStart(4, '0');
  async function render(el, url, opts = {}) {
    const M = await fetch(url).then(r => r.json());
    const W = 512, H = 128, mini = !!opts.mini;
    el.innerHTML = '';
    const cv = document.createElement('canvas');
    if (!mini && opts.compare) { const note = document.createElement('p'); note.className = 'mute'; note.style.cssText = 'font-family:var(--fm);font-size:12px;margin:0 0 6px'; note.textContent = opts.compare; el.appendChild(note); }
    cv.style.width = '100%'; cv.style.aspectRatio = W + ' / ' + H;
    cv.style.display = 'block'; cv.style.borderRadius = '6px'; cv.style.border = '1px solid var(--line)';
    el.appendChild(cv);
    const ctx = cv.getContext('2d');
    // Vertical fill by default: each column is 128 bytes, so the picture reads as a
    // ruler from $0000 on the left to $FFFF on the right and the axis labels are true.
    // opts.orient = 'h' gives the row-major layout (512 bytes per row) instead.
    const vertical = opts.orient !== 'h';
    // The map is 512 x 128 cells but the element is rarely a whole multiple of that, so a
    // cell-sized bitmap scaled by the browser lands on fractional device pixels and a
    // one-cell run gets dropped, doubled or shifted by a row depending on the width.
    // Instead the canvas is sized to the element's device pixels and every run is drawn as
    // rectangles snapped to whole pixels, never thinner than one, so a 64-byte table is the
    // same line at every width. Redrawn when the element's width changes.
    const draw = () => {
      const dpr = window.devicePixelRatio || 1, cssW = cv.clientWidth || W;
      cv.width = Math.round(cssW * dpr); cv.height = Math.round(cv.width * H / W);
      const sx = cv.width / W, sy = cv.height / H;
      const cell = (x0, y0, x1, y1) => {             // cells [x0,x1] x [y0,y1], inclusive
        const px0 = Math.round(x0 * sx), py0 = Math.round(y0 * sy);
        ctx.fillRect(px0, py0, Math.max(1, Math.round((x1 + 1) * sx) - px0), Math.max(1, Math.round((y1 + 1) * sy) - py0));
      };
      const span = (a, n) => {                       // one run as at most three rectangles
        const last = a + n - 1;
        if (vertical) {
          const c0 = a >> 7, c1 = last >> 7;
          if (c0 === c1) return cell(c0, a & 127, c0, last & 127);
          cell(c0, a & 127, c0, 127); if (c1 > c0 + 1) cell(c0 + 1, 0, c1 - 1, 127); cell(c1, 0, c1, last & 127);
        } else {
          const r0 = a >> 9, r1 = last >> 9;
          if (r0 === r1) return cell(a & 511, r0, last & 511, r0);
          cell(a & 511, r0, 511, r0); if (r1 > r0 + 1) cell(0, r0 + 1, 511, r1 - 1); cell(0, r1, last & 511, r1);
        }
      };
      ctx.fillStyle = COLOURS.unused; ctx.fillRect(0, 0, cv.width, cv.height);
      for (const [a, n, k] of M.runs) { ctx.fillStyle = COLOURS[k] || COLOURS.unused; span(a, n); }
      if (mini) return;
      ctx.fillStyle = 'rgba(233,231,247,.12)';        // 4 KB gridlines
      for (let a = 0x1000; a < 0x10000; a += 0x1000) { if (vertical) ctx.fillRect(Math.round((a >> 7) * sx), 0, 1, cv.height); else ctx.fillRect(0, Math.round((a / W) * sy), cv.width, 1); }
    };
    draw();
    if (window.ResizeObserver) { let w = cv.clientWidth; new ResizeObserver(() => { if (cv.clientWidth !== w) { w = cv.clientWidth; draw(); } }).observe(cv); }
    if (mini) return M;
    const axis = document.createElement('div');
    axis.style.cssText = 'display:flex;justify-content:space-between;font-family:var(--fm);font-size:10.5px;color:var(--ink-mute);margin:4px 0 10px';
    axis.innerHTML = ['$0000', '$2000', '$4000', '$6000', '$8000', '$A000', '$C000', '$E000', '$FFFF'].map(x => `<span>${x}</span>`).join('');
    el.appendChild(axis);
    const legend = document.createElement('div');
    legend.style.cssText = 'display:flex;flex-wrap:wrap;gap:6px 16px;font-family:var(--fm);font-size:12px;color:var(--ink-soft)';
    const order = ['code', 'graphics', 'levels', 'sound', 'text', 'tables', 'variables', 'runtime', 'rom', 'unused'];
    legend.innerHTML = order.filter(k => M.totals[k]).map(k =>
      `<span><i style="display:inline-block;width:11px;height:11px;border-radius:2px;background:${COLOURS[k]};margin-right:6px;vertical-align:-1px;border:1px solid var(--line)"></i>${LABELS[k]} <span style="color:var(--ink-mute)">${M.totals[k].toLocaleString()}</span></span>`).join('');
    el.appendChild(legend);
    const tip = document.createElement('div');
    tip.style.cssText = 'font-family:var(--fm);font-size:12px;color:var(--ink-mute);min-height:1.6em;margin-top:8px';
    tip.textContent = 'Hover for the address; click to open it in the source.';
    el.appendChild(tip);
    const at = a => { for (const r of M.runs) if (a >= r[0] && a < r[0] + r[1]) return r; return null; };
    const symAt = a => { let best = null; for (const [sa, n] of M.symbols) { if (sa <= a) best = [sa, n]; else break; } return best; };
    const addrOf = e => { const b = cv.getBoundingClientRect(); const x = Math.floor((e.clientX - b.left) / b.width * W), y = Math.floor((e.clientY - b.top) / b.height * H); return Math.max(0, Math.min(0xFFFF, vertical ? x * H + y : y * W + x)); };
    cv.addEventListener('mousemove', e => {
      const a = addrOf(e), r = at(a), sy = symAt(a);
      const what = r ? (LABELS[r[2]] + (r[3] ? ' · ' + r[3] : '')) : 'unused';
      tip.textContent = `${hex(a)} · ${what}${sy && r && r[2] !== 'unused' && a - sy[0] < 1024 ? ' · ' + sy[1] + (a !== sy[0] ? '+' + (a - sy[0]) : '') : ''}`;
      cv.style.cursor = r && r[2] !== 'unused' ? 'pointer' : 'default';
    });
    cv.addEventListener('click', e => { const a = addrOf(e); if (at(a)) location.href = (opts.source || 'source.html') + '#' + a.toString(16).toUpperCase().padStart(4, '0'); });
    return M;
  }
  // The strip: the same 64 KB left to right in one row, each column the colour of whatever
  // most of its bytes are. The catalogue's compact map; the ruler is the same as render's.
  async function strip(el, url) {
    const M = await fetch(url).then(r => r.json());
    const RANK = ['code', 'graphics', 'levels', 'sound', 'text', 'tables', 'variables', 'runtime', 'rom', 'unused'];
    const cv = document.createElement('canvas'); el.innerHTML = ''; el.appendChild(cv);
    const draw = () => {
      const dpr = window.devicePixelRatio || 1, w = Math.max(64, Math.round((cv.clientWidth || 256) * dpr)), h = Math.max(1, Math.round((cv.clientHeight || 8) * dpr));
      cv.width = w; cv.height = h;
      const ctx = cv.getContext('2d'); ctx.fillStyle = COLOURS.unused; ctx.fillRect(0, 0, w, h);
      const per = 65536 / w, counts = new Array(w);
      for (const [a, n, k] of M.runs) {
        for (let c = Math.floor(a / per), c1 = Math.floor((a + n - 1) / per); c <= c1; c++) {
          const lo = Math.max(a, c * per), hi = Math.min(a + n, (c + 1) * per);
          (counts[c] = counts[c] || {})[k] = (counts[c][k] || 0) + (hi - lo);
        }
      }
      for (let c = 0; c < w; c++) {
        if (!counts[c]) continue;
        let best = null, bn = 0;
        for (const k of RANK) { const n = counts[c][k] || 0; if (n > bn) { bn = n; best = k; } }
        if (!best || best === 'unused') continue;
        ctx.fillStyle = COLOURS[best]; ctx.fillRect(c, 0, 1, h);
      }
    };
    draw();
    if (window.ResizeObserver) { let w = cv.clientWidth; new ResizeObserver(() => { if (cv.clientWidth !== w) { w = cv.clientWidth; draw(); } }).observe(cv); }
    return M;
  }
  return { render, strip, COLOURS, LABELS };
})();
