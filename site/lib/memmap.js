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
    const W = 512, H = 128, s = opts.scale || 1, mini = !!opts.mini;
    el.innerHTML = '';
    const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
    cv.style.width = '100%'; cv.style.height = 'auto'; cv.style.imageRendering = 'pixelated';
    cv.style.display = 'block'; cv.style.borderRadius = '6px'; cv.style.border = '1px solid #292c58';
    el.appendChild(cv);
    const ctx = cv.getContext('2d');
    ctx.fillStyle = COLOURS.unused; ctx.fillRect(0, 0, W, H);
    for (const [a, n, k] of M.runs) {
      ctx.fillStyle = COLOURS[k] || '#fff';
      let p = a, left = n;
      while (left > 0) { const x = p % W, y = (p / W) | 0, run = Math.min(left, W - x); ctx.fillRect(x, y, run, 1); p += run; left -= run; }
    }
    if (mini) return M;
    // 4 KB gridlines and labels
    ctx.fillStyle = 'rgba(233,231,247,.10)';
    for (let a = 0x1000; a < 0x10000; a += 0x1000) ctx.fillRect(0, a / W, W, 1);
    const axis = document.createElement('div');
    axis.style.cssText = 'display:flex;justify-content:space-between;font-family:var(--fm);font-size:10.5px;color:var(--ink-mute);margin:4px 0 10px';
    axis.innerHTML = ['$0000', '$2000', '$4000', '$6000', '$8000', '$A000', '$C000', '$E000', '$FFFF'].map(x => `<span>${x}</span>`).join('');
    el.appendChild(axis);
    const legend = document.createElement('div');
    legend.style.cssText = 'display:flex;flex-wrap:wrap;gap:6px 16px;font-family:var(--fm);font-size:12px;color:var(--ink-soft)';
    const order = ['code', 'graphics', 'levels', 'sound', 'text', 'tables', 'variables', 'runtime', 'rom', 'unused'];
    legend.innerHTML = order.filter(k => M.totals[k]).map(k =>
      `<span><i style="display:inline-block;width:11px;height:11px;border-radius:2px;background:${COLOURS[k]};margin-right:6px;vertical-align:-1px;border:1px solid #292c58"></i>${LABELS[k]} <span style="color:var(--ink-mute)">${M.totals[k].toLocaleString()}</span></span>`).join('');
    el.appendChild(legend);
    const tip = document.createElement('div');
    tip.style.cssText = 'font-family:var(--fm);font-size:12px;color:var(--ink-mute);min-height:1.6em;margin-top:8px';
    tip.textContent = 'Hover for the address; click to open it in the source.';
    el.appendChild(tip);
    const at = a => { for (const r of M.runs) if (a >= r[0] && a < r[0] + r[1]) return r; return null; };
    const symAt = a => { let best = null; for (const [sa, n] of M.symbols) { if (sa <= a) best = [sa, n]; else break; } return best; };
    const addrOf = e => { const b = cv.getBoundingClientRect(); const x = Math.floor((e.clientX - b.left) / b.width * W), y = Math.floor((e.clientY - b.top) / b.height * H); return Math.max(0, Math.min(0xFFFF, y * W + x)); };
    cv.addEventListener('mousemove', e => {
      const a = addrOf(e), r = at(a), sy = symAt(a);
      const what = r ? (LABELS[r[2]] + (r[3] ? ' · ' + r[3] : '')) : 'unused';
      tip.textContent = `${hex(a)} · ${what}${sy && r && r[2] !== 'unused' && a - sy[0] < 1024 ? ' · ' + sy[1] + (a !== sy[0] ? '+' + (a - sy[0]) : '') : ''}`;
      cv.style.cursor = r && r[2] !== 'unused' ? 'pointer' : 'default';
    });
    cv.addEventListener('click', e => { const a = addrOf(e); if (at(a)) location.href = (opts.source || 'source.html') + '#' + a.toString(16).toUpperCase().padStart(4, '0'); });
    return M;
  }
  return { render, COLOURS, LABELS };
})();
