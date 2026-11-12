// Shared ZX Spectrum rendering helpers for game pages. No dependencies. Exposes Spectrum
// (window.Spectrum in a page, globalThis.Spectrum elsewhere) for the ULA screen, and
// SpectrumMap (the same footprint widget as C64Map, with the Spectrum's legend words).
// Data comes from the game's listing.json via Spectrum.load().
globalThis.Spectrum = (function () {
  // The ULA's 16 colours: 0-7 normal, 8-15 the same eight at bright.
  const PAL = ['#000000', '#0000d7', '#d70000', '#d700d7', '#00d700', '#00d7d7', '#d7d700', '#d7d7d7',
               '#000000', '#0000ff', '#ff0000', '#ff00ff', '#00ff00', '#00ffff', '#ffff00', '#ffffff'];
  const BITMAP = 0x4000, ATTRS = 0x5800;

  // A listing the build embedded in the page (kit/scripts/build.py, embed_listings), for a game
  // whose listing the site withholds: the pieces of it the page names, in <script
  // type="application/json" data-listing="url">. Before the build fills it in the tag holds only
  // the list of pieces, and is passed over. Every other listing is fetched whole, one file the
  // browser caches for all of a game's tabs.
  function embedded(url) {
    if (typeof document === 'undefined') return null;
    for (const s of document.querySelectorAll('script[type="application/json"][data-listing]'))
      if (s.getAttribute('data-listing') === url) { const L = JSON.parse(s.textContent); return Array.isArray(L) ? null : L; }
    return null;
  }
  function fetched(url) {
    return fetch(url).then(r => { if (r.ok === false) throw new Error(url + ': ' + r.status); return r.json(); });
  }
  // A page of a withheld game opened with ?listing-reads in its address gets the whole listing
  // behind its pieces, with what it reads checked against them (listing-reads.js).
  const READS = typeof document !== 'undefined' && document.currentScript && /[?&]listing-reads(?:[=&]|$)/.test(location.search)
    ? new URL('listing-reads.js', document.currentScript.src).href : null;
  let reads;
  function watched(url, got) {
    if (!READS || !embedded(url)) return got;
    reads = reads || (globalThis.ListingReads ? Promise.resolve() : new Promise((ok, no) => {
      const s = document.createElement('script'); s.src = READS; s.onload = ok; s.onerror = no; document.head.appendChild(s); }));
    return reads.then(() => ListingReads.watch(url, got));
  }
  // Text a widget writes into a canvas stays in the font it was drawn in. A listing in the page,
  // or one the browser has cached, is in hand before the page's fonts have loaded, so a listing
  // is handed over when they have, or after three seconds if they never do.
  function fontsIn() {
    if (typeof document === 'undefined' || !document.fonts || !document.body) return Promise.resolve();
    void document.body.offsetHeight;          // lays the page out, which asks for its fonts
    return Promise.race([document.fonts.ready, new Promise(r => setTimeout(r, 3000))]);
  }
  // Rebuild the 64 KB image from listing.json records; the $0000-$3FFF ROM is not the game and
  // stays zero. Bytes no record covers have has[a] false.
  async function load(url) {
    url = url || 'listing.json';
    const [L] = await Promise.all([embedded(url) || fetched(url), fontsIn()]);
    const ram = new Uint8Array(0x10000), has = new Uint8Array(0x10000);
    for (const r of L.records) {
      if (!r.b) continue;
      for (let i = 0; i < r.b.length; i++) { ram[r.a + i] = r.b[i]; has[r.a + i] = 1; }
    }
    const names = new Map(L.records.filter(r => r.l).map(r => [r.a, r.l]));
    const byName = new Map(L.records.filter(r => r.l).map(r => [r.l, r.a]));
    return watched(url, { ram, has, names, byName, listing: L,
             bytes: (a, n) => ram.subarray(a, a + n),
             sym: n => { if (!byName.has(n)) throw new Error('no symbol ' + n); return byName.get(n); } });
  }

  // The address of the byte holding pixel (x, y): the bitmap is stored a third of the
  // screen at a time, so the top two bits of y and the low three bits are swapped around.
  function bitmapAddr(x, y) {
    return BITMAP + (((y & 0xc0) << 5) | ((y & 0x07) << 8) | ((y & 0x38) << 2)) + (x >> 3);
  }

  // One pixel, 0 or 1.
  function pixel(ram, x, y) {
    return (ram[bitmapAddr(x, y)] >> (7 - (x & 7))) & 1;
  }

  // The attribute for the 8x8 cell holding (x, y): ink, paper, bright and flash.
  function attr(ram, x, y) {
    const a = ram[ATTRS + ((y >> 3) << 5) + (x >> 3)];
    return { ink: a & 7, paper: (a >> 3) & 7, bright: (a >> 6) & 1, flash: a >> 7, raw: a };
  }

  // Which of the two colours a pixel shows, honouring flash: ink where the bit is set.
  function colour(ram, x, y, on, phase) {
    const a = attr(ram, x, y);
    const p = a.paper | (a.bright << 3), i = a.ink | (a.bright << 3);
    const flipped = a.flash && phase;
    return (on ^ flipped) ? i : p;
  }

  // The whole screen, border and all, into a canvas: 256x192 plus a border of `border` pixels.
  // `borderColour` 0-7, `phase` selects the flash state, `s` scales each pixel.
  function drawScreen(canvas, ram, { borderColour = 7, border = 16, phase = 0, s = 2 } = {}) {
    canvas.width = (256 + 2 * border) * s; canvas.height = (192 + 2 * border) * s;
    canvas.style.imageRendering = 'pixelated';
    const ctx = canvas.getContext('2d'); ctx.imageSmoothingEnabled = false;
    ctx.fillStyle = PAL[borderColour & 7]; ctx.fillRect(0, 0, canvas.width, canvas.height);
    for (let y = 0; y < 192; y++) for (let x = 0; x < 256; x++) {
      ctx.fillStyle = PAL[colour(ram, x, y, pixel(ram, x, y), phase)];
      ctx.fillRect((x + border) * s, (y + border) * s, s, s);
    }
    return canvas;
  }

  // The same screen as RGBA pixels, border and all, ready for a canvas's ImageData: what
  // drawScreen paints at s = 1, without a canvas, so a test can hash it.
  const RGB = PAL.map(c => [1, 3, 5].map(i => parseInt(c.slice(i, i + 2), 16)));
  function screenPixels(ram, { borderColour = 7, border = 16, phase = 0 } = {}) {
    const width = 256 + 2 * border, height = 192 + 2 * border, data = new Uint8ClampedArray(width * height * 4);
    const put = (x, y, c) => { const o = (y * width + x) * 4, v = RGB[c]; data[o] = v[0]; data[o + 1] = v[1]; data[o + 2] = v[2]; data[o + 3] = 255; };
    for (let y = 0; y < height; y++) for (let x = 0; x < width; x++)
      if (x < border || x >= border + 256 || y < border || y >= border + 192) put(x, y, borderColour & 7);
    for (let y = 0; y < 192; y++) for (let cx = 0; cx < 32; cx++) {
      const a = ram[ATTRS + ((y >> 3) << 5) + cx], b = (a >> 6) & 1, bits = ram[bitmapAddr(cx << 3, y)];
      const ink = (a & 7) | (b << 3), paper = ((a >> 3) & 7) | (b << 3), flip = (a >> 7) && phase;
      for (let i = 0; i < 8; i++) put(border + (cx << 3) + i, border + y, ((bits >> (7 - i)) & 1) ^ flip ? ink : paper);
    }
    return { width, height, data };
  }

  // screenPixels into a canvas, one canvas pixel to a Spectrum pixel and scaled by its CSS: quick
  // enough to repaint every frame while a picture loads.
  function paintScreen(canvas, ram, opts = {}) {
    const img = screenPixels(ram, opts);
    if (canvas.width !== img.width) canvas.width = img.width;
    if (canvas.height !== img.height) canvas.height = img.height;
    canvas.style.imageRendering = 'pixelated';
    const ctx = canvas.getContext('2d'), id = ctx.createImageData(img.width, img.height);
    id.data.set(img.data); ctx.putImageData(id, 0, 0);
    return canvas;
  }

  // A loading picture as a tape brings it in. The loader fills the screen in the order it lies in
  // memory, the bitmap from $4000 a third of the screen at a time and then the colours from $5800,
  // and each bit is two pulses of the tape's signal, one length for a 0 and another for a 1.
  // tapeTimes gives when each byte is in, in T-states (3.5 million to the second) from the end of
  // the block's flag byte; bit0 and bit1 are the length of a pulse, as a TZX file records them.
  function tapeTimes(bytes, bit0, bit1) {
    const ends = new Float64Array(bytes.length); let t = 0;
    for (let k = 0; k < bytes.length; k++) {
      for (let i = 7; i >= 0; i--) t += 2 * ((bytes[k] >> i) & 1 ? bit1 : bit0);
      ends[k] = t;
    }
    return ends;
  }
  // How many of the bytes are in at time t.
  function bytesIn(ends, t) {
    let lo = 0, hi = ends.length;
    while (lo < hi) { const m = (lo + hi) >> 1; if (ends[m] <= t) lo = m + 1; else hi = m; }
    return lo;
  }
  // Which of its two colours the border shows at time t, 0 or 1: the loader turns it over at every
  // edge of the signal, so each pulse draws a band across the border.
  function stripe(bytes, ends, bit0, bit1, t) {
    const k = bytesIn(ends, t);
    if (k >= bytes.length) return 0;
    let at = k ? ends[k - 1] : 0, e = 0;
    for (; e < 16; e++) {
      const p = (bytes[k] >> (7 - (e >> 1))) & 1 ? bit1 : bit0;
      if (at + p > t) break;
      at += p;
    }
    return e & 1;
  }
  // The screen with the first n bytes of the picture in, over what it held before. A range of held,
  // [from, to), stays as it was before until its last byte is in: a loader can keep a block off the
  // screen and put it up whole.
  function partLoaded(before, picture, n, held = []) {
    const ram = new Uint8Array(0x10000);
    ram.set(before, BITMAP); ram.set(picture.subarray(0, n), BITMAP);
    for (const [a, b] of held) if (n < b) ram.set(before.subarray(a, b), BITMAP + a);
    return ram;
  }
  // The frame t T-states into the load, as RGBA pixels: the screen as far as it has got, and, while
  // bytes are still coming, the border striped in `stripes`, its two colours. A frame lasts 69,888
  // T-states and a line 224; the screen's first line is the frame's 64th, and a pixel is half a
  // T-state. Once the picture is in the border is `borderColour`. tape is the picture's bytes as the
  // tape holds them, when the loader turns each into another as it stores it: their bits time the
  // load and draw the stripes (ends is tapeTimes of them). held is as for partLoaded.
  function loadingPixels(before, picture, ends, bit0, bit1, t, { stripes = null, borderColour = 0, border = 16, tape = null, held = [] } = {}) {
    const n = bytesIn(ends, t), img = screenPixels(partLoaded(before, picture, n, held), { borderColour, border });
    if (n >= picture.length || !stripes) return img;
    const { width, height, data } = img, frame = Math.floor(t / 69888) * 69888;
    for (let y = 0; y < height; y++) {
      const line = frame + (64 - border + y) * 224, inside = y >= border && y < border + 192;
      for (let x = 0; x < width; x++) {
        if (inside && x === border) x += 256;
        const v = RGB[stripes[stripe(tape || picture, ends, bit0, bit1, line + (x - border) / 2)] & 7], o = (y * width + x) * 4;
        data[o] = v[0]; data[o + 1] = v[1]; data[o + 2] = v[2];
      }
    }
    return img;
  }

  // A loading picture on a page: the canvas, a "Load it again" and a "Skip" button and a line that
  // counts the bytes in. The load runs at the tape's own pace from the picture's first byte, and
  // starts when the canvas comes into view. before and picture are the 6,912 bytes of the screen
  // before the load and after it; bit0, bit1, stripes, borderColour, tape and held as for loadingPixels.
  function loadingPlayer({ canvas, again, skip, status, before, picture, bit0, bit1, stripes, borderColour = 0, border = 16, tape = null, held = [] }) {
    const ends = tapeTimes(tape || picture, bit0, bit1), END = ends[ends.length - 1], TPS = 3.5e6, all = picture.length;
    const ctx = canvas.getContext('2d');
    canvas.style.imageRendering = 'pixelated';
    let t0 = 0, raf = 0;
    const paint = (t) => {
      const img = loadingPixels(before, picture, ends, bit0, bit1, t, { stripes, borderColour, border, tape, held });
      if (canvas.width !== img.width) canvas.width = img.width;
      if (canvas.height !== img.height) canvas.height = img.height;
      const id = ctx.createImageData(img.width, img.height); id.data.set(img.data); ctx.putImageData(id, 0, 0);
    };
    const tick = (now) => {
      const t = Math.max(0, now - t0) / 1000 * TPS, n = bytesIn(ends, t);   // a frame can be stamped before t0
      paint(t);
      if (status) status.textContent = n < all ? Math.floor(t / TPS) + ' s, ' + n.toLocaleString('en-GB') + ' of ' + all.toLocaleString('en-GB') + ' bytes' : '';
      raf = n < all ? requestAnimationFrame(tick) : 0;
    };
    const go = () => { cancelAnimationFrame(raf); t0 = performance.now(); raf = requestAnimationFrame(tick); };
    const done = () => { cancelAnimationFrame(raf); raf = 0; paint(END); if (status) status.textContent = ''; };
    if (again) again.addEventListener('click', go);
    if (skip) skip.addEventListener('click', done);
    paint(0);
    if (typeof IntersectionObserver !== 'undefined') {
      const io = new IntersectionObserver((es) => { if (es.some((e) => e.isIntersecting)) { io.disconnect(); go(); } }, { threshold: 0.4 });
      io.observe(canvas);
    } else go();
    return { go, skip: done, seconds: END / TPS };
  }

  // Base64 to bytes, for the screens a page embeds.
  function unbase64(s) {
    if (typeof atob === 'function') return Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
    return new Uint8Array(Buffer.from(s, 'base64'));
  }

  // A grid of the 96 ROM-font glyphs, when the page has them: eight bytes a glyph, MSB first.
  function drawCharset(canvas, font, { n = 96, per = 16, s = 2, ink = '#d7d7d7', bg = '#000000' } = {}) {
    canvas.width = per * 9 * s; canvas.height = Math.ceil(n / per) * 9 * s;
    const ctx = canvas.getContext('2d'); ctx.imageSmoothingEnabled = false;
    ctx.fillStyle = bg; ctx.fillRect(0, 0, canvas.width, canvas.height); ctx.fillStyle = ink;
    for (let g = 0; g < n; g++) for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++)
      if (font[g * 8 + y] & (0x80 >> x))
        ctx.fillRect(((g % per) * 9 + x) * s, (Math.floor(g / per) * 9 + y) * s, s, s);
    return canvas;
  }

  const hex = (n, w = 4) => '$' + n.toString(16).toUpperCase().padStart(w, '0');
  return { PAL, load, bitmapAddr, pixel, attr, colour, drawScreen, screenPixels, paintScreen, drawCharset, hex,
           tapeTimes, bytesIn, stripe, partLoaded, loadingPixels, loadingPlayer, unbase64 };
})();

// The Spectrum's names for the footprint categories; the drawing is makeMemMap in memmap.js.
if (globalThis.makeMemMap) {
  globalThis.SpectrumMap = globalThis.makeMemMap({
    code: 'code', graphics: 'graphics', levels: 'level data', sound: 'sound', text: 'text', tables: 'tables',
    variables: 'variables', runtime: 'screen, attributes and working memory', rom: "ROM (the machine's routines)",
    unused: 'unused' });
}
