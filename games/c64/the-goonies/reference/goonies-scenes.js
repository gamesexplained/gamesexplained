// Scene selection, control examples, and diagram exports for The Goonies.
const GOONPAGES = (() => {
  'use strict';
  function sceneIndex() {
    const n = Number(new URL(location.href).searchParams.get('scene'));
    return Number.isInteger(n) && n >= 1 && n <= 8 ? n - 1 : 0;
  }
  function setScene(n) {
    const u = new URL(location.href); u.searchParams.set('scene', n);
    history.replaceState(null, '', u);
  }
  function mountGuide(root) {
    const rows = Array.from(document.querySelectorAll('#scene-reference tr')).slice(1);
    const pick = GOON.el('div'); root.append(pick);
    const heading = GOON.el('h3', { class: 'scene-heading', 'aria-live': 'polite' }); root.append(heading);
    const view = GOON.el('div', { class: 'scene-guide' }); root.append(view);
    const figure = GOON.el('figure', { class: 'scene-capture' });
    const image = GOON.el('img', { width: 384, height: 272 }); figure.append(image);
    figure.append(GOON.el('figcaption', { text: 'Original game capture. The solution describes the scene’s tasks; the picture shows a saved moment before they are completed.' }));
    const prose = GOON.el('div'); view.append(figure, prose);
    GOON.picker(pick, GOON.SCENES.map(sc => 'Scene ' + sc.n + ': ' + sc.name), i => {
      const sc = GOON.SCENES[i], cells = rows[i].querySelectorAll('td');
      heading.textContent = 'Scene ' + sc.n + ': ' + sc.name;
      image.src = sc.img; image.alt = heading.textContent;
      prose.replaceChildren();
      for (const [title, cell] of [['Opening the way', cells[1]], ['Hazards', cells[2]]]) {
        prose.append(GOON.el('h4', { text: title }));
        const p = GOON.el('p'); p.append(...Array.from(cell.childNodes).map(n => n.cloneNode(true))); prose.append(p);
      }
      if (sc.n === 8) prose.append(GOON.el('p', { class: 'note', text: 'Open question: the task routines accept either character, but whether the taller figure’s size restricts access has not been checked.' }));
      prose.append(GOON.el('a', { href: 'levels.html?scene=' + sc.n + '#map', text: 'Explore scene ' + sc.n + ' on the collision map →' }));
      setScene(sc.n);
    }, sceneIndex());
  }
  async function mountGraphics() {
    const selectShapes = await GOON.mountShapes(document.getElementById('shape-widget'), true);
    const selectWalk = await GOON.mountWalk(document.getElementById('walk-widget'));
    if (!selectShapes || !selectWalk) return;
    const root = document.getElementById('graphics-picker');
    root.append(GOON.el('p', { class: 'note', text: 'Selected scene controls both the walking demonstration and the shape gallery.' }));
    GOON.picker(root, GOON.SCENES.map(sc => 'Scene ' + sc.n + ': ' + sc.name), i => { selectWalk(i); selectShapes(i); setScene(i + 1); }, sceneIndex());
  }
  function mountRotation(root) {
    root.innerHTML = '<h3>Try the L-key direction change</h3><div class="row"><label>Physical stick direction <select aria-label="Physical stick direction"><option>Up</option><option>Right</option><option>Down</option><option>Left</option></select></label><button type="button" class="b" aria-pressed="false">L rotation off</button></div><p role="status"></p>';
    const select = root.querySelector('select'), button = root.querySelector('button'), out = root.querySelector('[role=status]');
    let rotated = false;
    const show = () => { const normal = ['Up','Right','Down','Left']; const shifted = ['Right','Down','Left','Up']; out.textContent = 'Push ' + select.value.toLowerCase() + ' → the game reads ' + (rotated ? shifted : normal)[select.selectedIndex].toLowerCase() + '. Fire stays unchanged.'; };
    select.onchange = show;
    button.onclick = () => { rotated = !rotated; button.setAttribute('aria-pressed', rotated); button.textContent = 'L rotation ' + (rotated ? 'on' : 'off'); show(); };
    show();
  }
  // GIF encoder adapted from this repository’s Doctor Who page. The palette is
  // collected from the actual diagram pixels so the export keeps its colours.
  function lzw(px) {
    const out = [], clear = 256, eoi = 257;
    let cur = 0, nbits = 0, size = 9, next = 258, dict = new Map();
    const emit = c => { cur |= c << nbits; nbits += size; while (nbits >= 8) { out.push(cur & 255); cur >>>= 8; nbits -= 8; } };
    emit(clear); let prefix = px[0];
    for (let i = 1; i < px.length; i++) {
      const k = px[i], key = prefix * 4096 + k;
      if (dict.has(key)) { prefix = dict.get(key); continue; }
      emit(prefix);
      if (next < 4096) { dict.set(key, next++); if (next > (1 << size) && size < 12) size++; }
      else { emit(clear); dict = new Map(); size = 9; next = 258; }
      prefix = k;
    }
    emit(prefix); emit(eoi); if (nbits) out.push(cur & 255);
    return out;
  }
  function encodeGif(frames) {
    const palette = [], colours = new Map();
    const indexed = frames.map(f => {
      const px = new Uint8Array(f.width * f.height);
      for (let p = 0; p < px.length; p++) {
        const off = p * 4, colour = (f.data[off] << 16) | (f.data[off+1] << 8) | f.data[off+2];
        if (!colours.has(colour)) {
          if (palette.length === 256) throw new Error('The diagram exceeds the GIF palette');
          colours.set(colour, palette.length); palette.push(colour);
        }
        px[p] = colours.get(colour);
      }
      return px;
    });
    const b = [], s = t => { for (const c of t) b.push(c.charCodeAt(0)); }, word = v => b.push(v & 255, v >> 8);
    const W = frames[0].width, H = frames[0].height;
    s('GIF89a'); word(W); word(H); b.push(0xF7,0,0);
    for (let i=0;i<256;i++) { const c=palette[i]||0; b.push(c>>16,(c>>8)&255,c&255); }
    b.push(0x21,0xFF,11); s('NETSCAPE2.0'); b.push(3,1,0,0,0);
    for (const px of indexed) {
      b.push(0x21,0xF9,4,4,8,0,0,0,0x2C); word(0); word(0); word(W); word(H); b.push(0,8);
      const data=lzw(px);
      for(let i=0;i<data.length;i+=255) { const n=Math.min(255,data.length-i); b.push(n); for(let j=0;j<n;j++)b.push(data[i+j]); }
      b.push(0);
    }
    b.push(0x3B); return Uint8Array.from(b);
  }
  function saveGif(frames, scene) {
    const url = URL.createObjectURL(new Blob([encodeGif(frames)], {type:'image/gif'}));
    const a = document.createElement('a'); a.href=url; a.download='the-goonies-scene-'+scene+'-walk.gif'; document.body.append(a); a.click();
    setTimeout(()=>{ URL.revokeObjectURL(url);a.remove(); },1000);
  }
  return { sceneIndex, setScene, mountGuide, mountGraphics, mountRotation, saveGif, encodeGif };
})();
if (typeof module !== 'undefined') module.exports = GOONPAGES;
