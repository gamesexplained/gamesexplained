#!/usr/bin/env node
// Holds the page's rebuilt frame of level 1 against the game and against the emulator's picture.
// The page (frame.html, or index.html once the section is in it) carries one frame as data: the
// video chip's registers as the frame begins, every write to them with the raster line and cycle it
// was made on, and the bytes of memory the drawing reads. Its code draws that with C64.renderFrame
// (site/lib/c64.js), and has views (sprites off, only the sprites), bands, interrupts and sprite
// boxes of its own. This test cuts that code out of the page, runs it in node, and checks:
//   1. the embedded memory against the listing (and the snapshot, when work/ holds it);
//   2. the writes: the game's four interrupt handlers run on the listing's memory, in the order the
//      vectors chain them, on the kit's 6502 simulator, make the same writes to the video chip, in
//      the same order, as the page holds; the lines the handlers are set for are the operands of
//      their own LDA #n instructions; each handler writes the next one's address to $FFFE;
//   3. the picture against reference/play-level1.png: the colour numbers the picture's colours
//      stand for are found by what the drawing mostly has under each (outside the places that are
//      known to differ), then every differing pixel is put into one of the causes the caption
//      gives (the lines of the sprites, the energy bar, the emulator's grey dot at a colour write),
//      and the counts must be the ones the caption states, with none left over;
//   4. the views: sprites off changes only sprite pixels, each sprite on its own draws only inside
//      its box, and a sprite register is written once, before the first sprite line;
//   5. the bands and the interrupts the page tabulates, and the numbers its text gives;
//   6. two controls, so that a test that cannot see a missing write does not pass: the frame drawn
//      without the writes of $D011 from line 205 on, or without those of $D018 from line 198, differs
//      from the screenshot by many more pixels than the frame as it is.
//   The snapshot (work/play-level1.vsf) is read when it is there, for the bytes the listing does not
//   hold (the panel's bitmap rows that are not listed) and for colour RAM; without it those bytes
//   are counted and not compared.
//   node games/c64/darkman/work/pages/test_frame.js [page.html]
const fs = require('fs'), path = require('path'), zlib = require('zlib'), vm = require('vm');
const ROOT = path.resolve(__dirname, __dirname.endsWith(path.join('work', 'pages')) ? '../../../../..' : '../../..');
const { game } = require(path.join(ROOT, 'kit/scripts/port_check.js'));
const { CPU } = require(path.join(ROOT, 'kit/cpu/cpu6502.js'));
const gameDir = fs.existsSync(path.join(__dirname, 'game.json')) ? __dirname : path.resolve(__dirname, '../..');
const g = game(gameDir);
g.lib('c64');
const page = process.argv[2] ? path.resolve(process.argv[2])
  : path.join(__dirname, fs.existsSync(path.join(__dirname, 'frame.html')) ? 'frame.html' : 'index.html');
const P = g.run(page, 'dm-frame', 'DM_FRAME', 'DM_LINE0', 'dmVariant', 'dmPicture', 'dmRender', 'dmRegs', 'dmBands',
  'dmInterrupts', 'dmSprites', 'dmMarks');
const { DM_FRAME: F } = P;
const html = g.read(page);
const L = g.listing('parts/level1/listing.json');
let bad = 0;
const fail = (...w) => { if (bad++ < 25) console.log('DIFFERS', ...w); };
const comma = (n) => n.toLocaleString('en-US');
const hex = (n, w = 4) => '$' + n.toString(16).toUpperCase().padStart(w, '0');

// ---- 1. the embedded memory ---------------------------------------------------------------------
const b64 = (s) => Uint8Array.from(Buffer.from(s, 'base64'));
const snapFile = path.join(gameDir, 'work', 'play-level1.vsf');
const snap = fs.existsSync(snapFile) ? require(path.join(ROOT, 'kit/cpu/cpu6502.js')).readSnapshot(snapFile) : null;
let embedded = 0, notListed = [], notChecked = 0;
for (const r of F.ram) {
  const bytes = b64(r.b);
  for (let i = 0; i < bytes.length; i++) {
    const a = r.a + i;
    embedded++;
    if (L.has[a]) { if (L.ram[a] !== bytes[i]) fail('embedded', hex(a), 'is', bytes[i], 'but the listing has', L.ram[a]); }
    else if (snap) { if (snap.ram[a] !== bytes[i]) fail('embedded', hex(a), 'is', bytes[i], 'but the snapshot has', snap.ram[a]); }
    else notChecked++;
    if (!L.has[a]) notListed.push(a);
  }
}
const colour = b64(F.colour);
if (colour.length !== 1024 || colour.some((v) => v > 15)) fail('colour RAM is not 1,024 nibbles');
if (snap) {
  const raw = fs.readFileSync(snapFile), vi = raw.indexOf('VIC-IISC') + 22;
  for (let i = 0; i < 1024; i++) if (colour[i] !== (raw[vi + 761 + i] & 15)) { fail('colour RAM cell', i, 'is not the snapshot\'s'); break; }
}
console.log(`${comma(embedded)} embedded bytes: ${comma(embedded - notListed.length)} equal the listing's, ${comma(notListed.length)} are not in the listing`
  + (snap ? ' and equal the snapshot\'s' : ` and ${comma(notChecked)} could not be checked (no work/play-level1.vsf)`));
// the bytes the listing does not hold are the panel's bitmap and the idle byte at $FFFF
for (const a of notListed) if (!(a === 0xFFFF || (a >= 0xE000 && a < 0xFFF0))) fail('embedded', hex(a), 'is neither in the listing nor in the panel bitmap');
const has = (a) => F.ram.some((r) => a >= r.a && a < r.a + b64(r.b).length);
// the first panel row: row 19 of the matrix at $CC00, its first bitmap byte at $E000 + 19 * 40 * 8
for (const a of [0xCC00 + 19 * 40, 0xE000 + 19 * 40 * 8, 0xCFF8, 0xCFFF]) if (!has(a)) fail('the page lacks', hex(a));

// ---- 2. the writes -------------------------------------------------------------------------------
const HANDLERS = [0x1E21, 0x1EF4, 0x1D43, 0x1DBF];
if (F.irqs.map((i) => i[2]).join() !== HANDLERS.join()) fail('the page enters', F.irqs.map((i) => hex(i[2])).join(), 'not', HANDLERS.map((h) => hex(h)).join());
const mem = Uint8Array.from(L.ram), vic = new Uint8Array(64), col = Uint8Array.from(colour);
vic.set(F.vic);
const got = [];
const cpu = new CPU(mem, { port: 0x35, io: {
  read(a) {
    if (a >= 0xD000 && a < 0xD030) return vic[a - 0xD000];
    if (a >= 0xD800 && a < 0xDC00) return col[a - 0xD800] | 0xF0;
    if (a === 0xDC00) return 0x7F;
    return 0xFF;
  },
  write(a, v) {
    if (a >= 0xD000 && a < 0xD030) { vic[a - 0xD000] = v; got.push([a, v]); }
    else if (a >= 0xD800 && a < 0xDC00) col[a - 0xD800] = v & 15;
  },
} });
const hooks = { 0xB176(c) { c.rts(); } };          // the sound driver is not in the listing
const chainOps = [[0x1EDD, 0x50], [0x1F2B, 0xC6], [0x1D8B, 0xCD], [0x1DF6, 0x0A]];   // LDA #n before each STA $D012
const lineOf = (k) => chainOps[(k + 3) % 4][1] | 0;                                  // the line handler k is set for
const isVic = (a) => (a >= 0xD000 && a <= 0xD02E) || a === 0xDD00 || a === 0xDD02;
const writesOf = F.irqs.map(([line, cycle], k) => F.writes.filter(([l, c, a]) => isVic(a)
  && (l > line || (l === line && c >= cycle)) && (!F.irqs[k + 1] || l < F.irqs[k + 1][0] || (l === F.irqs[k + 1][0] && c < F.irqs[k + 1][1]))));
let handled = 0;
HANDLERS.forEach((h, k) => {
  got.length = 0;
  cpu.irq(h, { hooks, maxSteps: 3e6 });
  const want = writesOf[k].map(([, , a, v]) => [a, v]);
  if (JSON.stringify(got) !== JSON.stringify(want)) fail('handler', hex(h), 'writes', JSON.stringify(got.slice(0, 12)), 'but the page has', JSON.stringify(want.slice(0, 12)));
  handled += got.length;
  const next = HANDLERS[(k + 1) % 4], vector = mem[0xFFFE] | mem[0xFFFF] << 8;
  if (vector !== next) fail('handler', hex(h), 'leaves the vector at', hex(vector), 'not', hex(next));
  if (mem[chainOps[k][0] - 1] !== 0xA9) fail('the listing has no LDA # at', hex(chainOps[k][0] - 1));
});
// the pointers and positions in memory after the handlers equal the page's RAM writes
for (const [, , a, v] of F.writes) if (a < 0xD000 && a !== 0xFFFF && mem[a] !== v) fail('after the handlers', hex(a), 'holds', mem[a], 'but the page writes', v);
console.log(`the four handlers, run on the listing, make the ${handled} writes to the video chip the page holds, in order`);
const irqs = P.dmInterrupts();
if (irqs.map((i) => i.line).join() !== [10, 80, 198, 205].join()) fail('the page sets the interrupts for lines', irqs.map((i) => i.line).join());
if (irqs.map((i) => i.line).join() !== [0, 1, 2, 3].map(lineOf).join()) fail('the lines are not the operands of the listing\'s LDA instructions');
const tableOf = (id) => { const a = html.indexOf('id="' + id + '"'); return a < 0 ? '' : html.slice(a, html.indexOf('</table>', a)); };
const rows = (id) => [...tableOf(id).matchAll(/<tr data-[^>]*>.*?<\/tr>/gs)].map((m) => m[0]);
const attr = (tag, name) => { const m = new RegExp(' data-' + name + '="([^"]*)"').exec(tag); return m ? m[1] : null; };
const codes = (row) => [...row.matchAll(/<code>([^<]*)<\/code>/g)].map((m) => m[1]);
const SPRITE_REG = (a) => (a >= 0xD000 && a <= 0xD010) || a === 0xD015 || a === 0xD017 || (a >= 0xD01B && a <= 0xD01D) || (a >= 0xD025 && a <= 0xD02E);
const POINTER = (a) => (a >= 0xCBF8 && a <= 0xCBFF) || (a >= 0xCFF8 && a <= 0xCFFF);
const irqRows = rows('dm-irq-table');
if (irqRows.length !== 4) fail('the interrupt table has', irqRows.length, 'rows');
irqs.forEach((i, k) => {
  const row = irqRows[k] || '';
  const writes = F.writes.filter(([l, c, a]) => (isVic(a) || POINTER(a)) && (l > i.took[0] || (l === i.took[0] && c >= i.took[1]))
    && (!F.irqs[k + 1] || l < F.irqs[k + 1][0] || (l === F.irqs[k + 1][0] && c < F.irqs[k + 1][1])));
  const screen = writes.filter(([, , a]) => !SPRITE_REG(a) && !POINTER(a) && a !== 0xD019 && a !== 0xD01A).map(([, , a, v]) => `${hex(a)}=${hex(v, 2)}`);
  const sprite = writes.filter(([, , a]) => SPRITE_REG(a) || POINTER(a)).length;
  const cells = [...row.matchAll(/<td[^>]*>(.*?)<\/td>/gs)].map((m) => m[1]);
  if (attr(row, 'n') !== String(i.n) || attr(row, 'line') !== String(i.line) || attr(row, 'handler') !== String(i.handler)) fail('interrupt row', k + 1, 'says', row.slice(0, 80), 'but the frame has', i.n, i.line, i.handler);
  if (codes(cells[2] || '').join() !== hex(i.handler)) fail('interrupt', i.n, 'is entered at', hex(i.handler), 'but the table says', codes(cells[2] || '').join());
  if (codes(cells[3] || '').join(' ') !== screen.join(' ')) fail('interrupt', i.n, 'writes', screen.join(' '), 'but the table says', codes(cells[3] || '').join(' '));
  if ((cells[4] || '').replace(/<[^>]*>/g, '').trim() !== String(sprite)) fail('interrupt', i.n, 'makes', sprite, 'sprite writes but the table says', cells[4]);
});

// ---- 3. the picture against the emulator's -----------------------------------------------------------
function readPng(file) {
  const buf = fs.readFileSync(file);
  let o = 8, w, h, ct, idat = [];
  while (o < buf.length) {
    const n = buf.readUInt32BE(o), t = buf.toString('latin1', o + 4, o + 8), d = buf.subarray(o + 8, o + 8 + n);
    if (t === 'IHDR') { w = d.readUInt32BE(0); h = d.readUInt32BE(4); ct = d[9]; if (d[8] !== 8 || (ct !== 2 && ct !== 6) || d[12]) throw new Error('only 8-bit RGB(A), not interlaced'); }
    else if (t === 'IDAT') idat.push(d);
    o += 12 + n;
  }
  const bpp = ct === 2 ? 3 : 4, stride = w * bpp, raw = zlib.inflateSync(Buffer.concat(idat)), out = Buffer.alloc(h * stride);
  let p = 0;
  for (let y = 0; y < h; y++) {
    const f = raw[p++];
    for (let x = 0; x < stride; x++) {
      const a = x >= bpp ? out[y * stride + x - bpp] : 0, b = y ? out[(y - 1) * stride + x] : 0, c = x >= bpp && y ? out[(y - 1) * stride + x - bpp] : 0;
      let v = raw[p++];
      if (f === 1) v += a; else if (f === 2) v += b; else if (f === 3) v += (a + b) >> 1;
      else if (f === 4) { const q = a + b - c, pa = Math.abs(q - a), pb = Math.abs(q - b), pc = Math.abs(q - c); v += pa <= pb && pa <= pc ? a : pb <= pc ? b : c; }
      out[y * stride + x] = v & 255;
    }
  }
  const rgb = new Array(w * h);
  for (let i = 0; i < w * h; i++) rgb[i] = out.readUIntBE(i * bpp, 3);
  return { w, h, rgb };
}
const shot = readPng(path.join(gameDir, 'reference/play-level1.png'));
const all = P.dmPicture('all'), none = P.dmPicture('nosprites'), only = P.dmPicture('sprites');
if (shot.w !== all.w || shot.h !== all.h) fail('the screenshot is', shot.w, 'by', shot.h);
const N = all.w * all.h, LINE0 = P.DM_LINE0;
// where the sprites are: the lines their boxes cover, and every pixel of the sprites alone lies on them
const shownBoxes = P.dmMarks().sprites.filter((s) => s.shown);
const spriteFirst = Math.min(...shownBoxes.map((s) => s.top)) + LINE0;
const spriteLast = Math.max(...shownBoxes.map((s) => s.top + s.height - 1)) + LINE0;
for (let i = 0; i < N; i++) if (only.px[i] !== 255) { const line = ((i / all.w) | 0) + LINE0; if (line < spriteFirst || line > spriteLast) fail('a sprite pixel on line', line); }
// the energy bar: draw_bar ($4449) fills eight cells from $CF59 of the matrix at $CC00, which are row
// 21, columns 17 to 24; a column c is at picture x 32 + 8c, and the panel's row 19 starts on line 207
const cell = 0xCF59 - 0xCC00, barRow = Math.floor(cell / 40), barCol = cell % 40;
const bar = { x0: 32 + 8 * barCol, x1: 32 + 8 * (barCol + 8) - 1, y0: 207 + 8 * (barRow - 19), y1: 207 + 8 * (barRow - 19) + 7 };
const inSpriteLines = (line) => line >= spriteFirst && line <= spriteLast;
const inBar = (line, x) => line >= bar.y0 && line <= bar.y1 && x >= bar.x0 && x <= bar.x1;
// the colours of the screenshot by what the drawing has under them where nothing is known to differ
const votes = new Map();
for (let i = 0; i < N; i++) {
  const line = ((i / all.w) | 0) + LINE0, x = i % all.w;
  if (inSpriteLines(line) || inBar(line, x)) continue;
  const k = shot.rgb[i] * 16 + all.px[i];
  votes.set(k, (votes.get(k) || 0) + 1);
}
const best = new Map();
for (const [k, n] of votes) { const rgb = k >> 4, c = k & 15; if (!best.has(rgb) || best.get(rgb)[1] < n) best.set(rgb, [c, n]); }
const colourOf = (rgb) => best.has(rgb) ? best.get(rgb)[0] : -1;
if (new Set([...best.values()].map((v) => v[0])).size !== best.size) fail('two colours of the screenshot stand for one colour number');
for (const rgb of new Set(shot.rgb)) if (!best.has(rgb)) fail('the screenshot has the colour', rgb.toString(16), 'under nothing but the places that differ');
// the emulator's grey dot: light grey (colour 15) at the right end of a line where a colour register is written
const colourWrites = F.writes.filter(([, , a]) => a >= 0xD020 && a <= 0xD02E);
const isDot = (line, x, mine, theirs) => theirs === 15 && mine !== 15 && colourWrites.some(([l, c]) => l === line && Math.abs(x - 8 * (c - 13)) <= 32);
const count = { differ: 0, sprites: 0, bar: 0, dot: 0, other: 0 };
const others = [];
for (let i = 0; i < N; i++) {
  const line = ((i / all.w) | 0) + LINE0, x = i % all.w, theirs = colourOf(shot.rgb[i]);
  if (theirs === all.px[i]) continue;
  count.differ++;
  if (inSpriteLines(line)) count.sprites++;
  else if (inBar(line, x)) count.bar++;
  else if (isDot(line, x, all.px[i], theirs)) count.dot++;
  else { count.other++; others.push(`line ${line} x ${x}`); }
}
const sameCount = N - count.differ;
console.log(`${comma(count.differ)} of ${comma(N)} pixels differ from the screenshot: ${comma(count.sprites)} on lines ${spriteFirst} to ${spriteLast} (the sprites), `
  + `${comma(count.bar)} in the energy bar (lines ${bar.y0}-${bar.y1}, x ${bar.x0}-${bar.x1}), ${count.dot} grey dot, ${count.other} unexplained`);
if (count.other) fail('pixels that differ for no cause the caption gives:', others.slice(0, 8).join('; '));
const stated = (k) => { const m = new RegExp('data-count="' + k + '">([^<]*)<').exec(html); return m ? m[1] : null; };
// the energy bar's eight cells: pixels that are not black, ours and the screenshot's
let barNow = 0, barShot = 0;
for (let y = bar.y0; y <= bar.y1; y++) for (let x = bar.x0; x <= bar.x1; x++) {
  const i = (y - LINE0) * all.w + x;
  if (all.px[i] !== 0) barNow++;
  if (colourOf(shot.rgb[i]) !== 0) barShot++;
}
if (barShot < 3 * barNow) fail('the screenshot\'s bar is not much longer than the drawing\'s:', barNow, barShot);
// where the grey dot is, against the write of the border colour the drawing makes on that line
let dotDx = null;
for (let i = 0; i < N; i++) {
  const line = ((i / all.w) | 0) + LINE0, x = i % all.w;
  if (colourOf(shot.rgb[i]) !== all.px[i] && isDot(line, x, all.px[i], colourOf(shot.rgb[i]))) {
    const w20 = F.writes.filter(([l, , a]) => l === line && a === 0xD020);
    dotDx = w20.length === 1 ? x - 8 * (w20[0][1] - 13) : null;
  }
}
const want = { barnow: String(barNow), barshot: String(barShot), dotdx: String(dotDx), pixels: comma(N), differ: comma(count.differ), sprites: comma(count.sprites), bar: comma(count.bar), same: comma(sameCount),
  first: String(spriteFirst), last: String(spriteLast), bytes: comma(embedded), energy: String(L.ram[0x43E3]) };
for (const k of Object.keys(want)) if (stated(k) !== want[k]) fail('the caption counts', k, 'as', stated(k), 'but the test measures', want[k]);
if (!/the right end of line 198/.test(html) || count.dot !== 1) fail('the caption speaks of one grey dot at the right end of line 198');
if (colourWrites.filter(([l]) => l === 198).length === 0) fail('no colour register is written on line 198');
// the snapshot is of Darkman just hit: energy 4 of 33, stun timer 2 (white)
if (L.ram[0x43E3] !== 4 || L.ram[0x29F3] < 2) fail('the snapshot is not of a stunned Darkman with 4 energy');

// ---- 4. the views and the sprites ----------------------------------------------------------------------
let changed = 0, outside = 0;
for (let i = 0; i < N; i++) if (all.px[i] !== none.px[i]) { changed++; if (only.px[i] === 255) outside++; }
if (outside) fail(outside, 'pixels differ between the whole picture and the one without sprites, outside the sprites view');
if (!changed) fail('switching the sprites off changes nothing');
for (let i = 0; i < N; i++) if (only.px[i] !== 255 && only.px[i] !== all.px[i]) { fail('the sprites view differs from the whole picture at', i); break; }
const sprites = P.dmSprites();
sprites.forEach((s) => {
  const v = P.dmVariant('full');
  v.vic = v.vic.map((x, a) => a === 0x15 ? 1 << s.n : x);
  v.writes = v.writes.map(([l, c, a, x]) => [l, c, a, a === 0xD015 ? 1 << s.n : x]);
  const one = C64.renderFrame(v);
  let drawn = 0, outsideBox = 0;
  for (let i = 0; i < N; i++) if (one.px[i] !== none.px[i]) {
    drawn++;
    const y = (i / all.w) | 0, x = i % all.w;
    if (x < s.left || x >= s.left + s.width || y < s.top || y >= s.top + s.height) outsideBox++;
  }
  const shown = P.dmMarks().sprites[s.n].shown;
  if (outsideBox) fail('sprite', s.n, 'draws', outsideBox, 'pixels outside its box');
  if (shown && !drawn) fail('sprite', s.n, 'is marked as shown and draws nothing');
  if (!shown && drawn) fail('sprite', s.n, 'is marked as hidden and draws', drawn, 'pixels');
});
console.log(`sprites on their own: ${sprites.map((s) => s.n + ':' + (P.dmMarks().sprites[s.n].shown ? 'shown' : 'hidden')).join(' ')}`);
// every sprite register and pointer is written once, before the first sprite line, but the two shared colours
const late = F.writes.filter(([l, , a]) => (SPRITE_REG(a) || POINTER(a)) && l > 100 && !(a === 0xD025 || a === 0xD026));
if (late.length) fail('sprite writes after line 100:', JSON.stringify(late.slice(0, 5)));
const sw = F.writes.filter(([l, , a]) => (SPRITE_REG(a) || POINTER(a)) && l < 100);
const swFirst = Math.min(...sw.map((w) => w[0])), swLast = Math.max(...sw.map((w) => w[0]));
if (!html.includes(`falls between lines ${swFirst} and ${swLast}, apart from the two shared colours on line 198, and the first sprite line is ${spriteFirst}`)) fail(`the text does not say that the sprites are written between lines ${swFirst} and ${swLast}, and the first sprite line is ${spriteFirst}`);
if (!F.writes.some(([l, , a, v]) => l === 198 && a === 0xD025 && v === 0) || !F.writes.some(([l, , a, v]) => l === 198 && a === 0xD026 && v === 0)) fail('interrupt 3 does not black the shared sprite colours');
if (spriteLast >= 198) fail('a sprite reaches line 198');

// ---- 5. the bands and the text ---------------------------------------------------------------------------
const bands = P.dmBands();
const bandRows = rows('dm-band-table');
if (bandRows.length !== bands.length) fail('the band table has', bandRows.length, 'rows, the frame', bands.length, 'bands');
const MODE = { 'multicolour bitmap': 'Multicolour bitmap', 'multicolour text': 'Multicolour text', 'invalid, shows black': 'Invalid mode, drawn black' };
bands.forEach((b, k) => {
  const row = bandRows[k] || '', cells = [...row.matchAll(/<td[^>]*>(.*?)<\/td>/gs)].map((m) => m[1].replace(/<[^>]*>/g, '').trim());
  if (attr(row, 'first') !== String(b.first) || attr(row, 'last') !== String(b.last)) fail('band', k, 'is lines', b.first, 'to', b.last, 'but the table says', row.slice(0, 60));
  if (cells[0] !== `${b.first} to ${b.last}`) fail('band', k, 'lines are written', cells[0]);
  if (cells[2] !== MODE[b.state.mode]) fail('band', k, 'is', b.state.mode, 'but the table says', cells[2]);
  if (cells[3] !== `${b.state.rows} rows`) fail('band', k, 'has', b.state.rows, 'rows but the table says', cells[3]);
  if (b.state.cols !== 38) fail('band', k, 'is', b.state.cols, 'columns wide');
  if (cells[4] !== hex(b.state.screen)) fail('band', k, 'has its screen matrix at', hex(b.state.screen), 'but the table says', cells[4]);
  const shown = /bitmap/.test(b.state.mode) ? 'Bitmap at ' + hex(b.state.glyphs) : /text/.test(b.state.mode) ? 'Characters at ' + hex(b.state.glyphs) : 'None shown';
  if (cells[5] !== shown) fail('band', k, 'shows', shown, 'but the table says', cells[5]);
});
if (bands.map((b) => b.first).join() !== '0,10,199,207') fail('the bands start on lines', bands.map((b) => b.first).join());
if (bands[1].first + 6 !== LINE0) fail('the second band does not have 6 lines above the picture');
if (bands[2].last - bands[2].first + 1 !== 8) fail('the black strip is not eight lines');
if ((bands[2].first & 7) !== bands[2].state.yscroll || (bands[3].first & 7) !== bands[3].state.yscroll) fail('the bands do not begin on lines whose low bits are the vertical scroll');
if (bands[3].state.rows !== 25) fail('the last band is not 25 rows, so the border does not close at line 251');
const find = (s) => { if (!html.includes(s)) fail('the text lacks:', s); };
find(`The strip covers the eight lines ${bands[2].first} to ${bands[2].last}.`);
find(`the first line of the panel is ${bands[3].first}`);
find('begins on line 207');
find('on lines 199, 207, 215');
find('seven lines');
find('the bottom border starts on line 251');
find('The display ends on line 250');
// the panel's first row: the vertical scroll puts a row's first line on 199, 207, 215
// the interrupts: each writes the next one's line to $D012, so the ring is 10, 80, 198, 205
find('on line 10, line 80, line 198, and line 205, and then line 10 again');
// the controls: the picture changes when the writes that switch the mode are left out
const keepOnly = (drop) => { const v = P.dmVariant('full'); v.writes = v.writes.filter((w) => !drop(w)); return C64.renderFrame(v); };
const diffFrom = (r) => { let n = 0; for (let i = 0; i < N; i++) if (colourOf(shot.rgb[i]) !== r.px[i]) n++; return n; };
const noBitmap = diffFrom(keepOnly(([l, , a]) => l >= 205 && a === 0xD011));
const noBase = diffFrom(keepOnly(([l, , a]) => l >= 198 && a === 0xD018));
console.log(`controls: without the writes of $D011 from line 205 on, ${comma(noBitmap)} pixels differ; without those of $D018 from line 198, ${comma(noBase)}`);
if (noBitmap < count.differ + 3000) fail('the picture does not need the writes of $D011 from line 205 on');
if (noBase < count.differ + 3000) fail('the picture does not need the writes of $D018 from line 198 on');
// the page's interface code at least compiles
try { new vm.Script(g.block(page, 'dm-frame-ui').text); } catch (e) { fail('dm-frame-ui does not compile:', e.message); }
if (!/data-view="all"[^>]*aria-pressed="true"/.test(html)) fail('the whole screen is not the view the page starts in');

console.log(bad ? bad + ' differences' : 'the page agrees with the game and the emulator');
process.exit(bad ? 1 : 0);
