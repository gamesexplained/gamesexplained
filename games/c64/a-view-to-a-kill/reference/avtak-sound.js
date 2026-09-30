// A View to a Kill: the Music and speech tab. The tunes play through the site's SID model
// (../../lib/sid.js) with the drivers ported in avtak-music.js; the speech is drawn and played
// from the $D418 writes that AVSpeech computes. Every byte comes from the parts' listings.
(function () {
  'use strict';
  const $ = (s) => document.querySelector(s);
  const hex = (v, n) => '$' + v.toString(16).toUpperCase().padStart(n, '0');
  const CLOCK = 985248;
  if (!globalThis.C64) {
    for (const id of ['#sid', '#sp-kv']) if ($(id)) $(id).textContent = 'The player needs the site’s shared scripts: open this page from the built site.';
    return;
  }
  Promise.all([C64.load('parts/intro/listing.json'), C64.load('parts/paris/listing.json')]).then(([I, P]) => {
    try { tunes(I, P); } catch (e) { console.error(e); }
    try { speech({ intro: I, paris: P }); } catch (e) { console.error(e); }
  }).catch((e) => { console.error(e); });

  function tunes(I, P) {
    const root = $('#sid');
    if (!root || !globalThis.C64Sid) return;
    const arr = (G, a, n) => Array.from(G.ram.subarray(a, a + n));
    const data = { tunes: [
      { notes: arr(I, 0x8500, 0xA00), state: arr(I, 0xC600, 0x40) },   // copied to $E000 by $8000
      { notes: arr(P, 0xE000, 0x2000), state: arr(P, 0x7A18, 0x28) },
    ] };
    C64Sid.mount(root, {
      driver: createDriver, data, filter: '6581',
      tunes: ['Intro and City Hall', 'Paris and the mine'],
      rows: [
        { k: 'Note read from', f: (v) => v.at == null ? '-' : hex(v.at, 4) },
        { k: 'Length', f: (v) => v.len == null ? '-' : v.len + ' steps, ' + v.left + ' left' },
      ],
    });
  }

  function speech(G) {
    const S = AVSpeech, btns = $('#sp-buttons'), cv = $('#sp'), kv = $('#sp-kv');
    if (!btns || !cv) return;
    const ctx = cv.getContext('2d');
    // what each button plays: one sample, or two one after the other as the game does ($4BD8)
    const CHOICES = [
      { name: 'The intro', parts: [0] },
      { name: 'Paris: May Day caught', parts: [1] },
      { name: 'Paris: May Day lands', parts: [3] },
      { name: 'Paris: the car wrecked', parts: [2, 3] },
    ];
    const cache = {};
    function writes(i) {
      if (cache[i]) return cache[i];
      const [, part, base, endV] = S.SAMPLES[i], g = G[part];
      return (cache[i] = S.play((a) => g.ram[a & 0xFFFF], base, endV));
    }
    function joined(c) {
      const out = { cycles: [], values: [], marks: [] };
      let t0 = 0;
      for (const i of c.parts) {
        const w = writes(i);
        out.marks.push([t0, S.SAMPLES[i][2]]);
        for (let k = 0; k < w.cycles.length; k++) { out.cycles.push(t0 + w.cycles[k] - w.cycles[0]); out.values.push(w.values[k]); }
        t0 = out.cycles[out.cycles.length - 1] + 51;        // $1063 to the next sample's first write
      }
      return out;
    }
    let cur = 0, actx = null, src = null, raf = 0, startAt = 0;
    btns.innerHTML = CHOICES.map((c, i) => `<button type="button" class="b" data-sp="${i}" aria-pressed="${i === 0}">${c.name}</button>`).join('') +
      '<button type="button" class="b" data-stop>Stop</button>';
    function draw(pos) {
      const w = joined(CHOICES[cur]), W = cv.width, H = cv.height, T = w.cycles[w.cycles.length - 1] || 1;
      ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, W, H);
      // how often the level changes in each column: none where the sample is silent
      const cols = new Float32Array(W);
      for (let k = 1; k < w.values.length; k++) if (w.values[k] !== w.values[k - 1]) cols[Math.min(W - 1, Math.floor(w.cycles[k] / T * W))]++;
      let mx = 1; for (let x = 0; x < W; x++) mx = Math.max(mx, cols[x]);
      const top = 20, h = H - 50;
      ctx.fillStyle = '#1f5fa8';
      for (let x = 0; x < W; x++) { const bh = cols[x] / mx * h; if (bh) ctx.fillRect(x, top + (h - bh) / 2, 1, Math.max(1, bh)); }
      ctx.fillStyle = '#80838a'; ctx.font = '13px IBM Plex Mono, monospace';
      for (const [t, a] of w.marks) { const x = t / T * W; ctx.fillRect(x, top - 12, 1, h + 12); ctx.fillText(hex(a, 4), x + 4, top - 2); }
      const secs = T / CLOCK;
      ctx.fillText('0 s', 2, H - 8); ctx.fillText(secs.toFixed(2) + ' s', W - 60, H - 8);
      if (pos != null) { ctx.fillStyle = '#d04a3a'; ctx.fillRect(pos * W - 1, top - 12, 2, h + 12); }
      const ones = w.values.slice(1, -1).filter((v) => v).length, bits = w.values.length - 2;
      kv.innerHTML = `<b>${bits.toLocaleString('en')}</b> bits, <b>${secs.toFixed(2)} s</b>, ${Math.round(bits / secs).toLocaleString('en')} a second; ` +
        `${Math.round(ones / bits * 100)} % of them 1s. Samples ` + w.marks.map(([, a]) => hex(a, 4)).join(' then ') + '.';
    }
    function pcm(w, rate) {
      // $D418 as a level, 0 or 1, averaged over each output sample; then the C64's 16 Hz high pass
      const T = w.cycles[w.cycles.length - 1], n = Math.ceil(T / CLOCK * rate) + 1, out = new Float32Array(n);
      const cps = CLOCK / rate;
      for (let k = 0; k + 1 < w.cycles.length; k++) {
        if (!w.values[k]) continue;
        let a = w.cycles[k] / cps, b = w.cycles[k + 1] / cps;
        while (a < b) { const c = Math.floor(a), e = Math.min(b, c + 1); out[c] += e - a; a = e; }
      }
      const al = Math.exp(-2 * Math.PI * 16 / rate); let px = 0, py = 0;
      for (let i = 0; i < n; i++) { const y = al * (py + out[i] - px); px = out[i]; py = y; out[i] = y * 0.5; }
      return out;
    }
    function stop() { if (src) { try { src.stop(); } catch (e) { /* ended */ } src = null; } cancelAnimationFrame(raf); draw(null); }
    function play() {
      stop();
      try {
        actx = actx || new (window.AudioContext || window.webkitAudioContext)();
        if (actx.state === 'suspended') actx.resume();
        const w = joined(CHOICES[cur]), data = pcm(w, actx.sampleRate);
        const buf = actx.createBuffer(1, data.length, actx.sampleRate); buf.copyToChannel(data, 0);
        src = actx.createBufferSource(); src.buffer = buf; src.connect(actx.destination);
        const me = src; src.onended = () => { if (src === me) { src = null; cancelAnimationFrame(raf); draw(null); } };
        startAt = actx.currentTime; src.start();
        const dur = buf.duration;
        const tickDraw = () => { const p = (actx.currentTime - startAt) / dur; if (src === me && p <= 1) { draw(p); raf = requestAnimationFrame(tickDraw); } };
        tickDraw();
      } catch (e) { kv.textContent = 'Audio could not start: ' + e.message; }
    }
    btns.addEventListener('click', (e) => {
      const b = e.target.closest('button'); if (!b) return;
      if (b.dataset.stop !== undefined) { stop(); return; }
      cur = +b.dataset.sp;
      btns.querySelectorAll('button[data-sp]').forEach((x) => x.setAttribute('aria-pressed', x === b));
      play();
    });
    draw(null);
  }
})();
