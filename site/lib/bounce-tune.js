// Sliders for choosing the bouncing ball's camera angles (site/lib/bounce.js), shown over each
// ball view. They are off: bounce.js loads this file only on a page whose address ends in
// ?camera (or that sets window.BOUNCE_TUNE first), so no page needs a script tag for it. They
// change the camera for the canvas's present shape (tall or wide), and the line under them is
// that camera as bounce.js's CAMS table writes it, to copy in there.
(function () {
  'use strict';
  const SLIDERS = [
    ['yaw', 'Turn', -1.6, 1.6], ['pitch', 'Tilt down', 0.05, 1.5], ['fov', 'Lens', 0.3, 1.6],
    ['zoom', 'Zoom', 0.4, 3], ['ax', 'Ball across', -0.9, 0.9], ['ay', 'Ball down', -0.9, 0.9]];
  const CSS = '.bounce-tune{position:absolute;left:8px;top:8px;z-index:3;width:min(210px,calc(100% - 130px));' +
    'box-sizing:border-box;padding:8px 10px;border-radius:8px;background:rgba(12,12,14,.8);color:#ecebe6;' +
    'font:12px/1.3 system-ui,sans-serif}.bounce-tune[data-shut] .bt-body{display:none}' +
    '.bounce-tune button{font:inherit;color:inherit;background:rgba(255,255,255,.1);border:1px solid rgba(255,255,255,.25);' +
    'border-radius:5px;padding:2px 8px;cursor:pointer}.bounce-tune .bt-head{display:flex;gap:6px;align-items:center}' +
    '.bounce-tune .bt-head b{flex:1}.bounce-tune label{display:grid;grid-template-columns:72px 1fr 38px;gap:6px;' +
    'align-items:center;margin-top:6px}.bounce-tune input{width:100%;margin:0}.bounce-tune output{text-align:right;' +
    'font-variant-numeric:tabular-nums}.bounce-tune code{display:block;margin-top:8px;padding:5px 6px;border-radius:5px;' +
    'background:rgba(255,255,255,.08);font:11px/1.35 ui-monospace,monospace;white-space:pre-wrap;word-break:break-word;' +
    'user-select:all}.bounce-tune .bt-row{display:flex;gap:6px;margin-top:6px}';
  const round = (v) => Math.round(v * 100) / 100;

  function panel(canvas) {
    const view = canvas.noteBounce;
    const el = document.createElement('div');
    el.className = 'bounce-tune';
    el.innerHTML = '<div class="bt-head"><b>Camera</b><span class="bt-shape"></span><button type="button" data-bt-shut>Hide</button></div>' +
      '<div class="bt-body">' + SLIDERS.map(([k, name, lo, hi]) =>
        `<label>${name}<input type="range" min="${lo}" max="${hi}" step="0.01" data-k="${k}"><output data-o="${k}"></output></label>`).join('') +
      '<code></code><div class="bt-row"><button type="button" data-bt-copy>Copy</button><button type="button" data-bt-reset>Reset</button></div></div>';
    canvas.parentNode.appendChild(el);
    const $ = (s) => el.querySelector(s);
    let shape = '', start = {};
    function show() {
      const c = view.tuning.get();
      if (c.shape !== shape) { shape = c.shape; if (!start[shape]) start[shape] = Object.assign({}, c); }
      $('.bt-shape').textContent = shape === 'tall' ? 'tall screen' : 'wide screen';
      SLIDERS.forEach(([k]) => { el.querySelector(`[data-k="${k}"]`).value = c[k]; el.querySelector(`[data-o="${k}"]`).textContent = round(c[k]); });
      $('code').textContent = `${shape}: { ` + SLIDERS.map(([k]) => `${k}: ${round(c[k])}`).join(', ') + ' },';
    }
    el.addEventListener('input', (e) => {
      const k = e.target.dataset.k;
      if (k) { view.tuning.set({ [k]: +e.target.value }); show(); }
    });
    el.addEventListener('click', (e) => {
      const b = e.target.closest('button');
      if (!b) return;
      if (b.hasAttribute('data-bt-shut')) {
        const shut = !el.hasAttribute('data-bt-shut');
        el.toggleAttribute('data-shut', shut);
        b.textContent = shut ? 'Show' : 'Hide';
      } else if (b.hasAttribute('data-bt-copy')) {
        const t = $('code').textContent;
        (navigator.clipboard ? navigator.clipboard.writeText(t) : Promise.reject()).then(
          () => { b.textContent = 'Copied'; setTimeout(() => { b.textContent = 'Copy'; }, 1200); },
          () => { getSelection().selectAllChildren($('code')); });
      } else if (b.hasAttribute('data-bt-reset')) {
        const s = Object.assign({}, start[shape]);
        delete s.shape;
        view.tuning.set(s);
        show();
      }
    });
    show();
    setInterval(() => { if (view.tuning.get().shape !== shape) show(); }, 400);   // turned, or full screen
  }

  let styled = false;
  function add(canvas) {
    if (!canvas.noteBounce || canvas.noteBounceTune || !canvas.parentNode) return;
    canvas.noteBounceTune = true;
    if (!styled) {
      styled = true;
      const st = document.createElement('style');
      st.textContent = CSS;
      document.head.appendChild(st);
    }
    panel(canvas);
  }
  window.NoteBounceTune = { add };
  document.querySelectorAll('canvas').forEach(add);   // the views made while this file loaded
})();
