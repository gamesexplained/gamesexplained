/* Sprite GIF export for Chiller. Encoding follows the Doctor Who page. */
(function () {
'use strict';
  function lzw(px, minCode) {
    const out = [], clear = 1 << minCode, eoi = clear + 1;
    let cur = 0, nbits = 0, size = minCode + 1, next = eoi + 1, dict = new Map();
    const emit = c => { cur |= c << nbits; nbits += size; while (nbits >= 8) { out.push(cur & 255); cur >>>= 8; nbits -= 8; } };
    emit(clear);
    let prefix = px[0];
    for (let i = 1; i < px.length; i++) {
      const k = px[i], key = prefix * 4096 + k;
      if (dict.has(key)) { prefix = dict.get(key); continue; }
      emit(prefix);
      if (next < 4096) { dict.set(key, next++); if (next > (1 << size) && size < 12) size++; }
      else { emit(clear); dict = new Map(); size = minCode + 1; next = eoi + 1; }
      prefix = k;
    }
    emit(prefix);
    // The decoder adds its final dictionary entry after the last pixel code.
    if (next === (1 << size) && size < 12) size++;
    emit(eoi);
    if (nbits) out.push(cur & 255);
    return out;
  }

  // frames: { x, y, w, h, px (palette indices), delay (hundredths of a second) }
  function gifFile(W, H, frames) {
    const b = [], s = t => { for (const c of t) b.push(c.charCodeAt(0)); }, w16 = v => b.push(v & 255, v >> 8);
    s('GIF89a'); w16(W); w16(H); b.push(0xF3, 0, 0);                    // a global table of 16
    for (const h of C64.PAL) b.push(...[1, 3, 5].map(i => parseInt(h.substr(i, 2), 16)));
    b.push(0x21, 0xFF, 11); s('NETSCAPE2.0'); b.push(3, 1, 0, 0, 0);    // loop for ever
    for (const f of frames) {
      b.push(0x21, 0xF9, 4, 1 << 2, f.delay & 255, f.delay >> 8, 0, 0);
      b.push(0x2C); w16(f.x); w16(f.y); w16(f.w); w16(f.h); b.push(0, 4);
      const d = lzw(f.px, 4);
      for (let i = 0; i < d.length; i += 255) { const n = Math.min(255, d.length - i); b.push(n); for (let j = 0; j < n; j++) b.push(d[i + j]); }
      b.push(0);
    }
    b.push(0x3B);
    return Uint8Array.from(b);
  }

  // Offers bytes as a file to save.
  function save(bytes, name, type) {
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([bytes], { type })); a.download = name;
    document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
  }

function spritePixels(ram, pointer, colour, scale = 3) {
  const width = 24 * scale, height = 21 * scale;
  const px = new Uint8Array(width * height), colours = [0, 9, colour, 1];
  for (let y = 0; y < 21; y++) for (let x = 0; x < 12; x++) {
    const value = (ram[pointer * 64 + y * 3 + (x >> 2)] >> (6 - 2 * (x & 3))) & 3;
    for (let dy = 0; dy < scale; dy++) {
      const offset = (y * scale + dy) * width + x * 2 * scale;
      px.fill(colours[value], offset, offset + 2 * scale);
    }
  }
  return px;
}
function encode(ram, pointers, colour) {
  return gifFile(72, 63, pointers.map(pointer => ({x:0,y:0,w:72,h:63,px:spritePixels(ram,pointer,colour),delay:16})));
}
function button(G, pointers, colour, name, label) {
  const b = document.createElement('button'); b.type = 'button'; b.className = 'ch-gif-download';
  b.innerHTML = '<svg viewBox="0 0 16 16" width="12" height="12" aria-hidden="true"><path fill="currentColor" d="M7 1h2v7l2.5-2.5 1.4 1.4L8 11.8 3.1 6.9l1.4-1.4L7 8zM2 13h12v2H2z"/></svg>';
  b.title = 'Download ' + name.replaceAll('-', ' ') + ' as a GIF'; b.setAttribute('aria-label', b.title);
  b.addEventListener('click', () => save(encode(G.ram, pointers, colour), 'chiller-' + name + '.gif', 'image/gif'));
  return b;
}
globalThis.ChillerGIF = {encode, spritePixels, button};
})();
