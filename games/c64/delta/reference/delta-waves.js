// Delta: the attack-wave player on the attack waves tab. It plays back recordings of the game's own
// wave code (reference/waves/stage-NN.json, one per stage), made by running Delta in the kit's C64
// machine with nobody at the controls; see the page's caption for how they were made and checked.
(function () {
  'use strict';
  const $ = id => document.getElementById(id);
  if (!$('wvCv')) return;
  const PAL = ['#000000', '#ffffff', '#813338', '#75cec8', '#8e3c97', '#56ac4d', '#2e2c9b', '#edf171',
               '#8e5029', '#553800', '#c46c71', '#4a4a4a', '#7b7b7b', '#a9ff9f', '#706deb', '#b2b2b2'];
  const NAMES = ['black', 'white', 'red', 'cyan', 'purple', 'green', 'blue', 'yellow', 'orange', 'brown',
                 'light red', 'dark grey', 'grey', 'light green', 'light blue', 'light grey'];
  const hex = (n, w) => '$' + n.toString(16).toUpperCase().padStart(w || 2, '0');
  const FPS = 50.12;
  // the stage banners (stage_banner_table $F880 and stage_words $EB80, as facts.md lists them)
  const BANNERS = ["WELCOME 10 YEARS LATER", "ENTERING ROCKS OF DEATH", "LEAVING ROCKS OF DEATH", "ENTERING CAVES OF ILLUSION", "LEAVING CAVES OF ILLUSION", "ENTERING FURTHER SPACE", "ENTERING ANCIENT TEMPLE", "LEAVING ANCIENT TEMPLE", "ENTERING SEA OF DREAMS", "LEAVING SEA OF DREAMS", "ENTERING ASTEROID STORM", "LEAVING ASTEROID STORM", "ENTERING JELLY OF DREAMS", "LEAVING JELLY OF DREAMS", "ENTERING FURTHER SPACE", "ENTERING CITY OF SECRETS", "LEAVING CITY OF SECRETS", "ENTERING ROCKS OF DUST", "LEAVING ROCKS OF DUST", "ENTERING SUN OF DREAMS", "LEAVING SUN OF DREAMS", "ENTERING STORM CLOUDS", "LEAVING STORM CLOUDS", "ENTERING ANCIENT CITY", "LEAVING ANCIENT CITY", "ENTERING ROCKS OF DEATH", "LEAVING ROCKS OF DEATH", "ENTERING FURTHER SPACE", "ENTERING HIDDEN TEMPLE", "LEAVING HIDDEN TEMPLE", "ENTERING FURTHER SPACE", "ENTERING FINAL CITY"];
  // The play area in sprite coordinates: a sprite at X 24, Y 50 has its top left corner at the
  // screen's top left. Enemies are removed when Y leaves $38-$E0 or X passes $158.
  const X0 = 24, Y0 = 50, W = 320, H = 200, S = 2, PAD = 24;
  const cv = $('wvCv'), ctx = cv.getContext('2d');
  cv.width = (W + 2 * PAD) * S; cv.height = (H + 2 * PAD) * S;

  let D = null, stage = 1, frame = 0, playing = false, speed = 1, trails = true, acc = 0, last = 0;
  const cache = {};

  function decode(J) {
    J.enemies = J.enemies.map(e => {
      const [f, n, slot, g, x0, y0, d, ev] = e;
      const xs = new Int16Array(n), ys = new Int16Array(n);
      let x = x0, y = y0; xs[0] = x; ys[0] = y;
      for (let k = 1; k < n; k++) { x += d.charCodeAt(2 * k - 2) - 48; y += d.charCodeAt(2 * k - 1) - 48; xs[k] = x; ys[k] = y; }
      return { f, n, slot, g, xs, ys, ev };
    });
    J.shapeBytes = {};
    for (const [id, b] of Object.entries(J.shapes)) J.shapeBytes[id] = Uint8Array.from(atob(b), c => c.charCodeAt(0));
    J.blank = new Set(Object.entries(J.shapeBytes).filter(([, b]) => b.every(v => v === 0)).map(([id]) => +id));
    return J;
  }
  // an enemy's state at offset k: [hp, colour, exploding, final, changes form, points, may fire, shape, sprite pointer]
  function stateAt(e, k) {
    let s = e.ev[0];
    for (const v of e.ev) { if (v[0] > k) break; s = v; }
    return { hp: s[1], col: s[2], expl: s[3], fin: s[4], form: s[5], pts: s[6], fire: s[7], shape: s[8], ptr: s[9] };
  }
  function groupAt(f) {
    let g = 0;
    for (let i = 0; i < D.groups.length; i++) if (D.groups[i][0] <= f) g = i;
    return g;
  }

  function drawSprite(bytes, px, py, col) {
    const cols = [null, PAL[D.mc[0]], PAL[col], PAL[D.mc[1]]];
    for (let r = 0; r < 21; r++) for (let b = 0; b < 3; b++) {
      const v = bytes[r * 3 + b];
      for (let p = 0; p < 4; p++) {
        const c = (v >> (6 - 2 * p)) & 3;
        if (!c) continue;
        ctx.fillStyle = cols[c];
        ctx.fillRect((px + b * 8 + p * 2) * S, (py + r) * S, 2 * S, S);
      }
    }
  }

  function draw() {
    if (!D) return;
    ctx.fillStyle = '#000'; ctx.fillRect(0, 0, cv.width, cv.height);
    ctx.strokeStyle = 'rgba(255,255,255,.18)'; ctx.lineWidth = 1;
    ctx.strokeRect(PAD * S + .5, PAD * S + .5, W * S - 1, H * S - 1);
    const g = groupAt(frame);
    const live = D.enemies.filter(e => frame >= e.f && frame < e.f + e.n);
    if (trails) {
      for (const e of D.enemies) {
        if (e.g !== g) continue;
        ctx.strokeStyle = PAL[stateAt(e, 0).col] + '88'; ctx.lineWidth = 1.5;
        ctx.beginPath();
        const end = Math.min(e.n, frame - e.f + 1);
        for (let k = 0; k < e.n; k++) {
          const px = (e.xs[k] - X0 + PAD + 12) * S, py = (e.ys[k] - Y0 + PAD + 10) * S;
          k ? ctx.lineTo(px, py) : ctx.moveTo(px, py);
        }
        ctx.globalAlpha = .45; ctx.stroke(); ctx.globalAlpha = 1;
        if (end > 0) {
          ctx.beginPath();
          for (let k = 0; k < end; k++) {
            const px = (e.xs[k] - X0 + PAD + 12) * S, py = (e.ys[k] - Y0 + PAD + 10) * S;
            k ? ctx.lineTo(px, py) : ctx.moveTo(px, py);
          }
          ctx.strokeStyle = PAL[stateAt(e, 0).col]; ctx.stroke();
        }
      }
    }
    for (const e of live) {
      const k = frame - e.f, s = stateAt(e, k);
      const px = e.xs[k] - X0 + PAD, py = e.ys[k] - Y0 + PAD;
      if (D.blank.has(s.shape)) {
        ctx.setLineDash([3, 3]); ctx.strokeStyle = PAL[s.col]; ctx.strokeRect(px * S, py * S, 24 * S, 21 * S); ctx.setLineDash([]);
      } else drawSprite(D.shapeBytes[s.shape], px, py, s.col);
      ctx.fillStyle = '#fff'; ctx.font = (10 * S / 2 + 2) + 'px IBM Plex Mono, monospace';
      ctx.fillText(String(e.slot), (px + 25) * S, (py + 6) * S);
    }
    panel(g, live);
  }

  function panel(g, live) {
    const G = D.groups[g];
    $('wvFrame').value = frame;
    $('wvTime').textContent = `frame ${frame} of ${D.frames - 1} · ${(frame / FPS).toFixed(1)} s`;
    const inGroup = D.enemies.filter(e => e.g === g);
    const indes = inGroup.filter(e => e.ev[0][1] === 255).length;
    let h = G[3] === 255 ? `Stage ${D.stage} (${BANNERS[D.stage - 1]}): between groups` : `Stage ${D.stage} (${BANNERS[D.stage - 1]}), group ${g + 1} of ${D.groups.length}: record ${hex(G[3])}` +
      (G[4] ? ' · <b>the shop</b>' : '') + ` · ${inGroup.length} sprite${inGroup.length === 1 ? '' : 's'}` +
      (indes ? ` · ${indes} indestructible` : '');
    if (G[5] >= 0) h += frame >= G[5] ? ' · <b>stand-in shots</b> (since frame ' + G[5] + ')' : ` · stand-in shots from frame ${G[5]}`;
    $('wvGroup').innerHTML = h;
    let t = '<tr><th>Slot</th><th>Colour</th><th>Sprite</th><th>Position</th><th>Hit points</th><th>Points</th><th>States</th></tr>';
    for (const e of live.sort((a, b) => a.slot - b.slot)) {
      const k = frame - e.f, s = stateAt(e, k), flags = [];
      if (G[4]) flags.push('shop icon');
      if (s.expl) flags.push('exploding');
      if (D.blank.has(s.shape)) flags.push('invisible');
      if (s.form) flags.push('changes form when killed');
      if (s.fin) flags.push('final form');
      if (s.fire) flags.push('may fire');
      t += `<tr><td>${e.slot}</td><td><span class="sw" style="background:${PAL[s.col]}"></span> ${NAMES[s.col]}</td>` +
        `<td title="sprite pointer $30 + slot: the shape at ${hex(0x4000 + s.ptr * 64, 4)}"><code>${hex(s.ptr)}</code></td>` +
        `<td>${e.xs[k]}, ${e.ys[k]}</td><td>${s.hp === 255 ? 'indestructible' : s.hp <= 1 ? s.hp + ' (dies at the first hit)' : s.hp}</td><td>${s.pts && !G[4] ? s.pts * 10 : '-'}</td>` +
        `<td>${flags.join(', ') || '-'}</td></tr>`;
    }
    if (!live.length) t += '<tr><td colspan="7">No enemy on screen.</td></tr>';
    $('wvLive').innerHTML = t;
    $('wvList').querySelectorAll('button').forEach((b, i) => b.classList.toggle('on', i === g));
  }

  function groupList() {
    $('wvList').innerHTML = '';
    D.groups.forEach((G, i) => {
      const b = document.createElement('button');
      b.textContent = (i + 1) + ' · ' + (G[3] === 255 ? '—' : hex(G[3])) + (G[4] ? ' shop' : '') + (G[5] >= 0 ? ' · shot' : '');
      b.title = `starts at frame ${G[0]}, lasts ${G[1]} frames`;
      b.onclick = () => { frame = G[0]; draw(); };
      $('wvList').appendChild(b);
    });
  }

  async function load(n) {
    stage = n; playing = false; $('wvPlay').textContent = 'Play';
    document.querySelectorAll('#wvStages button').forEach((b, i) => b.classList.toggle('on', i + 1 === n));
    $('wvGroup').textContent = 'Loading stage ' + n + '…';
    try {
      if (!cache[n]) cache[n] = decode(await fetch(`reference/waves/stage-${String(n).padStart(2, '0')}.json`).then(r => r.json()));
    } catch (err) {
      $('wvGroup').innerHTML = '<span class="msg">The recordings are loaded from the built site: open this page from the site, not from disk.</span>';
      return;
    }
    if (stage !== n) return;
    D = cache[n]; frame = 0;
    $('wvFrame').max = D.frames - 1;
    groupList(); draw();
  }

  function tick(t) {
    if (playing && D && !document.hidden) {
      acc += Math.min(200, t - last) * FPS / 1000 * speed;
      const n = Math.floor(acc); acc -= n;
      if (n) {
        frame = Math.min(D.frames - 1, frame + n);
        if (frame === D.frames - 1) { playing = false; $('wvPlay').textContent = 'Play'; }
        draw();
      }
    }
    last = t;
    requestAnimationFrame(tick);
  }

  // the stages with a recording in reference/waves; a stage left out (one that differed from VICE)
  // still gets its button, disabled, so the numbering stays the game's
  const STAGES = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 16, 17, 18];
  for (let s = 1; s <= Math.max(...STAGES); s++) {
    const b = document.createElement('button'); b.textContent = s;
    if (STAGES.includes(s)) { b.title = BANNERS[s - 1]; b.onclick = () => load(s); }
    else { b.disabled = true; b.title = BANNERS[s - 1] + ': left out, its recording differs from VICE (see the caption)'; b.style.opacity = .35; }
    $('wvStages').appendChild(b);
  }
  $('wvPlay').onclick = () => { if (!D) return; if (frame >= D.frames - 1) frame = 0; playing = !playing; $('wvPlay').textContent = playing ? 'Pause' : 'Play'; };
  $('wvBack').onclick = () => { if (!D) return; playing = false; $('wvPlay').textContent = 'Play'; frame = Math.max(0, frame - 1); draw(); };
  $('wvFwd').onclick = () => { if (!D) return; playing = false; $('wvPlay').textContent = 'Play'; frame = Math.min(D.frames - 1, frame + 1); draw(); };
  $('wvFrame').oninput = e => { frame = +e.target.value; draw(); };
  $('wvTrails').onclick = () => { trails = !trails; $('wvTrails').classList.toggle('on', trails); draw(); };
  document.querySelectorAll('[data-wvspeed]').forEach(b => b.onclick = () => {
    speed = +b.dataset.wvspeed; document.querySelectorAll('[data-wvspeed]').forEach(x => x.classList.toggle('on', x === b));
  });
  requestAnimationFrame(t => { last = t; requestAnimationFrame(tick); });
  load(1);
})();
